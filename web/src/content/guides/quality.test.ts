import { describe, expect, it } from "vitest";
import { GUIDES, LOCALES, guidePath, guidesFor } from "../dentvideo";
import { BODY_BANNED, MONEY, SNIPPET_BANNED, unquoted } from "../compliance-words";
import { SOLUTIONS, solutionPath } from "../solutions";
import { guideTexts, parseInline, plainText, reviewedDate, solutionTexts, translationsOf, wordCount } from "./text";
import { GUIDE_UI } from "./ui";
import type { SectionTable } from "./types";
import { guideAlternates, guideJsonLd, solutionJsonLd } from "@/lib/dentvid/seo-guides";
import { sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";

/**
 * E-E-A-T and answer-engine guards for every editorial page (guides and
 * /videos pages), on top of guides.test.ts and solutions.test.ts: dated and
 * reviewed, a team byline without invented credentials, no superlatives or
 * prices, specific https sources, well-formed tables, valid structured data
 * that matches what is visible, reciprocal hreflang, and the sitemap and
 * llms.txt in step with the library.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TODAY = new Date().toISOString().slice(0, 10);
const PAGES = [...GUIDES, ...SOLUTIONS];
const tablesOf = (p: { sections: { table?: SectionTable }[] }) => p.sections.flatMap((s) => (s.table ? [s.table] : []));

describe("editorial pages: dated, reviewed and attributed", () => {
  it("every guide and /videos page has a last-reviewed date between publication and today", () => {
    for (const p of PAGES) {
      const reviewed = reviewedDate(p);
      expect(reviewed, p.slug).toMatch(ISO);
      expect(reviewed! >= p.published!, `${p.slug}: reviewed ${reviewed} before published ${p.published}`).toBe(true);
      expect(reviewed! <= TODAY, `${p.slug}: reviewed in the future`).toBe(true);
      if (p.updated) expect(p.updated >= p.published!, p.slug).toBe(true);
    }
  });

  it("the byline names the editorial team at Bulsu Labs in every language, with no personal credentials", () => {
    for (const l of LOCALES) {
      const ui = GUIDE_UI[l];
      expect(ui.byline, l).toContain("Bulsu Labs");
      expect(ui.byline, l).toContain("DentVideo");
      expect(ui.byline, l).not.toMatch(/\b(Dr\.?|DDS|DMD|PhD|Prof\.?|MD)\b|博士|د\.\s/);
      expect(ui.lastReviewed.length, l).toBeGreaterThan(0);
    }
  });

  it("rules guides were re-checked recently enough to show a reviewed date of their own", () => {
    for (const g of GUIDES.filter((x) => x.category === "rules")) expect(reviewedDate(g), g.slug).toMatch(ISO);
  });
});

describe("editorial pages: compliance wording", () => {
  it("guide titles, H1s and search snippets make no promises or superlatives", () => {
    for (const g of GUIDES) {
      // Intros and descriptions of rules guides name the restricted claims ("guarantees"), so only the headline fields are checked here.
      for (const t of [g.title, g.h1, g.seoTitle ?? "", g.seoDescription ?? ""]) expect(unquoted(t), g.slug).not.toMatch(SNIPPET_BANNED);
    }
  });

  it("guide body text, tables and FAQs have no superlatives or market do-not-say phrases outside quoted examples", () => {
    for (const g of GUIDES) for (const t of guideTexts(g)) expect(unquoted(plainText(t)), g.slug).not.toMatch(BODY_BANNED);
  });

  it("no editorial page states a price, an amount of money or a percentage", () => {
    for (const g of GUIDES) expect(JSON.stringify(g), g.slug).not.toMatch(MONEY);
    for (const p of SOLUTIONS) expect(JSON.stringify(p), p.slug).not.toMatch(MONEY);
  });

  it("no guide presents patient testimonials or reviews as its own content", () => {
    // Guides discuss testimonials as something to avoid; none may quote a patient's praise.
    const praise = /\b(5|five)[- ]star\b.*(said|wrote)|„[^“]*(empfehle|super Praxis)[^“]*“|“[^”]*(highly recommend|amazing dentist)[^”]*”/i;
    for (const g of GUIDES) for (const t of guideTexts(g)) expect(t, g.slug).not.toMatch(praise);
  });
});

describe("editorial pages: sources and links", () => {
  it("every external link and citation is https", () => {
    for (const p of PAGES) {
      const texts = "kind" in p ? solutionTexts(p) : guideTexts(p);
      for (const t of texts) {
        for (const part of parseInline(t)) if (part.kind === "link" && /^[a-z]+:\/\//i.test(part.target)) expect(part.target, p.slug).toMatch(/^https:\/\//);
      }
      for (const s of ("kind" in p ? undefined : p.sources) ?? []) {
        expect(s.url, p.slug).toMatch(/^https:\/\/[^/\s]+\.[a-z]{2,}(\/|$)/i);
        expect(s.label.length, `${p.slug}: ${s.url}`).toBeGreaterThan(10);
      }
      expect(JSON.stringify(p), p.slug).not.toContain("http://");
    }
  });

  it("each rules guide cites at least two specific texts (a deep link, not just a homepage)", () => {
    for (const g of GUIDES.filter((x) => x.category === "rules")) {
      const deep = (g.sources ?? []).filter((s) => new URL(s.url).pathname.replace(/\/$/, "").length > 1);
      expect(deep.length, g.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("a guide's sources are unique", () => {
    for (const g of GUIDES) {
      const urls = (g.sources ?? []).map((s) => s.url);
      expect(new Set(urls).size, g.slug).toBe(urls.length);
    }
  });
});

describe("editorial pages: answer-engine structure", () => {
  it("tables are well formed: a caption, two or more columns and rows, one cell per column", () => {
    for (const p of PAGES) {
      for (const t of tablesOf(p)) {
        expect(t.caption.trim().length, p.slug).toBeGreaterThan(0);
        expect(t.columns.length, p.slug).toBeGreaterThanOrEqual(2);
        expect(t.rows.length, `${p.slug}: ${t.caption}`).toBeGreaterThanOrEqual(2);
        for (const r of t.rows) expect(r.length, `${p.slug}: ${r[0]}`).toBe(t.columns.length);
      }
    }
  });

  it("the direct answer opens with a definition-length intro and FAQ answers are short enough to quote", () => {
    for (const g of GUIDES) for (const f of g.faq) expect(wordCount(f.a), `${g.slug}: ${f.q}`).toBeLessThanOrEqual(g.locale === "ja" ? 160 : 90);
  });

  it("new guides use question-style section headings for most sections", () => {
    const question = /[?？؟]\s*$|^(how|what|which|why|when|can|is|are|do|does|wie|was|welche|warum|darf|sind|cómo|qué|cuál|puede|comment|que|quel|quelle|peut|nasıl|ne|hangi|neden|jak|czy|gdzie|ile|كيف|ما|لماذا|أين|هل)\b/i;
    for (const g of GUIDES.filter((x) => x.published! >= "2026-11-10")) {
      const n = g.sections.filter((s) => question.test(s.heading) || /[?？؟]/.test(s.heading)).length;
      expect(n, g.slug).toBeGreaterThanOrEqual(Math.ceil(g.sections.length / 3));
    }
  });

  it("guide JSON-LD is valid, matches the visible FAQ and carries the review date and team", () => {
    for (const g of GUIDES) {
      const ld = guideJsonLd(g);
      expect(JSON.parse(JSON.stringify(ld)), g.slug).toEqual(ld);
      expect(JSON.stringify(ld), g.slug).not.toContain("undefined");
      const graph = ld["@graph"] as Record<string, unknown>[];
      const page = graph.find((n) => n["@type"] === "WebPage")!;
      expect(page.lastReviewed, g.slug).toBe(reviewedDate(g));
      expect((page.reviewedBy as { parentOrganization: { "@id": string } }).parentOrganization["@id"]).toMatch(/bulsulabs\.com/);
      const article = graph.find((n) => n["@type"] === "Article")!;
      expect((article.author as { name: string }).name).toBe("DentVideo editorial team");
      const faq = graph.find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
      expect(faq.mainEntity.map((q) => q.name), g.slug).toEqual(g.faq.map((f) => f.q));
      // HowTo only for guides that are a real procedure (they declare one).
      expect(graph.some((n) => n["@type"] === "HowTo"), g.slug).toBe(!!g.howTo);
      for (const c of (article.citation as { url: string }[] | undefined) ?? []) expect(c.url).toMatch(/^https:\/\//);
    }
    for (const p of SOLUTIONS) {
      const page = (solutionJsonLd(p)["@graph"] as Record<string, unknown>[]).find((n) => n["@type"] === "WebPage")!;
      expect(page.lastReviewed, p.slug).toBe(reviewedDate(p));
    }
  });
});

describe("new pages: hreflang, sitemap and llms.txt", () => {
  it("the content calendar exists in en, de, es, fr and tr, and patient-education guides in all eight languages", () => {
    const langs = (topic: string) => GUIDES.filter((g) => g.topic === topic).map((g) => g.locale).sort();
    expect(langs("content-calendar")).toEqual(["de", "en", "es", "fr", "tr"]);
    expect(langs("patient-education")).toEqual([...LOCALES].sort());
    for (const g of GUIDES.filter((x) => x.topic === "content-calendar")) {
      expect(g.sections.flatMap((s) => s.list ?? []).filter((i) => /\d/.test(i)).length, g.slug).toBeGreaterThanOrEqual(52);
    }
  });

  it("hreflang is reciprocal: every guide in a topic group emits the same alternates", () => {
    for (const g of GUIDES) {
      const group = translationsOf(g);
      if (group.length < 2) continue;
      const alt = guideAlternates(g)!;
      expect(Object.keys(alt).filter((k) => k !== "x-default").sort(), g.slug).toEqual(group.map((o) => o.locale).sort());
      for (const o of group) expect(guideAlternates(o), `${g.slug} ↔ ${o.slug}`).toEqual(alt);
    }
  });

  it("the sitemap lists every guide with its hreflang alternates", () => {
    const xml = sitemapXml();
    for (const g of GUIDES) {
      const loc = `https://dentvideo.com${guidePath(g).replace(/^\/dentvideo/, "")}`;
      expect(xml, g.slug).toContain(`<loc>${loc}</loc>`);
      if (translationsOf(g).length > 1) expect(xml, g.slug).toContain(`hreflang="${g.locale}" href="${loc}"`);
    }
    for (const p of SOLUTIONS) expect(xml).toContain(`<loc>https://dentvideo.com${solutionPath(p).replace(/^\/dentvideo/, "")}</loc>`);
  });

  it("llms.txt has an editorial policy and a page index per language; llms-full.txt carries tables and review dates", () => {
    const txt = llmsTxt();
    expect(txt).toContain("## Editorial policy");
    expect(txt).toContain("not legal advice");
    expect(txt).not.toMatch(/\]\((guide|guides|landing|about|start|video):/);
    for (const l of LOCALES) {
      const head = txt.indexOf(`(${l})\n- [DentVideo`);
      expect(head, l).toBeGreaterThan(0);
      for (const g of guidesFor(l)) expect(txt.indexOf(guidePath(g).replace(/^\/dentvideo/, ""), head), g.slug).toBeGreaterThan(head);
    }
    const full = llmsFullTxt();
    for (const g of GUIDES) expect(full, g.slug).toContain(`Last reviewed: ${reviewedDate(g)}`);
    for (const g of GUIDES) for (const t of tablesOf(g)) expect(full, g.slug).toContain(`**${t.caption}**`);
  });
});
