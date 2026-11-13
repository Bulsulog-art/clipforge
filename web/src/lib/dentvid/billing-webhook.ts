import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DV_SUB_ENDED,
  applyTransition,
  dvEventSubStatus,
  dvEventTime,
  dvPlanForProduct,
  dvTransition,
  isDentvideoEvent,
  isStaleEvent,
  usedFounding,
  type ClinicBilling,
  type DodoEventData,
  type DvInterval,
  type DvSubRecord,
  type DvTier,
} from "./billing";
import { enqueueFirstWeek, type FirstWeekResult } from "./week-job";
import { recordEvent } from "./events-server";
import { alerts, cleanError, type ClinicRef, type OwnerAlert } from "./ops-alert";
import { clinicRefFor, markPaid, raiseOwnerAlert, webOpsStore } from "./ops-server";
import { supabaseSubscriptionStore, type SubscriptionStore } from "./subscriptions";
import type { PaymentFix, PaymentProblemKind } from "./lifecycle-email";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClinicByEmail = { clinicId: string } | { problem: "no clinic" | "several clinics" | "lookup failed" };

export type DvWebhookResult = { status: 200 | 500; body: Record<string, unknown> };

export type DvWebhookEvent = { type: string; data: DodoEventData; timestamp?: unknown };

export type DvWebhookDeps = {
  /** Queue the clinic's first week (tests pass a mock; the default uses the BullMQ dentvid queue). */
  enqueueWeek?: (db: SupabaseClient, clinicId: string) => Promise<FirstWeekResult>;
  /** Send the welcome email (tests pass a mock; the default goes through lifecycle.ts and Resend). */
  sendWelcome?: (db: SupabaseClient, clinicId: string) => Promise<string>;
  /** "Your payment didn't go through" to the clinic (default: lifecycle.ts sendPaymentProblem). */
  sendPaymentMail?: (db: SupabaseClient, clinicId: string, kind: PaymentProblemKind, fix: PaymentFix) => Promise<string>;
  /** Owner alerts (tests pass a mock; the default is ops-server → OWNER_ALERT_EMAIL). */
  alert?: (a: OwnerAlert) => Promise<unknown>;
  /** Name, country, tier, email of a clinic for an alert. */
  clinicRef?: (db: SupabaseClient, clinicId: string) => Promise<ClinicRef>;
  /** Tell the worker's first-week watchdog a clinic just paid for the first time (Redis marker). */
  markPaid?: (clinicId: string) => Promise<void>;
  /** The subscription ledger (0007); the default degrades to "unknown" when the table is missing. */
  subs?: SubscriptionStore;
  /**
   * Dodo's live status of a subscription, when DODO_API_KEY is set (null:
   * no key or the call failed). Used to confirm an activation before it
   * switches a clinic on.
   */
  dodoStatus?: (subscriptionId: string) => Promise<string | null>;
  /** Self-serve billing portal available (DODO_API_KEY set). */
  selfServe?: boolean;
  /**
   * The clinic whose owner has this email — for an event without clinic metadata.
   * Exactly one DentVideo clinic owner, or the reason none was picked (default: Liman's auth admin API).
   */
  clinicByEmail?: (db: SupabaseClient, email: string) => Promise<ClinicByEmail>;
  now?: () => Date;
};

/** Payment trouble that does not move the plan yet (Dodo keeps the subscription through its grace period). */
const AT_RISK_ONLY = new Set(["payment.failed", "subscription.past_due"]);
/** Refunds and disputes: logged, the owner told; a chargeback pauses the clinic. */
const MONEY_BACK = /^(refund|dispute)\./;
const CHARGEBACK = new Set(["dispute.opened", "dispute.accepted", "dispute.lost"]);
/** The clinic won the dispute: a pause that came only from the chargeback is lifted. */
const DISPUTE_WON = "dispute.won";
/** Welcome results that mean a paying clinic got no welcome because something broke (not "already sent", "test account"…; without RESEND_API_KEY no alert could be sent either). */
const WELCOME_PROBLEM = new Set(["failed", "migration missing"]);

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

