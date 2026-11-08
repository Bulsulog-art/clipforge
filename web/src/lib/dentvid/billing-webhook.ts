import type { SupabaseClient } from "@supabase/supabase-js";
import { applyTransition, dvTransition, type ClinicBilling, type DodoEventData } from "./billing";
import { enqueueFirstWeek, type FirstWeekResult } from "./week-job";
import { recordEvent } from "./events-server";
import { alerts, cleanError, type ClinicRef, type OwnerAlert } from "./ops-alert";
import { clinicRefFor, markPaid, raiseOwnerAlert } from "./ops-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DvWebhookResult = { status: 200 | 500; body: Record<string, unknown> };

export type DvWebhookDeps = {
  /** Queue the clinic's first week (tests pass a mock; the default uses the BullMQ dentvid queue). */
  enqueueWeek?: (db: SupabaseClient, clinicId: string) => Promise<FirstWeekResult>;
  /** Send the welcome email (tests pass a mock; the default goes through lifecycle.ts and Resend). */
  sendWelcome?: (db: SupabaseClient, clinicId: string) => Promise<string>;
  /** Owner alerts (tests pass a mock; the default is ops-server → OWNER_ALERT_EMAIL). */
  alert?: (a: OwnerAlert) => Promise<unknown>;
  /** Name, country, tier, email of a clinic for an alert. */
  clinicRef?: (db: SupabaseClient, clinicId: string) => Promise<ClinicRef>;
  /** Tell the worker's first-week watchdog a clinic just paid (Redis marker). */
  markPaid?: (clinicId: string) => Promise<void>;
};

/** Payment trouble that does not move the plan yet (Dodo keeps the subscription through its grace period). */
const AT_RISK_ONLY = new Set(["payment.failed", "subscription.past_due"]);

async function tell(db: SupabaseClient, deps: DvWebhookDeps, clinicId: string, make: (c: ClinicRef) => OwnerAlert): Promise<void> {
  try {
    const c = await (deps.clinicRef ?? clinicRefFor)(db, clinicId);
    await (deps.alert ?? raiseOwnerAlert)(make(c));
  } catch (e) {
    console.error("[dodo:dentvideo] owner alert failed", (e as Error).message);
  }
}

async function welcome(db: SupabaseClient, clinicId: string): Promise<string> {
  if (!process.env.RESEND_API_KEY) return "no email key";
  const [{ sendWelcome, supabaseLifecycleStore, lifecycleConfig }, { sendEmail }] = await Promise.all([import("./lifecycle"), import("./email")]);
  return sendWelcome({ store: supabaseLifecycleStore(db), send: sendEmail, config: lifecycleConfig() }, clinicId);
}

async function queueWeek(db: SupabaseClient, clinicId: string): Promise<FirstWeekResult> {
  // Imported here so this module (and its tests) do not touch Redis on load.
  const { dentvidQueue } = await import("@/lib/queue");
  return enqueueFirstWeek(db, dentvidQueue, clinicId);
}

type ClinicRow = ClinicBilling & { id: string; owner_id: string };

/** 0002 not applied yet: PostgREST reports an unknown column. */
const missingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42703" || e.code === "PGRST204" || /column .* does not exist|Could not find the .* column/i.test(e.message ?? ""));

async function findClinic(db: SupabaseClient, by: "id" | "dodo_subscription_id", value: string): Promise<{ row: ClinicRow | null; error: string | null }> {
  const full = await db.from("dentvid_clinics").select("id, owner_id, plan, plan_tier, dodo_subscription_id, plan_renews_at").eq(by, value).maybeSingle();
  if (!full.error) return { row: (full.data as ClinicRow | null) ?? null, error: null };
  if (!missingColumn(full.error)) return { row: null, error: full.error.message };
  if (by !== "id") return { row: null, error: null };
  const base = await db.from("dentvid_clinics").select("id, owner_id, plan").eq("id", value).maybeSingle();
  return { row: (base.data as ClinicRow | null) ?? null, error: base.error?.message ?? null };
}

/**
 * A verified Dodo event that belongs to DentVideo: move the clinic's plan.
 * Unknown clinics and events that change nothing are acknowledged (200) —
 * retrying will not change them; database errors return 500 so Dodo retries.
 *
 * When a clinic becomes active (its first payment, or back from paused or
 * cancelled), this week's videos are queued at once: there is no free week,
 * so this is the moment the dentist gets their first real videos.
 */
/** payment.failed / subscription.past_due: nothing moves yet, but the owner should know (once a day per clinic). */
async function atRiskOnly(db: SupabaseClient, type: string, d: DodoEventData, deps: DvWebhookDeps): Promise<DvWebhookResult> {
  const metaClinic = typeof d.metadata?.clinic_id === "string" && UUID.test(d.metadata.clinic_id) ? d.metadata.clinic_id : null;
  let found = metaClinic ? await findClinic(db, "id", metaClinic) : { row: null, error: null };
  if (!found.row && !found.error && d.subscription_id) found = await findClinic(db, "dodo_subscription_id", d.subscription_id);
  const clinic = found.row;
  if (clinic) await tell(db, deps, clinic.id, (c) => alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier ?? null }, event: type, from: clinic.plan, to: clinic.plan }));
  return { status: 200, body: { ok: true, app: "dentvideo", ignored: type, ...(clinic ? { alerted: true } : {}) } };
}

