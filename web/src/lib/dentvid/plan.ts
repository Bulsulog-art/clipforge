import type { SupabaseClient } from "@supabase/supabase-js";
import { DV_TIERS, canMakeVideos, type DvPlanState, type DvTier } from "./billing";

export type ClinicPlan = {
  plan: DvPlanState;
  tier: DvTier | null;
  renewsAt: string | null;
  /** A trial clinic has had its free week made (a generated video that did not fail). */
  freeWeekUsed: boolean;
  canMake: boolean;
};

const STATES = new Set(["trial", "active", "paused", "cancelled"]);

/**
 * The clinic's plan as the app needs it. `plan` exists since 0001; the
 * billing columns arrive with 0002 — read separately so the app keeps working
 * if that migration is not applied yet.
 */
export async function loadClinicPlan(db: SupabaseClient, clinicId: string): Promise<ClinicPlan> {
  const [{ data: base }, { data: billing }, { count }] = await Promise.all([
    db.from("dentvid_clinics").select("plan").eq("id", clinicId).maybeSingle(),
    db.from("dentvid_clinics").select("plan_tier, plan_renews_at").eq("id", clinicId).maybeSingle(),
    db
      .from("dentvid_items")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("kind", "generated")
      .neq("status", "failed"),
  ]);
  const raw = (base as { plan?: string } | null)?.plan;
  const plan = (raw && STATES.has(raw) ? raw : "trial") as DvPlanState;
  const b = (billing ?? {}) as { plan_tier?: string | null; plan_renews_at?: string | null };
  const tier = b.plan_tier && (DV_TIERS as readonly string[]).includes(b.plan_tier) ? (b.plan_tier as DvTier) : null;
  const freeWeekUsed = (count ?? 0) > 0;
  return { plan, tier, renewsAt: b.plan_renews_at ?? null, freeWeekUsed, canMake: canMakeVideos(plan, freeWeekUsed) };
}
