import type { SupabaseClient } from "@supabase/supabase-js";
import { dvAdmin } from "./supabase";
import { loadAdminData, loadDodoFoundingUses, loadSpend, type AdminData, type SpendState } from "./admin-server";
import { loadAdminActions, missingSchema, type AuditRow } from "./admin-audit";
import { readSystem, emptySnapshot, type SystemSnapshot } from "./admin-system-server";
import { signAdminPaths } from "./admin-signed";
import { clinicSources, lastRuns, type AdminClinic, type AdminEvent, type AdminItem } from "./admin-metrics";
import { lastActivity, type ClinicRowView, type VideoRow } from "./admin-filters";
import { billingIssues, type EmailLogRow, type EmailSendRow, type PaymentRow, type SubRow } from "./admin-ops";
import { costOver } from "./admin-system";

/**
 * What each admin screen shows, loaded with the service role on the server
 * for every request. Each source fails soft: a missing table (a migration not
 * applied yet) or an unreachable Redis becomes a note on the page, not an error.
 */

const DAY = 86_400_000;

function db(): SupabaseClient | null {
  try {
    return dvAdmin();
  } catch {
    return null;
  }
}

type Q<T> = { rows: T[]; missing: boolean; error?: string };

async function rows<T>(p: PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>): Promise<Q<T>> {
  try {
    const { data, error } = await p;
    if (error) return { rows: [], missing: missingSchema(error), error: missingSchema(error) ? undefined : error.message };
    return { rows: (data ?? []) as T[], missing: false };
  } catch (e) {
    return { rows: [], missing: false, error: (e as Error).message };
  }
}

/* --------------------------------------------------------------- overview */

export type OverviewData = AdminData & {
  system: SystemSnapshot;
  subs: SubRow[];
  subsTable: boolean;
  emailFailures: number | null;
  cost: { today: number; d7: number; d30: number; tracked: boolean };
};

export async function loadOverview(now = new Date()): Promise<OverviewData> {
  const c = db();
  const [data, system, subs, sends] = await Promise.all([
    loadAdminData(now),
    readSystem(now),
    c ? rows<SubRow>(c.from("dentvid_subscriptions").select("*").order("updated_at", { ascending: false }).limit(2000)) : Promise.resolve({ rows: [], missing: true } as Q<SubRow>),
    c
      ? rows<{ id: number }>(c.from("dentvid_email_sends").select("id").eq("status", "failed").gte("created_at", new Date(now.getTime() - 7 * DAY).toISOString()).limit(500))
      : Promise.resolve({ rows: [], missing: true } as Q<{ id: number }>),
  ]);
  const byDay = new Map(system.costByDay);
  if (!byDay.size && data.spend.spentTodayUsd !== null) byDay.set(now.toISOString().slice(0, 10), data.spend.spentTodayUsd);
  return {
    ...data,
    system,
    subs: subs.rows,
    subsTable: !subs.missing,
    emailFailures: sends.missing ? null : sends.rows.length,
    cost: { today: costOver(byDay, 1, now), d7: costOver(byDay, 7, now), d30: costOver(byDay, 30, now), tracked: system.costByDay.length > 0 },
  };
}

/* ---------------------------------------------------------------- clinics */

export type ClinicsData = { now: string; rows: ClinicRowView[]; warnings: string[] };

export async function loadClinicsList(now = new Date()): Promise<ClinicsData> {
  const data = await loadAdminData(now, { eventDays: 90, itemDays: 60 });
  const activity = lastActivity(data.clinics, data.events, data.items);
  const sources = clinicSources(data.events);
  const runs = lastRuns(data.items);
  return {
    now: data.now,
    warnings: data.warnings,
    rows: data.clinics.map((c) => ({ ...c, lastActivity: activity.get(c.id) ?? null, source: sources.get(c.id) ?? null, run: runs.get(c.id) })),
  };
}

/* ---------------------------------------------------------- clinic detail */

export type DetailItem = {
  id: string;
  kind: string;
  status: string;
  approval: string;
  approval_note?: string | null;
  title: string;
  week_of: string;
  created_at: string;
  updated_at: string;
  error?: string | null;
  findings?: unknown;
  checks?: unknown;
  copy?: { caption?: string; hashtags?: string[] } | null;
  spoken?: string | null;
  plan?: { voiceover?: { text?: string } | string; scenes?: unknown[] } | null;
  qa?: unknown;
  video_path?: string | null;
  thumb_path?: string | null;
  source_path?: string | null;
  restyle_status?: string | null;
  videoUrl?: string;
  thumbUrl?: string;
};

