import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/clips/bulk-favorite
 *
 * Sets `is_favorite` on a batch of clips owned by the caller. Capped at
 * 200 ids per request — beyond that we'd want a paged worker job.
 *
 * RLS on `clips` already scopes the update to user_id == auth.uid(),
 * so a malicious id slipped into the array is silently ignored.
 */
const Body = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  favorite: z.boolean(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { error } = await supabase
    .schema("clipforge")
    .from("clips")
    .update({ is_favorite: body.favorite })
    .in("id", body.ids)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: body.ids.length });
}
