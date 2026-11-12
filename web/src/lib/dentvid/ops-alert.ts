/**
 * Owner alerts and the daily digest — ONE helper shared by the web app and
 * the worker. This file exists twice, byte for byte:
 *
 *   worker/src/dentvid/ops-alert.ts      (canonical)
 *   web/src/lib/dentvid/ops-alert.ts     (copy; a web test fails if they differ)
 *
 * It has no imports on purpose: each side passes in its own counter store
 * (Redis), mail transport and clock, so the rules — what an alert says, one
 * email per incident key per day, never a storm, the kill switch — are the
 * same wherever an alert is raised, and are unit-tested with fakes.
 *
 * Every alert answers four questions, in this order: what happened, which
 * clinic (name + id), what the system already did, and what — if anything —
 * the owner should do. Subjects are Turkish + English so they read at a
 * glance on a phone's lock screen.
 *
 * Kill switch: DENTVID_OWNER_ALERTS=off (also 0 / false) — alerts are only
 * logged, the digest is not sent. Recipient: OWNER_ALERT_EMAIL. Transport:
 * Resend (RESEND_API_KEY); without either, alerts are only logged.
 */

export type Env = Record<string, string | undefined>;

/** The slice of Redis the alerts need. Implemented over ioredis on each side, and in memory for tests. */
export interface OpsStore {
  /** SET key NX EX ttl — true when this call created the key. */
  setNx(key: string, ttlSec: number): Promise<boolean>;
  /** INCR key, setting its TTL — the new value. */
  incr(key: string, ttlSec: number): Promise<number>;
  /** Append to a capped list (newest last), setting its TTL. */
  push(key: string, value: string, ttlSec: number, max: number): Promise<void>;
  list(key: string): Promise<string[]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class MemoryOpsStore implements OpsStore {
  kv = new Map<string, string>();
  lists = new Map<string, string[]>();
  down = false;
  private check() {
    if (this.down) throw new Error("store down");
  }
  async setNx(key: string, _ttlSec?: number): Promise<boolean> {
    this.check();
    if (this.kv.has(key)) return false;
    this.kv.set(key, "1");
    return true;
  }
  async incr(key: string, _ttlSec?: number): Promise<number> {
    this.check();
    const n = Number(this.kv.get(key) ?? "0") + 1;
    this.kv.set(key, String(n));
    return n;
  }
  async push(key: string, value: string, _ttl: number, max: number): Promise<void> {
    this.check();
    const l = [...(this.lists.get(key) ?? []), value];
    this.lists.set(key, l.slice(-max));
  }
  async list(key: string): Promise<string[]> {
    this.check();
    return [...(this.lists.get(key) ?? [])];
  }
  async get(key: string): Promise<string | null> {
    this.check();
    return this.kv.get(key) ?? null;
  }
  async set(key: string, value: string, _ttlSec?: number): Promise<void> {
    this.check();
    this.kv.set(key, value);
  }
  async del(key: string): Promise<void> {
    this.check();
    this.kv.delete(key);
    this.lists.delete(key);
  }
}

/* ------------------------------------------------------------------ config */

export function alertsEnabled(env: Env): boolean {
  const v = (env.DENTVID_OWNER_ALERTS ?? "").trim().toLowerCase();
  return !(v === "off" || v === "0" || v === "false" || v === "no");
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : d;
};

/** Spike thresholds (per clock hour unless noted). Env overrides in parentheses. */
export function thresholds(env: Env) {
  return {
    /** Dodo signature failures in one hour before "someone is poking the webhook / the secret changed" (DENTVID_ALERT_WEBHOOK_SIG_PER_HOUR). */
    webhookSigPerHour: num(env.DENTVID_ALERT_WEBHOOK_SIG_PER_HOUR, 5),
    /** Resend send failures in one hour (DENTVID_ALERT_EMAIL_FAIL_PER_HOUR). */
    emailFailPerHour: num(env.DENTVID_ALERT_EMAIL_FAIL_PER_HOUR, 3),
    /** Video render failures in one hour, across clinics (DENTVID_ALERT_RENDER_FAIL_PER_HOUR). */
    renderFailPerHour: num(env.DENTVID_ALERT_RENDER_FAIL_PER_HOUR, 5),
    /** Server errors (5xx) in one hour (DENTVID_ALERT_5XX_PER_HOUR). */
    serverErrorPerHour: num(env.DENTVID_ALERT_5XX_PER_HOUR, 10),
    /** Most alert emails in one clock hour; past it, one "muted" note and silence until the next hour (DENTVID_ALERT_MAX_PER_HOUR). */
    maxPerHour: num(env.DENTVID_ALERT_MAX_PER_HOUR, 8),
    /** First week not in the library this many minutes after payment → re-queued automatically (DENTVID_FIRST_WEEK_REQUEUE_MIN). */
    firstWeekRequeueMin: num(env.DENTVID_FIRST_WEEK_REQUEUE_MIN, 45),
    /** …and the owner is told after this many minutes (DENTVID_FIRST_WEEK_ALERT_MIN). */
    firstWeekAlertMin: num(env.DENTVID_FIRST_WEEK_ALERT_MIN, 120),
  };
}

/* ------------------------------------------------------------------ alerts */

export type Severity = "urgent" | "warning" | "good";

export type ClinicRef = {
  id: string;
  name?: string | null;
  country?: string | null;
  tier?: string | null;
  email?: string | null;
};

export type OwnerAlert = {
  /** Incident key: one email per key per UTC day. No clinic data beyond ids. */
  key: string;
  severity: Severity;
  titleTr: string;
  titleEn: string;
  clinic?: ClinicRef;
  /** What happened. */
  what: string[];
  /** What the system already did. */
  done: string[];
  /** What the owner should do; empty → "nothing". */
  todo: string[];
  /** Small label/value table (tier, error, counts). */
  facts?: [string, string][];
};

const SEVERITY: Record<Severity, { tr: string; en: string; color: string; bg: string }> = {
  urgent: { tr: "ACİL", en: "URGENT", color: "#8a1f1f", bg: "#fbeaea" },
  warning: { tr: "DİKKAT", en: "HEADS-UP", color: "#7a4b00", bg: "#fdf1dc" },
  good: { tr: "GÜZEL HABER", en: "GOOD NEWS", color: "#0f5c5c", bg: "#e6f2ef" },
};

const DAY = 86_400;
const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const hourOf = (d: Date) => d.toISOString().slice(0, 13);

export const clinicLabel = (c: ClinicRef) => (c.name?.trim() ? `${c.name.trim()} (${c.id})` : c.id);
const short = (s: string, n = 300) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Error text safe to put in an email: one line, short, no bearer tokens or keys. */
export function cleanError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  return short(
    raw
      .replace(/\s+/g, " ")
      .replace(/(bearer\s+)[\w.-]+/gi, "$1***")
      .replace(/\b(sk|re|pk|rk)_[A-Za-z0-9_-]{8,}/g, "$1_***")
      .trim(),
    240,
  );
}