async function paymentMail(db: SupabaseClient, clinicId: string, kind: PaymentProblemKind, fix: PaymentFix): Promise<string> {
  if (!process.env.RESEND_API_KEY) return "no email key";
  const [{ sendPaymentProblem, supabaseLifecycleStore, lifecycleConfig }, { sendEmail }] = await Promise.all([import("./lifecycle"), import("./email")]);
  const store = await webOpsStore().catch(() => null);
  const claim = async (key: string) => (store ? store.setNx(key, 3 * 86_400).catch(() => true) : true);
  return sendPaymentProblem({ store: supabaseLifecycleStore(db), send: sendEmail, config: lifecycleConfig(), claim }, clinicId, kind, fix);
}

/**
 * The one DentVideo clinic whose owner's login has this email (Liman's auth
 * admin API; GoTrue keeps one account per address). DentVideo accounts only
 * (membership.ts) — Liman holds other apps' users too.
 */
export async function clinicByOwnerEmail(db: SupabaseClient, email: string): Promise<ClinicByEmail> {
  const want = email.trim().toLowerCase();
  const { isDentvideoUser } = await import("./membership");
  const owners: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { problem: "lookup failed" };
    const users = data?.users ?? [];
    for (const u of users) if ((u.email ?? "").trim().toLowerCase() === want && isDentvideoUser(u)) owners.push(u.id);
    if (users.length < 1000) break;
  }
  if (!owners.length) return { problem: "no clinic" };
  const { data: clinics, error } = await db.from("dentvid_clinics").select("id").in("owner_id", owners).limit(3);
  if (error) return { problem: "lookup failed" };
  const ids = ((clinics ?? []) as { id: string }[]).map((c) => c.id);
  if (ids.length === 1) return { clinicId: ids[0] };
  return { problem: ids.length ? "several clinics" : "no clinic" };
}

async function queueWeek(db: SupabaseClient, clinicId: string): Promise<FirstWeekResult> {
  // Imported here so this module (and its tests) do not touch Redis on load.
  const { dentvidQueue } = await import("@/lib/queue");
  return enqueueFirstWeek(db, dentvidQueue, clinicId);
}

async function liveDodoStatus(subscriptionId: string): Promise<string | null> {
  const { dodoApiKey, dodoGetSubscription } = await import("./dodo-account");
  const apiKey = dodoApiKey();
  if (!apiKey) return null;
  try {
    return (await dodoGetSubscription({ apiKey }, subscriptionId)).status ?? null;
  } catch (e) {
    console.warn("[dodo:dentvideo] could not confirm subscription with Dodo", (e as Error).message);
    return null;
  }
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

const metaClinicOf = (d: DodoEventData) => (typeof d.metadata?.clinic_id === "string" && UUID.test(d.metadata.clinic_id) ? d.metadata.clinic_id : null);

/** The clinic an event is about: metadata first, then the stored subscription id, then the payment index. */
async function clinicFor(db: SupabaseClient, d: DodoEventData, subs: SubscriptionStore): Promise<{ row: ClinicRow | null; error: string | null }> {
  const metaClinic = metaClinicOf(d);
  let found = metaClinic ? await findClinic(db, "id", metaClinic) : { row: null, error: null };
  if (!found.row && !found.error && d.subscription_id) found = await findClinic(db, "dodo_subscription_id", d.subscription_id);
  if (!found.row && !found.error && d.subscription_id) {
    const rec = await subs.get(d.subscription_id);
    if (rec) found = await findClinic(db, "id", rec.clinic_id);
  }
  if (!found.row && !found.error && d.payment_id) {
    const p = await subs.paymentClinic(d.payment_id);
    if (p) found = await findClinic(db, "id", p.clinic_id);
  }
  return found;
}

const metaInterval = (d: DodoEventData): DvInterval | null => (d.metadata?.interval === "month" || d.metadata?.interval === "year" ? d.metadata.interval : null);

/** The ledger row this event leaves behind for its subscription. */
function ledgerRow(
  clinicId: string,
  subscriptionId: string,
  status: string,
  d: DodoEventData,
  prev: DvSubRecord | null | undefined,
  eventAt: string,
  type: string,
): DvSubRecord & Record<string, unknown> {
  const plan = dvPlanForProduct(d.product_id);
  const tier: DvTier | null = plan?.tier ?? (prev?.tier as DvTier | null | undefined) ?? null;
  const interval: DvInterval | null = plan?.interval ?? metaInterval(d) ?? (prev?.interval as DvInterval | null | undefined) ?? null;
  const discountId = d.discount_id ?? prev?.discount_id ?? null;
  return {
    dodo_subscription_id: subscriptionId,
    clinic_id: clinicId,
    status,
    product: d.product_id ?? prev?.product ?? null,
    tier,
    interval,
    discount_id: discountId,
    // A seat once taken stays taken (Dodo counts the code's uses the same way).
    founding: !!prev?.founding || usedFounding(tier, interval, discountId),
    period_end: d.next_billing_date ?? prev?.period_end ?? null,
    last_event_at: eventAt,
    last_event_type: type,
  };
}

/** payment.failed / subscription.past_due: nothing moves yet, but the owner should know (once a day per clinic) and so should the clinic. */
async function atRiskOnly(db: SupabaseClient, evt: DvWebhookEvent, deps: DvWebhookDeps, subs: SubscriptionStore): Promise<DvWebhookResult> {
  const d = evt.data ?? {};
  const found = await clinicFor(db, d, subs);
  const clinic = found.row;
  if (!clinic) return { status: 200, body: { ok: true, app: "dentvideo", ignored: evt.type } };
  // A first payment that failed at checkout: the clinic saw it there; it has no plan to lose.
  const firstAttempt = clinic.plan === "trial" && !clinic.dodo_subscription_id;
  let clinicEmail: string | undefined;
  if (evt.type === "payment.failed" && !firstAttempt) {
    clinicEmail = await (deps.sendPaymentMail ?? paymentMail)(db, clinic.id, "failed", deps.selfServe ?? !!process.env.DODO_API_KEY?.trim() ? "portal" : "email").catch((e) => {
      console.error("[dodo:dentvideo] payment email failed", clinic.id, (e as Error).message);
      return "failed";
    });
  }
  await tell(db, deps, clinic.id, (c) =>
    alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier ?? null }, event: evt.type, from: clinic.plan, to: clinic.plan, clinicEmailed: clinicEmail === "sent" }),
  );
  return { status: 200, body: { ok: true, app: "dentvideo", ignored: evt.type, alerted: true, ...(clinicEmail ? { clinicEmail } : {}) } };
}

