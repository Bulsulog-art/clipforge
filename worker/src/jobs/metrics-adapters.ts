import { logger } from "../logger.js";

/**
 * Normalised post metrics, platform-agnostic. Any field a platform doesn't
 * expose stays undefined (we store null) rather than a fake zero.
 */
export type PostMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  watchTimeSeconds?: number;
  meta?: Record<string, unknown>;
};

export type FetchArgs = {
  accessToken: string;
  externalPostId: string;
  externalUserId?: string | null;
};

export type MetricsAdapter = (args: FetchArgs) => Promise<PostMetrics | null>;

export type SnapshotRow = {
  publish_id: string;
  user_id: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  watch_time_seconds: number | null;
  meta: Record<string, unknown> | null;
};

/** Pure: normalise platform metrics into an analytics_snapshots row. Kept here
 *  (no supabase import) so it's unit-testable without DB env. */
export function toSnapshotRow(pub: { id: string; user_id: string }, m: PostMetrics): SnapshotRow {
  return {
    publish_id: pub.id,
    user_id: pub.user_id,
    views: m.views ?? null,
    likes: m.likes ?? null,
    comments: m.comments ?? null,
    shares: m.shares ?? null,
    watch_time_seconds: m.watchTimeSeconds ?? null,
    meta: m.meta ?? null,
  };
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

// ── YouTube Data API v3 ──────────────────────────────────────────────
// GET /youtube/v3/videos?part=statistics&id=<id>  (Bearer OAuth token)
// statistics: viewCount, likeCount, commentCount (strings). Watch-time needs
// the separate YouTube Analytics API, so it's left null here.
// ⚠️ Needs live OAuth scope `youtube.readonly` to verify.
export const youtubeAdapter: MetricsAdapter = async ({ accessToken, externalPostId }) => {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(externalPostId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`youtube ${res.status}`);
  const json = (await res.json()) as { items?: Array<{ statistics?: Record<string, string> }> };
  const s = json.items?.[0]?.statistics;
  if (!s) return null;
  return {
    views: num(s.viewCount),
    likes: num(s.likeCount),
    comments: num(s.commentCount),
    meta: { source: "youtube.v3.videos.statistics" },
  };
};

// ── TikTok Display / Content Posting API ─────────────────────────────
// POST /v2/video/query/?fields=...  body { filters: { video_ids: [id] } }
// ⚠️ Needs live scope `video.list` to verify.
export const tiktokAdapter: MetricsAdapter = async ({ accessToken, externalPostId }) => {
  const url =
    "https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count";
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filters: { video_ids: [externalPostId] } }),
  });
  if (!res.ok) throw new Error(`tiktok ${res.status}`);
  const json = (await res.json()) as { data?: { videos?: Array<Record<string, unknown>> } };
  const v = json.data?.videos?.[0];
  if (!v) return null;
  return {
    views: num(v.view_count),
    likes: num(v.like_count),
    comments: num(v.comment_count),
    shares: num(v.share_count),
    meta: { source: "tiktok.v2.video.query" },
  };
};

// ── Instagram Graph API (Reels media) ────────────────────────────────
// GET /<media-id>?fields=like_count,comments_count + /insights?metric=plays,reach,shares,saved
// ⚠️ Needs a Business/Creator IG account + live token to verify.
export const instagramAdapter: MetricsAdapter = async ({ accessToken, externalPostId }) => {
  const base = `https://graph.facebook.com/v21.0/${encodeURIComponent(externalPostId)}`;
  const fieldsUrl = `${base}?fields=like_count,comments_count&access_token=${encodeURIComponent(accessToken)}`;
  const insightsUrl = `${base}/insights?metric=plays,reach,shares,saved&access_token=${encodeURIComponent(accessToken)}`;

  const [fRes, iRes] = await Promise.all([fetch(fieldsUrl), fetch(insightsUrl)]);
  if (!fRes.ok) throw new Error(`instagram fields ${fRes.status}`);
  const f = (await fRes.json()) as { like_count?: number; comments_count?: number };

  let plays: number | undefined;
  let shares: number | undefined;
  if (iRes.ok) {
    const ins = (await iRes.json()) as { data?: Array<{ name: string; values?: Array<{ value: number }> }> };
    const byName = (n: string) => ins.data?.find((d) => d.name === n)?.values?.[0]?.value;
    plays = num(byName("plays"));
    shares = num(byName("shares"));
  }
  return {
    views: plays,
    likes: num(f.like_count),
    comments: num(f.comments_count),
    shares,
    meta: { source: "instagram.graph.v21" },
  };
};

// Deterministic mock — used by tests and as a safe fallback for platforms we
// haven't wired a live adapter for. Derives stable pseudo-metrics from the
// post id so the same post yields the same numbers (no Math.random).
export const mockAdapter: MetricsAdapter = async ({ externalPostId }) => {
  let h = 0;
  for (const ch of externalPostId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const views = 1000 + (h % 50000);
  return {
    views,
    likes: Math.round(views * 0.08),
    comments: Math.round(views * 0.012),
    shares: Math.round(views * 0.02),
    meta: { source: "mock" },
  };
};

const ADAPTERS: Record<string, MetricsAdapter> = {
  youtube: youtubeAdapter,
  tiktok: tiktokAdapter,
  instagram: instagramAdapter,
};

/**
 * Look up the adapter for a platform. When `useMock` is set (or no live
 * adapter exists for the platform) the deterministic mock is used so the loop
 * still produces verifiable rows in dev/test without live credentials.
 */
export function adapterFor(platform: string, useMock = false): MetricsAdapter {
  if (useMock) return mockAdapter;
  return ADAPTERS[platform] ?? mockAdapter;
}

/**
 * Fetch + normalise; never throws — a failing platform call yields null so one
 * broken account can't kill the whole snapshot run. `override` injects an
 * adapter directly (used by tests; production passes platform + useMock).
 */
export async function fetchMetrics(
  platform: string,
  args: FetchArgs,
  useMock = false,
  override?: MetricsAdapter,
): Promise<PostMetrics | null> {
  try {
    const adapter = override ?? adapterFor(platform, useMock);
    return await adapter(args);
  } catch (e) {
    logger.warn({ platform, err: (e as Error).message }, "metrics fetch failed");
    return null;
  }
}
