import { beforeEach, describe, expect, it } from "vitest";
import { _resetLocalOnce, deliverAlert, MemoryOpsStore, renderAlert, type Mail, type OwnerAlert } from "./ops-alert.js";
import {
  _resetMonitorMemory,
  applyResults,
  checkDodo,
  decodeSession,
  FAILS_TO_ALERT,
  HISTORY_MAX,
  MONITOR_CLEANUP_KEY,
  MONITOR_HISTORY_KEY,
  MONITOR_LAST_KEY,
  MONITOR_STATE_KEY,
  monitorConfig,
  monitorEmail,
  runMonitor,
  sessionCookie,
  type CheckResult,
  type FetchLike,
  type MonitorConfig,
} from "./synthetic.js";

const LIMAN = "https://liman.example.com";
const BASE = "https://dentvideo.com";
const ENV = { DENTVID_SUPABASE_URL: LIMAN, DENTVID_SERVICE_ROLE_KEY: "service-key", DENTVIDEO_MONITOR_TOKEN: "mon-token" };

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims: Record<string, unknown>) => `${b64url({ alg: "HS256" })}.${b64url(claims)}.sig`;
const PAGES: Record<string, string> = {
  "/": "<title>DentVideo — patient-education videos for dental clinics</title>",
  "/tr": "<title>DentVideo — diş klinikleri için hasta bilgilendirme videoları</title>",
  "/start": '<title>Start · DentVideo</title><input type="email"><input type="password">',
  "/privacy": "<title>Privacy Policy · DentVideo</title>",
  "/guides/instagram-videos-for-dentists": "<title>Instagram · DentVideo</title><h1 class=x>Instagram</h1>",
};

type World = {
  pages: Record<string, string | number>;
  signup: "ok" | "no-cookie" | "wrong-issuer" | "not-signed-in" | 429 | 500 | "throw";
  liman: { health: number; rest: number; user: number; del: number };
  dodo: { status: number; location?: string };
  calls: { url: string; init?: RequestInit }[];
};

function world(over: Partial<World> = {}): World {
  return { pages: { ...PAGES }, signup: "ok", liman: { health: 200, rest: 200, user: 200, del: 200 }, dodo: { status: 307, location: "/session/cks_1" }, calls: [], ...over };
}

let lastEmail = "";
function fakeFetch(w: World): FetchLike {
  return async (url, init) => {
    w.calls.push({ url, init });
    const u = new URL(url);
    if (u.origin === BASE && u.pathname === "/api/dentvideo/signup") {
      const body = JSON.parse(String(init?.body));
      lastEmail = body.email;
      if (w.signup === "throw") throw new Error("connect ECONNREFUSED");
      if (typeof w.signup === "number") return Response.json({ error: "Too many tries" }, { status: w.signup });
      if (w.signup === "not-signed-in") return Response.json({ ok: true, signedIn: false, userId: "u-1" });
      const iss = w.signup === "wrong-issuer" ? "https://clipforge.supabase.co/auth/v1" : `${LIMAN}/auth/v1`;
      const session = { access_token: jwt({ iss, sub: "u-1" }), user: { id: "u-1", email: body.email } };
      const headers = new Headers({ "content-type": "application/json" });
      if (w.signup !== "no-cookie") {
        const v = `base64-${b64url(session)}`;
        headers.append("set-cookie", `dv-auth.0=${v.slice(0, 40)}; Path=/; HttpOnly`);
        headers.append("set-cookie", `dv-auth.1=${v.slice(40)}; Path=/; HttpOnly`);
      }
      return new Response(JSON.stringify({ ok: true, signedIn: true, userId: "u-1" }), { status: 200, headers });
    }
    if (u.origin === BASE) {
      const p = w.pages[u.pathname];
      if (p === undefined) return new Response("not found", { status: 404 });
      if (typeof p === "number") return new Response("err", { status: p });
      return new Response(p, { status: 200 });
    }
    if (u.origin === LIMAN) {
      if (u.pathname === "/auth/v1/health") return Response.json({ name: "GoTrue" }, { status: w.liman.health });
      if (u.pathname === "/rest/v1/dentvid_clinics") return Response.json(w.liman.rest === 200 ? [] : { message: "down" }, { status: w.liman.rest });
      if (u.pathname === "/auth/v1/user") return Response.json({ id: "u-1", email: lastEmail }, { status: w.liman.user });
      if (u.pathname.startsWith("/auth/v1/admin/users/")) return new Response(null, { status: w.liman.del });
    }
    if (u.host.endsWith("dodopayments.com")) return new Response("", { status: w.dodo.status, headers: w.dodo.location ? { location: w.dodo.location } : {} });
    throw new Error(`unexpected ${url}`);
  };
}

