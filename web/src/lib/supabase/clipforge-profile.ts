import type { SupabaseClient, User } from "@supabase/supabase-js";
import { joinClipforgePatch } from "@/lib/clipforge-membership";

/**
 * Make sure a signed-in user has a clipforge.profiles row.
 *
 * On the cloud project a trigger on auth.users did this for every new user.
 * On Liman, auth.users is shared by several apps, so ClipForge adds no
 * trigger there (supabase/liman/0017_clipforge_schema.sql): the profile is
 * created the first time the user reaches ClipForge, with the same starting
 * values the trigger used (1 credit), and the account is marked as a
 * ClipForge account (lib/clipforge-membership.ts).
 *
 * Idempotent: an existing profile is left untouched (insert … on conflict do
 * nothing), and the marker is written only when this call created the row.
 * Each process remembers the users it has checked, so the database is asked
 * at most once per user per process. Failures are logged and retried on the
 * next request; they never fail the caller.
 */
const checked = new Set<string>();
const MAX_REMEMBERED = 50_000;

export async function ensureClipforgeProfile(
  user: Pick<User, "id" | "email" | "app_metadata">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any schema: the service client is typed for "clipforge"
  svc: SupabaseClient<any, any, any>,
): Promise<void> {
  if (checked.has(user.id) || !user.email) return;
  try {
    const { data, error } = await svc
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          credits_balance: 1,
          free_credits_refilled_at: new Date().toISOString().slice(0, 10),
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) {
      console.warn("[clipforge-profile] profile upsert failed", error.message);
      return;
    }
    if (data && data.length > 0) {
      const patch = joinClipforgePatch(user.app_metadata);
      if (patch) {
        const { error: metaErr } = await svc.auth.admin.updateUserById(user.id, { app_metadata: patch });
        if (metaErr) console.warn("[clipforge-profile] app_metadata marker failed", metaErr.message);
      }
    }
    if (checked.size >= MAX_REMEMBERED) checked.clear();
    checked.add(user.id);
  } catch (e) {
    console.warn("[clipforge-profile] ensure failed", e instanceof Error ? e.message : e);
  }
}

/** Test hook. */
export function _resetClipforgeProfileCache() {
  checked.clear();
}
