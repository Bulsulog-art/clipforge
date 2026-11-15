/**
 * DentVideo's list prices per currency, and how a country maps to the
 * currency it is shown and charged in.
 *
 * The one source of truth for every price a page, an email or llms.txt shows,
 * and for what the checkout asks Dodo to charge (billing.ts buildDvCheckout).
 * Dodo holds the same numbers: the base USD price on each product and a
 * Localized Pricing rule (pricing_mode "by_currency") for EUR and TRY on the
 * same product. pricing.test.ts pins both sides.
 *
 * Which country gets which currency and tax line lives in price-region.ts
 * (shipped to the browser for the landing's region check); this module is
 * server-side (pages, emails, llms.txt, checkout).
 *
 * Monthly only, tax-exclusive (Dodo, as merchant of record, adds the tax at
 * checkout). No discounts in any form.
 */

import type { Locale } from "@/content/dentvideo-locales";

import type { DvCurrency, DvTaxKind } from "./price-region";
export * from "./price-region";

export const DV_CURRENCIES = ["USD", "EUR", "TRY"] as const satisfies readonly DvCurrency[];

/** The products' base currency at Dodo. EUR and TRY are Localized Pricing rules on the same products. */
export const DV_BASE_CURRENCY: DvCurrency = "USD";

/** Self-serve tiers with a list price. Group is "Priced per location": no number anywhere. */
export type DvPricedTier = "starter" | "practice";

/** Owner-approved monthly list prices, in whole units of each currency. */
export const DV_LIST_PRICES: Record<DvPricedTier, Record<DvCurrency, number>> = {
  starter: { USD: 49, EUR: 49, TRY: 1490 },
  practice: { USD: 79, EUR: 79, TRY: 2490 },
};

/** A list price in Dodo's smallest unit (cents, kuruş): what the Dodo product / localized rule must hold. */
export function dodoMinorAmount(tier: DvPricedTier, currency: DvCurrency): number {
  return DV_LIST_PRICES[tier][currency] * 100;
}

/**
 * "$49", "49 €", "€49", "1.490 TL" in the reader's language. Turkish lira is
 * always written "1.490 TL" (how Turkish B2B prices read, and the memo's
 * copy), never "₺1.490". Arabic pages keep Western digits and the symbol
 * first, as the landing always did.
 */
export function formatDvPrice(locale: string, currency: DvCurrency, amount: number): string {
  if (currency === "TRY") return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(amount)} TL`;
  return new Intl.NumberFormat(locale === "ar" ? "en-US" : locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

/** A tier's list price in a context, formatted. */
export function dvTierPrice(locale: string, tier: DvPricedTier, currency: DvCurrency): string {
  return formatDvPrice(locale, currency, DV_LIST_PRICES[tier][currency]);
}

/** The lowest monthly list price ("plans from …"): Starter's. */
export function dvLowestPrice(currency: DvCurrency): number {
  return Math.min(...Object.values(DV_LIST_PRICES).map((p) => p[currency]));
}

/** The short tax line after "/month", in the page's language. */
export const DV_TAX_LABEL: Record<Locale, Record<DvTaxKind, string>> = {
  en: { tr: "+ applicable tax", eu: "+ VAT", other: "+ applicable tax" },
  de: { tr: "zzgl. anfallender Steuern", eu: "zzgl. MwSt.", other: "zzgl. anfallender Steuern" },
  es: { tr: "+ impuestos aplicables", eu: "+ IVA", other: "+ impuestos aplicables" },
  tr: { tr: "+ geçerli vergiler", eu: "+ KDV (AB)", other: "+ geçerli vergiler" },
  fr: { tr: "+ taxes applicables", eu: "+ TVA", other: "+ taxes applicables" },
  ja: { tr: "（税別）", eu: "＋VAT（税別）", other: "（税別）" },
  ar: { tr: "+ الضرائب المطبّقة", eu: "+ ضريبة القيمة المضافة", other: "+ الضرائب المطبّقة" },
  pl: { tr: "+ obowiązujące podatki", eu: "+ VAT", other: "+ obowiązujące podatki" },
};
