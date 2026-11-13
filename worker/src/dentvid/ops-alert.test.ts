import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetLocalOnce,
  alerts,
  alertsEnabled,
  ALERT_LOG_KEY,
  cleanError,
  countSpike,
  deliverAlert,
  digestHasNews,
  MemoryOpsStore,
  mrrDelta,
  renderAlert,
  renderDigest,
  resendSender,
  type DigestData,
  type Mail,
  type OwnerAlert,
} from "./ops-alert.js";

const CLINIC = { id: "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d", name: "Gülüş Dental", country: "TR", tier: "practice", email: "dr@gulus.example" };
const NOW = new Date("2026-11-09T07:00:00Z");

let store: MemoryOpsStore;
let sent: Mail[];
const send = async (m: Mail) => (sent.push(m), true);
const deps = (env: Record<string, string> = {}, now = NOW) => ({ store, send, env, now: () => now });

beforeEach(() => {
  store = new MemoryOpsStore();
  sent = [];
  _resetLocalOnce();
});

/** One of each alert, as raised by the system. */
export const SAMPLES: Record<string, OwnerAlert> = {
  weekFailed: alerts.weekFailed({ clinic: CLINIC, week: "2026-11-09", attempts: 4, error: "render timed out after 900s", permanent: false }),
  thinWeek: alerts.thinWeek({ clinic: CLINIC, week: "2026-11-09", usable: 2, wanted: 5, reasons: ["429 Rate limit reached", "mentions a guarantee"] }),
  dispatchMissing: alerts.dispatchMissing({ week: "2026-11-09", activeClinics: 12, jobs: 0, missing: 12, requeued: 12, reason: "the dispatch never ran" }),
  firstWeekLate: alerts.firstWeekLate({ clinic: CLINIC, paidAt: "2026-11-09T05:00:00.000Z", minutes: 125, requeued: true, jobState: "active" }),
  webhookSignatures: alerts.webhookSignatures({ count: 5, threshold: 5 }),
  webhookError: alerts.webhookError({ event: "subscription.active", error: "update dentvid_clinics: connection refused", clinic: CLINIC }),
  paymentFailed: alerts.customerAtRisk({ clinic: CLINIC, event: "payment.failed", from: "active", to: "active" }),
  onHold: alerts.customerAtRisk({ clinic: CLINIC, event: "subscription.on_hold", from: "active", to: "paused" }),
  cancelled: alerts.customerAtRisk({ clinic: CLINIC, event: "subscription.cancelled", from: "active", to: "cancelled" }),
  emailFailures: alerts.emailFailures({ count: 3, threshold: 3, lastError: "403 domain not verified" }),
  renderSpike: alerts.errorSpike({ kind: "render", count: 5, threshold: 5, sample: "render crashed: Chromium OOM" }),
  serverSpike: alerts.errorSpike({ kind: "5xx", count: 10, threshold: 10, sample: "/api/dentvideo/week" }),
  newPaying: alerts.newPayingClinic({ clinic: CLINIC, interval: "month", returning: false }),
  monitorDown: alerts.monitorDown({
    incident: "signup:2026-11-09T06:45",
    reminder: false,
    checks: [{ label: "Sign-up", since: "2026-11-09T06:45:00.000Z", fails: 2, error: "no session cookie (dv-auth) on the sign-up response", hint: "Try signing up on /start yourself." }],
  }),
  monitorRecovered: alerts.monitorRecovered({ incident: "signup:2026-11-09T06:45", checks: [{ label: "Sign-up", since: "2026-11-09T06:45:00.000Z", minutes: 30 }] }),
  signupBroken: alerts.signupBroken({ step: "server_sign_in", error: "Invalid login credentials" }),
  enqueueFailed: alerts.enqueueFailed({ where: "payment", job: "week", error: "connect ECONNREFUSED", clinic: CLINIC }),
  welcomeNotSent: alerts.welcomeNotSent({ clinic: CLINIC, result: "failed" }),
  recordingFailed: alerts.recordingFailed({ clinic: CLINIC, attempts: 2, error: "OpenAI 500", jobId: "rec:x" }),
  cronFailed: alerts.cronFailed({ job: "watchdog-monday", error: "fetch failed", attempts: 3 }),
};

