/**
 * DentVideo's legal pages: Terms, Privacy, Refunds, DPA and Imprint, in every
 * site language. English is the authoritative text; each translation says so.
 *
 * Text conventions (resolved by content/legal/index.ts and the page renderer):
 * - {token}: operator data, prices and contact addresses, filled from one
 *   source (content/guides/entity OPERATOR, lib/dentvid/billing), so no
 *   translation can drift from the register extract or the real prices.
 * - [label](terms|privacy|refunds|dpa|imprint): a link to that legal page in
 *   the same language.
 *
 * Every factual statement must stay true to the code: what is stored, which
 * providers receive it, how billing and deletion work. When one of those
 * changes, update all languages and LEGAL_UPDATED.
 */

export const LEGAL_KINDS = ["terms", "privacy", "refunds", "dpa", "imprint"] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];

/** The date the legal texts last changed in substance. */
export const LEGAL_UPDATED = "2026-11-10";

/** Providers that process personal data for DentVideo (the DPA's sub-processor list). */
export const SUBPROCESSOR_IDS = ["hostinger", "openai", "resend", "dodo", "sentry"] as const;
export type SubprocessorId = (typeof SUBPROCESSOR_IDS)[number];

/** Fixed facts per provider; purpose, data and location wording is per language. */
export const SUBPROCESSORS: Record<SubprocessorId, { name: string; url: string }> = {
  hostinger: { name: "Hostinger", url: "https://www.hostinger.com/legal/privacy-policy" },
  openai: { name: "OpenAI", url: "https://openai.com/policies/privacy-policy/" },
  resend: { name: "Resend", url: "https://resend.com/legal/privacy-policy" },
  dodo: { name: "Dodo Payments", url: "https://dodopayments.com/privacy-policy" },
  sentry: { name: "Sentry (Functional Software, Inc.)", url: "https://sentry.io/privacy/" },
};

export type LegalBlock =
  | string
  | { list: string[] }
  /** The operator's register data as a definition list. */
  | { operator: true }
  /** The sub-processor table. */
  | { subprocessors: true };

export type LegalSection = { heading: string; blocks: LegalBlock[] };

export type LegalDoc = {
  /** H1 and <title>. */
  title: string;
  /** Meta description. */
  description: string;
  intro: string[];
  sections: LegalSection[];
};

/** The page's own labels (footer labels and consent lines are in nav.ts, which is small enough for the browser). */
export type LegalUi = {
  updated: string;
  /** Translations only: "This is a translation; the English version prevails." with {english} as the link. */
  prevails: string | null;
  /** The link text inside `prevails`. */
  englishVersion: string;
  /** Localized country name for the address line. */
  country: string;
  operator: {
    company: string;
    legalForm: string;
    /** "Limited liability company under the laws of Montenegro" — the local form name is added after it. */
    legalFormValue: string;
    office: string;
    register: string;
    registerValue: string;
    registrationNumber: string;
    taxId: string;
    director: string;
    contact: string;
    brand: string;
    /** "{brand} — product: {product}". */
    brandValue: string;
  };
  table: { provider: string; purpose: string; data: string; location: string };
};

export type LegalText = {
  ui: LegalUi;
  docs: Record<LegalKind, LegalDoc>;
  subprocessors: Record<SubprocessorId, { purpose: string; data: string; location: string }>;
};
