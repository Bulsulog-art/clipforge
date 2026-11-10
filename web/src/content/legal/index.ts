import { LOCALES, type Locale } from "../dentvideo";
import { OPERATOR } from "../guides/entity";
import { DV_FOUNDING, DV_PRICES_USD } from "@/lib/dentvid/billing";
import { LEGAL_KINDS, type LegalKind, type LegalText } from "./types";
import { EN } from "./en";
import { DE } from "./de";
import { ES } from "./es";
import { TR } from "./tr";
import { FR } from "./fr";
import { JA } from "./ja";
import { AR } from "./ar";
import { PL } from "./pl";

import { isLegalKind } from "./nav";

export * from "./types";
export { LEGAL_NAV, isLegalKind, legalPath } from "./nav";

export const LEGAL: Record<Locale, LegalText> = { en: EN, de: DE, es: ES, tr: TR, fr: FR, ja: JA, ar: AR, pl: PL };

/** Every legal page as [locale, kind]. */
export const LEGAL_PAGES: [Locale, LegalKind][] = LOCALES.flatMap((l) => LEGAL_KINDS.map((k) => [l, k] as [Locale, LegalKind]));

const usd = (n: number | undefined) => (typeof n === "number" ? `$${n.toLocaleString("en-US")}` : "");

/** The one-line postal address, with the country in the page's language. */
export function operatorAddress(locale: Locale): string {
  return `${OPERATOR.street}, ${OPERATOR.postalCode} ${OPERATOR.city}, ${LEGAL[locale].ui.country}`;
}

/** Tokens that render as an email link. */
export const EMAIL_TOKENS = new Set(["email", "companyEmail"]);

/** Values for the {tokens} in the legal texts: operator data from the register extract, prices from billing. */
export function legalTokens(locale: Locale): Record<string, string> {
  return {
    legalName: OPERATOR.legalName,
    shortName: OPERATOR.shortName,
    brand: OPERATOR.brand,
    address: operatorAddress(locale),
    regNo: OPERATOR.registrationNumber,
    taxId: OPERATOR.taxId,
    director: OPERATOR.director,
    email: OPERATOR.productEmail,
    companyEmail: OPERATOR.companyEmail,
    starter: usd(DV_PRICES_USD.starter.month),
    practice: usd(DV_PRICES_USD.practice.month),
    practiceYear: usd(DV_PRICES_USD.practice.year),
    foundingPrice: usd(DV_FOUNDING.priceUsd),
    foundingMonths: String(DV_FOUNDING.months),
    foundingClinics: String(DV_FOUNDING.clinics),
  };
}

export type InlinePart =
  | { kind: "text"; text: string }
  | { kind: "token"; name: string; value: string }
  | { kind: "link"; label: string; to: LegalKind };

const INLINE = /(\[[^\]]+\]\((?:terms|privacy|refunds|dpa|imprint)\)|\{[A-Za-z]+\})/;

/** Split legal text into plain text, {tokens} and [links](kind). Unknown tokens throw: a typo must fail the tests, not reach the page. */
export function parseLegal(text: string, locale: Locale): InlinePart[] {
  const tokens = legalTokens(locale);
  return text
    .split(INLINE)
    .filter((p) => p !== "")
    .map((p): InlinePart => {
      const link = /^\[([^\]]+)\]\(([a-z]+)\)$/.exec(p);
      if (link && isLegalKind(link[2])) return { kind: "link", label: link[1], to: link[2] };
      const tok = /^\{([A-Za-z]+)\}$/.exec(p);
      if (tok) {
        if (!(tok[1] in tokens)) throw new Error(`Unknown legal token {${tok[1]}}`);
        return { kind: "token", name: tok[1], value: tokens[tok[1]] };
      }
      return { kind: "text", text: p };
    });
}

/** Legal text with tokens filled and links reduced to their label (metadata, tests, llms.txt). */
export function legalPlain(text: string, locale: Locale): string {
  return parseLegal(text, locale)
    .map((p) => (p.kind === "text" ? p.text : p.kind === "token" ? p.value : p.label))
    .join("");
}

