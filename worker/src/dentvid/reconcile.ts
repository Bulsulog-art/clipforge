import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { activeClinicRows } from "./schedule.js";
import { alerts, type ClinicRef, type DeliverResult, type OwnerAlert } from "./ops-alert.js";

/**
 * Nightly billing reconciliation (BullMQ job "billing-reconcile" on the
 * dentvid-mail queue).
 *
 * The plan moves with Dodo's webhooks. If a renewal never arrives — a lost
 * webhook, a subscription that quietly ended — a clinic would keep getting
 * paid weeks for free. So every night, for each active clinic:
 *
 *   - with DODO_API_KEY (worker env): ask Dodo. Active with a later billing
 *     date → the stored renewal date is corrected; on hold → paused;
 *     cancelled / expired / failed → cancelled / paused. Any change alerts
 *     the owner.
 *   - otherwise (or when Dodo cannot be reached): if plan_renews_at plus a
 *     3-day grace has passed with no renewal event, access is paused and the
 *     owner is told. A renewal event that arrives later re-activates the
 *     clinic as usual (the ledger marks the subscription "lapsed", which is
 *     not an ended status, and its last event time is left untouched).
 *
 * The pause is conditional on the row still being active with the same
 * renewal date, so a webhook that lands mid-run always wins.
 *
 * Clinics paid through the App Store (billing_source = apple, web migration
 * 0026; docs/DENTVIDEO_IAP_PLAN.md) have no Dodo subscription. For them:
 *
 *   - with DENTVID_REVENUECAT_RECONCILE=on and DENTVID_REVENUECAT_API_KEY
 *     (worker env): ask RevenueCat (GET /v1/subscribers/{app_user_id}). Paid
 *     through a later date → the stored date is corrected; nothing paid any
 *     more → cancelled, owner alerted. No answer → the clock below.
 *   - otherwise: auto-renew was switched off (ledger "cancelled") and the paid
 *     period is over → cancelled (the EXPIRATION webhook was lost); else the
 *     same 3-day grace as above → paused.
 */

export const RECONCILE_SCHEDULE = { pattern: "17 3 * * *", tz: "UTC" } as const;
export const RENEWAL_GRACE_MS = 3 * 86_400_000;

export type ActiveClinic = { id: string; plan_renews_at: string | null; dodo_subscription_id: string | null };
export type DodoSub = { status: string; next_billing_date?: string | null };

export interface ReconcileDb {
  activeClinics(): Promise<ActiveClinic[]>;
  /** Moves an active clinic to `plan` only if it is still active with this renewal date; true when it did. */
  setPlan(c: ActiveClinic, plan: "paused" | "cancelled"): Promise<boolean>;
  setRenewsAt(clinicId: string, renewsAt: string): Promise<void>;
  /** Best effort: mark the subscription in the ledger (0007), without touching its last event time. */
  markLedger(subscriptionId: string, status: string): Promise<void>;
  clinic(clinicId: string): Promise<ClinicRef>;
}

/** An active clinic paid through the App Store: its login (RevenueCat's app_user_id) and the ledger status of its subscription. */
export type AppleClinic = { owner_id: string; status: string | null };
/** RevenueCat's view of a login's DentVideo subscription. */
export type RcSub = { active: boolean; expiresAt: string | null };

export type ReconcileDeps = {
  db: ReconcileDb & {
    /** Active App Store clinics by id; null when 0026 is not applied (the App Store branch is skipped). */
    appleClinics?(): Promise<Map<string, AppleClinic> | null>;
  };
  /** Dodo's view of a subscription; null when there is no API key or the call failed. */
  dodo: ((subscriptionId: string) => Promise<DodoSub | null>) | null;
  /** RevenueCat's view of a login (flag + key); null when off. A call that fails returns null for that login. */
  revenuecat?: ((appUserId: string) => Promise<RcSub | null>) | null;
  alert: (a: OwnerAlert) => Promise<DeliverResult | unknown>;
  now?: Date;
};

export type ReconcileResult = { checked: number; paused: string[]; cancelled: string[]; corrected: string[]; appStore?: number };

