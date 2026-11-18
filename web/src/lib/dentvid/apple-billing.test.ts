import { describe, expect, it } from "vitest";
import { internalPatterns, patternRegex } from "./internal-traffic";
import {
  APP_STORE_MANAGE_URL,
  appleEffect,
  appleSubscriptionKey,
  candidateUserIds,
  iapProducts,
  iapTierForProduct,
  isUpgrade,
  mobileBillingView,
  sandboxOwnerAllowed,
  sandboxPolicy,
  type MobileBillingInput,
  type RcEvent,
} from "./apple-billing";
import { DV_LIST_PRICES } from "./pricing";

const U = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const base = (type: string, extra: Partial<RcEvent> = {}): RcEvent => ({
  id: "evt-1",
  type,
  app_user_id: U,
  product_id: "dentvideo_practice_monthly",
  store: "APP_STORE",
  environment: "PRODUCTION",
  original_transaction_id: "2000000100",
  expiration_at_ms: Date.parse("2026-12-17T10:00:00Z"),
  event_timestamp_ms: Date.parse("2026-11-17T10:00:00Z"),
  ...extra,
});

describe("App Store products", () => {
  it("sells the web's two plans, monthly, in one group — and no price leaves the server", () => {
    expect(iapProducts({})).toEqual([
      { tier: "starter", productId: "dentvideo_starter_monthly", entitlement: "starter" },
      { tier: "practice", productId: "dentvideo_practice_monthly", entitlement: "practice" },
    ]);
    // The tiers are exactly pricing.ts's self-serve ones.
    expect(Object.keys(DV_LIST_PRICES).sort()).toEqual(iapProducts({}).map((p) => p.tier).sort());
    expect(JSON.stringify(iapProducts({}))).not.toMatch(/price|49|79/);
  });

  it("maps product ids to tiers (env override for a renamed product), anything else to null", () => {
    expect(iapTierForProduct("dentvideo_starter_monthly", {})).toBe("starter");
    expect(iapTierForProduct("dentvideo_practice_monthly", {})).toBe("practice");
    expect(iapTierForProduct("clipforge_pro_monthly", {})).toBeNull();
    expect(iapTierForProduct("pdt_0NrVai0xqpQKU8H3Zj3QN", {})).toBeNull(); // a Dodo product is never an App Store plan
    expect(iapTierForProduct("dv_s2", { DENTVID_IAP_PRODUCT_STARTER: "dv_s2" })).toBe("starter");
    expect(iapTierForProduct(null, {})).toBeNull();
  });

  it("ranks the group: Practice is the upgrade", () => {
    expect(isUpgrade("starter", "practice")).toBe(true);
    expect(isUpgrade("practice", "starter")).toBe(false);
    expect(isUpgrade("practice", "practice")).toBe(false);
  });

  it("Apple's own subscriptions page is the manage link", () => {
    expect(APP_STORE_MANAGE_URL).toBe("https://apps.apple.com/account/subscriptions");
  });
});