describe("every alert says what happened, which clinic, what was done, what to do", () => {
  it.each(Object.entries(SAMPLES))("%s", (_name, a) => {
    const m = renderAlert(a);
    expect(m.subject).toMatch(/^\[DentVideo\] (ACİL|DİKKAT|GÜZEL HABER): .+ \/ (URGENT|HEADS-UP|GOOD NEWS): /);
    expect(m.subject.length).toBeLessThanOrEqual(180);
    expect(m.text).toMatch(/What happened/);
    expect(m.text).toMatch(/What the system already did/);
    expect(m.text).toMatch(/What you should do/);
    if (a.clinic) {
      expect(m.subject).toContain("Gülüş Dental");
      expect(m.text).toContain(CLINIC.id);
      expect(m.html).toContain(CLINIC.id);
    }
    expect(m.html).toContain('name="viewport"');
    expect(m.html).not.toMatch(/<script/i);
  });

  it("escapes clinic-provided text in HTML", () => {
    const m = renderAlert(alerts.newPayingClinic({ clinic: { id: "x", name: "<img src=x onerror=alert(1)>" }, returning: false }));
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("&lt;img");
  });

  it("a payment problem suggests writing to the clinic; good news suggests saying hello", () => {
    expect(renderAlert(SAMPLES.paymentFailed).text).toMatch(/friendly note to dr@gulus\.example.*card may have expired/);
    expect(renderAlert(SAMPLES.cancelled).text).toMatch(/Ask dr@gulus\.example why/);
    expect(renderAlert(SAMPLES.newPaying).text).toMatch(/Say hello — dr@gulus\.example/);
    expect(renderAlert(SAMPLES.newPaying).text).toMatch(/practice \(monthly\) from TR/);
  });

  it("errors are cleaned: one line, no keys or bearer tokens, short", () => {
    const e = new Error("401 Incorrect API key provided: sk_live_ABCDEFGHIJKLMNOP\nBearer abc.def.ghi\n" + "x".repeat(400));
    const c = cleanError(e);
    expect(c).not.toMatch(/ABCDEFGHIJKLMNOP|abc\.def\.ghi|\n/);
    expect(c.length).toBeLessThanOrEqual(240);
  });
});

