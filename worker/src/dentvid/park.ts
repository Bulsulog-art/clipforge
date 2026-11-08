import type IORedis from "ioredis";
import { logger } from "../logger.js";
import type { RefusalReason, SpendGuard } from "./spend-guard.js";

/**
 * Parked dentvid jobs: a week or a recording the spend guard refused. They
 * are kept in one Redis hash (field = BullMQ job id) and retried by
 * resumeParked every 30 minutes once the guard has room again — so a paying
 * clinic's Monday week is delayed, never silently dropped. After 7 days a
 * parked job is dropped (its week is over) and logged.
 */

export const PARKED_KEY = "dv:parked";
export const PARK_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export type ParkedJob = {
  jobId: string;
  name: "week" | "recording";
  data: { clinicId: string } & Record<string, unknown>;
  reason: RefusalReason;
  parkedAt: string;
};

export interface ParkStore {
  put(p: ParkedJob): Promise<void>;
  all(): Promise<ParkedJob[]>;
  remove(jobId: string): Promise<void>;
}

export class RedisParkStore implements ParkStore {
  constructor(private r: IORedis) {}
  async put(p: ParkedJob) {
    if (this.r.status !== "ready") throw new Error(`redis ${this.r.status}`);
    await this.r.hset(PARKED_KEY, p.jobId, JSON.stringify(p));
  }
  async all() {
    const raw = await this.r.hgetall(PARKED_KEY);
    const out: ParkedJob[] = [];
    for (const v of Object.values(raw)) {
      try {
        out.push(JSON.parse(v) as ParkedJob);
      } catch {
        // ignore a corrupt entry
      }
    }
    return out;
  }
  async remove(jobId: string) {
    await this.r.hdel(PARKED_KEY, jobId);
  }
}

export class MemoryParkStore implements ParkStore {
  m = new Map<string, ParkedJob>();
  async put(p: ParkedJob) {
    this.m.set(p.jobId, p);
  }
  async all() {
    return [...this.m.values()];
  }
  async remove(jobId: string) {
    this.m.delete(jobId);
  }
}

/** The slice of a BullMQ Queue resumeParked needs. */
export type ResumeQueue = {
  getJob(id: string): Promise<{ getState(): Promise<string>; retry(state?: "failed" | "completed"): Promise<void> } | undefined | null>;
  add(name: string, data: unknown, opts: Record<string, unknown>): Promise<unknown>;
};

export async function resumeParked(
  store: ParkStore,
  queue: ResumeQueue,
  guard: SpendGuard,
  now = new Date(),
): Promise<{ resumed: number; dropped: number; waiting: number }> {
  let resumed = 0;
  let dropped = 0;
  let waiting = 0;
  for (const p of await store.all()) {
    if (now.getTime() - Date.parse(p.parkedAt) > PARK_MAX_AGE_MS) {
      logger.error({ jobId: p.jobId, reason: p.reason }, "dentvid: parked job dropped after 7 days");
      await store.remove(p.jobId);
      dropped++;
      continue;
    }
    // Only a check: the job reserves for real when it runs.
    const d = await guard.reserve(p.name, p.data.clinicId, { dryRun: true, now });
    if (!d.ok) {
      waiting++;
      continue;
    }
    const job = await queue.getJob(p.jobId);
    if (job) {
      const state = await job.getState();
      if (state === "failed") await job.retry("failed");
      else if (state === "completed") await job.retry("completed");
      // waiting / active / delayed: already on its way
    } else {
      await queue.add(p.name, p.data, { jobId: p.jobId, attempts: 2, backoff: { type: "exponential", delay: 60_000 } });
    }
    await store.remove(p.jobId);
    resumed++;
  }
  if (resumed || dropped) logger.info({ resumed, dropped, waiting }, "dentvid: parked jobs");
  return { resumed, dropped, waiting };
}
