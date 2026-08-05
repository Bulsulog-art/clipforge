import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createReadStream } from "node:fs";
import { supabase } from "./supabase.js";
import { logger } from "./logger.js";
import { planFromPrompt } from "./remotion/plan-from-prompt.js";
import { renderPlan } from "./remotion/render-plan.js";
import { ScenePlanError, totalSeconds } from "./remotion/scene-plan.js";
import { renderConcurrency } from "./remotion/capacity.js";
import type { ScenePlan } from "./remotion/scene-plan.js";

/**
 * The prompt-to-video job.
 *
 * Separate from the clipping pipeline on purpose: that one takes an existing
 * video apart, this one builds one from nothing. They share credits, storage
 * and the jobs table, and almost nothing else.
 *
 * The credit is taken up front and returned on failure. Charging on success
 * instead would mean a person can queue a hundred renders on an empty
 * balance; refunding on failure means a bad afternoon on our side never costs
 * them anything.
 */

export type GeneratePayload = {
  jobId: string;
  userId: string;
  prompt: string;
  /** Storage paths of clips the user attached, in their order. */
  assetPaths?: string[];
  aspect?: ScenePlan["aspect"];
  theme?: ScenePlan["theme"];
};

const CREDIT_COST = 1;
const RENDERED_BUCKET = "clipforge-videos-rendered";
const RAW_BUCKET = "clipforge-videos-raw";

/**
 * Progress bands. Planning is fast but not instant, footage is the part that
 * stalls on someone else's server, and rendering is the long tail — so the bar
 * spends its time roughly where the wall clock does. A progress bar that sits
 * at 90% for a minute is worse than no bar at all.
 */
const STAGE_RANGES = {
  queued: [0, 5],
  planning: [5, 25],
  gathering: [25, 40],
  rendering: [40, 95],
  uploading: [95, 99],
  ready: [100, 100],
} as const;

type Stage = keyof typeof STAGE_RANGES;

async function setProgress(
  jobId: string,
  stage: Stage,
  fraction = 0,
  extra: Record<string, unknown> = {},
) {
  const [lo, hi] = STAGE_RANGES[stage];
  const pct = Math.min(hi, Math.max(lo, Math.round(lo + (hi - lo) * fraction)));
  await supabase.from("video_jobs").update({ status: stage, progress: pct, ...extra }).eq("id", jobId);
}

async function setFailed(jobId: string, userFacing: string) {
  await supabase
    .from("video_jobs")
    .update({ status: "failed", progress: 0, error_message: userFacing.slice(0, 1000) })
    .eq("id", jobId);
}

async function consumeCredits(userId: string, reference: string) {
  const { error } = await supabase.rpc("consume_credits", {
    p_user_id: userId,
    p_amount: CREDIT_COST,
    p_reason: "generate",
    p_reference: reference,
  });
  if (error) {
    if (error.code === "P0001") throw new Error("insufficient_credits");
    throw error;
  }
}

async function refundCredits(userId: string, reference: string) {
  await supabase
    .rpc("grant_credits", {
      p_user_id: userId,
      p_amount: CREDIT_COST,
      p_kind: "admin_grant",
      p_reason: "generate failure refund",
      p_reference: reference,
    })
    .then(
      () => {},
      () => {},
    );
}

async function getProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("tier, watermark_enabled")
    .eq("id", userId)
    .single();
  return data as { tier: string; watermark_enabled: boolean } | null;
}

/** Downloads the clips the user attached so the renderer can stage them. */
async function fetchUserAssets(paths: string[], workDir: string): Promise<string[]> {
  const local: string[] = [];
  for (const [i, storagePath] of paths.entries()) {
    const { data, error } = await supabase.storage.from(RAW_BUCKET).download(storagePath);
    if (error || !data) {
      // A missing attachment is not fatal: the plan validator saw the count,
      // and a footage scene with no file falls back to the theme background.
      logger.warn({ storagePath, err: error?.message }, "user asset download failed");
      continue;
    }
    const dest = path.join(workDir, `user-${i}${path.extname(storagePath) || ".mp4"}`);
    await fs.writeFile(dest, Buffer.from(await data.arrayBuffer()));
    local.push(dest);
  }
  return local;
}

