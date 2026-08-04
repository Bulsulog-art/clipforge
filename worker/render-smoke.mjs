import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { webpackOverride } from "./src/remotion/webpack-override.ts";

const entry = path.resolve("src/remotion/index.ts");
console.log("bundling…");
const serveUrl = await bundle({ entryPoint: entry, webpackOverride });
console.log("bundled");

const inputProps = {
  plan: {
    title: "Smoke test",
    aspect: "9:16",
    theme: "midnight",
    music: "none",
    scenes: [
      { kind: "hook", text: "Nobody tells you this about mornings", seconds: 3 },
      { kind: "stat", value: "87%", label: "check their phone before getting up", seconds: 3.5 },
      { kind: "list", heading: "Three rules", items: ["Phone outside the bedroom", "Water before coffee", "Ten minutes of daylight"], seconds: 5 },
      { kind: "compare", left: { label: "Before", text: "Scroll for 40 minutes" }, right: { label: "After", text: "Out the door by 8" }, seconds: 3.5 },
      { kind: "cta", text: "Try it for a week", handle: "@clipforge", seconds: 3 },
    ],
  },
  footage: {},
  watermark: true,
};

const composition = await selectComposition({ serveUrl, id: "ClipForgeVideo", inputProps });
console.log("composition:", composition.width + "x" + composition.height, composition.durationInFrames + "f");

const started = Date.now();
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: "/tmp/clipforge-smoke.mp4",
  inputProps,
  concurrency: 4,
});
console.log("rendered in", ((Date.now() - started) / 1000).toFixed(1) + "s");
