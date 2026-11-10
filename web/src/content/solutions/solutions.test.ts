import { describe, expect, it } from "vitest";
import { GUIDES, LANDING, LOCALES, findGuide, guidesFor, type Locale } from "../dentvideo";
import { ENTITY, SAME_AS } from "../guides/entity";
import { parseInline, plainText, resolveTarget, solutionTexts, wordCount } from "../guides/text";
import { SOLUTIONS, commercialPageForGuide, findSolution, solutionOf, solutionPath, solutionTranslations, solutionsFor } from "./index";
import { SOLUTION_UI } from "./ui";
import {
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  aboutJsonLd,
  aboutMetadata,
  dentvideoSitemapEntries,
  solutionAltPaths,
  solutionJsonLd,
  solutionMetadata,
  solutionSeoTitle,
} from "@/lib/dentvid/seo-guides";
import { landingJsonLd } from "@/lib/dentvid/seo";
import { sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";
import { BODY_BANNED, MONEY, SNIPPET_BANNED, unquoted } from "../compliance-words";

const ISO = /^\d{4}-\d{2}-\d{2}$/;


describe("commercial pages: inventory", () => {
  it("slugs are unique, URL-safe and do not collide with guides", () => {
    const slugs = SOLUTIONS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(findGuide(s), s).toBeUndefined();
    }
  });

  it("every language has one product page; the four largest markets also have a comparison", () => {
    for (const l of LOCALES) {
      expect(SOLUTIONS.filter((p) => p.locale === l && p.kind === "product"), l).toHaveLength(1);
      expect(SOLUTIONS.filter((p) => p.locale === l && p.kind === "compare").length, l).toBeLessThanOrEqual(1);
    }
    for (const l of ["en", "de", "es", "tr"] as const) expect(solutionOf(l, "compare"), l).toBeDefined();
  });

  it("each page answers real searches, is dated and has substance (no thin pages)", () => {
    for (const p of SOLUTIONS) {
      expect(p.queries.length, p.slug).toBeGreaterThanOrEqual(3);
      expect(p.published, p.slug).toMatch(ISO);
      expect(p.updated ?? p.published, p.slug).toMatch(ISO);
      expect(p.faq.length, p.slug).toBeGreaterThanOrEqual(4);
      expect(p.sections.length, p.slug).toBeGreaterThanOrEqual(5);
      const words = solutionTexts(p).reduce((n, t) => n + wordCount(t), 0);
      expect(words, p.slug).toBeGreaterThanOrEqual(p.locale === "ja" ? 700 : 550);
      const intro = wordCount(p.intro);
      expect(intro, p.slug).toBeGreaterThanOrEqual(25);
      expect(intro, p.slug).toBeLessThanOrEqual(110);
      if (p.kind === "compare") {
        expect(p.table, p.slug).toBeDefined();
        for (const r of p.table!.rows) expect(r.values.length, `${p.slug}: ${r.label}`).toBe(p.table!.columns.length);
        expect(p.table!.columns[0]).toBe("DentVideo");
      }
    }
  });

  it("each page is unique within its language (no near-duplicate doorway pages)", () => {
    for (const l of LOCALES) {
      const pages = solutionsFor(l);
      expect(new Set(pages.map((p) => p.h1)).size, l).toBe(pages.length);
      expect(new Set(pages.map((p) => p.seoTitle)).size, l).toBe(pages.length);
      // Their titles differ from the landing's and from every guide's in that language.
      for (const p of pages) {
        expect(p.seoTitle, p.slug).not.toBe(LANDING[l].meta.title);
        for (const g of guidesFor(l)) expect(p.h1, `${p.slug} vs ${g.slug}`).not.toBe(g.h1);
      }
    }
  });
});

