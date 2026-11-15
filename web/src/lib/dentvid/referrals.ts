/**
 * Clinic referrals — "give a month, get a month". Pure rules (no I/O), so
 * every decision is unit-tested; referrals-server.ts does the database work
 * and billing-webhook.ts calls it from the Dodo webhook.
 *
 *  1. Every clinic has a code (DV + 6) and a link: dentvideo.com/?ref=<code>.
 *  2. A new clinic that comes through the link (browser keeps ?ref for 30
 *     days, lib/dentvid/attribution) has the code attached to its row at the
 *     clinic step — once, only before its first payment, never its own code.
 *  3. Its first checkout carries the referral discount code
 *     (DENTVIDEO_REFERRAL_DISCOUNT_CODE, a Dodo discount: REFERRAL.discountPercent
 *     off, one billing cycle, DentVideo products only). Without that env var
 *     the program is off: no discount, no referral card in Settings.
 *  4. When the referred clinic's first payment succeeds (Dodo webhook,
 *     payment.succeeded), the referrer's free month is recorded — once per
 *     referred clinic (unique row), held for REFERRAL.holdDays (the refund
 *     window), void on a refund or chargeback, capped per referrer per year.
 *  5. The owner applies a due free month in Dodo by hand and marks it applied
 *     in /admin/billing. Nothing here changes a Dodo subscription: Dodo has
 *     no "credit one month" call we could verify, so a wrong automatic change
 *     to a live subscription is not risked.
 */
import { REFERRAL_CODE, normaliseReferralCode } from "./attribution";

export { REFERRAL_CODE, normaliseReferralCode };

export const REFERRAL = {
  /** What the referred clinic gets on its first month (must match the Dodo discount). */
  discountPercent: 50,
  /** What the referrer gets per referred paying clinic. */
  rewardMonths: 1,
  /** Days a reward is held after the referred clinic's first payment (refund window: 14 days to claim + slack). */
  holdDays: 30,
  /** Free months one clinic can earn in any 365 days. */
  capPerYear: 6,
} as const;

const DAY = 86_400_000;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

type Env = Record<string, string | undefined>;

/** A fresh code: DV + 6 characters from an alphabet without 0/O/1/I. `random` is injectable for tests. */
export function newReferralCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(6);
  let out = "DV";
  // 256 is a multiple of 32: no modulo bias.
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** The Dodo discount code a referred clinic's first checkout carries, or null (program off). */
export function referralDiscountCode(env: Env = process.env): string | null {
  const c = (env.DENTVIDEO_REFERRAL_DISCOUNT_CODE ?? "").trim().toUpperCase();
  return /^[A-Z0-9_-]{1,40}$/.test(c) ? c : null;
}

export const referralProgramOn = (env: Env = process.env) => referralDiscountCode(env) !== null;

/** The link a clinic shares. */
export function referralLink(base: string, code: string): string {
  return `${base.replace(/\/+$/, "")}/?ref=${encodeURIComponent(code)}`;
}

/* ------------------------------------------------------------- attaching */

export type AttachClinic = {
  id: string;
  owner_id: string;
  plan: string;
  dodo_subscription_id?: string | null;
  referral_code?: string | null;
  referred_by_code?: string | null;
};
export type AttachReferrer = { id: string; owner_id: string } | null;

export type AttachDecision =
  | { ok: true; code: string; referrerClinicId: string }
  | { ok: false; reason: "bad_code" | "already_referred" | "already_paid" | "unknown_code" | "self_referral" };

/**
 * May this clinic be attributed to the clinic owning `code`?
 *  - the code must be one we issued (referrer found by it);
 *  - only once: a clinic already referred keeps its first referrer;
 *  - only before the first payment (a paying clinic cannot be "brought" later);
 *  - never its own code, nor a clinic of the same owner.
 */
export function attachDecision(clinic: AttachClinic, rawCode: string | null | undefined, referrer: AttachReferrer): AttachDecision {
  const code = normaliseReferralCode(rawCode);
  if (!code) return { ok: false, reason: "bad_code" };
  if (clinic.referred_by_code) return { ok: false, reason: "already_referred" };
  if (clinic.plan !== "trial" || clinic.dodo_subscription_id) return { ok: false, reason: "already_paid" };
  if (clinic.referral_code === code) return { ok: false, reason: "self_referral" };
  if (!referrer) return { ok: false, reason: "unknown_code" };
  if (referrer.id === clinic.id || String(referrer.owner_id).toLowerCase() === String(clinic.owner_id).toLowerCase()) return { ok: false, reason: "self_referral" };
  return { ok: true, code, referrerClinicId: referrer.id };
}

/** Should this clinic's checkout carry the referral discount? Referred, never paid, and no code typed by the clinic. */
export function checkoutReferralCode(
  clinic: { plan: string; dodo_subscription_id?: string | null; referred_by_code?: string | null },
  typed: string | null | undefined,
  env: Env = process.env,
): string | null {
  if ((typed ?? "").trim()) return null;
  if (!clinic.referred_by_code || clinic.plan !== "trial" || clinic.dodo_subscription_id) return null;
  return referralDiscountCode(env);
}

