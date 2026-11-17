import type { Locale } from "@/content/dentvideo-locales";
import type { MarketRuleId, RuleId } from "./hard-rules";

/**
 * The markets the free ad checker knows (dentvideo.com/ad-checker), and how
 * strictly each one treats what the checker finds.
 *
 * Small and browser-safe: the interactive checker imports it on load. The
 * sources themselves (labels and URLs) are content, in
 * content/dentvideo-checker.ts (CHECKER_SOURCES); here they are named by key.
 *
 * Two levels for a flagged phrase, never more certain than the sources:
 * - "banned": the market's own official text names this kind of claim as
 *   not allowed (the key says which text; every pair below cites it), or it
 *   is one of that market's own deterministic checks (MARKET_HARD_RULES,
 *   each written from an article). Shown as "Not allowed in <market>".
 * - "risky": restricted or commonly objected to, but allowed in some form
 *   or context there (prices in Germany, testimonials under the CAP Code,
 *   before-and-after on Japanese clinic websites with disclosures…).
 * A clean text is "nothing this filter knows", never "allowed".
 */

/** Keys of CHECKER_SOURCES (content/dentvideo-checker.ts). */
export type SourceKey =
  | "GDC_ADV"
  | "CAP"
  | "FTC_HEALTH"
  | "FTC_EIR"
  | "ADA"
  | "RG_TR"
  | "TDB"
  | "HWG"
  | "BZAEK"
  | "RIS"
  | "FEDLEX"
  | "BOE"
  | "CGD"
  | "TS_FAMOSOS"
  | "COFEPRIS"
  | "R4127_215_1"
  | "ONCD"
  | "KEL"
  | "UDL"
  | "MHLW"
  | "DHA"
  | "MOH_SA";

/** Every rule the public checker can report: the hard rules, fear, and the market packs. */
export type CheckerRuleId = RuleId | MarketRuleId;

/** ISO 3166 codes of the markets with official sources on the checker pages, plus "XX": another country (general rules only). */
export const CHECKER_MARKETS = ["US", "GB", "TR", "DE", "AT", "CH", "ES", "MX", "FR", "PL", "JP", "AE", "SA", "XX"] as const;
export type CheckerMarket = (typeof CHECKER_MARKETS)[number];
export const OTHER_MARKET: CheckerMarket = "XX";

export function isCheckerMarket(v: unknown): v is CheckerMarket {
  return typeof v === "string" && (CHECKER_MARKETS as readonly string[]).includes(v);
}

/** The market a page starts with; the visitor can change it, and a shared link carries its own. */
export const DEFAULT_MARKET: Record<Locale, CheckerMarket> = {
  en: "US",
  tr: "TR",
  de: "DE",
  es: "ES",
  fr: "FR",
  ja: "JP",
  ar: "AE",
  pl: "PL",
};

/** The markets listed first on a page (its language's own), then the rest. */
export const PAGE_MARKETS: Record<Locale, readonly CheckerMarket[]> = {
  en: ["US", "GB"],
  tr: ["TR"],
  de: ["DE", "AT", "CH"],
  es: ["ES", "MX"],
  fr: ["FR"],
  ja: ["JP"],
  ar: ["AE", "SA"],
  pl: ["PL"],
};

/** The market's official texts, the general one first (shown for a "risky" phrase). */
export const MARKET_SOURCES: Record<CheckerMarket, readonly SourceKey[]> = {
  US: ["FTC_HEALTH", "FTC_EIR", "ADA"],
  GB: ["GDC_ADV", "CAP"],
  TR: ["RG_TR", "TDB"],
  DE: ["HWG", "BZAEK"],
  AT: ["RIS"],
  CH: ["FEDLEX"],
  ES: ["BOE", "CGD", "TS_FAMOSOS"],
  MX: ["COFEPRIS"],
  FR: ["R4127_215_1", "ONCD"],
  PL: ["KEL", "UDL"],
  JP: ["MHLW"],
  AE: ["DHA"],
  SA: ["MOH_SA"],
  XX: [],
};

/**
 * What a market's official text names as not allowed, and which text says so.
 * Conservative on purpose: a rule is listed only where the cited text (as the
 * checker page and the market's guide summarise it) names that kind of claim.
 */
export const MARKET_BANNED: Record<CheckerMarket, Partial<Record<CheckerRuleId, SourceKey>>> = {
  // RG 12.11.2025 no. 33075: fees, discounts, campaigns (md. 5/1-m); patient thanks and
  // satisfaction (5/1-e, 7/1-ğ); plus its own pack (sponsored, likes and comments, raffles, steering to book).
  TR: { price: "RG_TR", testimonial: "RG_TR", sponsored: "RG_TR", engagement: "RG_TR", giveaway: "RG_TR", booking: "RG_TR" },
  // § 3 HWG (success presented as certain); MBO-Z §§ 20–22 (comparative advertising);
  // the DACH specialist rule and § 11 Abs. 1 Nr. 12 HWG (advertising aimed at children).
  DE: { guarantee: "HWG", superlative: "BZAEK", specialist: "BZAEK", children: "HWG" },
  AT: { specialist: "RIS" },
  CH: { specialist: "FEDLEX" },
  // RD 1907/1996 art. 4: no assurances of relief or certain cure.
  ES: { guarantee: "BOE", cure: "BOE" },
  MX: { permit: "COFEPRIS" },
  // CSP R. 4127-215-1: no testimonials of third parties, no comparisons with other dentists.
  FR: { testimonial: "R4127_215_1", superlative: "R4127_215_1" },
  // KEL 2025 art. 71: information without comparisons.
  PL: { superlative: "KEL" },
  // 医療広告ガイドライン: 比較優良広告, 誇大広告, 体験談.
  JP: { superlative: "MHLW", absolute: "MHLW", cure: "MHLW", testimonial: "MHLW" },
  // DHA social-media standards: "the best" and superiority over other doctors or facilities.
  AE: { superlative: "DHA" },
  // GDC guidance (specialist lists); CAP Code 12.12 (prescription-only medicines).
  GB: { specialist: "GDC_ADV", pom: "CAP" },
  // ADA Code 5.H (specialty announcements).
  US: { specialist: "ADA" },
  SA: {},
  XX: {},
};

export type Verdict = "ok" | "risky" | "banned";
const RANK: Record<Verdict, number> = { ok: 0, risky: 1, banned: 2 };

/** How strictly `market` treats a phrase that `rule` flagged. */
export function verdictOf(rule: CheckerRuleId, market: CheckerMarket): Exclude<Verdict, "ok"> {
  return MARKET_BANNED[market][rule] ? "banned" : "risky";
}

/** The stricter of two verdicts. */
export function worse(a: Verdict, b: Verdict): Verdict {
  return RANK[b] > RANK[a] ? b : a;
}

/** The official text to show beside a flagged phrase in `market`: the one that names it, else the market's general one. */
export function sourceFor(rule: CheckerRuleId, market: CheckerMarket): SourceKey | null {
  return MARKET_BANNED[market][rule] ?? MARKET_SOURCES[market][0] ?? null;
}

/**
 * The visitor's market from the browser's language tag ("en-GB" → GB), when
 * it is one the checker knows; else null (the page's default stays).
 */
export function marketFromLanguageTag(tag: string | undefined): CheckerMarket | null {
  const region = /^[a-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(tag ?? "")?.[1]?.toUpperCase();
  const code = region === "UK" ? "GB" : region;
  return code && code !== OTHER_MARKET && isCheckerMarket(code) ? code : null;
}
