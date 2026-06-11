import { logger } from "../logger.js";

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
 * Detect face x-centres for the clip. Render-test integration point: wire a face
 * detector (a fal model, or a Python mediapipe helper) keyed by FACE_DETECT_MODEL
 * + sample N frames via ffmpeg, returning each frame's primary-face x-centre.
 * Returns [] when no detector is configured → smoothCropX falls back to centre,
 * i.e. the current behaviour, so enabling the flag is always safe.
 */
export async function detectFaceCentresX(_args: {
  sourcePath: string;
  clipStartSec: number;
  clipEndSec: number;
  frameW: number;
  samples?: number;
}): Promise<number[]> {
  if (!process.env.FACE_DETECT_MODEL) return [];
  // Intentionally not implemented blind: plug the configured detector here and
  // render-test. Until then we degrade to centre crop (no behaviour change).
  logger.info({ model: process.env.FACE_DETECT_MODEL }, "face detect configured but not wired — centre crop");
  return [];
}
