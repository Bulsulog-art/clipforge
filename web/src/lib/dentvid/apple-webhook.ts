import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DV_SUB_ENDED, futurePaidThrough, isStaleEvent, type DvTier } from "./billing";
import {
  appleEffect,
  appleEventTime,
  appleSubscriptionKey,
  candidateUserIds,
  iapTierForProduct,
  sandboxPolicy,
  type AppleEffect,
  type RcEvent,
} from "./apple-billing";
import { missingSchema, readClinicSource, supabaseAppleStore, type AppleSubRecord, type AppleSubscriptionStore, type ClinicSource } from "./apple-store";
import { supabaseSubscriptionStore, type SubscriptionStore } from "./subscriptions";
import { afterPaid, tellOwner, type ActivationDeps } from "./billing-activation";
import { ownerIsInternal } from "./internal-server";
import { alerts, type OwnerAlert } from "./ops-alert";
import { raiseOwnerAlert } from "./ops-server";

/**
 * POST /api/dentvideo/revenuecat/webhook — App Store purchases made in the
 * DentVideo iPhone app, as RevenueCat reports them (docs/DENTVIDEO_IAP_PLAN.md).
 *
 * The plan lands in the same clinic fields as a Dodo payment (plan, plan_tier,
 * plan_renews_at) with billing_source = 'apple', and the first activation runs
 * the very same activation as the web (billing-activation.ts afterPaid): the
 * week is queued now, the watchdog told, the welcome sent once per clinic.
 *
 * Rules (each one tested in apple-webhook.test.ts):
 *  - app_user_id is the Liman user id; only a DentVideo login with a clinic
 *    is ever switched on. Unknown → 200 + owner alert (a retry will not make
 *    it known). A login without a clinic yet → 503 so RevenueCat retries.
 *  - Duplicates: the delivery id (route, Redis) and the ledger's last event
 *    id; out of order: an event older than the last one applied is ignored.
 *  - One plan per clinic. Apple subscription arrives while a web (Dodo)
 *    subscription is live → the clinic moves to Apple and the owner is told
 *    to cancel and refund the Dodo one (we can; an Apple charge only the
 *    customer can get back). Never two activations, two weeks or two welcomes.
 *  - Auto-renew off (CANCELLATION) keeps the plan until the paid period's end
 *    (like the web's F9); EXPIRATION ends it; a refund ends it at once.
 *  - BILLING_ISSUE: Apple's billing grace period keeps the clinic on until it
 *    ends; without one the clinic is paused (like Dodo's on hold) until a
 *    RENEWAL arrives. Apple emails the customer about the card; we do not.
 *  - Sandbox purchases follow DENTVID_IAP_SANDBOX (default allow: App Review
 *    must be able to buy); promotional / other stores and family sharing never
 *    switch a clinic on.
 */

export type AppleWebhookResult = { status: 200 | 401 | 500 | 503; body: Record<string, unknown> };

export type AppleWebhookDeps = ActivationDeps & {
  apple?: AppleSubscriptionStore;
  /** The Dodo ledger (0007), to tell whether a web subscription is still live. */
  subs?: SubscriptionStore;
  /** A Liman login by id: whether it is a DentVideo account; null when there is no such login; throws on a lookup failure. */
  userById?: (db: SupabaseClient, id: string) => Promise<{ id: string; dentvideo: boolean } | null>;
  env?: Record<string, string | undefined>;
};

type ClinicRow = { id: string; owner_id: string; plan: string; plan_tier: string | null; dodo_subscription_id: string | null; plan_renews_at: string | null };

/* -------------------------------------------------------------------- auth */

/**
 * The Authorization header RevenueCat sends is exactly the value configured
 * in its dashboard. We accept the shared secret itself or "Bearer <secret>".
 * Compared as SHA-256 digests with timingSafeEqual (constant time, and no
 * length leak). No secret configured → nothing is accepted.
 */
export function revenuecatAuthOk(header: string | null | undefined, secret: string | null | undefined): boolean {
  const want = (secret ?? "").trim();
  if (want.length < 16 || !header) return false;
  const got = header.trim();
  const h = (s: string) => createHash("sha256").update(s).digest();
  const g = h(got);
  return timingSafeEqual(g, h(want)) || timingSafeEqual(g, h(`Bearer ${want}`));
}

