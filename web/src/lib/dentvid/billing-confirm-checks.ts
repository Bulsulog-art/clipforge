import type { SupabaseClient } from "@supabase/supabase-js";
import { LIMITS } from "@/lib/rate-limit";
import { missingSchema, type AppleSubRecord } from "./apple-store";
import { futurePaidThrough } from "./billing";
import type { ClinicRef, OwnerAlert } from "./ops-alert";

/**
 * What the billing webhook checks before it confirms a money event to a clinic, and what it tells
 * the owner about that confirmation. Pure and light (no email templates), so billing-webhook.ts can
 * import it directly; the emails themselves are in billing-confirm-email.ts.
 *
 * A cancellation email ("your videos run until {end}, your library stays until {library}") is held
 * back when it would not be true:
 *   - the owner asked to delete the account: deletion cancels the Dodo subscription first and only
 *     then removes the library and the clinic row (account.ts deleteDentvideoAccount), so Dodo's
 *     subscription.cancelled can arrive while the clinic still looks active;
 *   - an App Store subscription bought while the web plan ran waits to take over at the end date
 *     (apple-webhook.ts, ignored_web_active), so the plan does not end at all.
 * When either cannot be checked, the email is held back too and the owner is asked to confirm by hand.
 */

/**
 * How long the library stays after a plan ends: the privacy policy's "for 90 days after it ends" and
 * the worker's retention (worker/src/dentvid/retention.ts RETENTION_DAYS, pinned by
 * billing-confirm-email.test.ts). Nothing is deleted earlier; the clinic is emailed before.
 */
export const LIBRARY_DAYS_AFTER_END = 90;
const DAY = 86_400_000;

/** The earliest day the library can be deleted after a plan that ends at `endsAt`. */
export function libraryUntil(endsAt: Date): Date {
  return new Date(endsAt.getTime() + LIBRARY_DAYS_AFTER_END * DAY);
}

/* ------------------------------------------------------------ account deletion */

/**
 * The account-deletion route counts every request before it does anything else
 * (handlers/account-delete.ts: rate limit `rl:delete:user:<owner id>`, LIMITS.accountDeleteUser),
 * and so before it cancels the Dodo subscription. rate-limit.ts slidingWindow keeps that count in
 * hourly buckets, `<key>:<bucket>`, each living two hours. A count in the current or the previous
 * bucket means the owner asked to delete the account in the last hour or two. Both the key and the
 * bucket format are pinned by billing-confirm-checks.test.ts against the route's source and
 * slidingWindow itself.
 */
export const deletionLimitKey = (ownerId: string) => `rl:delete:user:${ownerId}`;

/** Did the owner ask to delete the account in the last hour or two? Throws when the count cannot be read. */
export async function deletionRequested(read: (key: string) => Promise<number>, ownerId: string, now: Date): Promise<boolean> {
  const win = LIMITS.accountDeleteUser.windowSec * 1000;
  const bucket = Math.floor(now.getTime() / win);
  const key = deletionLimitKey(ownerId);
  const [cur, prev] = await Promise.all([read(`${key}:${bucket}`), read(`${key}:${bucket - 1}`)]);
  return (Number(cur) || 0) + (Number(prev) || 0) > 0;
}

/* ------------------------------------------------------------ App Store takeover */

export type AppleLedgerRow = Pick<AppleSubRecord, "status" | "tier" | "environment" | "period_end">;

/**
 * An App Store subscription waits to take over this clinic when its web plan ends: the same rule as
 * apple-webhook.ts adoptWaitingApple and the worker's apple-takeover.ts pickWaitingApple (held back
 * while the web plan ran, production, a tier, paid through a future date). Checked at the time of
 * the cancellation: Apple renews such a row while the web plan runs, so a row that is live now is
 * treated as one that takes over at the end (when in doubt, no "your plan ends" email).
 */
export function appleTakesOver(rows: AppleLedgerRow[], now: Date): boolean {
  return rows.some((r) => r.status === "ignored_web_active" && r.environment !== "SANDBOX" && !!r.tier && !!futurePaidThrough(r.period_end, now));
}

/**
 * The clinic's App Store ledger rows (0026). "no ledger": the table does not exist (0026 not applied),
 * so no App Store subscription can be waiting and nothing takes over at the end date (the worker's
 * takeover reads the same ledger). null: the ledger exists but could not be read (unknown).
 */
