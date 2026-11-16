import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";

/**
 * The library after a plan ends: 90 days of read and download access, then
 * the clinic's videos and files are deleted (docs/SUPPORT.md, /help
 * after-cancel, privacy policy "How long we keep data").
 *
 * Daily (RETENTION_SCHEDULE, on the light dentvid-mail queue), for clinics
 * whose plan is "cancelled" — and only those: active, paused (a payment
 * problem) and trial clinics are never looked at beyond clearing dates:
 *
 *   stamp    plan_ended_at := now, the first time an ended plan is seen
 *            (plan-end.ts sets it to the paid period's end when it ends a
 *            plan itself). Never earlier than the real end, so the 90 days
 *            are never shortened.
 *   notice   14 days before: an email in the clinic's language (web:
 *            /api/internal/dentvideo/retention, lib/dentvid/retention-email),
 *            and library_delete_after := max(ended + 90 days, now + 14 days),
 *            so a clinic always has at least 14 days' notice; 1 day before:
 *            a last email.
 *   delete   on or after library_delete_after, once the 1-day email went out
 *            (or cannot go out at all: no address): every video row of the
 *            clinic, its topic and change requests, and every file in its
 *            storage folder except its current logo. Settings, logo and login
 *            stay, so the clinic can choose a plan again.
 *   clear    a clinic that subscribed again (plan no longer cancelled) loses
 *            its dates; a later end starts a new 90 days and new emails.
 *
 * Idempotent: every step is conditional on the row as it is now (a second
 * run, or a second worker, changes nothing), the clinic is re-read right
 * before deletion, and a deleted library is marked (library_deleted_at).
 *
 * DENTVID_RETENTION_MODE: "delete" (default — nothing can be deleted before
 * 90 days after the first stamp, i.e. after 0025 is applied), "dry-run"
 * (no writes, no email: the owner alert says what would happen) or "off".
 * The owner gets an alert with the counts whenever anything was deleted, is
 * due in a dry run, or failed.
 */

export const RETENTION_DAYS = 90;
export const NOTICE_DAYS = [14, 1] as const;
export type NoticeDays = (typeof NOTICE_DAYS)[number];
/** Daily, mid-morning UTC (inside most clinics' daytime, like the other mail). */
export const RETENTION_SCHEDULE = { pattern: "41 9 * * *", tz: "UTC" } as const;

const DAY = 86_400_000;

export type RetentionMode = "off" | "dry-run" | "delete";

export function retentionMode(env: Record<string, string | undefined> = process.env): RetentionMode {
  const v = (env.DENTVID_RETENTION_MODE ?? "").trim().toLowerCase();
  if (v === "off" || v === "0" || v === "false") return "off";
  if (v === "dry-run" || v === "dry" || v === "dryrun") return "dry-run";
  return "delete";
}

export type RetentionClinic = {
  id: string;
  owner_id: string;
  plan: string;
  logo_path: string | null;
  plan_ended_at: string | null;
  library_delete_after: string | null;
  library_deleted_at: string | null;
};

/** "retention14_2026_11_16": the email log kind of a notice for the plan that ended that day (web claims it when sending). */
export function noticeKind(days: NoticeDays, endedAt: string): string {
  return `retention${days}_${endedAt.slice(0, 10).replace(/-/g, "_")}`;
}

export type RetentionStep =
  | { kind: "none" }
  | { kind: "clear" }
  | { kind: "stamp" }
  | { kind: "notice"; days: NoticeDays; deleteOn: Date }
  | { kind: "delete"; deleteOn: Date };

const time = (s: string | null | undefined) => (s ? Date.parse(s) : NaN);

/** When the library may go: never before plan end + 90 days, never before the 14-day notice's date. */
export function deleteDate(c: Pick<RetentionClinic, "plan_ended_at" | "library_delete_after">): Date | null {
  const ended = time(c.plan_ended_at);
  if (!Number.isFinite(ended)) return null;
  const earliest = ended + RETENTION_DAYS * DAY;
  const after = time(c.library_delete_after);
  return new Date(Number.isFinite(after) ? Math.max(earliest, after) : earliest);
}

