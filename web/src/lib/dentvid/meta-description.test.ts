import { describe, expect, it } from "vitest";
import type { Metadata } from "next";
import { GUIDES, LOCALES } from "@/content/dentvideo";
import { SOLUTIONS } from "@/content/solutions";
import { LEGAL_KINDS } from "@/content/legal/types";
import { landingMetadata } from "./seo";
import { EXAMPLES } from "@/content/dentvideo-examples";
import { SEO_DESCRIPTION_MAX, aboutMetadata, checkerMetadata, exampleMetadata, examplesHubMetadata, guideMetadata, guidesIndexMetadata, legalMetadata, solutionMetadata } from "./seo-guides";

/**
 * Every public DentVideo page's <meta name="description">: short enough for a
 * search result to show whole (SEO_DESCRIPTION_MAX, ~155 characters), long
 * enough to say something. Japanese packs more into a character.
 */
const pages: [string, Metadata][] = [
  ...GUIDES.map((g): [string, Metadata] => [`guide ${g.slug}`, guideMetadata(g)]),
  ...SOLUTIONS.map((s): [string, Metadata] => [`page ${s.slug}`, solutionMetadata(s)]),
  ...EXAMPLES.map((e): [string, Metadata] => [`example ${e.locale}/${e.slug}`, exampleMetadata(e)]),
  ...LOCALES.flatMap((l): [string, Metadata][] => [
    [`${l} landing`, landingMetadata(l)],
    [`${l} guides hub`, guidesIndexMetadata(l)],
    [`${l} about`, aboutMetadata(l)],
    [`${l} ad checker`, checkerMetadata(l)],
    [`${l} examples hub`, examplesHubMetadata(l)],
    ...LEGAL_KINDS.map((k): [string, Metadata] => [`${l} ${k}`, legalMetadata(k, l)]),
  ]),
];

describe("meta descriptions", () => {
  it.each(pages)("%s: fits a search result", (name, m) => {
    const d = typeof m.description === "string" ? m.description.trim() : "";
    expect(d.length, `${name}: ${d}`).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    expect(d.length, `${name}: ${d}`).toBeGreaterThanOrEqual(/[぀-ヿ一-鿿]/.test(d) ? 25 : 50);
  });

  it("each language's guides hub has its own description", () => {
    const seen = new Set(LOCALES.map((l) => guidesIndexMetadata(l).description));
    expect(seen.size).toBe(LOCALES.length);
  });
});
