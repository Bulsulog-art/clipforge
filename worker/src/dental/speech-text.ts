/**
 * Narration text → what the TTS voice should actually read.
 *
 * The narrator writes for the eye as well as the ear: "z. B.", "%20",
 * "20-22 Stunden", "2x täglich", "Dr.", "fırça/ip", "¡Pide cita!". OpenAI's
 * TTS takes plain text only (no SSML), so everything a voice could misread
 * is spelled out here, per language, and punctuation is shaped for calm
 * prosody: sentence breaks where a section ends, commas for dashes and
 * brackets, no exclamation marks (they make tts-1 sound like an advert).
 *
 * Only the audio is affected; the plan keeps the narrator's text.
 */

type Lang = "tr" | "de" | "es" | "en" | "fr" | "it" | "pt" | "pl" | "ar" | "ja";

/** Letters and digits either side: a token boundary that works for ş, ß, ñ, ł. */
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const NUM = "(\\d+(?:[.,]\\d+)?)";

type Rule = [RegExp, string | ((...m: string[]) => string)];

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** "z. B." matches "z.B." and "z. B." (the inner dots may or may not have a space; the last one keeps its space). */
const esc = (s: string) => s.split(/\.\s?/).map(escRe).join("\\.\\s?").replace(/\\s\?$/, "");
const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
/** Whole tokens only; a lower-case abbreviation also matches capitalised at a sentence start ("Z. B." → "Zum Beispiel"). */
const abbr = (map: Record<string, string>, flags = "gu"): Rule[] =>
  Object.entries(map).flatMap(([k, v]) => {
    const pairs: [string, string][] = [[k, v]];
    if (/^\p{Ll}/u.test(k)) pairs.push([cap(k), cap(v)]);
    return pairs.map(([kk, vv]): Rule => [new RegExp(`${B}${esc(kk)}${kk.endsWith(".") ? "" : E}`, flags), vv]);
  });

/** Abbreviations a TTS voice reads letter by letter or skips. */
const ABBREVIATIONS: Partial<Record<Lang, Record<string, string>>> = {
  tr: { "Dr.": "Doktor", "Dt.": "Diş hekimi", "Prof.": "Profesör", "Doç.": "Doçent", "Uzm.": "Uzman", "vb.": "ve benzeri", "vs.": "vesaire", "örn.": "örneğin", "yak.": "yaklaşık", "bkz.": "bakınız", "DSÖ": "Dünya Sağlık Örgütü" },
  // PZR: tts-1-hd read "Eine PZR dauert…" as "Dann passiert er…" (round trip
  // through gpt-4o-transcribe, Nov 2026); the written-out form is what a
  // patient understands anyway. Aligner, Bleaching and Veneers were read
  // correctly as written, and respelled they got worse, so they stay.
  de: { PZR: "professionelle Zahnreinigung", KFO: "Kieferorthopädie", "Dr.": "Doktor", "Prof.": "Professor", "z. B.": "zum Beispiel", "d. h.": "das heißt", "u. a.": "unter anderem", "bzw.": "beziehungsweise", "usw.": "und so weiter", "ca.": "circa", "evtl.": "eventuell", "ggf.": "gegebenenfalls", "inkl.": "inklusive", "sog.": "sogenannte", "WHO": "Weltgesundheitsorganisation" },
  es: { "Dra.": "doctora", "Dr.": "doctor", "p. ej.": "por ejemplo", "etc.": "etcétera", "aprox.": "aproximadamente", "Uds.": "ustedes", "Ud.": "usted", "OMS": "Organización Mundial de la Salud" },
  en: { "Dr.": "Doctor", "e.g.": "for example", "i.e.": "that is", "etc.": "et cetera", "vs.": "versus", "approx.": "approximately", "WHO": "World Health Organization" },
  fr: { "p. ex.": "par exemple", "etc.": "et cetera", "env.": "environ" },
  it: { "Dott.ssa": "dottoressa", "Dott.": "dottor", "ecc.": "eccetera", "es.": "ad esempio", "ca.": "circa" },
  pt: { "Dra.": "doutora", "Dr.": "doutor", "p. ex.": "por exemplo", "etc.": "et cetera", "aprox.": "aproximadamente" },
  pl: { "np.": "na przykład", "itd.": "i tak dalej", "itp.": "i tym podobne", "ok.": "około", "m.in.": "między innymi" },
};

/**
 * Written forms a voice reads in the wrong language's sounds: brand names
 * spelled the way speakers of the language say them.
 */
const RESPELL: Partial<Record<Lang, Record<string, string>>> = {
  tr: { Invisalign: "İnvizalayn" },
  de: { Invisalign: "Invisalein" },
  es: { Invisalign: "Invisalain" },
};

