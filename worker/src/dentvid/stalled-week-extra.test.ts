import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnrecoverableError } from "bullmq";
import {
  EXHAUSTED_RETRY_ATTEMPTS,
  EXTRA_RUN_STALLED,
  extraRunRestarted,
  extraStalledWhat,
  finalKind,
  handleFailedRestyle,
  handleFailedWeek,
  MAX_STALLED_COUNT,
  refuseRestartedExtraRun,
  stalledBefore,
  STALLED_RETRY_ATTEMPTS,
  weekRunCtx,
  type StalledWeekDeps,
} from "./stalled-week.js";
import { MemoryOpsStore, renderAlert, type OwnerAlert } from "./ops-alert.js";
import { WEEK_RETRY } from "./job-options.js";
import { weekJobId } from "./schedule.js";
import { guardConfig, MemoryGuardStore, SpendGuard } from "./spend-guard.js";

/**
 * The one extra run a failed week gets has no stall tolerance of its own.
 * Before, the handler removed the failed job and added the extra run under
 * the same id with a fresh stall count, so a week whose own content kills
 * the worker (out of memory in its render) crashed it 6 times in a row at the
 * head of the queue and used up the clinic's weekly run cap. Now the extra
 * run is marked (`extra: true`) and the worker refuses it as soon as it is
 * picked up again after a stall, before it reserves anything.
 */

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const WEEK = "2026-11-30";
const OWN_ID = weekJobId(CLINIC, WEEK);
const SATURDAY_EVENING = new Date("2026-11-28T21:10:00Z");

/** A job as the worker picks it up (the fields a BullMQ Job has). */
const picked = (over: Partial<{ data: unknown; attemptsMade: number; attemptsStarted: number; stalledCounter: number }> = {}) => ({
  data: { clinicId: CLINIC, count: 5, week: WEEK, extra: true },
  attemptsMade: 0,
  attemptsStarted: 1,
  stalledCounter: 0,
  ...over,
});

