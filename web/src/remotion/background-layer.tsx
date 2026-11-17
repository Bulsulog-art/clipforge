// GENERATED from worker/src/remotion/background-layer.tsx by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "./theme";
import { overlayCss, photoOverlay } from "./photo-overlay";

/**
 * Background photos behind the text scenes (DentVideo: the clinic picks 1–4
 * from the curated library, see dentvid/backgrounds/suggest.ts).
 *
 * The photos cross-fade through the whole video with a slow Ken Burns, under
 * a brand-tinted overlay strong enough that text keeps WCAG contrast on any
 * photo (photo-overlay.ts). Text scenes draw their usual backdrop transparent
 * while this layer is present (PhotoBackdrop context, read by Backdrop);
 * footage scenes still paint their own opaque frame, so real footage always
 * wins. With no photos nothing here renders and videos look exactly as before.
 */

/** True while a photo layer sits behind the scenes. */
export const PhotoBackdrop = createContext(false);
export const usePhotoBackdrop = () => useContext(PhotoBackdrop);

const FADE = 24;

/** Opacity and zoom of photo `i` of `n` at `frame` in a video of `total` frames. Pure, for tests. */
export function photoFrame(i: number, n: number, frame: number, total: number): { opacity: number; scale: number; x: number } {
  const span = total / n;
  const start = i * span;
  const end = start + span;
  // Each photo holds its slot and overlaps the next by FADE frames; the first
  // is fully up at frame 0 and the last stays to the end.
  const fadeIn = i === 0 ? 1 : interpolate(frame, [start - FADE / 2, start + FADE / 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = i === n - 1 ? 1 : interpolate(frame, [end - FADE / 2, end + FADE / 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const local = Math.min(1, Math.max(0, (frame - (start - FADE / 2)) / (span + FADE)));
  const zoomIn = i % 2 === 0;
  const scale = zoomIn ? 1.04 + 0.08 * local : 1.12 - 0.08 * local;
  const x = (i % 2 === 0 ? -1 : 1) * 14 * (local - 0.5);
  return { opacity: Math.min(fadeIn, fadeOut), scale, x };
}

/** Staged files are named relative to the public folder; absolute paths and URLs pass through. */
function resolve(src: string): string {
  return /^(https?:|\/|data:|blob:)/.test(src) ? src : staticFile(src);
}

export const BackgroundLayer: React.FC<{ srcs: string[]; theme: Theme }> = ({ srcs, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const overlay = photoOverlay(theme);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {srcs.map((src, i) => {
        const f = photoFrame(i, srcs.length, frame, durationInFrames);
        if (f.opacity <= 0) return null;
        return (
          <AbsoluteFill key={`${i}-${src}`} style={{ opacity: f.opacity }}>
            <Img
              src={resolve(src)}
              style={{
                width,
                height,
                objectFit: "cover",
                transform: `translateX(${f.x}px) scale(${f.scale})`,
                transformOrigin: "center 40%",
              }}
            />
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{ background: overlayCss(overlay) }} />
    </AbsoluteFill>
  );
};
