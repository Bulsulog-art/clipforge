import { describe, expect, it, vi } from "vitest";

// next/font only works inside Next's compiler: any font is a class name here.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GUIDES, LANDING, LOCALES } from "./dentvideo";
import { APP_TEXT } from "./dentvideo-app";
import { GROUP_CONTACT, groupMailto } from "./dentvideo-group";
import { ENTITY } from "./guides/entity";
import { SOLUTIONS } from "./solutions";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { AboutPage } from "@/components/dentvid/about";
import { SolutionView } from "@/components/dentvid/solution-page";
import { PlanPanel, PlanStatus } from "@/components/dentvid/plan-panel";
import { DV_SELF_SERVE_TIERS, dvAvailablePlans } from "@/lib/dentvid/billing";
import { landingJsonLd } from "@/lib/dentvid/seo";
import { aboutJsonLd } from "@/lib/dentvid/seo-guides";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";

// Under vitest the components compile with the classic JSX runtime (tsconfig keeps "preserve" for Next).
(globalThis as { React?: typeof React }).React = React;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

/**
 * Group (multi-location) is "Contact us": multi-location does not exist in
 * the product, so no page may sell it — no price, no checkout, no promised
 * number of locations — and every language says how to get in touch.
 */

/** What Group used to promise, in every language: none of it exists. */
const OLD_GROUP_PROMISES: RegExp[] = [
  /\b279\b/,
  /\b2[.,]?790\b/,
  /up to (three|3) (locations|sites)/i,
  /per location/i,
  /bis zu (drei|3) Standorte/i,
  /pro Standort/i,
  /hasta (tres|3) sedes/i,
  /por sede/i,
  /(üç|3) şube/i,
  /şube başına/i,
  /jusqu'à (trois|3) sites/i,
  /par site/i,
  /3拠点/,
  /حتى ثلاثة فروع/,
  /لكل فرع/,
  /do (trzech|3) placówek/i,
  /na placówkę/i,
];

function promisesIn(text: string): string[] {
  return OLD_GROUP_PROMISES.filter((re) => re.test(text)).map(String);
}

describe("Group is Contact us", () => {
  it("every language has the contact copy, a CTA and a subject in that language", () => {
    expect(GROUP_CONTACT.en.text).toBe("For groups and multi-location practices — tell us your locations and we'll set it up with you.");
    expect(GROUP_CONTACT.en.cta).toBe("Contact us");
    expect(GROUP_CONTACT.en.subject).toBe("DentVideo for multiple practices");
    for (const l of LOCALES) {
      const g = GROUP_CONTACT[l];
      expect(g, l).toBeDefined();
      for (const k of ["name", "price", "text", "cta", "subject"] as const) expect(g[k].trim().length, `${l} ${k}`).toBeGreaterThan(0);
      if (l !== "en") {
        // Translated, not the English left in place.
        expect(g.text, l).not.toBe(GROUP_CONTACT.en.text);
        expect(g.cta, l).not.toBe(GROUP_CONTACT.en.cta);
        expect(g.subject, l).not.toBe(GROUP_CONTACT.en.subject);
        expect(g.price, l).not.toBe(GROUP_CONTACT.en.price);
      }
      // Custom pricing, never a number; no promised count of locations.
      expect(g.price, l).not.toMatch(/\d/);
      expect(g.text, l).not.toMatch(/\d/);
      expect(promisesIn(JSON.stringify(g)), l).toEqual([]);
      // mailto:hello@dentvideo.com with the subject in the page's language.
      const href = groupMailto(l);
      expect(href, l).toMatch(/^mailto:hello@dentvideo\.com\?subject=/);
      expect(decodeURIComponent(href.split("subject=")[1]), l).toBe(g.subject);
    }
  });

  it("Group is never a self-serve plan", () => {
    expect(DV_SELF_SERVE_TIERS).toEqual(["starter", "practice"]);
    expect(dvAvailablePlans({}).map((p) => p.tier)).not.toContain("group");
    for (const l of LOCALES) {
      expect(LANDING[l].pricing.tiers.map((t) => t.name), l).toEqual(["Starter", "Practice"]);
      expect(Object.keys(APP_TEXT[l].billing.tiers).sort(), l).toEqual(["practice", "starter"]);
    }
  });

  it("no public text states a Group price or the old multi-location promises", () => {
    for (const l of LOCALES) {
      expect(promisesIn(JSON.stringify(LANDING[l])), `landing ${l}`).toEqual([]);
      expect(promisesIn(JSON.stringify(APP_TEXT[l])), `app ${l}`).toEqual([]);
      expect(promisesIn(JSON.stringify(ENTITY[l])), `about ${l}`).toEqual([]);
    }
    expect(promisesIn(JSON.stringify(GUIDES)), "guides").toEqual([]);
    expect(promisesIn(JSON.stringify(SOLUTIONS)), "videos pages").toEqual([]);
    expect(promisesIn(llmsTxt()), "llms.txt").toEqual([]);
    expect(promisesIn(llmsFullTxt()), "llms-full.txt").toEqual([]);
  });

  it("the About price fact and llms.txt send groups to the contact address", () => {
    for (const l of LOCALES) {
      const price = ENTITY[l].facts.find((f) => /\$/.test(f.value));
      expect(price?.value, l).toContain("hello@dentvideo.com");
    }
    expect(llmsTxt()).toContain("hello@dentvideo.com");
  });

  it("structured data publishes no Group offer and no price that is not sold", () => {
    for (const l of LOCALES) {
      const landing = JSON.stringify(landingJsonLd(l));
      const app = (landingJsonLd(l)["@graph"] as { "@type": string; offers?: { name: string; price: number }[] }[]).find((n) => n["@type"] === "SoftwareApplication");
      expect(app?.offers?.map((o) => o.name), l).toEqual(["Starter", "Practice"]);
      expect(app?.offers?.map((o) => o.price), l).toEqual([49, 99]);
      expect(promisesIn(landing), l).toEqual([]);
      expect(landing, l).not.toMatch(/"name":"Group"/);
      const about = aboutJsonLd(l)["@graph"] as { "@type": string; offers?: Record<string, unknown> }[];
      expect(about.find((n) => n["@type"] === "SoftwareApplication")?.offers, l).toMatchObject({ lowPrice: 49, highPrice: 99, offerCount: 2 });
    }
  });
});