export async function readAppleLedger(db: SupabaseClient, clinicId: string): Promise<AppleLedgerRow[] | "no ledger" | null> {
  try {
    const { data, error } = await db.from("dentvid_apple_subscriptions").select("status, tier, environment, period_end").eq("clinic_id", clinicId).limit(20);
    if (error) return missingSchema(error) ? "no ledger" : null;
    return (data ?? []) as AppleLedgerRow[];
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ owner alerts */

/** Results that mean a clinic should have had its confirmation and did not, because something broke. */
export const CONFIRM_PROBLEM: ReadonlySet<string> = new Set(["failed", "migration missing", "not checked"]);

const day = (iso: string) => iso.slice(0, 10);

/** Why no confirmation went out, in the owner's words. */
function reason(result: string): string {
  switch (result) {
    case "failed":
      return "the email could not be sent";
    case "timed out":
      return "the send took too long";
    case "migration missing":
      return "the email tables are missing on Liman";
    case "not checked":
      return "it could not be checked that no account deletion is under way and no App Store subscription takes over";
    case "no email":
    case "unverified":
      return "the owner has no proven email address";
    case "test account":
      return "a test account";
    case "disabled":
      return "clinic emails are switched off (DENTVIDEO_LIFECYCLE_EMAILS)";
    case "no email key":
      return "RESEND_API_KEY is not set";
    case "bad date":
      return "the end date could not be read";
    default:
      return result;
  }
}

/**
 * The owner's "subscription stopped" alert (ops-alert.ts customerAtRisk) for a cancellation that keeps the
 * clinic active until its paid-through date, with what the clinic was told in writing. customerAtRisk's
 * lines are [what happens to the plan, what the clinic was emailed]:
 *  - the first is about plans that stop now ("new weeks stop"), so it is replaced with the dates;
 *  - the second stays when the confirmation went out ("sent": the webhook passes cancellationConfirmed, so
 *    the owner reads ops-alert.ts's own wording); otherwise it is replaced with why no confirmation went out.
 */
export function cancellationAlert(a: OwnerAlert, o: { result: string; endsAt: string; email?: string | null }): OwnerAlert {
  const end = day(o.endsAt);
  const library = day(libraryUntil(new Date(o.endsAt)).toISOString());
  const who = o.email ? `to ${o.email}` : "to the clinic";
  const plan =
    o.result === "app store takes over"
      ? `The clinic keeps its weekly videos until ${end}; then the App Store subscription it bought in the app takes over, so its plan carries on.`
      : `The clinic keeps getting its weekly videos until ${end}; then the plan ends, and its library stays until ${library} unless it chooses a plan again.`;
  let note: string;
  const todo: string[] = [];
  switch (o.result) {
    case "sent":
      note = a.done[1];
      break;
    case "already sent":
      note = "The clinic already had its written confirmation of this cancellation.";
      break;
    case "timed out":
      note = "The written confirmation was still being sent when Dodo got its answer; you get a separate alert if it fails.";
      break;
    case "app store takes over":
      note = "No cancellation email went to the clinic: its plan does not end, so an email saying it does would be wrong.";
      break;
    case "account deletion":
      note = "No cancellation email went to the clinic: its owner asked to delete the account in the last hour or two, and the email would promise a library that is being deleted.";
      todo.push(`If the clinic still exists tomorrow, its deletion did not finish: check its admin page, and confirm the cancellation ${who} by hand (weekly videos until ${end}, library until ${library}).`);
      break;
    case "demo clinic":
      note = "No email: this is the App Review demo clinic.";
      break;
    case "no clinic":
    case "not active":
      note = "No email: the clinic is gone or no longer active.";
      break;
    default:
      note = `No written confirmation went to the clinic (${o.result}: ${reason(o.result)}).`;
      if (o.result !== "test account") todo.push(`Confirm the cancellation ${who} by hand: weekly videos until ${end}, library kept until ${library}.`);
  }
  return { ...a, done: [plan, note], todo: [...todo, ...a.todo] };
}

/** A confirmation that should have reached the clinic and did not (failed, or still failing after the webhook answered). */
export function confirmNotSentAlert(a: { clinic: ClinicRef; kind: "cancelled" | "plan_changed"; result: string; detail: string }): OwnerAlert {
  const cancel = a.kind === "cancelled";
  return {
    key: `confirm_not_sent:${a.clinic.id}:${a.kind}`,
    severity: "warning",
    titleTr: cancel ? "İptal onayı kliniğe gitmedi" : "Plan değişikliği onayı kliniğe gitmedi",
    titleEn: cancel ? "A cancellation confirmation did not reach the clinic" : "A plan change confirmation did not reach the clinic",
    clinic: a.clinic,
    what: [`The written confirmation of the ${cancel ? "cancellation" : "plan change"} did not go out (${a.result}: ${reason(a.result)}).`],
    done: ["The plan itself is recorded; only the email is missing. It is not retried automatically."],
    todo: [`Send ${a.clinic.email ?? "the clinic"} a short confirmation by hand: ${a.detail}`, "If emails are failing in general, check Resend (API key, domain, sending limits)."],
  };
}
