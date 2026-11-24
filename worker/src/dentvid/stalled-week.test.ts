import { beforeEach, describe, expect, it } from "vitest";
import { Job, UnrecoverableError } from "bullmq";
import {
  EXHAUSTED_RETRY_ATTEMPTS,
  EXHAUSTED_RETRY_DELAY_MS,
  finalKind,
  handleFailedWeek,
  STALL_RETRY_DELAY_MS,
  stallRetryKey,
  stalledJobId,
  weekClinic,
  weekJobFinal,
  type FailedWeekJob,
  type StalledWeekDeps,
} from "./stalled-week.js";
import { alerts, cleanError, deliverAlert, MemoryOpsStore, renderAlert, type Mail, type OwnerAlert, type WeekDelay } from "./ops-alert.js";
import { DENTVID_PRIORITY, WEEK_RETRY } from "./job-options.js";
import { mondayMorning } from "./timezone.js";
import { weekJobId } from "./schedule.js";

/**
 * A week killed twice by worker restarts: BullMQ fails it itself
 * ("job stalled more than allowable limit", an UnrecoverableError) at attempt
 * 1 of 4. The owner is told, the library says "delayed", and before the
 * clinic's Monday 07:00 the week is queued once more, exactly once.
 */

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const WEEK = "2026-11-30";
// Istanbul: Monday 30 Nov 07:00 +03 = 04:00 UTC.
const SATURDAY_EVENING = new Date("2026-11-28T21:10:00Z");
const MONDAY_LATE = new Date("2026-11-30T05:00:00Z");

const stalled = () => new UnrecoverableError("job stalled more than allowable limit");
const weekJob = (over: Partial<{ attemptsMade: number; attempts: number; priority: number; data: unknown; name: string; id: string }> = {}): FailedWeekJob => ({
  name: over.name ?? "week",
  id: over.id ?? weekJobId(CLINIC, WEEK),
  data: over.data ?? { clinicId: CLINIC, count: 5, week: WEEK, batch: true },
  attemptsMade: over.attemptsMade ?? 1,
  opts: { attempts: over.attempts ?? 4, ...(over.priority !== undefined ? { priority: over.priority } : {}) },
});

/** BullMQ's own check of a job's options (bullmq Job.validateOptions, as Queue.add runs it): throws what Queue.add would. */
function bullmqValidates(name: string, opts: Record<string, unknown>): void {
  // Protected in BullMQ's types; it is the very check Queue.add runs before storing a job.
  const proto = Job.prototype as unknown as { validateOptions(this: unknown, jobData: unknown): void };
  proto.validateOptions.call({ name, opts }, { data: "{}" });
}

let store: MemoryOpsStore;
let added: { name: string; data: unknown; opts: Record<string, unknown> }[];
let raised: OwnerAlert[];
let delays: [string, string, WeekDelay][];
let queueDown: boolean;

function deps(now: Date, over: Partial<StalledWeekDeps> = {}): StalledWeekDeps {
  return {
    queue: {
      add: async (name, data, opts) => {
        if (queueDown) throw new Error("redis connection closed");
        // A fake that accepted anything hid that BullMQ refused the first id form: validate like BullMQ.
        bullmqValidates(name, opts);
        added.push({ name, data, opts });
        return {};
      },
    },
    store,
    alert: async (a) => (raised.push(a), "sent"),
    setDelay: async (c, w, s) => void delays.push([c, w, s]),
    clinic: async (id) => ({ ref: { id, name: "Gülüş Dental", country: "TR" }, tz: "Europe/Istanbul" }),
    now,
    ...over,
  };
}

beforeEach(() => {
  store = new MemoryOpsStore();
  added = [];
  raised = [];
  delays = [];
  queueDown = false;
});

describe("which failures are final", () => {
  it("BullMQ's stalled failure, every attempt used, or an UnrecoverableError; not a failure BullMQ will retry", () => {
    expect(finalKind({ attemptsMade: 1, opts: { attempts: 4 } }, stalled())).toBe("stalled");
    // The message alone is enough (older BullMQ failed it with a plain Error).
    expect(finalKind({ attemptsMade: 1, opts: { attempts: 4 } }, new Error("job stalled more than allowable limit"))).toBe("stalled");
    expect(finalKind({ attemptsMade: 4, opts: { attempts: 4 } }, new Error("render timed out"))).toBe("exhausted");
    expect(finalKind({ attemptsMade: 1, opts: { attempts: 4 } }, new UnrecoverableError("Incorrect API key provided"))).toBe("permanent");
    expect(weekJobFinal({ attemptsMade: 2, opts: { attempts: 4 } }, new Error("429 Rate limit"))).toBe(false);
  });
});

