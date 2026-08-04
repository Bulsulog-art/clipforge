import React from "react";
import { AbsoluteFill } from "remotion";
import type { Theme } from "./theme.js";
import { useScale, useSafeArea } from "./scenes/primitives.js";

/**
 * The free-tier mark.
 *
 * Sized to be unmistakable in a feed but not to ruin the video — a watermark
 * that spoils the output does not convert anyone, it just means the clip never
 * gets posted and nobody ever sees our name. It sits bottom-right, clear of
 * where captions and the platform's own UI land.
 */
export const Watermark: React.FC<{ theme: Theme }> = ({ theme }) => {
  const scale = useScale();
  const safe = useSafeArea();
  return (
    <AbsoluteFill
      style={{
        padding: `${safe.y * 0.5}px ${safe.x * 0.7}px`,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10 * scale,
          background: "rgba(0,0,0,0.42)",
          border: `${Math.max(1, 1.5 * scale)}px solid rgba(255,255,255,0.22)`,
          borderRadius: 999,
          padding: `${12 * scale}px ${22 * scale}px`,
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            width: 16 * scale,
            height: 16 * scale,
            borderRadius: 4 * scale,
            background: theme.accent,
          }}
        />
        <span
          style={{
            fontFamily: theme.bodyFont,
            fontSize: 26 * scale,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "#FFFFFF",
          }}
        >
          ClipForge
        </span>
      </div>
    </AbsoluteFill>
  );
};
