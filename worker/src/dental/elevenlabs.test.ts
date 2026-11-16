import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// No real audio work and no paid call: OpenAI TTS and ffmpeg are mocked, ElevenLabs gets a fake fetch.
vi.mock("../steps/tts.js", () => ({ synthesizeSpeech: vi.fn() }));
vi.mock("fluent-ffmpeg", () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    const self = () => c;
    for (const m of ["audioFilters", "audioCodec", "audioBitrate"]) c[m] = self;
    const handlers: Record<string, () => void> = {};
    c.on = (ev: string, fn: () => void) => ((handlers[ev] = fn), c);
    c.save = () => handlers.error?.(); // mastering "fails" → the input file is used
    return c;
  };
  const ffmpeg = Object.assign(chain, { ffprobe: (_f: string, cb: (e: null, d: unknown) => void) => cb(null, { format: { duration: 21.5 } }) });
  return { default: ffmpeg };
});

const { synthesizeSpeech } = await import("../steps/tts.js");
const { prepareVoiceover } = await import("../remotion/voiceover.js");
const el = await import("./elevenlabs.js");
const { resolveVoice, narratorOf, openaiVoiceFor } = await import("./voice.js");
const { guardConfig, MemoryGuardStore, SpendGuard, COST_DEFAULTS } = await import("../dentvid/spend-guard.js");

const SARAH = "Nhs7eitvQWFTQBsf0yiT";
const MAX = "Gfpl8Yo74Is0W6cPUWWT";
const ELISE = "EST9Ui6982FZPSi7gCHi";
const ON = { DENTVID_TTS_PROVIDER: "elevenlabs", ELEVENLABS_API_KEY: "test-key" };

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eleven-"));
afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));

const audioRes = (bytes = 64) => new Response(new Uint8Array(bytes).fill(7), { status: 200, headers: { "content-type": "audio/mpeg" } });
const plan = (text = "Bleeding gums when you brush? That is usually your gums asking for a little more care.") =>
  ({ title: "t", aspect: "9:16", theme: "midnight", scenes: [{ kind: "hook", text: "Hi", seconds: 5 }], voiceover: { text, voice: "nova" } }) as never;

beforeEach(() => {
  vi.mocked(synthesizeSpeech).mockReset();
  vi.mocked(synthesizeSpeech).mockImplementation(async (a) => {
    const p = path.join(a.workDir, `${a.label}.mp3`);
    fs.writeFileSync(p, "openai");
    return { audioPath: p, bytes: 6 };
  });
});

describe("provider selection", () => {
  it("is OpenAI unless DENTVID_TTS_PROVIDER=elevenlabs", () => {
    expect(el.ttsProvider({})).toBe("openai");
    expect(el.ttsProvider({ DENTVID_TTS_PROVIDER: "openai" })).toBe("openai");
    expect(el.ttsProvider({ DENTVID_TTS_PROVIDER: "something" })).toBe("openai");
    expect(el.ttsProvider({ DENTVID_TTS_PROVIDER: " ElevenLabs " })).toBe("elevenlabs");
  });

  it("resolveVoice adds ElevenLabs settings only when selected, and keeps the OpenAI fallback settings", () => {
    expect(resolveVoice("en", {})).toEqual({ model: "tts-1-hd" });
    const v = resolveVoice("en", ON, "US", "male");
    expect(v.model).toBe("tts-1-hd");
    expect(v.eleven).toEqual({ voiceId: MAX, model: "eleven_multilingual_v2" });
    expect(resolveVoice("de", ON).eleven?.voiceId).toBe(SARAH);
  });
});

describe("voice map", () => {
  it("defaults to Sarah (female) and Max (male) in every language; Elise is not a default", () => {
    for (const lang of ["en", "tr", "de", "es", "fr", "it", "pt", "ja", "ar", "pl"]) {
      expect(el.elevenVoiceId(lang, "female", {})).toBe(SARAH);
      expect(el.elevenVoiceId(lang, "male", {})).toBe(MAX);
    }
    expect(Object.values(el.ELEVEN_VOICES).flatMap((v) => Object.values(v))).not.toContain(ELISE);
    expect(el.elevenVoiceId("xx", "male", {})).toBe(MAX);
    expect(el.elevenVoiceId(undefined, undefined, {})).toBe(SARAH);
  });

  it("takes DENTVID_ELEVEN_VOICE_<LANG>_<F|M> overrides, ignoring malformed ones", () => {
    const env = { DENTVID_ELEVEN_VOICE_DE_F: "GermanVoice12345", DENTVID_ELEVEN_VOICE_TR_M: "../../bad id" };
    expect(el.elevenVoiceId("de", "female", env)).toBe("GermanVoice12345");
    expect(el.elevenVoiceId("de", "male", env)).toBe(MAX);
    expect(el.elevenVoiceId("tr", "male", env)).toBe(MAX);
  });

  it("maps the clinic's narrator choice; unset is female", () => {
    expect(narratorOf({})).toBe("female");
    expect(narratorOf({ narratorVoice: "male" })).toBe("male");
    expect(openaiVoiceFor("en", "female")).toBe("nova");
    expect(openaiVoiceFor("en", "male")).toBe("onyx");
    expect(openaiVoiceFor("ar", "male")).toBe("echo");
  });
});