/**
 * What the run does for one clinic now. Pure. `sent` holds the email log
 * kinds already claimed for this clinic.
 */
export function retentionStep(c: RetentionClinic, sent: Set<string>, now: Date): RetentionStep {
  if (c.plan !== "cancelled") return c.plan_ended_at || c.library_delete_after ? { kind: "clear" } : { kind: "none" };
  const ended = time(c.plan_ended_at);
  if (!Number.isFinite(ended)) return { kind: "stamp" };
  // This plan's library is already gone.
  const deleted = time(c.library_deleted_at);
  if (Number.isFinite(deleted) && deleted >= ended) return { kind: "none" };
  const at = deleteDate(c)!;
  const t = now.getTime();
  if (!c.library_delete_after) {
    // Nobody was told yet: the 14-day notice first, and never less than 14 days before deletion.
    if (t >= at.getTime() - 14 * DAY) return { kind: "notice", days: 14, deleteOn: new Date(Math.max(at.getTime(), t + 14 * DAY)) };
    return { kind: "none" };
  }
  if (t < at.getTime() - DAY) return { kind: "none" };
  if (!sent.has(noticeKind(1, c.plan_ended_at!))) return { kind: "notice", days: 1, deleteOn: at };
  return t >= at.getTime() ? { kind: "delete", deleteOn: at } : { kind: "none" };
}

export type LibraryItemRow = { id: string; video_path: string | null; thumb_path: string | null; source_path: string | null };

export interface RetentionDb {
  /** Cancelled clinics, and any clinic that still carries retention dates. null: 0025 not applied. */
  clinics(): Promise<RetentionClinic[] | null>;
  /** The email log kinds starting with "retention" for these clinics. */
  sentNotices(clinicIds: string[]): Promise<Map<string, Set<string>>>;
  clinic(id: string): Promise<RetentionClinic | null>;
  /** plan_ended_at := at, only while the plan is cancelled and the date is unset. */
  stamp(id: string, at: Date): Promise<boolean>;
  /** Dates cleared, only while the plan is not cancelled. */
  clear(id: string): Promise<boolean>;
  /** library_delete_after := at, only for this ended plan, while cancelled. */
  setDeleteAfter(id: string, endedAt: string, at: Date): Promise<boolean>;
  /** The clinic's video rows and every file in its storage folder. */
  library(c: RetentionClinic): Promise<{ items: LibraryItemRow[]; files: string[] }>;
  /** Removes the files, then the video rows and the clinic's requests. */
  deleteLibrary(c: RetentionClinic, files: string[]): Promise<{ items: number; files: number }>;
  /** library_deleted_at := at, only while cancelled on this ended plan and not deleted for it yet; true when it moved. */
  markDeleted(id: string, endedAt: string, at: Date): Promise<boolean>;
  /** Undo a mark whose deletion failed half-way (the next run deletes the rest). */
  unmarkDeleted(id: string, at: Date): Promise<void>;
}

/** What the web app said about a notice: sent; or not, and whether trying again could help. */
export type NoticeOutcome = { sent: boolean; final: boolean; reason: string };
export type NoticeSender = (clinicId: string, days: NoticeDays, deleteOn: Date, endedAt: string) => Promise<NoticeOutcome>;

export type RetentionResult = {
  mode: RetentionMode;
  checked: number;
  stamped: number;
  cleared: number;
  noticed: number;
  deleted: { clinics: number; items: number; files: number };
  /** Dry run: what would be deleted now. */
  due: { clinics: number; items: number; files: number };
  errors: string[];
  stopped?: "off" | "migration missing";
};

