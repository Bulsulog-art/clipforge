import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase";
import type { LibraryItem } from "@/components/dentvid/library";
import { chosenPhotoIds, cleanPhotoIds, suggestBackgrounds, SUGGEST_MAX } from "./backgrounds";
import { clinicReasons } from "./reasons";
import { restyleStatus } from "./restyle";
import { capHashtags, postTexts } from "./posting";
import { storedCues } from "./subtitles";
import { CHANGE_STALE_MS } from "./clinic-requests";
import type { ChangeView } from "@/components/dentvid/clinic-requests";
import { addDays, clampWeeks, LIBRARY_WEEKS } from "./library-weeks";
import { deliveryWeek, weekOf } from "./week";

type Row = {
  id: string;
  kind: LibraryItem["kind"];
  status: LibraryItem["status"];
  approval: LibraryItem["approval"];
  title: string;
  week_of: string;
  created_at?: string;
  copy: { caption?: string; hashtags?: string[]; post?: unknown } | null;
  /** 0012_dentvid_posted.sql; absent on a database without it. */
  posted_at?: string | null;
  findings: string[] | null;
  video_path: string | null;
  thumb_path: string | null;
  shoot_card: unknown;
  plan?: { title?: string; scenes?: unknown[]; backgrounds?: unknown } | null;
  topic?: { title?: string; question?: string; hook?: string; service?: string } | null;
  /** 0003_dentvid_backgrounds.sql; absent on a database without it. */
  suggested_backgrounds?: unknown;
  restyle_status?: "queued" | "failed" | null;
  restyle_requested_at?: string | null;
  /** 0025_dentvid_clinic_requests.sql; absent on a database without it. */
  subtitles?: unknown;
};

type ChangeRowLite = { item_id: string; status: ChangeView["status"]; reason: ChangeView["reason"]; created_at: string };

/**
 * The latest change request per video, as the card shows it. One still
 * "queued"/"working" after CHANGE_STALE_MS was lost (a worker restart): it
 * reads as failed, so the card never says "making your change" forever.
 */
