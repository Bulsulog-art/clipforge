import Link from "next/link";
import { AlertTriangle, ArrowRight, ArrowUpRight, CircleCheck, Clock, PauseCircle } from "lucide-react";
import { DV_FOUNDING } from "@/lib/dentvid/billing";
import {
  billingHints,
  dailyCounts,
  foundingSeats,
  clinicCountries,
  funnel,
  funnelByCountry,
  funnelByLocale,
  funnelBySource,
  type SegmentRow,
  growth,
  lastRuns,
  latestErrors,
  revenue,
  runState,
  runTotals,
  type ClinicRun,
} from "@/lib/dentvid/admin-metrics";
import type { AdminData } from "@/lib/dentvid/admin-server";

/**
 * The owner dashboard (/dentvideo/admin): is the business working? Server
 * rendered from AdminData; no client JavaScript — the range and locale
 * filters are plain links. Used by the real page and the dev harness.
 */

const usd = (n: number, digits = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`);
const int = (n: number) => new Intl.NumberFormat("en-US").format(n);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

function Sparkline({ values, label, className = "" }: { values: number[]; label: string; className?: string }) {
  const w = 160;
  const h = 40;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 6)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label} className={`h-10 w-full overflow-visible ${className}`}>
      <polygon points={area} fill="#dcebe7" opacity="0.7" />
      <polyline points={line} fill="none" stroke="#0f5c5c" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r="2.5" fill="#0f5c5c" />}
    </svg>
  );
}

function Tile({ label, value, sub, children }: { label: string; value: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="dv-card flex min-w-0 flex-col p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">{label}</p>
      <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight text-dv-ink tabular-nums">{value}</p>
      {sub && <div className="mt-2 text-sm leading-snug text-dv-body">{sub}</div>}
      {children && <div className="mt-auto pt-4">{children}</div>}
    </div>
  );
}

function Meter({ value, max, tone = "teal" }: { value: number; max: number; tone?: "teal" | "amber" | "red" }) {
  const p = max > 0 ? Math.min(1, value / max) : 0;
  const colour = tone === "red" ? "#b42318" : tone === "amber" ? "#b7791f" : "#0f5c5c";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-dv-sand" role="presentation">
      <div className="h-full rounded-full" style={{ width: `${Math.max(p * 100, value > 0 ? 2 : 0)}%`, background: colour }} />
    </div>
  );
}

function SectionTitle({ title, lead, right }: { title: string; lead?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="dv-display text-[1.75rem] leading-tight text-dv-ink sm:text-[2rem]">{title}</h2>
        {lead && <p className="mt-1 text-sm text-dv-muted">{lead}</p>}
      </div>
      {right}
    </div>
  );
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium transition ${
        on ? "bg-dv-teal text-white" : "bg-white text-dv-body ring-1 ring-dv-line hover:text-dv-ink hover:ring-dv-edge"
      }`}
    >
      {children}
    </Link>
  );
}

const PLAN_BADGE: Record<string, string> = {
  active: "bg-dv-teal-50 text-dv-teal ring-dv-teal-100",
  trial: "bg-dv-sand text-dv-body ring-dv-line",
  paused: "bg-[#fdf1dc] text-[#7a4b00] ring-[#f3dcae]",
  cancelled: "bg-[#fbeaea] text-[#8a1f1f] ring-[#f2cccc]",
};

function PlanBadge({ plan, tier }: { plan: string; tier?: string | null }) {
  const label = plan === "trial" ? "unpaid" : plan === "active" && tier ? tier : plan;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${PLAN_BADGE[plan] ?? PLAN_BADGE.trial}`}>{label}</span>;
}

/** Whether the owner confirmed their address (lib/dentvid/verify-email). Nothing when it could not be read. */
function EmailBadge({ verified }: { verified: boolean | undefined }) {
  if (verified === undefined) return null;
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-dv-teal">
      <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
      email confirmed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9a5b00]">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      email unconfirmed
    </span>
  );
}

function RunBadge({ run }: { run: ClinicRun | undefined }) {
  const s = runState(run);
  if (s === "none") return <span className="text-sm text-dv-muted">—</span>;
  const icon =
    s === "ready" ? <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> : s === "making" ? <Clock className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />;
  const tone = s === "ready" ? "text-dv-teal" : s === "making" ? "text-dv-body" : s === "failed" ? "text-[#b42318]" : "text-[#9a5b00]";
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${tone}`}>
      {icon}
      <span className="tabular-nums">
        {run!.ready} ready{run!.flagged ? ` · ${run!.flagged} flagged` : ""}
        {run!.failed ? ` · ${run!.failed} failed` : ""}
        {run!.making ? ` · ${run!.making} making` : ""}
      </span>
    </span>
  );
}

