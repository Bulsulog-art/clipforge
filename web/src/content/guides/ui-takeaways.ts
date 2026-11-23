import type { Locale } from "../dentvideo-locales";

/**
 * The heading of the "Key takeaways" list under a guide's intro. Kept out of
 * ui.ts, which the landing's browser bundle carries, because only guide pages
 * (server-rendered) and llms-full.txt use it.
 */
export const KEY_TAKEAWAYS: Record<Locale, string> = {
  en: "Key takeaways",
  de: "Das Wichtigste in Kürze",
  es: "Puntos clave",
  tr: "Öne çıkanlar",
  fr: "À retenir",
  ja: "要点",
  ar: "أهم النقاط",
  pl: "Najważniejsze informacje",
};