let store: MemoryOpsStore;
let sent: Mail[];
let raised: OwnerAlert[];
let clock: Date;
const cfg = (env: Record<string, string> = ENV): MonitorConfig => monitorConfig(env);
const deps = (w: World, config = cfg()) => ({
  fetch: fakeFetch(w),
  store,
  config,
  now: () => clock,
  alert: async (a: OwnerAlert) => {
    raised.push(a);
    return deliverAlert({ store, send: async (m) => (sent.push(m), true), env: {}, now: () => clock }, a);
  },
});
const tick = (min = 15) => (clock = new Date(clock.getTime() + min * 60_000));

beforeEach(() => {
  store = new MemoryOpsStore();
  sent = [];
  raised = [];
  clock = new Date("2026-11-12T10:00:00Z");
  _resetLocalOnce();
  _resetMonitorMemory();
});

describe("config", () => {
  it("checks dentvideo.com, the live Dodo starter link, and Liman when configured", () => {
    const c = monitorConfig({});
    expect(c.baseUrl).toBe("https://dentvideo.com");
    expect(c.pages.map((p) => p.path)).toEqual(["/", "/tr", "/start", "/privacy", "/guides/instagram-videos-for-dentists"]);
    expect(c.dodoLink).toBe("https://checkout.dodopayments.com/buy/pdt_0NrVahwZsINvy3TNz2H35?quantity=1");
    expect(c.limanUrl).toBeNull();
    expect(monitorConfig({ DODO_ENVIRONMENT: "test" }).dodoLink).toMatch(/^https:\/\/test\.checkout\./);
    expect(monitorConfig({ DENTVIDEO_MONITOR_DODO_LINK: "off" }).dodoLink).toBeNull();
    expect(monitorConfig({ DENTVIDEO_MONITOR_URL: "https://staging.example/" }).baseUrl).toBe("https://staging.example");
  });

  it("monitor addresses follow the e2e-monitor+<ts> pattern (skipped by every email path)", () => {
    expect(monitorEmail(clock, "bulsulabs.com", "abc")).toBe(`e2e-monitor+${clock.getTime()}abc@bulsulabs.com`);
    expect(monitorEmail(clock, "bulsulabs.com")).toMatch(/^e2e-monitor\+\d+[0-9a-f]{6}@bulsulabs\.com$/);
  });
});

describe("cookies", () => {
  it("joins a chunked dv-auth cookie and decodes the base64 session", () => {
    const v = `base64-${b64url({ access_token: "t", user: { id: "u" } })}`;
    const c = sessionCookie([`dv-auth.1=${v.slice(10)}; Path=/`, `dv-auth.0=${v.slice(0, 10)}; Path=/`, "other=1"]);
    expect(decodeSession(c!)).toEqual({ access_token: "t", user: { id: "u" } });
    expect(sessionCookie([`dv-auth=${v}; Path=/`])).toBe(v);
    expect(sessionCookie(["dv-auth=; Max-Age=0", "sb-x-auth-token=abc"])).toBeNull();
    expect(decodeSession("garbage")).toBeNull();
  });
});