const ENDED_CANCELLED = new Set(["cancelled", "expired"]);
const ENDED_PAUSED = new Set(["failed", "on_hold", "paused"]);

export async function reconcileBilling(deps: ReconcileDeps): Promise<ReconcileResult> {
  const now = deps.now ?? new Date();
  const res: ReconcileResult = { checked: 0, paused: [], cancelled: [], corrected: [], appStore: 0 };
  const apple = deps.db.appleClinics ? await deps.db.appleClinics().catch(() => null) : null;
  for (const c of await deps.db.activeClinics()) {
    res.checked++;
    const renews = c.plan_renews_at ? Date.parse(c.plan_renews_at) : Number.NaN;
    const ac = apple?.get(c.id);
    if (ac) {
      res.appStore = (res.appStore ?? 0) + 1;
      await reconcileAppStore(c, ac, renews, now, deps, res);
      continue;
    }
    let live: DodoSub | null = null;
    if (deps.dodo && c.dodo_subscription_id) live = await deps.dodo(c.dodo_subscription_id).catch(() => null);

    if (live) {
      const next = live.next_billing_date ? Date.parse(live.next_billing_date) : Number.NaN;
      if (live.status === "active") {
        if (Number.isFinite(next) && (!Number.isFinite(renews) || next > renews)) {
          await deps.db.setRenewsAt(c.id, new Date(next).toISOString());
          res.corrected.push(c.id);
        }
        continue; // Dodo says it is paid: never pause on our clock alone.
      }
      // Cancelled / expired but paid until a date still ahead: the clinic keeps its weeks until
      // then (docs/RELIABILITY.md F9); plan-end.ts ends the plan at that date.
      if (ENDED_CANCELLED.has(live.status) && Number.isFinite(renews) && renews > now.getTime()) continue;
      const to = ENDED_CANCELLED.has(live.status) ? "cancelled" : ENDED_PAUSED.has(live.status) ? "paused" : null;
      if (to && (await deps.db.setPlan(c, to))) {
        (to === "cancelled" ? res.cancelled : res.paused).push(c.id);
        if (c.dodo_subscription_id) await deps.db.markLedger(c.dodo_subscription_id, live.status).catch(() => {});
        await deps.alert(alerts.accessLapsed({ clinic: await deps.db.clinic(c.id), renewsAt: c.plan_renews_at ?? now.toISOString(), dodoStatus: live.status })).catch(() => {});
        logger.warn({ clinicId: c.id, dodo: live.status, to }, "dentvid: reconcile — Dodo says the subscription is not active");
      }
      continue;
    }

    // No word from Dodo: our own clock, with a grace period for late renewals.
    if (!Number.isFinite(renews) || now.getTime() <= renews + RENEWAL_GRACE_MS) continue;
    if (await deps.db.setPlan(c, "paused")) {
      res.paused.push(c.id);
      if (c.dodo_subscription_id) await deps.db.markLedger(c.dodo_subscription_id, "lapsed").catch(() => {});
      await deps.alert(alerts.accessLapsed({ clinic: await deps.db.clinic(c.id), renewsAt: c.plan_renews_at! })).catch(() => {});
      logger.warn({ clinicId: c.id, renewsAt: c.plan_renews_at }, "dentvid: reconcile — no renewal past the grace, access paused");
    }
  }
  logger.info({ checked: res.checked, appStore: res.appStore, paused: res.paused.length, cancelled: res.cancelled.length, corrected: res.corrected.length }, "dentvid: billing reconcile");
  return res;
}

