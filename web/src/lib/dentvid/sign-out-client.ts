/**
 * "Sign out" in the browser: the server ends the account's sessions
 * everywhere and clears this browser's cookies (POST /api/dentvideo/signout,
 * lib/dentvid/sign-out.ts). Only if that request cannot be made at all does
 * the browser sign out by itself, as it used to. The caller navigates away
 * afterwards (a full page load), so no client keeps the old session in memory.
 */
export async function signOutDentvideo(fetcher: typeof fetch = fetch): Promise<{ global: boolean }> {
  try {
    const res = await fetcher("/api/dentvideo/signout", { method: "POST", credentials: "same-origin" });
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as { global?: unknown };
      return { global: body.global === true };
    }
  } catch {
    // offline or blocked: fall through
  }
  try {
    // The Supabase client loads when someone signs out, not with every page.
    const { dvBrowser } = await import("./supabase");
    await dvBrowser().auth.signOut();
  } catch {
    /* signed out locally either way */
  }
  return { global: false };
}
