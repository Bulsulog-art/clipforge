import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import type { Theme } from "../theme.js";
import { TYPE, backgroundCss, fitText } from "../theme.js";
import { entrance, kenBurns } from "../animation.js";
import { useScale, useSafeArea } from "./primitives.js";
import type { Scene } from "../scene-plan.js";

/**
 * Real footage with an optional caption over it.
 *
 * The resolved file path is injected by the render step rather than being part
 * of the plan: the model asks for "sunrise over city" or "the user's second
 * clip", and we decide what that actually resolves to. That keeps the plan
 * portable — the same plan can be re-rendered later against different footage
 * — and it is what stops a model naming a URL we have no licence to.
 *
 * `src` missing is not an error. A stock lookup can come back empty and a
 * video should still be delivered, so the scene degrades to the theme
 * background with the caption still readable.
 */
export const FootageScene: React.FC<{
  scene: Extract<Scene, { kind: "footage" }>;
  theme: Theme;
  frame: number;
  durationInFrames: number;
  /** Local path or URL resolved by the render step. */
  src?: string;
}> = ({ scene, theme, frame, durationInFrames, src }) => {
  const scale = useScale();
  const safe = useSafeArea();
  const { width, height } = useVideoConfig();
  const zoom = kenBurns(frame, durationInFrames);
  // A bare filename lives in the render's public directory; anything with a
  // scheme is already fetchable as-is.
  const resolvedSrc = src && !/^https?:/.test(src) ? staticFile(src) : src;

  return (
    <AbsoluteFill style={{ background: backgroundCss(theme) }}>
      {resolvedSrc ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <OffthreadVideo
            src={resolvedSrc}
            // Footage is rarely the aspect we need, so it is filled and
            // cropped rather than letterboxed — bars read as a mistake.
            style={{
              width,
              height,
              objectFit: "cover",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            muted
          />
        </AbsoluteFill>
      ) : null}

      {/* Type over footage is unreadable without this. The gradient is heavier
          at the bottom, where the caption sits, and light enough at the top
          that the shot still reads. */}
      {scene.caption ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 38%, rgba(0,0,0,0) 68%)`,
          }}
        />
      ) : null}

      {scene.caption ? (
        <AbsoluteFill
          style={{
            padding: `${safe.y}px ${safe.x}px`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              fontFamily: theme.displayFont,
              fontSize: fitText(TYPE.heading, scene.caption, 46) * scale,
              fontWeight: 800,
              lineHeight: 1.14,
              letterSpacing: "-0.02em",
              // Always white over footage: the theme's foreground may be dark,
              // and a dark caption on an unpredictable shot is a coin flip.
              color: "#FFFFFF",
              textShadow: `0 ${4 * scale}px ${18 * scale}px rgba(0,0,0,0.55)`,
              ...entranceStyle(frame, scale),
            }}
          >
            {scene.caption}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

function entranceStyle(frame: number, scale: number): React.CSSProperties {
  const anim = entrance(frame, { delay: 4, duration: 18, distance: 32 });
  return {
    opacity: anim.opacity,
    transform: `translateY(${anim.translateY * scale}px)`,
  };
}
