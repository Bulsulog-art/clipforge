import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScenePlan } from "./scene-plan.js";
import type { FootageFields, PexelsVideo } from "./stock.js";

/**
 * The stock-clip fields on their way from week.ts to the render, along the
 * job's own path (dentvid/jobs.ts week callback): prepareNarration (the TTS,
 * mastering, fitPlanToVoice and snapScenesToPauses) and then renderPlan's
 * stock lookup (resolveFootageClips). Each step must hand the fields on: a
 * step that rebuilt the plan from its known fields would quietly turn the
 * rotation off, and nothing else would notice. Also the restyle's path, which
 * re-parses the stored plan. No network: the TTS, the mastering and Pexels
 * are stubs.
 */

vi.mock("./voiceover.js", async (orig) => ({
  ...(await orig<typeof import("./voiceover.js")>()),
  prepareVoiceover: vi.fn(),
}));
vi.mock("../dental/audio-master.js", () => ({ masterNarration: vi.fn(), mixNarrationWithMusic: vi.fn(), detectPauses: vi.fn() }));

const voiceover = await import("./voiceover.js");
const real = await vi.importActual<typeof import("./voiceover.js")>("./voiceover.js");
const { masterNarration, detectPauses } = await import("../dental/audio-master.js");
const { prepareNarration } = await import("../dental/narration-audio.js");
const { resolveFootageClips } = await import("./render-plan.js");
const { chooseVideo, clipIds } = await import("./stock.js");
const { parseScenePlan, totalSeconds } = await import("./scene-plan.js");

const tts = vi.mocked(voiceover.prepareVoiceover);
const master = vi.mocked(masterNarration);
const pauses = vi.mocked(detectPauses);

let workDir: string;
beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "stock-path-"));
  tts.mockReset();
  master.mockReset();
  pauses.mockReset();
  // The TTS speaks for 24 s: the plan is stretched to it, as the real prepareVoiceover does.
  tts.mockImplementation(async (p) => ({ plan: real.fitPlanToVoice(p, 24), voiceoverPath: path.join(workDir, "voiceover.loud.mp3"), voiceSeconds: 24, voiceModel: "tts-1-hd" }));
  master.mockImplementation(async (_in, out) => ({ path: out, seconds: 25, gainDb: 0, before: { I: -18, TP: -2, LRA: 4, thresh: -28 } }));
  // A pause between two sentences, just before the first cut (6.5 s once stretched), so the cut moves to it.
  pauses.mockResolvedValue([{ start: 5.7, end: 6.2 }]);
});
afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

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

const stored = (narrated: boolean) =>
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
    ...(narrated ? { voiceover: { text: "Pressing hard feels thorough. Gentle circles with soft bristles clean well and are kinder to your gums.", voice: "nova" } } : {}),
  });

/** What week.ts hands the render: the clinic's rotation, with the top clip already shown this week. */
const ROTATION = { footageSeed: "Live Oak Family Dentistry|Austin|US|liveoakdental", footageTurn: 2917, footageAvoid: [101] };
const rotated = chooseVideo(TEN, "toothbrush close up", 4, true, { rotation: { seed: ROTATION.footageSeed, turn: ROTATION.footageTurn, avoid: new Set(ROTATION.footageAvoid) }, targetWidth: 1080 })!.id;

/** The week callback in dentvid/jobs.ts, up to the stock lookup: narration first, then the render's footage. */
async function jobPath(plan: ScenePlan & FootageFields) {
  const voice = await prepareNarration(plan, workDir, "en", { model: "tts-1-hd" });
  const out = await resolveFootageClips(voice.plan, { workDir, renderId: "r", userAssets: [], pexelsApiKey: "k", fetchImpl: pexels });
  return { narrated: voice.plan as ScenePlan & FootageFields, clipIds: out.clipIds };
}

describe("the rotation fields reach the stock lookup through the narration", () => {
  it("a narrated video: TTS, mastering, the stretch to the voice and the cuts moved to its pauses all hand them on", async () => {
    expect(rotated).not.toBe(101);
    const { narrated, clipIds: shown } = await jobPath({ ...stored(true), ...ROTATION });
    expect(tts).toHaveBeenCalledOnce();
    // The steps really ran: the plan was stretched to the voice and its first cut moved.
    expect(totalSeconds(narrated)).toBeGreaterThan(totalSeconds(stored(true)));
    expect(narrated.scenes[0].seconds).toBeLessThan(6.3);
    expect(narrated.footageSeed).toBe(ROTATION.footageSeed);
    expect(narrated.footageTurn).toBe(ROTATION.footageTurn);
    expect(narrated.footageAvoid).toEqual(ROTATION.footageAvoid);
    expect(shown).toEqual([rotated]);
  });

  it("a video without narration text: the plan goes through untouched", async () => {
    tts.mockImplementation(real.prepareVoiceover);
    const { narrated, clipIds: shown } = await jobPath({ ...stored(false), ...ROTATION });
    expect(master).not.toHaveBeenCalled();
    expect(narrated.footageSeed).toBe(ROTATION.footageSeed);
    expect(shown).toEqual([rotated]);
  });

  it("a failed mastering keeps them too (the unmastered voice is used)", async () => {
    master.mockRejectedValueOnce(new Error("ffmpeg missing"));
    const { narrated, clipIds: shown } = await jobPath({ ...stored(true), ...ROTATION });
    expect(narrated.footageAvoid).toEqual(ROTATION.footageAvoid);
    expect(shown).toEqual([rotated]);
  });

  it("the clips a stored video showed (footageIds) come through the same way", async () => {
    const { narrated, clipIds: shown } = await jobPath({ ...stored(true), footageIds: [107] });
    expect(narrated.footageIds).toEqual([107]);
    expect(shown).toEqual([107]);
  });

  it("without the fields the render picks the top clip, as it always did", async () => {
    expect((await jobPath(stored(true))).clipIds).toEqual([101]);
  });
});

describe("the restyle (dentvid/jobs.ts: new photos, same video)", () => {
  /** The stored row's plan: what week.ts kept, with the clip the dentist saw. */
  const row = () => ({ ...stored(true), backgrounds: ["/dentvideo/backgrounds/cleaning-02.jpg"], footageIds: [rotated] });

  it("re-parses the stored plan, which drops footageIds: today the clip is swapped for the top one", async () => {
    const reparsed = parseScenePlan(row());
    expect("footageIds" in reparsed).toBe(false);
    expect((await jobPath(reparsed)).clipIds).toEqual([101]);
  });

  it("with the stored ids put back after parsing (the one-line change jobs.ts needs), the dentist's clip comes back", async () => {
    const stored = row();
    const plan = { ...parseScenePlan(stored), footageIds: clipIds(stored.footageIds) };
    expect((await jobPath(plan)).clipIds).toEqual([rotated]);
  });
});
