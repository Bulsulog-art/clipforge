import type { SupabaseClient } from "@supabase/supabase-js";
import { deliveryWeek } from "./week";
import { WEEK_VIDEOS, weekJobId } from "./week-job";
import { DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS, RECORDING_JOB_OPTS, RESTYLE_JOB_OPTS } from "./job-options";
import { RETRYABLE_QUEUES, isJobId, isQueueName, type QueueName } from "./admin-system";
import { missingSchema } from "./admin-audit";
import type { ReadyNoticeResult } from "./ready-notice";

/**
 * The owner's actions in the admin panel. Parsed from the posted form and run
 * against injected dependencies (database, queues, mail), so each one is
 * unit-tested without a server. The route (api/dentvideo/admin/action) does
 * the gatekeeping — admin, same origin, CSRF token, confirmation, rate limit —
 * and the audit; this file only decides and does.
 *
 * Every action that queues work uses the same job ids and options as the
 * clinic's own buttons (week-job.ts, job-options.ts), so nothing the owner
 * does can queue a week twice or jump it ahead of where a dentist's own
 * request would go.
 */

export const ADMIN_ACTIONS = ["requeue_week", "retry_video", "resend_ready", "comp_month", "pause", "unpause", "retry_job"] as const;
export type AdminActionName = (typeof ADMIN_ACTIONS)[number];

export type ActionInput =
  | { action: "requeue_week"; clinicId: string }
  | { action: "retry_video"; itemId: string }
  | { action: "resend_ready"; clinicId: string }
  | { action: "comp_month"; clinicId: string; months: number; note: string }
  | { action: "pause"; clinicId: string; note: string }
  | { action: "unpause"; clinicId: string }
  | { action: "retry_job"; queue: QueueName; jobId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: unknown): string | null => (typeof v === "string" && UUID.test(v.trim()) ? v.trim().toLowerCase() : null);
const note = (v: unknown) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 300) : "");

/** The action a posted form asks for, or null when anything is missing or malformed. */
export function parseAction(form: Record<string, unknown>): ActionInput | null {
  const a = form.action;
  switch (a) {
    case "requeue_week":
    case "resend_ready":
    case "unpause": {
      const clinicId = uuid(form.clinicId);
      return clinicId ? { action: a, clinicId } : null;
    }
    case "pause": {
      const clinicId = uuid(form.clinicId);
      return clinicId ? { action: a, clinicId, note: note(form.note) } : null;
    }
    case "comp_month": {
      const clinicId = uuid(form.clinicId);
      const months = Number(form.months ?? 1);
      const n = note(form.note);
      // A comp is a promise to a customer: it must say why.
      return clinicId && [1, 2, 3].includes(months) && n.length >= 3 ? { action: a, clinicId, months, note: n } : null;
    }
    case "retry_video": {
      const itemId = uuid(form.itemId);
      return itemId ? { action: a, itemId } : null;
    }
    case "retry_job": {
      const q = form.queue;
      const jobId = form.jobId;
      return isQueueName(q) && isJobId(jobId) ? { action: a, queue: q, jobId } : null;
    }
    default:
      return null;
  }
}

/** Where an action's audit row points: the clinic, and the item / job it touched. */
export function actionTarget(a: ActionInput): { clinicId: string | null; target: string | null } {
  if (a.action === "retry_video") return { clinicId: null, target: a.itemId };
  if (a.action === "retry_job") return { clinicId: null, target: `${a.queue}/${a.jobId}` };
  return { clinicId: a.clinicId, target: null };
}

