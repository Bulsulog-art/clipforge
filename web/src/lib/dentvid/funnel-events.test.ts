import { describe, expect, it } from "vitest";
import { DV_CLIENT_EVENTS, DV_CLINIC_CLIENT_EVENTS, DV_EVENTS, buildEventRow, geoCountry, parseClientEvent } from "./events";
import { ATTR_KEY, attributionFrom, captureAttribution, readAttribution } from "./attribution";
import { FUNNEL } from "./admin-metrics";

/**
 * Every step of the paid funnel has an event, and the new ones keep the
 * privacy rules: allow-listed props only, the country only from the edge's
 * geo header, and the source tags only as slugs or a host name.
 */

const STEPS = [
  "landing_view", // landing view
  "cta_clicked", // a sign-up button
  "signup_started", // first keystroke in the form
  "signup_completed", // account made (server)
  "code_verified", // email code confirmed (server)
  "clinic_saved", // clinic saved (server)
  "preview_played", // the live preview played
  "preview_completed", // a preview video watched to the end
  "plan_viewed", // the plan step shown
  "plan_clicked",
  "checkout_opened", // server
  "payment_succeeded", // webhook
] as const;

describe("funnel events", () => {
  it("there is an event for every step, and every step is on the dashboard", () => {
    for (const s of STEPS) expect(DV_EVENTS, s).toContain(s);
    const onDashboard = new Set(FUNNEL.map((f) => f.event));
    for (const s of STEPS) expect(onDashboard.has(s), s).toBe(true);
  });

  it("server-side steps cannot be sent from a browser", () => {
    for (const s of ["signup_completed", "code_verified", "clinic_saved", "checkout_opened", "payment_succeeded"] as const) {
      expect(DV_CLIENT_EVENTS.includes(s), s).toBe(false);
      expect(parseClientEvent(JSON.stringify({ name: s }))).toBeNull();
    }
  });

  it("the plan step view is tied to the signed-in clinic by the server", () => {
    expect(DV_CLINIC_CLIENT_EVENTS).toContain("plan_viewed");
  });

  it("cta_clicked keeps only a known place", () => {
    expect(parseClientEvent(JSON.stringify({ name: "cta_clicked", props: { where: "hero" } }))?.props).toEqual({ where: "hero" });
    expect(parseClientEvent(JSON.stringify({ name: "cta_clicked", props: { where: "https://evil.example/x" } }))?.props).toEqual({});
  });

  it("the hero's \"See your preview\" is its own step, before the sign-up buttons", () => {
    expect(parseClientEvent(JSON.stringify({ name: "try_clicked", props: { where: "hero" } }))?.props).toEqual({ where: "hero" });
    expect(parseClientEvent(JSON.stringify({ name: "try_clicked", props: { where: "pricing" } }))?.props).toEqual({});
    const order = FUNNEL.map((f) => f.key);
    expect(order.indexOf("try")).toBeLessThan(order.indexOf("teaser"));
    expect(order.indexOf("teaser")).toBeLessThan(order.indexOf("cta"));
    expect(order.indexOf("cta")).toBeLessThan(order.indexOf("signupStart"));
  });

  it("preview_played / preview_completed say where: landing or wizard", () => {
    for (const name of ["preview_played", "preview_completed"]) {
      expect(parseClientEvent(JSON.stringify({ name, props: { where: "wizard" } }))?.props).toEqual({ where: "wizard" });
      expect(parseClientEvent(JSON.stringify({ name, props: { where: "elsewhere" } }))?.props).toEqual({});
    }
  });

  it("any event may carry the first-touch source, sanitised", () => {
    const row = parseClientEvent(
      JSON.stringify({ name: "plan_viewed", props: { utm_source: "Instagram", utm_medium: "dm", utm_campaign: "tr-launch", ref: "www.Google.com", email: "a@b.c" } }),
    );
    expect(row?.props).toEqual({ utm_source: "instagram", utm_medium: "dm", utm_campaign: "tr-launch", ref: "google.com" });
    // An email or a phone number in a tag is dropped.
    expect(parseClientEvent(JSON.stringify({ name: "cta_clicked", props: { utm_source: "dr@clinic.com", utm_campaign: "+90 532 123 45 67" } }))?.props).toEqual({});
  });

  it("the country comes from the edge header, never from the browser's body", () => {
    expect(parseClientEvent(JSON.stringify({ name: "landing_view", props: { geo: "TR" } }))?.props).toEqual({});
    expect(parseClientEvent(JSON.stringify({ name: "landing_view" }), "TR")?.props).toEqual({ geo: "TR" });
    expect(buildEventRow({ name: "signup_completed", geo: "de" })?.props).toEqual({ geo: "DE" });
    expect(buildEventRow({ name: "signup_completed", geo: "Germany" })?.props).toEqual({});
  });

  it("geoCountry reads Cloudflare / Vercel / generic headers and ignores placeholders", () => {
    expect(geoCountry(new Headers({ "cf-ipcountry": "tr" }))).toBe("TR");
    expect(geoCountry(new Headers({ "x-vercel-ip-country": "DE" }))).toBe("DE");
    expect(geoCountry(new Headers({ "x-country-code": "PL" }))).toBe("PL");
    expect(geoCountry(new Headers({ "cf-ipcountry": "XX" }))).toBeUndefined();
    expect(geoCountry(new Headers({ "cf-ipcountry": "T1" }))).toBeUndefined();
    expect(geoCountry(new Headers())).toBeUndefined();
  });
});

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe("first-touch attribution", () => {
  const OUTREACH = "?utm_source=instagram&utm_medium=dm&utm_campaign=tr-launch";

  it("reads the outreach link's tags", () => {
    expect(attributionFrom(OUTREACH, "", "dentvideo.com")).toEqual({ utm_source: "instagram", utm_medium: "dm", utm_campaign: "tr-launch" });
  });

  it("falls back to an outside referrer, ignores our own pages and junk tags", () => {
    expect(attributionFrom("", "https://www.google.com/search?q=x", "dentvideo.com")).toEqual({ ref: "google.com" });
    expect(attributionFrom("", "https://dentvideo.com/tr", "dentvideo.com")).toEqual({});
    expect(attributionFrom("?utm_source=<script>", "", "dentvideo.com")).toEqual({});
  });

  it("keeps the first touch for the tab: later visits do not replace it", () => {
    const s = memoryStore();
    captureAttribution(attributionFrom(OUTREACH, "", "dentvideo.com"), s);
    captureAttribution(attributionFrom("?utm_source=google", "", "dentvideo.com"), s);
    expect(readAttribution(s)).toEqual({ utm_source: "instagram", utm_medium: "dm", utm_campaign: "tr-launch" });
    expect(s.m.has(ATTR_KEY)).toBe(true);
  });

  it("a direct visit stores nothing, and a later tagged one still counts", () => {
    const s = memoryStore();
    captureAttribution({}, s);
    expect(s.m.size).toBe(0);
    captureAttribution({ utm_source: "newsletter" }, s);
    expect(readAttribution(s)).toEqual({ utm_source: "newsletter" });
  });

  it("survives a malformed or missing store", () => {
    const s = memoryStore();
    s.setItem(ATTR_KEY, "{not json");
    expect(readAttribution(s)).toEqual({});
    expect(readAttribution(null)).toEqual({});
  });
});
