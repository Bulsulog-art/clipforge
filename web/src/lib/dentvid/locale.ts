import { LOCALES, type Locale } from "@/content/dentvideo";

/**
 * Which language DentVideo's interface speaks to this visitor.
 *
 * In order: the clinic's own video language once a clinic exists (Italian and
 * Portuguese clinics get English, the interface's fallback); else the
 * `dv-lang` cookie, set when they arrived through a localized landing; else
 * the browser's Accept-Language; else English.
 *
 * Pure, so it is tested directly; `dvLocale()` in locale-server.ts feeds it
 * the request's cookie and headers.
 */
export const LANG_COOKIE = "dv-lang";

export function asLocale(v: string | null | undefined): Locale | null {
  const code = (v ?? "").trim().toLowerCase().slice(0, 2);
  return (LOCALES as readonly string[]).includes(code) ? (code as Locale) : null;
}

/** Best match from an Accept-Language header, honouring q-values. */
export function fromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag, q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const l = asLocale(tag);
    if (l) return l;
  }
  return null;
}

export function resolveLocale(input: {
  clinicLanguage?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (input.clinicLanguage) return asLocale(input.clinicLanguage) ?? "en";
  return asLocale(input.cookie) ?? fromAcceptLanguage(input.acceptLanguage) ?? "en";
}
