import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/dentvid/admin-dashboard";
import { AdminBilling, AdminClinics, AdminEmails, AdminFunnelScreen, AdminOverview, AdminSystem, AdminVideos, videoPage } from "@/components/dentvid/admin-screens";
import { AdminClinicDetail } from "@/components/dentvid/admin-clinic";
import type { AdminLinks } from "@/components/dentvid/admin-ui";
import { asCountryFilter } from "@/lib/dentvid/admin-metrics";
import { clinicSources, lastRuns } from "@/lib/dentvid/admin-metrics";
import { lastActivity, parseClinicFilter, parseRange, parseVideoFilter, qs } from "@/lib/dentvid/admin-filters";
import { billingIssues } from "@/lib/dentvid/admin-ops";
import type { AdminSection } from "@/lib/dentvid/admin-nav";
import { asLocale } from "@/lib/dentvid/locale";
import { SAMPLES, demoData, emptyData } from "./fixtures";
import { fixtureDetail, fixtureEmails, fixtureOverview, fixturePayments, fixtureSubs, fixtureSystem, fixtureSystemPage } from "./fixtures-panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner panel preview", robots: { index: false, follow: false } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const BASE = "/dentvideo/dev/admin";

/** The harness's links: every screen is a ?screen= of this one page. */
const links: AdminLinks = {
  section: (key: AdminSection, query = "") => {
    const q = new URLSearchParams(query.replace(/^\?/, ""));
    q.set("screen", key);
    return `${BASE}?${q.toString()}`;
  },
  clinic: (id: string) => `${BASE}?screen=clinic&id=${id}`,
  form: (key: AdminSection) => ({ action: BASE, hidden: { screen: key } }),
};

const viewer = { email: "owner@dentvideo.com", csrf: "dev-preview-token" };

/**
 * Dev-only: the owner admin panel from realistic fake data (seeded, so the
 * same every load), for design review and screenshots. 404 unless
 * DENTVIDEO_DEV_PREVIEW=1. Action forms post to the real route, which
 * answers 404 here (no admin session).
 *
 *   ?screen=overview|clinics|clinic&id=<id>|videos|system|emails|billing|funnel
 *   ?screen=legacy                the old one-page dashboard
 *   ?empty=1                      a fresh install (no events, no Redis)
 *   ?flash=<code>                 a flash banner (e.g. week_queued)
 */
export default async function AdminPreview({ searchParams }: { searchParams: Promise<SP> }) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const now = new Date();
  const data = one(sp.empty) ? emptyData(now) : demoData(now);
  const screen = one(sp.screen) || "overview";
  const flash = one(sp.flash) || null;
  const back = `${BASE}?screen=${screen}`;
  const common = { links, viewer, flash, back };

  switch (screen) {
    case "legacy":
      return (
        <AdminDashboard
          data={data}
          days={one(sp.days) === "7" ? 7 : 30}
          locale={asLocale(one(sp.locale)) ?? null}
          country={asCountryFilter(one(sp.country))}
          basePath={`${BASE}?screen=legacy`}
          clinicHref={(id) => links.clinic(id)}
          viewer={viewer.email}
        />
      );
    case "clinics": {
      const activity = lastActivity(data.clinics, data.events, data.items);
      const sources = clinicSources(data.events);
      const runs = lastRuns(data.items);
      const rows = data.clinics.map((c, i) => ({ ...c, admin_paused_at: i === 4 ? new Date(now.getTime() - 86_400_000).toISOString() : null, lastActivity: activity.get(c.id) ?? null, source: sources.get(c.id) ?? null, run: runs.get(c.id) }));
      return <AdminClinics now={data.now} rows={rows} filter={parseClinicFilter(sp)} warnings={[]} {...common} />;
    }
    case "clinic": {
      const id = one(sp.id);
      const clinic = data.clinics.find((c) => c.id === id) ?? data.clinics.find((c) => c.plan === "active" && data.items.some((i) => i.clinic_id === c.id && i.status === "flagged"));
      if (!clinic) notFound();
      return <AdminClinicDetail d={fixtureDetail(now, data, clinic)} {...common} back={links.clinic(clinic.id)} />;
    }
    case "videos": {
      const filter = parseVideoFilter(sp);
      const { page, total } = videoPage(
        data.items.map((i) => ({ ...i, video_path: i.status === "ready" || i.status === "flagged" ? "x" : null })),
        filter,
        data.clinics,
        24,
      );
      const items = page.map((i, n) => {
        const s = SAMPLES[n % SAMPLES.length];
        return { ...i, videoUrl: i.video_path ? `/dentvideo/samples/${s}.mp4` : undefined, thumbUrl: i.video_path ? `/dentvideo/samples/${s}.jpg` : undefined };
      });
      return <AdminVideos now={data.now} items={items} clinics={data.clinics} filter={filter} total={total} warnings={[]} ttlSec={900} {...common} back={links.section("videos", qs({ status: filter.status }))} />;
    }
    case "system":
      return <AdminSystem data={fixtureSystemPage(now, data)} {...common} />;
    case "emails": {
      const { log, sends } = fixtureEmails(now, data.clinics);
      const status = one(sp.status);
      const kind = one(sp.kind);
      return <AdminEmails now={data.now} log={log} sends={sends} clinics={data.clinics} status={status === "failed" || status === "sent" ? status : null} kind={kind || null} warnings={[]} {...common} />;
    }
    case "billing": {
      const subs = fixtureSubs(now, data.clinics);
      return (
        <AdminBilling
          now={data.now}
          subs={subs}
          payments={fixturePayments(subs)}
          clinics={data.clinics}
          issues={billingIssues(subs, data.clinics)}
          dodoFoundingUses={null}
          alerts={fixtureSystem(now, data).alerts}
          warnings={[]}
          {...common}
        />
      );
    }
    case "funnel":
      return <AdminFunnelScreen data={data} range={parseRange(sp, now)} locale={asLocale(one(sp.locale)) ?? null} country={asCountryFilter(one(sp.country))} {...common} />;
    default:
      return <AdminOverview data={one(sp.empty) ? { ...fixtureOverview(now, data), system: { ...fixtureSystem(now, data), available: false, heartbeats: [], queues: [], failed: [], health: "unknown" } } : fixtureOverview(now, data)} {...common} />;
  }
}
