import { CHECKER_RULES, MARKET_HARD_RULES, findHardSpans, type HardSpan, type MarketRuleId, type Rule, type RuleId } from "./hard-rules";
import { CHECKER_MAX_CHARS } from "./ad-checker-limits";
import { OTHER_MARKET, verdictOf, worse, type CheckerMarket, type CheckerRuleId, type Verdict } from "./checker-markets";

/**
 * The free public ad checker (dentvideo.com/ad-checker): the compliance
 * agent's deterministic hard rules (lib/dentvid/hard-rules.ts, mirrored from
 * the worker) run in the visitor's browser, plus a safer wording per hit.
 *
 * Browser-safe and small: no content module, no network, no model. The text
 * a dentist pastes never leaves the page — not to our server, not to
 * analytics (the checker_used event carries counts only).
 */

export { CHECKER_MAX_CHARS };

/** The rules, in the engine's order (fear last). */
export const CHECKER_RULE_IDS: readonly RuleId[] = CHECKER_RULES.map((r) => r.id);

/** Every market pack rule the checker can report (MARKET_HARD_RULES), each once. */
export const CHECKER_MARKET_RULE_IDS: readonly MarketRuleId[] = [...new Set(Object.values(MARKET_HARD_RULES).flatMap((rs) => rs.map((r) => r.id)))];

export type CheckerHit = Omit<HardSpan, "rule"> & {
  rule: CheckerRuleId;
  /** How strictly the chosen market treats it. */
  verdict: Exclude<Verdict, "ok">;
  /** A safer wording in the language of the flagged phrase, when one is known; else null (the UI shows the rule's tip). */
  fix: string | null;
};

/** The rules run for a market: the hard rules, fear and pressure, then that market's own pack. */
export function rulesFor(market: CheckerMarket = OTHER_MARKET): readonly Rule[] {
  // A market rule has the same shape as a hard rule; only its id names a market pack.
  return [...CHECKER_RULES, ...((MARKET_HARD_RULES[market] ?? []) as unknown as Rule[])];
}

const DIGIT = /[\d٠-٩０-９]/;

/**
 * A price pattern matches from the currency sign to one digit ("$9" in "$99",
 * "0 TL" in "1500 TL"): enough to flag it, too little to highlight. Widen a
 * price hit over the rest of its number, so the whole amount is marked.
 */
export function widenNumber(text: string, s: HardSpan): HardSpan {
  if (s.rule !== "price") return s;
  let { start, end } = s;
  const sep = (c: string | undefined) => c === "." || c === "," || c === "，";
  const digit = (c: string | undefined) => !!c && DIGIT.test(c);
  if (digit(text[start])) {
    while (start > 0 && (digit(text[start - 1]) || (sep(text[start - 1]) && digit(text[start - 2])))) start--;
  }
  if (digit(text[end - 1])) {
    while (end < text.length && (digit(text[end]) || (sep(text[end]) && digit(text[end + 1])))) end++;
  }
  return start === s.start && end === s.end ? s : { ...s, start, end, match: text.slice(start, end) };
}

/**
 * Every risky phrase in `text`, in reading order, each with how strictly
 * `market` treats it and a safer wording when one is known. Without a market
 * only the rules that apply everywhere run, and nothing is "banned".
 */
export function checkText(text: string, market: CheckerMarket = OTHER_MARKET): CheckerHit[] {
  const t = text.slice(0, CHECKER_MAX_CHARS);
  const lang = guessLanguage(t);
  const spans = findHardSpans(t, rulesFor(market)).map((s) => widenNumber(t, s));
  // Widening can run into the next hit: keep them apart.
  const out: CheckerHit[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) continue;
    const rule = s.rule as CheckerRuleId;
    out.push({ ...s, rule, verdict: verdictOf(rule, market), fix: suggestRewrite(s.match, rule, lang) });
  }
  return out;
}

export type Sentence = {
  /** [start, end) in the checked text, without the spaces around it. */
  start: number;
  end: number;
  text: string;
  /** The hits that start in this sentence, positions relative to the whole text. */
  hits: CheckerHit[];
  verdict: Verdict;
  /**
   * A whole safer sentence, when one of its hits has a sentence-length fix
   * (a promotion or a push to book has nothing worth keeping: a calm
   * invitation to ask replaces it). Else null: the phrase fixes apply.
   */
  safer: string | null;
};

