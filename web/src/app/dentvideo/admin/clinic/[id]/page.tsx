import { notFound } from "next/navigation";
import { AdminClinicDetail } from "@/components/dentvid/admin-clinic";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadClinicDetail } from "@/lib/dentvid/admin-loaders";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";

/** One clinic: profile, billing, every video with a player, timeline, emails, owner actions. 404 for everyone else. */
export default async function AdminClinicPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const d = await loadClinicDetail(id);
  if (!d) notFound();
  return <AdminClinicDetail d={d} links={siteAdminLinks} viewer={viewer} flash={flashOf(sp)} back={backPath(`/dentvideo/admin/clinic/${d.clinic.id}`, sp)} />;
}
