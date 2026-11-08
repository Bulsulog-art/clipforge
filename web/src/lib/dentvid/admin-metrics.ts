/**
 * The owner dashboard's numbers (/dentvideo/admin), as pure functions of
 * rows already loaded — so the maths (MRR, conversion, churn, funnel rates)
 * is unit-tested and the dev harness can feed fake rows to the same code.
 */
import { DV_FOUNDING, DV_PRICES_USD, DV_TIERS, type DvInterval, type DvTier } from "./billing";
import type { DvEventName } from "./events";

export type AdminClinic = {
  id: string;
  owner_id?: string;
  created_at: string;
  plan: string;
  plan_tier?: string | null;
  dodo_subscription_id?: string | null;
  profile?: { name?: string; country?: string; language?: string } | null;
};

export type AdminEvent = {
  name: string;
  locale: string | null;
  props: Record<string, unknown> | null;
  clinic_id: string | null;
  created_at: string;
};

export type AdminItem = {
  id: string;
  clinic_id: string;
  kind: string;
  week_of: string;
  status: string;
  approval: string;
  title?: string | null;
  error?: string | null;
  updated_at: string;
};

const DAY = 86_400_000;

/* ---------------------------------------------------------------- revenue */

/** What we know about a clinic's subscription beyond plan_tier (from checkout / payment events). */
export type BillingHint = { interval?: DvInterval; founding?: boolean };

/**
 * Per clinic, the interval and founding flag from its latest checkout_opened
 * and payment_succeeded events (events are the only place they are recorded).
 */
export function billingHints(events: AdminEvent[]): Map<string, BillingHint> {
  const out = new Map<string, BillingHint>();
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const e of sorted) {
    if (!e.clinic_id || (e.name !== "checkout_opened" && e.name !== "payment_succeeded")) continue;
    const h = { ...(out.get(e.clinic_id) ?? {}) };
    const p = e.props ?? {};
    if (p.interval === "month" || p.interval === "year") h.interval = p.interval;
    if (e.name === "checkout_opened" && typeof p.founding === "boolean") h.founding = p.founding;
    out.set(e.clinic_id, h);
  }
  return out;
}

/**
 * Monthly recurring revenue of one clinic in USD: its tier's list price
 * (yearly ÷ 12), or the founding price for Practice monthly when the clinic
 * is known to have checked out with the founding code. Not active → 0.
 * Unknown tier (billing columns not migrated) → 0, counted separately.
 */
export function clinicMrr(c: Pick<AdminClinic, "plan" | "plan_tier">, hint: BillingHint = {}): number {
  if (c.plan !== "active") return 0;
  const tier = (DV_TIERS as readonly string[]).includes(c.plan_tier ?? "") ? (c.plan_tier as DvTier) : null;
  if (!tier) return 0;
  const interval: DvInterval = hint.interval === "year" && DV_PRICES_USD[tier].year ? "year" : "month";
  if (interval === "year") return (DV_PRICES_USD[tier].year ?? 0) / 12;
  if (hint.founding && tier === DV_FOUNDING.tier) return DV_FOUNDING.priceUsd;
  return DV_PRICES_USD[tier].month ?? 0;
}

export type Revenue = {
  payingByTier: Record<DvTier | "unknown", number>;
  paying: number;
  mrrUsd: number;
  /** Paying clinics counted at the founding price. */
  founding: number;
  yearly: number;
};

export function revenue(clinics: AdminClinic[], hints: Map<string, BillingHint> = new Map()): Revenue {
  const payingByTier: Revenue["payingByTier"] = { starter: 0, practice: 0, group: 0, unknown: 0 };
  let mrr = 0;
  let founding = 0;
  let yearly = 0;
  for (const c of clinics) {
    if (c.plan !== "active") continue;
    const tier = (DV_TIERS as readonly string[]).includes(c.plan_tier ?? "") ? (c.plan_tier as DvTier) : "unknown";
    payingByTier[tier]++;
    const h = hints.get(c.id) ?? {};
    mrr += clinicMrr(c, h);
    if (tier !== "unknown" && h.interval === "year" && DV_PRICES_USD[tier].year) yearly++;
    else if (tier === DV_FOUNDING.tier && h.founding) founding++;
  }
  const paying = payingByTier.starter + payingByTier.practice + payingByTier.group + payingByTier.unknown;
  return { payingByTier, paying, mrrUsd: Math.round(mrr * 100) / 100, founding, yearly };
}

/* ------------------------------------------------------- signups and plan */

