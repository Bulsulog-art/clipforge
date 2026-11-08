import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
import type { ClinicProfile } from "./profile.js";
import { marketRules } from "./locale.js";

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
// Spanish, French, Portuguese, Italian, Polish and Arabic.
const L = "[\\p{L}\\p{N}]";
const w = (s: string) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, "iu");
// Japanese has no spaces, so there are no word boundaries to look for: a
// pattern matches wherever it occurs, and is written narrowly enough for that
// ("永久(?!歯)" — 永久歯 are adult teeth, not a promise).
const j = (s: string) => new RegExp(s, "u");
// Arabic attaches "and/with/for/the" to the front of a word (والأفضل, بالمجان).
const AR_PREFIX = "(?:[وفبلك]|ال|وال|بال|لل|فال|كال)?";
const a = (s: string) => w(`${AR_PREFIX}(?:${s})`);

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
  pl: "dentyst\\p{L}*|stomatolog\\p{L}*|gabinet\\p{L}*|klinik\\p{L}*|lekarz\\p{L}*|zesp[oó]\\p{L}*|cen\\p{L}*|leczeni\\p{L}*|zabieg\\p{L}*|uśmiech\\p{L}*|opiek\\p{L}*",
  ar: "(?:ال)?(?:عياد\\p{L}*|طبيب\\p{L}*|أطباء|دكتور\\p{L}*|مركز|مجمع|علاج\\p{L}*|أسعار|سعر|خدم\\p{L}*|فريق|ابتسام\\p{L}*)",
  ja: "歯科|歯医者|クリニック|医院|治療|技術|医師|ドクター|先生|設備|結果|サービス|価格",
};
const CITYISH = "\\p{Lu}\\p{L}+";

