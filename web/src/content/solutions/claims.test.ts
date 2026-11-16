import { describe, expect, it } from "vitest";
import { LOCALES, findGuide } from "../dentvideo";
import { BODY_BANNED, MONEY, unquoted } from "../compliance-words";
import { parseInline, plainText, reviewedDate, tableTexts } from "../guides/text";
import { SOLUTIONS, solutionPath, solutionTranslations, solutionsFor } from "./index";
import { ANSWER_KINDS, type SolutionPage } from "./types";
import { CLAIMS, CLAIM_MAX_AGE_DAYS, CLAIM_SUBJECTS, claimText, claimsIn, namesSubject, withoutClaims } from "./claims";
import { pageClaims } from "./page-claims";
import { solutionAltPaths, solutionJsonLd } from "@/lib/dentvid/seo-guides";
import { sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";

/**
 * Guards for what the comparison and answer pages say about other companies:
 * every statement is a registered claim that names the company's own page and
 * the date it was read, is shown with both, is recent, and is the only place a
 * figure in currency may appear.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TODAY = new Date().toISOString().slice(0, 10);
const DAY = 24 * 60 * 60 * 1000;
const ANSWERS = SOLUTIONS.filter((p) => ANSWER_KINDS.includes(p.kind));

/** The running text that can carry a factual statement (headings, captions and column names cannot). */
function statementTexts(p: SolutionPage): string[] {
  return [
    ...p.sections.flatMap((s) => [...s.paragraphs, ...(s.list ?? []), ...(s.table?.rows.flat() ?? []), ...(s.table?.note ? [s.table.note] : []), ...(s.after ?? [])]),
    ...(p.table ? p.table.rows.flatMap((r) => r.values) : []),
    ...p.faq.map((f) => f.a),
  ];
}

describe("competitor claims: the register", () => {
  it("each claim has a unique id, a known subject, the subject's own https page and an ISO date", () => {
    expect(new Set(CLAIMS.map((c) => c.id)).size).toBe(CLAIMS.length);
    for (const c of CLAIMS) {
      const s = CLAIM_SUBJECTS[c.subject];
      expect(s, c.id).toBeDefined();
      expect(c.url, c.id).toMatch(/^https:\/\//);
      const host = new URL(c.url).hostname;
      expect(s.domains.some((d) => host === d || host.endsWith(`.${d}`)), `${c.id}: ${host} is not ${s.name}'s own site`).toBe(true);
      expect(c.checked, c.id).toMatch(ISO);
    }
  });

  it(`each claim was read on or before today and no more than ${CLAIM_MAX_AGE_DAYS} days ago (re-read the page, then update or remove it)`, () => {
    for (const c of CLAIMS) {
      expect(c.checked <= TODAY, `${c.id}: checked in the future`).toBe(true);
      const age = (Date.parse(TODAY) - Date.parse(c.checked)) / DAY;
      expect(age, `${c.id} was read on ${c.checked}: check ${c.url} again`).toBeLessThanOrEqual(CLAIM_MAX_AGE_DAYS);
    }
  });

  it("claim texts are plain neutral sentences: no link markup, no final full stop, no superlatives, and name their subject", () => {
    for (const c of CLAIMS) {
      for (const [l, t] of Object.entries(c.text)) {
        expect(t, `${c.id} ${l}`).not.toMatch(/\]\(|\.$/);
        expect(unquoted(t), `${c.id} ${l}`).not.toMatch(BODY_BANNED);
        expect(namesSubject(t, CLAIM_SUBJECTS[c.subject]), `${c.id} ${l} does not name ${CLAIM_SUBJECTS[c.subject].name}`).toBe(true);
      }
    }
  });

  it("a rendered claim shows the source's host as its link and the date it was read", () => {
    for (const c of CLAIMS) {
      for (const l of Object.keys(c.text) as (keyof typeof c.text)[]) {
        const r = claimText(c, l);
        const link = parseInline(r).find((x) => x.kind === "link");
        expect(link && link.kind === "link" && link.target, c.id).toBe(c.url);
        const label = link && link.kind === "link" ? link.label : "";
        expect(label, c.id).toContain(new URL(c.url).hostname.replace(/^www\./, ""));
        const [y, m, d] = c.checked.split("-");
        expect(label.includes(c.checked) || label.includes(`${d}.${m}.${y}`) || label.includes(`${d}/${m}/${y}`), `${c.id} ${l}: ${label}`).toBe(true);
      }
    }
  });

  it("every claim is used on at least one page (no orphans to forget about)", () => {
    const used = new Set(SOLUTIONS.flatMap((p) => pageClaims(p).map((c) => c.id)));
    for (const c of CLAIMS) expect(used.has(c.id), c.id).toBe(true);
  });
});

describe("competitor claims: on the pages", () => {
  it("every paragraph, list item, table cell and FAQ answer on an answer page that names another company carries a sourced claim about it", () => {
    for (const p of ANSWERS) {
      for (const t of statementTexts(p)) {
        for (const [key, subject] of Object.entries(CLAIM_SUBJECTS)) {
          if (!namesSubject(plainText(t), subject)) continue;
          const sourced = claimsIn(t, p.locale).some((c) => c.subject === key);
          expect(sourced, `${p.slug}: names ${subject.name} without a sourced claim: ${t.slice(0, 120)}`).toBe(true);
        }
      }
    }
  });

  it("outside its claims, no page carries a figure in currency or a percentage", () => {
    for (const p of SOLUTIONS) expect(withoutClaims(JSON.stringify(p), p.locale), p.slug).not.toMatch(MONEY);
  });

  it("a page's review date is no older than the newest claim it quotes", () => {
    for (const p of SOLUTIONS) for (const c of pageClaims(p)) expect(reviewedDate(p)! >= c.checked, `${p.slug} quotes ${c.id} (${c.checked})`).toBe(true);
  });

  it("answer pages list their sources in JSON-LD (citation) and the options page lists the options it compares", () => {
    for (const p of ANSWERS) {
      const graph = solutionJsonLd(p)["@graph"] as Record<string, unknown>[];
      const page = graph.find((n) => n["@type"] === "WebPage")!;
      expect(page.citation, p.slug).toEqual([...new Set(pageClaims(p).map((c) => c.url))]);
      const list = graph.find((n) => n["@type"] === "ItemList") as { itemListElement: { name: string }[] } | undefined;
      if (p.kind === "options") {
        const rows = p.sections.find((s) => s.table)!.table!.rows;
        expect(list?.itemListElement.map((i) => i.name), p.slug).toEqual(rows.map((r) => plainText(r[0])));
      } else expect(list, p.slug).toBeUndefined();
      // Every FAQ in the structured data is visible on the page.
      const faq = graph.find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
      expect(faq.mainEntity.map((q) => q.name), p.slug).toEqual(p.faq.map((f) => f.q));
    }
  });

  it("each answer page says where another option is the better fit", () => {
    // A section whose heading asks when the alternative is the right choice.
    const fair = /right choice|better choice|better tool|richtige Wahl|bessere Wahl|passendere Werkzeug|lohnt es sich|passen Agentur|passt eine|doğru seçim|daha doğru seçim|daha uygun araç|ne zaman uygundur/i;
    for (const p of ANSWERS) expect(p.sections.some((s) => fair.test(s.heading)), p.slug).toBe(true);
  });
});

describe("answer pages: languages, links and discovery", () => {
  it("each answer kind exists in English, German and Turkish, one page per language", () => {
    for (const k of ANSWER_KINDS) {
      for (const l of ["en", "de", "tr"] as const) expect(SOLUTIONS.filter((p) => p.kind === k && p.locale === l), `${k} ${l}`).toHaveLength(1);
      for (const l of LOCALES) expect(SOLUTIONS.filter((p) => p.kind === k && p.locale === l).length, `${k} ${l}`).toBeLessThanOrEqual(1);
    }
  });

  it("hreflang is reciprocal within each answer kind, with an English x-default", () => {
    for (const p of ANSWERS) {
      const alt = solutionAltPaths(p)!;
      expect(alt["x-default"], p.slug).toBe(solutionPath(SOLUTIONS.find((o) => o.kind === p.kind && o.locale === "en")!));
      for (const o of solutionTranslations(p)) expect(solutionAltPaths(o), `${p.slug} ↔ ${o.slug}`).toEqual(alt);
    }
  });

  it("answer pages link guides of their own language and the sign-up, and are linked from the hubs and the sitemap", () => {
    const xml = sitemapXml();
    for (const p of ANSWERS) {
      for (const s of p.guides) expect(findGuide(s)?.locale, `${p.slug} → ${s}`).toBe(p.locale);
      expect(solutionsFor(p.locale).map((o) => o.slug), p.slug).toContain(p.slug);
      expect(xml, p.slug).toContain(`https://dentvideo.com${solutionPath(p).replace("/dentvideo", "")}`);
    }
  });

  it("llms.txt lists every answer page and llms-full.txt carries their sourced claims with dates", () => {
    const txt = llmsTxt();
    const full = llmsFullTxt();
    for (const p of ANSWERS) {
      expect(txt, p.slug).toContain(solutionPath(p).replace("/dentvideo", ""));
      for (const c of pageClaims(p)) {
        expect(full, `${p.slug}: ${c.id}`).toContain(c.url);
        expect(full, `${p.slug}: ${c.id}`).toContain(plainText(claimText(c, p.locale)).replace(/ \([^()]*\)$/, ""));
      }
    }
  });

  it("tables on answer pages are well formed", () => {
    for (const p of ANSWERS)
      for (const s of p.sections)
        if (s.table) {
          for (const r of s.table.rows) expect(r.length, `${p.slug}: ${r[0]}`).toBe(s.table.columns.length);
          expect(tableTexts(s.table).every((t) => t.trim().length > 0), p.slug).toBe(true);
        }
  });
});