/* --------------------------------------------------------------- lookups */

async function limanUser(db: SupabaseClient, id: string): Promise<{ id: string; dentvideo: boolean } | null> {
  const { isDentvideoUser } = await import("./membership");
  const { data, error } = await db.auth.admin.getUserById(id);
  if (error) {
    const e = error as { status?: number; code?: string; message?: string };
    if (e.status === 404 || e.code === "user_not_found" || /not.?found/i.test(e.message ?? "")) return null;
    throw new Error(e.message ?? "user lookup failed");
  }
  return data?.user ? { id: data.user.id, dentvideo: isDentvideoUser(data.user) } : null;
}

async function clinicOfOwner(db: SupabaseClient, ownerId: string): Promise<{ row: ClinicRow | null; error: string | null }> {
  const { data, error } = await db.from("dentvid_clinics").select("id, owner_id, plan, plan_tier, dodo_subscription_id, plan_renews_at").eq("owner_id", ownerId).maybeSingle();
  if (error) return { row: null, error: error.message };
  const row = (data as ClinicRow | null) ?? null;
  return { row: row && String(row.owner_id).toLowerCase() === ownerId.toLowerCase() ? row : null, error: null };
}

/** The first candidate id that is a DentVideo login. "error" when Liman could not be asked (500: RevenueCat retries). */
async function findUser(db: SupabaseClient, ids: string[], deps: AppleWebhookDeps): Promise<string | null | "error"> {
  for (const id of ids) {
    try {
      const u = await (deps.userById ?? limanUser)(db, id);
      if (u?.dentvideo) return u.id;
    } catch (e) {
      console.error("[apple:dentvideo] user lookup failed", (e as Error).message);
      return "error";
    }
  }
  return null;
}

/* ------------------------------------------------------------ the writes */

const APPLE_COLUMNS = ["billing_source", "apple_original_transaction_id"] as const;

/**
 * Update the clinic row. The Apple columns (0026) go in the same update; a
 * database without them still gets the plan (the customer paid) and the owner
 * is told to apply the migration.
 */
async function updateClinic(db: SupabaseClient, clinicId: string, patch: Record<string, unknown>): Promise<{ error: string | null; migrationMissing: boolean }> {
  const first = await db.from("dentvid_clinics").update(patch).eq("id", clinicId);
  if (!first.error) return { error: null, migrationMissing: false };
  if (!missingSchema(first.error) || !APPLE_COLUMNS.some((k) => k in patch)) return { error: first.error.message, migrationMissing: false };
  const base = Object.fromEntries(Object.entries(patch).filter(([k]) => !(APPLE_COLUMNS as readonly string[]).includes(k)));
  const second = await db.from("dentvid_clinics").update(base).eq("id", clinicId);
  return { error: second.error?.message ?? null, migrationMissing: !second.error };
}

function ledgerRow(prev: AppleSubRecord | null | undefined, key: string, clinicId: string, userId: string, evt: RcEvent, eventAt: string | null, patch: Partial<AppleSubRecord>): AppleSubRecord {
  return {
    original_transaction_id: key,
    clinic_id: clinicId,
    app_user_id: userId,
    status: prev?.status ?? "active",
    product: evt.product_id ?? prev?.product ?? null,
    tier: iapTierForProduct(evt.product_id) ?? prev?.tier ?? null,
    pending_tier: prev?.pending_tier ?? null,
    environment: evt.environment ?? prev?.environment ?? null,
    period_end: prev?.period_end ?? null,
    last_event_id: evt.id ?? null,
    last_event_at: eventAt ?? prev?.last_event_at ?? null,
    last_event_type: evt.type ?? null,
    ...patch,
  };
}

const ENDED = new Set(["expired", "refunded", "transferred"]);
/** An Apple subscription that will not renew or is not being paid right now: a newer purchase may take over from it. */
const NOT_RENEWING = new Set(["cancelled", "billing_issue", ...ENDED]);

