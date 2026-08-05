import fs from "node:fs/promises";
import path from "node:path";
import type { AspectId } from "./scene-plan.js";

/**
 * Resolves a plan's stock queries to local video files.
 *
 * Everything here fails soft. A stock lookup can come back empty, rate
 * limited, or slow, and none of those are a reason to deny someone the video
 * they asked for — the footage scene degrades to the theme background with its
 * caption intact, which still reads as a deliberate frame. A pipeline that
 * throws because a search returned nothing is a pipeline that fails on the
 * days the provider is having a bad afternoon.
 *
 * Pexels is used under its licence: free for commercial use, no attribution
 * required, and redistribution of the raw file is not permitted — which is why
 * clips are downloaded per render into a working directory and never served
 * from our own storage as standalone assets.
 *
 * Worth knowing when reading the fallbacks below: Pexels matches loosely
 * enough that a live check with deliberate nonsense ("zzzqqq nonexistent
 * nonsense") still came back with a clip. So the empty-result path is real but
 * rare, and the failure that actually shows up in output is a shot that is
 * merely irrelevant. That is a prompting problem — the model is told to write
 * a concrete 2-4 word visual — not something a retry here can fix.
 */

const API = "https://api.pexels.com/videos/search";

/** Long enough to be usable, short enough not to hold a render hostage. */
const REQUEST_TIMEOUT_MS = 12_000;
const DOWNLOAD_TIMEOUT_MS = 45_000;

/** A file bigger than this costs more to fetch than the shot is worth. */
const MAX_BYTES = 60 * 1024 * 1024;

type PexelsVideoFile = {
  link: string;
  width: number | null;
  height: number | null;
  file_type: string;
  quality: string | null;
};

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  video_files: PexelsVideoFile[];
};

export type StockClip = {
  query: string;
  /** Local path the renderer can read. */
  path: string;
  width: number;
  height: number;
};

function orientationFor(aspect: AspectId): "portrait" | "square" | "landscape" {
  if (aspect === "9:16") return "portrait";
  if (aspect === "1:1") return "square";
  return "landscape";
}

/**
 * Picks the file to download.
 *
 * Preference is the smallest file that still covers the frame. Pexels serves
 * up to 4K, and pulling 200MB of UHD to scale it into a 1080-wide composition
 * wastes bandwidth and render time for pixels nobody sees.
 */
export function pickFile(video: PexelsVideo, targetWidth: number): PexelsVideoFile | undefined {
  const usable = video.video_files.filter(
    (f) => f.file_type === "video/mp4" && (f.width ?? 0) > 0,
  );
  if (usable.length === 0) return undefined;

  const bigEnough = usable
    .filter((f) => (f.width ?? 0) >= targetWidth)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  if (bigEnough.length > 0) return bigEnough[0];

  // Nothing reaches the target — take the largest available and let it upscale
  // rather than dropping a shot we already found.
  return usable.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
}

/**
 * Scores a result so the chosen clip is not simply the first one Pexels
 * happened to return. Longer clips survive a scene without looping, and an
 * orientation that already matches avoids an aggressive crop.
 */
export function scoreVideo(video: PexelsVideo, wantedSeconds: number, portrait: boolean): number {
  const isPortrait = video.height > video.width;
  const orientationMatch = isPortrait === portrait ? 1 : 0;
  // Anything at least as long as the scene is equally fine; shorter is penalised
  // in proportion to how much of the scene it cannot cover.
  const coverage = Math.min(1, video.duration / Math.max(1, wantedSeconds));
  return orientationMatch * 2 + coverage;
}

export type StockResolverOptions = {
  apiKey?: string;
  workDir: string;
  aspect: AspectId;
  targetWidth: number;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
  onWarn?: (message: string) => void;
};

/**
 * Looks up one query and downloads the best match.
 * Returns undefined for every failure mode — no key, no results, network
 * trouble, a file that is too large.
 */
export async function resolveStockClip(
  query: string,
  wantedSeconds: number,
  opts: StockResolverOptions,
): Promise<StockClip | undefined> {
  const { apiKey, workDir, aspect, targetWidth } = opts;
  const doFetch = opts.fetchImpl ?? fetch;
  const warn = opts.onWarn ?? (() => {});

  if (!apiKey) {
    warn("stock lookup skipped: no PEXELS_API_KEY configured");
    return undefined;
  }

  const url = new URL(API);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", orientationFor(aspect));
  url.searchParams.set("per_page", "10");

  let videos: PexelsVideo[];
  try {
    const res = await doFetch(url.toString(), {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      warn(`stock search for "${query}" returned ${res.status}`);
      return undefined;
    }
    const body = (await res.json()) as { videos?: PexelsVideo[] };
    videos = body.videos ?? [];
  } catch (e) {
    warn(`stock search for "${query}" failed: ${(e as Error).message}`);
    return undefined;
  }

  if (videos.length === 0) {
    warn(`stock search for "${query}" found nothing`);
    return undefined;
  }

  const portrait = orientationFor(aspect) === "portrait";
  const best = [...videos].sort(
    (a, b) => scoreVideo(b, wantedSeconds, portrait) - scoreVideo(a, wantedSeconds, portrait),
  )[0];

  const file = pickFile(best, targetWidth);
  if (!file) {
    warn(`stock result for "${query}" had no usable mp4`);
    return undefined;
  }

  const dest = path.join(workDir, `stock-${best.id}.mp4`);
  try {
    const res = await doFetch(file.link, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (!res.ok) {
      warn(`stock download for "${query}" returned ${res.status}`);
      return undefined;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      warn(`stock clip for "${query}" is ${Math.round(buffer.byteLength / 1e6)}MB, skipping`);
      return undefined;
    }
    await fs.writeFile(dest, buffer);
  } catch (e) {
    warn(`stock download for "${query}" failed: ${(e as Error).message}`);
    return undefined;
  }

  return { query, path: dest, width: file.width ?? best.width, height: file.height ?? best.height };
}

/**
 * Resolves every distinct query in a plan.
 *
 * Queries are de-duplicated by the caller, and lookups run in parallel because
 * they are independent and the slowest one otherwise sets the floor for the
 * whole render.
 */
export async function resolveStockClips(
  queries: { query: string; seconds: number }[],
  opts: StockResolverOptions,
): Promise<Map<string, StockClip>> {
  const results = await Promise.all(
    queries.map(async (q) => resolveStockClip(q.query, q.seconds, opts)),
  );
  const map = new Map<string, StockClip>();
  for (const clip of results) {
    if (clip) map.set(clip.query, clip);
  }
  return map;
}
