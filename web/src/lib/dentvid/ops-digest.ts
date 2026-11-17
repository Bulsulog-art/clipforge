import { billingHints, revenue, type AdminClinic, type AdminEvent } from "./admin-metrics";
import type { DigestData } from "./ops-alert";

/**
 * The owner's daily digest (08:30 Istanbul, only when something happened):
 * the numbers, as a pure function of rows already loaded — the same MRR
 * maths as the owner dashboard (admin-metrics.ts). The route
 * (api/internal/dentvideo/digest) loads the rows and sends it.
 */

export type DigestClinic = AdminClinic & { updated_at?: string | null };

export type DigestInput = {
  now: Date;
  clinics: DigestClinic[];
  /** checkout_opened / payment_succeeded (all time, for billing hints), signup_completed / week_ready (the window). */
  events: AdminEvent[];
  /** False when dentvid_events is missing: sign-ups then come from clinic rows. */
  eventsTable: boolean;
  alerts: (DigestData["alerts"][number] & { key?: string })[];
  emailsSent: number;
  emailsFailed: number;
  mrrPrevUsd: number | null;
};

const DAY = 86_400_000;

export function istanbulPeriod(now: Date): string {
  const f = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(d).replace(",", "");
  return `${f(new Date(now.getTime() - DAY))} → ${f(now)} (Istanbul)`;
}

export function buildDigest(input: DigestInput): DigestData {
  const since = input.now.getTime() - DAY;
  const inWindow = (iso: string | null | undefined) => !!iso && Date.parse(iso) >= since && Date.parse(iso) <= input.now.getTime();
  const byId = new Map(input.clinics.map((c) => [c.id, c]));
  const recent = input.events.filter((e) => inWindow(e.created_at));

  const signups = input.eventsTable ? recent.filter((e) => e.name === "signup_completed").length : input.clinics.filter((c) => inWindow(c.created_at)).length;

  const seen = new Set<string>();
  const newPaying: DigestData["newPaying"] = [];
  for (const e of recent) {
    if (e.name !== "payment_succeeded" || e.props?.first !== true || !e.clinic_id || seen.has(e.clinic_id)) continue;
    seen.add(e.clinic_id);
    const c = byId.get(e.clinic_id);
    newPaying.push({
      name: c?.profile?.name?.trim() || e.clinic_id,
      tier: (typeof e.props?.tier === "string" ? e.props.tier : c?.plan_tier) || "?",
      country: c?.profile?.country || "?",
    });
  }

  const churned = input.clinics
    .filter((c) => (c.plan === "paused" || c.plan === "cancelled") && inWindow(c.updated_at))
    .map((c) => ({ name: c.profile?.name?.trim() || c.id, to: c.plan }));

  const rev = revenue(input.clinics, billingHints(input.events));
  const weeks = recent.filter((e) => e.name === "week_ready" && e.props?.kind === "week");
  const videosReady = weeks.reduce((n, e) => n + (Number(e.props?.ready) || 0) + (Number(e.props?.flagged) || 0), 0);
  const weeksFailed = input.alerts.filter((a) => a.key?.startsWith("week_failed:")).length;

  return {
    period: istanbulPeriod(input.now),
    signups,
    newPaying,
    mrrUsd: rev.mrrUsd,
    mrrPrevUsd: input.mrrPrevUsd,
    paying: rev.paying,
    churned,
    weeksDelivered: weeks.length,
    weeksFailed,
    videosReady,
    emailsSent: input.emailsSent,
    emailsFailed: input.emailsFailed,
    alerts: input.alerts.map(({ at, severity, title, clinic }) => ({ at, severity, title, clinic })),
  };
}