describe("appleEffect: what each RevenueCat event does", () => {
  const end = "2026-12-17T10:00:00.000Z";
  it.each([
    ["INITIAL_PURCHASE", { kind: "activate", tier: "practice", periodEnd: end, status: "active" }],
    ["RENEWAL", { kind: "activate", tier: "practice", periodEnd: end, status: "active" }],
    ["UNCANCELLATION", { kind: "activate", tier: "practice", periodEnd: end, status: "active" }],
    ["SUBSCRIPTION_EXTENDED", { kind: "activate", tier: "practice", periodEnd: end, status: "active" }],
    ["CANCELLATION", { kind: "ending", periodEnd: end }],
    ["EXPIRATION", { kind: "end", reason: "expired" }],
    ["REFUND", { kind: "end", reason: "refunded" }],
    ["SUBSCRIPTION_PAUSED", { kind: "note", status: "pause_scheduled" }],
    ["REFUND_REVERSED", { kind: "note", status: "refund_reversed" }],
    ["TRANSFER", { kind: "transfer" }],
    ["TEST", { kind: "test" }],
  ])("%s", (type, want) => {
    expect(appleEffect(base(type), {})).toEqual(want);
  });

  it("an App Store refund (CANCELLATION / CUSTOMER_SUPPORT) ends the plan at once", () => {
    expect(appleEffect(base("CANCELLATION", { cancel_reason: "CUSTOMER_SUPPORT" }), {})).toEqual({ kind: "end", reason: "refunded" });
    expect(appleEffect(base("CANCELLATION", { cancel_reason: "UNSUBSCRIBE" }), {}).kind).toBe("ending");
  });

  it("BILLING_ISSUE carries Apple's grace period end when there is one", () => {
    expect(appleEffect(base("BILLING_ISSUE", { grace_period_expiration_at_ms: Date.parse("2026-12-01T00:00:00Z") }), {})).toEqual({ kind: "billing_issue", graceEnd: "2026-12-01T00:00:00.000Z" });
    expect(appleEffect(base("BILLING_ISSUE"), {})).toEqual({ kind: "billing_issue", graceEnd: null });
  });

  it("PRODUCT_CHANGE: an upgrade applies now, a downgrade waits for the renewal", () => {
    expect(appleEffect(base("PRODUCT_CHANGE", { product_id: "dentvideo_starter_monthly", new_product_id: "dentvideo_practice_monthly" }), {})).toMatchObject({ kind: "activate", tier: "practice" });
    expect(appleEffect(base("PRODUCT_CHANGE", { product_id: "dentvideo_practice_monthly", new_product_id: "dentvideo_starter_monthly" }), {})).toEqual({ kind: "scheduled_change", tier: "starter" });
  });

  it("never a plan from another store, a promotional grant, family sharing, a consumable or an unknown product", () => {
    expect(appleEffect(base("INITIAL_PURCHASE", { store: "PROMOTIONAL" }), {}).kind).toBe("ignore");
    expect(appleEffect(base("INITIAL_PURCHASE", { store: "PLAY_STORE" }), {}).kind).toBe("ignore");
    expect(appleEffect(base("INITIAL_PURCHASE", { store: "STRIPE" }), {}).kind).toBe("ignore");
    expect(appleEffect(base("INITIAL_PURCHASE", { is_family_share: true }), {}).kind).toBe("ignore");
    expect(appleEffect(base("INITIAL_PURCHASE", { product_id: "clipforge_pro_monthly" }), {}).kind).toBe("ignore");
    expect(appleEffect(base("NON_RENEWING_PURCHASE"), {}).kind).toBe("ignore");
    expect(appleEffect(base("TEMPORARY_ENTITLEMENT_GRANT"), {}).kind).toBe("ignore");
    expect(appleEffect(base("SOMETHING_NEW"), {}).kind).toBe("ignore");
  });
});

