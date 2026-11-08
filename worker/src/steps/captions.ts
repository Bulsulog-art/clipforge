import type { Word } from "./transcribe.js";
import { resolveAspect, type AspectSpec } from "../aspect.js";

const NICHE_STYLES: Record<string, { fill: string; outline: string; highlight: string }> = {
  motivation: { fill: "FFFFFF", outline: "000000", highlight: "FF3366" },
  business:   { fill: "FFFFFF", outline: "000000", highlight: "00D9FF" },
  finance:    { fill: "FFFFFF", outline: "000000", highlight: "FFD700" },
  health:     { fill: "FFFFFF", outline: "000000", highlight: "00E676" },
  tech:       { fill: "FFFFFF", outline: "000000", highlight: "8B5CF6" },
  comedy:     { fill: "FFFF00", outline: "000000", highlight: "FF6B35" },
  fitness:    { fill: "FFFFFF", outline: "000000", highlight: "FF1744" },
  spirituality:{ fill: "FFEEC2", outline: "5B3E1B", highlight: "F4A623" },
  default:    { fill: "FFFFFF", outline: "000000", highlight: "FF3366" },
};

// Caption STYLE library. The niche picks the accent COLOR (brand identity);
// the style controls the TYPOGRAPHY (font weight, size, outline, case, halo).
// They compose: a "finance / neon" clip and a "comedy / hype" clip look
// genuinely different — the dozens-of-styles surface every competitor leads on,
// done with robust ASS primitives (no fragile per-word animation to break a
// render we can't eyeball headlessly).
export type CaptionStyleId = "bold-pop" | "clean" | "neon" | "hype" | "minimal";

type CaptionStyleDef = {
  fontName: string;
  fontSize: number;
  outlineWidth: number;
  shadow: number;
  uppercase: boolean;
  /** Use the niche accent as the OUTLINE colour → glowing neon halo. */
  outlineIsAccent: boolean;
  /** Force a fill colour regardless of niche (else niche fill is used). */
  fillOverride?: string;
};

const CAPTION_STYLES: Record<CaptionStyleId, CaptionStyleDef> = {
  // Punchy default — thick black outline, big, the classic TikTok look.
  "bold-pop": { fontName: "Inter Bold", fontSize: 84, outlineWidth: 6, shadow: 2, uppercase: false, outlineIsAccent: false },
  // Understated — thin outline, smaller, for talking-head/educational.
  "clean":    { fontName: "Inter Bold", fontSize: 76, outlineWidth: 2, shadow: 1, uppercase: false, outlineIsAccent: false },
  // Glowing neon halo in the accent colour, white fill, no drop shadow.
  "neon":     { fontName: "Inter Bold", fontSize: 82, outlineWidth: 5, shadow: 0, uppercase: false, outlineIsAccent: true, fillOverride: "FFFFFF" },
  // Loud — ALL CAPS, oversized, heavy outline + shadow. Comedy/hype energy.
  "hype":     { fontName: "Inter Bold", fontSize: 94, outlineWidth: 7, shadow: 3, uppercase: true,  outlineIsAccent: false },
  // Elegant — no outline, soft drop shadow only, restrained size.
  "minimal":  { fontName: "Inter Bold", fontSize: 72, outlineWidth: 0, shadow: 4, uppercase: false, outlineIsAccent: false },
};

export const DEFAULT_CAPTION_STYLE: CaptionStyleId = "bold-pop";

export function resolveCaptionStyle(id?: string): CaptionStyleDef {
  return CAPTION_STYLES[id as CaptionStyleId] ?? CAPTION_STYLES[DEFAULT_CAPTION_STYLE];
}


const PHRASE_WORDS = 4;     // at most this many words per visible chunk
/**
 * Characters that fit on one caption line. Measured on a render: Inter Bold
 * runs ~0.44-0.47 x font size per character; 0.5 leaves room for the 118%
 * keyword pop, uppercase styles need ~0.62. The left and right margins are
 * 80 px each. Chunking by word count alone overflowed the frame as soon as a
 * language had long words ("Wurzelbehandlung ist heute völlig" ran off both
 * edges, because WrapStyle 2 never wraps).
 */
