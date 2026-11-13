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
import { DISPATCH_SCHEDULE, dispatchWeeks } from "./dentvid/schedule.js";
import { isBatchPriority } from "./dentvid/job-options.js";
import { batchNice, withNicedChildren } from "./dentvid/nice.js";
import { configureReadyMail, notifyReady, type ReadyMailJob } from "./dentvid/notify.js";
import { LIFECYCLE_SCHEDULE, runLifecycle } from "./dentvid/lifecycle.js";
import { clinicRef, configureOps, opsStore, ownerAlert, RedisOpsStore } from "./dentvid/ops.js";
import { alerts, cleanError, resendSender } from "./dentvid/ops-alert.js";
import { checkFirstWeeks, checkMondayDispatch, FIRST_WEEK_SCHEDULE, supabaseWatchDb, WATCHDOG_SCHEDULE } from "./dentvid/watchdog.js";
import { DIGEST_SCHEDULE, runDigest } from "./dentvid/digest.js";
import { dentvidConcurrency, generateConcurrency } from "./remotion/capacity.js";
import { workerRoles } from "./roles.js";
import { dodoLookup, RECONCILE_SCHEDULE, reconcileBilling, supabaseReconcileDb } from "./dentvid/reconcile.js";
import { jobWeek } from "./dentvid/jobs.js";
import { runPublish } from "./publish.js";
import { runDerivative } from "./derivative.js";
import { buildAllSnapshots } from "./jobs/trend-snapshot.js";
import { runMetricsSnapshot } from "./jobs/metrics-snapshot.js";
import { runCostMonitor } from "./jobs/cost-monitor.js";
import { startHeartbeat } from "./dentvid/heartbeat.js";
import { MONITOR_SCHEDULE, monitorConfig, runMonitor } from "./dentvid/synthetic.js";
import { assertRunOk, CRON_JOB_OPTS, failureAlert, type FailedJob } from "./dentvid/job-failures.js";

/** Tell the owner about a failed job that matters (dentvid/job-failures.ts). Never throws. */
function alertOnFailure(queue: "dentvid" | "dentvid-mail", job: FailedJob | undefined, err: Error) {
  const f = failureAlert(queue, job, err, { spendRefusal: err instanceof SpendRefusedError });
  if (!f) return;
  void (async () => {
    if (f.kind === "cron") await ownerAlert(f.alert);
    else await ownerAlert(f.build(await clinicRef(dentvidDb(), f.clinicId)));
  })().catch(() => {});
}

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

// What this process runs (roles.ts): everything by default; a render-only
// server runs WORKER_QUEUES=dentvid (docs/CAPACITY.md).
const ROLES = workerRoles();
logger.info({ roles: [...ROLES] }, "worker roles");

connection.on("error", (e) => logger.error({ err: e.message }, "redis connection error"));
connection.on("ready", () => logger.info("redis ready"));

// DentVideo spend guard (dentvid/spend-guard.ts): every paid API call in a
// dentvid job is budgeted in Redis first; refused weeks/recordings are parked.
// Global ceilings grow with the number of paying clinics (counted on Liman, cached 10 min).
const spendGuard = new SpendGuard(new RedisGuardStore(connection), undefined, {
  activeClinics: process.env.DENTVID_SUPABASE_URL ? countActiveClinics : undefined,
});
const parkStore = new RedisParkStore(connection);
// Owner alerts (dentvid/ops-alert.ts, shared with the web app): Redis for
// de-duplication and counters, Resend to OWNER_ALERT_EMAIL.
configureOps({ store: new RedisOpsStore(connection), send: resendSender(process.env) });
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
    autorun: ROLES.has("video-pipeline"),
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
    autorun: ROLES.has("generate"),
    concurrency: generateConcurrency(),
    metrics: { maxDataPoints: MetricsTime.ONE_HOUR },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
);

