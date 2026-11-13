import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { contrastRatio, hueDistance } from "../remotion/theme.js";
import type { LogoStyle, LogoTreatment } from "../remotion/logo-style.js";
import { assertLocalMedia, safeInputArgs } from "../lib/media-input.js";

const run = promisify(execFile);

/**
 * Reads a clinic's logo so the videos can be built around it: which colours
 * it is made of, whether it is a mark on transparency or a picture with its
 * own background, how bright the mark is, and its shape. From that come the
 * brand colour (when the clinic did not pick one), an accent, and how the
 * logo should be drawn (logo-style.ts).
 *
 * The analysis itself is pure (`analyseLogoPixels`, over RGBA); only the
 * decode touches the disk, through ffmpeg, which the worker already depends
 * on — no image library needed.
 */

export type Rgba = { width: number; height: number; data: Uint8Array | Uint8ClampedArray };

export type LogoColour = {
  hex: string;
  /** Fraction of the logo's coloured pixels in this cluster. */
  share: number;
  /** HSL saturation and lightness, 0..1. */
  saturation: number;
  lightness: number;
};

export type LogoAnalysis = {
  /** width / height of the image as uploaded. */
  aspect: number;
  /** width / height of the visible logo, transparent margins trimmed. */
  contentAspect: number;
  /** The visible part, as fractions of the image (only for logos on transparency with margins). */
  crop?: { x: number; y: number; w: number; h: number };
  hasTransparency: boolean;
  /** The logo's own solid background, when it has one (hex), else null. */
  background: string | null;
  /** Mean WCAG relative luminance of the mark itself (background excluded), 0..1. */
  luminance: number;
  /** Dominant colours, largest first; transparent, near-white and near-black pixels ignored. */
  palette: LogoColour[];
  /** The most characterful colour — saturated, not grey — or undefined for a monochrome logo. */
  brandColor?: string;
  /** A second characterful colour of a clearly different hue, if the logo has one. */
  accentColor?: string;
  treatment: LogoTreatment;
};

// MARK: - Colour helpers

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
export const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

function hsl(r: number, g: number, b: number): { s: number; l: number } {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s: Math.min(1, s), l };
}

const LIN = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const lum = (r: number, g: number, b: number) => 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b];

const dist2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Pixels lighter or darker than this are paper and ink, not brand. */
const NEAR_WHITE_L = 0.93;
const NEAR_BLACK_L = 0.08;
/** The reference a dark chip is drawn in, for deciding which chip a mark needs. */
const DARK_CHIP = "#0D1A1E";

// MARK: - Background

/**
 * The logo's own background, if it has one: an opaque image whose border is
 * (almost) all one colour. A JPEG on white, or a wordmark on a teal block.
 */
function solidBackground(img: Rgba): number[] | null {
  const { width: w, height: h, data } = img;
  const border: number[][] = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) border.push(px(data, (y * w + x) * 4));
  for (let y = 1; y < h - 1; y++) for (const x of [0, w - 1]) border.push(px(data, (y * w + x) * 4));
  if (border.some((p) => p[3] < 250)) return null;
  // The most common coarse colour on the border, then everything close to it.
  const bins = new Map<number, number>();
  for (const p of border) {
    const k = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4);
    bins.set(k, (bins.get(k) ?? 0) + 1);
  }
  const top = [...bins.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const seed = [((top >> 8) & 15) * 16 + 8, ((top >> 4) & 15) * 16 + 8, (top & 15) * 16 + 8];
  const near = border.filter((p) => dist2(p, seed) < 40 * 40);
  if (near.length < border.length * 0.9) return null;
  return [0, 1, 2].map((i) => near.reduce((s, p) => s + p[i], 0) / near.length);
}

