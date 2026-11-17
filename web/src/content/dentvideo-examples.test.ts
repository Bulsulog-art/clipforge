import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "./dentvideo";
import { SAMPLE_VIDEOS } from "./dentvideo-samples";
import {
  EXAMPLES,
  EXAMPLES_PATH,
  EXAMPLES_UI,
  examplePath,
  examplePosterSrc,
  exampleTranslations,
  exampleVideoSrc,
  examplesFor,
  findExample,
  sampleOf,
} from "./dentvideo-examples";
import { BODY_BANNED, MONEY, SNIPPET_BANNED, unquoted } from "./compliance-words";
import {
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  dentvideoSitemapEntries,
  exampleAltPaths,
  exampleJsonLd,
  exampleMetadata,
  examplesHubJsonLd,
  examplesHubMetadata,
} from "@/lib/dentvid/seo-guides";
import { sitemapXml } from "@/lib/dentvid/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";
import { equivalentPath } from "@/lib/dentvid/lang-switch";
import { publicCacheControl } from "@/lib/dentvid/cache-policy";
import { htmlLangFor } from "@/lib/dentvid/html-lang";
import { checkText } from "@/lib/dentvid/ad-checker";

const PUBLIC = path.resolve(__dirname, "../../public");
const pub = (p: string) => p.replace(/^\/dentvideo/, "") || "/";

