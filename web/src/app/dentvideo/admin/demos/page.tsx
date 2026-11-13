import type { Metadata } from "next";
import { AdminDemos } from "@/components/dentvid/admin-demos";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { listDemos, loadDemoActivity, purgeExpiredDemos } from "@/lib/dentvid/demos-server";
import { demoLanguage, demoPath, demoStats } from "@/lib/dentvid/demos";
import { dvHref, dvUrl } from "@/lib/dentvid/host";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo links", robots: { index: false, follow: false } };

/**
 * Personalised demo links for outreach. 404 for everyone but the admins in
 * DENTVIDEO_ADMIN_USER_IDS. Opening it also deletes expired demos and their
 * logos (privacy policy §7: kept up to 60 days).
 */
export default async function AdminDemosPage() {
  await requireAdmin();
  const now = new Date();
  const purged = await purgeExpiredDemos(now);
  const list = await listDemos();
  const activity = await loadDemoActivity(list.demos);
  const stats = demoStats(list.demos, activity.events, activity.clinics);
  const demos = list.demos.map((d) => ({
    ...d,
    url: dvUrl(demoPath(d.token, demoLanguage(d.language))),
    stats: stats.get(d.token) ?? { views: d.view_count, played: 0, ctaClicks: 0, signups: 0, paid: 0 },
  }));
  return (
    <AdminDemos
      available={list.available}
      demos={demos}
      now={now.toISOString()}
      backHref={dvHref("/dentvideo/admin")}
      warning={list.error}
      purged={purged}
    />
  );
}
