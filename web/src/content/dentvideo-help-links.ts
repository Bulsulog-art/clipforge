import { HELP_PATH, type Locale } from "./dentvideo-locales";

export { HELP_PATH };

/**
 * Where the help center lives and the anchor of every answer on it, for the
 * places that link to one answer: the app's settings fields, empty weeks,
 * billing states and post sheet, and the transactional emails.
 *
 * Kept apart from the help content (content/help/*, every language's answers)
 * so the app's client components can link to an answer without shipping the
 * whole help center to the browser. Imports nothing with content in it.
 * help.test.ts keeps HELP_IDS equal to the articles every language has.
 */

export const HELP_IDS = [
  // Getting started
  "first-videos",
  "no-videos-this-week",
  "topics",
  "sign-in",
  // Review and approval
  "approve",
  "needs-a-look",
  "software-check",
  "how-we-check",
  "responsibility",
  "wrong-video",
  "background-photos",
  // Posting
  "share",
  "instagram",
  "tiktok-shorts",
  "facebook",
  "google-business",
  "posting-times",
  "captions",
  "other-uses",
  // Your clinic's videos
  "logo-colors",
  "language",
  "services",
  "narrator-voice",
  "closing-line",
  // Recording
  "record",
  // Plan and billing
  "plans",
  "invoices",
  "update-card",
  "payment-failed",
  "cancel",
  "after-cancel",
  "group",
  // Data and account
  "patient-data",
  "privacy-dpa",
  "export-data",
  "delete-account",
  "reminder-emails",
] as const;

export type HelpId = (typeof HELP_IDS)[number];

/** The help center, or one answer on it ("/dentvideo/de/help#cancel"). */
export function helpHref(locale: Locale, id?: HelpId): string {
  return id ? `${HELP_PATH[locale]}#${id}` : HELP_PATH[locale];
}

/** The few words a help link needs in the app: short, in every site language. */
export const HELP_LINK_TEXT: Record<Locale, { more: string; center: string; browse: string }> = {
  en: { more: "How this works", center: "Help center", browse: "Most questions are answered in the" },
  de: { more: "So funktioniert es", center: "Hilfe-Center", browse: "Die meisten Fragen beantwortet unser" },
  es: { more: "Cómo funciona", center: "Centro de ayuda", browse: "Casi todas las dudas tienen respuesta en el" },
  tr: { more: "Nasıl çalışır?", center: "Yardım merkezi", browse: "Soruların çoğunun yanıtı burada:" },
  fr: { more: "Comment ça marche", center: "Centre d'aide", browse: "La plupart des réponses sont dans le" },
  ja: { more: "詳しい説明", center: "ヘルプセンター", browse: "よくあるご質問への回答はこちら：" },
  ar: { more: "كيف يعمل ذلك", center: "مركز المساعدة", browse: "تجدون إجابات معظم الأسئلة في" },
  pl: { more: "Jak to działa", center: "Centrum pomocy", browse: "Odpowiedzi na większość pytań są w serwisie:" },
};
