import { describe, expect, it, vi } from "vitest";

// next/font only works inside Next's compiler: any font is a class name here.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
import * as React from "react";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { GUIDES, LOCALES, type Locale } from "@/content/dentvideo";
import { EXAMPLES_UI, examplesFor } from "@/content/dentvideo-examples";
import { BREADCRUMB_LABEL } from "@/content/guides/ui-breadcrumb";
import { SOLUTIONS, solutionsFor } from "@/content/solutions";
import { capitalizeFirst } from "@/lib/dentvid/capitalize";
import { Breadcrumbs } from "./guide-parts";
import { CommercialLinks, SolutionView } from "./solution-page";
import { ExampleView, ExamplesHub } from "./examples-page";
import { GuidesIndex } from "./guides-index";
import { AboutPage } from "./about";
import { HelpCenter } from "./help-center";
import { CheckerPage } from "./checker-page";
import { CheckerCallout } from "./checker-callout";
import { LegalPage } from "./legal-page";
import GuidePage from "@/app/dentvideo/guides/[slug]/page";

// Under vitest the components compile with the classic JSX runtime (tsconfig keeps "preserve" for Next).
(globalThis as { React?: typeof React }).React = React;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const WEB = path.resolve(__dirname, "../../..");

/** The aria-label of every breadcrumb trail in a page (the nav that holds the aria-current item). */
function breadcrumbLabels(page: string): string[] {
  return [...page.matchAll(/<nav aria-label="([^"]*)"><ol[^>]*>(?:(?!<\/nav>)[\s\S])*aria-current="page"/g)].map((m) => decode(m[1]));
}
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("light-only colour scheme (Android auto-dark left the wordmark's \"Dent\" nearly invisible)", () => {
  it("the DentVideo layout declares color-scheme 'only light' through Next's viewport (the <meta name=color-scheme>)", () => {
    const layout = readFileSync(path.join(WEB, "src/app/dentvideo/layout.tsx"), "utf8");
    expect(layout).toMatch(/export const viewport: Viewport = \{[^}]*colorScheme: "only light"/);
    // The theme colour stays the paper colour.
    expect(layout).toMatch(/export const viewport: Viewport = \{[^}]*themeColor: "#faf7f2"/);
  });

  it("dentvideo.css sets it on .dv and on the root of DentVideo pages only, each in a rule of its own", () => {
    const css = readFileSync(path.join(WEB, "src/app/dentvideo/dentvideo.css"), "utf8");
    expect(css).toMatch(/(^|\n)\.dv \{\s*color-scheme: only light;\s*\}/);
    expect(css).toMatch(/(^|\n):root:has\(\.dv\) \{\s*color-scheme: only light;\s*\}/);
    // Never a bare :root rule: ClipForge shares this app and has a dark theme of its own.
    expect(css).not.toMatch(/(^|\n):root\s*[,{]/);
    // One selector list with :has() would be dropped whole by a browser without :has().
    expect(css).not.toMatch(/:root:has\(\.dv\),/);
  });
});

describe("breadcrumb trail: named in the page's language", () => {
  it("every language has its own word for it (English only on English pages)", () => {
    for (const l of LOCALES) {
      const label = BREADCRUMB_LABEL[l];
      expect(label.trim().length, l).toBeGreaterThan(0);
      if (l !== "en") expect(label, l).not.toBe(BREADCRUMB_LABEL.en);
    }
    expect(new Set(LOCALES.map((l) => BREADCRUMB_LABEL[l])).size).toBe(LOCALES.length);
  });

  it.each(LOCALES)("%s: the trail's nav carries the label for that language", (l) => {
    const out = html(createElement(Breadcrumbs, { items: [{ name: "DentVideo", href: "/dentvideo" }, { name: "Here" }], locale: l }));
    expect(breadcrumbLabels(out)).toEqual([BREADCRUMB_LABEL[l]]);
    if (l !== "en") expect(out).not.toContain('aria-label="Breadcrumb"');
  });

  it.each(LOCALES)("%s: guides index, examples, help, about, checker and legal pages all name it in %s", (l) => {
    const pages = [
      html(createElement(GuidesIndex, { locale: l })),
      html(createElement(ExamplesHub, { locale: l })),
      html(createElement(HelpCenter, { locale: l })),
      html(createElement(AboutPage, { locale: l })),
      html(createElement(CheckerPage, { locale: l })),
      html(createElement(LegalPage, { kind: "terms", locale: l })),
    ];
    if (examplesFor(l).length > 0) pages.push(html(createElement(ExampleView, { e: examplesFor(l)[0] })));
    for (const p of pages) expect(breadcrumbLabels(p), l).toEqual([BREADCRUMB_LABEL[l]]);
  });

  it("every guide, in every guide language, names its trail in the guide's language", async () => {
    const seen = new Set<Locale>();
    for (const g of GUIDES) {
      const page = html((await GuidePage({ params: Promise.resolve({ slug: g.slug }) })) as React.ReactElement);
      expect(breadcrumbLabels(page), g.slug).toEqual([BREADCRUMB_LABEL[g.locale]]);
      seen.add(g.locale);
    }
    expect([...seen].sort()).toEqual([...LOCALES].sort());
  });

  it("every commercial page names its trail in its own language", () => {
    for (const p of SOLUTIONS) expect(breadcrumbLabels(html(createElement(SolutionView, { p }))), p.slug).toEqual([BREADCRUMB_LABEL[p.locale]]);
  });
});

describe("examples cards: the length in the page's language, the title in its own", () => {
  /** Each card's title (with its lang) and length text, in page order. */
  function cardsOf(page: string): { lang: string; seconds: string }[] {
    return [...page.matchAll(/<span [^>]*lang="([^"]+)"[^>]*data-example-title="true"[^>]*>[\s\S]*?<span class="tabular-nums" data-example-seconds="true">([^<]*)<\/span>/g)].map((m) => ({
      lang: m[1],
      seconds: m[2],
    }));
  }
  const secondsPattern = (l: Locale) => new RegExp(`^${EXAMPLES_UI[l].seconds.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace("{s}", "\\d+")}$`);

  it.each(LOCALES)("%s hub: every card, from any language, says its length in %s", (l) => {
    const hub = html(createElement(ExamplesHub, { locale: l }));
    const cards = cardsOf(hub);
    const shown = LOCALES.reduce((n, o) => n + examplesFor(o).length, 0);
    expect(cards).toHaveLength(shown);
    for (const c of cards) expect(c.seconds, `${l} page, ${c.lang} card`).toMatch(secondsPattern(l));
    // Other languages' cards are there, and keep their titles' own language.
    const langs = new Set(cards.map((c) => c.lang));
    for (const o of LOCALES) if (examplesFor(o).length > 0) expect(langs.has(o), `${o} on ${l}`).toBe(true);
  });

  it("no other language's length word leaks onto a localized hub (the audit saw '28 Sekunden' on /ar/examples)", () => {
    const ar = html(createElement(ExamplesHub, { locale: "ar" }));
    const de = html(createElement(ExamplesHub, { locale: "de" }));
    expect(ar).not.toContain("Sekunden");
    expect(ar).not.toMatch(/\d+ seconds/);
    expect(de).not.toMatch(/\d+ seconds/);
    expect(de).not.toContain("ثانية");
  });

  it.each(LOCALES)("%s hub: the card link itself has no lang or dir of its own (only its title does)", (l) => {
    const hub = html(createElement(ExamplesHub, { locale: l }));
    const links = [...hub.matchAll(/<a [^>]*class="dv-card dv-lift[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a, l).not.toMatch(/\slang=/);
      expect(a, l).not.toMatch(/\sdir=/);
    }
    // An Arabic title is right to left wherever it is shown.
    if (examplesFor("ar").length > 0) expect(hub).toMatch(/<span [^>]*lang="ar" dir="rtl"[^>]*data-example-title="true"/);
  });

  it("a video page's More examples cards say their length in the page's language too", () => {
    for (const l of LOCALES.filter((x) => examplesFor(x).length > 1)) {
      const page = html(createElement(ExampleView, { e: examplesFor(l)[0] }));
      const cards = cardsOf(page);
      expect(cards.length, l).toBe(examplesFor(l).length - 1);
      for (const c of cards) expect(c.seconds, l).toMatch(secondsPattern(l));
    }
  });
});

