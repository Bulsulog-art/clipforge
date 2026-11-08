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
import { produceWeek, type VideoPackage } from "../dental/week.js";
import { clipsFromRecording } from "../dental/recording.js";
import { renderPlan } from "../remotion/render-plan.js";
import { parseScenePlan, type ScenePlan } from "../remotion/scene-plan.js";
import { prepareVoiceover } from "../remotion/voiceover.js";
import { resolveVoice } from "../dental/voice.js";
import { renderConcurrency } from "../remotion/capacity.js";
import { rowFromClip, rowFromPackage, storageKey, type ItemRow } from "./rows.js";
import { notifyReady } from "./notify.js";
import { isPaying, weekOf } from "./schedule.js";
import { classifyFailure, isLastAttempt, TransientWeekError } from "./retry.js";
import { clinicRef, noteRenderFailure, ownerAlert, setWeekDelay } from "./ops.js";
import { alerts, cleanError } from "./ops-alert.js";
import { patientSearches } from "../dental/questions.js";
import { analyseLogo, brandFromLogo, logoStyleOf } from "../dental/logo.js";
import type { LogoStyle } from "../remotion/logo-style.js";
import { UnrecoverableError } from "bullmq";
import { alertRefusal, sendOwnerAlert, SpendGuard, type AlertSender, type RefusalReason, type SpendOp } from "./spend-guard.js";
import type { ParkStore } from "./park.js";

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

// ---- Spend guard wiring (spend-guard.ts) ------------------------------------
// index.ts configures the guard with the worker's Redis; until then the
// guard has no store and refuses everything (fail-closed).

type SpendDeps = { guard: SpendGuard; park: ParkStore | null; alert: AlertSender };
let spend: SpendDeps = { guard: new SpendGuard(null), park: null, alert: sendOwnerAlert };

export function configureSpend(deps: Partial<SpendDeps> & { guard: SpendGuard }): void {
  spend = { park: null, alert: sendOwnerAlert, ...deps };
}

/** The job was refused by the spend guard and parked (or refused outright); BullMQ must not retry it. */
export class SpendRefusedError extends UnrecoverableError {
  constructor(
    public reason: RefusalReason,
    detail: string,
    public parked: boolean,
  ) {
    super(`spend guard: ${reason}${parked ? " (parked)" : ""} — ${detail}`);
  }
}

/** Upper bounds on what a recording may cost us in CPU and transcription. */
const MAX_RECORDING_BYTES = 600 * 1024 * 1024;
const maxRecordingMinutes = () => Number(process.env.DENTVID_MAX_RECORDING_MIN ?? 30) || 30;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/**
 * Reserve budget for a week or recording before any paid call. On refusal
 * the job is parked for automatic retry and the owner is alerted (once per
 * reason per day); if it cannot even be parked (Redis down), a normal error
 * lets BullMQ retry it later with backoff.
 */
async function reserveOrPark(op: Extract<SpendOp, "week" | "recording">, data: { clinicId: string } & Record<string, unknown>, jobId?: string): Promise<void> {
  const d = await spend.guard.reserve(op, data.clinicId);
  if (d.ok) return;
  let parked = false;
  if (jobId && spend.park) {
    try {
      await spend.park.put({ jobId, name: op, data, reason: d.reason, parkedAt: new Date().toISOString() });
      parked = true;
    } catch (e) {
      logger.error({ jobId, err: (e as Error).message }, "dentvid: could not park job");
    }
  }
  await alertRefusal(spend.guard, { op, clinicId: data.clinicId, reason: d.reason, detail: d.detail, parked }, spend.alert).catch(() => false);
  if (!parked) throw new Error(`spend guard: ${d.reason} — ${d.detail} (not parked; BullMQ will retry)`);
  throw new SpendRefusedError(d.reason, d.detail, true);
}