export type ClinicDetail = {
  now: string;
  clinic: AdminClinic & { owner_id: string; logo_path?: string | null; updated_at?: string; email_opt_out_at?: string | null; plan_renews_at?: string | null; admin_pause_note?: string | null };
  ownerEmail: string | null;
  logoUrl?: string;
  items: DetailItem[];
  events: AdminEvent[];
  emailLog: EmailLogRow[];
  emailSends: EmailSendRow[] | null;
  subs: SubRow[] | null;
  payments: PaymentRow[] | null;
  actions: AuditRow[] | null;
  /** The pause columns exist (0010 applied). */
  pauseColumn: boolean;
  signedTtlSec: number;
};

export async function loadClinicDetail(id: string, now = new Date()): Promise<ClinicDetail | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const c = db();
  if (!c) return null;
  const { data: clinic } = await c.from("dentvid_clinics").select("*").eq("id", id).maybeSingle();
  if (!clinic) return null;
  const [items, events, emailLog, emailSends, subs, payments, actions, owner] = await Promise.all([
    rows<DetailItem>(c.from("dentvid_items").select("*").eq("clinic_id", id).order("created_at", { ascending: false }).limit(60)),
    rows<AdminEvent>(c.from("dentvid_events").select("name, locale, props, clinic_id, created_at").eq("clinic_id", id).order("created_at", { ascending: false }).limit(300)),
    rows<EmailLogRow>(c.from("dentvid_email_log").select("clinic_id, kind, sent_at").eq("clinic_id", id).order("sent_at", { ascending: false }).limit(50)),
    rows<EmailSendRow>(c.from("dentvid_email_sends").select("*").eq("clinic_id", id).order("created_at", { ascending: false }).limit(50)),
    rows<SubRow>(c.from("dentvid_subscriptions").select("*").eq("clinic_id", id).order("created_at", { ascending: false }).limit(20)),
    rows<PaymentRow>(c.from("dentvid_payments").select("*").eq("clinic_id", id).order("created_at", { ascending: false }).limit(50)),
    loadAdminActions(c, { clinicId: id, limit: 50 }),
    c.auth.admin.getUserById(clinic.owner_id as string).catch(() => ({ data: { user: null } })),
  ]);
  const { ADMIN_SIGNED_URL_TTL_SEC } = await import("./admin-signed");
  const urls = await signAdminPaths(c, [clinic.logo_path as string | null, ...items.rows.flatMap((i) => [i.video_path, i.thumb_path])]);
  return {
    now: now.toISOString(),
    clinic: clinic as ClinicDetail["clinic"],
    ownerEmail: (owner as { data?: { user?: { email?: string } | null } }).data?.user?.email ?? null,
    logoUrl: clinic.logo_path ? urls.get(clinic.logo_path as string) : undefined,
    items: items.rows.map((i) => ({ ...i, videoUrl: i.video_path ? urls.get(i.video_path) : undefined, thumbUrl: i.thumb_path ? urls.get(i.thumb_path) : undefined })),
    events: events.rows,
    emailLog: emailLog.rows,
    emailSends: emailSends.missing ? null : emailSends.rows,
    subs: subs.missing ? null : subs.rows,
    payments: payments.missing ? null : payments.rows,
    actions,
    pauseColumn: "admin_paused_at" in clinic,
    signedTtlSec: ADMIN_SIGNED_URL_TTL_SEC,
  };
}

/* ----------------------------------------------------------------- videos */

export type VideoCard = VideoRow & { thumb_path?: string | null; videoUrl?: string; thumbUrl?: string; clinicName: string; language?: string; country?: string };
export type VideosData = { now: string; items: VideoCard[]; clinics: AdminClinic[]; weeks: string[]; warnings: string[] };

/** Recent videos across clinics (8 weeks). Signing happens after filtering, for the page shown only. */
export async function loadVideos(now = new Date()): Promise<{ now: string; items: (VideoRow & { thumb_path?: string | null })[]; clinics: AdminClinic[]; warnings: string[] }> {
  const c = db();
  if (!c) return { now: now.toISOString(), items: [], clinics: [], warnings: ["DentVideo backend is not configured."] };
  const since = new Date(now.getTime() - 56 * DAY).toISOString().slice(0, 10);
  const [items, clinics] = await Promise.all([
    rows<VideoRow & { thumb_path?: string | null }>(
      c.from("dentvid_items").select("id, clinic_id, kind, week_of, status, approval, title, error, findings, video_path, thumb_path, updated_at").gte("week_of", since).order("updated_at", { ascending: false }).limit(1500),
    ),
    rows<AdminClinic>(c.from("dentvid_clinics").select("*").limit(5000)),
  ]);
  const warnings = [items.error, clinics.error].filter((x): x is string => !!x);
  return { now: now.toISOString(), items: items.rows, clinics: clinics.rows, warnings };
}

