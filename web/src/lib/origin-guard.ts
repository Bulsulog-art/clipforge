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
const WEBHOOK_PATHS = ["/api/revenuecat/webhook", "/api/dodo/webhook", "/api/auth/tiktok/callback"];

export function allowedOrigins(env: {
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}): string[] {
  const app = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const list = [app, "https://clipforge.bulsulabs.com"].filter(
    (o): o is string => Boolean(o),
  );
  if (env.NODE_ENV !== "production") list.push("http://localhost:3000");
  return list;
}

export function hasBearerToken(authorization: string | null): boolean {
  return /^Bearer\s+\S+/i.test(authorization ?? "");
}

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
  if (hasBearerToken(req.authorization)) return false;
  const origin = req.origin ?? "";
  return !origin || !req.allowed.includes(origin);
}