describe("the extra run is refused when it is picked up again after a stall", () => {
  it("a first start, and a normal retry after an ordinary failure, run", () => {
    expect(extraRunRestarted(picked())).toBe(false);
    // Attempt 2 after attempt 1 failed normally: started twice, failed once.
    expect(extraRunRestarted(picked({ attemptsMade: 1, attemptsStarted: 2 }))).toBe(false);
  });

  it("the extra run back after its process died: refused (by BullMQ's stall count, or by starts minus attempts)", () => {
    expect(extraRunRestarted(picked({ attemptsStarted: 2, stalledCounter: 1 }))).toBe(true);
    // A BullMQ that keeps no stall count: started twice, no attempt finished.
    expect(extraRunRestarted(picked({ attemptsStarted: 2, stalledCounter: undefined }))).toBe(true);
    // Its second attempt died after the first failed normally.
    expect(extraRunRestarted(picked({ attemptsMade: 1, attemptsStarted: 3, stalledCounter: 1 }))).toBe(true);
  });

  it("an ordinary week keeps the stall tolerance deploys and restarts need", () => {
    const week = { clinicId: CLINIC, count: 5, week: WEEK, batch: true };
    expect(stalledBefore(picked({ data: week, attemptsStarted: 2, stalledCounter: 1 }))).toBe(true);
    expect(extraRunRestarted(picked({ data: week, attemptsStarted: 2, stalledCounter: 1 }))).toBe(false);
    expect(extraRunRestarted(picked({ data: { ...week, extra: "yes" }, attemptsStarted: 2, stalledCounter: 1 }))).toBe(false);
    expect(extraRunRestarted(picked({ data: undefined, attemptsStarted: 3, stalledCounter: 2 }))).toBe(false);
  });

  it("the refusal is a final 'stalled' failure, told as 'failed again' and in words that fit", async () => {
    const err = new UnrecoverableError(EXTRA_RUN_STALLED);
    expect(finalKind({ attemptsMade: 0, opts: { attempts: STALLED_RETRY_ATTEMPTS } }, err)).toBe("stalled");
    // Its old, plain-Error form too.
    expect(finalKind({ attemptsMade: 0, opts: { attempts: 2 } }, new Error(EXTRA_RUN_STALLED))).toBe("stalled");

    const store = new MemoryOpsStore();
    const raised: OwnerAlert[] = [];
    const added: unknown[] = [];
    const kept = new Map<string, string>([[OWN_ID, "failed"]]);
    const deps: StalledWeekDeps = {
      queue: {
        add: async (_n, data, opts) => (added.push(data), kept.set(String(opts.jobId), "delayed"), {}),
        getJob: async (id) => (kept.has(id) ? { getState: async () => kept.get(id)!, remove: async () => void kept.delete(id) } : undefined),
      },
      store,
      alert: async (a) => (raised.push(a), "sent"),
      setDelay: async () => {},
      clinic: async (id) => ({ ref: { id, name: "Gülüş Dental" }, tz: "Europe/Istanbul" }),
      now: SATURDAY_EVENING,
    };
    // The original week stalled for good: queued once more, marked as the extra run.
    const first = await handleFailedWeek({ name: "week", id: OWN_ID, data: { clinicId: CLINIC, count: 5, week: WEEK }, attemptsMade: 1, opts: { attempts: 4 } }, new UnrecoverableError("job stalled more than allowable limit"), deps);
    expect(first).toMatchObject({ kind: "stalled", requeued: true });
    expect(added).toEqual([{ clinicId: CLINIC, count: 5, week: WEEK, extra: true, extraFor: "stalled" }]);
    // Its process dies under it and the worker refuses its second start.
    kept.set(OWN_ID, "failed");
    const again = await handleFailedWeek({ name: "week", id: OWN_ID, data: added[0], attemptsMade: 1, opts: { attempts: STALLED_RETRY_ATTEMPTS } }, err, deps);
    expect(again).toMatchObject({ kind: "stalled", requeued: false, skipped: "already" });
    expect(added).toHaveLength(1);
    expect(raised.map((a) => a.key)).toEqual([`week_failed:${CLINIC}:${WEEK}:stalled`, `week_failed:${CLINIC}:${WEEK}:again`]);
    const text = renderAlert(raised[1]).text;
    expect(text).toMatch(/It was not started a second time/);
    expect(text).not.toMatch(/stopped more than once/);
    // It was queued because this week stopped the worker: the email may say it could be the cause.
    expect(text).toMatch(/had already stopped the worker before/);
  });

  it("an exhausted week's extra run cut off by a restart: the email does not blame the week for the worker's memory", async () => {
    const store = new MemoryOpsStore();
    const raised: OwnerAlert[] = [];
    const added: unknown[] = [];
    const kept = new Map<string, string>([[OWN_ID, "failed"]]);
    const deps: StalledWeekDeps = {
      queue: {
        add: async (_n, data, opts) => (added.push(data), kept.set(String(opts.jobId), "delayed"), {}),
        getJob: async (id) => (kept.has(id) ? { getState: async () => kept.get(id)!, remove: async () => void kept.delete(id) } : undefined),
      },
      store,
      alert: async (a) => (raised.push(a), "sent"),
      setDelay: async () => {},
      clinic: async (id) => ({ ref: { id, name: "Gülüş Dental" }, tz: "Europe/Istanbul" }),
      now: SATURDAY_EVENING,
    };
    // Four ordinary failures (render timeouts): queued once more, marked as an exhausted week's extra run.
    const first = await handleFailedWeek({ name: "week", id: OWN_ID, data: { clinicId: CLINIC, count: 5, week: WEEK }, attemptsMade: 4, opts: { attempts: 4 } }, new Error("render timed out"), deps);
    expect(first).toMatchObject({ kind: "exhausted", requeued: true });
    expect(added).toEqual([{ clinicId: CLINIC, count: 5, week: WEEK, extra: true, extraFor: "exhausted" }]);
    // A deploy cuts the extra run off; the worker refuses its second start (and takes the mark off).
    kept.set(OWN_ID, "failed");
    const { extra: _m, ...refusedData } = added[0] as Record<string, unknown>;
    await handleFailedWeek({ name: "week", id: OWN_ID, data: refusedData, attemptsMade: 1, opts: { attempts: EXHAUSTED_RETRY_ATTEMPTS } }, new UnrecoverableError(EXTRA_RUN_STALLED), deps);
    const text = renderAlert(raised[1]).text;
    expect(raised[1].key).toBe(`week_failed:${CLINIC}:${WEEK}:again`);
    expect(text).toMatch(/It was not started a second time/);
    expect(text).not.toMatch(/run out of memory\./);
    expect(text).not.toMatch(/had already stopped the worker/);
    expect(text).toMatch(/never stopped the worker before/);
  });

  it("the words follow why the extra run was queued; an extra run queued before that was recorded is not blamed either", () => {
    expect(extraStalledWhat({ data: { extraFor: "stalled" } })).toMatch(/may be what makes the worker run out of memory/);
    for (const data of [{ extraFor: "exhausted" }, { extra: true }, undefined]) {
      const what = extraStalledWhat({ data });
      expect(what).toMatch(/It was not started a second time/);
      expect(what).not.toMatch(/had already stopped the worker|may be what makes/);
    }
  });
});

/**
 * A BullMQ job as Redis keeps it, for the refusal and a later retry. BullMQ
 * 5.76's job.retry("failed") (reprocessJob-8.lua) removes failedReason,
 * processedOn and finishedOn, and resets attemptsMade / attemptsStarted only
 * when asked to: the stall count `stc` is never reset. The delivery watchdog
 * (delivery.ts handleLate) and the owner's "Retry job" call it with no options.
 */
