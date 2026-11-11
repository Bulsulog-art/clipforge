import { describe, expect, it } from "vitest";
import {
  DIRECT,
  asCountryFilter,
  clinicCountries,
  clinicSources,
  eventCountry,
  funnel,
  funnelByCountry,
  funnelByLocale,
  funnelBySource,
  sourceOf,
  type AdminClinic,
  type AdminEvent,
} from "./admin-metrics";

const NOW = new Date("2026-11-08T15:00:00Z");
const at = (minutesAgo: number) => new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
const ev = (name: string, o: { locale?: string; props?: Record<string, unknown>; clinic_id?: string | null; minutesAgo?: number } = {}): AdminEvent => ({
  name,
  locale: o.locale ?? "tr",
  props: o.props ?? {},
  clinic_id: o.clinic_id ?? null,
  created_at: at(o.minutesAgo ?? 60),
});

const IG = { utm_source: "instagram", utm_medium: "dm", utm_campaign: "tr-launch" };
const IG_KEY = "instagram / dm / tr-launch";

/**
 * An Instagram DM campaign in Turkey: two visitors from the link, one direct
 * visitor from Germany. Visitor 1 signs up, saves clinic "a" (stamped with
 * the tab's tags), checks out and pays — the payment carries no tags itself
 * (it comes from the Dodo webhook) and must still be credited to Instagram.
 */
function campaign(): AdminEvent[] {
  return [
    ev("landing_view", { props: { ...IG, geo: "TR" }, minutesAgo: 120 }),
    ev("landing_view", { props: { ...IG, geo: "TR" }, minutesAgo: 110 }),
    ev("landing_view", { locale: "de", props: { geo: "DE" }, minutesAgo: 100 }),
    ev("cta_clicked", { props: { ...IG, geo: "TR", where: "hero" }, minutesAgo: 119 }),
    ev("signup_started", { props: { ...IG, geo: "TR" }, minutesAgo: 118 }),
    ev("signup_completed", { props: { ...IG, geo: "TR" }, minutesAgo: 117 }),
    ev("clinic_saved", { clinic_id: "a", props: { ...IG, country: "TR", language: "tr" }, minutesAgo: 115 }),
    ev("preview_completed", { props: { ...IG, geo: "TR", where: "wizard" }, minutesAgo: 113 }),
    ev("code_verified", { props: { ...IG, geo: "TR" }, minutesAgo: 112 }),
    ev("checkout_opened", { clinic_id: "a", props: { tier: "practice", interval: "month", founding: true, via: "link" }, minutesAgo: 111 }),
    ev("payment_succeeded", { clinic_id: "a", props: { tier: "practice", interval: "month", first: true }, minutesAgo: 105 }),
    // A later settings save from a direct tab must not move the first touch.
    ev("clinic_saved", { clinic_id: "a", props: { country: "TR", language: "tr" }, minutesAgo: 30 }),
  ];
}

const clinics: AdminClinic[] = [{ id: "a", created_at: at(117), plan: "active", plan_tier: "practice", profile: { name: "A", country: "TR", language: "tr" } }];

describe("sources", () => {
  it("names a source by its UTM tags, else the referrer, else nothing", () => {
    expect(sourceOf(IG)).toBe(IG_KEY);
    expect(sourceOf({ utm_source: "google" })).toBe("google / — / —");
    expect(sourceOf({ ref: "linkedin.com" })).toBe("ref: linkedin.com");
    expect(sourceOf({ where: "hero" })).toBeNull();
    expect(sourceOf(null)).toBeNull();
  });

  it("credits a clinic to its first tagged event", () => {
    expect(clinicSources(campaign()).get("a")).toBe(IG_KEY);
  });

  it("the Sources table attributes the payment to the outreach link", () => {
    const rows = funnelBySource(campaign(), { days: 7, now: NOW });
    const ig = rows.find((r) => r.key === IG_KEY)!;
    expect(ig).toMatchObject({ visits: 2, cta: 1, signups: 1, previewDone: 1, checkouts: 1, paid: 1 });
    expect(ig.visitToPaid).toBeCloseTo(0.5);
    expect(ig.signupToPaid).toBe(1);
    const direct = rows.find((r) => r.key === DIRECT)!;
    expect(direct).toMatchObject({ visits: 1, paid: 0 });
    expect(rows[0].key).toBe(IG_KEY); // busiest first
  });

  it("filters by language and country like the funnel", () => {
    const de = funnelBySource(campaign(), { days: 7, now: NOW, locale: "de" });
    expect(de.map((r) => r.key)).toEqual([DIRECT]);
    const tr = funnelBySource(campaign(), { days: 7, now: NOW, country: "TR", countries: clinicCountries(clinics) });
    expect(tr.find((r) => r.key === IG_KEY)?.paid).toBe(1);
    expect(tr.find((r) => r.key === DIRECT)).toBeUndefined();
  });
});

describe("country", () => {
  it("prefers the clinic's own country, then the typed one, then the edge's", () => {
    const byClinic = clinicCountries(clinics);
    expect(eventCountry(ev("payment_succeeded", { clinic_id: "a" }), byClinic)).toBe("TR");
    expect(eventCountry(ev("clinic_saved", { clinic_id: "b", props: { country: "PL", geo: "DE" } }), byClinic)).toBe("PL");
    expect(eventCountry(ev("landing_view", { props: { geo: "DE" } }), byClinic)).toBe("DE");
    expect(eventCountry(ev("landing_view"), byClinic)).toBe("—");
  });

  it("splits the funnel by country, and the funnel takes a country filter", () => {
    const countries = clinicCountries(clinics);
    const rows = funnelByCountry(campaign(), { days: 7, now: NOW, countries });
    expect(rows.map((r) => r.key)).toEqual(["TR", "DE"]);
    expect(rows[0]).toMatchObject({ visits: 2, signups: 1, verified: 1, paid: 1 });
    const de = funnel(campaign(), { days: 7, now: NOW, country: "DE", countries });
    expect(de.find((s) => s.key === "visit")?.count).toBe(1);
    expect(de.find((s) => s.key === "paid")?.count).toBe(0);
  });

  it("by locale still works, with the new columns", () => {
    const rows = funnelByLocale(campaign(), { days: 7, now: NOW });
    expect(rows[0]).toMatchObject({ locale: "tr", key: "tr", visits: 2, cta: 1, signups: 1, checkouts: 1, paid: 1 });
  });

  it("reads ?country= safely", () => {
    expect(asCountryFilter("tr")).toBe("TR");
    expect(asCountryFilter("Turkey")).toBeNull();
    expect(asCountryFilter(undefined)).toBeNull();
  });
});
