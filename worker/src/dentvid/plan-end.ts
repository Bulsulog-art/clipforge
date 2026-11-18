import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { takeOverWithWaitingApple, type TakeoverDeps } from "./apple-takeover.js";

/**
 * Cancelled plans that were paid until a date (docs/RELIABILITY.md F9).
 *
 * When a subscription is cancelled (or expires) while the period it paid for
 * is still running, the web app's payment webhook keeps the clinic active and
 * records the end: plan_renews_at on the clinic and, on the subscription's
 * ledger row (dentvid_subscriptions, 0007), status cancelled/expired with
 * period_end. The clinic keeps its Monday weeks until then.
 *
 * This check (hourly, with the delivery watchdog) ends those plans once the
 * date has passed: plan → cancelled, only while the clinic is still active on
 * that very subscription — so a clinic that re-subscribed in the meantime (its
 * current subscription is the new one) is never touched, and a second run, or
 * a second worker, changes nothing (the update is conditional).
 */

export const ENDING_STATUSES = ["cancelled", "expired"] as const;
/** Ended plans are looked for this far back (the check runs hourly; this only covers an outage). */
export const PLAN_END_LOOKBACK_MS = 35 * 86_400_000;

export type EndingSub = { dodo_subscription_id: string; clinic_id: string; status: string; period_end: string };

export interface PlanEndDb {
  /** Ledger rows with an ending status whose period_end lies in [since, now]; null when the ledger is unavailable. */
  endedSince(since: Date, now: Date): Promise<EndingSub[] | null>;
  /** plan → cancelled, only if the clinic is active on this subscription; true when it moved. `endedAt`: the paid period's end (retention.ts). */
  endPlan(clinicId: string, subscriptionId: string, now: Date, endedAt?: string): Promise<boolean>;
}

export type PlanEndResult = { checked: number; ended: string[]; movedToApple?: string[] };

/**
 * `apple`: an App Store subscription bought while the web plan was live takes over at once
 * (apple-takeover.ts) — the customer is paying Apple and must not sit unserved until its next renewal.
 */
export async function endPaidUpPlans(db: PlanEndDb, now = new Date(), apple?: TakeoverDeps): Promise<PlanEndResult> {
  const rows = await db.endedSince(new Date(now.getTime() - PLAN_END_LOOKBACK_MS), now);
  const res: PlanEndResult = { checked: rows?.length ?? 0, ended: [] };
  for (const r of rows ?? []) {
    if (!(Date.parse(r.period_end) <= now.getTime())) continue;
    if (await db.endPlan(r.clinic_id, r.dodo_subscription_id, now, new Date(Date.parse(r.period_end)).toISOString())) {
      res.ended.push(r.clinic_id);
      logger.info({ clinicId: r.clinic_id, subscriptionId: r.dodo_subscription_id, endedAt: r.period_end }, "dentvid: cancelled plan reached the end of its paid period");
      if (apple && (await takeOverWithWaitingApple(apple, r.clinic_id, "web plan reached its paid end", now))) (res.movedToApple ??= []).push(r.clinic_id);
    }
  }
  return res;
}

export function supabasePlanEndDb(db: SupabaseClient): PlanEndDb {
  return {
    async endedSince(since, now) {
      const { data, error } = await db
        .from("dentvid_subscriptions")
        .select("dodo_subscription_id, clinic_id, status, period_end")
        .in("status", [...ENDING_STATUSES])
        .gte("period_end", since.toISOString())
        .lte("period_end", now.toISOString())
        .limit(1000);
      if (error) {
        // 0007 not applied: the webhook cancels at once in that case, so there is nothing to end.
        logger.warn({ err: error.message }, "dentvid: plan-end check could not read the ledger");
        return null;
      }
      return (data ?? []) as EndingSub[];
    },
    async endPlan(clinicId, subscriptionId, now, endedAt) {
      const end = (patch: Record<string, unknown>) =>
        db.from("dentvid_clinics").update(patch).eq("id", clinicId).eq("plan", "active").eq("dodo_subscription_id", subscriptionId).select("id");
      const base = { plan: "cancelled", plan_renews_at: null, updated_at: now.toISOString() };
      // The library's 90 days (retention.ts) count from the paid period's end; without 0025 the plan still ends.
      let { data, error } = await end(endedAt ? { ...base, plan_ended_at: endedAt } : base);
      if (error && endedAt && /plan_ended_at/.test(error.message)) ({ data, error } = await end(base));
      if (error) throw new Error(`plan end: ${error.message}`);
      return (data ?? []).length > 0;
    },
  };
}
