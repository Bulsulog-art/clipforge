import type OpenAI from "openai";
import { z } from "zod";
import { agentJson } from "./llm.js";
import type { ClinicProfile } from "./profile.js";

/**
 * The compliance agent. Health advertising is regulated almost everywhere,
 * and a clinic that posts "guaranteed painless whitening, 50% off" can be
 * fined or reported to its licensing body. No clinic will hand its account
 * to a tool that might do that, so nothing leaves the pipeline without
 * passing here.
 *
 * Two layers:
 *  1. Hard rules (this file, deterministic, tested): phrases that are risky
 *     in essentially every market — guarantees, absolutes, superlatives,
 *     prices and discounts, before/after promises, testimonials, cures.
 *     A hit can never be waved through by the model.
 *  2. The model reviews the whole text for what patterns cannot see
 *     (implied guarantees, fear-mongering, diagnosing the viewer, patient
 *     details) and proposes compliant rewrites.
 *
 * This is a conservative content filter, not legal advice; the clinic stays
 * responsible for what it publishes.
 */

export type RuleId =
  | "guarantee"
  | "absolute"
  | "superlative"
  | "price"
  | "before_after"
  | "testimonial"
  | "cure"
  | "fear";

type Rule = { id: RuleId; why: string; patterns: RegExp[] };

// \b does not work for Turkish letters, so Turkish patterns use explicit
// non-letter boundaries.
const L = "[\\p{L}\\p{N}]";
const tr = (s: string) => new RegExp(`(?<!${L})${s}(?!${L})`, "iu");
const en = (s: string) => new RegExp(`\\b${s}\\b`, "i");

export const HARD_RULES: Rule[] = [
  {
    id: "guarantee",
    why: "Results cannot be guaranteed in healthcare.",
    patterns: [en("guarantee[ds]?"), en("guaranteed"), en("risk[- ]free"), tr("garanti\\p{L}*"), tr("risksiz")],
  },
  {
    id: "absolute",
    why: "Absolute claims (painless, 100%, permanent, forever) overpromise outcomes.",
    patterns: [
      en("painless"),
      en("pain[- ]free"),
      en("100\\s?%"),
      /100\s?%/,
      en("permanent(ly)?"),
      en("forever"),
      en("lifetime"),
      tr("acısız"),
      tr("ağrısız"),
      tr("kalıcı"),
      tr("ömür boyu"),
      tr("kesin(likle)? sonuç"),
    ],
  },
  {
    id: "superlative",
    why: "Unverifiable superlatives and comparisons with other clinics are restricted.",
    patterns: [en("best"), en("#\\s?1"), en("number one"), en("top[- ]rated"), en("cheapest"), tr("en iyi"), tr("bir numara"), tr("en ucuz")],
  },
  {
    id: "price",
    why: "Prices, discounts and promotions in health advertising are banned or restricted in many markets.",
    patterns: [
      en("discount(s|ed)?"),
      en("\\d+\\s?% off"),
      en("free (consultation|check-?up|whitening)"),
      en("special offer"),
      en("limited time"),
      /[$€£₺]\s?\d/,
      /\d\s?(usd|eur|gbp|tl|try)\b/i,
      tr("indirim\\p{L}*"),
      tr("kampanya\\p{L}*"),
      tr("ücretsiz muayene"),
      tr("fırsat\\p{L}*"),
    ],
  },
  {
    id: "before_after",
    why: "Before/after results imply an outcome every patient will get.",
    patterns: [en("before (and|&) after"), en("before/after"), tr("öncesi (ve )?sonrası")],
  },
  {
    id: "testimonial",
    why: "Patient testimonials and reviews are restricted in health advertising in several markets.",
    patterns: [en("our patients? (say|said|love)"), en("5[- ]star"), en("testimonial"), tr("hastalarımız (diyor|anlatıyor)")],
  },
  {
    id: "cure",
    why: "Claiming to cure or eliminate a condition overstates what treatment can promise.",
    patterns: [en("cures?"), en("eliminates? (all )?pain"), tr("kesin tedavi"), tr("tamamen (yok eder|geçer|iyileştirir)")],
  },
];

export type HardHit = { rule: RuleId; match: string; why: string };

/** Deterministic scan. Pure, so it is tested directly. */
export function scanHardRules(text: string): HardHit[] {
  const hits: HardHit[] = [];
  for (const rule of HARD_RULES) {
    for (const re of rule.patterns) {
      const m = text.match(re);
      if (m) {
        hits.push({ rule: rule.id, match: m[0], why: rule.why });
        break; // one hit per rule is enough to report it
      }
    }
  }
  return hits;
}

export const reviewSchema = z.object({
  verdict: z.enum(["pass", "revise", "block"]),
  issues: z
    .array(
      z.object({
        quote: z.string().max(300),
        problem: z.string().max(300),
        fix: z.string().max(300),
      }),
    )
    .max(12)
    .default([]),
});

export type ComplianceResult = {
  verdict: "pass" | "revise" | "block";
  hard: HardHit[];
  issues: z.infer<typeof reviewSchema>["issues"];
};

const SYSTEM = `You review short social videos and captions written for a dental clinic, before they are published.
Flag anything a health regulator, professional body or platform could object to:
- guarantees or implied guarantees of results, absolutes ("painless", "permanent"),
- superlatives or comparisons with other clinics,
- prices, discounts, promotions, free offers,
- before/after promises, patient testimonials or reviews,
- claims to cure, fear-mongering, or diagnosing the viewer ("if you have X you need Y"),
- anything that identifies a patient,
- medical statements that are not mainstream, accepted dental guidance.
Educational, accurate, hedged statements ("can help", "ask your dentist") are fine.

Return JSON: { "verdict": "pass" | "revise" | "block", "issues": [ { "quote", "problem", "fix" } ] }
- "pass": nothing to change.
- "revise": fixable by rewording; give a compliant rewrite in "fix", in the same language as the text.
- "block": the idea itself is not publishable (e.g. built around a discount or a patient's story).`;

/** The full agent: hard rules first, then the model; the stricter verdict wins. */
export async function reviewCompliance(
  client: OpenAI,
  profile: Pick<ClinicProfile, "country" | "language">,
  text: string,
): Promise<ComplianceResult> {
  const hard = scanHardRules(text);
  const review = await agentJson(client, {
    system: SYSTEM,
    user:
      `Clinic country: ${profile.country}. Language: ${profile.language}.\n` +
      (hard.length
        ? `Automatic checks already found: ${hard.map((h) => `"${h.match}" (${h.rule})`).join(", ")}. Include fixes for these.\n`
        : "") +
      `\nTEXT:\n${text}`,
    schema: reviewSchema,
    temperature: 0.1,
  });
  return { verdict: stricter(review.verdict, hard.length ? "revise" : "pass"), hard, issues: review.issues };
}

const RANK = { pass: 0, revise: 1, block: 2 } as const;
export function stricter(a: ComplianceResult["verdict"], b: ComplianceResult["verdict"]) {
  return RANK[a] >= RANK[b] ? a : b;
}
