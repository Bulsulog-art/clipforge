// GENERATED from worker/src/remotion/script.ts by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
/**
 * Writing systems the compositions have to handle beyond Latin.
 *
 * The scenes were built for languages that put spaces between words: a
 * headline is split on spaces, each word is an unbreakable inline block, and
 * the frame wraps between them. A Japanese sentence has no spaces, so it came
 * out as ONE "word" — it could never wrap, and fitText shrank it until the
 * whole line fitted across the frame. Arabic has spaces but runs right to
 * left, joins its letters (letter-spacing breaks the joins), and needs more
 * line height for its ascenders and dots.
 *
 * Browser-safe on purpose: mirrored into the web preview (sync-remotion.mjs).
 */

export type Script = "latin" | "cjk" | "arabic";

const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}　-〿＀-￯]/u;
const ARABIC_CHAR = /[\p{Script=Arabic}]/u;

export function scriptOfLanguage(language: string | undefined): Script {
  const lang = (language ?? "").toLowerCase().slice(0, 2);
  if (lang === "ja" || lang === "zh") return "cjk";
  if (lang === "ar" || lang === "fa" || lang === "ur" || lang === "he") return "arabic";
  return "latin";
}

/** The script a piece of text is written in, from its characters. */
export function scriptOfText(text: string): Script {
  if (CJK_CHAR.test(text)) return "cjk";
  if (ARABIC_CHAR.test(text)) return "arabic";
  return "latin";
}

export function isRtl(language: string | undefined): boolean {
  return scriptOfLanguage(language) === "arabic";
}

/**
 * Font stacks per language, in front of the theme's own. Noto Sans CJK JP
 * (Debian fonts-noto-cjk in the worker image) draws Japanese with Japanese
 * glyph shapes — the same code points drawn from a Chinese font look subtly
 * wrong to a Japanese reader, so the JP face comes first, and `lang` is set
 * on the frame as well. Arabic: Noto Kufi Arabic for display (geometric,
 * pairs with Inter), Noto Sans Arabic for body (fonts-noto-core).
 */
export function fontStackFor(language: string | undefined, role: "display" | "body"): string | undefined {
  const lang = (language ?? "").toLowerCase();
  if (lang.startsWith("ja")) return '"Noto Sans CJK JP", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", "Meiryo"';
  if (lang.startsWith("zh-hant") || lang === "zh-tw" || lang === "zh-hk") return '"Noto Sans CJK TC", "Noto Sans TC", "PingFang TC"';
  if (lang.startsWith("zh")) return '"Noto Sans CJK SC", "Noto Sans SC", "PingFang SC"';
  if (lang.startsWith("ar"))
    return role === "display"
      ? '"Noto Kufi Arabic", "Noto Sans Arabic", "Geeza Pro", "Segoe UI"'
      : '"Noto Sans Arabic", "Noto Kufi Arabic", "Geeza Pro", "Segoe UI"';
  return undefined;
}