/** One App Store clinic (see the header): RevenueCat when on, else the clock. */
async function reconcileAppStore(c: ActiveClinic, ac: AppleClinic, renews: number, now: Date, deps: ReconcileDeps, res: ReconcileResult): Promise<void> {
  const live = deps.revenuecat ? await deps.revenuecat(ac.owner_id).catch(() => null) : null;
  if (live) {
    const exp = live.expiresAt ? Date.parse(live.expiresAt) : Number.NaN;
    if (live.active) {
      if (Number.isFinite(exp) && (!Number.isFinite(renews) || exp > renews)) {
        await deps.db.setRenewsAt(c.id, new Date(exp).toISOString());
        res.corrected.push(c.id);
      }
      return; // RevenueCat says it is paid: never pause on our clock alone.
    }
    if (await deps.db.setPlan(c, "cancelled")) {
      res.cancelled.push(c.id);
      await deps.alert(alerts.accessLapsed({ clinic: await deps.db.clinic(c.id), renewsAt: c.plan_renews_at ?? now.toISOString(), dodoStatus: "App Store: not active at RevenueCat" })).catch(() => {});
      logger.warn({ clinicId: c.id }, "dentvid: reconcile — RevenueCat says the App Store subscription is not active");
    }
    return;
  }
  if (!Number.isFinite(renews)) return;
  // Auto-renew off and the paid period over: the EXPIRATION webhook should have ended it.
  if (ac.status === "cancelled" && now.getTime() > renews) {
    if (await deps.db.setPlan(c, "cancelled")) {
      res.cancelled.push(c.id);
      logger.info({ clinicId: c.id, renewsAt: c.plan_renews_at }, "dentvid: reconcile — cancelled App Store plan reached its end");
    }
    return;
  }
  if (now.getTime() <= renews + RENEWAL_GRACE_MS) return;
  if (await deps.db.setPlan(c, "paused")) {
    res.paused.push(c.id);
    await deps.alert(alerts.accessLapsed({ clinic: await deps.db.clinic(c.id), renewsAt: c.plan_renews_at!, dodoStatus: "App Store: no renewal webhook" })).catch(() => {});
    logger.warn({ clinicId: c.id, renewsAt: c.plan_renews_at }, "dentvid: reconcile — App Store plan, no renewal past the grace, access paused");
  }
}

/* ------------------------------------------------------------ Liman / Dodo */

export function supabaseReconcileDb(db: SupabaseClient): ReconcileDeps["db"] {
  return {
    async appleClinics() {
      // Its own query: before 0026 the columns do not exist and the App Store branch is simply skipped.
      const { data, error } = await db
        .from("dentvid_clinics")
        .select("id, owner_id, apple_original_transaction_id")
        .eq("plan", "active")
        .eq("billing_source", "apple")
        .limit(10_000);
      if (error) return null;
      const rows = (data ?? []) as { id: string; owner_id: string; apple_original_transaction_id: string | null }[];
      const ids = rows.map((r) => r.apple_original_transaction_id).filter((x): x is string => !!x);
      const status = new Map<string, string>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: subs } = await db.from("dentvid_apple_subscriptions").select("original_transaction_id, status").in("original_transaction_id", ids.slice(i, i + 200));
        for (const s of (subs ?? []) as { original_transaction_id: string; status: string }[]) status.set(s.original_transaction_id, s.status);
      }
      return new Map(rows.map((r) => [r.id, { owner_id: r.owner_id, status: r.apple_original_transaction_id ? (status.get(r.apple_original_transaction_id) ?? null) : null }]));
    },
    async activeClinics() {
      return activeClinicRows<ActiveClinic>(db, "id, plan_renews_at, dodo_subscription_id").catch((e: Error) => {
        throw new Error(`reconcile: ${e.message}`);
      });
    },
    async setPlan(c, plan) {
      let q = db.from("dentvid_clinics").update({ plan, updated_at: new Date().toISOString() }).eq("id", c.id).eq("plan", "active");
      q = c.plan_renews_at ? q.eq("plan_renews_at", c.plan_renews_at) : q.is("plan_renews_at", null);
      const { data, error } = await q.select("id");
      if (error) throw new Error(`reconcile: ${error.message}`);
      return (data ?? []).length > 0;
    },
    async setRenewsAt(clinicId, renewsAt) {
      await db.from("dentvid_clinics").update({ plan_renews_at: renewsAt, updated_at: new Date().toISOString() }).eq("id", clinicId).eq("plan", "active");
    },
    async markLedger(subscriptionId, status) {
      // 0007 may not be applied: an error here is ignored by the caller.
      const { error } = await db.from("dentvid_subscriptions").update({ status, updated_at: new Date().toISOString() }).eq("dodo_subscription_id", subscriptionId);
      if (error) throw new Error(error.message);
    },
    async clinic(clinicId) {
      const { data } = await db.from("dentvid_clinics").select("id, profile, plan_tier").eq("id", clinicId).maybeSingle();
      const p = ((data as { profile?: { name?: string; country?: string } } | null)?.profile ?? {}) as { name?: string; country?: string };
      return { id: clinicId, name: p.name ?? null, country: p.country ?? null, tier: (data as { plan_tier?: string } | null)?.plan_tier ?? null };
    },
  };
}

