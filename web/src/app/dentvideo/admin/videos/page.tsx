import { AdminVideos, videoPage } from "@/components/dentvid/admin-screens";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadVideos, signVideoPage } from "@/lib/dentvid/admin-loaders";
import { parseVideoFilter } from "@/lib/dentvid/admin-filters";
import { ADMIN_SIGNED_URL_TTL_SEC } from "@/lib/dentvid/admin-signed";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";

/** Recent videos across clinics, problems first, with players. 404 for everyone but an admin. */
export default async function AdminVideosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const filter = parseVideoFilter(sp);
  const data = await loadVideos();
  const { page, total } = videoPage(data.items, filter, data.clinics);
  const items = await signVideoPage(page);
  return (
    <AdminVideos
      now={data.now}
      items={items}
      clinics={data.clinics}
      filter={filter}
      total={total}
      warnings={data.warnings}
      ttlSec={ADMIN_SIGNED_URL_TTL_SEC}
      links={siteAdminLinks}
      viewer={viewer}
      flash={flashOf(sp)}
      back={backPath("/dentvideo/admin/videos", sp)}
    />
  );
}
