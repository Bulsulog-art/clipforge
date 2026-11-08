import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import OpenAI from "openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import { clinicProfileSchema, type ClinicProfile } from "../dental/profile.js";
import { produceWeek } from "../dental/week.js";
import { clipsFromRecording } from "../dental/recording.js";
import { renderPlan } from "../remotion/render-plan.js";
import { prepareVoiceover } from "../remotion/voiceover.js";
import { renderConcurrency } from "../remotion/capacity.js";
import { rowFromClip, rowFromPackage, storageKey, type ItemRow } from "./rows.js";

/**
 * DentVideo jobs. The product's data lives on Liman (self-hosted Supabase):
 * tables dentvid_clinics / dentvid_items, private bucket "dentvid".
 *
 *   week       a clinic's profile → a week of reviewed, narrated, QA-checked
 *              videos (src/dental/week.ts), stored and recorded
 *   recording  the dentist's own upload → reviewed, captioned clips
 *              (src/dental/recording.ts), stored and recorded
 */

const BUCKET = "dentvid";

let _db: SupabaseClient | undefined;
export function dentvidDb(): SupabaseClient {
  if (!_db) {
    const url = process.env.DENTVID_SUPABASE_URL;
    const key = process.env.DENTVID_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("DENTVID_SUPABASE_URL / DENTVID_SERVICE_ROLE_KEY are not set");
    _db = createClient(url, key, { auth: { persistSession: false } });
  }
  return _db;
}

export type WeekJob = { clinicId: string; count?: number };
export type RecordingJob = { clinicId: string; sourcePath: string };

async function loadClinic(db: SupabaseClient, clinicId: string, workDir: string) {
  const { data, error } = await db
    .from("dentvid_clinics")
    .select("id, owner_id, profile, logo_path")
    .eq("id", clinicId)
    .single();
  if (error || !data) throw new Error(`clinic ${clinicId} not found: ${error?.message ?? ""}`);
  const profile: ClinicProfile = clinicProfileSchema.parse(data.profile);
  if (data.logo_path) {
    const local = path.join(workDir, `logo${path.extname(data.logo_path) || ".png"}`);
    const { data: blob } = await db.storage.from(BUCKET).download(data.logo_path);
    if (blob) {
      await fs.writeFile(local, Buffer.from(await blob.arrayBuffer()));
      profile.logo = local;
    }
  }
  return { ownerId: data.owner_id as string, profile };
}

async function upload(db: SupabaseClient, key: string, file: string, contentType: string) {
  const { error } = await db.storage
    .from(BUCKET)
    .upload(key, createReadStream(file) as unknown as Blob, { contentType, upsert: true, duplex: "half" } as never);
  if (error) throw new Error(`upload ${key}: ${error.message}`);
}

function frameAt(video: string, out: string, atSec: number): Promise<string> {
  return new Promise((resolve, reject) =>
    ffmpeg(video).seekInput(atSec).frames(1).size("540x960").on("end", () => resolve(out)).on("error", reject).save(out),
  );
}

async function storeVideo(db: SupabaseClient, ownerId: string, videoPath: string, thumbPath?: string) {
  const key = randomUUID();
  const videoKey = storageKey(ownerId, key, "mp4");
  await upload(db, videoKey, videoPath, "video/mp4");
  let thumbKey: string | undefined;
  const thumb = thumbPath ?? (await frameAt(videoPath, `${videoPath}.jpg`, 1.5).catch(() => undefined));
  if (thumb) {
    thumbKey = storageKey(ownerId, key, "jpg");
    await upload(db, thumbKey, thumb, "image/jpeg").catch(() => (thumbKey = undefined));
  }
  return { videoPath: videoKey, thumbPath: thumbKey };
}

async function insert(db: SupabaseClient, rows: ItemRow[]) {
  if (!rows.length) return;
  const { error } = await db.from("dentvid_items").insert(rows);
  if (error) throw new Error(`insert items: ${error.message}`);
}

export async function runDentvidWeek(job: WeekJob): Promise<{ ready: number; flagged: number; rejected: number }> {
  const db = dentvidDb();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-week-"));
  try {
    const { ownerId, profile } = await loadClinic(db, job.clinicId, workDir);
    const { data: past } = await db.from("dentvid_items").select("title").eq("clinic_id", job.clinicId).limit(200);

    const week = await produceWeek(
      {
        client: new OpenAI(),
        log: (msg, extra) => logger.info({ clinicId: job.clinicId, ...extra }, `dentvid: ${msg}`),
        render: async (plan, topic) => {
          const dir = await fs.mkdtemp(path.join(workDir, "v-"));
          const voice = await prepareVoiceover(plan, dir).catch((e) => {
            logger.warn({ err: (e as Error).message, topic: topic.title }, "dentvid: voiceover failed");
            return { plan, voiceoverPath: undefined };
          });
          const res = await renderPlan({
            plan: voice.plan,
            voiceoverSrc: voice.voiceoverPath,
            workDir: dir,
            outputPath: path.join(dir, "video.mp4"),
            pexelsApiKey: process.env.PEXELS_API_KEY,
            concurrency: renderConcurrency(),
            logoSrc: profile.logo,
          });
          return res.outputPath;
        },
      },
      profile,
      { count: job.count ?? 5, avoidTitles: (past ?? []).map((p) => p.title as string) },
    );

    const rows: ItemRow[] = [];
    for (const pkg of week) {
      const ids = { clinicId: job.clinicId, ownerId };
      if (pkg.status === "ready" && pkg.videoPath) {
        const stored = await storeVideo(db, ownerId, pkg.videoPath).catch((e) => {
          logger.error({ err: (e as Error).message }, "dentvid: store failed");
          return undefined;
        });
        rows.push(rowFromPackage(pkg, ids, stored));
      } else {
        rows.push(rowFromPackage(pkg, ids));
      }
    }
    await insert(db, rows);
    const count = (s: ItemRow["status"]) => rows.filter((r) => r.status === s).length;
    return { ready: count("ready"), flagged: count("flagged"), rejected: count("rejected") };
  } finally {
    void fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function runDentvidRecording(job: RecordingJob): Promise<{ clips: number }> {
  const db = dentvidDb();
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-rec-"));
  try {
    const { ownerId, profile } = await loadClinic(db, job.clinicId, workDir);
    const { data: blob, error } = await db.storage.from(BUCKET).download(job.sourcePath);
    if (error || !blob) throw new Error(`download ${job.sourcePath}: ${error?.message ?? "empty"}`);
    const source = path.join(workDir, `source${path.extname(job.sourcePath) || ".mp4"}`);
    await fs.writeFile(source, Buffer.from(await blob.arrayBuffer()));

    const clips = await clipsFromRecording(
      { client: new OpenAI(), workDir, render: true, log: (msg, extra) => logger.info({ clinicId: job.clinicId, ...extra }, `dentvid: ${msg}`) },
      profile,
      source,
      undefined,
      { maxClips: 6 },
    );

    const rows: ItemRow[] = [];
    for (const clip of clips) {
      const stored = clip.videoPath
        ? await storeVideo(db, ownerId, clip.videoPath, clip.thumbPath).catch(() => undefined)
        : undefined;
      rows.push(rowFromClip(clip, { clinicId: job.clinicId, ownerId, sourcePath: job.sourcePath }, stored));
    }
    await insert(db, rows);
    return { clips: rows.length };
  } finally {
    void fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
