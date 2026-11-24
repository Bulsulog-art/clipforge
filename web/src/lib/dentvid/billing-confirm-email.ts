import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { billingConfirmText, fillConfirm, type BillingConfirmCopy } from "@/content/dentvideo-billing-confirm";
import type { DvTier } from "./billing";
import { helpCenterLink, renderEmail, type Brand, type Block, type Rendered } from "./email-layout";
import { clinicLabel, tidy } from "./lifecycle-email";
import { isTestEmail, KindNotAllowedError, MissingSchemaError, zoneOf, type LifecycleConfig, type LifecycleStore, type Sender } from "./lifecycle";
import { noticeDate } from "./retention-email";

/**
 * Written confirmation of a money event, to the clinic, in its language:
 *
 *   cancelled     the first word of a cancellation that keeps the clinic active
 *                 until the end of the period it paid for (billing-webhook.ts step 6):
 *                 the date its weekly videos stop, and how long its library stays.
 *   plan_changed  subscription.plan_changed moved the clinic to another tier.
 *
 * Transactional, like the payment-problem email (lifecycle.ts sendPaymentProblem):
 * it goes even to a clinic that unsubscribed from reminders, at any hour, and
 * only to an owner who proved the address (never a test account). Never to the
 * App Review demo clinic (review_demo, 0024), and never to a clinic that is no
 * longer active by the time it is sent (deleted, ended, paused). App Store
 * clinics never get here: the webhook leaves their Dodo events alone.
 *
 * At most once per event: a row in dentvid_email_log (unique per clinic and
 * kind, as lifecycle.ts claims it) for the subscription's cancellation, or for
 * the plan change event; released when the send fails. Before migration 0011
 * the log refuses these kinds; the claim then falls back to a Redis key (the
 * payment-problem email's way), and without Redis the webhook's own state
 * check (first cancellation word, tier actually changed) is what keeps it to one.
 *
 * Never throws for an expected case; the webhook still wraps every call so a
 * failure here never fails or retries the webhook.
 */

/**
 * How long the library stays after a plan ends: the privacy policy's "for 90 days after it
 * ends" and the worker's retention (worker/src/dentvid/retention.ts RETENTION_DAYS, pinned by
 * billing-confirm-email.test.ts). Nothing is deleted earlier; the clinic is emailed before.
 */
export const LIBRARY_DAYS_AFTER_END = 90;
const DAY = 86_400_000;

export type BillingConfirmNotice =
  | { kind: "cancelled"; subscriptionId: string; endsAt: string }
  | { kind: "plan_changed"; subscriptionId: string; tier: DvTier; eventAt: string | null };

export type BillingConfirmResult =
  | "sent"
  | "already sent"
  | "disabled"
  | "no clinic"
  | "not active"
  | "demo clinic"
  | "no email"
  | "test account"
  | "unverified"
  | "bad date"
  | "failed"
  | "migration missing";

/** The earliest day the library can be deleted after a plan that ends at `endsAt`. */
export function libraryUntil(endsAt: Date): Date {
  return new Date(endsAt.getTime() + LIBRARY_DAYS_AFTER_END * DAY);
}

const TIER_NAME: Record<DvTier, string> = { starter: "Starter", practice: "Practice", group: "Group" };
export const tierName = (tier: DvTier) => TIER_NAME[tier] ?? tier;

const h10 = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 10);

/**
 * The dentvid_email_log kind that makes this notice at most once (0011: ^[a-z][a-z0-9_]{2,39}$).
 * A cancellation: once per subscription (cancelled then expired, or a repeat, is the same word).
 * A plan change: once per change event (Dodo's event time; a retry carries the same one), so
 * Starter to Practice and back again are two confirmations.
 */
export function confirmKind(n: BillingConfirmNotice, now: Date = new Date()): string {
  if (n.kind === "cancelled") return `plan_cancelled_${h10(n.subscriptionId)}`;
  return `plan_${n.tier}_${h10(`${n.subscriptionId}|${n.eventAt ?? now.toISOString().slice(0, 10)}`)}`;
}

/** "Hello Sample Dental Practice," or, for a clinic without a name yet, a plain "Hello," (never "Hola,:" or "Dzień dobry,,"). */
function greeting(copy: BillingConfirmCopy, clinic: string): string {
  return clinic ? tidy(fillConfirm(copy.hello, { clinic })) : copy.helloNoName;
}

export function cancelledEmail(args: { language: string; clinicName: string; endsAt: Date; timeZone?: string; appUrl: string; brand?: Brand }): Rendered {
  const { lang, copy } = billingConfirmText(args.language);
  const c = copy.cancelled;
  const clinic = clinicLabel(args.clinicName);
  const vars = { end: noticeDate(lang, args.endsAt, args.timeZone), library: noticeDate(lang, libraryUntil(args.endsAt), args.timeZone) };
  return renderEmail({
    lang,
    subject: c.subject,
    preheader: fillConfirm(c.preheader, vars),
    title: fillConfirm(c.title, vars),
    hello: greeting(copy, clinic),
    blocks: [
      { kind: "p", text: fillConfirm(c.body, vars) },
      { kind: "p", text: fillConfirm(c.library, vars) },
      { kind: "panel", text: fillConfirm(c.again, vars) },
    ],
    button: { label: c.button, url: args.appUrl },
    helpLink: helpCenterLink(lang, "after-cancel"),
    footer: c.footer,
    brand: { ...args.brand, name: clinic },
  });
}

