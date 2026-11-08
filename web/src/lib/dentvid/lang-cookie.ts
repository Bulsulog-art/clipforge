import { LANG_COOKIE } from "./locale";

/** Remembers the interface language in the browser for a year. */
export function rememberLocale(locale: string) {
  document.cookie = `${LANG_COOKIE}=${encodeURIComponent(locale)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** The remembered interface language, read in the browser. */
export function rememberedLocale(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
