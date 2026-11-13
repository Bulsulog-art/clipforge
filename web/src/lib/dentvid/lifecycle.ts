import type { SupabaseClient } from "@supabase/supabase-js";
import { lifecycleText } from "@/content/dentvideo-lifecycle";
import { DV_PRICES_USD, DV_SELF_SERVE_TIERS, dvBaseUrl } from "./billing";
import {
  CONTACT_EMAIL,
  monthlyEmail,
  notPostedEmail,
  objectionsEmail,
  paymentProblemEmail,
  sampleEmail,
  startEmail,
  welcomeEmail,
  type MonthStats,
  type PaymentFix,
  type PaymentProblemKind,
  type Rendered,
} from "./lifecycle-email";
import type { Brand } from "./email-layout";
import type { SendOptions } from "./email";
import { clinicTimeZone, inSendWindow, localTime } from "./lifecycle-time";
import { pickPreviews } from "./preview-library";
import { BUCKET } from "./supabase";
import { unsubscribeSecret, unsubscribeToken } from "./unsubscribe-token";
import { isEmailVerified } from "./verify-email";
import { weekOf } from "./week";

/**
 * Lifecycle email: who gets which email, when, and never twice.
 *
 * Activation — a clinic that finished the clinic step (plan "trial") but has
 * not paid. Hours are counted from the clinic step; each step has a window,
 * and only the step whose window the clinic is in can be sent, so a clinic
 * first seen late never gets a burst of catch-up mail:
 *
 *   nudge_start       [2 h, 24 h)   day 0  finish your preview
 *   nudge_preview     [24 h, 72 h)  day 1  here is your clinic's sample
 *   nudge_objections  [72 h, 7 d)   day 3  the three common objections
 *
 * (A day-7 "nudge_offer" carried the former founding offer; it is no longer
 * sent. The kind stays in NudgeKind for the rows already logged.)
 *
 * At most three, ever, at least GAP_H apart. The sequence stops the moment the
 * clinic pays (plan leaves "trial"), opts out (email_opt_out_at) or is
 * deleted — each is re-checked right before every send.
 *
 * Paying clinics (plan "active", not opted out):
 *   nudge_post_<week>  Thursday, nothing shared yet from this week's ready
 *                      videos (dentvid_events video_shared), the week ready
 *                      for at least two days. Once per week.
 *   monthly_<yyyy_mm>  on one of the first four days of the month, a weekday,
 *                      last month's made / approved / shared. Skipped when
 *                      nothing was made. Once per month.
 *
 * Every lifecycle email: only in the clinic's send window (lifecycle-time.ts,
 * 08:00–20:00 in its own zone; the hourly run waits otherwise), only to an
 * owner who proved the address, never to a test account (e2e-…), with
 * RFC 8058 one-click unsubscribe headers (except the transactional welcome
 * and payment-problem emails).
 *
 * Idempotency: a row in dentvid_email_log (unique per clinic and kind; the
 * periodic kinds carry their week / month) is claimed before sending and
 * released if the send fails, and Resend gets an idempotency key as well.
 * Kinds beyond the original three need migration 0011; until it is applied
 * those claims fail with a check violation and are skipped (logged once).
 */

export type NudgeKind = "nudge_start" | "nudge_preview" | "nudge_objections" | "nudge_offer";
/** "welcome", a NudgeKind, "nudge_post_2026_11_09" or "monthly_2026_10". */
export type LifecycleKind = string;

export type ClinicProfileForMail = {
  name?: string;
  language?: string;
  country?: string;
  timezone?: string;
  services?: string[];
  brandColor?: string;
};

export type ClinicForMail = {
  id: string;
  owner_id: string;
  profile: ClinicProfileForMail | null;
  plan: string;
  created_at: string;
  email_opt_out_at: string | null;
  logo_path?: string | null;
};

export type OwnerContact = { email: string; verified: boolean };

