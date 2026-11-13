/**
 * DentVideo's session cookie, by name only — no Supabase code, so the site
 * header (on every page) can tell a returning, signed-in clinic from a new
 * visitor without loading the auth client or asking the server.
 *
 * @supabase/ssr stores the session as "dv-auth", or split into "dv-auth.0",
 * "dv-auth.1"… when it is long. Present means "probably signed in": the
 * session may have expired since, and the app then asks to sign in again —
 * good enough to choose between "Open app" and "Sign in".
 */
export const DV_AUTH_COOKIE = "dv-auth";

export function hasDvSessionCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => {
    const eq = part.indexOf("=");
    if (eq < 0) return false;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    return value.length > 0 && (name === DV_AUTH_COOKIE || new RegExp(`^${DV_AUTH_COOKIE}\\.\\d+$`).test(name));
  });
}