/** What the flash banner says after an action. Codes travel in the redirect; text never does. */
export const ACTION_MESSAGES = {
  week_queued: "This week was queued at the front of the line.",
  week_promoted: "This week was already waiting; it now runs next.",
  week_running: "This week is being made right now; nothing changed.",
  week_made: "This week is already made. Retry single videos instead.",
  clinic_paused: "The clinic is paused from this panel; unpause it first.",
  no_clinic: "No such clinic.",
  queue_down: "The queue could not be reached (Redis). Nothing was queued.",
  video_requeued: "The video will be re-rendered (front of the line).",
  recording_requeued: "The recording will be processed again.",
  video_not_retryable: "This video cannot be re-rendered on its own (no stored plan or source). Requeue the week instead.",
  restyle_pending: "A re-render of this video is already queued.",
  no_item: "No such video.",
  ready_sent: "The \"videos ready\" email was sent again.",
  nothing_ready: "No ready or flagged videos to announce.",
  no_email: "The clinic's owner has no email address.",
  send_failed: "The email could not be sent (see Emails).",
  comp_recorded: "Recorded. Now apply the credit in the Dodo dashboard — this panel does not change billing.",
  paused: "Paused: no new weeks, recordings or re-renders until unpaused. Billing is unchanged (pause it in Dodo if needed).",
  unpaused: "Unpaused: the clinic is back in the weekly batch.",
  not_paused: "The clinic was not paused.",
  needs_migration: "Apply supabase/liman/0010_dentvid_admin.sql first.",
  job_retried: "The failed job was put back on its queue.",
  job_not_failed: "That job is not in the failed state any more.",
  no_job: "No such job (it may have been cleaned up).",
  queue_not_allowed: "Jobs on this queue are not retried from the panel.",
  bad_request: "The request was incomplete.",
  bad_csrf: "The form expired. Reload the page and try again.",
  bad_origin: "Refused: the form was not posted from this site.",
  not_confirmed: "Tick the confirmation box to go ahead.",
  rate_limited: "Too many actions in a short time. Wait a few minutes.",
  not_audited: "Done, but not audited: apply supabase/liman/0010_dentvid_admin.sql.",
  error: "Something went wrong; see the server log.",
} as const;
export type ActionCode = keyof typeof ACTION_MESSAGES;
export const isActionCode = (c: unknown): c is ActionCode => typeof c === "string" && Object.prototype.hasOwnProperty.call(ACTION_MESSAGES, c);

export type ActionResult = { outcome: "ok" | "refused" | "error"; code: ActionCode; clinicId?: string | null; detail?: string };

type JobLike = {
  getState(): Promise<string>;
  remove(): Promise<void>;
  retry?(state?: "failed" | "completed"): Promise<void>;
  changePriority?(o: { priority: number }): Promise<void>;
};
type QueueLike = { getJob(id: string): Promise<JobLike | undefined | null> };

export type ActionDeps = {
  db: Pick<SupabaseClient, "from">;
  dentvid: QueueLike & { add(name: string, data: unknown, opts: Record<string, unknown>): Promise<unknown> };
  queueFor: (name: QueueName) => QueueLike;
  sendReady: (clinicId: string, counts: { ready: number; flagged: number }) => Promise<ReadyNoticeResult>;
  now?: () => Date;
};

const ok = (code: ActionCode, clinicId?: string | null, detail?: string): ActionResult => ({ outcome: "ok", code, clinicId, detail });
const refused = (code: ActionCode, clinicId?: string | null, detail?: string): ActionResult => ({ outcome: "refused", code, clinicId, detail });

type ClinicRow = { id: string; plan: string; admin_paused_at?: string | null; profile?: { name?: string } | null };

async function clinic(deps: ActionDeps, id: string): Promise<ClinicRow | null> {
  const { data } = await deps.db.from("dentvid_clinics").select("*").eq("id", id).maybeSingle();
  return (data as ClinicRow | null) ?? null;
}

/** Usable videos (ready or flagged, with a file) already made for this clinic's week. */
async function usableThisWeek(deps: ActionDeps, clinicId: string, week: string): Promise<number> {
  const { data } = await deps.db.from("dentvid_items").select("status, video_path").eq("clinic_id", clinicId).eq("kind", "generated").eq("week_of", week);
  return ((data ?? []) as { status: string; video_path: string | null }[]).filter((r) => (r.status === "ready" || r.status === "flagged") && !!r.video_path).length;
}

