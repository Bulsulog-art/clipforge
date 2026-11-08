import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
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

// \b only knows ASCII letters, so every pattern uses explicit Unicode
// letter boundaries — the same helper works for English, Turkish, German,
// Spanish, French, Portuguese and Italian.
const L = "[\\p{L}\\p{N}]";
const w = (s: string) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, "iu");

// "Permanent teeth" (adult teeth) is a dental term, not a promise. Every
// language's version of it is excluded from the "permanent" rule, or every
// children's-dentistry video would be rejected.
// Likewise the permanent filling/crown/restoration that replaces a temporary
// one after a root canal (seen live: "kalıcı dolgu" rejected three times).
const NOT_TEETH = "(?!\\s+(teeth|tooth|dişler\\p{L}*|diş(?!\\p{L})|zähne|zahn|dientes|dents|dentes|denti|molar\\p{L}*|filling\\p{L}*|crown\\p{L}*|restoration\\p{L}*|dolgu\\p{L}*|kron\\p{L}*|restorasyon\\p{L}*|füllung\\p{L}*|krone\\p{L}*|versorgung\\p{L}*))";

// …and in Spanish, French, Portuguese and Italian the adjective follows the
// noun ("dientes permanentes"), so the exclusion has to look behind as well.
const AFTER_TEETH = "(?<!(dientes|dents|dentes|denti|molares|molaires|empaste|obturación|obturation|restauración|restauração|restauro|otturazione|corona|couronne|coroa)\\s+)";

// What a superlative has to be about to count as an advertising claim.
const CLINIC_NOUNS = {
  en: "dentists?|dental (clinic|practice|office|care|team)|clinic|practice|team|doctors?|prices?|deals?|smiles?|treatments?|care|service",
  tr: "klini\\p{L}*|diş hekim\\p{L}*|doktor\\p{L}*|hekim\\p{L}*|fiyat\\p{L}*|tedavi\\p{L}*|hizmet\\p{L}*|ekip\\p{L}*",
  de: "zahnarzt\\p{L}*|zahnärzt\\p{L}*|praxis|klinik|team|preis\\p{L}*|behandlung\\p{L}*|lächeln",
  es: "dentistas?|clínicas?|consultas?|equipos?|precios?|tratamientos?|sonrisas?",
  fr: "dentistes?|cliniques?|cabinets?|équipes?|prix|traitements?|sourires?",
  pt: "dentistas?|clínicas?|consultórios?|equipes?|preços?|tratamentos?|sorrisos?",
  it: "dentist[ia]|clinic[ah]e?|studi?o?|team|prezz[oi]|trattament[oi]|sorris[oi]",
};
const CITYISH = "\\p{Lu}\\p{L}+";

// "Does not guarantee whiter teeth" is the honest version of a claim, not a
// guarantee. Hard rules cannot read sentences, but they can see a negation
// right before the word.
const NEGATED = "(?<!(no|not|n't|never|cannot|can't|nicht|kein\\p{L}*|ne|n'|não|non|nunca|jamais|mai)\\s+)";

/**
 * The words a writer must not reach for, by language — told to the writers
 * up front so a rewrite is not spent learning them from the reviewer.
 * (Baseline eval: most script rewrites were "prevents"/"önler"/"dauerhaft".)
 */
export const AVOID_WORDS: Record<string, string> = {
  en: "prevents, stops (say \"can help prevent\"), permanent, painless, pain-free, guaranteed, risk-free, forever, lifetime, best, #1, before-and-after results, cures, 100%",
  tr: "önler, engeller (\"önlemeye yardımcı olabilir\" deyin), kalıcı, acısız, ağrısız, garanti, ömür boyu, en iyi, kesin sonuç, öncesi-sonrası sonuçları, tamamen iyileştirir, %100",
  de: "verhindert (\"kann helfen vorzubeugen\"), dauerhaft, schmerzfrei, schmerzlos, garantiert, risikofrei, für immer, lebenslang, beste, Vorher-Nachher, heilt, 100 %",
  es: "previene (\"puede ayudar a prevenir\"), permanente, sin dolor, garantizado, sin riesgo, para siempre, de por vida, el mejor, resultados de antes y después, cura, 100 %",
  fr: "prévient (\"peut aider à prévenir\"), permanent, sans douleur, garanti, sans risque, pour toujours, à vie, le meilleur, avant/après, guérit, 100 %",
  pt: "previne (\"pode ajudar a prevenir\"), permanente, sem dor, garantido, sem risco, para sempre, vitalício, o melhor, antes e depois, cura, 100%",
  it: "previene (\"può aiutare a prevenire\"), permanente, senza dolore, garantito, senza rischi, per sempre, a vita, il migliore, prima e dopo, guarisce, 100%",
};

