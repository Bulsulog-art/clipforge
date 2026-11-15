import type { SupabaseClient } from "@supabase/supabase-js";
import { attachDecision, countsTowardCap, newReferralCode, summarise, type AttachDecision, type RewardRow, type ReferralSummary } from "./referrals";

/**
 * Referral data on Liman (migration 0018), service role only. Every call
 * degrades gracefully: until 0018 is applied reads say "unavailable" and
 * writes are skipped, so sign-up, checkout and the webhook behave as before.
 */

type PgError = { code?: string; message?: string } | null | undefined;

export const missingReferralSchema = (e: PgError) =>
  !!e &&
  (e.code === "42P01" || e.code === "42703" || e.code === "PGRST204" || e.code === "PGRST205" || /relation .* does not exist|column .* does not exist|Could not find the .* (table|column)/i.test(e.message ?? ""));

const uniqueViolation = (e: PgError) => !!e && (e.code === "23505" || /duplicate key/i.test(e.message ?? ""));

/** What the webhook needs. Tests pass an in-memory one. */
export interface ReferralStore {
  /** The referral stored on a clinic's row; null when not referred; undefined when 0018 is missing. */
  referralOf(clinicId: string): Promise<{ code: string; referrerClinicId: string } | null | undefined>;
  /** The referred clinic's reward row, null if none; undefined when unavailable. */
  rewardFor(referredClinicId: string): Promise<RewardRow | null | undefined>;
  /** A referrer's rewards counted against the yearly cap. */
  recentCount(referrerClinicId: string, now: Date): Promise<number>;
  /** Insert once. "exists" when the referred clinic already has a row (a retried or later payment). Throws on other errors. */
  insertReward(row: RewardRow): Promise<"created" | "exists" | "unavailable">;
  /** Mark the referred clinic's reward void (only while pending / capped). */
  voidReward(referredClinicId: string, reason: string, now: Date): Promise<void>;
  /** A clinic owner's login email (self-referral check); null when unknown. */
  ownerEmail(clinicId: string): Promise<string | null>;
}

export function supabaseReferralStore(db: SupabaseClient): ReferralStore {
  return {
    async referralOf(clinicId) {
      const { data, error } = await db.from("dentvid_clinics").select("referred_by_code, referred_by_clinic_id").eq("id", clinicId).maybeSingle();
      if (error) {
        if (missingReferralSchema(error)) return undefined;
        throw new Error(error.message);
      }
      const r = data as { referred_by_code?: string | null; referred_by_clinic_id?: string | null } | null;
      return r?.referred_by_code && r.referred_by_clinic_id ? { code: r.referred_by_code, referrerClinicId: r.referred_by_clinic_id } : null;
    },
    async rewardFor(referredClinicId) {
      const { data, error } = await db.from("dentvid_referral_rewards").select("*").eq("referred_clinic_id", referredClinicId).maybeSingle();
      if (error) {
        if (missingReferralSchema(error)) return undefined;
        throw new Error(error.message);
      }
      return (data as RewardRow | null) ?? null;
    },
    async recentCount(referrerClinicId, now) {
      const since = new Date(now.getTime() - 365 * 86_400_000).toISOString();
      const { data, error } = await db.from("dentvid_referral_rewards").select("status, first_paid_at").eq("referrer_clinic_id", referrerClinicId).gte("first_paid_at", since);
      if (error) throw new Error(error.message);
      return countsTowardCap((data ?? []) as Pick<RewardRow, "status" | "first_paid_at">[], now);
    },
    async insertReward(row) {
      const { error } = await db.from("dentvid_referral_rewards").insert(row);
      if (!error) return "created";
      if (uniqueViolation(error)) return "exists";
      if (missingReferralSchema(error)) return "unavailable";
      throw new Error(error.message);
    },
    async voidReward(referredClinicId, reason, now) {
      const { error } = await db
        .from("dentvid_referral_rewards")
        .update({ status: "void", void_reason: reason, updated_at: now.toISOString() })
        .eq("referred_clinic_id", referredClinicId)
        .in("status", ["pending", "capped"]);
      if (error && !missingReferralSchema(error)) throw new Error(error.message);
    },
    async ownerEmail(clinicId) {
      try {
        const { data } = await db.from("dentvid_clinics").select("owner_id").eq("id", clinicId).maybeSingle();
        const owner = (data as { owner_id?: string } | null)?.owner_id;
        if (!owner) return null;
        const { data: u } = await db.auth.admin.getUserById(owner);
        return u?.user?.email ?? null;
      } catch {
        return null;
      }
    },
  };
}

