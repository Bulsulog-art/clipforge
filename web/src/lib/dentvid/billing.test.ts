import { describe, expect, it } from "vitest";
import {
  applyTransition,
  buildDvCheckout,
  canMakeVideos,
  dvAvailablePlans,
  dvPlanForProduct,
  dvProductId,
  dvTransition,
  foundingOfferOpen,
  isDentvideoEvent,
  needsPlan,
  normaliseCode,
  type ClinicBilling,
} from "./billing";

const ENV = { NEXT_PUBLIC_DENTVIDEO_URL: "https://dentvideo.com" };
const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const base = { clinicId: CLINIC, ownerId: OWNER, email: "dr@clinic.example" };

describe("DentVideo products", () => {
  it("defaults to the live Dodo product ids", () => {
    expect(dvProductId("starter", "month", {})).toBe("pdt_0NrVahwZsINvy3TNz2H35");
    expect(dvProductId("practice", "month", {})).toBe("pdt_0NrVai0xqpQKU8H3Zj3QN");
    expect(dvProductId("group", "month", {})).toBe("pdt_0NrVai5ZNwqFoSZbcfV8S");
    expect(dvProductId("practice", "year", {})).toBe("pdt_0NrVaiBrxhFhPrt8IbdSu");
    expect(dvProductId("starter", "year", {})).toBeNull();
  });

  it("env overrides a product id, and the reverse lookup follows", () => {
    const env = { DENTVIDEO_DODO_PRODUCT_PRACTICE_MONTHLY: "pdt_test_practice" };
    expect(dvProductId("practice", "month", env)).toBe("pdt_test_practice");
    expect(dvPlanForProduct("pdt_test_practice", env)).toEqual({ tier: "practice", interval: "month" });
    expect(dvPlanForProduct("pdt_0NrVaiBrxhFhPrt8IbdSu", env)).toEqual({ tier: "practice", interval: "year" });
    expect(dvPlanForProduct("pdt_clipforge", env)).toBeNull();
  });

  it("offers only plans with a product and a price", () => {
    expect(dvAvailablePlans({}).map((p) => `${p.tier}:${p.interval}:${p.priceUsd}`)).toEqual([
      "starter:month:39",
      "practice:month:69",
      "practice:year:690",
      "group:month:219",
    ]);
  });

  it("founding offer is open unless switched off", () => {
    expect(foundingOfferOpen({})).toBe(true);
    expect(foundingOfferOpen({ DENTVIDEO_FOUNDING_OFFER: "1" })).toBe(true);
    for (const off of ["0", "false", "OFF", "closed"]) expect(foundingOfferOpen({ DENTVIDEO_FOUNDING_OFFER: off })).toBe(false);
  });
});

