import { describe, expect, it, vi } from "vitest";

// next/font only works inside Next's compiler: any font is a class name here.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LOCALES } from "./dentvideo";
import { ENTITY } from "./guides/entity";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { landingJsonLd } from "@/lib/dentvid/seo";
import { aboutJsonLd } from "@/lib/dentvid/seo-guides";
import { LLMS_UPDATED, llmsTxt } from "@/lib/dentvid/llms";

/**
 * GEO round 2026-11-20: one quotable definition of DentVideo, the same words on
 * the homepage, the About page, the structured data and llms.txt, with no em
 * dashes; one SoftwareApplication node wherever it appears; llms.txt answers
 * "who is it for", "is there an app" and "is this post allowed" truthfully.
 */

(globalThis as { React?: typeof React }).React = React;

type Node = Record<string, unknown> & { "@type": string };
const graph = (g: unknown) => (g as { "@graph": Node[] })["@graph"];
const software = (nodes: Node[]) => nodes.find((n) => n["@type"] === "SoftwareApplication")!;

describe("the DentVideo definition", () => {
  it.each(LOCALES)("%s: names DentVideo and Bulsu Labs, has no em dash", (l) => {
    const d = ENTITY[l].definition;
    expect(d).toContain("DentVideo");
    expect(d).toContain("Bulsu Labs");
    expect(d).not.toMatch(/—| – /);
  });

  it.each(LOCALES)("%s: no entity fact or FAQ answer carries an em dash", (l) => {
    const e = ENTITY[l];
    for (const t of [e.meta.title, e.meta.description, e.h1, ...e.facts.flatMap((f) => [f.label, f.value]), ...e.faq.flatMap((f) => [f.q, f.a]), ...e.sections.flatMap((s) => [s.heading, ...s.paragraphs])]) {
      expect(t, l).not.toMatch(/—| – /);
    }
  });

  it.each(LOCALES)("%s: the homepage shows it under the hero facts, before the hero video", (l) => {
    const page = renderToStaticMarkup(createElement(DentVideoLanding, { locale: l }));
    const at = page.indexOf("data-definition");
    expect(at).toBeGreaterThan(page.indexOf("data-hero-points"));
    expect(at).toBeLessThan(page.indexOf("<video"));
    const escaped = renderToStaticMarkup(createElement("p", null, ENTITY[l].definition)).slice(3, -4);
    expect(page.slice(at, at + escaped.length + 200)).toContain(escaped);
  });
});

describe("structured data: one product node", () => {
  it.each(LOCALES)("%s: the homepage and the About page describe DentVideo identically", (l) => {
    const home = software(graph(landingJsonLd(l)));
    const about = software(graph(aboutJsonLd(l)));
    expect(home).toEqual(about);
    expect(home.description).toBe(ENTITY[l].definition);
    expect(home.operatingSystem).toBe("Web");
  });

  it.each(LOCALES)("%s: the homepage FAQPage holds exactly the questions the page shows", (l) => {
    const faq = graph(landingJsonLd(l)).find((n) => n["@type"] === "FAQPage") as unknown as { mainEntity: { name: string }[] };
    expect(faq.mainEntity.map((q) => q.name)).toEqual(LANDING[l].faq.map((f) => f.q));
  });

  it.each(LOCALES)("%s: no em dash anywhere in the homepage or About structured data", (l) => {
    expect(JSON.stringify(landingJsonLd(l))).not.toContain("—");
    // About FAQ answers come from entity.ts; the rest of the About graph too.
    expect(JSON.stringify(aboutJsonLd(l))).not.toContain("—");
  });
});

describe("llms.txt answers", () => {
  const txt = llmsTxt();

  it("opens with the definition and carries no em dash in its own lines", () => {
    expect(txt).toContain(`> ${ENTITY.en.definition}`);
    const own = txt.slice(0, txt.indexOf("# Pages by language"));
    // Guide descriptions are quoted further down; the fact sheet and quick answers are ours.
    expect(own.slice(0, own.indexOf("## Editorial policy"))).not.toContain("—");
  });

  it("says who DentVideo is for and not for, in the landing's own words", () => {
    const line = txt.split("\n").find((x) => x.startsWith("- Who is DentVideo for"))!;
    expect(line).toBeDefined();
    for (const item of [...LANDING.en.fit.yes, ...LANDING.en.fit.no]) expect(line).toContain(item);
  });

  it("does not claim an app store listing that does not exist", () => {
    const line = txt.split("\n").find((x) => x.startsWith("- Is there an iPhone"))!;
    expect(line).toContain("coming soon");
    expect(line).toContain(LLMS_UPDATED);
    expect(line).toMatch(/not in the App Store/);
    expect(txt).not.toMatch(/apps\.apple\.com|play\.google\.com/);
  });

  it("answers 'is this post allowed' with the checker and the rules guides", () => {
    const line = txt.split("\n").find((x) => x.startsWith("- Is this dental Instagram post allowed?"))!;
    for (const p of ["https://dentvideo.com/ad-checker", "https://dentvideo.com/tr/ad-checker", "https://dentvideo.com/de/ad-checker"]) expect(line).toContain(p);
    expect(line).toMatch(/dis-hekimi-reklam-yasagi/);
    expect(line).toMatch(/heilmittelwerbegesetz/);
    expect(line).toContain("not legal advice");
  });
});
