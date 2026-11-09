import type { Guide } from "../dentvideo";
import { GUIDES_DE } from "./de";
import { GUIDES_EN } from "./en";
import { GUIDES_ES } from "./es";
import { GUIDES_FR } from "./fr";
import { GUIDES_TR } from "./tr";
import { GUIDES_JA } from "./ja";
import { GUIDES_AR } from "./ar";
import { GUIDES_PL } from "./pl";

// Only type imports from ../dentvideo here and in the per-language files, so
// content/dentvideo.ts can import this module without a runtime cycle.

/** The guide library, by market priority. */
export const GUIDE_LIBRARY: Guide[] = [...GUIDES_TR, ...GUIDES_DE, ...GUIDES_ES, ...GUIDES_FR, ...GUIDES_EN, ...GUIDES_JA, ...GUIDES_AR, ...GUIDES_PL];

/**
 * The first guides plus the library: a library guide with the slug of a first
 * guide replaces it in place (same URL, longer text); the rest follow.
 */
export function mergeGuides(base: Guide[], library: Guide[]): Guide[] {
  const bySlug = new Map(library.map((g) => [g.slug, g]));
  const baseSlugs = new Set(base.map((g) => g.slug));
  return [...base.map((g) => bySlug.get(g.slug) ?? g), ...library.filter((g) => !baseSlugs.has(g.slug))];
}
