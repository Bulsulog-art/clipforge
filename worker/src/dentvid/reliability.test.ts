import { beforeEach, describe, expect, it, vi } from "vitest";
import { candidateWeeks, checkWeekDelivery, DELIVERY_REPORT_KEY, DELIVERY_SCHEDULE, isDue, type DeliveryDb, type DeliveryQueue, type DeliveryReport } from "./delivery.js";
import { checkFirstWeeks, PAID_LIST_KEY, type WatchDb, type WatchQueue } from "./watchdog.js";
import { alerts, MemoryOpsStore, renderAlert, weekStateKey, type OwnerAlert } from "./ops-alert.js";
import { DENTVID_PRIORITY } from "./job-options.js";
import { clinicTimeZone, localParts, mondayMorning, readyEmailAt } from "./timezone.js";
import { DISPATCH_SCHEDULE, weekOf } from "./schedule.js";
import { MemoryParkStore, resumeParked, PARK_MAX_AGE_MS } from "./park.js";
import { failureAlert, MAIL_CRONS } from "./job-failures.js";
import { notifyReadyChecked, READY_MAIL_JOB_OPTS, readyMailJobId, sendReadyAtCivilHour } from "./notify.js";
import type { SpendGuard } from "./spend-guard.js";

/**
 * The post-purchase chain's failure modes (docs/RELIABILITY.md), worker side.
 * Each block names the scenario, what happened before, and proves what happens now.
 */

let store: MemoryOpsStore;
let raised: OwnerAlert[];
const alert = async (a: OwnerAlert) => (raised.push(a), "sent" as const);

beforeEach(() => {
  store = new MemoryOpsStore();
  raised = [];
});

type FakeJob = { state: string; retry: ReturnType<typeof vi.fn>; opts: { priority?: number }; changePriority: ReturnType<typeof vi.fn>; data?: unknown; processedOn?: number };
const fjob = (state: string, extra: Partial<FakeJob> = {}): FakeJob => ({ state, retry: vi.fn(async () => {}), opts: {}, changePriority: vi.fn(async () => {}), ...extra });

function fakeQueue(jobs: Record<string, FakeJob> = {}) {
  const map = new Map(Object.entries(jobs));
  const added: { data: unknown; opts: Record<string, unknown> }[] = [];
  const q: DeliveryQueue = {
    getJob: async (id) => {
      const j = map.get(id);
      return j ? { getState: async () => j.state, retry: j.retry, opts: j.opts, changePriority: j.changePriority } : null;
    },
    add: async (_n, data, opts) => {
      if (!map.has(opts.jobId as string)) {
        map.set(opts.jobId as string, fjob("prioritized"));
        added.push({ data, opts });
      }
      return {};
    },
    getJobs: async (types: string[]) => [...map.entries()].filter(([, j]) => types.includes(j.state)).map(([id, j]) => ({ id, name: "week", data: j.data, processedOn: j.processedOn })),
  };
  return { q, map, added };
}

function deliveryDb(over: Partial<DeliveryDb> = {}): DeliveryDb {
  return {
    payingClinics: async () => [],
    activations: async () => [],
    weekMade: async () => new Set(),
    lastDelivered: async () => new Map(),
    clinic: async (id) => ({ id, name: `Clinic ${id}` }),
    ...over,
  };
}

/* ------------------------------------------------------- F4 delivery watchdog */

