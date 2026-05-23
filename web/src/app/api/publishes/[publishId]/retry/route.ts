import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { publishQueue } from "@/lib/queue";

/**
 * POST /api/publishes/:publishId/retry
 *
 * Re-enqueue a failed publish. Only failed rows are eligible — pending
 * and terminal states return 409. Resets status to `publishing`, wipes
 * the old error_message, and re-enqueues the BullMQ job (publishId
 * doubles as the BullMQ jobId, so removing+re-adding with the same id
 * is the standard retry path).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ publishId: string }> },
) {
  const { publishId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("publishes")
    .select("id, user_id, status, clip_id, platform")
    .eq("id", publishId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (row.status !== "failed") {
    return NextResponse.json(
      { error: `Only failed publishes can be retried (current: ${row.status})` },
      { status: 409 },
    );
  }

  await svc
    .from("publishes")
    .update({ status: "publishing", error_message: null })
    .eq("id", publishId);

  // Remove any stale BullMQ artifact then re-add.
  try {
    const old = await publishQueue.getJob(publishId);
    if (old) await old.remove();
  } catch {}

  await publishQueue.add(
    "publish",
    {
      publishId,
      userId: user.id,
      clipId: row.clip_id as string,
      platform: row.platform as string,
    },
    { jobId: publishId, attempts: 3, backoff: { type: "exponential", delay: 10_000 } },
  );

  return NextResponse.json({ ok: true });
}
