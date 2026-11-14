/**
 * Extra fields for the DentVideo guides. Kept here (not in content/dentvideo.ts)
 * so the guide library can grow without touching the landing copy.
 *
 * Inline links in any guide text use a small markdown subset:
 *   [label](guide:<slug>)   another guide (resolved to its path)
 *   [label](guides:)        the guides index in the guide's language
 *   [label](landing:)       the DentVideo landing in the guide's language
 *   [label](about:)         the About page in the guide's language
 *   [label](start:)         the sign-up (live preview, then a plan)
 *   [label](checker:)       the free "Is my post allowed?" ad checker in the guide's language
 *   [label](https://…)      an external source
 */

export type SectionExtras = {
  /** A checklist or steps shown after the paragraphs. */
  list?: string[];
  /** Number the list (steps) instead of ticking it (checklist). */
  ordered?: boolean;
  /** A small comparison table shown after the list (e.g. "risky wording → safer wording"). */
  table?: SectionTable;
  /** Paragraphs shown after the list. */
  after?: string[];
};

/** A plain data table: a caption, column headings and rows of cells (inline links allowed). */
export type SectionTable = {
  caption: string;
  columns: string[];
  /** Each row has exactly one cell per column. */
  rows: string[][];
  note?: string;
};

export type GuideSource = { label: string; url: string };

/** What a guide is about, for grouping on the guides index and choosing related guides. */
export type GuideCategory = "rules" | "ideas" | "video" | "tools" | "treatments";

export type GuideExtras = {
  /**
   * The same guide in other languages shares a topic key. hreflang links only
   * guides with the same key, so a country-specific guide (German HWG,
   * Turkish regulation) is never presented as a translation of another.
   */
  topic?: string;
  category?: GuideCategory;
  /**
   * The search-result title, without the brand: it leads with the phrase
   * people search for. " · DentVideo" is appended when the whole stays within
   * 60 characters (see guideSeoTitle). The on-page H1 and `title` are unchanged;
   * without it the page falls back to `title`.
   */
  seoTitle?: string;
  /** The meta description (at most 155 characters); falls back to `description`. */
  seoDescription?: string;
  /** ISO dates (YYYY-MM-DD). */
  published?: string;
  updated?: string;
  /**
   * When the editorial team last checked the facts and every source link
   * (ISO date). Shown as "Last reviewed" with the byline and emitted as the
   * WebPage's lastReviewed. Falls back to `updated`.
   */
  reviewed?: string;
  /** Official texts and bodies the guide relies on. */
  sources?: GuideSource[];
  /**
   * The slug of a sample video in the guide's own language
   * (content/dentvideo-samples.ts) that answers a question the guide covers.
   * Shown under the intro and emitted as a VideoObject. Only where a real
   * sample on the topic exists; never another language's video.
   */
  sample?: string;
  /** Step-by-step instructions, emitted as HowTo structured data. */
  howTo?: { name: string; steps: { name: string; text: string }[] };
};
