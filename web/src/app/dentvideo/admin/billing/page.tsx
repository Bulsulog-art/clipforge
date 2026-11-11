import { AdminBilling } from "@/components/dentvid/admin-screens";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadBilling } from "@/lib/dentvid/admin-loaders";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";

/** Subscriptions, payments, duplicates, founding seats; links to Dodo. 404 for everyone but an admin. */
export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const d = await loadBilling();
  return (
    <AdminBilling
      now={d.now}
      subs={d.subs}
      payments={d.payments}
      clinics={d.clinics}
      issues={d.issues}
      dodoFoundingUses={d.dodoFoundingUses}
      alerts={d.alerts}
      warnings={d.warnings}
      links={siteAdminLinks}
      viewer={viewer}
      flash={flashOf(sp)}
      back={backPath("/dentvideo/admin/billing", sp)}
    />
  );
}
