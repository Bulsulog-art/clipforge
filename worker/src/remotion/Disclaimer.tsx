import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DISCLAIMER_SECONDS, DISCLAIMER_STYLE, TYPE, disclaimerFrom, safeFrame, type Theme } from "./theme.js";

// The timing and look live in theme.ts (no React, no Remotion) so the
// dentist-recording clips, cut with ffmpeg, draw the same band
// (steps/captions.ts buildDisclaimerASS).
export { DISCLAIMER_SECONDS, DISCLAIMER_STYLE, disclaimerFrom };

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
  const opacity = interpolate(frame, [from, from + DISCLAIMER_STYLE.fadeFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
          lineHeight: DISCLAIMER_STYLE.lineHeight,
          fontWeight: DISCLAIMER_STYLE.fontWeight,
          color: "#FFFFFF",
          background: `rgba(0,0,0,${DISCLAIMER_STYLE.bandOpacity})`,
          borderRadius: DISCLAIMER_STYLE.radius * scale,
          padding: `${DISCLAIMER_STYLE.padY * scale}px ${DISCLAIMER_STYLE.padX * scale}px`,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
