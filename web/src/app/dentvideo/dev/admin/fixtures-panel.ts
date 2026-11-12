import type { AdminClinic } from "@/lib/dentvid/admin-metrics";
import type { AdminData } from "@/lib/dentvid/admin-server";
import type { ClinicDetail, DetailItem, OverviewData, SystemData } from "@/lib/dentvid/admin-loaders";
import type { EmailLogRow, EmailSendRow, PaymentRow, SubRow } from "@/lib/dentvid/admin-ops";
import type { SystemSnapshot } from "@/lib/dentvid/admin-system-server";
import { lastDispatch, nextDispatch, dispatchWeek, monitorView, parseHeartbeats, workerHealth, type MonitorCheck, type MonitorHistoryEntry, type MonitorRunView, type MonitorView } from "@/lib/dentvid/admin-system";
import { SAMPLES, rng } from "./fixtures";

/**
 * Dev-only fixtures for the owner panel's screens, derived from the seeded
 * dashboard data (fixtures.ts): subscriptions, payments, emails, queue state,
 * heartbeats and one clinic's full detail. Never touches Redis or a database.
 */

const DAY = 86_400_000;

export function fixtureSystem(now: Date, data: AdminData, opts: { staleRenderServer?: boolean } = {}): SystemSnapshot {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const beats = parseHeartbeats(
    {
      "main-box:1": JSON.stringify({ host: "main-box", pid: 1, version: "3b4d4994", startedAt: iso(t - 3 * DAY), at: iso(t - 40_000), uptimeSec: 3 * 86_400, roles: ["crons", "dentvid-mail", "generate", "publish", "video-pipeline", "derivative"], renderConcurrency: 0 }),
      "render-1:7": JSON.stringify({ host: "render-1", pid: 7, version: "3b4d4994", startedAt: iso(t - 26 * 3600_000), at: iso(t - (opts.staleRenderServer ? 7 * 60_000 : 25_000)), uptimeSec: 26 * 3600, roles: ["dentvid"], renderConcurrency: 2 }),
    },
    now,
  );
  const paying = data.clinics.filter((c) => c.plan === "active");
  const last = lastDispatch(now);
  const next = nextDispatch(now);
  const failedClinic = paying[2]?.id ?? null;
  return {
    available: true,
    queues: [
      { name: "dentvid", waiting: 0, pausedJobs: 0, active: 1, prioritized: 3, delayed: 0, failed: 2, completed: 412, waitingChildren: 0, paused: false, queued: 3 },
      { name: "dentvid-mail", waiting: 0, pausedJobs: 0, active: 0, prioritized: 0, delayed: 14, failed: 1, completed: 188, waitingChildren: 0, paused: false, queued: 0 },
      { name: "crons", waiting: 0, pausedJobs: 0, active: 0, prioritized: 0, delayed: 1, failed: 0, completed: 200, waitingChildren: 0, paused: false, queued: 0 },
      { name: "video-pipeline", waiting: 0, pausedJobs: 0, active: 0, prioritized: 0, delayed: 0, failed: 0, completed: 0, waitingChildren: 0, paused: false, queued: 0 },
      { name: "generate", waiting: 0, pausedJobs: 0, active: 0, prioritized: 0, delayed: 0, failed: 0, completed: 0, waitingChildren: 0, paused: false, queued: 0 },
      { name: "publish", waiting: 0, pausedJobs: 0, active: 0, prioritized: 0, delayed: 0, failed: 0, completed: 0, waitingChildren: 0, paused: false, queued: 0 },
      { name: "derivative", waiting: 0, pausedJobs: 0, active: 0, prioritized: 0, delayed: 0, failed: 0, completed: 0, waitingChildren: 0, paused: false, queued: 0 },
    ],
    failed: [
      {
        id: `week:${failedClinic}:${last.week}`,
        queue: "dentvid",
        name: "week",
        clinicId: failedClinic,
        week: last.week,
        failedReason: "zero usable videos (5 technical failures; last: render: Remotion timed out after 240s (scene 3))",
        attemptsMade: 4,
        maxAttempts: 4,
        priority: 112,
        createdAt: iso(t - 2.2 * DAY),
        processedAt: iso(t - 2.1 * DAY),
        finishedAt: iso(t - 2 * DAY),
      },
      {
        id: `restyle:${paying[5]?.id}:1731000000000`,
        queue: "dentvid",
        name: "restyle",
        clinicId: null,
        week: null,
        failedReason: "item not found",
        attemptsMade: 2,
        maxAttempts: 2,
        priority: 1,
        createdAt: iso(t - 30 * 3600_000),
        processedAt: iso(t - 30 * 3600_000),
        finishedAt: iso(t - 29.9 * 3600_000),
      },
      {
        id: `ready:${paying[1]?.id}:${last.week}`,
        queue: "dentvid-mail",
        name: "notify",
        clinicId: paying[1]?.id ?? null,
        week: last.week,
        failedReason: "fetch failed: connect ETIMEDOUT",
        attemptsMade: 3,
        maxAttempts: 3,
        priority: null,
        createdAt: iso(t - 3 * DAY),
        processedAt: iso(t - 2.5 * DAY),
        finishedAt: iso(t - 2.5 * DAY),
      },
    ],
    stuck: [],
    heartbeats: beats,
    health: workerHealth(beats),
    lastBatch: { at: last.at.toISOString(), week: last.week, marker: { at: last.at.toISOString(), jobs: paying.length, waves: 6, projectedLate: 0 } },
    nextBatch: { at: next.toISOString(), week: dispatchWeek(next) },
    alerts: [
      { at: iso(t - 5 * 3600_000), severity: "warning", title: "Thin week: 2 of 5 usable videos — Harbour Smiles", key: `thin:${paying[1]?.id}`, clinic: "Harbour Smiles" },
      { at: iso(t - 2 * DAY), severity: "high", title: "Week failed after 4 attempts — Zahnzentrum Mitte", key: `week-failed:${failedClinic}`, clinic: "Zahnzentrum Mitte" },
      { at: iso(t - 2.4 * DAY), severity: "high", title: "Dodo: dispute.opened on a DentVideo payment (clinic paused)", key: "billing-dispute:pay_8Hk2", clinic: "Dentpark İzmir" },
    ],
    costByDay: Array.from({ length: 30 }, (_, i) => [new Date(t - i * DAY).toISOString().slice(0, 10), Math.round((2 + ((i * 7) % 9)) * 100) / 100] as [string, number]).reverse(),
    monitor: fixtureMonitor(now),
  };
}

