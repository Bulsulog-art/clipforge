import { LOCALES } from "@/content/dentvideo";

/**
 * Which DentVideo pages a shared cache (a CDN, a proxy) may keep, and for how long.
 *
 * The marketing site — the landings in every language, about, the guides,
 * the video pages, llms.txt, sitemap, robots — is the same HTML for every
 * visitor and is prerendered at build. Saying so lets a CDN in front of
 * dentvideo.com answer most visitors without touching the shared 2-core box
 * the renders run on (docs/CAPACITY.md).
 *
 *   public, max-age=0, s-maxage=3600, stale-while-revalidate=86400
 *
 * Browsers always revalidate (max-age=0: a deploy shows at once); a shared
 * cache keeps a page an hour and may serve it up to a day stale while it
 * fetches the new one. Next's own default for a prerendered page is a year in
 * a shared cache — too long for a site whose copy changes with each deploy.
 *
 * Everything else — the app, sign-up, sign-in, password reset, checkout,
 * admin, dev pages, the live preview, any /api route — is never marked
 * public: it is per person, or it sets cookies. The rule is an allow-list of
 * exact page shapes, so a new route is uncached until it is added here.
 */

export const PUBLIC_PAGE_CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

const LOCALE = `(?:${LOCALES.filter((l) => l !== "en").join("|")})`;
const SLUG = "[a-z0-9][a-z0-9-]{0,120}";

const PUBLIC_PAGES: RegExp[] = [
  // Landings: /dentvideo, /dentvideo/de …
  new RegExp(`^/dentvideo(?:/${LOCALE})?$`),
  // About and the guides hub, in every language.
  new RegExp(`^/dentvideo(?:/${LOCALE})?/(?:about|guides)$`),
  // One guide, one video page.
  new RegExp(`^/dentvideo/(?:guides|videos)/${SLUG}$`),
  // Machine-readable site files.
  /^\/dentvideo\/(?:llms\.txt|llms-full\.txt|sitemap\.xml|robots\.txt)$/,
];

/** The Cache-Control for a DentVideo page path (in-app, "/dentvideo/…"), or null to leave the response as it is. */
export function publicCacheControl(path: string, method = "GET"): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  return PUBLIC_PAGES.some((r) => r.test(path)) ? PUBLIC_PAGE_CACHE : null;
}