describe("request shape", () => {
  it("posts the text with model, voice settings and the xi-api-key header", () => {
    const r = el.elevenRequest("Hallo", { voiceId: SARAH, model: "eleven_multilingual_v2", languageCode: "de" }, "k");
    expect(r.url).toBe(`https://api.elevenlabs.io/v1/text-to-speech/${SARAH}?output_format=mp3_44100_128`);
    expect(r.init.method).toBe("POST");
    expect(r.init.headers["xi-api-key"]).toBe("k");
    const body = JSON.parse(r.init.body);
    expect(body).toEqual({
      text: "Hallo",
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
    });
  });

  it("sends language_code only to models that support it", () => {
    expect(resolveVoice("tr", { ...ON, DENTVID_ELEVEN_MODEL: "eleven_flash_v2_5" }).eleven).toMatchObject({ languageCode: "tr" });
    const body = JSON.parse(el.elevenRequest("Merhaba", { voiceId: SARAH, model: "eleven_flash_v2_5", languageCode: "tr" }, "k").init.body);
    expect(body.language_code).toBe("tr");
    expect(resolveVoice("tr", ON).eleven?.languageCode).toBeUndefined();
  });
});

describe("synthesizeEleven", () => {
  const cfg = { voiceId: SARAH, model: "eleven_multilingual_v2" };

  it("writes the mp3 and counts characters", async () => {
    const f = vi.fn(async () => audioRes(100));
    const r = await el.synthesizeEleven({ text: "Merhaba dişler", workDir: DIR, label: "a", cfg, env: ON, fetchImpl: f as never });
    expect(f).toHaveBeenCalledTimes(1);
    expect(fs.statSync(r.audioPath).size).toBe(100);
    expect(r.chars).toBe(14);
  });

  it("refuses without a key and never calls the network", async () => {
    const f = vi.fn();
    await expect(el.synthesizeEleven({ text: "x", workDir: DIR, cfg, env: { DENTVID_TTS_PROVIDER: "elevenlabs" }, fetchImpl: f as never })).rejects.toThrow(/ELEVENLABS_API_KEY/);
    expect(f).not.toHaveBeenCalled();
  });

  it("throws on non-2xx, empty audio and timeout", async () => {
    await expect(el.synthesizeEleven({ text: "x", workDir: DIR, cfg, env: ON, fetchImpl: (async () => new Response("quota", { status: 401 })) as never })).rejects.toThrow(/401/);
    await expect(el.synthesizeEleven({ text: "x", workDir: DIR, cfg, env: ON, fetchImpl: (async () => audioRes(0)) as never })).rejects.toThrow(/no audio/);
    const hang = (_u: string, init: RequestInit) =>
      new Promise<Response>((_, rej) => init.signal!.addEventListener("abort", () => rej(new Error("aborted"))));
    await expect(el.synthesizeEleven({ text: "x", workDir: DIR, cfg, env: ON, fetchImpl: hang as never, timeoutMs: 20 })).rejects.toThrow(/timed out/);
  });
});

