/**
 * What "sounds like a dentist, not like AI" means, in patterns a machine can
 * check. Shared by the writers' prompts (told up front), the deterministic
 * post-checks in week.ts (before any paid reviewer runs) and the offline
 * rubric (rubric.ts). Every list here came from reading real output: the 30
 * baseline scripts in fixtures/baseline-scripts.json and docs/QUALITY.md.
 *
 * Pure and dependency-free so it is tested directly.
 */
import { hookLimit, isUnspaced, speechUnits } from "./locale.js";

const L = "[\\p{L}\\p{N}]";
/** Word-bounded, case-insensitive, Unicode-aware (\b only knows ASCII). */
const w = (s: string) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, "iu");

const lang2 = (l: string | undefined) => (l ?? "").toLowerCase().slice(0, 2);

/**
 * Natural text-to-speech pace, in the language's speech unit per second
 * (words; characters for Japanese). Estimates for the eval and post-checks,
 * not the planner's scene timing (locale.ts speechRate): Spanish packs more,
 * shorter words into a second than Turkish or German, whose words are long.
 * Calibrate against real voice-over durations after a live eval.
 */
export const SPOKEN_RATE: Record<string, number> = {
  en: 2.5, de: 2.1, es: 2.7, fr: 2.6, it: 2.5, pt: 2.5, tr: 2.0, pl: 2.0, ar: 2.0, ja: 6.0,
};
export const spokenRate = (language: string | undefined) => SPOKEN_RATE[lang2(language)] ?? 2.4;

/** Estimated seconds to say `text` at a natural pace. */
export function spokenSeconds(text: string, language: string | undefined): number {
  return Math.round((speechUnits(text, language) / spokenRate(language)) * 10) / 10;
}

/** Narration length a Reel/Short holds: hard limits for the post-check, a sweet spot for the rubric. */
export const NARRATION_SECONDS = { min: 15, idealMin: 22, idealMax: 45, max: 60 } as const;

/** The hook has to land in the first ~2 seconds of speech, plus a breath before the answer starts. */
export function hookBudget(language: string | undefined): number {
  return Math.round(spokenRate(language) * 3.5);
}

// ---------------------------------------------------------------------------
// Hooks

export type HookShape = "question" | "moment" | "mistake" | "myth" | "fact" | "statement";

/** Openers the judge and the hook editor already reject, in every language. */
const DID_YOU_KNOW = w(
  "did you know|wussten sie|weißt du(?!,? was)|¿?sabías que|¿?sabía usted|¿?sabías|biliyor muydunuz|biliyor musunuz|biliyor muydun|saviez-vous|le saviez-vous|lo sapeva|lo sapevi|sapevi che|sabia que|sabias que|czy wiesz|czy wiedzą państwo|هل تعلم|هل تعلمون",
);
const TEXTBOOK = [
  /^what (is|are)\s/i,
  /^was (ist|sind)\s/iu,
  /^¿?qu[ée] (es|son) (el|la|los|las|un|una)\s/iu,
  /(?<![\p{L}])nedir\s*\?*\s*$/iu,
  w("^qu'est-ce que|^che cos'è|^o que é|^czym jest|^ما هو|^ما هي"),
  /とは(何|なに)/u,
  /\b(is|are) .{2,40} important\?$/i,
  /(önemli mi|wichtig\?|es importante\?|importante\?)\s*$/iu,
  // "How does X work?" / "X nasıl yapılır?" / "What should you watch for after X?"
  /^how (does|do|to) .{2,60}(work|done)\?$/i,
  /^wie (funktionier|läuft|verläuft)\p{L}* .{2,60}\?$/iu,
  /^¿?cómo (funciona|se hace|es el proceso)/iu,
  /nasıl (işler|çalışır|yapılır|uygulanır|takılıp çıkarılır|önlersiniz|önlenir)\s*\?\s*$/iu,
  /nelere dikkat etmel\p{L}*\s*\?\s*$/iu,
];
const LISTICLE = w("\\d+\\s+(tips?|things?|ways?|signs?|ipucu|şey|yol|işaret|tipps?|dinge|wege|anzeichen|consejos?|cosas|señales|trucos|astuces|choses|consigli|cose|dicas|coisas|porad|rzeczy|sposob\\p{L}*)");
/** "Topic: description" — a label, not a sentence. */
const LABEL = /^[^:?!.]{3,40}:\s+\S/u;
/** A flat "No!" — medicine is rarely absolute, and reviewers reject it. */
const FLAT_NO = w("no!|nein!|hayır!|hayır,? hayır|¡no!|non !|non!|nie!|لا!|いいえ!");
/** Words that hold a hook open: a contrast, a "than you think", a not-quite. */
const TENSION = w(
  "mistake|error|fehler|hata\\p{L}*|erreur|errore|erro|błąd|this\\.?$|esto\\.?$|ceci|das hier|işte|\\p{L}+m[ıiuü]yor|but|yet|though|than you think|not quite|not always|usually not|here's why|ama|ancak|fakat|aslında|sandığınızdan|sandığından|değil|aber|doch|obwohl|als sie denken|als du denkst|lieber nicht|nicht ganz|nicht immer|pero|aunque|de lo que crees|de lo que cree|no siempre|no del todo|mais|pourtant|pas (tout à fait|toujours|si vite)|però|eppure|non (sempre|proprio)|mas|porém|nem sempre|ale|jednak|nie zawsze|لكن|ليس دائماً|でも|実は|とは限らない",
);

