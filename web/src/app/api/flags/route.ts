import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/flags
 *
 * Resolves the feature flag bool for each row in clipforge.feature_flags
 * against the calling user. iOS gets back a flat { key: bool } map and
 * never sees the raw conditions or rollout percent.
 *
 * Resolution rules (in order):
 *   1. If `enabled` is false → off
 *   2. If `rollout_percent` < 100, hash (key || user_id) → 0..99 and
 *      compare. Deterministic per user so a user never sees a flag flip
 *      back and forth.
 *   3. Optional conditions (jsonb):
 *      • tiers: ["starter"]            — only that profile tier
 *      • min_app_version: "1.0.34"     — read from header if iOS sends
 *
 * Anything else returns the flag's `enabled` value (gated by rollout).
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();

  const { data: rows, error } = await svc
    .from("feature_flags")
    .select("key, enabled, rollout_percent, conditions");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull profile.tier once — used by any flag with a `tiers` condition.
  const { data: profile } = await svc
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  const tier = (profile?.tier as string | undefined) ?? "free";

  // Pull app version from the optional X-App-Version header iOS sends so
  // we can gate on app build (avoids handing a flag to an old client that
  // doesn't have the feature shipped).
  const appVersion = req.headers.get("x-app-version") ?? "";

  const flags: Record<string, boolean> = {};
  for (const row of rows ?? []) {
    const conditions = (row.conditions as Record<string, unknown>) ?? {};
    flags[row.key as string] = resolve({
      key: row.key as string,
      userId: user.id,
      enabled: row.enabled as boolean,
      rolloutPercent: row.rollout_percent as number,
      tier,
      appVersion,
      conditions,
    });
  }
  return NextResponse.json({ flags });
}

function resolve(args: {
  key: string;
  userId: string;
  enabled: boolean;
  rolloutPercent: number;
  tier: string;
  appVersion: string;
  conditions: Record<string, unknown>;
}): boolean {
  if (!args.enabled) return false;

  // Tier gate
  const tiers = args.conditions.tiers as string[] | undefined;
  if (Array.isArray(tiers) && tiers.length > 0 && !tiers.includes(args.tier)) {
    return false;
  }

  // Minimum app-version gate
  const minVer = args.conditions.min_app_version as string | undefined;
  if (minVer && args.appVersion && !meetsMinVersion(args.appVersion, minVer)) {
    return false;
  }

  // Rollout percent (deterministic per user, per flag)
  if (args.rolloutPercent < 100) {
    const hash = crypto.createHash("sha1")
      .update(`${args.key}::${args.userId}`)
      .digest();
    const bucket = hash[0] % 100;     // 0..99
    if (bucket >= args.rolloutPercent) return false;
  }

  return true;
}

/**
 * Loose semver compare. "1.0.34" >= "1.0.34" → true. Treats missing
 * segments as 0 so "1.0" >= "1.0.0".
 */
function meetsMinVersion(have: string, need: string): boolean {
  const h = have.split(".").map((p) => Number(p) || 0);
  const n = need.split(".").map((p) => Number(p) || 0);
  const len = Math.max(h.length, n.length);
  for (let i = 0; i < len; i++) {
    const a = h[i] ?? 0;
    const b = n[i] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}
