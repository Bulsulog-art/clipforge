import { beforeEach, describe, expect, it } from "vitest";
import { Job, UnrecoverableError } from "bullmq";
import {
  EXHAUSTED_RETRY_ATTEMPTS,
  EXHAUSTED_RETRY_DELAY_MS,
  finalKind,
  handleFailedWeek,
  MAX_STALLED_COUNT,
  STALL_RETRY_DELAY_MS,
  STALLED_RETRY_ATTEMPTS,
  stallRetryKey,
  weekClinic,
  weekJobFinal,
  type FailedWeekJob,
  type KeptWeekJob,
  type StalledWeekDeps,
} from "./stalled-week.js";
import { alerts, cleanError, deliverAlert, MemoryOpsStore, renderAlert, type Mail, type OwnerAlert, type WeekDelay } from "./ops-alert.js";
import { DENTVID_PRIORITY, WEEK_RETRY } from "./job-options.js";
import { mondayMorning } from "./timezone.js";
import { weekJobId } from "./schedule.js";
import { guardConfig, MemoryGuardStore, SpendGuard } from "./spend-guard.js";

/**
 * A week killed twice by worker restarts: BullMQ fails it itself
 * ("job stalled more than allowable limit", an UnrecoverableError) at attempt
 * 1 of 4. The owner is told, the library says "delayed", and before the
 * clinic's Monday 07:00 the week is queued once more, exactly once, under the
 * week's own job id, so nothing else can start a second run beside it.
 */

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const WEEK = "2026-11-30";
const OWN_ID = weekJobId(CLINIC, WEEK);
// Istanbul: Monday 30 Nov 07:00 +03 = 04:00 UTC.
const SATURDAY_EVENING = new Date("2026-11-28T21:10:00Z");
const MONDAY_LATE = new Date("2026-11-30T05:00:00Z");

