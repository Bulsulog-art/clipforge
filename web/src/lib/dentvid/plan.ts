import type { SupabaseClient } from "@supabase/supabase-js";
import { DV_TIERS, canMakeVideos, type DvPlanState, type DvTier } from "./billing";

export type ClinicPlan = {
  /** "trial" = signed up but not paid yet: no videos are made until a plan is active. */
  plan: DvPlanState;
  tier: DvTier | null;
  renewsAt: string | null;
  canMake: boolean;
  /** The Dodo subscription the plan comes from (0002), for the billing-state checks. */
  subscriptionId?: string | null;
};

const STATES = new Set(["trial", "active", "paused", "cancelled"]);

/**
 * The clinic's plan as the app needs it. `plan` exists since 0001; the
 * billing columns arrive with 0002 — read separately so the app keeps working
 * if that migration is not applied yet.
 */
export async function loadClinicPlan(db: SupabaseClient, clinicId: string): Promise<ClinicPlan> {
  const [{ data: base }, { data: billing }] = await Promise.all([
    db.from("dentvid_clinics").select("plan").eq("id", clinicId).maybeSingle(),
    db.from("dentvid_clinics").select("plan_tier, plan_renews_at, dodo_subscription_id").eq("id", clinicId).maybeSingle(),
  ]);
  const raw = (base as { plan?: string } | null)?.plan;
  const plan = (raw && STATES.has(raw) ? raw : "trial") as DvPlanState;
  const b = (billing ?? {}) as { plan_tier?: string | null; plan_renews_at?: string | null; dodo_subscription_id?: string | null };
  const tier = b.plan_tier && (DV_TIERS as readonly string[]).includes(b.plan_tier) ? (b.plan_tier as DvTier) : null;
  return { plan, tier, renewsAt: b.plan_renews_at ?? null, canMake: canMakeVideos(plan), subscriptionId: b.dodo_subscription_id ?? null };
}
