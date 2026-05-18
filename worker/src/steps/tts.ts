import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

type TTSArgs = {
  text: string;
  voiceId: string;
  workDir: string;
  /** filename label (e.g. 'avatar-script') */
  label?: string;
  /** model — defaults to multilingual v2 which sounds natural with shorter scripts */
  modelId?: string;
};

/**
 * ElevenLabs TTS → MP3 file on disk. Uses the multilingual v2 model so the
 * same code path works for any language picked by the user.
 */
export async function synthesizeSpeech(a: TTSArgs): Promise<{
  audioPath: string;
  bytes: number;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const url = `${ELEVEN_BASE}/text-to-speech/${encodeURIComponent(a.voiceId)}?output_format=mp3_44100_128`;
  const body = {
    text: a.text,
    model_id: a.modelId ?? "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.35,
      use_speaker_boost: true,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`elevenlabs tts failed (${res.status}): ${errText.slice(0, 240)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = path.join(a.workDir, `${a.label ?? "tts"}.mp3`);
  await fs.writeFile(out, buf);
  logger.info({ voiceId: a.voiceId, bytes: buf.length, file: out }, "tts synthesized");
  return { audioPath: out, bytes: buf.length };
}