export type LogRow = { clinic_id: string; kind: LifecycleKind; sent_at: string };

/** This week's videos of a paying clinic, and whether any was shared. `shared` null: unknown (no events table). */
export type WeekStats = { approved: number; pending: number; shared: number | null; firstReadyAt: string | null };

export class MissingSchemaError extends Error {
  constructor(what: string) {
    super(`dentvideo lifecycle: ${what} missing — apply supabase/liman/0005_dentvid_email.sql`);
  }
}

/** The email log refused a kind (check constraint): migration 0011 not applied yet. */
export class KindNotAllowedError extends Error {
  constructor(kind: string) {
    super(`dentvideo lifecycle: email kind "${kind}" not allowed — apply supabase/liman/0011_dentvid_email_kinds.sql`);
  }
}

/** Database access, so the selection and stop rules are tested without a database. */
export interface LifecycleStore {
  /** Unpaid, not opted-out clinics created in [after, before], oldest first. */
  trialClinics(after: Date, before: Date, limit: number): Promise<ClinicForMail[]>;
  /** Paying (plan "active"), not opted-out clinics. */
  activeClinics?(limit: number): Promise<ClinicForMail[]>;
  logs(clinicIds: string[]): Promise<LogRow[]>;
  clinic(id: string): Promise<ClinicForMail | null>;
  /** Writes the (clinic, kind) row; false when it is already there. Throws KindNotAllowedError before 0011. */
  claim(clinicId: string, kind: LifecycleKind): Promise<boolean>;
  release(clinicId: string, kind: LifecycleKind): Promise<void>;
  /** The owner's address and whether they proved they read it (lib/dentvid/verify-email). */
  owner(ownerId: string): Promise<OwnerContact | null>;
  /** Marks the clinic opted out; false when there is no such clinic. */
  optOut(clinicId: string, at: Date): Promise<boolean>;
  /** A long-lived https URL for an image in the private bucket (the clinic's logo), or null. */
  imageUrl?(path: string): Promise<string | null>;
  weekStats?(clinicId: string, week: string): Promise<WeekStats>;
  monthStats?(clinicId: string, from: Date, to: Date): Promise<MonthStats | null>;
}

const H = 3600_000;

/** The activation sequence: hours since the clinic step. Windows do not overlap. */
export const SEQUENCE: { kind: NudgeKind; afterH: number; untilH: number }[] = [
  { kind: "nudge_start", afterH: 2, untilH: 24 },
  { kind: "nudge_preview", afterH: 24, untilH: 72 },
  { kind: "nudge_objections", afterH: 72, untilH: 7 * 24 },
];
/** Two activation emails are never closer than this. */
export const GAP_H = 20;
/** Kept for callers: the sequence's bounds. */
export const NUDGE_RULES = { firstAfterH: SEQUENCE[0].afterH, lastUntilH: SEQUENCE[SEQUENCE.length - 1].untilH, gapH: GAP_H } as const;

export const isTestEmail = (email: string) => /^e2e-/i.test(email.trim());

/** The clinic's zone (profile.timezone wins, else its country's, else UTC). */
export const zoneOf = (c: Pick<ClinicForMail, "profile">) => clinicTimeZone(c.profile?.country, c.profile?.timezone);

/**
 * Which activation email is due now for each clinic. Pure — the scheduler's
 * whole decision.
 */
