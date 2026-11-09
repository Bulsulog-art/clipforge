import { spawn } from "node:child_process";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { batchNice, descendants, reniceDescendants, withNicedChildren, type ProcFs } from "./nice.js";

/** A process tree: 1 (worker) → 2 (chrome) → 3, 4 (renderers); 9 is someone else's. */
const fakeProc = (): ProcFs => {
  const parent: Record<number, number> = { 2: 1, 3: 2, 4: 2, 9: 7 };
  const threads: Record<number, number[]> = { 2: [2, 20], 3: [3], 4: [4, 40, 41], 9: [9] };
  return { pids: () => [1, 2, 3, 4, 7, 9], ppid: (p) => parent[p] ?? 0, tids: (p) => threads[p] ?? [p] };
};

describe("batch renders run niced", () => {
  it("DENTVID_BATCH_NICE: default 10, 0 turns it off, clamped to 0–19", () => {
    expect(batchNice({})).toBe(10);
    expect(batchNice({ DENTVID_BATCH_NICE: "0" })).toBe(0);
    expect(batchNice({ DENTVID_BATCH_NICE: "15" })).toBe(15);
    expect(batchNice({ DENTVID_BATCH_NICE: "99" })).toBe(19);
    expect(batchNice({ DENTVID_BATCH_NICE: "-5" })).toBe(0);
    expect(batchNice({ DENTVID_BATCH_NICE: "x" })).toBe(10);
  });

  it("finds only the worker's own descendants", () => {
    expect(descendants(1, fakeProc()).sort()).toEqual([2, 3, 4]);
  });

  it("lowers every thread of every descendant, never raises one, and leaves other processes alone", () => {
    const nice = new Map<number, number>([[41, 15]]);
    const prio = { get: (id: number) => nice.get(id) ?? 0, set: (id: number, n: number) => void nice.set(id, n) };
    expect(reniceDescendants(1, 10, fakeProc(), prio)).toBe(5);
    expect([2, 20, 3, 4, 40].map((t) => nice.get(t))).toEqual([10, 10, 10, 10, 10]);
    expect(nice.get(41)).toBe(15);
    expect(nice.has(9)).toBe(false);
    expect(nice.has(1)).toBe(false);
  });

  it.runIf(process.platform === "linux")("a real child started during a batch job ends up niced", async () => {
    let pid = 0;
    let seen = -1;
    await withNicedChildren(
      10,
      async () => {
        const child = spawn("sleep", ["5"]);
        pid = child.pid!;
        await new Promise((r) => setTimeout(r, 250));
        seen = os.getPriority(pid);
        child.kill();
      },
      50,
    );
    expect(pid).toBeGreaterThan(0);
    expect(seen).toBe(10);
  });

  it("nice 0 runs the job untouched", async () => {
    expect(await withNicedChildren(0, async () => 42)).toBe(42);
  });
});
