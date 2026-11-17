import { AdminOverview } from "@/components/dentvid/admin-screens";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadOverview } from "@/lib/dentvid/admin-loaders";
import { backPath, flashOf, internalView, siteAdminLinks } from "@/lib/dentvid/admin-links";
import { includeInternalParam } from "@/lib/dentvid/internal-traffic";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

/**
 * The owner panel's overview: today / 7 / 30 days, money, spend, and every
 * open problem linked to the screen that fixes it. 404 for everyone but the
 * user ids in DENTVIDEO_ADMIN_USER_IDS.
 */
export default async function AdminPage({ searchParams }: { searchParams: SP }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  // Internal traffic (owner, QA, e2e, monitor) is left out unless ?internal=1.
  const data = await loadOverview(new Date(), { includeInternal: includeInternalParam(sp.internal) });
  return (
    <AdminOverview
      data={data}
      links={siteAdminLinks}
      viewer={viewer}
      flash={flashOf(sp)}
      back={backPath("/dentvideo/admin", sp)}
      internal={internalView("/dentvideo/admin", sp, data.internal)}
    />
  );
}