describe("F4 the Monday deadline itself is checked (delivery watchdog)", () => {
  const WEEK = "2026-11-16";
  // Istanbul: Monday 07:00 +03 = 04:00 UTC. Checked at 05:41 UTC (deadline + 1 h 41).
  const MON_0541 = new Date("2026-11-16T05:41:00Z");
  const ist = { id: "ist", tz: "Europe/Istanbul" };

  it("runs hourly", () => {
    expect(DELIVERY_SCHEDULE.pattern).toBe("41 * * * *");
    expect(MAIL_CRONS.has("watchdog-delivery")).toBe(true);
  });

  // Before: after the Saturday 19:30 check nothing looked again. A week lost on Sunday (Redis
  // restarted without its data, a removed job, a worker down all Sunday) reached Monday in silence.
  it("a week whose job vanished after Saturday is re-queued at the front, the library says 'taking longer', the owner is told", async () => {
    const { q, added } = fakeQueue();
    const r = await checkWeekDelivery({ db: deliveryDb({ payingClinics: async () => [ist] }), queue: q, store, alert, now: MON_0541 });
    expect(r.late).toEqual([expect.objectContaining({ clinicId: "ist", week: WEEK, jobState: "missing", requeued: true })]);
    expect(added).toEqual([{ data: { clinicId: "ist", count: 5, week: WEEK }, opts: expect.objectContaining({ jobId: `week:ist:${WEEK}`, priority: DENTVID_PRIORITY.firstWeek }) }]);
    expect(await store.get(weekStateKey("ist", WEEK))).toBe("retrying");
    expect(raised.map((a) => a.key)).toEqual([`week_late:ist:${WEEK}`]);
    expect(renderAlert(raised[0]).text).toContain("Monday 07:00");
  });

  it("delivered weeks are quiet", async () => {
    const { q, added } = fakeQueue();
    const r = await checkWeekDelivery({ db: deliveryDb({ payingClinics: async () => [ist], weekMade: async () => new Set(["ist"]) }), queue: q, store, alert, now: MON_0541 });
    expect(r).toMatchObject({ due: 1, delivered: 1, late: [] });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
  });

  it("not before the deadline + 1 h grace, and only the clinics whose deadline passed (New York's is still ahead)", async () => {
    const { q } = fakeQueue();
    const ny = { id: "ny", tz: "America/New_York" };
    const early = await checkWeekDelivery({ db: deliveryDb({ payingClinics: async () => [ist, ny] }), queue: q, store, alert, now: new Date("2026-11-16T04:30:00Z") });
    expect(early.due).toBe(0);
    const r = await checkWeekDelivery({ db: deliveryDb({ payingClinics: async () => [ist, ny] }), queue: q, store, alert, now: MON_0541 });
    expect(r.late.map((l) => l.clinicId)).toEqual(["ist"]);
  });

  it("a failed job is retried; a completed-but-empty one gets a fresh run; a waiting one jumps the queue — once per clinic and week", async () => {
    const failed = fjob("failed");
    const waiting = fjob("prioritized", { opts: { priority: 150 } });
    const { q, added } = fakeQueue({ [`week:a:${WEEK}`]: failed, [`week:b:${WEEK}`]: fjob("completed"), [`week:c:${WEEK}`]: waiting });
    const db = deliveryDb({ payingClinics: async () => ["a", "b", "c"].map((id) => ({ id, tz: "Europe/Istanbul" })) });
    await checkWeekDelivery({ db, queue: q, store, alert, now: MON_0541 });
    expect(failed.retry).toHaveBeenCalledWith("failed");
    expect(added.map((a) => a.opts.jobId)).toEqual([`week:b:${WEEK}:late`]);
    expect(waiting.changePriority).toHaveBeenCalledWith({ priority: DENTVID_PRIORITY.firstWeek });
    // An hour later: alerts again (the alert itself de-duplicates per day), but no second re-queue.
    await checkWeekDelivery({ db, queue: q, store, alert, now: new Date(MON_0541.getTime() + 3_600_000) });
    expect(failed.retry).toHaveBeenCalledTimes(1);
    expect(added).toHaveLength(1);
  });

  it("a week that already failed for good keeps saying 'delayed'", async () => {
    await store.set(weekStateKey("ist", WEEK), "delayed", 1);
    const { q } = fakeQueue({ [`week:ist:${WEEK}`]: fjob("failed") });
    await checkWeekDelivery({ db: deliveryDb({ payingClinics: async () => [ist] }), queue: q, store, alert, now: MON_0541 });
    expect(await store.get(weekStateKey("ist", WEEK))).toBe("delayed");
  });

  it("a clinic that started paying after its deadline is not late (the first-week watchdog has it)", async () => {
    const { q } = fakeQueue();
    const r = await checkWeekDelivery({
      db: deliveryDb({ payingClinics: async () => [ist], activations: async () => [{ clinicId: "ist", paidAt: "2026-11-16T05:30:00Z" }] }),
      queue: q,
      store,
      alert,
      now: MON_0541,
    });
    expect(r.due).toBe(0);
    expect(r.behind).toEqual([]);
  });

  it("writes the report the daily sweep reads: last delivered week per paying clinic, behind, failed and stuck jobs per clinic", async () => {
    const { q } = fakeQueue({
      "week:ist:2026-11-09": fjob("failed", { data: { clinicId: "ist" } }),
      "rec:ist:1": fjob("active", { data: { clinicId: "ist" }, processedOn: MON_0541.getTime() - 2 * 3_600_000 }),
      "week:ok:2026-11-16": fjob("completed", { data: { clinicId: "ok" } }),
    });
    const db = deliveryDb({
      payingClinics: async () => [ist, { id: "ok", tz: "Europe/Istanbul" }],
      weekMade: async () => new Set(["ok"]),
      lastDelivered: async () => new Map([["ist", "2026-11-09"], ["ok", WEEK]]),
    });
    await checkWeekDelivery({ db, queue: q, store, alert, now: MON_0541 });
    const report = JSON.parse((await store.get(DELIVERY_REPORT_KEY))!) as DeliveryReport;
    expect(report.lastDelivered).toEqual({ ist: "2026-11-09", ok: WEEK });
    expect(report.behind).toEqual(["ist"]);
    expect(report.failedJobs).toEqual({ ist: 1 });
    expect(report.stuckJobs).toEqual({ ist: 1 });
    expect(report.late.map((l) => l.clinicId)).toEqual(["ist"]);
  });
});