/** Punctuation that may not start a line in Japanese (kinsoku), so it sticks to what precedes it. */
const NO_LINE_START = /^[、。，．・：；？！ー）」』】〕〉》”’々ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ,.!?:;)\]}%％]+$/u;
/** …and what may not end one: opening brackets stick to what follows. */
const NO_LINE_END = /^[（「『【〔〈《“‘(\[{]+$/u;

let segmenter: Intl.Segmenter | undefined;
function wordSegmenter(): Intl.Segmenter | undefined {
  if (segmenter) return segmenter;
  try {
    segmenter = new Intl.Segmenter("ja", { granularity: "word" });
  } catch {
    segmenter = undefined;
  }
  return segmenter;
}

/**
 * The unbreakable units a headline is laid out from, and whether the units
 * are separated by a space when drawn. Latin and Arabic: words. Japanese:
 * short phrases — dictionary words from Intl.Segmenter, with particles and
 * punctuation glued to the word before them (の, は, を, 、, 。 never start a
 * line) — which is how Japanese headlines are set by hand.
 */
export function layoutUnits(text: string): { units: string[]; spaced: boolean } {
  if (scriptOfText(text) !== "cjk") return { units: text.split(/\s+/).filter(Boolean), spaced: true };
  const seg = wordSegmenter();
  const raw = seg
    ? [...seg.segment(text)].map((s) => s.segment)
    : [...text]; // no ICU: characters still wrap, just not by phrase
  const units: string[] = [];
  let pendingOpen = "";
  for (const piece of raw) {
    if (!piece.trim()) continue;
    // Opening brackets and the honorific prefixes お/ご belong to the word after them.
    if (NO_LINE_END.test(piece) || piece === "お" || piece === "ご") {
      pendingOpen += piece;
      continue;
    }
    const last = units[units.length - 1] ?? "";
    const glueBack =
      units.length > 0 &&
      (NO_LINE_START.test(piece) ||
        isParticle(piece) ||
        (isKana(piece) && last.length + piece.length <= 10) ||
        // A one-kanji suffix continues the compound (一時+的, 知覚過敏+用) or the number (8+歳) before it.
        (KANJI_SUFFIX.has(piece) && /[\p{Script=Han}\p{N}]$/u.test(last)) ||
        // A number range is one unit: 7+〜+8 never breaks.
        (NUMBER_PART.test(piece) && NUMBER_END.test(last)) ||
        // A one- or two-character fragment ("落ち" before "着いて") is never a phrase of its own.
        (last.length <= 2 && !NO_LINE_START.test(last.slice(-1)) && last.length + piece.length <= 10));
    if (glueBack && !pendingOpen) units[units.length - 1] += piece;
    else units.push(pendingOpen + piece);
    pendingOpen = "";
  }
  if (pendingOpen) units.push(pendingOpen);
  return { units, spaced: false };
}

const NUMBER_PART = /^[\p{N}〜～~\-–]+$/u;
const NUMBER_END = /[\p{N}〜～~\-–]$/u;
const KANJI_SUFFIX = new Set(["的", "性", "用", "者", "化", "中", "後", "前", "時", "力", "感", "式", "法", "症", "型", "期", "率", "間", "目", "回", "日", "歳", "本", "分", "院", "科", "医"]);
const PARTICLES = new Set(["の", "は", "が", "を", "に", "へ", "と", "で", "も", "や", "か", "ね", "よ", "な", "から", "まで", "より", "って", "けど", "ので", "には", "では", "とは", "でも", "です", "ます", "ました", "でした", "ません", "ですか", "ましょう", "ください"]);
function isParticle(s: string): boolean {
  return PARTICLES.has(s);
}
function isKana(s: string): boolean {
  return /^[\p{Script=Hiragana}ー]+$/u.test(s);
}

/**
 * Width of a text in "Latin-glyph" units, so length rules written for Latin
 * text ("comfortable at 42 characters") hold for Japanese too: a full-width
 * character is about 1em wide, a bold Latin glyph ~0.62em.
 */
export function visualLength(text: string): number {
  let n = 0;
  // Arabic display faces (Kufi, bold) set wider than Inter: measured on a
  // render, a 14-letter Arabic line at hook size overran the left margin.
  for (const ch of text) n += CJK_CHAR.test(ch) ? 1.6 : ARABIC_CHAR.test(ch) ? 1.2 : 1;
  return n;
}

/** A word reduced to what emphasis is matched on: letters and digits, lower-cased. */
function bare(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Which layout units (layoutUnits) of a headline carry the plan's emphasis,
 * and which of them run on into the next — so consecutive emphasised words
 * share ONE highlight bar instead of a row of separate chips.
 *
 * Spaced scripts match the phrase as a whole, word for word and in order,
 * ignoring case and punctuation ("قد يعني" in Arabic): a short word of a
 * phrase ("لم", "is") is not lit up everywhere else it occurs.
 * Japanese has no words to match, and the planner's emphasis is a phrase that
 * the segmenter may have cut differently, so a unit is marked when it contains
 * an emphasis phrase of 2+ characters, or is wholly contained in one.
 *
 * Runs are in logical (reading) order; a right-to-left frame draws them right
 * to left without any change here.
 */
export function emphasisRuns(units: string[], emphasis: string[] | undefined, spaced: boolean): { on: boolean; joinNext: boolean }[] {
  const terms = (emphasis ?? []).map((e) => e.trim()).filter(Boolean);
  let mask: boolean[];
  if (spaced) {
    // Every word, with the unit it belongs to (a glued widow pair is one unit, two words).
    const words = units.flatMap((u, i) => u.split(/\s+/).map((w) => ({ w: bare(w), unit: i })));
    mask = units.map(() => false);
    for (const term of terms) {
      const seq = term.split(/\s+/).map(bare).filter(Boolean);
      if (!seq.length) continue;
      for (let i = 0; i + seq.length <= words.length; i++) {
        if (seq.every((t, k) => words[i + k].w === t)) for (let k = 0; k < seq.length; k++) mask[words[i + k].unit] = true;
      }
    }
  } else {
    const phrases = terms.map(bare).filter((t) => [...t].length >= 2);
    mask = units.map((u) => {
      const b = bare(u);
      return b.length > 0 && phrases.some((t) => b.includes(t) || ([...b].length >= 2 && t.includes(b)));
    });
  }
  return mask.map((on, i) => ({ on, joinNext: on && i + 1 < mask.length && mask[i + 1] }));
}

/**
 * CSS for blocks of plain text (list rows, body copy): Japanese breaks
 * between phrases (Chrome's auto-phrase, keyed on lang="ja"), and never
 * starts a line with 、。 or a small kana. No effect on spaced languages.
 */
export const PHRASE_BREAK = { wordBreak: "auto-phrase", lineBreak: "strict" } as unknown as Record<string, string>;
