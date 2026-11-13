import { describe, expect, it } from "vitest";
import {
  buildDvCheckout,
  checkoutBlock,
  dvEventSubStatus,
  dvEventTime,
  isStaleEvent,
  usedFounding,
  type DvSubRecord,
} from "./billing";
import { BILLING_COPY, BILLING_LANGUAGES, billingText } from "@/content/dentvideo-billing";
import { LOCALES } from "@/content/dentvideo";
import { paymentProblemEmail } from "./lifecycle-email";
import { clinicProfileSchema } from "./profile";
import { showFirstWeek } from "./onboarding";
import { restyleStatus, RESTYLE_STALE_MS } from "./restyle";

const NOW = new Date("2026-11-09T12:00:00Z");
const sub = (over: Partial<DvSubRecord>): DvSubRecord => ({ dodo_subscription_id: "sub_1", clinic_id: "c", status: "active", ...over });

describe("checkoutBlock (C3: never two live subscriptions)", () => {
  it("active clinics are refused", () => {
    expect(checkoutBlock({ clinic: { plan: "active" }, subs: null, now: NOW })).toEqual({ code: "active" });
  });

  it("a subscription paid or activated in the last 30 minutes blocks a second checkout (webhook in flight)", () => {
    const recent = new Date(NOW.getTime() - 5 * 60_000).toISOString();
    const old = new Date(NOW.getTime() - 40 * 60_000).toISOString();
    expect(checkoutBlock({ clinic: { plan: "trial" }, subs: [sub({ status: "pending", updated_at: recent })], now: NOW })).toEqual({ code: "pending" });
    expect(checkoutBlock({ clinic: { plan: "trial" }, subs: [sub({ status: "pending", updated_at: old })], now: NOW })).toBeNull();
  });

  it("on hold / paused / lapsed → update the card instead", () => {
    for (const status of ["on_hold", "paused", "lapsed"]) {
      expect(checkoutBlock({ clinic: { plan: "paused", dodo_subscription_id: "sub_1" }, subs: [sub({ status, updated_at: "2026-10-01T00:00:00Z" })], now: NOW }), status).toEqual({ code: "payment_update" });
    }
  });

  it("cancelled but still paid up → explained, with the date; once it has run out → allowed", () => {
    const future = "2026-11-30T00:00:00Z";
    expect(checkoutBlock({ clinic: { plan: "cancelled", dodo_subscription_id: "sub_1" }, subs: [sub({ status: "cancelled", period_end: future, updated_at: "2026-10-01T00:00:00Z" })], now: NOW })).toEqual({
      code: "cancelled_pending",
      until: future,
    });
    expect(checkoutBlock({ clinic: { plan: "cancelled", dodo_subscription_id: "sub_1" }, subs: [sub({ status: "cancelled", period_end: "2026-11-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" })], now: NOW })).toBeNull();
  });

  it("ended subscriptions (failed, expired) never block; Dodo's live status wins over what is stored", () => {
    expect(checkoutBlock({ clinic: { plan: "paused", dodo_subscription_id: "sub_1" }, subs: [sub({ status: "failed", updated_at: "2026-10-01T00:00:00Z" })], now: NOW })).toBeNull();
    expect(checkoutBlock({ clinic: { plan: "paused", dodo_subscription_id: "sub_1" }, subs: [sub({ status: "on_hold", updated_at: "2026-10-01T00:00:00Z" })], dodoStatus: "expired", now: NOW })).toBeNull();
    expect(checkoutBlock({ clinic: { plan: "trial", dodo_subscription_id: "sub_1" }, subs: null, dodoStatus: "active", now: NOW })).toEqual({ code: "pending" });
  });

  it("without the ledger: a paused clinic with a subscription → update the card; a trial or cancelled one may buy", () => {
    expect(checkoutBlock({ clinic: { plan: "paused", dodo_subscription_id: "sub_1" }, subs: null, now: NOW })).toEqual({ code: "payment_update" });
    expect(checkoutBlock({ clinic: { plan: "trial" }, subs: null, now: NOW })).toBeNull();
    expect(checkoutBlock({ clinic: { plan: "cancelled", dodo_subscription_id: "sub_1" }, subs: null, now: NOW })).toBeNull();
  });
});

describe("event ordering helpers (H6)", () => {
  it("reads Dodo's event time and orders events", () => {
    expect(dvEventTime({ timestamp: "2026-11-09T10:00:00Z" })).toBe("2026-11-09T10:00:00.000Z");
    expect(dvEventTime({ timestamp: "nope" })).toBeNull();
    expect(dvEventTime({})).toBeNull();
    expect(isStaleEvent("2026-11-09T10:00:00Z", "2026-11-09T09:59:59Z")).toBe(true);
    expect(isStaleEvent("2026-11-09T10:00:00Z", "2026-11-09T10:00:00Z")).toBe(false);
    expect(isStaleEvent(null, "2026-11-09T09:00:00Z")).toBe(false);
    expect(isStaleEvent("2026-11-09T10:00:00Z", null)).toBe(false);
  });

  it("maps events to subscription statuses", () => {
    expect(dvEventSubStatus("subscription.renewed", {})).toBe("active");
    expect(dvEventSubStatus("subscription.on_hold", {})).toBe("on_hold");
    expect(dvEventSubStatus("subscription.plan_changed", { status: "active" })).toBe("active");
    expect(dvEventSubStatus("subscription.plan_changed", { status: "on_hold" })).toBeNull();
    expect(dvEventSubStatus("payment.succeeded", {})).toBeNull();
  });
});

