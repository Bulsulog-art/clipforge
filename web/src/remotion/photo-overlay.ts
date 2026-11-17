// GENERATED from worker/src/remotion/photo-overlay.ts by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import type { Theme } from "./theme";
import { contrastRatio, mix } from "./theme";

/**
 * How strongly a background photo is tinted so the theme's text stays
 * readable on top of it, whatever the photo.
 *
 * A photo is unpredictable, so this does not guess: it assumes the worst
 * pixel the photo could put behind a letter — pure white under light text,
 * pure black under dark text — and raises the tint (the theme's own
 * background colour, i.e. the clinic's brand hue taken deep) until every text
 * colour still clears its WCAG bar on that worst case, both on the bare frame
 * and inside a surface card. The tint is a flat colour composited in sRGB,
 * exactly as the browser draws an rgba() layer, so the arithmetic here is the
 * arithmetic on screen. photo-overlay.test.ts holds every theme, and a range
 * of brand colours, to it.
 */

/** Body and headline text, the stricter bar. */
export const PHOTO_TEXT_MIN = 4.5;
/** Secondary text and the accent (all large type). */
export const PHOTO_LARGE_MIN = 3.0;
/** Extra tint on top of the minimum, so JPEG noise and Ken Burns never sit on the line. */
const MARGIN = 0.03;
/** The band outside the text safe area may show more photo. */
const EDGE_RELIEF = 0.16;

export type PhotoOverlay = {
  /** Tint colour (hex). */
  color: string;
  /** Opacity over the text area. */
  alpha: number;
  /** Opacity in the top/bottom band outside the text safe area. */
  edgeAlpha: number;
};

function parseRgba(css: string): { hex: string; a: number } | undefined {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(css);
  if (!m) return undefined;
  const hex = "#" + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("");
  return { hex, a: m[4] === undefined ? 1 : Number(m[4]) };
}

/** The colour behind a letter: the worst photo pixel under the tint, optionally under a surface card too. */
export function composite(t: Theme, overlay: { color: string; alpha: number }, pixel: string, onSurface = false): string {
  let c = mix(pixel, overlay.color, overlay.alpha);
  if (onSurface) {
    const s = parseRgba(t.surface);
    if (s) c = mix(c, s.hex, s.a);
  }
  return c;
}

/** The darkest/brightest pixel a photo could contribute, whichever is worse for this theme's text. */
export function worstPixel(t: Theme): string {
  return contrastRatio(t.foreground, "#FFFFFF") < contrastRatio(t.foreground, "#000000") ? "#FFFFFF" : "#000000";
}

function readable(t: Theme, overlay: { color: string; alpha: number }): boolean {
  const pixel = worstPixel(t);
  return [false, true].every((onSurface) => {
    const bg = composite(t, overlay, pixel, onSurface);
    return (
      contrastRatio(t.foreground, bg) >= PHOTO_TEXT_MIN &&
      contrastRatio(t.muted, bg) >= PHOTO_LARGE_MIN &&
      contrastRatio(t.accent, bg) >= PHOTO_LARGE_MIN
    );
  });
}

/** The background stop that contrasts most with the text is the tint. */
function tintOf(t: Theme): string {
  const [a, b] = t.background;
  return contrastRatio(t.foreground, a) >= contrastRatio(t.foreground, b) ? a : b;
}

const step = (x: number) => Math.round((x + 0.01) * 100) / 100;

/** Least tint at which the main text alone is readable on the worst photo. */
function textAlpha(t: Theme, color: string): number {
  const pixel = worstPixel(t);
  let alpha = 0.4;
  while (
    alpha < 0.97 &&
    ![false, true].every((s) => contrastRatio(t.foreground, composite(t, { color, alpha }, pixel, s)) >= PHOTO_TEXT_MIN)
  ) {
    alpha = step(alpha);
  }
  return alpha;
}

/**
 * The theme as drawn over photos. Body text sets how much tint is needed;
 * the secondary and accent colours are then lifted a little toward the text
 * colour (at most 60%) until they also clear their bar at that tint, rather
 * than darkening the whole photo for one emphasised word. Hue is kept, so the
 * clinic's accent still reads as theirs.
 */
export function photoTheme(t: Theme): Theme {
  const color = tintOf(t);
  const alpha = Math.min(0.97, textAlpha(t, color) + MARGIN);
  const pixel = worstPixel(t);
  const passes = (c: string) =>
    [false, true].every((s) => contrastRatio(c, composite(t, { color, alpha }, pixel, s)) >= PHOTO_LARGE_MIN);
  const lift = (c: string) => {
    let l = 0;
    let x = c;
    while (l < 0.6 && !passes(x)) {
      l = Math.round((l + 0.05) * 100) / 100;
      x = mix(c, t.foreground, l);
    }
    return x;
  };
  return { ...t, muted: lift(t.muted), accent: lift(t.accent) };
}

/** Tint for photos behind `t` (the theme as given; its photo variant is derived here). */
export function photoOverlay(t: Theme): PhotoOverlay {
  const pt = photoTheme(t);
  const color = tintOf(t);
  let alpha = textAlpha(t, color);
  while (alpha < 0.97 && !readable(pt, { color, alpha })) alpha = step(alpha);
  alpha = Math.min(0.97, Math.round((alpha + MARGIN) * 100) / 100);
  return { color, alpha, edgeAlpha: Math.max(0.3, Math.round((alpha - EDGE_RELIEF) * 100) / 100) };
}

/** CSS for the tint: full strength over the text area, lighter in the bands outside it. */
export function overlayCss(o: PhotoOverlay, safeTop = 0.12, safeBottom = 0.88): string {
  const rgba = (alpha: number) => {
    const h = o.color.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `rgba(${r},${g},${b},${alpha})`;
  };
  return `linear-gradient(to bottom, ${rgba(o.edgeAlpha)} 0%, ${rgba(o.alpha)} ${safeTop * 100}%, ${rgba(o.alpha)} ${safeBottom * 100}%, ${rgba(o.edgeAlpha)} 100%)`;
}
