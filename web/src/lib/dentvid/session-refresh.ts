import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { hasDvSessionCookie, DV_AUTH_COOKIE } from "./session-cookie";
import { publicCacheControl } from "./cache-policy";

/**
 * Keep the DentVideo session cookie ("dv-auth") fresh, in the middleware.
 *
 * Server components can read the session but cannot write cookies. When the
 * access token in dv-auth had expired, a page refreshed it for itself and
 * threw the new tokens away; the browser kept the stale pair, and Liman
 * later refused it (sign-out got a 401 and left other sessions alive, and a
 * rotated refresh token could sign the clinic out). This runs before the
 * page: an expired token is refreshed once, the new cookies go on the
 * response (the browser keeps them) and on the request (the page renders
 * with them).
 *
 * getSession() only reads the cookie unless the token has expired, so a
 * request with a valid session costs no call to Liman. Refresh-only: this
 * decides nothing about access — the pages still check the user themselves.
 */

/** In-app page paths whose session is worth refreshing: DentVideo pages that are per person. */
export function shouldRefreshDvSession(appPath: string, method: string, cookieHeader: string | null | undefined): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  if (appPath !== "/dentvideo" && !appPath.startsWith("/dentvideo/")) return false;
  // Files (videos, narration, images, plans) and share images: no session work.
  if (/\.[a-z0-9]+$/i.test(appPath) || /\/opengraph-image(?:\/[\w-]+)?$/.test(appPath)) return false;
  // Public marketing pages are cacheable and must never set cookies.
  if (publicCacheControl(appPath, method)) return false;
  return hasDvSessionCookie(cookieHeader);
}

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * `build` makes the response (next or rewrite) from the request as it is now;
 * it is called again after a refresh so the page sees the new cookies.
 */
export async function withFreshDvSession(req: NextRequest, build: () => NextResponse): Promise<NextResponse> {
  let res = build();
  const url = process.env.NEXT_PUBLIC_DENTVID_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_DENTVID_SUPABASE_ANON_KEY;
  if (!url || !anon) return res;
  const db = createServerClient(url, anon, {
    cookieOptions: { name: DV_AUTH_COOKIE },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all: CookieToSet[]) => {
        all.forEach(({ name, value }) => req.cookies.set(name, value));
        res = build();
        all.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  try {
    await db.auth.getSession();
  } catch (e) {
    // Liman briefly unreachable: serve the page; it decides what a missing session means.
    console.warn("[dentvideo session] refresh failed", (e as Error).message);
  }
  return res;
}
