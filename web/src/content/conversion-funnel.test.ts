import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/tr",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES } from "./dentvideo";
import { APP_TEXT, fmt } from "./dentvideo-app";
import { chromeText, chromeWords } from "@/lib/dentvid/chrome-text";
import { DvHeader, accountLink } from "@/components/dentvid/chrome";
import { PREVIEW_LIBRARY, pickPreviews } from "@/lib/dentvid/preview-library";

(globalThis as { React?: typeof React }).React = React;

/**
 * The mystery-shopper pass: the header's account button, the live preview's
 * caption, and the sign-in subtitle, in every language.
 */

describe("header account button", () => {
  it.each(LOCALES)("%s: signed out it says Sign in and opens the sign-in form; signed in it opens the app", (l) => {
    const t = chromeWords(l);
    expect(accountLink(false, l, t)).toEqual({ href: `/dentvideo/start?mode=signin&lang=${l}`, label: t.signIn });
    expect(accountLink(true, l, t)).toEqual({ href: "/dentvideo/app", label: t.openApp });
    expect(t.signIn).not.toBe(t.openApp);
  });

  it("Turkish: \"Giriş yap\", not \"Uygulamayı aç\", on the first paint", () => {
    expect(chromeWords("tr").signIn).toBe("Giriş yap");
    const html = renderToStaticMarkup(React.createElement(DvHeader, { guideLocales: {}, text: chromeText() }));
    const button = html.slice(html.indexOf("data-account-link") - 200, html.indexOf("</a>", html.indexOf("data-account-link")));
    expect(button).toContain("Giriş yap");
    expect(button).toContain("/dentvideo/start?mode=signin&amp;lang=tr");
    expect(html).not.toContain("Uygulamayı aç");
  });
});

describe("live preview caption", () => {
  it.each(LOCALES)("%s: the samples are numbered as samples, out of the week's five", (l) => {
    const line = APP_TEXT[l].preview.videoOf;
    expect(line).toContain("{n}");
    expect(line).toContain("{total}");
    // Five, in figures (Arabic spells it: "الخمسة").
    expect(line).toMatch(/5|الخمسة/);
    const shown = fmt(line, { n: 1, total: 3 });
    expect(shown).toMatch(/1/);
    expect(shown).toMatch(/3/);
  });

  it("the preview really plays three library videos in every language (fewer than the five a week)", () => {
    for (const [lang, pool] of Object.entries(PREVIEW_LIBRARY)) {
      expect(pool.length, lang).toBeGreaterThanOrEqual(3);
      expect(pickPreviews([], lang).length, lang).toBe(3);
    }
  });
});

describe("sign-in subtitle", () => {
  it.each(LOCALES)("%s: fits a clinic that has not paid yet — no promise of this week's videos", (l) => {
    const lead = APP_TEXT[l].start.leadSignin;
    expect(lead.trim().length).toBeGreaterThan(10);
    expect(lead).not.toMatch(/this week|dieser Woche|esta semana|bu haftanın|de la semaine|今週|هذا الأسبوع|tego tygodnia/i);
  });
});
