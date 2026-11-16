/**
 * CSRF / Origin guard for state-changing /api requests.
 *
 * CSRF only exists because a browser attaches the session COOKIE to a request
 * another site makes. A request authenticated by an `Authorization: Bearer`
 * header is not exposed to that: no browser adds the header on its own, and a
 * cross-site page that tries to set it triggers a CORS preflight this API never
 * answers. So bearer-authenticated requests skip the Origin check.
 *
 * That matters because the native iOS app authenticates with a bearer token
 * and URLSession sends no Origin header at all. Before this exemption every
 * POST from the app — upload, job creation, analytics — was rejected with
 * 403 "Bad Origin" before it reached a route.
 */

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Inbound webhooks legitimately have a different (or absent) Origin —
// they MUST do their own auth (Bearer / OAuth code / signature).
// The DentVideo unsubscribe link is authenticated by its signed token, and the
// RFC 8058 one-click POST comes from the mail provider, with no Origin.
const WEBHOOK_PATHS = ["/api/revenuecat/webhook", "/api/dodo/webhook", "/api/auth/tiktok/callback", "/api/dentvideo/unsubscribe"];

export function allowedOrigins(env: {
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}): string[] {
  const app = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const list = [app, "https://clipforge.bulsulabs.com", "https://dentvideo.com", "https://www.dentvideo.com"].filter(
    (o): o is string => Boolean(o),
  );
  if (env.NODE_ENV !== "production") list.push("http://localhost:3000");
  return list;
}

export function hasBearerToken(authorization: string | null): boolean {
  return /^Bearer\s+\S+/i.test(authorization ?? "");
}

/**
 * DentVideo routes the iOS app calls with its Supabase access token. Each uses
 * dvSession(), which verifies the bearer token and ignores the cookie when one
 * is sent. Exact shapes only: a new DentVideo route stays cookie + Origin.
 */
const DENTVIDEO_NATIVE = [/^\/api\/dentvideo\/items\/[0-9a-f-]{36}$/i, /^\/api\/dentvideo\/account\/delete$/];

/** True when the request must be refused before any route runs. */
export function isBadOrigin(req: {
  pathname: string;
  method: string;
  origin: string | null;
  authorization: string | null;
  allowed: string[];
}): boolean {
  if (!req.pathname.startsWith("/api")) return false;
  if (!MUTATION_METHODS.has(req.method)) return false;
  if (WEBHOOK_PATHS.some((p) => req.pathname.startsWith(p))) return false;
  // DentVideo's routes read the session from the dv-auth COOKIE, so a bearer
  // header must not switch their Origin check off — except the few the DentVideo
  // iOS app calls, which authenticate the bearer token itself (dvSession) and
  // never fall back to the cookie. (Its worker calls /api/internal/dentvideo/*.)
  if (hasBearerToken(req.authorization)) {
    if (!req.pathname.startsWith("/api/dentvideo/")) return false;
    if (DENTVIDEO_NATIVE.some((re) => re.test(req.pathname))) return false;
  }
  const origin = req.origin ?? "";
  return !origin || !req.allowed.includes(origin);
}
