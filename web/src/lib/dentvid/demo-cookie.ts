/** Same shape as lib/dentvid/demos DEMO_TOKEN_RE (kept here so the browser bundle stays small). */
const isDemoToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9]{10,12}$/.test(v);

/**
 * The demo a visitor came from, kept in a first-party cookie for 30 days so
 * the sign-up's clinic step can fill in the clinic (name, city, country,
 * language, colour, logo) even after the email round trip. Holds only the
 * random token; the server looks the demo up and ignores an expired one.
 */
export const DEMO_COOKIE = "dv-demo";
const MAX_AGE = 60 * 60 * 24 * 30;

export function rememberDemo(token: string): void {
  if (!isDemoToken(token)) return;
  try {
    document.cookie = `${DEMO_COOKIE}=${token}; path=/; max-age=${MAX_AGE}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  } catch {
    // cookies blocked: the ?demo= on the sign-up link still works
  }
}

/** The token from ?demo= or the cookie, if well-formed. The URL wins. */
export function demoTokenFrom(param: string | null | undefined, cookie: string | null | undefined): string | null {
  if (isDemoToken(param)) return param;
  if (isDemoToken(cookie)) return cookie;
  return null;
}