export type HookFinding = { code: "did_you_know" | "textbook" | "listicle" | "label" | "flat_no" | "gives_answer" | "flat_statement" | "too_long"; detail: string };

/**
 * What is wrong with a hook, deterministically. Empty means "no known
 * failure", not "great" — the judge decides great.
 */
export function hookProblems(hook: string, language: string | undefined): HookFinding[] {
  const h = hook.trim();
  const out: HookFinding[] = [];
  if (DID_YOU_KNOW.test(h)) out.push({ code: "did_you_know", detail: `"Did you know" opener: ${h}` });
  if (TEXTBOOK.some((re) => re.test(h))) out.push({ code: "textbook", detail: `textbook question: ${h}` });
  if (LISTICLE.test(h)) out.push({ code: "listicle", detail: `listicle label: ${h}` });
  if (LABEL.test(h) && !/\?\s*$/.test(h.split(":")[0])) out.push({ code: "label", detail: `"Topic: description" label: ${h}` });
  if (FLAT_NO.test(h)) out.push({ code: "flat_no", detail: `flat "No!" — say "not quite" / "usually not": ${h}` });
  const open = /[?？؟…]|\.\.\.|—|–/.test(h) || TENSION.test(h);
  if (!open) {
    // A number in a closed statement is usually the answer ("3 aşamada gerçekleşir.").
    if (/\d/.test(h)) out.push({ code: "gives_answer", detail: `states the answer instead of opening a question: ${h}` });
    else out.push({ code: "flat_statement", detail: `flat statement with nothing left open: ${h}` });
  }
  if (speechUnits(h, language) > hookLimit(language).max) out.push({ code: "too_long", detail: `${speechUnits(h, language)} ${isUnspaced(language) ? "characters" : "words"}, limit ${hookLimit(language).max}` });
  return out;
}

/** Problems that make a hook unusable (the editor drops such candidates; the post-check sends them back). */
export const BLOCKING_HOOK = new Set<HookFinding["code"]>(["did_you_know", "textbook", "listicle", "label", "flat_no", "too_long"]);

export function hookShape(hook: string): HookShape {
  const h = hook.trim();
  if (/^(that|this|ese|esa|aquel|aquella|o |a |jene|dieses?|bu |o an|şu |ce |cette|quella|quel|aquela|aquele|to |تلك|あの)/iu.test(h) || /…|\.\.\.$/.test(h)) return "moment";
  if (/\?[^?]*(not quite|usually not|lieber nicht|nicht ganz|no siempre|no del todo|pas si vite|değil|aslında)/iu.test(h) || /\?\s*\S+.*\.$/u.test(h)) return "myth";
  if (/[?？؟]\s*$/u.test(h)) return "question";
  if (w("mistake|wrong|error|fehler|falsch|hata|yanlış|equivoc\\p{L}*|erreur|errore|erro|błąd").test(h)) return "mistake";
  if (/\d/.test(h)) return "fact";
  return "statement";
}

// ---------------------------------------------------------------------------
// Generic AI filler and written register

/**
 * Phrases that mark a script as machine-written or leaflet-like, by
 * language. Each one was seen in real output or is a known model tic. They
 * are banned outright: the writers are told up front, the post-check sends
 * a script back if one slips through.
 */
