import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Return the latest cached trend snapshot for a niche.
 * Heavy lifting (TikTok scrape + GPT summarise) runs in a worker cron — the API
 * here just serves what's already in the DB.
 *
 * Free tier: read access (creator-economy appetizer).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ niche: string }> },
) {
  const { niche } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("v_trend_latest")
    .select("niche, generated_at, source, items")
    .eq("niche", niche)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ niche, generated_at: null, items: [] });

  return NextResponse.json(data);
}
