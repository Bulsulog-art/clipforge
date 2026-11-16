import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { CHANGE_NOTE_MAX, CHANGES_PER_WEEK, PENDING_TOPICS_MAX, TOPIC_MAX, requestsText, type ChangeReason, type ChangeStatus, type TopicRefusal } from "@/content/dentvideo-requests";
import { scanHardRules, scanMarketRules } from "./hard-rules";
import { canMakeVideos } from "./billing";
import { weekOf } from "./week";
import { dvAdmin } from "./supabase";

/**
 * A clinic's own requests (migration 0025):
 *
 *   topic suggestion  "Suggest a topic for next week" (library and settings):
 *                     plain text, 3–140 characters, refused at once when it
 *                     trips the hard ad rules; at most PENDING_TOPICS_MAX
 *                     waiting. The Monday week uses them first
 *                     (worker/src/dentvid/topic-requests.ts).
 *   change request    "Ask for a change" on one generated video: a note of
 *                     3–300 characters; at most CHANGES_PER_WEEK a week per
 *                     clinic (the worker's spend guard has the same cap), one
 *                     at a time per video, active plan only. Queued as the
 *                     dentvid job "change" (worker/src/dentvid/jobs.ts).
 *
 * The rules live here once, for the web routes (cookie session) and the
 * iPhone app's routes (bearer session). Every read and write is scoped to
 * the signed-in owner: the clinic and the video are looked up by owner_id =
 * the session's user, so clinic A can never act for clinic B. Reads go
 * through the user's client (RLS); writes through the service role, which
 * owners do not have on these tables (0025 has no write policy).
 */

export type DvActor = { db: SupabaseClient; user: User };

export type TopicRow = { id: string; text: string; status: "pending" | "used" | "refused"; reason: TopicRefusal | null; week_of: string | null; created_at: string };
export type ChangeRow = { id: string; item_id: string; status: ChangeStatus; reason: ChangeReason | null; created_at: string };
export type OwnClinic = { id: string; plan: string; country?: string; language?: string; adminPaused: boolean };
export type OwnItem = { id: string; clinic_id: string; kind: string; status: string; hasPlan: boolean };

/** Database access, so the rules are tested without a database. `null` / "missing": 0025 is not applied. */
export interface RequestStore {
  clinic(ownerId: string): Promise<OwnClinic | null>;
  topics(ownerId: string, limit: number): Promise<TopicRow[] | null>;
  pendingTopics(clinicId: string): Promise<number | null>;
  insertTopic(row: { clinic_id: string; owner_id: string; text: string }): Promise<TopicRow | "missing">;
  deletePendingTopic(ownerId: string, id: string): Promise<boolean | "missing">;
  item(ownerId: string, itemId: string): Promise<OwnItem | null>;
  changesSince(clinicId: string, since: Date): Promise<number | null>;
  openChange(itemId: string, since: Date): Promise<boolean>;
  insertChange(row: { clinic_id: string; owner_id: string; item_id: string; note: string }): Promise<ChangeRow | "missing">;
  failChange(id: string): Promise<void>;
  latestChanges(ownerId: string, itemIds: string[]): Promise<ChangeRow[]>;
}

export type Queue = { add(name: string, data: unknown, opts: Record<string, unknown>): Promise<unknown> };

/* ------------------------------------------------------------------ text rules */

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const LINKISH = /(:\/\/|\bwww\.|[a-z0-9-]+\.(?:com|net|org|io|app|info|biz|de|at|ch|tr|fr|es|pl|jp|ae|sa|uk|co|me)\b|[<>])/i;

export type TextCheck = { ok: true; text: string } | { ok: false; error: "length" | "plain" | "adRules" };

function plainText(raw: unknown, max: number): TextCheck {
  if (typeof raw !== "string") return { ok: false, error: "length" };
  if (CONTROL.test(raw.replace(/[\r\n\t]/g, " "))) return { ok: false, error: "plain" };
  const text = raw.replace(/\s+/g, " ").trim();
  if ([...text].length < 3 || [...text].length > max) return { ok: false, error: "length" };
  if (LINKISH.test(text)) return { ok: false, error: "plain" };
  return { ok: true, text };
}

/** A topic suggestion: plain text, 3–140 characters, and nothing the hard ad rules (and the clinic's market rules) refuse. */
export function checkTopic(raw: unknown, country?: string): TextCheck {
  const c = plainText(raw, TOPIC_MAX);
  if (!c.ok) return c;
  if (scanHardRules(c.text).length || scanMarketRules(c.text, country).length) return { ok: false, error: "adRules" };
  return c;
}

/**
 * A change note: plain text, 3–300 characters. Not screened for ad words: a
 * dentist asking to "take out 'painless'" is a good request, and whatever the
 * worker makes passes every review before it replaces the video.
 */
