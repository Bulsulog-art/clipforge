import type { SupabaseClient } from "@supabase/supabase-js";
import { lifecycleText } from "@/content/dentvideo-lifecycle";
import { DV_FOUNDING, DV_PRICES_USD, DV_TIERS, dvBaseUrl, foundingCode, foundingOfferOpen } from "./billing";
import { CONTACT_EMAIL, offerNudgeEmail, previewNudgeEmail, welcomeEmail, type OfferTerms, type Rendered } from "./lifecycle-email";
import type { SendOptions } from "./email";
import { unsubscribeSecret, unsubscribeToken } from "./unsubscribe-token";

/**
 * Lifecycle email: who gets which email, when, and never twice.
 *
 *   welcome        once per clinic, right after its first successful payment
 *                  (billing-webhook.ts). Transactional: no unsubscribe link.
 *   nudge_preview  a clinic that finished the clinic step but has not paid,
 *                  ~24 h later: "your branded preview is waiting".
 *   nudge_offer    the same clinic ~72 h after the clinic step (and at least
 *                  36 h after the first reminder): the founding offer while
 *                  it is open. The last one — at most two reminders, ever.
 *
 * Reminders stop the moment the clinic pays (plan leaves "trial"), opts out
 * (email_opt_out_at) or is deleted (the row is gone). Nobody without a
 * clinic row is ever selected, and test accounts (e2e-…) are skipped.
 *
 * Idempotency: a row in dentvid_email_log (unique per clinic and kind) is
 * claimed before sending and released if the send fails, and Resend gets an
 * idempotency key as well. The hourly worker job calls runNudges through
 * /api/internal/dentvideo/lifecycle; a global hourly cap and a per-run cap
 * bound the volume whatever the data says.
 *
 * Until migration 0005 is applied the store reports MissingSchemaError and
 * nothing is sent (logged once per process).
 */

export type LifecycleKind = "welcome" | "nudge_preview" | "nudge_offer";

export type ClinicForMail = {
  id: string;
  owner_id: string;
  profile: { name?: string; language?: string } | null;
  plan: string;
  created_at: string;
  email_opt_out_at: string | null;
};

export type LogRow = { clinic_id: string; kind: LifecycleKind; sent_at: string };

export class MissingSchemaError extends Error {
  constructor(what: string) {
    super(`dentvideo lifecycle: ${what} missing — apply supabase/liman/0005_dentvid_email.sql`);
  }
}

/** Database access, so the selection and stop rules are tested without a database. */
export interface LifecycleStore {
  /** Unpaid, not opted-out clinics created in [after, before], oldest first. */
  trialClinics(after: Date, before: Date, limit: number): Promise<ClinicForMail[]>;
  logs(clinicIds: string[]): Promise<LogRow[]>;
  clinic(id: string): Promise<ClinicForMail | null>;
  /** Writes the (clinic, kind) row; false when it is already there. */
  claim(clinicId: string, kind: LifecycleKind): Promise<boolean>;
  release(clinicId: string, kind: LifecycleKind): Promise<void>;
  ownerEmail(ownerId: string): Promise<string | null>;
  /** Marks the clinic opted out; false when there is no such clinic. */
  optOut(clinicId: string, at: Date): Promise<boolean>;
}

const H = 3600_000;
/** Timing of the two reminders, in hours since the clinic step. */
export const NUDGE_RULES = {
  previewAfterH: 24,
  /** A clinic older than this that never got reminder 1 gets none (e.g. on first deploy). */
  previewUntilH: 7 * 24,
  offerAfterH: 72,
  offerUntilH: 14 * 24,
  /** Reminder 2 never follows reminder 1 closer than this. */
  offerGapH: 36,
} as const;

export const isTestEmail = (email: string) => /^e2e-/i.test(email.trim());

