import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Metadata } from "next";
import { GUIDES, GUIDE_HUB_LOCALES, LANDING_PATH, LOCALES, guidePath } from "@/content/dentvideo";
import { LEGAL_KINDS, legalPath } from "@/content/legal";
import { SOLUTIONS, solutionPath } from "@/content/solutions";
import { ABOUT_PATH, GUIDES_INDEX_PATH } from "@/content/guides/ui";
import { dvUrl } from "./host";
import { landingJsonLd, landingMetadata } from "./seo";
import {
  SAMPLE_UPLOAD_DATE,
  aboutJsonLd,
  aboutMetadata,
  dentvideoSitemapEntries,
  guideJsonLd,
  guideMetadata,
  guidesIndexJsonLd,
  guidesIndexMetadata,
  jsonLdHtml,
  legalJsonLd,
  legalMetadata,
  solutionJsonLd,
  solutionMetadata,
} from "./seo-guides";
import { arabicWords, joinArabic, visualArabicWord } from "./og-arabic";
import { emWidth, fitFontSize, wrapLines } from "./og-text";
import { localeOfPath } from "@/components/dentvid/not-found-body";

/** Every public page: its in-app path, metadata and JSON-LD, as the page itself builds them. */
const PAGES: { path: string; meta: Metadata; ld: unknown }[] = [
  ...LOCALES.map((l) => ({ path: LANDING_PATH[l], meta: landingMetadata(l), ld: landingJsonLd(l) })),
  ...GUIDE_HUB_LOCALES.map((l) => ({ path: GUIDES_INDEX_PATH[l], meta: guidesIndexMetadata(l), ld: guidesIndexJsonLd(l) })),
  ...LOCALES.map((l) => ({ path: ABOUT_PATH[l], meta: aboutMetadata(l), ld: aboutJsonLd(l) })),
  ...GUIDES.map((g) => ({ path: guidePath(g), meta: guideMetadata(g), ld: guideJsonLd(g) })),
  ...SOLUTIONS.map((p) => ({ path: solutionPath(p), meta: solutionMetadata(p), ld: solutionJsonLd(p) })),
  ...LEGAL_KINDS.flatMap((k) => LOCALES.map((l) => ({ path: legalPath(k, l), meta: legalMetadata(k, l), ld: legalJsonLd(k, l) }))),
];

const languagesOf = (m: Metadata) => (m.alternates?.languages ?? {}) as Record<string, string>;

