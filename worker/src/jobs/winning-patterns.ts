import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
export { buildWinningHint } from "./winning-hint.js";

// Supabase to-one relations arrive as an object or a 1-element array.
function firstOf<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

type WinRow = {
  views: number | null;
  publishes: { clips: { hook: string | null } | { hook: string | null }[] | null } | { clips: { hook: string | null } | { hook: string | null }[] | null }[] | null;
};

/**
 * The closed learning loop: pull the hooks from THIS creator's best-performing
 * posted clips (by real views) so the scorer can favour moments that carry
 * similar energy. Every post that does well makes the next clip a little more
 * "them" — a compounding edge competitors structurally can't copy, because they
 * don't own both the publish + the metrics pipe.
 *
 * Returns [] gracefully (new users, no metrics yet, any DB hiccup) so scoring
 * is never blocked — the bias is purely additive.
 */
export async function getWinningHooks(userId: string, limit = 5): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("analytics_snapshots")
      .select("views, publishes(clips(hook))")
      .eq("user_id", userId)
      .not("views", "is", null)
      .order("views", { ascending: false })
      .limit(40);
    if (error || !data) return [];

    const hooks: string[] = [];
    for (const row of data as unknown as WinRow[]) {
      const pub = firstOf(row.publishes);
      const clip = firstOf(pub?.clips);
      const hook = clip?.hook?.trim();
      if (hook && !hooks.includes(hook)) hooks.push(hook);
      if (hooks.length >= limit) break;
    }
    return hooks;
  } catch (e) {
    logger.warn({ userId, err: (e as Error).message }, "getWinningHooks failed");
    return [];
  }
}
