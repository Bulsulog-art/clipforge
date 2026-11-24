import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ path: "/dentvideo" }));
const tracked = vi.hoisted(() => [] as unknown[][]);
vi.mock("@/lib/dentvid/events-client", () => ({ trackDv: (...args: unknown[]) => void tracked.push(args) }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
}));

import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LANDING_PATH, LOCALES, type Locale } from "@/content/dentvideo";
import { hasGuideHub } from "@/content/dentvideo-locales";
import { EXAMPLES_PATH } from "@/content/guides/ui";
import { HEADER_TEXT } from "@/content/dentvideo-header-cta";
import { chromeText, chromeWords } from "@/lib/dentvid/chrome-text";
import { parseClientEvent } from "@/lib/dentvid/events";
import { DvHeader, SiteHeader, Start, accountLink, startLink } from "./chrome";

(globalThis as { React?: typeof React }).React = React;

/** The header as the server sends it (and as a new visitor's first paint shows it: signed out). */
function header(locale: Locale, at = LANDING_PATH[locale]): string {
  nav.path = at;
  return renderToStaticMarkup(React.createElement(DvHeader, { guideLocales: {}, text: chromeText() }));
}

/** Every <a …>…</a> in the markup, with its attributes and text. */
function anchors(html: string): { attrs: string; text: string }[] {
  const decode = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  return [...html.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ attrs: m[1], text: decode(m[2].replace(/<[^>]+>/g, "")) }));
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

  it("a header click is counted as a try of the no-account preview, as the hero's is, not as a sign-up click", () => {
    tracked.length = 0;
    const navs: unknown[] = [];
    const el = Start({ to: { href: "/dentvideo/de#try", label: "x" }, locale: "de", className: "", onNav: (e) => void navs.push(e) }) as React.ReactElement<{ onClick: (e: unknown) => void }>;
    const click = { currentTarget: null };
    el.props.onClick(click);
    // cta_clicked stays "a button into the sign-up" (the admin funnel's "Clicked a sign-up button").
    expect(tracked).toEqual([["try_clicked", { locale: "de", props: { where: "header" } }]]);
    expect(navs).toEqual([click]);
    // The event endpoint accepts it: it lands in the funnel's "try" step.
    expect(parseClientEvent(JSON.stringify({ name: "try_clicked", locale: "de", props: { where: "header" } }))?.name).toBe("try_clicked");
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

  /** The site header as a signed-in browser shows it once the session cookie is read. */
  function signedInHeader(l: Locale): string {
    nav.path = LANDING_PATH[l];
    return renderToStaticMarkup(React.createElement(SiteHeader, { t: chromeWords(l), locale: l, ready: true, quiet: false, signedIn: true }));
  }

  it.each(LOCALES)("%s: rendered signed in, 'Open app' is the only filled button, with no start button and no 'Sign in'", (l) => {
    const t = chromeWords(l);
    const a = anchors(signedInHeader(l));
    expect(a.some((x) => x.attrs.includes('data-cta="header"'))).toBe(false);
    expect(a.filter((x) => x.attrs.includes("dv-btn"))).toEqual([{ attrs: expect.stringContaining('href="/dentvideo/app"'), text: t.openApp }]);
    expect(a.filter((x) => x.text === t.openApp)[0].attrs).toContain("dv-btn-primary");
    expect(a.some((x) => x.text === t.signIn)).toBe(false);
  });

  it.each(LOCALES)("%s: rendered signed in, the bar and the phone menu keep their links and breakpoints, plus Examples", (l) => {
    const t = chromeWords(l);
    const a = anchors(signedInHeader(l));
    const want = [t.howItWorks, t.pricing, ...(hasGuideHub(l) ? [t.guides] : []), t.examples, t.checker];
    const bar = a.filter((x) => x.attrs.includes("hidden whitespace-nowrap rounded-full"));
    expect(bar.map((x) => x.text)).toEqual(want);
    // As before the start button: every link from md, the ad checker from lg.
    for (const x of bar) expect(x.attrs).toContain(x.text === t.checker ? "lg:inline-block" : "md:inline-block");
    // The phone menu: the same links, no start button and no account link.
    expect(a.filter((x) => x.attrs.includes("min-h-14")).map((x) => x.text)).toEqual(want);
  });
});
