import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryOpsStore, _resetLocalOnce, digestHasNews, renderDigest, weekStateKey, type Mail } from "./ops-alert";
import { _setOpsForTests, noteEnqueueFailure, noteServerError, readWeekDelay } from "./ops-server";
import { sendEmail } from "./email";
import { buildDigest } from "./ops-digest";
import { clinicFindings, delayNote, nextAction } from "./app-ui";
import { WEEK_JOB_OPTS } from "./week-job";
import type { LibraryItem } from "@/components/dentvid/library";
import type { AdminEvent } from "./admin-metrics";

const here = path.resolve(__dirname);
const worker = path.resolve(here, "../../../../worker/src/dentvid");

describe.runIf(fs.existsSync(worker))("one owner-alert helper for web and worker", () => {
  it("web/src/lib/dentvid/ops-alert.ts is byte-identical to worker/src/dentvid/ops-alert.ts", () => {
    expect(fs.readFileSync(path.join(here, "ops-alert.ts"), "utf8")).toBe(fs.readFileSync(path.join(worker, "ops-alert.ts"), "utf8"));
  });
  it("the web app queues weeks with the worker's retry options", () => {
    const src = fs.readFileSync(path.join(worker, "retry.ts"), "utf8");
    expect(WEEK_JOB_OPTS.attempts).toBe(Number(/WEEK_ATTEMPTS = (\d+)/.exec(src)![1]));
    expect(WEEK_JOB_OPTS.backoff.delay).toBe(Number(/WEEK_BACKOFF_MS = ([\d_]+)/.exec(src)![1].replace(/_/g, "")));
  });
  it("web/src/lib/dentvid/job-options.ts (priorities and retries) is byte-identical to the worker's", () => {
    expect(fs.readFileSync(path.join(here, "job-options.ts"), "utf8")).toBe(fs.readFileSync(path.join(worker, "job-options.ts"), "utf8"));
  });
  it("the web app and the worker agree on the delivery week (Saturday 18:00 UTC boundary)", () => {
    const src = fs.readFileSync(path.join(worker, "schedule.ts"), "utf8");
    expect(src).toMatch(/DISPATCH_SCHEDULE = \{ pattern: "0 18 \* \* 6", tz: "UTC" \}/);
    expect(src).toMatch(/DISPATCH_HOURS_INTO_WEEK = 5 \* 24 \+ 18;/);
  });
});

let store: MemoryOpsStore;
let mails: Mail[];
beforeEach(() => {
  _resetLocalOnce();
  store = new MemoryOpsStore();
  mails = [];
  _setOpsForTests(store, async (m) => (mails.push(m), true));
});
afterEach(() => {
  _setOpsForTests(undefined);
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("email sending failures (Resend)", () => {
  it("below 3 an hour: quiet; at 3: one alert with the last error; sent emails are counted for the digest", async () => {
    process.env.RESEND_API_KEY = "re_test";
    let ok = true;
    vi.stubGlobal("fetch", vi.fn(async () => (ok ? new Response("{}", { status: 200 }) : new Response("domain not verified", { status: 403 }))));
    const msg = { subject: "s", html: "<p>h</p>", text: "t" };
    expect(await sendEmail("a@x.example", msg)).toBe(true);
    ok = false;
    await sendEmail("a@x.example", msg);
    await sendEmail("a@x.example", msg);
    expect(mails).toEqual([]);
    for (let i = 0; i < 5; i++) await sendEmail("a@x.example", msg);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/E-postalar gönderilemiyor \/ URGENT: Emails are failing to send/);
    expect(mails[0].text).toMatch(/403 domain not verified/);
    const hour = new Date().toISOString().slice(0, 13);
    expect(await store.get(`dv:ops:count:email_sent:${hour}`)).toBe("1");
    expect(await store.get(`dv:ops:count:email_fail:${hour}`)).toBe("7");
  });
});

describe("5xx spike", () => {
  it("10 server errors in an hour → one alert naming the route", async () => {
    for (let i = 0; i < 25; i++) await noteServerError("/api/dentvideo/week");
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/Server errors \(5xx\) spiking/);
    expect(mails[0].text).toContain("/api/dentvideo/week");
  });
});

describe("a job that could not be queued", () => {
  it("is logged and the owner hears once a day per place and clinic", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await noteEnqueueFailure("week-button", "week", new Error("connect ECONNREFUSED 10.0.0.5:6379"), "c-1");
    await noteEnqueueFailure("week-button", "week", new Error("connect ECONNREFUSED 10.0.0.5:6379"), "c-1");
    await noteEnqueueFailure("week-button", "week", new Error("again"), "c-2");
    expect(err).toHaveBeenCalledTimes(3);
    err.mockRestore();
    expect(mails).toHaveLength(2);
    expect(mails[0].subject).toBe("[DentVideo] ACİL: İş kuyruğa eklenemedi / URGENT: A job could not be queued");
    expect(mails[0].text).toContain("connect ECONNREFUSED 10.0.0.5:6379");
    expect(mails[0].text).toContain("(week-button)");
  });

  it("an email that cannot be sent for want of RESEND_API_KEY is logged and counted, not silent", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendEmail("a@x.example", { subject: "s", html: "h", text: "t" })).toBe(false);
    expect(err).toHaveBeenCalledWith("dentvideo email not sent: RESEND_API_KEY is not set");
    err.mockRestore();
    expect([...store.kv.keys()].some((k) => k.startsWith("dv:ops:count:email_fail:"))).toBe(true);
  });
});