export function maxCharsPerLine(fontSize: number, uppercase: boolean, frameWidth: number): number {
  return Math.max(8, Math.floor((frameWidth - 160) / (fontSize * (uppercase ? 0.62 : 0.5))));
}
const MIN_WORD_SEC = 0.18;  // smooth tiny words
const MAX_PHRASE_SEC = 2.6; // never let a chunk stay > 2.6s

export function buildKaraokeASS(
  words: Word[],
  niche: string,
  startSec: number,
  endSec: number,
  captionStyleId?: string,
  keywords?: string[],
  aspectId?: string,
  /** Brand colour (hex, no #) for the word highlight — e.g. the clinic's colour. */
  accentHex?: string,
): string {
  const baseStyle = NICHE_STYLES[niche] ?? NICHE_STYLES.default;
  const nicheStyle = accentHex ? { ...baseStyle, highlight: accentHex } : baseStyle;
  const cap = resolveCaptionStyle(captionStyleId);
  const aspect = resolveAspect(aspectId);
  const keywordSet = new Set((keywords ?? []).map((k) => normalizeKeyword(k)).filter(Boolean));
  const fill = cap.fillOverride ?? nicheStyle.fill;
  const outline = cap.outlineIsAccent ? nicheStyle.highlight : nicheStyle.outline;

  const filtered = words
    .filter((w) => w.start >= startSec - 0.05 && w.end <= endSec + 0.05)
    .map((w) => ({
      word: cleanWord(w.word),
      start: Math.max(0, w.start - startSec),
      end: Math.max(MIN_WORD_SEC, w.end - startSec),
    }))
    .filter((w) => w.word.length > 0);

  const maxChars = maxCharsPerLine(cap.fontSize, cap.uppercase, aspect.w);
  const phrases = chunkPhrases(filtered, maxChars);

  const header = assHeader({ fill, outline }, cap, aspect);
  const events = phrases
    .map((p, i) => {
      // End before the next chunk starts: a 40 ms overlap made libass stack
      // two captions on top of each other.
      const next = phrases[i + 1];
      const end = next ? Math.min(p.end + 0.04, next.start) : p.end + 0.04;
      return karaokeLine({ ...p, end }, nicheStyle.highlight, cap.uppercase, keywordSet, maxChars);
    })
    .join("\n");
  return `${header}\n${events}\n`;
}

/** Lowercase + strip punctuation so "focus." and "Focus" both match "focus". */
function normalizeKeyword(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9'’]/gi, "").trim();
}

