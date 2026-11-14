import { LOCALES, dirOf, type Locale } from "@/content/dentvideo-locales";

// <html lang dir> from the path (app/layout explains). pageLocales: slug → language.
export function htmlLangFor(pathname: string, pageLocales: Readonly<Record<string, string>> = {}): { lang: Locale; dir: "ltr" | "rtl" } {
  const [a, b, c] = pathname.replace(/^\/dentvideo(?=\/|$)/, "").split("/").filter(Boolean);
  const v = isLocale(a) ? a : (a === "guides" || a === "videos") && !c && b ? pageLocales[b] : "en";
  const lang = isLocale(v) ? v : "en";
  return { lang, dir: dirOf(lang) };
}

const isLocale = (v: string | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);
