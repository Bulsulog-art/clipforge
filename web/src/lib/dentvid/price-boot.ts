// The price tags' currency before the first paint (server only: the script is inlined in the page).
//
// The pages are CDN-cached, so the server cannot know the visitor; <PriceRegion> asks the IP-based
// country after hydration and swaps the visible variant. Where that swap changed the text ("$79" →
// "2.490 TL") the hero's price line could wrap differently and push the first screen down (a layout
// shift of ~0.15 on a phone reading the English landing from Türkiye). This inline script makes the
// same guess guessCountry() makes without the IP — the time zone, else the page's language — while
// the page is parsed, so the IP answer only moves anything when it disagrees with the time zone.

import { DV_TIME_ZONE_COUNTRY, countryFromLocale, dvPriceContext } from "./price-region";

/** City of an IANA zone ("Istanbul") → [currency, tax kind]. */
const BY_CITY: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(DV_TIME_ZONE_COUNTRY).map(([city, country]) => {
    const { currency, tax } = dvPriceContext(country);
    return [city, [currency, tax]];
  }),
);

export function priceBootScript(locale: string): string {
  const page = countryFromLocale(locale);
  const fallback = page ? (({ currency, tax }) => [currency, tax])(dvPriceContext(page)) : null;
  return (
    `(function(d){try{var m=${JSON.stringify(BY_CITY)},` +
    `z=(Intl.DateTimeFormat().resolvedOptions().timeZone||"").split("/")[1]||"",` +
    `v=Object.prototype.hasOwnProperty.call(m,z)?m[z]:${JSON.stringify(fallback)};` +
    `if(v&&!d.dvCur){d.dvCur=v[0];d.dvTax=v[1]}}catch(e){}})(document.documentElement.dataset)`
  );
}
