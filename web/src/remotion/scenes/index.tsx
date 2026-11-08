// GENERATED from worker/src/remotion/scenes/index.tsx by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import React from "react";
import type { Theme } from "../theme";
import type { Scene } from "../scene-plan";
import type { LogoStyle } from "../logo-style";
import { HookScene, StatementScene, QuoteScene, CtaScene, CompareScene } from "./text-scenes";
import { ListScene, StatScene } from "./data-scenes";
import { FootageScene } from "./footage-scene";

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
  /** The client's logo, already resolved; the sign-off shows it large. */
  logo?: { src: string; style?: LogoStyle };
}> = ({ scene, theme, frame, durationInFrames, footageSrc, logo }) => {
  switch (scene.kind) {
    case "hook":
      return <HookScene scene={scene} theme={theme} frame={frame} />;
    case "statement":
      return <StatementScene scene={scene} theme={theme} frame={frame} />;
    case "quote":
      return <QuoteScene scene={scene} theme={theme} frame={frame} />;
    case "cta":
      return <CtaScene scene={scene} theme={theme} frame={frame} logo={logo} />;
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
