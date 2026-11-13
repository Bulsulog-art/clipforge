import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DV_CLIENT_EVENTS,
  DV_EVENTS,
  DV_EVENT_MAX_BYTES,
  buildEventRow,
  externalReferrerHost,
  isDvEvent,
  parseClientEvent,
  sanitizeLocale,
  sanitizeProps,
} from "./events";
import { _resetEventBackoff, insertEventRow, readCapped, recordEvent } from "./events-server";

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";

describe("event allow-list", () => {
  it("knows exactly the funnel events", () => {
    expect(DV_EVENTS).toHaveLength(21);
    expect(isDvEvent("landing_view")).toBe(true);
    expect(isDvEvent("payment_succeeded")).toBe(true);
    for (const bad of ["pageview", "", "LANDING_VIEW", "landing_view ", null, 3, {}]) expect(isDvEvent(bad)).toBe(false);
  });

  it("rejects unknown names", () => {
    expect(buildEventRow({ name: "drop_table" })).toBeNull();
    expect(parseClientEvent(JSON.stringify({ name: "anything" }))).toBeNull();
  });

  it("lets a browser send only browser events — never payments, sign-ups or approvals", () => {
    for (const name of DV_EVENTS) {
      const row = parseClientEvent(JSON.stringify({ name }));
      expect(row !== null).toBe(DV_CLIENT_EVENTS.includes(name));
    }
    expect(parseClientEvent(JSON.stringify({ name: "payment_succeeded", props: { tier: "group" } }))).toBeNull();
    expect(parseClientEvent(JSON.stringify({ name: "signup_completed" }))).toBeNull();
  });

  it("never takes a clinic id from the browser", () => {
    const row = parseClientEvent(JSON.stringify({ name: "plan_clicked", clinicId: CLINIC, clinic_id: CLINIC, props: { tier: "practice" } }));
    expect(row?.clinic_id).toBeNull();
  });

  it("refuses bodies over the size cap and malformed JSON", () => {
    const big = JSON.stringify({ name: "landing_view", props: { utm_source: "x".repeat(DV_EVENT_MAX_BYTES) } });
    expect(parseClientEvent(big)).toBeNull();
    expect(parseClientEvent("{not json")).toBeNull();
    expect(parseClientEvent("")).toBeNull();
    expect(parseClientEvent("[]")).toBeNull();
  });
});

