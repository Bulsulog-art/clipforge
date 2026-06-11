export type AspectId = "9:16" | "1:1" | "16:9";

export type AspectSpec = {
  id: AspectId;
  w: number;
  h: number;
  /** ffmpeg scale+crop filter (comma-joined) producing w×h, centre-cropped. */
  scaleCrop: string;
  /** ASS caption margin from the bottom (px), proportional to height. */
  captionMarginV: number;
  /** ASS hook margin from the top (px), proportional to height. */
  hookMarginV: number;
};

// Margins derive from height so 9:16 reproduces the previous hard-coded values
// EXACTLY (0.1875·1920 = 360, 0.375·1920 = 720) — zero change to existing renders.
function spec(id: AspectId, w: number, h: number, scaleCrop: string): AspectSpec {
  return { id, w, h, scaleCrop, captionMarginV: Math.round(0.1875 * h), hookMarginV: Math.round(0.375 * h) };
}

const ASPECTS: Record<AspectId, AspectSpec> = {
  // Default — vertical, unchanged behaviour.
  "9:16": spec("9:16", 1080, 1920, "scale=-2:1920:force_original_aspect_ratio=increase,crop=1080:1920"),
  // Square for feed posts.
  "1:1": spec("1:1", 1080, 1080, "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080"),
  // Landscape for YouTube/X.
  "16:9": spec("16:9", 1920, 1080, "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080"),
};

export const DEFAULT_ASPECT: AspectId = "9:16";

export function resolveAspect(id?: string | null): AspectSpec {
  return ASPECTS[(id as AspectId)] ?? ASPECTS[DEFAULT_ASPECT];
}
