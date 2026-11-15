import type { Locale } from "@/content/dentvideo-locales";
import { DV_CURRENCIES, DV_TAX_LABEL, dvLowestPrice, dvTierPrice, formatDvPrice, type DvCurrency, type DvPricedTier, type DvTaxKind } from "@/lib/dentvid/pricing";
import { PriceRegion } from "./price-region";

/**
 * Prices on the public pages, in the currency the visitor will be charged in.
 *
 * The pages are the same for everyone (CDN-cached), so every variant is
 * rendered on the server — USD shown, EUR and TL hidden (dentvideo.css) — and
 * <PriceRegion> (a few hundred bytes in the browser) marks <html> with the
 * visitor's currency and tax line once it knows the country, which swaps the
 * visible variant. No price is ever computed in the browser: each variant is
 * a list price from pricing.ts, the same numbers Dodo charges.
 */

const TAX_KINDS: DvTaxKind[] = ["other", "eu", "tr"];

/** USD visible; EUR / TRY shown only when <html data-dv-cur> says so. */
function Variants({ render }: { render: (c: DvCurrency) => React.ReactNode }) {
  return (
    <>
      {DV_CURRENCIES.map((c) => (
        <span key={c} className={`dv-cur dv-cur-${c}`} data-cur={c}>
          {render(c)}
        </span>
      ))}
    </>
  );
}

/** "$79", "79 €", "2.490 TL": a tier's monthly list price. */
export function TierPrice({ locale, tier }: { locale: Locale; tier: DvPricedTier }) {
  return <Variants render={(c) => dvTierPrice(locale, tier, c)} />;
}

/** A sentence with a {price} slot filled with the lowest monthly list price ("From $79/month"). */
export function FromPrice({ locale, template }: { locale: Locale; template: string }) {
  const [before, after = ""] = template.split("{price}");
  return (
    <>
      {before}
      <span dir="ltr">
        <Variants render={(c) => formatDvPrice(locale, c, dvLowestPrice(c))} />
      </span>
      {after}
    </>
  );
}

/** "+ VAT", "+ KDV", "+ applicable tax": the tax line after "/month". */
export function TaxSuffix({ locale }: { locale: Locale }) {
  return (
    <>
      {TAX_KINDS.map((k) => (
        <span key={k} className={`dv-tax dv-tax-${k}`} data-tax-kind={k}>
          {DV_TAX_LABEL[locale][k]}
        </span>
      ))}
    </>
  );
}

/** A sentence with a {currency} slot ("Prices in EUR, excluding tax."). */
export function CurrencyNote({ template }: { template: string }) {
  return <Variants render={(c) => template.replace("{currency}", c === "TRY" ? "TL" : c)} />;
}

export { PriceRegion };
