import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";

type Args = {
  userId: string;
  derivativeId: string;
  sourceClipPath: string;          // path to source mp4 in clipforge-videos-rendered
  targetFacePath: string;          // path to user-uploaded face jpg in clipforge-faces
  workDir: string;
};

const REPLICATE_API = "https://api.replicate.com/v1";

/**
 * Face-swap an entire short clip using Replicate.
 *
 * Uses `cdingram/face-swap` (cheap + fast, ~$0.025/run typical).
 * Falls back to `omniedgeio/face-swap` if user wants higher fidelity.
 *
 * Costs paid via 2 ClipForge credits ($0.30 user-perceived value).
 */
export async function runFaceSwap(args: Args) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN not set");
  }

  // 1) Sign both inputs so Replicate can fetch them
  const [{ data: clipUrl, error: e1 }, { data: faceUrl, error: e2 }] = await Promise.all([
    supabase.storage.from("clipforge-videos-rendered").createSignedUrl(args.sourceClipPath, 3600),
    supabase.storage.from("clipforge-faces").createSignedUrl(args.targetFacePath, 3600),
  ]);
  if (e1 || !clipUrl) throw new Error(`clip url ${e1?.message}`);
  if (e2 || !faceUrl) throw new Error(`face url ${e2?.message}`);

  logger.info({ derivativeId: args.derivativeId }, "face swap → submit to replicate");

  // 2) Create prediction
  const create = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "cdingram/face-swap",
      input: {
        swap_image: faceUrl.signedUrl,
        input_video: clipUrl.signedUrl,
      },
    }),
  });
  const job = (await create.json()) as { id: string; urls: { get: string }; error?: string };
  if (!create.ok) throw new Error(`replicate ${create.status}: ${job.error}`);

  // 3) Poll for result (up to 5 min — video face swap is slow)
  const start = Date.now();
  let outputUrl: string | undefined;
  while (Date.now() - start < 5 * 60_000) {
    await new Promise((r) => setTimeout(r, 4000));
    const stRes = await fetch(job.urls.get, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
    const st = (await stRes.json()) as { status: string; output?: string | string[]; error?: string };

    if (st.status === "succeeded") {
      outputUrl = Array.isArray(st.output) ? st.output[0] : st.output;
      break;
    }
    if (st.status === "failed" || st.status === "canceled") {
      throw new Error(`replicate ${st.status}: ${st.error ?? ""}`);
    }

    // progress estimate (replicate gives no exact %)
    const elapsed = (Date.now() - start) / 60_000;
    const progress = Math.min(95, Math.round(20 + elapsed * 35));
    await supabase
      .from("clip_derivatives")
      .update({ progress })
      .eq("id", args.derivativeId);
  }
  if (!outputUrl) throw new Error("face swap timed out after 5 min");

  // 4) Download result + upload to our storage
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
