import type { Metadata } from "next";
import { adminMeta } from "@/lib/dentvid/private-meta";
import { AdminRequests } from "@/components/dentvid/admin-requests";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadRequests } from "@/lib/dentvid/admin-loaders";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return adminMeta("Requests");
}

/** Topic suggestions and change requests from clinics (0025). 404 for everyone but an admin. */
export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const data = await loadRequests();
  return <AdminRequests now={data.now} topics={data.topics} changes={data.changes} clinics={data.clinics} warnings={data.warnings} links={siteAdminLinks} viewer={viewer} flash={flashOf(sp)} back={backPath("/dentvideo/admin/requests", sp)} />;
}