/* --------------------------------------------------------------- rewards */

export type RewardStatus = "pending" | "applied" | "void" | "capped";

export type RewardRow = {
  id?: number;
  referred_clinic_id: string | null;
  referrer_clinic_id: string;
  code: string;
  dodo_payment_id?: string | null;
  dodo_subscription_id?: string | null;
  first_paid_at: string;
  eligible_at: string;
  status: RewardStatus | string;
  void_reason?: string | null;
  applied_at?: string | null;
  applied_note?: string | null;
  created_at?: string;
};

export type RewardInput = {
  referredClinicId: string;
  referredOwnerEmail?: string | null;
  /** The referred clinic's referral, as stored on its row. */
  referral: { code: string; referrerClinicId: string } | null;
  referrerOwnerEmail?: string | null;
  /** The paying customer's email at Dodo. */
  payerEmail?: string | null;
  paymentId?: string | null;
  subscriptionId?: string | null;
  /** Amount charged, when the event says (minor units); a zero payment earns nothing. */
  amount?: number | null;
  paidAt: string;
  /** The referrer's rewards counted against the cap (pending or applied in the last 365 days). */
  referrerRecent: number;
};

export type RewardDecision = { record: false; reason: "not_referred" | "no_subscription" | "zero_amount" } | { record: true; row: RewardRow };

const sameEmail = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * What the referred clinic's first successful payment records for its
 * referrer. Idempotency is the database's (one row per referred clinic);
 * this decides the row: pending (held), capped (over the yearly cap) or void
 * (the payer is the referrer — the same email on both sides).
 */
export function rewardDecision(i: RewardInput): RewardDecision {
  if (!i.referral || i.referral.referrerClinicId === i.referredClinicId) return { record: false, reason: "not_referred" };
  if (!i.subscriptionId) return { record: false, reason: "no_subscription" };
  if (typeof i.amount === "number" && i.amount <= 0) return { record: false, reason: "zero_amount" };
  const paid = Date.parse(i.paidAt);
  const base: RewardRow = {
    referred_clinic_id: i.referredClinicId,
    referrer_clinic_id: i.referral.referrerClinicId,
    code: i.referral.code,
    dodo_payment_id: i.paymentId ?? null,
    dodo_subscription_id: i.subscriptionId,
    first_paid_at: new Date(paid).toISOString(),
    eligible_at: new Date(paid + REFERRAL.holdDays * DAY).toISOString(),
    status: "pending",
  };
  const self = sameEmail(i.referrerOwnerEmail, i.payerEmail) || sameEmail(i.referrerOwnerEmail, i.referredOwnerEmail);
  if (self) return { record: true, row: { ...base, status: "void", void_reason: "self_referral" } };
  if (i.referrerRecent >= REFERRAL.capPerYear) return { record: true, row: { ...base, status: "capped", void_reason: `cap of ${REFERRAL.capPerYear} per year reached` } };
  return { record: true, row: base };
}

/** Webhook events after which a reward not yet applied is void (money went back). */
export const REWARD_VOIDING = new Set(["refund.succeeded", "dispute.opened", "dispute.accepted", "dispute.lost"]);

/** What a refund / chargeback does to the referred clinic's reward. */
export function voidOnMoneyBack(eventType: string, row: Pick<RewardRow, "status"> | null): "void" | "already_applied" | null {
  if (!row || !REWARD_VOIDING.has(eventType)) return null;
  if (row.status === "pending" || row.status === "capped") return "void";
  if (row.status === "applied") return "already_applied";
  return null;
}

export type RewardState = "held" | "due" | "applied" | "void" | "capped";

/** Where a reward stands for the owner: held (refund window), due (apply it in Dodo), or settled. */
export function rewardState(row: Pick<RewardRow, "status" | "eligible_at">, now: Date): RewardState {
  if (row.status === "pending") return Date.parse(row.eligible_at) <= now.getTime() ? "due" : "held";
  return row.status === "applied" || row.status === "void" || row.status === "capped" ? row.status : "held";
}

/** Rewards counted against the yearly cap: pending or applied, first paid within the last 365 days. */
export function countsTowardCap(rows: Pick<RewardRow, "status" | "first_paid_at">[], now: Date): number {
  const since = now.getTime() - 365 * DAY;
  return rows.filter((r) => (r.status === "pending" || r.status === "applied") && Date.parse(r.first_paid_at) > since).length;
}

/** What the referrer sees in Settings. */
export type ReferralSummary = { held: number; due: number; applied: number };

export function summarise(rows: Pick<RewardRow, "status" | "eligible_at">[], now: Date): ReferralSummary {
  const out: ReferralSummary = { held: 0, due: 0, applied: 0 };
  for (const r of rows) {
    const s = rewardState(r, now);
    if (s === "held") out.held++;
    else if (s === "due") out.due++;
    else if (s === "applied") out.applied++;
  }
  return out;
}
