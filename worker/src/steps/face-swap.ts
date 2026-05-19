import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { runFalQueue } from "../fal.js";

type Args = {
  userId: string;
  derivativeId: string;
  sourceClipPath: string;          // path to source mp4 in clipforge-videos-rendered
  targetFacePath: string;          // path to user-uploaded face jpg in clipforge-faces
  workDir: string;
};

/**
 * Face-swap an entire short clip using FAL.ai.
 *
 * Model: `fal-ai/face-swap` (full video face swap). Typical run: 60-120 s for a
 * 30-60 s clip, billed per-second of compute time (no idle charges, unlike
 * Replicate). Costs paid via 2 ClipForge credits ($0.30 user-perceived value).
 */
export async function runFaceSwap(args: Args) {
  // 1) Sign both inputs so FAL can fetch them
  const [{ data: clipUrl, error: e1 }, { data: faceUrl, error: e2 }] = await Promise.all([
    supabase.storage.from("clipforge-videos-rendered").createSignedUrl(args.sourceClipPath, 3600),
    supabase.storage.from("clipforge-faces").createSignedUrl(args.targetFacePath, 3600),
  ]);
  if (e1 || !clipUrl) throw new Error(`clip url ${e1?.message}`);
  if (e2 || !faceUrl) throw new Error(`face url ${e2?.message}`);

  logger.info({ derivativeId: args.derivativeId }, "face swap → submit to FAL");

  const result = await runFalQueue<{
    video?: { url: string } | string;
    output?: string;
  }>(
    "fal-ai/face-swap",
    {
      face_image_url: faceUrl.signedUrl,
      target_video_url: clipUrl.signedUrl,
    },
    {
      timeoutMs: 6 * 60_000,
      onProgress: async (frac) => {
        await supabase
          .from("clip_derivatives")
          .update({ progress: Math.max(20, Math.round(frac * 95)) })
          .eq("id", args.derivativeId);
      },
    },
  );

  const outputUrl =
    typeof result.video === "string"
      ? result.video
      : result.video?.url ?? result.output ?? null;
  if (!outputUrl) {
    logger.error({ result }, "fal face-swap returned no video url");
    throw new Error("face swap returned no output url");
  }

  // 2) Download result + upload to our storage
  const localOut = path.join(args.workDir, `swap-${args.derivativeId}.mp4`);
  const dl = await fetch(outputUrl);
  if (!dl.ok || !dl.body) throw new Error("could not download face swap output");
  await fs.writeFile(localOut, Buffer.from(await dl.arrayBuffer()));

  const storagePath = `${args.userId}/derivatives/${args.derivativeId}.mp4`;
  const { error: upErr } = await supabase.storage
    .from("clipforge-videos-rendered")
    .upload(storagePath, createReadStream(localOut) as any, {
      contentType: "video/mp4",
      upsert: true,
      duplex: "half",
    } as any);
  if (upErr) throw upErr;

  await fs.unlink(localOut).catch(() => {});
  return { storagePath };
}
