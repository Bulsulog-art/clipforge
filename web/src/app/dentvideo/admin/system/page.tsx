import { AdminSystem } from "@/components/dentvid/admin-screens";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadSystemPage } from "@/lib/dentvid/admin-loaders";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";

/** Queues, worker heartbeats, the weekly batch, alerts. 404 for everyone but an admin. */
export default async function AdminSystemPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const data = await loadSystemPage();
  return <AdminSystem data={data} links={siteAdminLinks} viewer={viewer} flash={flashOf(sp)} back={backPath("/dentvideo/admin/system", sp)} />;
}