/* ------------------------------------------------------- DST / time zones */

describe("DST and time-zone edges for Monday delivery, every market", () => {
  // Weekends on which a market's clocks change (2026): the Monday after must still be 07:00 local.
  const cases: [country: string, week: string][] = [
    ["US", "2026-03-09"], // US DST starts Sun 8 Mar
    ["US", "2026-11-02"], // US DST ends Sun 1 Nov
    ["MX", "2026-04-06"], // no DST since 2022
    ["DE", "2026-03-30"], // EU starts Sun 29 Mar
    ["DE", "2026-10-26"], // EU ends Sun 25 Oct
    ["GB", "2026-03-30"],
    ["FR", "2026-10-26"],
    ["ES", "2026-03-30"],
    ["PL", "2026-10-26"],
    ["TR", "2026-03-30"], // no DST
    ["AU", "2026-04-06"], // Sydney ends Sun 5 Apr
    ["AU", "2026-10-05"], // Sydney starts Sun 4 Oct
    ["NZ", "2026-04-06"], // Auckland ends Sun 5 Apr
    ["NZ", "2026-09-28"], // Auckland starts Sun 27 Sep
    ["CL", "2026-04-06"], // Santiago ends Sun 5 Apr
    ["JP", "2026-03-30"],
    ["SA", "2026-03-30"],
    ["AE", "2026-03-30"],
  ];

  it.each(cases)("%s, week of %s: the deadline is Monday 07:00 local, after the Saturday dispatch, and the batch email goes out then", (country, week) => {
    const tz = clinicTimeZone(country);
    const deadline = mondayMorning(week, tz);
    const p = localParts(deadline, tz);
    expect({ weekday: p.weekday, hour: p.hour, minute: p.minute }).toEqual({ weekday: 1, hour: 7, minute: 0 });
    // Dispatch: the Saturday 18:00 UTC before.
    const dispatch = new Date(Date.parse(`${week}T00:00:00Z`) - 2 * 86_400_000 + 18 * 3_600_000);
    expect(DISPATCH_SCHEDULE.pattern).toBe("0 18 * * 6");
    expect(deadline.getTime() - dispatch.getTime()).toBeGreaterThanOrEqual(23 * 3_600_000);
    // A batch week finished during the weekend is announced at exactly that deadline.
    expect(readyEmailAt({ now: dispatch, week, tz, batch: true }).getTime()).toBe(deadline.getTime());
    // The delivery watchdog checks it from deadline + 1 h, and its candidate weeks include it by then.
    const check = new Date(deadline.getTime() + 61 * 60_000);
    expect(isDue(deadline, check)).toBe(true);
    expect(candidateWeeks(check)).toContain(week);
  });

  it("Auckland in NZ summer is due on Sunday 18:00 UTC: the watchdog checks the coming week from Sunday evening", () => {
    const deadline = mondayMorning("2026-11-16", "Pacific/Auckland");
    expect(deadline.toISOString()).toBe("2026-11-15T18:00:00.000Z");
    expect(candidateWeeks(new Date("2026-11-15T19:41:00Z"))).toContain("2026-11-16");
    expect(weekOf(new Date("2026-11-15T19:41:00Z"))).toBe("2026-11-09");
  });
});

