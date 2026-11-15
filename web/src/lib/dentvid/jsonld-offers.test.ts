import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { SOLUTIONS } from "@/content/solutions";
import { DV_LIST_PRICES } from "./pricing";
import { landingJsonLd } from "./seo";
import { aboutJsonLd, solutionJsonLd } from "./seo-guides";

type Offer = { "@type": string; name: string; price: number; priceCurrency: string; priceSpecification: { "@type": string; price: number; priceCurrency: string; billingDuration: string; valueAddedTaxIncluded: boolean } };
const appOffers = (graph: unknown): Offer[] =>
  ((graph as { "@graph": { "@type": string; offers?: Offer[] }[] })["@graph"].find((n) => n["@type"] === "SoftwareApplication")?.offers ?? []) as Offer[];

const EXPECTED: Record<Locale, string[]> = { en: ["USD"], de: ["USD", "EUR"], es: ["USD", "EUR"], fr: ["USD", "EUR"], tr: ["USD", "TRY"], ja: ["USD"], ar: ["USD"], pl: ["USD"] };

describe("JSON-LD offers: the page's local currency next to USD", () => {
  it.each(LOCALES)("%s: one Offer per plan and currency, with the list prices from pricing.ts", (l) => {
    for (const graph of [landingJsonLd(l), aboutJsonLd(l), ...SOLUTIONS.filter((p) => p.locale === l).map(solutionJsonLd)]) {
      const offers = appOffers(graph);
      expect([...new Set(offers.map((o) => o.priceCurrency))], l).toEqual(EXPECTED[l]);
      for (const currency of EXPECTED[l]) {
        const these = offers.filter((o) => o.priceCurrency === currency);
        expect(these.map((o) => o.price), `${l} ${currency}`).toEqual([DV_LIST_PRICES.starter[currency as "USD"], DV_LIST_PRICES.practice[currency as "USD"]]);
      }
      for (const o of offers) {
        // Valid schema.org: a plain numeric price, an ISO 4217 code, and a matching monthly, tax-exclusive spec.
        expect(o["@type"]).toBe("Offer");
        expect(typeof o.price).toBe("number");
        expect(o.priceCurrency).toMatch(/^[A-Z]{3}$/);
        expect(o.priceSpecification).toMatchObject({ "@type": "UnitPriceSpecification", price: o.price, priceCurrency: o.priceCurrency, billingDuration: "P1M", valueAddedTaxIncluded: false });
      }
    }
  });

  it("Turkish pages list the lira prices, euro-language pages the euro prices", () => {
    expect(appOffers(landingJsonLd("tr")).filter((o) => o.priceCurrency === "TRY").map((o) => o.price)).toEqual([2490, 4490]);
    for (const l of ["de", "es", "fr"] as const) expect(appOffers(landingJsonLd(l)).filter((o) => o.priceCurrency === "EUR").map((o) => o.price), l).toEqual([79, 149]);
  });
});
