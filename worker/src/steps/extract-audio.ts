import ffmpeg from "fluent-ffmpeg";
import path from "node:path";
import { logger } from "../logger.js";

/**
 * Extract a small mono 16 kHz MP3 from the source before transcription.
 *
 * transcribe() reads the whole input file into memory (the local whisper
 * service buffers it; the OpenAI fallback streams it). For an uploaded video
 * that can be hundreds of MB to multiple GB — the largest per-job memory spike,
 * and it bills the OpenAI Whisper fallback on a huge file. faster-whisper and
 * Whisper-1 both consume 16 kHz mono audio natively, so transcription quality
 * is unchanged while the file shrinks to a few MB.
 *
 * Falls back to the original path if extraction fails, so transcription never
 * breaks because of this optimization. No new dependency — fluent-ffmpeg is
 * already used by download/render.
 */
export async function extractAudio(sourcePath: string, workDir: string): Promise<string> {
  const out = path.join(workDir, "audio.mp3");
  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourcePath)
        .noVideo()
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec("libmp3lame")
        .audioQuality(9)
        .on("end", () => resolve())
        .on("error", (e) => reject(e))
        .save(out);
    });
    return out;
  } catch (e) {
    logger.warn(
      { err: (e as Error).message },
      "audio extraction failed — transcribing the full source file instead",
    );
    return sourcePath;
  }
}
