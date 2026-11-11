import { describe, expect, it } from "vitest";
import { beat, COST_DAILY_KEY, HEARTBEAT_KEY, heartbeatField, heartbeatPayload, oldCostDays, staleHeartbeatFields } from "./heartbeat.js";
import { afterRerender, MISSING_VIDEO } from "./rows.js";
import { clinicsToRun, planBatch, shouldRun } from "./schedule.js";

const NOW = new Date("2026-11-11T12:00:30Z");

describe("heartbeat payload", () => {
  it("carries version, uptime, sorted roles and render concurrency", () => {
    const hb = heartbeatPayload({
      roles: new Set(["dentvid", "crons", "dentvid-mail"]),
      renderConcurrency: 2,
      startedAt: new Date(NOW.getTime() - 3_600_000),
      now: NOW,
      env: { GIT_COMMIT_SHA: "abc1234" },
      host: "box",
      pid: 42,
    });
    expect(hb).toEqual({
      host: "box",
      pid: 42,
      version: "abc1234",
      startedAt: "2026-11-11T11:00:30.000Z",
      at: NOW.toISOString(),
      uptimeSec: 3600,
      roles: ["crons", "dentvid", "dentvid-mail"],
      renderConcurrency: 2,
    });
    expect(heartbeatField(hb)).toBe("box:42");
    expect(heartbeatPayload({ roles: [], renderConcurrency: 1, startedAt: NOW, now: NOW, env: {} }).version).toBe("unknown");
  });

  it("prunes processes silent for a week and unreadable entries", () => {
    const fresh = JSON.stringify({ at: new Date(NOW.getTime() - 60_000).toISOString() });
    const old = JSON.stringify({ at: new Date(NOW.getTime() - 8 * 86_400_000).toISOString() });
    expect(staleHeartbeatFields({ a: fresh, b: old, c: "{bad" }, NOW)).toEqual(["b", "c"]);
  });

  it("prunes cost days older than 400 days", () => {
    expect(oldCostDays(["2026-11-10", "2025-01-01", "junk"], NOW)).toEqual(["2025-01-01", "junk"]);
  });

  it("writes the heartbeat and copies today's and yesterday's spend into the daily cost hash", async () => {
    const hashes = new Map<string, Map<string, string>>();
    const kv = new Map<string, string>([
      ["dv:spend:usd:day:2026-11-11", "640"],
      ["dv:spend:usd:day:2026-11-10", "1210"],
    ]);
    const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
    const r = {
      hset: async (k: string, f: string, v: string) => (h(k).set(f, v), 1),
      hgetall: async (k: string) => Object.fromEntries(h(k)),
      hdel: async (k: string, ...f: string[]) => f.filter((x) => h(k).delete(x)).length,
      hkeys: async (k: string) => [...h(k).keys()],
      get: async (k: string) => kv.get(k) ?? null,
    };
    const hb = heartbeatPayload({ roles: ["dentvid"], renderConcurrency: 1, startedAt: NOW, now: NOW, host: "h", pid: 1 });
    await beat(r as never, hb, NOW);
    expect(JSON.parse(h(HEARTBEAT_KEY).get("h:1")!).roles).toEqual(["dentvid"]);
    expect(Object.fromEntries(h(COST_DAILY_KEY))).toEqual({ "2026-11-10": "1210", "2026-11-11": "640" });
  });
});

describe("re-render heals a row", () => {
  it("a row flagged only for its missing file becomes ready", () => {
    expect(afterRerender("flagged", [MISSING_VIDEO])).toEqual({ status: "ready", findings: [] });
  });
  it("other findings keep it flagged", () => {
    expect(afterRerender("flagged", ["quality: silent narration", MISSING_VIDEO])).toEqual({ findings: ["quality: silent narration"] });
  });
  it("a legacy failed row becomes flagged, never ready", () => {
    expect(afterRerender("failed", [])).toEqual({ status: "flagged" });
  });
  it("a reviewer's verdict is left alone", () => {
    expect(afterRerender("rejected", ["claim"])).toEqual({});
    expect(afterRerender("ready", [])).toEqual({});
  });
});

describe("admin pause", () => {
  it("a paused clinic is not run, nor put in the batch", () => {
    expect(shouldRun({ plan: "active", admin_paused_at: null })).toBe(true);
    expect(shouldRun({ plan: "active", admin_paused_at: "2026-11-10T00:00:00Z" })).toBe(false);
    expect(shouldRun({ plan: "trial" })).toBe(false);
    const clinics = [
      { id: "a", plan: "active", profile: { country: "DE" } },
      { id: "b", plan: "active", profile: { country: "DE" }, admin_paused_at: "2026-11-10T00:00:00Z" },
    ];
    expect(clinicsToRun(clinics)).toEqual(["a"]);
    expect(planBatch(clinics, "2026-11-16", NOW).map((b) => b.clinicId)).toEqual(["a"]);
  });
});
