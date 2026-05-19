import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";
import { runFalQueue } from "../fal.js";

/**
 * Generate a lip-synced talking-head video from a still portrait + an audio
 * clip via FAL.ai.
 *
 * Model: `fal-ai/sadtalker`. ~$0.10 per 60s of output, billed per second of
 * compute. Equivalent to the lucataco/sadtalker Replicate fork we used before,
 * but with FAL's faster cold starts (no idle billing).
 *
 * A 5-credit avatar render (60s max) stays under $0.15 cost.
 */
type Args = {
  /** publicly fetchable URL to the portrait (square jpg/png) */
  portraitUrl: string;
  /** publicly fetchable URL to the speech audio (mp3/wav) */
  audioUrl: string;
  workDir: string;
  /** for progress callbacks */
  onProgress?: (pct: number) => Promise<void>;
};

export async function runLipsync(args: Args): Promise<{ videoPath: string }> {
  logger.info({ portrait: args.portraitUrl }, "lipsync → submit to FAL");

  const result = await runFalQueue<{
    video?: { url: string } | string;
    output?: string;
  }>(
    "fal-ai/sadtalker",
    {
      source_image_url: args.portraitUrl,
      driven_audio_url: args.audioUrl,
      preprocess: "full",
      still_mode: false,
      use_enhancer: true,
      face_resize: 512,
      expression_scale: 1.0,
    },
    {
      timeoutMs: 8 * 60_000,
      onProgress: args.onProgress,
    },
  );

  const outputUrl =
    typeof result.video === "string"
      ? result.video
      : result.video?.url ?? result.output ?? null;
  if (!outputUrl) {
    logger.error({ result }, "fal sadtalker returned no video url");
    throw new Error("lipsync returned no output url");
  }

  // Download to disk
  const out = path.join(args.workDir, `lipsync.mp4`);
  const dl = await fetch(outputUrl);
  if (!dl.ok) throw new Error(`lipsync download failed ${dl.status}`);
  await fs.writeFile(out, Buffer.from(await dl.arrayBuffer()));
  logger.info({ file: out, bytes: (await fs.stat(out)).size }, "lipsync downloaded");

  return { videoPath: out };
}