// DentVideo: weekly content runs and the dentist's own recordings.
// DENTVID_RENDER_CONCURRENCY jobs at a time (default 1 — each one renders
// several videos, and this box is shared with the website; docs/CAPACITY.md).
// Jobs carry priorities (dentvid/job-options.ts): what someone is waiting for
// first, the weekend batch last — and the batch renders niced (dentvid/nice.ts).
const DENTVID_CONCURRENCY = dentvidConcurrency();
const BATCH_NICE = batchNice();
const dentvidWorker = new Worker(
  "dentvid",
  async (job) => {
    try {
      if (job.name === "week") {
        const run = () => runDentvidWeek(job.data, { jobId: job.id, attemptsMade: job.attemptsMade, attempts: job.opts.attempts });
        return isBatchPriority(job.opts.priority) ? await withNicedChildren(BATCH_NICE, run) : await run();
      }
      if (job.name === "recording") return await runDentvidRecording(job.data, { jobId: job.id });
      if (job.name === "restyle") return await runDentvidRestyle(job.data);
      if (job.name === "dispatch") return await dispatchWeeks(dentvidDb(), dentvidQueue, new Date(), opsStore(), DENTVID_CONCURRENCY);
      throw new Error(`unknown dentvid job ${job.name}`);
    } catch (e) {
      // A spend-guard refusal is expected behaviour (parked + owner alerted), not a crash.
      if (!(e instanceof SpendRefusedError)) Sentry.captureException(e, { tags: { queue: "dentvid", jobId: job.id } });
      throw e;
    }
  },
  {
    connection,
    // DENTVID_RENDER_CONCURRENCY=0: this box takes no renders (a render server does).
    autorun: ROLES.has("dentvid") && DENTVID_CONCURRENCY > 0,
    concurrency: Math.max(1, DENTVID_CONCURRENCY),
    // Enough to keep a whole week's jobs: the job ids are what stop a week
    // from being queued twice (dispatch, payment, button, watchdogs).
    removeOnComplete: { count: 5000, age: 7 * 24 * 3600 },
    removeOnFail: { count: 1000, age: 14 * 24 * 3600 },
  },
);
// Weekly delivery: each Saturday 18:00 UTC, queue the coming week for every
// clinic that should get one, earliest Monday morning first, so every clinic
// has its videos by Monday 07:00 in its own time zone (dentvid/schedule.ts).
// The scheduler keeps its old id, so this replaces the Monday 05:00 schedule.
const dentvidQueue = new Queue("dentvid", { connection });
// The worker's pulse for the owner's admin panel (dentvid/heartbeat.ts): every
// minute, version, uptime, roles and render concurrency, plus the day's API
// spend copied into a long-lived per-day record.
const stopHeartbeat = startHeartbeat(connection, { roles: ROLES, renderConcurrency: DENTVID_CONCURRENCY });
if (process.env.DENTVID_SUPABASE_URL && ROLES.has("dentvid-mail")) {
  dentvidQueue
    .upsertJobScheduler("dentvid-monday", DISPATCH_SCHEDULE, { name: "dispatch", data: {}, opts: CRON_JOB_OPTS })
    .catch((e) => logger.error({ err: (e as Error).message }, "dentvid: scheduler setup failed"));
}
dentvidWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "dentvid job failed");
  // The Saturday dispatch and a dentist's recording: the owner hears about a final failure.
  alertOnFailure("dentvid", job, err);
  // runDentvidWeek alerts on its own final failure; a job that died with the
  // process (OOM, restart — "stalled") never reached that code, so tell the owner here.
  if (job?.name === "week" && /stalled/i.test(err.message) && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const clinicId = (job.data as { clinicId?: string }).clinicId ?? "unknown";
    void (async () =>
      ownerAlert(
        alerts.weekFailed({ clinic: await clinicRef(dentvidDb(), clinicId), week: jobWeek(job.data as { week?: string }), attempts: job.attemptsMade, error: cleanError(err), permanent: false }),
      ))().catch(() => {});
  }
  // A restyle that died outside its own error handling (stalled, killed): the card must not say "updating…" forever.
  if (job?.name === "restyle" && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const itemId = (job.data as { itemId?: string }).itemId;
    if (itemId) {
      void dentvidDb()
        .from("dentvid_items")
        .update({ restyle_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("restyle_status", "queued")
        .then(
          () => {},
          () => {},
        );
    }
  }
});

