import { NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isDentvideoUser } from "./membership";

/**
 * The DentVideo iPhone app's session: `Authorization: Bearer <Liman access token>`.
 *
 * The mobile routes (app/api/dentvideo/mobile/v1/**) read ONLY this header and never the dv-auth
 * cookie, so a cross-site page cannot ride a browser session into them: no browser attaches an
 * Authorization header by itself, and setting one cross-site needs a CORS preflight this API never
 * answers. That is why lib/origin-guard.ts exempts exactly that prefix from the Origin check.
 *
 * The client returned acts AS the user: PostgREST and Storage receive the user's JWT, so the same
 * row-level security as the web applies, and every route still filters by owner_id = user.id.
 */
export type DvMobileSession = { db: SupabaseClient; user: User; token: string };

const URL = () => process.env.NEXT_PUBLIC_DENTVID_SUPABASE_URL ?? "";
const ANON = () => process.env.NEXT_PUBLIC_DENTVID_SUPABASE_ANON_KEY ?? "";

/** A JWT's shape: three base64url parts. Anything else is refused before Liman is asked. */
const JWT = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;

/** The bearer token of a request, or null (missing, not "Bearer", not JWT-shaped, oversized). */
export function bearerToken(authorization: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(authorization ?? "");
  if (!m) return null;
  const t = m[1];
  return t.length <= 4096 && JWT.test(t) ? t : null;
}

/** A Liman client that sends this user's token (RLS applies), without any session storage. */
export function dvUserClient(token: string): SupabaseClient {
  return createClient(URL(), ANON(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** A Liman client for the sign-in and refresh calls (anon key, no stored session). */
export function dvAnonClient(): SupabaseClient {
  return createClient(URL(), ANON(), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

/**
 * The signed-in DentVideo user of a mobile request, or null. The token is verified by Liman
 * (auth.getUser), not just decoded, so an expired, revoked or forged token is refused. An account
 * of another app on the shared Liman (no DentVideo in app_metadata) is refused too.
 */
export async function dvBearerSession(req: Request): Promise<DvMobileSession | null> {
  const token = bearerToken(req.headers.get("authorization"));
  if (!token) return null;
  const db = dvUserClient(token);
  try {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user || !isDentvideoUser(data.user)) return null;
    return { db, user: data.user, token };
  } catch {
    return null;
  }
}

export const NO_STORE = { "cache-control": "no-store" } as const;

/** 401 in the shape the app reads: it then refreshes the token once, or signs out. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Please sign in again.", code: "unauthorized" }, { status: 401, headers: { ...NO_STORE, "www-authenticate": "Bearer" } });
}

/** Run a mobile handler with the request's bearer session; 401 without one. Answers are never cached. */
export async function withMobileSession(req: Request, run: (s: DvMobileSession) => Promise<Response>): Promise<Response> {
  const session = await dvBearerSession(req);
  if (!session) return unauthorized();
  const res = await run(session);
  res.headers.set("cache-control", "no-store");
  return res;
}