export function checkNote(raw: unknown): TextCheck {
  return plainText(raw, CHANGE_NOTE_MAX);
}

/** Monday 00:00 UTC of this ISO week — the same week the worker's spend guard counts changes in. */
export function weekStart(now = new Date()): Date {
  return new Date(`${weekOf(now)}T00:00:00Z`);
}

/** A change still "queued"/"working" after this long is lost (worker restart): another one may be asked. */
export const CHANGE_STALE_MS = 60 * 60_000;

/* --------------------------------------------------------------------- handlers */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

async function messages(store: RequestStore, ownerId: string, locale?: string) {
  const clinic = await store.clinic(ownerId);
  return { clinic, t: requestsText(locale ?? clinic?.language) };
}

/** GET: the clinic's suggestions, newest first. */
export async function listTopics(actor: DvActor, store: RequestStore): Promise<NextResponse> {
  const topics = await store.topics(actor.user.id, 30);
  if (topics === null) return json({ topics: [], available: false });
  return json({ topics, available: true });
}

/** POST { text }: one suggestion. */
export async function createTopic(actor: DvActor, store: RequestStore, body: unknown, opts: { locale?: string } = {}): Promise<NextResponse> {
  const { clinic, t } = await messages(store, actor.user.id, opts.locale);
  const e = t.topics.errors;
  if (!clinic) return json({ error: e.unavailable }, 404);
  const check = checkTopic((body as { text?: unknown } | null)?.text, clinic.country);
  if (!check.ok) return json({ error: check.error === "adRules" ? e.adRules : check.error === "plain" ? e.plain : e.length, code: check.error }, 400);
  const pending = await store.pendingTopics(clinic.id);
  if (pending === null) return json({ error: e.unavailable, code: "unavailable" }, 503);
  if (pending >= PENDING_TOPICS_MAX) return json({ error: e.tooManyPending, code: "too_many_pending" }, 409);
  const row = await store.insertTopic({ clinic_id: clinic.id, owner_id: actor.user.id, text: check.text });
  if (row === "missing") return json({ error: e.unavailable, code: "unavailable" }, 503);
  return json({ ok: true, topic: row, message: t.topics.sent });
}

/** DELETE: withdraw one of the owner's own pending suggestions. */
export async function withdrawTopic(actor: DvActor, store: RequestStore, id: string): Promise<NextResponse> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "not found" }, 404);
  const done = await store.deletePendingTopic(actor.user.id, id);
  if (done === "missing") return json({ error: "not available" }, 503);
  return done ? json({ ok: true }) : json({ error: "not found" }, 404);
}

/** POST { note } on one video: queue its change. */
export async function createChange(actor: DvActor, store: RequestStore, queue: Queue, itemId: string, body: unknown, opts: { locale?: string; now?: Date; jobOpts?: Record<string, unknown> } = {}): Promise<NextResponse> {
  const now = opts.now ?? new Date();
  const { clinic, t } = await messages(store, actor.user.id, opts.locale);
  const e = t.change.errors;
  if (!clinic) return json({ error: e.notThis, code: "not_found" }, 404);
  const check = checkNote((body as { note?: unknown } | null)?.note);
  if (!check.ok) return json({ error: check.error === "plain" ? e.plain : e.length, code: check.error }, 400);
  // Owner-scoped: another clinic's id is simply not found.
  const item = /^[0-9a-f-]{36}$/i.test(itemId) ? await store.item(actor.user.id, itemId) : null;
  if (!item || item.clinic_id !== clinic.id) return json({ error: e.notThis, code: "not_found" }, 404);
  if (item.kind !== "generated" || !item.hasPlan || (item.status !== "ready" && item.status !== "flagged")) return json({ error: e.notThis, code: "not_this" }, 409);
  if (!canMakeVideos(clinic.plan as never) || clinic.adminPaused) return json({ error: t.change.reasons.no_plan, code: "no_plan" }, 402);
  if (await store.openChange(item.id, new Date(now.getTime() - CHANGE_STALE_MS))) return json({ error: e.busy, code: "busy" }, 409);
  const used = await store.changesSince(clinic.id, weekStart(now));
  if (used === null) return json({ error: e.unavailable, code: "unavailable" }, 503);
  if (used >= CHANGES_PER_WEEK) return json({ error: e.limit, code: "limit", left: 0 }, 429);
  const row = await store.insertChange({ clinic_id: clinic.id, owner_id: actor.user.id, item_id: item.id, note: check.text });
  if (row === "missing") return json({ error: e.unavailable, code: "unavailable" }, 503);
  try {
    await queue.add("change", { requestId: row.id }, { jobId: `change:${row.id}`, ...(opts.jobOpts ?? {}) });
  } catch (err) {
    console.error("dentvideo change request not queued", (err as Error).message);
    await store.failChange(row.id);
    return json({ error: t.change.reasons.technical, code: "not_queued" }, 503);
  }
  return json({ ok: true, change: row, left: Math.max(0, CHANGES_PER_WEEK - used - 1) });
}

