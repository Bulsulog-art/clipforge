import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// CSRF defence: Origin check on state-changing /api requests. Supabase auth
// uses SameSite=Lax cookies which already mitigate naive cross-site POSTs,
// but multipart/form-data is treated as a "simple" request by browsers and
// would not trigger a preflight, so we double-check the Origin header here.
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Inbound webhooks legitimately have a different (or absent) Origin —
// they MUST do their own auth (Bearer / OAuth code / signature).
const WEBHOOK_PATHS = [
  "/api/revenuecat/webhook",
  "/api/auth/tiktok/callback",
];

function allowedOrigins(): string[] {
  const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const list = [app, "https://clipforge.bulsulabs.xyz", "https://clipforge.bulsulabs.com"].filter(
    (o): o is string => Boolean(o),
  );
  if (process.env.NODE_ENV !== "production") list.push("http://localhost:3000");
  return list;
}

export async function middleware(req: NextRequest) {
  // CSRF / Origin guard — runs before any DB work.
  if (
    req.nextUrl.pathname.startsWith("/api") &&
    MUTATION_METHODS.has(req.method) &&
    !WEBHOOK_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))
  ) {
    const origin = req.headers.get("origin") ?? "";
    const allowed = allowedOrigins();
    if (!origin || !allowed.some((o) => origin === o)) {
      return NextResponse.json(
        { error: "Bad Origin" },
        { status: 403 },
      );
    }
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