describe("examples showcase: inventory", () => {
  it("every sample video has exactly one example page, in its own language, and nothing else does", () => {
    const samples = LOCALES.flatMap((l) => (SAMPLE_VIDEOS[l] ?? []).map((s) => `${l}/${s.slug}`));
    expect(EXAMPLES.map((e) => `${e.locale}/${e.slug}`).sort()).toEqual(samples.sort());
    for (const l of LOCALES) expect(examplesFor(l).length, l).toBe(3);
  });

  it("the files the pages point to exist", () => {
    for (const e of EXAMPLES) {
      expect(fs.existsSync(path.join(PUBLIC, exampleVideoSrc(e))), exampleVideoSrc(e)).toBe(true);
      expect(fs.existsSync(path.join(PUBLIC, examplePosterSrc(e))), examplePosterSrc(e)).toBe(true);
    }
  });

  it("lives at /examples in every language; one page per video under it", () => {
    for (const l of LOCALES) expect(EXAMPLES_PATH[l]).toBe(l === "en" ? "/dentvideo/examples" : `/dentvideo/${l}/examples`);
    for (const e of EXAMPLES) {
      expect(examplePath(e)).toBe(`${EXAMPLES_PATH[e.locale]}/${e.slug}`);
      expect(findExample(e.locale, e.slug)).toBe(e);
      expect(e.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    // A slug only answers in its own language.
    expect(findExample("de", "whitening-myths-debunked")).toBeUndefined();
  });
});

describe("examples showcase: copy", () => {
  it("every language has the full interface and the CTA promises the clinic's own name, logo and language", () => {
    const keys = Object.keys(EXAMPLES_UI.en).sort();
    for (const l of LOCALES) {
      expect(Object.keys(EXAMPLES_UI[l]).sort(), l).toEqual(keys);
      expect(EXAMPLES_UI[l].faq.length, l).toBe(EXAMPLES_UI.en.faq.length);
      expect(EXAMPLES_UI[l].seconds, l).toContain("{s}");
    }
    expect(EXAMPLES_UI.en.cta.title).toBe("Get videos like this every week with your clinic's name, logo and language");
  });

  it("each page has a summary, the on-screen text and a unique title in its language", () => {
    for (const l of LOCALES) {
      const mine = examplesFor(l);
      expect(new Set(mine.map((e) => e.h1)).size, l).toBe(mine.length);
      expect(new Set(mine.map((e) => e.seoTitle)).size, l).toBe(mine.length);
    }
    for (const e of EXAMPLES) {
      expect(e.summary.length, e.slug).toBeGreaterThan(e.locale === "ja" ? 60 : 150);
      expect(e.onScreen.length, e.slug).toBeGreaterThanOrEqual(5);
    }
  });

  it("makes no promises, superlatives, prices or 'painless' claims", () => {
    for (const e of EXAMPLES) {
      for (const t of [e.seoTitle, e.seoDescription, e.h1]) expect(unquoted(t), e.slug).not.toMatch(SNIPPET_BANNED);
      for (const t of [e.summary, ...e.onScreen]) expect(unquoted(t), e.slug).not.toMatch(BODY_BANNED);
      expect(JSON.stringify(e), e.slug).not.toMatch(MONEY);
    }
    for (const l of LOCALES) {
      const ui = EXAMPLES_UI[l];
      for (const t of [ui.seoTitle, ui.seoDescription, ui.h1, ui.intro]) expect(unquoted(t), l).not.toMatch(SNIPPET_BANNED);
      expect(unquoted(JSON.stringify(ui)), l).not.toMatch(BODY_BANNED);
      expect(JSON.stringify(ui), l).not.toMatch(MONEY);
    }
  });

  it("passes the public ad checker's rules (no guarantee, urgency or fear)", () => {
    for (const e of EXAMPLES) {
      for (const t of [e.seoTitle, e.seoDescription, e.h1, e.summary]) expect(checkText(t).map((h) => `${h.rule}: ${h.match}`), `${e.slug}: ${t}`).toEqual([]);
    }
    for (const l of LOCALES) {
      const ui = EXAMPLES_UI[l];
      for (const t of [ui.h1, ui.intro, ui.cta.title, ui.cta.text, ui.seoDescription]) expect(checkText(t).map((h) => `${h.rule}: ${h.match}`), `${l}: ${t}`).toEqual([]);
    }
  });
});

describe("examples showcase: search and answer engines", () => {
  it("titles fit in 60 characters and descriptions in 155", () => {
    const all = [...EXAMPLES.map(exampleMetadata), ...LOCALES.map(examplesHubMetadata)];
    for (const m of all) {
      const title = (m.title as { absolute: string }).absolute;
      expect(title.length, title).toBeLessThanOrEqual(SEO_TITLE_MAX);
      expect((m.description as string).length, m.description as string).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    }
  });

  it("hreflang groups only videos on the same topic, reciprocally, never two of one language", () => {
    for (const e of EXAMPLES) {
      const alt = exampleAltPaths(e);
      const group = exampleTranslations(e);
      expect(new Set(group.map((o) => o.locale)).size, e.slug).toBe(group.length);
      if (group.length < 2) {
        expect(alt, e.slug).toBeUndefined();
        expect(exampleMetadata(e).alternates?.languages, e.slug).toBeUndefined();
        continue;
      }
      expect(alt![e.locale]).toBe(examplePath(e));
      for (const o of group) expect(exampleAltPaths(o), `${e.slug} ↔ ${o.slug}`).toEqual(alt);
    }
    // The whitening-and-enamel videos are one group in four languages.
    expect(Object.keys(exampleAltPaths(findExample("en", "whitening-myths-debunked")!)!).sort()).toEqual(["de", "en", "fr", "tr", "x-default"]);
  });

  it("the sitemap lists every hub and every video once, with lastmod", () => {
    const entries = dentvideoSitemapEntries();
    const xml = sitemapXml();
    for (const p of [...LOCALES.map((l) => EXAMPLES_PATH[l]), ...EXAMPLES.map(examplePath)]) {
      const mine = entries.filter((x) => x.path === p);
      expect(mine, p).toHaveLength(1);
      expect(mine[0].lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(xml).toContain(`<loc>https://dentvideo.com${pub(p)}</loc>`);
    }
  });

  it("each video page carries a complete VideoObject; each hub a CollectionPage, its videos and its FAQ", () => {
    for (const e of EXAMPLES) {
      const graph = exampleJsonLd(e)["@graph"] as Record<string, unknown>[];
      const v = graph.find((n) => n["@type"] === "VideoObject")!;
      expect(v.name).toBe(sampleOf(e).name);
      expect(v.thumbnailUrl).toMatch(new RegExp(`^https://[^/]+/dentvideo/samples/${e.locale}/${e.slug}\\.jpg$`));
      expect(v.contentUrl).toMatch(new RegExp(`^https://[^/]+/dentvideo/samples/${e.locale}/${e.slug}\\.mp4$`));
      expect(v.uploadDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(v.duration).toMatch(/^PT\d+S$/);
      expect(graph.map((n) => n["@type"])).toEqual(expect.arrayContaining(["WebPage", "Organization", "BreadcrumbList"]));
      expect(JSON.stringify(graph)).not.toContain("undefined");
    }
    for (const l of LOCALES) {
      const graph = examplesHubJsonLd(l)["@graph"] as Record<string, unknown>[];
      const types = graph.map((n) => n["@type"]);
      expect(types.filter((t) => t === "VideoObject"), l).toHaveLength(3);
      expect(types, l).toEqual(expect.arrayContaining(["CollectionPage", "FAQPage", "BreadcrumbList"]));
    }
  });

  it("llms.txt links every hub and video page; llms-full.txt carries their summaries and on-screen text", () => {
    const txt = llmsTxt();
    const full = llmsFullTxt();
    for (const l of LOCALES) expect(txt).toContain(`(https://dentvideo.com${pub(EXAMPLES_PATH[l])})`);
    for (const e of EXAMPLES) {
      expect(txt).toContain(`(https://dentvideo.com${pub(examplePath(e))})`);
      expect(full).toContain(`## ${e.h1}`);
      expect(full).toContain(e.summary);
    }
  });

  it("the pages are cacheable, in their language, and the language switch keeps visitors on the showcase", () => {
    for (const e of EXAMPLES) {
      expect(publicCacheControl(examplePath(e)), e.slug).not.toBeNull();
      expect(htmlLangFor(examplePath(e)).lang, e.slug).toBe(e.locale);
    }
    for (const l of LOCALES) expect(publicCacheControl(EXAMPLES_PATH[l]), l).not.toBeNull();
    expect(equivalentPath("/de/examples", "tr")).toBe("/dentvideo/tr/examples");
    expect(equivalentPath("/examples/whitening-myths-debunked", "ja")).toBe("/dentvideo/ja/examples");
    expect(equivalentPath("/dentvideo/pl/examples/bol-po-lodach", "en")).toBe("/dentvideo/examples");
  });
});

describe("examples showcase: watch-only", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../components/dentvid/examples-page.tsx"), "utf8");

  it("the player hides the download control, loads nothing until played and offers no embed code or download link", () => {
    expect(src).toContain('controlsList="nodownload');
    expect(src).toContain('preload="none"');
    expect(src).toContain("poster=");
    expect(src).not.toMatch(/autoPlay|<iframe|\sdownload=|embedCode/i);
  });

  it("every video page shows the medical disclaimer and the sign-up CTA", () => {
    expect(src).toContain("ui.disclaimer");
    expect(src).toContain("/dentvideo/start?lang=");
  });
});