/** A DentVideo event the route could not process (500 or exception): the owner is told once a day per event type. */
export async function alertWebhookFailure(evt: { type?: string; data?: DodoEventData } | null, error: unknown, deps: Pick<DvWebhookDeps, "alert"> = {}): Promise<void> {
  const clinicId = typeof evt?.data?.metadata?.clinic_id === "string" && UUID.test(evt.data.metadata.clinic_id) ? evt.data.metadata.clinic_id : null;
  await (deps.alert ?? raiseOwnerAlert)(alerts.webhookError({ event: evt?.type ?? "unknown", error: cleanError(error), clinic: clinicId ? { id: clinicId } : undefined })).catch(() => {});
}

export async function handleDentvideoEvent(
  db: SupabaseClient,
  evt: { type: string; data: DodoEventData },
  deps: DvWebhookDeps = {},
): Promise<DvWebhookResult> {
  const d = evt.data ?? {};
  const t = dvTransition(evt.type, d);
  if (!t && AT_RISK_ONLY.has(evt.type)) return atRiskOnly(db, evt.type, d, deps);
  if (!t) return { status: 200, body: { ok: true, app: "dentvideo", ignored: evt.type } };

  const metaClinic = typeof d.metadata?.clinic_id === "string" && UUID.test(d.metadata.clinic_id) ? d.metadata.clinic_id : null;
  const metaOwner = typeof d.metadata?.owner_id === "string" ? d.metadata.owner_id : null;

  let found = metaClinic ? await findClinic(db, "id", metaClinic) : { row: null, error: null };
  if (!found.row && !found.error) found = await findClinic(db, "dodo_subscription_id", t.subscriptionId);
  if (found.error) return { status: 500, body: { error: found.error } };
  const clinic = found.row;
  if (!clinic) {
    console.warn("[dodo:dentvideo] no clinic for event", evt.type, t.subscriptionId);
    return { status: 200, body: { ok: true, app: "dentvideo", ignored: "no clinic" } };
  }
  if (metaOwner && clinic.owner_id !== metaOwner) {
    console.warn("[dodo:dentvideo] clinic/owner mismatch", evt.type, t.subscriptionId);
    return { status: 200, body: { ok: true, app: "dentvideo", ignored: "owner mismatch" } };
  }

  const update = applyTransition(clinic, t);
  if (!update) return { status: 200, body: { ok: true, app: "dentvideo", unchanged: true } };

  const now = new Date().toISOString();
  let { error } = await db.from("dentvid_clinics").update({ ...update, updated_at: now }).eq("id", clinic.id);
  if (error && missingColumn(error)) {
    // Billing columns not migrated yet: the plan itself still moves.
    ({ error } = await db.from("dentvid_clinics").update({ plan: update.plan ?? clinic.plan, updated_at: now }).eq("id", clinic.id));
  }
  if (error) return { status: 500, body: { error: error.message } };

  const from = clinic.plan;
  const to = update.plan ?? clinic.plan;
  // The owner hears about it: a new (or returning) paying clinic — good news, sent at once —
  // and a paying clinic whose subscription stopped (customer at risk).
  if (to === "active" && from !== "active") {
    await (deps.markPaid ?? markPaid)(clinic.id).catch(() => {});
    await tell(db, deps, clinic.id, (c) =>
      alerts.newPayingClinic({
        clinic: { ...c, tier: c.tier ?? t.tier },
        interval: typeof d.metadata?.interval === "string" ? d.metadata.interval : null,
        returning: from === "paused" || from === "cancelled",
      }),
    );
  } else if (from === "active" && (to === "paused" || to === "cancelled")) {
    await tell(db, deps, clinic.id, (c) => alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier ?? null }, event: evt.type, from, to }));
  }

  // Paid: make this week's videos now rather than waiting for Monday. The
  // worker emails the dentist when they are ready. Best effort — the plan
  // has already moved, and the app's "first week" screen asks for the week
  // again (idempotent, same job id) if this did not get through.
  if (update.plan === "active") void recordEvent("payment_succeeded", { db, clinicId: clinic.id, props: { tier: t.tier, interval: d.metadata?.interval, first: clinic.plan !== "active", event: evt.type } });
  let firstWeek: FirstWeekResult | "failed" | undefined;
  if (update.plan === "active" && clinic.plan !== "active") {
    try {
      firstWeek = await (deps.enqueueWeek ?? queueWeek)(db, clinic.id);
    } catch (e) {
      firstWeek = "failed";
      console.error("[dodo:dentvideo] could not queue the first week", clinic.id, (e as Error).message);
    }
  }

  // The welcome email: once per clinic (dentvid_email_log), so a retried
  // event or a clinic that pays again after cancelling never gets it twice.
  // Best effort, like the first week — the payment is already recorded.
  let welcomeEmail: string | undefined;
  if (update.plan === "active" && clinic.plan !== "active") {
    try {
      welcomeEmail = await (deps.sendWelcome ?? welcome)(db, clinic.id);
    } catch (e) {
      welcomeEmail = "failed";
      console.error("[dodo:dentvideo] welcome email failed", clinic.id, (e as Error).message);
    }
  }
  return {
    status: 200,
    body: { ok: true, app: "dentvideo", plan: update.plan ?? clinic.plan, ...(firstWeek ? { firstWeek } : {}), ...(welcomeEmail ? { welcomeEmail } : {}) },
  };
}
