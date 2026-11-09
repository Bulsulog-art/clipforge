import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase";
import type { LibraryItem } from "@/components/dentvid/library";
import { chosenPhotoIds, cleanPhotoIds, suggestBackgrounds, SUGGEST_MAX } from "./backgrounds";
import { clinicFindings } from "./app-ui";
import { restyleStatus } from "./restyle";

type Row = {
  id: string;
  kind: LibraryItem["kind"];
  status: LibraryItem["status"];
  approval: LibraryItem["approval"];
  title: string;
  week_of: string;
  copy: { caption?: string; hashtags?: string[] } | null;
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
};

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
  const items = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    approval: r.approval,
    title: r.title,
    week_of: r.week_of,
    caption: r.copy?.caption,
    hashtags: r.copy?.hashtags,
    findings: clinicFindings(r.findings),
    videoUrl: r.video_path ? urls.get(r.video_path) : undefined,
    thumbUrl: r.thumb_path ? urls.get(r.thumb_path) : undefined,
    photos: photosFor(r),
  }));
  return { items, rows };
}
