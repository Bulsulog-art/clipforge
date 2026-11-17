import { NextResponse } from "next/server";
import { aasaFor } from "@/lib/dentvid/aasa";

/**
 * GET /.well-known/apple-app-site-association
 *
 * Apple fetches this at app-install time + occasionally afterwards to
 * decide which universal links open in the app vs the web. Returned as
 * application/json (NOT text/json — Apple is strict about it).
 *
 * Paths declared here open in the ClipForge iOS app when the user taps:
 *   https://clipforge.bulsulabs.com/clips/<uuid>
 *   https://clipforge.bulsulabs.com/jobs/<uuid>
 *
 * The matching applinks:clipforge.bulsulabs.com entitlement is already
 * declared on the iOS target (project.yml → associated-domains).
 *
 * On dentvideo.com the same path answers for the DentVideo iPhone app
 * (com.bulsulabs.dentvideo, entitlement applinks:dentvideo.com): the clinic
 * app's pages (/app, /app/*) open in the app when it is installed.
 *
 * appID format: <TEAM_ID>.<BUNDLE_ID>. We read APPLE_TEAM_ID from env so
 * the developer doesn't have to commit it; if missing the route returns
 * 503 so Apple knows to retry rather than caching a broken response.
 */
export async function GET(req: Request) {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) {
    return NextResponse.json(
      { error: "APPLE_TEAM_ID env var not set on web deployment" },
      { status: 503 },
    );
  }
  const aasa = aasaFor(req.headers.get("x-forwarded-host") ?? req.headers.get("host"), teamId);
  return new NextResponse(JSON.stringify(aasa), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // 1h cache — Apple respects HTTP caching here, and we'll want a
      // fast invalidation if the bundle or team id ever rotates.
      "Cache-Control": "public, max-age=3600",
      // One path, two answers (clipforge.bulsulabs.com / dentvideo.com).
      Vary: "Host, X-Forwarded-Host",
    },
  });
}