/* ------------------------------------------------------- F6 parked job dropped */

describe("F6 a week parked by the spend guard for 7 days is not dropped in silence", () => {
  it("the drop calls the owner hook", async () => {
    const park = new MemoryParkStore();
    const parkedAt = new Date(Date.now() - PARK_MAX_AGE_MS - 60_000).toISOString();
    await park.put({ jobId: "week:c1:2026-11-16", name: "week", data: { clinicId: "c1", week: "2026-11-16" }, reason: "global_daily_usd", parkedAt });
    const onDrop = vi.fn(async () => {});
    const guard = { reserve: vi.fn() } as unknown as SpendGuard;
    const r = await resumeParked(park, { getJob: async () => null, add: async () => ({}) }, guard, new Date(), onDrop);
    expect(r.dropped).toBe(1);
    expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ jobId: "week:c1:2026-11-16", reason: "global_daily_usd" }));
    expect(await park.all()).toEqual([]);
  });

  it("the alert names the clinic and the job", () => {
    const text = renderAlert(alerts.parkedDropped({ clinic: { id: "c1", name: "Gülüş" }, job: "week", jobId: "week:c1:2026-11-16", reason: "global_daily", parkedAt: "2026-11-09T10:00:00Z" })).text;
    expect(text).toContain("week:c1:2026-11-16");
  });
});

/* ------------------------------------------------------- F5 ready email */

