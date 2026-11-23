import { describe, expect, it } from "vitest";
import { GUIDES, guidePath, guidesFor } from "../dentvideo";
import { MONEY } from "../compliance-words";
import { guideMarkdown, guideTexts, parseInline, plainText, translationsOf, wordCount } from "./text";
import { KEY_TAKEAWAYS } from "./ui-takeaways";
import { BUYERS_EN } from "./buyers-en";
import { dentvideoSitemapEntries, guideAlternates, guideMetadata } from "@/lib/dentvid/seo-guides";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";
import { DV_SELF_SERVE_TIERS } from "@/lib/dentvid/billing";
import { DV_CURRENCIES, dvTierPrice } from "@/lib/dentvid/pricing";

/**
 * Answer-engine (GEO) rules for the English guides, the priority market:
 * a 40 to 60 word direct answer first, three to five key takeaways, no em
 * dashes anywhere, and the 2026-11-23 buyer-intent pages wired into links,
 * the sitemap, canonicals and llms.txt without hreflang to translations that
 * do not exist.
 */

const EN = guidesFor("en");
const NEW = BUYERS_EN.map((g) => g.slug);
const linksOf = (g: (typeof GUIDES)[number]) =>
  guideTexts(g).flatMap((t) => parseInline(t).flatMap((p) => (p.kind === "link" ? [p.target] : [])));

describe("English guides: direct answer and key takeaways", () => {
  it("every English guide opens with a 40 to 60 word answer paragraph", () => {
    for (const g of EN) {
      const n = wordCount(g.intro);
      expect(n, `${g.slug}: ${n} words`).toBeGreaterThanOrEqual(40);
      expect(n, `${g.slug}: ${n} words`).toBeLessThanOrEqual(60);
    }
  });

  it("every English guide has three to five short key takeaways", () => {
    for (const g of EN) {
      expect(g.takeaways?.length ?? 0, g.slug).toBeGreaterThanOrEqual(3);
      expect(g.takeaways!.length, g.slug).toBeLessThanOrEqual(5);
      for (const t of g.takeaways!) expect(wordCount(t), `${g.slug}: ${t}`).toBeLessThanOrEqual(30);
      expect(new Set(g.takeaways).size, g.slug).toBe(g.takeaways!.length);
    }
  });

  it("takeaways have a heading in every language and reach llms-full.txt", () => {
    for (const label of Object.values(KEY_TAKEAWAYS)) expect(label.trim().length).toBeGreaterThan(0);
    const full = llmsFullTxt();
    for (const g of EN) {
      const md = guideMarkdown(g, (p) => p);
      expect(md, g.slug).toContain(`### ${KEY_TAKEAWAYS.en}`);
      expect(full, g.slug).toContain(`- ${plainText(g.takeaways![0])}`);
    }
  });

  it("no English guide has an em dash or a spaced en dash in any visible text", () => {
    const DASH = /—| – /;
    for (const g of EN) {
      const visible = [g.title, g.h1, g.description, g.seoTitle ?? "", g.seoDescription ?? "", ...guideTexts(g), ...(g.sources ?? []).map((s) => s.label)];
      for (const t of visible) expect(t, g.slug).not.toMatch(DASH);
    }
  });
});