/** A file this clinic may lose: inside its own folder, no traversal, not its current logo. */
export function deletableFile(path: string, c: Pick<RetentionClinic, "owner_id" | "logo_path">): boolean {
  const owner = c.owner_id.toLowerCase();
  if (!path.toLowerCase().startsWith(`${owner}/`)) return false;
  if (path.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return false;
  return path !== c.logo_path;
}

export async function runRetention(deps: { db: RetentionDb; notify: NoticeSender; mode?: RetentionMode; now?: Date }): Promise<RetentionResult> {
  const mode = deps.mode ?? retentionMode();
  const now = deps.now ?? new Date();
  const res: RetentionResult = { mode, checked: 0, stamped: 0, cleared: 0, noticed: 0, deleted: { clinics: 0, items: 0, files: 0 }, due: { clinics: 0, items: 0, files: 0 }, errors: [] };
  if (mode === "off") return { ...res, stopped: "off" };
  const clinics = await deps.db.clinics();
  if (!clinics) {
    logger.warn("dentvid: retention skipped — supabase/liman/0025_dentvid_clinic_requests.sql not applied");
    return { ...res, stopped: "migration missing" };
  }
  res.checked = clinics.length;
  const sent = await deps.db.sentNotices(clinics.filter((c) => c.plan === "cancelled").map((c) => c.id));
  const dry = mode === "dry-run";
  for (const c of clinics) {
    try {
      const step = retentionStep(c, sent.get(c.id) ?? new Set(), now);
      if (step.kind === "none") continue;
      if (step.kind === "clear") {
        if (!dry && (await deps.db.clear(c.id))) res.cleared++;
        continue;
      }
      if (step.kind === "stamp") {
        if (!dry && (await deps.db.stamp(c.id, now))) res.stamped++;
        continue;
      }
      const ended = c.plan_ended_at!;
      if (step.kind === "notice") {
        if (dry) continue;
        const out = await deps.notify(c.id, step.days, step.deleteOn, ended);
        if (out.sent) res.noticed++;
        if (step.days === 14) {
          // Sent, or it never can be (no address): the date is fixed now. A passing failure tries again tomorrow.
          if (out.sent || out.final) await deps.db.setDeleteAfter(c.id, ended, step.deleteOn);
        } else if (!out.sent && out.final) {
          // The last notice cannot be sent at all: the date stands (the 14-day one went out or could not either).
          sent.set(c.id, new Set([...(sent.get(c.id) ?? []), noticeKind(1, ended)]));
          const again = retentionStep(c, sent.get(c.id)!, now);
          if (again.kind === "delete") await deleteOne(deps.db, c, now, res);
        } else if (out.sent && now.getTime() >= step.deleteOn.getTime()) {
          // The run that should have sent it was missed: one more day after the last notice.
          await deps.db.setDeleteAfter(c.id, ended, new Date(now.getTime() + DAY));
        }
        continue;
      }
      if (dry) {
        const lib = await deps.db.library(c);
        res.due.clinics++;
        res.due.items += lib.items.length;
        res.due.files += lib.files.filter((f) => deletableFile(f, c)).length;
        continue;
      }
      await deleteOne(deps.db, c, now, res);
    } catch (e) {
      const msg = `${c.id}: ${(e as Error).message}`.slice(0, 300);
      res.errors.push(msg);
      logger.error({ clinicId: c.id, err: (e as Error).message }, "dentvid: retention step failed");
    }
  }
  return res;
}

/** Whether a run is worth an owner alert: something was deleted, is due in a dry run, or failed. */
export function retentionAlertDue(r: RetentionResult): boolean {
  if (r.stopped) return false;
  return r.deleted.clinics > 0 || (r.mode === "dry-run" && r.due.clinics > 0) || r.errors.length > 0;
}

async function deleteOne(db: RetentionDb, c: RetentionClinic, now: Date, res: RetentionResult): Promise<void> {
  // Re-read: the clinic may have subscribed again, or been deleted, since the list was made.
  const fresh = await db.clinic(c.id);
  if (!fresh || fresh.plan !== "cancelled" || fresh.plan_ended_at !== c.plan_ended_at) return;
  const at = deleteDate(fresh);
  if (!at || now.getTime() < at.getTime()) return;
  const lib = await db.library(fresh);
  const files = lib.files.filter((f) => deletableFile(f, fresh));
  // Claim the deletion in one conditional write (still cancelled, same ended plan, not yet deleted):
  // a re-subscription that landed while the library was being listed stops it here.
  if (!(await db.markDeleted(fresh.id, fresh.plan_ended_at!, now))) return;
  let done: { items: number; files: number };
  try {
    done = await db.deleteLibrary(fresh, files);
  } catch (e) {
    // Not finished: un-mark it so tomorrow's run tries again.
    await db.unmarkDeleted(fresh.id, now).catch(() => {});
    throw e;
  }
  res.deleted.clinics++;
  res.deleted.items += done.items;
  res.deleted.files += done.files;
  logger.info({ clinicId: fresh.id, items: done.items, files: done.files }, "dentvid: library deleted after the retention period");
}

/* -------------------------------------------------------------- Liman (Supabase) */

const BUCKET = "dentvid";
const COLS = "id, owner_id, plan, logo_path, plan_ended_at, library_delete_after, library_deleted_at";
const missing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42703" || e.code === "42P01" || e.code === "PGRST204" || /column .* does not exist|Could not find the .* column/i.test(e.message ?? ""));

export function supabaseRetentionDb(db: SupabaseClient): RetentionDb {
  return {
    async clinics() {
      const { data, error } = await db.from("dentvid_clinics").select(COLS).or("plan.eq.cancelled,plan_ended_at.not.is.null,library_delete_after.not.is.null").limit(5000);
      if (error) {
        if (missing(error)) return null;
        throw new Error(`retention: clinics: ${error.message}`);
      }
      return (data ?? []) as RetentionClinic[];
    },
    async sentNotices(ids) {
      const out = new Map<string, Set<string>>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await db.from("dentvid_email_log").select("clinic_id, kind").in("clinic_id", ids.slice(i, i + 200)).like("kind", "retention%");
        if (error) throw new Error(`retention: email log: ${error.message}`);
        for (const r of (data ?? []) as { clinic_id: string; kind: string }[]) (out.get(r.clinic_id) ?? out.set(r.clinic_id, new Set()).get(r.clinic_id)!).add(r.kind);
      }
      return out;
    },
    async clinic(id) {
      const { data, error } = await db.from("dentvid_clinics").select(COLS).eq("id", id).maybeSingle();
      if (error) throw new Error(`retention: clinic: ${error.message}`);
      return (data as RetentionClinic | null) ?? null;
    },
    async stamp(id, at) {
      const { data, error } = await db.from("dentvid_clinics").update({ plan_ended_at: at.toISOString() }).eq("id", id).eq("plan", "cancelled").is("plan_ended_at", null).select("id");
      if (error) throw new Error(`retention: stamp: ${error.message}`);
      return (data ?? []).length > 0;
    },
    async clear(id) {
      const { data, error } = await db.from("dentvid_clinics").update({ plan_ended_at: null, library_delete_after: null }).eq("id", id).neq("plan", "cancelled").select("id");
      if (error) throw new Error(`retention: clear: ${error.message}`);
      return (data ?? []).length > 0;
    },
    async setDeleteAfter(id, endedAt, at) {
      const { data, error } = await db.from("dentvid_clinics").update({ library_delete_after: at.toISOString() }).eq("id", id).eq("plan", "cancelled").eq("plan_ended_at", endedAt).select("id");
      if (error) throw new Error(`retention: delete date: ${error.message}`);
      return (data ?? []).length > 0;
    },
    async library(c) {
      const { data, error } = await db.from("dentvid_items").select("id, video_path, thumb_path, source_path").eq("clinic_id", c.id).limit(10000);
      if (error) throw new Error(`retention: items: ${error.message}`);
      const items = (data ?? []) as LibraryItemRow[];
      const files: string[] = [];
      const queue = [c.owner_id.toLowerCase()];
      while (queue.length && files.length < 20000) {
        const prefix = queue.shift()!;
        for (let offset = 0; ; offset += 1000) {
          const { data: list, error: le } = await db.storage.from(BUCKET).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
          if (le) throw new Error(`retention: storage list: ${le.message}`);
          for (const e of list ?? []) {
            if (!e.name || e.name.includes("/") || e.name === "." || e.name === "..") continue;
            const p = `${prefix}/${e.name}`;
            if (e.id == null) {
              if (prefix.split("/").length < 3) queue.push(p);
            } else files.push(p);
          }
          if ((list ?? []).length < 1000) break;
        }
      }
      // Paths on rows that the listing missed (it never should) go too, if they are the clinic's own.
      for (const i of items) for (const p of [i.video_path, i.thumb_path, i.source_path]) if (p && !files.includes(p)) files.push(p);
      return { items, files };
    },
    async deleteLibrary(c, files) {
      let removed = 0;
      for (let i = 0; i < files.length; i += 100) {
        const chunk = files.slice(i, i + 100).filter((f) => deletableFile(f, c));
        if (!chunk.length) continue;
        const { error } = await db.storage.from(BUCKET).remove(chunk);
        if (error) throw new Error(`retention: remove files: ${error.message}`);
        removed += chunk.length;
      }
      // Requests first (change requests also go with their items); a database without them is fine.
      await db.from("dentvid_change_requests").delete().eq("clinic_id", c.id).then(() => {}, () => {});
      await db.from("dentvid_topic_requests").delete().eq("clinic_id", c.id).then(() => {}, () => {});
      const { data, error } = await db.from("dentvid_items").delete().eq("clinic_id", c.id).select("id");
      if (error) throw new Error(`retention: delete items: ${error.message}`);
      return { items: (data ?? []).length, files: removed };
    },
    async markDeleted(id, endedAt, at) {
      const { data, error } = await db
        .from("dentvid_clinics")
        .update({ library_deleted_at: at.toISOString() })
        .eq("id", id)
        .eq("plan", "cancelled")
        .eq("plan_ended_at", endedAt)
        .or(`library_deleted_at.is.null,library_deleted_at.lt."${endedAt}"`)
        .select("id");
      if (error) throw new Error(`retention: mark deleted: ${error.message}`);
      return (data ?? []).length > 0;
    },
    async unmarkDeleted(id, at) {
      await db.from("dentvid_clinics").update({ library_deleted_at: null }).eq("id", id).eq("library_deleted_at", at.toISOString());
    },
  };
}

