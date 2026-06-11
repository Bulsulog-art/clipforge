import type { CaptionStyleId } from "./steps/captions.js";

/**
 * A niche TEMPLATE turns a single niche pick into a coherent look + voice —
 * caption typography, thumbnail recipe, music mood and the hook tone the
 * scorer writes in. Competitors leave you to configure each axis by hand and
 * still come out genre-agnostic-bland; here a finance clip and a comedy clip
 * are natively different out of the box. Every axis is still individually
 * overridable by the user (these are only the smart defaults).
 *
 * All values are constrained to the same enums the rest of the pipeline
 * already validates (caption styles, thumbnail recipes, bg-music moods).
 */
export type MusicMood =
  | "hype" | "chill" | "motivational" | "dramatic" | "lofi" | "cinematic" | "comedic";
export type ThumbnailStyle = "mrbeast" | "cinematic" | "minimal";

export type NicheTemplate = {
  captionStyle: CaptionStyleId;
  thumbnailStyle: ThumbnailStyle;
  musicMood: MusicMood;
  /** Injected into the scoring prompt so hooks match the niche's voice. */
  hookTone: string;
};

const DEFAULT_TEMPLATE: NicheTemplate = {
  captionStyle: "bold-pop",
  thumbnailStyle: "mrbeast",
  musicMood: "motivational",
  hookTone: "curiosity-driven — open a loop the viewer has to keep watching to close",
};

export const NICHE_TEMPLATES: Record<string, NicheTemplate> = {
  motivation:   { captionStyle: "bold-pop", thumbnailStyle: "mrbeast",   musicMood: "motivational", hookTone: "bold and inspiring — push the viewer to act right now" },
  business:     { captionStyle: "clean",    thumbnailStyle: "minimal",   musicMood: "chill",        hookTone: "authoritative and credible — lead with the sharpest insight" },
  finance:      { captionStyle: "clean",    thumbnailStyle: "minimal",   musicMood: "chill",        hookTone: "credible and specific with real numbers — no hype, no clickbait" },
  health:       { captionStyle: "clean",    thumbnailStyle: "cinematic", musicMood: "chill",        hookTone: "reassuring and evidence-based — promise a concrete takeaway" },
  tech:         { captionStyle: "neon",     thumbnailStyle: "cinematic", musicMood: "cinematic",    hookTone: "crisp and forward-looking — lead with the wow capability" },
  education:    { captionStyle: "clean",    thumbnailStyle: "minimal",   musicMood: "chill",        hookTone: "clear and curiosity-driven — promise one thing they'll learn" },
  comedy:       { captionStyle: "hype",     thumbnailStyle: "mrbeast",   musicMood: "comedic",      hookTone: "playful and punchy — set up the funny beat fast" },
  fitness:      { captionStyle: "hype",     thumbnailStyle: "mrbeast",   musicMood: "hype",         hookTone: "high-energy and commanding — challenge the viewer" },
  spirituality: { captionStyle: "minimal",  thumbnailStyle: "cinematic", musicMood: "lofi",         hookTone: "calm and reflective — pose a question that lingers" },
  history:      { captionStyle: "bold-pop", thumbnailStyle: "cinematic", musicMood: "dramatic",     hookTone: "intriguing — open a story loop with a startling detail" },
  science:      { captionStyle: "neon",     thumbnailStyle: "cinematic", musicMood: "cinematic",    hookTone: "astonishing — lead with the surprising fact" },
  lifestyle:    { captionStyle: "minimal",  thumbnailStyle: "mrbeast",   musicMood: "lofi",         hookTone: "aspirational and relatable — make them picture the result" },
  default:      DEFAULT_TEMPLATE,
};

export function resolveNicheTemplate(niche?: string | null): NicheTemplate {
  return NICHE_TEMPLATES[(niche ?? "").toLowerCase()] ?? DEFAULT_TEMPLATE;
}
