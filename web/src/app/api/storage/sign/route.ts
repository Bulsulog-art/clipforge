import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isOwnedPath } from "@/lib/security";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  const bucket = url.searchParams.get("bucket") ?? "clipforge-videos-rendered";
  const download = url.searchParams.get("download") === "1";
  if (!path) return NextResponse.json({ error: "path missing" }, { status: 400 });

  // Constrain bucket to this project's namespace — `bucket` is fully
  // attacker-controllable, so without this an authenticated user could mint
  // signed URLs for any bucket on the Supabase project (other apps' data).
  if (!bucket.startsWith("clipforge-")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Ownership + path-traversal guard (the shared helper rejects `..`); paths
  // must live under the caller's own `${userId}/` prefix.
  if (!isOwnedPath(path, user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 15, { download });
  if (error || !data) return NextResponse.json({ error: error?.message ?? "sign" }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}
