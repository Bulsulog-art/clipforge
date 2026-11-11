import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * CSRF protection for the owner admin panel's actions (POST
 * /api/dentvideo/admin/action), in two layers on top of the middleware's
 * Origin guard:
 *
 *  1. Same origin: the browser's Origin header (and Sec-Fetch-Site, when
 *     sent) must say the form was posted from this site.
 *  2. A per-session token: HMAC(secret, user id + Supabase session id). The
 *     session id is a claim of the signed-in user's access token, stable
 *     across token refreshes and new on every sign-in, so a token leaked from
 *     one session is worthless in the next. Pages render it into each form
 *     (server-side); the route recomputes and compares in constant time.
 *
 * The secret is DENTVIDEO_ADMIN_CSRF_SECRET, else derived from the service
 * role key (never sent to the browser); without either, every action is refused.
 */

export function csrfSecret(env: Record<string, string | undefined> = process.env): string | null {
  const own = env.DENTVIDEO_ADMIN_CSRF_SECRET?.trim();
  if (own && own.length >= 16) return own;
  const role = env.DENTVID_SERVICE_ROLE_KEY?.trim();
  if (role) return createHash("sha256").update(`dentvideo-admin-csrf:${role}`).digest("hex");
  return null;
}

export function csrfToken(userId: string, sessionId: string, secret: string): string {
  return createHmac("sha256", secret).update(`dv-admin:${userId.toLowerCase()}:${sessionId}`).digest("base64url");
}

export function verifyCsrf(given: unknown, userId: string, sessionId: string, secret: string | null): boolean {
  if (!secret || typeof given !== "string" || !given || !sessionId) return false;
  const want = Buffer.from(csrfToken(userId, sessionId, secret));
  const got = Buffer.from(given);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** The Supabase session id ("session_id" claim) of an access token, or "" when there is none. */
export function sessionIdOf(accessToken: string | null | undefined): string {
  const part = (accessToken ?? "").split(".")[1];
  if (!part) return "";
  try {
    const claims = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { session_id?: unknown };
    return typeof claims.session_id === "string" && /^[0-9a-f-]{8,64}$/i.test(claims.session_id) ? claims.session_id : "";
  } catch {
    return "";
  }
}

/**
 * Was this POST made by a page of this site? The Origin must be one of the
 * site's own (the same list the middleware uses) or the request's own
 * origin; a Sec-Fetch-Site other than same-origin refuses it outright.
 */
export function sameOrigin(h: { origin: string | null; secFetchSite: string | null; host: string | null; proto?: string | null }, allowed: string[]): boolean {
  if (h.secFetchSite && h.secFetchSite !== "same-origin") return false;
  const origin = (h.origin ?? "").replace(/\/+$/, "");
  if (!origin || origin === "null") return false;
  if (allowed.includes(origin)) return true;
  const host = (h.host ?? "").trim().toLowerCase();
  if (!host) return false;
  const proto = (h.proto ?? "https").split(",")[0].trim();
  return origin.toLowerCase() === `${proto}://${host}`;
}