describe("a healthy run", () => {
  it("passes every check, deletes the monitor account, records the run and sends nothing", async () => {
    const w = world();
    const run = await runMonitor(deps(w));
    expect(run.ok).toBe(true);
    expect(run.results.map((r) => [r.name, r.ok, r.skipped ?? null])).toEqual([
      ["page-home", true, null],
      ["page-tr", true, null],
      ["page-start", true, null],
      ["page-privacy", true, null],
      ["page-guide", true, null],
      ["signup", true, null],
      ["cleanup", true, null],
      ["liman-auth", true, null],
      ["liman-rest", true, null],
      ["dodo", true, null],
    ]);
    // Sign-up carried the monitor token, an Origin and the timing the bot brake wants.
    const signup = w.calls.find((c) => c.url.endsWith("/api/dentvideo/signup"))!;
    expect((signup.init?.headers as Record<string, string>)["x-dv-monitor"]).toBe("mon-token");
    expect((signup.init?.headers as Record<string, string>).origin).toBe(BASE);
    expect(JSON.parse(String(signup.init?.body))).toMatchObject({ website: "", elapsedMs: 6000 });
    expect(JSON.parse(String(signup.init?.body)).email).toMatch(/^e2e-monitor\+\d+[0-9a-f]+@bulsulabs\.com$/);
    // The account is deleted with the service role.
    const del = w.calls.find((c) => c.init?.method === "DELETE")!;
    expect(del.url).toBe(`${LIMAN}/auth/v1/admin/users/u-1`);
    expect((del.init?.headers as Record<string, string>).authorization).toBe("Bearer service-key");
    expect(sent).toEqual([]);
    expect(JSON.parse((await store.get(MONITOR_LAST_KEY))!).ok).toBe(true);
    expect((await store.list(MONITOR_HISTORY_KEY)).map((h) => JSON.parse(h))).toEqual([{ at: clock.toISOString(), ms: 0, ok: true, failed: [], ran: 10 }]);
  });

  it("checks the Dodo link hourly (each call opens a checkout session), and every run while it fails", async () => {
    const w = world();
    await runMonitor(deps(w));
    tick();
    const second = await runMonitor(deps(w));
    expect(second.results.find((r) => r.name === "dodo")!.skipped).toBe("checked hourly");
    tick(45);
    const hourly = await runMonitor(deps(w));
    expect(hourly.results.find((r) => r.name === "dodo")!.skipped).toBeUndefined();
    w.dodo = { status: 307, location: "/error/not-found" };
    tick(60);
    expect((await runMonitor(deps(w))).results.find((r) => r.name === "dodo")!.ok).toBe(false);
    tick();
    const next = (await runMonitor(deps(w))).results.find((r) => r.name === "dodo")!;
    expect(next.skipped).toBeUndefined();
    expect(next.error).toMatch(/error page/);
  });

  it("without Liman credentials the sign-up and Liman checks are skipped, not failed", async () => {
    const run = await runMonitor(deps(world(), cfg({})));
    expect(run.ok).toBe(true);
    expect(run.results.filter((r) => r.skipped).map((r) => r.name)).toEqual(["signup", "liman-auth", "liman-rest"]);
  });
});

