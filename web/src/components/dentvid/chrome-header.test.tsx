import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ path: "/dentvideo" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
}));

import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LANDING_PATH, LOCALES, type Locale } from "@/content/dentvideo";
import { EXAMPLES_PATH } from "@/content/guides/ui";
import { HEADER_TEXT } from "@/content/dentvideo-header-cta";
import { chromeText, chromeWords } from "@/lib/dentvid/chrome-text";
import { DV_CTA_WHERE } from "@/lib/dentvid/events";
import { DvHeader, accountLink, startLink } from "./chrome";

(globalThis as { React?: typeof React }).React = React;

/** The header as the server sends it (and as a new visitor's first paint shows it: signed out). */
function header(locale: Locale, at = LANDING_PATH[locale]): string {
  nav.path = at;
  return renderToStaticMarkup(React.createElement(DvHeader, { guideLocales: {}, text: chromeText() }));
}

/** Every <a …>…</a> in the markup, with its attributes and text. */
function anchors(html: string): { attrs: string; text: string }[] {
  return [...html.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ attrs: m[1], text: m[2].replace(/<[^>]+>/g, "") }));
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

describe("site header, signed out", () => {
  it.each(LOCALES)("%s: the start button goes to the landing's logo preview, in the page's language, in the bar and at the top of the phone menu", (l) => {
    const a = anchors(header(l));
    const start = a.filter((x) => x.attrs.includes('data-cta="header"'));
    // Once in the bar, once at the top of the phone sheet.
    expect(start).toHaveLength(2);
    for (const s of start) {
      expect(s.text).toBe(LANDING[l].hero.cta);
      expect(s.attrs).toContain(`href="${LANDING_PATH[l]}#try"`);
      expect(s.attrs).toContain("dv-btn-primary");
    }
    // The landing really has the section it scrolls to.
    expect(fs.readFileSync(path.join(__dirname, "teaser.tsx"), "utf8")).toContain('id="try"');
    // The sheet's first link is the start button (focus lands on it when the menu opens).
    const sheet = a.slice(a.findIndex((x) => x.attrs.includes("min-h-14")) - 1);
    expect(sheet[0].attrs).toContain('data-cta="header"');
  });

  it.each(LOCALES)("%s: 'Sign in' is a plain link, not a button, in the bar and in the phone menu", (l) => {
    const t = chromeWords(l);
    const signIn = anchors(header(l)).filter((x) => x.text === t.signIn);
    expect(signIn.length).toBeGreaterThanOrEqual(1);
    for (const s of signIn) {
      expect(s.attrs).toContain(`href="${attr(`/dentvideo/start?mode=signin&lang=${l}`)}"`);
      expect(s.attrs).not.toContain("dv-btn");
    }
    // In the bar from md, as a text link beside the start button.
    expect(signIn.some((s) => s.attrs.includes("md:inline-block") && s.attrs.includes("data-account-link"))).toBe(true);
  });

  it.each(LOCALES)("%s: Examples is in the bar from md and in the phone menu", (l) => {
    const t = chromeWords(l);
    const ex = anchors(header(l)).filter((x) => x.attrs.includes(`href="${EXAMPLES_PATH[l]}"`));
    expect(ex.map((x) => x.text)).toEqual([t.examples, t.examples]);
    expect(ex[0].attrs).toContain("md:inline-block");
    expect(ex[1].attrs).toContain("min-h-14");
  });

  it.each(LOCALES)("%s: a skip link comes first and jumps past the header", (l) => {
    const html = header(l);
    const [first] = anchors(html);
    expect(first.text).toBe(HEADER_TEXT[l].skip);
    expect(first.attrs).toContain('href="#main"');
    // Hidden until it has keyboard focus.
    expect(first.attrs).toMatch(/sr-only focus:not-sr-only/);
    expect(html.indexOf("<a ")).toBeLessThan(html.indexOf("<header"));
    // Its target sits right after the header, where the page's <main> begins.
    expect(html).toMatch(/<\/header><div id="main"[^>]*><\/div>$/);
  });

  it("every language has its own skip-link words, and the header words stay a small table", () => {
    const skips = LOCALES.map((l) => HEADER_TEXT[l].skip);
    for (const s of skips) expect(s.trim().length).toBeGreaterThan(3);
    expect(new Set(skips).size).toBe(LOCALES.length);
    for (const l of LOCALES) expect(chromeWords(l).start, l).toBe(LANDING[l].hero.cta);
  });

  it("the sign-up wizard (quiet) keeps only the logo and the skip link: no start button", () => {
    const html = header("en", "/dentvideo/start");
    expect(html).not.toContain('data-cta="header"');
    expect(anchors(html).map((x) => x.text)).toEqual([HEADER_TEXT.en.skip, ""]);
  });

  it("the header click is counted as a call to action from the header", () => {
    expect(DV_CTA_WHERE).toContain("header");
    const src = fs.readFileSync(path.join(__dirname, "chrome.tsx"), "utf8");
    expect(src).toMatch(/trackDv\("cta_clicked", \{ locale, props: \{ where: "header" \} \}\)/);
  });
});

describe("site header, signed in: unchanged", () => {
  it.each(LOCALES)("%s: no start button; the filled button stays 'Open app'", (l) => {
    const t = chromeWords(l);
    expect(startLink(true, l, t)).toBeNull();
    expect(accountLink(true, l, t)).toEqual({ href: "/dentvideo/app", label: t.openApp });
    // Signed out, the start button and the sign-in form.
    expect(startLink(false, l, t)).toEqual({ href: `${LANDING_PATH[l]}#try`, label: LANDING[l].hero.cta });
    expect(accountLink(false, l, t).label).toBe(t.signIn);
  });

  it("the bar renders 'Open app' as the filled button, and 'Sign in' only when there is a start button", () => {
    const src = fs.readFileSync(path.join(__dirname, "chrome.tsx"), "utf8");
    // The sign-in text link exists only beside a start button (signed out).
    expect(src).toMatch(/\.\.\.\(start \? \[\{ href: dvHref\(account\.href\), label: account\.label, account: true as const \}\] : \[\]\)/);
    // Signed in: the account link ("Open app") keeps the filled button.
    expect(src).toMatch(/\{start \? \([\s\S]*?<Start [\s\S]*?\) : \([\s\S]*?data-account-link className=\{`\$\{BUTTON\} px-4 text-sm`\}/);
  });
});