describe("delivery: one email per incident per day, never a storm", () => {
  it("de-duplicates by incident key per UTC day", async () => {
    for (let i = 0; i < 5; i++) await deliverAlert(deps(), SAMPLES.weekFailed);
    expect(sent).toHaveLength(1);
    // Another clinic's week is another incident.
    await deliverAlert(deps(), alerts.weekFailed({ clinic: { id: "other" }, week: "2026-11-09", attempts: 4, error: "x", permanent: false }));
    expect(sent).toHaveLength(2);
    // The next day the same incident may be reported again.
    expect(await deliverAlert(deps({}, new Date("2026-11-10T07:00:00Z")), SAMPLES.weekFailed)).toBe("sent");
    expect(sent).toHaveLength(3);
  });

  it("caps alerts per hour: past the cap one 'muted' note, then silence until the next hour", async () => {
    const results = [];
    for (let i = 0; i < 20; i++) results.push(await deliverAlert(deps({ DENTVID_ALERT_MAX_PER_HOUR: "3" }), { ...SAMPLES.renderSpike, key: `k${i}` }));
    expect(results.filter((r) => r === "sent")).toHaveLength(3);
    expect(results.filter((r) => r === "muted")).toHaveLength(17);
    expect(sent).toHaveLength(4);
    expect(sent[3].subject).toMatch(/Too many alerts/);
    // Next hour: back to normal.
    expect(await deliverAlert(deps({ DENTVID_ALERT_MAX_PER_HOUR: "3" }, new Date("2026-11-09T08:01:00Z")), { ...SAMPLES.renderSpike, key: "later" })).toBe("sent");
  });

  it("kill switch DENTVID_OWNER_ALERTS=off: nothing sent", async () => {
    for (const v of ["off", "OFF", "0", "false"]) {
      expect(alertsEnabled({ DENTVID_OWNER_ALERTS: v })).toBe(false);
      expect(await deliverAlert(deps({ DENTVID_OWNER_ALERTS: v }), SAMPLES.newPaying)).toBe("disabled");
    }
    expect(alertsEnabled({})).toBe(true);
    expect(sent).toEqual([]);
  });

  it("Redis down: still at most one email per key (in-process gate), never throws", async () => {
    store.down = true;
    for (let i = 0; i < 5; i++) await deliverAlert(deps(), SAMPLES.emailFailures);
    expect(sent).toHaveLength(1);
  });

  it("an alert whose email failed is not swallowed for the day: the next raise sends it", async () => {
    let up = false;
    const flaky = Object.assign(async (m: { subject: string; text: string; html: string }) => (up ? (sent.push(m), true) : false), { configured: true });
    expect(await deliverAlert({ store, send: flaky, now: () => NOW }, SAMPLES.weekFailed)).toBe("failed");
    up = true;
    expect(await deliverAlert({ store, send: flaky, now: () => NOW }, SAMPLES.weekFailed)).toBe("sent");
    expect(await deliverAlert({ store, send: flaky, now: () => NOW }, SAMPLES.weekFailed)).toBe("deduped");
    expect(sent).toHaveLength(1);
    // Logged once for the digest, not once per attempt.
    expect((await store.list(ALERT_LOG_KEY("2026-11-09"))).length).toBe(1);
  });

  it("an incident muted by the hourly cap is delivered when raised again next hour", async () => {
    const env = { DENTVID_ALERT_MAX_PER_HOUR: "1" };
    await deliverAlert(deps(env), { ...SAMPLES.renderSpike, key: "first" });
    expect(await deliverAlert(deps(env), SAMPLES.weekFailed)).toBe("muted");
    expect(await deliverAlert(deps(env, new Date("2026-11-09T08:05:00Z")), SAMPLES.weekFailed)).toBe("sent");
  });

  it("no transport configured: the key is kept (no point retrying every raise)", async () => {
    const none = Object.assign(async () => false, { configured: false });
    expect(await deliverAlert({ store, send: none, now: () => NOW }, SAMPLES.onHold)).toBe("failed");
    expect(await deliverAlert({ store, send: none, now: () => NOW }, SAMPLES.onHold)).toBe("deduped");
  });

  it("a failing transport reports 'failed' and never throws", async () => {
    const r = await deliverAlert({ store, send: async () => { throw new Error("boom"); }, now: () => NOW }, SAMPLES.onHold);
    expect(r).toBe("failed");
  });

  it("logs every alert raised (even de-duplicated ones are logged once) for the digest", async () => {
    await deliverAlert(deps(), SAMPLES.newPaying);
    await deliverAlert(deps(), SAMPLES.newPaying);
    await deliverAlert(deps(), SAMPLES.onHold);
    const log = (await store.list(ALERT_LOG_KEY("2026-11-09"))).map((l) => JSON.parse(l));
    expect(log.map((l) => l.title)).toEqual(["New paying clinic", "Customer payment failed"]);
  });
});

describe("spike counting", () => {
  it("trips exactly once when the hourly count reaches the threshold", async () => {
    const trips = [];
    for (let i = 0; i < 12; i++) trips.push((await countSpike(store, "5xx", 10, NOW)).tripped);
    expect(trips.filter(Boolean)).toHaveLength(1);
    expect(trips.indexOf(true)).toBe(9);
    // A new hour starts a new count.
    expect((await countSpike(store, "5xx", 1, new Date("2026-11-09T08:00:00Z"))).tripped).toBe(true);
  });
  it("no store → never trips", async () => {
    expect(await countSpike(null, "x", 1)).toEqual({ count: 0, tripped: false });
  });
});

