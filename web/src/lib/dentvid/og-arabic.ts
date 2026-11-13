/**
 * Arabic for the share cards. next/og (Satori) measures a word by its
 * unjoined letters but draws it joined, and it lays words out left to right,
 * so a plain Arabic string comes out with gaps and in the wrong word order.
 *
 * The cards therefore (1) join the letters here, turning each one into the
 * Unicode presentation form it takes in its word (isolated, final, initial,
 * medial, and the lam-alef ligatures), so what Satori measures is what it
 * draws; (2) put each word's letters in visual (right-to-left) order; and
 * (3) lay the words out right to left themselves (a row-reverse flex row,
 * see og-text.tsx).
 * Vowel marks (harakat) are dropped: a card headline reads fine without them,
 * and Satori has no mark positioning.
 */

/** [isolated, final, initial, medial] presentation forms; two entries for letters that join only to the letter before. */
const FORMS: Record<string, number[]> = {
  "ء": [0xfe80],
  "آ": [0xfe81, 0xfe82],
  "أ": [0xfe83, 0xfe84],
  "ؤ": [0xfe85, 0xfe86],
  "إ": [0xfe87, 0xfe88],
  "ئ": [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  "ا": [0xfe8d, 0xfe8e],
  "ب": [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  "ة": [0xfe93, 0xfe94],
  "ت": [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  "ث": [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  "ج": [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  "ح": [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  "خ": [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  "د": [0xfea9, 0xfeaa],
  "ذ": [0xfeab, 0xfeac],
  "ر": [0xfead, 0xfeae],
  "ز": [0xfeaf, 0xfeb0],
  "س": [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  "ش": [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  "ص": [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  "ض": [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  "ط": [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  "ظ": [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  "ع": [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  "غ": [0xfecd, 0xfece, 0xfecf, 0xfed0],
  "ف": [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  "ق": [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  "ك": [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  "ل": [0xfedd, 0xfede, 0xfedf, 0xfee0],
  "م": [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  "ن": [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  "ه": [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  "و": [0xfeed, 0xfeee],
  "ى": [0xfeef, 0xfef0],
  "ي": [0xfef1, 0xfef2, 0xfef3, 0xfef4],
};

/** Lam followed by one of these alefs becomes one ligature: [isolated, final]. */
const LAM_ALEF: Record<string, [number, number]> = {
  "آ": [0xfef5, 0xfef6],
  "أ": [0xfef7, 0xfef8],
  "إ": [0xfef9, 0xfefa],
  "ا": [0xfefb, 0xfefc],
};

const HARAKAT = /[ً-ٰٟـ]/g;
const ARABIC = /[؀-ۿ]/;

export function hasArabic(text: string): boolean {
  return ARABIC.test(text);
}

const joinsBoth = (c: string | undefined) => (c ? (FORMS[c]?.length ?? 0) === 4 : false);
const joins = (c: string | undefined) => (c ? (FORMS[c]?.length ?? 0) >= 2 : false);

/** One word (or any run of text) with its Arabic letters in their joined presentation forms, in logical order. */
export function joinArabic(text: string): string {
  const s = [...text.replace(HARAKAT, "")];
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const forms = FORMS[c];
    if (!forms) {
      out += c;
      continue;
    }
    const prevJoins = joinsBoth(s[i - 1]);
    const lig = c === "ل" ? LAM_ALEF[s[i + 1]] : undefined;
    if (lig) {
      out += String.fromCodePoint(prevJoins ? lig[1] : lig[0]);
      i++;
      continue;
    }
    const nextJoins = forms.length === 4 && joins(s[i + 1]);
    const form = prevJoins && forms.length > 1 ? (nextJoins ? 3 : 1) : nextJoins ? 2 : 0;
    out += String.fromCodePoint(forms[form]);
  }
  return out;
}

const MIRROR: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "«": "»", "»": "«", "<": ">", ">": "<" };

/**
 * One word as Satori must be given it to draw it right to left: joined, its
 * characters reversed (brackets mirrored). A word without Arabic letters
 * ("DentVideo", "2026") is returned as it is.
 */
export function visualArabicWord(word: string): string {
  if (!hasArabic(word)) return word;
  return [...joinArabic(word)].reverse().map((c) => MIRROR[c] ?? c).join("");
}

/** The words of a right-to-left line in reading order, each ready to draw (see visualArabicWord). */
export function arabicWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean).map(visualArabicWord);
}
