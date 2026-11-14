import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES, GUIDE_HUB_LOCALES, LOCALES, guidePath, guidesFor } from "../dentvideo";
import { ENTITY } from "./entity";
import { guideTexts, guideWordCount, parseInline, resolveTarget, translationsOf, wordCount } from "./text";
import { ABOUT_PATH, GUIDES_INDEX_PATH, GUIDE_UI } from "./ui";
import { GUIDE_LIBRARY } from "./index";
import {
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  aboutJsonLd,
  dentvideoSitemapEntries,
  guideAlternates,
  guideJsonLd,
  guideMetadata,
  guideSeoDescription,
  guideSeoTitle,
  guidesIndexJsonLd,
} from "@/lib/dentvid/seo-guides";
import { sitemapUrls, sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";
import { INDEXNOW_KEY } from "@/lib/dentvid/indexnow";
import { DV_PRICES_USD, DV_SELF_SERVE_TIERS, DV_TIERS } from "@/lib/dentvid/billing";

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
      const words = wordCount(g.intro);
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

  it("every language has a guides hub; the first five markets have at least five guides each", () => {
    expect(GUIDE_HUB_LOCALES).toEqual([...LOCALES]);
    for (const l of ["en", "de", "es", "tr", "fr"] as const) expect(guidesFor(l).length, l).toBeGreaterThanOrEqual(5);
  });

  it("Japanese, Arabic and Polish each have a rules guide and a what-to-post guide, and their hubs are advertised", () => {
    const hubs = dentvideoSitemapEntries().find((e) => e.path === GUIDES_INDEX_PATH.en)!;
    for (const l of ["ja", "ar", "pl"] as const) {
      const cats = guidesFor(l).map((g) => g.category);
      expect(cats, l).toEqual(expect.arrayContaining(["rules", "ideas"]));
      expect(dentvideoSitemapEntries().map((e) => e.path), l).toContain(GUIDES_INDEX_PATH[l]);
      expect(Object.values(hubs.alternates ?? {}), l).toContain(GUIDES_INDEX_PATH[l]);
      expect(llmsTxt(), l).toContain(GUIDES_INDEX_PATH[l].replace("/dentvideo", ""));
      // Each guide links back to its hub as well as to the landing.
      for (const g of guidesFor(l)) expect(guideTexts(g).some((t) => t.includes("](guides:)")), g.slug).toBe(true);
    }
  });

  it("counts Japanese words without spaces", () => {
    expect(wordCount("歯科医院がSNSに投稿する")).toBeGreaterThan(4);
    expect(wordCount("two words")).toBe(2);
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

  // Prices appear only in the About "Price" fact (which llms.txt copies), and
  // only the configured USD list and founding prices; never in guides or CTAs.
  const PRICE_LABELS = ["Price", "Preis", "Precio", "Ücret", "Prix", "料金", "السعر", "Cena"];
  const MONEY = /[$€£₺]\s?\d|\d\s?(%|€|\$|£|TL\b)/;

  it("states no prices or invented percentages outside the About price fact", () => {
    const entityWithoutPrice = LOCALES.map((l) => ({ ...ENTITY[l], facts: ENTITY[l].facts.filter((f) => !PRICE_LABELS.includes(f.label)) }));
    const text = JSON.stringify(GUIDES) + JSON.stringify(entityWithoutPrice) + JSON.stringify(GUIDE_UI);
    expect(text).not.toMatch(MONEY);
  });

  it("the About price fact states the configured monthly plans and live preview in every language — no yearly price, no founding offer", () => {
    const allowed = new Set<number>();
    for (const tier of DV_TIERS) for (const v of Object.values(DV_PRICES_USD[tier])) if (v) allowed.add(v);
    for (const l of LOCALES) {
      const price = ENTITY[l].facts.find((f) => PRICE_LABELS.includes(f.label));
      expect(price, l).toBeDefined();
      const v = price!.value;
      expect(v, l).not.toMatch(/[€£₺%]|TL\b/);
      const figures = [...v.matchAll(/\$\s?(\d[\d,.]*)|(\d[\d,.]*)\s?\$/g)].map((m) => Number((m[1] ?? m[2]).replace(/[,.]/g, "")));
      for (const f of figures) expect(allowed.has(f), `${l}: ${f}`).toBe(true);
      for (const tier of DV_SELF_SERVE_TIERS) expect(v, `${l} ${tier}`).toContain(String(DV_PRICES_USD[tier].month));
      // Group is Contact us: the fact sends groups to the address, with no price.
      expect(v, l).toContain("hello@dentvideo.com");
      expect(v, l).not.toMatch(/990|\b100\b|KURUCU/);
      expect(figures.sort((a, b) => a - b), l).toEqual([29, 29, 49]);
    }
    expect(llmsTxt()).toContain("Paid plans from $29/month: Starter $29/month, Practice $49/month.");
  });
});

describe("search snippets", () => {
  it("every guide's rendered title fits in 60 characters and its meta description in 155", () => {
    for (const g of GUIDES) {
      const m = guideMetadata(g);
      const title = (m.title as { absolute: string }).absolute;
      expect(title, g.slug).toBe(guideSeoTitle(g));
      expect(title.length, `${g.slug}: ${title}`).toBeLessThanOrEqual(SEO_TITLE_MAX);
      expect(String(m.description).length, g.slug).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
      expect(m.openGraph?.title, g.slug).toBe(g.seoTitle);
      expect(m.twitter?.title, g.slug).toBe(g.seoTitle);
      expect(m.openGraph?.description, g.slug).toBe(m.description);
      expect(m.twitter?.description, g.slug).toBe(m.description);
    }
  });

  it("guide titles are unique within each language", () => {
    for (const l of LOCALES) {
      const titles = guidesFor(l).map(guideSeoTitle);
      expect(new Set(titles).size, l).toBe(titles.length);
    }
  });

  it("keeps the brand suffix whenever it fits", () => {
    for (const g of GUIDES) {
      if (`${g.seoTitle} · DentVideo`.length <= SEO_TITLE_MAX) expect(guideSeoTitle(g), g.slug).toMatch(/ · DentVideo$/);
    }
  });

  it("falls back to the full title and description without SEO fields", () => {
    const g = { ...GUIDES[0], seoTitle: undefined, seoDescription: undefined };
    expect(guideSeoTitle(g)).toBe(`${g.title} · DentVideo`);
    expect(guideSeoDescription(g)).toBe(g.description);
  });

  it("snippets make no promises, superlatives or 'painless' claims", () => {
    const banned =
      /\b(guarantee|painless|best|cheapest|no\.? ?1)\b|garantiert|schmerzfrei|beste[nrs]?\b|garantizad|sin dolor|mejor(es)?\b|garanti|sans douleur|meilleur|garantili|ağrısız|acısız|en iyi|最高|日本一|一番|絶対|必ず|無痛|痛くない|保証|الأفضل|مضمون|بدون ألم|الأرخص|najlepsz|gwarant|bezbolesn|nr 1/i;
    for (const g of GUIDES) expect(`${g.seoTitle} ${g.seoDescription}`, g.slug).not.toMatch(banned);
  });

  it("About meta descriptions fit in 155 characters", () => {
    for (const l of LOCALES) expect(ENTITY[l].meta.description.length, l).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
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
      // Google's SoftwareApplication rich result needs a priced offer: the self-serve plans only (Group is Contact us).
      const app = (aboutJsonLd(l)["@graph"] as { "@type": string; offers?: Record<string, unknown>[] }[]).find((n) => n["@type"] === "SoftwareApplication");
      expect(app?.offers, l).toMatchObject([
        { "@type": "Offer", name: "Starter", price: 29, priceCurrency: "USD" },
        { "@type": "Offer", name: "Practice", price: 49, priceCurrency: "USD" },
      ]);
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
    for (const l of LOCALES) expect(paths).toContain(ABOUT_PATH[l]);
    for (const l of GUIDE_HUB_LOCALES) expect(paths).toContain(GUIDES_INDEX_PATH[l]);
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
    expect(txt).not.toMatch(/\]\((guide|guides|landing|about|start|checker):/);
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
    expect(pathLocale("/ja/guides", g)).toBe("ja");
    expect(pathLocale("/dentvideo/ar/guides", g)).toBe("ar");
    expect(pathLocale("/pl/guides", g)).toBe("pl");
    expect(pathLocale("/guides/madha-tanshur-iyadat-al-asnan", g)).toBe("ar");
    expect(pathLocale("/dentvideo/app", g)).toBeNull();
    // A mistyped address under /de shows the German 404: header and footer in German too.
    expect(pathLocale("/dentvideo/de/whatever", g)).toBe("de");
    expect(pathLocale("/dentvideo/whatever", g)).toBeNull();
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
