import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/ad-checker",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  },
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { CHECKER, CHECKER_PATH } from "@/content/dentvideo-checker";
import { checkerJsonLd, checkerMetadata, dentvideoSitemapEntries } from "@/lib/dentvid/seo-guides";
import { equivalentPath } from "@/lib/dentvid/lang-switch";
import { chromeText } from "@/lib/dentvid/chrome-text";
import { CheckerPage } from "./checker-page";
import { pathLocale } from "./chrome";

(globalThis as { React?: typeof React }).React = React;

const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("ad checker page", () => {
  it.each(LOCALES)("%s: renders the tool, the rules notes and the FAQ in its language", (l) => {
    const html = decode(renderToStaticMarkup(<CheckerPage locale={l} />));
    const c = CHECKER[l];
    expect(html).toContain(`<main lang="${l}" dir="${l === "ar" ? "rtl" : "ltr"}"`);
    expect(html).toContain(c.h1);
    expect(html).toContain(c.ui.label);
    expect(html).toContain('data-testid="checker-input"');
    for (const f of c.faq) expect(html).toContain(f.q);
    for (const r of c.rules) expect(html).toContain(r.heading);
    expect(html).toContain(c.notLegalAdvice);
    // Before anything is pasted the rules are listed; no result and no CTA yet.
    expect(html).toContain(c.ui.rules.guarantee.name);
    expect(html).not.toContain('data-testid="checker-cta"');
    expect(html).toContain('"@type":"WebApplication"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it.each(LOCALES)("%s: canonical, hreflang for every language and x-default", (l: Locale) => {
    const m = checkerMetadata(l);
    const canonical = String(m.alternates?.canonical);
    expect(canonical.endsWith(CHECKER_PATH[l].replace(/^\/dentvideo/, "") || "/")).toBe(true);
    const langs = m.alternates?.languages as Record<string, string>;
    expect(Object.keys(langs).sort()).toEqual([...LOCALES, "x-default"].sort());
    expect(langs["x-default"]).toBe(langs.en);
    expect(langs[l]).toBe(canonical);
  });

  it("JSON-LD: a free WebApplication, its FAQ and a breadcrumb", () => {
    const g = checkerJsonLd("tr")["@graph"] as Record<string, unknown>[];
    const app = g.find((n) => n["@type"] === "WebApplication") as Record<string, unknown>;
    expect(app.isAccessibleForFree).toBe(true);
    expect((app.offers as { price: number }).price).toBe(0);
    expect(app.inLanguage).toBe("tr");
    const faq = g.find((n) => n["@type"] === "FAQPage") as { mainEntity: unknown[] };
    expect(faq.mainEntity).toHaveLength(CHECKER.tr.faq.length);
    expect(g.some((n) => n["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("is in the sitemap in every language, with its translations", () => {
    const entries = dentvideoSitemapEntries().filter((e) => e.path.endsWith("/ad-checker"));
    expect(entries.map((e) => e.path).sort()).toEqual(Object.values(CHECKER_PATH).sort());
    for (const e of entries) expect(Object.keys(e.alternates ?? {})).toHaveLength(LOCALES.length + 1);
  });

  it("the language switcher and the header keep the visitor on the checker", () => {
    expect(equivalentPath("/tr/ad-checker", "de")).toBe("/dentvideo/de/ad-checker");
    expect(equivalentPath("/dentvideo/ad-checker", "ar")).toBe("/dentvideo/ar/ad-checker");
    expect(equivalentPath("/ar/ad-checker", "en")).toBe("/dentvideo/ad-checker");
    expect(pathLocale("/ad-checker", {})).toBe("en");
    expect(pathLocale("/dentvideo/ja/ad-checker", {})).toBe("ja");
    expect(pathLocale("/ar/ad-checker", {})).toBe("ar");
  });

  it("the header and footer can name it in every language", () => {
    const t = chromeText();
    for (const l of LOCALES) expect(t[l].checker).toBe(CHECKER[l].nav);
  });
});
