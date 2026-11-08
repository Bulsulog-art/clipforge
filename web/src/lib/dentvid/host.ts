/**
 * dentvideo.com is served by this same app. Requests on that host are mapped
 * onto the /dentvideo section, so the brand has clean URLs (dentvideo.com/de,
 * dentvideo.com/guides/…) while the code keeps a single route tree.
 *
 * The switch to dentvideo.com as the *canonical* address (canonical tags,
 * sitemap, the 301 from clipforge.bulsulabs.com/dentvideo) is gated on
 * NEXT_PUBLIC_DENTVIDEO_URL, set only once the domain's DNS and TLS work —
 * so nothing points search engines at a domain that does not answer yet.
 */

export const DENTVIDEO_HOSTS = ["dentvideo.com", "www.dentvideo.com"];
export const DENTVIDEO_ORIGINS = DENTVIDEO_HOSTS.map((h) => `https://${h}`);

export function isDentvideoHost(host: string | null | undefined): boolean {
  return DENTVIDEO_HOSTS.includes((host ?? "").toLowerCase().split(":")[0]);
}

export type HostRoute =
  | { kind: "next" }
  | { kind: "rewrite"; path: string }
  | { kind: "redirect"; url: string; status: 301 | 308 };

const PASS_THROUGH = /^\/(_next|api|\.well-known)(\/|$)|^\/favicon\.ico$/;
/** A file under /dentvideo/ (sample videos, posters) is served as-is. */
const STATIC_FILE = /\.(mp4|webm|jpg|jpeg|png|webp|svg|ico|woff2?)$/i;

/**
 * Where a request goes.
 * - On dentvideo.com: www → apex; "/dentvideo/…" → the clean path (one URL
 *   per page); everything else is served from the /dentvideo section.
 * - On any other host, once `canonicalUrl` is set: "/dentvideo/…" pages move
 *   permanently to dentvideo.com.
 */
export function routeForHost(host: string | null | undefined, pathname: string, search: string, canonicalUrl?: string): HostRoute {
  const h = (host ?? "").toLowerCase().split(":")[0];

  if (isDentvideoHost(h)) {
    if (h.startsWith("www.")) return { kind: "redirect", url: `https://dentvideo.com${pathname}${search}`, status: 308 };
    if (PASS_THROUGH.test(pathname)) return { kind: "next" };
    if (pathname === "/dentvideo" || pathname.startsWith("/dentvideo/")) {
      if (STATIC_FILE.test(pathname)) return { kind: "next" };
      const clean = pathname.slice("/dentvideo".length) || "/";
      return { kind: "redirect", url: `https://dentvideo.com${clean}${search}`, status: 308 };
    }
    if (pathname === "/robots.txt") return { kind: "rewrite", path: "/dentvideo/robots.txt" };
    if (pathname === "/sitemap.xml") return { kind: "rewrite", path: "/dentvideo/sitemap.xml" };
    return { kind: "rewrite", path: pathname === "/" ? "/dentvideo" : `/dentvideo${pathname}` };
  }

  if (canonicalUrl && (pathname === "/dentvideo" || pathname.startsWith("/dentvideo/")) && !STATIC_FILE.test(pathname)) {
    const clean = pathname.slice("/dentvideo".length) || "/";
    return { kind: "redirect", url: `${canonicalUrl.replace(/\/+$/, "")}${clean}${search}`, status: 301 };
  }
  return { kind: "next" };
}

/**
 * The public URL of a DentVideo page given its in-app path ("/dentvideo/de").
 * dentvideo.com once NEXT_PUBLIC_DENTVIDEO_URL is set, else the app's own URL.
 */
export function dentvideoPublicUrl(path: string, canonicalUrl: string | undefined, appUrl: string): string {
  if (!canonicalUrl) return `${appUrl.replace(/\/+$/, "")}${path}`;
  const clean = path.replace(/^\/dentvideo(?=\/|$)/, "") || "/";
  return `${canonicalUrl.replace(/\/+$/, "")}${clean}`;
}

/** dentvideoPublicUrl with this deployment's settings. */
export function dvUrl(path: string): string {
  return dentvideoPublicUrl(
    path,
    process.env.NEXT_PUBLIC_DENTVIDEO_URL || undefined,
    (process.env.NEXT_PUBLIC_APP_URL || "https://clipforge.bulsulabs.com").replace(/\/+$/, ""),
  );
}
