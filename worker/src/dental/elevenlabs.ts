import fs from "node:fs/promises";
import path from "node:path";

/**
 * ElevenLabs narration for DentVideo (docs/TTS.md).
 *
 * Off by default: DENTVID_TTS_PROVIDER=elevenlabs plus ELEVENLABS_API_KEY on
 * the worker switch it on. Whenever it is selected but cannot be used (no
 * key, a non-2xx answer, a timeout, an empty body) the video is narrated by
 * OpenAI instead and the reason is logged (remotion/voiceover.ts
 * prepareVoiceover, onProviderFallback): an ElevenLabs problem costs the
 * nicer voice, never the video.
 *
 * Timing: the cuts are placed by silence detection on the mastered voice
 * (dental/audio-master.ts detectPauses + snapScenesToPauses), which works on
 * any provider's audio, so the plain endpoint is used, not /with-timestamps.
 */

export type TtsProvider = "openai" | "elevenlabs";

/** "female" | "male" — the clinic's narrator choice (profile.narratorVoice). */
export type NarratorGender = "female" | "male";

export const ELEVEN_BASE = "https://api.elevenlabs.io/v1";
/** Speaks all ten profile languages (en, tr, de, es, fr, it, pt, ja, ar, pl). */
export const DEFAULT_ELEVEN_MODEL = "eleven_multilingual_v2";
export const ELEVEN_OUTPUT_FORMAT = "mp3_44100_128";
export const ELEVEN_TIMEOUT_MS = 60_000;

/** Calm, natural read; style 0 keeps it from sounding performed. */
export const ELEVEN_VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true } as const;

/**
 * The voices the owner listened to and approved (ElevenLabs library, Nov 2026).
 *   Sarah Explains  Nhs7eitvQWFTQBsf0yiT  female, clear explainer, US English
 *   Max             Gfpl8Yo74Is0W6cPUWWT  male, friendly eLearning, US English
 * Alternative heard but not chosen as the default:
 *   Elise           EST9Ui6982FZPSi7gCHi  female, warm natural US
 */
const SARAH = "Nhs7eitvQWFTQBsf0yiT";
const MAX = "Gfpl8Yo74Is0W6cPUWWT";

/**
 * Voice per profile language × narrator. eleven_multilingual_v2 speaks every
 * language with the same voice, so Sarah and Max are the fallback everywhere;
 * a native voice per language will sound more local. Override any entry
 * without a deploy: DENTVID_ELEVEN_VOICE_<LANG>_<F|M>, e.g.
 * DENTVID_ELEVEN_VOICE_DE_F=<voice id>.
 */
export const ELEVEN_VOICES: Record<string, Record<NarratorGender, string>> = {
  en: { female: SARAH, male: MAX },
  // TODO: pick a native Turkish voice (listen in the ElevenLabs library first).
  tr: { female: SARAH, male: MAX },
  // TODO: pick a native German voice.
  de: { female: SARAH, male: MAX },
  // TODO: pick a native Castilian Spanish voice.
  es: { female: SARAH, male: MAX },
  // TODO: pick a native French voice.
  fr: { female: SARAH, male: MAX },
  // TODO: pick a native Italian voice (eval panel language).
  it: { female: SARAH, male: MAX },
  // TODO: pick a native European Portuguese voice (eval panel language).
  pt: { female: SARAH, male: MAX },
  // TODO: pick a native Japanese voice.
  ja: { female: SARAH, male: MAX },
  // TODO: pick a native Modern Standard Arabic voice.
  ar: { female: SARAH, male: MAX },
  // TODO: pick a native Polish voice.
  pl: { female: SARAH, male: MAX },
};

const VOICE_ID = /^[A-Za-z0-9]{8,64}$/;

export function ttsProvider(env: Record<string, string | undefined> = process.env): TtsProvider {
  return env.DENTVID_TTS_PROVIDER?.trim().toLowerCase() === "elevenlabs" ? "elevenlabs" : "openai";
}

/** The voice for a language and narrator: env override, then the map, then the English voice. */
export function elevenVoiceId(language: string | undefined, gender: NarratorGender = "female", env: Record<string, string | undefined> = process.env): string {
  const lang = (language ?? "en").toLowerCase().slice(0, 2);
  const override = env[`DENTVID_ELEVEN_VOICE_${lang.toUpperCase()}_${gender === "male" ? "M" : "F"}`]?.trim();
  if (override && VOICE_ID.test(override)) return override;
  return (ELEVEN_VOICES[lang] ?? ELEVEN_VOICES.en)[gender];
}

/**
 * ElevenLabs documents `language_code` (language enforcement) for the
 * turbo/flash v2.5 and v3 models; eleven_multilingual_v2 detects the
 * language from the text, and a model that does not support the field may
 * answer an error. So it is sent only to the models listed here.
 */
const LANGUAGE_CODE_MODELS = new Set(["eleven_turbo_v2_5", "eleven_flash_v2_5", "eleven_v3"]);

export function elevenSupportsLanguageCode(model: string): boolean {
  return LANGUAGE_CODE_MODELS.has(model);
}

export type ElevenConfig = {
  voiceId: string;
  model: string;
  /** ISO 639-1, sent only when the model supports it. */
  languageCode?: string;
};

