import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { webpackOverride } from "./webpack-override.js";
import { LIMITS, dimensions, sceneOffsets, stockQueries, totalSeconds } from "./scene-plan.js";
import type { ScenePlan } from "./scene-plan.js";
import { resolveStockClips } from "./stock.js";
import { stageBackgrounds } from "./backgrounds.js";
import type { LogoStyle } from "./logo-style.js";
import { isInside, mediaRoots } from "../lib/media-input.js";

/**
 * Renders a scene plan to an mp4.
 *
 * The bundle is built once per process and reused. Bundling is webpack, which
 * costs seconds; doing it per job would add that to every render for no
 * benefit, since the compositions only change when we deploy.
 */

const COMPOSITION_ID = "ClipForgeVideo";

/**
 * The public directory handed to the bundler.
 *
 * Deliberately empty. The bundler *copies* whatever is here into the bundle
 * output at build time — it does not serve this path — so anything staged here
 * after the first bundle is invisible to the renderer. Naming it explicitly
 * still matters: without it the bundler would adopt whatever `public` folder
 * happens to sit near the entry point.
 *
 * Footage is staged in `stagingDir()` below, inside the bundle itself.
 */
export const PUBLIC_ROOT =
  process.env.REMOTION_PUBLIC_DIR ?? path.resolve(process.cwd(), ".remotion-public");

/**
 * Where footage is staged so the renderer can actually fetch it.
 *
 * OffthreadVideo only downloads over http(s): an absolute path 404s against
 * the bundle's own server and `file://` is refused. Remotion's mechanism is
 * staticFile(), which resolves to `/public/<name>` on the bundle's static
 * server — and that server reads from the bundle directory on disk, at request
 * time.
 *
 * The bundle is built once and reused, so staging into the *source* public
 * directory only works for the first render in a process; every later one 404s
 * because its files were written after the copy. Staging into the bundle's own
 * public folder works for all of them. Each render gets a subdirectory, deleted
 * when it finishes, and webpack still only runs once.
 *
 * Only a second render in the same process reveals the difference. The first
 * one passes either way, which is exactly why this is written down.
 */
export function stagingDir(serveUrl: string, renderId: string): string {
  return path.join(serveUrl, "public", renderId);
}

let bundlePromise: Promise<string> | undefined;

/** Serve URL for the compositions, built once and shared. */
export function getBundle(entryPoint?: string): Promise<string> {
  if (!bundlePromise) {
    const entry = entryPoint ?? path.resolve(process.cwd(), "src/remotion/index.ts");
    bundlePromise = fs
      .mkdir(PUBLIC_ROOT, { recursive: true })
      .then(() => bundle({ entryPoint: entry, webpackOverride, publicDir: PUBLIC_ROOT }))
      .catch((e) => {
        // A failed bundle must not be cached, or every later render in this
        // process inherits the same rejected promise.
        bundlePromise = undefined;
        throw e;
      });
  }
  return bundlePromise;
}

/** Only for tests and for a deploy that wants a cold bundle. */
export function resetBundle(): void {
  bundlePromise = undefined;
}

export type RenderPlanArgs = {
  plan: ScenePlan;
  /** Directory for downloaded footage and the output file. */
  workDir: string;
  outputPath: string;
  /** Local paths to the clips the user attached, in the order they uploaded them. */
  userAssets?: string[];
  voiceoverSrc?: string;
  musicSrc?: string;
  watermark?: boolean;
  /** Local path of a client logo (a file the job wrote into its work dir), drawn in the top corner. */
  logoSrc?: string;
  /** How the logo is drawn (chip, size by aspect), from dental/logo.ts. */
  logoStyle?: LogoStyle;
  pexelsApiKey?: string;
  /** How many frames to render at once. Tuned by the caller to the box. */
  concurrency?: number;
  onProgress?: (fraction: number) => void;
  onWarn?: (message: string) => void;
  entryPoint?: string;
  /**
   * Extra directories local assets may be staged from. The OS temp dir (job
   * work dirs) and `workDir` are always allowed; anything else — a URL, a
   * path outside them, a symlink pointing out — is never staged.
   */
  assetRoots?: string[];
};

export type RenderPlanResult = {
  outputPath: string;
  durationSec: number;
  width: number;
  height: number;
  /** Scenes that asked for footage and did not get any. */
  missingFootage: number;
};

/**
 * Copies one local asset (voiceover, music, logo, a user's clip) into the
 * render's staging folder and returns the name the composition loads, or
 * undefined (with a warning) when it may not or cannot be staged.
 *
 * Only plain local files inside `roots` are staged: never a URL (the
 * headless browser would fetch it from inside our network), never a path
 * elsewhere on the box. The renderer's static server only serves what is in
 * the staging folder, so this is the single gate for what a video can embed.
 */