function cleanWord(s: string) {
  return s.replace(/[\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

export function chunkPhrases(words: { word: string; start: number; end: number }[], maxChars = Infinity) {
  const out: { start: number; end: number; words: typeof words }[] = [];
  let cursor = 0;
  while (cursor < words.length) {
    // Take words while they fit on one line (always at least one word).
    const chunk = [words[cursor]];
    let len = words[cursor].word.length;
    while (
      cursor + chunk.length < words.length &&
      chunk.length < PHRASE_WORDS &&
      len + 1 + words[cursor + chunk.length].word.length <= maxChars
    ) {
      len += 1 + words[cursor + chunk.length].word.length;
      chunk.push(words[cursor + chunk.length]);
    }
    const startW = chunk[0];
    const endW = chunk[chunk.length - 1];
    const duration = endW.end - startW.start;
    out.push({
      start: startW.start,
      end: duration > MAX_PHRASE_SEC ? Math.min(endW.end, startW.start + MAX_PHRASE_SEC) : endW.end,
      words: chunk,
    });
    cursor += chunk.length;
  }
  return out;
}

function karaokeLine(
  p: { start: number; end: number; words: { word: string; start: number; end: number }[] },
  highlightHex: string,
  uppercase: boolean,
  keywordSet: Set<string>,
  maxChars = Infinity,
) {
  // ASS karaoke: each word wrapped in {\\k<centisec>} with active color override
  // We use {\\1c&Hbbggrr&} to change PrimaryColour mid-line
  const bgr = hexToBgr(highlightHex);
  const segments = p.words
    .map((w, i) => {
      const centisecs = Math.max(1, Math.round((w.end - w.start) * 100));
      const next = p.words[i + 1];
      let text = escape(uppercase ? w.word.toUpperCase() : w.word);
      // Keyword pop: scale up the highest-impact words so they punch off-screen.
      if (keywordSet.has(normalizeKeyword(w.word))) {
        text = `{\\fscx118\\fscy118}${text}{\\fscx100\\fscy100}`;
      }
      const safe = next ? `{\\1c&H${bgr}&}${text}{\\1c&HFFFFFF&}` : text;
      return `{\\k${centisecs}}${safe}`;
    })
    .join(" ");

  // A single word longer than a line cannot wrap; squeeze it horizontally.
  const chars = p.words.reduce((n, w) => n + w.word.length, 0) + p.words.length - 1;
  const squeeze = chars > maxChars ? `{\\fscx${Math.max(55, Math.floor((100 * maxChars) / chars))}}` : "";
  return `Dialogue: 0,${assTime(p.start)},${assTime(p.end)},Caption,,0,0,0,karaoke,${squeeze}${segments}`;
}

function assTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

function escape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\N");
}

function hexToBgr(hex: string) {
  const r = hex.slice(0, 2);
  const g = hex.slice(2, 4);
  const b = hex.slice(4, 6);
  return `${b}${g}${r}`;
}

function assHeader(
  colors: { fill: string; outline: string },
  cap: CaptionStyleDef,
  aspect: AspectSpec,
) {
  const fillBgr = hexToBgr(colors.fill);
  const outlineBgr = hexToBgr(colors.outline);
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${aspect.w}
PlayResY: ${aspect.h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${cap.fontName},${cap.fontSize},&H00${fillBgr},&H00${fillBgr},&H00${outlineBgr},&H64000000,-1,0,0,0,100,100,0,0,1,${cap.outlineWidth},${cap.shadow},2,80,80,${aspect.captionMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
}

export function buildHookASS(
  hook: string,
  durationSec: number,
  niche: string,
  aspectId?: string,
  /** Put the hook at the very top — for talking heads, so it never covers the face. */
  opts: { top?: boolean; accentHex?: string } = {},
): string {
  const style = NICHE_STYLES[niche] ?? NICHE_STYLES.default;
  const aspect = resolveAspect(aspectId);
  const fillBgr = hexToBgr(style.fill);
  const outlineBgr = hexToBgr(style.outline);
  const highlightBgr = hexToBgr(opts.accentHex ?? style.highlight);

  // Hook stays through first ~3s with a pop entrance
  const hookEnd = Math.min(durationSec, 3.4);
  // Step the size down until the whole hook fits in three lines; cutting
  // words off made a question lose its verb ("Was muss ich nach einer
  // Wurzelbehandlung" — "beachten?" was dropped).
  let fontSize = HOOK_FONT_SIZE;
  for (const size of [HOOK_FONT_SIZE, 84, 72, 62]) {
    fontSize = size;
    if (wrapHook(hook, maxCharsPerLine(size, false, aspect.w), Infinity).length <= 3) break;
  }
  const lines = wrapHook(hook, maxCharsPerLine(fontSize, false, aspect.w)).map(escape).join("\\N");
  const hookMarginV = opts.top ? Math.round(aspect.h * 0.07) : aspect.hookMarginV;

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${aspect.w}
PlayResY: ${aspect.h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,Inter Bold,${fontSize},&H00${fillBgr},&H00${highlightBgr},&H00${outlineBgr},&H80000000,-1,0,0,0,100,100,0,0,1,8,3,8,80,80,${hookMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,${assTime(0)},${assTime(hookEnd)},Hook,,0,0,0,,{\\fad(200,300)\\t(0,250,\\fscx105\\fscy105)\\t(250,500,\\fscx100\\fscy100)}${lines}`;
}

const HOOK_FONT_SIZE = 96;

/** Wrap the hook into at most 3 lines that fit the frame width. */
export function wrapHook(hook: string, maxChars = 22, maxLines = 3) {
  const words = hook.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && line.length + 1 + w.length > maxChars) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}
