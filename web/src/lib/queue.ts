import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const videoQueue = new Queue("video-pipeline", { connection });
export const publishQueue = new Queue("publish", { connection });
export const analyticsQueue = new Queue("analytics-poll", { connection });

export const videoEvents = new QueueEvents("video-pipeline", { connection });

export type VideoJobPayload = {
  jobId: string;
  userId: string;
  sourceType: "upload" | "youtube" | "tiktok_url";
  sourceUrl?: string;
  storagePath?: string;
  niche?: string;
  language?: string;
};

export type PublishJobPayload = {
  publishId: string;
  userId: string;
  clipId: string;
  platform: string;
};