describe("what each check catches", () => {
  const failing = async (w: World) => (await runMonitor(deps(w))).results.filter((r) => !r.ok && !r.skipped);

  it("a page that is down or lost its content", async () => {
    const f = await failing(world({ pages: { ...PAGES, "/tr": 502, "/privacy": "<title>Oops</title>" } }));
    expect(f.map((r) => [r.name, r.error])).toEqual([
      ["page-tr", "HTTP 502 for /tr"],
      ["page-privacy", "page loaded but expected text is missing (Privacy Policy)"],
    ]);
  });

  it("sign-up without a session cookie, or not signed in (the phone bug)", async () => {
    expect((await failing(world({ signup: "no-cookie" })))[0].error).toMatch(/no session cookie/);
    expect((await failing(world({ signup: "not-signed-in" })))[0].error).toMatch(/did not sign it in/);
  });

  it("a session issued by the wrong Supabase project", async () => {
    const f = await failing(world({ signup: "wrong-issuer" }));
    expect(f[0].error).toMatch(/issued by clipforge\.supabase\.co, not Liman \(liman\.example\.com\) — wrong Supabase project/);
  });

  it("a session Liman refuses", async () => {
    const f = await failing(world({ liman: { health: 200, rest: 200, user: 401, del: 200 } }));
    expect(f.map((r) => r.name)).toEqual(["signup"]);
    expect(f[0].error).toMatch(/Liman refused the new session \(HTTP 401\)/);
  });

  it("rate limiting points at the monitor token", async () => {
    expect((await failing(world({ signup: 429 })))[0].error).toMatch(/HTTP 429 “Too many tries” — rate limited: is DENTVIDEO_MONITOR_TOKEN/);
  });

  it("Liman auth and REST down", async () => {
    const f = await failing(world({ liman: { health: 503, rest: 502, user: 200, del: 200 } }));
    expect(f.map((r) => r.name)).toEqual(["liman-auth", "liman-rest"]);
  });

  it("a monitor account that cannot be deleted is kept and retried next run", async () => {
    const w = world({ liman: { health: 200, rest: 200, user: 200, del: 500 } });
    const f = await failing(w);
    expect(f.map((r) => r.name)).toEqual(["cleanup"]);
    expect(await store.list(MONITOR_CLEANUP_KEY)).toEqual(["u-1"]);
    w.liman.del = 200;
    tick();
    const run = await runMonitor(deps(w));
    expect(run.results.find((r) => r.name === "cleanup")!.ok).toBe(true);
    expect(await store.list(MONITOR_CLEANUP_KEY)).toEqual([]);
  });

  it("a network error or timeout is a failure, not a crash", async () => {
    const f = await failing(world({ signup: "throw" }));
    expect(f[0]).toMatchObject({ name: "signup", error: "connect ECONNREFUSED" });
  });

  it("dodo: a 5xx fails, a direct 200 passes", async () => {
    const c = cfg();
    expect(await checkDodo(async () => new Response("", { status: 503 }), c)).toMatchObject({ ok: false, error: "checkout link answered HTTP 503" });
    expect(await checkDodo(async () => new Response("", { status: 200 }), c)).toMatchObject({ ok: true });
  });
});