// DentVideo lifecycle email (welcome is sent by the payment webhook; this is
// the unpaid-clinic reminders): hourly, on its own small queue so it never
// waits behind a Monday of renders. The web app decides and sends
// (api/internal/dentvideo/lifecycle) — idempotent and capped per hour there.
const dentvidMailQueue = new Queue("dentvid-mail", { connection });
// "Your videos are ready" emails held for the clinic's morning (dentvid/notify.ts).
configureReadyMail(dentvidMailQueue);
const dentvidMailWorker = new Worker(
  "dentvid-mail",
  async (job) => {
    // {ok:false} (web app down, token mismatch) is a failure: retried, then the owner is told.
    if (job.name === "lifecycle") return assertRunOk("lifecycle", await runLifecycle());
    if (job.name === "notify") {
      const d = job.data as ReadyMailJob;
      return await notifyReady(d.clinicId, d.kind, { ready: d.ready, flagged: d.flagged });
    }
    if (job.name === "digest") return assertRunOk("digest", await runDigest());
    if (job.name === "billing-reconcile") return await reconcileBilling({ db: supabaseReconcileDb(dentvidDb()), dodo: dodoLookup(), alert: ownerAlert });
    if (job.name === "watchdog-monday" || job.name === "watchdog-first-week") {
      const deps = { db: supabaseWatchDb(dentvidDb()), queue: dentvidQueue, store: opsStore(), alert: ownerAlert };
      return job.name === "watchdog-monday" ? await checkMondayDispatch(deps) : await checkFirstWeeks(deps);
    }
    throw new Error(`unknown dentvid-mail job ${job.name}`);
  },
  { connection, autorun: ROLES.has("dentvid-mail"), concurrency: 1, removeOnComplete: { count: 200 }, removeOnFail: { count: 200 } },
);
// Before: a watchdog, reconcile, digest or lifecycle run that threw just sat in
// BullMQ's failed list — no log, no alert. Now: logged, and the owner is told
// once its retries are spent (one email per job a day).
dentvidMailWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, name: job?.name, err: err.message }, "dentvid-mail job failed");
  alertOnFailure("dentvid-mail", job, err);
});
if (process.env.DENTVID_SUPABASE_URL && ROLES.has("dentvid-mail")) {
  dentvidMailQueue
    .upsertJobScheduler("dentvid-lifecycle", LIFECYCLE_SCHEDULE, { name: "lifecycle", data: {}, opts: CRON_JOB_OPTS })
    .catch((e) => logger.error({ err: (e as Error).message }, "dentvid: lifecycle scheduler setup failed"));
  // Watchdogs (dentvid/watchdog.ts) and the owner's daily digest — on this light
  // queue, so they never wait behind a Monday of renders.
  for (const [id, schedule, name] of [
    ["dentvid-watchdog-monday", WATCHDOG_SCHEDULE, "watchdog-monday"],
    ["dentvid-watchdog-first-week", FIRST_WEEK_SCHEDULE, "watchdog-first-week"],
    ["dentvid-digest", DIGEST_SCHEDULE, "digest"],
    ["dentvid-billing-reconcile", RECONCILE_SCHEDULE, "billing-reconcile"],
  ] as const) {
    dentvidMailQueue
      .upsertJobScheduler(id, schedule, { name, data: {}, opts: CRON_JOB_OPTS })
      .catch((e) => logger.error({ err: (e as Error).message, id }, "dentvid: scheduler setup failed"));
  }
}

// The synthetic monitor (dentvid/synthetic.ts): every 15 minutes, the live
// site checked from this server the way a clinic would use it — pages,
// sign-up (a throwaway e2e-monitor account, deleted again), Liman, the Dodo
// checkout link. Results in Redis for /dentvideo/admin/system; the owner is
// emailed after 2 failures in a row, and once more when it recovers.
// Its own small "crons" queue: a job scheduler runs it once per slot however
// many processes have the crons role, and never behind a Monday of renders.
const cronsQueue = new Queue("crons", { connection });
const cronsWorker = new Worker(
  "crons",
  async (job) => {
    if (job.name === "synthetic-monitor") {
      const run = await runMonitor({ fetch, store: opsStore(), alert: ownerAlert, config: monitorConfig(), log: (level, msg, extra) => logger[level](extra ?? {}, `dentvid: ${msg}`) });
      return { ok: run.ok, failed: run.results.filter((r) => !r.ok && !r.skipped).map((r) => r.name) };
    }
    throw new Error(`unknown crons job ${job.name}`);
  },
  { connection, autorun: ROLES.has("crons"), concurrency: 1, removeOnComplete: { count: 200 }, removeOnFail: { count: 200 } },
);
cronsWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err: err.message }, "crons job failed"));
if (ROLES.has("crons") && process.env.DENTVIDEO_MONITOR !== "off") {
  cronsQueue
    .upsertJobScheduler("dentvid-synthetic-monitor", MONITOR_SCHEDULE, { name: "synthetic-monitor", data: {} })
    .catch((e) => logger.error({ err: (e as Error).message }, "dentvid: monitor scheduler setup failed"));
} else if (process.env.DENTVIDEO_MONITOR === "off") {
  cronsQueue.removeJobScheduler("dentvid-synthetic-monitor").catch(() => {});
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
if (process.env.DENTVID_SUPABASE_URL && ROLES.has("crons")) void startParkedResumeCron();

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
    autorun: ROLES.has("publish"),
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
    autorun: ROLES.has("derivative"),
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
  stopHeartbeat();
  await Promise.allSettled([
    videoWorker.close(),
    generateWorker.close(),
    publishWorker.close(),
    derivativeWorker.close(),
    dentvidWorker.close(),
    dentvidQueue.close(),
    dentvidMailWorker.close(),
    dentvidMailQueue.close(),
    cronsWorker.close(),
    cronsQueue.close(),
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
if (process.env.ENABLE_TREND_CRON !== "false" && ROLES.has("crons")) {
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
if (process.env.ENABLE_COST_MONITOR !== "false" && ROLES.has("crons")) {
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
if (process.env.ENABLE_METRICS_CRON === "true" && ROLES.has("crons")) {
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
if (process.env.ENABLE_REAPER !== "false" && ROLES.has("crons")) {
  void startStuckJobReaperCron();
}
