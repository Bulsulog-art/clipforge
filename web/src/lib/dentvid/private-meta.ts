import type { Metadata } from "next";

/**
 * Titles of private pages (owner admin, dev previews, test benches). A page
 * that answers 404 to a visitor must not name itself in the browser tab:
 * "Owner dashboard · DentVideo" on a 404 says there is an owner dashboard
 * there. Next renders a page's metadata even when the page calls notFound(),
 * so the metadata itself decides, with the same check as the page.
 */

const PRIVATE_ROBOTS: Metadata["robots"] = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };

/** The same title and robots as app/dentvideo/not-found.tsx. */
export const NOT_FOUND_META: Metadata = { title: { absolute: "Page not found · DentVideo" }, robots: PRIVATE_ROBOTS };

/** Dev previews and test benches exist only with DENTVIDEO_DEV_PREVIEW=1 (never set in production). */
export function devPreviewOn(env: Record<string, string | undefined> = process.env): boolean {
  return env.DENTVIDEO_DEV_PREVIEW === "1";
}

/** A dev preview's metadata: its own title only where the preview exists. */
export function devPreviewMeta(title: string, robots: Metadata["robots"] = PRIVATE_ROBOTS, env: Record<string, string | undefined> = process.env): Metadata {
  return devPreviewOn(env) ? { title, robots } : NOT_FOUND_META;
}

/** An admin page's metadata: its own title only for a signed-in admin. */
export async function adminMeta(title: string, isAdmin?: () => Promise<boolean>): Promise<Metadata> {
  const check =
    isAdmin ??
    (async () => {
      const { adminViewer } = await import("./admin-server");
      return !!(await adminViewer());
    });
  const ok = await check().catch(() => false);
  return ok ? { title, robots: PRIVATE_ROBOTS } : NOT_FOUND_META;
}
