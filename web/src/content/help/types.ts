import type { HelpId } from "../dentvideo-help-links";

export const HELP_CATEGORIES = ["start", "review", "posting", "settings", "recording", "billing", "account"] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

/** A real app screen (public/dentvideo/landing/<locale>/<shot>.webp), the same ones the landing shows. */
export type HelpShot = "setup" | "week" | "card";

/**
 * One answer. `a` is plain text: paragraphs separated by a blank line, and
 * `{email}` for hello@dentvideo.com (shown as a link on the page). `steps`, when
 * given, is shown as a numbered list after the first paragraph.
 */
export type HelpArticle = { q: string; a: string; steps?: string[] };

export type HelpContent = {
  meta: { title: string; description: string };
  /** Breadcrumb and share card label. */
  nav: string;
  h1: string;
  lead: string;
  search: { label: string; placeholder: string; none: string; count: { one: string; other: string } };
  /** The label of the category list ("Topics"). */
  topics: string;
  categories: Record<HelpCategory, string>;
  /** "Read more:" before the links to the legal pages an answer rests on. */
  readMore: string;
  /** Under a screenshot: what it shows. */
  shots: Record<HelpShot, string>;
  stuck: { title: string; body: string };
  articles: Record<HelpId, HelpArticle>;
};
