import { Worker, MetricsTime } from "bullmq";
import IORedis from "ioredis";
import * as Sentry from "@sentry/node";
import { logger } from "./logger.js";
import { runVideoPipeline } from "./pipeline.js";
import { runPublish } from "./publish.js";
import { runDerivative } from "./derivative.js";

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

videoWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "video job failed"),
);
publishWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "publish job failed"),
);
derivativeWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "derivative job failed"),
);

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  await Promise.allSettled([videoWorker.close(), publishWorker.close(), derivativeWorker.close()]);
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
