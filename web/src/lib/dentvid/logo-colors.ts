/**
 * Reads a clinic's logo in the browser, the moment it is chosen, so the form
 * can suggest the brand colour from it and preview how the videos will draw
 * it. A small mirror of worker/src/dental/logo.ts (which decides for real at
 * render time): same rules, fewer details, no dependencies — a canvas gives
 * the pixels.
 */

export type LogoTreatment = "light" | "dark" | "none";

export type LogoColors = {
  /** Up to five colours, most used first; transparent, near-white and near-black pixels left out. */
  swatches: string[];
  /** The most characterful colour — saturated, not grey — if the logo has one. */
  suggested?: string;
  /** How the videos draw it: light chip, dark chip, or none (it has its own background). */
  treatment: LogoTreatment;
  /** The logo's own solid background, if it has one. */
  background?: string;
  /** A second characterful colour of a clearly different hue, if the logo has one. */
  accent?: string;
  /** width / height of the visible logo. */
  aspect: number;
  /** The visible part of a logo on transparency, as fractions of the image. */
  crop?: { x: number; y: number; w: number; h: number };
};

type Px = [number, number, number];

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
export const toHex = ([r, g, b]: Px) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const d2 = (a: Px, b: Px) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

function hsl([r, g, b]: Px): { h: number; s: number; l: number } {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : Math.min(1, d / (1 - Math.abs(2 * l - 1)));
  let h = 0;
  if (d) h = (max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60;
  return { h: (h + 360) % 360, s, l };
}

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Px) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** k-means in RGB from the most common coarse colours: same logo, same answer. */
function cluster(pixels: Px[], k = 5): { c: Px; share: number }[] {
  if (!pixels.length) return [];
  const bins = new Map<number, { n: number; s: Px }>();
  for (const p of pixels) {
    const key = ((p[0] >> 3) << 10) | ((p[1] >> 3) << 5) | (p[2] >> 3);
    const b = bins.get(key) ?? { n: 0, s: [0, 0, 0] };
    b.n++;
    b.s[0] += p[0];
    b.s[1] += p[1];
    b.s[2] += p[2];
    bins.set(key, b);
  }
  const centres: Px[] = [];
  for (const b of [...bins.values()].sort((x, y) => y.n - x.n)) {
    const c: Px = [b.s[0] / b.n, b.s[1] / b.n, b.s[2] / b.n];
    if (centres.length < k && centres.every((x) => d2(x, c) > 48 * 48)) centres.push(c);
  }
  const counts = centres.map(() => 0);
  for (let iter = 0; iter < 10; iter++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    counts.fill(0);
    for (const p of pixels) {
      let best = 0;
      for (let j = 1; j < centres.length; j++) if (d2(p, centres[j]) < d2(p, centres[best])) best = j;
      sums[best][0] += p[0];
      sums[best][1] += p[1];
      sums[best][2] += p[2];
      sums[best][3]++;
      counts[best]++;
    }
    sums.forEach((s, j) => {
      if (s[3]) centres[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  }
  return centres
    .map((c, j) => ({ c, share: counts[j] / pixels.length }))
    .filter((x) => x.share > 0)
    .sort((a, b) => b.share - a.share);
}

/** Analyses RGBA pixels (as from a canvas). */
export function logoColors(data: Uint8ClampedArray | Uint8Array, width: number, height: number): LogoColors {
  const at = (x: number, y: number): [number, number, number, number] => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) clear++;
  const transparent = clear > width * height * 0.02;

  // An opaque image whose border is all one colour brings its own background.
  let bg: Px | undefined;
  if (!transparent) {
    const border: Px[] = [];
    for (let x = 0; x < width; x++) border.push(at(x, 0).slice(0, 3) as Px, at(x, height - 1).slice(0, 3) as Px);
    for (let y = 1; y < height - 1; y++) border.push(at(0, y).slice(0, 3) as Px, at(width - 1, y).slice(0, 3) as Px);
    const top = cluster(border, 3)[0];
    if (top && top.share >= 0.9) bg = top.c;
  }

  const opaque: Px[] = [];
  const ink: Px[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const p: Px = [data[i], data[i + 1], data[i + 2]];
    opaque.push(p);
    if (!bg || d2(p, bg) > 48 * 48) ink.push(p);
  }

  const coloured = opaque.filter((p) => {
    const { l } = hsl(p);
    return l >= 0.08 && l <= 0.93;
  });
  const clusters = cluster(coloured, 5);
  const character = ({ c, share }: { c: Px; share: number }) => {
    const { s, l } = hsl(c);
    if (s < 0.25 || l < 0.12 || l > 0.85 || share < 0.04) return 0;
    return Math.sqrt(share) * (0.3 + s * (1 - Math.abs(2 * l - 1)));
  };
  const ranked = clusters.map((x) => ({ x, score: character(x) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = best && ranked.slice(1).find((r) => hueDistance(toHex(r.x.c), toHex(best.x.c)) >= 30);

  // The visible part of a logo on transparency, so the preview is not padded by empty margins.
  let crop: LogoColors["crop"];
  if (transparent) {
    let [x0, y0, x1, y1] = [width, height, -1, -1];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (data[(y * width + x) * 4 + 3] >= 24) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
    if (x1 >= 0) crop = { x: x0 / width, y: y0 / height, w: (x1 + 1 - x0) / width, h: (y1 + 1 - y0) / height };
  }

  let treatment: LogoTreatment = "none";
  if (!bg) {
    const mark = ink.length ? ink : opaque;
    const darkChip = lum([13, 26, 30]);
    let onLight = 0;
    let onDark = 0;
    for (const p of mark) {
      const l = lum(p);
      if (contrast(l, 1) >= 2) onLight++;
      if (contrast(l, darkChip) >= 2) onDark++;
    }
    treatment = onDark > onLight * 1.15 ? "dark" : "light";
  }

  return {
    // Specks (anti-aliasing, JPEG noise) are not colours anyone chose.
    swatches: clusters.filter((x) => x.share >= 0.03).map((x) => toHex(x.c)),
    suggested: best ? toHex(best.x.c) : undefined,
    accent: second ? toHex(second.x.c) : undefined,
    treatment,
    background: bg ? toHex(bg) : undefined,
    aspect: crop ? (width * crop.w) / (height * crop.h) : width / height,
    crop,
  };
}

/** Shortest distance between two hues in degrees (0 when either is grey). */
export function hueDistance(a: string, b: string): number {
  const p = (h: string): Px => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Px;
  const [x, y] = [p(a), p(b)];
  if (hsl(x).s === 0 || hsl(y).s === 0) return 0;
  const d = Math.abs(hsl(x).h - hsl(y).h);
  return Math.min(d, 360 - d);
}

/**
 * The logo colour the videos will use for emphasis with this brand colour —
 * the same rule as the worker (dental/logo.ts brandFromLogo): the logo's
 * colour most unlike the brand, if any is a clearly different hue.
 */
export function accentFor(brandColor: string, colors: Pick<LogoColors, "suggested" | "accent">): string | undefined {
  return [colors.suggested, colors.accent].find((c): c is string => Boolean(c) && hueDistance(c!, brandColor) >= 25);
}

/** Longest side the browser analyses at. */
const SIDE = 160;

/** Reads a chosen file in the browser. Resolves undefined if it cannot be read. */
/**
 * Is this file a picture the browser can actually draw? The picker's
 * `accept` is only a hint and the upload is checked by its name and declared
 * type alone, so a renamed document, a cut-off download or a HEIC with a .png
 * name would otherwise replace the clinic's good logo with one that draws
 * nothing — in the preview and in every video. A browser without
 * createImageBitmap is given the benefit of the doubt.
 */
export async function isDecodableImage(
  file: Blob,
  decode: ((b: Blob) => Promise<{ width: number; height: number; close?: () => void }>) | undefined = typeof createImageBitmap === "function" ? (b) => createImageBitmap(b) : undefined,
): Promise<boolean> {
  if (!decode) return true;
  try {
    const bitmap = await decode(file);
    const ok = bitmap.width > 0 && bitmap.height > 0;
    bitmap.close?.();
    return ok;
  } catch {
    return false;
  }
}

export async function analyseLogoFile(file: Blob): Promise<LogoColors | undefined> {
  try {
    const bitmap = await createImageBitmap(file);
    const k = Math.min(1, SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * k));
    const h = Math.max(1, Math.round(bitmap.height * k));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return logoColors(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return undefined;
  }
}

/**
 * Reads a logo by URL — an object URL the visitor just picked, or an https
 * one served with CORS. Goes through an <img> rather than fetch(): the
 * site's CSP allows blob: images but not blob: fetches. Resolves undefined
 * when the pixels cannot be read (a cross-origin logo without CORS).
 */
export async function analyseLogoUrl(url: string): Promise<LogoColors | undefined> {
  try {
    const img = new Image();
    if (/^https?:/.test(url)) img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    // An SVG without its own size reports 0×0; give it the browser's default box.
    const [iw, ih] = [img.naturalWidth || 300, img.naturalHeight || 150];
    const k = Math.min(1, SIDE / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * k));
    const h = Math.max(1, Math.round(ih * k));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, w, h);
    return logoColors(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return undefined;
  }
}
