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
import { parseScenePlan, type ScenePlan } from "../remotion/scene-plan.js";
import { prepareVoiceover } from "../remotion/voiceover.js";
import { resolveVoice } from "../dental/voice.js";
import { renderConcurrency } from "../remotion/capacity.js";
import { rowFromClip, rowFromPackage, storageKey, type ItemRow } from "./rows.js";
import { notifyReady } from "./notify.js";
import { isPaying } from "./schedule.js";
import { patientSearches } from "../dental/questions.js";
import { analyseLogo, brandFromLogo, logoStyleOf } from "../dental/logo.js";
import type { LogoStyle } from "../remotion/logo-style.js";

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
/** Re-render one generated video after the clinic picked new background photos. */
export type RestyleJob = { itemId: string };
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
  const logoStyle = profile.logo ? await brandWithLogo(profile, clinicId) : undefined;
  return { ownerId: data.owner_id as string, profile, logoStyle };
}

/**
 * Reads the logo once per job: its colours fill a brand colour the clinic
 * left empty and supply the accent; its shape and brightness decide how it
 * is drawn. A logo that cannot be read costs nothing but the defaults.
 */
async function brandWithLogo(profile: ClinicProfile, clinicId: string): Promise<LogoStyle | undefined> {
  try {
    const analysis = await analyseLogo(profile.logo!);
    const brand = brandFromLogo(profile.brandColor, analysis);
    if (brand.brandColor) profile.brandColor = brand.brandColor;
    if (brand.brandAccent) profile.brandAccent = brand.brandAccent;
    logger.info(
      { clinicId, treatment: analysis.treatment, brandColor: profile.brandColor, brandAccent: profile.brandAccent },
      "dentvid: logo analysed",
    );
    return logoStyleOf(analysis);
  } catch (e) {
    logger.warn({ clinicId, err: (e as Error).message }, "dentvid: logo analysis failed");
    return undefined;
  }
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
  let { error } = await db.from("dentvid_items").insert(rows);
  if (error && /suggested_backgrounds/.test(error.message)) {
    // Liman without 0003_dentvid_backgrounds.sql yet: a week of videos must
    // not be lost over the suggestions; the web app recomputes them from the plan.
    logger.warn({ err: error.message }, "dentvid: suggested_backgrounds column missing; inserting without it");
    ({ error } = await db.from("dentvid_items").insert(rows.map(({ suggested_backgrounds: _drop, ...r }) => r)));
  }
  if (error) throw new Error(`insert items: ${error.message}`);
}

/**
 * Last line of defence for "no API spend before payment": the web routes,
 * the payment webhook and the Monday dispatch only queue work for paying
 * clinics, and the worker checks again before calling any model.
 */
async function paying(db: SupabaseClient, clinicId: string, kind: string): Promise<boolean> {
  const { data } = await db.from("dentvid_clinics").select("plan").eq("id", clinicId).maybeSingle();
  if (isPaying((data as { plan?: string } | null)?.plan)) return true;
  logger.warn({ clinicId, plan: (data as { plan?: string } | null)?.plan ?? null, kind }, "dentvid: skipped — clinic has no active plan");
  return false;
}

