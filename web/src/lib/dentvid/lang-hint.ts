// The English landing's language hint: "this page is also in your language", never a redirect.
//
// dentvideo.com/ is English and the same prerendered, CDN-cached HTML for everyone
// (lib/dentvid/cache-policy), so the server cannot pick a variant by Accept-Language: a CDN that
// ignores Vary would hand one visitor's Turkish variant to the next. Instead the page carries one
// hidden line per language (components/dentvid/lang-hint), and LANG_HINT_BOOT_SCRIPT, inlined in the
// root layout's <head> next to the price boot, reads navigator.languages before the body is parsed
// and sets <html data-dv-hint="tr">. CSS (dentvideo.css) then shows that one line. Decided before the
// first paint, so nothing moves (no layout shift); without JavaScript nothing shows and the language
// links at the foot of the page remain.
//
// Dismissed: the close button ([data-dv-hint-close]) is handled by the same head script (one
// delegated click listener, added only when a line is shown), so the hint ships no JavaScript in the
// page bundle and closes even before hydration. It removes the attribute and stores localStorage
// dv-lang-hint = "off" (try/catch: with storage blocked the line still closes, just not for the next
// visit). Server only: the layout inlines the script, the landing renders the lines.

import { LOCALES, type Locale } from "@/content/dentvideo-locales";

export const LANG_HINT_ATTR = "data-dv-hint";
export const LANG_HINT_KEY = "dv-lang-hint";
/** Marks the close button; the head script listens for clicks on it. */
export const LANG_HINT_CLOSE = "data-dv-hint-close";

/** The languages the English landing can point to: every one but English. */
export const HINT_LOCALES = LOCALES.filter((l) => l !== "en") as Exclude<Locale, "en">[];

/** One calm line in the visitor's own language, and the close button's name. No em dashes. */
export const LANG_HINT_COPY: Record<Exclude<Locale, "en">, { line: string; close: string }> = {
  de: { line: "Diese Seite gibt es auch auf Deutsch", close: "Schließen" },
  es: { line: "Esta página también está en español", close: "Cerrar" },
  tr: { line: "Bu sayfa Türkçe de var", close: "Kapat" },
  fr: { line: "Cette page existe aussi en français", close: "Fermer" },
  ja: { line: "このページは日本語でもご覧いただけます", close: "閉じる" },
  ar: { line: "هذه الصفحة متوفرة أيضًا بالعربية", close: "إغلاق" },
  pl: { line: "Ta strona jest też po polsku", close: "Zamknij" },
};

/**
 * Which language to suggest for a browser's preference list, or null.
 * The visitor's order decides: the first language we have wins, and English
 * anywhere before it means "no hint" (an English reader is already home).
 * Region and script subtags are ignored ("de-AT", "zh-Hant-TW").
 *
 * Written as plain ES5 source so the very same text runs in the boot script
 * and in the tests (pickHintLocale below is built from it).
 */
export const PICK_SOURCE =
  "function(langs,avail){for(var i=0;i<langs.length;i++){var p=String(langs[i]||\"\").trim().toLowerCase().split(/[-_]/)[0];" +
  "if(p===\"en\")return null;if(avail.indexOf(p)>=0)return p}return null}";

export function pickHintLocale(languages: readonly string[]): Exclude<Locale, "en"> | null {
  for (const raw of languages) {
    const p = String(raw || "").trim().toLowerCase().split(/[-_]/)[0];
    if (p === "en") return null;
    if ((HINT_LOCALES as string[]).includes(p)) return p as Exclude<Locale, "en">;
  }
  return null;
}

/**
 * Runs in <head> on every page; does something only on the English landing ("/" on dentvideo.com,
 * "/dentvideo" elsewhere) with <html lang="en">, and only when the hint was not dismissed.
 */
export const LANG_HINT_BOOT_SCRIPT =
  `(function(){try{var d=document.documentElement,p=location.pathname.replace(/\\/+$/,"")||"/";` +
  `if(d.lang!=="en"||(p!=="/"&&p!=="/dentvideo"))return;` +
  `try{if(localStorage.getItem(${JSON.stringify(LANG_HINT_KEY)})==="off")return}catch(e){}` +
  `var n=navigator,l=n.languages&&n.languages.length?n.languages:[n.language||""];` +
  `var v=(${PICK_SOURCE})(l,${JSON.stringify(HINT_LOCALES)});if(!v)return;` +
  `d.setAttribute(${JSON.stringify(LANG_HINT_ATTR)},v);` +
  `document.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest||!t.closest("[${LANG_HINT_CLOSE}]"))return;` +
  `d.removeAttribute(${JSON.stringify(LANG_HINT_ATTR)});try{localStorage.setItem(${JSON.stringify(LANG_HINT_KEY)},"off")}catch(x){}})` +
  `}catch(e){}})()`;
