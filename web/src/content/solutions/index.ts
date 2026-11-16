import type { Locale } from "../dentvideo";
import type { SolutionKind, SolutionPage } from "./types";
import { SOLUTIONS_EN } from "./en";
import { SOLUTIONS_DE } from "./de";
import { SOLUTIONS_ES } from "./es";
import { SOLUTIONS_TR } from "./tr";
import { SOLUTIONS_FR } from "./fr";
import { SOLUTIONS_JA } from "./ja";
import { SOLUTIONS_AR } from "./ar";
import { SOLUTIONS_PL } from "./pl";
import { ANSWERS_EN } from "./answers-en";
import { ANSWERS_DE } from "./answers-de";
import { ANSWERS_TR } from "./answers-tr";

// Only type imports from ../dentvideo here and in the per-language files, so
// guides/text.ts (imported by content/dentvideo.ts' consumers) can use this
// module without a runtime cycle.

/** Every commercial page, by market priority. */
export const SOLUTIONS: SolutionPage[] = [
  ...SOLUTIONS_TR,
  ...ANSWERS_TR,
  ...SOLUTIONS_DE,
  ...ANSWERS_DE,
  ...SOLUTIONS_ES,
  ...SOLUTIONS_FR,
  ...SOLUTIONS_EN,
  ...ANSWERS_EN,
  ...SOLUTIONS_JA,
  ...SOLUTIONS_AR,
  ...SOLUTIONS_PL,
];

/** Order within a language: the product page, the comparison, then the answer pages. */
const KIND_ORDER: Record<SolutionKind, number> = { product: 0, compare: 1, options: 2, "vs-agency": 3, "vs-canva": 4 };

/** The in-app path; on dentvideo.com it is /videos/<slug>. */
export function solutionPath(p: Pick<SolutionPage, "slug">): string {
  return `/dentvideo/videos/${p.slug}`;
}

export function findSolution(slug: string): SolutionPage | undefined {
  return SOLUTIONS.find((p) => p.slug === slug);
}

export function solutionsFor(locale: Locale): SolutionPage[] {
  return SOLUTIONS.filter((p) => p.locale === locale).sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

export function solutionOf(locale: Locale, kind: SolutionKind): SolutionPage | undefined {
  return SOLUTIONS.find((p) => p.locale === locale && p.kind === kind);
}

/** The same page in other languages (same kind), including itself. */
export function solutionTranslations(p: SolutionPage): SolutionPage[] {
  return SOLUTIONS.filter((o) => o.kind === p.kind);
}

/**
 * The commercial page a guide should point to: the comparison for guides
 * about choosing an agency or a tool (where it exists), else the product page.
 */
export function commercialPageForGuide(g: { locale: Locale; category?: string }): SolutionPage | undefined {
  if (g.category === "tools") return solutionOf(g.locale, "compare") ?? solutionOf(g.locale, "product");
  return solutionOf(g.locale, "product");
}

export type { SolutionKind, SolutionPage } from "./types";
export { ANSWER_KINDS } from "./types";