const ok = (body: Record<string, unknown>): AppleWebhookResult => ({ status: 200, body: { ok: true, app: "dentvideo", store: "app_store", ...body } });

/* ---------------------------------------------------------------- handler */

export async function handleAppleEvent(db: SupabaseClient, evt: RcEvent, deps: AppleWebhookDeps = {}): Promise<AppleWebhookResult> {
  const env = deps.env ?? process.env;
  const effect = appleEffect(evt, env);
  const type = evt.type ?? "unknown";
  if (effect.kind === "test") return ok({ test: true });
  const alert = (a: OwnerAlert) => (deps.alert ?? raiseOwnerAlert)(a).catch(() => {});

  const key = appleSubscriptionKey(evt);
  if (effect.kind === "ignore") {
    // Only an event that would otherwise have moved a plan is worth the owner's attention.
    const planEvent = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"].includes(type);
    if (planEvent) await alert(alerts.appStoreBilling({ kind: "ignored", event: type, subscription: key ?? "unknown", detail: effect.why }));
    return ok({ ignored: effect.why });
  }
  if (effect.kind === "transfer") return transfer(db, evt, deps);
  if (!key) {
    console.warn("[apple:dentvideo] event without a transaction id", type);
    return ok({ ignored: "no transaction id" });
  }

  // 1. Whose purchase: a DentVideo login, then its clinic.
  const userId = await findUser(db, candidateUserIds(evt), deps);
  if (userId === "error") return { status: 500, body: { error: "user lookup failed" } };
  if (!userId) {
    console.warn("[apple:dentvideo] event for no DentVideo login", type, key);
    await alert(alerts.appStoreBilling({ kind: "unmatched", event: type, subscription: key, detail: evt.app_user_id?.startsWith("$RCAnonymousID") ? "anonymous RevenueCat id: the app did not log in before buying" : null }));
    return ok({ ignored: "no user" });
  }
  const found = await clinicOfOwner(db, userId);
  if (found.error) return { status: 500, body: { error: found.error } };
  const clinic = found.row;
  if (!clinic) {
    if (effect.kind === "activate") {
      await alert(alerts.appStoreBilling({ kind: "no_clinic", event: type, subscription: key }));
      // RevenueCat retries a 5xx with back-off: the plan switches on once the clinic form is saved.
      return { status: 503, body: { error: "clinic not set up yet — retry" } };
    }
    return ok({ ignored: "no clinic" });
  }

  return applyToClinic(db, evt, effect, key, userId, clinic, deps);
}

