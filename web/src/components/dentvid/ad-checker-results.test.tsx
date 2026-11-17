import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, LANDING_PATH } from "@/content/dentvideo-locales";
import { CHECKER, CHECKER_PATH, CHECKER_SOURCES } from "@/content/dentvideo-checker";
import { MARKET_REWRITES, REWRITES, checkText, sentencesOf } from "@/lib/dentvid/ad-checker";
import { DEFAULT_MARKET, type CheckerMarket } from "@/lib/dentvid/checker-markets";
import { Results, groupHits } from "./ad-checker";
import { checkerMarketOptions } from "./checker-page";
import { CARD_HOST, cardFooter } from "./checker-card";

(globalThis as { React?: typeof React }).React = React;

const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Every string inside a value, however deep. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v && typeof v === "object") for (const x of Object.values(v)) strings(x, out);
  return out;
}

// Em dash, horizontal bar, and an en dash used as a dash (with spaces around it). Ranges like "§§ 20–22" stay.
const DASH = /[—―]| – /;

describe("ad checker copy: no em dashes (house style)", () => {
  it.each(LOCALES)("%s: page copy, interface words, examples and market names", (l) => {
    for (const t of [...strings(CHECKER[l]), ...checkerMarketOptions(l).map((m) => m.name)]) expect(t, `${l}: ${t.slice(0, 80)}`).not.toMatch(DASH);
  });

  it("official source labels and every suggested wording", () => {
    for (const t of strings(CHECKER_SOURCES)) expect(t).not.toMatch(DASH);
    for (const t of [...strings(REWRITES), ...strings(MARKET_REWRITES)]) expect(t).not.toMatch(DASH);
  });

  it("the Turkish gazette is named once", () => {
    expect(CHECKER_SOURCES.RG_TR.label.match(/Resmî Gazete/g)).toHaveLength(1);
  });

  it.each(LOCALES)("%s: the rendered result has no em dash either", (l) => {
    const html = decode(renderResult(l, CHECKER[l].ui.sample, DEFAULT_MARKET[l]));
    expect(html.replace(/<[^>]+>/g, " ")).not.toMatch(DASH);
  });
});

describe("ad checker: the result image names the canonical address", () => {
  it.each(LOCALES)("%s: dentvideo.com plus the page's public path, whatever host it was opened on", (l) => {
    const footer = cardFooter(CHECKER_PATH[l], CHECKER[l].ui.disclaimer);
    const want = `dentvideo.com${l === "en" ? "" : `/${l}`}/ad-checker`;
    expect(footer).toBe(`${want} · ${CHECKER[l].ui.disclaimer}`);
    expect(footer.startsWith(`${CARD_HOST}/`)).toBe(true);
    expect(footer).not.toMatch(/\/dentvideo\//);
  });

  it("the component never prints the current host on the card", () => {
    const src = fs.readFileSync(path.join(__dirname, "ad-checker.tsx"), "utf8");
    expect(src).not.toMatch(/location\.(host|hostname|origin)/);
    expect(src).toMatch(/cardFooter\(checkerPath, ui\.disclaimer\)/);
  });
});

function renderResult(l: (typeof LOCALES)[number], text: string, market: CheckerMarket) {
  const hits = checkText(text, market);
  return renderToStaticMarkup(
    <Results
      ui={CHECKER[l].ui}
      locale={l}
      text={text}
      hits={hits}
      sentences={sentencesOf(text, hits)}
      market={market}
      marketName={checkerMarketOptions(l).find((m) => m.id === market)!.name}
      sources={CHECKER_SOURCES}
      shared={false}
      landingPath={LANDING_PATH[l]}
      checkerPath={CHECKER_PATH[l]}
    />,
  );
}

describe("ad checker: one explanation per rule in a sentence", () => {
  it("groups a sentence's hits by rule, in reading order", () => {
    const hits = checkText("Bu ay beyazlatmada indirim ve 12 taksit fırsatı.", "TR");
    const groups = groupHits(hits);
    expect(groups.map((g) => g.rule)).toEqual(["price"]);
    expect(groups[0].hits.map((x) => x.hit.match)).toEqual(["indirim", "taksit", "fırsatı"]);
    expect(groups[0].hits.map((x) => x.index)).toEqual([0, 1, 2]);
  });

  it("Türkiye promo: indirim, taksit and fırsatı share one 'Neden' and are listed together", () => {
    const html = decode(renderResult("tr", CHECKER.tr.ui.sample, "TR"));
    const why = CHECKER.tr.ui.rules.price.why;
    expect(html.split(why).length - 1).toBe(1);
    const note = html.slice(html.lastIndexOf("<li", html.indexOf(why)), html.indexOf("</li>", html.indexOf(why)));
    for (const p of ["indirim", "taksit", "fırsatı"]) expect(note).toContain(`“<bdi>${p}</bdi>”`);
    // The three numbers sit on that one note.
    expect([...note.matchAll(/>(\d+)<\/span>/g)].map((m) => Number(m[1]))).toEqual([4, 5, 6]);
  });

  it.each(LOCALES)("%s: no rule is explained twice within a sentence, and every hit is still numbered", (l) => {
    const ui = CHECKER[l].ui;
    const text = ui.sample;
    const market = DEFAULT_MARKET[l];
    const sentences = sentencesOf(text, checkText(text, market));
    const html = decode(renderResult(l, text, market));
    const notes = html.split('data-testid="checker-rule-note"').length - 1;
    expect(notes).toBe(sentences.reduce((n, s) => n + groupHits(s.hits).length, 0));
    const items = html.split('data-verdict="').slice(1);
    for (const s of sentences) {
      for (const g of groupHits(s.hits)) expect(g.hits.length).toBeGreaterThan(0);
      expect(new Set(s.hits.map((h) => h.rule)).size).toBe(groupHits(s.hits).length);
    }
    expect(items.length).toBeGreaterThan(0);
  });
});
