import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/announcements
 *
 * Returns active announcement cards for the calling user's app version.
 * Service-role read because RLS denies client SELECTs (so an anon-key
 * leak can't preview the marketing calendar).
 *
 * Filters applied:
 *   • starts_at <= now()
 *   • ends_at is null OR ends_at > now()
 *   • app version is between min_app_version / max_app_version (when set)
 *
 * iOS sends its version via X-App-Version. Missing header → only
 * announcements without min/max gates are returned.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await svc
    .from("announcements")
    .select("id, title, body, cta_text, cta_url, starts_at, ends_at, min_app_version, max_app_version")
    .lte("starts_at", nowIso)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order("starts_at", { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appVer = req.headers.get("x-app-version") ?? "";
  const filtered = (data ?? []).filter((row) => {
    // have >= need for the min gate; have <= max for the max gate (i.e.
    // max >= have, expressed as meets(max, have)).
    if (row.min_app_version && appVer && !meets(appVer, row.min_app_version as string)) return false;
    if (row.max_app_version && appVer && !meets(row.max_app_version as string, appVer)) return false;
    return true;
  });

  return NextResponse.json({
    announcements: filtered.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      ctaText: row.cta_text,
      ctaUrl: row.cta_url,
    })),
  });
}

/**
 * Loose dotted-version compare. `meets(have, need)` returns true when
 * `have >= need`. Missing segments default to 0 so "1.0" >= "1.0.0".
 */
function meets(have: string, need: string): boolean {
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
