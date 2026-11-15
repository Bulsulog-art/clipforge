import { describe, expect, it } from "vitest";
import { attributionFrom, captureReferral, readReferral, referralFrom, REFERRAL_KEY, REFERRAL_TTL_MS } from "./attribution";
import {
  REFERRAL,
  attachDecision,
  checkoutReferralCode,
  countsTowardCap,
  newReferralCode,
  referralDiscountCode,
  referralLink,
  rewardDecision,
  rewardState,
  summarise,
  voidOnMoneyBack,
  type AttachClinic,
} from "./referrals";
import { buildDvCheckout } from "./billing";
import { parseAction } from "./admin-actions";
import { openProblems } from "./admin-ops";
import { REFERRAL_LOCALES, referralText } from "@/content/dentvideo-referral";
import { LOCALES } from "@/content/dentvideo-locales";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe("referral codes", () => {
  it("are DV + 6 characters without look-alikes, from the random bytes", () => {
    for (let i = 0; i < 50; i++) expect(newReferralCode()).toMatch(/^DV[2-9A-HJ-NP-Z]{6}$/);
    expect(newReferralCode(() => new Uint8Array([0, 1, 31, 32, 255, 8]))).toBe("DV23Z2ZA");
  });

  it("the link is the landing with ?ref=", () => {
    expect(referralLink("https://dentvideo.com/", "DV7K3M9Q")).toBe("https://dentvideo.com/?ref=DV7K3M9Q");
  });

  it("the program is on only with a Dodo discount code configured", () => {
    expect(referralDiscountCode({})).toBeNull();
    expect(referralDiscountCode({ DENTVIDEO_REFERRAL_DISCOUNT_CODE: " friend50 " })).toBe("FRIEND50");
    expect(referralDiscountCode({ DENTVIDEO_REFERRAL_DISCOUNT_CODE: "bad code!" })).toBeNull();
  });
});

describe("attribution: ?ref= from the landing to the clinic step", () => {
  it("reads our code from the query string, normalised, and nothing else", () => {
    expect(referralFrom("?ref=dv7k3m9q")).toBe("DV7K3M9Q");
    expect(referralFrom("?utm_source=x&ref=DV7K3M9Q")).toBe("DV7K3M9Q");
    expect(referralFrom("?ref=producthunt")).toBeNull();
    expect(referralFrom("?ref=embed")).toBeNull();
    expect(referralFrom("?ref=DV0O1I00")).toBeNull(); // look-alikes are never issued
    expect(referralFrom("")).toBeNull();
  });

  it("does not turn ?ref= into a utm or referrer-host source", () => {
    expect(attributionFrom("?ref=DV7K3M9Q", "", "dentvideo.com")).toEqual({});
  });

  it("keeps the first code for 30 days in this browser, then forgets it", () => {
    const s = memory();
    const t0 = Date.parse("2026-11-01T00:00:00Z");
    expect(captureReferral("DV7K3M9Q", s, t0)).toBe("DV7K3M9Q");
    // A second link does not replace the first one while it lasts.
    expect(captureReferral("DVAAAAAA", s, t0 + 1000)).toBe("DV7K3M9Q");
    expect(readReferral(s, t0 + REFERRAL_TTL_MS - 1)).toBe("DV7K3M9Q");
    expect(readReferral(s, t0 + REFERRAL_TTL_MS + 1)).toBeNull();
    // Expired: a new link is kept.
    expect(captureReferral("DVAAAAAA", s, t0 + REFERRAL_TTL_MS + 1)).toBe("DVAAAAAA");
  });

  it("ignores a tampered or malformed stored value", () => {
    const s = memory();
    s.setItem(REFERRAL_KEY, JSON.stringify({ code: "<script>", at: Date.now() }));
    expect(readReferral(s)).toBeNull();
    s.setItem(REFERRAL_KEY, "not json");
    expect(readReferral(s)).toBeNull();
    expect(readReferral(null)).toBeNull();
  });
});