// Words a full stop follows without ending the sentence ("Dr. Ali", "z. B.", "Uzm. Dt.").
const ABBREVIATIONS = new Set(
  "dr drs prof mr mrs ms st nr no vs etc ca bzw ggf inkl zb usw dt uzm doç op sn lek med stom mgr inż sr sra dra av tel".split(" "),
);

/**
 * The text cut into sentences, deterministically (the same in every browser
 * and in the tests): after . ! ? … and their Japanese and Arabic forms, and
 * at every line break. Spaces between sentences belong to none.
 */
export function splitSentences(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let start = 0;
  const push = (end: number) => {
    let a = start;
    let b = end;
    while (a < b && /\s/.test(text[a])) a++;
    while (b > a && /\s/.test(text[b - 1])) b--;
    if (b > a) out.push({ start: a, end: b });
    start = end;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n") {
      push(i + 1);
      continue;
    }
    // Japanese and Chinese stops need no space after them.
    if (c === "。" || c === "！" || c === "？") {
      let j = i + 1;
      while (j < text.length && /[。！？」』）)]/.test(text[j])) j++;
      push(j);
      i = j - 1;
      continue;
    }
    if (c === "." || c === "!" || c === "?" || c === "…" || c === "؟") {
      let j = i + 1;
      while (j < text.length && /[.!?…؟"'”’»)\]]/.test(text[j])) j++;
      if (j < text.length && !/\s/.test(text[j])) continue;
      if (c === ".") {
        const word = /([\p{L}.]+)$/u.exec(text.slice(start, i))?.[1] ?? "";
        const bare = word.replace(/\./g, "").toLowerCase();
        // "Dr.", "z.B.", or a single letter ("A. Yılmaz", "z. B.").
        if (ABBREVIATIONS.has(bare) || /^\p{L}$/u.test(word)) continue;
      }
      push(j);
      i = j - 1;
    }
  }
  push(text.length);
  return out;
}

const SENTENCE_FIX = /[.!?。？！؟]$/;

/** The checked text sentence by sentence, each with its hits and verdict (OK, risky, not allowed). */
export function sentencesOf(text: string, hits: readonly CheckerHit[]): Sentence[] {
  const t = text.slice(0, CHECKER_MAX_CHARS);
  return splitSentences(t).map(({ start, end }) => {
    const own = hits.filter((h) => h.start >= start && h.start < end);
    const verdict = own.reduce<Verdict>((v, h) => worse(v, h.verdict), "ok");
    const safer = verdict === "ok" ? null : (own.find((h) => h.fix && SENTENCE_FIX.test(h.fix))?.fix ?? null);
    return { start, end, text: t.slice(start, end), hits: own, verdict, safer };
  });
}

export type Segment = { text: string; hit?: CheckerHit; index?: number };

/** The text cut into plain runs and hits, for highlighting. */
export function segments(text: string, hits: readonly CheckerHit[]): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  hits.forEach((h, index) => {
    if (h.start > at) out.push({ text: text.slice(at, h.start) });
    out.push({ text: text.slice(h.start, h.end), hit: h, index });
    at = h.end;
  });
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

/** What the checker_used event may carry: counts and the chosen market, never words. */
export function checkerEventProps(
  hits: readonly CheckerHit[],
  market: CheckerMarket = OTHER_MARKET,
): { hits: number; rules: number; clean: boolean; banned: number; market?: string } {
  return {
    hits: Math.min(hits.length, 100),
    rules: Math.min(new Set(hits.map((h) => h.rule)).size, 20),
    clean: hits.length === 0,
    banned: Math.min(hits.filter((h) => h.verdict === "banned").length, 100),
    ...(market === OTHER_MARKET ? {} : { market }),
  };
}

type Rewrite = { rule: RuleId; re: RegExp; fix: string };
const r = (rule: RuleId, re: RegExp, fix: string): Rewrite => ({ rule, re, fix });

/** The languages a rewrite can be in (the site's eight). */
export type RewriteLang = "en" | "tr" | "de" | "es" | "fr" | "pl" | "ar" | "ja";