export type Growth = {
  signupsToday: number;
  signups7d: number;
  signups30d: number;
  total: number;
  /** Clinics that never paid (plan = trial). */
  unpaid: number;
  /** Clinics that ever paid: active, paused, cancelled, or a recorded subscription. */
  everPaid: number;
  /** everPaid ÷ total, null with no clinics. */
  conversion: number | null;
  /** Of the clinics that signed up in the last 30 days, the share paying now. */
  conversion30d: number | null;
  cancelled: number;
  paused: number;
  /** (cancelled + paused) ÷ everPaid, null when nobody has paid yet. */
  churn: number | null;
};

const startOfUtcDay = (now: Date) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

export const everPaid = (c: Pick<AdminClinic, "plan" | "dodo_subscription_id">) => c.plan !== "trial" || !!c.dodo_subscription_id;

export function growth(clinics: AdminClinic[], now = new Date()): Growth {
  const today = startOfUtcDay(now);
  const t = now.getTime();
  let signupsToday = 0;
  let signups7d = 0;
  let signups30d = 0;
  let paid = 0;
  let cancelled = 0;
  let paused = 0;
  let recent = 0;
  let recentPaying = 0;
  for (const c of clinics) {
    const at = Date.parse(c.created_at);
    if (at >= today) signupsToday++;
    if (at > t - 7 * DAY) signups7d++;
    if (at > t - 30 * DAY) {
      signups30d++;
      recent++;
      if (c.plan === "active") recentPaying++;
    }
    if (everPaid(c)) paid++;
    if (c.plan === "cancelled") cancelled++;
    if (c.plan === "paused") paused++;
  }
  const total = clinics.length;
  return {
    signupsToday,
    signups7d,
    signups30d,
    total,
    unpaid: clinics.filter((c) => !everPaid(c)).length,
    everPaid: paid,
    conversion: total ? paid / total : null,
    conversion30d: recent ? recentPaying / recent : null,
    cancelled,
    paused,
    churn: paid ? (cancelled + paused) / paid : null,
  };
}

/** Founding seats left: from Dodo's discount usage when known, else estimated from active Practice clinics. */
export function foundingSeats(clinics: AdminClinic[], dodoUses: number | null): { left: number; used: number; source: "dodo" | "estimate" } {
  if (dodoUses !== null && Number.isFinite(dodoUses)) {
    const used = Math.max(0, Math.floor(dodoUses));
    return { left: Math.max(0, DV_FOUNDING.clinics - used), used, source: "dodo" };
  }
  const used = clinics.filter((c) => c.plan === "active" && c.plan_tier === DV_FOUNDING.tier).length;
  return { left: Math.max(0, DV_FOUNDING.clinics - used), used, source: "estimate" };
}

/** Counts per UTC day for the last `days` days, oldest first. */
export function dailyCounts(dates: string[], days: number, now = new Date()): number[] {
  const end = startOfUtcDay(now) + DAY;
  const out = new Array<number>(days).fill(0);
  for (const d of dates) {
    const idx = days - 1 - Math.floor((end - 1 - Date.parse(d)) / DAY);
    if (idx >= 0 && idx < days) out[idx]++;
  }
  return out;
}

/* ----------------------------------------------------------------- funnel */

export type FunnelStepDef = { key: string; event: DvEventName; label: string; where?: Record<string, unknown> };

/** The funnel in order. Wizard preview starts are a different moment (after sign-up), so step 2 counts only the landing teaser. */
export const FUNNEL: FunnelStepDef[] = [
  { key: "visit", event: "landing_view", label: "Landing views" },
  { key: "teaser", event: "preview_started", label: "Tried the preview", where: { where: "landing" } },
  { key: "signup", event: "signup_completed", label: "Signed up" },
  { key: "clinic", event: "clinic_saved", label: "Clinic saved" },
  { key: "preview", event: "preview_step_viewed", label: "Saw their preview" },
  { key: "plan", event: "plan_clicked", label: "Clicked a plan" },
  { key: "checkout", event: "checkout_opened", label: "Opened checkout" },
  { key: "paid", event: "payment_succeeded", label: "Paid" },
  { key: "ready", event: "week_ready", label: "First week ready", where: { kind: "week" } },
  { key: "approved", event: "video_approved", label: "Approved a video" },
  { key: "shared", event: "video_shared", label: "Shared a video" },
];

export type FunnelStep = FunnelStepDef & { count: number; fromPrev: number | null; fromTop: number | null };

const matches = (e: AdminEvent, def: FunnelStepDef) =>
  e.name === def.event && (!def.where || Object.entries(def.where).every(([k, v]) => (e.props ?? {})[k] === v));

/**
 * Count of a step: distinct clinics for events tied to a clinic (a clinic
 * saving its profile five times is one clinic), plus every anonymous event
 * (landing views are de-duplicated per tab in the browser).
 */
export function stepCount(events: AdminEvent[], def: FunnelStepDef): number {
  const clinics = new Set<string>();
  let anon = 0;
  for (const e of events) {
    if (!matches(e, def)) continue;
    if (e.clinic_id) clinics.add(e.clinic_id);
    else anon++;
  }
  return clinics.size + anon;
}

