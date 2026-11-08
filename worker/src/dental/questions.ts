/**
 * What patients actually search.
 *
 * The strategist used to guess which questions patients ask. Google's search
 * suggestions show the real ones, in the patient's own words and language,
 * for the clinic's country — "diş beyazlatma zararlı mı", "implant ne kadar
 * sürer". Videos that answer those get watched, and the clinic's posts line
 * up with what its city is typing into a search box.
 *
 * Fail-soft by design: no network, a block or a timeout simply means the
 * strategist plans without them, as before. Price searches are dropped —
 * prices may not be advertised in health care in most of these markets.
 */

import { CJK } from "./locale.js";

const ENDPOINT = "https://suggestqueries.google.com/complete/search";

/** Question-shaped prompts per language; "{s}" is the service name. */
export const SEEDS: Record<string, string[]> = {
  en: ["is {s}", "how long does {s}", "{s} after", "why {s}"],
  tr: ["{s} zararlı mı", "{s} ne kadar sürer", "{s} sonrası", "{s} neden"],
  de: ["ist {s}", "{s} wie lange", "nach {s}", "{s} schmerzen"],
  es: ["es malo {s}", "{s} cuánto dura", "después de {s}", "{s} duele"],
  fr: ["{s} dangereux", "{s} combien de temps", "après {s}", "{s} douleur"],
  it: ["{s} fa male", "{s} quanto dura", "dopo {s}", "{s} rischi"],
  pt: ["{s} faz mal", "{s} quanto tempo", "depois de {s}", "{s} dói"],
  pl: ["czy {s}", "{s} ile trwa", "po {s}", "{s} boli"],
  ar: ["هل {s}", "{s} كم يستغرق", "بعد {s}", "اضرار {s}"],
  // Japanese searches are space-separated keyword pairs: "ホワイトニング 痛い".
  ja: ["{s} 痛い", "{s} 期間", "{s} 後", "{s} リスク"],
};

const PRICE = /price|cost|cheap|fiyat|ücret|ucuz|kosten|preis|günstig|precio|barato|prix|tarif|prezzo|costo|preço|barato|cena|cennik|koszt|kosztuje|\btanie?\b|zł|سعر|اسعار|أسعار|تكلفة|بكم|値段|料金|費用|相場|円|安い|€|\$|₺|£|¥/i;

/** Sites and forums people add to a search ("… ekşi", "… reddit") are not questions. */
const SITES = /\b(ekşi|eksi|reddit|forum|quora|youtube|wiki\w*|donanımhaber|gutefrage|tiktok|instagram|znanylekarz)\b|知恵袋|ブログ|ランキング|口コミ/i;

export function cleanSuggestions(raw: string[], seed: string): string[] {
  return raw
    .map((s) => s.trim())
    // Japanese suggestions often drop the space ("インプラント痛い"); length is the test there.
    .filter((s) => s.length > seed.length - 3 && (s.split(/\s+/).length >= 2 || CJK.test(s)) && !PRICE.test(s) && !SITES.test(s));
}

export async function patientSearches(
  services: string[],
  language: string,
  country: string,
  opts: { fetchImpl?: typeof fetch; perService?: number; total?: number } = {},
): Promise<string[]> {
  const f = opts.fetchImpl ?? fetch;
  const seeds = SEEDS[language] ?? SEEDS.en;
  const out = new Set<string>();
  for (const service of services.slice(0, 8)) {
    const found: string[] = [];
    for (const pattern of seeds) {
      const seed = pattern.replace("{s}", service.toLocaleLowerCase(language));
      const url = `${ENDPOINT}?client=firefox&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(country.toLowerCase())}&q=${encodeURIComponent(seed)}`;
      try {
        const res = await f(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const body = (await res.json()) as [string, string[]];
        // A couple per prompt, so one phrasing does not crowd out the rest.
        found.push(...cleanSuggestions(Array.isArray(body?.[1]) ? body[1] : [], seed).slice(0, 2));
      } catch {
        // Offline, blocked or slow: plan without this service's searches.
      }
    }
    for (const s of found.slice(0, opts.perService ?? 6)) out.add(s);
    if (out.size >= (opts.total ?? 30)) break;
  }
  return [...out].slice(0, opts.total ?? 30);
}
