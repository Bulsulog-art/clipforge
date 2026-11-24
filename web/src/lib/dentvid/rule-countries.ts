/**
 * The countries whose own health-advertising rules the compliance reviewer is
 * given with every script (worker/src/dental/locale.ts marketRules; the six
 * Gulf states share one set). The same list as the help center's badges
 * (content/dentvideo-showcase.ts RULE_MARKETS); rule-countries.test.ts keeps
 * both in step with the worker.
 *
 * A clinic in one of them reads "advertising rules (Germany)" under its
 * videos; anywhere else the reviewer applies the general rules only, and the
 * line says so. Tiny on purpose: it ships with the library and the review.
 */
export const RULE_COUNTRIES = ["TR", "DE", "AT", "CH", "ES", "MX", "JP", "PL", "SG", "GB", "US", "AE", "SA", "QA", "KW", "BH", "OM"] as const;
export type RuleCountry = (typeof RULE_COUNTRIES)[number];

/** The clinic's country as a rule country ("uk" reads as GB, as hard-rules.ts marketCode), or null when the reviewer has no rules of its own for it. */
export function ruleCountry(country: string | null | undefined): RuleCountry | null {
  const c = (country ?? "").trim().toUpperCase();
  const code = c === "UK" ? "GB" : c;
  return (RULE_COUNTRIES as readonly string[]).includes(code) ? (code as RuleCountry) : null;
}

/** The country's name in the page's language ("Deutschland", "Almanya"), from the browser's own region names. */
export function countryName(locale: string, code: RuleCountry): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
