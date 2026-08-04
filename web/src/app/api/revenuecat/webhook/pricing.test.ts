import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_PRODUCTS, CONSUMABLE_PRODUCTS } from "./route";

/**
 * The credit allowances ARE the business model. A number changed here without
 * the arithmetic being redone is how a product starts losing money on its best
 * customers, so the economics are asserted rather than left in a comment.
 */

/** Marginal cost of one generated video, in dollars. See route.ts for the breakdown. */
const COST_PER_CREDIT = 0.02;

const PRICE = {
  weekly: 6.99,
  yearly: 49.99,
  topup: 4.99,
} as const;

const WEEKS_PER_YEAR = 52;

describe("plan catalogue", () => {
  it("sells exactly two subscription terms", () => {
    const live = ["clipforge_plus_weekly", "clipforge_plus_yearly"];
    for (const id of live) expect(SUBSCRIPTION_PRODUCTS[id]).toBeDefined();
  });

  it("still honours retired terms so nobody is granted zero on renewal", () => {
    expect(SUBSCRIPTION_PRODUCTS.clipforge_plus_monthly?.credits).toBeGreaterThan(0);
    expect(SUBSCRIPTION_PRODUCTS.clipforge_plus_monthly_retention?.credits).toBeGreaterThan(0);
  });

  it("has one live top-up pack, and honours the retired ones", () => {
    expect(CONSUMABLE_PRODUCTS.clipforge_credits_topup).toBe(40);
    for (const id of Object.keys(CONSUMABLE_PRODUCTS)) {
      expect(CONSUMABLE_PRODUCTS[id]).toBeGreaterThan(0);
    }
  });
});

describe("every plan survives a subscriber using the whole allowance", () => {
  it("weekly", () => {
    const credits = SUBSCRIPTION_PRODUCTS.clipforge_plus_weekly.credits * WEEKS_PER_YEAR;
    const cost = credits * COST_PER_CREDIT;
    const revenue = PRICE.weekly * WEEKS_PER_YEAR;
    expect(cost).toBeLessThan(revenue);
    expect((revenue - cost) / revenue).toBeGreaterThan(0.8);
  });

  it("yearly", () => {
    const credits = SUBSCRIPTION_PRODUCTS.clipforge_plus_yearly.credits;
    const cost = credits * COST_PER_CREDIT;
    expect(cost).toBeLessThan(PRICE.yearly);
    expect((PRICE.yearly - cost) / PRICE.yearly).toBeGreaterThan(0.4);
  });

  it("top-up pack", () => {
    const cost = CONSUMABLE_PRODUCTS.clipforge_credits_topup * COST_PER_CREDIT;
    expect(cost).toBeLessThan(PRICE.topup);
    expect((PRICE.topup - cost) / PRICE.topup).toBeGreaterThan(0.7);
  });
});

describe("the plans sit in the right order", () => {
  const perCredit = {
    weekly: PRICE.weekly / SUBSCRIPTION_PRODUCTS.clipforge_plus_weekly.credits,
    yearly: PRICE.yearly / SUBSCRIPTION_PRODUCTS.clipforge_plus_yearly.credits,
    topup: PRICE.topup / CONSUMABLE_PRODUCTS.clipforge_credits_topup,
  };

  it("yearly is by far the best value per credit", () => {
    expect(perCredit.yearly).toBeLessThan(perCredit.weekly / 4);
  });

  it("the top-up is cheaper than weekly, so a yearly member who runs dry tops up rather than switching", () => {
    expect(perCredit.topup).toBeLessThan(perCredit.weekly);
  });

  it("the top-up is dearer than yearly, so it never undercuts the plan we want people on", () => {
    expect(perCredit.topup).toBeGreaterThan(perCredit.yearly);
  });
});
