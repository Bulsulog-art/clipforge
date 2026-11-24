import { beforeEach, describe, expect, it } from "vitest";
import { UnrecoverableError } from "bullmq";
import {
  finalKind,
  handleFailedWeek,
  STALL_RETRY_DELAY_MS,
  stallRetryKey,
  stalledJobId,
  weekClinic,
  weekJobFinal,
  type StalledWeekDeps,
} from "./stalled-week.js";
import { MemoryOpsStore, renderAlert, type OwnerAlert, type WeekDelay } from "./ops-alert.js";
import { DENTVID_PRIORITY, WEEK_RETRY } from "./job-options.js";
import { mondayMorning } from "./timezone.js";

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
const weekJob = (over: Partial<{ attemptsMade: number; attempts: number; data: unknown; name: string }> = {}) => ({
  name: over.name ?? "week",
  id: `week:${CLINIC}:${WEEK}`,
  data: over.data ?? { clinicId: CLINIC, count: 5, week: WEEK, batch: true },
  attemptsMade: over.attemptsMade ?? 1,
  opts: { attempts: over.attempts ?? 4 },
});

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
    expect(added[0].opts.jobId).toBe(`week:${CLINIC}:${WEEK}:stalled`);
    expect(added[0].opts.delay).toBe(STALL_RETRY_DELAY_MS);
    expect(added[0].opts.delay).toBe(5 * 60_000);
    // Ahead of the weekly batch, with the usual week retries.
    expect(added[0].opts.priority).toBe(DENTVID_PRIORITY.firstWeek);
    expect(added[0].opts.attempts).toBe(WEEK_RETRY.attempts);
    // Same week, same promise: a full week asked for, of which jobs.ts makes only the missing videos.
    expect(added[0].data).toEqual({ clinicId: CLINIC, count: 5, week: WEEK, batch: true });

    expect(raised).toHaveLength(1);
    expect(raised[0].key).toBe(`week_failed:${CLINIC}:${WEEK}`);
    const mail = renderAlert(raised[0]);
    expect(mail.subject).toMatch(/Gülüş Dental/);
    expect(mail.text).toContain("stalled more than allowable limit");
    expect(mail.text).toMatch(/stopped more than once/);
    expect(mail.text).toMatch(/Queued once more by itself, starting 5 minutes later/);
    expect(mail.text).toContain(`week:${CLINIC}:${WEEK}:stalled`);
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).not.toBeNull();
  });

  it("after the clinic's Monday 07:00 it is not queued again (the delivery watchdog has late weeks), but still alerted and marked", async () => {
    expect(MONDAY_LATE.getTime()).toBeGreaterThan(mondayMorning(WEEK, "Europe/Istanbul").getTime());
    const r = await handleFailedWeek(weekJob(), stalled(), deps(MONDAY_LATE));
    expect(r).toMatchObject({ handled: true, requeued: false, skipped: "past_deadline" });
    expect(added).toEqual([]);
    expect(delays).toEqual([[CLINIC, WEEK, "delayed"]]);
    expect(raised).toHaveLength(1);
    expect(renderAlert(raised[0]).text).toMatch(/Monday morning has passed/);
    // The claim is not used up by a run that did not happen.
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).toBeNull();
  });

  it("the deadline is the clinic's own: New York's Monday morning is still ahead when Istanbul's has passed", async () => {
    const r = await handleFailedWeek(weekJob(), stalled(), deps(MONDAY_LATE, { clinic: async (id) => ({ ref: { id }, tz: "America/New_York" }) }));
    expect(r).toMatchObject({ requeued: true });
  });

  it("a second failure (the extra run failing too) does not queue it again", async () => {
    await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    const again = { ...weekJob(), id: stalledJobId(CLINIC, WEEK) };
    const r = await handleFailedWeek(again, stalled(), deps(new Date(SATURDAY_EVENING.getTime() + 20 * 60_000)));
    expect(r).toMatchObject({ handled: true, requeued: false, skipped: "already" });
    expect(added).toHaveLength(1);
    expect(delays).toHaveLength(2);
    expect(renderAlert(raised[1]).text).toMatch(/already had its one extra run/);
  });

  it("a transient failure at attempt 2 of 4 does nothing: BullMQ retries it and runDentvidWeek speaks for it", async () => {
    const r = await handleFailedWeek(weekJob({ attemptsMade: 2 }), new Error("429 Rate limit reached"), deps(SATURDAY_EVENING));
    expect(r).toEqual({ handled: false, reason: "not_final" });
    expect(added).toEqual([]);
    expect(raised).toEqual([]);
    expect(delays).toEqual([]);
  });

  it("the last of four attempts failing for a passing reason gets the one extra run too", async () => {
    const r = await handleFailedWeek(weekJob({ attemptsMade: 4 }), new Error("render timed out after 900s"), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ kind: "exhausted", requeued: true });
    expect(added).toHaveLength(1);
  });

  it("a permanent error (runDentvidWeek's UnrecoverableError) is alerted and marked, never queued again", async () => {
    const r = await handleFailedWeek(weekJob(), new UnrecoverableError("Incorrect API key provided"), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ handled: true, kind: "permanent", requeued: false, skipped: "permanent" });
    expect(added).toEqual([]);
    expect(delays).toEqual([[CLINIC, WEEK, "delayed"]]);
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

  it("the queue not answering: no extra run, the claim is given back, the owner is asked to retry by hand", async () => {
    queueDown = true;
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ requeued: false, skipped: "queue_error" });
    expect(await store.get(stallRetryKey(CLINIC, WEEK))).toBeNull();
    expect(renderAlert(raised[0]).text).toMatch(/Retry it by hand/);
  });

  it("the ops store down: no extra run (it could not be kept to once), still alerted", async () => {
    store.down = true;
    const r = await handleFailedWeek(weekJob(), stalled(), deps(SATURDAY_EVENING));
    expect(r).toMatchObject({ requeued: false, skipped: "already" });
    expect(added).toEqual([]);
    expect(raised).toHaveLength(1);
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
