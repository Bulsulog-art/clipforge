import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo";
import { PRICE_BOOT_SCRIPT } from "./price-boot";
import { dvPriceContext, guessCountry } from "./price-region";

/** Runs the inline script against a fake <html> and time zone; returns what it set. */
function run(locale: string, timeZone: string, preset: Record<string, string> = {}) {
  const dataset: Record<string, string> = { ...preset };
  const fakeIntl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) };
  new Function("document", "Intl", PRICE_BOOT_SCRIPT)({ documentElement: { dataset, lang: locale } }, fakeIntl);
  return dataset;
}

const ZONES = ["Europe/Istanbul", "Europe/Berlin", "Europe/Vienna", "Atlantic/Canary", "Asia/Nicosia", "Europe/Warsaw", "Europe/Stockholm", "Europe/Zurich", "Europe/London", "America/New_York", "Asia/Tokyo", "UTC", ""];

describe("price boot script: the pre-paint currency is guessCountry() without the IP", () => {
  for (const locale of LOCALES) {
    it.each(ZONES)(`${locale} in %s`, (tz) => {
      const got = run(locale, tz);
      const country = guessCountry({ geo: null, timeZone: tz, locale });
      if (!country) {
        // Nothing known: the stylesheet's default (USD, "+ applicable tax") stays.
        expect(got).toEqual({});
        return;
      }
      const { currency, tax } = dvPriceContext(country);
      expect(got).toEqual({ dvCur: currency, dvTax: tax });
    });
  }

  it("never overrides a currency already set, and never throws", () => {
    expect(run("en", "Europe/Istanbul", { dvCur: "USD", dvTax: "other" })).toEqual({ dvCur: "USD", dvTax: "other" });
    expect(() => new Function("document", "Intl", PRICE_BOOT_SCRIPT)({ documentElement: { dataset: {}, lang: "tr" } }, {})).not.toThrow();
    // ClipForge's pages (lang="en") and unknown languages: only a TR / EU time zone sets anything.
    expect(run("xx", "America/New_York")).toEqual({});
  });
});