export async function runGenerate(p: GeneratePayload) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `cf-gen-${p.jobId}-`));
  let charged = false;

  try {
    await setProgress(p.jobId, "queued");
    await consumeCredits(p.userId, p.jobId);
    charged = true;

    const profile = await getProfile(p.userId);
    const isPaid = profile ? profile.tier !== "free" : false;

    // Attachments come down first: the plan is written knowing how many clips
    // are actually available, not how many were promised.
    await setProgress(p.jobId, "gathering", 0.1);
    const userAssets = p.assetPaths?.length ? await fetchUserAssets(p.assetPaths, workDir) : [];

    await setProgress(p.jobId, "planning");
    const { plan, repaired } = await planFromPrompt({
      prompt: p.prompt,
      userAssetCount: userAssets.length,
      aspect: p.aspect,
      theme: p.theme,
    });
    logger.info(
      { jobId: p.jobId, scenes: plan.scenes.length, seconds: totalSeconds(plan), repaired },
      "scene plan ready",
    );

    await setProgress(p.jobId, "gathering", 0.5, {
      title: plan.title,
      duration_seconds: Math.round(totalSeconds(plan)),
    });

    const outputPath = path.join(workDir, "out.mp4");
    const result = await renderPlan({
      plan,
      workDir,
      outputPath,
      userAssets,
      watermark: !isPaid,
      pexelsApiKey: process.env.PEXELS_API_KEY,
      concurrency: renderConcurrency(),
      onProgress: (fraction) => {
        // Fire and forget: a progress write that fails must not fail a render
        // that is otherwise going fine.
        void setProgress(p.jobId, "rendering", fraction).catch(() => {});
      },
      onWarn: (message) => logger.warn({ jobId: p.jobId, message }, "render warning"),
    });

    if (result.missingFootage > 0) {
      logger.warn(
        { jobId: p.jobId, missing: result.missingFootage },
        "some footage scenes rendered without a clip",
      );
    }

    await setProgress(p.jobId, "uploading");

    // Confirm the file is really there before streaming it. A renderer that
    // reports success without producing a file would otherwise surface as an
    // unhandled stream error rather than a failed job, and the credit would
    // never be refunded because nothing in the try block threw.
    const stat = await fs.stat(outputPath).catch(() => undefined);
    if (!stat || stat.size === 0) {
      throw new Error(`render reported success but produced no file at ${outputPath}`);
    }

    const storagePath = `${p.userId}/${p.jobId}/generated.mp4`;
    const { error: uploadError } = await supabase.storage
      .from(RENDERED_BUCKET)
      .upload(storagePath, createReadStream(outputPath) as never, {
        contentType: "video/mp4",
        upsert: true,
        duplex: "half",
      } as never);
    if (uploadError) throw uploadError;

    await supabase.from("clips").insert({
      job_id: p.jobId,
      user_id: p.userId,
      index_in_job: 0,
      start_seconds: 0,
      end_seconds: result.durationSec,
      hook: plan.scenes.find((s) => s.kind === "hook")?.text ?? plan.title,
      caption: plan.title,
      storage_path: storagePath,
      duration_seconds: result.durationSec,
      aspect_ratio: plan.aspect,
      status: "ready",
    });

    await setProgress(p.jobId, "ready", 1, { scene_plan: plan });
    logger.info({ jobId: p.jobId, seconds: result.durationSec }, "generate complete");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    // A plan that could not be written is the user's sentence, not our bug —
    // tell them what to do about it instead of showing a stack trace.
    const userFacing =
      e instanceof ScenePlanError
        ? e.userMessage
        : message === "insufficient_credits"
          ? "You're out of credits. Top up or start a plan to keep generating."
          : "Something went wrong making that video. Try again in a moment.";

    logger.error({ jobId: p.jobId, error: message }, "generate failed");
    await setFailed(p.jobId, userFacing);

    // Never refund a charge that was never taken — insufficient_credits throws
    // before the deduction, and granting here would mint credits from a
    // failure to pay.
    if (charged) await refundCredits(p.userId, p.jobId);
    throw e;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
