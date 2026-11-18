import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueFirstWeek, type FirstWeekResult } from "./week-job";
import { recordEvent } from "./events-server";
import { recordPaidConversion } from "./ad-conversions-server";
import { ownerIsInternal } from "./internal-server";
import { alerts, cleanError, type ClinicRef, type OwnerAlert } from "./ops-alert";
import { clinicRefFor, markPaid, raiseOwnerAlert } from "./ops-server";

/**
 * What happens once a clinic's plan has been switched on, whichever channel
 * paid for it (Dodo on the web: billing-webhook.ts; Apple in the app:
 * apple-webhook.ts). One implementation, so both channels queue the first
 * week, tell the watchdog, send the welcome and tell the owner the same way.
 */

export type ActivationDeps = {
  /** Queue the clinic's first week (tests pass a mock; the default uses the BullMQ dentvid queue). */
  enqueueWeek?: (db: SupabaseClient, clinicId: string) => Promise<FirstWeekResult>;
  /** Send the welcome email (tests pass a mock; the default goes through lifecycle.ts and Resend). */
  sendWelcome?: (db: SupabaseClient, clinicId: string) => Promise<string>;
  /** Owner alerts (tests pass a mock; the default is ops-server → OWNER_ALERT_EMAIL). */
  alert?: (a: OwnerAlert) => Promise<unknown>;
  /** Name, country, tier, email of a clinic for an alert. */
  clinicRef?: (db: SupabaseClient, clinicId: string) => Promise<ClinicRef>;
  /** Tell the worker's first-week watchdog a clinic just paid — first time or back from paused/cancelled (Redis marker). */
  markPaid?: (clinicId: string, at?: Date, returning?: boolean) => Promise<void>;
  /** Record the Google Ads "dv_paid" conversion for a first payment (default: ad-conversions-server; best effort). */
  adConversion?: (db: SupabaseClient, clinic: { id: string; owner_id: string }) => Promise<string>;
  /**
   * Is the clinic's owner internal traffic (lib/dentvid/internal-traffic: owner, QA, e2e, monitor)?
   * Internal owners never produce a Google Ads conversion, and their payment event is tagged internal.
   */
  ownerInternal?: (db: SupabaseClient, ownerId: string) => Promise<boolean>;
  now?: () => Date;
  /** How long queueing the week may take before it counts as failed (default ENQUEUE_TIMEOUT_MS). */
  enqueueTimeoutMs?: number;
};

/**
 * The web app's BullMQ connection queues commands while Redis is down
 * (enableOfflineQueue, no retry limit), so `queue.add` would hang until Redis
 * returns: the webhook would never answer, the welcome email and the owner's
 * "could not queue" alert would never go out, and the sender's retry would find
 * the delivery still "in progress". Bounded: past this the week counts as not
 * queued — the owner is told and the worker's watchdog re-queues it.
 */
export const ENQUEUE_TIMEOUT_MS = 5_000;

/** Rejects after `ms` (the underlying call keeps running; a late success is harmless — same job id). */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

/** Welcome results that mean a paying clinic got no welcome because something broke (not "already sent", "test account"…). */
const WELCOME_PROBLEM = new Set(["failed", "migration missing"]);

/** An owner alert about a clinic; never throws. */
export async function tellOwner(db: SupabaseClient, deps: Pick<ActivationDeps, "alert" | "clinicRef">, clinicId: string, make: (c: ClinicRef) => OwnerAlert): Promise<void> {
  try {
    const c = await (deps.clinicRef ?? clinicRefFor)(db, clinicId);
    await (deps.alert ?? raiseOwnerAlert)(make(c));
  } catch (e) {
    console.error("[dentvideo billing] owner alert failed", (e as Error).message);
  }
}

async function welcome(db: SupabaseClient, clinicId: string): Promise<string> {
  if (!process.env.RESEND_API_KEY) return "no email key";
  const [{ sendWelcome, supabaseLifecycleStore, lifecycleConfig }, { sendEmail }] = await Promise.all([import("./lifecycle"), import("./email")]);
  return sendWelcome({ store: supabaseLifecycleStore(db), send: sendEmail, config: lifecycleConfig() }, clinicId);
}

async function queueWeek(db: SupabaseClient, clinicId: string): Promise<FirstWeekResult> {
  // Imported here so this module (and its tests) do not touch Redis on load.
  const { dentvidQueue } = await import("@/lib/queue");
  return enqueueFirstWeek(db, dentvidQueue, clinicId);
}