export const FILLER: Record<string, string[]> = {
  en: ["your smile deserves", "your smile is our priority", "we're here to help", "we are here to help", "don't hesitate to", "in today's world", "game-changer", "game changer", "journey to a", "it is important to note", "it's important to note", "here's the thing", "for more information", "your oral health matters"],
  tr: ["daha fazla bilgi için", "bizimle iletişime geçin", "gülüşünüz bizim için önemli", "sağlıklı bir gülümseme için", "unutmayın,", "önem arz eder", "oldukça önemlidir", "ağız sağlığınız için gerekli adımları", "sağlıklı gülüşler"],
  de: ["ihr lächeln ist uns wichtig", "wissen sie was", "für weitere informationen", "kontaktieren sie uns", "entscheidend für ihre zahngesundheit", "ein strahlendes lächeln", "wir sind für sie da", "zögern sie nicht"],
  es: ["tu salud bucal es clave", "estamos aquí para ayudarte", "estamos aquí para ayudarle", "pues mira, la verdad es que", "un viaje hacia", "no dudes en", "no dude en", "para más información", "cabe destacar", "tu sonrisa merece", "¡nos vemos pronto!"],
  fr: ["n'hésitez pas", "pour plus d'informations", "votre sourire mérite", "il convient de noter", "nous sommes là pour vous"],
  it: ["non esiti a", "per maggiori informazioni", "il suo sorriso merita", "siamo qui per aiutarla"],
  pt: ["não hesite em", "para mais informações", "o teu sorriso merece", "estamos aqui para ajudar"],
  pl: ["nie wahaj się", "nie wahajcie się", "w celu uzyskania", "należy podkreślić", "państwa uśmiech zasługuje"],
  ar: ["لا تترددوا", "تجدر الإشارة إلى", "لمزيد من المعلومات", "ابتسامتكم تستحق"],
  ja: ["お気軽にお問い合わせください", "詳しくはお問い合わせください", "することが重要です"],
};

/** Written-register markers: correct grammar, wrong for speech. */
export const WRITTEN_REGISTER: Record<string, RegExp[]> = {
  tr: [w("gerçekleştiril\\p{L}*|gerçekleşir|sağlanmaktadır|mevcuttur|\\p{L}+(mekte|makta)(dır|dir)"), w("önem arz")],
  de: [w("erfolgt|gewährleistet|im rahmen (de[rsm]|eine[rs]?)|seitens"), w("es ist wichtig, (zu|dass)")],
  es: [w("se lleva a cabo|cabe destacar|cabe mencionar|es importante (que|destacar)|resulta fundamental")],
  en: [w("is carried out|it is important to|is performed by|in order to ensure")],
  fr: [w("il convient de|s'effectue|est réalisée? par")],
  it: [w("viene effettuat\\p{L}*|si raccomanda di|è importante sottolineare")],
  pt: [w("é realizad\\p{L}*|recomenda-se|é importante salientar")],
  pl: [w("dokonuje się|przeprowadzany jest|należy podkreślić|w celu")],
  ar: [/يتم إجراء|تجدر الإشارة|حيث إن/u],
  ja: [/を行います|となっております|に関しましては/u],
};

/** Stock openers the old spoken cues taught the narrator; one per week is a tic, two is a pattern. */
export const STOCK_OPENERS = w(
  "^(wissen sie was|weißt du was|pues mira|mira,? la verdad|here's the thing|bakın,|aslında,|vous savez|sa una cosa|sabe que mais|wiedzą państwo co|wiesz co|في الحقيقة|実は)",
);

export function fillerHits(text: string, language: string | undefined): string[] {
  const t = text.toLocaleLowerCase(lang2(language) || "en");
  const list = [...(FILLER[lang2(language)] ?? []), ...(lang2(language) === "en" ? [] : FILLER.en.filter((p) => p.length > 14))];
  return [...new Set(list.filter((p) => t.includes(p)))];
}

