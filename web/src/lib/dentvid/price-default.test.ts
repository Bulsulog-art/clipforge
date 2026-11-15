import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo";
import { countryFromLocale, dvPriceContext } from "./price-region";

const CSS = fs.readFileSync(path.resolve(__dirname, "../../app/dentvideo/dentvideo.css"), "utf8");

/** The selectors of every rule in the stylesheet whose body is `display: <value>`. */
function selectorsWith(display: "none" | "inline"): string[] {
  return [...CSS.matchAll(/([^{}]+)\{\s*display:\s*(none|inline);\s*\}/g)].filter((m) => m[2] === display).flatMap((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, "").split(",").map((s) => s.trim()));
}

describe("prices before JavaScript (crawlers, ad reviewers, no-JS): the page's language picks the currency", () => {
  it.each(LOCALES)("%s: the server-rendered default matches countryFromLocale", (l) => {
    const { currency, tax } = dvPriceContext(countryFromLocale(l));
    const shown = selectorsWith("inline");
    const hidden = selectorsWith("none");
    if (currency === "USD") {
      // Nothing language-keyed: USD and "+ applicable tax" show as for everyone.
      expect([...shown, ...hidden].filter((s) => s.includes(`:lang(${l})`)), l).toEqual([]);
      return;
    }
    expect(shown, l).toContain(`html:lang(${l}):not([data-dv-cur]) .dv-cur-${currency}`);
    expect(hidden, l).toContain(`html:lang(${l}):not([data-dv-cur]) .dv-cur-USD`);
    expect(shown, l).toContain(`html:lang(${l}):not([data-dv-tax]) .dv-tax-${tax}`);
    expect(hidden, l).toContain(`html:lang(${l}):not([data-dv-tax]) .dv-tax-other`);
  });

  it("Turkish pages default to TL, German / Spanish / French pages to EUR", () => {
    expect(dvPriceContext(countryFromLocale("tr")).currency).toBe("TRY");
    for (const l of ["de", "es", "fr"]) expect(dvPriceContext(countryFromLocale(l)).currency, l).toBe("EUR");
    for (const l of ["en", "ja", "ar", "pl"]) expect(dvPriceContext(countryFromLocale(l)).currency, l).toBe("USD");
  });
});
