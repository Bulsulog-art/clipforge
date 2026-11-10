import type { Faq, Locale } from "../dentvideo";
import type { SectionExtras } from "../guides/types";

/**
 * Commercial pages ("what DentVideo does for this search"), one product page
 * per language plus a fair comparison page in the larger markets. Each one
 * answers a query that Google Suggest shows real demand for (docs/SEO_PLAN.md,
 * "Owning dent/dental video searches"); none exists only to hold a keyword.
 *
 * Same rules as the landing copy: only what the product does today, no prices
 * (they live in the pricing section and the About "Price" fact), no statistics,
 * no testimonials, no promised patients, no superlatives. Other products are
 * described by category and in general, hedged terms — never their prices or
 * limits, which change and which we cannot keep accurate.
 *
 * Inline links use the guide markup (see guides/types.ts), plus
 * [label](video:<slug>) for another commercial page.
 */

/** "product": what DentVideo makes for a clinic; "compare": DentVideo next to the alternatives. */
export type SolutionKind = "product" | "compare";

export type SolutionSection = { heading: string; paragraphs: string[] } & SectionExtras;

export type SolutionPage = {
  locale: Locale;
  slug: string;
  /** Pages of the same kind are true translations of each other (hreflang group). */
  kind: SolutionKind;
  /** Short link text for the footer and hubs. */
  nav: string;
  /** Descriptive anchor text when a guide links here (says what the page is, not "click here"). */
  anchor: string;
  /** One sentence shown with that link. */
  blurb: string;
  /** The searches this page answers, verbatim from Google Suggest (documentation and tests; not rendered). */
  queries: string[];
  /** <title> without the brand; " · DentVideo" is appended (the whole stays within 60 characters). */
  seoTitle: string;
  /** Meta description, at most 155 characters. */
  seoDescription: string;
  h1: string;
  /** The direct answer: what DentVideo does for this search, in one short paragraph. */
  intro: string;
  sections: SolutionSection[];
  /** A comparison table (compare pages). The first column is DentVideo. */
  table?: { caption: string; columns: string[]; rows: { label: string; values: string[] }[]; note?: string };
  faq: Faq[];
  /** Guides in the same language worth reading next. */
  guides: string[];
  published: string;
  updated?: string;
  /** When the facts on the page were last checked (ISO date); falls back to `updated`. */
  reviewed?: string;
};
