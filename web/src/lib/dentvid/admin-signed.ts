/**
 * Signed URLs for the admin panel's players and thumbnails: generated on the
 * server for each page render, from the private 'dentvid' bucket, valid for
 * ADMIN_SIGNED_URL_TTL_SEC only — long enough to watch a short video after
 * opening the page, short enough that a copied link soon stops working.
 * (The clinic's own library uses an hour; the owner's panel does not need it.)
 */
import { BUCKET } from "./supabase";

export const ADMIN_SIGNED_URL_TTL_SEC = 15 * 60;
/** Hard ceiling: no caller may ask for longer. */
export const ADMIN_SIGNED_URL_MAX_SEC = 30 * 60;
/** At most this many objects signed per page (the Videos grid pages beyond it). */
export const ADMIN_SIGN_BATCH = 120;

type Storage = {
  storage: {
    from(bucket: string): {
      createSignedUrls(paths: string[], expiresIn: number): PromiseLike<{ data: { path: string | null; signedUrl: string | null }[] | null; error: unknown }>;
    };
  };
};

/** A storage key the panel may sign: inside an owner's folder, no traversal. */
export const signablePath = (p: unknown): p is string => typeof p === "string" && /^[0-9a-f-]{36}\/[\w./-]{1,300}$/i.test(p) && !p.includes("..");

/** path → signed URL for the given keys (deduplicated, invalid keys skipped). Never throws. */
export async function signAdminPaths(db: Storage, paths: (string | null | undefined)[], ttlSec = ADMIN_SIGNED_URL_TTL_SEC): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const want = [...new Set(paths.filter(signablePath))].slice(0, ADMIN_SIGN_BATCH);
  if (!want.length) return out;
  const ttl = Math.max(30, Math.min(ADMIN_SIGNED_URL_MAX_SEC, Math.floor(ttlSec)));
  try {
    const { data } = await db.storage.from(BUCKET).createSignedUrls(want, ttl);
    for (const s of data ?? []) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  } catch {
    // no URLs: the panel shows "no file"
  }
  return out;
}