/**
 * Requeue this week: what the clinic's own "make this week" button does
 * (api/dentvideo/week), with the same job id and FIRST_WEEK_JOB_OPTS, plus
 * the owner's override for a week that failed or produced nothing usable.
 */
async function requeueWeek(deps: ActionDeps, clinicId: string): Promise<ActionResult> {
  const c = await clinic(deps, clinicId);
  if (!c) return refused("no_clinic", clinicId);
  if (c.admin_paused_at) return refused("clinic_paused", clinicId);
  const week = deliveryWeek(deps.now?.() ?? new Date());
  const jobId = weekJobId(clinicId, week);
  try {
    const existing = await deps.dentvid.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === "active") return refused("week_running", clinicId);
      if (state === "waiting" || state === "prioritized" || state === "delayed" || state === "waiting-children") {
        await existing.changePriority?.({ priority: DENTVID_PRIORITY.firstWeek }).catch(() => {});
        return ok("week_promoted", clinicId, `${jobId} was ${state}`);
      }
      if (state === "completed" && (await usableThisWeek(deps, clinicId, week)) > 0) return refused("week_made", clinicId);
      // failed, or completed with nothing usable: clear the old job so the id can be used again.
      await existing.remove();
    }
    await deps.dentvid.add("week", { clinicId, count: WEEK_VIDEOS, week }, { jobId, ...FIRST_WEEK_JOB_OPTS });
    return ok("week_queued", clinicId, jobId);
  } catch (e) {
    return { outcome: "error", code: "queue_down", clinicId, detail: (e as Error).message };
  }
}

type ItemRow = { id: string; clinic_id: string; kind: string; status: string; plan: unknown; source_path: string | null; restyle_status?: string | null };

/**
 * Retry one video. A generated video with a stored plan is re-rendered (the
 * "restyle" job: same script, same compliance-checked text, new file; the
 * worker heals a row flagged only for its missing file). A recording is
 * processed again from its source. Anything else needs a new week.
 */
async function retryVideo(deps: ActionDeps, itemId: string): Promise<ActionResult> {
  const { data } = await deps.db.from("dentvid_items").select("*").eq("id", itemId).maybeSingle();
  const item = data as ItemRow | null;
  if (!item) return refused("no_item");
  const c = await clinic(deps, item.clinic_id);
  if (c?.admin_paused_at) return refused("clinic_paused", item.clinic_id);
  const now = (deps.now?.() ?? new Date()).toISOString();
  try {
    if (item.kind === "generated" && item.plan && typeof item.plan === "object") {
      if (item.restyle_status === "queued") return refused("restyle_pending", item.clinic_id);
      const { error } = await deps.db.from("dentvid_items").update({ restyle_status: "queued", restyle_requested_at: now }).eq("id", item.id);
      if (error && !missingSchema(error)) return { outcome: "error", code: "error", clinicId: item.clinic_id, detail: error.message };
      await deps.dentvid.add("restyle", { itemId: item.id }, { jobId: `restyle:${item.id}:${Date.parse(now)}`, ...RESTYLE_JOB_OPTS });
      return ok("video_requeued", item.clinic_id, item.id);
    }
    if (item.kind === "recording" && item.source_path) {
      await deps.dentvid.add("recording", { clinicId: item.clinic_id, sourcePath: item.source_path }, { jobId: `rec:${item.source_path}:retry:${Date.parse(now)}`, ...RECORDING_JOB_OPTS });
      return ok("recording_requeued", item.clinic_id, item.id);
    }
    return refused("video_not_retryable", item.clinic_id);
  } catch (e) {
    return { outcome: "error", code: "queue_down", clinicId: item.clinic_id, detail: (e as Error).message };
  }
}

/** The ready / flagged counts of the clinic's latest generated week (what the worker's notice would say). */
export function latestWeekCounts(rows: { week_of: string; status: string; video_path: string | null }[]): { week: string | null; ready: number; flagged: number } {
  const week = rows.reduce<string | null>((w, r) => (!w || r.week_of > w ? r.week_of : w), null);
  const mine = rows.filter((r) => r.week_of === week && !!r.video_path);
  return { week, ready: mine.filter((r) => r.status === "ready").length, flagged: mine.filter((r) => r.status === "flagged").length };
}

