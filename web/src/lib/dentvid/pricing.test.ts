import { describe, expect, it, vi } from "vitest";

// next/font only works inside Next's compiler: any font is a class name here.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font", variable: "font", style: {} });
  return { IBM_Plex_Sans_Arabic: font, Noto_Sans_JP: font, Instrument_Serif: font, Plus_Jakarta_Sans: font };
});
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LANDING, LOCALES } from "@/content/dentvideo";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { PlanPanel } from "@/components/dentvid/plan-panel";
import { DV_PRICES_USD, buildDvCheckout, dvAvailablePlans, dvProductId } from "./billing";
import {
  DV_BASE_CURRENCY,
  DV_CURRENCIES,
  DV_LIST_PRICES,
  DV_TAX_LABEL,
  countryFromTimeZone,
  dodoMinorAmount,
  dvCurrencyForCountry,
  dvLowestPrice,
  dvPriceContext,
  dvTierPrice,
  formatDvPrice,
  guessCountry,
  type DvCurrency,
} from "./pricing";

(globalThis as { React?: typeof React }).React = React;

/**
 * What Dodo must hold (the lead configures it at deploy time; see the PR):
 * the products' base USD price, and one Localized Pricing rule per currency
 * (pricing_mode "by_currency"), all tax-exclusive, in minor units.
 */
const DODO = {
  pdt_0NrVahwZsINvy3TNz2H35: { USD: 4900, EUR: 4900, TRY: 149000 },
  pdt_0NrVai0xqpQKU8H3Zj3QN: { USD: 7900, EUR: 7900, TRY: 249000 },
} as const;

describe("list prices", () => {
  it("are the decided prices, monthly only: $49 / €49 / 1.490 TL and $79 / €79 / 2.490 TL", () => {
    expect(DV_LIST_PRICES).toEqual({ starter: { USD: 49, EUR: 49, TRY: 1490 }, practice: { USD: 79, EUR: 79, TRY: 2490 } });
    expect(DV_BASE_CURRENCY).toBe("USD");
    expect(DV_PRICES_USD.starter.month).toBe(DV_LIST_PRICES.starter.USD);
    expect(DV_PRICES_USD.practice.month).toBe(DV_LIST_PRICES.practice.USD);
    expect(dvLowestPrice("TRY")).toBe(1490);
  });

  it("match what Dodo is configured to charge, per product and currency (minor units)", () => {
    for (const tier of ["starter", "practice"] as const) {
      const product = dvProductId(tier, "month", {}) as keyof typeof DODO;
      for (const c of DV_CURRENCIES) expect(dodoMinorAmount(tier, c), `${tier} ${c}`).toBe(DODO[product][c]);
    }
  });
});

describe("currency selection", () => {
  it("TRY in Türkiye, EUR in the euro area, USD everywhere else and when unknown", () => {
    expect(dvCurrencyForCountry("TR")).toBe("TRY");
    for (const c of ["DE", "AT", "ES", "FR", "IT", "NL", "IE", "PT", "BG", "HR", "de"]) expect(dvCurrencyForCountry(c), c).toBe("EUR");
    for (const c of ["US", "GB", "CH", "PL", "SE", "CZ", "CA", "AE", "JP", "SA"]) expect(dvCurrencyForCountry(c), c).toBe("USD");
    for (const c of [null, undefined, "", "XXX", "1A"]) expect(dvCurrencyForCountry(c), String(c)).toBe("USD");
  });

  it("the tax line: applicable tax in Türkiye, VAT in every EU country (even when billed in USD), else applicable tax", () => {
    expect(dvPriceContext("TR")).toEqual({ currency: "TRY", tax: "tr" });
    expect(dvPriceContext("DE")).toEqual({ currency: "EUR", tax: "eu" });
    expect(dvPriceContext("PL")).toEqual({ currency: "USD", tax: "eu" });
    expect(dvPriceContext("US")).toEqual({ currency: "USD", tax: "other" });
    expect(dvPriceContext(null)).toEqual({ currency: "USD", tax: "other" });
    // Dodo adds no KDV for Türkiye today (checkout preview, 2026-11-15), so TR says "applicable tax", not KDV.
    expect(DV_TAX_LABEL.en).toEqual({ tr: "+ applicable tax", eu: "+ VAT", other: "+ applicable tax" });
    for (const l of LOCALES) for (const k of ["tr", "eu", "other"] as const) expect(DV_TAX_LABEL[l][k].trim(), `${l} ${k}`).not.toBe("");
  });

  it("in the browser: the server's country first, else a TR/EU time zone, else the page's language", () => {
    expect(guessCountry({ geo: "de", timeZone: "Europe/Istanbul", locale: "tr" })).toBe("DE");
    expect(guessCountry({ geo: null, timeZone: "Europe/Istanbul", locale: "en" })).toBe("TR");
    expect(guessCountry({ geo: "XX!", timeZone: "Europe/Madrid", locale: "en" })).toBe("ES");
    // A zone outside Türkiye and the EU (UTC, America/*: an ad reviewer, a VPN) falls back to the page's language…
    expect(guessCountry({ geo: null, timeZone: "America/New_York", locale: "de" })).toBe("DE");
    expect(guessCountry({ geo: null, timeZone: "UTC", locale: "tr" })).toBe("TR");
    expect(guessCountry({ geo: null, timeZone: "Etc/UTC", locale: "fr" })).toBe("FR");
    expect(guessCountry({ geo: null, timeZone: "America/Los_Angeles", locale: "en" })).toBeNull();
    expect(guessCountry({ geo: null, timeZone: "UTC", locale: "pl" })).toBeNull();
    // …a TR/EU zone still wins over the language, and a known IP country over both.
    expect(guessCountry({ geo: null, timeZone: "Europe/Berlin", locale: "tr" })).toBe("DE");
    // An IP outside the TL/EUR markets (US reviewer, VPN) never turns /tr or /de into dollars…
    expect(guessCountry({ geo: "US", timeZone: "UTC", locale: "tr" })).toBe("TR");
    expect(guessCountry({ geo: "US", timeZone: "America/Los_Angeles", locale: "de" })).toBe("DE");
    // …but it does decide on pages without a market of their own, and a TL/EUR IP decides everywhere.
    expect(guessCountry({ geo: "US", timeZone: "Europe/Istanbul", locale: "en" })).toBe("US");
    expect(guessCountry({ geo: "TR", timeZone: "UTC", locale: "de" })).toBe("TR");
    expect(guessCountry({ geo: "AT", timeZone: "UTC", locale: "tr" })).toBe("AT");
    expect(guessCountry({ geo: null, timeZone: null, locale: "tr" })).toBe("TR");
    expect(guessCountry({ geo: null, timeZone: null, locale: "es" })).toBe("ES");
    expect(guessCountry({ geo: null, timeZone: null, locale: "en" })).toBeNull();
    expect(countryFromTimeZone("Asia/Istanbul")).toBe("TR");
    expect(countryFromTimeZone("Europe/London")).toBeNull();
  });

  it("the checkout charges the currency the clinic's country is shown in", () => {
    for (const country of ["TR", "DE", "ES", "US", "GB", "PL", null]) {
      const r = buildDvCheckout({ tier: "practice", interval: "month", clinicId: "c", ownerId: "o", country }, {});
      expect(r.ok && r.body.billing_currency, String(country)).toBe(dvPriceContext(country).currency);
    }
  });
});

