// GENERATED from worker/src/remotion/logo-style.ts by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import { z } from "zod";
import { contrastRatio, worstBackground, type Theme } from "./theme";

/**
 * How a client's logo is drawn in a video. Decided once by analysing the logo
 * file (dental/logo.ts) and handed to the composition as data, so this module
 * stays free of Node imports — the composition is bundled for the browser.
 *
 *   light  a dark or coloured mark on transparency: drawn on a near-white
 *          chip, the way it was designed to sit on a letterhead
 *   dark   a white or pale mark on transparency: a light chip would erase
 *          it, so it sits on a deep chip in the brand colour
 *   none   the logo brings its own solid background: no chip, the logo
 *          itself is rounded and lifted off the frame
 */
export const logoTreatmentSchema = z.enum(["light", "dark", "none"]);
export type LogoTreatment = z.infer<typeof logoTreatmentSchema>;

const fraction = z.number().min(0).max(1);

export const logoStyleSchema = z.object({
  treatment: logoTreatmentSchema,
  /** width / height of what is drawn: the visible logo, after `crop`. */
  aspect: z.number().positive().max(40),
  /**
   * The visible part of the image, as fractions of its width and height.
   * Logos are routinely exported with wide transparent margins; drawn as-is
   * they sit off-centre on their chip and come out smaller than they should.
   */
  crop: z.object({ x: fraction, y: fraction, w: fraction.positive(), h: fraction.positive() }).optional(),
});
export type LogoStyle = z.infer<typeof logoStyleSchema>;

/**
 * The logo's drawn size, in px at 1080 wide.
 *
 * Sized by *area*, not by width: a wide wordmark and a square emblem given
 * the same box look nothing alike — the wordmark becomes a thin sliver or the
 * emblem a huge block. Equal area makes them carry the same visual weight,
 * and the caps stop extreme shapes from running away in either direction.
 */
export function logoBox(
  aspect: number,
  opts: { area: number; maxWidth: number; maxHeight: number },
): { width: number; height: number } {
  const a = Math.min(40, Math.max(0.05, aspect || 1));
  let width = Math.sqrt(opts.area * a);
  let height = width / a;
  if (width > opts.maxWidth) {
    width = opts.maxWidth;
    height = width / a;
  }
  if (height > opts.maxHeight) {
    height = opts.maxHeight;
    width = height * a;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/** The corner mark: about the weight of a 110px square. */
export const CORNER_LOGO = { area: 110 * 110, maxWidth: 250, maxHeight: 110 } as const;
/** The sign-off: the logo is the subject of the last frame. */
export const CTA_LOGO = { area: 250 * 250, maxWidth: 600, maxHeight: 280 } as const;

export type ChipLook = {
  background: string;
  border: string;
  shadow: string;
  /** Padding around the logo, px. Zero when the logo is its own chip. */
  padY: number;
  padX: number;
  radius: number;
};

/**
 * The chip a logo sits on. Padding follows the logo's own height so a slim
 * wordmark is not swimming in white and a tall emblem is not cramped.
 */
export function chipLook(treatment: LogoTreatment | "bare", theme: Theme, logoHeight: number): ChipLook {
  const padY = Math.round(Math.min(30, Math.max(12, logoHeight * 0.24)));
  const padX = Math.round(padY * 1.4);
  const radius = Math.round(Math.min(32, (logoHeight + padY * 2) * 0.28));
  switch (treatment) {
    case "bare":
      return { background: "transparent", border: "none", shadow: "none", padY: 0, padX: 0, radius: 0 };
    case "light":
      return {
        background: "#FFFFFF",
        border: "1px solid rgba(255,255,255,0.6)",
        shadow: "0 10px 30px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)",
        padY,
        padX,
        radius,
      };
    case "dark":
      return {
        // The deepest brand stop, so a white mark reads at full strength and
        // the chip still belongs to the frame; the hairline separates it from
        // a background of the same hue.
        background: theme.background[0],
        border: "1.5px solid rgba(255,255,255,0.22)",
        shadow: "0 10px 30px rgba(0,0,0,0.32)",
        padY,
        padX,
        radius,
      };
    case "none":
      return {
        background: "transparent",
        border: "none",
        shadow: "0 10px 30px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.14)",
        padY: 0,
        padX: 0,
        radius: Math.round(Math.min(24, logoHeight * 0.16)),
      };
  }
}

/**
 * On the sign-off the logo sits on the frame's own background, which for a
 * white mark is already the deep chip it needs: drawn bare it reads as part
 * of the design rather than a sticker on it. Only when that background is
 * dark enough for white (a light theme without a brand colour is not).
 */
export function signOffTreatment(treatment: LogoTreatment, theme: Theme): LogoTreatment | "bare" {
  return treatment === "dark" && contrastRatio("#FFFFFF", worstBackground(theme)) >= 4.5 ? "bare" : treatment;
}
