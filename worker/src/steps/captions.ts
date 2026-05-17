import type { Word } from "./transcribe.js";

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

const SAFE_AREA = {
  // 9:16 (1080×1920): keep captions ~25% from bottom, away from TikTok UI overlay
  marginTop: 720,
  marginV: 360,
};

const PHRASE_WORDS = 4;     // word count per visible chunk
const MIN_WORD_SEC = 0.18;  // smooth tiny words
const MAX_PHRASE_SEC = 2.6; // never let a chunk stay > 2.6s

export function buildKaraokeASS(
  words: Word[],
  niche: string,
  startSec: number,
  endSec: number,
): string {
  const style = NICHE_STYLES[niche] ?? NICHE_STYLES.default;
  const filtered = words
    .filter((w) => w.start >= startSec - 0.05 && w.end <= endSec + 0.05)
    .map((w) => ({
      word: cleanWord(w.word),
      start: Math.max(0, w.start - startSec),
      end: Math.max(MIN_WORD_SEC, w.end - startSec),
    }))
    .filter((w) => w.word.length > 0);

  const phrases = chunkPhrases(filtered);

  const header = assHeader(style);
  const events = phrases.map((p) => karaokeLine(p, style.highlight)).join("\n");
  return `${header}\n${events}\n`;
}

function cleanWord(s: string) {
  return s.replace(/[\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

function chunkPhrases(words: { word: string; start: number; end: number }[]) {
  const out: { start: number; end: number; words: typeof words }[] = [];
  let cursor = 0;
  while (cursor < words.length) {
    const chunk = words.slice(cursor, cursor + PHRASE_WORDS);
    if (chunk.length === 0) break;
    const startW = chunk[0];
    const endW = chunk[chunk.length - 1];
    const duration = endW.end - startW.start;
    if (duration > MAX_PHRASE_SEC) {
      // split aggressively
      out.push({ start: startW.start, end: Math.min(endW.end, startW.start + MAX_PHRASE_SEC), words: chunk });
    } else {
      out.push({ start: startW.start, end: endW.end, words: chunk });
    }
    cursor += PHRASE_WORDS;
  }
  return out;
}

function karaokeLine(
  p: { start: number; end: number; words: { word: string; start: number; end: number }[] },
  highlightHex: string,
) {
  // ASS karaoke: each word wrapped in {\\k<centisec>} with active color override
  // We use {\\1c&Hbbggrr&} to change PrimaryColour mid-line
  const bgr = hexToBgr(highlightHex);
  const segments = p.words
    .map((w, i) => {
      const centisecs = Math.max(1, Math.round((w.end - w.start) * 100));
      const next = p.words[i + 1];
      const safe = next ? `{\\1c&H${bgr}&}${escape(w.word)}{\\1c&HFFFFFF&}` : escape(w.word);
      return `{\\k${centisecs}}${safe}`;
    })
    .join(" ");

  return `Dialogue: 0,${assTime(p.start)},${assTime(p.end + 0.04)},Caption,,0,0,0,karaoke,${segments}`;
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

function assHeader(style: { fill: string; outline: string }) {
  const fillBgr = hexToBgr(style.fill);
  const outlineBgr = hexToBgr(style.outline);
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Inter Bold,84,&H00${fillBgr},&H000000FF,&H00${outlineBgr},&H64000000,-1,0,0,0,100,100,0,0,1,6,2,2,80,80,${SAFE_AREA.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
}

export function buildHookASS(hook: string, durationSec: number, niche: string): string {
  const style = NICHE_STYLES[niche] ?? NICHE_STYLES.default;
  const fillBgr = hexToBgr(style.fill);
  const outlineBgr = hexToBgr(style.outline);
  const highlightBgr = hexToBgr(style.highlight);

  // Hook stays through first ~3s with a pop entrance
  const hookEnd = Math.min(durationSec, 3.4);
  const lines = wrapHook(hook).map(escape).join("\\N");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,Inter Bold,96,&H00${fillBgr},&H00${highlightBgr},&H00${outlineBgr},&H80000000,-1,0,0,0,100,100,0,0,1,8,3,8,80,80,${SAFE_AREA.marginTop},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,${assTime(0)},${assTime(hookEnd)},Hook,,0,0,0,,{\\fad(200,300)\\t(0,250,\\fscx105\\fscy105)\\t(250,500,\\fscx100\\fscy100)}${lines}`;
}

function wrapHook(hook: string) {
  const words = hook.trim().split(/\s+/);
  const lines: string[] = [];
  const target = words.length <= 6 ? 3 : 4;
  for (let i = 0; i < words.length; i += target) {
    lines.push(words.slice(i, i + target).join(" "));
  }
  return lines.slice(0, 3);
}