export async function signVideoPage<T extends { video_path?: string | null; thumb_path?: string | null }>(list: T[]): Promise<(T & { videoUrl?: string; thumbUrl?: string })[]> {
  const c = db();
  if (!c) return list;
  const urls = await signAdminPaths(c, list.flatMap((i) => [i.video_path, i.thumb_path]));
  return list.map((i) => ({ ...i, videoUrl: i.video_path ? urls.get(i.video_path) : undefined, thumbUrl: i.thumb_path ? urls.get(i.thumb_path) : undefined }));
}

/* ----------------------------------------------------------------- emails */

export type EmailsData = { now: string; log: EmailLogRow[]; sends: EmailSendRow[] | null; clinics: AdminClinic[]; warnings: string[] };

export async function loadEmails(now = new Date()): Promise<EmailsData> {
  const c = db();
  if (!c) return { now: now.toISOString(), log: [], sends: null, clinics: [], warnings: ["DentVideo backend is not configured."] };
  const [log, sends, clinics] = await Promise.all([
    rows<EmailLogRow>(c.from("dentvid_email_log").select("clinic_id, kind, sent_at").order("sent_at", { ascending: false }).limit(500)),
    rows<EmailSendRow>(c.from("dentvid_email_sends").select("*").order("created_at", { ascending: false }).limit(500)),
    rows<AdminClinic>(c.from("dentvid_clinics").select("*").limit(5000)),
  ]);
  const warnings = [log.missing ? "dentvid_email_log is missing (0005)." : log.error, sends.error].filter((x): x is string => !!x);
  return { now: now.toISOString(), log: log.rows, sends: sends.missing ? null : sends.rows, clinics: clinics.rows, warnings };
}

/* ---------------------------------------------------------------- billing */

export type BillingData = {
  now: string;
  subs: SubRow[] | null;
  payments: PaymentRow[] | null;
  clinics: AdminClinic[];
  issues: ReturnType<typeof billingIssues>;
  dodoFoundingUses: number | null;
  alerts: SystemSnapshot["alerts"];
  warnings: string[];
};

export async function loadBilling(now = new Date()): Promise<BillingData> {
  const c = db();
  if (!c) return { now: now.toISOString(), subs: null, payments: null, clinics: [], issues: [], dodoFoundingUses: null, alerts: [], warnings: ["DentVideo backend is not configured."] };
  const [subs, payments, clinics, dodo, system] = await Promise.all([
    rows<SubRow>(c.from("dentvid_subscriptions").select("*").order("updated_at", { ascending: false }).limit(2000)),
    rows<PaymentRow>(c.from("dentvid_payments").select("*").order("created_at", { ascending: false }).limit(200)),
    rows<AdminClinic>(c.from("dentvid_clinics").select("*").limit(5000)),
    loadDodoFoundingUses(),
    readSystem(now),
  ]);
  const warnings = [subs.missing ? "The subscription ledger (0007) is missing." : subs.error, payments.error, clinics.error].filter((x): x is string => !!x);
  return {
    now: now.toISOString(),
    subs: subs.missing ? null : subs.rows,
    payments: payments.missing ? null : payments.rows,
    clinics: clinics.rows,
    issues: billingIssues(subs.rows, clinics.rows),
    dodoFoundingUses: dodo,
    alerts: system.alerts,
    warnings,
  };
}

/* ----------------------------------------------------------------- system */

export type SystemData = {
  now: string;
  system: SystemSnapshot;
  spend: SpendState;
  /** The last batch week's videos, per clinic. */
  batchItems: AdminItem[];
  clinics: AdminClinic[];
};

export async function loadSystemPage(now = new Date()): Promise<SystemData> {
  const c = db();
  const system = await readSystem(now).catch(() => emptySnapshot(now));
  const [spend, items, clinics] = await Promise.all([
    loadSpend(now),
    c
      ? rows<AdminItem>(c.from("dentvid_items").select("id, clinic_id, kind, week_of, status, approval, title, error, findings, video_path, updated_at").eq("week_of", system.lastBatch.week).limit(5000))
      : Promise.resolve({ rows: [], missing: true } as Q<AdminItem>),
    c ? rows<AdminClinic>(c.from("dentvid_clinics").select("*").limit(5000)) : Promise.resolve({ rows: [], missing: true } as Q<AdminClinic>),
  ]);
  return { now: now.toISOString(), system, spend, batchItems: items.rows, clinics: clinics.rows };
}
