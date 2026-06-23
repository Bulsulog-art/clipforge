import { logger } from "./logger.js";

/**
 * Thin FAL.ai REST client. We use the queue API (submit + poll) for any model
 * that takes more than ~30 seconds; the synchronous /fal.run endpoint for fast
 * models. No SDK dependency — keeps the worker bundle small.
 *
 * Auth header is `Authorization: Key <FAL_KEY>` (NOT Bearer).
 */

const FAL_QUEUE = "https://queue.fal.run";
const FAL_SYNC = "https://fal.run";

function key(): string {
  const k = process.env.FAL_KEY;
  if (!k) throw new Error("FAL_KEY env var is not set");
  return k;
}

/**
 * Submit a job to a FAL endpoint and poll until it finishes. Returns the raw
 * result body of the model.
 *
 * @param model      The FAL model id (e.g. "fal-ai/face-to-many", "fal-ai/flux/schnell").
 * @param input      Model-specific input payload.
 * @param opts.timeoutMs   How long to wait before giving up (default 6 min).
 * @param opts.onProgress  Optional progress callback fired with logs streamed
 *                          back by FAL. Receives a 0..1 fraction (best-effort).
 */
export async function runFalQueue<T = unknown>(
  model: string,
  input: Record<string, unknown>,
  opts: {
    timeoutMs?: number;
    onProgress?: (fraction: number) => Promise<void> | void;
  } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 6 * 60_000;

  // 1. Submit
  const submit = await fetch(`${FAL_QUEUE}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30_000),
  });
  if (!submit.ok) {
    const txt = await submit.text().catch(() => "");
    throw new Error(`fal submit ${model} ${submit.status}: ${txt.slice(0, 240)}`);
  }
  const submitJson = (await submit.json()) as {
    request_id: string;
    status_url?: string;
    response_url?: string;
  };
  const reqId = submitJson.request_id;
  if (!reqId) throw new Error(`fal submit ${model}: no request_id`);

  const statusUrl =
    submitJson.status_url ?? `${FAL_QUEUE}/${model}/requests/${reqId}/status`;
  const responseUrl =
    submitJson.response_url ?? `${FAL_QUEUE}/${model}/requests/${reqId}`;

  // 2. Poll
  const start = Date.now();
  let completed = false;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2500));
    let st: Response;
    try {
      st = await fetch(`${statusUrl}?logs=1`, {
        headers: { Authorization: `Key ${key()}` },
        // Per-poll timeout so a single hung socket can't consume the whole
        // timeoutMs budget (and the worker slot) indefinitely — retry next tick.
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      // timed-out / transient network blip — retry on the next tick.
      continue;
    }
    if (!st.ok) {
      // transient — retry
      continue;
    }
    const sj = (await st.json()) as {
      status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | string;
      queue_position?: number;
      logs?: Array<{ message: string; level?: string }>;
      error?: unknown;
    };
    if (sj.status === "COMPLETED") {
      completed = true;
      break;
    }
    if (sj.status === "IN_QUEUE" || sj.status === "IN_PROGRESS") {
      // Heuristic: scale progress from elapsed time, no real % from FAL
      const elapsed = (Date.now() - start) / timeoutMs;
      await opts.onProgress?.(Math.min(0.92, 0.1 + elapsed * 0.85));
      continue;
    }
    // Any other terminal status (FAILED / ERROR / CANCELLED / …) is a hard
    // failure. Previously we ignored it and kept polling until timeout, then
    // fetched the response anyway and returned a garbage/error body as if it
    // were a real result. Surface it loudly so BullMQ retries / the job fails
    // with a real error message instead of silently producing broken output.
    const tail = (sj.logs ?? []).slice(-3).map((l) => l.message).join(" | ");
    throw new Error(
      `fal ${model} terminal status ${sj.status}${tail ? `: ${tail}` : ""}`,
    );
  }

  if (!completed) {
    throw new Error(`fal ${model} timed out after ${Math.round(timeoutMs / 1000)}s`);
  }

  // 3. Final fetch
  const final = await fetch(responseUrl, {
    headers: { Authorization: `Key ${key()}` },
  });
  if (!final.ok) {
    const txt = await final.text().catch(() => "");
    throw new Error(`fal result ${model} ${final.status}: ${txt.slice(0, 240)}`);
  }
  const body = (await final.json()) as T;
  logger.info({ model, reqId }, "fal job complete");
  return body;
}

/**
 * Synchronous FAL call. Use only for fast models (under ~30s of work):
 * Flux schnell thumbnails, prompt rewrites, etc.
 */
export async function runFalSync<T = unknown>(
  model: string,
  input: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${FAL_SYNC}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`fal sync ${model} ${res.status}: ${txt.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}
