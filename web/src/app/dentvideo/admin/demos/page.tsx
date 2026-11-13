import type { Metadata } from "next";
import { AdminDemos } from "@/components/dentvid/admin-demos";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { listDemos, loadDemoActivity, purgeExpiredDemos } from "@/lib/dentvid/demos-server";
import { demoLanguage, demoPath, demoStats } from "@/lib/dentvid/demos";
import { asDemoSort, demoLastActivity, sortDemos } from "@/lib/dentvid/hot-leads";
import { dvHref, dvUrl } from "@/lib/dentvid/host";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo links", robots: { index: false, follow: false } };

/**
 * Personalised demo links for outreach. 404 for everyone but the admins in
 * DENTVIDEO_ADMIN_USER_IDS. Opening it also deletes expired demos and their
 * logos (privacy policy §7: kept up to 60 days). Demos with activity in the
 * last 48 hours are marked Hot and listed first (?sort=new: newest first).
 */
export default async function AdminDemosPage({ searchParams }: { searchParams?: Promise<{ sort?: string }> }) {
  await requireAdmin();
  const sort = asDemoSort((await searchParams)?.sort);
  const now = new Date();
  const purged = await purgeExpiredDemos(now);
  const list = await listDemos();
  const activity = await loadDemoActivity(list.demos);
  const stats = demoStats(list.demos, activity.events, activity.clinics);
  const last = demoLastActivity(list.demos, activity.events);
  const demos = sortDemos(
    list.demos.map((d) => ({
      ...d,
      url: dvUrl(demoPath(d.token, demoLanguage(d.language))),
      stats: stats.get(d.token) ?? { views: d.view_count, played: 0, ctaClicks: 0, signups: 0, paid: 0 },
      lastActivityAt: last.get(d.token) ?? null,
    })),
    sort,
    now,
  );
  return (
    <AdminDemos
      available={list.available}
      demos={demos}
      now={now.toISOString()}
      backHref={dvHref("/dentvideo/admin")}
      warning={list.error}
      purged={purged}
      sort={sort}
      sortHrefs={{ hot: dvHref("/dentvideo/admin/demos"), new: dvHref("/dentvideo/admin/demos?sort=new") }}
    />
  );
}
