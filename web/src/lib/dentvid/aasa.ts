import { isDentvideoHost } from "./host";
import { DENTVID_BUNDLE_ID } from "./apns";

/** The apple-app-site-association document for a host: DentVideo's app on dentvideo.com, ClipForge's elsewhere. */
export function aasaFor(host: string | null, teamId: string, env: Record<string, string | undefined> = process.env) {
  if (isDentvideoHost(host)) {
    const bundleId = env.DENTVID_APNS_BUNDLE_ID?.trim() || DENTVID_BUNDLE_ID;
    return { applinks: { apps: [], details: [{ appID: `${teamId}.${bundleId}`, paths: ["/app", "/app/*"] }] } };
  }
  const bundleId = env.APPLE_BUNDLE_ID ?? "com.bulsulabs.clipforge";
  return { applinks: { apps: [], details: [{ appID: `${teamId}.${bundleId}`, paths: ["/clips/*", "/jobs/*"] }] } };
}