const RANGE: Partial<Record<Lang, string>> = { tr: "ile", de: "bis", es: "a", en: "to", fr: "à", pt: "a" };
const PERCENT: Partial<Record<Lang, string>> = { de: "Prozent", es: "por ciento", en: "percent", fr: "pour cent", it: "per cento", pt: "por cento", pl: "procent", ar: "بالمئة", ja: "パーセント" };
const AND: Partial<Record<Lang, string>> = { tr: "ve", de: "und", es: "y", en: "and", fr: "et", it: "e", pt: "e", pl: "i", ar: "و" };
const OR: Partial<Record<Lang, string>> = { tr: "ya da", de: "oder", es: "o", en: "or", fr: "ou", it: "o", pt: "ou", pl: "lub", ar: "أو" };
const ROUND_THE_CLOCK: Partial<Record<Lang, string>> = { tr: "7 gün 24 saat", de: "rund um die Uhr", es: "las 24 horas", en: "twenty-four seven", fr: "24 heures sur 24", it: "24 ore su 24", pt: "24 horas por dia", pl: "całą dobę" };
/** "2x" — [one, many]. */
const TIMES: Partial<Record<Lang, [string, string]>> = { tr: ["kez", "kez"], de: ["Mal", "Mal"], es: ["vez", "veces"], en: ["time", "times"], fr: ["fois", "fois"], it: ["volta", "volte"], pt: ["vez", "vezes"], pl: ["raz", "razy"] };
/** Units after a number — [one, many]. Polish and Arabic inflect by count in ways a table can't, so they keep the symbol. */
const UNITS: Partial<Record<Lang, Record<string, [string, string]>>> = {
  tr: { mm: ["milimetre", "milimetre"], cm: ["santimetre", "santimetre"], ml: ["mililitre", "mililitre"], mg: ["miligram", "miligram"], "°C": ["derece", "derece"], dk: ["dakika", "dakika"], sn: ["saniye", "saniye"] },
  de: { mm: ["Millimeter", "Millimeter"], cm: ["Zentimeter", "Zentimeter"], ml: ["Milliliter", "Milliliter"], mg: ["Milligramm", "Milligramm"], "°C": ["Grad", "Grad"], "Min.": ["Minute", "Minuten"], min: ["Minute", "Minuten"], "Std.": ["Stunde", "Stunden"] },
  es: { mm: ["milímetro", "milímetros"], cm: ["centímetro", "centímetros"], ml: ["mililitro", "mililitros"], mg: ["miligramo", "miligramos"], "°C": ["grado", "grados"], min: ["minuto", "minutos"] },
  en: { mm: ["millimeter", "millimeters"], cm: ["centimeter", "centimeters"], ml: ["milliliter", "milliliters"], mg: ["milligram", "milligrams"], "°C": ["degree Celsius", "degrees Celsius"], min: ["minute", "minutes"], hrs: ["hour", "hours"], hr: ["hour", "hours"] },
  fr: { mm: ["millimètre", "millimètres"], cm: ["centimètre", "centimètres"], ml: ["millilitre", "millilitres"], mg: ["milligramme", "milligrammes"], "°C": ["degré", "degrés"], min: ["minute", "minutes"] },
  it: { mm: ["millimetro", "millimetri"], cm: ["centimetro", "centimetri"], ml: ["millilitro", "millilitri"], mg: ["milligrammo", "milligrammi"], "°C": ["grado", "gradi"], min: ["minuto", "minuti"] },
  pt: { mm: ["milímetro", "milímetros"], cm: ["centímetro", "centímetros"], ml: ["mililitro", "mililitros"], mg: ["miligrama", "miligramas"], "°C": ["grau", "graus"], min: ["minuto", "minutos"] },
  ja: { mm: ["ミリ", "ミリ"] },
};

const isOne = (n: string) => /^1(?:[.,]0+)?$/.test(n);

function langOf(language: string | undefined): Lang | undefined {
  const l = (language ?? "").toLowerCase().slice(0, 2);
  return (["tr", "de", "es", "en", "fr", "it", "pt", "pl", "ar", "ja"] as const).find((x) => x === l);
}

/** Things that are never spoken: emoji, links, @handles, {placeholders}, markdown marks, hashtags' "#". */
function stripUnspoken(t: string): string {
  return t
    .normalize("NFC")
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, "")
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/giu, "")
    .replace(/\{[^{}]*\}/g, "")
    .replace(/(^|\s)@[\p{L}\p{N}_.]+/gu, "$1")
    .replace(/#(?=\p{L})/gu, "")
    .replace(/[*_`~]+(?=[\p{L}\p{N}])|(?<=[\p{L}\p{N}.!?])[*_`~]+/gu, "");
}

/**
 * In Turkish, capital "I" is the dotless ı: "Implant" is read "ımplant".
 * Text written on an English keyboard (or by a model) often capitalises
 * dotted-i words that way. Stems here all start with a dotted i; none
 * of them begins a real dotless-ı word (ılık, ışık, ısı, ızgara...).
 */