describe("identity", () => {
  it("the subscription key is the original transaction id (stable across renewals), with a safe shape", () => {
    expect(appleSubscriptionKey(base("RENEWAL", { transaction_id: "2000000199" }))).toBe("2000000100");
    expect(appleSubscriptionKey(base("RENEWAL", { original_transaction_id: null, transaction_id: "2000000199" }))).toBe("2000000199");
    expect(appleSubscriptionKey(base("RENEWAL", { original_transaction_id: "x'; drop table" }))).toBeNull();
  });

  it("user candidates: only Liman UUIDs, app_user_id first, never an anonymous RevenueCat id", () => {
    const other = "2d0c5e8a-3f4b-4c7d-9e0f-1a2b3c4d5e6f";
    expect(candidateUserIds({ app_user_id: "$RCAnonymousID:abc", original_app_user_id: "$RCAnonymousID:abc", aliases: [U.toUpperCase(), "$RCAnonymousID:abc"] })).toEqual([U]);
    expect(candidateUserIds({ app_user_id: other, aliases: [U] })).toEqual([other, U]);
    expect(candidateUserIds({ app_user_id: "not-a-user" })).toEqual([]);
  });

  it("security: sandbox policy defaults to internal; allow only when set explicitly", () => {
    expect(sandboxPolicy({})).toBe("internal");
    expect(sandboxPolicy({ DENTVID_IAP_SANDBOX: "internal" })).toBe("internal");
    expect(sandboxPolicy({ DENTVID_IAP_SANDBOX: "OFF" })).toBe("off");
    expect(sandboxPolicy({ DENTVID_IAP_SANDBOX: " Allow " })).toBe("allow");
    expect(sandboxPolicy({ DENTVID_IAP_SANDBOX: "yes please" })).toBe("internal");
  });

  it("security: under internal, a sandbox purchase needs a PROVEN address that is allow-listed or matches a domain pattern", () => {
    const patterns = internalPatterns({ DENTVID_INTERNAL_EMAIL_PATTERNS: "*@tester.example" });
    const m = (e: string, p: string) => patternRegex(p).test(e);
    const env = { DENTVID_IAP_SANDBOX_ALLOW_EMAILS: "Review.Demo@Gmail.com, other@x.example" };
    const ok = (email: string, verified = true) => sandboxOwnerAllowed({ email, verified }, patterns, m, env);
    expect(ok("berke@bulsulabs.com")).toBe(true);
    expect(ok("a@tester.example")).toBe(true);
    expect(ok("review.demo@gmail.com")).toBe(true);
    // An unproven address proves nothing: anyone can sign up as anyone@bulsulabs.com or as the demo address.
    expect(ok("berke@bulsulabs.com", false)).toBe(false);
    expect(ok("review.demo@gmail.com", false)).toBe(false);
    // Catch-all patterns (qa+*@*, e2e*@*) match mailboxes an outsider owns: never enough for a free plan.
    expect(ok("qa+free@gmail.com")).toBe(false);
    expect(ok("e2e-me@outlook.com")).toBe(false);
    expect(ok("someone@gmail.com")).toBe(false);
    expect(sandboxOwnerAllowed({ email: "review.demo@gmail.com", verified: true }, patterns, m, {})).toBe(false);
  });
});

describe("mobileBillingView: paywall and manage path", () => {
  const v = (o: Partial<MobileBillingInput>) =>
    mobileBillingView({ plan: "trial", tier: null, source: null, renewsAt: null, endsAt: null, adminPaused: false, webBlock: null, appleStatus: null, ...o });

  it("the paywall opens only with no live subscription in either channel", () => {
    expect(v({})).toEqual({ status: "none", showPaywall: true, manage: null });
    expect(v({ plan: "cancelled" })).toEqual({ status: "ended", showPaywall: true, manage: null });
    expect(v({ plan: "active", source: "dodo" }).showPaywall).toBe(false);
    expect(v({ plan: "active", source: null }).showPaywall).toBe(false);
    expect(v({ plan: "active", source: "apple" }).showPaywall).toBe(false);
    expect(v({ plan: "paused", source: "dodo" }).showPaywall).toBe(false);
    expect(v({ plan: "paused", source: "apple" }).showPaywall).toBe(false);
    expect(v({ adminPaused: true, plan: "active" }).showPaywall).toBe(false);
  });

  it("a web clinic is told the web manages it (no link); an Apple clinic is sent to the App Store", () => {
    expect(v({ plan: "active", source: "dodo" })).toEqual({ status: "active", showPaywall: false, manage: "web" });
    expect(v({ plan: "active", source: "apple" })).toEqual({ status: "active", showPaywall: false, manage: "app_store" });
    expect(v({ plan: "active", source: "apple", appleStatus: "cancelled" })).toEqual({ status: "ending", showPaywall: false, manage: "app_store" });
    expect(v({ plan: "active", source: "apple", appleStatus: "billing_issue" })).toEqual({ status: "billing_issue", showPaywall: false, manage: "app_store" });
    expect(v({ plan: "active", source: "dodo", endsAt: "2026-12-01T00:00:00Z" }).status).toBe("ending");
  });

  it("a web payment being confirmed, a cancelled web plan still paid up, a chargeback: no paywall (no second subscription)", () => {
    expect(v({ webBlock: "pending" })).toEqual({ status: "pending", showPaywall: false, manage: null });
    expect(v({ plan: "cancelled", webBlock: "cancelled_pending" })).toEqual({ status: "ending", showPaywall: false, manage: "web" });
    expect(v({ plan: "paused", webBlock: "disputed" })).toEqual({ status: "disputed", showPaywall: false, manage: null });
    expect(v({ webBlock: "payment_update" })).toEqual({ status: "paused", showPaywall: false, manage: "web" });
  });
});
