import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TYPE, safeFrame, type Theme } from "./theme.js";

/** How long the warning stays up at the end, at least: two sentences need time to read. */
export const DISCLAIMER_SECONDS = 6;

/** The frame the warning appears on: the last scene's start, or earlier so it stays up DISCLAIMER_SECONDS. */
export function disclaimerFrom(lastSceneFrom: number, durationInFrames: number, fps: number): number {
  return Math.max(0, Math.min(lastSceneFrom, durationInFrames - Math.round(DISCLAIMER_SECONDS * fps)));
}

/**
 * A warning a market requires on screen (plan.disclaimer; Türkiye: RG 33075
 * md. 7/1-k), drawn small but legible at the foot of the safe frame for the
 * last seconds of the video: plain text on a dark band, so it reads over any
 * theme or photo. Kept in its own file so the scene templates stay untouched.
 */
export const Disclaimer: React.FC<{ text: string; theme: Theme; from: number }> = ({ text, theme, from }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const safe = safeFrame(width, height);
  const scale = width / 1080;
  const opacity = interpolate(frame, [from, from + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < from) return null;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        paddingBottom: safe.bottom,
        paddingInlineStart: safe.start,
        paddingInlineEnd: safe.end,
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: theme.bodyFont,
          fontSize: TYPE.label * scale,
          lineHeight: 1.3,
          fontWeight: 500,
          color: "#FFFFFF",
          background: "rgba(0,0,0,0.62)",
          borderRadius: 14 * scale,
          padding: `${12 * scale}px ${18 * scale}px`,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
