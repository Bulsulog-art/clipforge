import type { SupabaseClient } from "@supabase/supabase-js";
import { DV_TIERS, canMakeVideos, type DvPlanState, type DvTier } from "./billing";
import { billingText } from "@/content/dentvideo-billing";
import { DV_SUPPORT_EMAIL } from "./app-ui";

/** "Paused by DentVideo — write to us", in the clinic's language (the week / recording routes answer with it). */
export function adminPausedMessage(language: string | null | undefined): string {
  return billingText(language).copy.panel.adminPausedBody.replace("{email}", DV_SUPPORT_EMAIL);
}

export type ClinicPlan = {
  /** "trial" = signed up but not paid yet: no videos are made until a plan is active. */
  plan: DvPlanState;
  tier: DvTier | null;
  renewsAt: string | null;
  canMake: boolean;
  /** The Dodo subscription the plan comes from (0002), for the billing-state checks. */
  subscriptionId?: string | null;
  /**
   * The owner paused this clinic from the admin panel (0010 admin_paused_at). The worker
   * makes nothing for it, so the app must not offer "make this week" or show "being made".
   */
  adminPaused?: boolean;
  /** Cancelled but paid until this date (set by the page from the ledger: billing-state.ts loadPlanEnd). */
  endsAt?: string | null;
  /**
   * A plan that has ended (cancelled): when it ended and when its videos are deleted (0024,
   * worker/src/dentvid/retention.ts). Absent while the plan runs, or before the worker has seen the end.
   */
  retention?: { endedAt: string; deleteOn: string } | null;
};

/** The library's 90 days after a plan ends (same rule as the worker's retention.ts deleteDate). */
export const LIBRARY_RETENTION_DAYS = 90;

export function retentionDates(plan: string, endedAt: string | null | undefined, deleteAfter: string | null | undefined): { endedAt: string; deleteOn: string } | null {
  if (plan !== "cancelled" || !endedAt) return null;
  const ended = Date.parse(endedAt);
  if (!Number.isFinite(ended)) return null;
  const earliest = ended + LIBRARY_RETENTION_DAYS * 86_400_000;
  const after = deleteAfter ? Date.parse(deleteAfter) : NaN;
  return { endedAt, deleteOn: new Date(Number.isFinite(after) ? Math.max(earliest, after) : earliest).toISOString() };
}

const STATES = new Set(["trial", "active", "paused", "cancelled"]);

/**
 * The clinic's plan as the app needs it. `plan` exists since 0001; the
 * billing columns arrive with 0002 — read separately so the app keeps working
 * if that migration is not applied yet.
 */
export async function loadClinicPlan(db: SupabaseClient, clinicId: string): Promise<ClinicPlan> {
  const [{ data: base }, { data: billing }, { data: pause }, ended] = await Promise.all([
    db.from("dentvid_clinics").select("plan").eq("id", clinicId).maybeSingle(),
    db.from("dentvid_clinics").select("plan_tier, plan_renews_at, dodo_subscription_id").eq("id", clinicId).maybeSingle(),
    // Its own read: before 0010 the column does not exist and this simply returns no data.
    db.from("dentvid_clinics").select("admin_paused_at").eq("id", clinicId).maybeSingle(),
    // Its own read too: before 0024 there are no retention dates.
    Promise.resolve(db.from("dentvid_clinics").select("plan_ended_at, library_delete_after").eq("id", clinicId).maybeSingle()).catch(() => ({ data: null })),
  ]);
  const raw = (base as { plan?: string } | null)?.plan;
  const plan = (raw && STATES.has(raw) ? raw : "trial") as DvPlanState;
  const b = (billing ?? {}) as { plan_tier?: string | null; plan_renews_at?: string | null; dodo_subscription_id?: string | null };
  const tier = b.plan_tier && (DV_TIERS as readonly string[]).includes(b.plan_tier) ? (b.plan_tier as DvTier) : null;
  const adminPaused = !!(pause as { admin_paused_at?: string | null } | null)?.admin_paused_at;
  const r = ((ended as { data?: unknown } | null)?.data ?? null) as { plan_ended_at?: string | null; library_delete_after?: string | null } | null;
  return {
    plan,
    tier,
    renewsAt: b.plan_renews_at ?? null,
    canMake: canMakeVideos(plan) && !adminPaused,
    subscriptionId: b.dodo_subscription_id ?? null,
    adminPaused,
    retention: retentionDates(plan, r?.plan_ended_at, r?.library_delete_after),
  };
}
