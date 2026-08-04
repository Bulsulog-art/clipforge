import React from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame } from "remotion";
import { z } from "zod";
import { scenePlanSchema, sceneFrames, sceneOffsets } from "./scene-plan.js";
import type { ScenePlan } from "./scene-plan.js";
import { theme as resolveTheme } from "./theme.js";
import { sceneOpacity } from "./animation.js";
import { SceneView } from "./scenes/index.js";
import { Watermark } from "./Watermark.js";

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
}) => {
  const t = resolveTheme(plan.theme);
  const offsets = sceneOffsets(plan);

  return (
    <AbsoluteFill style={{ backgroundColor: t.background[0] }}>
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
              theme={t}
              durationInFrames={durationInFrames}
              footageSrc={footage[String(i)]}
            />
          </Sequence>
        );
      })}

      {voiceoverSrc ? <Audio src={voiceoverSrc} /> : null}
      {/* Music sits well under narration; it is texture, not content. */}
      {musicSrc ? <Audio src={musicSrc} volume={voiceoverSrc ? 0.12 : 0.35} /> : null}

      {watermark ? <Watermark theme={t} /> : null}
    </AbsoluteFill>
  );
};

/** Wraps a scene in its own fade so the component itself never thinks about it. */
const FadingScene: React.FC<{
  scene: ScenePlan["scenes"][number];
  theme: ReturnType<typeof resolveTheme>;
  durationInFrames: number;
  footageSrc?: string;
}> = ({ scene, theme, durationInFrames, footageSrc }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, durationInFrames) }}>
      <SceneView
        scene={scene}
        theme={theme}
        frame={frame}
        durationInFrames={durationInFrames}
        footageSrc={footageSrc}
      />
    </AbsoluteFill>
  );
};
