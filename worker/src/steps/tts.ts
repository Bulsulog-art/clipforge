import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";

const OPENAI_BASE = "https://api.openai.com/v1";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

type TTSArgs = {
  text: string;
  /**
   * OpenAI voice name (alloy, echo, fable, onyx, nova, shimmer) OR our
   * internal persona id (alex, maya, theo, iris). Used when
   * `elevenLabsVoiceId` is not provided — see `synthesizeSpeech`.
   */
  voiceId: string;
  /**
   * Optional ElevenLabs voice id. When set, we route through the
   * ElevenLabs TTS endpoint with the user's cloned voice instead of
   * the generic OpenAI persona. Takes precedence over `voiceId`.
   */
  elevenLabsVoiceId?: string;
  workDir: string;
  /** filename label (e.g. 'avatar-script') */
  label?: string;
  /**
   * OpenAI model: tts-1 ($15/1M chars, fast) or tts-1-hd ($30/1M,
   * smoother). Default tts-1-hd for end-user output. Ignored when
   * elevenLabsVoiceId is set.
   */
  modelId?: string;
};

/**
 * Persona → OpenAI voice mapping. Keeps the rest of the codebase referring to
 * "alex/maya/theo/iris" (matches our avatar portraits) while we use whichever
 * OpenAI voice fits the persona best.
 *
 * OpenAI's voices and their feel:
 *   - alloy   : neutral, balanced, mid-pitch — works for "Alex" (coach)
 *   - nova    : warm, energetic feminine — works for "Maya" (energetic)
 *   - onyx    : deep masculine narrator — works for "Theo" (authoritative)
 *   - shimmer : bright feminine, gentle — works for "Iris" (warm storyteller)
 *   - echo    : flatter masculine, reserved
 *   - fable   : British accent, storytelling
 */
const PERSONA_TO_VOICE: Record<string, string> = {
  alex: "alloy",
  maya: "nova",
  theo: "onyx",
  iris: "shimmer",
};

const OPENAI_VOICES = new Set([
  "alloy", "echo", "fable", "onyx", "nova", "shimmer",
]);

function resolveVoice(input: string): string {
  const lower = input.toLowerCase();
  if (OPENAI_VOICES.has(lower)) return lower;
  if (PERSONA_TO_VOICE[lower]) return PERSONA_TO_VOICE[lower];
  // Unknown id — keep code path resilient and fall back to "alloy" so a stale
  // ElevenLabs voice id from the avatars DB seed doesn't blow up the pipeline.
  return "alloy";
}

/**
 * Text-to-Speech → MP3 file on disk.
 *
 * Routing:
 *   • `elevenLabsVoiceId` present → ElevenLabs `/v1/text-to-speech/{id}`
 *     using the user's cloned voice. The Plus feature; consumes the
 *     user's ElevenLabs character quota (we share one workspace key —
 *     ELEVENLABS_API_KEY — across users).
 *   • Otherwise → OpenAI tts-1-hd with the persona-mapped voice. The
 *     default for everyone; ~half the price of ElevenLabs and works in
 *     50+ languages.
 *
 * Both branches emit the same `{audioPath, bytes}` contract so
 * `pipeline.avatar.ts` doesn't have to care which provider ran.
 */
export async function synthesizeSpeech(a: TTSArgs): Promise<{
  audioPath: string;
  bytes: number;
}> {
  if (a.elevenLabsVoiceId) {
    return synthesizeViaElevenLabs(a);
  }
  return synthesizeViaOpenAI(a);
}

async function synthesizeViaOpenAI(a: TTSArgs): Promise<{
  audioPath: string;
  bytes: number;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const voice = resolveVoice(a.voiceId);
  const body = {
    model: a.modelId ?? "tts-1-hd",
    voice,
    input: a.text,
    response_format: "mp3",
  };

  const res = await fetch(`${OPENAI_BASE}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `openai tts failed (${res.status}): ${errText.slice(0, 240)}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(a.workDir, `${a.label ?? "tts"}.mp3`);
  await fs.writeFile(out, buf);
  logger.info(
    { provider: "openai", voice, requested: a.voiceId, bytes: buf.length, file: out },
    "tts synthesized",
  );
  return { audioPath: out, bytes: buf.length };
}

async function synthesizeViaElevenLabs(a: TTSArgs): Promise<{
  audioPath: string;
  bytes: number;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const voiceId = a.elevenLabsVoiceId!;

  // eleven_multilingual_v2 is the right default for cloned voices —
  // works in ~29 languages while preserving the speaker's timbre. The
  // `mp3_44100_128` output matches what the OpenAI branch emits so
  // downstream (lipsync, mux) doesn't need to know the difference.
  const body = {
    text: a.text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.45,        // a touch of variation — avoid robotic monotone
      similarity_boost: 0.8,  // hew close to the user's sample
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  const res = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `elevenlabs tts failed (${res.status}): ${errText.slice(0, 240)}`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(a.workDir, `${a.label ?? "tts"}.mp3`);
  await fs.writeFile(out, buf);
  logger.info(
    { provider: "elevenlabs", voiceId, bytes: buf.length, file: out },
    "tts synthesized",
  );
  return { audioPath: out, bytes: buf.length };
}
