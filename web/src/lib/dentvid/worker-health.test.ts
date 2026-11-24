import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readWorkerState, waitingSince } from "./worker-health";

/**
 * The pieces of the worker health check the route test does not reach:
 * when a queued job started waiting, and a Redis that stays down.
 */

describe("waitingSince", () => {
  const T = Date.parse("2026-11-28T18:00:00Z");

  it("a plain job waits from when it was added", () => {
    expect(waitingSince({ timestamp: String(T) })).toBe(T);
  });

  it("a delayed job (a scheduler job, a re-queue 'in 5 minutes') waits from when it became due", () => {
    expect(waitingSince({ timestamp: String(T), opts: JSON.stringify({ delay: 300_000, priority: 1 }) })).toBe(T + 300_000);
  });

  it("a retry waits from its last start, if that is later", () => {
    expect(waitingSince({ timestamp: String(T), opts: JSON.stringify({ delay: 0 }), processedOn: String(T + 3_600_000) })).toBe(T + 3_600_000);
    expect(waitingSince({ timestamp: String(T), opts: JSON.stringify({ delay: 7_200_000 }), processedOn: String(T + 60_000) })).toBe(T + 7_200_000);
  });

  it("no usable timestamp is no answer; unreadable options fall back to the add time", () => {
    expect(waitingSince({})).toBeNull();
    expect(waitingSince({ timestamp: "x" })).toBeNull();
    expect(waitingSince({ timestamp: "0" })).toBeNull();
    expect(waitingSince({ timestamp: String(T), opts: "{not json" })).toBe(T);
    expect(waitingSince({ timestamp: String(T), opts: JSON.stringify({ delay: -5 }), processedOn: "nope" })).toBe(T);
  });
});

describe("readWorkerState with Redis not connecting", () => {
  afterEach(() => vi.useRealTimers());

  it("gives up after a short wait and leaves no listener behind, however often it is asked", async () => {
    vi.useFakeTimers();
    const r = Object.assign(new EventEmitter(), { status: "reconnecting" });
    for (let i = 0; i < 3; i++) {
      const read = readWorkerState(r as never, new Date());
      const settled = expect(read).rejects.toThrow("redis not ready");
      expect(r.listenerCount("ready")).toBe(1);
      await vi.advanceTimersByTimeAsync(800);
      await settled;
    }
    expect(r.listenerCount("ready")).toBe(0);
  });
});
