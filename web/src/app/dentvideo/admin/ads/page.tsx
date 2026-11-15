import type { Metadata } from "next";
import { AdminAds } from "@/components/dentvid/admin-ads";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";
import { listAdConversions, purgeAdData } from "@/lib/dentvid/ad-conversions-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ad conversions", robots: { index: false, follow: false } };

/**
 * Google Ads offline conversions (docs/ADS_TRACKING.md). 404 for everyone but
 * the admins in DENTVIDEO_ADMIN_USER_IDS. Opening it also deletes click data
 * older than 90 days (privacy policy; the worker does the same nightly).
 */
export default async function AdminAdsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const purged = await purgeAdData();
  const list = await listAdConversions();
  return (
    <AdminAds
      rows={list.rows}
      available={list.available}
      error={list.error}
      purged={purged}
      now={new Date().toISOString()}
      exportAction="/api/dentvideo/admin/ad-conversions"
      links={siteAdminLinks}
      viewer={viewer}
      flash={flashOf(sp)}
    />
  );
}