export type AdminDashboardProps = {
  data: AdminData;
  days: 7 | 30;
  locale: string | null;
  /** ISO country filter (eventCountry), or null for all. */
  country?: string | null;
  /** The dashboard's own path, for the filter links. */
  basePath: string;
  clinicHref: (id: string) => string;
  /** Shown as "signed in as". */
  viewer?: string;
};

export function AdminDashboard({ data, days, locale, country = null, basePath, clinicHref, viewer }: AdminDashboardProps) {
  const now = new Date(data.now);
  const hints = billingHints(data.events);
  const rev = revenue(data.clinics, hints);
  const g = growth(data.clinics, now);
  const seats = foundingSeats(data.clinics, data.dodoFoundingUses);
  const signupSeries = dailyCounts(data.clinics.map((c) => c.created_at), 30, now);
  const visitSeries = dailyCounts(data.events.filter((e) => e.name === "landing_view").map((e) => e.created_at), 30, now);
  const countries = clinicCountries(data.clinics);
  const steps = funnel(data.events, { days, now, locale, country, countries });
  // Bars on a square-root scale: visits outnumber payments 100:1, and a linear bar would hide every step after the first.
  const top = Math.max(1, ...steps.map((s) => s.count));
  // Each breakdown honours the other filter: by locale within the chosen country, by country within the chosen locale.
  const locales = funnelByLocale(data.events, { days, now, country, countries });
  const allLocales = funnelByLocale(data.events, { days, now, countries });
  const byCountry = funnelByCountry(data.events, { days, now, locale, countries });
  const allCountries = funnelByCountry(data.events, { days, now, countries });
  const sources = funnelBySource(data.events, { days, now, locale, country, countries });
  const runs = lastRuns(data.items);
  const totals = runTotals(runs);
  const errors = latestErrors(data.items);
  const names = new Map(data.clinics.map((c) => [c.id, c.profile?.name || "(no name)"]));
  const recent = data.clinics.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 25);
  const verifiedOwners = data.verifiedOwners ? new Set(data.verifiedOwners) : null;
  const emailOk = (c: { owner_id?: string }) => (verifiedOwners && c.owner_id ? verifiedOwners.has(c.owner_id) : undefined);
  const href = (q: { days?: number; locale?: string | null; country?: string | null }) => {
    const p = new URLSearchParams();
    const d = q.days ?? days;
    const l = q.locale === undefined ? locale : q.locale;
    const c = q.country === undefined ? country : q.country;
    if (d !== 30) p.set("days", String(d));
    if (l) p.set("locale", l);
    if (c) p.set("country", c);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const spend = data.spend;
  const dayTone = spend.spentTodayUsd !== null && spend.spentTodayUsd >= spend.dailyCapUsd * 0.8 ? "amber" : "teal";
  const monthTone = spend.spentMonthUsd !== null && spend.spentMonthUsd >= spend.monthlyCapUsd * 0.8 ? "amber" : "teal";

  return (
    <main lang="en" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-x-0 top-0 -z-10 h-[28rem]" />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-dv-teal">Owner dashboard</p>
            <h1 className="dv-display mt-2 text-[2.5rem] leading-[1.05] text-dv-ink sm:text-[3.25rem]">Is DentVideo working?</h1>
            <p className="mt-2 text-sm text-dv-muted">
              As of {when(data.now)} UTC{viewer ? ` · ${viewer}` : ""}
            </p>
          </div>
        </header>

        {data.warnings.length > 0 && (
          <div role="status" className="mt-6 rounded-xl bg-[#fdf1dc] px-4 py-3 text-sm text-[#7a4b00]">
            {data.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}

        {/* KPIs */}
        <section aria-label="Key numbers" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Tile
            label="MRR"
            value={usd(rev.mrrUsd)}
            sub={
              <>
                {rev.paying} paying{rev.founding ? ` · ${rev.founding} at founding ${usd(DV_FOUNDING.priceUsd)}` : ""}
                {rev.yearly ? ` · ${rev.yearly} yearly` : ""}
              </>
            }
          >
            <p className="text-xs text-dv-muted">List prices × plan; yearly ÷ 12; founding price where the checkout used the code.</p>
          </Tile>
          <Tile
            label="Paying clinics"
            value={int(rev.paying)}
            sub={
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                <span>Starter {rev.payingByTier.starter}</span>
                <span>Practice {rev.payingByTier.practice}</span>
                <span>Group {rev.payingByTier.group}</span>
                {rev.payingByTier.unknown > 0 && <span className="text-dv-muted">Unknown tier {rev.payingByTier.unknown}</span>}
              </span>
            }
          >
            <TierBar starter={rev.payingByTier.starter} practice={rev.payingByTier.practice} group={rev.payingByTier.group} unknown={rev.payingByTier.unknown} />
          </Tile>
          <Tile
            label="New sign-ups"
            value={
              <span className="flex items-baseline gap-3">
                {int(g.signups7d)}
                <span className="text-sm font-medium text-dv-muted">last 7 days</span>
              </span>
            }
            sub={
              <>
                Today {g.signupsToday} · 30 days {g.signups30d} · all time {g.total}
              </>
            }
          >
            <Sparkline values={signupSeries} label={`Sign-ups per day, last 30 days: ${signupSeries.join(", ")}`} />
          </Tile>
          <Tile
            label="Unpaid → paid"
            value={pct(g.conversion)}
            sub={
              <>
                {g.everPaid} of {g.total} clinics ever paid · {g.unpaid} unpaid
                <br />
                Last 30 days' sign-ups paying now: {pct(g.conversion30d)}
              </>
            }
          />
          <Tile
            label="Churn"
            value={pct(g.churn)}
            sub={
              <span className="flex flex-wrap gap-x-3">
                <span>{g.cancelled} cancelled</span>
                <span>{g.paused} paused</span>
                <span className="text-dv-muted">of {g.everPaid} ever paid</span>
              </span>
            }
          />
          <Tile
            label="Founding seats left"
            value={
              <span className="flex items-baseline gap-2">
                {seats.left}
                <span className="text-sm font-medium text-dv-muted">of {DV_FOUNDING.clinics}</span>
              </span>
            }
            sub={seats.source === "dodo" ? `Code used ${seats.used}× (from Dodo)` : `Estimated: ${seats.used} active Practice clinics (no Dodo key)`}
          >
            <Meter value={seats.used} max={DV_FOUNDING.clinics} tone={seats.left <= 10 ? "amber" : "teal"} />
          </Tile>
        </section>

        {/* Funnel */}
        <section aria-labelledby="funnel-title" className="mt-14">
          <SectionTitle
            title="Funnel"
            lead={
              data.eventsTable
                ? "Distinct clinics per step once signed up; visits once per browser tab. Bars on a square-root scale; % = from the step before."
                : "No events yet — apply supabase/liman/0006_dentvid_events.sql to start counting."
            }
            right={
              <div className="flex flex-wrap gap-2" aria-label="Range">
                <Chip href={href({ days: 7 })} on={days === 7}>
                  7 days
                </Chip>
                <Chip href={href({ days: 30 })} on={days === 30}>
                  30 days
                </Chip>
              </div>
            }
          />
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Locale">
            <Chip href={href({ locale: null })} on={!locale}>
              All locales
            </Chip>
            {allLocales
              .filter((l) => l.locale !== "—")
              .map((l) => (
                <Chip key={l.locale} href={href({ locale: l.locale })} on={locale === l.locale}>
                  <span className="uppercase">{l.locale}</span>
                </Chip>
              ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Country">
            <Chip href={href({ country: null })} on={!country}>
              All countries
            </Chip>
            {allCountries
              .filter((c) => c.key !== "—")
              .map((c) => (
                <Chip key={c.key} href={href({ country: c.key })} on={country === c.key}>
                  {c.key}
                </Chip>
              ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ol className="dv-card divide-y divide-dv-line p-2 sm:p-3">
              {steps.map((s, i) => (
                <li key={s.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-3 py-2.5">
                  <span className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-dv-ink">
                    <span className="w-5 shrink-0 text-xs tabular-nums text-dv-muted">{i + 1}</span>
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="flex items-baseline gap-3 text-sm tabular-nums">
                    <span className="font-semibold text-dv-ink">{int(s.count)}</span>
                    <span className="w-14 text-end text-xs text-dv-muted" title="Conversion from the step before">
                      {i === 0 ? "" : pct(s.fromPrev)}
                    </span>
                  </span>
                  <span className="col-span-2 ms-7 block h-2 overflow-hidden rounded-full bg-dv-sand">
                    <span className="block h-full rounded-full bg-dv-teal" style={{ width: `${Math.sqrt(s.count / top) * 100}%`, opacity: 1 - i * 0.045 }} />
                  </span>
                </li>
              ))}
            </ol>
            <div className="grid content-start gap-4">
              <div className="dv-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Overall</p>
                <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-dv-muted">Visit → sign-up</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums text-dv-ink">{pct(steps.find((s) => s.key === "signup")?.fromTop ?? null)}</dd>
                  </div>
                  <div>
                    <dt className="text-dv-muted">Sign-up → paid</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums text-dv-ink">
                      {pct(
                        (() => {
                          const su = steps.find((s) => s.key === "signup")?.count ?? 0;
                          const pd = steps.find((s) => s.key === "paid")?.count ?? 0;
                          return su ? pd / su : null;
                        })(),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-dv-muted">Visit → paid</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums text-dv-ink">{pct(steps.find((s) => s.key === "paid")?.fromTop ?? null)}</dd>
                  </div>
                  <div>
                    <dt className="text-dv-muted">Paid → shared</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums text-dv-ink">
                      {pct(
                        (() => {
                          const pd = steps.find((s) => s.key === "paid")?.count ?? 0;
                          const sh = steps.find((s) => s.key === "shared")?.count ?? 0;
                          return pd ? sh / pd : null;
                        })(),
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="dv-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Landing views per day · 30 days</p>
                <Sparkline values={visitSeries} label={`Landing views per day, last 30 days: ${visitSeries.join(", ")}`} className="mt-3" />
              </div>
            </div>
          </div>

          <SegmentTable
            title="By language"
            caption={`Funnel by locale, last ${days} days${country ? `, ${country}` : ""}`}
            keyLabel="Locale"
            rows={locales}
            upper
          />
          <SegmentTable
            title="By country"
            caption={`Funnel by country, last ${days} days${locale ? `, ${locale}` : ""}`}
            keyLabel="Country"
            rows={byCountry}
            note="The clinic's own country once it has one; before that the visitor's country from the edge's geo header (— when none is set)."
          />
        </section>

        {/* Sources */}
        <section aria-labelledby="sources-title" className="mt-14">
          <SectionTitle
            title="Sources"
            lead="utm_source / utm_medium / utm_campaign of the visit (else the referring site). A clinic's checkout and payment count for its first touch — the source its browser tab arrived with. Same range and filters as the funnel."
          />
          <SegmentTable title="" caption={`Funnel by source, last ${days} days`} keyLabel="Source" rows={sources} sources />
        </section>

        {/* Operations */}
        <section aria-labelledby="ops-title" className="mt-14">
          <SectionTitle title="Operations" lead="Latest weekly run per clinic, the worker's spend guard, and what broke." />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="dv-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Latest runs · {totals.clinics} clinics</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-dv-muted">Ready</dt>
                  <dd className="text-2xl font-semibold tabular-nums text-dv-teal">{totals.ready}</dd>
                </div>
                <div>
                  <dt className="text-dv-muted">Flagged</dt>
                  <dd className="text-2xl font-semibold tabular-nums text-[#9a5b00]">{totals.flagged}</dd>
                </div>
                <div>
                  <dt className="text-dv-muted">Failed</dt>
                  <dd className={`text-2xl font-semibold tabular-nums ${totals.failed ? "text-[#b42318]" : "text-dv-ink"}`}>{totals.failed}</dd>
                </div>
                <div>
                  <dt className="text-dv-muted">Making</dt>
                  <dd className="text-2xl font-semibold tabular-nums text-dv-ink">{totals.making}</dd>
                </div>
              </dl>
            </div>
            <div className="dv-card p-5">
              <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">
                Spend guard
                {spend.paused && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf1dc] px-2 py-0.5 text-[0.6875rem] text-[#7a4b00]">
                    <PauseCircle className="h-3 w-3" aria-hidden="true" /> paused
                  </span>
                )}
              </p>
              {spend.available ? (
                <div className="mt-3 grid gap-3 text-sm">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-dv-muted">Today</span>
                      <span className="tabular-nums text-dv-ink">
                        {usd(spend.spentTodayUsd ?? 0, 2)} <span className="text-dv-muted">/ {usd(spend.dailyCapUsd)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Meter value={spend.spentTodayUsd ?? 0} max={spend.dailyCapUsd} tone={dayTone} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-dv-muted">This month</span>
                      <span className="tabular-nums text-dv-ink">
                        {usd(spend.spentMonthUsd ?? 0, 2)} <span className="text-dv-muted">/ {usd(spend.monthlyCapUsd)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Meter value={spend.spentMonthUsd ?? 0} max={spend.monthlyCapUsd} tone={monthTone} />
                    </div>
                  </div>
                  <p className="text-xs text-dv-muted">Base caps; the worker raises them with the number of paying clinics.</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-dv-muted">Redis not reachable from the web app — spend counters unknown.</p>
              )}
            </div>
            <div className="dv-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Parked jobs</p>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${spend.parked.length ? "text-[#9a5b00]" : "text-dv-ink"}`}>{spend.available ? spend.parked.length : "—"}</p>
              {spend.parked.length > 0 ? (
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {spend.parked.slice(0, 4).map((p) => (
                    <li key={p.jobId} className="flex justify-between gap-2">
                      <span className="truncate text-dv-body">
                        {p.name} · {(p.clinicId && names.get(p.clinicId)) || "clinic"}
                      </span>
                      <span className="shrink-0 text-xs text-dv-muted">{p.reason.replace(/_/g, " ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-dv-muted">{spend.available ? "Nothing waiting on the spend guard." : "Unknown without Redis."}</p>
              )}
            </div>
          </div>

          <div className="dv-card mt-4 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Latest errors</p>
            {errors.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-dv-teal">
                <CircleCheck className="h-4 w-4" aria-hidden="true" /> No failed videos in the last 60 days.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-dv-line">
                {errors.map((e) => (
                  <li key={e.id} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                    <span className="text-xs text-dv-muted">
                      {when(e.at)}
                      <br className="hidden sm:block" />
                      <span className="sm:hidden"> · </span>
                      <Link href={clinicHref(e.clinicId)} className="font-medium text-dv-teal underline-offset-4 hover:underline">
                        {names.get(e.clinicId) ?? "clinic"}
                      </Link>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-dv-ink">{e.title || "(untitled)"}</span>
                      <code className="mt-0.5 block break-words font-mono text-xs text-[#8a1f1f]">{e.error}</code>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Clinics */}
        <section aria-labelledby="clinics-title" className="mt-14">
          <SectionTitle title="Recent clinics" lead={`The newest ${recent.length} of ${data.clinics.length}.`} />
          <ul className="mt-5 grid gap-3 md:hidden">
            {recent.map((c) => (
              <li key={c.id} className="dv-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-dv-ink">{c.profile?.name || "(no name)"}</p>
                    <p className="mt-0.5 text-xs text-dv-muted">
                      {c.profile?.country ?? "—"} · <span className="uppercase">{c.profile?.language ?? "—"}</span> · {day(c.created_at)}
                    </p>
                  </div>
                  <PlanBadge plan={c.plan} tier={c.plan_tier} />
                </div>
                <div className="mt-2">
                  <EmailBadge verified={emailOk(c)} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <RunBadge run={runs.get(c.id)} />
                  <Link href={clinicHref(c.id)} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-dv-teal">
                    Library <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="dv-card mt-5 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Recent clinics</caption>
              <thead>
                <tr className="border-b border-dv-line text-xs uppercase tracking-[0.06em] text-dv-muted [&>th]:whitespace-nowrap">
                  <th scope="col" className="px-4 py-3 font-semibold">Clinic</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Country</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Language</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Plan</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Created</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Last week</th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Library</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id} className="border-b border-dv-line last:border-0">
                    <th scope="row" className="max-w-[16rem] truncate px-4 py-3 font-semibold text-dv-ink">{c.profile?.name || "(no name)"}</th>
                    <td className="px-3 py-3 text-dv-body">{c.profile?.country ?? "—"}</td>
                    <td className="px-3 py-3 uppercase text-dv-body">{c.profile?.language ?? "—"}</td>
                    <td className="px-3 py-3">
                      <PlanBadge plan={c.plan} tier={c.plan_tier} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <EmailBadge verified={emailOk(c)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-dv-body">{day(c.created_at)}</td>
                    <td className="px-3 py-3">
                      <RunBadge run={runs.get(c.id)} />
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Link href={clinicHref(c.id)} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-dv-teal underline-offset-4 hover:underline">
                        Library <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

/** One row per segment (locale, country or source): the key steps and the conversions that matter. */
function SegmentTable({
  title,
  caption,
  keyLabel,
  rows,
  note,
  upper = false,
  sources = false,
}: {
  title: string;
  caption: string;
  keyLabel: string;
  rows: SegmentRow[];
  note?: string;
  upper?: boolean;
  /** The Sources table: "Preview done" and checkouts matter more than the landing teaser. */
  sources?: boolean;
}) {
  const cols: { label: string; value: (r: SegmentRow) => React.ReactNode; strong?: boolean }[] = [
    { label: "Visitors", value: (r) => int(r.visits) },
    { label: "CTA clicks", value: (r) => int(r.cta) },
    ...(sources ? [] : [{ label: "Tried", value: (r: SegmentRow) => int(r.teaser) }]),
    { label: "Sign-ups", value: (r) => int(r.signups) },
    { label: "Preview done", value: (r) => int(r.previewDone) },
    { label: "Checkouts", value: (r) => int(r.checkouts) },
    { label: "Paid", value: (r) => int(r.paid), strong: true },
    { label: "Visit → sign-up", value: (r) => pct(r.visitToSignup) },
    { label: "Visit → paid", value: (r) => pct(r.visitToPaid) },
    { label: "Sign-up → paid", value: (r) => pct(r.signupToPaid) },
  ];
  return (
    <div className="mt-4">
      {title && <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">{title}</h3>}
      <div className="dv-card mt-2 overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm" data-segment={keyLabel.toLowerCase()}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-dv-line text-xs uppercase tracking-[0.06em] text-dv-muted [&>th]:whitespace-nowrap">
              <th scope="col" className="px-4 py-3 font-semibold">{keyLabel}</th>
              {cols.map((c) => (
                <th key={c.label} scope="col" className="px-3 py-3 text-end font-semibold">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-6 text-center text-dv-muted">
                  No events in this range.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-dv-line last:border-0">
                <th scope="row" className={`max-w-[16rem] truncate px-4 py-2.5 font-semibold text-dv-ink ${upper ? "uppercase" : ""}`} title={r.key}>
                  {r.key}
                </th>
                {cols.map((c) => (
                  <td key={c.label} className={`px-3 py-2.5 text-end ${c.strong ? "font-semibold text-dv-ink" : ""}`}>{c.value(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-2 text-xs text-dv-muted">{note}</p>}
    </div>
  );
}

function TierBar({ starter, practice, group, unknown }: { starter: number; practice: number; group: number; unknown: number }) {
  const total = starter + practice + group + unknown;
  if (!total) return <div className="h-2 rounded-full bg-dv-sand" />;
  const seg = [
    { n: starter, c: "#8fd1c6" },
    { n: practice, c: "#0f5c5c" },
    { n: group, c: "#082e2d" },
    { n: unknown, c: "#d9d1c3" },
  ];
  return (
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="presentation">
      {seg.filter((s) => s.n).map((s, i) => (
        <span key={i} style={{ flexGrow: s.n, background: s.c }} />
      ))}
    </div>
  );
}

/* ----------------------------------------------------- read-only library */

export type AdminLibraryItem = {
  id: string;
  title: string;
  kind: string;
  status: string;
  approval: string;
  week_of: string;
  thumbUrl?: string;
  videoUrl?: string;
  findings?: unknown[];
};

const STATUS_TONE: Record<string, string> = {
  ready: "text-dv-teal",
  flagged: "text-[#9a5b00]",
  rejected: "text-[#9a5b00]",
  failed: "text-[#b42318]",
  queued: "text-dv-muted",
  working: "text-dv-muted",
};

/** One clinic's library, read-only: what the dentist sees, without any buttons that change it. */
export function AdminClinicView({
  clinic,
  items,
  backHref,
}: {
  clinic: { id: string; created_at: string; plan: string; plan_tier?: string | null; profile?: { name?: string; country?: string; language?: string; city?: string } | null };
  items: AdminLibraryItem[];
  backHref: string;
}) {
  const weeks = [...new Set(items.map((i) => i.week_of))].sort().reverse();
  return (
    <main lang="en" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-x-0 top-0 -z-10 h-[24rem]" />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <Link href={backHref} className="text-sm font-medium text-dv-teal underline-offset-4 hover:underline">
          ← Owner dashboard
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-dv-teal">Clinic library · read-only</p>
            <h1 className="dv-display mt-2 truncate text-[2.25rem] leading-[1.05] text-dv-ink sm:text-[3rem]">{clinic.profile?.name || "(no name)"}</h1>
            <p className="mt-2 text-sm text-dv-muted">
              {[clinic.profile?.city, clinic.profile?.country].filter(Boolean).join(", ") || "—"} · <span className="uppercase">{clinic.profile?.language ?? "—"}</span> · since {day(clinic.created_at)}
            </p>
          </div>
          <PlanBadge plan={clinic.plan} tier={clinic.plan_tier} />
        </div>

        {items.length === 0 && <p className="dv-card mt-8 p-6 text-center text-dv-muted">No videos made for this clinic yet.</p>}

        {weeks.map((w) => {
          const list = items.filter((i) => i.week_of === w);
          return (
            <section key={w} className="mt-10" aria-label={`Week of ${w}`}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Week of {day(w)}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((i) => (
                  <li key={i.id} className="dv-card flex gap-4 p-3">
                    <div className="relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-xl bg-dv-sand">
                      {i.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed URL
                        <img src={i.thumbUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-dv-ink">{i.title}</p>
                      <p className="mt-1 text-xs text-dv-muted">{i.kind === "recording" ? "Recording" : "Generated"}</p>
                      <p className="mt-auto flex flex-wrap gap-x-3 pt-2 text-xs font-medium">
                        <span className={STATUS_TONE[i.status] ?? "text-dv-body"}>{i.status}</span>
                        <span className={i.approval === "approved" ? "text-dv-teal" : i.approval === "rejected" ? "text-[#8a1f1f]" : "text-dv-muted"}>
                          {i.approval === "pending" ? "awaiting decision" : i.approval}
                        </span>
                        {i.findings && i.findings.length > 0 && <span className="text-[#9a5b00]">{i.findings.length} finding{i.findings.length > 1 ? "s" : ""}</span>}
                      </p>
                      {i.videoUrl && (
                        <a href={i.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 text-xs font-medium text-dv-teal underline-offset-4 hover:underline">
                          Open video
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