describe("resend transport", () => {
  it("posts html + text to OWNER_ALERT_EMAIL only", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const s = resendSender({ OWNER_ALERT_EMAIL: "owner@example.com", RESEND_API_KEY: "re_test" }, f as unknown as typeof fetch);
    expect(s.configured).toBe(true);
    expect(await s(renderAlert(SAMPLES.newPaying))).toBe(true);
    const body = JSON.parse(((f.mock.calls[0] as unknown[])[1] as RequestInit).body as string);
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.html).toContain("<!doctype html>");
    expect(body.text).toContain("What happened");
  });
  it("without a recipient or key: false, no request", async () => {
    const f = vi.fn();
    expect(await resendSender({ RESEND_API_KEY: "re_x" }, f as unknown as typeof fetch)(renderAlert(SAMPLES.newPaying))).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

export const DIGEST: DigestData = {
  period: "Sun 8 Nov 08:30 → Mon 9 Nov 08:30 (Istanbul)",
  signups: 4,
  newPaying: [
    { name: "Gülüş Dental", tier: "practice", country: "TR" },
    { name: "Zahnarztpraxis Weber", tier: "starter", country: "DE" },
  ],
  mrrUsd: 1286,
  mrrPrevUsd: 1188,
  paying: 21,
  churned: [{ name: "Clínica Sol", to: "paused" }],
  weeksDelivered: 19,
  weeksFailed: 1,
  videosReady: 91,
  emailsSent: 37,
  emailsFailed: 0,
  alerts: [
    { at: "2026-11-09T07:00:00.000Z", severity: "urgent", title: "A paying clinic's week failed", clinic: "Clínica Sol" },
    { at: "2026-11-08T14:12:00.000Z", severity: "good", title: "New paying clinic", clinic: "Gülüş Dental" },
  ],
};

describe("daily digest", () => {
  it("has every number, the new clinics, the MRR delta and the alerts", () => {
    const m = renderDigest(DIGEST);
    expect(m.subject).toBe("[DentVideo] Günlük özet / Daily digest — 2 yeni müşteri / new paying, MRR $1286 (+$98)");
    for (const s of ["New sign-ups: 4", "New paying: 2", "MRR: $1286 (+$98)", "Paying clinics: 21", "Weeks delivered: 19 (91 videos)", "Weeks failed: 1", "Emails sent: 37", "Alerts raised: 2"]) {
      expect(m.text).toContain(s);
    }
    expect(m.text).toContain("Gülüş Dental — practice, TR");
    expect(m.text).toContain("Clínica Sol → paused");
    expect(m.text).toContain("07:00 UTC A paying clinic's week failed — Clínica Sol");
  });
  it("is only sent when something happened", () => {
    const quiet: DigestData = { ...DIGEST, signups: 0, newPaying: [], churned: [], mrrPrevUsd: 1286, weeksDelivered: 0, weeksFailed: 0, videosReady: 0, emailsSent: 0, alerts: [] };
    expect(digestHasNews(quiet)).toBe(false);
    expect(digestHasNews({ ...quiet, signups: 1 })).toBe(true);
    expect(digestHasNews({ ...quiet, mrrPrevUsd: 1300 })).toBe(true);
  });
  it("MRR delta: unknown on the first digest, signed otherwise", () => {
    expect(mrrDelta({ ...DIGEST, mrrPrevUsd: null })).toBe("—");
    expect(mrrDelta({ ...DIGEST, mrrUsd: 100, mrrPrevUsd: 149 })).toBe("−$49");
    expect(mrrDelta({ ...DIGEST, mrrUsd: 100, mrrPrevUsd: 100 })).toBe("±$0");
  });
});