export function planChangedEmail(args: { language: string; clinicName: string; tier: DvTier; appUrl: string; brand?: Brand }): Rendered {
  const { lang, copy } = billingConfirmText(args.language);
  const c = copy.changed;
  const clinic = clinicLabel(args.clinicName);
  const vars = { tier: tierName(args.tier) };
  const includes = args.tier === "starter" ? c.starter : args.tier === "practice" ? c.practice : null;
  const blocks: Block[] = [{ kind: "p", text: fillConfirm(c.body, vars) }];
  if (includes) blocks.push({ kind: "p", text: includes });
  blocks.push({ kind: "panel", text: c.money }, { kind: "p", text: c.notYou });
  return renderEmail({
    lang,
    subject: fillConfirm(c.subject, vars),
    preheader: c.preheader,
    title: fillConfirm(c.title, vars),
    hello: greeting(copy, clinic),
    blocks,
    button: { label: c.button, url: `${args.appUrl}/settings#billing-title` },
    helpLink: helpCenterLink(lang, "plans"),
    footer: c.footer,
    brand: { ...args.brand, name: clinic },
  });
}

export type ConfirmDeps = {
  store: LifecycleStore;
  send: Sender;
  config: Pick<LifecycleConfig, "base" | "enabled">;
  /** The App Review demo clinic (0024 review_demo): never emailed. Default: not a demo. */
  isDemo?: (clinicId: string) => Promise<boolean>;
  /** Once-only key when the email log cannot take this kind (0005 / 0011 not applied): Redis SET NX. Default: no store, true. */
  fallbackClaim?: (key: string) => Promise<boolean>;
  now?: Date;
};

/** Claims the notice: the email log first, a Redis key when the log cannot take the kind. */
async function claim(deps: ConfirmDeps, clinicId: string, kind: string): Promise<{ ok: boolean; release: () => Promise<void> }> {
  try {
    const ok = await deps.store.claim(clinicId, kind);
    return { ok, release: () => deps.store.release(clinicId, kind).catch(() => {}) };
  } catch (e) {
    if (!(e instanceof KindNotAllowedError || e instanceof MissingSchemaError)) throw e;
    console.warn("[dentvideo billing] confirmation claimed in Redis:", e.message);
    const ok = await (deps.fallbackClaim ?? (async () => true))(`dv:billconfirm:${clinicId}:${kind}`).catch(() => true);
    return { ok, release: async () => {} };
  }
}

export async function sendBillingConfirmation(deps: ConfirmDeps, clinicId: string, notice: BillingConfirmNotice): Promise<BillingConfirmResult> {
  const { store, config: cfg } = deps;
  if (!cfg.enabled) return "disabled";
  try {
    // Re-read: the clinic may have been deleted (account deletion cancels its subscription first) or ended since.
    const clinic = await store.clinic(clinicId);
    if (!clinic) return "no clinic";
    if (clinic.plan !== "active") return "not active";
    if (await (deps.isDemo ?? (async () => false))(clinic.id)) return "demo clinic";
    // Transactional: email_opt_out_at (reminders) does not stop it, as with the payment-problem email.
    const owner = await store.owner(clinic.owner_id);
    if (!owner?.email) return "no email";
    if (isTestEmail(owner.email)) return "test account";
    if (!owner.verified) return "unverified";

    const end = notice.kind === "cancelled" ? new Date(notice.endsAt) : null;
    if (end && !Number.isFinite(end.getTime())) return "bad date";

    const kind = confirmKind(notice, deps.now);
    const claimed = await claim(deps, clinic.id, kind);
    if (!claimed.ok) return "already sent";

    const { lang } = billingConfirmText(clinic.profile?.language);
    const appUrl = `${cfg.base}/app`;
    const brand: Brand = { name: clinic.profile?.name ?? "" };
    const msg =
      notice.kind === "cancelled"
        ? cancelledEmail({ language: lang, clinicName: clinic.profile?.name ?? "", endsAt: end!, timeZone: zoneOf(clinic), appUrl, brand })
        : planChangedEmail({ language: lang, clinicName: clinic.profile?.name ?? "", tier: notice.tier, appUrl, brand });
    const logKind = notice.kind === "cancelled" ? "plan_cancelled" : "plan_changed";
    const ok = await deps.send(owner.email, msg, {
      idempotencyKey: `dentvideo-${kind.replace(/_/g, "-")}-${clinic.id}`,
      log: { clinicId: clinic.id, kind: logKind, language: lang },
    });
    if (!ok) {
      await claimed.release();
      return "failed";
    }
    return "sent";
  } catch (e) {
    if (e instanceof MissingSchemaError) return "migration missing";
    throw e;
  }
}

/** 0024 not applied: an unknown column, as Postgres or PostgREST reports it. */
const missingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42703" || e.code === "PGRST204" || /column .* does not exist|Could not find the .* column/i.test(e.message ?? ""));

/** Is this the App Review demo clinic (dentvid_clinics.review_demo, 0024)? A missing column or a failed read: no. */
export function reviewDemoCheck(db: SupabaseClient): (clinicId: string) => Promise<boolean> {
  return async (clinicId) => {
    const { data, error } = await db.from("dentvid_clinics").select("review_demo").eq("id", clinicId).maybeSingle();
    if (error) {
      if (!missingColumn(error)) console.warn("[dentvideo billing] could not read review_demo", error.message);
      return false;
    }
    return (data as { review_demo?: boolean | null } | null)?.review_demo === true;
  };
}
