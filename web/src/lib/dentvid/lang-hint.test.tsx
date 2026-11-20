import { describe, expect, it } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { LOCALES } from "@/content/dentvideo-locales";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { HINT_LOCALES, LANG_HINT_ATTR, LANG_HINT_BOOT_SCRIPT, LANG_HINT_CLOSE, LANG_HINT_COPY, LANG_HINT_KEY, PICK_SOURCE, pickHintLocale } from "./lang-hint";

(globalThis as { React?: typeof React }).React = React;

/** Run the <head> script against a stand-in browser; returns what it left on <html>, the address, and a click helper. */
function boot({ path: p = "/", lang = "en", languages = ["en-US"], language, stored, storageThrows = false }: { path?: string; lang?: string; languages?: string[]; language?: string; stored?: string | null; storageThrows?: boolean }) {
  const attrs = new Map<string, string>();
  const saved = new Map<string, string>();
  let moved = false;
  const listeners: ((e: { target: unknown }) => void)[] = [];
  const documentElement = { lang, setAttribute: (k: string, v: string) => void attrs.set(k, v), removeAttribute: (k: string) => void attrs.delete(k) };
  const document = { documentElement, addEventListener: (type: string, fn: (e: { target: unknown }) => void) => type === "click" && listeners.push(fn) };
  const location = { pathname: p, href: `https://dentvideo.com${p}`, assign: () => (moved = true), replace: () => (moved = true) };
  const guard = () => {
    if (storageThrows) throw new Error("SecurityError");
  };
  const localStorage = {
    getItem: (k: string) => (guard(), k === LANG_HINT_KEY ? (stored ?? null) : null),
    setItem: (k: string, v: string) => (guard(), void saved.set(k, v)),
  };
  const navigator = { languages, language: language ?? languages[0] ?? "" };
  new Function("document", "location", "navigator", "localStorage", LANG_HINT_BOOT_SCRIPT)(document, location, navigator, localStorage);
  /** A click on an element; `close` says whether it sits inside the close button. */
  const click = (close: boolean) => {
    const target = { closest: (sel: string) => (close && sel === `[${LANG_HINT_CLOSE}]` ? {} : null) };
    for (const fn of listeners) expect(() => fn({ target })).not.toThrow();
  };
  return { get hint() {
    return attrs.get(LANG_HINT_ATTR) ?? null;
  }, href: location.href, get moved() {
    return moved;
  }, saved, listeners, click };
}

const PICK = new Function(`return (${PICK_SOURCE})`)() as (l: string[], a: string[]) => string | null;

const CASES: [string[], string | null][] = [
  [["tr-TR", "tr", "en-US", "en"], "tr"],
  [["de-AT"], "de"],
  [["de_CH"], "de"],
  [["ja"], "ja"],
  [["ar-SA", "en"], "ar"],
  [["pl-PL"], "pl"],
  [["es-419"], "es"],
  [["fr-CA", "fr"], "fr"],
  // English first: an English reader is home.
  [["en-US", "tr"], null],
  [["en-GB"], null],
  // A language we do not have is skipped; the next one we have wins, unless English comes first.
  [["ru-RU", "de-DE", "en"], "de"],
  [["ru-RU", "en", "de"], null],
  [["zh-Hant-TW"], null],
  [["pt-BR"], null],
  [[], null],
  [[""], null],
];