export type PaidInput = {
  clinic: { id: string; owner_id: string };
  /** The plan before this event. */
  from: string;
  /** The clinic never had a paid plan before (no free week: this is when its first videos are made). */
  first: boolean;
  tier: string | null;
  interval?: string | null;
  /** The provider's event type, for the funnel event and logs. */
  event: string;
  /** Which channel paid. */
  source: "dodo" | "apple";
  /**
   * May a Google Ads "dv_paid" conversion be recorded? Only the web's own checkout (Dodo): an App Store
   * purchase is not a web conversion (docs/DENTVIDEO_IAP_PLAN.md §7).
   */
  adConversion: boolean;
  /** Extra props for the funnel event (sandbox, store…). */
  props?: Record<string, unknown>;
  logTag?: string;
};

export type PaidResult = { firstWeek?: FirstWeekResult | "failed"; welcomeEmail?: string };

/**
 * A payment that leaves the clinic active (a renewal too). When it is the
 * moment the clinic becomes active (`from` is not active), this week's videos
 * are queued at once, the watchdog is told, the owner hears about the new (or
 * returning) clinic and the welcome email goes out (once per clinic, ever).
 */
export async function afterPaid(db: SupabaseClient, deps: ActivationDeps, a: PaidInput): Promise<PaidResult> {
  const tag = a.logTag ?? `[${a.source}:dentvideo]`;
  const now = deps.now?.() ?? new Date();
  const activated = a.from !== "active";
  const out: PaidResult = {};
  // Internal traffic (owner, QA, e2e): looked up only when a payment lands, never on other events.
  const internal = await (deps.ownerInternal ?? ownerIsInternal)(db, a.clinic.owner_id).catch(() => false);
  if (activated) {
    // Every activation, not only the first: a clinic back from on hold / cancelled is owed its week
    // just the same, and the worker's watchdog only checks the clinics it is told about.
    await (deps.markPaid ?? markPaid)(a.clinic.id, now, !a.first).catch(() => {});
    // Google Ads offline conversion "dv_paid" when the owner came from an ad (one per account: a replay is a no-op).
    // Never for an internal owner: a QA purchase must not reach Google Ads.
    if (a.first && !internal && a.adConversion) await (deps.adConversion ?? recordPaidConversion)(db, a.clinic).catch(() => "failed");
    await tellOwner(db, deps, a.clinic.id, (c) =>
      alerts.newPayingClinic({ clinic: { ...c, tier: c.tier ?? a.tier }, interval: a.interval ?? null, returning: !a.first, source: a.source }),
    );
  }

  void recordEvent("payment_succeeded", {
    db,
    clinicId: a.clinic.id,
    props: { tier: a.tier, interval: a.interval, first: a.first, activated, event: a.event, source: a.source, ...(a.props ?? {}) },
    internal,
  });

  if (!activated) return out;

  // Paid: make this week's videos now rather than waiting for Monday. The worker emails the dentist when
  // they are ready. Best effort — the plan has already moved, and the app's "first week" screen asks for
  // the week again (idempotent, same job id) if this did not get through. A returning clinic that already
  // has this week's videos keeps them (enqueueFirstWeek).
  try {
    out.firstWeek = await withTimeout((deps.enqueueWeek ?? queueWeek)(db, a.clinic.id), deps.enqueueTimeoutMs ?? ENQUEUE_TIMEOUT_MS, "queueing the week");
  } catch (e) {
    out.firstWeek = "failed";
    console.error(tag, "could not queue the first week", a.clinic.id, (e as Error).message);
    // The first-week watchdog re-queues it once Redis is back — but a brand-new customer is waiting: the owner hears now.
    await tellOwner(db, deps, a.clinic.id, (c) => alerts.enqueueFailed({ where: "payment", job: "week", error: cleanError(e), clinic: c }));
  }

  // The welcome email: once per clinic (dentvid_email_log), so a retried event or a clinic that pays
  // again after cancelling never gets it twice.
  try {
    out.welcomeEmail = await (deps.sendWelcome ?? welcome)(db, a.clinic.id);
  } catch (e) {
    out.welcomeEmail = "failed";
    console.error(tag, "welcome email failed", a.clinic.id, (e as Error).message);
  }
  if (out.welcomeEmail && WELCOME_PROBLEM.has(out.welcomeEmail)) {
    console.error(tag, "welcome email not sent", a.clinic.id, out.welcomeEmail);
    const result = out.welcomeEmail;
    await tellOwner(db, deps, a.clinic.id, (c) => alerts.welcomeNotSent({ clinic: c, result }));
  }
  return out;
}
