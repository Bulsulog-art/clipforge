import { LOCALES, dirOf, type Locale } from "@/content/dentvideo";
import { asLocale, resolveLocale } from "./locale";
import { isDentvideoPath } from "./host";

/**
 * The language the page itself is in, when its address says so: a localized
 * landing (/dentvideo/tr) or a guide (each guide has one language). Null for
 * the app and sign-up screens, whose language is per visitor.
 */
export function pathLocale(pathname: string, guideLocales: Record<string, Locale>): Locale | null {
  // On dentvideo.com the address is "/tr" (the middleware serves the
  // /dentvideo section there); elsewhere it is "/dentvideo/tr". Read both.
  const all = pathname.split("/").filter(Boolean);
  const parts = all[0] === "dentvideo" ? all.slice(1) : all;
  if (parts.length === 0) return "en";
  // English guides hub and About: /guides, /about.
  if (parts.length === 1 && (parts[0] === "guides" || parts[0] === "about")) return "en";
  if (parts[0] === "guides") return guideLocales[parts[1] ?? ""] ?? null;
  if (!(LOCALES as readonly string[]).includes(parts[0])) return null;
  // A landing (/tr), or its guides hub or About page (/tr/guides).
  return parts.length === 1 || (parts.length === 2 && (parts[1] === "guides" || parts[1] === "about")) ? (parts[0] as Locale) : null;
}

/**
 * <html lang> and dir for a request, on the server, so the first byte of HTML
 * already speaks the page's language (screen readers, search engines, the
 * browser's own RTL handling). ClipForge pages are English.
 *
 * `dvPath` is the in-app path with its query, from the middleware; null when
 * the request is not for a DentVideo page (DV_PATH_HEADER in host.ts). A page with a language in its
 * address uses that; the sign-up and app screens use ?lang=, then the
 * visitor's remembered language and browser — the same order the pages use
 * (lib/dentvid/locale.ts), so the server's guess matches what they render.
 */
export function documentLanguage(
  dvPath: string | null | undefined,
  visitor: { cookie?: string | null; acceptLanguage?: string | null },
  guideLocales: Record<string, Locale>,
): { lang: Locale; dir: "ltr" | "rtl" } {
  if (!dvPath || !isDentvideoPath(dvPath)) return { lang: "en", dir: "ltr" };
  const q = dvPath.indexOf("?");
  const pathname = (q === -1 ? dvPath : dvPath.slice(0, q)).split("#")[0];
  const fromLink = q === -1 ? null : asLocale(new URLSearchParams(dvPath.slice(q + 1)).get("lang"));
  const lang = pathLocale(pathname, guideLocales) ?? fromLink ?? resolveLocale({ cookie: visitor.cookie, acceptLanguage: visitor.acceptLanguage });
  return { lang, dir: dirOf(lang) };
}
