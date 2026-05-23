import { NextResponse } from "next/server";

/**
 * GET /.well-known/apple-app-site-association
 *
 * Apple fetches this at app-install time + occasionally afterwards to
 * decide which universal links open in the app vs the web. Returned as
 * application/json (NOT text/json — Apple is strict about it).
 *
 * Paths declared here open in the ClipForge iOS app when the user taps:
 *   https://clipforge.bulsulabs.xyz/clips/<uuid>
 *   https://clipforge.bulsulabs.xyz/jobs/<uuid>
 *
 * The matching applinks:clipforge.bulsulabs.xyz entitlement is already
 * declared on the iOS target (project.yml → associated-domains).
 *
 * appID format: <TEAM_ID>.<BUNDLE_ID>. We read APPLE_TEAM_ID from env so
 * the developer doesn't have to commit it; if missing the route returns
 * 503 so Apple knows to retry rather than caching a broken response.
 */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) {
    return NextResponse.json(
      { error: "APPLE_TEAM_ID env var not set on web deployment" },
      { status: 503 },
    );
  }
  const bundleId = process.env.APPLE_BUNDLE_ID ?? "com.bulsulabs.clipforge";

  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.${bundleId}`,
          paths: ["/clips/*", "/jobs/*"],
        },
      ],
    },
  };
  return new NextResponse(JSON.stringify(aasa), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // 1h cache — Apple respects HTTP caching here, and we'll want a
      // fast invalidation if the bundle or team id ever rotates.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
