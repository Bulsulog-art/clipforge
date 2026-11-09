import { describe, expect, it, vi } from "vitest";
import { UnrecoverableError } from "bullmq";
import { backoffDelay, classifyFailure, isLastAttempt, TransientWeekError, WEEK_JOB_OPTS } from "./retry.js";
import { dispatchKey, dispatchWeeks } from "./schedule.js";
import { MemoryOpsStore } from "./ops-alert.js";

const err = (message: string, status?: number) => Object.assign(new Error(message), status ? { status } : {});

describe("retry classification", () => {
  it.each([
    ["OpenAI 429", err("Rate limit reached for gpt-5.4-mini", 429)],
    ["OpenAI 500", err("The server had an error", 500)],
    ["OpenAI 503 overloaded", err("overloaded", 503)],
    ["TTS 429 by message", err("429 Too Many Requests")],
    ["render timeout", err("render timed out after 900000ms")],
    ["Remotion delayRender timeout", err("A delayRender() was called but not cleared after 28000ms. Timeout")],
    ["Pexels network", err("fetch failed")],
    ["socket reset", err("read ECONNRESET")],
    ["storage upload", err("upload abc/def.mp4: Gateway Timeout")],
    ["disk full", err("ENOSPC: no space left on device")],
    ["zero usable", new TransientWeekError("zero usable videos (5 technical failures)")],
    ["unknown → one more try", err("something odd")],
  ])("%s → transient", (_n, e) => expect(classifyFailure(e)).toBe("transient"));

  it.each([
    ["bad API key", err("Incorrect API key provided", 401)],
    ["forbidden", err("forbidden", 403)],
    ["bad request", err("Invalid value for 'voice'", 400)],
    ["clinic missing", err("clinic 123 not found: ")],
    ["broken profile", err('ZodError: [{"code":"invalid_type","expected":"string","received":"undefined"}]')],
    ["quota", err("You exceeded your current quota: insufficient_quota")],
    ["unrecoverable", new UnrecoverableError("recording path outside the owner's folder")],
  ])("%s → permanent", (_n, e) => expect(classifyFailure(e)).toBe("permanent"));
});

describe("backoff", () => {
  it("4 attempts, 2 → 4 → 8 minutes apart", () => {
    expect(WEEK_JOB_OPTS).toEqual({ attempts: 4, backoff: { type: "exponential", delay: 120_000 } });
    expect([1, 2, 3].map((n) => backoffDelay(n) / 60_000)).toEqual([2, 4, 8]);
  });
  it("knows the last attempt", () => {
    expect(isLastAttempt(0, 4)).toBe(false);
    expect(isLastAttempt(2, 4)).toBe(false);
    expect(isLastAttempt(3, 4)).toBe(true);
    expect(isLastAttempt(0, undefined)).toBe(true);
  });
});

describe("the weekly dispatch uses the shared options and leaves a mark for the watchdog", () => {
  it("queues each active clinic with the week's retries, the coming Monday in the data, and records the run", async () => {
    const db = { from: () => ({ select: () => ({ eq: async () => ({ data: [{ id: "a", plan: "active" }, { id: "b", plan: "active" }], error: null }) }) }) };
    const add = vi.fn(async () => ({}));
    const store = new MemoryOpsStore();
    const now = new Date("2026-11-14T18:00:00Z"); // Saturday 18:00 UTC
    expect(await dispatchWeeks(db as never, { add } as never, now, store)).toBe(2);
    // No country → UTC: Monday 07:00 UTC is 37 h away.
    expect(add).toHaveBeenCalledWith("week", { clinicId: "a", count: 5, week: "2026-11-16", batch: true }, { jobId: "week:a:2026-11-16", ...WEEK_JOB_OPTS, priority: 137 });
    expect(JSON.parse((await store.get(dispatchKey("2026-11-16")))!)).toEqual({ at: now.toISOString(), jobs: 2, waves: 1, projectedLate: 0 });
  });
});