export async function stageLocalAsset(
  src: string | undefined,
  opts: { assetDir: string; renderId: string; roots: string[]; onWarn?: (m: string) => void; what?: string },
): Promise<string | undefined> {
  if (!src) return undefined;
  const what = opts.what ?? "asset";
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || !path.isAbsolute(src)) {
    opts.onWarn?.(`${what} is not a local file; not staged`);
    return undefined;
  }
  if (!isInside(src, opts.roots)) {
    opts.onWarn?.(`${what} is outside the job's directories; not staged`);
    return undefined;
  }
  const dest = path.join(opts.assetDir, path.basename(src));
  try {
    const st = await fs.lstat(src);
    if (!st.isFile()) throw new Error("not a regular file");
    await fs.copyFile(src, dest);
    return toRenderableSrc(dest, opts.renderId);
  } catch (e) {
    opts.onWarn?.(`could not stage ${what} ${path.basename(src)}: ${(e as Error).message}`);
    return undefined;
  }
}

/**
 * Turns a local path into something the renderer can actually fetch.
 *
 * OffthreadVideo downloads its source, and it only speaks http(s) — a bare
 * `/var/folders/...` resolves against the bundle's own dev server and 404s,
 * and `file://` is refused outright. Remotion's answer is staticFile(): the
 * work directory is handed to the renderer as its public folder, and the
 * composition is given a plain filename to look up inside it.
 *
 * Nothing but an end-to-end render surfaces this. Both earlier attempts
 * passed every unit test and produced a video with the footage scenes blank.
 */
function toRenderableSrc(localPath: string, renderId: string): string {
  if (/^https?:/.test(localPath)) return localPath;
  return `${renderId}/${path.basename(localPath)}`;
}

/**
 * Resolves what each footage scene should actually play.
 *
 * Keyed by scene index rather than by query, because two scenes can ask for
 * the same shot and the composition addresses scenes positionally. Scenes with
 * no resolvable source are simply absent from the map, which the composition
 * treats as "draw the theme background instead".
 */
export async function resolveFootage(
  plan: ScenePlan,
  opts: {
    workDir: string;
    userAssets: string[];
    /** Names the staging subdirectory, which is also the staticFile() prefix. */
    renderId?: string;
    pexelsApiKey?: string;
    fetchImpl?: typeof fetch;
    onWarn?: (message: string) => void;
  },
): Promise<Record<string, string>> {
  const { width } = dimensions(plan);
  const renderId = opts.renderId ?? path.basename(opts.workDir);

  // Every distinct stock query, with the longest scene that uses it so the
  // chosen clip is long enough for its worst case.
  const wanted = stockQueries(plan).map((query) => {
    const seconds = Math.max(
      ...plan.scenes
        .filter((s) => s.kind === "footage" && s.source.type === "stock" && s.source.query === query)
        .map((s) => s.seconds),
    );
    return { query, seconds };
  });

  const stock = wanted.length
    ? await resolveStockClips(wanted, {
        apiKey: opts.pexelsApiKey,
        workDir: opts.workDir,
        aspect: plan.aspect,
        targetWidth: width,
        fetchImpl: opts.fetchImpl,
        onWarn: opts.onWarn,
      })
    : new Map();

  const footage: Record<string, string> = {};
  plan.scenes.forEach((scene, index) => {
    if (scene.kind !== "footage") return;
    if (scene.source.type === "stock") {
      const clip = stock.get(scene.source.query);
      if (clip) footage[String(index)] = toRenderableSrc(clip.path, renderId);
      return;
    }
    const asset = opts.userAssets[scene.source.assetIndex];
    if (asset) {
      footage[String(index)] = toRenderableSrc(asset, renderId);
    } else {
      // The plan validator already rejects out-of-range indexes, so reaching
      // here means the file itself went missing between validation and render.
      opts.onWarn?.(`user asset ${scene.source.assetIndex} missing at render time`);
    }
  });

  return footage;
}

