import { describe, it, expect } from "vitest";
import { verifyDodoWebhook, planForDodoProduct, dodoApiBase, subscriptionCredits, topupCredits } from "./dodo";

// The Standard Webhooks reference vector (Dodo follows that spec).
const VECTOR = {
  secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
  id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
  timestamp: "1614265330",
  body: '{"test": 2432232314}',
  signature: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
  nowSec: 1614265330,
};

describe("verifyDodoWebhook", () => {
  it("accepts the reference signature", () => {
    expect(verifyDodoWebhook(VECTOR)).toBe(true);
  });

  it("accepts it among several space-separated signatures", () => {
    expect(verifyDodoWebhook({ ...VECTOR, signature: `v1,bm9wZQ== ${VECTOR.signature}` })).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyDodoWebhook({ ...VECTOR, body: '{"test": 1}' })).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyDodoWebhook({ ...VECTOR, secret: "whsec_" + Buffer.from("other").toString("base64") })).toBe(false);
  });

  it("rejects a replay outside 5 minutes", () => {
    expect(verifyDodoWebhook({ ...VECTOR, nowSec: VECTOR.nowSec + 301 })).toBe(false);
  });

  it("rejects missing headers or secret", () => {
    expect(verifyDodoWebhook({ ...VECTOR, signature: null })).toBe(false);
    expect(verifyDodoWebhook({ ...VECTOR, id: null })).toBe(false);
    expect(verifyDodoWebhook({ ...VECTOR, secret: "" })).toBe(false);
  });
});

describe("product mapping", () => {
  const env = {
    DODO_PRODUCT_PLUS_WEEKLY: "pdt_week",
    DODO_PRODUCT_PLUS_YEARLY: "pdt_year",
    DODO_PRODUCT_TOPUP: "pdt_top",
  } as unknown as NodeJS.ProcessEnv;

  it("maps Dodo product ids back to our plans", () => {
    expect(planForDodoProduct("pdt_week", env)).toBe("clipforge_plus_weekly");
    expect(planForDodoProduct("pdt_year", env)).toBe("clipforge_plus_yearly");
    expect(planForDodoProduct("pdt_top", env)).toBe("clipforge_credits_topup");
    expect(planForDodoProduct("pdt_other", env)).toBeNull();
    expect(planForDodoProduct(null, env)).toBeNull();
  });

  it("credits match the catalogue", () => {
    expect(subscriptionCredits("clipforge_plus_weekly")).toBe(30);
    expect(subscriptionCredits("clipforge_plus_yearly")).toBe(1200);
    expect(topupCredits("clipforge_credits_topup")).toBe(40);
    expect(subscriptionCredits("clipforge_credits_topup")).toBeNull();
  });

  it("uses the test API unless told live", () => {
    expect(dodoApiBase({} as NodeJS.ProcessEnv)).toBe("https://test.dodopayments.com");
    expect(dodoApiBase({ DODO_ENVIRONMENT: "live" } as unknown as NodeJS.ProcessEnv)).toBe(
      "https://live.dodopayments.com",
    );
  });
});