function bullJob(data: Record<string, unknown>, opts: { updateFails?: boolean; keepsData?: boolean } = {}) {
  const job = {
    id: OWN_ID,
    data: { ...data } as unknown,
    attemptsMade: 0,
    attemptsStarted: 0,
    stalledCounter: 0,
    state: "wait",
    async updateData(d: unknown) {
      if (opts.updateFails) throw new Error("Connection is closed.");
      // keepsData: a worker without the fix's write, to show the test would catch the bug.
      if (!opts.keepsData) job.data = d;
    },
  };
  /** moveToActive: one more start. */
  const pickUp = () => (job.attemptsStarted++, (job.state = "active"));
  /** The process died: moveStalledJobsToWait counts the stall and puts it back, or fails it past maxStalledCount. */
  const stall = () => (job.stalledCounter++, (job.state = job.stalledCounter > MAX_STALLED_COUNT ? "failed" : "wait"));
  /** moveToFinished on a failure. */
  const fail = () => (job.attemptsMade++, (job.state = "failed"));
  const complete = () => (job.attemptsMade++, (job.state = "completed"));
  /** job.retry("failed"): back to wait, the counters kept. */
  const retry = () => {
    if (job.state !== "failed") throw new Error(`retry of a ${job.state} job`);
    job.state = "wait";
  };
  /** One pickup by the worker's week processor: refused, or it runs (and then completes). */
  const work = async (): Promise<"refused" | "ran"> => {
    pickUp();
    try {
      await refuseRestartedExtraRun(job);
    } catch (e) {
      expect(e).toBeInstanceOf(UnrecoverableError);
      expect((e as Error).message).toBe(EXTRA_RUN_STALLED);
      fail();
      return "refused";
    }
    complete();
    return "ran";
  };
  return { job, pickUp, stall, fail, retry, work };
}

describe("a refused extra run can still be retried on purpose (delivery watchdog, 'Retry job')", () => {
  const extraData = { clinicId: CLINIC, count: 5, week: WEEK, extra: true, extraFor: "stalled" };

  it("cut off once, refused at its next pickup, then retried by the watchdog: the retry runs the week", async () => {
    const b = bullJob(extraData);
    // Its first start: the process dies under it.
    b.pickUp();
    await refuseRestartedExtraRun(b.job);
    b.stall();
    // Picked up again: refused before it reserves anything.
    expect(await b.work()).toBe("refused");
    expect(b.job).toMatchObject({ state: "failed", stalledCounter: 1, attemptsStarted: 2, attemptsMade: 1 });
    // The mark is off; why it was queued stays for the owner's email.
    expect(b.job.data).toEqual({ clinicId: CLINIC, count: 5, week: WEEK, extraFor: "stalled" });
    // After the clinic's Monday morning the delivery watchdog retries it (stc 1, ats 3, atm 1 kept).
    b.retry();
    expect(await b.work()).toBe("ran");
    expect(b.job).toMatchObject({ state: "completed", stalledCounter: 1, attemptsStarted: 3 });
  });

  it("without taking the mark off (the bug): every retry is refused again at once and the week never runs", async () => {
    const b = bullJob(extraData, { keepsData: true });
    b.pickUp();
    b.stall();
    expect(await b.work()).toBe("refused");
    b.retry();
    expect(await b.work()).toBe("refused");
    b.retry();
    expect(await b.work()).toBe("refused");
  });

  it("the mark cannot be taken off (Redis not answering): still refused, nothing thrown but the refusal", async () => {
    const b = bullJob(extraData, { updateFails: true });
    b.pickUp();
    b.stall();
    expect(await b.work()).toBe("refused");
    expect((b.job.data as { extra?: unknown }).extra).toBe(true);
  });

  it("an ordinary week, a first start and a normal retry are not touched", async () => {
    const ordinary = bullJob({ clinicId: CLINIC, count: 5, week: WEEK, batch: true });
    ordinary.pickUp();
    ordinary.stall();
    expect(await ordinary.work()).toBe("ran");
    expect(ordinary.job.data).toEqual({ clinicId: CLINIC, count: 5, week: WEEK, batch: true });
    const fresh = bullJob(extraData);
    expect(await fresh.work()).toBe("ran");
    expect(fresh.job.data).toEqual(extraData);
  });

  it("a retried run that dies again has only what is left of BullMQ's stall tolerance: at most MAX_STALLED_COUNT more runs", async () => {
    const b = bullJob(extraData);
    b.pickUp();
    await refuseRestartedExtraRun(b.job);
    b.stall();
    expect(await b.work()).toBe("refused");
    b.retry();
    // A week that kills the worker every time, retried on purpose: it runs, dies, runs, dies, and BullMQ fails it.
    let runs = 0;
    while (b.job.state === "wait") {
      b.pickUp();
      await refuseRestartedExtraRun(b.job);
      runs++;
      b.stall();
    }
    expect(runs).toBe(MAX_STALLED_COUNT);
    expect(b.job.state).toBe("failed");
  });
});

