import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScenePlan } from "../remotion/scene-plan.js";

vi.mock("../remotion/voiceover.js", async (orig) => ({
  ...(await orig<typeof import("../remotion/voiceover.js")>()),
  prepareVoiceover: vi.fn(),
}));
vi.mock("./audio-master.js", () => ({ masterNarration: vi.fn(), mixNarrationWithMusic: vi.fn() }));

const { prepareVoiceover } = await import("../remotion/voiceover.js");
const { masterNarration, mixNarrationWithMusic } = await import("./audio-master.js");
const { prepareNarration, speechPlan } = await import("./narration-audio.js");

const plan = (text?: string): ScenePlan =>
  ({
    title: "t",
    aspect: "9:16",
    theme: "sunrise",
    music: "none",
    scenes: [
      { kind: "hook", text: "Hook", seconds: 5 },
      { kind: "cta", text: "Ask us", seconds: 5 },
    ],
    ...(text ? { voiceover: { text, voice: "nova" } } : {}),
  }) as ScenePlan;

const tts = vi.mocked(prepareVoiceover);
const master = vi.mocked(masterNarration);
const mix = vi.mocked(mixNarrationWithMusic);

beforeEach(() => {
  tts.mockReset();
  master.mockReset();
  mix.mockReset();
  tts.mockImplementation(async (p) => ({ plan: p, voiceoverPath: "/w/voiceover.loud.mp3", voiceSeconds: 9, voiceModel: "tts-1-hd" }));
  master.mockImplementation(async (_in, out) => ({ path: out, seconds: 14, gainDb: 3, before: { I: -17, TP: -1, LRA: 3, thresh: -27 } }));
});

describe("speechPlan", () => {
  it("replaces only the narration text", () => {
    const p = speechPlan(plan("Plakları günde 20-22 saat takın!"), "tr");
    expect(p.voiceover?.text).toBe("Plakları günde 20 ile 22 saat takın.");
    expect(p.scenes).toEqual(plan().scenes);
  });
  it("no narration → unchanged", () => {
    const p = plan();
    expect(speechPlan(p, "tr")).toBe(p);
  });
});

describe("prepareNarration", () => {
  it("speaks the normalised text, masters it, and keeps the narrator's words in the plan", async () => {
    const r = await prepareNarration(plan("Hastaların %80'i memnun!"), "/w", "tr", { model: "tts-1-hd" });
    expect(tts.mock.calls[0][0].voiceover?.text).toBe("Hastaların yüzde 80'i memnun.");
    expect(r.plan.voiceover?.text).toBe("Hastaların %80'i memnun!");
    expect(r.voiceoverPath).toBe("/w/voiceover.master.wav");
    expect(r.mastered).toBe(true);
    expect(r.voiceModel).toBe("tts-1-hd");
  });
  it("stretches the plan to the mastered length (slower speech is longer)", async () => {
    const r = await prepareNarration(plan("Brush twice a day."), "/w", "en");
    expect(r.voiceSeconds).toBe(14);
    expect(r.plan.scenes.reduce((a, s) => a + s.seconds, 0)).toBeGreaterThanOrEqual(14);
  });
  it("uses the language's tempo for tts-1-hd, none for the steerable model", async () => {
    await prepareNarration(plan("Brush twice a day."), "/w", "es");
    expect(master.mock.calls[0][2]?.tempo).toBe(0.92);
    tts.mockImplementationOnce(async (p) => ({ plan: p, voiceoverPath: "/w/voiceover.loud.mp3", voiceSeconds: 9, voiceModel: "gpt-4o-mini-tts" }));
    await prepareNarration(plan("Cepíllate dos veces al día."), "/w", "es", { model: "gpt-4o-mini-tts" });
    expect(master.mock.calls[1][2]?.tempo).toBe(1);
    await prepareNarration(plan("Günde iki kez fırçalayın."), "/w", "tr");
    expect(master.mock.calls[2][2]?.tempo).toBe(1);
  });
  it("a mastering failure keeps the plain voice and reports it", async () => {
    master.mockRejectedValueOnce(new Error("ffmpeg died"));
    const onMasterError = vi.fn();
    const r = await prepareNarration(plan("Floss daily."), "/w", "en", { onMasterError });
    expect(r.voiceoverPath).toBe("/w/voiceover.loud.mp3");
    expect(r.mastered).toBeUndefined();
    expect(onMasterError).toHaveBeenCalledWith(expect.objectContaining({ message: "ffmpeg died" }));
    expect(r.plan.voiceover?.text).toBe("Floss daily.");
  });
  it("mixes music under the mastered voice when given, and survives a mix failure", async () => {
    mix.mockImplementationOnce(async (_v, _m, out) => ({ path: out, seconds: 14.2, gainDb: 0, before: { I: -14, TP: -2, LRA: 3, thresh: NaN } }));
    const r = await prepareNarration(plan("Floss daily."), "/w", "en", { musicPath: "/w/music.mp3" });
    expect(mix.mock.calls[0].slice(0, 3)).toEqual(["/w/voiceover.master.wav", "/w/music.mp3", "/w/voiceover.mix.wav"]);
    expect(r.voiceoverPath).toBe("/w/voiceover.mix.wav");

    mix.mockRejectedValueOnce(new Error("bad track"));
    const onMasterError = vi.fn();
    const r2 = await prepareNarration(plan("Floss daily."), "/w", "en", { musicPath: "/w/music.mp3", onMasterError });
    expect(r2.voiceoverPath).toBe("/w/voiceover.master.wav");
    expect(onMasterError).toHaveBeenCalled();
  });
  it("no narration: no TTS output, nothing mastered", async () => {
    tts.mockImplementationOnce(async (p) => ({ plan: p }));
    const r = await prepareNarration(plan(), "/w", "en");
    expect(r.voiceoverPath).toBeUndefined();
    expect(master).not.toHaveBeenCalled();
  });
  it("a TTS failure still rejects (the job's own fallback renders without voice)", async () => {
    tts.mockRejectedValueOnce(new Error("quota"));
    await expect(prepareNarration(plan("Floss daily."), "/w", "en")).rejects.toThrow("quota");
  });
});