describe("formatting", () => {
  it("reads naturally in each language; TL is always '1.490 TL'", () => {
    expect(formatDvPrice("en", "USD", 49)).toBe("$49");
    expect(formatDvPrice("en", "EUR", 49)).toBe("€49");
    expect(formatDvPrice("de", "EUR", 79).replace(/\s/g, " ")).toBe("79 €");
    expect(formatDvPrice("ar", "USD", 49)).toBe("$49");
    for (const l of LOCALES) expect(formatDvPrice(l, "TRY", 1490), l).toBe("1.490 TL");
    for (const l of LOCALES) expect(formatDvPrice(l, "TRY", 2490), l).toBe("2.490 TL");
  });
});

const digits = (s: string) => Number(s.replace(/\D/g, ""));
const variants = (html: string, scope: string) =>
  Object.fromEntries([...scope.matchAll(/data-cur="(USD|EUR|TRY)">([^<]+)</g)].map((m) => [m[1], m[2]])) as Record<DvCurrency, string>;

describe("every displayed price is the configured price, per currency", () => {
  it.each(LOCALES)("%s landing: each plan card holds its list price in USD (shown), EUR and TL, and the hero's 'from' is Starter's", (l) => {
    const page = renderToStaticMarkup(createElement(DentVideoLanding, { locale: l }));
    const pricing = page.slice(page.indexOf('id="pricing"'), page.indexOf('id="trust"'));
    for (const tier of ["starter", "practice"] as const) {
      const card = pricing.slice(pricing.indexOf(`data-tier="${tier}"`), pricing.indexOf(tier === "starter" ? 'data-tier="practice"' : 'data-tier="group"'));
      const v = variants(page, card);
      expect(Object.keys(v).sort(), `${l} ${tier}`).toEqual(["EUR", "TRY", "USD"]);
      for (const c of DV_CURRENCIES) {
        expect(v[c], `${l} ${tier} ${c}`).toBe(dvTierPrice(l, tier, c));
        expect(digits(v[c]), `${l} ${tier} ${c}`).toBe(DV_LIST_PRICES[tier][c]);
      }
      // USD and "+ applicable tax" are what shows without JavaScript (dentvideo.css hides the others).
      expect(card).toContain('class="dv-cur dv-cur-USD"');
      expect(card).toContain(DV_TAX_LABEL[l].other);
    }
    const hero = page.slice(0, page.indexOf('id="try"'));
    const from = variants(page, hero.slice(hero.indexOf('data-cta="hero"')));
    for (const c of DV_CURRENCIES) expect(digits(from[c]), `${l} from ${c}`).toBe(DV_LIST_PRICES.starter[c]);
    // The note under the cards names each currency once; no figure is typed anywhere in the copy.
    expect(pricing).toContain(LANDING[l].pricing.note.replace("{currency}", "TL").replace(/'/g, "&#x27;"));
    expect(page).not.toMatch(/\{price\}|\{currency\}|KURUCU|discount code|Rabattcode|indirim kodu/i);
  });

  it.each(LOCALES)("%s plan step: the clinic's country sets the currency shown, the same one its checkout charges", (l) => {
    for (const [country, currency] of [["TR", "TRY"], ["DE", "EUR"], ["US", "USD"], [null, "USD"]] as const) {
      const panel = renderToStaticMarkup(createElement(PlanPanel, { locale: l, state: "trial", options: dvAvailablePlans({}), country }));
      const shown = [...panel.matchAll(/data-price="(starter|practice)"[^>]*>([^<]+)</g)].map((m) => [m[1], m[2]]);
      expect(shown, `${l} ${country}`).toEqual([
        ["starter", dvTierPrice(l, "starter", currency)],
        ["practice", dvTierPrice(l, "practice", currency)],
      ]);
      expect(panel, `${l} ${country}`).toContain(DV_TAX_LABEL[l][dvPriceContext(country).tax]);
      // No code field, nothing about discounts.
      expect(panel, `${l} ${country}`).not.toMatch(/<input|<details|KURUCU/);
    }
  });
});
