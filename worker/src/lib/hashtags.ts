/**
 * Instagram allows at most five hashtags on a post or Reel (announced
 * December 2025). Every hashtag list the worker builds for Instagram is held
 * to this: the DentVideo post kit (dentvid/post-kit.ts), the copywriter's
 * tags (dental/copywriter.ts) and the ClipForge Instagram publisher. The web
 * keeps the same number in web/src/lib/dentvid/posting.ts and the iOS app in
 * DentVideoCore/PostKit.swift.
 */
export const INSTAGRAM_MAX_HASHTAGS = 5;

/**
 * The first `max` distinct tags, in the order given (callers put the most
 * relevant first). Tags count as the same whatever their case or a leading
 * "#"; the first spelling wins. Empty tags are dropped.
 */
export function capHashtags(tags: readonly string[], max = INSTAGRAM_MAX_HASHTAGS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = tag.trim().replace(/^#/, "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag.trim());
    if (out.length >= max) break;
  }
  return out;
}