describe("the library's delay note", () => {
  const item = (status: LibraryItem["status"], extra: Partial<LibraryItem> = {}): LibraryItem =>
    ({ id: Math.random().toString(36), kind: "generated", status, approval: "pending", title: "t", week_of: "2026-11-09", findings: [], videoUrl: "https://x/v.mp4", ...extra }) as LibraryItem;

  it("reads the worker's week state; nothing else gets through", async () => {
    expect(await readWeekDelay("c1", "2026-11-09")).toBeNull();
    await store.set(weekStateKey("c1", "2026-11-09"), "delayed", 1);
    expect(await readWeekDelay("c1", "2026-11-09")).toBe("delayed");
    await store.set(weekStateKey("c1", "2026-11-09"), "Error: 429 rate limit", 1);
    expect(await readWeekDelay("c1", "2026-11-09")).toBeNull();
    store.down = true;
    expect(await readWeekDelay("c1", "2026-11-09")).toBeNull();
  });

  it("shows only while nothing of this week is ready, and turns 'start' into 'being made'", () => {
    expect(delayNote("retrying", [])).toBe("retrying");
    expect(delayNote("delayed", [item("ready")])).toBeNull();
    expect(delayNote(null, [])).toBeNull();
    expect(nextAction({ locked: false, canStartWeek: true, thisWeek: [], delayed: true })).toBe("making");
    expect(nextAction({ locked: false, canStartWeek: true, thisWeek: [] })).toBe("start");
    expect(nextAction({ locked: true, canStartWeek: false, thisWeek: [], delayed: true })).toBe("locked");
  });

  it("technical failures never reach the clinic", () => {
    expect(clinicFindings(["could not produce: 429 Rate limit reached", "the video file is missing", "mentions a guarantee", "quality: the narration is silent"])).toEqual([
      "mentions a guarantee",
      "quality: the narration is silent",
    ]);
    expect(clinicFindings(null)).toEqual([]);
  });
});

describe("daily digest from rows", () => {
  const NOW = new Date("2026-11-09T05:30:00Z"); // 08:30 Istanbul
  const h = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3600_000).toISOString();
  const ev = (name: string, hoursAgo: number, clinic_id: string | null, props: Record<string, unknown> = {}): AdminEvent => ({ name, locale: "tr", props, clinic_id, created_at: h(hoursAgo) });
  const clinics = [
    { id: "c1", created_at: h(5), updated_at: h(4), plan: "active", plan_tier: "practice", profile: { name: "Gülüş Dental", country: "TR" } },
    { id: "c2", created_at: h(400), updated_at: h(300), plan: "active", plan_tier: "starter", profile: { name: "Praxis Weber", country: "DE" } },
    { id: "c3", created_at: h(900), updated_at: h(3), plan: "cancelled", plan_tier: "group", profile: { name: "Clínica Sol", country: "ES" } },
    { id: "c4", created_at: h(2), plan: "trial", profile: { name: "New", country: "TR" } },
  ];
  const events = [
    ev("signup_completed", 5, null),
    ev("signup_completed", 2, null),
    ev("signup_completed", 30, null), // yesterday's: not counted
    ev("checkout_opened", 4.5, "c1", { tier: "practice", interval: "month", founding: true }),
    ev("payment_succeeded", 4, "c1", { tier: "practice", interval: "month", first: true }),
    ev("payment_succeeded", 1, "c2", { tier: "starter", interval: "month", first: false }), // a renewal
    ev("week_ready", 3, "c2", { kind: "week", ready: 4, flagged: 1 }),
    ev("week_ready", 2, "c1", { kind: "recording", ready: 3, flagged: 0 }),
  ];

  it("counts sign-ups, new paying clinics, MRR and its delta, weeks, emails, alerts", () => {
    const d = buildDigest({
      now: NOW,
      clinics,
      events,
      eventsTable: true,
      alerts: [{ at: h(1), severity: "urgent", title: "A paying clinic's week failed", clinic: "Clínica Sol", key: "week_failed:c3:2026-11-09" }],
      emailsSent: 12,
      emailsFailed: 1,
      mrrPrevUsd: 49,
    });
    expect(d.signups).toBe(2);
    expect(d.newPaying).toEqual([{ name: "Gülüş Dental", tier: "practice", country: "TR" }]);
    // Founding Practice ($49) + Starter ($49).
    expect(d.mrrUsd).toBe(98);
    expect(d.paying).toBe(2);
    expect(d.churned).toEqual([{ name: "Clínica Sol", to: "cancelled" }]);
    expect(d.weeksDelivered).toBe(1);
    expect(d.videosReady).toBe(5);
    expect(d.weeksFailed).toBe(1);
    expect(d.period).toBe("Sun 8 Nov 08:30 → Mon 9 Nov 08:30 (Istanbul)");
    const m = renderDigest(d);
    expect(m.subject).toContain("MRR $98 (+$49)");
    expect(m.text).toContain("Emails sent: 12 (1 failed)");
  });

  it("a quiet day sends nothing", () => {
    const d = buildDigest({ now: NOW, clinics: [], events: [], eventsTable: true, alerts: [], emailsSent: 0, emailsFailed: 0, mrrPrevUsd: 0 });
    expect(digestHasNews(d)).toBe(false);
  });

  it("without the events table, sign-ups come from clinic rows", () => {
    const d = buildDigest({ now: NOW, clinics, events: [], eventsTable: false, alerts: [], emailsSent: 0, emailsFailed: 0, mrrPrevUsd: null });
    expect(d.signups).toBe(2);
  });
});
