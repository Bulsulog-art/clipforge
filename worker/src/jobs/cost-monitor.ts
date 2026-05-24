import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { sendPush } from "../push.js";

/**
 * Rough per-operation cost estimates. Keep these in sync with the
 * actual model/service pricing — if a vendor changes their rate or
 * we swap models, update here so the alert math stays honest.
 *
 * Numbers are in USD per operation.
 */
const COST: Record<string, number> = {
  // Worker pipeline (clipforge.video_jobs)
  job_render:        0.02,    // ffmpeg + storage per job (~12 clips)
  job_score:         0.001,   // gpt-4o-mini scoring
  // Local faster-whisper service runs on our own server — $0 marginal
  job_transcribe:    0.00,

  // Derivatives (clipforge.clip_derivatives)
  derivative_face_swap:   0.15,   // fal-ai/face-swap
  derivative_translation: 0.005,  // gpt-4o-mini + tts-1-hd

  // Avatars (clipforge.video_jobs where source_kind='avatar' — actually
  // tracked via avatar_jobs OR clips.source_kind; we count clips.source_kind)
  avatar_render:     0.16,    // tts-1-hd + sadtalker

  // Thumbnails (Plus only) — counted when aiThumbnails=true
  thumbnail_enhance: 0.003,
};

/**
 * Aggregates spend over the last 24h and fires an admin push if
 * we're over the configured threshold. Wired as a daily BullMQ job
 * + on-startup safety net so the team always has visibility.
 *
 * Env:
 *   COST_ALERT_USER_ID   — Supabase user UUID to push to (admin/founder)
 *   COST_ALERT_THRESHOLD — USD threshold (default 5)
 *   COST_ALERT_WEBHOOK   — optional HTTPS endpoint to also POST to
 *                          (Slack incoming webhook works directly)
 */
export async function runCostMonitor(): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [jobs, derivatives, avatarClips] = await Promise.all([
    countSince("video_jobs", "created_at", since, "status", ["ready", "rendering", "failed"]),
    countByKindSince("clip_derivatives", since),
    avatarClipCountSince(since),
  ]);

  const dollars =
    jobs * (COST.job_render + COST.job_score + COST.job_transcribe) +
    (derivatives.face_swap   ?? 0) * COST.derivative_face_swap +
    (derivatives.translation ?? 0) * COST.derivative_translation +
    avatarClips * COST.avatar_render;

  const threshold = Number(process.env.COST_ALERT_THRESHOLD ?? 5);
  const adminUser = process.env.COST_ALERT_USER_ID;
  const webhook = process.env.COST_ALERT_WEBHOOK;

  logger.info(
    { dollars: dollars.toFixed(2), jobs, derivatives, avatarClips, threshold },
    "cost monitor snapshot",
  );

  // Always POST to the webhook if configured — gives a daily heartbeat
  // even on quiet days so the team knows the monitor itself is healthy.
  if (webhook) {
    void postWebhook(webhook, { dollars, jobs, derivatives, avatarClips, threshold });
  }

  // Push only when we cross the threshold, not on every tick — otherwise
  // the alert becomes wallpaper noise.
  if (dollars >= threshold && adminUser) {
    try {
      await sendPush(adminUser, {
        title: `💸 ClipForge spend alert`,
        body: `$${dollars.toFixed(2)} in the last 24h (threshold $${threshold}). ${jobs} jobs, ${avatarClips} avatars.`,
        data: { kind: "cost_alert" },
      });
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "cost alert push failed");
    }
  }
}

// MARK: - DB helpers

async function countSince(
  table: string,
  dateCol: string,
  since: string,
  statusCol?: string,
  statusIn?: string[],
): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true }).gte(dateCol, since);
  if (statusCol && statusIn) q = q.in(statusCol, statusIn);
  const { count } = await q;
  return count ?? 0;
}

async function countByKindSince(table: string, since: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from(table)
    .select("kind")
    .gte("created_at", since);
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const k = row.kind as string;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

async function avatarClipCountSince(since: string): Promise<number> {
  const { count } = await supabase
    .from("clips")
    .select("id", { count: "exact", head: true })
    .eq("source_kind", "avatar")
    .gte("created_at", since);
  return count ?? 0;
}

async function postWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:
          `ClipForge 24h spend: $${(payload.dollars as number).toFixed(2)} ` +
          `(threshold $${payload.threshold})`,
        ...payload,
      }),
    });
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "cost monitor webhook failed");
  }
}
