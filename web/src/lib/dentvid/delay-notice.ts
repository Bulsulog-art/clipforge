import type { SupabaseClient } from "@supabase/supabase-js";
import { delayEmail, sendEmail, type DelayKind } from "./email";
import { isTestEmail } from "./lifecycle";

/**
 * "This week's videos are running late" to a clinic's owner, in the clinic's
 * language (email.ts delayEmail). The worker asks for it through
 * api/internal/dentvideo/notify when a watchdog finds a week late
 * (worker/src/dentvid/delivery.ts: a paying clinic's Monday week;
 * watchdog.ts: a first week 2 h after payment). The worker sends at most
 * one per clinic and week; Resend's idempotency key holds a retried call to
 * one email as well.
 *
 * Skipped, like the ready notice: no clinic, no address, a test account
 * (e2e-…). Skipped too when the clinic no longer gets weeks (the plan is
 * not active, the owner paused it, or it is the App Review demo clinic:
 * worker schedule.ts getsWeeks), checked again here because the worker read
 * it earlier and a plan can end in between. And skipped when the week
 * arrived in the meantime: a "late" email next to the "ready" one would
 * only confuse.
 *
 * `queued`: the worker saw the week queued or running, so the email may say
 * "queued and on its way"; without it, it says we were alerted and are on
 * it (email.ts delayEmail).
 * Logged in dentvid_email_sends (week_late / first_week_late).
 */
export type DelayNoticeResult = { sent: boolean; reason?: "no clinic" | "not active" | "no email" | "test account" | "already delivered" | "send failed" };

type ClinicRow = { owner_id?: string; profile?: unknown; plan?: string | null; admin_paused_at?: string | null; review_demo?: boolean | null };

/** Still gets weeks: paying, not paused by the owner, not the App Review demo clinic (worker schedule.ts getsWeeks). */
export function getsWeeks(c: ClinicRow): boolean {
  return c.plan === "active" && !c.admin_paused_at && !c.review_demo;
}

export const DELAY_LOG_KIND: Record<DelayKind, string> = { late: "week_late", "first-late": "first_week_late" };

export async function sendDelayNotice(
  db: SupabaseClient,
  clinicId: string,
  kind: DelayKind,
  opts: { week?: string | null; queued?: boolean; send?: typeof sendEmail } = {},
): Promise<DelayNoticeResult> {
  // "*": admin_paused_at (0010) and review_demo (0024) are read when they exist.
  const { data } = await db.from("dentvid_clinics").select("*").eq("id", clinicId).maybeSingle();
  const clinic = data as ClinicRow | null;
  if (!clinic) return { sent: false, reason: "no clinic" };
  if (!getsWeeks(clinic)) return { sent: false, reason: "not active" };
  const { data: owner } = await db.auth.admin.getUserById(clinic.owner_id as string);
  const email = owner?.user?.email;
  if (!email) return { sent: false, reason: "no email" };
  if (isTestEmail(email)) return { sent: false, reason: "test account" };
  const week = opts.week && /^\d{4}-\d{2}-\d{2}$/.test(opts.week) ? opts.week : null;
  if (week) {
    // The watchdog saw the week missing; it may have landed since. An error reads as "not yet".
    const { count, error } = await db
      .from("dentvid_items")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("kind", "generated")
      .eq("week_of", week)
      .in("status", ["ready", "flagged"]);
    if (!error && (count ?? 0) > 0) return { sent: false, reason: "already delivered" };
  }
  const profile = (clinic.profile ?? {}) as { name?: string; language?: string };
  const msg = delayEmail({ kind, queued: opts.queued === true, clinicName: profile.name ?? "", language: profile.language ?? "en" });
  const logKind = DELAY_LOG_KIND[kind];
  const sent = await (opts.send ?? sendEmail)(email, msg, {
    idempotencyKey: `dentvideo-${logKind.replace(/_/g, "-")}-${clinicId}${week ? `-${week}` : ""}`,
    log: { clinicId, kind: logKind, language: profile.language ?? null },
  });
  return sent ? { sent: true } : { sent: false, reason: "send failed" };
}
