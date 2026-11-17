import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { verifyEmail } from "@/lib/dentvid/handlers/verify-email";

/**
 * POST /api/dentvideo/mobile/v1/verify-email — the 6-digit code from the iPhone app, the same
 * handler (limits, attempts, expiry, HMAC) as the web's /api/dentvideo/verify-email:
 *   { action: "send", onlyIfNone? } · { action: "confirm", code } · { action: "change", email }
 * The app asks for the code before it opens the paywall, as the web does before checkout.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, async ({ user }) => verifyEmail(user, req));
}