export function alertSubject(a: OwnerAlert): string {
  const s = SEVERITY[a.severity];
  const who = a.clinic?.name?.trim() ? ` — ${a.clinic.name.trim()}` : "";
  return short(`[DentVideo] ${s.tr}: ${a.titleTr} / ${s.en}: ${a.titleEn}${who}`, 180);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const ALERT_FOOTER = "One email per incident per day. Kill switch: DENTVID_OWNER_ALERTS=off. See docs/SECURITY.md → Owner alerts.";

function shell(title: string, preheader: string, inner: string, footer = ALERT_FOOTER): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:${FONT};color:#14211f;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf7f2"><tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td style="padding:0 4px 12px;font-size:17px;font-weight:700;color:#14211f">Dent<span style="color:#0f5c5c">Video</span> <span style="font-weight:500;color:#5b6a67;font-size:13px">ops</span></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e8e1d5;border-radius:14px;padding:20px 18px">${inner}</td></tr>
<tr><td style="padding:12px 4px 0;font-size:11px;line-height:16px;color:#5b6a67">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

function section(trTitle: string, enTitle: string, lines: string[]): string {
  if (!lines.length) return "";
  const items = lines.map((l) => `<li style="margin:0 0 4px">${esc(l)}</li>`).join("");
  return `<p style="margin:16px 0 4px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5b6a67">${esc(trTitle)} · ${esc(enTitle)}</p><ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:22px">${items}</ul>`;
}

function factsTable(rows: [string, string][]): string {
  if (!rows.length) return "";
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td valign="top" style="padding:4px 10px 4px 0;font-size:13px;color:#5b6a67;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0;font-size:14px;color:#14211f;word-break:break-word">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 0;width:100%;background:#faf7f2;border-radius:10px"><tr><td style="padding:8px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${tr}</table></td></tr></table>`;
}

function clinicFacts(c: ClinicRef | undefined): [string, string][] {
  if (!c) return [];
  return [
    ["Klinik / Clinic", c.name?.trim() || "(no name)"],
    ["ID", c.id],
    ...(c.tier ? ([["Plan", c.tier]] as [string, string][]) : []),
    ...(c.country ? ([["Ülke / Country", c.country]] as [string, string][]) : []),
    ...(c.email ? ([["E-posta / Email", c.email]] as [string, string][]) : []),
  ];
}

export function renderAlert(a: OwnerAlert): { subject: string; text: string; html: string } {
  const subject = alertSubject(a);
  const s = SEVERITY[a.severity];
  const todo = a.todo.length ? a.todo : ["Nothing — this is for your information."];
  const facts = [...clinicFacts(a.clinic), ...(a.facts ?? [])];
  const text = [
    `${s.tr} / ${s.en}: ${a.titleTr} / ${a.titleEn}`,
    "",
    "Ne oldu / What happened:",
    ...a.what.map((l) => `- ${l}`),
    ...(facts.length ? ["", ...facts.map(([k, v]) => `${k}: ${v}`)] : []),
    "",
    "Sistem ne yaptı / What the system already did:",
    ...(a.done.length ? a.done : ["Nothing automatic for this one."]).map((l) => `- ${l}`),
    "",
    "Senin yapman gereken / What you should do:",
    ...todo.map((l) => `- ${l}`),
    "",
    "—",
    "One email per incident per day. Kill switch: DENTVID_OWNER_ALERTS=off.",
  ].join("\n");
  const inner = [
    `<p style="margin:0"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${s.bg};color:${s.color};font-size:12px;font-weight:700;letter-spacing:.04em">${s.tr} · ${s.en}</span></p>`,
    `<h1 style="margin:10px 0 0;font-size:20px;line-height:26px;font-weight:700">${esc(a.titleTr)}</h1>`,
    `<p style="margin:2px 0 0;font-size:15px;line-height:21px;color:#3d4c49">${esc(a.titleEn)}</p>`,
    section("Ne oldu", "What happened", a.what),
    factsTable(facts),
    section("Sistem ne yaptı", "Already done", a.done.length ? a.done : ["Nothing automatic for this one."]),
    section("Senin yapman gereken", "What you should do", todo),
  ].join("");
  return { subject, text, html: shell(subject, a.what[0] ?? a.titleEn, inner) };
}

/* ------------------------------------------------------------------ delivery */

export type Mail = { subject: string; text: string; html: string };
export type MailSender = (msg: Mail) => Promise<boolean>;
export type DeliverResult = "sent" | "failed" | "deduped" | "muted" | "disabled" | "no_recipient";

export type AlertDeps = {
  store: OpsStore | null;
  send: MailSender;
  env?: Env;
  now?: () => Date;
  log?: (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => void;
};

/** In-process de-duplication when the store is unreachable (so Redis down ≠ storm). */
const localOnce = new Map<string, number>();
export function _resetLocalOnce() {
  localOnce.clear();
}

async function once(store: OpsStore | null, key: string, ttlSec: number, now: Date): Promise<boolean> {
  if (store) {
    try {
      return await store.setNx(key, ttlSec);
    } catch {
      // fall through to the in-process gate
    }
  }
  const until = localOnce.get(key) ?? 0;
  if (until > now.getTime()) return false;
  localOnce.set(key, now.getTime() + ttlSec * 1000);
  return true;
}

async function safe<T>(p: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await p();
  } catch {
    return fallback;
  }
}

export const ALERT_LOG_KEY = (day: string) => `dv:ops:alerts:${day}`;

/**
 * Send one alert to the owner unless: alerts are switched off; this incident
 * key was already sent today; or more than `maxPerHour` alerts went out this
 * clock hour (then one "muted" note, then silence until the next hour).
 * Every alert raised (sent or not) is logged for the daily digest. Never throws.
 */
export async function deliverAlert(deps: AlertDeps, a: OwnerAlert): Promise<DeliverResult> {
  const env = deps.env ?? {};
  const now = deps.now?.() ?? new Date();
  const log = deps.log ?? (() => {});
  const day = dayOf(now);
  try {
    log("warn", `owner alert: ${a.titleEn}`, { key: a.key, clinicId: a.clinic?.id, severity: a.severity });
    if (!alertsEnabled(env)) return "disabled";
    if (!(await once(deps.store, `dv:alert:${a.key}:${day}`, 2 * DAY, now))) return "deduped";
    if (deps.store) {
      const entry = JSON.stringify({ at: now.toISOString(), severity: a.severity, title: a.titleEn, key: a.key, clinic: a.clinic?.name ?? a.clinic?.id ?? null });
      await safe(() => deps.store!.push(ALERT_LOG_KEY(day), entry, 3 * DAY, 200), undefined);
    }
    const max = thresholds(env).maxPerHour;
    const sentThisHour = deps.store ? await safe(() => deps.store!.incr(`dv:alert:hour:${hourOf(now)}`, 2 * 3600), 0) : 0;
    if (sentThisHour > max) {
      if (sentThisHour === max + 1) {
        await deps.send(renderAlert(mutedAlert(max)));
      }
      log("error", "owner alert muted (hourly cap)", { key: a.key });
      return "muted";
    }
    const ok = await deps.send(renderAlert(a));
    return ok ? "sent" : "failed";
  } catch (e) {
    log("error", "owner alert failed", { key: a.key, err: (e as Error).message });
    return "failed";
  }
}

function mutedAlert(max: number): OwnerAlert {
  return {
    key: "muted",
    severity: "urgent",
    titleTr: "Çok fazla uyarı — bu saat sessize alındı",
    titleEn: "Too many alerts — muted for this hour",
    what: [`More than ${max} different alerts were raised within one hour. Something broad is probably wrong (database, Redis, OpenAI or the worker).`],
    done: ["Further alerts this hour are only logged (and counted in tomorrow's digest). Alerts resume next hour."],
    todo: ["Check the worker logs and /dentvideo/admin now."],
  };
}

/** A Resend transport to OWNER_ALERT_EMAIL. Never throws; false when it cannot send. */
export function resendSender(env: Env, fetchImpl: typeof fetch = fetch): MailSender & { configured: boolean } {
  const to = env.OWNER_ALERT_EMAIL?.trim();
  const key = env.RESEND_API_KEY?.trim();
  const from = env.DENTVIDEO_EMAIL_FROM || "DentVideo <hello@dentvideo.com>";
  const send = (async (msg: Mail) => {
    if (!to || !key) return false;
    try {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject: msg.subject, text: msg.text, html: msg.html }),
        signal: AbortSignal.timeout(15_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }) as MailSender & { configured: boolean };
  send.configured = !!to && !!key;
  return send;
}

/**
 * Count one event in this clock hour; true exactly when the count reaches
 * the threshold (so a spike raises one alert, not one per event).
 */
export async function countSpike(store: OpsStore | null, metric: string, threshold: number, now = new Date()): Promise<{ count: number; tripped: boolean }> {
  if (!store) return { count: 0, tripped: false };
  // Hourly buckets, kept two days: the spike check reads this hour, the digest the last 24.
  const count = await safe(() => store.incr(`dv:ops:count:${metric}:${hourOf(now)}`, 2 * DAY), 0);
  return { count, tripped: count === threshold };
}

/** The sum of a metric's hourly buckets over the 24 hours before `now`. */
export async function sumLastDay(store: OpsStore | null, metric: string, now = new Date()): Promise<number> {
  if (!store) return 0;
  let total = 0;
  for (let h = 0; h < 24; h++) {
    const v = await safe(() => store.get(`dv:ops:count:${metric}:${hourOf(new Date(now.getTime() - h * 3600_000))}`), null);
    total += Number(v ?? 0) || 0;
  }
  return total;
}

/** Alerts raised in the 24 hours before `now` (from the per-day logs deliverAlert keeps). */
export async function alertsLastDay(store: OpsStore | null, now = new Date()): Promise<{ at: string; severity: string; title: string; key: string; clinic: string | null }[]> {
  if (!store) return [];
  const since = now.getTime() - DAY * 1000;
  const days = [dayOf(new Date(since)), dayOf(now)].filter((d, i, a) => a.indexOf(d) === i);
  const out = [];
  for (const d of days) {
    for (const raw of await safe(() => store.list(ALERT_LOG_KEY(d)), [] as string[])) {
      try {
        const e = JSON.parse(raw) as { at: string; severity: string; title: string; key: string; clinic: string | null };
        if (Date.parse(e.at) >= since && Date.parse(e.at) <= now.getTime()) out.push(e);
      } catch {
        // ignore
      }
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

/* ------------------------------------------------------------- week state */

/**
 * What the clinic's library may say about this week's run, written by the
 * worker and read by the web app — never an error message:
 *   retrying  a run failed for a passing reason and is being retried
 *   delayed   it failed after every retry; the owner has been alerted
 */
export type WeekDelay = "retrying" | "delayed";
export const weekStateKey = (clinicId: string, week: string) => `dv:weekstate:${clinicId}:${week}`;

/* ------------------------------------------------------------ the alerts */

const tierLabel = (c: ClinicRef) => (c.tier ? c.tier : "unknown tier");

export const alerts = {
  weekFailed(a: { clinic: ClinicRef; week: string; attempts: number; error: string; permanent: boolean }): OwnerAlert {
    return {
      key: `week_failed:${a.clinic.id}:${a.week}`,
      severity: "urgent",
      titleTr: "Haftalık videolar üretilemedi",
      titleEn: "A paying clinic's week failed",
      clinic: a.clinic,
      what: [`The week of ${a.week} could not be made for this paying clinic${a.permanent ? " (a permanent error — retrying would not help)" : ` after ${a.attempts} attempts`}.`],
      facts: [["Error", a.error]],
      done: [
        a.permanent ? "Not retried: the error will not go away by itself." : `Retried automatically ${Math.max(0, a.attempts - 1)} time(s) with growing waits.`,
        "The clinic's library shows a calm “your videos are delayed, we're on it” note — no error text.",
        "No email went to the clinic.",
      ],
      todo: [
        "Look at the error above and the worker logs (job id week:" + a.clinic.id + ":" + a.week + ").",
        "When the cause is fixed, retry that job (BullMQ queue dentvid → failed → retry). The library updates itself and the clinic gets the usual “videos ready” email.",
        "If it will take more than a day, write the clinic a short note.",
      ],
    };
  },

  thinWeek(a: { clinic: ClinicRef; week: string; usable: number; wanted: number; reasons: string[] }): OwnerAlert {
    return {
      key: `thin_week:${a.clinic.id}:${a.week}`,
      severity: "warning",
      titleTr: "Eksik hafta teslim edildi",
      titleEn: "A thin week was delivered",
      clinic: a.clinic,
      what: [`Only ${a.usable} of ${a.wanted} videos were usable for the week of ${a.week}, even after re-attempts and extra topics.`],
      facts: a.reasons.slice(0, 4).map((r, i) => [`Reason ${i + 1}`, r] as [string, string]),
      done: ["Each failed video was re-attempted once, and extra topics were tried to fill the week.", "The usable videos are in the clinic's library; the clinic got the usual email."],
      todo: ["Look at the reasons. If it is the profile (an unusual service, language), check it in /dentvideo/admin.", "Optional: re-run the week for this clinic when fixed."],
    };
  },

  dispatchMissing(a: { week: string; activeClinics: number; jobs: number; missing: number; requeued: number; reason: string }): OwnerAlert {
    return {
      key: `dispatch:${a.week}`,
      severity: "urgent",
      titleTr: "Haftalık üretim başlamadı",
      titleEn: "Weekly dispatch did not run",
      what: [`At the Saturday 19:30 UTC check, ${a.activeClinics} paying clinic(s) should have the coming week's job, but ${a.missing} had none (${a.reason}).`],
      facts: [
        ["Week", a.week],
        ["Active clinics", String(a.activeClinics)],
        ["Jobs found", String(a.jobs)],
      ],
      done: [a.requeued ? `Queued the ${a.requeued} missing week(s) now (same job ids, so nothing doubles).` : "Could not queue the missing weeks (see the logs)."],
      todo: ["Check that the worker is running and its weekly scheduler exists (dentvid-monday, Saturday 18:00 UTC).", "Watch the batch over the weekend: every clinic is due by Monday 07:00 in its own time zone."],
    };
  },

  firstWeekLate(a: { clinic: ClinicRef; paidAt: string; minutes: number; requeued: boolean; jobState: string }): OwnerAlert {
    return {
      key: `first_week_late:${a.clinic.id}`,
      severity: "urgent",
      titleTr: "Yeni müşterinin ilk haftası gecikti",
      titleEn: "First week not delivered 2 h after payment",
      clinic: a.clinic,
      what: [`This clinic paid ${a.minutes} minutes ago (${a.paidAt.slice(0, 16).replace("T", " ")} UTC) and still has no videos.`],
      facts: [["Job state", a.jobState]],
      done: [
        a.requeued ? "The first week was re-queued automatically at 45 minutes (idempotent job id)." : "The job is still queued or running; it was not re-queued.",
        "The clinic sees “your first week is being made”, and a calm “taking longer than usual” note if it failed.",
      ],
      todo: ["Check the worker (is it up? is a long Monday queue ahead of it?).", `A brand-new customer is waiting — consider a short personal note${a.clinic.email ? ` to ${a.clinic.email}` : ""}.`],
    };
  },

  webhookSignatures(a: { count: number; threshold: number }): OwnerAlert {
    return {
      key: "webhook_sig",
      severity: "warning",
      titleTr: "Ödeme webhook imza hataları",
      titleEn: "Payment webhook signature failures",
      what: [`${a.count} Dodo webhook calls in the last hour had an invalid signature (threshold ${a.threshold}).`],
      done: ["They were refused (401) and changed nothing. Dodo retries real events for days."],
      todo: [
        "If you rotated the webhook secret in Dodo, update DODO_WEBHOOK_SECRET on the web app — until then real payments are not recorded.",
        "Otherwise it is probably noise from a scanner; nothing to do.",
      ],
    };
  },

  webhookError(a: { event: string; error: string; clinic?: ClinicRef }): OwnerAlert {
    return {
      key: `webhook_error:${a.event}`,
      severity: "urgent",
      titleTr: "Ödeme olayı işlenemedi",
      titleEn: "Payment webhook processing failed",
      clinic: a.clinic,
      what: [`A signed Dodo event (${a.event}) could not be processed.`],
      facts: [["Error", a.error]],
      done: ["Answered 5xx so Dodo retries it (with backoff, for days); a retry that succeeds fixes the plan by itself."],
      todo: ["Check the web app logs and Liman. If a clinic paid but still shows unpaid, set its plan by hand in /dentvideo/admin or replay the event from Dodo."],
    };
  },

  customerAtRisk(a: { clinic: ClinicRef; event: string; from: string; to: string; clinicEmailed?: boolean }): OwnerAlert {
    const failed = /failed|on_hold|past_due/.test(a.event);
    return {
      key: `at_risk:${a.clinic.id}:${a.event}`,
      severity: "warning",
      titleTr: failed ? "Müşteri ödemesi başarısız" : "Müşteri aboneliği durdu",
      titleEn: failed ? "Customer payment failed" : "Customer subscription stopped",
      clinic: a.clinic,
      what: [`Dodo sent ${a.event}: plan ${a.from} → ${a.to} (${tierLabel(a.clinic)}).`],
      done: [
        a.to === "active" ? "Nothing changed yet — the clinic keeps access through Dodo's grace period." : "The clinic keeps its videos; new weeks stop until it pays again.",
        a.clinicEmailed
          ? "The clinic was emailed what happened and how to update its card (in its language, once per incident); the app shows “update your payment” instead of the plan picker."
          : "No email was sent to the clinic by DentVideo (Dodo sends its own payment notices).",
      ],
      todo: failed
        ? [`Write a friendly note${a.clinic.email ? ` to ${a.clinic.email}` : ""}: their card may have expired; the billing portal link is in Settings.`]
        : [`Ask${a.clinic.email ? ` ${a.clinic.email}` : " the clinic"} why — one honest question often brings them back, and the answer is worth having.`],
    };
  },

  emailFailures(a: { count: number; threshold: number; lastError: string }): OwnerAlert {
    return {
      key: "email_failures",
      severity: "urgent",
      titleTr: "E-postalar gönderilemiyor",
      titleEn: "Emails are failing to send",
      what: [`${a.count} emails to clinics failed in the last hour (threshold ${a.threshold}).`],
      facts: [["Last error", a.lastError]],
      done: ["Lifecycle reminders release their claim and try again next hour; welcome emails are retried with the next Dodo retry or not at all.", "“Videos ready” emails are not retried — the videos are in the library either way."],
      todo: ["Check Resend (API key, domain verification, sending limits) at resend.com."],
    };
  },

  errorSpike(a: { kind: "render" | "5xx"; count: number; threshold: number; sample?: string }): OwnerAlert {
    const render = a.kind === "render";
    return {
      key: `spike:${a.kind}`,
      severity: "urgent",
      titleTr: render ? "Video üretim hataları arttı" : "Sunucu hataları arttı (5xx)",
      titleEn: render ? "Render failures spiking" : "Server errors (5xx) spiking",
      what: [`${a.count} ${render ? "video renders failed" : "requests failed with a server error"} in the last hour (threshold ${a.threshold}).`],
      facts: a.sample ? [[render ? "Last error" : "Last route", a.sample]] : [],
      done: render
        ? ["Each failed video is re-attempted once; weeks that fail are retried with backoff; thin weeks are topped up."]
        : ["Nothing automatic — each request failed for its user."],
      todo: render ? ["Check the worker logs: OpenAI / Pexels / storage / disk / memory."] : ["Check the web app logs (and Sentry) for the route above."],
    };
  },

  newPayingClinic(a: { clinic: ClinicRef; interval?: string | null; returning: boolean }): OwnerAlert {
    return {
      key: `new_paying:${a.clinic.id}`,
      severity: "good",
      titleTr: a.returning ? "Bir klinik geri döndü" : "Yeni ödeme yapan klinik",
      titleEn: a.returning ? "A clinic came back" : "New paying clinic",
      clinic: a.clinic,
      what: [`${a.clinic.name?.trim() || "A clinic"} ${a.returning ? "re-activated" : "just paid for"} DentVideo ${a.clinic.tier ?? ""}${a.interval ? ` (${a.interval}ly)` : ""}${a.clinic.country ? ` from ${a.clinic.country}` : ""}.`],
      done: ["Plan set to active, this week's videos queued, welcome email sent (once per clinic)."],
      todo: [`Say hello${a.clinic.email ? ` — ${a.clinic.email}` : ""}. A personal line from the founder in the first hour is remembered.`],
    };
  },

  duplicateSubscription(a: { clinic: ClinicRef; existing: string; existingStatus: string; duplicate: string; kept: string }): OwnerAlert {
    return {
      key: `dup_sub:${a.clinic.id}:${a.duplicate}`,
      severity: "urgent",
      titleTr: "Klinik iki kez abone oldu",
      titleEn: "A clinic has two live subscriptions",
      clinic: a.clinic,
      what: [`Subscription ${a.duplicate} became active while the clinic already had ${a.existing} (${a.existingStatus}). The clinic may be charged twice.`],
      facts: [
        ["Existing", `${a.existing} (${a.existingStatus})`],
        ["New", a.duplicate],
        ["Clinic now on", a.kept],
      ],
      done: ["Both subscriptions are recorded (dentvid_subscriptions); the clinic keeps one plan and nothing was cancelled automatically."],
      todo: [
        `In Dodo, cancel the subscription the clinic does not need and refund its charge${a.clinic.email ? `, then tell ${a.clinic.email}` : ""}.`,
        "If the clinic is now on the one you cancel, the next webhook moves it to the other live subscription by itself.",
      ],
    };
  },

  lateActivation(a: { clinic: ClinicRef; subscriptionId: string; event: string; status: string }): OwnerAlert {
    return {
      key: `late_activation:${a.clinic.id}:${a.subscriptionId}`,
      severity: "warning",
      titleTr: "Geç gelen ödeme olayı yok sayıldı",
      titleEn: "A late activation was ignored",
      clinic: a.clinic,
      what: [`Dodo sent ${a.event} for ${a.subscriptionId}, which we already recorded as ${a.status}. Without a newer timestamp (or a Dodo API check) it was not allowed to switch the clinic back on.`],
      done: ["The clinic's plan was left as it was."],
      todo: ["Check the subscription in Dodo. If it really is active again, set the clinic's plan by hand in /dentvideo/admin (or replay the event)."],
    };
  },

  billingDispute(a: { clinic: ClinicRef; event: string; paymentId?: string | null; paused: boolean }): OwnerAlert {
    const dispute = a.event.startsWith("dispute.");
    return {
      key: `billing_dispute:${a.clinic.id}:${a.event}:${a.paymentId ?? ""}`,
      severity: dispute ? "urgent" : "warning",
      titleTr: dispute ? "Ödemeye itiraz (chargeback)" : "İade",
      titleEn: dispute ? "Chargeback / payment dispute" : "Refund",
      clinic: a.clinic,
      what: [`Dodo sent ${a.event}${a.paymentId ? ` for payment ${a.paymentId}` : ""} (${tierLabel(a.clinic)}).`],
      done: [a.paused ? "The clinic was paused: no new weeks are made while the payment is disputed." : "The clinic's plan was not changed."],
      todo: dispute
        ? ["Answer the dispute in Dodo with the delivery evidence (videos made, emails sent).", "If the dispute is withdrawn or won and the clinic should carry on, re-activate its plan in /dentvideo/admin."]
        : ["Check the refund in Dodo matches what you agreed with the clinic."],
    };
  },

  accessLapsed(a: { clinic: ClinicRef; renewsAt: string; dodoStatus?: string | null }): OwnerAlert {
    return {
      key: `lapsed:${a.clinic.id}:${a.renewsAt.slice(0, 10)}`,
      severity: "warning",
      titleTr: "Yenileme gelmedi, erişim durduruldu",
      titleEn: "No renewal arrived — access paused",
      clinic: a.clinic,
      what: [`The paid period ended ${a.renewsAt.slice(0, 16).replace("T", " ")} UTC and no renewal event arrived within the 3-day grace.`],
      facts: a.dodoStatus ? [["Dodo status", a.dodoStatus]] : [],
      done: ["The clinic was set to paused (videos kept; new weeks stop). A renewal event that arrives later switches it back on."],
      todo: ["Check the subscription in Dodo (and the webhook log). If it did renew, replay the renewal event or set the plan by hand."],
    };
  },

  foundingFull(a: { used: number; clinics: number }): OwnerAlert {
    return {
      key: "founding_full",
      severity: "good",
      titleTr: "Kurucu teklifi doldu",
      titleEn: "The founding offer is full",
      what: [`${a.used} of ${a.clinics} founding seats are taken.`],
      done: ["Checkout and the app stopped offering the founding price automatically."],
      todo: ["Set DENTVIDEO_FOUNDING_OFFER=off on the web app so the static landing pages stop showing the banner, and disable the code in Dodo."],
    };
  },

  /**
   * The synthetic monitor (worker/src/dentvid/synthetic.ts): a live check of
   * dentvideo.com failed twice in a row (or is still failing — a reminder).
   * `incident` makes the key unique per incident; the monitor decides when to raise.
   */
  monitorDown(a: { incident: string; reminder: boolean; checks: { label: string; since: string; fails: number; error: string; hint: string }[] }): OwnerAlert {
    const labels = a.checks.map((c) => c.label).join(", ");
    const hm = (iso: string) => iso.slice(0, 16).replace("T", " ");
    return {
      key: `monitor_down:${a.incident}`,
      severity: "urgent",
      titleTr: a.reminder ? `Hâlâ çalışmıyor: ${labels}` : `Canlı kontrol başarısız: ${labels}`,
      titleEn: a.reminder ? `Still failing: ${labels}` : `Live check failing: ${labels}`,
      what: a.checks.map((c) => `${c.label} has failed since ${hm(c.since)} UTC (${c.fails} checks in a row, every 15 min): ${c.error}`),
      done: [
        "Nothing automatic can fix this — the monitor only looks, from the worker's server, like a clinic would.",
        "You get one “recovered” email when it passes again, and a reminder every 6 hours while it stays down.",
      ],
      todo: [...new Set(a.checks.map((c) => c.hint))],
    };
  },

  monitorRecovered(a: { incident: string; checks: { label: string; since: string; minutes: number }[] }): OwnerAlert {
    const labels = a.checks.map((c) => c.label).join(", ");
    return {
      key: `monitor_up:${a.incident}`,
      severity: "good",
      titleTr: `Tekrar çalışıyor: ${labels}`,
      titleEn: `Recovered: ${labels}`,
      what: a.checks.map((c) => `${c.label} passes again, after about ${c.minutes} min down (since ${c.since.slice(0, 16).replace("T", " ")} UTC).`),
      done: ["The monitor keeps checking every 15 minutes."],
      todo: ["If clinics may have hit the error meanwhile (sign-up, sign-in), look at new sign-ups in /dentvideo/admin."],
    };
  },

  signupBroken(a: { step: "create_account" | "server_sign_in" | "verification_code"; error: string }): OwnerAlert {
    const what = {
      create_account: "A new clinic could not create its account: Liman refused to create the login.",
      server_sign_in: "A new clinic's account was created, but signing it in on the server failed right after.",
      verification_code: "A new clinic's account was created, but its email verification code could not be issued or sent — it cannot pay until it gets one.",
    }[a.step];
    return {
      key: `signup_broken:${a.step}`,
      severity: "urgent",
      titleTr: "Kayıt akışında hata",
      titleEn: "Sign-up is failing for clinics",
      what: [what],
      facts: [["Step", a.step], ["Error", a.error]],
      done: [
        a.step === "server_sign_in" ? "The browser tried to sign in by itself as a fallback; if that also failed, the clinic saw “please sign in”." : "The clinic saw an error or a “send the code again” button.",
      ],
      todo: [
        "Try signing up yourself on /start in a private tab now.",
        a.step === "verification_code"
          ? "Check REDIS_URL and DENTVIDEO_VERIFY_SECRET (or DENTVID_SERVICE_ROLE_KEY) on the web app, and Resend."
          : "Check Liman (auth container) and the web app's NEXT_PUBLIC_DENTVID_SUPABASE_* settings.",
      ],
    };
  },

  enqueueFailed(a: { where: string; job: string; error: string; clinic?: ClinicRef }): OwnerAlert {
    return {
      key: `enqueue_failed:${a.where}${a.clinic ? `:${a.clinic.id}` : ""}`,
      severity: "urgent",
      titleTr: "İş kuyruğa eklenemedi",
      titleEn: "A job could not be queued",
      clinic: a.clinic,
      what: [`The web app could not put a “${a.job}” job on the worker's queue (${a.where}). Usually Redis is unreachable from the web app.`],
      facts: [["Error", a.error]],
      done: [
        a.job === "week" && a.where === "payment"
          ? "The plan is active; the first-week watchdog re-queues the week within 45 minutes once Redis is back."
          : "The clinic was told it could not start and may try again.",
      ],
      todo: ["Check Redis (REDIS_URL on the web app) and the /dentvideo/admin/system page.", ...(a.clinic ? ["When Redis is back, check this clinic got its videos; queue the week from its admin page if not."] : [])],
    };
  },

  welcomeNotSent(a: { clinic: ClinicRef; result: string }): OwnerAlert {
    return {
      key: `welcome_not_sent:${a.clinic.id}`,
      severity: "warning",
      titleTr: "Hoş geldin e-postası gönderilemedi",
      titleEn: "A new customer's welcome email was not sent",
      clinic: a.clinic,
      what: [`The welcome email to a clinic that just paid did not go out (${a.result}).`],
      done: ["The payment and plan are recorded; the first week is being made."],
      todo: [`Send a short personal welcome${a.clinic.email ? ` to ${a.clinic.email}` : ""}, and check Resend.`],
    };
  },

  raw(a: { key: string; severity?: Severity; subject: string; text: string }): OwnerAlert {
    // Older alert sites (spend guard) that already wrote their own text.
    const lines = a.text.split("\n").filter((l) => l.trim() !== "");
    return {
      key: a.key,
      severity: a.severity ?? "urgent",
      titleTr: "Harcama koruması",
      titleEn: a.subject.replace(/^\[DentVideo\]\s*/, ""),
      what: lines.slice(0, 1),
      done: lines.slice(1),
      todo: [],
    };
  },
};

/* ------------------------------------------------------------------ digest */

export type DigestData = {
  /** The day being summarised, e.g. "Sat 7 Nov → Sun 8 Nov". */
  period: string;
  signups: number;
  newPaying: { name: string; tier: string; country: string }[];
  /** MRR now and 24 h ago (null = unknown, first digest). */
  mrrUsd: number;
  mrrPrevUsd: number | null;
  paying: number;
  churned: { name: string; to: string }[];
  weeksDelivered: number;
  weeksFailed: number;
  videosReady: number;
  emailsSent: number;
  emailsFailed: number;
  alerts: { at: string; severity: string; title: string; clinic: string | null }[];
};

export function digestHasNews(d: DigestData): boolean {
  return (
    d.signups > 0 ||
    d.newPaying.length > 0 ||
    d.churned.length > 0 ||
    (d.mrrPrevUsd !== null && d.mrrPrevUsd !== d.mrrUsd) ||
    d.weeksDelivered > 0 ||
    d.weeksFailed > 0 ||
    d.emailsSent > 0 ||
    d.emailsFailed > 0 ||
    d.alerts.length > 0
  );
}

const usd = (n: number) => `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;

export function mrrDelta(d: DigestData): string {
  if (d.mrrPrevUsd === null) return "—";
  const diff = Math.round((d.mrrUsd - d.mrrPrevUsd) * 100) / 100;
  return diff === 0 ? "±$0" : `${diff > 0 ? "+" : "−"}${usd(Math.abs(diff))}`;
}

export function renderDigest(d: DigestData): Mail {
  const delta = mrrDelta(d);
  const subject = `[DentVideo] Günlük özet / Daily digest — ${d.newPaying.length} yeni müşteri / new paying, MRR ${usd(d.mrrUsd)} (${delta})`;
  const rows: [string, string, string][] = [
    ["Yeni kayıt", "New sign-ups", String(d.signups)],
    ["Yeni ödeyen", "New paying", String(d.newPaying.length)],
    ["MRR", "MRR", `${usd(d.mrrUsd)} (${delta})`],
    ["Ödeyen klinik", "Paying clinics", String(d.paying)],
    ["Teslim edilen hafta", "Weeks delivered", `${d.weeksDelivered} (${d.videosReady} videos)`],
    ["Başarısız hafta", "Weeks failed", String(d.weeksFailed)],
    ["Gönderilen e-posta", "Emails sent", `${d.emailsSent}${d.emailsFailed ? ` (${d.emailsFailed} failed)` : ""}`],
    ["Uyarı", "Alerts raised", String(d.alerts.length)],
  ];
  const lists: [string, string[]][] = [
    ["Yeni ödeyenler · New paying", d.newPaying.map((c) => `${c.name} — ${c.tier}, ${c.country}`)],
    ["Kaybedilen / riskli · Lost or at risk", d.churned.map((c) => `${c.name} → ${c.to}`)],
    ["Uyarılar · Alerts", d.alerts.slice(0, 10).map((a) => `${a.at.slice(11, 16)} UTC ${a.title}${a.clinic ? ` — ${a.clinic}` : ""}`)],
  ];
  const text = [
    `DentVideo — ${d.period}`,
    "",
    ...rows.map(([tr, en, v]) => `${tr} / ${en}: ${v}`),
    ...lists.flatMap(([h, l]) => (l.length ? ["", `${h}:`, ...l.map((x) => `- ${x}`)] : [])),
    ...(d.alerts.length > 10 ? [`- … and ${d.alerts.length - 10} more`] : []),
    "",
    "—",
    "Sent at 08:30 Istanbul when anything happened in the last 24 h. Kill switch: DENTVID_OWNER_ALERTS=off.",
  ].join("\n");
  const statRows = rows
    .map(
      ([tr, en, v]) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid #f0ebe2"><div style="font-size:14px;color:#14211f">${esc(tr)}</div><div style="font-size:12px;color:#5b6a67">${esc(en)}</div></td><td align="right" style="padding:7px 0;border-bottom:1px solid #f0ebe2;font-size:16px;font-weight:700;color:#14211f;white-space:nowrap">${esc(v)}</td></tr>`,
    )
    .join("");
  const listHtml = lists
    .filter(([, l]) => l.length)
    .map(([h, l]) => section(h.split(" · ")[0], h.split(" · ")[1], l))
    .join("");
  const inner = [
    `<p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0f5c5c">Günlük özet · Daily digest</p>`,
    `<h1 style="margin:6px 0 10px;font-size:20px;line-height:26px">${esc(d.period)}</h1>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${statRows}</table>`,
    listHtml,
  ].join("");
  return { subject: short(subject, 180), text, html: shell(subject, `${d.newPaying.length} new paying, MRR ${usd(d.mrrUsd)} (${delta}), ${d.alerts.length} alerts`, inner, "Sent at 08:30 Istanbul when anything happened in the last 24 h. Kill switch: DENTVID_OWNER_ALERTS=off.") };
}
