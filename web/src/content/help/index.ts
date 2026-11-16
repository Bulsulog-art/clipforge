import type { Locale } from "../dentvideo-locales";
import { HELP_IDS, HELP_PATH, type HelpId } from "../dentvideo-help-links";
import type { LegalKind } from "../legal/types";
import { HELP_CATEGORIES, type HelpCategory, type HelpContent, type HelpShot } from "./types";
import { en } from "./en";
import { de } from "./de";
import { es } from "./es";
import { tr } from "./tr";
import { fr } from "./fr";
import { ja } from "./ja";
import { ar } from "./ar";
import { pl } from "./pl";

/**
 * The DentVideo help center (dentvideo.com/help, /de/help …): every question
 * a clinic has after paying, answered from what the product actually does
 * (the app's screens and labels, the emails, the terms, privacy policy and
 * DPA, docs/SUPPORT.md). One page per site language with the same answers
 * under the same anchors, so the app and the emails can link to one answer
 * in the clinic's language (content/dentvideo-help-links.ts).
 *
 * Rules for the copy: the app's own button and field names in each language,
 * no invented features or numbers, no prices (they live on the plan screen),
 * no promises of results, never "legally approved".
 */

export { HELP_CATEGORIES, HELP_IDS, HELP_PATH };
export type { HelpCategory, HelpContent, HelpId, HelpShot };

export const HELP: Record<Locale, HelpContent> = { en, de, es, tr, fr, ja, ar, pl };

/** When the help content last changed (sitemap lastmod, dateModified). */
export const HELP_UPDATED = "2026-11-16";

/** What each answer is about, the same in every language: its group, a real app screen, the legal pages it rests on. */
export const HELP_ARTICLE_META: Record<HelpId, { category: HelpCategory; shot?: HelpShot; legal?: LegalKind[] }> = {
  "first-videos": { category: "start" },
  "no-videos-this-week": { category: "start" },
  topics: { category: "start" },
  "sign-in": { category: "start" },
  approve: { category: "review", shot: "week" },
  "needs-a-look": { category: "review", shot: "card" },
  "software-check": { category: "review" },
  responsibility: { category: "review", legal: ["terms"] },
  "wrong-video": { category: "review" },
  "background-photos": { category: "review" },
  share: { category: "posting" },
  instagram: { category: "posting" },
  "tiktok-shorts": { category: "posting" },
  facebook: { category: "posting" },
  "google-business": { category: "posting" },
  "posting-times": { category: "posting" },
  captions: { category: "posting" },
  "other-uses": { category: "posting", legal: ["terms"] },
  "logo-colors": { category: "settings", shot: "setup" },
  language: { category: "settings" },
  services: { category: "settings" },
  "narrator-voice": { category: "settings" },
  "closing-line": { category: "settings" },
  record: { category: "recording", legal: ["terms"] },
  plans: { category: "billing" },
  invoices: { category: "billing", legal: ["terms"] },
  "update-card": { category: "billing" },
  "payment-failed": { category: "billing" },
  cancel: { category: "billing", legal: ["refunds"] },
  "after-cancel": { category: "billing", legal: ["terms"] },
  group: { category: "billing" },
  "patient-data": { category: "account", legal: ["terms", "privacy"] },
  "privacy-dpa": { category: "account", legal: ["privacy", "dpa"] },
  "export-data": { category: "account" },
  "delete-account": { category: "account", legal: ["privacy"] },
  "reminder-emails": { category: "account" },
};

/** The answers of one category, in the page's order (HELP_IDS). */
export function helpArticlesIn(category: HelpCategory): HelpId[] {
  return HELP_IDS.filter((id) => HELP_ARTICLE_META[id].category === category);
}

/** The answer's text with {email} written out: for JSON-LD, search and emails. */
export function helpPlain(text: string, email: string): string {
  return text.replace(/\{email\}/g, email);
}

/** A real app screen in the page's language (the landing's screenshots). */
export function helpShotSrc(locale: Locale, shot: HelpShot): string {
  return `/dentvideo/landing/${locale}/${shot}.webp`;
}
