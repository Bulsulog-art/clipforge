// DentVideo's price tags: the currency before the first paint (server only: the script is inlined
// in the root layout's <head>, app/layout.tsx).
//
// The pages are CDN-cached, so the server cannot know the visitor; <PriceRegion> asks the IP-based
// country after hydration and swaps the visible variant. Where that swap changed the text ("$49" →
// "1.490 TL") the hero's price line could wrap differently and push the first screen down (a layout
// shift of ~0.15 on a phone reading the English landing from Türkiye). This script makes the guess
// guessCountry() makes without the IP — the time zone, else the page's language (<html lang>, which
// is server-rendered) — before the body is parsed, so the IP answer only moves anything when it
// disagrees with the time zone.
//
// In <head>, not next to the prices: an inline script in the body is a point where the parser
// yields and the browser paints what it has, which split the landing's first screen over two paints.

import { LOCALES } from "@/content/dentvideo-locales";
import { DV_TIME_ZONE_COUNTRY, countryFromLocale, dvPriceContext } from "./price-region";

const pair = (country: string | null): [string, string] | null => {
  if (!country) return null;
  const { currency, tax } = dvPriceContext(country);
  return [currency, tax];
};

/** City of an IANA zone ("Istanbul") → [currency, tax kind]. */
const BY_CITY = Object.fromEntries(Object.entries(DV_TIME_ZONE_COUNTRY).map(([city, country]) => [city, pair(country)]));
/** Page language → [currency, tax kind], for the languages with a market of their own (tr, de, es, fr). */
const BY_LANG = Object.fromEntries(LOCALES.map((l) => [l, pair(countryFromLocale(l))]).filter(([, v]) => v));

export const PRICE_BOOT_SCRIPT =
  `(function(d){try{var h=Object.prototype.hasOwnProperty,m=${JSON.stringify(BY_CITY)},l=${JSON.stringify(BY_LANG)},` +
  `z=(Intl.DateTimeFormat().resolvedOptions().timeZone||"").split("/")[1]||"",g=document.documentElement.lang,` +
  `v=h.call(m,z)?m[z]:h.call(l,g)?l[g]:null;` +
  `if(v&&!d.dvCur){d.dvCur=v[0];d.dvTax=v[1]}}catch(e){}})(document.documentElement.dataset)`;