describe("language hint: which language shows", () => {
  it("the visitor's order decides; English first means no hint", () => {
    for (const [langs, want] of CASES) {
      expect(pickHintLocale(langs), langs.join(",")).toBe(want);
      // The very source the browser runs agrees with the typed version.
      expect(PICK(langs, HINT_LOCALES), `boot: ${langs.join(",")}`).toBe(want);
    }
  });

  it("the <head> script marks <html> with that language on the English landing only", () => {
    expect(boot({ languages: ["tr-TR", "en"] }).hint).toBe("tr");
    expect(boot({ path: "/dentvideo", languages: ["de-DE"] }).hint).toBe("de");
    expect(boot({ path: "/dentvideo/", languages: ["de-DE"] }).hint).toBe("de");
    // navigator.languages missing: navigator.language.
    expect(boot({ languages: [], language: "fr-FR" }).hint).toBe("fr");
    expect(boot({ languages: ["en-US", "tr"] }).hint).toBeNull();
    // Not the English landing: another page, or a page in another language.
    expect(boot({ path: "/tr", lang: "tr", languages: ["de"] }).hint).toBeNull();
    expect(boot({ path: "/pricing", languages: ["de"] }).hint).toBeNull();
    expect(boot({ path: "/guides", languages: ["tr"] }).hint).toBeNull();
  });

  it("never redirects: the address is untouched whatever the language", () => {
    for (const [langs] of CASES) {
      const r = boot({ languages: langs });
      expect(r.moved).toBe(false);
      expect(r.href).toBe("https://dentvideo.com/");
    }
    expect(LANG_HINT_BOOT_SCRIPT).not.toMatch(/location\.(href|assign|replace)|location\s*=|window\.open/);
  });

  it("dismissed once: no hint on later visits; blocked storage still shows it and never throws", () => {
    expect(boot({ languages: ["tr"], stored: "off" }).hint).toBeNull();
    expect(boot({ languages: ["tr"], stored: null }).hint).toBe("tr");
    expect(boot({ languages: ["tr"], storageThrows: true }).hint).toBe("tr");
  });

  it("the close button removes the hint now and remembers it; other clicks do nothing; blocked storage never throws", () => {
    const b = boot({ languages: ["tr"] });
    b.click(false);
    expect(b.hint).toBe("tr");
    b.click(true);
    expect(b.hint).toBeNull();
    expect(b.saved.get(LANG_HINT_KEY)).toBe("off");
    expect(b.moved).toBe(false);
    const blocked = boot({ languages: ["de"], storageThrows: true });
    expect(blocked.hint).toBe("de");
    blocked.click(true);
    expect(blocked.hint).toBeNull();
    // No hint shown (English reader, or another page): no listener at all.
    expect(boot({ languages: ["en"] }).listeners).toHaveLength(0);
    expect(boot({ path: "/tr", lang: "tr", languages: ["de"] }).listeners).toHaveLength(0);
  });
});

describe("language hint: on the page", () => {
  it("the English landing carries one hidden line per other language, linking to that landing, in that language", () => {
    const page = renderToStaticMarkup(createElement(DentVideoLanding, { locale: "en" }));
    const lines = [...page.matchAll(/<div data-l="([a-z]{2})" lang="([a-z]{2})" dir="(ltr|rtl)" class="dv-lang-hint[^"]*">(.*?)<\/button><\/div><\/div>/g)];
    expect(lines.map((m) => m[1]).sort()).toEqual([...HINT_LOCALES].sort());
    for (const [, l, lang, dir, inner] of lines) {
      expect(lang).toBe(l);
      expect(dir).toBe(l === "ar" ? "rtl" : "ltr");
      expect(inner).toContain(`hrefLang="${l}"`);
      expect(inner).toMatch(new RegExp(`href="[^"]*/${l}"`));
      expect(inner).toContain(LANG_HINT_COPY[l as keyof typeof LANG_HINT_COPY].line);
      expect(inner).toContain(`aria-label="${LANG_HINT_COPY[l as keyof typeof LANG_HINT_COPY].close}"`);
      expect(inner).toContain(`${LANG_HINT_CLOSE}=""`);
      expect(inner).toContain('type="button"');
    }
    // Before the hero: at the top of the page.
    expect(page.indexOf("dv-lang-hint")).toBeLessThan(page.indexOf("<h1"));
  });

  it("only on the English landing", () => {
    for (const l of LOCALES.filter((x) => x !== "en")) {
      expect(renderToStaticMarkup(createElement(DentVideoLanding, { locale: l })), l).not.toContain("dv-lang-hint");
    }
  });

  it("hidden unless <html> names its language (CSS), and the root layout runs the boot script in <head>", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../app/dentvideo/dentvideo.css"), "utf8");
    expect(css).toMatch(/\.dv-lang-hint\s*\{\s*display:\s*none;?\s*\}/);
    for (const l of HINT_LOCALES) expect(css).toContain(`html[data-dv-hint="${l}"] .dv-lang-hint[data-l="${l}"]`);
    const layout = fs.readFileSync(path.resolve(__dirname, "../../app/layout.tsx"), "utf8");
    const head = layout.slice(layout.indexOf("<head>"), layout.indexOf("</head>"));
    expect(head).toContain("LANG_HINT_BOOT_SCRIPT");
  });

  it("calm copy: no em dashes, no exclamation marks", () => {
    for (const c of Object.values(LANG_HINT_COPY)) {
      expect(c.line).not.toMatch(/[—!！]/);
      expect(c.close).not.toMatch(/[—!！]/);
    }
  });
});
