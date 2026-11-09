import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { batchPriority, batchWeekJobOpts, DENTVID_PRIORITY, FIRST_WEEK_JOB_OPTS, isBatchPriority, RECORDING_JOB_OPTS, RESTYLE_JOB_OPTS } from "./job-options";
import { enqueueFirstWeek, WEEK_JOB_OPTS } from "./week-job";
import { deliveryWeek, weekOf } from "./week";

/**
 * One render at a time on a shared box (docs/CAPACITY.md): the queue's order
 * is the delivery promise. These pin it from the web side; the worker's copy
 * of job-options.ts is kept byte-identical by ops.test.ts.
 */

describe("dentvid job priorities (lower runs first)", () => {
  it("first week and restyle before recordings, recordings before the weekend batch", () => {
    expect(FIRST_WEEK_JOB_OPTS.priority).toBe(DENTVID_PRIORITY.firstWeek);
    expect(RESTYLE_JOB_OPTS.priority).toBe(DENTVID_PRIORITY.restyle);
    expect(FIRST_WEEK_JOB_OPTS.priority).toBeLessThan(RECORDING_JOB_OPTS.priority);
    expect(RESTYLE_JOB_OPTS.priority).toBeLessThan(RECORDING_JOB_OPTS.priority);
    expect(RECORDING_JOB_OPTS.priority).toBeLessThan(batchWeekJobOpts(0).priority);
  });

  it("every option set has a priority — in BullMQ a job without one jumps every prioritized job", () => {
    for (const o of [FIRST_WEEK_JOB_OPTS, RESTYLE_JOB_OPTS, RECORDING_JOB_OPTS, batchWeekJobOpts(12)]) expect(o.priority).toBeGreaterThan(0);
  });

  it("orders the batch by deadline, within BullMQ's range, and always behind interactive work", () => {
    expect(batchPriority(4)).toBeLessThan(batchPriority(40));
    expect(batchPriority(-3)).toBe(DENTVID_PRIORITY.batch);
    expect(batchPriority(1e9)).toBeLessThan(2 ** 21);
    expect(batchPriority(Number.NaN)).toBeGreaterThanOrEqual(DENTVID_PRIORITY.batch);
    expect(isBatchPriority(batchPriority(30))).toBe(true);
    expect(isBatchPriority(RECORDING_JOB_OPTS.priority)).toBe(false);
    expect(isBatchPriority(undefined)).toBe(false);
  });

  it("weeks keep the worker's retry numbers", () => {
    expect(FIRST_WEEK_JOB_OPTS).toEqual({ ...WEEK_JOB_OPTS, priority: 1 });
    expect(batchWeekJobOpts(5)).toEqual({ ...WEEK_JOB_OPTS, priority: 105 });
  });
});

describe("the delivery week", () => {
  it("is this Monday's until the Saturday 18:00 UTC batch, the coming Monday's after", () => {
    expect(deliveryWeek(new Date("2026-11-09T05:00:00Z"))).toBe("2026-11-09"); // Monday
    expect(deliveryWeek(new Date("2026-11-13T23:00:00Z"))).toBe("2026-11-09"); // Friday night
    expect(deliveryWeek(new Date("2026-11-14T17:59:00Z"))).toBe("2026-11-09"); // Saturday, before the batch
    expect(deliveryWeek(new Date("2026-11-14T18:00:00Z"))).toBe("2026-11-16"); // the batch starts
    expect(deliveryWeek(new Date("2026-11-15T22:00:00Z"))).toBe("2026-11-16"); // Sunday night
    expect(weekOf(new Date("2026-11-15T22:00:00Z"))).toBe("2026-11-09");
  });

  it("a clinic that pays on Sunday gets the coming week at once, at the front of the queue", async () => {
    const q = { select: () => q, eq: () => q, neq: async () => ({ count: 0 }) };
    const db = { from: () => q } as never;
    const add = vi.fn(async () => ({}));
    expect(await enqueueFirstWeek(db, { add }, "c1", new Date("2026-11-15T10:00:00Z"))).toBe("queued");
    expect(add).toHaveBeenCalledWith("week", { clinicId: "c1", count: 5, week: "2026-11-16" }, { jobId: "week:c1:2026-11-16", ...FIRST_WEEK_JOB_OPTS });
  });
});

describe("web enqueues pass a priority", () => {
  const src = (p: string) => fs.readFileSync(path.resolve(__dirname, "../../app/api/dentvideo", p), "utf8");
  it("recording, restyle and the week button use the shared options", () => {
    expect(src("recording/route.ts")).toMatch(/\.\.\.RECORDING_JOB_OPTS/);
    expect(src("items/[id]/backgrounds/route.ts")).toMatch(/\.\.\.RESTYLE_JOB_OPTS/);
    expect(src("week/route.ts")).toMatch(/\.\.\.FIRST_WEEK_JOB_OPTS/);
  });
});
