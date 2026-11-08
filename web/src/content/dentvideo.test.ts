import { describe, expect, it } from "vitest";
import { GUIDES, LANDING, LANDING_PATH, LOCALES, guidePath, guidesFor } from "./dentvideo";
import { dentvideoPaths, guideJsonLd, landingAlternates, landingJsonLd } from "@/lib/dentvid/seo";

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

  it("has no empty strings", () => {
    const walk = (v: unknown, path: string) => {
      if (typeof v === "string") expect(v.trim(), path).not.toBe("");
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(LANDING, "LANDING");
    walk(GUIDES, "GUIDES");
  });

  it("states no prices or invented numbers", () => {
    const text = JSON.stringify(LANDING) + JSON.stringify(GUIDES);
    expect(text).not.toMatch(/[$€£₺]\s?\d|\d\s?(%|€|\$|£|TL)/);
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

  it("every locale has at least one guide", () => {
    for (const l of LOCALES) expect(guidesFor(l).length, l).toBeGreaterThan(0);
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
