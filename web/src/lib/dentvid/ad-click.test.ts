import { describe, expect, it } from "vitest";
import { AD_CLICK_KEY, AD_DECLINED_KEY, CLICK_TTL_MS, clickFrom, consentRequired, declineAdClick, declinedInTab, readAdClick, storeAdClick, validClick } from "./ad-click";
import { DV_EVENT_PROPS, sanitizeProps } from "./events";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

// A realistic gclid (~90 chars) and an iOS wbraid.
const GCLID = "Cj0KCQiA4L67BhDUARIsADWrl7G-yyF3cTe2Kx_0bWv3rN8cQe1Yt5bW2b8fJx9qY0Z2VnR8mZpXcaAm1kEALw_wcB";
const WBRAID = "CjkKCAiA4L67BhBXEikAJ3bE1zg5yB0nUqVqfFZ7yYt1dDx3wQ8sT4Q2mUqXGQZ4aD9rGgL0tBoCvBg";

describe("ad click ids from the landing URL", () => {
  it("reads gclid, then gbraid, then wbraid; accepts realistic lengths up to 200", () => {
    expect(clickFrom(`?gclid=${GCLID}&utm_source=google`)).toEqual({ type: "gclid", id: GCLID });
    expect(clickFrom(`?wbraid=${WBRAID}`)).toEqual({ type: "wbraid", id: WBRAID });
    expect(clickFrom(`?wbraid=${WBRAID}&gbraid=abcdef12345`)).toEqual({ type: "gbraid", id: "abcdef12345" });
    expect(clickFrom(`?gclid=${"a".repeat(200)}`)?.id).toHaveLength(200);
    expect(clickFrom("?gclid=TEST123")).toEqual({ type: "gclid", id: "TEST123" });
  });

  it("rejects junk: too long, too short, wrong characters", () => {
    expect(clickFrom(`?gclid=${"a".repeat(201)}`)).toBeNull();
    expect(clickFrom("?gclid=abc")).toBeNull();
    expect(clickFrom("?gclid=<script>alert(1)</script>")).toBeNull();
    expect(clickFrom("?gclid=a%20b%20c%20d%20e")).toBeNull();
    expect(clickFrom("?gclid=someone@example.com")).toBeNull();
    expect(clickFrom("?utm_source=google")).toBeNull();
  });

  it("is never a funnel-event prop", () => {
    for (const rules of Object.values(DV_EVENT_PROPS)) for (const k of ["gclid", "gbraid", "wbraid"]) expect(rules).not.toHaveProperty(k);
    expect(sanitizeProps("landing_view", { gclid: GCLID, utm_source: "google" })).toEqual({ utm_source: "google" });
  });
});

describe("consent countries", () => {
  it("EU/EEA, UK and Switzerland ask first; unknown asks first; Türkiye and the US do not", () => {
    for (const c of ["DE", "AT", "ES", "FR", "PL", "IE", "NO", "IS", "LI", "GB", "CH", "de"]) expect(consentRequired(c), c).toBe(true);
    for (const c of [undefined, null, "", "XX", "T1", "Germany"]) expect(consentRequired(c as string | undefined), String(c)).toBe(true);
    for (const c of ["TR", "US", "ME", "JP", "AE"]) expect(consentRequired(c), c).toBe(false);
  });
});

describe("stored click", () => {
  const NOW = Date.parse("2026-11-15T10:00:00Z");

  it("validates shape, consent and age (90 days)", () => {
    const ok = { type: "gclid", id: GCLID, at: NOW - 1000, consent: "granted" };
    expect(validClick(ok, NOW)).toEqual(ok);
    expect(validClick({ ...ok, consent: "not_required" }, NOW)?.consent).toBe("not_required");
    expect(validClick({ ...ok, consent: "denied" }, NOW)).toBeNull();
    expect(validClick({ ...ok, type: "fbclid" }, NOW)).toBeNull();
    expect(validClick({ ...ok, at: NOW - CLICK_TTL_MS - 1 }, NOW)).toBeNull();
    expect(validClick({ ...ok, at: NOW + 3_600_000 }, NOW)).toBeNull();
    expect(validClick({ ...ok, id: "bad id!" }, NOW)).toBeNull();
    expect(validClick(null, NOW)).toBeNull();
  });

  it("is stored only when valid, read back, and dropped once expired", () => {
    const s = memory();
    const at = Date.now();
    storeAdClick({ type: "gclid", id: GCLID, at, consent: "granted" }, s);
    expect(readAdClick(s, at + 1000)).toMatchObject({ id: GCLID, consent: "granted" });
    expect(readAdClick(s, at + CLICK_TTL_MS + 1)).toBeNull();
    expect(s.m.has(AD_CLICK_KEY)).toBe(false);
    storeAdClick({ type: "gclid", id: "x", at, consent: "granted" }, s);
    expect(s.m.size).toBe(0);
  });

  it("decline drops the click and remembers the answer for the tab", () => {
    const s = memory();
    const tab = memory();
    storeAdClick({ type: "gclid", id: GCLID, at: Date.now(), consent: "granted" }, s);
    declineAdClick(s, tab);
    expect(s.m.has(AD_CLICK_KEY)).toBe(false);
    expect(tab.m.get(AD_DECLINED_KEY)).toBe("1");
    expect(declinedInTab(tab)).toBe(true);
    expect(declinedInTab(memory())).toBe(false);
  });

  it("survives malformed or missing storage", () => {
    const s = memory();
    s.setItem(AD_CLICK_KEY, "{not json");
    expect(readAdClick(s)).toBeNull();
    expect(readAdClick(null)).toBeNull();
    expect(() => storeAdClick({ type: "gclid", id: GCLID, at: Date.now(), consent: "granted" }, null)).not.toThrow();
  });
});
