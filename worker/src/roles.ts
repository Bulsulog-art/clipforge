/**
 * What this worker process does, so the same image can run as the main
 * worker or as a render-only server (docs/CAPACITY.md, "Move rendering to a
 * separate server").
 *
 *   WORKER_QUEUES   comma-separated list of what to run; unset or "all" = everything.
 *                   Names: video-pipeline, generate, publish, derivative,
 *                   dentvid (DentVideo renders), dentvid-mail (DentVideo email,
 *                   watchdogs, digest), crons (synthetic monitor, trend snapshot, cost monitor,
 *                   metrics, stuck-job reaper, parked-job resume).
 *   DENTVID_RENDER_CONCURRENCY=0
 *                   this process takes no DentVideo renders (the main box,
 *                   once a render server does them); see capacity.ts.
 *
 * A render server runs WORKER_QUEUES=dentvid; the main box keeps everything
 * else. Both talk to the same Redis and Liman.
 */
export const WORKER_ROLES = ["video-pipeline", "generate", "publish", "derivative", "dentvid", "dentvid-mail", "crons"] as const;
export type WorkerRole = (typeof WORKER_ROLES)[number];

export function workerRoles(env: Record<string, string | undefined> = process.env): Set<WorkerRole> {
  const raw = (env.WORKER_QUEUES ?? "").trim();
  if (!raw || raw === "all") return new Set(WORKER_ROLES);
  const wanted = raw.split(",").map((s) => s.trim());
  return new Set(WORKER_ROLES.filter((r) => wanted.includes(r)));
}