describe("rendered pages offer no Group checkout", () => {
  /** Any link or form that could buy Group: a checkout host, a plan=group parameter, a Dodo product link. */
  const GROUP_CHECKOUT = /checkout\.dodopayments\.com|plan=group|pdt_0NrVai5ZNwqFoSZbcfV8S|\/buy\//;

  it("the landing in every language shows the Group card as Contact us, with no Group price", () => {
    for (const l of LOCALES) {
      const page = html(createElement(DentVideoLanding, { locale: l }));
      expect(page, l).not.toMatch(GROUP_CHECKOUT);
      expect(promisesIn(page), l).toEqual([]);
      const card = page.slice(page.indexOf('data-tier="group"'));
      expect(page.indexOf('data-tier="group"'), l).toBeGreaterThan(-1);
      const mailto = groupMailto(l).replace(/&/g, "&amp;");
      expect(card, l).toContain(`href="${mailto}"`);
      expect(card, l).toContain(GROUP_CONTACT[l].cta);
      expect(card, l).toContain(GROUP_CONTACT[l].price);
    }
  });

  it("the About pages and /videos pages offer no Group checkout or price", () => {
    for (const l of LOCALES) {
      const page = html(createElement(AboutPage, { locale: l }));
      expect(page, l).not.toMatch(GROUP_CHECKOUT);
      expect(promisesIn(page), l).toEqual([]);
    }
    for (const p of SOLUTIONS) {
      const page = html(createElement(SolutionView, { p }));
      expect(page, p.slug).not.toMatch(GROUP_CHECKOUT);
      expect(promisesIn(page), p.slug).toEqual([]);
    }
  });

  it("the app's plan picker shows Group as Contact us and no Group button that opens a checkout", () => {
    for (const l of LOCALES) {
      const panel = html(
        createElement(PlanPanel, {
          locale: l,
          state: "trial",
          // Whatever the server passes, Group is never a priced, clickable plan.
          options: [...dvAvailablePlans({}), { tier: "group", interval: "month", priceUsd: 279 }],
          founding: { priceUsd: 49 },
        }),
      );
      expect(panel, l).not.toMatch(GROUP_CHECKOUT);
      expect(promisesIn(panel), l).toEqual([]);
      const card = panel.slice(panel.indexOf('data-tier="group"'));
      expect(panel.indexOf('data-tier="group"'), l).toBeGreaterThan(-1);
      expect(card, l).toContain(`href="${groupMailto(l).replace(/&/g, "&amp;")}"`);
      expect(card, l).toContain(GROUP_CONTACT[l].cta);
      // Exactly two buy buttons: Starter and Practice.
      expect(panel.match(/<button type="button"[^>]*class="dv-btn group w-full/g)?.length, l).toBe(2);
      // A legacy Group subscriber still sees the plan's name.
      expect(html(createElement(PlanStatus, { locale: l, state: "active", tier: "group", renewsAt: null })), l).toContain("Group");
    }
  });
});
