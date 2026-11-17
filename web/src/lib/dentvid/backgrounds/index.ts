/**
 * Background photos for DentVideo videos — the web side.
 *
 * For the live preview (@remotion/player with the worker's composition):
 *
 *   const ids = suggestBackgrounds({ plan, topic, service, language });   // 10–20, best first
 *   const plan2 = withBackgrounds(plan, ids.slice(0, 3));                 // or the clinic's picks
 *   <Player inputProps={{ plan: plan2, footage: {}, watermark: false }} … />
 *
 * plan.backgrounds are web paths (/dentvideo/backgrounds/<id>.jpg) served from
 * web/public, so the composition loads them as-is in the browser; the worker
 * stages the same files for its renders (worker/src/remotion/backgrounds.ts).
 */
export {
  suggestBackgrounds,
  defaultBackgrounds,
  backgroundSrc,
  backgroundId,
  SUGGEST_MIN,
  SUGGEST_MAX,
  type SuggestInput,
} from "./suggest";
export { BACKGROUND_LIBRARY, type LibraryImage } from "./library";
import { backgroundId, backgroundSrc } from "./suggest";

/** Most photos a video carries (matches MAX_BACKGROUNDS in the worker's scene-plan.ts). */
export const MAX_PHOTOS = 4;

/** Library ids, validated: known ids only, no duplicates, at most MAX_PHOTOS. Unknown ids are dropped. */
export function cleanPhotoIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const known = ids.filter((id): id is string => typeof id === "string" && backgroundId(backgroundSrc(id)) === id);
  return [...new Set(known)].slice(0, MAX_PHOTOS);
}

/** The plan with these photos behind its text (an empty list removes them). */
export function withBackgrounds<P extends object>(plan: P, ids: string[]): P & { backgrounds?: string[] } {
  const srcs = cleanPhotoIds(ids).map(backgroundSrc);
  const { backgrounds: _old, ...rest } = plan as P & { backgrounds?: unknown };
  return (srcs.length ? { ...rest, backgrounds: srcs } : rest) as P & { backgrounds?: string[] };
}

/** The ids currently behind a stored plan's text. */
export function chosenPhotoIds(plan: { backgrounds?: unknown } | null | undefined): string[] {
  const list = Array.isArray(plan?.backgrounds) ? plan.backgrounds : [];
  return list.map((src) => (typeof src === "string" ? backgroundId(src) : undefined)).filter((id): id is string => Boolean(id));
}