async function resendReady(deps: ActionDeps, clinicId: string): Promise<ActionResult> {
  const c = await clinic(deps, clinicId);
  if (!c) return refused("no_clinic", clinicId);
  const { data } = await deps.db.from("dentvid_items").select("week_of, status, video_path").eq("clinic_id", clinicId).eq("kind", "generated").order("week_of", { ascending: false }).limit(40);
  const counts = latestWeekCounts((data ?? []) as { week_of: string; status: string; video_path: string | null }[]);
  if (!counts.ready && !counts.flagged) return refused("nothing_ready", clinicId);
  const res = await deps.sendReady(clinicId, { ready: counts.ready, flagged: counts.flagged });
  if (res.sent) return ok("ready_sent", clinicId, `week ${counts.week}: ${counts.ready} ready, ${counts.flagged} flagged`);
  if (res.reason === "no email") return refused("no_email", clinicId);
  if (res.reason === "nothing ready") return refused("nothing_ready", clinicId);
  return { outcome: "error", code: "send_failed", clinicId };
}

async function setPause(deps: ActionDeps, clinicId: string, pause: boolean, why: string): Promise<ActionResult> {
  const c = await clinic(deps, clinicId);
  if (!c) return refused("no_clinic", clinicId);
  if (!("admin_paused_at" in c)) return refused("needs_migration", clinicId);
  if (!pause && !c.admin_paused_at) return refused("not_paused", clinicId);
  const now = (deps.now?.() ?? new Date()).toISOString();
  const { error } = await deps.db
    .from("dentvid_clinics")
    .update(pause ? { admin_paused_at: c.admin_paused_at ?? now, admin_pause_note: why || null } : { admin_paused_at: null, admin_pause_note: null })
    .eq("id", clinicId);
  if (error) return missingSchema(error) ? refused("needs_migration", clinicId) : { outcome: "error", code: "error", clinicId, detail: error.message };
  return ok(pause ? "paused" : "unpaused", clinicId);
}

async function retryJob(deps: ActionDeps, queue: QueueName, jobId: string): Promise<ActionResult> {
  if (!RETRYABLE_QUEUES.includes(queue)) return refused("queue_not_allowed");
  try {
    const job = await deps.queueFor(queue).getJob(jobId);
    if (!job) return refused("no_job");
    const state = await job.getState();
    if (state !== "failed") return refused("job_not_failed", null, state);
    await job.retry?.("failed");
    return ok("job_retried", null, `${queue}/${jobId}`);
  } catch (e) {
    return { outcome: "error", code: "queue_down", detail: (e as Error).message };
  }
}

export async function runAdminAction(a: ActionInput, deps: ActionDeps): Promise<ActionResult> {
  try {
    switch (a.action) {
      case "requeue_week":
        return await requeueWeek(deps, a.clinicId);
      case "retry_video":
        return await retryVideo(deps, a.itemId);
      case "resend_ready":
        return await resendReady(deps, a.clinicId);
      case "comp_month": {
        // Record only: real credits and refunds happen in Dodo.
        const c = await clinic(deps, a.clinicId);
        return c ? ok("comp_recorded", a.clinicId, `${a.months} month(s): ${a.note}`) : refused("no_clinic", a.clinicId);
      }
      case "pause":
        return await setPause(deps, a.clinicId, true, a.note);
      case "unpause":
        return await setPause(deps, a.clinicId, false, "");
      case "retry_job":
        return await retryJob(deps, a.queue, a.jobId);
    }
  } catch (e) {
    return { outcome: "error", code: "error", detail: (e as Error).message };
  }
}

/** The audit params of an action (no secrets in any of them; notes are the owner's own words). */
export function actionParams(a: ActionInput): Record<string, unknown> {
  const { action: _a, ...rest } = a;
  return rest;
}
