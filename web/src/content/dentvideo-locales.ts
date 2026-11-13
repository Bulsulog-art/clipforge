/**
 * DentVideo's languages and the little that is known about each without its
 * content: codes, direction, landing paths and names.
 *
 * Kept apart from content/dentvideo.ts (which re-exports all of it) so that
 * client components — the header, footer and language switcher, shipped on
 * every DentVideo page — can import these few values without pulling the
 * landing copy and the whole guide library into the browser bundle.
 * This module must stay small and import nothing with content in it
 * (enforced by dentvideo-locales.test.ts).
 */

export const LOCALES = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"] as const;
export type Locale = (typeof LOCALES)[number];

/** Locales written right to left: their pages carry dir="rtl" and mirror their layout. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];
export function dirOf(locale: Locale): "rtl" | "ltr" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

/**
 * Locales whose pages live in their own route folder (app/dentvideo/ja, /ar)
 * so that only they load a Japanese or Arabic web font; the other languages
 * share app/dentvideo/[locale].
 */
export const OWN_ROUTE_LOCALES: readonly Locale[] = ["ja", "ar"];

/** The languages served by app/dentvideo/[locale]: not English (the root) and not the own-route ones. */
export const SHARED_ROUTE_LOCALES: Locale[] = LOCALES.filter((l) => l !== "en" && !OWN_ROUTE_LOCALES.includes(l));

export const LANDING_PATH: Record<Locale, string> = {
  en: "/dentvideo",
  de: "/dentvideo/de",
  es: "/dentvideo/es",
  tr: "/dentvideo/tr",
  fr: "/dentvideo/fr",
  ja: "/dentvideo/ja",
  ar: "/dentvideo/ar",
  pl: "/dentvideo/pl",
};

/** Each language's own name, for the language switcher. */
export const LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  tr: "Türkçe",
  fr: "Français",
  ja: "日本語",
  ar: "العربية",
  pl: "Polski",
};

/** BCP-47 tags for hreflang. */
export const HREFLANG: Record<Locale, string> = { en: "en", de: "de", es: "es", tr: "tr", fr: "fr", ja: "ja", ar: "ar", pl: "pl" };

/**
 * The languages that have a guides hub (/guides, /de/guides, …). The guides
 * themselves live in content/dentvideo.ts, which is too big for the browser;
 * dentvideo-locales.test.ts keeps this list equal to the languages that
 * actually have guides there (GUIDE_HUB_LOCALES).
 */
export const GUIDE_HUBS: readonly Locale[] = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"];

/** hasGuides() for the browser: whether `locale` has a guides hub. */
export function hasGuideHub(locale: Locale): boolean {
  return GUIDE_HUBS.includes(locale);
}