export async function runDentvidWeek(job: WeekJob): Promise<{ ready: number; flagged: number; rejected: number }> {
  const db = dentvidDb();
  if (!(await paying(db, job.clinicId, "week"))) return { ready: 0, flagged: 0, rejected: 0 };
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-week-"));
  try {
    const { ownerId, profile, logoStyle } = await loadClinic(db, job.clinicId, workDir);
    const { data: past } = await db.from("dentvid_items").select("title").eq("clinic_id", job.clinicId).limit(200);

    const week = await produceWeek(
      {
        client: new OpenAI(),
        log: (msg, extra) => logger.info({ clinicId: job.clinicId, ...extra }, `dentvid: ${msg}`),
        searches: (p) => patientSearches(p.services, p.language, p.country),
        render: async (plan, topic) => {
          const dir = await fs.mkdtemp(path.join(workDir, "v-"));
          const voice = await prepareVoiceover(plan, dir, {
            ...resolveVoice(profile.language),
            onFallback: (e) => logger.warn({ err: e.message, topic: topic.title }, "dentvid: tts model failed, used tts-1-hd"),
          }).catch((e) => {
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
            logoStyle,
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
    const result = { ready: count("ready"), flagged: count("flagged"), rejected: count("rejected") };
    // The dentist hears about it — they should not have to keep checking.
    await notifyReady(job.clinicId, "week", { ready: result.ready, flagged: result.flagged });
    return result;
  } finally {
    void fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function runDentvidRecording(job: RecordingJob): Promise<{ clips: number }> {
  const db = dentvidDb();
  if (!(await paying(db, job.clinicId, "recording"))) return { clips: 0 };
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
    await notifyReady(job.clinicId, "recording", {
      ready: rows.filter((r) => r.status === "ready").length,
      flagged: rows.filter((r) => r.status === "flagged").length,
    });
    return { clips: rows.length };
  } finally {
    void fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Re-renders one generated video with the background photos the clinic
 * picked (web: POST /api/dentvideo/items/[id]/backgrounds writes them into
 * plan.backgrounds and sets restyle_status = 'queued').
 *
 * Re-uses the stored plan, copy and reviews unchanged — only the photos
 * differ, so nothing is re-written or re-reviewed. Narration audio is not
 * stored, so it is synthesised again from the stored narration text: same
 * text, same voice, about 1–2 US cents of TTS per re-render.
 * The old file is replaced only once the new one is stored; on failure the
 * old video stays and the card says the update did not work.
 */
export async function runDentvidRestyle(job: RestyleJob): Promise<{ ok: boolean }> {
  const db = dentvidDb();
  const { data: item, error } = await db
    .from("dentvid_items")
    .select("id, clinic_id, owner_id, kind, plan, video_path, thumb_path")
    .eq("id", job.itemId)
    .single();
  if (error || !item) throw new Error(`item ${job.itemId} not found: ${error?.message ?? ""}`);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-restyle-"));
  try {
    if (item.kind !== "generated" || !item.plan) throw new Error("only generated videos with a stored plan can be re-rendered");
    const { profile, logoStyle } = await loadClinic(db, item.clinic_id as string, workDir);
    const stored = parseScenePlan(item.plan);
    // Painted in the clinic's colour exactly as the weekly run does (week.ts).
    const plan: ScenePlan = profile.brandColor
      ? { ...stored, brandColor: profile.brandColor, ...(profile.brandAccent ? { brandAccent: profile.brandAccent } : {}) }
      : stored;
    const voice = await prepareVoiceover(plan, workDir, resolveVoice(profile.language)).catch((e) => {
      logger.warn({ err: (e as Error).message, itemId: item.id }, "dentvid: restyle voiceover failed");
      return { plan, voiceoverPath: undefined };
    });
    const res = await renderPlan({
      plan: voice.plan,
      voiceoverSrc: voice.voiceoverPath,
      workDir,
      outputPath: path.join(workDir, "video.mp4"),
      pexelsApiKey: process.env.PEXELS_API_KEY,
      concurrency: renderConcurrency(),
      logoSrc: profile.logo,
      logoStyle,
      onWarn: (m) => logger.warn({ itemId: item.id }, `dentvid: restyle ${m}`),
    });
    const files = await storeVideo(db, item.owner_id as string, res.outputPath);
    const { error: upd } = await db
      .from("dentvid_items")
      .update({ video_path: files.videoPath, thumb_path: files.thumbPath ?? null, restyle_status: null, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (upd) throw new Error(`update item: ${upd.message}`);
    const old = [item.video_path, item.thumb_path].filter((p): p is string => Boolean(p));
    if (old.length) await db.storage.from(BUCKET).remove(old).catch(() => {});
    return { ok: true };
  } catch (e) {
    await db
      .from("dentvid_items")
      .update({ restyle_status: "failed", updated_at: new Date().toISOString() })
      .eq("id", job.itemId)
      .then(
        () => {},
        () => {},
      );
    throw e;
  } finally {
    void fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