/**
 * Safer wordings, in the language of the phrase they replace (a German post
 * checked on the English page gets a German suggestion). First match wins;
 * a phrase none of these knows gets the rule's general tip instead.
 * Hedged and factual, never another promise — ad-checker.test.ts runs every
 * fix back through the checker.
 */
export const REWRITES: Record<RewriteLang, readonly Rewrite[]> = {
  en: [
    // "Painless", "pain-free", "zero pain", "no pain, no fuss".
    r("absolute", /pain/i, "comfortable for most patients, with local anesthesia"),
    r("absolute", /perfect smile/i, "can help you toward a healthier smile"),
    r("absolute", /forever|lifetime|permanent/i, "can last many years with good care"),
    r("absolute", /prevents/i, "can help prevent"),
    r("guarantee", /risk[- ]free/i, "we explain the benefits and risks before you decide"),
    r("guarantee", /guarantee/i, "results vary from person to person"),
    r("superlative", /best|#\s?1|number one|top|cheapest|award|voted|leading/i, "our team (say what you do, not that you are the best)"),
    r("price", /discount|off|free|offer|limited|usd|eur|gbp/i, "Questions about treatment? Ask us at your next check-up."),
    r("before_after", /before/i, "what the treatment involves, step by step"),
    r("testimonial", /patients?|testimonial|star|review/i, "questions our patients often ask"),
    r("cure", /eliminat/i, "can help relieve pain"),
    r("cure", /cure/i, "can help treat"),
    r("fear", /lose|cost/i, "left untreated, it can get worse over time"),
    // A symptom someone should not wait on: a calm pointer to their dentist.
    r("fear", /too late|wait/i, "If you notice this, ask your dentist at your next visit."),
    // A push to book or call, or a made-up deadline: no push and no deadline at all.
    r("fear", /book|call|only|limited|end|expire|last|hurry|act|while|left|remaining|filling|running|going|miss/i, "Whenever it suits you, ask us about an appointment."),
  ],
  tr: [
    r("absolute", /ağrısız|acısız/i, "lokal anestezi altında, çoğu hasta için konforlu"),
    r("absolute", /ömür boyu|kalıcı/i, "düzenli bakımla uzun yıllar kullanılabilir"),
    r("absolute", /kesin|anında/i, "sonuçlar kişiden kişiye değişebilir"),
    r("absolute", /önler/i, "önlemeye yardımcı olabilir"),
    r("absolute", /yan etki/i, "hekiminiz olası yan etkileri anlatır"),
    r("guarantee", /risksiz/i, "hekiminiz olası riskleri ve faydaları anlatır"),
    r("guarantee", /garanti/i, "sonuçlar kişiden kişiye değişebilir"),
    r("superlative", /en iyi|bir numara|lider|ilk ve tek|tek adres|en ucuz|en uygun|en kaliteli|rakipsiz|diğer klinik/i, "kliniğimiz (adres, hizmetler gibi doğrulanabilir bilgiler)"),
    r("price", /indirim|kampanya|taksit|hediye|ücretsiz|fırsat|bedava|promosyon|sınırlı süre|(?<![\p{L}])tl(?![\p{L}])/iu, "Merak ettiklerinizi kontrol randevunuzda sorabilirsiniz."),
    r("before_after", /öncesi/i, "tedavinin adım adım nasıl yapıldığı"),
    r("testimonial", /hasta|teşekkür|memnun/i, "hastalarımızın sık sorduğu sorular"),
    r("cure", /tedavi|iyileştirir|geçer|yok eder/i, "tedavisine yardımcı olabilir"),
    r("fear", /kaybed/i, "tedavi edilmezse zamanla ilerleyebilir"),
    r("fear", /geç olmadan|randevu|kaçırmayın|beklemeyin/i, "Bu belirtiyi fark ederseniz diş hekiminize danışabilirsiniz."),
    r("fear", /fırsat|şans|sadece|yalnızca|özel|son gün|acele|kontenjan|tükenmeden/i, "Size uygun bir zamanda diş hekiminize danışabilirsiniz."),
  ],
  de: [
    r("absolute", /schmerzfrei|schmerzlos/i, "unter örtlicher Betäubung, für die meisten gut verträglich"),
    r("absolute", /dauerhaft|bleibend|für immer|lebenslang/i, "bei guter Pflege lange haltbar"),
    r("absolute", /verhindert/i, "kann helfen vorzubeugen"),
    r("absolute", /nebenwirkung|sofortig/i, "wir besprechen mögliche Nebenwirkungen mit Ihnen"),
    r("guarantee", /risiko/i, "wir besprechen Nutzen und Risiken mit Ihnen"),
    r("guarantee", /garantie/i, "Ergebnisse sind individuell verschieden"),
    r("superlative", /beste|nr\.?\s?1|nummer|führ|günstig|besser als/i, "unser Praxisteam (Fakten statt Superlative)"),
    r("price", /rabatt|gutschein|gewinnspiel|verlosung|angebot|aktion|kostenlos|preisnachlass|monat|woche/i, "Fragen Sie uns gern bei Ihrem nächsten Kontrolltermin."),
    r("before_after", /vorher/i, "wie die Behandlung Schritt für Schritt abläuft"),
    r("testimonial", /patienten|erfahrungsbericht|dankschreiben|bewertung/i, "Fragen, die uns Patientinnen und Patienten oft stellen"),
    r("cure", /heil/i, "kann bei der Behandlung helfen"),
    r("fear", /zu spät|warten|termin|buchen|verlieren/i, "Wenn Ihnen das auffällt, sprechen Sie uns beim nächsten Termin an."),
    r("fear", /heute|chance|kurze zeit|angebot|vorrat|plätze|begrenzt/i, "Wann immer es Ihnen passt: Fragen Sie uns nach einem Termin."),
  ],
  es: [
    r("absolute", /sin dolor|indoloro/i, "con anestesia local, cómodo para la mayoría de pacientes"),
    r("absolute", /para siempre|de por vida|permanente|definitiv|para toda la vida/i, "duradero con un buen cuidado"),
    r("absolute", /previene/i, "puede ayudar a prevenir"),
    r("absolute", /inmediat|efectos/i, "los resultados y los posibles efectos varían; te los explicamos"),
    r("guarantee", /sin riesgo/i, "te explicamos los beneficios y los riesgos"),
    r("guarantee", /garant|asegurad/i, "los resultados varían de una persona a otra"),
    r("superlative", /mejor|número uno|n[º°]|líder|más barat|únic/i, "nuestro equipo (hechos, no superlativos)"),
    r("price", /descuento|promoci|oferta|gratis|sorteo|cup[oó]n|2\s?x\s?1|intereses|precio|financiación|tiempo limitado|este mes|pesos|mxn/i, "Pregúntanos en tu próxima revisión."),
    r("before_after", /antes y/i, "cómo es el tratamiento, paso a paso"),
    r("testimonial", /testimonio|opinion|reseña|pacientes|famos|celebridad/i, "las preguntas que más nos hacen los pacientes"),
    r("cure", /cura/i, "puede ayudar a tratar"),
    r("fear", /perder/i, "si no se trata, puede empeorar con el tiempo"),
    r("fear", /tarde|esper/i, "Si notas esto, consúltalo con tu dentista."),
    r("fear", /hoy|oportunidad|plazas|oferta|prisa|pierdas|agotar/i, "Cuando te venga bien, pregúntanos por una cita en la clínica."),
  ],
  fr: [
    r("absolute", /sans douleur/i, "sous anesthésie locale, confortable pour la plupart des patients"),
    r("absolute", /à vie|pour toujours|permanent/i, "durable avec un bon entretien"),
    r("absolute", /prévient/i, "peut aider à prévenir"),
    r("guarantee", /sans risque/i, "nous vous expliquons les bénéfices et les risques"),
    r("guarantee", /garanti/i, "les résultats varient d'une personne à l'autre"),
    r("superlative", /meilleur|moins cher/i, "notre équipe (des faits, pas de superlatifs)"),
    r("price", /réduction|promo|offre|gratuit/i, "Posez-nous la question lors de votre prochain contrôle."),
    r("before_after", /avant/i, "le déroulement du traitement, étape par étape"),
    r("testimonial", /témoignage|nos patients/i, "les questions que nos patients posent souvent"),
    r("cure", /guéri/i, "peut aider à traiter"),
    r("fear", /perdre/i, "sans traitement, cela peut s'aggraver avec le temps"),
    r("fear", /tard|attendez/i, "Si vous remarquez ce signe, parlez-en à votre dentiste."),
    r("fear", /aujourd|seulement|uniquement|chance|limitée|dépêchez|manquez|offre|épuisement/i, "Quand cela vous convient, demandez-nous un rendez-vous."),
  ],
  pl: [
    r("absolute", /bezbolesn|bez (żadnego )?bólu/i, "w znieczuleniu miejscowym, komfortowo dla większości pacjentów"),
    r("absolute", /na zawsze|dożywotn|na całe życie|na stałe|trwał/i, "przy dobrej higienie może służyć wiele lat"),
    r("absolute", /zapobiega/i, "może pomóc zapobiegać"),
    r("guarantee", /ryzyka/i, "omawiamy z Tobą korzyści i ryzyko"),
    r("guarantee", /gwaran/i, "efekty są różne u różnych osób"),
    r("superlative", /najlepsz|numer jeden|najtańsz|najniższ/i, "nasz zespół (fakty zamiast superlatywów)"),
    r("price", /rabat|zniżk|promocj|gratis|za darmo|bezpłatn|oferta|zł|pln/i, "Zapytaj nas podczas następnej wizyty kontrolnej."),
    r("before_after", /przed i po/i, "jak krok po kroku wygląda zabieg"),
    r("testimonial", /pacjen|opini|referencj/i, "pytania, które pacjenci zadają nam najczęściej"),
    r("cure", /wylecz|leczy/i, "może pomóc w leczeniu"),
    r("fear", /stracić|stracisz/i, "nieleczone może z czasem się nasilać"),
    r("fear", /późno|czekaj/i, "Jeśli zauważysz ten objaw, porozmawiaj z dentystą."),
    r("fear", /tylko|szansa|ograniczon|miejsc|oferta|pospiesz|przegap/i, "Gdy będzie Ci wygodnie, zapytaj nas o termin wizyty."),
  ],
  ar: [
    r("absolute", /ألم|مؤلم/, "تحت التخدير الموضعي، ومريح لمعظم المرضى"),
    r("absolute", /مدى|الأبد|للأبد|دائم/, "يدوم سنوات طويلة مع العناية الجيدة"),
    r("absolute", /فورية/, "تظهر النتائج تدريجياً وتختلف من شخص لآخر"),
    r("absolute", /آثار جانبية/, "نشرح لكم الآثار الجانبية المحتملة"),
    r("absolute", /يقي|تقي|يمنع|تمنع/, "قد يساعد على الوقاية من"),
    r("guarantee", /مخاطر/, "نشرح لكم الفوائد والمخاطر"),
    r("guarantee", /ضمان|مضمون|نضمن|يضمن|تضمن/, "تختلف النتائج من شخص لآخر"),
    r("superlative", /أفضل|أحسن|أمهر|أشهر|الأرخص|أرخص|رقم|الأول/, "فريقنا (حقائق لا مبالغات)"),
    r("price", /خصم|تخفيض|عرض|عروض|مجان|محدودة|سعر|درهم|ريال|دينار/, "اسألونا في زيارة الفحص القادمة."),
    r("before_after", /قبل/, "خطوات العلاج كما تتم عادةً"),
    r("testimonial", /آراء|تجارب|تجربة|شهادات|مرضانا|قصص|نجوم/, "أسئلة يطرحها المرضى علينا كثيراً"),
    r("cure", /يشفي|تشفي|شفاء|نهائي|يقضي|تقضي/, "قد يساعد في العلاج"),
    r("fear", /تفقد/, "إذا لم يُعالج فقد يتفاقم مع الوقت"),
    r("fear", /فوات|تنتظر|احجز/, "إذا لاحظتم ذلك، استشيروا طبيب الأسنان."),
    r("fear", /فرصة|فقط|تفوت|محدودة|سارع|ينتهي/, "اسألونا عن موعد في الوقت الذي يناسبكم."),
  ],
  ja: [
    r("absolute", /無痛|痛くない|痛みのない|痛みゼロ/, "痛みに配慮し、局所麻酔を使って行います（感じ方には個人差があります）"),
    r("absolute", /永久|一生/, "適切なお手入れで長く使えることが多いです"),
    r("absolute", /防ぎます|防止します/, "防ぐのに役立ちます"),
    r("absolute", /絶対|必ず|確実/, "効果には個人差があります"),
    r("guarantee", /リスク|副作用/, "リスクや副作用について事前にご説明します"),
    r("guarantee", /保証/, "結果には個人差があります"),
    r("superlative", /./, "当院の診療内容（事実のみを記載）"),
    r("price", /./, "詳しくは受診時にご相談ください。"),
    r("before_after", /./, "治療の一般的な流れ"),
    r("testimonial", /./, "患者さんからよくいただくご質問"),
    r("cure", /./, "治療に役立つことがあります"),
    r("fear", /./, "気になる症状があれば、歯科医師にご相談ください。"),
  ],
};

/**
 * Safer wordings for a market pack's phrases, by language. Only where a calm
 * sentence can replace it; elsewhere (a sponsored label, a raffle, a title
 * the clinic may or may not hold) the rule's tip says what to do.
 */
export const MARKET_REWRITES: Partial<Record<MarketRuleId, Partial<Record<RewriteLang, string>>>> = {
  booking: { tr: "Merak ettiklerinizi bir sonraki kontrolünüzde diş hekiminize danışabilirsiniz." },
};

const LATIN = ["en", "tr", "de", "es", "fr", "pl"] as const;
type LatinLang = (typeof LATIN)[number];

/** The commonest small words and letters of each Latin-script language. */
const HINTS: Record<LatinLang, RegExp> = {
  en: /(?<![\p{L}])(the|and|your|you|our|with|for|is|are|of|to|teeth|smile)(?![\p{L}])/giu,
  tr: /(?<![\p{L}])(ve|bir|için|ile|bu|çok|diş|dişler|hekim|tedavi|sonuç)(?![\p{L}])|[ğşı]/giu,
  de: /(?<![\p{L}])(und|die|der|das|mit|ist|für|ihre|sie|wir|zähne|praxis)(?![\p{L}])|[äöüß]/giu,
  es: /(?<![\p{L}])(el|la|los|las|y|de|con|para|tu|tus|dientes|clínica)(?![\p{L}])|[ñ¿¡]/giu,
  fr: /(?<![\p{L}])(le|les|et|des|avec|pour|vous|votre|vos|dents|cabinet)(?![\p{L}])|[èêàù]/giu,
  pl: /(?<![\p{L}])(i|w|z|na|się|nie|jest|dla|zęby|gabinet)(?![\p{L}])|[ąęłśżźćń]/giu,
};

/**
 * The language a text is most likely written in: Arabic and Japanese by
 * script, the Latin-script languages by their commonest small words and
 * letters. Only used to pick which language's rewrite to offer first.
 */
export function guessLanguage(text: string): RewriteLang {
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[぀-ヿ一-鿿]/.test(text)) return "ja";
  let best: RewriteLang = "en";
  let most = 0;
  for (const lang of LATIN) {
    const n = text.match(HINTS[lang])?.length ?? 0;
    if (n > most) [best, most] = [lang, n];
  }
  return best;
}

/**
 * A safer wording for a flagged phrase, in its own language, or null when
 * there is none (a bare "100%" or a price figure says nothing about the
 * language: the rule's tip in the page's language is better there).
 * `lang`: the language of the whole text (guessLanguage), tried first.
 */
export function suggestRewrite(match: string, rule: CheckerRuleId, lang: RewriteLang = guessLanguage(match)): string | null {
  // Figures alone: no language to answer in.
  if (!/\p{L}/u.test(match)) return null;
  const market = MARKET_REWRITES[rule as MarketRuleId];
  if (market) return market[lang] ?? market[guessLanguage(match)] ?? null;
  const script = guessLanguage(match);
  const order: RewriteLang[] =
    script === "ar" || script === "ja" ? [script] : [...(LATIN as readonly RewriteLang[]).includes(lang) ? [lang] : [], ...LATIN.filter((l) => l !== lang)];
  for (const l of order) {
    for (const x of REWRITES[l]) if (x.rule === rule && x.re.test(match)) return x.fix;
  }
  return null;
}
