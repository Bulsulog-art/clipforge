import type { Locale } from "../dentvideo-locales";

/**
 * What screen readers call the breadcrumb trail above a page's title (its nav's aria-label), in
 * the page's language: it said "Breadcrumb" in English on every German, Spanish, Turkish, French,
 * Japanese, Arabic and Polish page. Kept out of ui.ts, which the browser bundle carries (the
 * header and footer import its paths), because only server-rendered pages use it.
 */
export const BREADCRUMB_LABEL: Record<Locale, string> = {
  en: "Breadcrumb",
  de: "Brotkrümelnavigation",
  es: "Ruta de navegación",
  tr: "Sayfa yolu",
  fr: "Fil d’Ariane",
  ja: "パンくずリスト",
  ar: "مسار التنقل",
  pl: "Ścieżka nawigacyjna",
};