/** payment.succeeded: remember which clinic the payment belongs to (refunds / disputes), and that a subscription is on its way. */
async function paymentSucceeded(db: SupabaseClient, evt: DvWebhookEvent, deps: DvWebhookDeps, subs: SubscriptionStore): Promise<DvWebhookResult> {
  const d = evt.data ?? {};
  const found = await clinicFor(db, d, subs);
  const clinic = found.row;
  if (!clinic) return { status: 200, body: { ok: true, app: "dentvideo", ignored: evt.type } };
  if (d.payment_id) await subs.recordPayment(d.payment_id, clinic.id, d.subscription_id ?? null);
  if (d.subscription_id) {
    const prev = await subs.get(d.subscription_id);
    // Only a subscription we have not seen: "pending" until its activation arrives (blocks a second checkout meanwhile).
    // No event time: a payment is not a subscription status, and Dodo often stamps the first
    // payment.succeeded a moment AFTER subscription.active — an event time here made that
    // activation look stale, and a clinic that had just paid was never switched on.
    if (prev === null) await subs.put({ ...ledgerRow(clinic.id, d.subscription_id, "pending", d, prev, "", evt.type), last_event_at: null });
  }
  return { status: 200, body: { ok: true, app: "dentvideo", recorded: evt.type } };
}

