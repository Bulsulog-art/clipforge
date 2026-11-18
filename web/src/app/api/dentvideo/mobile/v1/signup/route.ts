import { signup } from "@/lib/dentvid/handlers/signup";

/**
 * POST /api/dentvideo/mobile/v1/signup { email, password, elapsedMs, locale } — create a DentVideo
 * account from the iPhone app. The same handler as the web form (lib/dentvid/handlers/signup.ts):
 * the same per-IP, per-network, per-address and global limits, the fill-time check, the 6-digit code
 * emailed at once (the app then calls mobile/v1/verify-email), internal-traffic marking. No Turnstile
 * (a browser widget) and no cookie: the answer carries the session tokens ({ ok, signedIn, session }).
 * An address that already has an account answers { ok: true, existing: true } as on the web.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = await signup(req, "mobile");
  res.headers.set("cache-control", "no-store");
  return res;
}
