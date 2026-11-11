import { AdminClinics } from "@/components/dentvid/admin-screens";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadClinicsList } from "@/lib/dentvid/admin-loaders";
import { parseClinicFilter } from "@/lib/dentvid/admin-filters";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";

/** Every clinic, searchable and filterable. 404 for everyone but an admin. */
export default async function AdminClinicsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const data = await loadClinicsList();
  return (
    <AdminClinics
      now={data.now}
      rows={data.rows}
      warnings={data.warnings}
      filter={parseClinicFilter(sp)}
      links={siteAdminLinks}
      viewer={viewer}
      flash={flashOf(sp)}
      back={backPath("/dentvideo/admin/clinics", sp)}
    />
  );
}