export function dueNudges(clinics: ClinicForMail[], logs: LogRow[], now: Date): { clinicId: string; kind: NudgeKind }[] {
  const t = now.getTime();
  const sent = new Map<string, Map<string, number>>();
  for (const l of logs) {
    if (!sent.has(l.clinic_id)) sent.set(l.clinic_id, new Map());
    sent.get(l.clinic_id)!.set(l.kind, Date.parse(l.sent_at));
  }
  const out: { clinicId: string; kind: NudgeKind }[] = [];
  for (const c of clinics) {
    if (c.plan !== "trial" || c.email_opt_out_at) continue;
    const created = Date.parse(c.created_at);
    if (!Number.isFinite(created)) continue;
    const age = (t - created) / H;
    const i = SEQUENCE.findIndex((s) => age >= s.afterH && age < s.untilH);
    if (i < 0) continue;
    const step = SEQUENCE[i];
    const mine = sent.get(c.id) ?? new Map<string, number>();
    if (mine.has(step.kind)) continue;
    // Never go back: once a later step went out, earlier ones are done.
    if (SEQUENCE.slice(i + 1).some((s) => mine.has(s.kind))) continue;
    const last = Math.max(-Infinity, ...SEQUENCE.map((s) => mine.get(s.kind) ?? -Infinity));
    if (Number.isFinite(last) && (t - last) / H < GAP_H) continue;
    if (!inSendWindow(now, zoneOf(c))) continue;
    out.push({ clinicId: c.id, kind: step.kind });
  }
  return out;
}

export type LifecycleConfig = {
  enabled: boolean;
  /** Public DentVideo base, e.g. https://dentvideo.com. */
  base: string;
  /** Origin the /api routes answer on. */
  apiOrigin: string;
  secret: string | null;
  maxPerRun: number;
};

type Env = Record<string, string | undefined>;

/** The lowest self-serve monthly list price ("plans from …"). */
export function lowestMonthlyUsd(): number {
  return Math.min(...DV_SELF_SERVE_TIERS.map((t) => DV_PRICES_USD[t].month).filter((p): p is number => typeof p === "number"));
}

export function lifecycleConfig(env: Env = process.env): LifecycleConfig {
  const v = env.DENTVIDEO_LIFECYCLE_EMAILS?.trim().toLowerCase();
  const base = dvBaseUrl(env) || "https://dentvideo.com";
  let apiOrigin = "https://dentvideo.com";
  try {
    apiOrigin = new URL(base).origin;
  } catch {
    /* keep the default */
  }
  return {
    enabled: !(v === "0" || v === "false" || v === "off"),
    base: /^https?:\/\//.test(base) ? base : "https://dentvideo.com",
    apiOrigin,
    secret: unsubscribeSecret(env),
    maxPerRun: Math.max(1, Math.min(500, Number(env.DENTVIDEO_LIFECYCLE_MAX_PER_RUN) || 50)),
  };
}

export function unsubscribeUrl(cfg: Pick<LifecycleConfig, "apiOrigin" | "secret">, clinicId: string): string | null {
  if (!cfg.secret) return null;
  return `${cfg.apiOrigin}/api/dentvideo/unsubscribe?t=${encodeURIComponent(unsubscribeToken(clinicId, cfg.secret))}`;
}

