import Link from "next/link";
import { ArrowRight, CircleCheck, ExternalLink } from "lucide-react";
import { billingHints, withLedgerHints, foundingHistoric, FOUNDING_SOURCE_LABEL, lastRuns, revenue, runState, type AdminClinic, type ClinicRun } from "@/lib/dentvid/admin-metrics";
import { RANGE_PRESETS, filterClinics, filterVideos, isProblemVideo, qs, type ClinicFilter, type DateRange, type ClinicRowView, type VideoFilter } from "@/lib/dentvid/admin-filters";
import { billingIssues, foundingFromLedger, openProblems, periodStats, LIVE_SUB, type EmailLogRow, type EmailSendRow, type PaymentRow, type SubRow, type BillingIssue } from "@/lib/dentvid/admin-ops";
import { RETRYABLE_QUEUES, monitorIncidents, type MonitorView, type QueueStats } from "@/lib/dentvid/admin-system";
import type { OverviewData, SystemData } from "@/lib/dentvid/admin-loaders";
import type { AdminData, SpendState } from "@/lib/dentvid/admin-server";
import { FunnelAndSources, type FunnelQuery } from "./admin-dashboard";
import type { SystemSnapshot } from "@/lib/dentvid/admin-system-server";
import { ActionForm, AdminShell, AllClear, Badge, Chip, Empty, FilterForm, PlanBadge, Section, Select, Stat, StatusBadge, Table, TextInput, Warn, ago, day, int, usd, when, type AdminLinks, type Viewer } from "./admin-ui";

/** The Dodo dashboard (billing changes happen there, never in this panel). */
export const dodoDashboard = (env: Record<string, string | undefined> = process.env) =>
  (env.DODO_DASHBOARD_URL || "https://app.dodopayments.com").replace(/\/+$/, "");

type Common = { links: AdminLinks; viewer: Viewer; flash?: string | null; back: string };

const LANGS = ["en", "de", "es", "fr", "it", "pt", "tr", "pl", "ja", "ar"].map((l) => [l, l.toUpperCase()] as [string, string]);

function countries(clinics: Pick<AdminClinic, "profile">[]): [string, string][] {
  return [...new Set(clinics.map((c) => c.profile?.country).filter((x): x is string => !!x))].sort().map((c) => [c, c]);
}

function RunCell({ run }: { run: ClinicRun | undefined }) {
  const s = runState(run);
  if (s === "none" || !run) return <span className="text-dv-muted">—</span>;
  const tone = s === "ready" ? "teal" : s === "making" ? "grey" : s === "failed" ? "red" : "amber";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={tone}>{s}</Badge>
      <span className="text-xs tabular-nums text-dv-muted">
        {day(run.weekOf)} · {run.ready}/{run.total} ready{run.flagged ? ` · ${run.flagged} flagged` : ""}
        {run.failed ? ` · ${run.failed} failed` : ""}
      </span>
    </span>
  );
}

/* =============================================================== Overview */

