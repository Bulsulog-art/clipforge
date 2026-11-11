import { AdminDashboard } from "@/components/dentvid/admin-dashboard";
import { loadAdminData, requireAdmin } from "@/lib/dentvid/admin-server";
import { dvHref } from "@/lib/dentvid/host";
import { asLocale } from "@/lib/dentvid/locale";
import { asCountryFilter } from "@/lib/dentvid/admin-metrics";

export const dynamic = "force-dynamic";

/**
 * The owner dashboard: revenue, funnel, operations and recent clinics.
 * 404 for everyone but the emails in DENTVIDEO_ADMIN_USER_IDS.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string; locale?: string; country?: string }> }) {
  const { email } = await requireAdmin();
  const sp = await searchParams;
  const data = await loadAdminData();
  return (
    <AdminDashboard
      data={data}
      days={sp.days === "7" ? 7 : 30}
      locale={asLocale(sp.locale) ?? null}
      country={asCountryFilter(sp.country)}
      basePath={dvHref("/dentvideo/admin")}
      clinicHref={(id) => dvHref(`/dentvideo/admin/clinic/${id}`)}
      viewer={email}
    />
  );
}