describe("F5 the 'videos ready' email is retried and, failing that, the owner is told", () => {
  const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  beforeEach(() => {
    process.env.WORKER_INTERNAL_TOKEN = "t";
  });

  it("classifies the web app's answers: provider failure / 5xx / network → retry; decided not to send → final", async () => {
    const counts = { ready: 5, flagged: 0 };
    const call = (r: Response | Error) => notifyReadyChecked("c1", "week", counts, (async () => (r instanceof Error ? Promise.reject(r) : r)) as typeof fetch);
    expect(await call(res(200, { sent: true }))).toMatchObject({ sent: true });
    expect(await call(res(200, { sent: false }))).toMatchObject({ sent: false, retry: true });
    expect(await call(res(503, {}))).toMatchObject({ sent: false, retry: true });
    expect(await call(res(429, {}))).toMatchObject({ sent: false, retry: true });
    expect(await call(new Error("fetch failed"))).toMatchObject({ sent: false, retry: true });
    expect(await call(res(200, { sent: false, reason: "test account" }))).toMatchObject({ sent: false, retry: false });
    expect(await call(res(404, { error: "no clinic" }))).toMatchObject({ sent: false, retry: false });
  });

  // Before: a ready email sent at once (first week, the button) that failed was only logged.
  it("a failed immediate send is handed to the mail queue (fixed id) with long retries", async () => {
    const add = vi.fn(async () => ({}));
    const r = await sendReadyAtCivilHour(
      { clinicId: "c1", week: "2026-11-16", tz: "Europe/Istanbul", batch: false, counts: { ready: 5, flagged: 0 }, now: new Date("2026-11-16T09:00:00Z") },
      { queue: { add }, send: async () => ({ sent: false, retry: true, reason: "send failed" }) },
    );
    expect(r).toMatchObject({ sent: false, retryQueued: true });
    expect(add).toHaveBeenCalledWith("notify", expect.objectContaining({ clinicId: "c1", week: "2026-11-16" }), expect.objectContaining({ jobId: `${readyMailJobId("c1", "2026-11-16")}:retry`, ...READY_MAIL_JOB_OPTS }));
    expect(READY_MAIL_JOB_OPTS.attempts).toBeGreaterThanOrEqual(5);
  });

  it("a final decision not to send (test account) is not retried", async () => {
    const add = vi.fn(async () => ({}));
    await sendReadyAtCivilHour(
      { clinicId: "c1", week: "2026-11-16", tz: "Europe/Istanbul", batch: false, counts: { ready: 5, flagged: 0 } },
      { queue: { add }, send: async () => ({ sent: false, retry: false, reason: "test account" }) },
    );
    expect(add).not.toHaveBeenCalled();
  });

  // Before: the held "notify" job returned false and counted as completed: no retry, no alert.
  it("a notify job whose retries are spent alerts the owner with the clinic and week", () => {
    const f = failureAlert("dentvid-mail", { name: "notify", data: { clinicId: "c1", week: "2026-11-16" }, attemptsMade: 6, opts: { attempts: 6 } }, new Error("ready email not sent: send failed"));
    expect(f?.kind).toBe("ready_email");
    if (f && f.kind !== "cron") {
      expect(f.clinicId).toBe("c1");
      expect(f.build({ id: "c1" }).key).toBe("ready_email_failed:c1:2026-11-16");
    }
    expect(failureAlert("dentvid-mail", { name: "notify", data: { clinicId: "c1" }, attemptsMade: 2, opts: { attempts: 6 } }, new Error("x"))).toBeNull();
  });
});

/* ------------------------------------------------------- F3 reactivations */

describe("F3 a clinic back from on hold / cancelled is watched like a first payment", () => {
  const db = (over: Partial<WatchDb> = {}): WatchDb => ({
    activeClinicIds: async () => [],
    firstPayments: async () => [],
    deliveredSince: async () => false,
    weekMade: async () => new Set(),
    isActive: async () => true,
    clinic: async (id) => ({ id }),
    ...over,
  });
  const queue = (): WatchQueue & { added: unknown[] } => {
    const added: unknown[] = [];
    return { added, getJob: async () => null, add: async (_n, _d, opts) => (added.push(opts), {}) };
  };

  it("a returning clinic's marker is re-queued at 45 min and alerted at 2 h with its own wording", async () => {
    const paidAt = "2026-11-18T10:00:00.000Z";
    await store.push(PAID_LIST_KEY, JSON.stringify({ clinicId: "back", paidAt, returning: true }), 1, 10);
    const q = queue();
    const r = await checkFirstWeeks({ db: db(), queue: q, store, alert, now: new Date("2026-11-18T12:01:00Z"), env: {} });
    expect(r.requeued).toEqual(["back"]);
    expect(raised[0].titleEn).toBe("Week not delivered 2 h after a clinic came back");
  });

  it("a returning clinic that already has the week is left alone", async () => {
    await store.push(PAID_LIST_KEY, JSON.stringify({ clinicId: "back", paidAt: "2026-11-18T10:00:00.000Z", returning: true }), 1, 10);
    const q = queue();
    const r = await checkFirstWeeks({ db: db({ weekMade: async () => new Set(["back"]) }), queue: q, store, alert, now: new Date("2026-11-18T12:01:00Z"), env: {} });
    expect(r.requeued).toEqual([]);
    expect(raised).toEqual([]);
  });
});