describe("historic founding seats (the offer is closed)", () => {
  it("only Practice monthly with a discount counts as a founding seat (and the configured discount, when set)", () => {
    expect(usedFounding("practice", "month", "dsc_1", {})).toBe(true);
    expect(usedFounding("practice", "year", "dsc_1", {})).toBe(false);
    expect(usedFounding("starter", "month", "dsc_1", {})).toBe(false);
    expect(usedFounding("practice", "month", null, {})).toBe(false);
    expect(usedFounding("practice", "month", "dsc_other", { DENTVIDEO_FOUNDING_DISCOUNT_ID: "dsc_1" })).toBe(false);
  });

  it("checkout never applies the founding code any more, whatever the old env switch says", () => {
    const input = { tier: "practice" as const, interval: "month" as const, clinicId: "c", ownerId: "o" };
    const plain = buildDvCheckout(input, {});
    const oldOn = buildDvCheckout(input, { DENTVIDEO_FOUNDING_OFFER: "1" });
    expect(plain.ok && plain.discount).toBeNull();
    expect(oldOn.ok && oldOn.discount).toBeNull();
    expect(oldOn.ok && oldOn.productId).toBe(plain.ok && plain.productId);
  });
});

describe("billing copy (8 languages)", () => {
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
  const flat = (o: unknown, p = ""): [string, string][] =>
    typeof o === "string" ? [[p, o]] : Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k));

  it("every site language has the same keys and placeholders as English", () => {
    expect(BILLING_LANGUAGES.sort()).toEqual([...LOCALES].sort());
    const en = Object.fromEntries(flat(BILLING_COPY.en));
    for (const lang of BILLING_LANGUAGES) {
      const got = Object.fromEntries(flat(BILLING_COPY[lang]));
      expect(Object.keys(got).sort(), lang).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en)) expect(placeholders(got[k]), `${lang}.${k}`).toBe(placeholders(en[k]));
    }
    expect(billingText("it").lang).toBe("en");
  });

  it("the payment-problem email: what happened, how to fix it, no leftover placeholders, right to left in Arabic", () => {
    for (const lang of BILLING_LANGUAGES) {
      for (const kind of ["failed", "on_hold"] as const) {
        for (const fix of ["portal", "email", "checkout"] as const) {
          const m = paymentProblemEmail({ language: lang, clinicName: "Gülüş <Dental>", kind, fix, appUrl: "https://dentvideo.com/app" });
          expect(m.subject.length).toBeGreaterThan(5);
          expect(m.html + m.text).not.toMatch(/\{\w+\}/);
          expect(m.html).not.toContain("<Dental>");
          if (fix === "email") expect(m.text).toContain("hello@dentvideo.com");
          if (fix === "portal") expect(m.text).toContain("https://dentvideo.com/app/settings");
        }
      }
    }
    expect(paymentProblemEmail({ language: "ar", clinicName: "x", kind: "on_hold", fix: "email", appUrl: "https://dentvideo.com/app" }).html).toContain('dir="rtl"');
  });
});

describe("web clinic profile (C4: what an owner can store)", () => {
  const base = { name: "Gülüş Dental", country: "tr", language: "tr", services: ["İmplant"] };

  it("drops unknown keys such as an injected logo", () => {
    const p = clinicProfileSchema.parse({ ...base, logo: "/etc/passwd" }) as Record<string, unknown>;
    expect(p.logo).toBeUndefined();
    expect(p.country).toBe("TR");
  });

  it("accepts an https booking link and a plain handle; refuses http, file and odd handles, and URLs in text", () => {
    expect(clinicProfileSchema.parse({ ...base, bookingUrl: "https://clinic.example/book", handle: "@gulus.dental" })).toMatchObject({ bookingUrl: "https://clinic.example/book", handle: "gulus.dental" });
    for (const bad of [
      { bookingUrl: "http://clinic.example" },
      { bookingUrl: "file:///etc/passwd" },
      { bookingUrl: "javascript:alert(1)" },
      { handle: "a b" },
      { handle: "../x" },
      { name: "see https://evil.example" },
      { services: ["/etc/passwd"] },
      { city: "..\\windows" },
    ]) {
      expect(clinicProfileSchema.safeParse({ ...base, ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("L6: ?billing=success needs evidence of a payment", () => {
  it("shows 'being made' for an active clinic, or a trial one with a payment seen; not on the URL alone", () => {
    const args = { billing: "success", madeThisWeek: false, everMade: false };
    expect(showFirstWeek({ ...args, plan: "active" })).toBe(true);
    expect(showFirstWeek({ ...args, plan: "trial", paymentSeen: true })).toBe(true);
    expect(showFirstWeek({ ...args, plan: "trial", paymentSeen: false })).toBe(false);
    expect(showFirstWeek({ ...args, plan: "cancelled", paymentSeen: true })).toBe(false);
  });
});

describe("M4: a stuck restyle can be retried", () => {
  it("queued for more than 30 minutes reads as failed", () => {
    const now = Date.parse("2026-11-09T12:00:00Z");
    expect(restyleStatus("queued", new Date(now - RESTYLE_STALE_MS + 1000).toISOString(), now)).toBe("queued");
    expect(restyleStatus("queued", new Date(now - RESTYLE_STALE_MS - 1000).toISOString(), now)).toBe("failed");
    expect(restyleStatus("failed", null, now)).toBe("failed");
    expect(restyleStatus(null, null, now)).toBeNull();
  });
});
