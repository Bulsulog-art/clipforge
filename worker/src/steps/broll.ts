import { logger } from "../logger.js";

export type BrollCut = { start: number; end: number; query: string };

const LEAD_GUARD = 6;   // leave the first 6s alone so the hook lands
const CUT_LEN = 2.4;    // each cutaway ~2.4s
const MAX_CUTS = 2;

/**
 * Plan a couple of B-roll cutaway windows + stock-search queries for a clip,
 * spaced across the body, from the clip's keywords. Pure + deterministic so it's
 * unit-testable; the actual fetch + compositing (fetchPexelsClip + render) are
 * the render-test parts. Returns [] when there's nothing sensible to cut to.
 */
export function planBroll(
  keywords: string[] | undefined,
  clipDurationSec: number,
  maxCuts = MAX_CUTS,
): BrollCut[] {
  const queries = (keywords ?? []).map((k) => k.trim()).filter((k) => k.length > 2);
  if (queries.length === 0 || clipDurationSec < LEAD_GUARD + CUT_LEN + 2) return [];

  const n = Math.min(maxCuts, queries.length);
  const usable = clipDurationSec - LEAD_GUARD - CUT_LEN;
  const cuts: BrollCut[] = [];
  for (let i = 0; i < n; i++) {
    const start = LEAD_GUARD + (usable * (i + 1)) / (n + 1);
    cuts.push({
      start: Number(start.toFixed(2)),
      end: Number(Math.min(clipDurationSec, start + CUT_LEN).toFixed(2)),
      query: queries[i],
    });
  }
  return cuts;
}

/**
 * Pexels stock-video search → a downloadable portrait mp4 url. Real, free API
 * (needs PEXELS_API_KEY). Never throws — returns null on any miss so a B-roll
 * failure degrades to the normal clip.
 * Docs: https://www.pexels.com/api/documentation/#videos-search
 */
export async function fetchPexelsClip(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait&size=medium`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) throw new Error(`pexels ${res.status}`);
    const json = (await res.json()) as {
      videos?: Array<{ video_files?: Array<{ link: string; width?: number; height?: number }> }>;
    };
    const files = json.videos?.[0]?.video_files ?? [];
    // Prefer a portrait HD-ish file; fall back to the first available.
    const pick =
      files.find((f) => (f.height ?? 0) >= 1080 && (f.width ?? 0) <= (f.height ?? 0)) ??
      files.find((f) => (f.width ?? 0) >= 720) ??
      files[0];
    return pick?.link ?? null;
  } catch (e) {
    logger.warn({ query, err: (e as Error).message }, "pexels fetch failed");
    return null;
  }
}
