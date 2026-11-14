import type { Guide } from "../dentvideo";
import { GUIDES_DE } from "./de";
import { GUIDES_EN } from "./en";
import { GUIDES_ES } from "./es";
import { GUIDES_FR } from "./fr";
import { GUIDES_TR } from "./tr";
import { GUIDES_JA } from "./ja";
import { GUIDES_AR } from "./ar";
import { GUIDES_PL } from "./pl";
import { CALENDAR_EN } from "./calendar";
import { CALENDAR_DE } from "./calendar-de";
import { CALENDAR_ES } from "./calendar-es";
import { CALENDAR_FR } from "./calendar-fr";
import { CALENDAR_TR } from "./calendar-tr";
import { EDUCATION_JA } from "./education-ja";
import { EDUCATION_AR } from "./education-ar";
import { EDUCATION_PL } from "./education-pl";
import { TREATMENTS_EN } from "./treatments-en";
import { TREATMENTS_DE } from "./treatments-de";
import { TREATMENTS_TR } from "./treatments-tr";
import { POSTING_RHYTHM_DE, POSTING_RHYTHM_EN, POSTING_RHYTHM_ES, POSTING_RHYTHM_TR } from "./posting-rhythm";

// Only type imports from ../dentvideo here and in the per-language files, so
// content/dentvideo.ts can import this module without a runtime cycle.

/** The guide library, by market priority; within a language, in hub order. */
export const GUIDE_LIBRARY: Guide[] = [
  ...GUIDES_TR,
  CALENDAR_TR,
  POSTING_RHYTHM_TR,
  ...TREATMENTS_TR,
  ...GUIDES_DE,
  CALENDAR_DE,
  POSTING_RHYTHM_DE,
  ...TREATMENTS_DE,
  ...GUIDES_ES,
  CALENDAR_ES,
  POSTING_RHYTHM_ES,
  ...GUIDES_FR,
  CALENDAR_FR,
  ...GUIDES_EN,
  CALENDAR_EN,
  POSTING_RHYTHM_EN,
  ...TREATMENTS_EN,
  ...GUIDES_JA,
  EDUCATION_JA,
  ...GUIDES_AR,
  EDUCATION_AR,
  ...GUIDES_PL,
  EDUCATION_PL,
];

/**
 * The first guides plus the library: a library guide with the slug of a first
 * guide replaces it in place (same URL, longer text); the rest follow.
 */
export function mergeGuides(base: Guide[], library: Guide[]): Guide[] {
  const bySlug = new Map(library.map((g) => [g.slug, g]));
  const baseSlugs = new Set(base.map((g) => g.slug));
  return [...base.map((g) => bySlug.get(g.slug) ?? g), ...library.filter((g) => !baseSlugs.has(g.slug))];
}
