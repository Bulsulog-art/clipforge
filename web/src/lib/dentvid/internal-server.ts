import type { SupabaseClient } from "@supabase/supabase-js";
import { internalPatterns, isInternalUser } from "./internal-traffic";

/**
 * Internal-traffic lookups that need Liman (rules in internal-traffic.ts).
 * Best effort: never throws; false when the account cannot be read (a real
 * clinic must never lose its measurement because a lookup failed — the
 * worst case is one internal payment counted, visible on /admin/ads).
 */

/** Is this account (by Liman user id) internal? */
export async function ownerIsInternal(db: SupabaseClient, ownerId: string | null | undefined): Promise<boolean> {
  if (!ownerId) return false;
  try {
    const { data, error } = await db.auth.admin.getUserById(ownerId);
    if (error || !data?.user) return false;
    return isInternalUser(data.user);
  } catch {
    return false;
  }
}

/** Liman holds other apps' users too: read at most this many pages of 1000. */
const MAX_PAGES = 10;

/**
 * The ids of every internal account among Liman's users, for the admin
 * views' default exclusion. Undefined when the users cannot be listed (the
 * views then fall back to the event tags alone and say so).
 */
export async function loadInternalUserIds(db: SupabaseClient): Promise<Set<string> | undefined> {
  try {
    const patterns = internalPatterns();
    const out = new Set<string>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return undefined;
      const users = data?.users ?? [];
      for (const u of users) if (isInternalUser(u, patterns)) out.add(u.id);
      if (users.length < 1000) break;
    }
    return out;
  } catch {
    return undefined;
  }
}