function px(data: Rgba["data"], i: number): number[] {
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

// MARK: - Clustering

/**
 * k-means in RGB with a deterministic start: the most populated coarse
 * colours, each far enough from the ones already taken. Same logo, same
 * answer, every run — a brand colour that changed between renders would be
 * worse than a slightly suboptimal one.
 */
export function dominantColours(pixels: number[][], k = 5): LogoColour[] {
  if (!pixels.length) return [];
  const bins = new Map<number, { n: number; sum: number[] }>();
  for (const p of pixels) {
    const key = ((p[0] >> 3) << 10) | ((p[1] >> 3) << 5) | (p[2] >> 3);
    const b = bins.get(key) ?? { n: 0, sum: [0, 0, 0] };
    b.n++;
    b.sum[0] += p[0];
    b.sum[1] += p[1];
    b.sum[2] += p[2];
    bins.set(key, b);
  }
  const ranked = [...bins.values()].sort((a, b) => b.n - a.n).map((b) => b.sum.map((s) => s / b.n));
  const centres: number[][] = [];
  for (const c of ranked) {
    if (centres.length >= k) break;
    if (centres.every((x) => dist2(x, c) > 48 * 48)) centres.push(c);
  }

  const assign = new Int32Array(pixels.length);
  for (let iter = 0; iter < 12; iter++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    pixels.forEach((p, i) => {
      let best = 0;
      let bestD = Infinity;
      centres.forEach((c, j) => {
        const d = dist2(p, c);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      });
      assign[i] = best;
      const s = sums[best];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    });
    let moved = false;
    sums.forEach((s, j) => {
      if (!s[3]) return;
      const next = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
      if (dist2(next, centres[j]) > 0.25) moved = true;
      centres[j] = next;
    });
    if (!moved) break;
  }

  const counts = centres.map(() => 0);
  for (let i = 0; i < pixels.length; i++) counts[assign[i]]++;
  return centres
    .map((c, j) => {
      const { s, l } = hsl(c[0], c[1], c[2]);
      return { hex: toHex(c[0], c[1], c[2]), share: counts[j] / pixels.length, saturation: s, lightness: l };
    })
    .filter((c) => c.share > 0)
    .sort((a, b) => b.share - a.share);
}

/** How much a colour says "brand": saturated, mid-light, and not a speck. */
function character(c: LogoColour): number {
  if (c.saturation < 0.25 || c.lightness < 0.12 || c.lightness > 0.85 || c.share < 0.04) return 0;
  const chroma = c.saturation * (1 - Math.abs(2 * c.lightness - 1));
  return Math.sqrt(c.share) * (0.3 + chroma);
}

// MARK: - Analysis

export function analyseLogoPixels(img: Rgba, sourceAspect?: number): LogoAnalysis {
  const { width: w, height: h, data } = img;
  const total = w * h;
  let translucent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) translucent++;
  const hasTransparency = translucent > total * 0.02;
  const bg = hasTransparency ? null : solidBackground(img);

  const opaque: number[][] = [];
  const mark: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const p = [data[i], data[i + 1], data[i + 2]];
    opaque.push(p);
    if (!bg || dist2(p, bg) > 48 * 48) mark.push(p);
  }
  const ink = mark.length ? mark : opaque;

  const markLum = ink.length ? ink.reduce((s, p) => s + lum(p[0], p[1], p[2]), 0) / ink.length : 0;

  // Paper and ink are left out: they say nothing about the brand. A solid
  // background is kept — a wordmark on a teal block *is* a teal brand.
  const coloured = opaque.filter((p) => {
    const { l } = hsl(p[0], p[1], p[2]);
    return l <= NEAR_WHITE_L && l >= NEAR_BLACK_L;
  });
  const palette = dominantColours(coloured, 5);

  const ranked = palette.map((c) => ({ c, score: character(c) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const brandColor = ranked[0]?.c.hex;
  const accentColor = brandColor
    ? ranked.slice(1).find((x) => hueDistance(x.c.hex, brandColor) >= 30)?.c.hex
    : undefined;

  const aspect = sourceAspect ?? w / h;
  const crop = hasTransparency ? visibleBox(img) : undefined;
  return {
    aspect,
    contentAspect: crop ? (aspect * crop.w) / crop.h : aspect,
    crop,
    hasTransparency,
    background: bg ? toHex(bg[0], bg[1], bg[2]) : null,
    luminance: markLum,
    palette,
    brandColor,
    accentColor,
    treatment: bg ? "none" : chipFor(ink),
  };
}

/**
 * The visible part of a logo on transparency, with a hair of breathing room,
 * as fractions of the image. Undefined when there is nothing worth trimming.
 */
function visibleBox(img: Rgba): LogoAnalysis["crop"] {
  const { width: w, height: h, data } = img;
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] >= 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return undefined;
  const pad = Math.max(w, h) * 0.015;
  const box = {
    x: Math.max(0, x0 - pad) / w,
    y: Math.max(0, y0 - pad) / h,
    w: (Math.min(w, x1 + 1 + pad) - Math.max(0, x0 - pad)) / w,
    h: (Math.min(h, y1 + 1 + pad) - Math.max(0, y0 - pad)) / h,
  };
  if (box.w > 0.97 && box.h > 0.97) return undefined;
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return { x: r(box.x), y: r(box.y), w: r(box.w), h: r(box.h) };
}

/**
 * Which chip the mark reads on. Counted per pixel rather than from the mean,
 * so a navy emblem with a little white detail still gets the light chip it
 * was drawn for, while a white wordmark gets the dark one. Ties go to light:
 * logos are made for letterheads.
 */
function chipFor(ink: number[][]): LogoTreatment {
  if (!ink.length) return "light";
  let onLight = 0;
  let onDark = 0;
  for (const p of ink) {
    const hex = toHex(p[0], p[1], p[2]);
    if (contrastRatio(hex, "#FFFFFF") >= 2) onLight++;
    if (contrastRatio(hex, DARK_CHIP) >= 2) onDark++;
  }
  return onDark > onLight * 1.15 ? "dark" : "light";
}

/** The part a composition needs to draw it. */
export function logoStyleOf(a: LogoAnalysis): LogoStyle {
  return {
    treatment: a.treatment,
    aspect: Math.round(a.contentAspect * 1000) / 1000,
    ...(a.crop ? { crop: a.crop } : {}),
  };
}

// MARK: - Decode

/** Longest side the analysis works at: plenty for colour, cheap to cluster. */
const ANALYSIS_SIDE = 160;

async function probeSize(file: string): Promise<{ width: number; height: number }> {
  // The logo is a customer upload: a local file in the job's temp dir, read as an image only.
  assertLocalMedia(file);
  const { stdout } = await run("ffprobe", [
    "-v", "error", ...safeInputArgs("image"), "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", file,
  ]);
  const [width, height] = stdout.trim().split("\n")[0].split("x").map(Number);
  if (!width || !height) throw new Error(`cannot read logo size: ${file}`);
  return { width, height };
}

/** Decodes an image to RGBA at most `side` px on its longest edge. */
export async function decodeRgba(file: string, side = ANALYSIS_SIDE): Promise<Rgba & { sourceWidth: number; sourceHeight: number }> {
  const src = await probeSize(file);
  const k = Math.min(1, side / Math.max(src.width, src.height));
  const width = Math.max(1, Math.round(src.width * k));
  const height = Math.max(1, Math.round(src.height * k));
  // Scaled premultiplied: a plain scale averages a white edge with the
  // (usually black) colour hiding under transparent pixels, inventing greys
  // the logo does not contain.
  const vf = `format=rgba,premultiply=inplace=1,scale=${width}:${height}:flags=area,unpremultiply=inplace=1`;
  const { stdout } = await run(
    "ffmpeg",
    ["-v", "error", ...safeInputArgs("image"), "-i", assertLocalMedia(file), "-frames:v", "1", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"],
    { encoding: "buffer", maxBuffer: width * height * 4 + 1024 },
  );
  const data = new Uint8Array(stdout as Buffer);
  if (data.length < width * height * 4) throw new Error(`logo decode came back short: ${file}`);
  return { width, height, data: data.subarray(0, width * height * 4), sourceWidth: src.width, sourceHeight: src.height };
}

export async function analyseLogo(file: string): Promise<LogoAnalysis> {
  const img = await decodeRgba(file);
  return analyseLogoPixels(img, img.sourceWidth / img.sourceHeight);
}

/**
 * The clinic's own choices win. A brand colour they picked is kept; only an
 * empty one is filled from the logo. The accent is always the logo's — it is
 * what ties the frame to the mark in the corner — and brandTheme only uses it
 * when it is a different hue that can meet the contrast bar.
 */
export function brandFromLogo(
  brandColor: string | undefined,
  analysis: Pick<LogoAnalysis, "brandColor" | "accentColor" | "palette"> | undefined,
): { brandColor?: string; brandAccent?: string } {
  const strip = (h?: string) => h?.replace(/^#/, "").toUpperCase();
  const brand = strip(brandColor) ?? strip(analysis?.brandColor);
  if (!analysis || !brand) return { brandColor: brand };
  // The logo colour that is most unlike the brand: its own accent when the
  // brand came from it, its main colour when the clinic picked another one.
  const candidates = [analysis.brandColor, analysis.accentColor].filter((c): c is string => Boolean(c));
  const accent = candidates.find((c) => hueDistance(c, `#${brand}`) >= 25);
  return { brandColor: brand, brandAccent: strip(accent) };
}

// MARK: - Is it a picture at all

/** The types a logo may be (the bucket's allow-list). No SVG: it can carry script, and ffmpeg cannot draw it. */
export type LogoFormat = "png" | "jpeg" | "webp";

/** The logo's type from its first bytes, or null when it is not a PNG, JPEG or WebP, whatever its name says. */
export function sniffLogo(b: Uint8Array): LogoFormat | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

const FORMAT_EXT: Record<LogoFormat, string> = { png: ".png", jpeg: ".jpg", webp: ".webp" };

export type ReadyLogo =
  | { ok: true; file: string; analysis: LogoAnalysis }
  | { ok: false; reason: "not-an-image" | "undecodable"; detail?: string };

/**
 * A downloaded logo, made safe to render: written into `workDir` only when its
 * bytes really are a PNG, JPEG or WebP (named by what it is, not by its storage
 * key), and kept only when ffmpeg can decode it. Otherwise the caller makes the
 * video without a logo — never a failed render or an empty box in the corner.
 * The web refuses such files on upload (isDecodableImage in the browser, a
 * magic-byte check in the clinic save route); this covers logos stored before
 * that, or put there another way.
 */
export async function readyLogo(
  bytes: Uint8Array,
  workDir: string,
  analyse: (file: string) => Promise<LogoAnalysis> = analyseLogo,
): Promise<ReadyLogo> {
  const format = sniffLogo(bytes);
  if (!format) return { ok: false, reason: "not-an-image" };
  const file = path.join(workDir, `logo${FORMAT_EXT[format]}`);
  await fs.writeFile(file, bytes);
  try {
    return { ok: true, file, analysis: await analyse(file) };
  } catch (e) {
    await fs.rm(file, { force: true });
    return { ok: false, reason: "undecodable", detail: (e as Error).message };
  }
}

