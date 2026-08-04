import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/app-url";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // `redirect` arrives from the query string, so it is attacker-controllable:
  // only same-site paths are honoured, anything else falls back to the
  // dashboard. Built through appUrl because behind the proxy `url.origin` is
  // the container's hostname, which no browser can reach — sign-in used to
  // land people on `http://<container-id>:3000/dashboard`.
  const requested = url.searchParams.get("redirect") ?? "/dashboard";
  const safe = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/dashboard";

  return NextResponse.redirect(appUrl(safe, req));
}