describe("buyer-intent pages (2026-11-23)", () => {
  it("are English, in the library, and state no price", () => {
    expect(NEW).toHaveLength(5);
    for (const g of BUYERS_EN) {
      expect(g.locale, g.slug).toBe("en");
      expect(GUIDES, g.slug).toContain(g);
      expect(JSON.stringify(g), g.slug).not.toMatch(MONEY);
    }
  });

  it("each links to at least three other guides and to the free preview", () => {
    for (const g of BUYERS_EN) {
      const targets = linksOf(g);
      const guides = new Set(targets.filter((t) => t.startsWith("guide:")));
      expect(guides.size, g.slug).toBeGreaterThanOrEqual(3);
      expect(targets, g.slug).toContain("start:");
    }
  });

  it("the UK and US pages are rules guides that cite official texts and link the ad checker", () => {
    for (const slug of ["patient-education-videos-uk-dental-practices", "patient-education-videos-us-dental-practices"]) {
      const g = BUYERS_EN.find((x) => x.slug === slug)!;
      expect(g.category, slug).toBe("rules");
      expect(linksOf(g), slug).toContain("checker:");
      expect((g.sources ?? []).length, slug).toBeGreaterThanOrEqual(3);
    }
    const uk = BUYERS_EN.find((x) => x.slug.includes("-uk-"))!.sources!.map((s) => new URL(s.url).hostname);
    expect(uk).toEqual(expect.arrayContaining(["www.gdc-uk.org", "www.asa.org.uk"]));
    const us = BUYERS_EN.find((x) => x.slug.includes("-us-"))!.sources!.map((s) => new URL(s.url).hostname);
    expect(us).toEqual(expect.arrayContaining(["www.ada.org", "www.law.cornell.edu"]));
  });

  it("have a self canonical, no hreflang (no translations exist) and a sitemap entry with lastmod", () => {
    const entries = dentvideoSitemapEntries();
    for (const g of BUYERS_EN) {
      expect(translationsOf(g), g.slug).toEqual([g]);
      expect(guideAlternates(g), g.slug).toBeUndefined();
      const alt = guideMetadata(g).alternates!;
      expect(String(alt.canonical), g.slug).toMatch(new RegExp(`${guidePath(g)}$`));
      expect(alt.languages, g.slug).toBeUndefined();
      const e = entries.find((x) => x.path === guidePath(g));
      expect(e?.lastmod, g.slug).toBe(g.updated);
      expect(e?.alternates, g.slug).toBeUndefined();
    }
  });

  it("are linked from the most relevant existing English guides", () => {
    const from: Record<string, string[]> = {
      "dental-video-marketing-agency-or-software": ["dental-marketing-agency-vs-patient-education-video-software", "best-way-to-get-patient-education-videos"],
      "patient-education-videos": ["best-way-to-get-patient-education-videos", "dental-video-marketing-for-small-practices"],
      "dental-advertising-rules-uk-gdc-asa": ["patient-education-videos-uk-dental-practices"],
      "dental-advertising-rules-us": ["patient-education-videos-us-dental-practices"],
      "dental-social-media-advertising-rules": ["patient-education-videos-uk-dental-practices", "patient-education-videos-us-dental-practices"],
      "how-often-should-a-dental-practice-post": ["dental-video-marketing-for-small-practices"],
      "dental-videos-without-being-on-camera": ["best-way-to-get-patient-education-videos"],
    };
    for (const [slug, targets] of Object.entries(from)) {
      const g = GUIDES.find((x) => x.slug === slug)!;
      for (const t of targets) expect(linksOf(g), `${slug} → ${t}`).toContain(`guide:${t}`);
    }
  });

  it("llms.txt answers the buying questions with the real plan prices and the new pages", () => {
    const txt = llmsTxt();
    const line = (start: string) => txt.split("\n").find((x) => x.startsWith(start));
    const easiest = line("- What is the easiest way for a dentist to post patient videos every week?");
    expect(easiest).toContain("https://dentvideo.com/guides/best-way-to-get-patient-education-videos");
    const cost = line("- How much does patient education video software cost?")!;
    for (const t of DV_SELF_SERVE_TIERS) for (const c of DV_CURRENCIES) expect(cost).toContain(dvTierPrice("en", t, c));
    expect(cost).toContain("no discounts");
    expect(cost).toContain("dental-marketing-agency-vs-patient-education-video-software");
    expect(line("- Is video marketing worth it for a small dental practice")).toContain("dental-video-marketing-for-small-practices");
    expect(line("- What rules apply to patient education videos in the UK?")).toContain("not legal advice");
    expect(line("- What rules apply to patient education videos in the US?")).toContain("patient-education-videos-us-dental-practices");
    for (const g of BUYERS_EN) expect(txt, g.slug).toContain(`https://dentvideo.com/guides/${g.slug}`);
  });
});