describe("commercial pages: snippets and compliance", () => {
  it("titles fit in 60 characters with the brand; descriptions in 155", () => {
    for (const p of SOLUTIONS) {
      const m = solutionMetadata(p);
      const title = (m.title as { absolute: string }).absolute;
      expect(title, p.slug).toBe(solutionSeoTitle(p));
      expect(title.length, `${p.slug}: ${title}`).toBeLessThanOrEqual(SEO_TITLE_MAX);
      expect(title, p.slug).toContain("DentVideo");
      expect(p.seoDescription.length, p.slug).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
      expect(m.description).toBe(p.seoDescription);
      expect(m.openGraph?.title, p.slug).toBe(title);
    }
  });

  it("About pages answer the brand query in their title (≤ 60) and description (≤ 155)", () => {
    for (const l of LOCALES) {
      const title = (aboutMetadata(l).title as { absolute: string }).absolute;
      expect(title, l).toContain("DentVideo");
      expect(title.length, `${l}: ${title}`).toBeLessThanOrEqual(SEO_TITLE_MAX);
      expect(ENTITY[l].h1, l).toContain("DentVideo");
    }
  });

  it("snippets, headings and links make no promises, superlatives or 'painless' claims", () => {
    for (const p of SOLUTIONS) {
      for (const t of [p.seoTitle, p.seoDescription, p.h1, p.intro, p.nav, p.anchor, p.blurb]) expect(unquoted(t), p.slug).not.toMatch(SNIPPET_BANNED);
    }
  });

  it("body text has no superlatives or market do-not-say phrases outside quoted examples", () => {
    for (const p of SOLUTIONS) for (const t of solutionTexts(p)) expect(unquoted(plainText(t)), p.slug).not.toMatch(BODY_BANNED);
    for (const l of LOCALES) expect(JSON.stringify(SOLUTION_UI[l]), l).not.toMatch(BODY_BANNED);
  });

  it("states no prices, figures in currency or percentages", () => {
    expect(JSON.stringify(SOLUTIONS)).not.toMatch(MONEY);
    expect(JSON.stringify(SOLUTION_UI)).not.toMatch(MONEY);
  });

  it("the brand FAQ on About answers price, sign-in, app and reviews in every language, with no figures", () => {
    for (const l of LOCALES) {
      expect(ENTITY[l].faq.length, l).toBe(ENTITY.en.faq.length);
      expect(ENTITY[l].faq.length, l).toBeGreaterThanOrEqual(8);
      expect(JSON.stringify(ENTITY[l].faq), l).not.toMatch(MONEY);
      expect(JSON.stringify(ENTITY[l].faq), l).toContain("dentvideo.com/start");
    }
  });
});

describe("commercial pages: links", () => {
  it("inline links resolve and stay in the page's language", () => {
    for (const p of SOLUTIONS) {
      for (const t of solutionTexts(p)) {
        for (const part of parseInline(t)) {
          if (part.kind !== "link") continue;
          expect(resolveTarget(part.target, p.locale), `${p.slug}: ${part.target}`).toBeTruthy();
          if (part.target.startsWith("guide:")) expect(findGuide(part.target.slice(6))!.locale, `${p.slug} → ${part.target}`).toBe(p.locale);
          if (part.target.startsWith("video:")) {
            const o = findSolution(part.target.slice(6))!;
            expect(o.locale, `${p.slug} → ${part.target}`).toBe(p.locale);
            expect(o.slug).not.toBe(p.slug);
          }
        }
      }
    }
  });

  it("each page links to at least two guides of its language in its text and to the sign-up", () => {
    for (const p of SOLUTIONS) {
      const targets = solutionTexts(p).flatMap((t) => parseInline(t).flatMap((x) => (x.kind === "link" ? [x.target] : [])));
      const guides = new Set(targets.filter((t) => t.startsWith("guide:")));
      expect(guides.size, p.slug).toBeGreaterThanOrEqual(p.locale === "ja" || p.locale === "ar" || p.locale === "pl" ? 1 : 2);
      expect(targets.some((t) => t === "start:"), p.slug).toBe(true);
      expect(p.guides.length, p.slug).toBeGreaterThanOrEqual(2);
      for (const s of p.guides) expect(findGuide(s)?.locale, `${p.slug} → ${s}`).toBe(p.locale);
    }
  });

  it("every guide points to a commercial page of its own language; tools guides to the comparison where it exists", () => {
    for (const g of GUIDES) {
      const c = commercialPageForGuide(g);
      expect(c, g.slug).toBeDefined();
      expect(c!.locale, g.slug).toBe(g.locale);
      if (g.category === "tools" && solutionOf(g.locale, "compare")) expect(c!.kind, g.slug).toBe("compare");
    }
  });

  it("the agency-or-software guides link to the comparison in their text", () => {
    for (const g of GUIDES.filter((x) => x.category === "tools")) {
      const cmp = solutionOf(g.locale, "compare");
      if (!cmp) continue;
      expect(JSON.stringify(g), g.slug).toContain(`(video:${cmp.slug})`);
    }
  });
});

