import React from "react";
import { Composition } from "remotion";
import { ClipForgeVideo, videoPropsSchema } from "./Video.js";
import { totalFrames, dimensions, FPS, type ScenePlan } from "./scene-plan.js";

/**
 * Remotion's entry point.
 *
 * There is one composition, not one per aspect ratio: the plan already carries
 * its aspect and its duration, so `calculateMetadata` reads them off the props
 * at render time. A composition per shape would be three places to keep in
 * sync and three chances to render a video at the wrong size.
 */

/** Shown when the composition is opened in the Remotion studio with no props. */
const PREVIEW_PLAN: ScenePlan = {
  title: "Preview",
  aspect: "9:16",
  theme: "midnight",
  music: "none",
  scenes: [
    { kind: "hook", text: "Nobody tells you this about mornings", seconds: 3 },
    {
      kind: "stat",
      value: "87%",
      label: "of people check their phone before getting up",
      seconds: 4,
    },
    {
      kind: "list",
      heading: "Three rules",
      items: ["Phone stays outside the bedroom", "Water before coffee", "Ten minutes of daylight"],
      seconds: 6,
    },
    { kind: "cta", text: "Try it for a week", handle: "@clipforge", seconds: 3 },
  ],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ClipForgeVideo"
    component={ClipForgeVideo}
    schema={videoPropsSchema}
    fps={FPS}
    // Placeholders. calculateMetadata replaces all three from the real plan.
    durationInFrames={totalFrames(PREVIEW_PLAN)}
    width={dimensions(PREVIEW_PLAN).width}
    height={dimensions(PREVIEW_PLAN).height}
    defaultProps={{
      plan: PREVIEW_PLAN,
      footage: {},
      watermark: false,
    }}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames(props.plan),
      ...dimensions(props.plan),
      fps: FPS,
    })}
  />
);