/** Which reminders are due now. Pure — the scheduler's whole decision. */
export function dueNudges(clinics: ClinicForMail[], logs: LogRow[], now: Date): { clinicId: string; kind: LifecycleKind }[] {
  const t = now.getTime();
  const sent = new Map<string, Map<LifecycleKind, number>>();
  for (const l of logs) {
    if (!sent.has(l.clinic_id)) sent.set(l.clinic_id, new Map());
    sent.get(l.clinic_id)!.set(l.kind, Date.parse(l.sent_at));
  }
  const out: { clinicId: string; kind: LifecycleKind }[] = [];
  for (const c of clinics) {
    if (c.plan !== "trial" || c.email_opt_out_at) continue;
    const created = Date.parse(c.created_at);
    if (!Number.isFinite(created)) continue;
    const age = (t - created) / H;
    const mine = sent.get(c.id) ?? new Map<LifecycleKind, number>();
    if (mine.has("nudge_offer")) continue;
    const preview = mine.get("nudge_preview");
    if (preview === undefined) {
      if (age >= NUDGE_RULES.previewAfterH && age < NUDGE_RULES.previewUntilH) out.push({ clinicId: c.id, kind: "nudge_preview" });
    } else if (age >= NUDGE_RULES.offerAfterH && age < NUDGE_RULES.offerUntilH && (t - preview) / H >= NUDGE_RULES.offerGapH) {
      out.push({ clinicId: c.id, kind: "nudge_offer" });
    }
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
  offer: OfferTerms;
  maxPerRun: number;
};

type Env = Record<string, string | undefined>;

/** The founding offer exactly as billing.ts has it; when it is closed, the lowest monthly list price. */
export function offerTerms(env: Env = process.env): OfferTerms {
  if (foundingOfferOpen(env)) {
    return {
      open: true,
      priceUsd: DV_FOUNDING.priceUsd,
      thenUsd: DV_PRICES_USD[DV_FOUNDING.tier][DV_FOUNDING.interval] ?? DV_FOUNDING.priceUsd,
      months: DV_FOUNDING.months,
      clinics: DV_FOUNDING.clinics,
      code: foundingCode(env),
    };
  }
  const monthly = DV_TIERS.map((t) => DV_PRICES_USD[t].month).filter((p): p is number => typeof p === "number");
  return { open: false, fromUsd: Math.min(...monthly) };
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
    offer: offerTerms(env),
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

export function renderNudge(cfg: LifecycleConfig, clinic: ClinicForMail, kind: "nudge_preview" | "nudge_offer", unsubUrl: string): Rendered {
  const { lang } = lifecycleText(clinic.profile?.language);
  const name = clinic.profile?.name ?? "";
  if (kind === "nudge_preview") {
    return previewNudgeEmail({ language: lang, clinicName: name, url: `${cfg.base}/start?step=preview&lang=${lang}`, unsubscribeUrl: unsubUrl });
  }
  return offerNudgeEmail({ language: lang, clinicName: name, url: `${cfg.base}/start?step=plan&lang=${lang}`, unsubscribeUrl: unsubUrl, offer: cfg.offer });
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

/** One pass of the hourly job: find due reminders, re-check each clinic, send. Never throws on missing schema. */
export async function runNudges(deps: RunDeps): Promise<RunResult> {
  const { store, config: cfg } = deps;
  const now = deps.now ?? new Date();
  const res: RunResult = { due: 0, sent: 0, failed: 0, skipped: {} };
  const skip = (why: string) => (res.skipped[why] = (res.skipped[why] ?? 0) + 1);
  if (!cfg.enabled) return { ...res, stopped: "disabled" };
  if (!cfg.secret) {
    warnOnce("secret", "dentvideo lifecycle: no DENTVIDEO_UNSUBSCRIBE_SECRET / WORKER_INTERNAL_TOKEN — reminders are not sent");
    return { ...res, stopped: "no unsubscribe secret" };
  }
  try {
    const clinics = await store.trialClinics(new Date(now.getTime() - NUDGE_RULES.offerUntilH * H), new Date(now.getTime() - NUDGE_RULES.previewAfterH * H), 200);
    const logs = clinics.length ? await store.logs(clinics.map((c) => c.id)) : [];
    const due = dueNudges(clinics, logs, now);
    res.due = due.length;
    for (const d of due) {
      if (res.sent + res.failed >= cfg.maxPerRun) {
        res.stopped = "run cap";
        break;
      }
      // Re-read: the clinic may have paid, opted out or been deleted since the list was made.
      const clinic = await store.clinic(d.clinicId);
      if (!clinic) {
        skip("deleted");
        continue;
      }
      if (clinic.plan !== "trial") {
        skip("paid");
        continue;
      }
      if (clinic.email_opt_out_at) {
        skip("opted out");
        continue;
      }
      const email = await store.ownerEmail(clinic.owner_id);
      if (!email) {
        skip("no email");
        continue;
      }
      if (isTestEmail(email)) {
        skip("test account");
        continue;
      }
      if (!(await deps.allow())) {
        res.stopped = "hourly cap";
        break;
      }
      if (!(await store.claim(clinic.id, d.kind))) {
        skip("already sent");
        continue;
      }
      const unsub = unsubscribeUrl(cfg, clinic.id)!;
      const msg = renderNudge(cfg, clinic, d.kind as "nudge_preview" | "nudge_offer", unsub);
      const ok = await deps.send(email, msg, { headers: listUnsubscribeHeaders(unsub), idempotencyKey: `dentvideo-${d.kind}-${clinic.id}` });
      if (ok) res.sent++;
      else {
        res.failed++;
        await store.release(clinic.id, d.kind).catch(() => {});
      }
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

export type WelcomeResult = "sent" | "already sent" | "no clinic" | "no email" | "test account" | "disabled" | "failed" | "migration missing";

/** The welcome after the first payment. Once per clinic, whatever the webhook does (retries, re-activation). */
export async function sendWelcome(deps: Omit<RunDeps, "allow">, clinicId: string): Promise<WelcomeResult> {
  const { store, config: cfg } = deps;
  if (!cfg.enabled) return "disabled";
  try {
    const clinic = await store.clinic(clinicId);
    if (!clinic) return "no clinic";
    const email = await store.ownerEmail(clinic.owner_id);
    if (!email) return "no email";
    if (isTestEmail(email)) return "test account";
    if (!(await store.claim(clinic.id, "welcome"))) return "already sent";
    const { lang } = lifecycleText(clinic.profile?.language);
    const msg = welcomeEmail({ language: lang, clinicName: clinic.profile?.name ?? "", appUrl: `${cfg.base}/app` });
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

const CLINIC_COLS = "id, owner_id, profile, plan, created_at, email_opt_out_at";

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
    async logs(ids) {
      const { data, error } = await db.from("dentvid_email_log").select("clinic_id, kind, sent_at").in("clinic_id", ids);
      if (error) fail("dentvid_email_log", error);
      return (data ?? []) as LogRow[];
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
      return fail("dentvid_email_log", error);
    },
    async release(clinicId, kind) {
      await db.from("dentvid_email_log").delete().eq("clinic_id", clinicId).eq("kind", kind);
    },
    async ownerEmail(ownerId) {
      const { data, error } = await db.auth.admin.getUserById(ownerId);
      if (error) return null;
      return data?.user?.email ?? null;
    },
    async optOut(clinicId, at) {
      const { data, error } = await db.from("dentvid_clinics").update({ email_opt_out_at: at.toISOString() }).eq("id", clinicId).select("id");
      if (error) fail("dentvid_clinics.email_opt_out_at", error);
      return (data ?? []).length > 0;
    },
  };
}
