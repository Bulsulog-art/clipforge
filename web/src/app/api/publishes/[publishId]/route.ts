import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { publishQueue } from "@/lib/queue";

/**
 * DELETE /api/publishes/:publishId
 *
 * Cancel a scheduled (status='pending', scheduled_for in the future)
 * publish. Removes the BullMQ delayed job and marks the row as
 * `failed` with a "cancelled by user" message so it falls out of any
 * "still queued" UI.
 *
 * Refuses to cancel rows that have already moved into `publishing` or
 * terminal states — there's no useful action for those.
 */
export async function DELETE(
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
    .select("id, user_id, status")
    .eq("id", publishId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (row.status !== "pending") {
    return NextResponse.json(
      { error: `Can't cancel a publish in '${row.status}' state.` },
      { status: 409 },
    );
  }

  // Remove the BullMQ delayed job (jobId == publishId by convention in
  // /api/clips/[clipId]/publish/route.ts).
  try {
    const job = await publishQueue.getJob(publishId);
    if (job) await job.remove();
  } catch {
    // Job may have already moved on; the status guard above protects us.
  }

  await svc
    .from("publishes")
    .update({ status: "failed", error_message: "Cancelled by user" })
    .eq("id", publishId);

  return new NextResponse(null, { status: 204 });
}