describe("canonical and hreflang on every public page", () => {
  it("covers every sitemap URL, and nothing else", () => {
    expect(PAGES.map((p) => p.path).sort()).toEqual(dentvideoSitemapEntries().map((e) => e.path).sort());
  });

  it("has a self-referencing, parameter-free canonical (utm_… links resolve to the clean URL)", () => {
    for (const p of PAGES) {
      expect(p.meta.alternates?.canonical, p.path).toBe(dvUrl(p.path));
      expect(String(p.meta.alternates?.canonical), p.path).not.toMatch(/[?#]/);
    }
  });

  it("names itself among its hreflang alternates, with x-default, and every alternate names it back", () => {
    const byUrl = new Map(PAGES.map((p) => [dvUrl(p.path), p]));
    for (const p of PAGES) {
      const langs = languagesOf(p.meta);
      if (!Object.keys(langs).length) continue; // a guide with no translation: no hreflang at all
      expect(Object.values(langs), p.path).toContain(dvUrl(p.path));
      expect(langs["x-default"], `${p.path} x-default`).toBeTruthy();
      for (const [lang, url] of Object.entries(langs)) {
        const other = byUrl.get(url);
        expect(other, `${p.path} → ${lang} ${url} is a public page`).toBeDefined();
        // Reciprocity: the alternate lists exactly the same set.
        expect(languagesOf(other!.meta), `${url} ↔ ${p.path}`).toEqual(langs);
      }
    }
  });

  it("gives every page type, legal pages and /videos included, its alternates in the sitemap too", () => {
    const entries = new Map(dentvideoSitemapEntries().map((e) => [e.path, e]));
    for (const p of PAGES) {
      const fromSitemap = Object.fromEntries(Object.entries(entries.get(p.path)?.alternates ?? {}).map(([k, v]) => [k, dvUrl(v)]));
      expect(fromSitemap, p.path).toEqual(languagesOf(p.meta));
    }
    for (const k of LEGAL_KINDS) expect(Object.keys(languagesOf(legalMetadata(k, "de")))).toHaveLength(LOCALES.length + 1);
  });

  it("sets title, description, Open Graph and X card text in the page's own language", () => {
    for (const p of PAGES) {
      const og = p.meta.openGraph as Record<string, unknown>;
      const tw = p.meta.twitter as Record<string, unknown>;
      expect(p.meta.title, p.path).toBeTruthy();
      expect(p.meta.description, p.path).toBeTruthy();
      expect(og?.title && og?.description && og?.url && og?.locale, p.path).toBeTruthy();
      expect(tw?.card, p.path).toBe("summary_large_image");
      // The share image is the page's own opengraph-image.tsx card, not a landing's set here.
      expect(og?.images, p.path).toBeUndefined();
      expect(tw?.images, p.path).toBeUndefined();
    }
  });
});

describe("structured data", () => {
  type Node = Record<string, unknown> & { "@type": string };
  const graphOf = (ld: unknown) => (ld as { "@graph": Node[] })["@graph"];

  it("serialises to JSON a script element cannot be broken out of, and parses back", () => {
    for (const p of PAGES) {
      const html = jsonLdHtml(p.ld);
      expect(html, p.path).not.toContain("<");
      expect(JSON.parse(html), p.path).toEqual(JSON.parse(JSON.stringify(p.ld)));
      expect((p.ld as Record<string, unknown>)["@context"]).toBe("https://schema.org");
    }
    expect(jsonLdHtml({ a: "</script><script>alert(1)</script>" })).toBe('{"a":"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>"}');
  });

  it("gives every node a type and keeps one id per node kind", () => {
    for (const p of PAGES) for (const n of graphOf(p.ld)) expect(n["@type"], p.path).toBeTruthy();
  });

  it("describes the Organization with its legal name, address, logo and identifiers", () => {
    const org = graphOf(aboutJsonLd("en")).find((n) => n["@type"] === "Organization")!;
    expect(org).toMatchObject({ name: "Bulsu Labs", legalName: '"BLS AI AUTOMATION" DOO PODGORICA', taxID: "03784410" });
    expect(org.address).toMatchObject({ "@type": "PostalAddress", addressCountry: "ME" });
    expect(org.logo).toMatchObject({ "@type": "ImageObject", width: 512, height: 512 });
    expect(String((org.logo as { url: string }).url)).toMatch(/\/dentvideo\/icon-512\.png$/);
    expect(readFileSync(join(process.cwd(), "public/dentvideo/icon-512.png")).subarray(1, 4).toString()).toBe("PNG");
  });

  it("prices only Starter and Practice, monthly, wherever the SoftwareApplication appears", () => {
    for (const p of PAGES) {
      const app = graphOf(p.ld).find((n) => n["@type"] === "SoftwareApplication");
      if (!app) continue;
      const offers = app.offers as { "@type": string; name: string; price: number; priceCurrency: string; priceSpecification: Record<string, unknown> }[];
      expect(offers.map((o) => [o["@type"], o.name, o.price, o.priceCurrency]), p.path).toEqual([
        ["Offer", "Starter", 29, "USD"],
        ["Offer", "Practice", 49, "USD"],
      ]);
      for (const o of offers) expect(o.priceSpecification, p.path).toMatchObject({ "@type": "UnitPriceSpecification", billingDuration: "P1M", price: o.price });
    }
  });

  it("emits an FAQPage only with questions and answers (the pages show them)", () => {
    for (const p of PAGES) {
      for (const faq of graphOf(p.ld).filter((n) => n["@type"] === "FAQPage")) {
        const qs = faq.mainEntity as { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }[];
        expect(qs.length, p.path).toBeGreaterThan(0);
        for (const q of qs) {
          expect(q["@type"]).toBe("Question");
          expect(q.name.trim(), p.path).not.toBe("");
          expect(q.acceptedAnswer["@type"]).toBe("Answer");
          expect(q.acceptedAnswer.text.trim(), p.path).not.toBe("");
        }
      }
    }
    // Legal pages and the guides hubs show no FAQ, so they carry none.
    for (const p of PAGES.filter((x) => /\/(terms|privacy|refunds|dpa|imprint|guides)$/.test(x.path))) {
      expect(graphOf(p.ld).some((n) => n["@type"] === "FAQPage"), p.path).toBe(false);
    }
  });

  it("numbers breadcrumbs from 1 with absolute URLs; every guide has Home › Guides › guide", () => {
    for (const p of PAGES) {
      for (const b of graphOf(p.ld).filter((n) => n["@type"] === "BreadcrumbList")) {
        const items = b.itemListElement as { position: number; item: string; name: string }[];
        items.forEach((it, i) => {
          expect(it.position, p.path).toBe(i + 1);
          expect(it.item, p.path).toMatch(/^https:\/\//);
          expect(it.name.trim(), p.path).not.toBe("");
        });
        expect(items[items.length - 1].item, p.path).toBe(dvUrl(p.path));
      }
    }
    for (const g of GUIDES) expect(graphOf(guideJsonLd(g)).find((n) => n["@type"] === "BreadcrumbList")!.itemListElement).toHaveLength(3);
  });

  it("dates every guide Article, written and reviewed by the editorial team", () => {
    for (const g of GUIDES) {
      const graph = graphOf(guideJsonLd(g));
      const article = graph.find((n) => n["@type"] === "Article")!;
      const page = graph.find((n) => n["@type"] === "WebPage")!;
      expect(article.datePublished, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.dateModified, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(article.dateModified) >= String(article.datePublished), g.slug).toBe(true);
      expect(String(article.headline).length, g.slug).toBeLessThanOrEqual(110);
      expect(article.author, g.slug).toMatchObject({ "@type": "Organization", name: "DentVideo editorial team" });
      expect(page.reviewedBy, g.slug).toMatchObject({ "@type": "Organization", name: "DentVideo editorial team" });
      expect(String(article.image), g.slug).toBe(dvUrl(`${guidePath(g)}/opengraph-image`));
    }
  });

  it("gives sample VideoObjects an upload time with a time zone", () => {
    expect(SAMPLE_UPLOAD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    for (const p of PAGES) for (const v of graphOf(p.ld).filter((n) => n["@type"] === "VideoObject")) expect(v.uploadDate, p.path).toBe(SAMPLE_UPLOAD_DATE);
  });
});

describe("sitemap lastmod", () => {
  it("is a real date, never later than today, never before the page was published", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const e of dentvideoSitemapEntries()) {
      expect(e.lastmod, e.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(e.lastmod)), e.path).toBe(false);
      expect(e.lastmod <= today, e.path).toBe(true);
    }
    for (const g of GUIDES) {
      const e = dentvideoSitemapEntries().find((x) => x.path === guidePath(g))!;
      if (g.published) expect(e.lastmod >= g.published, g.slug).toBe(true);
    }
  });
});

describe("metadata stays in <head>", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("the DentVideo 404 boundary reads no request data (it would make every page below it dynamic)", () => {
    // A cookies()/headers() call there made /de, /tr/guides and every guide render per request,
    // with their <title>, canonical, hreflang and share tags streamed into <body>.
    const src = read("src/app/dentvideo/not-found.tsx").replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/from "next\/headers"/);
    expect(src).not.toMatch(/\b(cookies|headers|draftMode|connection)\(\)/);
  });

  it("a 404 speaks the language of its address", () => {
    expect(localeOfPath("/de/xyz")).toBe("de");
    expect(localeOfPath("/dentvideo/ar/nope")).toBe("ar");
    expect(localeOfPath("/dentvideo")).toBeNull();
    expect(localeOfPath("/derp")).toBeNull();
    expect(localeOfPath(null)).toBeNull();
  });
});

