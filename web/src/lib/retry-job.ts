import type { VideoJob } from "@/lib/supabase/types";

/**
 * Decides how a failed job should be re-run.
 *
 * Two pipelines write to video_jobs and they have different queues, different
 * payloads and different retry economics. Retrying a generate job on the
 * clipping queue sent it to a worker looking for a source video to cut up; it
 * found a null storage_path, failed again, and the prompt was never passed
 * along at all. The person pressed "try again" and got the same failure twice.
 *
 * Lives here rather than in the route because a Next.js `route.ts` may only
 * export request handlers — and because a branch this consequential should be
 * testable without standing up Supabase and Redis.
 */

export type RetryPlan =
  | { queue: "generate"; payload: GenerateRetryPayload; options: RetryOptions }
  | { queue: "video"; payload: ClipRetryPayload; options: RetryOptions }
  | { queue: null; error: string };

type RetryOptions = { attempts: number; backoffDelay: number };

type GenerateRetryPayload = {
  jobId: string;
  userId: string;
  prompt: string;
  assetPaths: string[];
  aspect?: string;
  theme?: string;
};

type ClipRetryPayload = {
  jobId: string;
  userId: string;
  sourceType: string;
  sourceUrl?: string;
  storagePath?: string;
  niche: string;
  language: string;
};

/** Enough of a job row to decide. Kept narrow so the tests stay readable. */
export type RetryableJob = Pick<
  VideoJob,
  | "id"
  | "user_id"
  | "source_type"
  | "source_url"
  | "storage_path"
  | "niche"
  | "language"
  | "clip_prompt"
  | "aspect_ratio"
  | "source_asset_paths"
  | "scene_plan"
>;

export function planRetry(job: RetryableJob): RetryPlan {
  if (job.source_type === "generate") {
    if (!job.clip_prompt?.trim()) {
      return { queue: null, error: "This video has no prompt to rebuild from. Start a new one." };
    }
    return {
      queue: "generate",
      payload: {
        jobId: job.id,
        userId: job.user_id,
        prompt: job.clip_prompt,
        // The clips the person attached. Without these a retry silently
        // returns a different video with their footage missing.
        assetPaths: job.source_asset_paths ?? [],
        aspect: job.aspect_ratio ?? undefined,
        // The look was their choice. It survives on the plan when the job got
        // far enough to write one; otherwise the model picks again, which is
        // what happened the first time too.
        theme: themeFromPlan(job.scene_plan),
      },
      // Two attempts, not three: a render that failed once usually failed for
      // a reason retrying will not fix, and every attempt costs real CPU.
      options: { attempts: 2, backoffDelay: 8000 },
    };
  }

  return {
    queue: "video",
    payload: {
      jobId: job.id,
      userId: job.user_id,
      sourceType: job.source_type,
      sourceUrl: job.source_url ?? undefined,
      storagePath: job.storage_path ?? undefined,
      niche: job.niche ?? "motivation",
      language: job.language ?? "en",
    },
    options: { attempts: 3, backoffDelay: 5000 },
  };
}

function themeFromPlan(plan: unknown): string | undefined {
  if (typeof plan !== "object" || plan === null) return undefined;
  const theme = (plan as { theme?: unknown }).theme;
  return typeof theme === "string" ? theme : undefined;
}