describe("commercial link box: titles start with a capital, and it is a labelled nav, not a nested aside", () => {
  it("capitalizeFirst follows each language's rules and leaves what it should alone", () => {
    expect(capitalizeFirst("how DentVideo compares with an agency, Canva and ChatGPT", "en")).toBe("How DentVideo compares with an agency, Canva and ChatGPT");
    expect(capitalizeFirst("fünf Wege zu Aufklärungsvideos", "de")).toBe("Fünf Wege zu Aufklärungsvideos");
    expect(capitalizeFirst("vídeos dentales con IA", "es")).toBe("Vídeos dentales con IA");
    expect(capitalizeFirst("des vidéos qui présentent", "fr")).toBe("Des vidéos qui présentent");
    expect(capitalizeFirst("filmy edukacyjne", "pl")).toBe("Filmy edukacyjne");
    expect(capitalizeFirst("diş kliniğiniz için", "tr")).toBe("Diş kliniğiniz için");
    // Turkish dotted i: İ, not I.
    expect(capitalizeFirst("işte beş yol", "tr")).toBe("İşte beş yol");
    expect(capitalizeFirst("inside a sentence", "en")).toBe("Inside a sentence");
    // After an opening quote or bracket.
    expect(capitalizeFirst("«des vidéos»", "fr")).toBe("«Des vidéos»");
    expect(capitalizeFirst("¿cómo funciona?", "es")).toBe("¿Cómo funciona?");
    // Left as they are: scripts without capitals, text already capitalised, a leading number, empty text.
    expect(capitalizeFirst("医院のカラーで毎週届く", "ja")).toBe("医院のカラーで毎週届く");
    expect(capitalizeFirst("فيديوهات توعوية", "ar")).toBe("فيديوهات توعوية");
    expect(capitalizeFirst("DentVideo or Canva", "en")).toBe("DentVideo or Canva");
    expect(capitalizeFirst("5 ways to film", "en")).toBe("5 ways to film");
    expect(capitalizeFirst("", "en")).toBe("");
    // Only the first letter changes: the rest of the phrase, brand casing included, is untouched.
    expect(capitalizeFirst("how dentVideo", "en")).toBe("How dentVideo");
  });

  it.each(LOCALES)("%s: every link title in the box starts with a capital where the script has capitals", (l) => {
    const pages = solutionsFor(l);
    const out = html(createElement(CommercialLinks, { locale: l, pages }));
    const titles = [...out.matchAll(/<a [^>]*>([^<]+)<svg/g)].map((m) => decode(m[1]));
    expect(titles).toHaveLength(pages.length);
    for (const t of titles) {
      const first = [...t][0];
      expect(first, `${l}: ${t}`).toBe(first.toLocaleUpperCase(l));
    }
  });

  it("the anchors that sit lowercase in their sentence (en, es, fr, pl, tr, de) are the ones that now get a capital", () => {
    const lower = SOLUTIONS.filter((p) => /^\p{Ll}/u.test(p.anchor));
    // The audit's six languages: these are real, so the box must fix them.
    expect(new Set(lower.map((p) => p.locale)).size).toBeGreaterThanOrEqual(1);
    for (const p of lower) {
      const out = html(createElement(CommercialLinks, { locale: p.locale, pages: [p] }));
      expect(out, p.slug).toContain(`>${escape(capitalizeFirst(p.anchor, p.locale))}<svg`);
      expect(out, p.slug).not.toContain(`>${escape(p.anchor)}<svg`);
    }
  });

  it.each(LOCALES)("%s: a nav named by its visible heading, never an aside", (l) => {
    const out = html(createElement(CommercialLinks, { locale: l, pages: solutionsFor(l) }));
    expect(out).not.toContain("<aside");
    expect(out).toMatch(/^<nav aria-labelledby="dv-for-clinics"/);
    expect(out).toMatch(/<p id="dv-for-clinics"[^>]*>[^<]+<\/p>/);
  });

  it("renders nothing without pages", () => {
    expect(html(createElement(CommercialLinks, { locale: "en", pages: [] }))).toBe("");
  });

  it("the guides' checker callout is no aside either (axe landmark-complementary-is-top-level on the rules guides)", () => {
    for (const l of LOCALES) {
      const out = html(createElement(CheckerCallout, { locale: l }));
      expect(out, l).not.toContain("<aside");
      expect(out, l).toContain('data-testid="checker-callout"');
    }
  });

  it("no guide page holds an aside at all (each one sat inside the guide's article)", async () => {
    for (const g of GUIDES) {
      const page = html((await GuidePage({ params: Promise.resolve({ slug: g.slug }) })) as React.ReactElement);
      expect(page, g.slug).not.toContain("<aside");
    }
  });

  it("comparison tables have no empty header cell (axe empty-table-header)", () => {
    for (const p of SOLUTIONS.filter((x) => x.table)) {
      const out = html(createElement(SolutionView, { p }));
      expect(out, p.slug).not.toMatch(/<th[^>]*><\/th>/);
      expect(out, p.slug).not.toMatch(/<th[^>]*\/>/);
    }
  });
});
