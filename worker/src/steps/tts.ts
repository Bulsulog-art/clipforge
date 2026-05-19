import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";

const OPENAI_BASE = "https://api.openai.com/v1";

type TTSArgs = {
  text: string;
  /** OpenAI voice name (alloy, echo, fable, onyx, nova, shimmer) OR our internal
   *  persona id (alex, maya, theo, iris). Maps below. */
  voiceId: string;
  workDir: string;
  /** filename label (e.g. 'avatar-script') */
  label?: string;
  /** OpenAI model: tts-1 ($15/1M chars, fast) or tts-1-hd ($30/1M, smoother).
   *  Default tts-1-hd for end-user output. */
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
 * OpenAI Text-to-Speech → MP3 file on disk.
 *
 * Replaces our earlier ElevenLabs flow. Same downstream contract (MP3 path +
 * size) so pipeline.avatar.ts didn't have to change. Tts-1-hd is roughly half
 * the price of ElevenLabs and works in 50+ languages.
 */
export async function synthesizeSpeech(a: TTSArgs): Promise<{
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
    { voice, requested: a.voiceId, bytes: buf.length, file: out },
    "tts synthesized",
  );
  return { audioPath: out, bytes: buf.length };
}
