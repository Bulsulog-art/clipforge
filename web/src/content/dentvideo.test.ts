import { describe, expect, it } from "vitest";
import { GUIDES, GUIDE_HUB_LOCALES, LANDING, LANDING_PATH, LOCALES, dirOf, guidePath, guidesFor } from "./dentvideo";
import { dentvideoPaths, guideJsonLd, landingAlternates, landingJsonLd } from "@/lib/dentvid/seo";
import { DV_FOUNDING, DV_PRICES_USD, DV_TIERS } from "@/lib/dentvid/billing";

/** Shape of a value: object keys and array lengths, recursively. */
function shape(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shape);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort().map(([k, x]) => [k, shape(x)]));
  return typeof v;
}

describe("DentVideo landing content", () => {
  it("every locale has the same keys and sections as English", () => {
    const en = shape(LANDING.en);
    for (const l of LOCALES) expect(shape(LANDING[l]), l).toEqual(en);
  });

  it("search snippets fit: titles up to 65 characters, descriptions 70–160", () => {
    for (const l of LOCALES) {
      const { title, description } = LANDING[l].meta;
      expect(title.length, `${l} title`).toBeLessThanOrEqual(65);
      expect(description.length, `${l} description`).toBeGreaterThanOrEqual(70);
      expect(description.length, `${l} description`).toBeLessThanOrEqual(160);
    }
  });

  it("has no empty strings", () => {
    const walk = (v: unknown, path: string) => {
      if (typeof v === "string") expect(v.trim(), path).not.toBe("");
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(LANDING, "LANDING");
    walk(GUIDES, "GUIDES");
  });

  // Prices are owner-approved (docs/POSITIONING.md §6) and appear only in the
  // pricing section; everywhere else — hero, FAQ, comparison, guides — a
  // currency figure or a percentage is still an invented number.
  const MONEY = /[$€£₺]\s?\d|\d\s?(%|€|\$|£|TL)/;

  it("states no prices or invented numbers outside the pricing section", () => {
    const withoutPricing = LOCALES.map((l) => {
      const { pricing: _pricing, ...rest } = LANDING[l];
      return JSON.stringify(rest);
    }).join("");
    expect(withoutPricing).not.toMatch(MONEY);
    expect(JSON.stringify(GUIDES)).not.toMatch(MONEY);
  });

  it("pricing shows only the configured USD prices, in every locale", () => {
    const allowed = new Set<number>();
    for (const tier of DV_TIERS) for (const v of Object.values(DV_PRICES_USD[tier])) if (v) allowed.add(v);
    allowed.add(DV_FOUNDING.priceUsd);
    for (const l of LOCALES) {
      const p = LANDING[l].pricing;
      const text = JSON.stringify(p);
      expect(text, l).not.toMatch(/[€£₺%]|TL/);
      const figures = [...text.matchAll(/\$\s?(\d[\d,.]*)|(\d[\d,.]*)\s?\$/g)].map((m) => Number((m[1] ?? m[2]).replace(/[,.]/g, "")));
      expect(figures.length, l).toBeGreaterThan(0);
      for (const f of figures) expect(allowed.has(f), `${l}: ${f}`).toBe(true);
      // Starter, Practice, Group at their monthly list prices, in that order.
      DV_TIERS.forEach((tier, i) => expect(p.tiers[i].price.replace(/\D/g, ""), `${l} ${tier}`).toBe(String(DV_PRICES_USD[tier].month)));
      expect(p.founding, l).toContain(String(DV_FOUNDING.priceUsd));
      expect(p.founding, l).toContain(String(DV_FOUNDING.months));
      expect(p.founding, l).toContain(String(DV_FOUNDING.clinics));
      expect(p.yearly, l).toContain(String(DV_PRICES_USD.practice.year));
    }
  });

  it("every landing has a path, and paths are unique", () => {
    const paths = LOCALES.map((l) => LANDING_PATH[l]);
    expect(new Set(paths).size).toBe(LOCALES.length);
    expect(LANDING_PATH.en).toBe("/dentvideo");
  });

  it("hreflang map covers every locale plus x-default", () => {
    const alt = landingAlternates();
    expect(Object.keys(alt).sort()).toEqual([...LOCALES, "x-default"].sort());
    for (const l of LOCALES) expect(alt[l]).toMatch(new RegExp(`${LANDING_PATH[l]}$`));
    expect(alt["x-default"]).toBe(alt.en);
  });

  it("landing JSON-LD carries the localized FAQ", () => {
    for (const l of LOCALES) {
      const graph = landingJsonLd(l)["@graph"] as { "@type": string; mainEntity?: unknown[] }[];
      const faq = graph.find((n) => n["@type"] === "FAQPage");
      expect(faq?.mainEntity).toHaveLength(LANDING[l].faq.length);
    }
  });
});

describe("DentVideo guides", () => {
  it("slugs are unique and URL-safe", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("every locale with a guides hub has guides", () => {
    for (const l of GUIDE_HUB_LOCALES) expect(guidesFor(l).length, l).toBeGreaterThan(0);
  });

  it("each guide has sections, an FAQ and breadcrumb structured data", () => {
    for (const g of GUIDES) {
      expect(g.sections.length).toBeGreaterThan(0);
      expect(g.faq.length).toBeGreaterThan(0);
      const types = (guideJsonLd(g)["@graph"] as { "@type": string }[]).map((n) => n["@type"]);
      expect(types).toEqual(expect.arrayContaining(["FAQPage", "BreadcrumbList"]));
    }
  });

  it("the sitemap lists every landing and guide", () => {
    const paths = dentvideoPaths();
    for (const l of LOCALES) expect(paths).toContain(LANDING_PATH[l]);
    for (const g of GUIDES) expect(paths).toContain(guidePath(g));
  });
});
