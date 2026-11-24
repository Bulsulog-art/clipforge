// GENERATED from worker/src/remotion/photo-overlay.ts by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import type { SafeFrame, Theme } from "./theme";
import { contrastRatio, mix } from "./theme";

/**
 * How a background photo is tinted, and how the text on top of it stays
 * readable whatever the photo.
 *
 * Two layers, both in the theme's own colour (the clinic's brand hue taken
 * deep):
 *
 *   1. a light wash over the whole photo (PHOTO_TINT), so a bright, airy
 *      dental still reads as a photograph with the clinic's colour in it, not
 *      as a dark slab;
 *   2. a soft plate behind each scene's text block (the scrim, drawn by
 *      Backdrop in scenes/primitives.tsx and shaped by scrimBox below), which
 *      is where the legibility comes from.
 *
 * A photo is unpredictable, so the plate does not guess: it assumes the worst
 * pixel the photo could put behind a letter (pure white under light text,
 * pure black under dark text) and is raised until every text colour clears
 * its WCAG bar on the composite of that pixel, the wash and the plate, both
 * on the bare plate and inside a surface card. Both layers are flat colours
 * composited in sRGB, exactly as the browser draws an rgba() layer, so the
 * arithmetic here is the arithmetic on screen. photo-overlay.test.ts holds
 * every theme, and a range of brand colours, to it.
 *
 * The wash used to carry the legibility on its own, at 0.71-0.74 over the
 * whole text area: every clinic's photos came out at the same dark luminance
 * whatever was in them.
 */

/** Body and headline text, the stricter bar. */
export const PHOTO_TEXT_MIN = 4.5;
/** Secondary text and the accent (all large type). */
export const PHOTO_LARGE_MIN = 3.0;
/** Extra plate on top of the minimum, so JPEG noise and Ken Burns never sit on the line. */
const MARGIN = 0.03;
/** The wash over the whole photo: enough to put the clinic's colour in it, light enough that it reads as a photo. */
export const PHOTO_TINT = 0.4;
/** The most the wash may ever be (photo-overlay.test.ts, backgrounds.test.ts). */
export const PHOTO_TINT_MAX = 0.45;

export type PhotoOverlay = {
  /** Colour of the wash and of the plate (hex). */
  color: string;
  /** Opacity of the wash over the whole photo. */
  alpha: number;
  /** Opacity of the plate behind each text block, laid over the wash. */
  scrim: number;
};

function parseRgba(css: string): { hex: string; a: number } | undefined {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(css);
  if (!m) return undefined;
  const hex = "#" + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("");
  return { hex, a: m[4] === undefined ? 1 : Number(m[4]) };
}

/**
 * The colour behind a letter: the photo pixel under the wash, under the plate
 * when one is given, and under a surface card too when `onSurface`.
 */