// "Does not guarantee whiter teeth" is the honest version of a claim, not a
// guarantee. Hard rules cannot read sentences, but they can see a negation
// right before the word.
const NEGATED = "(?<!(no|not|n't|never|cannot|can't|nicht|kein\\p{L}*|ne|n'|não|non|nunca|jamais|mai|nie|لا|لن|ليس|ليست|غير)\\s+)";

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
  // Kodeks Etyki Lekarskiej 2025 art. 71 — see docs/MARKETS.md.
  pl: "zapobiega (\"może pomóc zapobiegać\"), trwale, na zawsze, dożywotnio, bezbolesny, bez bólu, gwarancja, gwarantowany, bez ryzyka, najlepszy, nr 1, przed i po (efekty), wyleczy całkowicie, rabat, promocja, za darmo, 100%",
  // DHA Standards for Medical Advertisement Content on Social Media name
  // "the best", "100%", "no side effects" and "immediate results" outright.
  ar: "يمنع/يقي من (قولوا \"قد يساعد على الوقاية من\")، دائم، مدى الحياة، بدون ألم، مضمون، ضمان، بدون مخاطر، بدون آثار جانبية، نتائج فورية، الأفضل، رقم 1، قبل وبعد (النتائج)، يشفي، علاج نهائي، خصم، عرض، مجاناً، 100%",
  // MHLW 医療広告ガイドライン: 比較優良・誇大広告, 体験談, ビフォーアフター.
  ja: "防ぎます（「防ぐのに役立ちます」と言う）、絶対、必ず、確実に、無痛、痛くない治療、永久（永久歯は可）、一生もの、保証、リスクなし、副作用なし、最高、日本一、No.1、地域一番、最先端、ビフォーアフター、症例写真、体験談、患者様の声、口コミ、完治、割引、キャンペーン、モニター募集、無料、100％",
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
      w(`${NEGATED}(gwarant\\p{L}*|gwarancj\\p{L}*)|bez (żadnego )?ryzyka`),
      a(`${NEGATED}(مضمون\\p{L}*|ضمان\\p{L}*|نضمن|يضمن|تضمن)|(بدون|بلا|دون) (أي )?مخاطر|خال\\p{M}*\\s+من المخاطر`),
      // 保証できません (cannot guarantee) is the honest version.
      j("保証(?!(は|が|を)?(でき|いたしかね|しかね|致しかね|されません|しません))|リスク(なし|ゼロ|がない|はない|はありません)|副作用(なし|ゼロ|がない|はない|はありません|の心配(は|が)?(ない|ありません))"),
    ],
  },
  {
    id: "absolute",
    why: "Absolute claims (painless, 100%, permanent, forever) overpromise outcomes.",
    patterns: [
      /(100|１００|١٠٠)\s?[%％٪]/,
      w("painless|pain[- ]free|acısız|ağrısız|schmerzfrei\\p{L}*|schmerzlos\\p{L}*|sin dolor|indoloro|sans douleur|indolore|sem dor|indolor|senza dolore"),
      // "Nicht dauerhaft empfindlich" (not permanently sensitive) is the honest hedge.
      w(`${NEGATED}${AFTER_TEETH}(permanent(ly)?|kalıcı|dauerhaft\\p{L}*|bleibend\\p{L}*|permanente[s]?)${NOT_TEETH}`),
      w("forever|lifetime|ömür boyu|für immer|lebenslang|para siempre|de por vida|pour toujours|à vie|para sempre|vitalíci\\p{L}*|per sempre|a vita"),
      w("kesin(likle)? sonuç"),
      w("bezbolesn\\p{L}*|bez (żadnego )?bólu|na zawsze|dożywotn\\p{L}*|na całe życie|na stałe"),
      w(`${NEGATED}(?<!(wypełnienie|uzupełnienie|odbudowa|korona|plomba)\\s+)(trwał[aey]|trwale)(?!\\s+(wypełnieni|uzupełnieni|odbudow|koron|plomb)\\p{L}*)`),
      a("(بدون|بلا|دون) (أي )?ألم|غير مؤلم\\p{L}*|مدى الحياة|مدى العمر|طوال العمر|(إلى|الى) الأبد|للأبد|نتائج فورية|نتيجة فورية|(بدون|بلا|دون) (أي )?آثار جانبية|لا (توجد|يوجد) (أي )?آثار جانبية"),
      // "Permanent" (دائم) follows its noun in Arabic; the permanent teeth,
      // filling, crown or restoration are dental terms, not promises. The
      // adverb دائماً ("always") is a different word and never matches.
      w(`(?<!(أسنان|الأسنان|حشوة|الحشوة|حشوات|الحشوات|تاج|التاج|تركيبة|التركيبة|ضرس|الضرس|أضراس|الأضراس|ترميم|الترميم)\\s+)${AR_PREFIX}(دائم|دائمة)`),
      j("無痛|痛くない(治療|です(?!か)|ので|から)|痛みのない治療|痛みゼロ|永久(?!歯)|一生(もの|モノ|使え|持ち|持つ)|絶対(に)?(安全|治|痛|大丈夫|効果|成功|白く|きれい|綺麗|安心)|必ず(治|白く|効果|改善|成功|きれい|綺麗)|確実(に|な)(治|効果|白く|改善|結果)|防ぎます|防止します"),
      // The bare verb promises the outcome; the hedged form ("helps prevent",
      // "önlemeye yardımcı olur", "ayuda a prevenir") uses another form of the
      // word and passes. Seen live: "diş eti hastalıklarını önler".
      w("prevents|önler|verhindert|previene|prévient|previne|zapobiega|zapobiegają"),
      a("(يقي|تقي) من|(يمنع|تمنع) (\\p{L}+ )?(التسوس|تسوس|أمراض|مرض|التهاب|النزيف|نزيف|الجير|البلاك|الرائحة|رائحة)"),
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
      w(`najlepsz\\p{L}* (${CLINIC_NOUNS.pl})|najlepsz\\p{L}* w (mieście|${CITYISH})|numer jeden|najtańsz\\p{L}*|najniższ\\p{L}* cen\\p{L}*`),
      a(`(أفضل|أحسن|أمهر|أشهر) ${CLINIC_NOUNS.ar}|${CLINIC_NOUNS.ar} (الأفضل|الأحسن|الأمهر|الأرخص|الأول(ى)?)|رقم\\s?(1|١|واحد)|الأرخص|أرخص`),
      j(`日本一|県内一|市内一|府内一|都内一|区内一|地域一|業界一|No\\.?\\s?1|NO\\.?\\s?1|ナンバーワン|最高の(${CLINIC_NOUNS.ja})|最先端の(${CLINIC_NOUNS.ja})|最新鋭|一番(人気|安い|の(${CLINIC_NOUNS.ja}))|最安|格安|どこよりも`),
    ],
  },
  {
    id: "price",
    why: "Prices, discounts and promotions in health advertising are banned or restricted in many markets.",
    patterns: [
      w("discount(s|ed)?|\\d+\\s?% off|free (consultation|check-?up|whitening)|special offer|limited time"),
      /[$€£₺¥￥]\s?\d/,
      /\d\s?(usd|eur|gbp|tl|try|€|zł|pln|aed|sar|jpy)(?![\p{L}])/iu,
      /[\d٠-٩]\s?(درهم|ريال|دينار|ر\.س|د\.إ)|(درهم|ريال) ?[\d٠-٩]/u,
      /\d[\d,，]*\s?円/u,
      w("indirim\\p{L}*|kampanya\\p{L}*|ücretsiz muayene|fırsat\\p{L}*"),
      w("rabatt\\p{L}*|sonderangebot\\p{L}*|aktionspreis\\p{L}*|kostenlose (beratung|untersuchung|zahnreinigung)"),
      w("descuento\\p{L}*|oferta especial|promoci[oó]n\\p{L}*|gratis"),
      w("réduction\\p{L}*|promo\\p{L}*|offre spéciale|gratuit\\p{L}*"),
      w("desconto\\p{L}*|promoção|oferta especial|grátis"),
      w("scont\\p{L}*|offerta speciale|promozion\\p{L}*"),
      w("rabat\\p{L}*|zniżk\\p{L}*|promocj\\p{L}*|promocyjn\\p{L}*|gratis|za darmo|bezpłatn\\p{L}* (konsultacj|wizyt|przegląd|badani|wybielani)\\p{L}*|oferta specjalna"),
      a("خصم\\p{L}*|خصومات|تخفيض\\p{L}*|عرض خاص|عروض\\p{L}*|مجان\\p{L}*|لفترة محدودة|سعر خاص"),
      j("割引|値引|半額|キャンペーン|モニター募集|ポイント還元|無料(カウンセリング|相談|検診|診断|体験|ホワイトニング)|初回無料|特別価格|お得"),
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
      // "Przed i po zabiegu" / "قبل وبعد الأكل" are instructions, not results.
      w("przed i po(?!\\s+(jedzeniu|posiłku|posiłkach|myciu|szczotkowaniu|zabiegu|śnie|piciu|każdym))"),
      a("قبل\\s+و\\s*بعد(?!\\s+(الأكل|الطعام|الوجبات|الوجبة|وجبة|تناول|تنظيف|التنظيف|النوم|الشرب|استخدام|كل|العلاج|الإجراء))"),
      // 治療前後の注意 (care before and after treatment) is aftercare; only photos/comparisons are results.
      j("ビフォー.?アフター|術前術後(の)?(写真|比較|画像|変化)?|(治療|施術)前後の(写真|比較|画像|変化)|症例写真"),
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
      w("nasi pacjenci (mówią|polecają)|opini\\p{L}* (naszych )?pacjentów|referencj\\p{L}*"),
      a("آراء المرضى|تجارب المرضى|تجربة (أحد )?المرضى|شهادات المرضى|مرضانا يقولون|قصص نجاح|(خمس|5|٥) نجوم"),
      j("体験談|患者様の声|患者さんの声|お客様の声|口コミ|クチコミ|星5|★5|レビュー"),
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
      w("wyleczy|całkowicie wylecz\\p{L}*|leczy na zawsze"),
      a("(يشفي|تشفي)|شفاء (تام|نهائي)|علاج نهائي|(يقضي|تقضي) (تماما\\p{M}*|نهائيا\\p{M}*) على"),
      j("完治|根治します|必ず治|確実に治|完全に治"),
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
- absolute effect claims in Polish ("zapobiega" → "może pomóc zapobiegać"), Arabic ("يمنع"/"يقي من" → "قد يساعد على الوقاية من") and Japanese ("防ぎます" → "防ぐのに役立ちます").
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
