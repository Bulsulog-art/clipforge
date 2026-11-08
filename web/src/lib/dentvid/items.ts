import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase";
import type { LibraryItem } from "@/components/dentvid/library";

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
};

/** The clinic's items with short-lived signed URLs for video and poster. */
export async function loadItems(db: SupabaseClient, ownerId: string): Promise<{ items: LibraryItem[]; rows: Row[] }> {
  const { data } = await db
    .from("dentvid_items")
    .select("id, kind, status, approval, title, week_of, copy, findings, video_path, thumb_path, shoot_card")
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
    findings: r.findings ?? [],
    videoUrl: r.video_path ? urls.get(r.video_path) : undefined,
    thumbUrl: r.thumb_path ? urls.get(r.thumb_path) : undefined,
  }));
  return { items, rows };
}