export async function renderPlan(args: RenderPlanArgs): Promise<RenderPlanResult> {
  // Bundle first: the staging directory lives inside the bundle, because that
  // is the only place the renderer's static server reads from.
  const serveUrl = await getBundle(args.entryPoint);

  // Each render stages into its own subdirectory so two concurrent renders
  // never see each other's files.
  const renderId = randomUUID();
  const assetDir = stagingDir(serveUrl, renderId);
  await fs.mkdir(assetDir, { recursive: true });

  try {
    return await renderStaged({ ...args, renderId, assetDir, serveUrl });
  } finally {
    // Best effort: a leftover staging directory costs disk, not correctness.
    await fs.rm(assetDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function renderStaged(
  args: RenderPlanArgs & { renderId: string; assetDir: string; serveUrl: string },
): Promise<RenderPlanResult> {
  const {
    plan,
    outputPath,
    userAssets = [],
    voiceoverSrc,
    musicSrc,
    logoSrc,
    logoStyle,
    watermark = false,
    pexelsApiKey,
    concurrency,
    onProgress,
    onWarn,
    renderId,
    assetDir,
    serveUrl,
  } = args;

  // Only plain local files inside the job's directories are ever staged (stageLocalAsset).
  const roots = mediaRoots([args.workDir, ...(args.assetRoots ?? [])]);

  // A user's clip lives wherever it was downloaded; copy it in so every source
  // the composition asks for resolves from one directory. One that cannot be
  // staged keeps its index (empty), so its scene falls back to the brand look.
  const stagedUserAssets: string[] = [];
  for (const asset of userAssets) {
    const staged = await stageLocalAsset(asset, { assetDir, renderId, roots, onWarn, what: "user asset" });
    stagedUserAssets.push(staged ? path.join(assetDir, path.basename(asset)) : "");
  }

  // Audio has the same constraint as footage: the composition can only fetch
  // what is staged in its public folder. Both were passed as raw local paths
  // and silently never played.
  const stagedVoiceover = await stageLocalAsset(voiceoverSrc, { assetDir, renderId, roots, onWarn, what: "voiceover" });
  const stagedMusic = await stageLocalAsset(musicSrc, { assetDir, renderId, roots, onWarn, what: "music" });
  const stagedLogo = await stageLocalAsset(logoSrc, { assetDir, renderId, roots, onWarn, what: "logo" });

  const footage = await resolveFootage(plan, {
    workDir: assetDir,
    renderId,
    userAssets: stagedUserAssets,
    pexelsApiKey,
    onWarn,
  });

  const footageScenes = plan.scenes.filter((s) => s.kind === "footage").length;
  const missingFootage = footageScenes - Object.keys(footage).length;
  if (missingFootage > 0) onWarn?.(`${missingFootage} footage scene(s) without a clip; captions shown on the brand look`);
  // A footage scene with no clip and no caption would be an empty frame.
  const filled = withoutEmptyFootage(plan, footage);

  // Library photos behind the text (plan.backgrounds), staged like everything
  // else. If none could be had, the plan goes out without them: a plain
  // theme background beats a render that waits on an image that 404s.
  const backgroundSrcs = await stageBackgrounds(plan.backgrounds, { assetDir, renderId, onWarn });

  const inputProps = {
    plan: plan.backgrounds && !backgroundSrcs.length ? { ...filled.plan, backgrounds: undefined } : filled.plan,
    ...(backgroundSrcs.length ? { backgroundSrcs } : {}),
    footage: filled.footage,
    voiceoverSrc: stagedVoiceover,
    musicSrc: stagedMusic,
    watermark,
    logoSrc: stagedLogo,
    ...(stagedLogo && logoStyle ? { logoStyle } : {}),
  };

  // Use a specific browser binary when one is configured (a dev box with a
  // preinstalled chrome-headless-shell); otherwise Remotion's own download.
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_ID,
    inputProps,
    browserExecutable,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    concurrency,
    // Short-form is watched on a phone over cellular; a visually lossless
    // encode at a sane bitrate beats a pristine file nobody waits for.
    crf: 23,
    browserExecutable,
    onProgress: onProgress ? ({ progress }) => onProgress(progress) : undefined,
  });

  return {
    outputPath,
    durationSec: totalSeconds(plan),
    width: composition.width,
    height: composition.height,
    missingFootage,
  };
}

/** Exported for the job layer: where each scene begins, for progress reporting. */
export { sceneOffsets };

/**
 * A footage scene whose clip could not be had (no PEXELS_API_KEY, no result,
 * a failed download) still shows its caption on the brand look. One with no
 * caption either would ship an empty frame — never acceptable — so its time
 * goes to the scene before it (or after it, for the first scene), keeping
 * the total length the narration was timed to. Footage indices are remapped.
 */
export function withoutEmptyFootage(plan: ScenePlan, footage: Record<string, string>): { plan: ScenePlan; footage: Record<string, string> } {
  const empty = (i: number) => {
    const s = plan.scenes[i];
    return s.kind === "footage" && !footage[String(i)] && !s.caption?.trim();
  };
  if (!plan.scenes.some((_, i) => empty(i)) || plan.scenes.every((_, i) => empty(i))) return { plan, footage };
  const scenes = plan.scenes.map((s) => ({ ...s }));
  const keep = scenes.map((_, i) => !empty(i));
  const max = LIMITS.sceneSeconds.max;
  scenes.forEach((s, i) => {
    if (keep[i]) return;
    // Its time goes to the neighbours, each only up to the per-scene limit.
    const prev = scenes.slice(0, i).map((_, j) => j).reverse().find((j) => keep[j]);
    const next = scenes.map((_, j) => j).find((j) => j > i && keep[j]);
    const targets = [prev, next].filter((j): j is number => j !== undefined);
    const room = targets.reduce((r, j) => r + Math.max(0, max - scenes[j].seconds), 0);
    if (room + 1e-6 < s.seconds) {
      keep[i] = true; // nowhere to put it: keep the scene (brand background) rather than break the plan
      return;
    }
    let left = s.seconds;
    for (const j of targets) {
      const add = Math.min(left, max - scenes[j].seconds);
      scenes[j].seconds = Math.round((scenes[j].seconds + add) * 100) / 100;
      left -= add;
    }
  });
  const remapped: Record<string, string> = {};
  let n = 0;
  scenes.forEach((_, i) => {
    if (!keep[i]) return;
    if (footage[String(i)]) remapped[String(n)] = footage[String(i)];
    n++;
  });
  return { plan: { ...plan, scenes: scenes.filter((_, i) => keep[i]) } as ScenePlan, footage: remapped };
}

