import { Worker, MetricsTime, Queue, UnrecoverableError } from "bullmq";
import IORedis from "ioredis";
import * as Sentry from "@sentry/node";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";
import { runVideoPipeline } from "./pipeline.js";
import { runGenerate } from "./generate.js";
import { configureSpend, countActiveClinics, dentvidDb, runDentvidChange, runDentvidRecording, runDentvidRestyle, runDentvidWeek, SpendRefusedError, WEEK_VIDEOS } from "./dentvid/jobs.js";
import { RedisGuardStore, SpendGuard } from "./dentvid/spend-guard.js";
import { RedisParkStore, resumeParked } from "./dentvid/park.js";
import { DISPATCH_SCHEDULE, dispatchWeeks } from "./dentvid/schedule.js";
import { isBatchPriority } from "./dentvid/job-options.js";
import { batchNice, withNicedChildren } from "./dentvid/nice.js";
import { configureReadyMail, notifyReadyChecked, type ReadyMailJob } from "./dentvid/notify.js";
import { LIFECYCLE_SCHEDULE, runLifecycle } from "./dentvid/lifecycle.js";
import { clinicRef, configureOps, opsStore, ownerAlert, ownerAlertOnce, RedisOpsStore, setWeekDelay } from "./dentvid/ops.js";
import { alerts, resendSender } from "./dentvid/ops-alert.js";
import { dailyProviderCheck } from "./dentvid/provider-health.js";
import { checkFirstWeeks, checkMondayDispatch, FIRST_WEEK_SCHEDULE, supabaseWatchDb, WATCHDOG_SCHEDULE } from "./dentvid/watchdog.js";
import { DIGEST_SCHEDULE, runDigest } from "./dentvid/digest.js";
import { checkWeekDelivery, DELIVERY_SCHEDULE, supabaseDeliveryDb } from "./dentvid/delivery.js";
import { endPaidUpPlans, supabasePlanEndDb } from "./dentvid/plan-end.js";
import { supabaseAppleTakeoverDb } from "./dentvid/apple-takeover.js";
import { RETENTION_SCHEDULE, retentionAlertDue, runRetention, supabaseRetentionDb, webNoticeSender } from "./dentvid/retention.js";
import { dentvidConcurrency, generateConcurrency } from "./remotion/capacity.js";
import { workerRoles } from "./roles.js";
import { dodoLookup, purgeAdData, RECONCILE_SCHEDULE, reconcileBilling, revenuecatLookup, supabaseReconcileDb } from "./dentvid/reconcile.js";
import { EXTRA_RUN_STALLED, extraRunRestarted, handleFailedRestyle, handleFailedWeek, MAX_STALLED_COUNT, weekClinic, weekRunCtx } from "./dentvid/stalled-week.js";
import { recordWeekDuration } from "./dentvid/capacity.js";
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
        // A week's one extra run (dentvid/stalled-week.ts) whose process died under it is not started
        // again: failed here, before it reserves anything, and the "failed" handler tells the owner.
        if (extraRunRestarted(job)) throw new UnrecoverableError(EXTRA_RUN_STALLED);
        // weekRunCtx: the "failed" handler below sends the one owner email for a final failure.
        const run = () => runDentvidWeek(job.data, weekRunCtx(job));
        return isBatchPriority(job.opts.priority) ? await withNicedChildren(BATCH_NICE, run) : await run();
      }
      if (job.name === "recording") return await runDentvidRecording(job.data, { jobId: job.id });
      if (job.name === "restyle") return await runDentvidRestyle(job.data);
      // "Ask for a change" on one video (dentvid/jobs.ts runDentvidChange): one attempt, within the spend guard.
      if (job.name === "change") return await runDentvidChange(job.data);
      // Projects the batch with the measured minutes per week and emails the owner once a week when a
      // Monday deadline would be missed (dentvid/capacity.ts).
      if (job.name === "dispatch") return await dispatchWeeks(dentvidDb(), dentvidQueue, new Date(), opsStore(), DENTVID_CONCURRENCY, { alertOnce: ownerAlertOnce });
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
    // A week whose process dies under it (a deploy, a restart, out of memory) is put back in the
    // queue; only the third time is it failed as "stalled" (dentvid/stalled-week.ts takes it from
    // there). The default, 1, gave up on a week after two restarts in one Saturday evening.
    maxStalledCount: MAX_STALLED_COUNT,
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
  // A week that failed for good, also one BullMQ failed itself because its process died under it
  // ("stalled", an UnrecoverableError at attempt 1 of 4 that runDentvidWeek never sees): the library
  // says "delayed", the owner is told, and before the clinic's Monday morning it is queued once more
  // (dentvid/stalled-week.ts).
  if (job?.name === "week") {
    void handleFailedWeek(
      job,
      err,
      { queue: dentvidQueue, store: opsStore(), alert: ownerAlert, setDelay: setWeekDelay, clinic: (id) => weekClinic(dentvidDb, id) },
      { spendRefusal: err instanceof SpendRefusedError },
    )
      .then((o) => {
        if (o.handled) logger.warn({ jobId: job.id, ...o }, "dentvid: week failed for good");
      })
      .catch((e) => logger.error({ jobId: job.id, err: (e as Error).message }, "dentvid: failed-week handling failed"));
  }
  // A restyle that died outside its own error handling (stalled, killed): the card must not say "updating…"
  // forever. Final by the same test as weeks (a stalled restyle fails at attempt 1 of 2).
  if (job?.name === "restyle") {
    void handleFailedRestyle(job, err, async (itemId) => {
      const { error } = await dentvidDb()
        .from("dentvid_items")
        .update({ restyle_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", itemId)
        .eq("restyle_status", "queued");
      if (error) throw new Error(error.message);
    }).catch(() => {});
  }
});
// How long real weeks take (dentvid/capacity.ts): every full week's duration goes into a capped list,
// whose median the Saturday dispatch projects with once there are enough.
dentvidWorker.on("completed", (job, result) => {
  if (job.name !== "week") return;
  void recordWeekDuration(opsStore(), job, result, WEEK_VIDEOS).then((minutes) => {
    if (minutes !== null) logger.info({ jobId: job.id, minutes }, "dentvid: week duration recorded");
  });
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
      // A notice that failed for a passing reason throws, so BullMQ retries it (READY_MAIL_JOB_OPTS)
      // and, after the last attempt, the owner is told (job-failures.ts). Before, it "succeeded" with false.
      const r = await notifyReadyChecked(d.clinicId, d.kind, { ready: d.ready, flagged: d.flagged });
      if (!r.sent && r.retry) throw new Error(`ready email not sent: ${r.reason}`);
      return r;
    }
    if (job.name === "digest") {
      // Once a day with the digest: can the AI providers work? Free endpoints only (dentvid/provider-health.ts).
      for (const p of await dailyProviderCheck(opsStore()).catch(() => [])) {
        await ownerAlert(alerts.providerDown({ provider: p.provider, reason: p.reason, when: "daily", fallback: p.fallback })).catch(() => "failed");
      }
      return assertRunOk("digest", await runDigest());
    }
    if (job.name === "billing-reconcile") {
      const result = await reconcileBilling({ db: supabaseReconcileDb(dentvidDb()), dodo: dodoLookup(), revenuecat: revenuecatLookup(), alert: ownerAlert, apple: supabaseAppleTakeoverDb(dentvidDb()) });
      // Nightly retention: Google Ads click ids older than 90 days (migration 0019; a no-op error before it is applied).
      await purgeAdData(dentvidDb());
      return result;
    }
    if (job.name === "watchdog-delivery") {
      const r = await checkWeekDelivery({ db: supabaseDeliveryDb(dentvidDb()), queue: dentvidQueue, store: opsStore(), alert: ownerAlert });
      // Same hour: cancelled plans whose paid period is over become cancelled (dentvid/plan-end.ts).
      const ended = await endPaidUpPlans(supabasePlanEndDb(dentvidDb()), new Date(), { db: supabaseAppleTakeoverDb(dentvidDb()), alert: ownerAlert });
      return { due: r.due, delivered: r.delivered, late: r.late.length, behind: r.behind.length, plansEnded: ended.ended.length, movedToApple: ended.movedToApple?.length ?? 0 };
    }
    if (job.name === "retention") {
      // 90 days after a plan ends the library goes (dentvid/retention.ts); reminders 14 and 1 day before.
      const r = await runRetention({ db: supabaseRetentionDb(dentvidDb()), notify: webNoticeSender() });
      if (retentionAlertDue(r) && r.mode !== "off") {
        await ownerAlert(alerts.retention({ mode: r.mode, stamped: r.stamped, cleared: r.cleared, noticed: r.noticed, deleted: r.deleted, due: r.due, errors: r.errors })).catch(() => "failed");
      }
      return r;
    }
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
    ["dentvid-watchdog-delivery", DELIVERY_SCHEDULE, "watchdog-delivery"],
    ["dentvid-digest", DIGEST_SCHEDULE, "digest"],
    ["dentvid-billing-reconcile", RECONCILE_SCHEDULE, "billing-reconcile"],
    ["dentvid-retention", RETENTION_SCHEDULE, "retention"],
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
      await resumeParked(parkStore, dentvidQueue, spendGuard, new Date(), async (p) => {
        // A parked week or recording given up on after 7 days: the clinic did not get it — the owner hears, the library says so.
        const week = typeof p.data.week === "string" ? p.data.week : null;
        if (p.name === "week" && week) await setWeekDelay(p.data.clinicId, week, "delayed");
        await ownerAlert(alerts.parkedDropped({ clinic: await clinicRef(dentvidDb(), p.data.clinicId), job: p.name, jobId: p.jobId, reason: p.reason, parkedAt: p.parkedAt }));
      });
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