/** The synthetic monitor: a sign-up outage last night (recovered), the Dodo link failing once just now. */
export function fixtureMonitor(now: Date): MonitorView {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  const slot = 15 * 60_000;
  const lastAt = Math.floor((t - 4 * 60_000) / slot) * slot;
  const check = (name: string, label: string, ms: number, extra: Partial<MonitorCheck> = {}): MonitorCheck => ({ name, label, ok: true, ms, status: 200, error: null, skipped: null, ...extra });
  const last: MonitorRunView = {
    at: iso(lastAt),
    ms: 2140,
    ok: false,
    results: [
      check("page-home", "Home page (/)", 182),
      check("page-tr", "Turkish page (/tr)", 175),
      check("page-start", "Sign-up page (/start)", 140),
      check("page-privacy", "Privacy page (/privacy)", 96),
      check("page-guide", "Guide page", 121),
      check("signup", "Sign-up", 980),
      check("cleanup", "Monitor account clean-up", 0),
      check("liman-auth", "Liman auth", 44),
      check("liman-rest", "Liman database API", 51),
      check("dodo", "Dodo checkout link", 612, { ok: false, status: 307, error: "checkout link goes to Dodo's error page (/error/not-found) — product missing or archived?" }),
    ],
  };
  const history: MonitorHistoryEntry[] = Array.from({ length: 96 * 3 }, (_, i) => {
    const at = lastAt - i * slot;
    const hoursAgo = (t - at) / 3600_000;
    const failed = i === 0 ? ["dodo"] : hoursAgo > 9 && hoursAgo < 10.6 ? ["signup"] : [];
    return { at: iso(at), ms: 1800 + ((i * 37) % 700), ok: failed.length === 0, failed, ran: i % 4 === 0 ? 10 : 9 };
  });
  return monitorView(last, history, { dodo: { fails: 1, since: iso(lastAt), alertedAt: null, lastOkAt: iso(lastAt - 4 * slot) } }, now);
}

