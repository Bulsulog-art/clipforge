import type { SupabaseClient } from "@supabase/supabase-js";
import { applyTransition, dvTransition, type ClinicBilling, type DodoEventData } from "./billing";
import { enqueueFirstWeek, type FirstWeekResult } from "./week-job";
import { recordEvent } from "./events-server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DvWebhookResult = { status: 200 | 500; body: Record<string, unknown> };

export type DvWebhookDeps = {
  /** Queue the clinic's first week (tests pass a mock; the default uses the BullMQ dentvid queue). */
  enqueueWeek?: (db: SupabaseClient, clinicId: string) => Promise<FirstWeekResult>;
};

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
export async function handleDentvideoEvent(
  db: SupabaseClient,
  evt: { type: string; data: DodoEventData },
  deps: DvWebhookDeps = {},
): Promise<DvWebhookResult> {
  const d = evt.data ?? {};
  const t = dvTransition(evt.type, d);
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
  return { status: 200, body: { ok: true, app: "dentvideo", plan: update.plan ?? clinic.plan, ...(firstWeek ? { firstWeek } : {}) } };
}
