import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  COUNT_COMMANDS,
  HEARTBEAT_STALE_MS,
  costByDay,
  costOver,
  dispatchWeek,
  heartbeatStale,
  isJobId,
  isStuck,
  lastDispatch,
  nextDispatch,
  parseAlerts,
  parseDispatch,
  parseHeartbeats,
  parseJobHash,
  parseQueueCounts,
  workerHealth,
  type PipelineReply,
} from "./admin-system";
import { readSystem } from "./admin-system-server";
import { ADMIN_SIGNED_URL_MAX_SEC, ADMIN_SIGNED_URL_TTL_SEC, signAdminPaths, signablePath } from "./admin-signed";

const NOW = new Date("2026-11-11T10:00:00Z"); // a Wednesday
const OWNER = "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d";

describe("queue stats parsing", () => {
  it("reads BullMQ's list and sorted-set sizes, in COUNT_COMMANDS order, plus the paused flag", () => {
    const values: Record<string, number> = { waiting: 2, pausedJobs: 0, active: 1, prioritized: 5, delayed: 3, failed: 4, completed: 400, waitingChildren: 0 };
    const replies: PipelineReply[] = [...COUNT_COMMANDS.map((c) => [null, values[c.field]] as PipelineReply), [null, null]];
    expect(parseQueueCounts("dentvid", replies)).toEqual({ name: "dentvid", ...values, paused: false, queued: 7 });
    const paused = parseQueueCounts("dentvid", [...COUNT_COMMANDS.map(() => [null, 0] as PipelineReply), [null, "1"]]);
    expect(paused.paused).toBe(true);
  });

  it("counts a failed command as 0 and reports it", () => {
    const replies: PipelineReply[] = [[new Error("WRONGTYPE"), null], ...COUNT_COMMANDS.slice(1).map(() => [null, "3"] as PipelineReply), [null, null]];
    const s = parseQueueCounts("dentvid-mail", replies);
    expect(s.waiting).toBe(0);
    expect(s.active).toBe(3);
    expect(s.error).toBe("WRONGTYPE");
    expect(parseQueueCounts("x", []).error).toBeDefined();
  });

  it("parses a failed job's hash", () => {
    const j = parseJobHash("dentvid", "week:c:2026-11-16", [
      "week",
      JSON.stringify({ clinicId: "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d", count: 5, week: "2026-11-16" }),
      "zero usable videos",
      "4",
      String(Date.parse("2026-11-08T18:00:00Z")),
      String(Date.parse("2026-11-08T18:05:00Z")),
      String(Date.parse("2026-11-08T18:20:00Z")),
      JSON.stringify({ attempts: 4, priority: 112 }),
    ]);
    expect(j).toEqual({
      id: "week:c:2026-11-16",
      queue: "dentvid",
      name: "week",
      clinicId: "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d",
      week: "2026-11-16",
      failedReason: "zero usable videos",
      attemptsMade: 4,
      maxAttempts: 4,
      priority: 112,
      createdAt: "2026-11-08T18:00:00.000Z",
      processedAt: "2026-11-08T18:05:00.000Z",
      finishedAt: "2026-11-08T18:20:00.000Z",
    });
    expect(parseJobHash("dentvid", "gone", [null, null, null])).toBeNull();
    expect(parseJobHash("dentvid", "bad", ["x", "{not json", null, null, null, null, null, "nope"])).toMatchObject({ name: "x", clinicId: null, maxAttempts: null });
  });

  it("calls an active job stuck after 90 minutes", () => {
    expect(isStuck({ processedAt: new Date(NOW.getTime() - 89 * 60_000).toISOString() }, NOW)).toBe(false);
    expect(isStuck({ processedAt: new Date(NOW.getTime() - 91 * 60_000).toISOString() }, NOW)).toBe(true);
    expect(isStuck({ processedAt: null }, NOW)).toBe(false);
  });

  it("accepts BullMQ job ids, not key patterns", () => {
    expect(isJobId("week:0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d:2026-11-16")).toBe(true);
    expect(isJobId("rec:owner/recordings/a.mp4")).toBe(true);
    expect(isJobId("rec:owner/../a.mp4")).toBe(false);
    expect(isJobId("a*")).toBe(false);
    expect(isJobId("")).toBe(false);
  });
});