describe("alerts: two in a row, one email, a reminder, a recovery", () => {
  it("one failure is not enough; the second raises one clear email naming what and since when", async () => {
    const w = world({ signup: "no-cookie" });
    await runMonitor(deps(w));
    expect(sent).toHaveLength(0);
    const since = clock.toISOString();
    tick();
    await runMonitor(deps(w));
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("[DentVideo] ACİL: Canlı kontrol başarısız: Sign-up / URGENT: Live check failing: Sign-up");
    expect(sent[0].text).toContain(`Sign-up has failed since ${since.slice(0, 16).replace("T", " ")} UTC (2 checks in a row, every 15 min): no session cookie (dv-auth) on the sign-up response`);
    expect(sent[0].text).toMatch(/Sign up yourself on dentvideo\.com\/start/);
    // Further failing runs stay quiet…
    for (let i = 0; i < 10; i++) {
      tick();
      await runMonitor(deps(w));
    }
    expect(sent).toHaveLength(1);
    // …until it is fixed: one recovery email.
    w.signup = "ok";
    tick();
    await runMonitor(deps(w));
    expect(sent).toHaveLength(2);
    expect(sent[1].subject).toBe("[DentVideo] GÜZEL HABER: Tekrar çalışıyor: Sign-up / GOOD NEWS: Recovered: Sign-up");
    expect(sent[1].text).toMatch(/Sign-up passes again, after about 180 min down/);
    tick();
    await runMonitor(deps(w));
    expect(sent).toHaveLength(2);
  });

  it("a site-wide outage is one email listing every failing check, not one per check", async () => {
    const w = world({ pages: { "/": 502, "/tr": 502, "/start": 502, "/privacy": 502, "/guides/instagram-videos-for-dentists": 502 }, signup: 500 });
    await runMonitor(deps(w));
    tick();
    await runMonitor(deps(w));
    expect(sent).toHaveLength(1);
    expect(sent[0].subject.length).toBeLessThanOrEqual(180);
    expect(sent[0].text.match(/has failed since/g)).toHaveLength(6);
  });

  it("a single blip that passes next time never emails", async () => {
    const w = world({ liman: { health: 503, rest: 200, user: 200, del: 200 } });
    await runMonitor(deps(w));
    w.liman.health = 200;
    tick();
    await runMonitor(deps(w));
    expect(sent).toEqual([]);
  });

  it("reminds every 6 hours while still down", async () => {
    const w = world({ liman: { health: 200, rest: 502, user: 200, del: 200 } });
    for (let i = 0; i < 2 + 4 * 6; i++) {
      await runMonitor(deps(w));
      tick();
    }
    expect(sent.map((m) => m.subject)).toEqual([
      "[DentVideo] ACİL: Canlı kontrol başarısız: Liman database API / URGENT: Live check failing: Liman database API",
      "[DentVideo] ACİL: Hâlâ çalışmıyor: Liman database API / URGENT: Still failing: Liman database API",
    ]);
  });

  it("an email that could not be sent is tried again on the next run", async () => {
    const w = world({ signup: 500 });
    let ok = false;
    const d = { ...deps(w), alert: async (a: OwnerAlert) => (raised.push(a), ok ? "sent" : "failed") as "sent" | "failed" };
    await runMonitor(d);
    tick();
    await runMonitor(d);
    expect(raised).toHaveLength(1);
    ok = true;
    tick();
    await runMonitor(d);
    expect(raised).toHaveLength(2);
    expect(raised[0].key).not.toBe(raised[1].key);
    tick();
    await runMonitor(d);
    expect(raised).toHaveLength(2);
  });

  it("still counts consecutive failures when Redis is down (in-process state)", async () => {
    const w = world({ signup: 500 });
    store.down = true;
    await runMonitor(deps(w));
    tick();
    await runMonitor(deps(w));
    expect(raised).toHaveLength(1);
  });

  it("history is capped", async () => {
    for (let i = 0; i < HISTORY_MAX + 3; i++) await store.push(MONITOR_HISTORY_KEY, String(i), 1, HISTORY_MAX);
    await runMonitor(deps(world()));
    expect(await store.list(MONITOR_HISTORY_KEY)).toHaveLength(HISTORY_MAX);
    expect(JSON.parse((await store.get(MONITOR_STATE_KEY))!).checks.signup.fails).toBe(0);
  });
});

describe("applyResults", () => {
  const r = (name: string, ok: boolean, skipped?: string): CheckResult => ({ name, label: name, ok, ms: 1, error: ok ? undefined : "x", skipped });
  it("skipped checks keep their state", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    const a = applyResults({ checks: {} }, [r("dodo", false)], now);
    const b = applyResults(a.state, [r("dodo", true, "checked hourly")], new Date(now.getTime() + 900_000));
    expect(b.state.checks.dodo.fails).toBe(1);
    expect(FAILS_TO_ALERT).toBe(2);
  });
  it("a newly failing check alongside one due a reminder is a fresh alert, not a reminder", () => {
    const now = new Date("2026-11-12T16:00:00Z");
    const old = { fails: 30, since: "2026-11-12T08:00:00.000Z", lastError: "x", lastOkAt: null, alertedAt: "2026-11-12T08:15:00.000Z", lastRunAt: null };
    const fresh = { fails: 1, since: "2026-11-12T15:45:00.000Z", lastError: "x", lastOkAt: null, alertedAt: null, lastRunAt: null };
    const t = applyResults({ checks: { dodo: old, signup: fresh } }, [r("dodo", false), r("signup", false)], now);
    expect(t.down.map((d) => d.name)).toEqual(["dodo", "signup"]);
    expect(t.reminder).toBe(false);
  });
});
