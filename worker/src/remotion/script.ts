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

/**
 * CSS for blocks of plain text (list rows, body copy): Japanese breaks
 * between phrases (Chrome's auto-phrase, keyed on lang="ja"), and never
 * starts a line with 、。 or a small kana. No effect on spaced languages.
 */
export const PHRASE_BREAK = { wordBreak: "auto-phrase", lineBreak: "strict" } as unknown as Record<string, string>;
