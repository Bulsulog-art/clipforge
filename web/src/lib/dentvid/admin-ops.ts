/**
 * Billing checks and the overview's "open problems", as pure functions of
 * rows already loaded (unit-tested; the dev harness feeds fixtures).
 */
import { DV_FOUNDING } from "./billing";
import { stepCount, FUNNEL, type AdminClinic, type AdminEvent } from "./admin-metrics";
import { isProblemVideo, type VideoRow } from "./admin-filters";
import type { SystemSnapshot } from "./admin-system-server";

export type SubRow = {
  dodo_subscription_id: string;
  clinic_id: string;
  status: string;
  product?: string | null;
  tier?: string | null;
  interval?: string | null;
  discount_id?: string | null;
  founding?: boolean | null;
  period_end?: string | null;
  last_event_at?: string | null;
  last_event_type?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type PaymentRow = { dodo_payment_id: string; clinic_id: string; dodo_subscription_id: string | null; created_at: string };
export type EmailLogRow = { clinic_id: string; kind: string; sent_at: string };
export type EmailSendRow = { id: number; clinic_id: string | null; kind: string; language: string | null; status: "sent" | "failed" | string; error: string | null; created_at: string };

/** Subscriptions that bill (or are about to): a second one of these for a clinic is a duplicate charge. */
export const LIVE_SUB = new Set(["active", "pending", "on_hold", "paused"]);
/** Subscriptions whose payment is in trouble. */
export const TROUBLE_SUB = new Set(["on_hold", "failed"]);

export type BillingIssue = { clinicId: string; kind: "duplicate" | "payment" | "mismatch"; detail: string; subs: string[] };

export function billingIssues(subs: SubRow[], clinics: Pick<AdminClinic, "id" | "plan" | "dodo_subscription_id">[]): BillingIssue[] {
  const out: BillingIssue[] = [];
  const byClinic = new Map<string, SubRow[]>();
  for (const s of subs) byClinic.set(s.clinic_id, [...(byClinic.get(s.clinic_id) ?? []), s]);
  for (const [clinicId, list] of byClinic) {
    const live = list.filter((s) => LIVE_SUB.has(s.status));
    if (live.length > 1) out.push({ clinicId, kind: "duplicate", detail: `${live.length} live subscriptions — refund / cancel the extra one in Dodo`, subs: live.map((s) => s.dodo_subscription_id) });
    for (const s of list.filter((x) => TROUBLE_SUB.has(x.status))) out.push({ clinicId, kind: "payment", detail: `subscription ${s.status.replace("_", " ")}`, subs: [s.dodo_subscription_id] });
  }
  const liveClinics = new Set(subs.filter((s) => s.status === "active").map((s) => s.clinic_id));
  // Only meaningful once the ledger (0007) holds anything at all.
  if (subs.length) {
    for (const c of clinics) {
      if (c.plan === "active" && !liveClinics.has(c.id) && !(byClinic.get(c.id) ?? []).some((s) => LIVE_SUB.has(s.status)))
        out.push({ clinicId: c.id, kind: "mismatch", detail: "plan is active but no live subscription in the ledger", subs: c.dodo_subscription_id ? [c.dodo_subscription_id] : [] });
    }
  }
  return out;
}

/** Founding seats taken according to the ledger: live subscriptions with the founding discount. */
export function foundingFromLedger(subs: SubRow[]): { used: number; left: number } {
  const used = new Set(subs.filter((s) => s.founding && LIVE_SUB.has(s.status)).map((s) => s.clinic_id)).size;
  return { used, left: Math.max(0, DV_FOUNDING.clinics - used) };
}

/* ---------------------------------------------------------- overview stats */

const DAY = 86_400_000;
const step = (key: string) => FUNNEL.find((s) => s.key === key)!;

export type PeriodStats = { visitors: number; signups: number; previews: number; checkouts: number; paid: number };

/**
 * Visitors, sign-ups, previews watched, checkouts and payments in the last `days` days.
 * Sign-ups are accounts created (signup_completed), not clinic rows: a clinic
 * row exists only once the wizard saves the clinic, so counting rows hid
 * everyone who signed up and stopped before that (production, 13 Nov 2026:
 * 9 sign-ups in a week, 0 clinic rows). The larger of the two is shown, so a
 * blocked analytics beacon cannot make it smaller than the rows we have.
 */
export function periodStats(events: AdminEvent[], clinics: Pick<AdminClinic, "created_at">[], days: number, now: Date): PeriodStats {
  const since = now.getTime() - days * DAY;
  const evs = events.filter((e) => {
    const t = Date.parse(e.created_at);
    return t > since && t <= now.getTime();
  });
  return {
    visitors: stepCount(evs, step("visit")),
    signups: Math.max(
      stepCount(evs, step("signup")),
      clinics.filter((c) => {
        const t = Date.parse(c.created_at);
        return t > since && t <= now.getTime();
      }).length,
    ),
    previews: stepCount(evs, step("preview")) + stepCount(evs, step("teaser")),
    checkouts: stepCount(evs, step("checkout")),
    paid: stepCount(evs, step("paid")),
  };
}

export type Problem = { key: string; label: string; count: number; section: "videos" | "system" | "emails" | "billing" | "clinics"; query?: string; tone: "red" | "amber" };

/** Everything that needs the owner, each pointing at the screen that fixes it. Empty = all clear. */
export function openProblems(args: {
  items: VideoRow[];
  system: Pick<SystemSnapshot, "available" | "health" | "queues" | "stuck">;
  emailFailures: number | null;
  billing: BillingIssue[];
  parked: number;
  now: Date;
}): Problem[] {
  const out: Problem[] = [];
  const recent = args.items.filter((i) => Date.parse(i.updated_at) > args.now.getTime() - 14 * DAY);
  const broken = recent.filter(isProblemVideo).length;
  if (broken) out.push({ key: "videos", label: "Failed videos (14 days)", count: broken, section: "videos", query: "?status=problem", tone: "red" });
  const flagged = recent.filter((i) => i.status === "flagged" && !isProblemVideo(i)).length;
  if (flagged) out.push({ key: "flagged", label: "Flagged videos awaiting the dentist", count: flagged, section: "videos", query: "?status=flagged", tone: "amber" });
  if (args.system.available) {
    if (args.system.health === "down") out.push({ key: "worker", label: "Worker heartbeat is stale", count: 1, section: "system", tone: "red" });
    else if (args.system.health === "partial") out.push({ key: "worker", label: "A worker process went quiet", count: 1, section: "system", tone: "amber" });
    const failedJobs = args.system.queues.filter((q) => q.name === "dentvid" || q.name === "dentvid-mail").reduce((s, q) => s + q.failed, 0);
    if (failedJobs) out.push({ key: "jobs", label: "Failed jobs on the DentVideo queues", count: failedJobs, section: "system", tone: "amber" });
    if (args.system.stuck.length) out.push({ key: "stuck", label: "Stuck jobs (running > 90 min)", count: args.system.stuck.length, section: "system", tone: "red" });
  } else {
    out.push({ key: "redis", label: "Queue state unknown (Redis not reachable)", count: 1, section: "system", tone: "amber" });
  }
  if (args.parked) out.push({ key: "parked", label: "Jobs parked by the spend guard", count: args.parked, section: "system", tone: "amber" });
  if (args.emailFailures) out.push({ key: "emails", label: "Failed emails (7 days)", count: args.emailFailures, section: "emails", query: "?status=failed", tone: "red" });
  const dup = args.billing.filter((b) => b.kind === "duplicate").length;
  if (dup) out.push({ key: "duplicates", label: "Clinics with duplicate subscriptions", count: dup, section: "billing", tone: "red" });
  const pay = args.billing.filter((b) => b.kind !== "duplicate").length;
  if (pay) out.push({ key: "payments", label: "Payment issues", count: pay, section: "billing", tone: "amber" });
  return out;
}
