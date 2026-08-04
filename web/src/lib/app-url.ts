/**
 * The app's own public address.
 *
 * Behind the Coolify reverse proxy, Next.js sees the *container's* hostname on
 * `req.url` — something like `http://89703a684f8a:3000`. Any redirect built
 * from `new URL(path, req.url)` therefore sends the browser to an address that
 * does not resolve outside Docker, which silently broke every OAuth flow and
 * every "you must sign in first" bounce in production.
 *
 * Resolution order, most trustworthy first:
 *   1. NEXT_PUBLIC_APP_URL — explicitly configured, always wins.
 *   2. x-forwarded-host / x-forwarded-proto — what the proxy says the client
 *      asked for.
 *   3. The request's own origin — correct in local dev, wrong behind a proxy,
 *      so it is the last resort.
 *
 * Anything that resolves to a private/container host is rejected in favour of
 * the known production origin: a broken absolute URL is worse than a guess.
 */

const PRODUCTION_ORIGIN = "https://clipforge.bulsulabs.com";

/** Hosts that can never be reached from a user's browser. */
function isUnreachableHost(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase();
  if (bare === "localhost" || bare === "127.0.0.1" || bare === "[::1]") {
    // Fine in development, useless in production.
    return process.env.NODE_ENV === "production";
  }
  // Docker assigns container hostnames with no dots (e.g. "89703a684f8a"),
  // and private ranges are equally unroutable from outside.
  if (!bare.includes(".")) return true;
  if (/^10\./.test(bare) || /^192\.168\./.test(bare)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(bare)) return true;
  return false;
}

function normalise(origin: string): string {
  return origin.replace(/\/+$/, "");
}

/**
 * Absolute origin for this deployment, e.g. `https://clipforge.bulsulabs.com`.
 * Pass the incoming request when you have one so proxy headers can be used.
 */
export function appOrigin(req?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (!isUnreachableHost(url.host)) return normalise(url.origin);
    } catch {
      // Misconfigured value — fall through rather than throw at request time.
    }
  }

  if (req) {
    const fwdHost = req.headers.get("x-forwarded-host");
    if (fwdHost && !isUnreachableHost(fwdHost)) {
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      return normalise(`${proto}://${fwdHost}`);
    }
    try {
      const origin = new URL(req.url).origin;
      if (!isUnreachableHost(new URL(origin).host)) return normalise(origin);
    } catch {
      // Unparseable request URL — fall through.
    }
  }

  return PRODUCTION_ORIGIN;
}

/**
 * Absolute URL for a path on this deployment. Use this instead of
 * `new URL(path, req.url)` anywhere the result is handed to a browser.
 */
export function appUrl(path: string, req?: Request): string {
  return new URL(path, appOrigin(req) + "/").toString();
}