/** A storage key the worker may touch for this owner: inside their folder, no traversal. */
export function ownedKey(key: string | null | undefined, ownerId: string): key is string {
  return !!key && key.startsWith(`${ownerId}/`) && !key.split("/").some((seg) => seg === ".." || seg === "." || seg === "");
}

/** Clinics with plan = 'active' on Liman — scales the global spend ceilings (spend-guard.ts). Throws on error. */
export async function countActiveClinics(): Promise<number> {
  const { count, error } = await dentvidDb().from("dentvid_clinics").select("id", { count: "exact", head: true }).eq("plan", "active");
  if (error) throw new Error(`count active clinics: ${error.message}`);
  if (typeof count !== "number") throw new Error("count active clinics: no count returned");
  return count;
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
  if (data.logo_path && !ownedKey(data.logo_path, data.owner_id as string)) {
    logger.warn({ clinicId }, "dentvid: logo_path outside the owner's folder ignored");
  } else if (data.logo_path) {
    const local = path.join(workDir, `logo${path.extname(data.logo_path) || ".png"}`);
    const { data: blob } = await db.storage.from(BUCKET).download(data.logo_path);
    if (blob && blob.size > MAX_LOGO_BYTES) {
      logger.warn({ clinicId, bytes: blob.size }, "dentvid: logo too large, ignored");
    } else if (blob) {
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

/** Media duration in seconds via ffprobe; NaN when unreadable (treated as too long). */
function durationSec(file: string): Promise<number> {
  return new Promise((resolve) =>
    ffmpeg.ffprobe(file, (err, meta) => resolve(err ? Number.NaN : Number(meta?.format?.duration ?? Number.NaN))),
  );
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

/** Fewer usable videos than this and the week is topped up with extra topics. */
export const MIN_USABLE_VIDEOS = 3;

export type WeekCtx = { jobId?: string; attemptsMade?: number; attempts?: number };
export type WeekResult = { ready: number; flagged: number; rejected: number; toppedUp?: number };

const usableRow = (r: ItemRow) => (r.status === "ready" || r.status === "flagged") && !!r.video_path;

/**
 * A paying clinic's week, made to heal itself before anyone is told:
 *  - each video that fails for a technical reason is re-attempted once (week.ts);
 *  - a finished video that fails to upload is uploaded once more;
 *  - fewer than MIN_USABLE_VIDEOS usable → extra topics top the week up
 *    (one round, budgeted as a "topup" by the spend guard);
 *  - nothing usable and the failures were technical → nothing is stored and
 *    the job fails with a transient error, so BullMQ runs it again later
 *    (WEEK_JOB_OPTS: 4 attempts, 2/4/8 min apart);
 *  - transient errors are retried, permanent ones are not (retry.ts).
 * While it retries the library says "taking a little longer"; when every
 * attempt failed it says "delayed, we're on it" and the owner gets one email.
 */
export async function runDentvidWeek(job: WeekJob, ctx: WeekCtx = {}): Promise<WeekResult> {
  const week = weekOf();
  const last = isLastAttempt(ctx.attemptsMade ?? 0, ctx.attempts ?? 1);
  try {
    const result = await makeWeek(job, ctx, week);
    await setWeekDelay(job.clinicId, week, null);
    return result;
  } catch (e) {
    if (e instanceof SpendRefusedError) {
      // Parked: it runs by itself once the guard has room; the guard told the owner.
      await setWeekDelay(job.clinicId, week, "retrying");
      throw e;
    }
    const kind = classifyFailure(e);
    if (kind === "transient" && !last) {
      logger.warn({ clinicId: job.clinicId, attempt: (ctx.attemptsMade ?? 0) + 1, err: (e as Error).message }, "dentvid: week failed — will retry");
      await setWeekDelay(job.clinicId, week, "retrying");
      throw e;
    }
    await setWeekDelay(job.clinicId, week, "delayed");
    await ownerAlert(
      alerts.weekFailed({
        clinic: await clinicRef(safeDb(), job.clinicId),
        week,
        attempts: (ctx.attemptsMade ?? 0) + 1,
        error: cleanError(e),
        permanent: kind === "permanent",
      }),
    ).catch(() => "failed");
    // Permanent: tell BullMQ not to spend more attempts on it.
    if (kind === "permanent" && !(e instanceof UnrecoverableError)) throw new UnrecoverableError((e as Error).message);
    throw e;
  }
}

function safeDb(): SupabaseClient | null {
  try {
    return dentvidDb();
  } catch {
    return null;
  }
}

async function makeWeek(job: WeekJob, ctx: WeekCtx, week: string): Promise<WeekResult> {
  const db = dentvidDb();
  if (!(await paying(db, job.clinicId, "week"))) return { ready: 0, flagged: 0, rejected: 0 };
  // Budget first: nothing below may call a paid API before this passes.
  await reserveOrPark("week", { ...job }, ctx.jobId);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-week-"));
  try {
    const { ownerId, profile, logoStyle } = await loadClinic(db, job.clinicId, workDir);
    const { data: past } = await db.from("dentvid_items").select("title").eq("clinic_id", job.clinicId).limit(200);
    const want = job.count ?? 5;
    const ids = { clinicId: job.clinicId, ownerId };

    const produce = (count: number, avoidTitles: string[]) =>
      produceWeek(
        {
          client: new OpenAI(),
          log: (msg, extra) => logger.info({ clinicId: job.clinicId, ...extra }, `dentvid: ${msg}`),
          searches: (p) => patientSearches(p.services, p.language, p.country),
          onVideoError: (e) => noteRenderFailure(e).catch(() => {}),
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
        { count, avoidTitles },
      );

    const toRows = async (pkgs: VideoPackage[]): Promise<ItemRow[]> => {
      const rows: ItemRow[] = [];
      for (const pkg of pkgs) {
        if (pkg.status === "ready" && pkg.videoPath) {
          const stored = await storeWithRetry(db, ownerId, pkg.videoPath);
          if (stored) rows.push(rowFromPackage(pkg, ids, stored));
          // A video we could not store is not shown as a card that never loads.
          else rows.push(rowFromPackage({ status: "rejected", topic: pkg.topic, stage: "copy", reasons: [], error: "could not store the video file" }, ids));
        } else {
          rows.push(rowFromPackage(pkg, ids));
        }
      }
      return rows;
    };

    const avoid = (past ?? []).map((p) => p.title as string);
    const rows = await toRows(await produce(want, avoid));

    // Top-up: a thin week gets extra topics (one round, within the spend guard's caps).
    let toppedUp = 0;
    const usable = () => rows.filter(usableRow).length;
    const enough = Math.min(MIN_USABLE_VIDEOS, want);
    if (usable() < enough) {
      const d = await spend.guard.reserve("topup", job.clinicId);
      if (d.ok) {
        const extra = await produce(want - usable(), [...avoid, ...rows.map((r) => r.title)]).catch((e) => {
          logger.warn({ clinicId: job.clinicId, err: (e as Error).message }, "dentvid: top-up failed");
          return [] as VideoPackage[];
        });
        const more = await toRows(extra);
        toppedUp = more.filter(usableRow).length;
        rows.push(...more);
        logger.info({ clinicId: job.clinicId, toppedUp }, "dentvid: week topped up");
      } else {
        logger.warn({ clinicId: job.clinicId, reason: d.reason }, "dentvid: top-up refused by the spend guard");
      }
    }

    const technical = rows.filter((r) => r.status === "rejected" && r.error);
    if (usable() === 0 && technical.length > 0) {
      // Nothing to show and it was not the reviewers: store nothing, run again later.
      throw new TransientWeekError(`zero usable videos (${technical.length} technical failures; last: ${technical.at(-1)!.error})`);
    }

    await insert(db, rows);
    const count = (s: ItemRow["status"]) => rows.filter((r) => r.status === s).length;
    const result = { ready: count("ready"), flagged: count("flagged"), rejected: count("rejected"), toppedUp };
    if (usable() < enough) {
      await ownerAlert(
        alerts.thinWeek({
          clinic: await clinicRef(db, job.clinicId),
          week,
          usable: usable(),
          wanted: want,
          reasons: rows.filter((r) => r.status === "rejected").map((r) => (r.error ? cleanError(r.error) : r.findings.join("; ") || "rejected by review")),
        }),
      ).catch(() => "failed");
    }
    // The dentist hears about it — they should not have to keep checking.
    await notifyReady(job.clinicId, "week", { ready: result.ready, flagged: result.flagged });
    return result;
  } finally {
    void fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Upload a finished video, once more if the first try fails (storage blips). Undefined when both fail. */
async function storeWithRetry(db: SupabaseClient, ownerId: string, videoPath: string) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await storeVideo(db, ownerId, videoPath);
    } catch (e) {
      logger.error({ attempt, err: (e as Error).message }, "dentvid: store failed");
      if (attempt === 2) await noteRenderFailure(e).catch(() => {});
      else await new Promise((r) => setTimeout(r, storeRetryMs));
    }
  }
  return undefined;
}

let storeRetryMs = 3_000;
/** For tests. */
export function _setStoreRetryMs(ms: number) {
  storeRetryMs = ms;
}

export async function runDentvidRecording(job: RecordingJob, ctx: { jobId?: string } = {}): Promise<{ clips: number }> {
  const db = dentvidDb();
  if (!(await paying(db, job.clinicId, "recording"))) return { clips: 0 };
  await reserveOrPark("recording", { ...job }, ctx.jobId);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-rec-"));
  try {
    const { ownerId, profile } = await loadClinic(db, job.clinicId, workDir);
    // The path came from the browser via the web app: it must be this
    // owner's recording (the service role below bypasses storage RLS).
    if (!ownedKey(job.sourcePath, ownerId) || !job.sourcePath.startsWith(`${ownerId}/recordings/`)) {
      throw new UnrecoverableError(`recording path outside the owner's folder: ${job.sourcePath}`);
    }
    const { data: blob, error } = await db.storage.from(BUCKET).download(job.sourcePath);
    if (error || !blob) throw new Error(`download ${job.sourcePath}: ${error?.message ?? "empty"}`);
    if (blob.size > MAX_RECORDING_BYTES) throw new UnrecoverableError(`recording too large: ${blob.size} bytes`);
    const source = path.join(workDir, `source${path.extname(job.sourcePath) || ".mp4"}`);
    await fs.writeFile(source, Buffer.from(await blob.arrayBuffer()));
    // Transcription and rendering scale with length: refuse very long files
    // before any of it runs.
    const minutes = (await durationSec(source)) / 60;
    if (!(minutes <= maxRecordingMinutes())) {
      throw new UnrecoverableError(`recording is ${Number.isFinite(minutes) ? minutes.toFixed(1) : "?"} min; the limit is ${maxRecordingMinutes()} min`);
    }

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
    // Same rule as weeks and recordings: no paid TTS for a clinic that is not paying,
    // and never past the spend guard. A refused restyle is not retried; the card says it failed.
    const clinicId = item.clinic_id as string;
    const markFailed = () =>
      db
        .from("dentvid_items")
        .update({ restyle_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", item.id)
        .then(
          () => {},
          () => {},
        );
    if (!(await paying(db, clinicId, "restyle"))) {
      await markFailed();
      return { ok: false };
    }
    const d = await spend.guard.reserve("restyle", clinicId);
    if (!d.ok) {
      await alertRefusal(spend.guard, { op: "restyle", clinicId, reason: d.reason, detail: d.detail, parked: false }, spend.alert).catch(() => false);
      await markFailed();
      return { ok: false };
    }
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
    // Only ever delete inside this owner's folder (the paths are on a row the owner can edit).
    const old = [item.video_path, item.thumb_path].filter((p): p is string => ownedKey(p, item.owner_id as string));
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
