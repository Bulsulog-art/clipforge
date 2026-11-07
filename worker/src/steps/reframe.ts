import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { logger } from "../logger.js";

const execFileAsync = promisify(execFile);

/**
 * Compute a single, stable horizontal crop offset that keeps the speaker in
 * frame, from a set of detected face x-centres sampled across the clip. Pure +
 * deterministic (median = robust to a stray mis-detection), clamped to the
 * frame — so it's fully unit-testable. The detection itself (detectFaceCentresX)
 * is the external, render-test part.
 *
 * @param faceCentresX detected face centre x-coords (px, 0..frameW)
 * @param frameW       width of the scaled source frame (px)
 * @param cropW        width of the output crop window (px)
 * @returns crop x-offset (px), clamped to [0, frameW - cropW]
 */
export function smoothCropX(faceCentresX: number[], frameW: number, cropW: number): number {
  const centreFallback = Math.round((frameW - cropW) / 2);
  if (cropW >= frameW) return 0;
  const valid = faceCentresX.filter((x) => Number.isFinite(x) && x >= 0 && x <= frameW);
  if (valid.length === 0) return Math.max(0, centreFallback);
  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const x = median - cropW / 2;
  return Math.round(Math.max(0, Math.min(frameW - cropW, x)));
}

/**
 * Where to put the crop window, in the SCALED frame the render filter crops
 * from, given face centres measured in SOURCE pixels.
 *
 * Mirrors resolveAspect().scaleCrop: the source is scaled up until it covers
 * the output (force_original_aspect_ratio=increase) and the overflow is
 * cropped. Only horizontal overflow is steered — that is the case for a
 * landscape source cut to 9:16 or 1:1, which is every podcast and talking
 * head. Returns undefined (= keep the centre crop) when there is no
 * horizontal overflow or no face was found.
 */
export function faceCropOffset(args: {
  srcW: number;
  srcH: number;
  outW: number;
  outH: number;
  centresSrcX: number[];
}): number | undefined {
  const { srcW, srcH, outW, outH, centresSrcX } = args;
  if (srcW <= 0 || srcH <= 0 || centresSrcX.length === 0) return undefined;
  const scale = Math.max(outW / srcW, outH / srcH);
  // ffmpeg's -2 rounds the scaled width to an even number.
  const scaledW = Math.round((srcW * scale) / 2) * 2;
  if (scaledW <= outW) return undefined;
  return smoothCropX(centresSrcX.map((x) => x * scale), scaledW, outW);
}

export type FaceTrack = { width: number; height: number; centres: number[] };

const FACE_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../face/face_track.py");

/**
 * Sample the clip's frames with the OpenCV helper (worker/face/face_track.py)
 * and return the speaker's x-centre per sampled frame.
 *
 * Never throws: no Python, no OpenCV, a timeout or bad output all yield null,
 * and the caller renders the plain centre crop it always did.
 */
export async function detectFaces(args: {
  sourcePath: string;
  clipStartSec: number;
  clipEndSec: number;
  samples?: number;
}): Promise<FaceTrack | null> {
  if (process.env.FACE_TRACK_ENABLED === "false") return null;
  const python = process.env.FACE_TRACK_PYTHON || "/opt/face/bin/python";
  try {
    const { stdout } = await execFileAsync(
      python,
      ["-I", FACE_SCRIPT, args.sourcePath, String(args.clipStartSec), String(args.clipEndSec), String(args.samples ?? 12)],
      { timeout: 60_000, maxBuffer: 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as FaceTrack;
    if (!Array.isArray(parsed.centres) || !(parsed.width > 0) || !(parsed.height > 0)) return null;
    return parsed;
  } catch (e) {
    logger.warn({ err: (e as Error).message }, "face tracking unavailable — centre crop");
    return null;
  }
}