describe("a week killed twice by worker restarts", () => {
  it("UnrecoverableError at attempt 1 of 4: the owner is told, the library says 'delayed', and it is queued once more before Monday", async () => {
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toEqual({ handled: true, week: WEEK, kind: "stalled", requeued: true });
    expect(delays).toEqual([[CLINIC, WEEK, "delayed"]]);

    expect(added).toHaveLength(1);
    expect(added[0].name).toBe("week");
    // Its own id, so the failed original stays for the record and the web's "try again" id is untouched.
    expect(added[0].opts.jobId).toBe(stalledJobId(CLINIC, WEEK));
    expect(added[0].opts.jobId).toBe(`week-stalled:${CLINIC}:${WEEK}`);
    expect(added[0].opts.delay).toBe(STALL_RETRY_DELAY_MS);
    expect(added[0].opts.delay).toBe(5 * 60_000);
    // Ahead of the weekly batch, with the usual week retries: the week never really ran.
    expect(added[0].opts.priority).toBe(DENTVID_PRIORITY.firstWeek);
    expect(added[0].opts.attempts).toBe(WEEK_RETRY.attempts);
    // Same week, same promise: a full week asked for, of which jobs.ts makes only the missing videos.
    expect(added[0].data).toEqual({ clinicId: CLINIC, count: 5, week: WEEK, batch: true });

    expect(raised).toHaveLength(1);
    // Its own key: runDentvidWeek's week_failed:<clinic>:<week> must not swallow a later failure of the same day.
    expect(raised[0].key).toBe(`week_failed:${CLINIC}:${WEEK}:stalled`);
    const mail = renderAlert(raised[0]);
    expect(mail.subject).toMatch(/Gülüş Dental/);
    expect(mail.text).toContain("stalled more than allowable limit");
    expect(mail.text).toMatch(/stopped more than once/);
    expect(mail.text).toMatch(/Queued once more by itself \(job week-stalled:[^)]+\), starting in 5 minutes/);
    // Nothing that contradicts the extra run: no "retried automatically 0 time(s)", no "retry it by hand".
    expect(mail.text).not.toMatch(/Retried automatically/);
    expect(mail.text).not.toMatch(/failed → retry|retry that job/);
    expect(mail.text).toMatch(/Do not retry the failed job by hand/);
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).not.toBeNull();
  });

  it("the extra run's id is one BullMQ accepts; the first form (four parts) was refused by BullMQ itself", () => {
    expect(stalledJobId(CLINIC, WEEK).split(":")).toHaveLength(3);
    expect(() => bullmqValidates("week", { jobId: stalledJobId(CLINIC, WEEK), delay: STALL_RETRY_DELAY_MS, ...WEEK_RETRY, priority: 1 })).not.toThrow();
    expect(() => bullmqValidates("week", { jobId: `${weekJobId(CLINIC, WEEK)}:stalled` })).toThrow(/Custom Id cannot contain :/);
  });

  it("after the clinic's Monday 07:00 it is not queued again (the delivery watchdog has late weeks), but still alerted and marked", async () => {
    expect(MONDAY_LATE.getTime()).toBeGreaterThan(mondayMorning(WEEK, "Europe/Istanbul").getTime());
    const r = await handleFailedWeek(weekJob(), stalled(), deps(MONDAY_LATE));
    expect(r).toMatchObject({ handled: true, requeued: false, skipped: "past_deadline" });
    expect(added).toEqual([]);
    expect(delays).toEqual([[CLINIC, WEEK, "delayed"]]);
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe(`week_failed:${CLINIC}:${WEEK}:stalled`);
    const text = renderAlert(raised[0]).text;
    expect(text).toMatch(/Monday morning has passed/);
    // Nothing runs by itself before the watchdog: the owner may requeue it by hand.
    expect(text).toMatch(/requeue the week in \/dentvideo\/admin/);
    // The claim is not used up by a run that did not happen.
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).toBeNull();
  });

  it("the deadline is the clinic's own: New York's Monday morning is still ahead when Istanbul's has passed", async () => {
    const r = await handleFailedWeek(weekJob(), stalled(), deps(MONDAY_LATE, { clinic: async (id) => ({ ref: { id }, tz: "America/New_York" }) }));
    expect(r).toMatchObject({ requeued: true });
  });

  it("a second failure (the extra run failing too) does not queue it again, and the owner hears of it under its own key", async () => {
    await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    const again = weekJob({ id: stalledJobId(CLINIC, WEEK) });
    const r = await handleFailedWeek(again, stalled(), deps(new Date(SATURDAY_EVENING.getTime() + 20 * 60_000)));
    expect(r).toMatchObject({ handled: true, requeued: false, skipped: "extra_run" });
    expect(added).toHaveLength(1);
    expect(delays).toHaveLength(2);
    expect(raised[1].key).toBe(`week_failed:${CLINIC}:${WEEK}:again`);
    const text = renderAlert(raised[1]).text;
    expect(text).toMatch(/failed again after it had already been queued once more/);
    expect(text).toMatch(/a week gets one extra run by itself, and this one had it/);
    expect(text).toContain(`job id week-stalled:${CLINIC}:${WEEK}`);
  });

  it("the extra run is never queued again, whatever it failed of: used every attempt, or a permanent error", async () => {
    for (const err of [new Error("render timed out"), new UnrecoverableError("Incorrect API key provided")]) {
      const r = await handleFailedWeek(weekJob({ id: stalledJobId(CLINIC, WEEK), attemptsMade: EXHAUSTED_RETRY_ATTEMPTS, attempts: EXHAUSTED_RETRY_ATTEMPTS }), err, deps(SATURDAY_EVENING));
      expect(r).toMatchObject({ requeued: false, skipped: "extra_run" });
    }
    expect(added).toEqual([]);
    // Each told as "failed again": runDentvidWeek's week_failed:<clinic>:<week> was already used that day.
    expect(raised.map((a) => a.key)).toEqual([`week_failed:${CLINIC}:${WEEK}:again`, `week_failed:${CLINIC}:${WEEK}:again`]);
  });

  it("another job for the same week failing after the extra run was claimed: not queued a third time, told as 'failed again'", async () => {
    await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    const r = await handleFailedWeek(weekJob({ id: "week-btn:x:y", attemptsMade: 4 }), new Error("render timed out"), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ requeued: false, skipped: "already" });
    expect(added).toHaveLength(1);
    expect(raised[1].key).toBe(`week_failed:${CLINIC}:${WEEK}:again`);
  });

  it("a transient failure at attempt 2 of 4 does nothing: BullMQ retries it and runDentvidWeek speaks for it", async () => {
    const r = await handleFailedWeek(weekJob({ attemptsMade: 2 }), new Error("429 Rate limit reached"), deps(SATURDAY_EVENING));
    expect(r).toEqual({ handled: false, reason: "not_final" });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
    expect(delays).toEqual([]);
  });

  it("the last of four attempts failing for a passing reason gets the one extra run too: later, fewer attempts, its own place in the queue", async () => {
    // A batch week (priority 100 + hours to its deadline) does not jump the rest of the batch.
    const r = await handleFailedWeek(weekJob({ attemptsMade: 4, priority: 137 }), new Error("render timed out after 900s"), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ kind: "exhausted", requeued: true });
    expect(added).toHaveLength(1);
    expect(added[0].opts).toMatchObject({ jobId: stalledJobId(CLINIC, WEEK), delay: EXHAUSTED_RETRY_DELAY_MS, attempts: EXHAUSTED_RETRY_ATTEMPTS, priority: 137 });
    expect(EXHAUSTED_RETRY_DELAY_MS).toBe(30 * 60_000);
    expect(EXHAUSTED_RETRY_ATTEMPTS).toBe(2);

    // runDentvidWeek already sent "week failed" (asking for a retry by hand): this is a separate, short notice.
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe(`week_requeued:${CLINIC}:${WEEK}`);
    expect(raised[0].severity).toBe("warning");
    const text = renderAlert(raised[0]).text;
    expect(text).toMatch(/Queued once more by itself \(job week-stalled:[^)]+\), starting in 30 minutes/);
    expect(text).toMatch(/No need to retry the failed job by hand/);
    expect(text).toContain("render timed out after 900s");
  });

  it("an exhausted first week (priority 1, someone is waiting) keeps priority 1; a job without one goes with the batch", async () => {
    await handleFailedWeek(weekJob({ attemptsMade: 4, priority: DENTVID_PRIORITY.firstWeek }), new Error("render timed out"), deps(SATURDAY_EVENING));
    expect(added[0].opts.priority).toBe(DENTVID_PRIORITY.firstWeek);
    await store.del(stallRetryKey(CLINIC, WEEK));
    await handleFailedWeek(weekJob({ attemptsMade: 4 }), new Error("render timed out"), deps(SATURDAY_EVENING));
    expect(added[1].opts.priority).toBe(DENTVID_PRIORITY.batch);
  });

  it("a permanent error (runDentvidWeek's UnrecoverableError) is alerted and marked, never queued again", async () => {
    const r = await handleFailedWeek(weekJob(), new UnrecoverableError("Incorrect API key provided"), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ handled: true, kind: "permanent", requeued: false, skipped: "permanent" });
    expect(added).toEqual([]);
    expect(delays).toEqual([[CLINIC, WEEK, "delayed"]]);
    // The very alert runDentvidWeek sent (same key, so the mailer does not double it).
    expect(raised[0].key).toBe(`week_failed:${CLINIC}:${WEEK}`);
    expect(renderAlert(raised[0]).text).toMatch(/permanent error/);
  });

  it("a spend-guard refusal (parked, owner already told) and other jobs are left alone", async () => {
    expect(await handleFailedWeek(weekJob({ attemptsMade: 4 }), new Error("spend guard"), deps(SATURDAY_EVENING), { spendRefusal: true })).toEqual({
      handled: false,
      reason: "spend_refusal",
    });
    expect(await handleFailedWeek(weekJob({ name: "recording" }), stalled(), deps(SATURDAY_EVENING))).toEqual({ handled: false, reason: "not_week" });
    expect(await handleFailedWeek(undefined, stalled(), deps(SATURDAY_EVENING))).toEqual({ handled: false, reason: "not_week" });
    expect(await handleFailedWeek(weekJob({ data: {} }), stalled(), deps(SATURDAY_EVENING))).toEqual({ handled: false, reason: "no_clinic" });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
  });

  it("the queue refusing: no extra run, the claim is given back, the owner reads the queue's own error and requeues by hand", async () => {
    queueDown = true;
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ requeued: false, skipped: "queue_error" });
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).toBeNull();
    const text = renderAlert(raised[0]).text;
    expect(text).toMatch(/It could not be queued once more: redis connection closed\./);
    expect(text).toMatch(/requeue the week in \/dentvideo\/admin/);
  });

  it("an id BullMQ refuses is a queue error the owner can read, never a silent success", async () => {
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING, { queue: { add: async (n, _d, o) => bullmqValidates(n, { ...o, jobId: `${weekJobId(CLINIC, WEEK)}:stalled` }) } }));
    expect(r).toMatchObject({ requeued: false, skipped: "queue_error" });
    expect(renderAlert(raised[0]).text).toMatch(/Custom Id cannot contain :/);
  });

  it("the ops store down: no extra run (it could not be kept to once), still alerted and saying why", async () => {
    store.down = true;
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ requeued: false, skipped: "no_claim" });
    expect(added).toEqual([]);
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe(`week_failed:${CLINIC}:${WEEK}:stalled`);
    expect(renderAlert(raised[0]).text).toMatch(/ops store \(Redis\) did not answer/);
  });

  it("an old job without a week means the week it fails in, whose Monday morning is behind it", async () => {
    const r = await handleFailedWeek(weekJob({ data: { clinicId: CLINIC, count: 5 } }), stalled(), deps(new Date("2026-11-25T10:00:00Z")));
    expect(r).toMatchObject({ week: "2026-11-23", requeued: false, skipped: "past_deadline" });
    expect(delays).toEqual([[CLINIC, "2026-11-23", "delayed"]]);
    // Early on that Monday (before 07:00 in Istanbul) it would still get its extra run, stamped with the week.
    await handleFailedWeek(weekJob({ data: { clinicId: CLINIC, count: 5 } }), stalled(), deps(new Date("2026-11-23T02:00:00Z")));
    expect(added[0].data).toEqual({ clinicId: CLINIC, count: 5, week: "2026-11-23" });
  });

  it("the clinic cannot be read: the alert names its id and the default zone decides the deadline", async () => {
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING, { clinic: async () => Promise.reject(new Error("liman down")) }));
    expect(r).toMatchObject({ requeued: true });
    expect(raised[0].clinic).toEqual({ id: CLINIC });
  });
});