/** refund.* / dispute.*: the owner hears about it; a chargeback pauses the clinic (no new weeks while disputed). */
async function moneyBack(db: SupabaseClient, evt: DvWebhookEvent, deps: DvWebhookDeps, subs: SubscriptionStore): Promise<DvWebhookResult> {
  const d = evt.data ?? {};
  const found = await clinicFor(db, d, subs);
  if (found.error) return { status: 500, body: { error: found.error } };
  const clinic = found.row;
  console.warn("[dodo:dentvideo] money back event", evt.type, d.payment_id ?? "", clinic?.id ?? "no clinic");
  if (!clinic) return { status: 200, body: { ok: true, app: "dentvideo", ignored: "no clinic", event: evt.type } };
  let paused = false;
  let resumed = false;
  const now = deps.now?.() ?? new Date();
  // The ledger row of the subscription the clinic's access comes from (undefined: no ledger).
  const subId = clinic.dodo_subscription_id ?? null;
  const current = subId ? await subs.get(subId) : null;
  if (CHARGEBACK.has(evt.type) && clinic.plan === "active") {
    const { error } = await db.from("dentvid_clinics").update({ plan: "paused", updated_at: now.toISOString() }).eq("id", clinic.id);
    if (error) return { status: 500, body: { error: error.message } };
    paused = true;
    // Remembered on the subscription: the app then says "payment under review, write to us" instead of
    // offering a plan (the subscription is still live at Dodo — a new plan would be a second one), and a
    // won dispute knows the pause was only the chargeback's.
    if (current) await subs.put({ ...current, status: "disputed" });
  } else if (evt.type === DISPUTE_WON && clinic.plan === "paused" && subId && current?.status === "disputed") {
    // Paused only by this chargeback (an on_hold / lapse since would have overwritten "disputed").
    const live = await (deps.dodoStatus ?? liveDodoStatus)(subId);
    if (!live || live === "active") {
      const { error } = await db.from("dentvid_clinics").update({ plan: "active", updated_at: now.toISOString() }).eq("id", clinic.id).eq("plan", "paused");
      if (error) return { status: 500, body: { error: error.message } };
      await subs.put({ ...current, status: "active" });
      resumed = true;
      try {
        await (deps.enqueueWeek ?? queueWeek)(db, clinic.id);
      } catch (e) {
        console.error("[dodo:dentvideo] could not queue the week after a won dispute", clinic.id, (e as Error).message);
      }
    }
  }
  await tell(db, deps, clinic.id, (c) => alerts.billingDispute({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier ?? null }, event: evt.type, paymentId: d.payment_id ?? null, paused, resumed }));
  return { status: 200, body: { ok: true, app: "dentvideo", event: evt.type, paused, ...(resumed ? { resumed } : {}) } };
}

/** A DentVideo event the route could not process (500 or exception): the owner is told once a day per event type. */
export async function alertWebhookFailure(evt: { type?: string; data?: DodoEventData } | null, error: unknown, deps: Pick<DvWebhookDeps, "alert"> = {}): Promise<void> {
  const clinicId = typeof evt?.data?.metadata?.clinic_id === "string" && UUID.test(evt.data.metadata.clinic_id) ? evt.data.metadata.clinic_id : null;
  await (deps.alert ?? raiseOwnerAlert)(alerts.webhookError({ event: evt?.type ?? "unknown", error: cleanError(error), clinic: clinicId ? { id: clinicId } : undefined })).catch(() => {});
}

/**
 * Refund and dispute events name only a payment (no metadata): are they
 * DentVideo's? Yes when the payment is in our index (0007), or — with
 * DODO_API_KEY — when Dodo says the payment's metadata/brand/product is ours.
 */
export async function isDentvideoMoneyBackEvent(evt: { type?: string; data?: DodoEventData } | null, db: SupabaseClient | null): Promise<boolean> {
  const d = evt?.data;
  if (!evt?.type || !MONEY_BACK.test(evt.type) || !d) return false;
  if (isDentvideoEvent(d)) return true;
  if (!d.payment_id) return false;
  try {
    if (db && (await supabaseSubscriptionStore(db).paymentClinic(d.payment_id))) return true;
    const { dodoApiKey, dodoGetPayment } = await import("./dodo-account");
    const apiKey = dodoApiKey();
    if (!apiKey) return false;
    const p = await dodoGetPayment({ apiKey }, d.payment_id);
    return isDentvideoEvent({ metadata: p.metadata, brand_id: p.brand_id, product_cart: p.product_cart });
  } catch (e) {
    // Unknown: treated as not ours (ClipForge's handler acknowledges it). Logged so a DentVideo refund is not lost silently.
    console.error("[dodo:dentvideo] could not tell whether a refund/dispute is DentVideo's", evt.type, d.payment_id, (e as Error).message);
    return false;
  }
}