/* ------------------------------------------------------------------ notices */

/**
 * Asks the web app to email a retention notice (it owns the copy, the
 * languages and the email log): /api/internal/dentvideo/retention. Never throws.
 */
export function webNoticeSender(fetchImpl: typeof fetch = fetch): NoticeSender {
  return async (clinicId, days, deleteOn, endedAt) => {
    const token = process.env.WORKER_INTERNAL_TOKEN;
    const base = (process.env.DENTVIDEO_APP_URL || "https://dentvideo.com").replace(/\/+$/, "");
    if (!token) return { sent: false, final: false, reason: "no WORKER_INTERNAL_TOKEN" };
    try {
      const res = await fetchImpl(`${base}/api/internal/dentvideo/retention`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ clinicId, days, deleteOn: deleteOn.toISOString(), endedAt }),
        signal: AbortSignal.timeout(20_000),
      });
      const body = (await res.json().catch(() => ({}))) as { sent?: boolean; reason?: string; final?: boolean };
      if (res.ok && body.sent) return { sent: true, final: false, reason: "sent" };
      if (res.ok && body.reason) return { sent: false, final: body.final === true, reason: body.reason };
      return { sent: false, final: false, reason: `HTTP ${res.status}` };
    } catch (e) {
      return { sent: false, final: false, reason: (e as Error).message.slice(0, 200) };
    }
  };
}
