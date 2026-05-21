import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  // Native iOS clients hit this API with `Authorization: Bearer <accessToken>`
  // (set by the Supabase Swift SDK). The cookie-based `@supabase/ssr` flow
  // alone returns no user for those requests, so every iOS-bound endpoint
  // 401s. Forward any inbound Authorization header to PostgREST + auth so
  // `supabase.auth.getUser()` resolves regardless of where the token came
  // from (Bearer header or browser cookie).
  const hdrs = await headers();
  const auth = hdrs.get("authorization");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "clipforge" },
      global: auth ? { headers: { Authorization: auth } } : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // server component context — ignore
          }
        },
      },
    },
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "clipforge" },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  );
}
