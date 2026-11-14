import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GUIDES, LANDING_PATH, LOCALES, guidePath } from "@/content/dentvideo";
import { SOLUTIONS, solutionPath } from "@/content/solutions";
import { htmlLangFor } from "./html-lang";
import { publicCacheControl } from "./cache-policy";

const PAGE_LOCALES = Object.fromEntries([...GUIDES, ...SOLUTIONS].filter((p) => p.locale !== "en").map((p) => [p.slug, p.locale]));

describe("server-rendered <html lang dir>", () => {
  it.each(LOCALES)("%s: the landing, its guides hub, about and legal pages", (l) => {
    const dir = l === "ar" ? "rtl" : "ltr";
    const base = LANDING_PATH[l];
    for (const p of [base, `${base}/guides`, `${base}/about`, `${base}/terms`, `${base}/ad-checker`]) {
      expect(htmlLangFor(p, PAGE_LOCALES), p).toEqual({ lang: l, dir });
      // The same page as dentvideo.com serves it (no /dentvideo prefix).
      const bare = p.replace(/^\/dentvideo/, "") || "/";
      expect(htmlLangFor(bare, PAGE_LOCALES), bare).toEqual({ lang: l, dir });
    }
  });

  it("a guide or commercial page in the language it is written in", () => {
    const pages = [...GUIDES.map((g) => [guidePath(g), g.locale]), ...SOLUTIONS.map((s) => [solutionPath(s), s.locale])];
    for (const [p, locale] of pages) expect(htmlLangFor(p, PAGE_LOCALES).lang, p).toBe(locale);
  });

  it("everything else, ClipForge included, stays English", () => {
    for (const p of ["/", "/pricing", "/dashboard", "/dentvideo/start", "/dentvideo/app/record", "/dentvideo/guides/no-such-guide", "/guides/a/b", "/dentvideovideo/de"]) {
      expect(htmlLangFor(p, PAGE_LOCALES), p).toEqual({ lang: "en", dir: "ltr" });
    }
  });

  it("a mistyped localized address keeps its language for the 404", () => {
    expect(htmlLangFor("/dentvideo/de/no-such-page", PAGE_LOCALES).lang).toBe("de");
    expect(htmlLangFor("/ar/x/y", PAGE_LOCALES)).toEqual({ lang: "ar", dir: "rtl" });
  });

  it("the root layout reads no request data, so the marketing pages stay prerendered and CDN-cacheable", () => {
    const layout = fs.readFileSync(path.resolve(__dirname, "../../app/layout.tsx"), "utf8");
    expect(layout).toMatch(/<HtmlRoot\b/);
    expect(layout).not.toMatch(/^\s*<html\b/m);
    expect(layout).not.toMatch(/from ["']next\/headers["']/);
    expect(publicCacheControl("/dentvideo/de")).not.toBeNull();
  });
});
