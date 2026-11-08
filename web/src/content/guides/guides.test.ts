import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES, LOCALES, guidePath, guidesFor } from "../dentvideo";
import { ENTITY } from "./entity";
import { guideTexts, guideWordCount, parseInline, plainText, resolveTarget, translationsOf } from "./text";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "./ui";
import { GUIDE_LIBRARY } from "./index";
import { aboutJsonLd, dentvideoSitemapEntries, guideAlternates, guideJsonLd, guidesIndexJsonLd } from "@/lib/dentvid/seo-guides";
import { sitemapUrls, sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";
import { INDEXNOW_KEY } from "@/lib/dentvid/indexnow";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("guide library", () => {
  it("every slug is unique and URL-safe", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("every guide has a valid locale", () => {
    for (const g of GUIDES) expect(LOCALES, g.slug).toContain(g.locale);
  });

  it("every guide has at least 900 words", () => {
    for (const g of GUIDES) expect(guideWordCount(g), g.slug).toBeGreaterThanOrEqual(900);
  });

  it("every guide has an FAQ, sections, a category, dates and a direct first paragraph", () => {
    for (const g of GUIDES) {
      expect(g.faq.length, g.slug).toBeGreaterThanOrEqual(3);
      expect(g.sections.length, g.slug).toBeGreaterThanOrEqual(4);
      expect(g.category, g.slug).toBeTruthy();
      expect(g.published, g.slug).toMatch(ISO);
      expect(g.updated ?? g.published, g.slug).toMatch(ISO);
      // The quotable answer: a first paragraph of one to a few sentences, not an essay.
      const words = plainText(g.intro).split(/\s+/).length;
      expect(words, g.slug).toBeGreaterThanOrEqual(25);
      expect(words, g.slug).toBeLessThanOrEqual(110);
      expect(g.title.length, g.slug).toBeLessThanOrEqual(110);
      expect(g.description.length, g.slug).toBeLessThanOrEqual(200);
    }
  });

  it("rules guides cite official sources over https", () => {
    for (const g of GUIDES.filter((x) => x.category === "rules")) {
      expect(g.sources?.length ?? 0, g.slug).toBeGreaterThanOrEqual(2);
    }
    for (const g of GUIDES) for (const s of g.sources ?? []) expect(s.url, g.slug).toMatch(/^https:\/\//);
  });

  it("each priority market has at least five guides", () => {
    for (const l of LOCALES) expect(guidesFor(l).length, l).toBeGreaterThanOrEqual(5);
  });

  it("every library guide made it into GUIDES", () => {
    for (const g of GUIDE_LIBRARY) expect(GUIDES).toContain(g);
  });

  it("inline links resolve, point at a guide in the same language, and do not link to the page itself", () => {
    for (const g of GUIDES) {
      for (const t of guideTexts(g)) {
        for (const part of parseInline(t)) {
          if (part.kind !== "link") continue;
          const to = resolveTarget(part.target, g.locale);
          expect(to, `${g.slug}: ${part.target}`).toBeTruthy();
          if (part.target.startsWith("guide:")) {
            const other = GUIDES.find((o) => o.slug === part.target.slice(6))!;
            expect(other.locale, `${g.slug} → ${other.slug}`).toBe(g.locale);
            expect(other.slug, g.slug).not.toBe(g.slug);
          }
        }
      }
    }
  });

  it("each guide links to at least two other guides and to the landing or sign-up", () => {
    for (const g of GUIDES) {
      const targets = guideTexts(g).flatMap((t) => parseInline(t).filter((p) => p.kind === "link").map((p) => (p as { target: string }).target));
      expect(targets.filter((t) => t.startsWith("guide:")).length, g.slug).toBeGreaterThanOrEqual(2);
      expect(targets.some((t) => t.startsWith("landing:") || t.startsWith("start:")), g.slug).toBe(true);
    }
  });

  it("states no prices or invented percentages", () => {
    const text = JSON.stringify(GUIDES) + JSON.stringify(ENTITY) + JSON.stringify(GUIDE_UI);
    expect(text).not.toMatch(/[$€£₺]\s?\d|\d\s?(%|€|\$|£|TL\b)/);
  });
});

describe("hreflang between guides", () => {
  it("only links guides that share a topic, one per language, and always back to themselves", () => {
    for (const g of GUIDES) {
      const group = translationsOf(g);
      const langs = group.map((o) => o.locale);
      expect(new Set(langs).size, g.topic ?? g.slug).toBe(langs.length);
      const alt = guideAlternates(g);
      if (group.length < 2) expect(alt).toBeUndefined();
      else {
        expect(alt![g.locale]).toMatch(new RegExp(`${guidePath(g)}$`));
        for (const o of group) expect(alt![o.locale]).toMatch(new RegExp(`${guidePath(o)}$`));
      }
    }
  });
});

describe("structured data", () => {
  it("each guide has Article, FAQPage and a three-step breadcrumb", () => {
    for (const g of GUIDES) {
      const graph = guideJsonLd(g)["@graph"] as { "@type": string; itemListElement?: unknown[]; mainEntity?: unknown[] }[];
      const types = graph.map((n) => n["@type"]);
      expect(types, g.slug).toEqual(expect.arrayContaining(["Article", "FAQPage", "BreadcrumbList"]));
      expect(graph.find((n) => n["@type"] === "BreadcrumbList")!.itemListElement).toHaveLength(3);
      expect(graph.find((n) => n["@type"] === "FAQPage")!.mainEntity).toHaveLength(g.faq.length);
      if (g.howTo) expect(types).toContain("HowTo");
    }
  });

  it("guides indexes list every guide of their language; About has Organization and SoftwareApplication", () => {
    for (const l of LOCALES) {
      const page = guidesIndexJsonLd(l)["@graph"][0] as { mainEntity: { itemListElement: unknown[] } };
      expect(page.mainEntity.itemListElement).toHaveLength(guidesFor(l).length);
      const types = (aboutJsonLd(l)["@graph"] as { "@type": string; publisher?: unknown }[]).map((n) => n["@type"]);
      expect(types).toEqual(expect.arrayContaining(["AboutPage", "Organization", "SoftwareApplication", "FAQPage"]));
    }
  });

  it("entity facts have the same shape in every language and name Bulsu Labs", () => {
    for (const l of LOCALES) {
      expect(ENTITY[l].facts.length, l).toBe(ENTITY.en.facts.length);
      expect(ENTITY[l].definition, l).toContain("Bulsu Labs");
      expect(ENTITY[l].definition, l).toContain("DentVideo");
    }
  });
});

describe("sitemap", () => {
  const entries = dentvideoSitemapEntries();
  const paths = entries.map((e) => e.path);

  it("lists every guide, guides index, About page and landing exactly once, with a lastmod", () => {
    expect(new Set(paths).size).toBe(paths.length);
    for (const g of GUIDES) expect(paths).toContain(guidePath(g));
    for (const l of LOCALES) {
      expect(paths).toContain(GUIDES_INDEX_PATH[l]);
      expect(paths).toContain(ABOUT_PATH[l]);
    }
    for (const e of entries) expect(e.lastmod, e.path).toMatch(ISO);
  });

  it("renders dentvideo.com URLs with hreflang alternates", () => {
    const xml = sitemapXml();
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    for (const u of sitemapUrls()) {
      expect(u).toMatch(/^https:\/\/dentvideo\.com\//);
      expect(xml).toContain(`<loc>${u}</loc>`);
    }
    expect(xml).toContain('hreflang="x-default"');
  });
});

describe("answer-engine files", () => {
  it("llms.txt names every guide and states the entity facts", () => {
    const txt = llmsTxt();
    expect(txt.startsWith("# DentVideo\n\n> ")).toBe(true);
    expect(txt).toContain("Bulsu Labs");
    expect(txt).toContain("llms-full.txt");
    for (const g of GUIDES) expect(txt).toContain(`(https://dentvideo.com${guidePath(g).replace(/^\/dentvideo/, "")})`);
  });

  it("llms-full.txt carries the full text of every guide, without link markup targets", () => {
    const txt = llmsFullTxt();
    for (const g of GUIDES) {
      expect(txt).toContain(`## ${g.h1}`);
      expect(txt).toContain(g.sections[g.sections.length - 1].heading);
    }
    expect(txt).not.toMatch(/\]\((guide|guides|landing|about|start):/);
  });
});

describe("header/footer language on the new pages", () => {
  it("knows the language of guides hubs and About pages from the path", async () => {
    const { pathLocale } = await import("@/components/dentvid/chrome");
    const g = Object.fromEntries(GUIDES.map((x) => [x.slug, x.locale]));
    expect(pathLocale("/dentvideo/guides", g)).toBe("en");
    expect(pathLocale("/dentvideo/about", g)).toBe("en");
    // dentvideo.com serves the same pages without the /dentvideo prefix.
    expect(pathLocale("/", g)).toBe("en");
    expect(pathLocale("/de", g)).toBe("de");
    expect(pathLocale("/fr/guides", g)).toBe("fr");
    expect(pathLocale("/es/about", g)).toBe("es");
    expect(pathLocale("/app", g)).toBeNull();
    expect(pathLocale("/start", g)).toBeNull();
    expect(pathLocale("/dentvideo/tr/guides", g)).toBe("tr");
    expect(pathLocale("/dentvideo/de/about", g)).toBe("de");
    expect(pathLocale("/dentvideo/guides/dis-hekimi-reklam-yasagi", g)).toBe("tr");
    expect(pathLocale("/dentvideo/fr", g)).toBe("fr");
    expect(pathLocale("/dentvideo/app", g)).toBeNull();
    expect(pathLocale("/dentvideo/de/whatever", g)).toBeNull();
  });
});

describe("IndexNow", () => {
  const web = join(__dirname, "../../..");
  it("serves the key file and the submit script uses the same key", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    expect(existsSync(join(web, `src/app/dentvideo/${INDEXNOW_KEY}.txt/route.ts`))).toBe(true);
    const script = readFileSync(join(web, "../scripts/indexnow.mjs"), "utf8");
    expect(script).toContain(`const KEY = "${INDEXNOW_KEY}"`);
  });
});
