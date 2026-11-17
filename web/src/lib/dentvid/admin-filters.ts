/**
 * The admin panel's list filters, parsed from the query string and applied
 * to rows already loaded. Pure: every filter is unit-tested, and an unknown
 * or malformed value is ignored rather than trusted.
 */
import type { AdminClinic, AdminItem, ClinicRun } from "./admin-metrics";

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? "" : v ?? "").trim();

const LANG = /^[a-z]{2}$/;
const COUNTRY = /^[A-Z]{2}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (d: string) => DAY_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/* ------------------------------------------------------------ date range */

export type DateRange = { from: Date; to: Date; days: number; key: string; label: string };
export const RANGE_PRESETS = [1, 7, 30, 90] as const;
const DAY = 86_400_000;

/**
 * ?days=1|7|30|90 (default `fallbackDays`), or ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * (UTC days, inclusive, at most a year, `to` not after today).
 */
export function parseRange(sp: Params, now: Date, fallbackDays = 30): DateRange {
  const from = one(sp.from);
  const to = one(sp.to);
  if (validDay(from)) {
    const end = validDay(to) ? Math.min(Date.parse(`${to}T00:00:00Z`) + DAY - 1, now.getTime()) : now.getTime();
    const start = Date.parse(`${from}T00:00:00Z`);
    if (start < end && end - start <= 366 * DAY) {
      const days = Math.max(1, Math.ceil((end - start) / DAY));
      const toDay = new Date(end).toISOString().slice(0, 10);
      return { from: new Date(start), to: new Date(end), days, key: `${from}..${toDay}`, label: `${from} → ${toDay}` };
    }
  }
  const d = Number(one(sp.days));
  const days = (RANGE_PRESETS as readonly number[]).includes(d) ? d : fallbackDays;
  return { from: new Date(now.getTime() - days * DAY), to: now, days, key: `${days}d`, label: days === 1 ? "last 24 hours" : `last ${days} days` };
}

/* ---------------------------------------------------------------- clinics */

export const CLINIC_PLANS = ["trial", "active", "paused", "cancelled", "admin_paused"] as const;
export type ClinicFilter = {
  q: string;
  plan: (typeof CLINIC_PLANS)[number] | null;
  language: string | null;
  country: string | null;
  createdDays: number | null;
  source: string | null;
  sort: "created" | "activity" | "name";
};

export function parseClinicFilter(sp: Params): ClinicFilter {
  const plan = one(sp.plan);
  const lang = one(sp.language).toLowerCase();
  const cc = one(sp.country).toUpperCase();
  const created = Number(one(sp.created));
  const sort = one(sp.sort);
  return {
    q: one(sp.q).slice(0, 80),
    plan: (CLINIC_PLANS as readonly string[]).includes(plan) ? (plan as ClinicFilter["plan"]) : null,
    language: LANG.test(lang) ? lang : null,
    country: COUNTRY.test(cc) ? cc : null,
    createdDays: [1, 7, 30, 90, 365].includes(created) ? created : null,
    source: one(sp.source).slice(0, 120) || null,
    sort: sort === "activity" || sort === "name" ? sort : "created",
  };
}

export type ClinicRowView = AdminClinic & {
  admin_paused_at?: string | null;
  lastActivity: string | null;
  source: string | null;
  run?: ClinicRun;
};

export function filterClinics(rows: ClinicRowView[], f: ClinicFilter, now: Date): ClinicRowView[] {
  const q = f.q.toLowerCase();
  const out = rows.filter((c) => {
    if (q && !`${c.profile?.name ?? ""} ${c.id} ${c.dodo_subscription_id ?? ""}`.toLowerCase().includes(q)) return false;
    if (f.plan === "admin_paused" ? !c.admin_paused_at : f.plan && c.plan !== f.plan) return false;
    if (f.language && c.profile?.language !== f.language) return false;
    if (f.country && c.profile?.country !== f.country) return false;
    if (f.createdDays && Date.parse(c.created_at) < now.getTime() - f.createdDays * DAY) return false;
    if (f.source) {
      const s = f.source.toLowerCase();
      const mine = (c.source ?? "(direct / none)").toLowerCase();
      if (!mine.includes(s)) return false;
    }
    return true;
  });
  const by = {
    created: (a: ClinicRowView, b: ClinicRowView) => b.created_at.localeCompare(a.created_at),
    activity: (a: ClinicRowView, b: ClinicRowView) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "") || b.created_at.localeCompare(a.created_at),
    name: (a: ClinicRowView, b: ClinicRowView) => (a.profile?.name ?? "").localeCompare(b.profile?.name ?? ""),
  }[f.sort];
  return out.sort(by);
}

