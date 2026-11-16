import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase";
import type { LibraryItem } from "@/components/dentvid/library";
import { chosenPhotoIds, cleanPhotoIds, suggestBackgrounds, SUGGEST_MAX } from "./backgrounds";
import { clinicReasons } from "./reasons";
import { restyleStatus } from "./restyle";
import { postTexts } from "./posting";
import { storedCues } from "./subtitles";
import { CHANGE_STALE_MS } from "./clinic-requests";
import type { ChangeView } from "@/components/dentvid/clinic-requests";

type Row = {
  id: string;
  kind: LibraryItem["kind"];
  status: LibraryItem["status"];
  approval: LibraryItem["approval"];
  title: string;
  week_of: string;
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

/** The clinic's items with short-lived signed URLs for video and poster. */
export async function loadItems(db: SupabaseClient, ownerId: string): Promise<{ items: LibraryItem[]; rows: Row[] }> {
  const { data } = await db
    .from("dentvid_items")
    // "*" rather than a column list: the background columns (0003) may not
    // exist yet on a given database, and the library must not break over them.
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as Row[];
  const paths = rows.flatMap((r) => [r.video_path, r.thumb_path]).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  // The latest change request per video (0025): a database without the table simply has none.
  const changes = new Map<string, ChangeView>();
  const generatedIds = rows.filter((r) => r.kind === "generated").map((r) => r.id);
  if (generatedIds.length) {
    try {
      const { data: ch, error } = await db
        .from("dentvid_change_requests")
        .select("item_id, status, reason, created_at")
        .eq("owner_id", ownerId)
        .in("item_id", generatedIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error) for (const [k, v] of changeViews((ch ?? []) as ChangeRowLite[])) changes.set(k, v);
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
    hashtags: r.copy?.hashtags,
    post: postTexts(r.copy) ?? undefined,
    postedAt: "posted_at" in r ? (r.posted_at ?? null) : undefined,
    reasons: clinicReasons(r.findings, r.status),
    videoUrl: r.video_path ? urls.get(r.video_path) : undefined,
    thumbUrl: r.thumb_path ? urls.get(r.thumb_path) : undefined,
    photos: photosFor(r),
    change: changes.get(r.id),
    subtitles: storedCues(r.subtitles).length > 0,
  }));
  return { items, rows };
}
