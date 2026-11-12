// GENERATED from worker/src/remotion/scenes/footage-scene.tsx by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { PHRASE_BREAK } from "../script";
import { TYPE, backgroundCss, fitText, leading, scrimAlpha, tracking } from "../theme";
import { entrance, kenBurns } from "../animation";
import { safePadding, useScale, useSafeArea } from "./primitives";
import { usePhotoBackdrop } from "../background-layer";
import type { Scene } from "../scene-plan";

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
  // No clip (no stock key, no result, a failed download): the caption sits on
  // the video's library photos when it has them, on the brand background
  // otherwise. A scene with neither clip nor caption never reaches here —
  // render-plan.ts folds it into its neighbour (withoutEmptyFootage).
  const photo = usePhotoBackdrop();
  const scrim = theme.background[0];
  const alpha = scrimAlpha("#FFFFFF", scrim, "#FFFFFF");
  // Top of the solid part of the scrim, as % of the frame from the bottom: the caption's band.
  const captionBand = Math.round(((safe.bottom + 420 * scale) / height) * 100);
  const accentIn = entrance(frame, { delay: 2, duration: 18, distance: 0 }).opacity;

  return (
    <AbsoluteFill style={{ background: !resolvedSrc && photo ? "transparent" : backgroundCss(theme) }}>
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

      {/* Type over footage is unreadable without this. The scrim is the
          brand's deepest colour, not black — the clip then sits inside the
          clinic's look instead of cutting away from it — at the opacity at
          which white type clears 4.5:1 even over a white pixel (scrimAlpha),
          fading out above the caption so the top of the shot stays clean. */}
      {scene.caption ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to top, ${rgba(scrim, alpha)} 0%, ${rgba(scrim, alpha)} ${captionBand}%, ${rgba(scrim, alpha * 0.45)} ${captionBand + 14}%, ${rgba(scrim, 0)} ${captionBand + 30}%)`,
          }}
        />
      ) : null}

      {scene.caption ? (
        <AbsoluteFill
          style={{
            // Above the platform's caption block and audio line, not under them.
            ...safePadding(safe),
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 26 * scale,
          }}
        >
          <div
            style={{
              width: 96 * scale * accentIn,
              height: 8 * scale,
              borderRadius: 4 * scale,
              background: theme.accent,
            }}
          />
          <div
            style={{
              fontFamily: theme.displayFont,
              fontSize: fitText(TYPE.heading + 6, scene.caption, 40) * scale,
              fontWeight: 800,
              lineHeight: leading(theme, 1.12),
              letterSpacing: tracking(theme, "-0.02em"),
              ...PHRASE_BREAK,
              textWrap: "balance",
              // Always white over footage: the theme's foreground may be dark,
              // and a dark caption on an unpredictable shot is a coin flip.
              color: "#FFFFFF",
              ...entranceStyle(frame, scale),
            } as React.CSSProperties}
          >
            {scene.caption}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

function entranceStyle(frame: number, scale: number): React.CSSProperties {
  const anim = entrance(frame, { delay: 4, duration: 18, distance: 32 });
  return {
    opacity: anim.opacity,
    transform: `translateY(${anim.translateY * scale}px)`,
  };
}
