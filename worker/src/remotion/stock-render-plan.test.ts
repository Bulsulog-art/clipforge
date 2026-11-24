import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PexelsVideo } from "./stock.js";

/**
 * renderPlan's own part in the clip handoff (render-plan.ts renderStaged):
 * it picks the clips from the plan's footage fields, gives the composition
 * the plan without them, and notes which clip each query got by the output
 * file, which is all the week's render callback hands back (dentvid/jobs.ts).
 * Remotion's bundler and renderer and the font check are stubs; the stock
 * lookup is the real one against a stubbed Pexels. No network, no browser.
 */

const BUNDLE = await fs.mkdtemp(path.join(os.tmpdir(), "stock-render-bundle-"));
vi.mock("@remotion/bundler", () => ({ bundle: vi.fn(async () => BUNDLE) }));
const renderMedia = vi.fn(async (o: { outputLocation: string }) => {
  await fs.writeFile(o.outputLocation, "");
});
vi.mock("@remotion/renderer", () => ({
  selectComposition: vi.fn(async () => ({ width: 1080, height: 1920, fps: 30, durationInFrames: 300, id: "ClipForgeVideo" })),
  renderMedia,
}));
vi.mock("./render-fonts.js", () => ({ assertRenderFonts: vi.fn(async () => {}) }));

// The bundler's public folder goes to a temp dir too, not the worktree (read once, when render-plan.ts loads).
const publicDirBefore = process.env.REMOTION_PUBLIC_DIR;
process.env.REMOTION_PUBLIC_DIR = path.join(BUNDLE, "public-root");
const { renderPlan } = await import("./render-plan.js");
if (publicDirBefore === undefined) delete process.env.REMOTION_PUBLIC_DIR;
else process.env.REMOTION_PUBLIC_DIR = publicDirBefore;
const { chooseVideo, takeFootage } = await import("./stock.js");
const { parseScenePlan } = await import("./scene-plan.js");

const TEN: PexelsVideo[] = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110].map((id) => ({
  id,
  width: 1080,
  height: 1920,
  duration: 30,
  video_files: [{ link: `https://x/${id}.mp4`, width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" }],
}));
const pexels = (async (url: string) =>
  String(url).includes("api.pexels.com")
    ? new Response(JSON.stringify({ videos: TEN }), { status: 200 })
    : new Response(new Uint8Array([1, 2, 3]), { status: 200 })) as unknown as typeof fetch;

const plan = () =>
  parseScenePlan({
    title: "Brushing too hard",
    aspect: "9:16",
    theme: "editorial",
    music: "none",
    scenes: [
      { kind: "hook", text: "Scrubbing hard with your toothbrush?", seconds: 4 },
      { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption: "Small circles", seconds: 4 },
      { kind: "statement", text: "Gentle circles clean better than scrubbing.", seconds: 4 },
      { kind: "cta", text: "Your own dentist can say which brush suits your gums.", seconds: 4 },
    ],
  });

let workDir: string;
beforeEach(async () => {
  renderMedia.mockClear();
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "stock-render-"));
});
afterAll(async () => {
  await fs.rm(BUNDLE, { recursive: true, force: true });
});

const run = (p: object) =>
  renderPlan({ plan: p as ReturnType<typeof plan>, workDir, outputPath: path.join(workDir, "video.mp4"), pexelsApiKey: "k", fetchImpl: pexels });

describe("renderPlan and the clips it shows", () => {
  it("a week's plan: the rotated clip is shown, returned, and noted with its query for the week", async () => {
    const rotation = { footageSeed: "clinic:c-1", footageTurn: 2917, footageAvoid: [101] };
    const want = chooseVideo(TEN, "toothbrush close up", 4, true, { rotation: { seed: "clinic:c-1", turn: 2917, avoid: new Set([101]) }, targetWidth: 1080 })!.id;
    expect(want).not.toBe(101);
    const res = await run({ ...plan(), ...rotation });
    expect(res.footageIds).toEqual([want]);
    expect(res.missingFootage).toBe(0);
    expect(takeFootage(res.outputPath)).toEqual([{ query: "toothbrush close up", id: want }]);
    // The composition draws nothing from the footage fields: it is never handed them.
    const props = (renderMedia.mock.calls[0][0] as unknown as { inputProps: { plan: Record<string, unknown>; footage: Record<string, string> } }).inputProps;
    for (const k of ["footageSeed", "footageTurn", "footageAvoid", "footageIds"]) expect(Object.keys(props.plan)).not.toContain(k);
    expect(props.footage["1"]).toMatch(new RegExp(`/stock-${want}\\.mp4$`));
  });

  it("a stored plan's clips are kept on a re-render", async () => {
    const res = await run({ ...plan(), footageIds: [107] });
    expect(res.footageIds).toEqual([107]);
    expect(takeFootage(res.outputPath)).toEqual([{ query: "toothbrush close up", id: 107 }]);
  });

  it("a plan without the fields shows the top clip, as before", async () => {
    const res = await run(plan());
    expect(res.footageIds).toEqual([101]);
    expect(takeFootage(res.outputPath)).toEqual([{ query: "toothbrush close up", id: 101 }]);
  });

  it("no Pexels key: no clip shown, nothing noted", async () => {
    const res = await renderPlan({ plan: plan(), workDir, outputPath: path.join(workDir, "video.mp4"), fetchImpl: pexels });
    expect(res.footageIds).toEqual([]);
    expect(takeFootage(res.outputPath)).toEqual([]);
  });
});