describe("payload sanitising (no personal data)", () => {
  it("keeps only each event's allowed props", () => {
    expect(sanitizeProps("plan_clicked", { tier: "practice", interval: "year", where: "app", email: "dr@clinic.de", name: "Dr. Weber" })).toEqual({
      tier: "practice",
      interval: "year",
      where: "app",
    });
    expect(sanitizeProps("signup_completed", { email: "dr@clinic.de", password: "hunter22" })).toEqual({});
    expect(sanitizeProps("video_approved", { title: "Implants in three steps" })).toEqual({});
  });

  it("drops values outside the allowed shape", () => {
    expect(sanitizeProps("plan_clicked", { tier: "platinum", interval: "week" })).toEqual({});
    expect(sanitizeProps("week_ready", { kind: "week", ready: 5.5, flagged: -1 })).toEqual({ kind: "week" });
    expect(sanitizeProps("week_ready", { kind: "week", ready: 5, flagged: 1 })).toEqual({ kind: "week", ready: 5, flagged: 1 });
    expect(sanitizeProps("checkout_opened", { founding: "yes" })).toEqual({});
    expect(sanitizeProps("clinic_saved", { country: "de", language: "xx" })).toEqual({ country: "DE" });
    expect(sanitizeProps("clinic_saved", { country: "Germany" })).toEqual({});
  });

  it("never stores an email, a phone number or free text in a utm tag", () => {
    expect(sanitizeProps("landing_view", { utm_source: "dr.weber@praxis.de" })).toEqual({});
    expect(sanitizeProps("landing_view", { utm_source: "dr.weber%40praxis.de" })).toEqual({});
    expect(sanitizeProps("landing_view", { utm_source: "+49 170 1234567" })).toEqual({});
    expect(sanitizeProps("landing_view", { utm_campaign: "Dr Anna Weber" })).toEqual({});
    expect(sanitizeProps("landing_view", { utm_source: "Google", utm_medium: "cpc", utm_campaign: "launch_2026-11" })).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "launch_2026-11",
    });
  });

  it("keeps a referrer's host but never its path or query", () => {
    expect(sanitizeProps("landing_view", { ref: "https://www.google.com/search?q=dr+weber" })).toEqual({});
    expect(sanitizeProps("landing_view", { ref: "www.Google.com" })).toEqual({ ref: "google.com" });
    expect(sanitizeProps("landing_view", { ref: "user@evil.com" })).toEqual({});
    expect(externalReferrerHost("https://www.google.com/search?q=dr+weber", "dentvideo.com")).toBe("google.com");
    expect(externalReferrerHost("https://dentvideo.com/de", "dentvideo.com")).toBeUndefined();
    expect(externalReferrerHost("not a url", "dentvideo.com")).toBeUndefined();
  });

  it("accepts only known locales and ignores non-objects", () => {
    expect(sanitizeLocale("de")).toBe("de");
    expect(sanitizeLocale("de-AT")).toBe("de");
    expect(sanitizeLocale("xx")).toBeNull();
    expect(sanitizeLocale(42)).toBeNull();
    expect(sanitizeProps("plan_clicked", "tier=practice")).toEqual({});
    expect(sanitizeProps("plan_clicked", ["practice"])).toEqual({});
  });

  it("a client row has only name, locale, sanitised props and no clinic", () => {
    const row = parseClientEvent(JSON.stringify({ name: "landing_view", locale: "tr", props: { utm_source: "instagram", ip: "1.2.3.4", ua: "Mozilla" }, ip: "1.2.3.4" }));
    expect(row).toEqual({ name: "landing_view", locale: "tr", props: { utm_source: "instagram" }, clinic_id: null });
  });
});

describe("server recording fails soft", () => {
  beforeEach(() => _resetEventBackoff());

  it("inserts a sanitised row", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const db = { from: vi.fn(() => ({ insert })) };
    expect(await recordEvent("checkout_opened", { db: db as never, clinicId: CLINIC, locale: "de", props: { tier: "practice", interval: "month", founding: true, via: "api", email: "x@y.z" } })).toBe(true);
    expect(db.from).toHaveBeenCalledWith("dentvid_events");
    expect(insert).toHaveBeenCalledWith({ name: "checkout_opened", locale: "de", clinic_id: CLINIC, props: { tier: "practice", interval: "month", founding: true, via: "api" } });
  });

  it("a missing table is not an error, and is not retried on every request", async () => {
    const insert = vi.fn(async () => ({ error: { code: "42P01", message: 'relation "public.dentvid_events" does not exist' } }));
    const db = { from: () => ({ insert }) };
    expect(await recordEvent("signup_completed", { db: db as never })).toBe(false);
    expect(await recordEvent("signup_completed", { db: db as never })).toBe(false);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("a throwing or broken client never throws", async () => {
    const db = {
      from: () => {
        throw new Error("boom");
      },
    };
    await expect(insertEventRow({ name: "video_approved", locale: null, props: {}, clinic_id: null }, db as never)).resolves.toBe(false);
    await expect(recordEvent("video_approved", { db: {} as never })).resolves.toBe(false);
  });

  it("reads a capped body and refuses a bigger one", async () => {
    const small = new Request("https://x/api", { method: "POST", body: "a".repeat(100) });
    expect(await readCapped(small, 1024)).toHaveLength(100);
    const big = new Request("https://x/api", { method: "POST", body: "a".repeat(5000) });
    expect(await readCapped(big, 1024)).toBeNull();
  });
});