/** a ÷ b, or null when b is 0. */
export const rate = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function funnel(events: AdminEvent[], opts: { days: number; now?: Date; locale?: string | null; steps?: FunnelStepDef[] }): FunnelStep[] {
  const since = (opts.now ?? new Date()).getTime() - opts.days * DAY;
  const inWindow = events.filter((e) => Date.parse(e.created_at) > since && (!opts.locale || e.locale === opts.locale));
  const defs = opts.steps ?? FUNNEL;
  const counts = defs.map((d) => stepCount(inWindow, d));
  return defs.map((d, i) => ({
    ...d,
    count: counts[i],
    fromPrev: i === 0 ? null : rate(counts[i], counts[i - 1]),
    fromTop: i === 0 ? null : rate(counts[i], counts[0]),
  }));
}

export type LocaleRow = { locale: string; visits: number; teaser: number; signups: number; plans: number; paid: number; visitToPaid: number | null; signupToPaid: number | null };

/** The key steps per locale, busiest first. Events without a locale are grouped as "—". */
export function funnelByLocale(events: AdminEvent[], opts: { days: number; now?: Date }): LocaleRow[] {
  const since = (opts.now ?? new Date()).getTime() - opts.days * DAY;
  const inWindow = events.filter((e) => Date.parse(e.created_at) > since);
  const locales = [...new Set(inWindow.map((e) => e.locale ?? "—"))];
  const step = (key: string) => FUNNEL.find((s) => s.key === key)!;
  const rows = locales.map((locale) => {
    const evs = inWindow.filter((e) => (e.locale ?? "—") === locale);
    const visits = stepCount(evs, step("visit"));
    const signups = stepCount(evs, step("signup"));
    const paid = stepCount(evs, step("paid"));
    return {
      locale,
      visits,
      teaser: stepCount(evs, step("teaser")),
      signups,
      plans: stepCount(evs, step("plan")),
      paid,
      visitToPaid: rate(paid, visits),
      signupToPaid: rate(paid, signups),
    };
  });
  return rows.sort((a, b) => b.visits - a.visits || b.signups - a.signups || a.locale.localeCompare(b.locale));
}

/* ------------------------------------------------------------- operations */

export type ClinicRun = { weekOf: string; ready: number; flagged: number; failed: number; making: number; approved: number; total: number };

/** Each clinic's latest generated week (week_of), with its items' outcomes. */
export function lastRuns(items: AdminItem[]): Map<string, ClinicRun> {
  const latest = new Map<string, string>();
  for (const i of items) {
    if (i.kind !== "generated") continue;
    const w = latest.get(i.clinic_id);
    if (!w || i.week_of > w) latest.set(i.clinic_id, i.week_of);
  }
  const out = new Map<string, ClinicRun>();
  for (const i of items) {
    if (i.kind !== "generated" || latest.get(i.clinic_id) !== i.week_of) continue;
    const r = out.get(i.clinic_id) ?? { weekOf: i.week_of, ready: 0, flagged: 0, failed: 0, making: 0, approved: 0, total: 0 };
    r.total++;
    if (i.status === "ready") r.ready++;
    else if (i.status === "flagged" || i.status === "rejected") r.flagged++;
    else if (i.status === "failed") r.failed++;
    else r.making++;
    if (i.approval === "approved") r.approved++;
    out.set(i.clinic_id, r);
  }
  return out;
}

/** A one-word state for a run: what the owner should look at first. */
export function runState(r: ClinicRun | undefined): "none" | "making" | "failed" | "flagged" | "ready" {
  if (!r) return "none";
  if (r.making) return "making";
  if (r.failed && !r.ready) return "failed";
  if (r.failed || r.flagged) return "flagged";
  return "ready";
}

/** Totals across every clinic's latest run. */
export function runTotals(runs: Map<string, ClinicRun>): { clinics: number; ready: number; flagged: number; failed: number; making: number } {
  const t = { clinics: runs.size, ready: 0, flagged: 0, failed: 0, making: 0 };
  for (const r of runs.values()) {
    t.ready += r.ready;
    t.flagged += r.flagged;
    t.failed += r.failed;
    t.making += r.making;
  }
  return t;
}

/** The newest failed items with their error text, trimmed for display. */
export function latestErrors(items: AdminItem[], limit = 8): { id: string; clinicId: string; title: string; error: string; at: string }[] {
  return items
    .filter((i) => i.status === "failed")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit)
    .map((i) => ({ id: i.id, clinicId: i.clinic_id, title: i.title ?? "", error: (i.error ?? "no error recorded").slice(0, 240), at: i.updated_at }));
}
