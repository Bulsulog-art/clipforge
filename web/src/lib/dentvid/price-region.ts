// Which currency and tax line a billing country gets. Shipped to the browser
// (components/dentvid/price-region): keep it tiny. pricing.ts builds on it.

export type DvCurrency = "USD" | "EUR" | "TRY";
export type DvTaxKind = "tr" | "eu" | "other";
export type DvPriceContext = { currency: DvCurrency; tax: DvTaxKind };

// Euro area (BG since 2026-01-01): EUR. Other EU members: USD + VAT.
const EURO = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");
export const DV_EURO_COUNTRIES: ReadonlySet<string> = new Set(EURO);
export const DV_EU_COUNTRIES: ReadonlySet<string> = new Set([...EURO, "CZ", "DK", "HU", "PL", "RO", "SE"]);

export function normaliseCountry(country: string | null | undefined): string | null {
  const c = (country ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

export function dvCurrencyForCountry(country: string | null | undefined): DvCurrency {
  const c = normaliseCountry(country);
  return c === "TR" ? "TRY" : c && DV_EURO_COUNTRIES.has(c) ? "EUR" : "USD";
}

export function dvPriceContext(country: string | null | undefined): DvPriceContext {
  const c = normaliseCountry(country);
  return { currency: dvCurrencyForCountry(c), tax: c === "TR" ? "tr" : c && DV_EU_COUNTRIES.has(c) ? "eu" : "other" };
}

// Time zones in Türkiye and the EU (city → country), for when the edge sends no country.
const TZ: Record<string, string> = Object.fromEntries(
  (
    "Istanbul TR,Berlin DE,Vienna AT,Madrid ES,Canary ES,Paris FR,Rome IT,Amsterdam NL,Brussels BE,Lisbon PT,Dublin IE," +
    "Helsinki FI,Athens GR,Luxembourg LU,Bratislava SK,Ljubljana SI,Tallinn EE,Riga LV,Vilnius LT,Malta MT,Nicosia CY," +
    "Zagreb HR,Sofia BG,Warsaw PL,Prague CZ,Budapest HU,Bucharest RO,Stockholm SE,Copenhagen DK"
  )
    .split(",")
    .map((p) => p.split(" ")),
);

/** "Europe/Berlin" → DE (also Asia/Istanbul, Atlantic/Canary, Asia/Nicosia). */
export function countryFromTimeZone(tz: string | null | undefined): string | null {
  return (tz && TZ[tz.split("/")[1] ?? ""]) || null;
}

// The page language's market (/tr → TL, /de /es /fr → EUR); also the no-JS default in dentvideo.css.
export function countryFromLocale(locale: string): string | null {
  return locale === "tr" ? "TR" : locale === "de" ? "DE" : locale === "es" ? "ES" : locale === "fr" ? "FR" : null;
}

// Display only: the server's IP-based country, else a TR/EU time zone, else
// the page's language (a UTC or US-zoned reader of /tr — an ad reviewer, a
// VPN — sees the TL the ad quoted), else USD.
export function guessCountry(args: { geo?: string | null; timeZone?: string | null; locale: string }): string | null {
  const geo = normaliseCountry(args.geo);
  const page = countryFromLocale(args.locale);
  // An IP in a TL/EUR market shows that market's price. An IP elsewhere (US, a VPN, Google's
  // ad reviewer) does not override a TR or euro page: /tr keeps TL and /de keeps EUR, as the ads quote.
  if (geo && (dvCurrencyForCountry(geo) !== "USD" || !page)) return geo;
  if (geo && page) return page;
  return countryFromTimeZone(args.timeZone) ?? page;
}
