import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";

const REPLICATE_API = "https://api.replicate.com/v1";

/**
 * Run sadtalker on Replicate to generate a lip-synced talking-head video
 * from a still portrait + an audio clip.
 *
 * Model: `lucataco/sadtalker` (community fork, faster + cheaper than the
 * official OpenTalker version while keeping comparable quality for short clips).
 *
 * Cost: ~$0.02 / 10 seconds of output. A 5-credit avatar render (60s max)
 * stays well under $0.25 even at the upper bound.
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

type ReplicateCreateResp = {
  id: string;
  urls: { get: string };
  error?: string;
};
type ReplicatePollResp = {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
};

export async function runLipsync(args: Args): Promise<{ videoPath: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

  // Submit
  const create = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // lucataco/sadtalker
      version: "a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec5d05c",
      input: {
        source_image: args.portraitUrl,
        driven_audio: args.audioUrl,
        preprocess: "full",
        still_mode: false,
        use_enhancer: true,
        size_of_image: 512,
        expression_scale: 1.0,
      },
    }),
  });

  const created = (await create.json()) as ReplicateCreateResp;
  if (!create.ok) throw new Error(`replicate submit failed (${create.status}): ${created.error}`);

  logger.info({ replicateId: created.id }, "lipsync submitted");

  // Poll up to 8 min — sadtalker on a 60s script can take a few minutes
  const start = Date.now();
  let outputUrl: string | undefined;
  while (Date.now() - start < 8 * 60_000) {
    await new Promise((r) => setTimeout(r, 4000));
    const pollRes = await fetch(created.urls.get, {
      headers: { Authorization: `Token ${token}` },
    });
    const poll = (await pollRes.json()) as ReplicatePollResp;

    if (poll.status === "succeeded") {
      outputUrl = Array.isArray(poll.output) ? poll.output[0] : poll.output;
      break;
    }
    if (poll.status === "failed" || poll.status === "canceled") {
      throw new Error(`replicate ${poll.status}: ${poll.error ?? "unknown error"}`);
    }

    if (args.onProgress) {
      const elapsed = (Date.now() - start) / (8 * 60_000);
      await args.onProgress(Math.min(0.95, 0.1 + elapsed * 0.85));
    }
  }
  if (!outputUrl) throw new Error("lipsync timed out after 8 min");

  // Download to disk
  const out = path.join(args.workDir, `lipsync.mp4`);
  const dl = await fetch(outputUrl);
  if (!dl.ok) throw new Error(`lipsync download failed ${dl.status}`);
  await fs.writeFile(out, Buffer.from(await dl.arrayBuffer()));
  logger.info({ file: out, bytes: (await fs.stat(out)).size }, "lipsync downloaded");

  return { videoPath: out };
}
