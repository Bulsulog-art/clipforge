import { CORNER_LOGO, chipLook, logoBox, type LogoStyle } from "../remotion/logo-style.js";
import { brandTheme, theme } from "../remotion/theme.js";

/**
 * The ffmpeg half of logo branding: the same chip a Remotion video draws
 * (remotion/logo-style.ts), built as a filter chain for clips cut from the
 * dentist's own recording.
 *
 * The chip is a `color` source with its corners cut by a `geq` alpha mask,
 * the logo (trimmed to its visible part, sized by area) laid on it, and the
 * opacity applied to the pair. Both inputs are single frames, so the masks
 * are computed once per clip, not per frame; `overlay` then holds the result
 * for the whole clip, exactly as it does for a bare logo.
 *
 * ffmpeg cannot draw a soft shadow cheaply, so the chip has none. Over live
 * footage (rather than a flat brand frame) the chip's own edge does that job.
 */

export type LogoOverlay = {
  /** Input index of the logo image. */
  input: number;
  /** ffmpeg overlay x:y expression for where it goes. */
  position: string;
  opacity: number;
  /** From dental/logo.ts; without it the logo is drawn bare at 216px wide (the original behaviour). */
  style?: LogoStyle;
  /** Brand colour (hex, no #) — the dark chip is drawn in its deep shade. */
  brandHex?: string;
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Alpha that is 1 inside a rounded rectangle the size of the frame, 0 outside. */
function roundedMask(r: number): string {
  return `lte(hypot(max(0,max(${r}-X,X-(W-1-${r}))),max(0,max(${r}-Y,Y-(H-1-${r})))),${r})`;
}

/**
 * Filter-graph lines that turn `[<input>:v]` into `[logo]` and lay it over
 * `[v_base]` as `[v]`.
 */
export function logoOverlayFilters(o: LogoOverlay): string[] {
  const opacity = Math.max(0.1, Math.min(1, o.opacity)).toFixed(2);
  if (!o.style) {
    return [
      `[${o.input}:v]format=rgba,scale=216:-1,colorchannelmixer=aa=${opacity}[logo]`,
      `[v_base][logo]overlay=${o.position}[v]`,
    ];
  }

  const box = logoBox(o.style.aspect, CORNER_LOGO);
  const w = even(box.width);
  const h = even(box.height);
  const c = o.style.crop;
  const trim = c ? `crop=iw*${c.w}:ih*${c.h}:iw*${c.x}:ih*${c.y},` : "";
  const fitted = `[${o.input}:v]format=rgba,${trim}scale=${w}:${h}:flags=lanczos`;

  if (o.style.treatment === "none") {
    // The logo is its own chip: just round its corners.
    const r = chipLook("none", theme("midnight"), h).radius;
    return [
      `${fitted},geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*${roundedMask(r)}',colorchannelmixer=aa=${opacity}[logo]`,
      `[v_base][logo]overlay=${o.position}[v]`,
    ];
  }

  const t = brandTheme(theme("midnight"), o.brandHex);
  const look = chipLook(o.style.treatment, t, h);
  const fill = o.style.treatment === "light" ? "FFFFFF" : (o.brandHex ? t.background[0] : "#0D1A1E").replace("#", "");
  const cw = even(w + look.padX * 2);
  const ch = even(h + look.padY * 2);
  return [
    `${fitted}[logo_fit]`,
    `color=c=0x${fill}:s=${cw}x${ch}:d=1,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*${roundedMask(look.radius)}'[chip]`,
    `[chip][logo_fit]overlay=${(cw - w) / 2}:${(ch - h) / 2}:format=auto,colorchannelmixer=aa=${opacity}[logo]`,
    `[v_base][logo]overlay=${o.position}[v]`,
  ];
}
