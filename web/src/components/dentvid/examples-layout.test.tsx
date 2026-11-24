import { describe, expect, it } from "vitest";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES } from "@/content/dentvideo";
import { EXAMPLES, examplesFor } from "@/content/dentvideo-examples";
import { ExampleView, ExamplesHub } from "./examples-page";

(globalThis as { React?: typeof React }).React = React;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

/** The example cards in a page's markup: each one's link classes and its poster's. */
function cards(page: string): { link: string; img: string }[] {
  return [...page.matchAll(/<a [^>]*class="(dv-card dv-lift[^"]*)"[^>]*>\s*<img [^>]*class="([^"]*)"/g)].map((m) => ({ link: m[1], img: m[2] }));
}

/**
 * The examples showcase breathes: on a desktop each language gets its own row of three cards
 * (about 350px each, not six cards of about 150px), titles break between words, and on a phone
 * every card is a row, its poster beside the title.
 */
describe("examples pages: card layout", () => {
  it.each(LOCALES)("%s hub: one language per row, three cards across from sm, phone rows, whole words", (l) => {
    const hub = html(createElement(ExamplesHub, { locale: l }));
    // No two-languages-side-by-side grid, no automatic hyphenation.
    expect(hub).not.toContain("lg:grid-cols-2");
    expect(hub).not.toContain("hyphens");
    // Every card list: one column on a phone, three from sm.
    const lists = [...hub.matchAll(/<ul class="([^"]*grid[^"]*)"/g)].map((m) => m[1].split(" "));
    expect(lists.length).toBeGreaterThan(1);
    for (const c of lists) {
      expect(c).toContain("sm:grid-cols-3");
      expect(c.some((x) => /^grid-cols-/.test(x))).toBe(false);
    }
    const all = cards(hub);
    const shown = EXAMPLES.filter((e) => examplesFor(e.locale).length > 0).length;
    expect(all).toHaveLength(shown);
    for (const c of all) {
      // A row on a phone (poster beside the title), stacked from sm.
      expect(c.link.split(" ")).toEqual(expect.arrayContaining(["items-center", "gap-4", "sm:flex-col", "sm:items-stretch"]));
      expect(c.img.split(" ")).toEqual(expect.arrayContaining(["w-24", "shrink-0", "sm:w-full"]));
    }
    // Only the hub's own first cards are fetched eagerly (the desktop LCP); the rest wait.
    const eager = [...hub.matchAll(/<img [^>]*loading="eager"/g)].length;
    expect(eager).toBe(examplesFor(l).length);
  });

  it.each(LOCALES.filter((l) => examplesFor(l).length > 1))("%s video page: More examples uses the same cards, and 'See all' is a full row on a phone", (l) => {
    const page = html(createElement(ExampleView, { e: examplesFor(l)[0] }));
    expect(page).not.toContain("hyphens");
    expect(page).not.toContain("col-span-2");
    const more = cards(page);
    expect(more).toHaveLength(examplesFor(l).length - 1);
    for (const c of more) expect(c.img.split(" ")).toEqual(expect.arrayContaining(["w-24", "sm:w-full"]));
    expect(page).not.toContain('loading="eager"');
  });
});