const SUB_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** Dodo lookups when the worker has DODO_API_KEY (same account as the web app); null otherwise. */
export function dodoLookup(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): ReconcileDeps["dodo"] {
  const key = env.DODO_API_KEY?.trim();
  if (!key) return null;
  const base = env.DODO_ENVIRONMENT === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
  return async (id) => {
    if (!SUB_ID.test(id)) return null;
    try {
      const res = await fetchImpl(`${base}/subscriptions/${id}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return null;
      const body = (await res.json()) as { status?: string; next_billing_date?: string | null };
      return body.status ? { status: body.status, next_billing_date: body.next_billing_date ?? null } : null;
    } catch {
      return null;
    }
  };
}

/** The App Store product ids (web lib/dentvid/apple-billing.ts DV_IAP_PRODUCTS; same env overrides). */
export function iapProductIds(env: Record<string, string | undefined> = process.env): string[] {
  return [env.DENTVID_IAP_PRODUCT_STARTER?.trim() || "dentvideo_starter_monthly", env.DENTVID_IAP_PRODUCT_PRACTICE?.trim() || "dentvideo_practice_monthly"];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RevenueCat lookups for the nightly reconcile: only with DENTVID_REVENUECAT_RECONCILE=on AND
 * DENTVID_REVENUECAT_API_KEY (a secret v1 key of the DentVideo project); null otherwise.
 * GET https://api.revenuecat.com/v1/subscribers/{app_user_id}: the latest expiry among DentVideo's
 * App Store products (or their grace period) decides. Any failure → null (the clock decides).
 */
export function revenuecatLookup(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch, now: () => Date = () => new Date()): ReconcileDeps["revenuecat"] {
  const key = env.DENTVID_REVENUECAT_API_KEY?.trim();
  if (!key || (env.DENTVID_REVENUECAT_RECONCILE ?? "").trim().toLowerCase() !== "on") return null;
  const products = new Set(iapProductIds(env));
  return async (appUserId) => {
    if (!UUID.test(appUserId)) return null;
    try {
      const res = await fetchImpl(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { subscriber?: { subscriptions?: Record<string, { expires_date?: string | null; grace_period_expires_date?: string | null; refunded_at?: string | null; store?: string }> } };
      const subs = body.subscriber?.subscriptions;
      if (!subs) return null;
      let best = Number.NaN;
      for (const [id, s] of Object.entries(subs)) {
        if (!products.has(id) || s.refunded_at) continue;
        for (const d of [s.expires_date, s.grace_period_expires_date]) {
          const t = d ? Date.parse(d) : Number.NaN;
          if (Number.isFinite(t) && !(t <= best)) best = t;
        }
      }
      if (!Number.isFinite(best)) return { active: false, expiresAt: null };
      return { active: best > now().getTime(), expiresAt: new Date(best).toISOString() };
    } catch {
      return null;
    }
  };
}

/**
 * Retention for Google Ads click ids (web migration 0019, privacy policy:
 * 90 days): runs public.dentvid_purge_ad_data() after the nightly reconcile.
 * Best effort — never fails the job (before 0019 is applied the function is
 * missing and this only logs). Returns rows deleted, or null when it could not run.
 */
export async function purgeAdData(db: Pick<SupabaseClient, "rpc">): Promise<number | null> {
  try {
    const { data, error } = await db.rpc("dentvid_purge_ad_data");
    if (error) {
      logger.warn({ err: error.message }, "dentvid: ad click retention purge did not run");
      return null;
    }
    const n = typeof data === "number" ? data : Number(data) || 0;
    if (n > 0) logger.info({ deleted: n }, "dentvid: ad click ids older than 90 days deleted");
    return n;
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "dentvid: ad click retention purge did not run");
    return null;
  }
}
