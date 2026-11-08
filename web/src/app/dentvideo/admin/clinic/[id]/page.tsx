import { notFound } from "next/navigation";
import { AdminClinicView } from "@/components/dentvid/admin-dashboard";
import { loadClinicForAdmin, requireAdmin } from "@/lib/dentvid/admin-server";
import { dvHref } from "@/lib/dentvid/host";

export const dynamic = "force-dynamic";

/** One clinic's library, read-only, for the owner. 404 for everyone else. */
export default async function AdminClinicPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const found = await loadClinicForAdmin(id);
  if (!found) notFound();
  return <AdminClinicView clinic={found.clinic} items={found.items} backHref={dvHref("/dentvideo/admin")} />;
}