describe("buildDvCheckout", () => {
  it("Practice monthly gets the founding code by default, with metadata and return URL", () => {
    const r = buildDvCheckout({ ...base, tier: "practice", interval: "month", locale: "tr" }, ENV);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.autoDiscount).toBe(true);
    expect(r.body).toEqual({
      product_cart: [{ product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN", quantity: 1 }],
      customer: { email: "dr@clinic.example" },
      discount_codes: ["KURUCU100"],
      metadata: { app: "dentvideo", clinic_id: CLINIC, owner_id: OWNER, plan: "practice", interval: "month" },
      return_url: "https://dentvideo.com/app?billing=success",
      cancel_url: "https://dentvideo.com/app?billing=cancelled",
      customization: { force_language: "tr" },
    });
  });

  it("no founding code when the offer is closed, or on other plans", () => {
    const closed = buildDvCheckout({ ...base, tier: "practice", interval: "month" }, { ...ENV, DENTVIDEO_FOUNDING_OFFER: "0" });
    expect(closed.ok && closed.body.discount_codes).toBeFalsy();
    for (const [tier, interval] of [["starter", "month"], ["group", "month"], ["practice", "year"]] as const) {
      const r = buildDvCheckout({ ...base, tier, interval }, ENV);
      expect(r.ok, `${tier}/${interval}`).toBe(true);
      if (r.ok) {
        expect(r.body.discount_codes).toBeUndefined();
        expect((r.body.product_cart as { product_id: string }[])[0].product_id).toBe(dvProductId(tier, interval, ENV));
        expect((r.body.metadata as Record<string, string>).plan).toBe(tier);
      }
    }
  });

  it("a typed code wins over the founding code and is normalised", () => {
    const r = buildDvCheckout({ ...base, tier: "practice", interval: "month", code: "  welcome10 " }, ENV);
    expect(r.ok && r.body.discount_codes).toEqual(["WELCOME10"]);
    expect(r.ok && r.autoDiscount).toBe(false);
    const g = buildDvCheckout({ ...base, tier: "group", interval: "month", code: "group5" }, ENV);
    expect(g.ok && g.body.discount_codes).toEqual(["GROUP5"]);
  });

  it("ignores implausible codes and unknown locales; uses the configured founding code", () => {
    const r = buildDvCheckout({ ...base, tier: "practice", interval: "month", code: "bad code!", locale: "it" }, { ...ENV, DENTVIDEO_FOUNDING_CODE: "FOUNDERS" });
    expect(r.ok && r.body.discount_codes).toEqual(["FOUNDERS"]);
    expect(r.ok && r.body.customization).toBeUndefined();
    expect(normaliseCode("x".repeat(41))).toBeNull();
  });

  it("refuses plans that are not sold", () => {
    expect(buildDvCheckout({ ...base, tier: "starter", interval: "year" }, ENV)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("falls back to the app URL when the DentVideo domain is not set", () => {
    const r = buildDvCheckout({ ...base, tier: "starter", interval: "month" }, { NEXT_PUBLIC_APP_URL: "https://clipforge.bulsulabs.com/" });
    expect(r.ok && r.body.return_url).toBe("https://clipforge.bulsulabs.com/dentvideo/app?billing=success");
  });

  it("leaves the customer out when there is no email", () => {
    const r = buildDvCheckout({ ...base, email: null, tier: "starter", interval: "month" }, ENV);
    expect(r.ok && "customer" in r.body).toBe(false);
  });
});

describe("isDentvideoEvent", () => {
  const cfEnv = { DODO_PRODUCT_PLUS_WEEKLY: "pdt_cf_week" };
  it("routes on metadata, then brand, then product", () => {
    expect(isDentvideoEvent({ metadata: { app: "dentvideo" } }, cfEnv)).toBe(true);
    expect(isDentvideoEvent({ brand_id: "brnd_0NrVafyQGNiKOz0caOKgm" }, cfEnv)).toBe(true);
    expect(isDentvideoEvent({ product_id: "pdt_0NrVai5ZNwqFoSZbcfV8S" }, cfEnv)).toBe(true);
    expect(isDentvideoEvent({ product_cart: [{ product_id: "pdt_0NrVahwZsINvy3TNz2H35" }] }, cfEnv)).toBe(true);
  });
  it("leaves ClipForge events alone", () => {
    expect(isDentvideoEvent({ metadata: { user_id: OWNER, plan: "clipforge_plus_weekly" }, product_id: "pdt_cf_week" }, cfEnv)).toBe(false);
    expect(isDentvideoEvent({ product_cart: [{ product_id: "pdt_cf_top" }] }, cfEnv)).toBe(false);
    expect(isDentvideoEvent({ metadata: { app: "clipforge" }, brand_id: "brnd_0NrVafyQGNiKOz0caOKgm" }, cfEnv)).toBe(false);
    expect(isDentvideoEvent(undefined, cfEnv)).toBe(false);
  });
});

describe("plan transitions", () => {
  const sub = "sub_123";
  const d = { subscription_id: sub, product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN", next_billing_date: "2026-12-08T10:00:00Z", metadata: { app: "dentvideo", plan: "practice" } };
  const trial: ClinicBilling = { plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null };

  it("maps events to plan states", () => {
    expect(dvTransition("subscription.active", d, {})?.plan).toBe("active");
    expect(dvTransition("subscription.renewed", d, {})?.plan).toBe("active");
    expect(dvTransition("subscription.unpaused", d, {})?.plan).toBe("active");
    expect(dvTransition("subscription.cancelled", d, {})?.plan).toBe("cancelled");
    expect(dvTransition("subscription.expired", d, {})?.plan).toBe("cancelled");
    expect(dvTransition("subscription.on_hold", d, {})?.plan).toBe("paused");
    expect(dvTransition("subscription.failed", d, {})?.plan).toBe("paused");
    expect(dvTransition("subscription.paused", d, {})?.plan).toBe("paused");
    expect(dvTransition("subscription.past_due", d, {})).toBeNull();
    expect(dvTransition("subscription.updated", d, {})).toBeNull();
    expect(dvTransition("payment.succeeded", d, {})).toBeNull();
    expect(dvTransition("subscription.active", { ...d, subscription_id: null }, {})).toBeNull();
    expect(dvTransition("subscription.plan_changed", { ...d, status: "active", product_id: "pdt_0NrVai5ZNwqFoSZbcfV8S" }, {})).toMatchObject({ plan: "active", tier: "group" });
    expect(dvTransition("subscription.plan_changed", { ...d, status: "on_hold" }, {})).toBeNull();
  });

  it("activation records tier, subscription and renewal date; replays change nothing", () => {
    const t = dvTransition("subscription.active", d, {})!;
    const next = applyTransition(trial, t);
    expect(next).toEqual({ plan: "active", dodo_subscription_id: sub, plan_tier: "practice", plan_renews_at: "2026-12-08T10:00:00Z" });
    const after = { ...trial, ...next } as ClinicBilling;
    expect(applyTransition(after, t)).toBeNull(); // same event again: idempotent
    const renewed = dvTransition("subscription.renewed", { ...d, next_billing_date: "2027-01-08T10:00:00Z" }, {})!;
    expect(applyTransition(after, renewed)).toEqual({ plan: "active", dodo_subscription_id: sub, plan_tier: "practice", plan_renews_at: "2027-01-08T10:00:00Z" });
  });

  it("tier falls back to metadata when the product is unknown", () => {
    expect(dvTransition("subscription.active", { ...d, product_id: "pdt_unknown", metadata: { app: "dentvideo", plan: "group" } }, {})?.tier).toBe("group");
  });

  it("cancel and hold apply to the current subscription", () => {
    const active: ClinicBilling = { plan: "active", plan_tier: "practice", dodo_subscription_id: sub, plan_renews_at: "2026-12-08T10:00:00Z" };
    expect(applyTransition(active, dvTransition("subscription.cancelled", d, {})!)).toEqual({ plan: "cancelled", dodo_subscription_id: sub, plan_renews_at: null });
    expect(applyTransition(active, dvTransition("subscription.on_hold", d, {})!)).toEqual({ plan: "paused", dodo_subscription_id: sub, plan_renews_at: null });
    // A late cancel for an old subscription never switches off the new one.
    expect(applyTransition(active, dvTransition("subscription.cancelled", { ...d, subscription_id: "sub_old" }, {})!)).toBeNull();
    // Re-activation after a hold.
    const paused: ClinicBilling = { ...active, plan: "paused", plan_renews_at: null };
    expect(applyTransition(paused, dvTransition("subscription.active", d, {})!)?.plan).toBe("active");
  });

  it("a first payment that fails leaves an unpaid clinic unpaid", () => {
    expect(applyTransition(trial, dvTransition("subscription.failed", d, {})!)).toBeNull();
  });
});

describe("access", () => {
  it("only a paying clinic makes videos — no free week: trial (not paid yet), paused and cancelled never", () => {
    expect(canMakeVideos("active")).toBe(true);
    expect(canMakeVideos("trial")).toBe(false);
    expect(canMakeVideos(null)).toBe(false);
    expect(canMakeVideos(undefined)).toBe(false);
    expect(canMakeVideos("paused")).toBe(false);
    expect(canMakeVideos("cancelled")).toBe(false);
    expect(needsPlan("trial")).toBe(true);
    expect(needsPlan("active")).toBe(false);
  });
});
