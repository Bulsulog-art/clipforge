import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GET /api/health?worker=1: an outside monitor's view of the DentVideo
 * worker. 503 when a role went quiet, the Saturday dispatch did not run, the
 * render queue is stuck or Liman does not answer; 200 otherwise. Never names
 * a host, key or clinic. Redis and Liman are fakes.
 */

type Hash = Record<string, string>;
const redis = {
  status: "ready" as string,
  hashes: new Map<string, Hash>(),
  strings: new Map<string, string>(),
  lists: new Map<string, string[]>(),
  zsets: new Map<string, string[]>(),
  down: false,
  once: vi.fn(),
  pipeline() {
    const ops: (() => unknown)[] = [];
    const self = this;
    const p = {
      hgetall: (k: string) => (ops.push(() => self.hashes.get(k) ?? {}), p),
      get: (k: string) => (ops.push(() => self.strings.get(k) ?? null), p),
      llen: (k: string) => (ops.push(() => (self.lists.get(k) ?? []).length), p),
      lrange: (k: string, start: number, stop: number) => {
        ops.push(() => {
          const l = self.lists.get(k) ?? [];
          const s = start < 0 ? Math.max(0, l.length + start) : start;
          const e = stop < 0 ? l.length + stop : stop;
          return l.slice(s, e + 1);
        });
        return p;
      },
      zrange: (k: string, start: number, stop: number) => (ops.push(() => (self.zsets.get(k) ?? []).slice(start, stop + 1)), p),
      hget: (k: string, f: string) => (ops.push(() => self.hashes.get(k)?.[f] ?? null), p),
      exec: async () => {
        if (self.down) throw new Error("connect ECONNREFUSED redis.internal.example:6379");
        return ops.map((op) => [null, op()]);
      },
    };
    return p;
  },
};

let limited = false;
vi.mock("@/lib/rate-limit-server", () => ({
  limiterRedis: () => redis,
  rateLimited: async () => (limited ? new Response(JSON.stringify({ error: "too many requests" }), { status: 429 }) : null),
}));