describe("worker heartbeat", () => {
  const beat = (msAgo: number, roles: string[]) => JSON.stringify({ host: "h", pid: 1, version: "abc", at: new Date(NOW.getTime() - msAgo).toISOString(), roles, renderConcurrency: 1, uptimeSec: 60 });

  it("is stale after 3 minutes, not before", () => {
    expect(HEARTBEAT_STALE_MS).toBe(180_000);
    expect(heartbeatStale(new Date(NOW.getTime() - 179_000).toISOString(), NOW)).toBe(false);
    expect(heartbeatStale(new Date(NOW.getTime() - 181_000).toISOString(), NOW)).toBe(true);
    expect(heartbeatStale(null, NOW)).toBe(true);
    expect(heartbeatStale("garbage", NOW)).toBe(true);
  });

  it("parses every process, freshest first, skipping unreadable entries", () => {
    const list = parseHeartbeats({ a: beat(240_000, ["dentvid"]), b: beat(30_000, ["crons"]), c: "{bad" }, NOW);
    expect(list.map((h) => [h.field, h.stale])).toEqual([
      ["b", false],
      ["a", true],
    ]);
    expect(list[0]).toMatchObject({ version: "abc", roles: ["crons"], renderConcurrency: 1, ageMs: 30_000 });
  });

  it("overall: up, partial when a role went quiet, down when nothing beats", () => {
    expect(workerHealth(parseHeartbeats({ a: beat(10_000, ["dentvid", "crons"]) }, NOW))).toBe("up");
    expect(workerHealth(parseHeartbeats({ a: beat(10_000, ["crons"]), b: beat(600_000, ["dentvid"]) }, NOW))).toBe("partial");
    // An old process whose role a fresh one serves is history (a restart), not an outage.
    expect(workerHealth(parseHeartbeats({ a: beat(10_000, ["crons", "dentvid"]), b: beat(600_000, ["dentvid"]) }, NOW))).toBe("up");
    expect(workerHealth(parseHeartbeats({ a: beat(600_000, ["dentvid"]) }, NOW))).toBe("down");
    expect(workerHealth([])).toBe("unknown");
  });
});

describe("weekly batch schedule", () => {
  it("next batch is Saturday 18:00 UTC, for the Monday after", () => {
    expect(nextDispatch(NOW).toISOString()).toBe("2026-11-14T18:00:00.000Z");
    expect(nextDispatch(new Date("2026-11-14T17:59:00Z")).toISOString()).toBe("2026-11-14T18:00:00.000Z");
    expect(nextDispatch(new Date("2026-11-14T18:00:00Z")).toISOString()).toBe("2026-11-21T18:00:00.000Z");
    expect(dispatchWeek(new Date("2026-11-14T18:00:00Z"))).toBe("2026-11-16");
    expect(lastDispatch(NOW)).toEqual({ at: new Date("2026-11-07T18:00:00Z"), week: "2026-11-09" });
  });

  it("parses the dispatch marker and the owner-alert logs", () => {
    expect(parseDispatch(JSON.stringify({ at: "2026-11-07T18:00:01Z", jobs: 12, waves: 4, projectedLate: 1 }))).toEqual({ at: "2026-11-07T18:00:01Z", jobs: 12, waves: 4, projectedLate: 1 });
    expect(parseDispatch(null)).toBeNull();
    expect(parseDispatch("nope")).toBeNull();
    const a = parseAlerts([[JSON.stringify({ at: "2026-11-10T01:00:00Z", severity: "high", title: "Week failed", key: "k1", clinic: "A" }), "bad"], [JSON.stringify({ at: "2026-11-11T01:00:00Z", severity: "warning", title: "Thin week", key: "k2", clinic: null })]]);
    expect(a.map((x) => x.title)).toEqual(["Thin week", "Week failed"]);
  });

  it("daily cost: the long-lived record merged with the live counters, summed over a window", () => {
    const by = costByDay({ "2026-11-11": "200", "2026-11-10": "1000", "2026-11-01": "500", junk: "9" }, { "2026-11-11": "640", "2026-11-09": null });
    expect([...by.entries()].sort()).toEqual([
      ["2026-11-01", 5],
      ["2026-11-10", 10],
      ["2026-11-11", 6.4],
    ]);
    expect(costOver(by, 1, NOW)).toBe(6.4);
    expect(costOver(by, 7, NOW)).toBe(16.4);
    expect(costOver(by, 30, NOW)).toBe(21.4);
  });
});

