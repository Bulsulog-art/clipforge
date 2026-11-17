import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BACKGROUND_PATH } from "./scene-plan.js";

/**
 * Where the renderer gets a plan's background photos.
 *
 * The pixels have ONE home: web/public/dentvideo/backgrounds (the browser
 * preview loads them from there, and dentvideo.com serves them). The worker's
 * Docker build context is worker/ only, so instead of a second ~3–20 MB copy
 * in the worker image (two copies drift), the renderer:
 *
 *   1. reads the file locally when it can — DENTVID_BACKGROUNDS_DIR, or the
 *      monorepo's web/public folder next to the worker (dev, CI, local renders);
 *   2. otherwise downloads it once from DENTVID_BACKGROUNDS_BASE_URL
 *      (default https://dentvideo.com, which serves /dentvideo/*.jpg as-is) into
 *      a disk cache shared by every render in the process' lifetime.
 *
 * Each photo is then copied into the render's staging folder, like footage and
 * audio, because the renderer only fetches what its own static server holds.
 * A photo that cannot be had is skipped with a warning — never a failed video.
 */

const CACHE_DIR = path.join(os.tmpdir(), "dentvid-backgrounds");

function localDirs(): string[] {
  return [
    process.env.DENTVID_BACKGROUNDS_DIR,
    path.resolve(process.cwd(), "../web/public/dentvideo/backgrounds"),
    path.resolve(process.cwd(), "web/public/dentvideo/backgrounds"),
  ].filter((d): d is string => Boolean(d));
}

async function exists(p: string): Promise<boolean> {
  return fs.stat(p).then((s) => s.isFile() && s.size > 0, () => false);
}

/** A local file holding the photo at `webPath`, downloading it if needed. */
export async function backgroundFile(
  webPath: string,
  opts: { fetchImpl?: typeof fetch; baseUrl?: string; dirs?: string[]; cacheDir?: string } = {},
): Promise<string> {
  if (!BACKGROUND_PATH.test(webPath)) throw new Error(`not a library background: ${webPath}`);
  const name = path.basename(webPath);
  for (const dir of opts.dirs ?? localDirs()) {
    const p = path.join(dir, name);
    if (await exists(p)) return p;
  }
  const cacheDir = opts.cacheDir ?? CACHE_DIR;
  const cached = path.join(cacheDir, name);
  if (await exists(cached)) return cached;
  const base = (opts.baseUrl ?? process.env.DENTVID_BACKGROUNDS_BASE_URL ?? "https://dentvideo.com").replace(/\/$/, "");
  const res = await (opts.fetchImpl ?? fetch)(`${base}${webPath}`);
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) throw new Error(`download ${webPath}: ${res.status} ${type}`);
  await fs.mkdir(cacheDir, { recursive: true });
  const tmp = `${cached}.${process.pid}.part`;
  await fs.writeFile(tmp, Buffer.from(await res.arrayBuffer()));
  await fs.rename(tmp, cached);
  return cached;
}

/**
 * Stages a plan's backgrounds into `assetDir` and returns the names the
 * composition should load (`<renderId>/<file>`), in order, skipping any that
 * could not be had.
 */
export async function stageBackgrounds(
  webPaths: string[] | undefined,
  opts: { assetDir: string; renderId: string; onWarn?: (m: string) => void; fetchImpl?: typeof fetch; baseUrl?: string; dirs?: string[]; cacheDir?: string },
): Promise<string[]> {
  const staged: string[] = [];
  for (const webPath of webPaths ?? []) {
    try {
      const file = await backgroundFile(webPath, opts);
      const name = path.basename(file);
      await fs.copyFile(file, path.join(opts.assetDir, name));
      staged.push(`${opts.renderId}/${name}`);
    } catch (e) {
      opts.onWarn?.(`background ${webPath} skipped: ${(e as Error).message}`);
    }
  }
  return staged;
}