const stalled = () => new UnrecoverableError("job stalled more than allowable limit");
const weekJob = (over: Partial<{ attemptsMade: number; attempts: number; priority: number; data: unknown; name: string; id: string }> = {}): FailedWeekJob => ({
  name: over.name ?? "week",
  id: over.id ?? OWN_ID,
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

type Kept = { state: string; data: unknown; opts: Record<string, unknown> };

let store: MemoryOpsStore;
/** What the queue holds, by job id. Like BullMQ: a failed job stays (removeOnFail keeps it 14 days). */
let jobs: Map<string, Kept>;
let added: { name: string; data: unknown; opts: Record<string, unknown> }[];
let raised: OwnerAlert[];
let delays: [string, string, WeekDelay][];
let queueDown: boolean;
let removeFails: boolean;

/**
 * The dentvid queue as BullMQ behaves: an add is validated, and an add whose id the queue
 * still keeps (in any state, failed included) is silently ignored. remove() refuses a job
 * another worker holds (active), as Job.remove does.
 */
function fakeQueue(): StalledWeekDeps["queue"] {
  return {
    add: async (name, data, opts) => {
      if (queueDown) throw new Error("redis connection closed");
      // A fake that accepted anything hid that BullMQ refused an id form: validate like BullMQ.
      bullmqValidates(name, opts);
      const id = String(opts.jobId);
      if (jobs.has(id)) return {};
      jobs.set(id, { state: Number(opts.delay) > 0 ? "delayed" : "prioritized", data, opts });
      added.push({ name, data, opts });
      return {};
    },
    getJob: async (id): Promise<KeptWeekJob | undefined> => {
      if (queueDown) throw new Error("redis connection closed");
      const j = jobs.get(id);
      if (!j) return undefined;
      return {
        getState: async () => jobs.get(id)?.state ?? "unknown",
        remove: async () => {
          if (removeFails || jobs.get(id)?.state === "active") throw new Error(`Job ${id} could not be removed because it is locked by another worker`);
          jobs.delete(id);
        },
      };
    },
  };
}

/** The failed job as BullMQ keeps it when the "failed" event fires. */
const keepFailed = (id = OWN_ID) => jobs.set(id, { state: "failed", data: { clinicId: CLINIC, count: 5, week: WEEK }, opts: {} });

/**
 * What the clinic's "try again" (web api/dentvideo/week weekRunFor) and the owner's requeue
 * (web admin-actions requeueWeek) do with the week's own id: a failed or finished job is
 * removed and the week queued again; anything waiting is left alone (web week-job.test.ts
 * "leaves a run that is waiting or being made alone").
 */
async function pressTryAgain(q: StalledWeekDeps["queue"]): Promise<"already" | "queued"> {
  const kept = await q.getJob(OWN_ID);
  const state = kept ? await kept.getState() : null;
  if (state && state !== "failed" && state !== "completed") return "already";
  if (kept) await kept.remove();
  await q.add("week", { clinicId: CLINIC, count: 5, week: WEEK }, { jobId: OWN_ID, ...WEEK_RETRY, priority: DENTVID_PRIORITY.firstWeek });
  return "queued";
}

function deps(now: Date, over: Partial<StalledWeekDeps> = {}): StalledWeekDeps {
  return {
    queue: fakeQueue(),
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
  jobs = new Map();
  keepFailed();
  added = [];
  raised = [];
  delays = [];
  queueDown = false;
  removeFails = false;
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
    // The week's own id: the failed job was removed to free it, so exactly one job holds this week.
    expect(added[0].opts.jobId).toBe(OWN_ID);
    expect([...jobs.keys()]).toEqual([OWN_ID]);
    expect(jobs.get(OWN_ID)!.state).toBe("delayed");
    expect(added[0].opts.delay).toBe(STALL_RETRY_DELAY_MS);
    expect(added[0].opts.delay).toBe(5 * 60_000);
    // Ahead of the weekly batch: the week never really ran.
    expect(added[0].opts.priority).toBe(DENTVID_PRIORITY.firstWeek);
    expect(added[0].opts.attempts).toBe(STALLED_RETRY_ATTEMPTS);
    expect(added[0].opts.backoff).toEqual(WEEK_RETRY.backoff);
    // Same week, same promise: a full week asked for, of which jobs.ts makes only the missing videos.
    expect(added[0].data).toEqual({ clinicId: CLINIC, count: 5, week: WEEK, batch: true });

    expect(raised).toHaveLength(1);
    // Its own key: runDentvidWeek's week_failed:<clinic>:<week> must not swallow a later failure of the same day.
    expect(raised[0].key).toBe(`week_failed:${CLINIC}:${WEEK}:stalled`);
    const mail = renderAlert(raised[0]);
    expect(mail.subject).toMatch(/Gülüş Dental/);
    expect(mail.text).toContain("stalled more than allowable limit");
    expect(mail.text).toMatch(/stopped more than once/);
    expect(mail.text).toContain(`Queued once more by itself (job ${OWN_ID}), starting in 5 minutes`);
    expect(mail.text).toMatch(/with 2 attempts/);
    expect(mail.text).toMatch(/taken off BullMQ's failed list to free the week's id/);
    // Nothing that contradicts the extra run: no "retried automatically 0 time(s)", no "retry it by hand".
    expect(mail.text).not.toMatch(/Retried automatically/);
    expect(mail.text).not.toMatch(/failed → retry|retry that job/);
    expect(mail.text).toMatch(/start no second run beside it/);
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).not.toBeNull();
  });

  it("the extra run's id is one BullMQ accepts (three parts; a fourth, as in `${id}:stalled`, is refused)", () => {
    expect(OWN_ID.split(":")).toHaveLength(3);
    expect(() => bullmqValidates("week", { jobId: OWN_ID, delay: STALL_RETRY_DELAY_MS, ...WEEK_RETRY, priority: 1 })).not.toThrow();
    expect(() => bullmqValidates("week", { jobId: `${OWN_ID}:stalled` })).toThrow(/Custom Id cannot contain :/);
  });

  it("the clinic pressing 'try again' while the extra run waits starts no second run beside it", async () => {
    // Before: the extra run had an id of its own. The app and the admin requeue look only at
    // week:<clinic>:<monday>, saw the failed job there, removed it and queued a second run.
    const deps0 = deps(SATURDAY_EVENING);
    await handleFailedWeek(weekJob(), stalled(), deps0);
    expect(await pressTryAgain(deps0.queue)).toBe("already");
    expect(added).toHaveLength(1);
    expect([...jobs.keys()]).toEqual([OWN_ID]);
  });

  it("the failed job is removed before the add: BullMQ would silently ignore an add under an id it still keeps", async () => {
    // A queue whose remove() does nothing, as if the handler skipped it: the add is swallowed.
    const q = fakeQueue();
    const noRemove: StalledWeekDeps["queue"] = { add: q.add, getJob: async (id) => ({ getState: async () => jobs.get(id)?.state ?? "unknown", remove: async () => {} }) };
    await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING, { queue: noRemove }));
    expect(added).toEqual([]);
    expect(jobs.get(OWN_ID)!.state).toBe("failed");
  });

  it("a remove BullMQ refuses (the job is held by another worker): no extra run, the claim is given back, the owner reads why", async () => {
    removeFails = true;
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ requeued: false, skipped: "queue_error" });
    expect(added).toEqual([]);
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).toBeNull();
    const text = renderAlert(raised[0]).text;
    expect(text).toMatch(/It could not be queued once more: Job week:[^ ]+ could not be removed because it is locked by another worker\./);
    expect(text).toMatch(/requeue the week in \/dentvideo\/admin/);
  });

  it("a run of the week already waiting (the clinic pressed 'try again' a moment before): nothing is added beside it, the claim stays free", async () => {
    jobs.set(OWN_ID, { state: "prioritized", data: {}, opts: {} });
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ handled: true, requeued: false, skipped: "on_its_way" });
    expect(added).toEqual([]);
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).toBeNull();
    expect(renderAlert(raised[0]).text).toMatch(/a run of this week is already waiting/);
  });

  it("after the clinic's Monday 07:00 it is not queued again (the delivery watchdog has late weeks), but still alerted and marked", async () => {
    expect(MONDAY_LATE.getTime()).toBeGreaterThan(mondayMorning(WEEK, "Europe/Istanbul").getTime());
    const r = await handleFailedWeek(weekJob(), stalled(), deps(MONDAY_LATE));
    expect(r).toMatchObject({ handled: true, requeued: false, skipped: "past_deadline" });
    expect(added).toEqual([]);
    // The failed job stays where the watchdog looks for it (it retries it).
    expect(jobs.get(OWN_ID)!.state).toBe("failed");
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
    // The extra run, under the same id, stalls in its turn.
    jobs.get(OWN_ID)!.state = "failed";
    const r = await handleFailedWeek(weekJob({ attempts: STALLED_RETRY_ATTEMPTS }), stalled(), deps(new Date(SATURDAY_EVENING.getTime() + 20 * 60_000)));
    expect(r).toMatchObject({ handled: true, requeued: false, skipped: "already" });
    expect(added).toHaveLength(1);
    // Left in the failed list, where the app's "try again", the admin requeue and the watchdog find it.
    expect(jobs.get(OWN_ID)!.state).toBe("failed");
    expect(delays).toHaveLength(2);
    expect(raised[1].key).toBe(`week_failed:${CLINIC}:${WEEK}:again`);
    const text = renderAlert(raised[1]).text;
    expect(text).toMatch(/failed again after it had already been queued once more/);
    expect(text).toMatch(/a week gets one extra run by itself, and this one had it/);
    expect(text).toContain(`job id ${OWN_ID}`);
  });

  it("the extra run is never queued again, whatever it failed of: used its attempt, or a permanent error", async () => {
    await store.setNx(stallRetryKey(CLINIC, WEEK), 60);
    for (const err of [new Error("render timed out"), new UnrecoverableError("Incorrect API key provided")]) {
      const r = await handleFailedWeek(weekJob({ attemptsMade: EXHAUSTED_RETRY_ATTEMPTS, attempts: EXHAUSTED_RETRY_ATTEMPTS }), err, deps(SATURDAY_EVENING));
      expect(r).toMatchObject({ requeued: false, skipped: "already" });
    }
    expect(added).toEqual([]);
    // Each told as "failed again": runDentvidWeek's week_failed:<clinic>:<week> was already used that day.
    expect(raised.map((a) => a.key)).toEqual([`week_failed:${CLINIC}:${WEEK}:again`, `week_failed:${CLINIC}:${WEEK}:again`]);
  });

  it("a 'try again' run failing after the extra run: not queued a third time, told as 'failed again'", async () => {
    await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    jobs.get(OWN_ID)!.state = "failed";
    const r = await handleFailedWeek(weekJob({ attemptsMade: 4 }), new Error("render timed out"), deps(SATURDAY_EVENING));
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

  it("the last of four attempts failing for a passing reason gets the one extra run too: later, one attempt, its own place in the queue", async () => {
    // A batch week (priority 100 + hours to its deadline) does not jump the rest of the batch.
    const r = await handleFailedWeek(weekJob({ attemptsMade: 4, priority: 137 }), new Error("render timed out after 900s"), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ kind: "exhausted", requeued: true });
    expect(added).toHaveLength(1);
    expect(added[0].opts).toMatchObject({ jobId: OWN_ID, delay: EXHAUSTED_RETRY_DELAY_MS, attempts: EXHAUSTED_RETRY_ATTEMPTS, priority: 137 });
    expect([...jobs.keys()]).toEqual([OWN_ID]);
    expect(EXHAUSTED_RETRY_DELAY_MS).toBe(30 * 60_000);
    expect(EXHAUSTED_RETRY_ATTEMPTS).toBe(1);

    // runDentvidWeek already sent "week failed" (asking for a retry by hand): this is a separate, short notice.
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe(`week_requeued:${CLINIC}:${WEEK}`);
    expect(raised[0].severity).toBe("warning");
    const text = renderAlert(raised[0]).text;
    expect(text).toContain(`Queued once more by itself (job ${OWN_ID}), starting in 30 minutes`);
    expect(text).toMatch(/with one attempt, to leave room in the clinic's weekly run limit for a retry by hand/);
    expect(text).toMatch(/No need to retry by hand now/);
    expect(text).toContain("render timed out after 900s");
  });

  it("an exhausted first week (priority 1, someone is waiting) keeps priority 1; a job without one goes with the batch", async () => {
    await handleFailedWeek(weekJob({ attemptsMade: 4, priority: DENTVID_PRIORITY.firstWeek }), new Error("render timed out"), deps(SATURDAY_EVENING));
    expect(added[0].opts.priority).toBe(DENTVID_PRIORITY.firstWeek);
    await store.del(stallRetryKey(CLINIC, WEEK));
    keepFailed();
    jobs.get(OWN_ID)!.state = "failed";
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
    const q = fakeQueue();
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING, { queue: { getJob: q.getJob, add: async (n, _d, o) => bullmqValidates(n, { ...o, jobId: `${OWN_ID}:stalled` }) } }));
    expect(r).toMatchObject({ requeued: false, skipped: "queue_error" });
    expect(renderAlert(raised[0]).text).toMatch(/Custom Id cannot contain :/);
  });

  it("the ops store down: no extra run (it could not be kept to once), still alerted and saying why", async () => {
    store.down = true;
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ requeued: false, skipped: "no_claim" });
    expect(added).toEqual([]);
    expect(jobs.get(OWN_ID)!.state).toBe("failed");
    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe(`week_failed:${CLINIC}:${WEEK}:stalled`);
    expect(renderAlert(raised[0]).text).toMatch(/ops store \(Redis\) did not answer/);
  });

  it("no ops store at all: nothing is queued (the extra run, under the week's own id, could not be told from a first failure)", async () => {
    for (let i = 0; i < 2; i++) {
      const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING, { store: null }));
      expect(r).toMatchObject({ requeued: false, skipped: "no_claim" });
    }
    expect(added).toEqual([]);
  });

  it("an old job without a week means the week it fails in, whose Monday morning is behind it", async () => {
    const r = await handleFailedWeek(weekJob({ data: { clinicId: CLINIC, count: 5 } }), stalled(), deps(new Date("2026-11-25T10:00:00Z")));
    expect(r).toMatchObject({ week: "2026-11-23", requeued: false, skipped: "past_deadline" });
    expect(delays).toEqual([[CLINIC, "2026-11-23", "delayed"]]);
    // Early on that Monday (before 07:00 in Istanbul) it would still get its extra run, stamped with the week.
    await handleFailedWeek(weekJob({ data: { clinicId: CLINIC, count: 5 } }), stalled(), deps(new Date("2026-11-23T02:00:00Z")));
    expect(added[0].data).toEqual({ clinicId: CLINIC, count: 5, week: "2026-11-23" });
    expect(added[0].opts.jobId).toBe(weekJobId(CLINIC, "2026-11-23"));
  });

  it("the clinic cannot be read: the alert names its id and the default zone decides the deadline", async () => {
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING, { clinic: async () => Promise.reject(new Error("liman down")) }));
    expect(r).toMatchObject({ requeued: true });
    expect(raised[0].clinic).toEqual({ id: CLINIC });
  });
});