/**
 * A verified Dodo event that belongs to DentVideo: move the clinic's plan.
 * Unknown clinics and events that change nothing are acknowledged (200) —
 * retrying will not change them; database errors return 500 so Dodo retries.
 *
 * Ordering and duplicates (dentvid_subscriptions, 0007 — skipped gracefully
 * when the table is missing):
 *  - an event older than the last one applied to its subscription is ignored;
 *  - an activation for a subscription already cancelled/expired switches the
 *    clinic back on only when it is newer than that, or Dodo confirms it;
 *  - with DODO_API_KEY every activation is confirmed with Dodo first;
 *  - a second subscription activating while the clinic has a live one is
 *    recorded next to it and the owner is told (refund / cancel one);
 *  - when the clinic's current subscription ends while another one is live,
 *    the clinic moves to that one instead of losing access.
 *
 * When a clinic becomes active this week's videos are queued at once: there
 * is no free week, so this is the moment the dentist gets their first videos.
 */
export async function handleDentvideoEvent(db: SupabaseClient, evt: DvWebhookEvent, deps: DvWebhookDeps = {}): Promise<DvWebhookResult> {
  const d = evt.data ?? {};
  const subs = deps.subs ?? supabaseSubscriptionStore(db);
  const now = deps.now?.() ?? new Date();
  const eventAt = dvEventTime(evt);
  if (MONEY_BACK.test(evt.type)) return moneyBack(db, evt, deps, subs);
  if (evt.type === "payment.succeeded") return paymentSucceeded(db, evt, deps, subs);
  const t = dvTransition(evt.type, d);
  if (!t && AT_RISK_ONLY.has(evt.type)) return atRiskOnly(db, evt, deps, subs);
  if (!t) return { status: 200, body: { ok: true, app: "dentvideo", ignored: evt.type } };

  const metaOwner = typeof d.metadata?.owner_id === "string" ? d.metadata.owner_id : null;
  let found = await clinicFor(db, d, subs);
  if (found.error) return { status: 500, body: { error: found.error } };
  if (!found.row && !metaClinicOf(d)) {
    // No clinic metadata (a subscription made in the Dodo dashboard, a plain payment link…) and not one we
    // know: the customer's email, only when exactly one DentVideo clinic owner has it. Never a guess.
    const email = (d.customer?.email ?? "").trim();
    const byEmail: ClinicByEmail = email ? await (deps.clinicByEmail ?? clinicByOwnerEmail)(db, email).catch(() => ({ problem: "lookup failed" as const })) : { problem: "no clinic" };
    if ("clinicId" in byEmail) {
      found = await findClinic(db, "id", byEmail.clinicId);
      if (found.error) return { status: 500, body: { error: found.error } };
    } else {
      const reason = email ? byEmail.problem : ("no email" as const);
      console.warn("[dodo:dentvideo] event without clinic metadata matched no clinic", evt.type, t.subscriptionId, reason);
      await (deps.alert ?? raiseOwnerAlert)(alerts.unmatchedBillingEvent({ event: evt.type, subscriptionId: t.subscriptionId, email: email || null, reason })).catch(() => {});
      return { status: 200, body: { ok: true, app: "dentvideo", ignored: "no clinic", match: reason } };
    }
  }
  const clinic = found.row;
  if (!clinic) {
    console.warn("[dodo:dentvideo] no clinic for event", evt.type, t.subscriptionId);
    return { status: 200, body: { ok: true, app: "dentvideo", ignored: "no clinic" } };
  }
  if (metaOwner && clinic.owner_id !== metaOwner) {
    console.warn("[dodo:dentvideo] clinic/owner mismatch", evt.type, t.subscriptionId);
    return { status: 200, body: { ok: true, app: "dentvideo", ignored: "owner mismatch" } };
  }

  const prev = await subs.get(t.subscriptionId); // undefined: no ledger
  const ledger = prev !== undefined;
  const reported = dvEventSubStatus(evt.type, d) ?? (t.kind === "activate" ? "active" : t.plan);
  const stamp = eventAt ?? now.toISOString();
  const record = (status: string) => (ledger ? subs.put(ledgerRow(clinic.id, t.subscriptionId, status, d, prev, stamp, evt.type)) : Promise.resolve(false));

  // 1. Out of order: an older event never undoes a newer one. A "pending" row only says a
  // payment arrived (rows written before that rule may carry the payment's time): never stale against it.
  if (prev && prev.status !== "pending" && isStaleEvent(prev.last_event_at, eventAt)) {
    console.warn("[dodo:dentvideo] stale event ignored", evt.type, t.subscriptionId, eventAt, prev.last_event_at);
    return { status: 200, body: { ok: true, app: "dentvideo", ignored: "stale" } };
  }

  if (t.kind === "activate") {
    // 2. A subscription we know has ended may not come back on a late event.
    const knownEnded =
      (prev && DV_SUB_ENDED.has(String(prev.status)) ? String(prev.status) : null) ??
      (clinic.dodo_subscription_id === t.subscriptionId && clinic.plan === "cancelled" ? "cancelled" : null);
    const newerThanEnd = !!(prev && eventAt && prev.last_event_at && Date.parse(eventAt) > Date.parse(prev.last_event_at));
    // 3. With an API key, Dodo's own word decides whether this is really active.
    const live = await (deps.dodoStatus ?? liveDodoStatus)(t.subscriptionId);
    if (live && live !== "active") {
      console.warn("[dodo:dentvideo] activation not confirmed by Dodo", evt.type, t.subscriptionId, live);
      if (ledger) await subs.put(ledgerRow(clinic.id, t.subscriptionId, live, d, prev, stamp, evt.type));
      return { status: 200, body: { ok: true, app: "dentvideo", ignored: "not active at Dodo", dodoStatus: live } };
    }
    if (knownEnded && !newerThanEnd && live !== "active") {
      await tell(db, deps, clinic.id, (c) => alerts.lateActivation({ clinic: c, subscriptionId: t.subscriptionId, event: evt.type, status: knownEnded }));
      return { status: 200, body: { ok: true, app: "dentvideo", ignored: "late activation" } };
    }

    // 4. A different subscription while the clinic already has a live one: a duplicate.
    const other = clinic.dodo_subscription_id && clinic.dodo_subscription_id !== t.subscriptionId ? clinic.dodo_subscription_id : null;
    if (other && (clinic.plan === "active" || clinic.plan === "paused")) {
      const otherRec = ledger ? await subs.get(other) : undefined;
      const otherEnded = !!otherRec && DV_SUB_ENDED.has(String(otherRec.status));
      if (!otherEnded) {
        const keepOld = clinic.plan === "active";
        await tell(db, deps, clinic.id, (c) =>
          alerts.duplicateSubscription({
            clinic: c,
            existing: other,
            existingStatus: otherRec?.status ? String(otherRec.status) : clinic.plan,
            duplicate: t.subscriptionId,
            kept: keepOld ? other : t.subscriptionId,
          }),
        );
        if (keepOld) {
          // Recorded next to the live one; the clinic stays on the subscription it had.
          await record("active");
          return { status: 200, body: { ok: true, app: "dentvideo", duplicate: true, kept: other } };
        }
        // The old one is on hold: the clinic moves to the one that pays (below); the owner cancels the other.
      }
    }
  }

  // 5. The clinic's current subscription ended but another of its subscriptions is live: move to that one.
  if (t.kind === "deactivate" && ledger && clinic.dodo_subscription_id === t.subscriptionId) {
    const others = (await subs.forClinic(clinic.id)) ?? [];
    const alt = others.find((r) => r.dodo_subscription_id !== t.subscriptionId && r.status === "active");
    if (alt) {
      await record(reported);
      const move: Record<string, unknown> = { plan: "active", dodo_subscription_id: alt.dodo_subscription_id, plan_renews_at: alt.period_end ?? null, updated_at: now.toISOString() };
      if (alt.tier) move.plan_tier = alt.tier;
      const { error } = await db.from("dentvid_clinics").update(move).eq("id", clinic.id);
      if (error) return { status: 500, body: { error: error.message } };
      return { status: 200, body: { ok: true, app: "dentvideo", plan: "active", movedTo: alt.dodo_subscription_id } };
    }
  }

  const update = applyTransition(clinic, t);
  await record(reported);
  if (!update) return { status: 200, body: { ok: true, app: "dentvideo", unchanged: true } };

  let { error } = await db.from("dentvid_clinics").update({ ...update, updated_at: now.toISOString() }).eq("id", clinic.id);
  if (error && missingColumn(error)) {
    // Billing columns not migrated yet: the plan itself still moves.
    ({ error } = await db.from("dentvid_clinics").update({ plan: update.plan ?? clinic.plan, updated_at: now.toISOString() }).eq("id", clinic.id));
  }
  if (error) return { status: 500, body: { error: error.message } };

  const from = clinic.plan;
  const to = update.plan ?? clinic.plan;
  // A clinic's genuine first activation: it never had a subscription. A clinic coming back from
  // paused/cancelled is not "first" — the first-week watchdog must not re-make a week it has.
  const first = from === "trial" && !clinic.dodo_subscription_id;

  // The clinic hears about a payment problem (H9): on hold → its weeks stop until the card is updated.
  let clinicEmail: string | undefined;
  if (evt.type === "subscription.on_hold" && to === "paused") {
    const fix: PaymentFix = deps.selfServe ?? !!process.env.DODO_API_KEY?.trim() ? "portal" : "email";
    clinicEmail = await (deps.sendPaymentMail ?? paymentMail)(db, clinic.id, "on_hold", fix).catch((e) => {
      console.error("[dodo:dentvideo] payment email failed", clinic.id, (e as Error).message);
      return "failed";
    });
  }

  // The owner hears about it: a new (or returning) paying clinic — good news, sent at once —
  // and a paying clinic whose subscription stopped (customer at risk).
  if (to === "active" && from !== "active") {
    if (first) await (deps.markPaid ?? markPaid)(clinic.id).catch(() => {});
    await tell(db, deps, clinic.id, (c) =>
      alerts.newPayingClinic({
        clinic: { ...c, tier: c.tier ?? t.tier },
        interval: typeof d.metadata?.interval === "string" ? d.metadata.interval : null,
        returning: !first,
      }),
    );
  } else if (from === "active" && (to === "paused" || to === "cancelled")) {
    await tell(db, deps, clinic.id, (c) =>
      alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier ?? null }, event: evt.type, from, to, clinicEmailed: clinicEmail === "sent" }),
    );
  }

  // Paid: make this week's videos now rather than waiting for Monday. The
  // worker emails the dentist when they are ready. Best effort — the plan
  // has already moved, and the app's "first week" screen asks for the week
  // again (idempotent, same job id) if this did not get through. A returning
  // clinic that already has this week's videos keeps them (enqueueFirstWeek).
  if (update.plan === "active") void recordEvent("payment_succeeded", { db, clinicId: clinic.id, props: { tier: t.tier, interval: d.metadata?.interval, first, event: evt.type } });
  let firstWeek: FirstWeekResult | "failed" | undefined;
  if (update.plan === "active" && from !== "active") {
    try {
      firstWeek = await (deps.enqueueWeek ?? queueWeek)(db, clinic.id);
    } catch (e) {
      firstWeek = "failed";
      console.error("[dodo:dentvideo] could not queue the first week", clinic.id, (e as Error).message);
      // The first-week watchdog re-queues it once Redis is back — but a brand-new customer is waiting: the owner hears now.
      await tell(db, deps, clinic.id, (c) => alerts.enqueueFailed({ where: "payment", job: "week", error: cleanError(e), clinic: c }));
    }
  }

  // The welcome email: once per clinic (dentvid_email_log), so a retried
  // event or a clinic that pays again after cancelling never gets it twice.
  let welcomeEmail: string | undefined;
  if (update.plan === "active" && from !== "active") {
    try {
      welcomeEmail = await (deps.sendWelcome ?? welcome)(db, clinic.id);
    } catch (e) {
      welcomeEmail = "failed";
      console.error("[dodo:dentvideo] welcome email failed", clinic.id, (e as Error).message);
    }
    if (welcomeEmail && WELCOME_PROBLEM.has(welcomeEmail)) {
      console.error("[dodo:dentvideo] welcome email not sent", clinic.id, welcomeEmail);
      const result = welcomeEmail;
      await tell(db, deps, clinic.id, (c) => alerts.welcomeNotSent({ clinic: c, result }));
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      app: "dentvideo",
      plan: update.plan ?? clinic.plan,
      ...(firstWeek ? { firstWeek } : {}),
      ...(welcomeEmail ? { welcomeEmail } : {}),
      ...(clinicEmail ? { clinicEmail } : {}),
    },
  };
}