/** Last activity per clinic: the newest of its events, its items' updates and its own creation. */
export function lastActivity(clinics: Pick<AdminClinic, "id" | "created_at">[], events: { clinic_id: string | null; created_at: string }[], items: Pick<AdminItem, "clinic_id" | "updated_at">[]): Map<string, string> {
  const out = new Map<string, string>();
  const bump = (id: string | null, at: string) => {
    if (!id) return;
    const cur = out.get(id);
    if (!cur || at > cur) out.set(id, at);
  };
  for (const c of clinics) bump(c.id, c.created_at);
  for (const e of events) bump(e.clinic_id, e.created_at);
  for (const i of items) bump(i.clinic_id, i.updated_at);
  return out;
}

/* ----------------------------------------------------------------- videos */

export const VIDEO_STATUSES = ["queued", "working", "ready", "flagged", "rejected", "failed", "problem"] as const;
export type VideoFilter = {
  status: (typeof VIDEO_STATUSES)[number] | null;
  language: string | null;
  country: string | null;
  week: string | null;
  kind: "generated" | "recording" | null;
  clinicId: string | null;
};

export function parseVideoFilter(sp: Params): VideoFilter {
  const status = one(sp.status);
  const lang = one(sp.language).toLowerCase();
  const cc = one(sp.country).toUpperCase();
  const week = one(sp.week);
  const kind = one(sp.kind);
  const clinic = one(sp.clinic);
  return {
    status: (VIDEO_STATUSES as readonly string[]).includes(status) ? (status as VideoFilter["status"]) : null,
    language: LANG.test(lang) ? lang : null,
    country: COUNTRY.test(cc) ? cc : null,
    week: validDay(week) ? week : null,
    kind: kind === "generated" || kind === "recording" ? kind : null,
    clinicId: /^[0-9a-f-]{36}$/i.test(clinic) ? clinic.toLowerCase() : null,
  };
}

export type VideoRow = AdminItem & { findings?: unknown; video_path?: string | null };

/**
 * Needs the owner: failed, rejected for a technical reason, or flagged
 * without a stored file. A flagged video awaiting the dentist's review is
 * normal and not a problem.
 */
export function isProblemVideo(i: Pick<VideoRow, "status" | "error" | "findings" | "video_path">): boolean {
  if (i.status === "failed") return true;
  if (i.status === "rejected" && !!i.error) return true;
  const f = Array.isArray(i.findings) ? (i.findings as unknown[]) : [];
  if (i.status === "flagged" && (f.includes("the video file is missing") || i.video_path === null)) return true;
  return false;
}

const RANK: Record<string, number> = { failed: 0, flagged: 1, rejected: 2, working: 3, queued: 4, ready: 5 };

/** Filtered, problems and flagged first, then newest. */
export function filterVideos<T extends VideoRow>(items: T[], f: VideoFilter, clinicOf: (id: string) => Pick<AdminClinic, "profile"> | undefined): T[] {
  return items
    .filter((i) => {
      if (f.status === "problem" ? !isProblemVideo(i) : f.status && i.status !== f.status) return false;
      if (f.week && i.week_of !== f.week) return false;
      if (f.kind && i.kind !== f.kind) return false;
      if (f.clinicId && i.clinic_id !== f.clinicId) return false;
      if (f.language || f.country) {
        const p = clinicOf(i.clinic_id)?.profile;
        if (f.language && p?.language !== f.language) return false;
        if (f.country && p?.country !== f.country) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const pa = isProblemVideo(a) ? -1 : RANK[a.status] ?? 9;
      const pb = isProblemVideo(b) ? -1 : RANK[b.status] ?? 9;
      return pa - pb || b.updated_at.localeCompare(a.updated_at);
    });
}

/** A query string from a filter object, dropping empty values (for links that keep the other filters). */
export function qs(params: Record<string, string | number | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
