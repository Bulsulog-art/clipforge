/**
 * Checks a dentist would make before posting a video, and that a pattern can
 * make for free (they run in week.ts scriptProblems / captionProblems, before
 * any paid reviewer, and come back to the writer as exact fixes).
 *
 * Each one comes from a real script a skeptical dentist read (review of
 * 2026-11-15, and the value bench in bench/value-week.ts):
 *
 *  - practiceClaims: the video says something about THIS practice that the
 *    clinic never told us. "Ein kinderfreundliches Umfeld, interaktive Spiele
 *    und kleine Belohnungen … Unser Team erklärt alles spielerisch" (DE
 *    children's video); "call our office or after-hours line" (US caption of
 *    a practice that never said it has one). If it is not true, the clinic is
 *    publishing a misleading statement about itself, which is exactly the
 *    risk the product sells protection from.
 *  - droppedHedges: the voice says "genelde inceltmez" (usually does not thin
 *    the enamel), the on-screen card says "mineyi inceltmez" (does not). The
 *    screen is what a muted viewer reads and what a regulator screenshots, so
 *    it must be at least as careful as the narration.
 *  - stackedHedges: the opposite failure, "önerilebilir … yardımcı olabilir …
 *    katkı sağlayabilir … kolaylaştırabilir" in eight seconds — careful, but
 *    it sounds like a disclaimer read by a robot. One qualifier per claim.
 *  - wrongLanguage: an English "Not quite." on a Turkish screen, and a US
 *    caption that opened in Spanish ("Lo importante: un filling y una crown
 *    no son lo mismo.").
 *  - stockOpeners / casual tone: "Wissen Sie was?", "Wissen Sie Kinder und
 *    Zahnarzt?", "Most folks", "funky", "dodge it".
 */

const lang2 = (l: string | undefined) => (l ?? "").toLowerCase().slice(0, 2);

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。？！؟…])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

// ---------------------------------------------------------------------------
// Statements about the practice

/** "We / our team / our practice" in each language: the sentence speaks for this clinic. */
const PRACTICE_VOICE: Record<string, RegExp> = {
  en: /\b(we|we're|we've|our|us)\b/i,
  de: /\b(wir|unser\w*|uns)\b/i,
  tr: /(kliniğimiz\w*|ekibimiz\w*|muayenehanemiz\w*|polikliniğimiz\w*|hekimlerimiz\w*|\bbiz\b|\bbizde\b|\bbizim\b)/i,
  es: /\b(nosotros|nuestr[oa]s?|ofrecemos|contamos con|tenemos)\b/i,
  fr: /\b(nous|notre|nos)\b/i,
  it: /\b(noi|nostr[oaie]|offriamo|abbiamo)\b/i,
  pt: /\b(nós|noss[oa]s?|oferecemos|temos)\b/i,
  pl: /\b(my|nasz\w*|oferujemy|mamy)\b/i,
};

/**
 * Things a practice may or may not have, which a script must never assert on
 * its behalf: equipment, perks for children, opening hours, a phone line,
 * languages, atmosphere, sedation, financing, years of experience.
 */
const PRACTICE_FEATURES: Record<string, RegExp> = {
  en: /\b(games?|rewards?|prizes?|toys?|stickers?|treasure|tv|screens?|music|playroom|kid-friendly|child-friendly|after-hours line|hotline|24\/7|open (late|evenings|weekends|saturdays?|sundays?)|weekend hours|evening hours|same-day|walk-ins?|parking|speak (spanish|english)|bilingual|sedation|laughing gas|nitrous|laser|microscope|3d|scanner|digital x-?rays?|state-of-the-art|latest technology|modern equipment|spa|blankets?|headphones|financing|payment plans?|insurance accepted|in-network|years of experience|award)\b/i,
  de: /(spiel\w*|belohnung\w*|geschenk\w*|spielzeug|spielecke|kinderecke|kinderfreundlich\w*|aufkleber|fernseh\w*|bildschirm\w*|musik|notdienst|notfallnummer|abends|samstags|sonntags|wochenende|parkpl\w*|sprechen \w+isch|lachgas|sedierung|vollnarkose|dämmerschlaf|laser|mikroskop|3d|scanner|digitales röntgen|modernste|neueste technik|wohlfühl\w*|kopfhörer|ratenzahlung|finanzierung|jahre erfahrung|ausgezeichnet)/i,
  tr: /(oyun\w*|ödül\w*|hediye\w*|oyuncak\w*|çıkartma\w*|televizyon|ekran\w*|müzik|çocuk dostu|nöbet\w*|7\/24|hafta sonu|akşam saat\w*|otopark|sedasyon|uyutarak|genel anestezi|gülme gazı|lazer|mikroskop|3d|tarayıcı|dijital röntgen|son teknoloji|modern cihaz\w*|en yeni teknoloji|taksit\w*|yıllık deneyim|ödüllü)/i,
  es: /\b(juegos?|premios?|regalos?|juguetes?|pegatinas?|televisión|pantallas?|música|sala de juegos|urgencias 24|24 horas|fines de semana|sábados|aparcamiento|estacionamiento|sedación|óxido nitroso|láser|microscopio|3d|escáner|última tecnología|financiación|meses sin intereses|años de experiencia)\b/i,
};

