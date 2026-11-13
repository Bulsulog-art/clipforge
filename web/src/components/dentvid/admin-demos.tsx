import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LANGUAGE_NAME, LOCALES } from "@/content/dentvideo";
import { demoMessages } from "@/content/dentvideo-demo";
import { DEMO_DEFAULT_CAMPAIGN, DEMO_PALETTE, demoLanguage, isDemoActive, type DemoRow, type DemoStats } from "@/lib/dentvid/demos";
import { isHotDemo, type DemoSort } from "@/lib/dentvid/hot-leads";
import { CopyButton, DemoForm, DisableButton } from "./admin-demo-form";

/**
 * The owner's demo links (/admin/demos): create one, copy its link and the
 * two messages, and see per demo what happened — views, previews played,
 * CTA clicks, sign-ups and paid clinics, and which are Hot (activity in the
 * last 48 hours; listed first unless sorted by newest). Server rendered; the form and the
 * buttons are the only client parts. Used by the real page and the dev harness.
 */

export type AdminDemoRow = DemoRow & { url: string; stats: DemoStats; lastActivityAt?: string | null };

/** "12 min ago", "5 h ago", "3 d ago" — the owner reads it at a glance. */
export function ago(iso: string, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function AdminDemos({
  available,
  demos,
  now,
  backHref,
  warning,
  purged = 0,
  sort = "hot",
  sortHrefs,
}: {
  available: boolean;
  demos: AdminDemoRow[];
  now: string;
  backHref: string;
  warning?: string;
  purged?: number;
  sort?: DemoSort;
  sortHrefs?: Record<DemoSort, string>;
}) {
  const at = new Date(now);
  const totals = demos.reduce(
    (t, d) => ({ views: t.views + d.stats.views, played: t.played + d.stats.played, signups: t.signups + d.stats.signups, paid: t.paid + d.stats.paid }),
    { views: 0, played: 0, signups: 0, paid: 0 },
  );
  const hotCount = demos.filter((d) => isHotDemo(d.lastActivityAt, at)).length;
  return (
    <main lang="en" className="relative isolate overflow-hidden" data-testid="admin-demos">
      <div aria-hidden="true" className="dv-grid absolute inset-x-0 top-0 -z-10 h-[28rem]" />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <Link href={backHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Owner dashboard
        </Link>
        <header className="mt-2">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-dv-teal">Outreach</p>
          <h1 className="dv-display mt-2 text-[2.5rem] leading-[1.05] text-dv-ink sm:text-[3.25rem]">Demo links</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dv-muted">
            A private page that shows one clinic its own branded preview — no sign-up, no OpenAI cost (the stored preview library is painted in its colours and logo).
            “Start with these settings” carries the demo into the sign-up, so a payment is credited to it.
          </p>
        </header>

        {warning && (
          <div role="status" className="mt-6 rounded-xl bg-[#fdf1dc] px-4 py-3 text-sm text-[#7a4b00]">
            {warning}
          </div>
        )}

        {!available ? (
          <div className="dv-card mt-8 p-6 text-sm leading-relaxed text-dv-body" data-testid="demos-missing">
            <p className="font-semibold text-dv-ink">Demo links are not switched on yet.</p>
            <p className="mt-1">
              The <code>dentvid_demos</code> table is missing: apply <code>supabase/liman/0009_dentvid_demos.sql</code> on Liman, then reload this page.
            </p>
          </div>
        ) : (
          <>
            <section aria-label="New demo" className="mt-8">
              <DemoForm
                languages={LOCALES.map((l) => ({ code: l, label: `${LANGUAGE_NAME[l]} (${l})` }))}
                palette={DEMO_PALETTE}
                defaultCampaign={DEMO_DEFAULT_CAMPAIGN}
              />
            </section>

            <section aria-labelledby="demo-list" className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="demo-list" className="dv-display text-[1.75rem] leading-tight text-dv-ink sm:text-[2rem]">
                  Sent demos
                </h2>
                {sortHrefs && (
                  <nav aria-label="Sort demos" className="flex items-center gap-1 text-sm" data-testid="demo-sort">
                    {(["hot", "new"] as const).map((s) => (
                      <Link
                        key={s}
                        href={sortHrefs[s]}
                        aria-current={sort === s ? "page" : undefined}
                        className={`inline-flex min-h-9 items-center rounded-full px-3 ${sort === s ? "bg-dv-ink font-semibold text-white" : "text-dv-teal hover:underline"}`}
                      >
                        {s === "hot" ? "Hot first" : "Newest first"}
                      </Link>
                    ))}
                  </nav>
                )}
                <p className="text-sm text-dv-muted">
                  {hotCount ? `${hotCount} hot · ` : ""}
                  {demos.length} demos · {totals.views} views · {totals.played} played · {totals.signups} sign-ups · {totals.paid} paid
                  {purged ? ` · ${purged} expired removed` : ""}
                </p>
              </div>
              {demos.length === 0 ? (
                <p className="dv-card mt-4 p-6 text-sm text-dv-body">No demos yet. Create the first one above.</p>
              ) : (
                <div className="dv-card mt-4 overflow-x-auto">
                  <table className="w-full min-w-[62rem] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.06em] text-dv-muted">
                      <tr className="border-b border-dv-line">
                        <th className="px-4 py-3 font-semibold">Clinic</th>
                        <th className="px-3 py-3 font-semibold">Lang · campaign</th>
                        <th className="px-3 py-3 font-semibold">Created · expires</th>
                        <th className="px-3 py-3 font-semibold">Last activity</th>
                        <th className="px-3 py-3 text-right font-semibold">Views</th>
                        <th className="px-3 py-3 text-right font-semibold">Played</th>
                        <th className="px-3 py-3 text-right font-semibold">CTA</th>
                        <th className="px-3 py-3 text-right font-semibold">Sign-ups</th>
                        <th className="px-3 py-3 text-right font-semibold">Paid</th>
                        <th className="px-4 py-3 font-semibold">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demos.map((d) => {
                        const live = isDemoActive(d, at);
                        const hot = isHotDemo(d.lastActivityAt, at);
                        const msgs = demoMessages(demoLanguage(d.language), d.clinic_name, d.url);
                        return (
                          <tr key={d.token} className={`border-b border-dv-line align-top last:border-0 ${hot ? "bg-[#fff6ec]" : ""}`} data-token={d.token} data-hot={hot ? "1" : undefined}>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-2 font-semibold text-dv-ink">
                                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.colour ?? "#0f5c5c" }} />
                                {d.clinic_name}
                                {hot && (
                                  <span className="rounded-full bg-[#c2410c] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white" data-testid="hot-badge">
                                    Hot
                                  </span>
                                )}
                              </span>
                              <span className="block text-xs text-dv-muted">
                                {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                                {d.logo_path ? " · logo" : ""}
                              </span>
                              {d.note && <span className="mt-1 block max-w-[16rem] text-xs italic text-dv-muted">{d.note}</span>}
                            </td>
                            <td className="px-3 py-3 text-dv-body">
                              {d.language} · {d.campaign}
                            </td>
                            <td className="px-3 py-3 text-dv-body">
                              {day(d.created_at)} · {day(d.expires_at)}
                              <span className={`mt-1 block text-xs font-semibold ${live ? "text-dv-teal" : "text-[#8a1f1f]"}`}>
                                {d.disabled ? "Off" : live ? "Live" : "Expired"}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-dv-body" data-testid="last-activity">
                              {d.lastActivityAt ? (
                                <time dateTime={d.lastActivityAt} title={d.lastActivityAt} className={hot ? "font-semibold text-[#c2410c]" : ""}>
                                  {ago(d.lastActivityAt, at)}
                                </time>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {d.stats.views}
                              {d.last_viewed_at && <span className="block text-xs text-dv-muted">last {day(d.last_viewed_at)}</span>}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">{d.stats.played}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{d.stats.ctaClicks}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{d.stats.signups}</td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums text-dv-ink">{d.stats.paid}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <CopyButton text={d.url} label="Link" />
                                <CopyButton text={msgs.ask} label="Msg 1" />
                                <CopyButton text={msgs.link} label="Msg 2" />
                                <DisableButton token={d.token} disabled={d.disabled} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-dv-muted">
                Views: counted once per visitor and hour, from the page itself — link-preview bots, crawlers, scripts and your own visits while signed in do
                not count. Hot: a view, play, CTA click or sign-up in the last 48 hours (you also get an email the first time each happens). Sign-ups: clinics saved from this demo (its token rides
                along as utm_content and as the demo cookie). Paid: those clinics that ever paid.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
