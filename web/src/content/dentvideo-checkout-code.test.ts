import { describe, expect, it } from "vitest";
import { LOCALES } from "./dentvideo";
import { CHECKOUT_CODE, checkoutNext } from "./dentvideo-checkout-code";

describe("checkoutNext", () => {
  it("goes straight to an API checkout (the discount is already applied there)", () => {
    expect(checkoutNext({ url: "https://checkout.dodopayments.com/session/cks_1" })).toEqual({ kind: "go", url: "https://checkout.dodopayments.com/session/cks_1" });
  });

  it("first shows the code for a payment link that cannot carry it", () => {
    const url = "https://checkout.dodopayments.com/buy/pdt_1?quantity=1";
    expect(checkoutNext({ url, code: "KURUCU100" })).toEqual({ kind: "typeCode", url, code: "KURUCU100" });
  });

  it("ignores an empty code and anything that is not an https URL", () => {
    expect(checkoutNext({ url: "https://x.example/buy", code: "  " })).toEqual({ kind: "go", url: "https://x.example/buy" });
    expect(checkoutNext({ url: "javascript:alert(1)", code: "X" })).toEqual({ kind: "none" });
    expect(checkoutNext({})).toEqual({ kind: "none" });
    expect(checkoutNext(null)).toEqual({ kind: "none" });
  });
});

describe("CHECKOUT_CODE copy", () => {
  it.each(LOCALES)("%s names the code and Dodo's button, and every label is filled", (l) => {
    const c = CHECKOUT_CODE[l];
    expect(c.body).toContain("{code}");
    expect(c.body).toContain("{button}");
    for (const v of Object.values(c)) expect(v.trim().length).toBeGreaterThan(0);
  });
});