describe("weekRunCtx: under the worker the failed-job handler sends the failure email", () => {
  it("passes the job's id and attempts, and hands the final alert to the handler", () => {
    expect(weekRunCtx({ id: OWN_ID, attemptsMade: 2, opts: { attempts: 4 } })).toEqual({ jobId: OWN_ID, attemptsMade: 2, attempts: 4, failedHandlerAlerts: true });
    expect(weekRunCtx({ id: null, attemptsMade: 0 })).toEqual({ jobId: undefined, attemptsMade: 0, attempts: undefined, failedHandlerAlerts: true });
  });
});

describe("the runs a failed week can take stay inside the clinic's cap for that delivery week", () => {
  const guard = () => new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), dailyUsd: 1e6, monthlyUsd: 1e6, clinicDailyUsd: 1e6 }));
  const reserve = (g: SpendGuard, n: number) => Promise.all(Array.from({ length: n }, () => g.reserve("week", CLINIC, { now: SATURDAY_EVENING, week: WEEK })));

  it("a week that kills the worker every time: 3 runs, then 1 extra run (its restart is refused before it reserves): 2 runs left", async () => {
    const g = guard();
    const runs = MAX_STALLED_COUNT + 1 + 1;
    expect(runs).toBe(4);
    expect((await reserve(g, runs)).every((d) => d.ok)).toBe(true);
    // The clinic's "try again" and the owner's requeue still fit.
    expect((await reserve(g, 2)).every((d) => d.ok)).toBe(true);
    expect(await g.reserve("week", CLINIC, { now: SATURDAY_EVENING, week: WEEK })).toMatchObject({ ok: false, reason: "clinic_weekly_weeks" });
  });

  it("the worst ordinary cases (a stalled week whose extra run fails twice, an exhausted one and its extra run) use 5 and leave one", async () => {
    for (const runs of [MAX_STALLED_COUNT + 1 + STALLED_RETRY_ATTEMPTS, WEEK_RETRY.attempts + EXHAUSTED_RETRY_ATTEMPTS]) {
      const g = guard();
      expect(runs).toBe(5);
      expect((await reserve(g, runs)).every((d) => d.ok)).toBe(true);
      expect(await g.reserve("week", CLINIC, { now: SATURDAY_EVENING, week: WEEK })).toMatchObject({ ok: true });
    }
  });
});

describe("a restyle BullMQ failed for good is marked failed (same finality test as weeks)", () => {
  const markFailed = vi.fn(async (_itemId: string) => {});
  const restyle = (attemptsMade: number, data: unknown = { itemId: "item-1" }) => ({ name: "restyle", data, attemptsMade, opts: { attempts: 2 } });
  beforeEach(() => markFailed.mockClear());

  it("stalled at attempt 1 of 2 (its process died three times): marked failed, not left 'updating…'", async () => {
    // Before: index.ts checked attemptsMade >= attempts only (1 >= 2: false), so the card said "updating…" forever.
    expect(await handleFailedRestyle(restyle(1), new UnrecoverableError("job stalled more than allowable limit"), markFailed)).toBe(true);
    expect(markFailed).toHaveBeenCalledWith("item-1");
  });

  it("every attempt used, or an UnrecoverableError: marked failed", async () => {
    expect(await handleFailedRestyle(restyle(2), new Error("render timed out"), markFailed)).toBe(true);
    expect(await handleFailedRestyle(restyle(1), new UnrecoverableError("bad plan"), markFailed)).toBe(true);
    expect(markFailed).toHaveBeenCalledTimes(2);
  });

  it("a failure BullMQ will retry, another job, or no item id: left alone", async () => {
    expect(await handleFailedRestyle(restyle(1), new Error("render timed out"), markFailed)).toBe(false);
    expect(await handleFailedRestyle({ ...restyle(2), name: "recording" }, new Error("x"), markFailed)).toBe(false);
    expect(await handleFailedRestyle(restyle(2, {}), new Error("x"), markFailed)).toBe(false);
    expect(await handleFailedRestyle(undefined, new Error("x"), markFailed)).toBe(false);
    expect(markFailed).not.toHaveBeenCalled();
  });

  it("a database that refuses the update does not throw into the worker's event handler", async () => {
    const failing = vi.fn(async () => Promise.reject(new Error("liman down")));
    await expect(handleFailedRestyle(restyle(2), new Error("x"), failing)).resolves.toBe(true);
  });
});
