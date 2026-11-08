import { Worker, MetricsTime, Queue } from "bullmq";
import IORedis from "ioredis";
import * as Sentry from "@sentry/node";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";
import { runVideoPipeline } from "./pipeline.js";
import { runGenerate } from "./generate.js";
import { configureSpend, countActiveClinics, dentvidDb, runDentvidRecording, runDentvidRestyle, runDentvidWeek, SpendRefusedError } from "./dentvid/jobs.js";
import { RedisGuardStore, SpendGuard } from "./dentvid/spend-guard.js";
import { RedisParkStore, resumeParked } from "./dentvid/park.js";
import { dispatchWeeks } from "./dentvid/schedule.js";
import { LIFECYCLE_SCHEDULE, runLifecycle } from "./dentvid/lifecycle.js";
import { generateConcurrency } from "./remotion/capacity.js";
import { runPublish } from "./publish.js";
import { runDerivative } from "./derivative.js";
import { buildAllSnapshots } from "./jobs/trend-snapshot.js";
import { runMetricsSnapshot } from "./jobs/metrics-snapshot.js";
import { runCostMonitor } from "./jobs/cost-monitor.js";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    release: process.env.GIT_COMMIT_SHA,
  });
  logger.info("Sentry initialised");
}

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

connection.on("error", (e) => logger.error({ err: e.message }, "redis connection error"));
connection.on("ready", () => logger.info("redis ready"));

// DentVideo spend guard (dentvid/spend-guard.ts): every paid API call in a
// dentvid job is budgeted in Redis first; refused weeks/recordings are parked.
// Global ceilings grow with the number of paying clinics (counted on Liman, cached 10 min).
const spendGuard = new SpendGuard(new RedisGuardStore(connection), undefined, {
  activeClinics: process.env.DENTVID_SUPABASE_URL ? countActiveClinics : undefined,
});
const parkStore = new RedisParkStore(connection);
configureSpend({ guard: spendGuard, park: parkStore });

const videoWorker = new Worker(
  "video-pipeline",
  async (job) => {
    try {
      await runVideoPipeline(job.data);
    } catch (e) {
      Sentry.captureException(e, { tags: { queue: "video-pipeline", jobId: job.id } });
      throw e;
    }
  },
  {
    connection,
    concurrency: Number(process.env.VIDEO_CONCURRENCY ?? 2),
    metrics: { maxDataPoints: MetricsTime.ONE_HOUR },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
);

// Prompt-to-video. Its own queue rather than a job type on video-pipeline:
// the two have different shapes, different failure modes and — the reason
// that matters — different concurrency. A Remotion render is CPU-bound on
// headless Chromium, so letting it share a pool with transcription would let
// either one starve the other.
const generateWorker = new Worker(
  "generate",
  async (job) => {
    try {
      await runGenerate(job.data);
    } catch (e) {
      Sentry.captureException(e, { tags: { queue: "generate", jobId: job.id } });
      throw e;
    }
  },
  {
    connection,
    concurrency: generateConcurrency(),
    metrics: { maxDataPoints: MetricsTime.ONE_HOUR },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
);

// DentVideo: weekly content runs and the dentist's own recordings. One job
// at a time — each one renders several videos.
const dentvidWorker = new Worker(
  "dentvid",
  async (job) => {
    try {
      if (job.name === "week") return await runDentvidWeek(job.data, { jobId: job.id });
      if (job.name === "recording") return await runDentvidRecording(job.data, { jobId: job.id });
      if (job.name === "restyle") return await runDentvidRestyle(job.data);
      if (job.name === "dispatch") return await dispatchWeeks(dentvidDb(), dentvidQueue);
      throw new Error(`unknown dentvid job ${job.name}`);
    } catch (e) {
      // A spend-guard refusal is expected behaviour (parked + owner alerted), not a crash.
      if (!(e instanceof SpendRefusedError)) Sentry.captureException(e, { tags: { queue: "dentvid", jobId: job.id } });
      throw e;
    }
  },
  {
    connection,
    concurrency: Number(process.env.DENTVID_CONCURRENCY ?? 1),
    removeOnComplete: { count: 500, age: 7 * 24 * 3600 },
    removeOnFail: { count: 1000, age: 14 * 24 * 3600 },
  },
);
// Monday delivery: each Monday 05:00 UTC (morning across Europe and Türkiye),
// start the week for every clinic that should get one (dentvid/schedule.ts).
const dentvidQueue = new Queue("dentvid", { connection });
if (process.env.DENTVID_SUPABASE_URL) {
  dentvidQueue
    .upsertJobScheduler("dentvid-monday", { pattern: "0 5 * * 1", tz: "UTC" }, { name: "dispatch", data: {} })
    .catch((e) => logger.error({ err: (e as Error).message }, "dentvid: scheduler setup failed"));
}
dentvidWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err: err.message }, "dentvid job failed"));

// DentVideo lifecycle email (welcome is sent by the payment webhook; this is
// the unpaid-clinic reminders): hourly, on its own small queue so it never
// waits behind a Monday of renders. The web app decides and sends
// (api/internal/dentvideo/lifecycle) — idempotent and capped per hour there.
const dentvidMailQueue = new Queue("dentvid-mail", { connection });
const dentvidMailWorker = new Worker(
  "dentvid-mail",
  async (job) => {
    if (job.name === "lifecycle") return await runLifecycle();
    throw new Error(`unknown dentvid-mail job ${job.name}`);
  },
  { connection, concurrency: 1, removeOnComplete: { count: 200 }, removeOnFail: { count: 200 } },
);
if (process.env.DENTVID_SUPABASE_URL) {
  dentvidMailQueue
    .upsertJobScheduler("dentvid-lifecycle", LIFECYCLE_SCHEDULE, { name: "lifecycle", data: {} })
    .catch((e) => logger.error({ err: (e as Error).message }, "dentvid: lifecycle scheduler setup failed"));
}

