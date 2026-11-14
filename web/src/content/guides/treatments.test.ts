import { describe, expect, it } from "vitest";
import { GUIDES, guidePath, guidesFor } from "../dentvideo";
import { samplesFor } from "../dentvideo-samples";
import { guideSample, guideTexts, parseInline, resolveTarget, translationsOf } from "./text";
import { CHECKER_PATH, GUIDE_UI } from "./ui";
import { guideJsonLd } from "@/lib/dentvid/seo-guides";
import { sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";
import { AI_CRAWLERS, ROBOTS_DISALLOW, robotsTxt } from "@/lib/dentvid/robots";

/**
 * The per-treatment patient-education pages and the posting-rhythm guide
 * (SEO/GEO push, 2026-11-14): a hreflang group per treatment in en/de/tr,
 * real samples only in their own language, every page reachable from an
 * older guide, and the answer-engine files and robots.txt that point to them.
 */

const TREATMENT_TOPICS = ["treatment-implants", "treatment-aligners", "treatment-whitening", "treatment-kids", "treatment-gum-disease", "treatment-root-canal"];
const linksOf = (g: (typeof GUIDES)[number]) =>
  guideTexts(g).flatMap((t) => parseInline(t).flatMap((p) => (p.kind === "link" ? [p.target] : [])));

describe("treatment pages", () => {
  it("each treatment has a page in English, German and Turkish, grouped for hreflang", () => {
    for (const topic of TREATMENT_TOPICS) {
      const group = GUIDES.filter((g) => g.topic === topic);
      expect(group.map((g) => g.locale).sort(), topic).toEqual(["de", "en", "tr"]);
      for (const g of group) {
        expect(g.category, g.slug).toBe("treatments");
        expect(translationsOf(g), g.slug).toHaveLength(3);
      }
    }
  });

  it("every treatment page has a risky → safer wording table, links the ad checker and the rules guide of its language", () => {
    for (const g of GUIDES.filter((x) => x.category === "treatments")) {
      expect(g.sections.some((s) => s.table && s.table.rows.length >= 4 && /[„“"«]/.test(s.table.rows.map((r) => r[0]).join(" "))), g.slug).toBe(true);
      const targets = linksOf(g);
      expect(targets, g.slug).toContain("checker:");
      const rules = targets.filter((t) => t.startsWith("guide:")).map((t) => GUIDES.find((o) => o.slug === t.slice(6))!);
      expect(rules.some((r) => r.category === "rules"), g.slug).toBe(true);
    }
  });

  it("a guide's sample is a real video in its own language and appears as a VideoObject", () => {
    const withSample = GUIDES.filter((g) => g.sample);
    expect(withSample.length).toBeGreaterThanOrEqual(8);
    for (const g of withSample) {
      const v = guideSample(g);
      expect(v, `${g.slug}: ${g.sample}`).toBeDefined();
      expect(samplesFor(g.locale)!.map((s) => s.slug), g.slug).toContain(g.sample);
      const graph = guideJsonLd(g)["@graph"] as Record<string, unknown>[];
      const video = graph.find((n) => n["@type"] === "VideoObject")!;
      expect(video, g.slug).toBeDefined();
      expect(video.name).toBe(v!.name);
      expect(String(video.contentUrl)).toMatch(new RegExp(`/dentvideo/samples/${g.locale}/${g.sample}\\.mp4$`));
      expect(video.duration).toBe(`PT${v!.seconds}S`);
      expect(llmsFullTxt()).toContain(`Sample video: "${v!.name}"`);
    }
    // No VideoObject where no sample is shown.
    for (const g of GUIDES.filter((x) => !x.sample)) {
      expect((guideJsonLd(g)["@graph"] as { "@type": string }[]).some((n) => n["@type"] === "VideoObject"), g.slug).toBe(false);
    }
  });

  it("the checker link resolves to the checker in the page's language", () => {
    for (const l of ["en", "de", "tr", "es"] as const) expect(resolveTarget("checker:", l)).toBe(CHECKER_PATH[l]);
  });

  it("the guides hub has a treatments group label in every language", () => {
    for (const ui of Object.values(GUIDE_UI)) {
      expect(ui.categories.treatments.length).toBeGreaterThan(0);

    }
  });
});

describe("posting-rhythm guide", () => {
  it("exists in en, de, es and tr as one hreflang group, with no invented figures", () => {
    const group = GUIDES.filter((g) => g.topic === "posting-frequency");
    expect(group.map((g) => g.locale).sort()).toEqual(["de", "en", "es", "tr"]);
    for (const g of group) expect(JSON.stringify(g), g.slug).not.toMatch(/\d\s?%|\b(study|studie|estudio|araştırma) (shows|zeigt|muestra|gösteriyor)/i);
  });
});

describe("new pages are linked, listed and crawlable", () => {
  const NEW = GUIDES.filter((g) => g.published === "2026-11-14");

  it("every new page is linked from at least one older guide of its language (no orphans)", () => {
    for (const g of NEW) {
      const from = guidesFor(g.locale).filter((o) => o.published !== "2026-11-14" && linksOf(o).includes(`guide:${g.slug}`));
      expect(from.length, g.slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("every new page is in the sitemap, llms.txt and llms-full.txt", () => {
    const xml = sitemapXml();
    const txt = llmsTxt();
    const full = llmsFullTxt();
    for (const g of NEW) {
      const url = `https://dentvideo.com${guidePath(g).replace(/^\/dentvideo/, "")}`;
      expect(xml, g.slug).toContain(`<loc>${url}</loc>`);
      expect(txt, g.slug).toContain(`(${url})`);
      expect(full, g.slug).toContain(`URL: ${url}`);
    }
  });

  it("llms.txt opens with quick answers that state the current plans and nothing retired", () => {
    const txt = llmsTxt();
    const qa = txt.slice(txt.indexOf("## Quick answers"), txt.indexOf("## How a week works"));
    expect(qa).toContain("Starter $29/month, Practice $49/month");
    expect(qa).toContain("no yearly plan");
    expect(qa).toContain("hello@dentvideo.com");
    expect(qa).not.toMatch(/\$990|\$279|\/year|founding (offer|price) of/i);
  });
});

describe("robots.txt", () => {
  const txt = robotsTxt();

  it("allows every page to search and AI crawlers, names the AI crawlers, and points to the sitemap", () => {
    for (const bot of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "Bingbot"]) {
      expect(AI_CRAWLERS as readonly string[]).toContain(bot);
      expect(txt).toContain(`User-agent: ${bot}`);
    }
    expect(txt).toContain("Sitemap: https://dentvideo.com/sitemap.xml");
    expect(txt).not.toMatch(/Disallow: \/\s*$/m);
  });

  it("every group keeps the private paths closed (a crawler obeys only its own group)", () => {
    const groups = txt.split(/\n\n/).filter((g) => g.includes("User-agent:"));
    expect(groups.length).toBe(2);
    for (const g of groups) for (const p of ROBOTS_DISALLOW) expect(g, g.slice(0, 40)).toContain(`Disallow: ${p}`);
  });
});
