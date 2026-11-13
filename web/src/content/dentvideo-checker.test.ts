import { describe, expect, it } from "vitest";
import { LOCALES, findGuide } from "./dentvideo";
import { CHECKER, CHECKER_PATH } from "./dentvideo-checker";
import { SNIPPET_BANNED, unquoted } from "./compliance-words";
import { CHECKER_RULE_IDS } from "@/lib/dentvid/ad-checker";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, checkerSeoTitle } from "@/lib/dentvid/seo-guides";

describe("ad checker copy", () => {
  it.each(LOCALES)("%s: complete, natively written and within snippet lengths", (l) => {
    const c = CHECKER[l];
    expect(checkerSeoTitle(l).length, `${l} title`).toBeLessThanOrEqual(SEO_TITLE_MAX);
    expect(c.seoDescription.length, `${l} description`).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    expect(c.seoDescription.length).toBeGreaterThan(l === "ja" ? 50 : 80);
    expect(c.queries.length).toBeGreaterThanOrEqual(4);
    expect(c.faq.length).toBeGreaterThanOrEqual(4);
    expect(c.rules.length).toBeGreaterThanOrEqual(1);
    expect(Object.keys(c.ui.rules).sort()).toEqual([...CHECKER_RULE_IDS].sort());
    expect(c.ui.found).toContain("{n}");
    expect(c.ui.tooLong).toContain("{max}");
    // Every page says it is not legal advice, and that the text never leaves the browser.
    expect(c.notLegalAdvice.length).toBeGreaterThan(20);
    expect(c.ui.privacy.length).toBeGreaterThan(20);
  });

  it.each(LOCALES)("%s: no promise or superlative in the title, description or H1 (examples in quotes excepted)", (l) => {
    const c = CHECKER[l];
    for (const t of [c.seoTitle, c.seoDescription, c.h1, c.nav]) expect(unquoted(t), `${l}: ${t}`).not.toMatch(SNIPPET_BANNED);
  });

  it.each(LOCALES)("%s: links to its own market's advertising-rules guide, in its language", (l) => {
    const g = findGuide(CHECKER[l].guide.slug);
    expect(g, CHECKER[l].guide.slug).toBeDefined();
    expect(g?.locale).toBe(l);
    expect(g?.category).toBe("rules");
  });

  it.each(LOCALES)("%s: every rules note cites an official https source", (l) => {
    for (const r of CHECKER[l].rules) {
      expect(r.sources.length, r.heading).toBeGreaterThan(0);
      for (const s of r.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("names the markets the page is for", () => {
    const text = (l: (typeof LOCALES)[number]) => CHECKER[l].rules.map((r) => `${r.heading} ${r.text}`).join(" ");
    expect(text("en")).toMatch(/GDC|General Dental Council/);
    expect(text("en")).toMatch(/CAP Code/);
    expect(text("en")).toMatch(/state/i);
    expect(text("en")).toMatch(/FTC|Federal Trade Commission/);
    expect(text("de")).toMatch(/HWG|Heilmittelwerbegesetz/);
    expect(text("tr")).toMatch(/Sağlık Bakanlığı/);
    expect(text("tr")).toMatch(/Türk Dişhekimleri Birliği/);
    expect(text("tr")).toMatch(/33075/);
  });

  it("the Turkish page says the text is sent nowhere", () => {
    expect(CHECKER.tr.intro).toMatch(/metniniz hiçbir yere gönderilmez/i);
    expect(CHECKER.tr.ui.privacy).toMatch(/hiçbir yere gönderilmez/);
  });

  it("lives at /ad-checker in every language", () => {
    for (const l of LOCALES) expect(CHECKER_PATH[l]).toBe(l === "en" ? "/dentvideo/ad-checker" : `/dentvideo/${l}/ad-checker`);
  });
});
