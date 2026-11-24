import type { Locale } from "./dentvideo-locales";

/**
 * The site header's own words that no other module has. The header's start
 * button reuses the landing hero's button ("See it with your logo",
 * content/landing/*.ts hero.cta) through lib/dentvid/chrome-text.ts; only the
 * skip link, which keyboard and screen-reader visitors meet first on every
 * page, needs a string of its own.
 */
export const HEADER_TEXT: Record<Locale, { skip: string }> = {
  en: { skip: "Skip to content" },
  de: { skip: "Zum Inhalt springen" },
  es: { skip: "Ir al contenido" },
  tr: { skip: "İçeriğe geç" },
  fr: { skip: "Aller au contenu" },
  ja: { skip: "本文へスキップ" },
  ar: { skip: "الانتقال إلى المحتوى" },
  pl: { skip: "Przejdź do treści" },
};