describe("Arabic on the share cards", () => {
  const cps = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16));

  it("joins letters into their contextual presentation forms", () => {
    // خمسة: initial khah, medial meem, medial seen, final teh marbuta.
    expect(cps(joinArabic("خمسة"))).toEqual(["fea7", "fee4", "feb4", "fe94"]);
    // A right-joining letter (dal) cuts the word: the letter after it starts again.
    expect(cps(joinArabic("بعد"))).toEqual(["fe91", "fecc", "feaa"]);
    expect(cps(joinArabic("ودي"))).toEqual(["feed", "fea9", "fef1"]);
  });

  it("forms lam-alef ligatures and drops vowel marks", () => {
    expect(cps(joinArabic("لا"))).toEqual(["fefb"]);
    // After an alef nothing joins: the final dal stands alone (isolated form).
    expect(cps(joinArabic("الاعتماد"))).toEqual(["fe8d", "fefb", "fecb", "fe98", "fee4", "fe8e", "fea9"]);
    expect(joinArabic("تُراجَع")).toBe(joinArabic("تراجع"));
  });

  it("puts each word's letters in visual order, mirroring brackets, and leaves Latin words alone", () => {
    expect(visualArabicWord("لا")).toBe("\ufefb");
    expect(cps(visualArabicWord("بعد"))).toEqual(["feaa", "fecc", "fe91"]);
    expect(visualArabicWord("(نص)")).toBe(`(${[...joinArabic("نص")].reverse().join("")})`);
    expect(visualArabicWord("DentVideo")).toBe("DentVideo");
    expect(arabicWords(" خمسة  فيديوهات ")).toHaveLength(2);
  });
});

describe("card text sizing", () => {
  it("measures CJK as full-width", () => {
    expect(emWidth("医院")).toBe(2);
    expect(emWidth("ab")).toBe(1);
  });

  it("wraps CJK by character and other scripts by word", () => {
    expect(wrapLines("医院医院医", 2)).toEqual([2, 2, 1]);
    expect(wrapLines("ab cd ef", 2.5)).toEqual([2.27, 1]);
  });

  it("never leaves one or two characters alone on the last line", () => {
    // 24 CJK characters in 660px: at 64, 60 and 56px 「本。」 would end up alone on a third line.
    const h1 = "毎週月曜日、医院のための患者向け説明動画を5本。";
    const size = fitFontSize(h1, 660, 3, [64, 60, 56, 52, 48]);
    const lines = wrapLines(h1, 660 / size);
    expect(lines[lines.length - 1]).toBeGreaterThanOrEqual(3);
    expect(lines.length).toBeLessThanOrEqual(3);
  });
});