export function registerHits(text: string, language: string | undefined): string[] {
  const out: string[] = [];
  for (const re of WRITTEN_REGISTER[lang2(language)] ?? []) {
    const m = text.match(re);
    if (m) out.push(m[0]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The call to action

/** Urgency and pressure — banned in every market's rules and in good taste. */
const PRESSURE = w(
  "now|today|hurry|don't wait|do not wait|limited|last chance|right away|hemen|şimdi|bugün|kaçırmayın|acele|son fırsat|beklemeyin|jetzt|sofort|heute noch|nicht warten|warten sie nicht|nur noch|schnell|ya mismo|ahora mismo|hoy mismo|no esperes|no espere|date prisa|corre|últimas plazas|maintenant|dès aujourd'hui|n'attendez pas|subito|oggi stesso|non aspettare|já|agora|não esperes|não espere|teraz|dziś|nie czekaj|الآن|فوراً|لا تنتظروا|今すぐ|お急ぎ",
);
/** Generic, interchangeable closings that say nothing about this video. */
const GENERIC_CTA = w(
  "for more information|contact us|daha fazla bilgi|bizimle iletişime geçin|bize ulaşın|für weitere informationen|kontaktieren sie uns|para más información|contáctanos|contáctenos|pour plus d'informations|contactez-nous|per maggiori informazioni|contattaci|para mais informações|contacte-nos|skontaktuj|لمزيد من المعلومات|お問い合わせください",
);
/** In Türkiye the close must not send the viewer to this clinic (RG 33075: informative only). */
const TR_STEERING = w("randevu al\\p{L}*|bize ulaş\\p{L}*|kliniğimiz\\p{L}*|iletişime geçin|bizi arayın|bize yazın");

export type CtaFinding = { code: "missing" | "pressure" | "exclamation" | "generic" | "steering"; detail: string };

export function ctaProblems(cta: string | undefined, country: string | undefined): CtaFinding[] {
  if (!cta?.trim()) return [{ code: "missing", detail: "no closing call to action" }];
  const out: CtaFinding[] = [];
  const m = cta.match(PRESSURE);
  if (m) out.push({ code: "pressure", detail: `urgency in the CTA: "${m[0]}"` });
  if (/[!！]/.test(cta)) out.push({ code: "exclamation", detail: "exclamation mark in the CTA reads as a sales push" });
  const g = cta.match(GENERIC_CTA);
  if (g) out.push({ code: "generic", detail: `generic closing: "${g[0]}"` });
  if ((country ?? "").toUpperCase() === "TR") {
    const s = cta.match(TR_STEERING);
    if (s) out.push({ code: "steering", detail: `steers the viewer to the clinic ("${s[0]}") — RG 33075 allows information only` });
  }
  return out;
}

/** The CTA findings the post-check acts on (the rest only lower the score). */
export const BLOCKING_CTA = new Set<CtaFinding["code"]>(["pressure", "steering"]);

/**
 * How the closing line should sound in this market, told to the writers.
 * Türkiye is strictest: the clinic may inform, not steer, so the close sends
 * the viewer to their own dentist's next check-up.
 */
export function ctaGuide(country: string | undefined, address: "formal" | "informal" = "formal"): string {
  const c = (country ?? "").toUpperCase();
  if (c === "TR")
    return `The closing line only informs: invite the viewer to ask their own dentist at their next check-up (e.g. "Merak ettiğiniz bir şey varsa bir sonraki kontrolünüzde hekiminize sorabilirsiniz."). Never "randevu alın", "bize ulaşın", "iletişime geçin", "kliniğimiz", no exclamation mark, no urgency — Türkiye's rules (RG 33075) forbid steering viewers to a clinic.`;
  return `The closing line is one calm, specific sentence tied to THIS video's subject (e.g. ${address === "informal" ? `"Notice it too? Mention it at your next check-up."` : `"If this sounds familiar, mention it at your next check-up."`}), in the clinic's language. It may invite the viewer to ask the clinic or book a check-up, but never with urgency ("now", "today", "don't wait"), never an exclamation mark, never a generic "for more information, contact us", and never the same wording as the clinic's other videos this week.`;
}

// ---------------------------------------------------------------------------
// Clinical red flags a pattern can see

/** Salt-water rinses belong to extractions and implant surgery, never to root canals (accuracy.ts AFTERCARE_GUIDE). */
const SALT = w("salt[- ]water|tuzlu su|salzwasser|agua (con|y) sal|eau salée|acqua e sale|água (com|e) sal|wod\\p{L}* z sol\\p{L}*|ماء (و|ب)ملح|塩水");
const ROOT_CANAL = w("root canal|kanal tedavi\\p{L}*|wurzel\\p{L}*|endodonc\\p{L}*|dévitalisation|traitement de canal|devitalizzazion\\p{L}*|tratamento de canal|leczeni\\p{L}* kanałow\\p{L}*|علاج العصب|根管");
const EXTRACTION = w("extraction|implant\\p{L}*|çekim|diş çeki\\p{L}*|extrakt\\p{L}*|zahnentfernung|extracci[oó]n|extraction|estrazion\\p{L}*|extração|ekstrakcj\\p{L}*|خلع|抜歯");
const MEDICATION = w("painkiller\\p{L}*|ibuprofen|paracetamol|antibiotic\\p{L}*|ağrı kesici\\p{L}*|antibiyoti\\p{L}*|schmerzmittel\\p{L}*|antibioti\\p{L}*|analgésic\\p{L}*|antibiótic\\p{L}*|antidolorifici|analgési\\p{L}*|leki przeciwbólowe|مسكن\\p{L}*|مضاد حيوي|痛み止め|抗生");
const DEFER = w("dentist\\p{L}*|hekim\\p{L}*|doktor\\p{L}*|zahnarzt\\p{L}*|zahnärzt\\p{L}*|dentista\\p{L}*|odontólog\\p{L}*|médic\\p{L}*|dentiste|medico|lekarz\\p{L}*|stomatolog\\p{L}*|طبيب\\p{L}*|歯科医|先生");
/** Made-up statistics: a percentage that is not a guideline (100% and "20% off" are compliance hits, caught by the hard rules). */
const PERCENT = /(?<![\d.,])(?!100\s?[%％])\d{1,2}([.,]\d)?\s?[%％](?!\s*(off|rabatt|indirim|descuento|de descuento|günstiger|sconto|réduction|de réduction|desconto|zniżk))/iu;

export function clinicalFlags(text: string): string[] {
  const out: string[] = [];
  if (SALT.test(text) && ROOT_CANAL.test(text) && !EXTRACTION.test(text)) out.push("salt-water rinse in a root-canal script (extraction/implant aftercare)");
  for (const sentence of text.split(/(?<=[.!?。？！])\s+|\n/)) {
    if (MEDICATION.test(sentence) && !DEFER.test(sentence)) out.push(`medication advice without "as your dentist advises": ${sentence.trim().slice(0, 80)}`);
  }
  const p = text.match(PERCENT);
  if (p) out.push(`a percentage statistic ("${p[0]}") — invented numbers are not allowed`);
  return out;
}

/** Digits (and digit ranges) in a text, for "the narration may not add numbers". */
export function numbersIn(text: string): Set<string> {
  return new Set((text.match(/\d+/g) ?? []).map((n) => String(Number(n))));
}

/**
 * An effect stated as certain ("Diş eti sağlığını korur.", "inceltmez") —
 * the reviewers send these back for a hedge; the rubric counts them so a
 * prompt change that reduces them shows up offline.
 */
const EFFECT: Record<string, RegExp> = {
  tr: /(?<![\p{L}])(korur|azaltır|neden olur|yol açar|güçlendirir|inceltmez|zarar vermez|iyileştirir|tehdit eder|giderir)(?![\p{L}])/iu,
  de: /(?<![\p{L}])(schützt|beseitigt|schadet nicht|schädigt nicht|stärkt|entfernt alle)(?![\p{L}])/iu,
  es: /(?<![\p{L}])(protege|elimina|no daña|fortalece|causa)(?![\p{L}])/iu,
  en: /(?<![\p{L}])(protects|eliminates|doesn't damage|does not damage|strengthens|causes)(?![\p{L}])/iu,
};
const HEDGE: Record<string, RegExp> = {
  tr: /(ebil|abil|genellikle|çoğu|olabilir|beklenmez|bazen|sıklıkla|yardımcı ol)/iu,
  de: /(?<![\p{L}])(kann|können|könnte|oft|meist\p{L}*|häufig|in der regel|manchmal|helfen)(?![\p{L}])/iu,
  es: /(?<![\p{L}])(puede\p{L}*|pueden|suele\p{L}*|generalmente|a menudo|normalmente|a veces|ayuda\p{L}*)(?![\p{L}])/iu,
  en: /(?<![\p{L}])(can|may|might|usually|often|most|typically|helps?)(?![\p{L}])/iu,
};

export function unhedgedClaims(text: string, language: string | undefined): string[] {
  const l = lang2(language);
  const effect = EFFECT[l];
  const hedge = HEDGE[l];
  if (!effect || !hedge) return [];
  return text
    .split(/(?<=[.!?。？！])\s+|\n/)
    .map((x) => x.trim())
    .filter((x) => effect.test(x) && !hedge.test(x) && !/[?¿？]/.test(x));
}