let limanError: string | null = null;
let limanThrows = false;
const limanQueries: { table: string; opts: unknown }[] = [];
vi.mock("@/lib/dentvid/supabase", () => ({
  dvAdmin: () => {
    if (limanThrows) throw new Error("DentVideo backend is not configured");
    return {
      from: (table: string) => ({
        select: (_c: string, opts: unknown) => {
          limanQueries.push({ table, opts });
          return { limit: async () => (limanError ? { count: null, error: { message: limanError } } : { count: 12, error: null }) };
        },
      }),
    };
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: () => ({}) }));

const { GET } = await import("./route");

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const HOST_MAIN = "bulsu-worker-main-7f9c";
const HOST_RENDER = "render-1.liman.internal";
// Sunday 29 Nov 2026, 09:00 UTC: the Saturday 28 Nov 18:00 dispatch was for Monday 30 Nov.
const SUNDAY = new Date("2026-11-29T09:00:00Z");
const DISPATCH_KEY = "dv:ops:dispatch:2026-11-30";

function beat(host: string, roles: string[], ageMs: number, renderConcurrency = 1) {
  return JSON.stringify({ host, pid: 7, version: "abc", startedAt: "2026-11-29T00:00:00Z", at: new Date(Date.now() - ageMs).toISOString(), uptimeSec: 60, roles, renderConcurrency });
}

function healthy() {
  redis.hashes.set("dv:worker:heartbeats", {
    [`${HOST_MAIN}:7`]: beat(HOST_MAIN, ["crons", "dentvid-mail", "generate", "publish"], 20_000, 0),
    [`${HOST_RENDER}:7`]: beat(HOST_RENDER, ["dentvid"], 40_000, 1),
  });
  redis.strings.set(DISPATCH_KEY, JSON.stringify({ at: "2026-11-28T18:00:02Z", jobs: 3, waves: 2, projectedLate: 0 }));
}

const get = (q = "?worker=1") => GET(new Request(`https://dentvideo.com/api/health${q}`));
async function body(res: Response) {
  const text = await res.text();
  return { text, json: JSON.parse(text) as { ok: boolean; checks: Record<string, { ok: boolean; detail?: string }> } };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SUNDAY);
  redis.hashes.clear();
  redis.strings.clear();
  redis.lists.clear();
  redis.zsets.clear();
  redis.down = false;
  redis.status = "ready";
  limited = false;
  limanError = null;
  limanThrows = false;
  limanQueries.length = 0;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  healthy();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/health?worker=1", () => {
  it("every role beating, the dispatch done, the queue moving, Liman answering: 200", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { json } = await body(res);
    expect(json.ok).toBe(true);
    expect(Object.values(json.checks).every((c) => c.ok)).toBe(true);
    // The Liman probe is a head count on the clinics table, nothing read.
    expect(limanQueries).toEqual([{ table: "dentvid_clinics", opts: { count: "exact", head: true } }]);
  });

  it("a stale dentvid heartbeat (the render server went quiet 4 minutes ago): 503, naming the role and not the host", async () => {
    redis.hashes.get("dv:worker:heartbeats")![`${HOST_RENDER}:7`] = beat(HOST_RENDER, ["dentvid"], 4 * 60_000);
    const res = await get();
    expect(res.status).toBe(503);
    const { json, text } = await body(res);
    expect(json.ok).toBe(false);
    expect(json.checks.heartbeat).toEqual({ ok: false, detail: "no fresh heartbeat for: dentvid" });
    expect(json.checks.dispatch.ok).toBe(true);
    for (const secret of [HOST_RENDER, HOST_MAIN, "render-1", "liman", "dv:", "bull:", CLINIC]) expect(text).not.toContain(secret);
  });

  it("each watched role counts: dentvid-mail or crons quiet is a 503 too, and a dentvid process without render slots does not cover renders", async () => {
    redis.hashes.set("dv:worker:heartbeats", { [`${HOST_MAIN}:7`]: beat(HOST_MAIN, ["crons", "dentvid", "dentvid-mail"], 10_000, 0) });
    let { json } = await body(await get());
    expect(json.checks.heartbeat.detail).toBe("no fresh heartbeat for: dentvid");
    redis.hashes.set("dv:worker:heartbeats", { [`${HOST_MAIN}:7`]: beat(HOST_MAIN, ["dentvid"], 10_000, 1) });
    ({ json } = await body(await get()));
    expect(json.checks.heartbeat.detail).toBe("no fresh heartbeat for: dentvid-mail, crons");
    // No heartbeat at all: the worker is down.
    redis.hashes.clear();
    const res = await get();
    expect(res.status).toBe(503);
    expect((await body(res)).json.checks.heartbeat.detail).toBe("no fresh heartbeat for: dentvid, dentvid-mail, crons");
  });

  it("past Saturday 18:30 UTC without the dispatch marker for the coming week: 503", async () => {
    redis.strings.clear();
    const res = await get();
    expect(res.status).toBe(503);
    const { json, text } = await body(res);
    expect(json.checks.dispatch).toEqual({ ok: false, detail: "the weekly dispatch has not run" });
    expect(text).not.toContain("2026-11-30");
    expect(text).not.toContain("dv:ops");
  });

  it("within 30 minutes of the dispatch the marker may still be on its way; at 18:31 it must be there", async () => {
    redis.strings.clear();
    vi.setSystemTime(new Date("2026-11-28T18:20:00Z"));
    // Before the grace ends, the previous week's marker is not what is asked for either.
    redis.strings.set("dv:ops:dispatch:2026-11-23", JSON.stringify({ at: "2026-11-21T18:00:01Z", jobs: 3, waves: 2, projectedLate: 0 }));
    expect((await get()).status).toBe(200);
    vi.setSystemTime(new Date("2026-11-28T18:31:00Z"));
    expect((await get()).status).toBe(503);
    redis.strings.set(DISPATCH_KEY, JSON.stringify({ at: "2026-11-28T18:00:02Z", jobs: 0, waves: 0, projectedLate: 0 }));
    // A dispatch that ran with nothing to queue is still a dispatch that ran.
    expect((await get()).status).toBe(200);
  });

  it("the missing marker is watched until the delivery Monday is over (UTC), not all week", async () => {
    const at = async (iso: string) => {
      vi.setSystemTime(new Date(iso));
      healthy(); // heartbeats as fresh as the clock
      redis.strings.clear();
      return (await get()).status;
    };
    expect(await at("2026-11-30T23:59:00Z")).toBe(503);
    expect(await at("2026-12-01T00:01:00Z")).toBe(200);
    expect(await at("2026-12-04T12:00:00Z")).toBe(200);
  });

  it("a dentvid job waiting more than 6 hours with none running: 503; the same wait behind a running render: 200", async () => {
    const old = SUNDAY.getTime() - 7 * 3_600_000;
    redis.zsets.set("bull:dentvid:prioritized", ["week:a:2026-11-30", "week:b:2026-11-30"]);
    redis.hashes.set("bull:dentvid:week:a:2026-11-30", { timestamp: String(SUNDAY.getTime() - 60_000), data: JSON.stringify({ clinicId: CLINIC }) });
    redis.hashes.set("bull:dentvid:week:b:2026-11-30", { timestamp: String(old) });
    let res = await get();
    expect(res.status).toBe(503);
    const { json, text } = await body(res);
    expect(json.checks.queue).toEqual({ ok: false, detail: "a job has waited 7.0 h with none running" });
    expect(text).not.toContain("week:");
    expect(text).not.toContain(CLINIC);
    redis.lists.set("bull:dentvid:active", ["week:c:2026-11-30"]);
    res = await get();
    expect(res.status).toBe(200);
  });

  it("the oldest job of the plain wait list counts too, and a short wait is fine", async () => {
    redis.lists.set("bull:dentvid:wait", ["new", "old"]);
    redis.hashes.set("bull:dentvid:new", { timestamp: String(SUNDAY.getTime() - 60_000) });
    redis.hashes.set("bull:dentvid:old", { timestamp: String(SUNDAY.getTime() - 5 * 3_600_000) });
    expect((await get()).status).toBe(200);
    redis.hashes.set("bull:dentvid:old", { timestamp: String(SUNDAY.getTime() - 6.5 * 3_600_000) });
    expect((await get()).status).toBe(503);
  });

  it("Liman not answering the head count: 503, without the error text", async () => {
    limanError = "connect ECONNREFUSED liman.internal.example:8000";
    let res = await get();
    expect(res.status).toBe(503);
    let b = await body(res);
    expect(b.json.checks.database).toEqual({ ok: false, detail: "unreachable" });
    expect(b.text).not.toContain("liman");
    limanThrows = true;
    res = await get();
    expect(res.status).toBe(503);
    b = await body(res);
    expect(b.json.checks.database.ok).toBe(false);
  });

  it("Redis not answering: 503 on every worker check, no host in the body", async () => {
    redis.down = true;
    const res = await get();
    expect(res.status).toBe(503);
    const { json, text } = await body(res);
    expect(json.checks.heartbeat).toEqual({ ok: false, detail: "redis unreachable" });
    expect(json.checks.dispatch.ok).toBe(false);
    expect(json.checks.queue.ok).toBe(false);
    expect(json.checks.database.ok).toBe(true);
    expect(text).not.toContain("redis.internal");
    expect(text).not.toContain("6379");
  });

  it("is rate-limited like the deep check", async () => {
    limited = true;
    expect((await get()).status).toBe(429);
  });

  it("the plain check stays a fast 200 with no worker reads", async () => {
    redis.hashes.clear();
    const res = await get("");
    expect(res.status).toBe(200);
    expect(limanQueries).toEqual([]);
  });
});