export function composite(
  t: Theme,
  overlay: { color: string; alpha: number; scrim?: number },
  pixel: string,
  onSurface = false,
): string {
  let c = mix(pixel, overlay.color, overlay.alpha);
  if (overlay.scrim) c = mix(c, overlay.color, overlay.scrim);
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

function readable(t: Theme, overlay: PhotoOverlay): boolean {
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

/** Least plate at which the main text alone is readable on the worst photo, over the wash. */
function textScrim(t: Theme, color: string): number {
  const pixel = worstPixel(t);
  let scrim = 0;
  while (
    scrim < 0.97 &&
    ![false, true].every(
      (s) => contrastRatio(t.foreground, composite(t, { color, alpha: PHOTO_TINT, scrim }, pixel, s)) >= PHOTO_TEXT_MIN,
    )
  ) {
    scrim = step(scrim);
  }
  return scrim;
}

/**
 * The theme as drawn over photos. Body text sets how strong the plate has to
 * be; the secondary and accent colours are then lifted a little toward the
 * text colour (at most 60%) until they also clear their bar on that plate,
 * rather than darkening the photo for one emphasised word. Hue is kept, so
 * the clinic's accent still reads as theirs.
 */
export function photoTheme(t: Theme): Theme {
  const color = tintOf(t);
  const scrim = Math.min(0.97, textScrim(t, color) + MARGIN);
  const pixel = worstPixel(t);
  const passes = (c: string) =>
    [false, true].every(
      (s) => contrastRatio(c, composite(t, { color, alpha: PHOTO_TINT, scrim }, pixel, s)) >= PHOTO_LARGE_MIN,
    );
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

/**
 * Wash and plate for text drawn in `drawn`'s own colours over photos: the
 * least plate at which its body, secondary and accent colours all clear their
 * bars, plus MARGIN. Backdrop calls this with the theme the scenes are handed,
 * which over photos is already photoTheme(t) (Video.tsx), so the plate is
 * worked out for exactly the colours on screen.
 */
export function photoPlate(drawn: Theme): PhotoOverlay {
  const color = tintOf(drawn);
  let scrim = textScrim(drawn, color);
  while (scrim < 0.97 && !readable(drawn, { color, alpha: PHOTO_TINT, scrim })) scrim = step(scrim);
  scrim = Math.min(0.97, Math.round((scrim + MARGIN) * 100) / 100);
  return { color, alpha: PHOTO_TINT, scrim };
}

/** Wash and plate for photos behind `t` (the theme as given; its photo variant is derived here). */
export function photoOverlay(t: Theme): PhotoOverlay {
  return photoPlate(photoTheme(t));
}

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/** CSS for the wash over the whole photo. */
export function overlayCss(o: PhotoOverlay): string {
  return rgba(o.color, o.alpha);
}

/** CSS colour of the plate behind a text block. */
export function scrimCss(o: PhotoOverlay): string {
  return rgba(o.color, o.scrim);
}

// MARK: - The plate's shape

/** The plate behind a text block, in px at 1080 wide. */
export const SCRIM_SHAPE = {
  /**
   * Solid plate past the text block on every side. More than the furthest any
   * line slides in from (34 px, Surface and the sign-off logo), so text is on
   * the plate while it arrives, and more than a highlighter bar reaches past
   * its word.
   */
  pad: 44,
  /** How far beyond the solid part the plate fades out to nothing. */
  feather: 40,
  radius: 40,
} as const;

export type ScrimBox = {
  /** The column the text block is laid out in, px from the frame's left edge. */
  column: { left: number; right: number };
  /** The solid part of the plate, px from the frame's left edge. Vertically: the block plus `pad`. */
  plate: { left: number; right: number };
  /** Solid plate above and below the block, px. */
  pad: number;
  /** Fade-out beyond the solid part, px (drawn as a box-shadow of this blur and spread). */
  feather: number;
  radius: number;
};

/**
 * Where the plate sits across the frame for a text block laid out in the safe
 * column. The column is the frame inside the safe padding, which Backdrop
 * applies as inline-start/end: in a right-to-left frame inline start is the
 * right edge, so an Arabic block starts at `safe.start` from the RIGHT. The
 * plate covers the column with at least `pad` on both sides and is centred on
 * the frame, so it reads as one deliberate band rather than a card pushed
 * toward the platform's action rail. Vertically it follows the block itself
 * (Backdrop lays it out), `pad` above and below.
 */
export function scrimBox(width: number, safe: SafeFrame, rtl: boolean, scale = width / 1080): ScrimBox {
  const left = rtl ? safe.end : safe.start;
  const right = width - (rtl ? safe.start : safe.end);
  const pad = SCRIM_SHAPE.pad * scale;
  const margin = Math.max(0, Math.min(left, width - right) - pad);
  return {
    column: { left, right },
    plate: { left: margin, right: width - margin },
    pad,
    feather: SCRIM_SHAPE.feather * scale,
    radius: SCRIM_SHAPE.radius * scale,
  };
}

/**
 * The plate's offsets, in px, from the text block it is drawn behind
 * (position: absolute inside the block, which fills the text column). Left
 * and right are physical sides, so they hold in a right-to-left frame too.
 */
export function scrimInsets(box: ScrimBox): { top: number; bottom: number; left: number; right: number } {
  return {
    top: -box.pad,
    bottom: -box.pad,
    left: box.plate.left - box.column.left,
    right: box.column.right - box.plate.right,
  };
}

/**
 * Opacity of a plate drawn as a solid box with a box-shadow of blur `feather`
 * and spread `feather`, at `d` px outside the solid box (negative: inside).
 * The browser blurs a box-shadow with a Gaussian of sigma = blur / 2 around
 * the spread edge. Inside the solid box the box's own colour is drawn and the
 * shadow is clipped out, so it is exactly `alpha` there. Pure, for tests: it
 * shows there is no visible step where the solid part ends.
 */
export function plateAlphaAt(d: number, feather: number, alpha: number): number {
  if (d <= 0) return alpha;
  const sigma = feather / 2;
  // Distance past the spread edge (feather px out from the solid box).
  const x = (d - feather) / sigma;
  return alpha * (1 - normalCdf(x));
}

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error below 1.5e-7). */
function normalCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}
