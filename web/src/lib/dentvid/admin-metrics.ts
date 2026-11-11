/**
 * The owner dashboard's numbers (/dentvideo/admin), as pure functions of
 * rows already loaded — so the maths (MRR, conversion, churn, funnel rates)
 * is unit-tested and the dev harness can feed fake rows to the same code.
 */
import { DV_FOUNDING, DV_LEGACY_GROUP_MONTHLY_USD, DV_PRICES_USD, DV_TIERS, type DvInterval, type DvTier } from "./billing";
import type { DvEventName } from "./events";

export type AdminClinic = {
  id: string;
  owner_id?: string;
  created_at: string;
  plan: string;
  plan_tier?: string | null;
  dodo_subscription_id?: string | null;
  profile?: { name?: string; country?: string; language?: string; city?: string } | null;
  /** Paused by the owner in the admin panel (0010); absent before that migration. */
  admin_paused_at?: string | null;
  logo_path?: string | null;
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
  /** Reviewer / QA findings (0001); loaded by the admin panel to tell a missing file from a review flag. */
  findings?: unknown;
  video_path?: string | null;
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
  // Group has no public price (Contact us); a legacy Group subscription is counted at what it charges.
  if (tier === "group") return DV_LEGACY_GROUP_MONTHLY_USD;
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

/**
 * The funnel in order, one row per step a visitor takes. Wizard preview
 * starts are a different moment (after sign-up), so "teaser" counts only the
 * landing's own preview.
 */
export const FUNNEL: FunnelStepDef[] = [
  { key: "visit", event: "landing_view", label: "Landing views" },
  { key: "cta", event: "cta_clicked", label: "Clicked a sign-up button" },
  { key: "teaser", event: "preview_started", label: "Tried the landing preview", where: { where: "landing" } },
  { key: "signupStart", event: "signup_started", label: "Started the sign-up form" },
  { key: "signup", event: "signup_completed", label: "Signed up" },
  { key: "clinic", event: "clinic_saved", label: "Clinic saved" },
  { key: "preview", event: "preview_step_viewed", label: "Saw their preview" },
  { key: "played", event: "preview_played", label: "Preview played", where: { where: "wizard" } },
  { key: "previewDone", event: "preview_completed", label: "Watched a preview video to the end", where: { where: "wizard" } },
  { key: "planView", event: "plan_viewed", label: "Saw the plans" },
  { key: "verified", event: "code_verified", label: "Confirmed their email code" },
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

/* ------------------------------------------------- segments: who, where from */

/** Clinic id → its own country (the profile's), for events tied to a clinic. */
export function clinicCountries(clinics: Pick<AdminClinic, "id" | "profile">[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of clinics) {
    const cc = c.profile?.country;
    if (typeof cc === "string" && /^[A-Z]{2}$/.test(cc)) out.set(c.id, cc);
  }
  return out;
}

/**
 * The country an event belongs to: the clinic's own country once it has one,
 * else the country the clinic typed on clinic_saved, else the proxy's geo
 * country (props.geo), else "—" (no geo header at the edge yet).
 */
export function eventCountry(e: AdminEvent, byClinic: Map<string, string> = new Map()): string {
  const fromClinic = e.clinic_id ? byClinic.get(e.clinic_id) : undefined;
  if (fromClinic) return fromClinic;
  const p = e.props ?? {};
  if (typeof p.country === "string" && /^[A-Z]{2}$/.test(p.country)) return p.country;
  if (typeof p.geo === "string" && /^[A-Z]{2}$/.test(p.geo)) return p.geo;
  return "—";
}

/** "instagram / dm / tr-launch", "ref: google.com", or null when the event carries no source. */
export function sourceOf(props: Record<string, unknown> | null | undefined): string | null {
  const p = props ?? {};
  const utm = ["utm_source", "utm_medium", "utm_campaign"].map((k) => (typeof p[k] === "string" ? (p[k] as string) : ""));
  if (utm.some(Boolean)) return utm.map((v) => v || "—").join(" / ");
  if (typeof p.ref === "string" && p.ref) return `ref: ${p.ref}`;
  return null;
}

export const DIRECT = "(direct / none)";

/** ?country= on /admin: an ISO code, or null. */
export function asCountryFilter(v: string | null | undefined): string | null {
  const c = (v ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

/**
 * First-touch source per clinic: the source on the clinic's earliest event
 * that carries one (the wizard stamps clinic_saved with the visit's UTM tags,
 * which the browser keeps for the tab — lib/dentvid/attribution). Every later
 * event of that clinic, payment included, is credited to it.
 */
export function clinicSources(events: AdminEvent[]): Map<string, string> {
  const out = new Map<string, string>();
  const sorted = events.filter((e) => e.clinic_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const e of sorted) {
    if (out.has(e.clinic_id!)) continue;
    const s = sourceOf(e.props);
    if (s) out.set(e.clinic_id!, s);
  }
  return out;
}

/** An event's source: its own tags, else its clinic's first touch, else direct. */
export function eventSource(e: AdminEvent, byClinic: Map<string, string>): string {
  return sourceOf(e.props) ?? (e.clinic_id ? byClinic.get(e.clinic_id) : undefined) ?? DIRECT;
}

export type SegmentFilter = {
  days: number;
  now?: Date;
  locale?: string | null;
  country?: string | null;
  /** Clinic id → country, to place clinic events in a country (clinicCountries). */
  countries?: Map<string, string>;
};

function inSegment(events: AdminEvent[], f: SegmentFilter): AdminEvent[] {
  const until = (f.now ?? new Date()).getTime();
  const since = until - f.days * DAY;
  return events.filter(
    (e) =>
      Date.parse(e.created_at) > since &&
      Date.parse(e.created_at) <= until &&
      (!f.locale || e.locale === f.locale) &&
      (!f.country || eventCountry(e, f.countries) === f.country),
  );
}

export function funnel(events: AdminEvent[], opts: SegmentFilter & { steps?: FunnelStepDef[] }): FunnelStep[] {
  const inWindow = inSegment(events, opts);
  const defs = opts.steps ?? FUNNEL;
  const counts = defs.map((d) => stepCount(inWindow, d));
  return defs.map((d, i) => ({
    ...d,
    count: counts[i],
    fromPrev: i === 0 ? null : rate(counts[i], counts[i - 1]),
    fromTop: i === 0 ? null : rate(counts[i], counts[0]),
  }));
}

/** The key steps of one segment (a locale, a country, a source). */
export type SegmentRow = {
  key: string;
  visits: number;
  cta: number;
  teaser: number;
  signups: number;
  verified: number;
  previewDone: number;
  plans: number;
  checkouts: number;
  paid: number;
  visitToSignup: number | null;
  visitToPaid: number | null;
  signupToPaid: number | null;
};

/** Kept for callers of the old name: a SegmentRow keyed by locale. */
export type LocaleRow = SegmentRow & { locale: string };

const stepDef = (key: string) => FUNNEL.find((s) => s.key === key)!;

function segmentRow(key: string, evs: AdminEvent[]): SegmentRow {
  const visits = stepCount(evs, stepDef("visit"));
  const signups = stepCount(evs, stepDef("signup"));
  const paid = stepCount(evs, stepDef("paid"));
  return {
    key,
    visits,
    cta: stepCount(evs, stepDef("cta")),
    teaser: stepCount(evs, stepDef("teaser")),
    signups,
    verified: stepCount(evs, stepDef("verified")),
    previewDone: stepCount(evs, stepDef("previewDone")),
    plans: stepCount(evs, stepDef("plan")),
    checkouts: stepCount(evs, stepDef("checkout")),
    paid,
    visitToSignup: rate(signups, visits),
    visitToPaid: rate(paid, visits),
    signupToPaid: rate(paid, signups),
  };
}

/** The key steps per segment, busiest first. */
export function funnelBy(events: AdminEvent[], keyOf: (e: AdminEvent) => string, f: SegmentFilter): SegmentRow[] {
  const groups = new Map<string, AdminEvent[]>();
  for (const e of inSegment(events, f)) {
    const k = keyOf(e);
    const list = groups.get(k);
    if (list) list.push(e);
    else groups.set(k, [e]);
  }
  return [...groups.entries()]
    .map(([k, evs]) => segmentRow(k, evs))
    .sort((a, b) => b.visits - a.visits || b.signups - a.signups || b.paid - a.paid || a.key.localeCompare(b.key));
}

/** Per locale; events without a locale are grouped as "—". */
export function funnelByLocale(events: AdminEvent[], f: SegmentFilter): LocaleRow[] {
  return funnelBy(events, (e) => e.locale ?? "—", f).map((r) => ({ ...r, locale: r.key }));
}

/** Per country (eventCountry). */
export function funnelByCountry(events: AdminEvent[], f: SegmentFilter): SegmentRow[] {
  return funnelBy(events, (e) => eventCountry(e, f.countries), f);
}

/**
 * Per source (utm_source / utm_medium / utm_campaign, else the referring
 * host, else direct). Clinic events — checkout, payment — are credited to
 * the clinic's first touch, looked up over all events, not only the window.
 */
export function funnelBySource(events: AdminEvent[], f: SegmentFilter): SegmentRow[] {
  const firstTouch = clinicSources(events);
  return funnelBy(events, (e) => eventSource(e, firstTouch), f);
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
