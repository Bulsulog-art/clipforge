import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties } from "react";
import { dirOf, type Locale } from "@/content/dentvideo";
import { LOCKUP_VIEWBOX, LOGO_COLORS, PLAY_PATH, TOOTH_PATH, TOOTH_TRANSFORM, WORDMARK_DENT, WORDMARK_TRANSFORM, WORDMARK_VIDEO } from "@/components/dentvid/mark";
import { arabicWords, joinArabic } from "./og-arabic";

/**
 * Text on the share cards in every language: the fonts a card needs, how big
 * its words can be, and how they are laid out (right to left for Arabic).
 */

/**
 * Japanese and Arabic are drawn in their own faces, fetched from Google Fonts
 * at build time as a subset of exactly the card's glyphs (`text=`).
 * Without the network the card is drawn without those words rather than in tofu.
 */
export const SCRIPT_FONT: Partial<Record<Locale, string>> = { ja: "Noto Sans JP", ar: "IBM Plex Sans Arabic" };

export async function googleFontSubset(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

type Font = { name: string; data: ArrayBuffer | Buffer; weight: 400 | 600 | 700; style: "normal" };

export type CardFonts = {
  fonts: Font[];
  /** Whether the card's words in this language can be drawn (Latin always; Japanese/Arabic once their face arrived). */
  words: boolean;
  /** Font family for headlines and for running text. */
  head: string;
  body: string;
};

/** The brand faces plus, for Japanese and Arabic, a subset of their face covering `texts`. */
export async function cardFonts(locale: Locale, texts: string[]): Promise<CardFonts> {
  const root = process.cwd();
  const family = SCRIPT_FONT[locale];
  // Arabic is drawn from its joined presentation forms (og-arabic.ts): the subset must hold those glyphs.
  const glyphs = texts.join("") + (locale === "ar" ? texts.map(joinArabic).join("") : "");
  const [serif, sans, script] = await Promise.all([
    readFile(join(root, "assets/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(root, "assets/fonts/PlusJakartaSans-SemiBold.ttf")),
    family ? googleFontSubset(family, 700, glyphs) : Promise.resolve(null),
  ]);
  return {
    fonts: [
      { name: "Instrument", data: serif, weight: 400, style: "normal" },
      { name: "Jakarta", data: sans, weight: 600, style: "normal" },
      ...(script ? [{ name: "Script", data: script, weight: 700 as const, style: "normal" as const }] : []),
    ],
    words: !family || script !== null,
    head: family ? "Script" : "Instrument",
    body: family ? "Script" : "Jakarta",
  };
}

const CJK = /[　-鿿＀-￯]/;

/** A rough width of `text` in ems: CJK glyphs are square, Latin and Arabic letters about half as wide. */
export function emWidth(text: string, latinEm = 0.5): number {
  let w = 0;
  for (const c of text) w += CJK.test(c) ? 1 : c === " " ? 0.27 : latinEm;
  return w;
}

/**
 * The lines `text` breaks into at `perLine` ems, filled greedily as Satori does:
 * CJK breaks between any two characters, other scripts between words.
 * Returns each line's width in ems.
 */
export function wrapLines(text: string, perLine: number, latinEm = 0.5): number[] {
  // Units that cannot be split: one CJK character, or a word with the space before it.
  const units = text.match(/[\u3000-\u9fff\uff00-\uffef]|\s*[^\s\u3000-\u9fff\uff00-\uffef]+/g) ?? [];
  const lines: number[] = [];
  let line = 0;
  for (const u of units) {
    const w = emWidth(u, latinEm);
    const bare = emWidth(u.trimStart(), latinEm);
    if (line > 0 && line + w > perLine + 1e-6) {
      lines.push(line);
      line = bare;
    } else line += line > 0 ? w : bare;
  }
  if (line > 0) lines.push(line);
  return lines;
}

/**
 * The largest of `sizes` (px, largest first) at which `text` fits `width` in at most `maxLines` lines,
 * without a last line of one or two characters (a dangling "す。" or "本。").
 */
export function fitFontSize(text: string, width: number, maxLines: number, sizes: number[], latinEm = 0.5): number {
  for (const size of sizes) {
    const lines = wrapLines(text, width / size, latinEm);
    if (lines.length <= maxLines && (lines.length === 1 || lines[lines.length - 1] >= 3)) return size;
  }
  return sizes[sizes.length - 1];
}

/** A block of card text: plain for left-to-right languages; for Arabic, joined words laid out right to left. */
export function CardText({ text, locale, style }: { text: string; locale: Locale; style: CSSProperties }) {
  if (dirOf(locale) !== "rtl") return <div style={{ display: "flex", ...style }}>{text}</div>;
  const words = arabicWords(text);
  const gap = typeof style.fontSize === "number" ? Math.round(style.fontSize * 0.28) : 12;
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "flex-start", ...style, textAlign: "right" }}>
      {words.map((w, i) => (
        <span key={i} style={{ marginLeft: i === words.length - 1 ? 0 : gap }}>
          {w}
        </span>
      ))}
    </div>
  );
}

/** The DentVideo lockup (tile and wordmark) as an SVG, at the size the cards use. */
export function CardLogo({ width = 254, height = 64 }: { width?: number; height?: number }) {
  const L = LOGO_COLORS.light;
  return (
    <svg width={width} height={height} viewBox={LOCKUP_VIEWBOX}>
      <defs>
        <linearGradient id="t" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={L.tileFrom} />
          <stop offset="1" stopColor={L.tileTo} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#t)" />
      <path d={`${TOOTH_PATH}${PLAY_PATH}`} transform={TOOTH_TRANSFORM} fill={L.tooth} fillRule="evenodd" />
      <g transform={WORDMARK_TRANSFORM}>
        <path d={WORDMARK_DENT} fill={L.dent} />
        <path d={WORDMARK_VIDEO} fill={L.video} />
      </g>
    </svg>
  );
}
