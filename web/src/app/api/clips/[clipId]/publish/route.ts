import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { publishQueue } from "@/lib/queue";

const Body = z.object({
  platforms: z.array(z.enum(["tiktok", "instagram", "youtube"])).min(1),
  scheduleFor: z.string().datetime().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  const { clipId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();
  // Auto-posting is a Plus-tier feature. Our only paid tier in the IAP catalog
  // is 'starter' (= Plus), so we gate just against 'free'. The legacy gate also
  // rejected 'starter' from when we had separate Pro/Agency tiers — those were
  // removed in the 2026-05 pricing refresh.
  if (!profile || profile.tier === "free") {
    return NextResponse.json(
      { error: "Auto-posting is a Plus feature. Subscribe to publish to your channels." },
      { status: 402 },
    );
  }

  const { data: clip } = await svc
    .from("clips")
    .select("*")
    .eq("id", clipId)
    .eq("user_id", user.id)
    .single();
  if (!clip || clip.status !== "ready") {
    return NextResponse.json({ error: "Clip not ready" }, { status: 400 });
  }

  const { data: accounts } = await svc
    .from("social_accounts")
    .select("id, platform")
    .eq("user_id", user.id)
    .in("platform", body.platforms);

  const accountByPlatform = new Map((accounts ?? []).map((a) => [a.platform as string, a.id as string]));
  const missing = body.platforms.filter((p) => !accountByPlatform.has(p));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Connect these channels first: ${missing.join(", ")}` },
      { status: 412 },
    );
  }

  const scheduledFor = body.scheduleFor ?? null;
  const enqueuePromises = body.platforms.map(async (platform) => {
    const accountId = accountByPlatform.get(platform)!;
    const { data: pub, error } = await svc
      .from("publishes")
      .insert({
        user_id: user.id,
        clip_id: clipId,
        social_account_id: accountId,
        platform,
        scheduled_for: scheduledFor,
        status: scheduledFor ? "pending" : "publishing",
        caption: clip.caption,
      })
      .select("id")
      .single();
    if (error || !pub) throw error ?? new Error("publish insert failed");

    if (!scheduledFor) {
      await publishQueue.add(
        "publish",
        { publishId: pub.id, userId: user.id, clipId, platform },
        { jobId: pub.id, attempts: 3, backoff: { type: "exponential", delay: 10_000 } },
      );
    } else {
      const delay = Math.max(0, new Date(scheduledFor).getTime() - Date.now());
      await publishQueue.add(
        "publish",
        { publishId: pub.id, userId: user.id, clipId, platform },
        { jobId: pub.id, delay, attempts: 3, backoff: { type: "exponential", delay: 10_000 } },
      );
    }
    return pub.id;
  });

  try {
    const publishIds = await Promise.all(enqueuePromises);
    return NextResponse.json({ publishIds, scheduledFor });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "queue error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
