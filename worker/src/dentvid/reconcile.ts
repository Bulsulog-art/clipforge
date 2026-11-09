import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
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

export type ReconcileDeps = {
  db: ReconcileDb;
  /** Dodo's view of a subscription; null when there is no API key or the call failed. */
  dodo: ((subscriptionId: string) => Promise<DodoSub | null>) | null;
  alert: (a: OwnerAlert) => Promise<DeliverResult | unknown>;
  now?: Date;
};

export type ReconcileResult = { checked: number; paused: string[]; cancelled: string[]; corrected: string[] };

const ENDED_CANCELLED = new Set(["cancelled", "expired"]);
const ENDED_PAUSED = new Set(["failed", "on_hold", "paused"]);

export async function reconcileBilling(deps: ReconcileDeps): Promise<ReconcileResult> {
  const now = deps.now ?? new Date();
  const res: ReconcileResult = { checked: 0, paused: [], cancelled: [], corrected: [] };
  for (const c of await deps.db.activeClinics()) {
    res.checked++;
    const renews = c.plan_renews_at ? Date.parse(c.plan_renews_at) : Number.NaN;
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
  logger.info({ checked: res.checked, paused: res.paused.length, cancelled: res.cancelled.length, corrected: res.corrected.length }, "dentvid: billing reconcile");
  return res;
}

/* ------------------------------------------------------------ Liman / Dodo */

export function supabaseReconcileDb(db: SupabaseClient): ReconcileDb {
  return {
    async activeClinics() {
      const { data, error } = await db.from("dentvid_clinics").select("id, plan_renews_at, dodo_subscription_id").eq("plan", "active").limit(5000);
      if (error) throw new Error(`reconcile: ${error.message}`);
      return (data ?? []) as ActiveClinic[];
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