describe("the clinic keeps one run for 'try again' (the spend guard's weekly run cap)", () => {
  // Every run of a week reserves one of the clinic's weekly runs (DENTVID_MAX_WEEKS_PER_CLINIC_WEEK).
  // Before: an exhausted week (4 runs) plus an extra run of 2 attempts filled all 6, and a retry by
  // the clinic or the owner later that weekend was refused and parked until Monday 00:00 UTC.
  const guard = () =>
    new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), dailyUsd: 1e6, monthlyUsd: 1e6, clinicDailyUsd: 1e6 }));
  const runs = async (g: SpendGuard, n: number) => {
    for (let i = 0; i < n; i++) expect((await g.reserve("week", CLINIC, { now: SATURDAY_EVENING })).ok).toBe(true);
  };

  it("an exhausted week (4 runs) and its extra run leave one run", async () => {
    const g = guard();
    await runs(g, WEEK_RETRY.attempts + EXHAUSTED_RETRY_ATTEMPTS);
    expect(await g.reserve("week", CLINIC, { now: SATURDAY_EVENING })).toMatchObject({ ok: true });
  });

  it("a stalled week (BullMQ ran it once more after each allowed stall) and its extra run leave one run", async () => {
    const g = guard();
    await runs(g, MAX_STALLED_COUNT + 1 + STALLED_RETRY_ATTEMPTS);
    expect(await g.reserve("week", CLINIC, { now: SATURDAY_EVENING })).toMatchObject({ ok: true });
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
    jobs.get(OWN_ID)!.state = "failed";
    // The extra run uses its attempt: runDentvidWeek's alert (same key, same day) is dropped; the handler's is not.
    expect(await lastAttemptAlert(EXHAUSTED_RETRY_ATTEMPTS, err)).toBe("deduped");
    await handleFailedWeek(weekJob({ attemptsMade: EXHAUSTED_RETRY_ATTEMPTS, attempts: EXHAUSTED_RETRY_ATTEMPTS }), err, deps(clock, { alert: deliver }));
    expect(mails).toHaveLength(3);
    expect(mails[1].subject).toMatch(/A failed week was queued once more/);
    expect(mails[1].text).toMatch(/No need to retry by hand now/);
    expect(mails[2].subject).toMatch(/A paying clinic's week failed/);
    expect(mails[2].text).toMatch(/failed again after it had already been queued once more/);
  });

  it("an exhausted week whose extra run then fails for a permanent reason: the owner still hears it (not deduped as the first 'week failed')", async () => {
    clock = SATURDAY_EVENING;
    const err = new Error("render timed out after 900s");
    await lastAttemptAlert(4, err);
    await handleFailedWeek(weekJob({ attemptsMade: 4 }), err, deps(clock, { alert: deliver }));
    clock = new Date(SATURDAY_EVENING.getTime() + 40 * 60_000);
    jobs.get(OWN_ID)!.state = "failed";
    await handleFailedWeek(weekJob({ attemptsMade: 1, attempts: EXHAUSTED_RETRY_ATTEMPTS }), new UnrecoverableError("Incorrect API key provided"), deps(clock, { alert: deliver }));
    expect(mails).toHaveLength(3);
    expect(mails[2].text).toMatch(/failed again after it had already been queued once more/);
    expect(mails[2].text).toContain("Incorrect API key provided");
  });

  it("stalled on Saturday at 21:10, the extra run failing again 40 minutes later (stalled, or out of attempts): the owner hears both", async () => {
    for (const second of ["stalled", "exhausted"] as const) {
      mails = [];
      mailStore = new MemoryOpsStore();
      await store.del(stallRetryKey(CLINIC, WEEK));
      jobs = new Map();
      keepFailed();
      clock = SATURDAY_EVENING;
      await handleFailedWeek(weekJob(), stalled(), deps(clock, { alert: deliver }));
      clock = new Date(SATURDAY_EVENING.getTime() + 40 * 60_000);
      jobs.get(OWN_ID)!.state = "failed";
      const extra = weekJob({ attemptsMade: second === "stalled" ? 1 : STALLED_RETRY_ATTEMPTS, attempts: STALLED_RETRY_ATTEMPTS });
      if (second === "stalled") await handleFailedWeek(extra, stalled(), deps(clock, { alert: deliver }));
      else {
        await lastAttemptAlert(STALLED_RETRY_ATTEMPTS, new Error("render timed out"));
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
