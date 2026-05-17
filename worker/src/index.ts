import { Worker } from "bullmq";
import IORedis from "ioredis";
import { logger } from "./logger.js";
import { runVideoPipeline } from "./pipeline.js";
import { runPublish } from "./publish.js";

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

const videoWorker = new Worker(
  "video-pipeline",
  async (job) => runVideoPipeline(job.data),
  { connection, concurrency: 2 },
);

const publishWorker = new Worker(
  "publish",
  async (job) => runPublish(job.data),
  { connection, concurrency: 4 },
);

videoWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "video job failed"),
);
publishWorker.on("failed", (job, err) =>
  logger.error({ jobId: job?.id, err: err.message }, "publish job failed"),
);

process.on("SIGTERM", async () => {
  logger.info("shutting down");
  await Promise.all([videoWorker.close(), publishWorker.close()]);
  process.exit(0);
});

logger.info("clipforge worker started");
