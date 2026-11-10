import { describe, expect, it } from "vitest";
import { API_GLOBAL_PER_IP, LIMITS, MemoryStore, checkAll, clientIp, networkOf, slidingWindow } from "./rate-limit";

describe("networkOf", () => {
  it("groups IPv4 by /24 and IPv6 by /64", () => {
    expect(networkOf("203.0.113.9")).toBe("203.0.113.0/24");
    expect(networkOf("::ffff:203.0.113.77")).toBe("203.0.113.0/24");
    expect(networkOf("2001:db8:abcd:12:1:2:3:4")).toBe("2001:db8:abcd:12::/64");
    expect(networkOf("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(networkOf("2001:0db8:0000:0012::9")).toBe("2001:db8:0:12::/64");
    expect(networkOf("unknown")).toBe("unknown");
  });
});

describe("sign-up limits", () => {
  it("per client is the brake; the global ceiling is a high backstop", () => {
    expect(LIMITS.signupIp.limit).toBeLessThanOrEqual(5);
    expect(LIMITS.signupIpDay.limit).toBeLessThanOrEqual(10);
    // A distributed flood needs many networks to lock everyone out for an hour.
    expect(LIMITS.signupGlobal.limit / LIMITS.signupIpDay.limit).toBeGreaterThanOrEqual(100);
    expect(LIMITS.signupGlobal.windowSec).toBe(3600);
  });
});

const h = (m: Record<string, string>) => ({ get: (k: string) => m[k.toLowerCase()] ?? null });

describe("slidingWindow", () => {
  it("allows up to the limit, then refuses with a Retry-After", async () => {
    const store = new MemoryStore();
    const rule = { limit: 3, windowSec: 60 };
    const t = 1_000_000_000_000; // start of a 60 s bucket
    for (let i = 0; i < 3; i++) expect((await slidingWindow(store, "k", rule, t + i)).ok).toBe(true);
    const r = await slidingWindow(store, "k", rule, t + 10);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
    expect(r.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("weights the previous window, so a burst at the edge does not double the limit", async () => {
    let now = 1_000_000_000_000;
    const store = new MemoryStore(1000, () => now);
    const rule = { limit: 10, windowSec: 60 };
    // 10 requests at the very end of one window…
    now += 59_000;
    for (let i = 0; i < 10; i++) expect((await slidingWindow(store, "k", rule, now)).ok).toBe(true);
    // …and right after the edge the previous window still counts almost fully.
    now += 2_000;
    expect((await slidingWindow(store, "k", rule, now)).ok).toBe(false);
    // A full window later the slate is clean.
    now += 60_000;
    expect((await slidingWindow(store, "k", rule, now)).ok).toBe(true);
  });

  it("keeps counting refused requests (a hammering client stays limited)", async () => {
    const store = new MemoryStore();
    const rule = { limit: 1, windowSec: 60 };
    const t = 1_000_000_000_000;
    await slidingWindow(store, "k", rule, t);
    for (let i = 0; i < 5; i++) await slidingWindow(store, "k", rule, t + i);
    expect(await store.get(`k:${Math.floor(t / 60_000)}`)).toBe(6);
  });

  it("limits keys independently", async () => {
    const store = new MemoryStore();
    const rule = { limit: 1, windowSec: 60 };
    expect((await slidingWindow(store, "a", rule)).ok).toBe(true);
    expect((await slidingWindow(store, "b", rule)).ok).toBe(true);
    expect((await slidingWindow(store, "a", rule)).ok).toBe(false);
  });
});

describe("checkAll", () => {
  it("passes only when every limit passes and reports the longest wait", async () => {
    const store = new MemoryStore();
    const t = 1_000_000_000_000;
    const checks = [
      { key: "ip", rule: { limit: 100, windowSec: 60 } },
      { key: "user", rule: { limit: 1, windowSec: 3600 } },
    ];
    expect((await checkAll(store, checks, t)).ok).toBe(true);
    const r = await checkAll(store, checks, t + 1);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(60);
  });
});

describe("MemoryStore", () => {
  it("stays bounded under a flood of distinct keys", async () => {
    const store = new MemoryStore(100);
    for (let i = 0; i < 1000; i++) await store.incr(`ip-${i}`, 60);
    expect(store.size).toBeLessThanOrEqual(100);
  });
});

describe("clientIp", () => {
  it("prefers Traefik's x-real-ip, then the last x-forwarded-for hop", () => {
    expect(clientIp(h({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 1.2.3.4" }), {})).toBe("1.2.3.4");
    // The first XFF entries are client-supplied and spoofable; the last is our proxy's.
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 5.5.5.5" }), {})).toBe("5.5.5.5");
    expect(clientIp(h({}), {})).toBe("unknown");
  });

  it("trusts cf-connecting-ip only when told the origin is behind Cloudflare", () => {
    const hs = h({ "cf-connecting-ip": "7.7.7.7", "x-real-ip": "172.70.0.1" });
    expect(clientIp(hs, {})).toBe("172.70.0.1");
    expect(clientIp(hs, { TRUST_CF_CONNECTING_IP: "1" })).toBe("7.7.7.7");
  });
});

describe("LIMITS", () => {
  it("are all positive and sign-up is tighter than the generic API limit", () => {
    for (const r of Object.values(LIMITS)) {
      expect(r.limit).toBeGreaterThan(0);
      expect(r.windowSec).toBeGreaterThan(0);
    }
    expect(LIMITS.signupIp.limit).toBeLessThan(API_GLOBAL_PER_IP.limit);
  });
});
