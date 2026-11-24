import fs from "node:fs/promises";
import path from "node:path";
import type { AspectId, ScenePlan } from "./scene-plan.js";

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

export type PexelsVideoFile = {
  link: string;
  width: number | null;
  height: number | null;
  file_type: string;
  quality: string | null;
};

export type PexelsVideo = {
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
  /** The Pexels video id, so a clinic's next weeks can avoid showing it again (ClipRotation). */
  id: number;
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

/**
 * How many clips a rotation turns through: the first results of the right
 * shape, in Pexels' own order. Further down its ranking the shots drift off
 * the subject.
 */
export const ROTATION_POOL = 5;

/**
 * Which clip a query shows, for one clinic and one week (week.ts → plan →
 * render-plan.ts → resolveStockClip).
 *
 * Pexels answers a query with the same results in the same order, so the
 * best-scored clip was the same clip every time: a clinic saw the same
 * "toothbrush close up" shot every few weeks, and every other clinic saw it
 * too. With a rotation (chooseVideo) the clip comes from a short list: the
 * first ROTATION_POOL results with a usable mp4 in the best clip's
 * orientation (and as sharp as the best one), in Pexels' own order. The list
 * does not depend on the scene's length, so a longer scene next week (fewer
 * clips long enough) does not reshuffle it.
 *  - seed: stable for one clinic. Where the clinic stands in that list, per
 *    query, so two clinics in the same week usually show different clips.
 *  - turn: the week (week.ts weekNumber). Each week moves one place along, so
 *    a query does not show a clinic the same clip again for ROTATION_POOL
 *    weeks, even with no history at all.
 *  - avoid: Pexels ids the clinic's recent videos and this week's other
 *    videos showed, oldest first.
 * The week's clip is the one at the clinic's place, when it covers the scene
 * and was not shown lately. Otherwise, in this order: a fitting clip from
 * further down the results (never anyone's place in the list, so never last
 * or next week's clip), picked by the same seed and turn; another clip of the
 * list, next week's and last week's only after the others; and when every
 * fitting clip was shown lately, the one shown longest ago.
 */
export type ClipRotation = { seed: string; turn?: number; avoid?: ReadonlySet<number> };

/** A small stable string hash (FNV-1a, 32 bit, with a final mix so the low bits spread): the same seed picks the same clip on every run. */
export function rotationHash(seed: string): number {
  let h = 0x811c9dc5;
  for (const ch of seed) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const hasMp4 = (video: PexelsVideo) => video.video_files.some((f) => f.file_type === "video/mp4" && (f.width ?? 0) > 0);

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Whether a clip fits the scene as well as the best result does: the same
 * orientation, and the whole scene covered when the best one covers it
 * (OffthreadVideo does not loop: a short clip freezes on its last frame).
 * When no result covers the scene, a clip may be a tenth of the scene
 * shorter than the best one.
 */
function fitsLike(best: PexelsVideo, wantedSeconds: number, portrait: boolean): (video: PexelsVideo) => boolean {
  const coverage = (v: PexelsVideo) => Math.min(1, v.duration / Math.max(1, wantedSeconds));
  const matches = (v: PexelsVideo) => (v.height > v.width) === portrait;
  const need = coverage(best) >= 1 ? 1 : coverage(best) - 0.1;
  return (v) => matches(v) === matches(best) && coverage(v) >= need;
}

/**
 * The clip a scene plays, from one query's results.
 *
 * Without a rotation or clips to keep, the best-scored result, exactly as
 * before (ties keep Pexels' order). `keep` holds the clips a stored video
 * already showed (plan.footageIds): a re-render of it plays the same clip
 * while the search still returns it and it still fits. With a rotation, see
 * ClipRotation; a rotated clip always has a usable mp4, and when the best
 * clip has a file `targetWidth` wide, so does the rotated one (no upscaled
 * clip where the old rule played a sharp one).
 */
export function chooseVideo(
  videos: PexelsVideo[],
  query: string,
  wantedSeconds: number,
  portrait: boolean,
  opts: { rotation?: ClipRotation; keep?: ReadonlySet<number>; targetWidth?: number } = {},
): PexelsVideo | undefined {
  const ranked = [...videos].sort(
    (a, b) => scoreVideo(b, wantedSeconds, portrait) - scoreVideo(a, wantedSeconds, portrait),
  );
  const best = ranked[0];
  if (!best || (!opts.rotation && !opts.keep?.size)) return best;
  const fit = fitsLike(best, wantedSeconds, portrait);
  const kept = opts.keep?.size ? ranked.find((v) => opts.keep!.has(v.id) && fit(v) && hasMp4(v)) : undefined;
  if (kept) return kept;
  if (!opts.rotation) return best;

  const width = opts.targetWidth ?? 0;
  const wide = (v: PexelsVideo) => width > 0 && v.video_files.some((f) => f.file_type === "video/mp4" && (f.width ?? 0) >= width);
  const sharpEnough = wide(best) ? wide : hasMp4;
  const shape = (v: PexelsVideo) => (v.height > v.width) === (best.height > best.width) && sharpEnough(v);
  const fits = ranked.filter((v) => shape(v) && fit(v));
  if (!fits.length) return best;

  const { seed, turn = 0, avoid } = opts.rotation;
  const fresh = (v: PexelsVideo) => fit(v) && !avoid?.has(v.id);
  const list = videos.filter(shape).slice(0, ROTATION_POOL);
  const shift = rotationHash(`${seed}|${query.trim().toLowerCase()}`) + Math.trunc(Number.isFinite(turn) ? turn : 0);
  const at = mod(shift, list.length);
  if (fresh(list[at])) return list[at];
  // Not this week's place: a fitting clip further down, which is no week's place in the list.
  const further = fits.filter((v) => !list.includes(v) && !avoid?.has(v.id));
  if (further.length) return further[mod(shift, further.length)];
  // Then the rest of the list; next week's place (one along) and last week's (one back) last.
  const steps = [...Array.from({ length: Math.max(0, list.length - 3) }, (_, i) => i + 2), 1, list.length - 1];
  for (const k of steps) {
    const video = list[mod(at + k, list.length)];
    if (fresh(video)) return video;
  }
  // Every fitting clip was shown lately: the one shown longest ago (avoid lists the oldest first).
  const order = [...(avoid ?? [])];
  return fits.reduce((a, b) => (order.indexOf(b.id) < order.indexOf(a.id) ? b : a));
}

export type StockResolverOptions = {
  apiKey?: string;
  workDir: string;
  aspect: AspectId;
  targetWidth: number;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
  onWarn?: (message: string) => void;
  /** Which of the best clips this clinic and week get (ClipRotation). Absent: the best-scored clip, as before. */
  rotation?: ClipRotation;
  /** Pexels ids a stored video already showed (plan.footageIds): a re-render keeps them while the search returns them. */
  keep?: ReadonlySet<number>;
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
  const best = chooseVideo(videos, query, wantedSeconds, portrait, { rotation: opts.rotation, keep: opts.keep, targetWidth })!;

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

  return { query, path: dest, width: file.width ?? best.width, height: file.height ?? best.height, id: best.id };
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

/**
 * What a plan may carry about its stock clips, next to the scene plan's own
 * fields (scene-plan.ts does not know them; its parser drops them, and
 * nothing that draws a video reads them):
 *  - footageSeed, footageTurn, footageAvoid: the ClipRotation week.ts asks for
 *    (seed, turn, avoid). Only on the plan handed to the render.
 *  - footageIds: the Pexels ids the video shows, recorded on the stored plan
 *    after the render, so the clinic's next weeks avoid them and a re-render of
 *    the same plan keeps them.
 * The stored plan also carries each stock footage scene's own clip
 * (source.clipId, withShownClips): a change request is handed the stored
 * scenes and narration only (dentvid/jobs.ts), and keeps the clip from there.
 * All optional: a plan without them (every plan stored before) renders
 * exactly as before.
 */
export type FootageFields = {
  footageSeed?: string;
  footageTurn?: number;
  footageAvoid?: number[];
  footageIds?: number[];
};

/** At most this many ids are read from one plan or history row: eight weeks of five videos, with room to spare. */
const MAX_IDS = 200;

/**
 * Pexels ids from stored JSON: positive whole numbers only, each once, in
 * order. Anything else is ignored. At most MAX_IDS: the first ones, or with
 * "newest" the last ones (an avoid list is oldest first, and the clips shown
 * most recently matter most).
 */
export function clipIds(value: unknown, keep: "first" | "newest" = "first"): number[] {
  if (!Array.isArray(value)) return [];
  const newest = keep === "newest";
  const out = new Set<number>();
  for (const v of newest ? [...value].reverse() : value) {
    if (typeof v === "number" && Number.isSafeInteger(v) && v > 0) out.add(v);
    if (out.size >= MAX_IDS) break;
  }
  const ids = [...out];
  return newest ? ids.reverse() : ids;
}

/** The rotation and the clips to keep that a plan asks for, read defensively (it may come from stored JSON). */
export function footageChoice(plan: unknown): { rotation?: ClipRotation; keep?: ReadonlySet<number> } {
  if (!plan || typeof plan !== "object") return {};
  const p = plan as Record<string, unknown>;
  const seed = typeof p.footageSeed === "string" && p.footageSeed.trim() ? p.footageSeed.trim().slice(0, 200) : undefined;
  const turn = typeof p.footageTurn === "number" && Number.isSafeInteger(p.footageTurn) ? p.footageTurn : undefined;
  const keep = clipIds(p.footageIds);
  return {
    ...(seed ? { rotation: { seed, ...(turn !== undefined ? { turn } : {}), avoid: new Set(clipIds(p.footageAvoid, "newest")) } } : {}),
    ...(keep.length ? { keep: new Set(keep) } : {}),
  };
}

/** The plan without the footage fields: what the composition is given (it draws nothing from them). */
export function withoutFootageFields<T extends object>(plan: T): T {
  const { footageSeed: _s, footageTurn: _t, footageAvoid: _a, footageIds: _i, ...rest } = plan as T & FootageFields;
  return rest as T;
}

/** One stock clip a render showed: the query it answered and the Pexels id. */
export type ShownClip = { query: string; id: number };

/**
 * The plan as stored after its render, with the clips it showed: footageIds
 * (each once, in scene order) and, on each stock footage scene, the clip its
 * query got (source.clipId). The plan as it was when the render showed none.
 */
export function withShownClips<P extends ScenePlan>(plan: P, shown: readonly ShownClip[]): P & Pick<FootageFields, "footageIds"> {
  const ids = clipIds(shown.map((c) => c.id));
  if (!ids.length) return plan;
  const byQuery = new Map(shown.filter((c) => ids.includes(c.id)).map((c) => [c.query, c.id]));
  const scenes = plan.scenes.map((s) => {
    if (s.kind !== "footage" || s.source.type !== "stock") return s;
    const id = byQuery.get(s.source.query);
    return id ? { ...s, source: { ...s.source, clipId: id } } : s;
  });
  return { ...plan, scenes, footageIds: ids } as P & Pick<FootageFields, "footageIds">;
}

/** A stored scene's own clip (withShownClips), when it carries a valid one. */
function sceneClipId(scene: unknown): number | undefined {
  const source = scene && typeof scene === "object" ? (scene as { source?: unknown }).source : undefined;
  const id = source && typeof source === "object" ? (source as { clipId?: unknown }).clipId : undefined;
  return clipIds([id])[0];
}

/**
 * The Pexels ids a stored video showed: its footageIds, then the clip on
 * each of its stock footage scenes, each once. Read defensively: it is stored
 * JSON, or the part of it a caller passed on (a change request's base holds
 * the scenes and narration only, dentvid/jobs.ts).
 */
export function shownClipIds(plan: unknown): number[] {
  if (!plan || typeof plan !== "object") return [];
  const p = plan as { footageIds?: unknown; scenes?: unknown };
  const top = Array.isArray(p.footageIds) ? p.footageIds : [];
  const onScenes = Array.isArray(p.scenes) ? p.scenes.map(sceneClipId) : [];
  return clipIds([...top, ...onScenes]);
}

/**
 * Stored scenes without their clip ids: what a writer is shown of the
 * previous version (a Pexels id means nothing to it). Scenes that carry none
 * are handed back as they are.
 */
export function withoutClipIds<T>(scenes: T): T {
  if (!Array.isArray(scenes)) return scenes;
  let changed = false;
  const out = scenes.map((s: unknown) => {
    const source = s && typeof s === "object" ? (s as { source?: unknown }).source : undefined;
    if (!source || typeof source !== "object" || !("clipId" in source)) return s;
    changed = true;
    const { clipId: _id, ...rest } = source as { clipId?: unknown };
    return { ...(s as object), source: rest };
  });
  return (changed ? out : scenes) as T;
}

/**
 * The clips each finished render showed, by its output file, for the week:
 * its render callback (dentvid/jobs.ts) hands back the file path only, so
 * renderPlan notes them here and produceVideo takes them by that path
 * (takeFootage). Same process, read once. Renders nobody asks about (a
 * restyle, the bench) are forgotten after REMEMBERED_RENDERS more.
 */
const shownByOutput = new Map<string, ShownClip[]>();
const REMEMBERED_RENDERS = 64;

export function noteFootage(outputPath: string, shown: readonly ShownClip[]): void {
  const key = path.resolve(outputPath);
  shownByOutput.delete(key);
  shownByOutput.set(
    key,
    shown.filter((c) => typeof c.query === "string" && clipIds([c.id]).length).map((c) => ({ query: c.query, id: c.id })),
  );
  while (shownByOutput.size > REMEMBERED_RENDERS) shownByOutput.delete(shownByOutput.keys().next().value!);
}

/** The clips a render of `outputPath` showed ([] when it showed none or was not a renderPlan render); forgotten once read. */
export function takeFootage(outputPath: string | undefined): ShownClip[] {
  if (!outputPath) return [];
  const key = path.resolve(outputPath);
  const shown = shownByOutput.get(key) ?? [];
  shownByOutput.delete(key);
  return shown;
}