const TR_DOTTED_I = /(?<![\p{L}\p{N}])I(?=(?:mplant|nterdental|yi|yileş|lk|çin|laç|ltihap|nce|ster|htiyaç|şlem|ğne|ki|le|nvizalayn)\p{L}*)/gu;

function numbers(t: string, lang: Lang | undefined): string {
  if (!lang) return t;
  const n = NUM;
  // 24/7 first, before "/" becomes "or".
  if (ROUND_THE_CLOCK[lang]) t = t.replace(new RegExp(`${B}24\\s?/\\s?7${E}`, "gu"), ROUND_THE_CLOCK[lang]!);
  // Ranges: "20-22" read as "twenty minus twenty-two" or one number. Not dates/phone numbers (a third part).
  if (RANGE[lang]) t = t.replace(new RegExp(`(?<![\\d.,/–-])${n}\\s?[-–—]\\s?${n}(?![\\d]|[-–/.,]\\d)`, "gu"), `$1 ${RANGE[lang]} $2`);
  // Percent. Turkish writes and says it first ("%20" → "yüzde 20"), also when written after.
  if (lang === "tr") {
    t = t.replace(new RegExp(`%\\s?${n}`, "gu"), "yüzde $1").replace(new RegExp(`${n}\\s?%`, "gu"), "yüzde $1");
  } else if (PERCENT[lang]) {
    t = t.replace(new RegExp(`${n}\\s?[%٪]`, "gu"), `$1 ${PERCENT[lang]}`);
  }
  // "2x täglich", "3 x al día" — not "2x2".
  const times = TIMES[lang];
  if (times) t = t.replace(new RegExp(`${B}(\\d+)\\s?[x×](?![\\p{L}\\p{N}]|\\s?\\d)`, "gu"), (_m, d: string) => `${d} ${isOne(d) ? times[0] : times[1]}`);
  for (const [sym, [one, many]] of Object.entries(UNITS[lang] ?? {})) {
    const s = sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`${n}\\s?${s}${sym.endsWith(".") ? "" : E}`, "gu"), (_m, d: string) => `${d} ${isOne(d) ? one : many}`);
  }
  return t;
}

function symbols(t: string, lang: Lang | undefined): string {
  if (lang && AND[lang]) t = t.replace(/\s[&+]\s/g, ` ${AND[lang]} `).replace(/(?<=\p{L})&(?=\p{L})/gu, ` ${AND[lang]} `);
  // "fırça/ip" → "fırça ya da ip"; Japanese has no spaces to put around it.
  if (lang && OR[lang]) t = t.replace(/(?<=\p{L})\s?\/\s?(?=\p{L})/gu, ` ${OR[lang]} `);
  return t;
}

/**
 * Prosody through punctuation. Each line (a section in the narrator's text)
 * ends a sentence, so the voice pauses there; dashes and brackets become
 * commas (tts-1 runs straight through a dash); "!" becomes "." (a calm
 * clinician, not an advert); "…" becomes a plain stop, not a hesitation.
 */
function prosody(t: string): string {
  return t
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:[-•–—*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((l) => (/[.!?…:;,。？！]$/.test(l) ? l : `${l}.`))
    .join(" ")
    .replace(/¡/g, "")
    .replace(/[!！]+/g, (m) => (m.includes("！") ? "。" : "."))
    .replace(/\?[!.]+|\?{2,}/g, "?")
    .replace(/(?:\.\.\.|…)+(?=\s*$|\s+\p{Lu})/gu, ".")
    .replace(/(?:\.\.\.|…)+/g, ",")
    .replace(/\s*;\s*/g, ", ")
    .replace(/\s+[—–-]\s+|(?<=\p{L})—(?=\p{L})/gu, ", ")
    .replace(/\s*\(([^()]*)\)\s*/g, (_m, inner: string) => `, ${inner.trim()}, `)
    .replace(/\s+([,.?:])/g, "$1")
    .replace(/,\s*([.?:])/g, "$1")
    .replace(/([.?])[.,]+/g, "$1")
    .replace(/,{2,}/g, ",")
    .replace(/^[\s,.]+/, "")
    .replace(/([.?!,:])(?=\p{L})/gu, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function speechText(text: string, language: string | undefined): string {
  const lang = langOf(language);
  let t = stripUnspoken(text);
  for (const [re, to] of abbr(ABBREVIATIONS[lang ?? "en"] && lang ? ABBREVIATIONS[lang]! : {})) t = t.replace(re, to as string);
  for (const [re, to] of abbr(lang ? (RESPELL[lang] ?? {}) : {}, "giu")) t = t.replace(re, to as string);
  if (lang === "tr") t = t.replace(TR_DOTTED_I, "İ");
  t = numbers(t, lang);
  t = symbols(t, lang);
  return prosody(t);
}
