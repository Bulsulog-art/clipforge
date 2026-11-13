import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
import type { ClinicProfile } from "./profile.js";
import { marketLanguage, marketLanguages, marketRules } from "./locale.js";
import { scanHardRules, type HardHit } from "./hard-rules.js";

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

export {
  AVOID_WORDS,
  CHECKER_RULES,
  FEAR_RULE,
  HARD_RULES,
  findHardSpans,
  scanHardRules,
  type HardHit,
  type HardSpan,
  type Rule,
  type RuleId,
} from "./hard-rules.js";

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
- absolute effect claims ("prevents", "stops", "önler", "engeller" without "can"/"helps"): ask for a hedged form ("can help prevent", "önlemeye yardımcı olur").
- absolute effect claims in Polish ("zapobiega" → "może pomóc zapobiegać"), Arabic ("يمنع"/"يقي من" → "قد يساعد على الوقاية من") and Japanese ("防ぎます" → "防ぐのに役立ちます").
- in German ("verhindert" → "kann helfen vorzubeugen") and Spanish ("previene" → "puede ayudar a prevenir") too; celebrity or influencer endorsements, urgency or pressure to book ("hemen randevu alın", "nur noch diese Woche", "no esperes más"), and a COFEPRIS permit number the clinic did not give are issues as well. A calm closing invitation to ask at the next check-up is fine.
Educational, accurate, hedged statements are fine and must NOT be flagged. "Often", "in many cases", "oft", "a menudo", "genellikle" ARE hedges, not guarantees; never ask to stack a second hedge on a hedged sentence. Hedging words include "can", "may", "usually", "often", "for most people", "ask your dentist", and in Turkish "-ebilir/-abilir", "olabilir", "genellikle", "çoğu durumda", "hekiminize danışın". Polish "może", "zwykle", "często", "u większości osób", Arabic "قد", "غالباً", "عادةً", "في كثير من الحالات", Japanese "〜ことがあります", "〜場合があります", "一般的に", "多くの場合", "個人差があります" are hedges too. Typical ranges given as typical ("usually 3-6 weeks", "genellikle 3-6 hafta") are fine.
Only flag what a regulator would actually object to. A fix that merely re-words an already hedged sentence is not a fix — in that case the sentence passes.
Advice to take medication must defer to the dentist ("as your dentist advises" / "hekiminizin önerdiği şekilde").

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
      // A Swiss clinic writing French is normal; an Austrian one writing
      // English is not, but the country's rules apply all the same.
      (marketLanguage(profile.country, profile.language) !== profile.language
        ? `The text is not in one of this market's usual languages (${marketLanguages(profile.country).join(", ")}); the market's rules still apply.\n`
        : "") +
      (marketRules(profile.country) ? `This market's own rules (apply them too): ${marketRules(profile.country)}\n` : "") +
      (hard.length
        ? `Automatic checks already found: ${hard.map((h) => `"${h.match}" (${h.rule})`).join(", ")}. Include fixes for these.\n`
        : "") +
      `\nTEXT:\n${text}`,
    schema: reviewSchema,
    temperature: 0.1,
    // The gatekeeper. On the small model it kept trading synonyms
    // ("können dazu beitragen" → "können helfen") until good videos ran out
    // of attempts; judgement is what this agent is for.
    model: REVIEW_MODEL,
  });
  // The model sometimes "fixes" a sentence into itself, or flags a plain
  // question as a promise ("Can tartar affect your heart?" — seen live in
  // Turkish, three rounds in a row until a good video was rejected). Those
  // are not issues; if nothing real is left, the text passes.
  const issues = review.issues.filter((i) => !noOpIssue(i));
  const verdict = review.verdict === "revise" && issues.length === 0 ? "pass" : review.verdict;
  return { verdict: stricter(verdict, hard.length ? "revise" : "pass"), hard, issues };
}

const norm = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Hedge words. A "fix" that only adds or moves these to a sentence that is
// already hedged is the reviewer stacking caveats ("kann möglicherweise …
// möglicherweise effektiv"), not a compliance change.
const HEDGES = new Set(
  "can could may might possibly often usually generally typically in many cases most some kann können könnte möglicherweise eventuell oft häufig meist meistens in vielen fällen puede pueden podría posiblemente a menudo normalmente generalmente en muchos casos peut peuvent pourrait souvent généralement habituellement dans de nombreux cas pode podem poderá frequentemente geralmente può possono spesso solitamente olabilir genellikle çoğu zaman bazen çoğu durumda może mogą można zwykle zazwyczaj często przeważnie najczęściej قد يمكن غالبا غالباً عادة عادةً أحيانا أحياناً".split(" "),
);
// Japanese hedges are endings and phrases inside an unspaced sentence.
const CJK_HEDGES = ["ことがあります", "場合があります", "可能性があります", "一般的に", "多くの場合", "ことが多い", "個人差があります", "でしょう", "場合も"];
const unhedged = (s: string) => {
  let t = norm(s);
  for (const h of CJK_HEDGES) t = t.split(h).join("");
  return t.split(" ").filter((w) => !HEDGES.has(w)).join(" ");
};

/** An issue whose fix changes nothing, or that objects to a bare question. */
export function noOpIssue(i: { quote: string; fix: string }): boolean {
  const q = norm(i.quote);
  if (!q) return true;
  if (norm(i.fix) === q) return true;
  // …but only when the sentence was hedged already: "Whitening is safe" →
  // "usually safe" is a real fix.
  const hedged = norm(i.quote).split(" ").some((w) => HEDGES.has(w)) || CJK_HEDGES.some((h) => i.quote.includes(h));
  if (hedged && unhedged(i.fix) === unhedged(i.quote)) return true;
  // A question promises nothing; a fix that only appends to it is padding.
  return i.quote.trim().endsWith("?") && norm(i.fix).startsWith(q);
}

const RANK = { pass: 0, revise: 1, block: 2 } as const;
export function stricter(a: ComplianceResult["verdict"], b: ComplianceResult["verdict"]) {
  return RANK[a] >= RANK[b] ? a : b;
}
