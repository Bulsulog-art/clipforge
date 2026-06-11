import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { fetchMetrics, toSnapshotRow, type SnapshotRow } from "./metrics-adapters.js";

// Don't poll forever — metrics on a clip plateau after a few weeks. 30 days
// keeps the working set small + respects platform rate limits.
const LOOKBACK_DAYS = 30;
const MAX_PER_RUN = 500;

type SocialAccount = { access_token: string; external_user_id: string | null };

type PublishRow = {
  id: string;
  user_id: string;
  platform: string;
  external_post_id: string | null;
  social_accounts: SocialAccount | SocialAccount[] | null;
};

/** Supabase returns a to-one relation as an object or a 1-element array. */
function firstAccount(rel: PublishRow["social_accounts"]): SocialAccount | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

/**
 * Poll live engagement for recently-published clips and append a snapshot per
 * post to clipforge.analytics_snapshots. This is the keystone the learning loop
 * is built on: once real views/likes land here, "show me my top performers" and
 * "make more like the winners" become possible.
 *
 * Set METRICS_USE_MOCK=true to populate deterministic sample metrics without
 * live platform credentials (handy for dev + first-run demos).
 */
export async function runMetricsSnapshot(): Promise<{ polled: number; written: number }> {
  const useMock = process.env.METRICS_USE_MOCK === "true";
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("publishes")
    .select("id, user_id, platform, external_post_id, social_accounts(access_token, external_user_id)")
    .eq("status", "published")
    .not("external_post_id", "is", null)
    .gte("published_at", since)
    .limit(MAX_PER_RUN);

  if (error) throw error;
  const publishes = (data ?? []) as unknown as PublishRow[];

  const rows: SnapshotRow[] = [];
  for (const pub of publishes) {
    const acct = firstAccount(pub.social_accounts);
    if (!pub.external_post_id || !acct?.access_token) continue;
    const m = await fetchMetrics(
      pub.platform,
      {
        accessToken: acct.access_token,
        externalPostId: pub.external_post_id,
        externalUserId: acct.external_user_id,
      },
      useMock,
    );
    if (!m) continue;
    rows.push(toSnapshotRow(pub, m));
  }

  if (rows.length) {
    const { error: insErr } = await supabase.from("analytics_snapshots").insert(rows);
    if (insErr) throw insErr;
  }

  logger.info({ polled: publishes.length, written: rows.length, useMock }, "metrics snapshot done");
  return { polled: publishes.length, written: rows.length };
}