/**
 * Sentences that state something about this practice — an amenity, a perk,
 * a phone line, equipment, hours — that the clinic did not put in its profile.
 * `known` is the clinic's own text (name, city, services): a feature named
 * there ("Behandlung von Angstpatienten mit Lachgas") is the clinic's claim
 * and passes.
 */
export function practiceClaims(text: string, language: string | undefined, known = ""): string[] {
  const l = lang2(language);
  const voice = PRACTICE_VOICE[l] ?? PRACTICE_VOICE.en;
  const features = PRACTICE_FEATURES[l] ?? PRACTICE_FEATURES.en;
  const knownLower = known.toLocaleLowerCase(l || "en");
  const out: string[] = [];
  for (const s of splitSentences(text)) {
    if (!voice.test(s)) continue;
    const m = s.match(features);
    if (!m) continue;
    if (knownLower.includes(m[0].toLocaleLowerCase(l || "en"))) continue;
    out.push(s);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Qualifiers ("usually", "can")

/** Words that soften a claim, per language. Turkish also hedges with the -ebil-/-abil- verb form. */
const HEDGES: Record<string, RegExp> = {
  en: /\b(usually|often|can|could|may|might|most|many|some|typically|generally|tend|tends|likely|sometimes|for most people|often)\b/gi,
  de: /\b(meist\w*|oft|häufig|kann|können|könnte\w*|in der regel|manchmal|eher|wahrscheinlich|typischerweise|gewöhnlich|vielen|viele|einige)\b/gi,
  tr: /(genelde|genellikle|çoğu zaman|çoğunlukla|bazen|sıklıkla|çoğunda|olası|[a-zçğıöşü]+(?:ebil|abil)[a-zçğıöşü]*)/gi,
  es: /\b(suele\w*|normalmente|puede\w*|a menudo|generalmente|casi|algunos|muchos|habitualmente|a veces)\b/gi,
  fr: /\b(souvent|généralement|peut|peuvent|parfois|la plupart|habituellement)\b/gi,
  it: /\b(spesso|di solito|può|possono|a volte|generalmente|la maggior parte)\b/gi,
  pt: /\b(geralmente|muitas vezes|pode|podem|às vezes|normalmente|a maioria)\b/gi,
  pl: /\b(zwykle|często|może|mogą|czasem|zazwyczaj|większość)\b/gi,
};

/**
 * The qualifiers that change what a sentence claims: how often, how likely.
 * Modal verbs ("can", "kann", "-ebilir") are left out of the screen-vs-voice
 * comparison: in "you can ask" or "sorabilirsiniz" they mean ability, and a
 * card that says "Ask" is not less careful.
 */
const FREQUENCY: Record<string, RegExp> = {
  en: /\b(usually|often|typically|generally|tend|tends|likely|sometimes|in most cases|for most people)\b/gi,
  de: /\b(meist\w*|oft|häufig|in der regel|manchmal|wahrscheinlich|typischerweise|gewöhnlich|in den meisten fällen)\b/gi,
  tr: /(genelde|genellikle|çoğunlukla|çoğu zaman|çoğu kişide|bazen|sıklıkla|çoğunda)/gi,
  es: /\b(suele\w*|normalmente|a menudo|generalmente|habitualmente|a veces|en la mayoría)\b/gi,
  fr: /\b(souvent|généralement|parfois|habituellement|la plupart du temps)\b/gi,
  it: /\b(spesso|di solito|a volte|generalmente)\b/gi,
  pt: /\b(geralmente|muitas vezes|às vezes|normalmente)\b/gi,
  pl: /\b(zwykle|często|czasem|zazwyczaj)\b/gi,
};

function frequencyCount(s: string, l: string): number {
  const re = FREQUENCY[l];
  return re ? (s.toLocaleLowerCase(l || "en").match(new RegExp(re.source, "gi")) ?? []).length : 0;
}

export function hedgeCount(sentence: string, language: string | undefined): number {
  const re = HEDGES[lang2(language)];
  if (!re) return 0;
  return (sentence.toLocaleLowerCase(lang2(language) || "en").match(new RegExp(re.source, "gi")) ?? []).length;
}

const tokens = (s: string, l: string) =>
  new Set(
    s
      .toLocaleLowerCase(l || "en")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      // Stems, so "inceltmez"/"inceltmez." and "Zähne"/"Zähnen" still meet.
      .map((t) => t.slice(0, 6))
      .filter((t) => t.length > 2),
  );

function sharedShare(a: string, b: string, l: string): number {
  const A = tokens(a, l);
  const B = tokens(b, l);
  if (A.size < 2 || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n / A.size;
}

/**
 * On-screen lines that state as certain what the narration says with a
 * qualifier. A line is matched to the narration sentence it shares most of
 * its words with; when that sentence hedges and the line does not, the
 * qualifier was dropped on the way to the screen.
 */
export function droppedHedges(screen: string[], narration: string, language: string | undefined): { line: string; spoken: string }[] {
  const l = lang2(language);
  if (!HEDGES[l] || !narration.trim()) return [];
  // Matched clause by clause: "it usually has a temporary filling, so avoid
  // chewing hard things there" hedges the filling, not the instruction.
  const clauses = splitSentences(narration).flatMap((s) => s.split(/[,;:–—]\s+/u)).map((c) => c.trim()).filter(Boolean);
  const out: { line: string; spoken: string }[] = [];
  for (const line of screen) {
    // Labels and list items ("Wasser, Joghurt") carry no claim to hedge.
    // Questions ask, they do not claim ("Whitening ruins enamel?").
    // Labels ("Gut: helle Speisen", "Bigger break: filling or crown") name a case, they do not claim.
    if (tokens(line, l).size < 3 || hedgeCount(line, l) > 0 || /[?？؟]\s*$/u.test(line) || /^[^:]{1,24}:\s/u.test(line)) continue;
    let best: string | undefined;
    let bestShare = 0;
    for (const c of clauses) {
      const share = sharedShare(line, c, l);
      if (share > bestShare) {
        best = c;
        bestShare = share;
      }
    }
    if (best && bestShare >= 0.6 && frequencyCount(best, l) > 0) out.push({ line, spoken: best });
  }
  return out;
}

/**
 * Hedging piled on until it sounds like a disclaimer: two qualifiers in one
 * sentence ("genelde ilk günlerde görülebilir"), or most sentences of the
 * narration hedged. Returns the fix, or nothing.
 */
export function stackedHedges(narration: string, language: string | undefined): string | undefined {
  const l = lang2(language);
  if (!HEDGES[l]) return undefined;
  const sents = splitSentences(narration);
  if (!sents.length) return undefined;
  // Turkish stacks most easily ("genelde … görülebilir"); elsewhere three
  // ordinary qualifiers in one sentence still read naturally ("some … can … usually").
  const double = sents.find((s) => hedgeCount(s, l) >= (l === "tr" ? 2 : 4));
  if (double) return `"${double}" stacks qualifiers — keep one per claim and say the rest plainly`;
  const hedged = sents.filter((s) => hedgeCount(s, l) > 0).length;
  if (sents.length >= 5 && hedged / sents.length > 0.6)
    return `${hedged} of ${sents.length} narration sentences are hedged ("-ebilir", "can", "usually"): hedge only the claims that really vary, and say facts and instructions plainly`;
  return undefined;
}

// ---------------------------------------------------------------------------
// Language

/** Very common function words; enough to tell which language a sentence is in. */
const STOPWORDS: Record<string, string[]> = {
  en: ["the", "and", "is", "are", "your", "you", "it", "of", "to", "with", "not", "quite", "really", "what", "this", "that", "for", "can", "usually"],
  es: ["el", "la", "los", "las", "lo", "un", "una", "y", "es", "son", "no", "que", "para", "con", "tu", "su", "del", "importante"],
  de: ["der", "die", "das", "und", "ist", "sind", "nicht", "sie", "ihr", "ihre", "mit", "für", "ein", "eine", "auf", "zu"],
  tr: ["ve", "bir", "bu", "için", "ile", "da", "de", "değil", "mi", "ama", "çok", "daha", "sonra", "gibi", "olan"],
  fr: ["le", "la", "les", "et", "est", "sont", "pas", "vous", "votre", "avec", "pour", "un", "une", "des"],
  it: ["il", "gli", "è", "non", "per", "con", "una", "che", "del", "della", "sono"],
  pt: ["os", "é", "não", "para", "com", "um", "uma", "que", "do", "dos", "você"],
  pl: ["jest", "nie", "się", "że", "czy", "jak", "dla", "przez"],
};

function counts(sentence: string): Record<string, number> {
  const words = sentence.toLocaleLowerCase().replace(/[^\p{L}\s]+/gu, " ").split(/\s+/).filter(Boolean);
  const out: Record<string, number> = {};
  for (const [l, list] of Object.entries(STOPWORDS)) out[l] = words.filter((w) => list.includes(w)).length;
  return out;
}

/**
 * "Not quite" in each language: how a myth is answered without an absolute.
 * The prompts give the writer ONLY its own language's phrase. A prompt that
 * listed several ("Pek sayılmaz", "Nicht ganz", "No del todo") got a German
 * card that opened "Pek sayılmaz: Die frische Zahnoberfläche…" (bench, Nov 2026).
 */
export const NOT_QUITE: Record<string, string> = {
  en: "Not quite",
  tr: "Pek sayılmaz",
  de: "Nicht ganz",
  es: "No del todo",
  fr: "Pas tout à fait",
  it: "Non proprio",
  pt: "Não exatamente",
  pl: "Nie do końca",
  ja: "そうとも限りません",
  ar: "ليس تماماً",
};

export function notQuite(language: string | undefined): string {
  return NOT_QUITE[lang2(language)] ?? NOT_QUITE.en;
}

/** English phrases models carry into other languages from an English prompt. */
const ENGLISH_CARRYOVER = /\b(not quite|not really|usually not|here's why|fun fact|pro tip)\b/i;

/**
 * Sentences (or on-screen lines) written in another language than the video:
 * an English "Not quite." on a Turkish card, a Spanish opening line in a US
 * caption. Japanese and Arabic are not checked (their scripts make a stray
 * Latin sentence obvious to the reviewers already).
 */
export function wrongLanguage(lines: string[], language: string | undefined): string[] {
  const l = lang2(language);
  if (!STOPWORDS[l]) return [];
  const out: string[] = [];
  for (const line of lines.flatMap(splitSentences)) {
    if (l !== "en" && ENGLISH_CARRYOVER.test(line)) {
      out.push(line);
      continue;
    }
    // Another language's "not quite", carried over from an example.
    const lower = line.toLocaleLowerCase();
    if (Object.entries(NOT_QUITE).some(([k, v]) => k !== l && k !== "en" && lower.includes(v.toLocaleLowerCase()))) {
      out.push(line);
      continue;
    }
    const c = counts(line);
    const own = c[l] ?? 0;
    const [other, n] = Object.entries(c)
      .filter(([k]) => k !== l)
      .sort((a, b) => b[1] - a[1])[0];
    // Two clear function words of another language and more of them than of
    // the video's own: that sentence is in the other language.
    if (other && n >= 2 && n > own + 1) out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Register

/** Stock openers and a register too casual for a practice's feed, per language. */
const OFF_REGISTER: Record<string, RegExp> = {
  en: /\b(most folks|folks|funky|zippy|dodge|gonna|wanna|y'all|super easy|no biggie|totally)\b/i,
  de: /^\s*wissen sie\b|\bwissen sie was\b|\bkrass\b|\bmega\b|\bsuper easy\b/i,
  tr: /^\s*biliyor muydunuz|\bsüper kolay\b|\bkanka\b/i,
  es: /^\s*¿sabías que|\bsúper fácil\b|\bguay\b/i,
};

export function offRegister(text: string, language: string | undefined): string[] {
  const re = OFF_REGISTER[lang2(language)];
  if (!re) return [];
  return splitSentences(text)
    .map((s) => s.match(re)?.[0]?.trim())
    .filter((m): m is string => !!m);
}
