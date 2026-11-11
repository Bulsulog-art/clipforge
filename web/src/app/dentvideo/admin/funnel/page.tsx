import { AdminFunnelScreen } from "@/components/dentvid/admin-screens";
import { loadAdminData, requireAdmin } from "@/lib/dentvid/admin-server";
import { parseRange } from "@/lib/dentvid/admin-filters";
import { asCountryFilter } from "@/lib/dentvid/admin-metrics";
import { asLocale } from "@/lib/dentvid/locale";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** The funnel and its sources over a chosen date range. 404 for everyone but an admin. */
export default async function AdminFunnelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const now = new Date();
  const range = parseRange(sp, now);
  const eventDays = Math.ceil((now.getTime() - range.from.getTime()) / 86_400_000) + 1;
  const data = await loadAdminData(now, { eventDays });
  return (
    <AdminFunnelScreen
      data={data}
      range={range}
      locale={asLocale(one(sp.locale)) ?? null}
      country={asCountryFilter(one(sp.country))}
      links={siteAdminLinks}
      viewer={viewer}
      flash={flashOf(sp)}
      back={backPath("/dentvideo/admin/funnel", sp)}
    />
  );
}