async function applyToClinic(
  db: SupabaseClient,
  evt: RcEvent,
  effect: Exclude<AppleEffect, { kind: "test" | "ignore" | "transfer" }>,
  key: string,
  userId: string,
  clinic: ClinicRow,
  deps: AppleWebhookDeps,
): Promise<AppleWebhookResult> {
  const env = deps.env ?? process.env;
  const type = evt.type ?? "unknown";
  const now = deps.now?.() ?? new Date();
  const nowIso = now.toISOString();
  const apple = deps.apple ?? supabaseAppleStore(db);
  const tell = (make: Parameters<typeof tellOwner>[3]) => tellOwner(db, deps, clinic.id, make);
  const eventAt = appleEventTime(evt);

  // 2. Duplicates and order (the ledger, 0026; without it the rules below are state-based and idempotent).
  const prev = await apple.get(key);
  const ledger = prev !== undefined;
  if (prev && evt.id && prev.last_event_id === evt.id) return ok({ duplicate: true });
  if (prev && isStaleEvent(prev.last_event_at, eventAt)) {
    console.warn("[apple:dentvideo] stale event ignored", type, key, eventAt, prev.last_event_at);
    return ok({ ignored: "stale" });
  }
  const record = (patch: Partial<AppleSubRecord>) => (ledger ? apple.put(ledgerRow(prev, key, clinic.id, userId, evt, eventAt, patch)) : Promise.resolve(false));

  // 3. Which subscription the clinic's plan comes from now.
  const src: ClinicSource | null = await readClinicSource(db, clinic.id);
  const live = clinic.plan === "active" || clinic.plan === "paused";
  const appleManaged = live && src?.source === "apple";
  // Without 0026 the clinic's Apple subscription is unknown: an Apple event is about the current plan
  // whenever the plan does not come from a Dodo subscription.
  const current = src ? (src.source === "apple" ? src.appleSubscription : null) : clinic.dodo_subscription_id ? null : key;
  const isCurrent = current === key || (appleManaged && !src?.appleSubscription);
  let migrationMissing = !src;

  if (effect.kind === "activate") {
    // Sandbox purchases: TestFlight, App Review, Xcode builds. No money moved.
    const sandbox = evt.environment === "SANDBOX";
    if (sandbox) {
      const policy = sandboxPolicy(env);
      const internal = policy === "internal" ? await (deps.ownerInternal ?? ownerIsInternal)(db, clinic.owner_id).catch(() => false) : false;
      if (policy === "off" || (policy === "internal" && !internal)) {
        await record({ status: "ignored_sandbox" });
        return ok({ ignored: "sandbox" });
      }
    }

    // a. Another Apple subscription is the clinic's live one (a second Apple ID): keep it unless it is ending.
    if (appleManaged && current && current !== key) {
      const cur = await apple.get(current);
      const curEnding = clinic.plan === "paused" || (!!cur && NOT_RENEWING.has(String(cur.status)));
      if (!curEnding) {
        await record({ status: "duplicate", period_end: effect.periodEnd, tier: effect.tier });
        await tell((c) => alerts.appStoreBilling({ kind: "apple_duplicate", event: type, subscription: key, other: current, clinic: c }));
        return ok({ duplicate: true, kept: current });
      }
    }

    // b. A live web (Dodo) subscription: the clinic moves to Apple; the owner cancels and refunds the Dodo one.
    let dodoLive: string | null = null;
    if (live && src?.source !== "apple" && clinic.dodo_subscription_id) {
      const dodoRow = await (deps.subs ?? supabaseSubscriptionStore(db)).get(clinic.dodo_subscription_id);
      if (!dodoRow || !DV_SUB_ENDED.has(String(dodoRow.status))) dodoLive = clinic.dodo_subscription_id;
    }

    const from = clinic.plan;
    const first = from === "trial" && !clinic.dodo_subscription_id && !src?.appleSubscription;
    // An upgrade moves the tier now; a renewal carries whatever Apple now charges for.
    const tier: DvTier = effect.tier;
    const patch: Record<string, unknown> = {
      plan: "active",
      plan_tier: tier,
      plan_renews_at: effect.periodEnd ?? clinic.plan_renews_at,
      dodo_subscription_id: null,
      billing_source: "apple",
      apple_original_transaction_id: key,
    };
    const same =
      from === "active" &&
      clinic.plan_tier === tier &&
      (clinic.plan_renews_at ?? null) === (patch.plan_renews_at ?? null) &&
      !clinic.dodo_subscription_id &&
      src?.source === "apple" &&
      src.appleSubscription === key;
    if (!same) {
      const u = await updateClinic(db, clinic.id, { ...patch, updated_at: nowIso });
      if (u.error) return { status: 500, body: { error: u.error } };
      migrationMissing = migrationMissing || u.migrationMissing;
    }
    await record({ status: "active", tier, period_end: effect.periodEnd, pending_tier: null });
    if (dodoLive) await tell((c) => alerts.appStoreBilling({ kind: "cross_channel", event: type, subscription: key, other: dodoLive, clinic: c }));
    if (migrationMissing) await tell((c) => alerts.appStoreBilling({ kind: "migration_missing", event: type, subscription: key, clinic: c }));
    if (sandbox && from !== "active") await tell((c) => alerts.appStoreBilling({ kind: "sandbox", event: type, subscription: key, clinic: c }));

    const paid = await afterPaid(db, deps, {
      clinic: { id: clinic.id, owner_id: clinic.owner_id },
      from,
      first,
      tier,
      interval: "month",
      event: type,
      source: "apple",
      // An App Store purchase is not a Google Ads web conversion (docs/DENTVIDEO_IAP_PLAN.md §7).
      adConversion: false,
      logTag: "[apple:dentvideo]",
    });
    return ok({ plan: "active", tier, ...(dodoLive ? { movedFrom: dodoLive } : {}), ...(paid.firstWeek ? { firstWeek: paid.firstWeek } : {}), ...(paid.welcomeEmail ? { welcomeEmail: paid.welcomeEmail } : {}) });
  }

  if (effect.kind === "scheduled_change") {
    await record({ pending_tier: effect.tier });
    return ok({ scheduled: effect.tier });
  }

  if (effect.kind === "note") {
    // The status keeps meaning "is it paid"; the event type is what is remembered.
    await record({});
    if (effect.status === "refund_reversed") await tell((c) => alerts.appStoreBilling({ kind: "refund_reversed", event: type, subscription: key, clinic: c }));
    return ok({ recorded: effect.status });
  }

  // Everything below changes a plan only when this is the clinic's current subscription.
  if (effect.kind === "ending") {
    const end = futurePaidThrough(effect.periodEnd ?? clinic.plan_renews_at, now);
    await record({ status: "cancelled", period_end: end ?? effect.periodEnd ?? prev?.period_end ?? null });
    if (!isCurrent || clinic.plan !== "active") return ok({ recorded: "cancelled", ...(isCurrent ? {} : { current: false }) });
    if (end) {
      if (clinic.plan_renews_at !== end) {
        const u = await updateClinic(db, clinic.id, { plan_renews_at: end, updated_at: nowIso });
        if (u.error) return { status: 500, body: { error: u.error } };
      }
      if (prev?.status !== "cancelled") {
        await tell((c) => alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier }, event: `App Store ${type}`, from: "active", to: `active until ${end.slice(0, 10)}, then cancelled` }));
      }
      return ok({ plan: "active", endsAt: end });
    }
    // The paid period is already over: the plan ends now.
    return endPlan("expired");
  }

  if (effect.kind === "billing_issue") {
    const grace = futurePaidThrough(effect.graceEnd, now);
    await record({ status: "billing_issue", ...(grace ? { period_end: grace } : {}) });
    if (!isCurrent || clinic.plan !== "active") return ok({ recorded: "billing_issue", ...(isCurrent ? {} : { current: false }) });
    if (grace) {
      // Apple's billing grace period: the customer keeps the service while Apple retries the card.
      if (clinic.plan_renews_at !== grace) {
        const u = await updateClinic(db, clinic.id, { plan_renews_at: grace, updated_at: nowIso });
        if (u.error) return { status: 500, body: { error: u.error } };
      }
      await tell((c) => alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier }, event: `App Store ${type}`, from: "active", to: `active in Apple's billing grace until ${grace.slice(0, 10)}` }));
      return ok({ plan: "active", graceUntil: grace });
    }
    // No grace: like Dodo's on hold — weeks stop until Apple's retry succeeds (RENEWAL switches it back on).
    const u = await updateClinic(db, clinic.id, { plan: "paused", updated_at: nowIso });
    if (u.error) return { status: 500, body: { error: u.error } };
    await tell((c) => alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier }, event: `App Store ${type}`, from: "active", to: "paused" }));
    return ok({ plan: "paused" });
  }

  // effect.kind === "end": expired, or refunded.
  await record({ status: effect.reason, ...(effect.reason === "refunded" ? { period_end: nowIso } : {}) });
  if (effect.reason === "refunded") {
    await tell((c) => alerts.appStoreBilling({ kind: "refund", event: type, subscription: key, clinic: c, detail: isCurrent && live ? null : "not current" }));
  }
  if (!isCurrent || !live) return ok({ recorded: effect.reason, ...(isCurrent ? {} : { current: false }) });
  return endPlan(effect.reason);

  /** The clinic's current Apple subscription is over: another live Apple subscription of the clinic takes over, else the plan ends. */
  async function endPlan(reason: "expired" | "refunded"): Promise<AppleWebhookResult> {
    const others = ledger ? ((await apple.forClinic(clinic.id)) ?? []) : [];
    const alt = others.find((r) => r.original_transaction_id !== key && (r.status === "active" || r.status === "duplicate") && !!futurePaidThrough(r.period_end, now));
    if (alt) {
      const u = await updateClinic(db, clinic.id, {
        plan: "active",
        plan_tier: alt.tier ?? clinic.plan_tier,
        plan_renews_at: alt.period_end,
        apple_original_transaction_id: alt.original_transaction_id,
        billing_source: "apple",
        updated_at: nowIso,
      });
      if (u.error) return { status: 500, body: { error: u.error } };
      await apple.put({ ...alt, status: "active" });
      return ok({ plan: "active", movedTo: alt.original_transaction_id });
    }
    const u = await updateClinic(db, clinic.id, { plan: "cancelled", plan_renews_at: null, updated_at: nowIso });
    if (u.error) return { status: 500, body: { error: u.error } };
    if (clinic.plan === "active") {
      await tell((c) => alerts.customerAtRisk({ clinic: { ...c, tier: c.tier ?? clinic.plan_tier }, event: `App Store ${type}`, from: clinic.plan, to: "cancelled" }));
    }
    return ok({ plan: "cancelled", reason });
  }
}

