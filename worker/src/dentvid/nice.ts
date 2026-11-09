import fs from "node:fs";
import os from "node:os";
import { logger } from "../logger.js";

/**
 * Batch renders at a lower CPU priority, so the website stays quick.
 *
 * The worker shares two cores with the web app, ClipForge and Liman. A
 * weekend batch week does not need to be fast — it needs to be done by
 * Monday morning — while a visitor on the landing page needs an answer now.
 * So while a batch week runs, every process the worker has started
 * (Chromium and its renderers, Remotion's compositor, ffmpeg) is "niced" to
 * DENTVID_BATCH_NICE (default 10; 0 turns this off): the kernel gives them
 * whatever CPU the website leaves over. A first week, a restyle or a
 * recording someone is waiting for runs at normal priority.
 *
 * Why the children and thread by thread: Linux keeps a nice value per thread,
 * and lowering one's own priority can never be undone without CAP_SYS_NICE
 * (the container has not got it, and runs as `node`). Renicing the worker's
 * own descendants needs no privilege, and they are where the CPU goes; each
 * render starts a fresh browser, so it is applied again every second while
 * the job runs, catching new processes and threads. Other renders the worker
 * runs at the same moment (ClipForge's queues) are niced with it — they are
 * background work too.
 */

export function batchNice(env: Record<string, string | undefined> = process.env): number {
  const raw = env.DENTVID_BATCH_NICE;
  const n = raw === undefined || raw === "" ? 10 : Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(19, Math.floor(n))) : 10;
}

export type ProcFs = {
  pids(): number[];
  ppid(pid: number): number | null;
  tids(pid: number): number[];
};

export const linuxProc: ProcFs = {
  pids: () => fs.readdirSync("/proc").filter((n) => /^\d+$/.test(n)).map(Number),
  ppid: (pid) => {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      // "pid (comm) state ppid …" — comm may contain spaces and parentheses.
      return Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
    } catch {
      return null;
    }
  },
  tids: (pid) => {
    try {
      return fs.readdirSync(`/proc/${pid}/task`).filter((n) => /^\d+$/.test(n)).map(Number);
    } catch {
      return [];
    }
  },
};

/** Every process below `root` (not `root` itself). */
export function descendants(root: number, proc: ProcFs = linuxProc): number[] {
  const kids = new Map<number, number[]>();
  for (const pid of proc.pids()) {
    const parent = proc.ppid(pid);
    if (parent === null) continue;
    const list = kids.get(parent) ?? [];
    list.push(pid);
    kids.set(parent, list);
  }
  const out: number[] = [];
  const stack = [...(kids.get(root) ?? [])];
  while (stack.length) {
    const pid = stack.pop()!;
    out.push(pid);
    stack.push(...(kids.get(pid) ?? []));
  }
  return out;
}

type Prio = { get(id: number): number; set(id: number, nice: number): void };
const osPrio: Prio = { get: (id) => os.getPriority(id), set: (id, nice) => os.setPriority(id, nice) };

/** Lower every thread of every descendant of `root` to at least `nice`. Returns how many threads changed. */
export function reniceDescendants(root: number, nice: number, proc: ProcFs = linuxProc, prio: Prio = osPrio): number {
  let changed = 0;
  for (const pid of descendants(root, proc)) {
    for (const tid of proc.tids(pid)) {
      try {
        if (prio.get(tid) < nice) {
          prio.set(tid, nice);
          changed++;
        }
      } catch {
        // the thread ended, or is not ours to change
      }
    }
  }
  return changed;
}

/** Run `fn` with the worker's child processes niced to `nice` (see above). No-op off Linux or at nice 0. */
export async function withNicedChildren<T>(nice: number, fn: () => Promise<T>, everyMs = 1_000): Promise<T> {
  if (process.platform !== "linux" || nice <= 0) return fn();
  let warned = false;
  const tick = () => {
    try {
      reniceDescendants(process.pid, nice);
    } catch (e) {
      if (!warned) logger.warn({ err: (e as Error).message }, "dentvid: could not lower render priority");
      warned = true;
    }
  };
  const timer = setInterval(tick, everyMs);
  timer.unref();
  try {
    return await fn();
  } finally {
    clearInterval(timer);
  }
}
