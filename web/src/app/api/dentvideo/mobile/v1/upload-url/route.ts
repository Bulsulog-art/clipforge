import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { createUploadUrl } from "@/lib/dentvid/handlers/upload-url";

/**
 * POST /api/dentvideo/mobile/v1/upload-url { kind: "recording", size, contentType, name? } — the same
 * checks as the web (plan, type, size, quota, pending slots); the answer adds `uploadUrl` for the
 * app's background PUT.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, (s) => createUploadUrl(s, req));
}