describe("attaching a referral to the clinic row", () => {
  const fresh: AttachClinic = { id: B, owner_id: "owner-b", plan: "trial", dodo_subscription_id: null, referral_code: null, referred_by_code: null };
  const referrer = { id: A, owner_id: "owner-a" };

  it("attaches a known code to a new, unpaid clinic", () => {
    expect(attachDecision(fresh, "dv7k3m9q", referrer)).toEqual({ ok: true, code: "DV7K3M9Q", referrerClinicId: A });
  });

  it("blocks self-referral: the clinic's own code, the same clinic, or the same owner", () => {
    expect(attachDecision({ ...fresh, referral_code: "DV7K3M9Q" }, "DV7K3M9Q", referrer)).toEqual({ ok: false, reason: "self_referral" });
    expect(attachDecision(fresh, "DV7K3M9Q", { id: B, owner_id: "someone" })).toEqual({ ok: false, reason: "self_referral" });
    expect(attachDecision(fresh, "DV7K3M9Q", { id: A, owner_id: "OWNER-B" })).toEqual({ ok: false, reason: "self_referral" });
  });

  it("only once, only before the first payment, only for codes we issued", () => {
    expect(attachDecision({ ...fresh, referred_by_code: "DVAAAAAA" }, "DV7K3M9Q", referrer)).toEqual({ ok: false, reason: "already_referred" });
    expect(attachDecision({ ...fresh, plan: "active" }, "DV7K3M9Q", referrer)).toEqual({ ok: false, reason: "already_paid" });
    expect(attachDecision({ ...fresh, plan: "cancelled" }, "DV7K3M9Q", referrer)).toEqual({ ok: false, reason: "already_paid" });
    expect(attachDecision({ ...fresh, dodo_subscription_id: "sub_1" }, "DV7K3M9Q", referrer)).toEqual({ ok: false, reason: "already_paid" });
    expect(attachDecision(fresh, "DV7K3M9Q", null)).toEqual({ ok: false, reason: "unknown_code" });
    expect(attachDecision(fresh, "embed", referrer)).toEqual({ ok: false, reason: "bad_code" });
  });
});

describe("the referred clinic's first checkout", () => {
  const env = { DENTVIDEO_REFERRAL_DISCOUNT_CODE: "FRIEND50" };
  it("carries the referral discount when referred and never paid, unless the clinic typed a code", () => {
    expect(checkoutReferralCode({ plan: "trial", referred_by_code: "DV7K3M9Q" }, null, env)).toBe("FRIEND50");
    expect(checkoutReferralCode({ plan: "trial", referred_by_code: "DV7K3M9Q" }, "MYCODE", env)).toBeNull();
    expect(checkoutReferralCode({ plan: "trial", referred_by_code: null }, null, env)).toBeNull();
    expect(checkoutReferralCode({ plan: "cancelled", referred_by_code: "DV7K3M9Q", dodo_subscription_id: "sub_1" }, null, env)).toBeNull();
    expect(checkoutReferralCode({ plan: "trial", referred_by_code: "DV7K3M9Q" }, null, {})).toBeNull();
  });

  it("lands in Dodo's discount_codes", () => {
    const plan = buildDvCheckout({ tier: "starter", interval: "month", code: "FRIEND50", clinicId: B, ownerId: "owner-b" }, {});
    expect(plan.ok && plan.body.discount_codes).toEqual(["FRIEND50"]);
  });
});

