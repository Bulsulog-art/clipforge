import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Toggle a clip's favorite state.
 *
 *   POST   /api/clips/:clipId/favorite   → is_favorite = true
 *   DELETE /api/clips/:clipId/favorite   → is_favorite = false
 *
 * The RLS policy on clipforge.clips already scopes updates to the
 * owning user, so we can use the user-scoped client without an extra
 * ownership check.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  return setFavorite(await params, true);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ clipId: string }> },
) {
  return setFavorite(await params, false);
}

async function setFavorite(
  params: { clipId: string },
  isFavorite: boolean,
): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .schema("clipforge")
    .from("clips")
    .update({ is_favorite: isFavorite })
    .eq("id", params.clipId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, isFavorite });
}