describe("what the owner actually receives (the real mailer: one email per alert key and day)", () => {
  // Before: the handler reused runDentvidWeek's key week_failed:<clinic>:<week>, so the mailer dropped
  // its "queued once more" note as a duplicate, and a second failure the same evening reached nobody.
  let mails: Mail[];
  let clock: Date;
  let mailStore: MemoryOpsStore;
  const deliver = (a: OwnerAlert) => deliverAlert({ store: mailStore, send: async (m) => (mails.push(m), true), env: {}, now: () => clock }, a);
  /** runDentvidWeek's own alert on a week's last attempt (jobs.ts). */
  const lastAttemptAlert = (attempts: number, err: Error) =>
    deliver(alerts.weekFailed({ clinic: { id: CLINIC, name: "Gülüş Dental" }, week: WEEK, attempts, error: cleanError(err), permanent: false }));

  beforeEach(() => {
    mails = [];
    mailStore = new MemoryOpsStore();
  });

  it("an exhausted week: the failure, then the re-queue notice, then the extra run failing too: three emails, none dropped", async () => {
    clock = SATURDAY_EVENING;
    const err = new Error("render timed out after 900s");
    expect(await lastAttemptAlert(4, err)).toBe("sent");
    await handleFailedWeek(weekJob({ attemptsMade: 4, priority: 120 }), err, deps(clock, { alert: deliver }));
    clock = new Date(SATURDAY_EVENING.getTime() + 50 * 60_000);
    // The extra run uses its two attempts: runDentvidWeek's alert (same key, same day) is dropped; the handler's is not.
    expect(await lastAttemptAlert(2, err)).toBe("deduped");
    await handleFailedWeek(weekJob({ id: stalledJobId(CLINIC, WEEK), attemptsMade: 2, attempts: 2 }), err, deps(clock, { alert: deliver }));
    expect(mails).toHaveLength(3);
    expect(mails[1].subject).toMatch(/A failed week was queued once more/);
    expect(mails[1].text).toMatch(/No need to retry the failed job by hand/);
    expect(mails[2].subject).toMatch(/A paying clinic's week failed/);
    expect(mails[2].text).toMatch(/failed again after it had already been queued once more/);
  });

  it("stalled on Saturday at 21:10, the extra run failing again 40 minutes later (stalled, or out of attempts): the owner hears both", async () => {
    for (const second of ["stalled", "exhausted"] as const) {
      mails = [];
      mailStore = new MemoryOpsStore();
      await store.del(stallRetryKey(CLINIC, WEEK));
      clock = SATURDAY_EVENING;
      await handleFailedWeek(weekJob(), stalled(), deps(clock, { alert: deliver }));
      clock = new Date(SATURDAY_EVENING.getTime() + 40 * 60_000);
      const extra = weekJob({ id: stalledJobId(CLINIC, WEEK), attemptsMade: second === "stalled" ? 1 : 4 });
      if (second === "stalled") await handleFailedWeek(extra, stalled(), deps(clock, { alert: deliver }));
      else {
        await lastAttemptAlert(4, new Error("render timed out"));
        await handleFailedWeek(extra, new Error("render timed out"), deps(clock, { alert: deliver }));
      }
      expect(mails[0].text).toMatch(/Queued once more by itself/);
      expect(mails.at(-1)!.text).toMatch(/failed again after it had already been queued once more/);
      expect(mails.length).toBe(second === "stalled" ? 2 : 3);
    }
  });
});

describe("weekClinic", () => {
  const db = (row: unknown, error: { message: string } | null = null) => () =>
    ({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error }) }) }) }),
    }) as never;

  it("reads the name for the alert and the zone for the deadline from the profile", async () => {
    expect(await weekClinic(db({ id: CLINIC, plan_tier: "practice", profile: { name: "Gülüş", country: "TR" } }), CLINIC)).toEqual({
      ref: { id: CLINIC, name: "Gülüş", country: "TR", tier: "practice" },
      tz: "Europe/Istanbul",
    });
    expect((await weekClinic(db({ profile: { country: "US", timezone: "America/Los_Angeles" } }), CLINIC)).tz).toBe("America/Los_Angeles");
  });

  it("never throws", async () => {
    expect(await weekClinic(db(null, { message: "timeout" }), CLINIC)).toEqual({ ref: { id: CLINIC }, tz: "UTC" });
    expect(
      await weekClinic(() => {
        throw new Error("DENTVID_SUPABASE_URL / DENTVID_SERVICE_ROLE_KEY are not set");
      }, CLINIC),
    ).toEqual({ ref: { id: CLINIC }, tz: "UTC" });
  });
});