/* -------------------------------------------------------------- Liman (Supabase) */

const isMissing = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "42P01" || e.code === "42703" || e.code === "PGRST204" || e.code === "PGRST205" || /does not exist|Could not find the .* (table|column)/i.test(e.message ?? ""));

const TOPIC_COLS = "id, text, status, reason, week_of, created_at";
const CHANGE_COLS = "id, item_id, status, reason, created_at";

/**
 * Reads as the owner (`db`, RLS) and writes with the service role (`admin`):
 * the API decides owner_id and clinic_id from the session, never the body.
 */
export function supabaseRequestStore(db: SupabaseClient, admin: () => SupabaseClient | null): RequestStore {
  const w = () => {
    const a = admin();
    if (!a) throw new Error("DentVideo backend is not configured");
    return a;
  };
  return {
    async clinic(ownerId) {
      const { data } = await db.from("dentvid_clinics").select("*").eq("owner_id", ownerId).maybeSingle();
      if (!data) return null;
      const p = (data.profile ?? {}) as { country?: string; language?: string };
      return { id: data.id as string, plan: (data.plan as string) ?? "trial", country: p.country, language: p.language, adminPaused: !!(data as { admin_paused_at?: string | null }).admin_paused_at };
    },
    async topics(ownerId, limit) {
      const { data, error } = await db.from("dentvid_topic_requests").select(TOPIC_COLS).eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(limit);
      if (error) return isMissing(error) ? null : [];
      return (data ?? []) as TopicRow[];
    },
    async pendingTopics(clinicId) {
      const { count, error } = await w().from("dentvid_topic_requests").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("status", "pending");
      if (error) return null;
      return count ?? 0;
    },
    async insertTopic(row) {
      const { data, error } = await w().from("dentvid_topic_requests").insert(row).select(TOPIC_COLS).single();
      if (error) {
        if (isMissing(error)) return "missing";
        throw new Error(`topic request: ${error.message}`);
      }
      return data as TopicRow;
    },
    async deletePendingTopic(ownerId, id) {
      const { data, error } = await w().from("dentvid_topic_requests").delete().eq("id", id).eq("owner_id", ownerId).eq("status", "pending").select("id");
      if (error) return isMissing(error) ? "missing" : false;
      return (data ?? []).length > 0;
    },
    async item(ownerId, itemId) {
      const { data } = await db.from("dentvid_items").select("id, clinic_id, kind, status, plan").eq("id", itemId).eq("owner_id", ownerId).maybeSingle();
      if (!data) return null;
      return { id: data.id as string, clinic_id: data.clinic_id as string, kind: data.kind as string, status: data.status as string, hasPlan: !!data.plan };
    },
    async changesSince(clinicId, since) {
      const { count, error } = await w()
        .from("dentvid_change_requests")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", since.toISOString())
        // Only what can cost: waiting, running, made, or made-but-refused-by-the-reviewers / failed after
        // spending. A request refused before anything ran (no plan, not possible, the spend cap) did not use one up.
        .or("reason.is.null,reason.in.(checks,technical)");
      if (error) return null;
      return count ?? 0;
    },
    async openChange(itemId, since) {
      const { data } = await w().from("dentvid_change_requests").select("id").eq("item_id", itemId).in("status", ["queued", "working"]).gte("created_at", since.toISOString()).limit(1);
      return (data ?? []).length > 0;
    },
    async insertChange(row) {
      const { data, error } = await w().from("dentvid_change_requests").insert(row).select(CHANGE_COLS).single();
      if (error) {
        if (isMissing(error)) return "missing";
        throw new Error(`change request: ${error.message}`);
      }
      return data as ChangeRow;
    },
    async failChange(id) {
      await w()
        .from("dentvid_change_requests")
        .update({ status: "failed", reason: "technical", updated_at: new Date().toISOString(), finished_at: new Date().toISOString() })
        .eq("id", id)
        .then(
          () => {},
          () => {},
        );
    },
    async latestChanges(ownerId, itemIds) {
      if (!itemIds.length) return [];
      const { data, error } = await db.from("dentvid_change_requests").select(CHANGE_COLS).eq("owner_id", ownerId).in("item_id", itemIds).order("created_at", { ascending: false }).limit(200);
      if (error) return [];
      const seen = new Set<string>();
      return ((data ?? []) as ChangeRow[]).filter((r) => (seen.has(r.item_id) ? false : (seen.add(r.item_id), true)));
    },
  };
}

/** The service-role client, or null when the server has no key (dev, tests). */
export async function adminClient(): Promise<SupabaseClient | null> {
  try {
    return dvAdmin() as unknown as SupabaseClient;
  } catch {
    return null;
  }
}