describe("commercial pages: hreflang, sitemap, structured data, answer engines", () => {
  it("hreflang is reciprocal within each kind and always includes the page itself", () => {
    for (const p of SOLUTIONS) {
      const alt = solutionAltPaths(p)!;
      expect(alt, p.slug).toBeDefined();
      expect(alt[p.locale], p.slug).toBe(solutionPath(p));
      for (const o of solutionTranslations(p)) {
        expect(alt[o.locale], `${p.slug} → ${o.slug}`).toBe(solutionPath(o));
        expect(solutionAltPaths(o), `${o.slug} ↔ ${p.slug}`).toEqual(alt);
      }
      expect(alt["x-default"]).toBe(solutionPath(solutionOf("en", p.kind)!));
      // Never a page of the other kind.
      for (const o of SOLUTIONS.filter((x) => x.kind !== p.kind)) expect(Object.values(alt)).not.toContain(solutionPath(o));
    }
  });

  it("every page is in the sitemap once, with lastmod and its alternates", () => {
    const entries = dentvideoSitemapEntries();
    const xml = sitemapXml();
    for (const p of SOLUTIONS) {
      const mine = entries.filter((e) => e.path === solutionPath(p));
      expect(mine, p.slug).toHaveLength(1);
      expect(mine[0].lastmod).toMatch(ISO);
      expect(mine[0].alternates).toEqual(solutionAltPaths(p));
      expect(xml).toContain(`<loc>https://dentvideo.com/videos/${p.slug}</loc>`);
    }
  });

  it("JSON-LD is valid JSON with WebPage, SoftwareApplication, FAQPage and a breadcrumb; product pages carry their sample videos", () => {
    for (const p of SOLUTIONS) {
      const ld = solutionJsonLd(p);
      const round = JSON.parse(JSON.stringify(ld));
      expect(round).toEqual(ld);
      const graph = ld["@graph"] as { "@type": string; mainEntity?: unknown[]; itemListElement?: unknown[] }[];
      const types = graph.map((n) => n["@type"]);
      expect(types, p.slug).toEqual(expect.arrayContaining(["WebPage", "Organization", "SoftwareApplication", "FAQPage", "BreadcrumbList"]));
      expect(graph.find((n) => n["@type"] === "FAQPage")!.mainEntity).toHaveLength(p.faq.length);
      expect(graph.find((n) => n["@type"] === "BreadcrumbList")!.itemListElement).toHaveLength(2);
      if (p.kind === "product") expect(types.filter((t) => t === "VideoObject").length, p.slug).toBe(3);
      expect(JSON.stringify(ld)).not.toContain("undefined");
    }
  });

  it("the brand entity is the same node everywhere: landing, About and commercial pages", () => {
    const ids = (graph: { "@type": string; "@id"?: string }[], type: string) => graph.filter((n) => n["@type"] === type).map((n) => n["@id"]);
    const software = ids(aboutJsonLd("en")["@graph"] as never, "SoftwareApplication")[0];
    expect(software).toMatch(/#software$/);
    for (const l of LOCALES) {
      const landing = landingJsonLd(l)["@graph"] as { "@type": string; "@id"?: string; name?: string; alternateName?: string[] }[];
      expect(ids(landing, "SoftwareApplication"), l).toEqual([software]);
      const site = landing.find((n) => n["@type"] === "WebSite")!;
      expect(site.name).toBe("DentVideo");
      expect(site.alternateName).toContain("Dent Video");
      expect(ids(landing, "Organization"), l).toHaveLength(1);
    }
    for (const p of SOLUTIONS) expect(ids(solutionJsonLd(p)["@graph"] as never, "SoftwareApplication"), p.slug).toEqual([software]);
  });

  it("sameAs lists only real https profile URLs (none until they exist)", () => {
    for (const u of SAME_AS) {
      expect(u).toMatch(/^https:\/\/[^/]+\.[a-z]{2,}\//);
      expect(u).not.toMatch(/example|placeholder|todo|xxx/i);
    }
    const software = (aboutJsonLd("en")["@graph"] as Record<string, unknown>[]).find((n) => n["@type"] === "SoftwareApplication")!;
    if (SAME_AS.length === 0) expect(software.sameAs).toBeUndefined();
  });

  it("llms.txt lists every commercial page; llms-full.txt carries their text", () => {
    const txt = llmsTxt();
    const full = llmsFullTxt();
    for (const p of SOLUTIONS) {
      expect(txt).toContain(`(https://dentvideo.com/videos/${p.slug})`);
      expect(full).toContain(`## ${p.h1}`);
    }
    expect(full).not.toMatch(/\]\((guide|guides|landing|about|start|video):/);
  });

  it("the header and footer know a commercial page's language from its path", async () => {
    const { pathLocale } = await import("@/components/dentvid/chrome");
    const map: Record<string, Locale> = Object.fromEntries([...GUIDES, ...SOLUTIONS].map((x) => [x.slug, x.locale]));
    for (const p of SOLUTIONS) {
      expect(pathLocale(`/videos/${p.slug}`, map), p.slug).toBe(p.locale);
      expect(pathLocale(`/dentvideo/videos/${p.slug}`, map), p.slug).toBe(p.locale);
    }
    expect(pathLocale("/videos/unknown", map)).toBeNull();
  });
});
