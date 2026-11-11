import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LANGUAGE_NAME, LOCALES } from "@/content/dentvideo";
import { demoMessages } from "@/content/dentvideo-demo";
import { DEMO_DEFAULT_CAMPAIGN, DEMO_PALETTE, demoLanguage, isDemoActive, type DemoRow, type DemoStats } from "@/lib/dentvid/demos";
import { CopyButton, DemoForm, DisableButton } from "./admin-demo-form";

/**
 * The owner's demo links (/admin/demos): create one, copy its link and the
 * two messages, and see per demo what happened — views, previews played,
 * CTA clicks, sign-ups and paid clinics. Server rendered; the form and the
 * buttons are the only client parts. Used by the real page and the dev harness.
 */

export type AdminDemoRow = DemoRow & { url: string; stats: DemoStats };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function AdminDemos({
  available,
  demos,
  now,
  backHref,
  foundingOpen,
  warning,
  purged = 0,
}: {
  available: boolean;
  demos: AdminDemoRow[];
  now: string;
  backHref: string;
  foundingOpen: boolean;
  warning?: string;
  purged?: number;
}) {
  const at = new Date(now);
  const totals = demos.reduce(
    (t, d) => ({ views: t.views + d.stats.views, played: t.played + d.stats.played, signups: t.signups + d.stats.signups, paid: t.paid + d.stats.paid }),
    { views: 0, played: 0, signups: 0, paid: 0 },
  );
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
                <p className="text-sm text-dv-muted">
                  {demos.length} demos · {totals.views} views · {totals.played} played · {totals.signups} sign-ups · {totals.paid} paid
                  {purged ? ` · ${purged} expired removed` : ""}
                </p>
              </div>
              {demos.length === 0 ? (
                <p className="dv-card mt-4 p-6 text-sm text-dv-body">No demos yet. Create the first one above.</p>
              ) : (
                <div className="dv-card mt-4 overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.06em] text-dv-muted">
                      <tr className="border-b border-dv-line">
                        <th className="px-4 py-3 font-semibold">Clinic</th>
                        <th className="px-3 py-3 font-semibold">Lang · campaign</th>
                        <th className="px-3 py-3 font-semibold">Created · expires</th>
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
                        const msgs = demoMessages(demoLanguage(d.language), d.clinic_name, d.url, foundingOpen);
                        return (
                          <tr key={d.token} className="border-b border-dv-line align-top last:border-0" data-token={d.token}>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-2 font-semibold text-dv-ink">
                                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.colour ?? "#0f5c5c" }} />
                                {d.clinic_name}
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
                Views: counted once per visitor and hour, from the page itself (link-preview bots do not count). Sign-ups: clinics saved from this demo (its token rides
                along as utm_content and as the demo cookie). Paid: those clinics that ever paid.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