export function AdminOverview({ data, ...c }: Common & { data: OverviewData }) {
  const now = new Date(data.now);
  const hints = data.subsTable ? withLedgerHints(billingHints(data.events), data.subs) : billingHints(data.events);
  const rev = revenue(data.clinics, hints);
  const founding = foundingHistoric({
    ledgerUsed: data.subsTable && data.subs.length ? foundingFromLedger(data.subs).used : null,
    dodoUses: data.dodoFoundingUses,
    fromEvents: rev.founding,
  });
  const periods = ([1, 7, 30] as const).map((d) => ({ d, s: periodStats(data.events, data.clinics, d, now) }));
  const problems = openProblems({
    items: data.items,
    system: data.system,
    emailFailures: data.emailFailures,
    billing: billingIssues(data.subs, data.clinics),
    parked: data.spend.parked.length,
    now,
  });
  const rows: { label: string; key: "visitors" | "signups" | "previews" | "checkouts" | "paid" }[] = [
    { label: "Visitors", key: "visitors" },
    { label: "Sign-ups", key: "signups" },
    { label: "Previews", key: "previews" },
    { label: "Checkouts", key: "checkouts" },
    { label: "Payments", key: "paid" },
  ];
  return (
    <AdminShell active="overview" title="Overview" lead="Is DentVideo working, and what needs fixing?" now={data.now} warnings={data.warnings} {...c}>
      <Section title="Open problems" id="problems" lead="Each one links to the screen that fixes it.">
        {problems.length === 0 ? (
          <AllClear>Nothing needs you right now.</AllClear>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="problems">
            {problems.map((p) => (
              <li key={p.key}>
                <Link
                  href={c.links.section(p.section, p.query)}
                  className={`dv-card flex items-center justify-between gap-3 p-3.5 text-sm transition hover:ring-1 hover:ring-dv-edge ${p.tone === "red" ? "border-s-4 border-[#b42318]" : "border-s-4 border-[#d9a23b]"}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-dv-ink">{p.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`text-lg font-semibold tabular-nums ${p.tone === "red" ? "text-[#b42318]" : "text-[#9a5b00]"}`}>{int(p.count)}</span>
                    <ArrowRight className="h-4 w-4 text-dv-muted" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Business" id="business">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="MRR" value={usd(rev.mrrUsd)} sub={`${rev.paying} paying${rev.founding ? ` · ${rev.founding} founding` : ""}${rev.yearly ? ` · ${rev.yearly} yearly` : ""}`} tone="teal" />
          <Stat
            label="Paying clinics"
            value={int(rev.paying)}
            sub={`Starter ${rev.payingByTier.starter} · Practice ${rev.payingByTier.practice} · Group ${rev.payingByTier.group}${rev.payingByTier.unknown ? ` · ${rev.payingByTier.unknown} unknown tier (not in MRR)` : ""}`}
            tone={rev.payingByTier.unknown ? "amber" : undefined}
          />
          <Stat label="Founding (offer closed)" value={int(founding.count)} sub={`Historic subscriptions, ${FOUNDING_SOURCE_LABEL[founding.source]}. Nothing new is sold at founding.`} />
          <Stat
            label="API spend (OpenAI)"
            value={usd(data.cost.today, 2)}
            sub={
              <>
                today · 7 d {usd(data.cost.d7, 2)} · 30 d {usd(data.cost.d30, 2)}
                {!data.cost.tracked && <span className="block text-dv-muted">History starts once the worker writes its daily record.</span>}
              </>
            }
            tone={data.spend.spentTodayUsd !== null && data.spend.spentTodayUsd >= data.spend.dailyCapUsd * 0.8 ? "amber" : undefined}
          />
        </div>
        <p className="mt-2 text-xs text-dv-muted">Spend is the spend guard's budget per operation (worker), the same numbers its caps use — an upper estimate of the OpenAI bill.</p>
      </Section>

      <Section title="Traffic and conversion" id="traffic" lead="Visitors once per browser tab; later steps as distinct clinics.">
        <Table caption="Funnel counts today, 7 and 30 days" head={["", "Today", "7 days", "30 days"]} minWidth="20rem">
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="font-medium text-dv-ink">
                {r.label}
              </th>
              {periods.map((p) => (
                <td key={p.d} className="tabular-nums">
                  {int(p.s[r.key])}
                </td>
              ))}
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-xs">
          <Link href={c.links.section("funnel")} className="font-medium text-dv-teal underline-offset-4 hover:underline">
            Full funnel, by language, country and source →
          </Link>
        </p>
      </Section>

      <Section title="System" id="system">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Worker" value={data.system.health} tone={data.system.health === "up" ? "teal" : data.system.health === "unknown" ? undefined : "red"} sub={data.system.heartbeats[0] ? `last beat ${ago(data.system.heartbeats[0].at, now)}` : "no heartbeat yet"} />
          <Stat label="Render queue" value={int(data.system.queues.find((q) => q.name === "dentvid")?.queued ?? 0)} sub={`${data.system.queues.find((q) => q.name === "dentvid")?.active ?? 0} running`} />
          <Stat label="Next batch" value={day(data.system.nextBatch.at)} sub={`${when(data.system.nextBatch.at)} UTC · week of ${day(data.system.nextBatch.week)}`} />
          <Stat label="Last batch" value={data.system.lastBatch.marker ? int(data.system.lastBatch.marker.jobs) : "—"} sub={data.system.lastBatch.marker ? `jobs queued ${when(data.system.lastBatch.marker.at)}` : "no dispatch marker found"} />
        </div>
      </Section>
    </AdminShell>
  );
}

/* ================================================================ Clinics */

export function AdminClinics({ now, rows, filter, warnings, ...c }: Common & { now: string; rows: ClinicRowView[]; filter: ClinicFilter; warnings: string[] }) {
  const list = filterClinics(rows, filter, new Date(now));
  const shown = list.slice(0, 300);
  const sources = [...new Set(rows.map((r) => r.source ?? "(direct / none)"))].sort().slice(0, 60);
  return (
    <AdminShell active="clinics" title="Clinics" lead={`${list.length} of ${rows.length} clinics`} now={now} warnings={warnings} {...c}>
      <FilterForm links={c.links} section="clinics" reset={c.links.section("clinics")}>
        <TextInput name="q" label="Search" value={filter.q} placeholder="Name, id or subscription" />
        <Select
          name="plan"
          label="Plan"
          value={filter.plan}
          options={[
            ["active", "Paying"],
            ["trial", "Unpaid"],
            ["paused", "Paused (billing)"],
            ["cancelled", "Cancelled"],
            ["admin_paused", "Paused by owner"],
          ]}
        />
        <Select name="language" label="Language" value={filter.language} options={LANGS} />
        <Select name="country" label="Country" value={filter.country} options={countries(rows)} />
        <Select
          name="created"
          label="Created"
          value={filter.createdDays ? String(filter.createdDays) : null}
          options={[
            ["1", "Today"],
            ["7", "7 days"],
            ["30", "30 days"],
            ["90", "90 days"],
            ["365", "A year"],
          ]}
        />
        <Select name="source" label="Source" value={filter.source} options={sources.map((s) => [s, s])} />
        <Select
          name="sort"
          label="Sort"
          value={filter.sort === "created" ? null : filter.sort}
          options={[
            ["activity", "Last activity"],
            ["name", "Name"],
          ]}
        />
      </FilterForm>
      <div className="mt-4">
        {shown.length === 0 ? (
          <Empty>No clinic matches.</Empty>
        ) : (
          <Table caption="Clinics" head={["Clinic", "Plan", "Language", "Country", "Created", "Last activity", "This week", "Source"]} minWidth="60rem">
            {shown.map((r) => (
              <tr key={r.id}>
                <th scope="row" className="max-w-[15rem]">
                  <Link href={c.links.clinic(r.id)} className="block truncate font-semibold text-dv-ink underline-offset-4 hover:text-dv-teal hover:underline">
                    {r.profile?.name || "(no name)"}
                  </Link>
                </th>
                <td>
                  <PlanBadge plan={r.plan} tier={r.plan_tier} adminPaused={!!r.admin_paused_at} />
                </td>
                <td className="uppercase">{r.profile?.language ?? "—"}</td>
                <td>{r.profile?.country ?? "—"}</td>
                <td className="whitespace-nowrap tabular-nums">{day(r.created_at)}</td>
                <td className="whitespace-nowrap text-dv-body">{ago(r.lastActivity, new Date(now))}</td>
                <td>
                  <RunCell run={r.run} />
                </td>
                <td className="max-w-[12rem] truncate text-xs text-dv-muted" title={r.source ?? ""}>
                  {r.source ?? "direct"}
                </td>
              </tr>
            ))}
          </Table>
        )}
        {list.length > shown.length && <p className="mt-2 text-xs text-dv-muted">Showing the first {shown.length}; narrow the filters to see the rest.</p>}
      </div>
    </AdminShell>
  );
}

/* ================================================================= Videos */

export type VideoListItem = {
  id: string;
  clinic_id: string;
  kind: string;
  week_of: string;
  status: string;
  approval: string;
  title?: string | null;
  error?: string | null;
  findings?: unknown;
  video_path?: string | null;
  updated_at: string;
  videoUrl?: string;
  thumbUrl?: string;
};

export function AdminVideos({
  now,
  items,
  clinics,
  filter,
  total,
  warnings,
  ttlSec,
  ...c
}: Common & { now: string; items: VideoListItem[]; clinics: AdminClinic[]; filter: VideoFilter; total: number; warnings: string[]; ttlSec: number }) {
  const byId = new Map(clinics.map((x) => [x.id, x]));
  const weeks = [...new Set(items.map((i) => i.week_of))];
  return (
    <AdminShell active="videos" title="Videos" lead={`${total} matching · problems and flagged first · players valid ${Math.round(ttlSec / 60)} min`} now={now} warnings={warnings} {...c}>
      <FilterForm links={c.links} section="videos" reset={c.links.section("videos")}>
        <Select
          name="status"
          label="Status"
          value={filter.status}
          options={[
            ["problem", "Needs a fix"],
            ["flagged", "Flagged"],
            ["failed", "Failed"],
            ["rejected", "Rejected"],
            ["ready", "Ready"],
            ["working", "Working"],
            ["queued", "Queued"],
          ]}
        />
        <Select name="language" label="Language" value={filter.language} options={LANGS} />
        <Select name="country" label="Country" value={filter.country} options={countries(clinics)} />
        <TextInput name="week" label="Week (Monday)" value={filter.week} type="date" />
        <Select
          name="kind"
          label="Kind"
          value={filter.kind}
          options={[
            ["generated", "Generated"],
            ["recording", "Recording"],
          ]}
        />
      </FilterForm>
      {items.length === 0 ? (
        <div className="mt-4">
          <Empty>No videos match.</Empty>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-weeks={weeks.length}>
          {items.map((i) => {
            const clinic = byId.get(i.clinic_id);
            const problem = isProblemVideo(i);
            return (
              <li key={i.id} className={`dv-card flex min-w-0 flex-col overflow-hidden ${problem ? "ring-2 ring-[#f2cccc]" : ""}`}>
                <div className="relative aspect-[9/16] w-full bg-dv-sand">
                  {i.videoUrl ? (
                    <video controls preload="none" playsInline poster={i.thumbUrl} src={i.videoUrl} className="absolute inset-0 h-full w-full object-cover" aria-label={i.title ?? "video"} />
                  ) : i.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img src={i.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-dv-muted">no file</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-dv-ink">{i.title || "(untitled)"}</p>
                  <Link href={c.links.clinic(i.clinic_id)} className="truncate text-[0.6875rem] text-dv-teal underline-offset-2 hover:underline">
                    {clinic?.profile?.name || "clinic"} · {clinic?.profile?.country ?? "—"} · {(clinic?.profile?.language ?? "—").toUpperCase()}
                  </Link>
                  <span className="flex flex-wrap gap-1">
                    <StatusBadge status={i.status} problem={problem} />
                    {i.approval !== "pending" && <Badge tone={i.approval === "approved" ? "teal" : "red"}>{i.approval}</Badge>}
                  </span>
                  <span className="text-[0.6875rem] text-dv-muted">
                    {i.kind} · week {day(i.week_of)}
                  </span>
                  {i.error && <code className="line-clamp-3 break-words font-mono text-[0.625rem] text-[#8a1f1f]">{i.error}</code>}
                  {problem && (
                    <div className="mt-auto pt-1">
                      <ActionForm
                        viewer={c.viewer}
                        action="retry_video"
                        fields={{ itemId: i.id }}
                        back={c.back}
                        label="Retry"
                        explain="Re-render this video from its stored script (or reprocess the recording). Uses API budget; the spend guard still applies."
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {total > items.length && <p className="mt-3 text-xs text-dv-muted">Showing {items.length} of {total}; narrow the filters to see the rest.</p>}
    </AdminShell>
  );
}

/** Videos filtered and capped for the page (signing happens on what is shown only). */
export function videoPage<T extends VideoListItem>(items: T[], filter: VideoFilter, clinics: AdminClinic[], limit = 60): { page: T[]; total: number } {
  const byId = new Map(clinics.map((x) => [x.id, x]));
  const all = filterVideos(items, filter, (id) => byId.get(id));
  return { page: all.slice(0, limit), total: all.length };
}

/* ================================================================= System */

function QueueRow({ q }: { q: QueueStats }) {
  return (
    <tr>
      <th scope="row" className="whitespace-nowrap font-medium text-dv-ink">
        {q.name} {q.paused && <Badge tone="amber">paused</Badge>}
      </th>
      <td className="tabular-nums">{int(q.queued)}</td>
      <td className="tabular-nums">{int(q.active)}</td>
      <td className="tabular-nums">{int(q.delayed)}</td>
      <td className={`tabular-nums ${q.failed ? "font-semibold text-[#b42318]" : ""}`}>{int(q.failed)}</td>
      <td className="tabular-nums text-dv-muted">{int(q.completed)}</td>
    </tr>
  );
}

export function AdminSystem({ data, ...c }: Common & { data: SystemData }) {
  const now = new Date(data.now);
  const s: SystemSnapshot = data.system;
  const names = new Map(data.clinics.map((x) => [x.id, x.profile?.name || "(no name)"]));
  const runs = lastRuns(data.batchItems);
  const totals = { clinics: runs.size, ready: 0, flagged: 0, failed: 0, making: 0 };
  for (const r of runs.values()) {
    totals.ready += r.ready;
    totals.flagged += r.flagged;
    totals.failed += r.failed;
    totals.making += r.making;
  }
  const spend: SpendState = data.spend;
  return (
    <AdminShell
      active="system"
      title="Queue & system"
      lead="BullMQ queues, worker heartbeats, the weekly batch and the owner alerts — read from Redis on each load."
      now={data.now}
      warnings={s.available ? [] : [s.error ?? "Redis not reachable."]}
      {...c}
    >
      {s.available && <LiveChecks m={s.monitor} now={now} />}

      <Section title="Worker" id="worker" lead="Each process writes a heartbeat every minute; older than 3 minutes is shown as down.">
        {s.heartbeats.length === 0 ? (
          <Warn>No heartbeat found. A worker older than this panel does not write one yet — deploy the worker.</Warn>
        ) : (
          <Table caption="Worker heartbeats" head={["Process", "State", "Last beat", "Version", "Up", "Roles", "Renders"]} minWidth="44rem">
            {s.heartbeats.map((h) => (
              <tr key={h.field} data-stale={h.stale ? "1" : "0"}>
                <th scope="row" className="whitespace-nowrap font-medium text-dv-ink">
                  {h.host}
                  {h.pid ? <span className="text-dv-muted"> · {h.pid}</span> : null}
                </th>
                <td>{h.stale ? <Badge tone="red">down</Badge> : <Badge tone="teal">up</Badge>}</td>
                <td className={`whitespace-nowrap ${h.stale ? "font-semibold text-[#b42318]" : "text-dv-body"}`}>{ago(h.at, now)}</td>
                <td className="font-mono text-xs">{h.version.slice(0, 10)}</td>
                <td className="whitespace-nowrap text-xs">{h.uptimeSec !== null ? `${Math.floor(h.uptimeSec / 3600)} h ${Math.floor((h.uptimeSec % 3600) / 60)} min` : "—"}</td>
                <td className="text-xs text-dv-body">{h.roles.join(", ") || "—"}</td>
                <td className="tabular-nums">{h.renderConcurrency ?? "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Queues" id="queues">
        {s.queues.length === 0 ? (
          <Empty>Queue counts unavailable.</Empty>
        ) : (
          <Table caption="Queue depths" head={["Queue", "Waiting", "Running", "Delayed", "Failed", "Done (kept)"]} minWidth="34rem">
            {s.queues.map((q) => (
              <QueueRow key={q.name} q={q} />
            ))}
          </Table>
        )}
      </Section>

      <Section title="Stuck jobs" id="stuck" lead="Running for more than 90 minutes — usually a process killed mid-render; BullMQ re-runs a stalled job by itself.">
        {s.stuck.length === 0 ? (
          <AllClear>No stuck jobs.</AllClear>
        ) : (
          <Table caption="Stuck jobs" head={["Job", "Queue", "Clinic", "Started"]}>
            {s.stuck.map((j) => (
              <tr key={`${j.queue}/${j.id}`}>
                <th scope="row" className="font-mono text-xs">
                  {j.id}
                </th>
                <td>{j.queue}</td>
                <td>{j.clinicId ? <Link href={c.links.clinic(j.clinicId)} className="text-dv-teal hover:underline">{names.get(j.clinicId) ?? "clinic"}</Link> : "—"}</td>
                <td className="whitespace-nowrap text-[#b42318]">{ago(j.processedAt, now)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Failed jobs" id="failed" lead="Newest first. Retry puts the job back on its queue with its own options (DentVideo queues only).">
        {s.failed.length === 0 ? (
          <AllClear>No failed jobs kept on any queue.</AllClear>
        ) : (
          <ul className="grid gap-2">
            {s.failed.slice(0, 40).map((j) => (
              <li key={`${j.queue}/${j.id}`} className="dv-card grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Badge tone="red">{j.queue}</Badge>
                    <span className="font-medium text-dv-ink">{j.name}</span>
                    {j.clinicId && (
                      <Link href={c.links.clinic(j.clinicId)} className="text-dv-teal hover:underline">
                        {names.get(j.clinicId) ?? "clinic"}
                      </Link>
                    )}
                    <span className="text-xs text-dv-muted">
                      {when(j.finishedAt)} · attempt {j.attemptsMade}
                      {j.maxAttempts ? `/${j.maxAttempts}` : ""}
                    </span>
                  </p>
                  <p className="mt-1 break-all font-mono text-[0.6875rem] text-dv-muted">{j.id}</p>
                  {j.failedReason && <code className="mt-1 block break-words font-mono text-xs text-[#8a1f1f]">{j.failedReason}</code>}
                </div>
                {RETRYABLE_QUEUES.includes(j.queue as (typeof RETRYABLE_QUEUES)[number]) && (
                  <ActionForm
                    viewer={c.viewer}
                    action="retry_job"
                    fields={{ queue: j.queue, jobId: j.id }}
                    back={c.back}
                    label="Retry job"
                    explain="Puts this failed job back on its queue now. A week or recording uses API budget; the spend guard still applies."
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Weekly batch" id="batch" lead="Dispatched every Saturday 18:00 UTC for the Monday after, earliest time zone first.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Next batch" value={day(s.nextBatch.at)} sub={`${when(s.nextBatch.at)} UTC · week of ${day(s.nextBatch.week)}`} />
          <Stat
            label="Last dispatch"
            value={s.lastBatch.marker ? `${s.lastBatch.marker.jobs} jobs` : "—"}
            sub={s.lastBatch.marker ? `${when(s.lastBatch.marker.at)} · ${s.lastBatch.marker.waves} waves` : `none recorded for week of ${day(s.lastBatch.week)}`}
            tone={s.available && !s.lastBatch.marker ? "amber" : undefined}
          />
          <Stat label={`Week of ${day(s.lastBatch.week)}`} value={`${totals.ready} ready`} sub={`${totals.clinics} clinics · ${totals.flagged} flagged · ${totals.failed} failed · ${totals.making} making`} tone={totals.failed ? "red" : "teal"} />
          <Stat
            label="Projected late"
            value={s.lastBatch.marker ? int(s.lastBatch.marker.projectedLate) : "—"}
            sub="Clinics the batch was expected to miss Monday 07:00 for"
            tone={s.lastBatch.marker?.projectedLate ? "amber" : undefined}
          />
        </div>
      </Section>

      <Section title="Spend guard" id="spend">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Today" value={usd(spend.spentTodayUsd ?? 0, 2)} sub={`base cap ${usd(spend.dailyCapUsd)}`} />
          <Stat label="This month" value={usd(spend.spentMonthUsd ?? 0, 2)} sub={`base cap ${usd(spend.monthlyCapUsd)}`} />
          <Stat label="Generation" value={spend.paused ? "paused" : "on"} tone={spend.paused ? "amber" : "teal"} sub="DENTVID_PAUSE_GENERATION" />
          <Stat label="Parked jobs" value={spend.available ? int(spend.parked.length) : "—"} tone={spend.parked.length ? "amber" : undefined} sub="resume by themselves when allowed" />
        </div>
      </Section>

      <Section title="Owner alerts" id="alerts" lead="Everything the watchdogs and jobs raised in the last 3 days (the same alerts that are emailed).">
        {s.alerts.length === 0 ? (
          <AllClear>No alerts.</AllClear>
        ) : (
          <Table caption="Owner alerts" head={["When", "Severity", "Alert", "Clinic"]} minWidth="36rem">
            {s.alerts.slice(0, 60).map((a, i) => (
              <tr key={`${a.at}-${i}`}>
                <td className="whitespace-nowrap text-xs">{when(a.at)}</td>
                <td>
                  <Badge tone={alertTone(a.severity)}>{a.severity}</Badge>
                </td>
                <th scope="row" className="font-normal text-dv-ink">
                  {a.title}
                </th>
                <td className="text-xs text-dv-muted">{a.clinic ?? "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </AdminShell>
  );
}

/** Owner-alert severities (ops-alert.ts: urgent / warning / good; older entries: critical / high). */
export const alertTone = (severity: string): "red" | "amber" | "teal" | "grey" =>
  severity === "urgent" || severity === "critical" || severity === "high" ? "red" : severity === "warning" ? "amber" : severity === "good" ? "teal" : "grey";

const MONITOR_STATUS: Record<MonitorView["status"], { label: string; tone: "red" | "amber" | "teal" | undefined }> = {
  ok: { label: "all passing", tone: "teal" },
  failing: { label: "failing", tone: "red" },
  stale: { label: "not running", tone: "amber" },
  never: { label: "no runs yet", tone: undefined },
};

/**
 * The synthetic monitor (worker/src/dentvid/synthetic.ts): the last run's
 * checks, the last 24 hours as a strip (one mark per 15-minute run, oldest
 * left) and the failure periods of the last 3 days.
 */
function LiveChecks({ m, now }: { m: MonitorView; now: Date }) {
  const st = MONITOR_STATUS[m.status];
  const strip = m.history.slice(0, 96).reverse();
  const incidents = monitorIncidents(m.history).slice(0, 20);
  const labels = new Map((m.last?.results ?? []).map((r) => [r.name, r.label]));
  return (
    <Section
      title="Live checks"
      id="monitor"
      lead="Every 15 minutes the worker loads the key pages, signs up a throwaway account (deleted again), and checks Liman and the Dodo checkout link — as a clinic would. Two failures in a row email you; so does the recovery."
    >
      {m.status === "never" ? (
        <Warn>No monitor run recorded yet. It runs on a worker with the crons role once this version is deployed (turn off with DENTVIDEO_MONITOR=off).</Warn>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Now" value={st.label} tone={st.tone} sub={m.last ? `${m.last.results.filter((r) => !r.ok && !r.skipped).length} failing of ${m.last.results.filter((r) => !r.skipped).length} run` : undefined} />
            <Stat label="Last run" value={m.last ? ago(m.last.at, now) : "—"} sub={m.last ? `${when(m.last.at)} · ${(m.last.ms / 1000).toFixed(1)} s` : undefined} tone={m.status === "stale" ? "amber" : undefined} />
            <Stat label="Passing, 24 h" value={m.uptime24h === null ? "—" : `${m.uptime24h}%`} sub={`${m.runs24h} runs`} tone={m.uptime24h !== null && m.uptime24h < 99 ? "amber" : undefined} />
            <Stat label="Incidents, 3 days" value={int(incidents.length)} sub={incidents.some((i) => i.ongoing) ? "one is ongoing" : "none ongoing"} tone={incidents.some((i) => i.ongoing) ? "red" : undefined} />
          </div>
          {strip.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs text-dv-muted">Last 24 hours, oldest left — each mark is one run</p>
              <ol className="flex h-6 items-stretch gap-px" aria-label="Monitor runs, last 24 hours">
                {strip.map((h) => (
                  <li
                    key={h.at}
                    title={`${when(h.at)} — ${h.ok ? "all passing" : `failed: ${h.failed.map((f) => labels.get(f) ?? f).join(", ")}`}`}
                    className={`min-w-[2px] flex-1 rounded-[1px] ${h.ok ? "bg-dv-teal/70" : "bg-[#b42318]"}`}
                  >
                    <span className="sr-only">{`${when(h.at)} ${h.ok ? "passing" : `failed: ${h.failed.join(", ")}`}`}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {m.last && (
            <div className="mt-4">
              <Table caption="Last monitor run" head={["Check", "Result", "Time", "Failing since", "Detail"]} minWidth="40rem">
                {m.last.results.map((r) => {
                  const since = m.state[r.name]?.since;
                  return (
                    <tr key={r.name} data-ok={r.ok ? "1" : "0"}>
                      <th scope="row" className="whitespace-nowrap font-medium text-dv-ink">
                        {r.label}
                      </th>
                      <td>{r.skipped ? <Badge tone="grey">skipped</Badge> : r.ok ? <Badge tone="teal">ok</Badge> : <Badge tone="red">failed</Badge>}</td>
                      <td className="whitespace-nowrap tabular-nums text-xs">{r.skipped ? "—" : `${r.ms} ms`}</td>
                      <td className="whitespace-nowrap text-xs">{!r.ok && since ? `${when(since)} (${ago(since, now)})` : "—"}</td>
                      <td className="break-words text-xs text-dv-body">{r.error ?? r.skipped ?? (r.status ? `HTTP ${r.status}` : "")}</td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          )}
          <div className="mt-4">
            {incidents.length === 0 ? (
              <AllClear>No failures in the last 3 days.</AllClear>
            ) : (
              <Table caption="Monitor incidents" head={["Check", "From", "To", "Runs"]} minWidth="30rem">
                {incidents.map((i) => (
                  <tr key={`${i.check}-${i.from}`}>
                    <th scope="row" className="font-medium text-dv-ink">
                      {labels.get(i.check) ?? i.check}
                    </th>
                    <td className="whitespace-nowrap text-xs">{when(i.from)}</td>
                    <td className="whitespace-nowrap text-xs">{i.ongoing ? <Badge tone="red">ongoing</Badge> : when(i.to)}</td>
                    <td className="tabular-nums">{i.runs}</td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </>
      )}
    </Section>
  );
}

/* ================================================================= Emails */

export type EmailRow = { at: string; clinicId: string | null; kind: string; language: string | null; status: string; error: string | null; source: "send" | "log" };

/** Both sources in one list, newest first: attempts (0010, with status) and the lifecycle claims (0005). */
export function emailRows(log: EmailLogRow[], sends: EmailSendRow[] | null, clinics: AdminClinic[]): EmailRow[] {
  const lang = new Map(clinics.map((c) => [c.id, c.profile?.language ?? null]));
  const out: EmailRow[] = (sends ?? []).map((s) => ({ at: s.created_at, clinicId: s.clinic_id, kind: s.kind, language: s.language ?? (s.clinic_id ? lang.get(s.clinic_id) ?? null : null), status: s.status, error: s.error, source: "send" }));
  // A lifecycle claim with an attempt row for the same clinic and kind is the same email: show it once.
  const seen = new Set((sends ?? []).map((s) => `${s.clinic_id}:${s.kind}`));
  for (const l of log) if (!seen.has(`${l.clinic_id}:${l.kind}`)) out.push({ at: l.sent_at, clinicId: l.clinic_id, kind: l.kind, language: lang.get(l.clinic_id) ?? null, status: "sent", error: null, source: "log" });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Kinds the owner may send again: the "videos ready" note (it reflects the current week; harmless twice). */
export const RESENDABLE = new Set(["ready_week", "ready_recording"]);

export function AdminEmails({
  now,
  log,
  sends,
  clinics,
  status,
  kind,
  warnings,
  ...c
}: Common & { now: string; log: EmailLogRow[]; sends: EmailSendRow[] | null; clinics: AdminClinic[]; status: string | null; kind: string | null; warnings: string[] }) {
  const names = new Map(clinics.map((x) => [x.id, x.profile?.name || "(no name)"]));
  const all = emailRows(log, sends, clinics);
  const list = all.filter((r) => (!status || r.status === status) && (!kind || r.kind === kind)).slice(0, 300);
  const kinds = [...new Set(all.map((r) => r.kind))].sort();
  const failed7 = all.filter((r) => r.status === "failed" && Date.parse(r.at) > Date.parse(now) - 7 * 86_400_000).length;
  return (
    <AdminShell active="emails" title="Emails" lead="Transactional and lifecycle email per clinic. Addresses and content are never stored." now={now} warnings={warnings} {...c}>
      {sends === null && <Warn>Delivery status and errors appear once supabase/liman/0010_dentvid_admin.sql is applied; until then only lifecycle emails (dentvid_email_log) are listed.</Warn>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Listed" value={int(all.length)} />
        <Stat label="Failed · 7 days" value={int(failed7)} tone={failed7 ? "red" : "teal"} />
        <Stat label="Kinds" value={int(kinds.length)} sub={kinds.join(", ") || "—"} />
      </div>
      <FilterForm links={c.links} section="emails" reset={c.links.section("emails")}>
        <Select
          name="status"
          label="Status"
          value={status}
          options={[
            ["failed", "Failed"],
            ["sent", "Sent"],
          ]}
        />
        <Select name="kind" label="Type" value={kind} options={kinds.map((k) => [k, k.replace(/_/g, " ")])} />
      </FilterForm>
      <div className="mt-4">
        {list.length === 0 ? (
          <Empty>No emails match.</Empty>
        ) : (
          <Table caption="Emails" head={["When", "Clinic", "Type", "Lang", "Status", "Error", ""]} minWidth="52rem">
            {list.map((r, i) => (
              <tr key={`${r.at}-${i}`}>
                <td className="whitespace-nowrap text-xs">{when(r.at)}</td>
                <th scope="row" className="max-w-[12rem] truncate font-medium">
                  {r.clinicId ? (
                    <Link href={c.links.clinic(r.clinicId)} className="text-dv-ink hover:text-dv-teal hover:underline">
                      {names.get(r.clinicId) ?? "clinic"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </th>
                <td className="whitespace-nowrap text-xs">{r.kind.replace(/_/g, " ")}</td>
                <td className="uppercase text-xs">{r.language ?? "—"}</td>
                <td>{r.status === "failed" ? <Badge tone="red">failed</Badge> : <Badge tone="teal">sent</Badge>}</td>
                <td className="max-w-[16rem] break-words font-mono text-[0.6875rem] text-[#8a1f1f]">{r.error ?? ""}</td>
                <td>
                  {r.clinicId && RESENDABLE.has(r.kind) ? (
                    <ActionForm
                      viewer={c.viewer}
                      action="resend_ready"
                      fields={{ clinicId: r.clinicId }}
                      back={c.back}
                      label="Resend"
                      explain="Sends the clinic's owner the &quot;your videos are ready&quot; email again, for their latest week."
                    />
                  ) : (
                    <span className="text-xs text-dv-muted" title="Welcome, reminders and payment notes are sent once on purpose">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </AdminShell>
  );
}

/* ================================================================ Billing */

export function AdminBilling({
  now,
  subs,
  payments,
  clinics,
  issues,
  dodoFoundingUses,
  alerts,
  warnings,
  ...c
}: Common & {
  now: string;
  subs: SubRow[] | null;
  payments: PaymentRow[] | null;
  clinics: AdminClinic[];
  issues: BillingIssue[];
  dodoFoundingUses: number | null;
  alerts: SystemSnapshot["alerts"];
  warnings: string[];
}) {
  const names = new Map(clinics.map((x) => [x.id, x.profile?.name || "(no name)"]));
  const ledger = subs ? foundingFromLedger(subs) : null;
  const live = (subs ?? []).filter((s) => LIVE_SUB.has(s.status)).length;
  const dodo = dodoDashboard();
  const moneyBack = alerts.filter((a) => /refund|dispute|chargeback/i.test(`${a.key} ${a.title}`));
  return (
    <AdminShell
      active="billing"
      title="Billing"
      lead="What the Dodo webhooks recorded. Billing changes (refunds, credits, cancellations) happen in Dodo, never here."
      now={now}
      warnings={warnings}
      right={
        <a href={dodo} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-dv-teal ring-1 ring-dv-line hover:ring-dv-edge">
          Dodo dashboard <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      }
      {...c}
    >
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live subscriptions" value={subs ? int(live) : "—"} />
        <Stat
          label="Founding (offer closed)"
          value={ledger ? int(ledger.used) : dodoFoundingUses !== null ? int(dodoFoundingUses) : "—"}
          sub={`Historic, ${ledger ? "live in the ledger" : "Dodo code uses"}${ledger && dodoFoundingUses !== null ? ` · Dodo code uses: ${dodoFoundingUses}` : ""}`}
        />
        <Stat label="Duplicates" value={int(issues.filter((i) => i.kind === "duplicate").length)} tone={issues.some((i) => i.kind === "duplicate") ? "red" : "teal"} />
        <Stat label="Payment issues" value={int(issues.filter((i) => i.kind !== "duplicate").length)} tone={issues.some((i) => i.kind !== "duplicate") ? "amber" : "teal"} />
      </div>

      <Section title="Needs attention" id="issues">
        {issues.length === 0 ? (
          <AllClear>No duplicate subscriptions or payment problems.</AllClear>
        ) : (
          <ul className="grid gap-2">
            {issues.map((i, n) => (
              <li key={`${i.clinicId}-${i.kind}-${n}`} className="dv-card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={i.kind === "duplicate" ? "red" : "amber"}>{i.kind}</Badge>
                  <Link href={c.links.clinic(i.clinicId)} className="font-medium text-dv-ink hover:text-dv-teal hover:underline">
                    {names.get(i.clinicId) ?? i.clinicId}
                  </Link>
                  <span className="text-dv-body">{i.detail}</span>
                </span>
                <span className="font-mono text-[0.6875rem] text-dv-muted">{i.subs.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Refunds and disputes" id="money-back" lead="From the owner alerts of the last 3 days (Dodo has the full history).">
        {moneyBack.length === 0 ? (
          <AllClear>None in the last 3 days.</AllClear>
        ) : (
          <ul className="grid gap-1.5 text-sm">
            {moneyBack.map((a, i) => (
              <li key={i} className="dv-card flex flex-wrap justify-between gap-2 p-3">
                <span className="text-dv-ink">{a.title}</span>
                <span className="text-xs text-dv-muted">{when(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Subscriptions" id="subs">
        {subs === null ? (
          <Warn>The subscription ledger (0007) is not on this database.</Warn>
        ) : subs.length === 0 ? (
          <Empty>No subscriptions yet.</Empty>
        ) : (
          <Table caption="Subscriptions" head={["Clinic", "Status", "Tier", "Interval", "Founding", "Period end", "Last event", "Subscription"]} minWidth="58rem">
            {subs.slice(0, 300).map((s) => (
              <tr key={s.dodo_subscription_id}>
                <th scope="row" className="max-w-[12rem] truncate">
                  <Link href={c.links.clinic(s.clinic_id)} className="font-medium text-dv-ink hover:text-dv-teal hover:underline">
                    {names.get(s.clinic_id) ?? "clinic"}
                  </Link>
                </th>
                <td>
                  <Badge tone={s.status === "active" ? "teal" : LIVE_SUB.has(s.status) ? "amber" : "grey"}>{s.status}</Badge>
                </td>
                <td className="capitalize">{s.tier ?? "—"}</td>
                <td>{s.interval ?? "—"}</td>
                <td>{s.founding ? <CircleCheck className="h-4 w-4 text-dv-teal" aria-label="founding" /> : ""}</td>
                <td className="whitespace-nowrap text-xs">{day(s.period_end)}</td>
                <td className="whitespace-nowrap text-xs text-dv-muted">
                  {s.last_event_type ?? "—"} · {when(s.last_event_at)}
                </td>
                <td className="font-mono text-[0.6875rem] text-dv-muted">{s.dodo_subscription_id}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Recent payments" id="payments" lead="Payment ids per clinic (amounts and refunds live in Dodo).">
        {payments === null ? (
          <Warn>The payments index (0007) is not on this database.</Warn>
        ) : payments.length === 0 ? (
          <Empty>No payments recorded.</Empty>
        ) : (
          <Table caption="Payments" head={["When", "Clinic", "Payment", "Subscription"]} minWidth="40rem">
            {payments.slice(0, 100).map((p) => (
              <tr key={p.dodo_payment_id}>
                <td className="whitespace-nowrap text-xs">{when(p.created_at)}</td>
                <th scope="row" className="max-w-[12rem] truncate">
                  <Link href={c.links.clinic(p.clinic_id)} className="font-medium text-dv-ink hover:text-dv-teal hover:underline">
                    {names.get(p.clinic_id) ?? "clinic"}
                  </Link>
                </th>
                <td className="font-mono text-[0.6875rem]">{p.dodo_payment_id}</td>
                <td className="font-mono text-[0.6875rem] text-dv-muted">{p.dodo_subscription_id ?? "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </AdminShell>
  );
}

/* ======================================================= Funnel & sources */

export function AdminFunnelScreen({
  data,
  range,
  locale,
  country,
  ...c
}: Common & { data: AdminData; range: DateRange; locale: string | null; country: string | null }) {
  const custom = range.key.includes("..");
  const params = (q: FunnelQuery) => {
    const days = q.days ?? (custom ? undefined : range.days);
    return qs({
      days: days && days !== 30 ? days : undefined,
      from: !q.days && custom ? range.from.toISOString().slice(0, 10) : undefined,
      to: !q.days && custom ? range.to.toISOString().slice(0, 10) : undefined,
      locale: q.locale === undefined ? locale : q.locale,
      country: q.country === undefined ? country : q.country,
    });
  };
  const href = (q: FunnelQuery) => c.links.section("funnel", params(q));
  const f = c.links.form("funnel");
  const rangeUi = (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2" aria-label="Range">
        {RANGE_PRESETS.map((d) => (
          <Chip key={d} href={href({ days: d })} on={!custom && range.days === d}>
            {d === 1 ? "24 h" : `${d} days`}
          </Chip>
        ))}
      </div>
      <form method="get" action={f.action} className="flex flex-wrap items-end gap-2 text-xs" aria-label="Custom range">
        {Object.entries(f.hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        {locale && <input type="hidden" name="locale" value={locale} />}
        {country && <input type="hidden" name="country" value={country} />}
        <label className="grid gap-0.5 text-dv-muted">
          From
          <input type="date" name="from" defaultValue={custom ? range.from.toISOString().slice(0, 10) : ""} className="min-h-9 rounded-lg border border-dv-line bg-white px-2 text-sm text-dv-ink" />
        </label>
        <label className="grid gap-0.5 text-dv-muted">
          To
          <input type="date" name="to" defaultValue={custom ? range.to.toISOString().slice(0, 10) : ""} className="min-h-9 rounded-lg border border-dv-line bg-white px-2 text-sm text-dv-ink" />
        </label>
        <button type="submit" className="min-h-9 rounded-full bg-white px-3 font-medium text-dv-teal ring-1 ring-dv-line">
          Show
        </button>
      </form>
    </div>
  );
  return (
    <AdminShell active="funnel" title="Funnel & sources" lead={`${range.label} · ${data.events.length ? "first-party events, no trackers" : "no events yet"}`} now={data.now} warnings={data.warnings} {...c}>
      <FunnelAndSources data={data} days={range.days} now={range.to} locale={locale} country={country} href={href} range={rangeUi} rangeLabel={range.label} />
    </AdminShell>
  );
}

export { qs };