/** RFC 8058 one-click unsubscribe, plus a mailto for clients that only do that. */
export function listUnsubscribeHeaders(url: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${url}>, <mailto:${CONTACT_EMAIL}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** The clinic's logo and colour for the email, when it has them. */
async function brandOf(store: LifecycleStore, clinic: ClinicForMail): Promise<Brand> {
  let logoUrl: string | null = null;
  if (clinic.logo_path && store.imageUrl) logoUrl = await store.imageUrl(clinic.logo_path).catch(() => null);
  return { name: clinic.profile?.name ?? "", logoUrl, color: clinic.profile?.brandColor ?? null };
}

export function renderNudge(cfg: LifecycleConfig, clinic: ClinicForMail, kind: NudgeKind, unsubUrl: string, brand?: Brand): Rendered | null {
  const { lang } = lifecycleText(clinic.profile?.language);
  const base = { language: lang, clinicName: clinic.profile?.name ?? "", unsubscribeUrl: unsubUrl, brand };
  const preview = `${cfg.base}/start?step=preview&lang=${lang}`;
  const plan = `${cfg.base}/start?step=plan&lang=${lang}`;
  switch (kind) {
    case "nudge_start":
      return startEmail({ ...base, url: preview });
    case "nudge_preview": {
      // The same picks the live preview makes for this clinic, in its own language.
      const titles = pickPreviews(clinic.profile?.services ?? [], clinic.profile?.language ?? lang).map((e) => e.title);
      return sampleEmail({ ...base, url: preview, titles });
    }
    case "nudge_objections":
      return objectionsEmail({ ...base, url: plan, fromUsd: lowestMonthlyUsd() });
    case "nudge_offer":
      // The former founding offer: no longer sent.
      return null;
  }
}

export type Sender = (to: string, msg: Rendered, opts: SendOptions) => Promise<boolean>;

export type RunDeps = {
  store: LifecycleStore;
  send: Sender;
  /** The global hourly cap: false once this hour's budget is spent. */
  allow: () => Promise<boolean>;
  now?: Date;
  config: LifecycleConfig;
};

export type RunResult = {
  due: number;
  sent: number;
  failed: number;
  skipped: Record<string, number>;
  stopped?: "disabled" | "no unsubscribe secret" | "migration missing" | "hourly cap" | "run cap";
};

const warned = new Set<string>();
function warnOnce(key: string, msg: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
}

const PERIOD = /^(.*?)_(\d{4})_(\d{2})(?:_(\d{2}))?$/;

/** "nudge_post_2026_11_09" → "nudge_post"; "nudge_start" stays. */
export const baseKind = (kind: string) => PERIOD.exec(kind)?.[1] ?? kind;

/**
 * Resend's idempotency key, in the shape email.ts emailLogFromKey reads:
 * "dentvideo-<kind>-<clinic>" or, for a periodic kind, "dentvideo-<kind>-<clinic>-<YYYY-MM-DD>".
 */
export function idempotencyKey(kind: string, clinicId: string): string {
  const m = PERIOD.exec(kind);
  return m ? `dentvideo-${m[1]}-${clinicId}-${m[2]}-${m[3]}-${m[4] ?? "01"}` : `dentvideo-${kind}-${clinicId}`;
}

type Job = { clinic: ClinicForMail; kind: LifecycleKind; render: (brand: Brand, unsub: string) => Rendered | null; stillDue: (c: ClinicForMail) => string | null };

/** The shared send path: re-check, owner checks, caps, claim, render, send, release on failure. */
async function deliver(deps: RunDeps, res: RunResult, job: Job): Promise<"next" | "stop"> {
  const { store, config: cfg } = deps;
  const skip = (why: string) => (res.skipped[why] = (res.skipped[why] ?? 0) + 1);
  if (res.sent + res.failed >= cfg.maxPerRun) {
    res.stopped = "run cap";
    return "stop";
  }
  // Re-read: the clinic may have paid, opted out or been deleted since the list was made.
  const clinic = await store.clinic(job.clinic.id);
  if (!clinic) return skip("deleted"), "next";
  const why = job.stillDue(clinic);
  if (why) return skip(why), "next";
  if (clinic.email_opt_out_at) return skip("opted out"), "next";
  const owner = await store.owner(clinic.owner_id);
  if (!owner?.email) return skip("no email"), "next";
  if (isTestEmail(owner.email)) return skip("test account"), "next";
  // Not claimed: once the owner confirms the address, the email is still due.
  if (!owner.verified) return skip("unverified"), "next";
  if (!(await deps.allow())) {
    res.stopped = "hourly cap";
    return "stop";
  }
  try {
    if (!(await store.claim(clinic.id, job.kind))) return skip("already sent"), "next";
  } catch (e) {
    if (e instanceof KindNotAllowedError) {
      warnOnce(`kind:${baseKind(job.kind)}`, e.message);
      return skip("migration 0011 missing"), "next";
    }
    throw e;
  }
  const unsub = unsubscribeUrl(cfg, clinic.id)!;
  const msg = job.render(await brandOf(store, clinic), unsub);
  if (!msg) {
    await store.release(clinic.id, job.kind).catch(() => {});
    return skip("nothing to say"), "next";
  }
  const { lang } = lifecycleText(clinic.profile?.language);
  const ok = await deps.send(owner.email, msg, {
    headers: listUnsubscribeHeaders(unsub),
    idempotencyKey: idempotencyKey(job.kind, clinic.id),
    log: { clinicId: clinic.id, kind: baseKind(job.kind), language: lang },
  });
  if (ok) res.sent++;
  else {
    res.failed++;
    await store.release(clinic.id, job.kind).catch(() => {});
  }
  return "next";
}

/** One pass of the hourly job over unpaid clinics: find due activation emails, re-check each clinic, send. */
export async function runNudges(deps: RunDeps): Promise<RunResult> {
  const { store, config: cfg } = deps;
  const now = deps.now ?? new Date();
  const res: RunResult = { due: 0, sent: 0, failed: 0, skipped: {} };
  if (!cfg.enabled) return { ...res, stopped: "disabled" };
  if (!cfg.secret) {
    warnOnce("secret", "dentvideo lifecycle: no DENTVIDEO_UNSUBSCRIBE_SECRET / WORKER_INTERNAL_TOKEN — reminders are not sent");
    return { ...res, stopped: "no unsubscribe secret" };
  }
  try {
    const clinics = await store.trialClinics(new Date(now.getTime() - NUDGE_RULES.lastUntilH * H), new Date(now.getTime() - NUDGE_RULES.firstAfterH * H), 300);
    const logs = clinics.length ? await store.logs(clinics.map((c) => c.id)) : [];
    const due = dueNudges(clinics, logs, now);
    res.due = due.length;
    for (const d of due) {
      const clinic = clinics.find((c) => c.id === d.clinicId)!;
      const step = await deliver(deps, res, {
        clinic,
        kind: d.kind,
        stillDue: (c) => (c.plan !== "trial" ? "paid" : null),
        render: (brand, unsub) => renderNudge(cfg, clinic, d.kind, unsub, brand),
      });
      if (step === "stop") break;
    }
  } catch (e) {
    if (e instanceof MissingSchemaError) {
      warnOnce("schema", e.message);
      return { ...res, stopped: "migration missing" };
    }
    throw e;
  }
  return res;
}

/* ----------------------------------------------------------- paying clinics */

/** Days before a week's videos may be nudged about: give the dentist time first. */
export const POST_NUDGE_AFTER_H = 48;
/** Thursday (0 = Sunday) in the clinic's zone. */
export const POST_NUDGE_WEEKDAY = 4;

const periodKind = (prefix: string, ...parts: (number | string)[]) => `${prefix}_${parts.map((p) => String(p).padStart(2, "0")).join("_")}`;

/** Which paying-clinic email (if any) is due for one clinic now. Pure. */
export function duePaying(clinic: ClinicForMail, sentKinds: Set<string>, now: Date): { kind: string; type: "post"; week: string } | { kind: string; type: "monthly"; year: number; month: number } | null {
  if (clinic.plan !== "active" || clinic.email_opt_out_at) return null;
  const tz = zoneOf(clinic);
  if (!inSendWindow(now, tz)) return null;
  const local = localTime(now, tz);
  // Monthly summary: first four days of the month, on a weekday, for a clinic that paid before last month ended.
  if (local.day <= 4 && local.weekday >= 1 && local.weekday <= 5) {
    const year = local.month === 1 ? local.year - 1 : local.year;
    const month = local.month === 1 ? 12 : local.month - 1;
    const kind = periodKind("monthly", year, month);
    const monthEnd = Date.UTC(local.year, local.month - 1, 1);
    if (!sentKinds.has(kind) && Date.parse(clinic.created_at) < monthEnd - 7 * 24 * H) return { kind, type: "monthly", year, month };
  }
  if (local.weekday === POST_NUDGE_WEEKDAY) {
    const week = weekOf(now);
    const kind = periodKind("nudge_post", ...week.split("-"));
    if (!sentKinds.has(kind)) return { kind, type: "post", week };
  }
  return null;
}

/** One pass of the hourly job over paying clinics: the weekly posting nudge and the monthly summary. */
export async function runPaying(deps: RunDeps): Promise<RunResult> {
  const { store, config: cfg } = deps;
  const now = deps.now ?? new Date();
  const res: RunResult = { due: 0, sent: 0, failed: 0, skipped: {} };
  const skip = (why: string) => (res.skipped[why] = (res.skipped[why] ?? 0) + 1);
  if (!cfg.enabled) return { ...res, stopped: "disabled" };
  if (!cfg.secret) return { ...res, stopped: "no unsubscribe secret" };
  if (!store.activeClinics || !store.weekStats || !store.monthStats) return res;
  try {
    const clinics = await store.activeClinics(1000);
    const logs = clinics.length ? await store.logs(clinics.map((c) => c.id)) : [];
    const byClinic = new Map<string, Set<string>>();
    for (const l of logs) (byClinic.get(l.clinic_id) ?? byClinic.set(l.clinic_id, new Set()).get(l.clinic_id)!).add(l.kind);
    const app = `${cfg.base}/app`;
    for (const clinic of clinics) {
      const due = duePaying(clinic, byClinic.get(clinic.id) ?? new Set(), now);
      if (!due) continue;
      const { lang } = lifecycleText(clinic.profile?.language);
      const base = { language: lang, clinicName: clinic.profile?.name ?? "", url: app };
      let render: Job["render"];
      if (due.type === "post") {
        const w = await store.weekStats(clinic.id, due.week);
        if (w.shared === null) {
          skip("shares unknown");
          continue;
        }
        if (w.shared > 0 || w.approved + w.pending === 0) continue;
        if (!w.firstReadyAt || now.getTime() - Date.parse(w.firstReadyAt) < POST_NUDGE_AFTER_H * H) continue;
        render = (brand, unsub) => notPostedEmail({ ...base, unsubscribeUrl: unsub, brand, approved: w.approved, pending: w.pending });
      } else {
        const stats = await store.monthStats(clinic.id, new Date(Date.UTC(due.year, due.month - 1, 1)), new Date(Date.UTC(due.year, due.month, 1)));
        if (!stats || stats.made === 0) continue;
        render = (brand, unsub) => monthlyEmail({ ...base, unsubscribeUrl: unsub, brand, year: due.year, month: due.month, stats });
      }
      res.due++;
      const step = await deliver(deps, res, { clinic, kind: due.kind, stillDue: (c) => (c.plan !== "active" ? "not active" : null), render });
      if (step === "stop") break;
    }
  } catch (e) {
    if (e instanceof MissingSchemaError) {
      warnOnce("schema", e.message);
      return { ...res, stopped: "migration missing" };
    }
    throw e;
  }
  return res;
}

/* --------------------------------------------------------- transactional */

export type WelcomeResult = "sent" | "already sent" | "no clinic" | "no email" | "test account" | "unverified" | "disabled" | "failed" | "migration missing";

/** The welcome after the first payment. Once per clinic, whatever the webhook does (retries, re-activation). */
export async function sendWelcome(deps: Omit<RunDeps, "allow">, clinicId: string): Promise<WelcomeResult> {
  const { store, config: cfg } = deps;
  if (!cfg.enabled) return "disabled";
  try {
    const clinic = await store.clinic(clinicId);
    if (!clinic) return "no clinic";
    const owner = await store.owner(clinic.owner_id);
    if (!owner?.email) return "no email";
    const email = owner.email;
    if (isTestEmail(email)) return "test account";
    if (!owner.verified) return "unverified";
    if (!(await store.claim(clinic.id, "welcome"))) return "already sent";
    const { lang } = lifecycleText(clinic.profile?.language);
    const msg = welcomeEmail({ language: lang, clinicName: clinic.profile?.name ?? "", appUrl: `${cfg.base}/app`, brand: await brandOf(store, clinic) });
    const ok = await deps.send(email, msg, { idempotencyKey: `dentvideo-welcome-${clinic.id}` });
    if (!ok) {
      await store.release(clinic.id, "welcome").catch(() => {});
      return "failed";
    }
    return "sent";
  } catch (e) {
    if (e instanceof MissingSchemaError) {
      warnOnce("schema", e.message);
      return "migration missing";
    }
    throw e;
  }
}

export type PaymentMailResult = WelcomeResult | "deduped";

/**
 * "Your payment didn't go through": to the clinic, in its language, on
 * payment.failed / subscription.on_hold. Transactional (sent even after an
 * unsubscribe from reminders, and at any hour: the clinic needs to know).
 * `claim` is a once-per-incident key (Redis SET NX); without a store it
 * returns true and the email goes (a Dodo retry of the same event is already
 * deduplicated by the webhook replay guard).
 */
export async function sendPaymentProblem(
  deps: Omit<RunDeps, "allow"> & { claim: (key: string) => Promise<boolean> },
  clinicId: string,
  kind: PaymentProblemKind,
  fix: PaymentFix,
): Promise<PaymentMailResult> {
  const { store, config: cfg } = deps;
  if (!cfg.enabled) return "disabled";
  try {
    const clinic = await store.clinic(clinicId);
    if (!clinic) return "no clinic";
    const owner = await store.owner(clinic.owner_id);
    if (!owner?.email) return "no email";
    if (isTestEmail(owner.email)) return "test account";
    if (!owner.verified) return "unverified";
    if (!(await deps.claim(`dv:billmail:${clinic.id}:${kind}`))) return "deduped";
    const { lang } = lifecycleText(clinic.profile?.language);
    const msg = paymentProblemEmail({ language: lang, clinicName: clinic.profile?.name ?? "", kind, fix, appUrl: `${cfg.base}/app`, brand: await brandOf(store, clinic) });
    const day = (deps.now ?? new Date()).toISOString().slice(0, 10);
    const ok = await deps.send(owner.email, msg, { idempotencyKey: `dentvideo-payment-${kind}-${clinic.id}-${day}` });
    return ok ? "sent" : "failed";
  } catch (e) {
    if (e instanceof MissingSchemaError) {
      warnOnce("schema", e.message);
      return "migration missing";
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Liman (Supabase) store

type PgError = { code?: string; message?: string } | null;

/** 0005 not applied: an unknown column or table, as Postgres or PostgREST reports it. */
export const isMissingSchema = (e: PgError) =>
  !!e &&
  (e.code === "42703" ||
    e.code === "42P01" ||
    e.code === "PGRST204" ||
    e.code === "PGRST205" ||
    /column .* does not exist|relation .* does not exist|Could not find the .* (column|table)/i.test(e.message ?? ""));

const CLINIC_COLS = "id, owner_id, profile, plan, created_at, email_opt_out_at, logo_path";
/** A logo link in an email has to outlive the inbox: 30 days (it is the clinic's public logo, nothing private). */
export const EMAIL_IMAGE_TTL_S = 30 * 24 * 3600;

export function supabaseLifecycleStore(db: SupabaseClient): LifecycleStore {
  const fail = (what: string, e: PgError): never => {
    if (isMissingSchema(e)) throw new MissingSchemaError(what);
    throw new Error(`dentvideo lifecycle: ${what}: ${e?.message ?? "unknown error"}`);
  };
  return {
    async trialClinics(after, before, limit) {
      const { data, error } = await db
        .from("dentvid_clinics")
        .select(CLINIC_COLS)
        .eq("plan", "trial")
        .is("email_opt_out_at", null)
        .gte("created_at", after.toISOString())
        .lte("created_at", before.toISOString())
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) fail("dentvid_clinics.email_opt_out_at", error);
      return (data ?? []) as ClinicForMail[];
    },
    async activeClinics(limit) {
      const { data, error } = await db.from("dentvid_clinics").select(CLINIC_COLS).eq("plan", "active").is("email_opt_out_at", null).order("created_at", { ascending: true }).limit(limit);
      if (error) fail("dentvid_clinics.email_opt_out_at", error);
      return (data ?? []) as ClinicForMail[];
    },
    async logs(ids) {
      const out: LogRow[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await db.from("dentvid_email_log").select("clinic_id, kind, sent_at").in("clinic_id", ids.slice(i, i + 200));
        if (error) fail("dentvid_email_log", error);
        out.push(...((data ?? []) as LogRow[]));
      }
      return out;
    },
    async clinic(id) {
      const { data, error } = await db.from("dentvid_clinics").select(CLINIC_COLS).eq("id", id).maybeSingle();
      if (error) fail("dentvid_clinics.email_opt_out_at", error);
      return (data as ClinicForMail | null) ?? null;
    },
    async claim(clinicId, kind) {
      const { error } = await db.from("dentvid_email_log").insert({ clinic_id: clinicId, kind });
      if (!error) return true;
      if (error.code === "23505") return false;
      if (error.code === "23514") throw new KindNotAllowedError(kind);
      return fail("dentvid_email_log", error);
    },
    async release(clinicId, kind) {
      await db.from("dentvid_email_log").delete().eq("clinic_id", clinicId).eq("kind", kind);
    },
    async owner(ownerId) {
      const { data, error } = await db.auth.admin.getUserById(ownerId);
      if (error || !data?.user?.email) return null;
      return { email: data.user.email, verified: isEmailVerified(data.user) };
    },
    async optOut(clinicId, at) {
      const { data, error } = await db.from("dentvid_clinics").update({ email_opt_out_at: at.toISOString() }).eq("id", clinicId).select("id");
      if (error) fail("dentvid_clinics.email_opt_out_at", error);
      return (data ?? []).length > 0;
    },
    async imageUrl(path) {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(path, EMAIL_IMAGE_TTL_S);
      return data?.signedUrl && /^https:\/\//.test(data.signedUrl) ? data.signedUrl : null;
    },
    async weekStats(clinicId, week) {
      const { data: items } = await db
        .from("dentvid_items")
        .select("approval, created_at")
        .eq("clinic_id", clinicId)
        .eq("week_of", week)
        .eq("kind", "generated")
        .in("status", ["ready", "flagged"]);
      const rows = (items ?? []) as { approval: string; created_at: string }[];
      const since = new Date(Date.parse(`${week}T00:00:00Z`) - 2 * 24 * H).toISOString();
      const { count, error } = await db.from("dentvid_events").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("name", "video_shared").gte("created_at", since);
      return {
        approved: rows.filter((r) => r.approval === "approved").length,
        pending: rows.filter((r) => r.approval === "pending").length,
        shared: error ? null : (count ?? 0),
        firstReadyAt: rows.map((r) => r.created_at).sort()[0] ?? null,
      };
    },
    async monthStats(clinicId, from, to) {
      const day = (d: Date) => d.toISOString().slice(0, 10);
      const { data: items, error } = await db
        .from("dentvid_items")
        .select("approval")
        .eq("clinic_id", clinicId)
        .eq("kind", "generated")
        .in("status", ["ready", "flagged"])
        .gte("week_of", day(from))
        .lt("week_of", day(to));
      if (error) return null;
      const rows = (items ?? []) as { approval: string }[];
      const { count, error: evErr } = await db
        .from("dentvid_events")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("name", "video_shared")
        .gte("created_at", from.toISOString())
        .lt("created_at", to.toISOString());
      return { made: rows.length, approved: rows.filter((r) => r.approval === "approved").length, shared: evErr ? 0 : (count ?? 0) };
    },
  };
}
