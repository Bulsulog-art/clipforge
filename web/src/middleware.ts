import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { allowedOrigins, isBadOrigin } from "@/lib/origin-guard";
import { routeForHost } from "@/lib/dentvid/host";
import { publicCacheControl } from "@/lib/dentvid/cache-policy";
import { TOO_MANY, requestLocale } from "@/lib/dentvid/request-locale";
import { API_GLOBAL_PER_IP, MemoryStore, clientIp, slidingWindow } from "@/lib/rate-limit";

// A cheap first line against floods of /api requests: a per-IP sliding
// window kept in this process's memory (one app instance on one VPS, so it
// sees all traffic). Pages and static files are not counted. Per-route
// limits with tighter numbers live in Redis (lib/rate-limit-server).
const apiBuckets = new MemoryStore(50_000);

type CookieToSet = { name: string; value: string; options: CookieOptions };

// CSRF defence: Origin check on state-changing /api requests, with an
// exemption for bearer-authenticated (native app) calls. See lib/origin-guard.
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const r = await slidingWindow(apiBuckets, `api:${clientIp(req.headers)}`, API_GLOBAL_PER_IP);
    if (!r.ok) {
      // DentVideo screens show `error` as-is: say it in the visitor's language there.
      const error = req.nextUrl.pathname.startsWith("/api/dentvideo/")
        ? TOO_MANY[requestLocale(req.headers.get("cookie"), req.headers.get("accept-language"))]
        : "Too many requests";
      return NextResponse.json({ error }, { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } });
    }
  }

  // dentvideo.com is served from the /dentvideo section (lib/dentvid/host).
  const route = routeForHost(
    req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
    req.nextUrl.pathname,
    req.nextUrl.search,
    process.env.NEXT_PUBLIC_DENTVIDEO_URL || undefined,
  );
  if (route.kind === "redirect") return NextResponse.redirect(route.url, route.status);
  if (route.kind === "rewrite") {
    const url = req.nextUrl.clone();
    url.pathname = route.path;
    const res = NextResponse.rewrite(url);
    // The marketing pages are the same for everyone: a CDN may keep them (lib/dentvid/cache-policy).
    const cache = publicCacheControl(route.path, req.method);
    if (cache) res.headers.set("Cache-Control", cache);
    return res;
  }

  // CSRF / Origin guard — runs before any DB work.
  if (
    isBadOrigin({
      pathname: req.nextUrl.pathname,
      method: req.method,
      origin: req.headers.get("origin"),
      authorization: req.headers.get("authorization"),
      allowed: allowedOrigins(process.env),
    })
  ) {
    return NextResponse.json({ error: "Bad Origin" }, { status: 403 });
  }

  // DentVideo's marketing pages on this host (before dentvideo.com is canonical):
  // public and cacheable, so no session work and no cookies on them.
  const dvCache = publicCacheControl(req.nextUrl.pathname, req.method);
  if (dvCache) {
    const pub = NextResponse.next({ request: req });
    pub.headers.set("Cache-Control", dvCache);
    return pub;
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/studio");
  const isAuth = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");

  if (!user && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (user && isAuth) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.well-known|api/health).*)"],
};
