import "server-only";
import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

let _connection: IORedis | undefined;
let _videoQueue: Queue | undefined;
let _publishQueue: Queue | undefined;
let _analyticsQueue: Queue | undefined;
let _videoEvents: QueueEvents | undefined;

function getConnection(): IORedis {
  if (!_connection) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL env var is missing — set it in Coolify env or .env.local");
    }
    _connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: true,
    });
  }
  return _connection;
}

export const videoQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    if (!_videoQueue) {
      _videoQueue = new Queue("video-pipeline", { connection: getConnection() });
    }
    const value = (_videoQueue as any)[prop];
    return typeof value === "function" ? value.bind(_videoQueue) : value;
  },
});

export const publishQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    if (!_publishQueue) {
      _publishQueue = new Queue("publish", { connection: getConnection() });
    }
    const value = (_publishQueue as any)[prop];
    return typeof value === "function" ? value.bind(_publishQueue) : value;
  },
});

export const analyticsQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    if (!_analyticsQueue) {
      _analyticsQueue = new Queue("analytics-poll", { connection: getConnection() });
    }
    const value = (_analyticsQueue as any)[prop];
    return typeof value === "function" ? value.bind(_analyticsQueue) : value;
  },
});

export const videoEvents = new Proxy({} as QueueEvents, {
  get(_target, prop) {
    if (!_videoEvents) {
      _videoEvents = new QueueEvents("video-pipeline", { connection: getConnection() });
    }
    const value = (_videoEvents as any)[prop];
    return typeof value === "function" ? value.bind(_videoEvents) : value;
  },
});

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