describe("readSystem", () => {
  it("without Redis: unavailable, with the schedule still computed", async () => {
    const s = await readSystem(NOW, { redis: null });
    expect(s.available).toBe(false);
    expect(s.error).toMatch(/REDIS_URL/);
    expect(s.nextBatch.at).toBe("2026-11-14T18:00:00.000Z");
  });

  it("reads queues, failed jobs, heartbeats, alerts and cost from one pipeline (read-only commands only)", async () => {
    const used = new Set<string>();
    const store: Record<string, unknown> = {
      "bull:dentvid:wait": 2,
      "bull:dentvid:failed": ["j1"],
      "bull:dentvid:j1": ["week", JSON.stringify({ clinicId: "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d" }), "boom", "4", "1", "2", "3", "{}"],
      "dv:worker:heartbeats": { "h:1": JSON.stringify({ host: "h", at: new Date(NOW.getTime() - 20_000).toISOString(), roles: ["dentvid"] }) },
      "dv:cost:daily": { "2026-11-10": "300" },
      "dv:spend:usd:day:2026-11-11": "125",
    };
    const pipeline = () => {
      const cmds: [string, string][] = [];
      const p: Record<string, unknown> = {};
      for (const c of ["llen", "zcard", "hget", "zrevrange", "lrange", "hgetall", "get", "hmget"]) {
        p[c] = (key: string) => {
          used.add(c);
          cmds.push([c, key]);
          return p;
        };
      }
      p.exec = async () =>
        cmds.map(([c, k]) => {
          const v = store[k];
          if (c === "llen" || c === "zcard") return [null, typeof v === "number" ? v : Array.isArray(v) ? v.length : 0];
          if (c === "zrevrange" || c === "lrange") return [null, Array.isArray(v) ? v : []];
          if (c === "hgetall") return [null, v ?? {}];
          if (c === "hmget") return [null, Array.isArray(v) ? v : [null]];
          return [null, v ?? null];
        });
      return p;
    };
    const redis = { status: "ready", pipeline, once: vi.fn() };
    const s = await readSystem(NOW, { redis: redis as never });
    expect(s.available).toBe(true);
    expect(s.queues.find((q) => q.name === "dentvid")).toMatchObject({ waiting: 2, failed: 1 });
    expect(s.failed[0]).toMatchObject({ id: "j1", name: "week", failedReason: "boom" });
    expect(s.health).toBe("up");
    expect(Object.fromEntries(s.costByDay)).toEqual({ "2026-11-10": 3, "2026-11-11": 1.25 });
    // Nothing that writes.
    expect([...used].every((c) => ["llen", "zcard", "hget", "zrevrange", "lrange", "hgetall", "get", "hmget"].includes(c))).toBe(true);
  });
});

describe("signed URLs for the players", () => {
  it("are short-lived: 15 minutes, never more than 30", () => {
    expect(ADMIN_SIGNED_URL_TTL_SEC).toBe(900);
    expect(ADMIN_SIGNED_URL_MAX_SEC).toBeLessThanOrEqual(1800);
  });

  it("are created on the server per call, for valid keys only, with the short expiry (clamped)", async () => {
    const calls: [string, string[], number][] = [];
    const db = {
      storage: {
        from: (bucket: string) => ({
          createSignedUrls: async (paths: string[], exp: number) => {
            calls.push([bucket, paths, exp]);
            return { data: paths.map((p) => ({ path: p, signedUrl: `https://liman/sign/${p}?exp=${exp}` })), error: null };
          },
        }),
      },
    };
    const urls = await signAdminPaths(db, [`${OWNER}/a.mp4`, `${OWNER}/a.mp4`, `${OWNER}/../etc/passwd`, "not-an-owner/a.mp4", null]);
    expect(calls).toEqual([["dentvid", [`${OWNER}/a.mp4`], 900]]);
    expect(urls.get(`${OWNER}/a.mp4`)).toContain("exp=900");
    await signAdminPaths(db, [`${OWNER}/b.mp4`], 7 * 86_400);
    expect(calls[1][2]).toBe(ADMIN_SIGNED_URL_MAX_SEC);
    expect(await signAdminPaths(db, [])).toEqual(new Map());
    expect(signablePath(`${OWNER}/logo.png`)).toBe(true);
  });

  it("never throws: a storage error just means no player", async () => {
    const db = { storage: { from: () => ({ createSignedUrls: async () => Promise.reject(new Error("down")) }) } };
    expect((await signAdminPaths(db as never, [`${OWNER}/a.mp4`])).size).toBe(0);
  });
});

describe("no admin code in the browser", () => {
  const roots = ["src/app/dentvideo/admin", "src/app/api/dentvideo/admin", "src/components/dentvid", "src/lib/dentvid"];
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });

  it("no admin page, component or helper is a client component", () => {
    const admin = roots.flatMap((r) => files(path.resolve(r))).filter((f) => /admin/.test(path.relative(process.cwd(), f)) && /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
    expect(admin.length).toBeGreaterThan(10);
    for (const f of admin) expect(readFileSync(f, "utf8"), f).not.toMatch(/^\s*["']use client["']/m);
  });

  it("no client component imports the admin modules or the service-role client", () => {
    const client = roots.flatMap((r) => files(path.resolve(r))).filter((f) => /\.tsx?$/.test(f) && /^\s*["']use client["']/m.test(readFileSync(f, "utf8")));
    for (const f of client) expect(readFileSync(f, "utf8"), f).not.toMatch(/admin-(server|loaders|signed|actions|system-server|audit)|dvAdmin\(/);
  });
});
