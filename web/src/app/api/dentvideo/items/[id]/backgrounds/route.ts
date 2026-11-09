import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { dentvidQueue } from "@/lib/queue";
import { RESTYLE_JOB_OPTS } from "@/lib/dentvid/job-options";
import { cleanPhotoIds, MAX_PHOTOS, withBackgrounds } from "@/lib/dentvid/backgrounds";

// The clinic picks 1–4 library photos for one of its generated videos. They
// go into the stored plan, and the worker re-renders the video with them
// (dentvid job "restyle"); the card shows "updating…" until it is done.
// Owner-only: every read and write is scoped to the signed-in owner's row.
const Body = z.object({ backgrounds: z.array(z.string().max(40)).min(1).max(MAX_PHOTOS) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await dvSession();
  const err = await dvErrors();
  if (!user) return NextResponse.json({ error: err.signIn }, { status: 401 });
  const limited = await rateLimited(
    [
      { key: `rl:restyle:user:${user.id}`, rule: LIMITS.restyleUser },
      { key: `rl:restyle:userday:${user.id}`, rule: LIMITS.restyleUserDay },
    ],
    () => err.tooMany,
  );
  if (limited) return limited;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const ids = parsed.success ? cleanPhotoIds(parsed.data.backgrounds) : [];
  // Every id must be a library photo: an unknown one is a bad request, not silently dropped.
  if (!parsed.success || ids.length !== new Set(parsed.data.backgrounds).size) {
    return NextResponse.json({ error: err.invalidPhotos }, { status: 400 });
  }

  const { data: item } = await db
    .from("dentvid_items")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!item || item.kind !== "generated" || !item.plan) return NextResponse.json({ error: err.invalidPhotos }, { status: 404 });
  if (item.restyle_status === "queued") return NextResponse.json({ error: err.photosBusy }, { status: 409 });

  const { error } = await db
    .from("dentvid_items")
    .update({
      plan: withBackgrounds(item.plan as { backgrounds?: string[] }, ids),
      restyle_status: "queued",
      restyle_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) {
    console.error("dentvideo backgrounds save failed", error.message);
    return NextResponse.json({ error: err.saveFailed }, { status: 500 });
  }

  try {
    await dentvidQueue.add(
      "restyle",
      { itemId: id },
      // Ahead of the weekend batch: the clinic is looking at "updating…" (job-options.ts).
      { jobId: `restyle:${id}:${Date.now()}`, ...RESTYLE_JOB_OPTS },
    );
  } catch {
    // Not queued: say so on the card instead of "updating…" forever.
    await db.from("dentvid_items").update({ restyle_status: "failed" }).eq("id", id).eq("owner_id", user.id);
    return NextResponse.json({ error: err.couldNotStart }, { status: 503 });
  }
  return NextResponse.json({ ok: true, backgrounds: ids });
}