export const HARD_RULES: Rule[] = [
  {
    id: "guarantee",
    why: "Results cannot be guaranteed in healthcare.",
    patterns: [
      w(`${NEGATED}(guarantee[ds]?|risk[- ]free)`),
      // tr de fr pt it es; Turkish negates after the verb ("garanti etmez").
      w(`${NEGATED}(garanti\\p{L}*|garantía|garanzia|garantia)(?!\\s+(etmez|edilemez|vermez))|risksiz`),
      w("sin riesgo|sans risque|sem risco|senza rischi|risikofrei"),
    ],
  },
  {
    id: "absolute",
    why: "Absolute claims (painless, 100%, permanent, forever) overpromise outcomes.",
    patterns: [
      /100\s?%/,
      w("painless|pain[- ]free|acısız|ağrısız|schmerzfrei\\p{L}*|schmerzlos\\p{L}*|sin dolor|indoloro|sans douleur|indolore|sem dor|indolor|senza dolore"),
      // "Nicht dauerhaft empfindlich" (not permanently sensitive) is the honest hedge.
      w(`${NEGATED}${AFTER_TEETH}(permanent(ly)?|kalıcı|dauerhaft\\p{L}*|bleibend\\p{L}*|permanente[s]?)${NOT_TEETH}`),
      w("forever|lifetime|ömür boyu|für immer|lebenslang|para siempre|de por vida|pour toujours|à vie|para sempre|vitalíci\\p{L}*|per sempre|a vita"),
      w("kesin(likle)? sonuç"),
      // The bare verb promises the outcome; the hedged form ("helps prevent",
      // "önlemeye yardımcı olur", "ayuda a prevenir") uses another form of the
      // word and passes. Seen live: "diş eti hastalıklarını önler".
      w("prevents|önler|verhindert|previene|prévient|previne"),
    ],
  },
  {
    id: "superlative",
    why: "Unverifiable superlatives and comparisons with other clinics are restricted.",
    // Only superlatives ABOUT the clinic, its people, its prices or its
    // results. "Ask your dentist for the best approach" / "en iyi şekilde"
    // are ordinary language and were rejecting good videos.
    patterns: [
      w(`(the )?best (${CLINIC_NOUNS.en})|best in (town|the city|${CITYISH})|#\\s?1|number one|top[- ]rated|cheapest`),
      w(`en iyi (${CLINIC_NOUNS.tr})|bir numara|en ucuz`),
      w(`beste\\p{L}* (${CLINIC_NOUNS.de})|nr\\.?\\s?1|günstigste\\p{L}*`),
      w(`(el|la|los|las) mejor(es)? (${CLINIC_NOUNS.es})|más barat\\p{L}*`),
      w(`(le|la|les) meilleur\\p{L}* (${CLINIC_NOUNS.fr})|moins cher`),
      w(`(o|a|os|as) melhor(es)? (${CLINIC_NOUNS.pt})|mais barat\\p{L}*`),
      w(`(il|la|i|le) miglior\\p{L}* (${CLINIC_NOUNS.it})|più economic\\p{L}*`),
    ],
  },
  {
    id: "price",
    why: "Prices, discounts and promotions in health advertising are banned or restricted in many markets.",
    patterns: [
      w("discount(s|ed)?|\\d+\\s?% off|free (consultation|check-?up|whitening)|special offer|limited time"),
      /[$€£₺]\s?\d/,
      /\d\s?(usd|eur|gbp|tl|try|€)(?![\p{L}])/iu,
      w("indirim\\p{L}*|kampanya\\p{L}*|ücretsiz muayene|fırsat\\p{L}*"),
      w("rabatt\\p{L}*|sonderangebot\\p{L}*|aktionspreis\\p{L}*|kostenlose (beratung|untersuchung|zahnreinigung)"),
      w("descuento\\p{L}*|oferta especial|promoci[oó]n\\p{L}*|gratis"),
      w("réduction\\p{L}*|promo\\p{L}*|offre spéciale|gratuit\\p{L}*"),
      w("desconto\\p{L}*|promoção|oferta especial|grátis"),
      w("scont\\p{L}*|offerta speciale|promozion\\p{L}*"),
    ],
  },
  {
    id: "before_after",
    why: "Before/after results imply an outcome every patient will get.",
    patterns: [
      // Only results ("before and after photos", "el antes y después"), not
      // time: "brush before and after meals" / "antes y después de comer"
      // was rejecting good aftercare advice.
      w("before (and|&) after(?!\\s+(meals?|eating|food|each|every|you|your|brushing|bed|sleep))|before/after"),
      w("(?<!(yemek|yemekler|yemeklerden|fırçalama)\\s)öncesi (ve )?sonrası"),
      w("vorher[- ]?(und )?nachher"),
      w("antes y después(?!\\s+de (comer|cada comida|las comidas|cepillar\\p{L}*|usar\\p{L}*|lavar\\p{L}*|dormir|beber))"),
      w("antes e depois(?!\\s+(de comer|das refeições|de cada refeição|de escovar|de dormir|de beber))"),
      w("avant[- /]?(et )?après(?!\\s+(les repas|chaque repas|le repas|de manger|le brossage|de dormir|de boire))"),
      w("prima e dopo(?!\\s+(i pasti|ogni pasto|il pasto|di mangiare|aver mangiato|di dormire|di bere))"),
    ],
  },
  {
    id: "testimonial",
    why: "Patient testimonials and reviews are restricted in health advertising in several markets.",
    patterns: [
      w("our patients? (say|said|love)|5[- ]star|testimonials?"),
      w("hastalarımız (diyor|anlatıyor)"),
      w("unsere patienten sagen|patientenbewertung\\p{L}*"),
      w("nuestros pacientes dicen|testimonios?"),
      w("nos patients disent|témoignages?"),
      w("nossos pacientes dizem|depoimentos?"),
      w("i nostri pazienti dicono|testimonianz\\p{L}*"),
    ],
  },
  {
    id: "cure",
    why: "Claiming to cure or eliminate a condition overstates what treatment can promise.",
    patterns: [
      w("cures?|eliminates? (all )?pain"),
      w("kesin tedavi|tamamen (yok eder|geçer|iyileştirir)"),
      w("heilt|heilung garantiert"),
      w("cura definitiva|guérit|guérison définitive|guarisce"),
    ],
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
- absolute effect claims ("prevents", "stops", "önler", "engeller" without "can"/"helps"): ask for a hedged form ("can help prevent", "önlemeye yardımcı olur").
Educational, accurate, hedged statements are fine and must NOT be flagged. "Often", "in many cases", "oft", "a menudo", "genellikle" ARE hedges, not guarantees; never ask to stack a second hedge on a hedged sentence. Hedging words include "can", "may", "usually", "often", "for most people", "ask your dentist", and in Turkish "-ebilir/-abilir", "olabilir", "genellikle", "çoğu durumda", "hekiminize danışın". Typical ranges given as typical ("usually 3-6 weeks", "genellikle 3-6 hafta") are fine.
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
  "can could may might possibly often usually generally typically in many cases most some kann können könnte möglicherweise eventuell oft häufig meist meistens in vielen fällen puede pueden podría posiblemente a menudo normalmente generalmente en muchos casos peut peuvent pourrait souvent généralement habituellement dans de nombreux cas pode podem poderá frequentemente geralmente può possono spesso solitamente olabilir genellikle çoğu zaman bazen çoğu durumda".split(" "),
);
const unhedged = (s: string) => norm(s).split(" ").filter((w) => !HEDGES.has(w)).join(" ");

/** An issue whose fix changes nothing, or that objects to a bare question. */
export function noOpIssue(i: { quote: string; fix: string }): boolean {
  const q = norm(i.quote);
  if (!q) return true;
  if (norm(i.fix) === q) return true;
  // …but only when the sentence was hedged already: "Whitening is safe" →
  // "usually safe" is a real fix.
  const hedged = norm(i.quote).split(" ").some((w) => HEDGES.has(w));
  if (hedged && unhedged(i.fix) === unhedged(i.quote)) return true;
  // A question promises nothing; a fix that only appends to it is padding.
  return i.quote.trim().endsWith("?") && norm(i.fix).startsWith(q);
}

const RANK = { pass: 0, revise: 1, block: 2 } as const;
export function stricter(a: ComplianceResult["verdict"], b: ComplianceResult["verdict"]) {
  return RANK[a] >= RANK[b] ? a : b;
}
