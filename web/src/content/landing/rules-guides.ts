import type { Locale } from "../dentvideo";

/**
 * Links from the landing's rules section (§8) to that market's rules guides,
 * by slug in the same language. Kept out of LandingContent so the landing copy
 * keeps one shape in every language; a market without entries shows none.
 */
export const RULES_GUIDE_LINKS: Partial<Record<Locale, { label: string; slug: string }[]>> = {
  tr: [
    { label: "Diş hekimi reklam yasağı: neler paylaşılabilir?", slug: "dis-hekimi-reklam-yasagi" },
    { label: "Reklam cezası: kim denetler, hangi yaptırımlar?", slug: "dis-hekimi-reklam-cezasi" },
    { label: "Öncesi-sonrası ve görsel içerik onam formu", slug: "oncesi-sonrasi-gorsel-icerik-onam-formu" },
  ],
};
