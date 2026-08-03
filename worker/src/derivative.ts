import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { supabase } from "./supabase.js";
import { logger } from "./logger.js";
import { runTranslation } from "./steps/translate.js";

// Face swap was removed: it was the only paid third-party dependency (FAL) in
// the pipeline, nobody had ever used it, and it was the cause of two App Review
// rejections (2.1 face data, 5.1.1 privacy policy). Derivatives are now
// translation-only, and the product runs at effectively zero marginal COGS.
export type DerivativePayload = {
  derivativeId: string;
  userId: string;
  kind: "translation";
};

const CREDIT_COST: Record<string, number> = {
  translation: 2,
};

export async function runDerivative(p: DerivativePayload) {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), `cfd-${p.derivativeId}-`));
  logger.info({ p, work }, "derivative start");

  await supabase.from("clip_derivatives").update({ status: "processing", progress: 5 }).eq("id", p.derivativeId);

  // Determine the true cost: a voice-clone translation costs 5 credits, not the
  // base 2. The web pre-flight already checks 5; the worker previously hardcoded
  // 2 here, undercharging the premium path and writing a wrong ledger.
  const { data: costRow } = await supabase
    .from("clip_derivatives")
    .select("voice_clone")
    .eq("id", p.derivativeId)
    .single();
  const cost =
    p.kind === "translation" && costRow?.voice_clone ? 5 : CREDIT_COST[p.kind] ?? 2;

  // Reserve credits
  try {
    await supabase
      .rpc("consume_credits", {
        p_user_id: p.userId,
        p_amount: cost,
        p_reason: `${p.kind} render`,
        p_reference: p.derivativeId,
      })
      .throwOnError();
  } catch (e: any) {
    if (e?.code === "P0001") {
      await supabase
        .from("clip_derivatives")
        .update({ status: "failed", error_message: "Not enough credits" })
        .eq("id", p.derivativeId);
      throw new Error("insufficient_credits");
    }
    throw e;
  }

  try {
    // pull derivative + source clip
    const { data: derivative, error: dErr } = await supabase
      .from("clip_derivatives")
      .select("*")
      .eq("id", p.derivativeId)
      .single();
    if (dErr || !derivative) throw new Error("derivative not found");

    const { data: clip, error: cErr } = await supabase
      .from("clips")
      .select("storage_path, job_id, start_seconds, end_seconds")
      .eq("id", derivative.source_clip_id)
      .single();
    if (cErr || !clip?.storage_path) throw new Error("source clip not found");

    // pull parent job for transcript
    const { data: job } = await supabase
      .from("video_jobs")
      .select("transcript, niche")
      .eq("id", clip.job_id)
      .single();
    const transcript = job?.transcript as { words: { word: string; start: number; end: number }[] } | null;
    if (!transcript?.words) throw new Error("source transcript missing");

    const result = await runTranslation({
      userId: p.userId,
      derivativeId: p.derivativeId,
      sourceClipPath: clip.storage_path,
      sourceTranscriptWords: transcript.words,
      clipStartSec: Number(clip.start_seconds),
      clipEndSec: Number(clip.end_seconds),
      niche: job?.niche ?? "default",
      targetLanguage: derivative.target_language ?? "en",
      voiceClone: derivative.voice_clone ?? false,
      workDir: work,
    });
    const outPath = result.storagePath;

    await supabase
      .from("clip_derivatives")
      .update({
        status: "ready",
        progress: 100,
        storage_path: outPath,
        credits_charged: cost,
        finished_at: new Date().toISOString(),
      })
      .eq("id", p.derivativeId);

    // (Face-swap cleanup used to live here. The feature is gone, so no face
    // image is ever uploaded or stored in the first place.)

    logger.info({ derivativeId: p.derivativeId, kind: p.kind }, "derivative ready");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ derivativeId: p.derivativeId, err: msg }, "derivative failed");
    await supabase
      .from("clip_derivatives")
      .update({ status: "failed", error_message: msg.slice(0, 500) })
      .eq("id", p.derivativeId);

    // refund credits on failure
    await supabase
      .rpc("grant_credits", {
        p_user_id: p.userId,
        p_amount: cost,
        p_kind: "admin_grant",
        p_reason: `${p.kind} failure refund`,
        p_reference: p.derivativeId,
      })
      .then(() => {}, () => {});
    throw e;
  } finally {
    await fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