/* ------------------------------------------------------------ the clinic */

/**
 * The clinic's own code, made on first use. A collision with another clinic's
 * code (unique index) is retried with a new one. Null when 0018 is missing.
 */
export async function ensureReferralCode(admin: SupabaseClient, clinicId: string, make: () => string = () => newReferralCode()): Promise<string | null> {
  const { data, error } = await admin.from("dentvid_clinics").select("referral_code").eq("id", clinicId).maybeSingle();
  if (error) {
    if (!missingReferralSchema(error)) console.warn("[dentvideo referral] code read failed", error.message);
    return null;
  }
  const have = (data as { referral_code?: string | null } | null)?.referral_code;
  if (have) return have;
  for (let i = 0; i < 4; i++) {
    const code = make();
    // Only when still empty: two tabs opening Settings at once keep one code.
    const { data: set, error: e } = await admin.from("dentvid_clinics").update({ referral_code: code }).eq("id", clinicId).is("referral_code", null).select("referral_code").maybeSingle();
    if (!e) {
      if ((set as { referral_code?: string } | null)?.referral_code) return code;
      const again = await admin.from("dentvid_clinics").select("referral_code").eq("id", clinicId).maybeSingle();
      return ((again.data as { referral_code?: string | null } | null)?.referral_code as string | undefined) ?? null;
    }
    if (!uniqueViolation(e)) {
      if (!missingReferralSchema(e)) console.warn("[dentvideo referral] code not saved", e.message);
      return null;
    }
  }
  return null;
}

/**
 * Attach a referral code to a clinic at the clinic step (service role: the
 * columns are guarded against owner writes). Returns the decision, for logs and tests.
 */
export async function attachReferral(admin: SupabaseClient, clinicId: string, rawCode: string | null | undefined, now = new Date()): Promise<AttachDecision | { ok: false; reason: "unavailable" }> {
  const { data: clinic, error } = await admin
    .from("dentvid_clinics")
    .select("id, owner_id, plan, dodo_subscription_id, referral_code, referred_by_code")
    .eq("id", clinicId)
    .maybeSingle();
  if (error || !clinic) return { ok: false, reason: "unavailable" };
  const pre = attachDecision(clinic as Parameters<typeof attachDecision>[0], rawCode, { id: "", owner_id: "" });
  // Cheap refusals first (bad code, already referred / paid) — no lookup of other clinics.
  if (!pre.ok && pre.reason !== "self_referral") return pre;
  const code = (rawCode ?? "").trim().toUpperCase();
  const { data: ref } = await admin.from("dentvid_clinics").select("id, owner_id").eq("referral_code", code).maybeSingle();
  const decision = attachDecision(clinic as Parameters<typeof attachDecision>[0], rawCode, (ref as { id: string; owner_id: string } | null) ?? null);
  if (!decision.ok) return decision;
  const { error: e } = await admin
    .from("dentvid_clinics")
    .update({ referred_by_code: decision.code, referred_by_clinic_id: decision.referrerClinicId, referred_at: now.toISOString() })
    .eq("id", clinicId)
    .is("referred_by_code", null);
  if (e) {
    console.warn("[dentvideo referral] attach failed", e.message);
    return { ok: false, reason: "unavailable" };
  }
  return decision;
}

/** The referrer's own counts for Settings; null when 0018 is missing. */
export async function referralSummary(admin: SupabaseClient, clinicId: string, now = new Date()): Promise<ReferralSummary | null> {
  const { data, error } = await admin.from("dentvid_referral_rewards").select("status, eligible_at").eq("referrer_clinic_id", clinicId).limit(500);
  if (error) return null;
  return summarise((data ?? []) as Pick<RewardRow, "status" | "eligible_at">[], now);
}