// Parked dentvid jobs go back on the queue once the spend guard has room
// again (cap raised, clinic count readable again, pause lifted, Redis back,
// next day / month) — checked every DENTVID_PARK_RESUME_MIN minutes (15), so
// a Monday week parked in the morning still runs that day once allowed.
const PARK_RESUME_MS = Math.max(1, Number(process.env.DENTVID_PARK_RESUME_MIN ?? 15) || 15) * 60 * 1000;
async function startParkedResumeCron() {
  while (true) {
    await new Promise((r) => setTimeout(r, PARK_RESUME_MS));
    try {
      await resumeParked(parkStore, dentvidQueue, spendGuard);
    } catch (e) {
      logger.error({ err: (e as Error).message }, "dentvid: resume parked failed");
    }
  }
}
if (process.env.DENTVID_SUPABASE_URL) void startParkedResumeCron();

const publishWorker = new Worker(
  "publish",
  async (job) => {
    try {
      await runPublish(job.data);
    } catch (e) {
      Sentry.captureException(e, { tags: { queue: "publish", jobId: job.id } });
      throw e;
    }
  },
  {
    connection,
    concurrency: Number(process.env.PUBLISH_CONCURRENCY ?? 4),
    metrics: { maxDataPoints: MetricsTime.ONE_HOUR },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
);

const derivativeWorker = new Worker(
  "derivative",
  async (job) => {
    try {
      await runDerivative(job.data);
    } catch (e) {
      Sentry.captureException(e, { tags: { queue: "derivative", jobId: job.id } });
      throw e;
    }
  },
  {
    connection,
    concurrency: Number(process.env.DERIVATIVE_CONCURRENCY ?? 3),
    metrics: { maxDataPoints: MetricsTime.ONE_HOUR },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
);

// The avatar queue was removed along with FAL. Avatar videos required FAL's
// paid lipsync model, so the feature could not run at zero COGS; it also had
// zero usage (avatar_jobs was empty in production). Keeping a paid, advertised
// feature that cannot work is exactly what got the app rejected before.

videoWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "video job failed"),
);
generateWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "generate job failed"),
);
publishWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "publish job failed"),
);
derivativeWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "derivative job failed"),
);
async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  await Promise.allSettled([
    videoWorker.close(),
    generateWorker.close(),
    publishWorker.close(),
    derivativeWorker.close(),
    dentvidWorker.close(),
    dentvidQueue.close(),
    dentvidMailWorker.close(),
    dentvidMailQueue.close(),
  ]);
  await Sentry.flush(2000);
  await connection.quit();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
  Sentry.captureException(reason);
});

logger.info({
  videoConcurrency: process.env.VIDEO_CONCURRENCY ?? 2,
  publishConcurrency: process.env.PUBLISH_CONCURRENCY ?? 4,
}, "clipforge worker started");

// Daily trend snapshot — runs every 24h, fires immediately on startup
async function startTrendCron() {
  while (true) {
    try {
      await buildAllSnapshots();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "trend snapshots failed");
    }
    await new Promise((r) => setTimeout(r, 24 * 60 * 60 * 1000));
  }
}
if (process.env.ENABLE_TREND_CRON !== "false") {
  void startTrendCron();
}

// Daily cost monitor — runs every 24h, fires immediately on startup so
// the team sees today's spend before the first night sleep cycle.
async function startCostMonitorCron() {
  while (true) {
    try {
      await runCostMonitor();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "cost monitor failed");
    }
    await new Promise((r) => setTimeout(r, 24 * 60 * 60 * 1000));
  }
}
if (process.env.ENABLE_COST_MONITOR !== "false") {
  void startCostMonitorCron();
}

// Performance metrics — poll live engagement for recently-published clips
// every 6h and append to analytics_snapshots. The keystone of the learning
// loop. Off by default until social metric scopes are wired; set
// ENABLE_METRICS_CRON=true (and METRICS_USE_MOCK=true for a credential-free
// first run) to turn it on.
async function startMetricsCron() {
  while (true) {
    try {
      await runMetricsSnapshot();
    } catch (e) {
      logger.error({ err: (e as Error).message }, "metrics snapshot failed");
    }
    await new Promise((r) => setTimeout(r, 6 * 60 * 60 * 1000));
  }
}
if (process.env.ENABLE_METRICS_CRON === "true") {
  void startMetricsCron();
}

// Stuck-job reaper — every 10 min, flip any non-terminal video/avatar/derivative
// row older than 60 min to 'failed' and idempotently refund the credits it
// reserved. Kills the "stuck processing / infinite spinner" failure mode when
// the worker is SIGKILLed mid-render (OOM) or an enqueue is lost. The 60-min
// threshold never touches a legitimately long render or a briefly-queued job.
async function startStuckJobReaperCron() {
  while (true) {
    await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
    try {
      const { data, error } = await supabase.rpc("reap_stuck_jobs");
      if (error) throw error;
      if (typeof data === "number" && data > 0) {
        logger.warn({ reaped: data }, "stuck-job reaper: marked timed-out jobs failed + refunded");
      }
    } catch (e) {
      logger.error({ err: (e as Error).message }, "stuck-job reaper failed");
    }
  }
}
if (process.env.ENABLE_REAPER !== "false") {
  void startStuckJobReaperCron();
}