/** Settings for one video, when ElevenLabs is the selected provider; undefined for OpenAI. */
export function resolveEleven(
  language: string | undefined,
  gender: NarratorGender = "female",
  env: Record<string, string | undefined> = process.env,
): ElevenConfig | undefined {
  if (ttsProvider(env) !== "elevenlabs") return undefined;
  const model = env.DENTVID_ELEVEN_MODEL?.trim() || DEFAULT_ELEVEN_MODEL;
  const lang = (language ?? "").toLowerCase().slice(0, 2);
  return {
    voiceId: elevenVoiceId(lang || "en", gender, env),
    model,
    ...(lang && elevenSupportsLanguageCode(model) ? { languageCode: lang } : {}),
  };
}

export type ElevenRequest = { url: string; init: { method: "POST"; headers: Record<string, string>; body: string } };

/** The exact request, built apart from sending it so tests can read it. */
export function elevenRequest(text: string, cfg: ElevenConfig, apiKey: string): ElevenRequest {
  const body: Record<string, unknown> = {
    text,
    model_id: cfg.model,
    voice_settings: { ...ELEVEN_VOICE_SETTINGS },
  };
  if (cfg.languageCode && elevenSupportsLanguageCode(cfg.model)) body.language_code = cfg.languageCode;
  return {
    url: `${ELEVEN_BASE}/text-to-speech/${encodeURIComponent(cfg.voiceId)}?output_format=${ELEVEN_OUTPUT_FORMAT}`,
    init: {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify(body),
    },
  };
}

export type ElevenSynthArgs = {
  text: string;
  workDir: string;
  /** File name without extension; `<label>.mp3` is written. */
  label?: string;
  cfg: ElevenConfig;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * One narration → `<workDir>/<label>.mp3`. Throws on anything but a non-empty
 * 2xx audio body, so the caller can fall back to OpenAI.
 */
export async function synthesizeEleven(a: ElevenSynthArgs): Promise<{ audioPath: string; bytes: number; chars: number }> {
  const env = a.env ?? process.env;
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const req = elevenRequest(a.text, a.cfg, apiKey);
  const ctrl = new AbortController();
  const timeoutMs = a.timeoutMs ?? ELEVEN_TIMEOUT_MS;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let buf: Buffer;
  try {
    const res = await (a.fetchImpl ?? fetch)(req.url, { ...req.init, signal: ctrl.signal });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`elevenlabs tts failed (${res.status}): ${errText.slice(0, 240)}`);
    }
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error(`elevenlabs tts timed out after ${timeoutMs} ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!buf.length) throw new Error("elevenlabs tts returned no audio");
  const out = path.join(a.workDir, `${a.label ?? "tts"}.mp3`);
  await fs.writeFile(out, buf);
  return { audioPath: out, bytes: buf.length, chars: ttsChars(a.text) };
}

// ---- Metering ----------------------------------------------------------------

/**
 * Characters billed: ElevenLabs bills one credit per character of text sent
 * (multilingual v2), OpenAI per character too. Code points, not UTF-16 units,
 * so Japanese and Arabic are counted as written.
 */
export function ttsChars(text: string): number {
  return [...text].length;
}

/**
 * USD per 1000 characters, deliberately on the high side (the spend guard
 * caps the bill, it is not the bill): ElevenLabs Creator is $22 / 100k
 * credits ($0.22 per 1k) with overage at about $0.30 per 1k; Pro is cheaper.
 * Set DENTVID_ELEVEN_USD_PER_1K_CHARS to the plan actually bought.
 */
export const DEFAULT_ELEVEN_USD_PER_1K = 0.3;
/** OpenAI tts-1-hd: $30 per 1M characters. */
export const OPENAI_HD_USD_PER_1K = 0.03;
/** A DentVideo narration is ~370-410 characters; budget a little more. */
export const CHARS_PER_VIDEO_ESTIMATE = 450;

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function elevenUsdPer1k(env: Record<string, string | undefined> = process.env): number {
  return num(env.DENTVID_ELEVEN_USD_PER_1K_CHARS, DEFAULT_ELEVEN_USD_PER_1K);
}

/** Estimated cost of one synthesis, by the provider that actually spoke. */
export function ttsCostUsd(chars: number, provider: TtsProvider, env: Record<string, string | undefined> = process.env): number {
  const per1k = provider === "elevenlabs" ? elevenUsdPer1k(env) : OPENAI_HD_USD_PER_1K;
  return (chars / 1000) * per1k;
}

/**
 * What one video's narration costs on ElevenLabs above the OpenAI estimate
 * the spend guard already budgets (COST_DEFAULTS) — 0 while OpenAI is the
 * provider. Used to raise the per-operation reservations (spend-guard.ts).
 */
export function elevenSurchargePerVideoUsd(env: Record<string, string | undefined> = process.env): number {
  if (ttsProvider(env) !== "elevenlabs") return 0;
  const chars = num(env.DENTVID_TTS_CHARS_PER_VIDEO, CHARS_PER_VIDEO_ESTIMATE);
  return Math.max(0, ttsCostUsd(chars, "elevenlabs", env) - ttsCostUsd(chars, "openai", env));
}
