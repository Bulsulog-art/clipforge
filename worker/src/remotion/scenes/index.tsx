import React from "react";
import type { Theme } from "../theme.js";
import type { Scene } from "../scene-plan.js";
import { HookScene, StatementScene, QuoteScene, CtaScene, CompareScene } from "./text-scenes.js";
import { ListScene, StatScene } from "./data-scenes.js";
import { FootageScene } from "./footage-scene.js";

/**
 * Maps a scene to its component.
 *
 * The switch is exhaustive by construction: `never` in the default branch
 * means adding a scene kind to the plan without a component to draw it is a
 * type error, not a blank frame discovered in a rendered video.
 */
export const SceneView: React.FC<{
  scene: Scene;
  theme: Theme;
  frame: number;
  durationInFrames: number;
  /** Footage resolved by the render step, keyed by scene index. */
  footageSrc?: string;
}> = ({ scene, theme, frame, durationInFrames, footageSrc }) => {
  switch (scene.kind) {
    case "hook":
      return <HookScene scene={scene} theme={theme} frame={frame} />;
    case "statement":
      return <StatementScene scene={scene} theme={theme} frame={frame} />;
    case "quote":
      return <QuoteScene scene={scene} theme={theme} frame={frame} />;
    case "cta":
      return <CtaScene scene={scene} theme={theme} frame={frame} />;
    case "compare":
      return <CompareScene scene={scene} theme={theme} frame={frame} />;
    case "list":
      return (
        <ListScene scene={scene} theme={theme} frame={frame} durationInFrames={durationInFrames} />
      );
    case "stat":
      return (
        <StatScene scene={scene} theme={theme} frame={frame} durationInFrames={durationInFrames} />
      );
    case "footage":
      return (
        <FootageScene
          scene={scene}
          theme={theme}
          frame={frame}
          durationInFrames={durationInFrames}
          src={footageSrc}
        />
      );
    default: {
      const exhaustive: never = scene;
      throw new Error(`no component for scene kind: ${JSON.stringify(exhaustive)}`);
    }
  }
};
