import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LANDING_PATH, LOCALES } from "@/content/dentvideo";
import { SOLUTIONS, solutionsFor } from "@/content/solutions";
import { SOLUTION_UI } from "@/content/solutions/ui";
import { DV_PRICES_USD } from "@/lib/dentvid/billing";
import { SolutionView } from "./solution-page";

(globalThis as { React?: typeof React }).React = React;

const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("/videos/* pages: price, terms and the no-account preview next to the main button", () => {
  it.each(["tr", "de"] as const)("%s: every page shows the lowest price and 'cancel anytime' and links the #try preview", (l) => {
    const pages = solutionsFor(l);
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) {
      const html = decode(renderToStaticMarkup(<SolutionView p={p} />));
      const hero = html.slice(0, html.indexOf("</header>"));
      expect(hero, p.slug).toContain(`/dentvideo/start?lang=${l}`);
      expect(hero, p.slug).toContain(LANDING[l].pricing.from.split("{price}")[0].trim());
      expect(hero, p.slug).not.toContain("{price}");
      expect(hero, p.slug).toContain(String(DV_PRICES_USD.starter.month));
      expect(hero, p.slug).toContain(LANDING[l].teaser.note);
      expect(hero, p.slug).toContain(`href="${LANDING_PATH[l]}#try"`);
      expect(hero, p.slug).toContain(SOLUTION_UI[l].tryPreview);
    }
    // TR and DE say "cancel anytime" in their own words.
    expect(LANDING.tr.teaser.note).toMatch(/istediğiniz zaman iptal/);
    expect(LANDING.de.teaser.note).toMatch(/jederzeit kündbar/);
  });

  it("every language's page renders the same block", () => {
    for (const l of LOCALES) for (const p of SOLUTIONS.filter((s) => s.locale === l)) expect(renderToStaticMarkup(<SolutionView p={p} />), p.slug).toContain("data-solution-try");
  });
});
