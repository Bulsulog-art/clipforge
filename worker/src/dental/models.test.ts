import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_AGENT_MODEL, DEFAULT_REVIEW_MODEL, JUDGE_MODEL, resolveModels } from "./llm.js";
import { params } from "../lib/model-params.js";
import { resolveVoice, speakingTempo, voiceFor, voiceInstructions } from "./voice.js";
import { wer } from "./voice-eval.js";

vi.mock("../steps/tts.js", () => ({ synthesizeSpeech: vi.fn() }));
vi.mock("fluent-ffmpeg", () => ({
  default: { ffprobe: (_f: string, cb: (e: null, d: { format: { duration: number } }) => void) => cb(null, { format: { duration: 12 } }) },
}));
const { synthesizeSpeech } = await import("../steps/tts.js");
const { prepareVoiceover } = await import("../remotion/voiceover.js");

describe("resolveModels", () => {
  it("keeps the measured defaults when nothing is set", () => {
    expect(resolveModels({})).toEqual({ agent: DEFAULT_AGENT_MODEL, review: DEFAULT_REVIEW_MODEL });
    // The eval winner (docs/AUTONOMOUS_PLAN.md, "Model choice").
    expect(resolveModels({})).toEqual({ agent: "gpt-5.4-mini", review: "gpt-5.4" });
  });

  it("takes env overrides, trimmed, and ignores blanks", () => {
    expect(resolveModels({ DENTVID_AGENT_MODEL: " gpt-4.1-mini ", DENTVID_REVIEW_MODEL: "" })).toEqual({
      agent: "gpt-4.1-mini",
      review: DEFAULT_REVIEW_MODEL,
    });
    expect(resolveModels({ DENTVID_REVIEW_MODEL: "gpt-5.4" }).review).toBe("gpt-5.4");
  });

  it("keeps the eval judge fixed, whatever the candidates are", () => {
    expect(JUDGE_MODEL).toBe("gpt-4o");
  });
});

describe("model params", () => {
  it("sends temperature to the gpt-4 family", () => {
    expect(params("gpt-4o-mini", 0.7)).toEqual({ temperature: 0.7 });
    expect(params("gpt-4.1", 0.1)).toEqual({ temperature: 0.1 });
  });

  it("never sends a temperature to reasoning models that reject it", () => {
    expect(params("gpt-5.5", 0.7)).toEqual({ reasoning_effort: "none" });
    expect(params("gpt-5-mini", 0.7)).toEqual({ reasoning_effort: "minimal" });
    expect(params("gpt-6.1-sol", 0.7)).toEqual({ reasoning_effort: "low" });
  });

  it("gpt-5.4 takes temperature with reasoning off", () => {
    expect(params("gpt-5.4-mini", 0.7)).toEqual({ reasoning_effort: "none", temperature: 0.7 });
  });
});

describe("resolveVoice", () => {
  it("defaults to tts-1-hd with no instructions", () => {
    expect(resolveVoice("tr", {})).toEqual({ model: "tts-1-hd" });
  });

  it("gives a steerable model a per-language brief", () => {
    const v = resolveVoice("de", { DENTVID_TTS_MODEL: "gpt-4o-mini-tts" });
    expect(v.model).toBe("gpt-4o-mini-tts");
    expect(v.instructions).toContain("German");
    expect(v.instructions).toContain("dentist");
  });

  it("lets one language override the global choice", () => {
    const env = { DENTVID_TTS_MODEL: "gpt-4o-mini-tts", DENTVID_TTS_MODEL_TR: "tts-1-hd" };
    expect(resolveVoice("tr", env)).toEqual({ model: "tts-1-hd" });
    expect(resolveVoice("es", env).model).toBe("gpt-4o-mini-tts");
  });

  it("has a brief for every panel language", () => {
    for (const l of ["tr", "de", "es", "en", "fr", "it", "pt", "ja", "ar", "pl"]) expect(voiceInstructions(l)).not.toMatch(/undefined/);
    expect(voiceInstructions("ja")).toMatch(/Japanese/);
    expect(voiceInstructions("ar")).toMatch(/Modern Standard Arabic/);
  });
});

describe("prepareVoiceover fallback", () => {
  const plan = {
    title: "t",
    aspect: "9:16",
    theme: "sunrise",
    music: "none",
    scenes: [{ kind: "statement", text: "Hi", seconds: 4 }],
    voiceover: { text: "Hello there, this is your dentist.", voice: "nova" },
  } as never;
  const tts = vi.mocked(synthesizeSpeech);
  beforeEach(() => tts.mockReset());

  it("uses the configured model with its instructions", async () => {
    tts.mockResolvedValue({ audioPath: "/x/voiceover.mp3", bytes: 1 });
    const r = await prepareVoiceover(plan, "/x", { model: "gpt-4o-mini-tts", instructions: "warm" });
    expect(tts).toHaveBeenCalledTimes(1);
    expect(tts.mock.calls[0][0]).toMatchObject({ modelId: "gpt-4o-mini-tts", instructions: "warm" });
    expect(r.voiceModel).toBe("gpt-4o-mini-tts");
    expect(r.voiceSeconds).toBe(12);
  });

  it("falls back to tts-1-hd without instructions when the model fails", async () => {
    tts.mockRejectedValueOnce(new Error("openai tts failed (429)")).mockResolvedValueOnce({ audioPath: "/x/voiceover.mp3", bytes: 1 });
    const onFallback = vi.fn();
    const r = await prepareVoiceover(plan, "/x", { model: "gpt-4o-mini-tts", instructions: "warm", onFallback });
    expect(tts).toHaveBeenCalledTimes(2);
    expect(tts.mock.calls[1][0]).toMatchObject({ modelId: "tts-1-hd" });
    expect(tts.mock.calls[1][0]).not.toHaveProperty("instructions");
    expect(onFallback).toHaveBeenCalledOnce();
    expect(r.voiceModel).toBe("tts-1-hd");
  });

  it("does not retry tts-1-hd on itself", async () => {
    tts.mockRejectedValueOnce(new Error("down"));
    await expect(prepareVoiceover(plan, "/x")).rejects.toThrow("down");
    expect(tts).toHaveBeenCalledTimes(1);
  });
});

describe("wer", () => {
  it("ignores case and punctuation", () => {
    expect(wer("Diş taşı, bir hafta!", "diş taşı bir hafta")).toBe(0);
  });
  it("counts substitutions and drops against the script", () => {
    expect(wer("one two three four", "one too three")).toBe(0.5);
  });
});

describe("voice per language", () => {
  it("swaps the voices that read Arabic badly, and leaves the rest", () => {
    expect(voiceFor("ar", "onyx")).toBe("echo");
    expect(voiceFor("ar", "nova")).toBe("shimmer");
    expect(voiceFor("ja", "nova")).toBe("nova");
    expect(voiceFor("pl", "onyx")).toBe("onyx");
  });
});

describe("speakingTempo", () => {
  it("slows the measured-fast languages on tts-1-hd only", () => {
    expect(speakingTempo("en")).toBe(0.93);
    expect(speakingTempo("es", "tts-1-hd")).toBe(0.92);
    expect(speakingTempo("DE")).toBe(0.96);
    expect(speakingTempo("tr")).toBe(1);
    expect(speakingTempo("ja")).toBe(1);
    expect(speakingTempo(undefined)).toBe(1);
    expect(speakingTempo("en", "gpt-4o-mini-tts")).toBe(1);
  });
});