/**
 * TRANSFER: RevenueCat moved a purchase between app user ids (usually
 * "Restore purchases" while signed in to another account). The account it
 * left loses the plan that came from it; the account it went to is switched on
 * only when the event itself shows a paid, current DentVideo subscription.
 */
async function transfer(db: SupabaseClient, evt: RcEvent, deps: AppleWebhookDeps): Promise<AppleWebhookResult> {
  const type = evt.type ?? "TRANSFER";
  const key = appleSubscriptionKey(evt);
  const nowIso = (deps.now?.() ?? new Date()).toISOString();
  const apple = deps.apple ?? supabaseAppleStore(db);
  const fromIds = candidateUserIds({ app_user_id: undefined, aliases: evt.transferred_from ?? [] });
  const toIds = candidateUserIds({ app_user_id: undefined, aliases: evt.transferred_to ?? [] });
  const left: string[] = [];
  for (const id of fromIds) {
    const found = await clinicOfOwner(db, id);
    if (found.error) return { status: 500, body: { error: found.error } };
    const c = found.row;
    if (!c) continue;
    const src = await readClinicSource(db, c.id);
    if (src?.source !== "apple" || (c.plan !== "active" && c.plan !== "paused")) continue;
    // The event names the subscription when it can; otherwise it is the clinic's current Apple one.
    if (key && src.appleSubscription && src.appleSubscription !== key) continue;
    const u = await updateClinic(db, c.id, { plan: "cancelled", plan_renews_at: null, updated_at: nowIso });
    if (u.error) return { status: 500, body: { error: u.error } };
    const moved = src.appleSubscription ?? key;
    if (moved) {
      const prev = await apple.get(moved);
      // The event id is stamped by the receiving side below (when it is switched on), not here.
      if (prev) await apple.put({ ...prev, status: "transferred", last_event_type: type, last_event_at: appleEventTime(evt) ?? prev.last_event_at ?? null });
    }
    left.push(c.id);
  }
  await (deps.alert ?? raiseOwnerAlert)(alerts.appStoreBilling({ kind: "transfer", event: type, subscription: key ?? "unknown", detail: `${fromIds.length} → ${toIds.length} account(s), ${left.length} clinic(s) switched off` })).catch(() => {});

  // The receiving account: only with a product and a paid-through date still ahead (the event says so).
  const tier = iapTierForProduct(evt.product_id, deps.env ?? process.env);
  const end = futurePaidThrough(typeof evt.expiration_at_ms === "number" ? new Date(evt.expiration_at_ms).toISOString() : null, deps.now?.() ?? new Date());
  if (key && tier && end && toIds.length) {
    const userId = await findUser(db, toIds, deps);
    if (userId && userId !== "error") {
      const found = await clinicOfOwner(db, userId);
      if (found.row) {
        const res = await applyToClinic(db, evt, { kind: "activate", tier, periodEnd: end, status: "active" }, key, userId, found.row, deps);
        return { ...res, body: { ...res.body, switchedOff: left } };
      }
    }
  }
  return ok({ transfer: true, switchedOff: left });
}
