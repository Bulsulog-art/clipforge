import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";

/**
 * DentVideo's own Supabase — Liman (self-hosted). Separate from ClipForge's
 * cloud project, so its session lives in its own cookie ("dv-auth") and the
 * two products never read each other's login.
 */
const URL = process.env.NEXT_PUBLIC_DENTVID_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_DENTVID_SUPABASE_ANON_KEY ?? "";
/** For a browser upload with progress (XMLHttpRequest), which the SDK's fetch cannot report. */
export const DV_SUPABASE_URL = URL;
export const DV_SUPABASE_ANON = ANON;
export const COOKIE_NAME = "dv-auth";
export const BUCKET = "dentvid";

export function dvBrowser() {
  return createBrowserClient(URL, ANON, { cookieOptions: { name: COOKIE_NAME } });
}

type CookieStore = {
  getAll(): { name: string; value: string }[];
  set?(name: string, value: string, options?: CookieOptions): void;
};

export function dvServer(cookieStore: CookieStore) {
  return createServerClient(URL, ANON, {
    cookieOptions: { name: COOKIE_NAME },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (all: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          all.forEach(({ name, value, options }) => cookieStore.set?.(name, value, options));
        } catch {
          // server component — cookies are read-only there
        }
      },
    },
  });
}

/** Service-role client for trusted server code only (signup, queueing). */
export function dvAdmin() {
  const key = process.env.DENTVID_SERVICE_ROLE_KEY;
  if (!URL || !key) throw new Error("DentVideo backend is not configured");
  return createAdmin(URL, key, { auth: { persistSession: false } });
}