describe("the referrer's free month", () => {
  const base = {
    referredClinicId: B,
    referral: { code: "DV7K3M9Q", referrerClinicId: A },
    referrerOwnerEmail: "a@clinic-a.example",
    referredOwnerEmail: "b@clinic-b.example",
    payerEmail: "b@clinic-b.example",
    paymentId: "pay_1",
    subscriptionId: "sub_1",
    amount: 1450,
    paidAt: "2026-11-15T10:00:00Z",
    referrerRecent: 0,
  };

  it("is recorded pending, due after the hold", () => {
    const d = rewardDecision(base);
    expect(d.record && d.row).toMatchObject({ status: "pending", referrer_clinic_id: A, referred_clinic_id: B, eligible_at: "2026-12-15T10:00:00.000Z" });
    if (!d.record) throw new Error("expected a row");
    expect(rewardState(d.row, new Date("2026-12-01T00:00:00Z"))).toBe("held");
    expect(rewardState(d.row, new Date("2026-12-15T10:00:00Z"))).toBe("due");
  });

  it("self-referral by the same person (same email on both sides) earns nothing", () => {
    const d = rewardDecision({ ...base, payerEmail: "A@Clinic-A.example" });
    expect(d.record && d.row).toMatchObject({ status: "void", void_reason: "self_referral" });
    const d2 = rewardDecision({ ...base, referredOwnerEmail: "a@clinic-a.example", payerEmail: "other@x.example" });
    expect(d2.record && d2.row).toMatchObject({ status: "void" });
    expect(rewardDecision({ ...base, referral: { code: "DV7K3M9Q", referrerClinicId: B } })).toEqual({ record: false, reason: "not_referred" });
  });

  it("is capped per referrer per year", () => {
    const d = rewardDecision({ ...base, referrerRecent: REFERRAL.capPerYear });
    expect(d.record && d.row.status).toBe("capped");
    const now = new Date("2026-11-15T00:00:00Z");
    const rows = [
      { status: "pending", first_paid_at: "2026-10-01T00:00:00Z" },
      { status: "applied", first_paid_at: "2026-01-01T00:00:00Z" },
      { status: "void", first_paid_at: "2026-10-01T00:00:00Z" },
      { status: "capped", first_paid_at: "2026-10-01T00:00:00Z" },
      { status: "applied", first_paid_at: "2025-10-01T00:00:00Z" }, // over a year ago
    ];
    expect(countsTowardCap(rows, now)).toBe(2);
  });

  it("needs a real subscription payment", () => {
    expect(rewardDecision({ ...base, subscriptionId: null })).toEqual({ record: false, reason: "no_subscription" });
    expect(rewardDecision({ ...base, amount: 0 })).toEqual({ record: false, reason: "zero_amount" });
    expect(rewardDecision({ ...base, referral: null })).toEqual({ record: false, reason: "not_referred" });
  });

  it("a refund or chargeback voids it unless already applied", () => {
    expect(voidOnMoneyBack("refund.succeeded", { status: "pending" })).toBe("void");
    expect(voidOnMoneyBack("dispute.opened", { status: "capped" })).toBe("void");
    expect(voidOnMoneyBack("dispute.lost", { status: "applied" })).toBe("already_applied");
    expect(voidOnMoneyBack("refund.failed", { status: "pending" })).toBeNull();
    expect(voidOnMoneyBack("dispute.won", { status: "pending" })).toBeNull();
    expect(voidOnMoneyBack("refund.succeeded", null)).toBeNull();
  });

  it("is summarised for the referrer", () => {
    const now = new Date("2026-12-20T00:00:00Z");
    expect(
      summarise(
        [
          { status: "pending", eligible_at: "2026-12-15T00:00:00Z" },
          { status: "pending", eligible_at: "2027-01-15T00:00:00Z" },
          { status: "applied", eligible_at: "2026-10-01T00:00:00Z" },
          { status: "void", eligible_at: "2026-10-01T00:00:00Z" },
        ],
        now,
      ),
    ).toEqual({ held: 1, due: 1, applied: 1 });
  });
});

describe("admin: applying a due month", () => {
  it("needs the referrer, the reward and a note on what was done in Dodo", () => {
    expect(parseAction({ action: "referral_applied", clinicId: A, rewardId: "7", note: "next billing +1 month" })).toEqual({ action: "referral_applied", clinicId: A, rewardId: 7, note: "next billing +1 month" });
    expect(parseAction({ action: "referral_applied", clinicId: A, rewardId: "7", note: "" })).toBeNull();
    expect(parseAction({ action: "referral_applied", clinicId: A, rewardId: "x", note: "done" })).toBeNull();
    expect(parseAction({ action: "referral_applied", clinicId: "nope", rewardId: "7", note: "done" })).toBeNull();
  });

  it("due months show up as an open problem", () => {
    const p = openProblems({ items: [], system: { available: true, health: "ok", queues: [], stuck: [] } as never, emailFailures: 0, billing: [], parked: 0, referralsDue: 2, now: new Date() });
    expect(p).toContainEqual(expect.objectContaining({ key: "referrals", count: 2, section: "billing" }));
  });
});

describe("referral card copy", () => {
  it("exists in every language, with the program's numbers filled in", () => {
    expect(new Set(REFERRAL_LOCALES)).toEqual(new Set(LOCALES));
    for (const l of LOCALES) {
      const t = referralText(l, { applied: 1, pending: 2 });
      for (const v of Object.values(t)) expect(v, `${l}: ${v}`).not.toMatch(/\{\w+\}/);
      expect(t.lead).toContain(String(REFERRAL.discountPercent));
      expect(t.terms).toContain(String(REFERRAL.holdDays));
      expect(t.terms).toContain(String(REFERRAL.capPerYear));
    }
  });
});
