import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ClipRel = { hook: string | null; viral_score: number | null };
type PublishRel = { platform: string; external_url: string | null; clips: ClipRel | ClipRel[] | null };
type SnapRow = {
  publish_id: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  fetched_at: string;
  publishes: PublishRel | PublishRel[] | null;
};

/** Supabase returns a to-one relation as an object or a 1-element array. */
function firstOf<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

/**
 * Real performance analytics for the signed-in creator, aggregated from the
 * metrics snapshots the worker collects. RLS on analytics_snapshots scopes
 * this to the user's own rows. Returns the latest snapshot per post, rolled up
 * to totals + per-platform + top performers — the data the app charts (no more
 * synthesised numbers) and the foundation for "make more like my winners".
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("analytics_snapshots")
    .select(
      "publish_id, views, likes, comments, shares, fetched_at, publishes(platform, external_url, clips(hook, viral_score))",
    )
    .order("fetched_at", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as SnapRow[];

  // Rows are fetched_at-desc, so the first time we see a publish_id is its
  // latest snapshot.
  const latest = new Map<string, SnapRow>();
  let updatedAt: string | null = null;
  for (const r of rows) {
    if (!latest.has(r.publish_id)) latest.set(r.publish_id, r);
    if (!updatedAt || r.fetched_at > updatedAt) updatedAt = r.fetched_at;
  }

  const totals = { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 };
  type PlatformAgg = { platform: string; views: number; likes: number; comments: number; shares: number; posts: number };
  const platformMap = new Map<string, PlatformAgg>();
  const topPosts: Array<{
    publishId: string;
    platform: string;
    url: string | null;
    hook: string | null;
    viralScore: number | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }> = [];

  for (const [publishId, r] of latest) {
    const pub = firstOf(r.publishes);
    const clip = firstOf(pub?.clips);
    const platform = pub?.platform ?? "unknown";
    const v = r.views ?? 0;
    const l = r.likes ?? 0;
    const c = r.comments ?? 0;
    const s = r.shares ?? 0;

    totals.views += v;
    totals.likes += l;
    totals.comments += c;
    totals.shares += s;
    totals.posts += 1;

    const pm = platformMap.get(platform) ?? { platform, views: 0, likes: 0, comments: 0, shares: 0, posts: 0 };
    pm.views += v;
    pm.likes += l;
    pm.comments += c;
    pm.shares += s;
    pm.posts += 1;
    platformMap.set(platform, pm);

    topPosts.push({
      publishId,
      platform,
      url: pub?.external_url ?? null,
      hook: clip?.hook ?? null,
      viralScore: clip?.viral_score ?? null,
      views: v,
      likes: l,
      comments: c,
      shares: s,
    });
  }

  topPosts.sort((a, b) => b.views - a.views);
  const engaged = totals.likes + totals.comments + totals.shares;
  const engagementRate = totals.views > 0 ? Number((engaged / totals.views).toFixed(4)) : 0;

  return NextResponse.json({
    totals: { ...totals, engagementRate },
    byPlatform: [...platformMap.values()].sort((a, b) => b.views - a.views),
    topPosts: topPosts.slice(0, 20),
    updatedAt,
  });
}