export function fixtureSubs(now: Date, clinics: AdminClinic[]): SubRow[] {
  const r = rng(77);
  const out: SubRow[] = [];
  for (const c of clinics) {
    if (!c.dodo_subscription_id) continue;
    const status = c.plan === "active" ? "active" : c.plan === "paused" ? "paused" : "cancelled";
    const founding = c.plan_tier === "practice" && r() < 0.7;
    out.push({
      dodo_subscription_id: c.dodo_subscription_id,
      clinic_id: c.id,
      status,
      tier: c.plan_tier ?? "practice",
      interval: r() < 0.15 ? "year" : "month",
      founding,
      period_end: new Date(now.getTime() + r() * 30 * DAY).toISOString(),
      last_event_at: new Date(now.getTime() - r() * 20 * DAY).toISOString(),
      last_event_type: status === "active" ? "subscription.renewed" : `subscription.${status}`,
      created_at: c.created_at,
    });
  }
  // One duplicate charge and one card on hold, so the Billing screen has something to flag.
  const active = out.filter((s) => s.status === "active");
  if (active[0]) out.push({ ...active[0], dodo_subscription_id: `${active[0].dodo_subscription_id}_dup`, created_at: new Date(now.getTime() - 3600_000).toISOString(), last_event_type: "subscription.active" });
  if (active[1]) active[1].status = "on_hold";
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function fixturePayments(subs: SubRow[]): PaymentRow[] {
  return subs.slice(0, 60).map((s, i) => ({ dodo_payment_id: `pay_${s.dodo_subscription_id.slice(4, 12)}${i}`, clinic_id: s.clinic_id, dodo_subscription_id: s.dodo_subscription_id, created_at: s.last_event_at ?? s.created_at }));
}

export function fixtureEmails(now: Date, clinics: AdminClinic[]): { log: EmailLogRow[]; sends: EmailSendRow[] } {
  const r = rng(91);
  const log: EmailLogRow[] = [];
  const sends: EmailSendRow[] = [];
  let id = 1;
  for (const c of clinics.slice(0, 80)) {
    const at = (h: number) => new Date(Math.min(now.getTime() - 60_000, Date.parse(c.created_at) + h * 3600_000)).toISOString();
    if (c.plan === "trial") {
      log.push({ clinic_id: c.id, kind: r() < 0.5 ? "nudge_preview" : "nudge_offer", sent_at: at(26) });
    } else {
      sends.push({ id: id++, clinic_id: c.id, kind: "welcome", language: c.profile?.language ?? null, status: "sent", error: null, created_at: at(0.3) });
      const failed = r() < 0.06;
      sends.push({
        id: id++,
        clinic_id: c.id,
        kind: "ready_week",
        language: c.profile?.language ?? null,
        status: failed ? "failed" : "sent",
        error: failed ? "422 {\"name\":\"validation_error\",\"message\":\"Invalid `to` field.\"}" : null,
        created_at: new Date(now.getTime() - r() * 6 * DAY).toISOString(),
      });
    }
  }
  return { log, sends: sends.sort((a, b) => b.created_at.localeCompare(a.created_at)) };
}

export function fixtureOverview(now: Date, data: AdminData): OverviewData {
  const system = fixtureSystem(now, data);
  const subs = fixtureSubs(now, data.clinics);
  return {
    ...data,
    system,
    subs,
    subsTable: true,
    emailFailures: fixtureEmails(now, data.clinics).sends.filter((s) => s.status === "failed").length,
    cost: { today: 6.4, d7: 41.85, d30: 152.3, tracked: true },
  };
}

export function fixtureSystemPage(now: Date, data: AdminData): SystemData {
  const system = fixtureSystem(now, data, { staleRenderServer: true });
  return { now: data.now, system, spend: data.spend, batchItems: data.items.filter((i) => i.week_of === system.lastBatch.week), clinics: data.clinics };
}

const SCRIPT = [
  "Whitening works on natural enamel — not on fillings or crowns.",
  "Most patients see a change after the first session; sensitivity, if any, usually settles within a day or two.",
  "Ask us which option suits your teeth before you start.",
];

/** One clinic's full detail, with sample videos standing in for the signed URLs. */
export function fixtureDetail(now: Date, data: AdminData, clinic: AdminClinic): ClinicDetail {
  const subs = fixtureSubs(now, data.clinics).filter((s) => s.clinic_id === clinic.id);
  const { sends, log } = fixtureEmails(now, data.clinics);
  const items: DetailItem[] = data.items
    .filter((i) => i.clinic_id === clinic.id)
    .slice(0, 10)
    .map((i, n) => {
      const s = SAMPLES[n % SAMPLES.length];
      const hasFile = i.status === "ready" || i.status === "flagged";
      return {
        id: i.id,
        kind: i.kind,
        status: i.status,
        approval: i.approval,
        title: i.title ?? "",
        week_of: i.week_of,
        created_at: i.updated_at,
        updated_at: i.updated_at,
        error: i.error ?? null,
        findings: i.status === "flagged" ? ["quality: the narration is quiet in scene 2"] : [],
        checks: {
          script: {
            compliance:
              i.status === "flagged"
                ? { verdict: "revise", hard: [], issues: [{ quote: "painless whitening", problem: "Absolute claim about comfort", fix: "comfortable for most patients" }] }
                : { verdict: "pass", hard: [], issues: [] },
            accuracy: { verdict: "pass", issues: [] },
          },
          copy: { compliance: { verdict: "pass", hard: [], issues: [] }, accuracy: { verdict: "pass", issues: [] } },
        },
        copy: { caption: "What to expect from professional whitening — in 30 seconds.", hashtags: ["#dentist", "#whitening"] },
        plan: { voiceover: { text: SCRIPT.join(" ") }, scenes: [] },
        video_path: hasFile ? `${clinic.id}/${i.id}.mp4` : null,
        thumb_path: hasFile ? `${clinic.id}/${i.id}.jpg` : null,
        videoUrl: hasFile ? `/dentvideo/samples/${s}.mp4` : undefined,
        thumbUrl: hasFile ? `/dentvideo/samples/${s}.jpg` : undefined,
      };
    });
  return {
    now: data.now,
    clinic: { ...clinic, owner_id: "00000000-0000-4000-a000-000000000001", logo_path: null, plan_renews_at: subs[0]?.period_end ?? null, email_opt_out_at: null },
    ownerEmail: "dr.weber@praxis.example",
    logoUrl: "/dentvideo/icon.svg",
    items,
    events: data.events.filter((e) => e.clinic_id === clinic.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    emailLog: log.filter((l) => l.clinic_id === clinic.id),
    emailSends: sends.filter((s) => s.clinic_id === clinic.id),
    subs,
    payments: fixturePayments(subs),
    actions: [
      {
        id: 2,
        admin_id: "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d",
        admin_email: "owner@dentvideo.com",
        action: "comp_month",
        clinic_id: clinic.id,
        target: null,
        params: { months: 1, note: "Late first week (render server down)" },
        outcome: "ok",
        detail: "comp_recorded: 1 month(s): Late first week (render server down)",
        created_at: new Date(now.getTime() - 2 * DAY).toISOString(),
      },
      {
        id: 1,
        admin_id: "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d",
        admin_email: "owner@dentvideo.com",
        action: "requeue_week",
        clinic_id: clinic.id,
        target: null,
        params: { clinicId: clinic.id },
        outcome: "ok",
        detail: "week_queued",
        created_at: new Date(now.getTime() - 2.1 * DAY).toISOString(),
      },
    ],
    pauseColumn: true,
    signedTtlSec: 15 * 60,
  };
}
