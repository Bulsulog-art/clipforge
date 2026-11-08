import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { scenePlanSchema, sceneFrames, sceneOffsets } from "./scene-plan.js";
import type { ScenePlan } from "./scene-plan.js";
import { brandTheme, theme as resolveTheme } from "./theme.js";
import { sceneOpacity } from "./animation.js";
import { SceneView } from "./scenes/index.js";
import { Watermark } from "./Watermark.js";
import { LogoMark } from "./LogoMark.js";
import { CORNER_LOGO, logoStyleSchema, type LogoStyle } from "./logo-style.js";
import type { Theme } from "./theme.js";
import { BackgroundLayer, PhotoBackdrop } from "./background-layer.js";
import { photoTheme } from "./photo-overlay.js";

/**
 * Props the renderer is handed. The plan travels as data alongside the two
 * things that are resolved at render time and deliberately kept out of it:
 * where each footage scene's file actually lives, and where the narration
 * audio was written.
 */
export const videoPropsSchema = z.object({
  plan: scenePlanSchema,
  /** Resolved footage path per scene index. Missing entries degrade gracefully. */
  footage: z.record(z.string(), z.string()).default({}),
  /** Narration track, already rendered to a file by the TTS step. */
  voiceoverSrc: z.string().optional(),
  musicSrc: z.string().optional(),
  /** Free renders carry the mark; subscribers do not. */
  watermark: z.boolean().default(false),
  /** A client's logo, staged like the audio; shown small in the top corner. */
  logoSrc: z.string().optional(),
  /** How to draw the logo, from analysing it (dental/logo.ts). Absent: a light chip. */
  logoStyle: logoStyleSchema.optional(),
  /**
   * The plan's background photos as the renderer staged them (render-plan.ts),
   * parallel to plan.backgrounds. Absent: plan.backgrounds are used as-is,
   * which is what the browser preview does (they are web paths).
   */
  backgroundSrcs: z.array(z.string()).max(8).optional(),
});

export type VideoProps = z.infer<typeof videoPropsSchema>;

/**
 * The whole video.
 *
 * Each scene is its own Sequence, so a scene component only ever sees frames
 * counted from its own start — no scene has to know where it sits in the
 * timeline, which is what keeps them independently testable and reorderable.
 *
 * Scenes cross-fade rather than hard-cut. A hard cut between two full-bleed
 * type frames reads as a glitch; eight frames of overlap reads as an edit.
 */
export const ClipForgeVideo: React.FC<VideoProps> = ({
  plan,
  footage,
  voiceoverSrc,
  musicSrc,
  watermark,
  logoSrc,
  logoStyle,
  backgroundSrcs,
}) => {
  const t = brandTheme(resolveTheme(plan.theme), plan.brandColor, plan.brandAccent);
  const photos = backgroundSrcs?.length ? backgroundSrcs : plan.backgrounds ?? [];
  // Over photos, muted and accent text are lifted just enough to stay readable (photo-overlay.ts).
  const sceneTheme = photos.length ? photoTheme(t) : t;
  const offsets = sceneOffsets(plan);
  const logo = logoSrc ? { src: asStatic(logoSrc), style: logoStyle } : undefined;
  // The sign-off shows the logo large; the corner mark steps aside for it.
  const ctaIndex = logo ? plan.scenes.findIndex((s) => s.kind === "cta") : -1;

  return (
    <AbsoluteFill style={{ backgroundColor: t.background[0] }}>
      {photos.length ? <BackgroundLayer srcs={photos} theme={t} /> : null}
      <PhotoBackdrop.Provider value={photos.length > 0}>
      {plan.scenes.map((scene, i) => {
        const durationInFrames = sceneFrames(scene);
        return (
          <Sequence
            key={i}
            from={offsets[i]}
            durationInFrames={durationInFrames}
            // Scenes overlap by the fade length so the outgoing frame is still
            // on screen while the next one comes up.
            layout="none"
          >
            <FadingScene
              scene={scene}
              theme={sceneTheme}
              durationInFrames={durationInFrames}
              footageSrc={footage[String(i)]}
              logo={logo}
            />
          </Sequence>
        );
      })}
      </PhotoBackdrop.Provider>

      {voiceoverSrc ? <Audio src={asStatic(voiceoverSrc)} /> : null}
      {/* Music sits well under narration; it is texture, not content. */}
      {musicSrc ? <Audio src={asStatic(musicSrc)} volume={voiceoverSrc ? 0.12 : 0.35} /> : null}

      {watermark ? <Watermark theme={t} /> : null}
      {logo ? (
        <ClinicLogo
          src={logo.src}
          style={logo.style}
          theme={t}
          hideFrom={ctaIndex >= 0 ? offsets[ctaIndex] : undefined}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** Wraps a scene in its own fade so the component itself never thinks about it. */
const FadingScene: React.FC<{
  scene: ScenePlan["scenes"][number];
  theme: ReturnType<typeof resolveTheme>;
  durationInFrames: number;
  footageSrc?: string;
  logo?: { src: string; style?: LogoStyle };
}> = ({ scene, theme, durationInFrames, footageSrc, logo }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, durationInFrames) }}>
      <SceneView
        scene={scene}
        theme={theme}
        frame={frame}
        durationInFrames={durationInFrames}
        footageSrc={footageSrc}
        logo={logo}
      />
    </AbsoluteFill>
  );
};

/**
 * The clinic's logo, top right, on the chip its analysis asked for: a light
 * chip for a dark mark (logos are drawn for white letterheads, and a dark
 * logo straight on a dark brand background vanishes), a deep brand chip for
 * a white mark, none for a logo that brings its own background.
 * Set below the top ~13%: Reels and TikTok draw their own header and camera
 * and search icons there. Steps aside as the sign-off, which shows the logo
 * large, comes in.
 */
const ClinicLogo: React.FC<{ src: string; style?: LogoStyle; theme: Theme; hideFrom?: number }> = ({
  src,
  style,
  theme,
  hideFrom,
}) => {
  const frame = useCurrentFrame();
  const opacity =
    hideFrom === undefined
      ? 1
      : interpolate(frame, [hideFrom - 4, hideFrom + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (opacity <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 260, right: 64, opacity }}>
      <LogoMark src={src} style={style} theme={theme} size={CORNER_LOGO} />
    </div>
  );
};

/** Staged files are named relative to the public folder; URLs pass through. */
function asStatic(src: string): string {
  return /^https?:/.test(src) ? src : staticFile(src);
}