describe("prepareVoiceover with ElevenLabs", () => {
  const eleven = { voiceId: SARAH, model: "eleven_multilingual_v2" };

  it("narrates with ElevenLabs when it answers, without calling OpenAI", async () => {
    const dir = fs.mkdtempSync(path.join(DIR, "ok-"));
    const fallback = vi.fn();
    const v = await prepareVoiceover(plan(), dir, { eleven, elevenEnv: ON, elevenFetch: (async () => audioRes()) as never, onProviderFallback: fallback });
    expect(v.ttsProvider).toBe("elevenlabs");
    expect(v.voiceModel).toBe("elevenlabs:eleven_multilingual_v2");
    expect(v.ttsChars).toBeGreaterThan(50);
    expect(v.voiceSeconds).toBe(21.5);
    expect(synthesizeSpeech).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("falls back to OpenAI on an error answer, and says so", async () => {
    const dir = fs.mkdtempSync(path.join(DIR, "err-"));
    const fallback = vi.fn();
    const v = await prepareVoiceover(plan(), dir, {
      eleven,
      elevenEnv: ON,
      elevenFetch: (async () => new Response("server error", { status: 500 })) as never,
      onProviderFallback: fallback,
    });
    expect(fallback).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/500/) }));
    expect(v.ttsProvider).toBe("openai");
    expect(v.voiceModel).toBe("tts-1-hd");
    expect(vi.mocked(synthesizeSpeech).mock.calls[0][0]).toMatchObject({ modelId: "tts-1-hd", voiceId: "nova" });
    expect(v.voiceoverPath).toBeTruthy();
  });

  it("falls back to OpenAI when the key is missing (nothing sent to ElevenLabs)", async () => {
    const dir = fs.mkdtempSync(path.join(DIR, "nokey-"));
    const f = vi.fn();
    const fallback = vi.fn();
    const v = await prepareVoiceover(plan(), dir, { eleven, elevenEnv: { DENTVID_TTS_PROVIDER: "elevenlabs" }, elevenFetch: f as never, onProviderFallback: fallback });
    expect(f).not.toHaveBeenCalled();
    expect(fallback.mock.calls[0][0].message).toMatch(/ELEVENLABS_API_KEY/);
    expect(v.ttsProvider).toBe("openai");
  });

  it("uses OpenAI only when ElevenLabs is not selected", async () => {
    const dir = fs.mkdtempSync(path.join(DIR, "off-"));
    const v = await prepareVoiceover(plan(), dir, {});
    expect(v.ttsProvider).toBe("openai");
    expect(synthesizeSpeech).toHaveBeenCalledTimes(1);
  });
});

describe("metering", () => {
  it("counts code points, so Japanese and Arabic are counted as written", () => {
    expect(el.ttsChars("歯ぐき")).toBe(3);
    expect(el.ttsChars("abc 😀")).toBe(5);
  });

  it("estimates cost per provider, with the ElevenLabs rate overridable", () => {
    expect(el.ttsCostUsd(400, "openai", {})).toBeCloseTo(0.012, 6);
    expect(el.ttsCostUsd(400, "elevenlabs", {})).toBeCloseTo(0.12, 6);
    expect(el.ttsCostUsd(400, "elevenlabs", { DENTVID_ELEVEN_USD_PER_1K_CHARS: "0.2" })).toBeCloseTo(0.08, 6);
  });

  it("raises the spend guard's estimates (and the clinic's daily cap) only when ElevenLabs is selected", () => {
    const off = guardConfig({});
    expect(off.costUsd).toEqual(COST_DEFAULTS);
    expect(off.clinicDailyUsd).toBe(5);
    const on = guardConfig(ON);
    const per = el.elevenSurchargePerVideoUsd(ON);
    expect(per).toBeCloseTo(0.1215, 4);
    expect(on.costUsd.week).toBeCloseTo(COST_DEFAULTS.week + 5 * per, 2);
    expect(on.costUsd.restyle).toBeCloseTo(COST_DEFAULTS.restyle + per, 2);
    expect(on.costUsd.recording).toBe(COST_DEFAULTS.recording);
    expect(on.clinicDailyUsd).toBeGreaterThan(5);
    // An explicit estimate is the whole estimate.
    expect(guardConfig({ ...ON, DENTVID_COST_WEEK_USD: "0.9" }).costUsd.week).toBe(0.9);
  });

  it("records characters per provider in the counter store", async () => {
    const store = new MemoryGuardStore();
    const guard = new SpendGuard(store, () => guardConfig(ON));
    const now = new Date("2026-11-16T09:00:00Z");
    const r = await guard.recordTts("elevenlabs", 400, "c1", now);
    await guard.recordTts("elevenlabs", 380, "c1", now);
    expect(r.usd).toBeCloseTo(0.12, 6);
    expect(store.values.get("dv:tts:chars:elevenlabs:month:2026-11")).toBe(780);
    expect(store.values.get("dv:tts:chars:elevenlabs:clinic:c1:2026-11-16")).toBe(780);
    store.down = true;
    await expect(guard.recordTts("openai", 10, "c1", now)).resolves.toMatchObject({ chars: 10 });
  });
});

describe("profile.narratorVoice", () => {
  it("keeps female/male and drops anything else", async () => {
    const { clinicProfileSchema } = await import("./profile.js");
    const base = { name: "A", country: "de", language: "de", services: ["PZR"] };
    expect(clinicProfileSchema.parse({ ...base, narratorVoice: "male" }).narratorVoice).toBe("male");
    expect(clinicProfileSchema.parse({ ...base, narratorVoice: "robot" }).narratorVoice).toBeUndefined();
    expect(clinicProfileSchema.parse(base).narratorVoice).toBeUndefined();
  });
});
