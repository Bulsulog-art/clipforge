/**
 * Warms the browser's cache for a media file the way the player will read
 * it: through a media element, never fetch().
 *
 * Why it matters: the reverse proxy in front of dentvideo.com (Traefik's
 * compress middleware) compresses any response whose request accepts it —
 * audio/mpeg included, 206 range responses included — and leaves the
 * file's ETag as it is. fetch() sends `Accept-Encoding: gzip, deflate, br,
 * zstd`, so it got a zstd-encoded 200 that the HTTP cache stored under the
 * same URL and validator as the plain file. The <audio> element then asked
 * for byte ranges (`Accept-Encoding: identity`), the cache revalidated
 * (304: same ETag) and sliced the stored *compressed* bytes into a 206
 * still labelled `content-encoding: zstd` → ERR_CONTENT_DECODING_FAILED,
 * retried in a loop. A media element asks with `identity;q=1, *;q=0`, so the
 * proxy never compresses what it caches, and the player finds exactly the
 * bytes it expects.
 */

type MediaLike = { preload: string; muted: boolean; src: string };

const warming: string[] = [];
const held = new Map<string, MediaLike>();
/** How many warm-ups to keep a reference to: the next one or two swipes. */
const KEEP = 3;

export function prefetchMedia(src: string, make: () => MediaLike | null = defaultAudio): boolean {
  if (held.has(src)) return false;
  const el = make();
  if (!el) return false;
  el.preload = "auto";
  el.muted = true;
  el.src = src;
  held.set(src, el);
  warming.push(src);
  // Dropping the reference does not abort a load in progress; it only lets the element be collected once done.
  while (warming.length > KEEP) held.delete(warming.shift()!);
  return true;
}

function defaultAudio(): MediaLike | null {
  return typeof Audio === "undefined" ? null : new Audio();
}

/** For tests. */
export function _resetMediaPrefetch() {
  warming.length = 0;
  held.clear();
}