export function changeViews(rows: ChangeRowLite[], now = Date.now()): Map<string, ChangeView> {
  const out = new Map<string, ChangeView>();
  for (const r of [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
    if (out.has(r.item_id)) continue;
    const running = r.status === "queued" || r.status === "working";
    const lost = running && now - Date.parse(r.created_at) > CHANGE_STALE_MS;
    out.set(r.item_id, lost ? { status: "failed", reason: "technical", at: r.created_at } : { status: r.status, reason: r.reason, at: r.created_at });
  }
  return out;
}

/**
 * The photo picker's data for a generated video: the stored suggestions (or,
 * for videos made before there were any, the same ranking computed from the
 * plan now — the engine is shared with the worker), the photos in use, and
 * whether a re-render is pending.
 */
export function photosFor(r: Pick<Row, "kind" | "plan" | "topic" | "suggested_backgrounds" | "restyle_status" | "restyle_requested_at">): LibraryItem["photos"] {
  if (r.kind !== "generated" || !r.plan) return undefined;
  const stored = Array.isArray(r.suggested_backgrounds)
    ? r.suggested_backgrounds.filter((id): id is string => cleanPhotoIds([id]).length === 1)
    : [];
  const suggested = stored.length
    ? stored
    : suggestBackgrounds({
        plan: r.plan,
        topic: [r.topic?.title, r.topic?.question, r.topic?.hook].filter(Boolean).join(" . "),
        service: r.topic?.service,
      });
  const chosen = chosenPhotoIds(r.plan);
  // Photos in use always appear in the strip, even if the ranking moved on.
  const list = [...chosen, ...suggested.filter((id) => !chosen.includes(id))].slice(0, SUGGEST_MAX);
  return { suggested: list, chosen, status: restyleStatus(r.restyle_status, r.restyle_requested_at) ?? undefined };
}

/**
 * Rows the library loads at most per week of its window, on average (and
 * never fewer than SAFETY_ROWS): five videos, the topics not made, a top-up
 * and a few recordings fit well under it. Only a runaway (a bug writing
 * hundreds of rows into one week) reaches it.
 */
const ROWS_PER_WEEK_MAX = 10;
const SAFETY_ROWS = 400;
/** createSignedUrls takes at most this many paths per call (as account.ts signs the export). */
const SIGN_BATCH = 500;
/** Item ids per change-request query, so the request line stays short however many weeks are shown. */
const CHANGE_ID_BATCH = 100;
/** Weeks per window query: 40 weeks of days (280 dates) keep the request line near 3 KB. */
const WEEKS_PER_QUERY = 40;

const day = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
const newestFirst = (a: Row, b: Row) =>
  a.week_of < b.week_of ? 1 : a.week_of > b.week_of ? -1 : a.created_at === b.created_at ? 0 : (a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1;

export type LoadedItems = {
  items: LibraryItem[];
  rows: Row[];
  /** The clinic has rows older than the window: the library offers "Show earlier weeks". */
  hasEarlier: boolean;
  /** The window, in weeks, after clamping (LIBRARY_WEEKS..LIBRARY_WEEKS_MAX). */
  weeks: number;
};

/**
 * The clinic's items, whole weeks at a time, with short-lived signed URLs
 * for video and poster.
 *
 * The window is the newest `weeks` weeks by week_of (default 12), counting
 * back from the current delivery week, or from the clinic's newest week when
 * that is older (a clinic back after a pause, or reading its library in the
 * 90 days after cancelling, still sees its last twelve weeks rather than an
 * empty page). A week is always loaded whole: the window lists its weeks day
 * by day, never cuts by a row count, so topics that were not made and failed
 * rows never push a video out (they did under the old flat 60-row limit).
 * `hasEarlier` says whether anything older exists.
 *
 * Every filter is an equality or a list (eq / in) on week_of: a week_of that
 * is not a Monday still lands in its week, and the request stays one short
 * line for the usual twelve weeks.
 */
export async function loadItems(db: SupabaseClient, ownerId: string, opts: { weeks?: number; now?: Date } = {}): Promise<LoadedItems> {
  const weeks = clampWeeks(opts.weeks ?? LIBRARY_WEEKS);
  const current = deliveryWeek(opts.now);
  // The clinic's newest and oldest week: two one-row reads.
  const edge = (ascending: boolean) => db.from("dentvid_items").select("week_of").eq("owner_id", ownerId).order("week_of", { ascending }).limit(1);
  const [{ data: top }, { data: bottom }] = await Promise.all([edge(false), edge(true)]);
  const newestDay = day((top as { week_of?: unknown }[] | null)?.[0]?.week_of);
  const oldestDay = day((bottom as { week_of?: unknown }[] | null)?.[0]?.week_of);
  const newest = newestDay ? weekOf(new Date(`${newestDay}T12:00:00Z`)) : null;
  const anchor = newest && newest < current ? newest : current;
  const cutoff = addDays(anchor, -(weeks - 1) * 7);
  // A week made ahead of the calendar is shown too; nothing is asked for before the clinic's first week.
  const last = newest && newest > current ? newest : current;
  const first = oldestDay ? weekOf(new Date(`${oldestDay}T12:00:00Z`)) : last;
  const floor = first > cutoff ? first : cutoff;
  const mondays: string[] = [];
  // An empty library has no edges: nothing to read.
  if (newestDay) for (let w = last; w >= floor; w = addDays(w, -7)) mondays.push(w);
  const limit = Math.max(SAFETY_ROWS, weeks * ROWS_PER_WEEK_MAX);

  // Newest weeks first, 40 weeks per request, until the window or the safety limit is reached.
  let rows: Row[] = [];
  let truncated = false;
  for (let i = 0; i < mondays.length && !truncated; i += WEEKS_PER_QUERY) {
    const days = mondays.slice(i, i + WEEKS_PER_QUERY).flatMap((m) => Array.from({ length: 7 }, (_, d) => addDays(m, d)));
    const want = limit - rows.length;
    const { data } = await db
      .from("dentvid_items")
      // "*" rather than a column list: the background columns (0003) may not
      // exist yet on a given database, and the library must not break over them.
      .select("*")
      .eq("owner_id", ownerId)
      .in("week_of", days)
      .order("week_of", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(want);
    const got = (data ?? []) as Row[];
    rows = [...rows, ...got].sort(newestFirst);
    if (got.length >= want) truncated = true;
  }
  let hasEarlier = !!oldestDay && oldestDay < cutoff;
  // At the safety limit the oldest week loaded may be cut short: it is left out (for
  // "Show earlier weeks", which loads more) so a week is never shown half.
  if (truncated && rows.length > 0) {
    const oldest = rows[rows.length - 1].week_of;
    const whole = rows.filter((r) => r.week_of !== oldest);
    if (whole.length > 0) {
      rows = whole;
      hasEarlier = true;
    }
  }

  const paths = [...new Set(rows.flatMap((r) => [r.video_path, r.thumb_path]).filter((p): p is string => Boolean(p)))];
  const urls = new Map<string, string>();
  for (let i = 0; i < paths.length; i += SIGN_BATCH) {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + SIGN_BATCH), 60 * 60);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  // The latest change request per video (0025): a database without the table simply has none.
  const changes = new Map<string, ChangeView>();
  const generatedIds = rows.filter((r) => r.kind === "generated").map((r) => r.id);
  if (generatedIds.length) {
    try {
      const batches: string[][] = [];
      for (let i = 0; i < generatedIds.length; i += CHANGE_ID_BATCH) batches.push(generatedIds.slice(i, i + CHANGE_ID_BATCH));
      const results = await Promise.all(
        batches.map((ids) =>
          db
            .from("dentvid_change_requests")
            .select("item_id, status, reason, created_at")
            .eq("owner_id", ownerId)
            .in("item_id", ids)
            .order("created_at", { ascending: false })
            .limit(200),
        ),
      );
      const found: ChangeRowLite[] = [];
      for (const { data: ch, error } of results) if (!error) found.push(...((ch ?? []) as ChangeRowLite[]));
      for (const [k, v] of changeViews(found)) changes.set(k, v);
    } catch {
      // The library never breaks over change requests.
    }
  }
  const items = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    approval: r.approval,
    title: r.title,
    week_of: r.week_of,
    caption: r.copy?.caption,
    hashtags: Array.isArray(r.copy?.hashtags) ? capHashtags(r.copy.hashtags.filter((h): h is string => typeof h === "string")) : undefined,
    post: postTexts(r.copy) ?? undefined,
    postedAt: "posted_at" in r ? (r.posted_at ?? null) : undefined,
    reasons: clinicReasons(r.findings, r.status),
    videoUrl: r.video_path ? urls.get(r.video_path) : undefined,
    thumbUrl: r.thumb_path ? urls.get(r.thumb_path) : undefined,
    photos: photosFor(r),
    change: changes.get(r.id),
    subtitles: storedCues(r.subtitles).length > 0,
  }));
  return { items, rows, hasEarlier, weeks };
}

/**
 * The filming cards for the record page: the five newest rows that have
 * one, title and card only. No video rows, no signed URLs: the page shows
 * text.
 */
export async function loadShootCards(db: SupabaseClient, ownerId: string): Promise<{ title: string; shoot_card: unknown }[]> {
  const { data } = await db
    .from("dentvid_items")
    .select("title, shoot_card")
    .eq("owner_id", ownerId)
    .not("shoot_card", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);
  return ((data ?? []) as { title: string; shoot_card: unknown }[]).filter((r) => r.shoot_card);
}
