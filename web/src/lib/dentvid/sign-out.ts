import { DV_AUTH_COOKIE } from "./session-cookie";

/**
 * Signing a clinic out everywhere (scope "global": this browser, the
 * practice's other computers, a phone).
 *
 * Before, the browser called supabase-js `signOut()` with the access token in
 * its own cookie. That token can be stale: DentVideo's pages are server
 * components, which refresh an expired session but cannot write the new
 * cookies, and the middleware does not maintain the dv-auth cookie (it only
 * refreshes ClipForge's). So the browser could hold a token GoTrue no longer
 * accepts, the logout call came back 401, supabase-js ignored that and
 * cleared only this browser — every other session stayed signed in.
 *
 * Now the server does it (POST /api/dentvideo/signout): it reads the session
 * from the request's cookies, lets the server client refresh it when it has
 * expired, revokes it with the service role (`admin.signOut(jwt, "global")`),
 * refreshing once more and retrying if GoTrue refuses the token, and clears
 * the dv-auth cookies on its response. Pure apart from `deps`, so it is
 * tested directly.
 */

export type SignOutDeps = {
  /** The session from the request's cookies, refreshed when expired; null when there is none. */
  session: () => Promise<{ access_token: string } | null>;
  /** A forced refresh (a new access token), or null when the refresh token is no longer valid. */
  refresh: () => Promise<{ access_token: string } | null>;
  /** GoTrue's logout with this access token. */
  revoke: (accessToken: string, scope: "global") => Promise<{ status?: number; message?: string } | null>;
};

export type SignOutResult = {
  /** Every session of the account was ended (or there was no live session left to end). */
  global: boolean;
  /** Why it could not be ended everywhere, for the log. */
  error?: string;
};

/** GoTrue's answers that mean "this access token is not accepted" (an expired or superseded JWT). */
const REFUSED = new Set([401, 403]);

export async function signOutEverywhere(deps: SignOutDeps): Promise<SignOutResult> {
  const session = await deps.session().catch(() => null);
  if (!session?.access_token) return { global: true };
  let error = await deps.revoke(session.access_token, "global").catch((e: Error) => ({ status: 0, message: e.message }));
  if (error && REFUSED.has(error.status ?? 0)) {
    const fresh = await deps.refresh().catch(() => null);
    if (!fresh?.access_token) return { global: false, error: `${error.status} token refused, and the refresh failed` };
    error = await deps.revoke(fresh.access_token, "global").catch((e: Error) => ({ status: 0, message: e.message }));
  }
  // 404: the account itself is gone — nothing left to sign out.
  if (!error || error.status === 404) return { global: true };
  return { global: false, error: `${error.status ?? "?"} ${error.message ?? ""}`.trim() };
}

/** The cookies that hold this browser's DentVideo session (whole or chunked, and the PKCE verifier). */
export function isDvAuthCookieName(name: string): boolean {
  return name === DV_AUTH_COOKIE || name === `${DV_AUTH_COOKIE}-code-verifier` || new RegExp(`^${DV_AUTH_COOKIE}\\.\\d+$`).test(name);
}
