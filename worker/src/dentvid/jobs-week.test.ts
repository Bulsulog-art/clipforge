import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A paying clinic's week heals itself before anyone is told: storage blips
 * are retried, thin weeks are topped up, a week with nothing usable for
 * technical reasons is retried by BullMQ (nothing half-made is stored), and
 * only when every attempt failed does the library say "delayed" and the
 * owner get one email. Everything external is a fake.
 */

vi.mock("openai", () => ({ default: class {} }));
const produceWeek = vi.fn();
vi.mock("../dental/week.js", () => ({ produceWeek }));
vi.mock("../dental/recording.js", () => ({ clipsFromRecording: vi.fn() }));
vi.mock("../remotion/voiceover.js", () => ({ prepareVoiceover: vi.fn() }));
const renderPlan = vi.fn();
vi.mock("../remotion/render-plan.js", () => ({ renderPlan }));
// The narration (TTS) behind each video's render() (jobs.ts): a test makes it fail for one video.
const prepareNarration = vi.fn();
vi.mock("../dental/narration-audio.js", () => ({ prepareNarration }));
vi.mock("../dental/questions.js", () => ({ patientSearches: vi.fn(async () => []) }));
const notifyReady = vi.fn(async () => true);
const sendReadyAtCivilHour = vi.fn(async () => ({ sent: true, at: new Date(), held: false }));
vi.mock("./notify.js", () => ({ notifyReady, sendReadyAtCivilHour }));
// No real ffmpeg: thumbnails just fail (they are optional).
vi.mock("fluent-ffmpeg", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["seekInput", "frames", "size"]) chain[m] = () => chain;
  chain.on = (ev: string, cb: (e?: Error) => void) => {
    if (ev === "error") setTimeout(() => cb(new Error("no ffmpeg")), 0);
    return chain;
  };
  chain.save = () => chain;
  const f = Object.assign(() => chain, { ffprobe: (_f: string, cb: (e: Error) => void) => cb(new Error("no ffprobe")) });
  return { default: f };
});

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const inserted: Record<string, unknown>[] = [];
let uploadFailures = 0;
/** What the clinic already has in dentvid_items (newest week first, as the query orders it). */
let pastItems: Record<string, unknown>[] = [];
const selects: { table: string; cols: string }[] = [];
/** Usable videos the week already has (the idempotency check at the start of a run). */
let usableAlready = 0;
let itemsCountError: { message: string } | null = null;
let insertFailures = 0;
let insertError = "connection terminated unexpectedly";
/** dentvid_clinics reads that still find the clinic; after that it is deleted (-1: never). */
let clinicReadsLeft = -1;
/** Extra dentvid_clinics columns for the paying() read (e.g. review_demo). */
let clinicExtra: Record<string, unknown> = {};
const removedKeys: string[] = [];
const orders: { table: string; col: string; ascending: boolean }[] = [];

function fakeDb() {
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    q.select = (cols?: string) => (selects.push({ table, cols: cols ?? "*" }), q);
    q.eq = () => q;
    // The week's usable-video head count (jobs.ts usableInWeek): awaited straight after .in().
    q.in = () => ({ then: (res: (v: unknown) => void) => res(itemsCountError ? { count: null, error: itemsCountError } : { count: usableAlready, error: null }) });
    q.order = (col: string, o?: { ascending?: boolean }) => (orders.push({ table, col, ascending: o?.ascending !== false }), q);
    q.limit = async () => ({ data: table === "dentvid_items" ? pastItems : [] });
    q.maybeSingle = async () => ({
      data: table === "dentvid_clinics" && clinicReadsLeft-- !== 0 ? { id: CLINIC, plan: "active", plan_tier: "practice", profile: { name: "Gülüş Dental", country: "TR" }, ...clinicExtra } : null,
      error: null,
    });
    q.single = async () => ({
      data: { id: CLINIC, owner_id: OWNER, profile: { name: "Gülüş Dental", country: "TR", language: "tr", services: ["implants", "whitening"] }, logo_path: null },
      error: null,
    });
    q.insert = async (rows: Record<string, unknown>[]) => {
      if (insertFailures-- > 0) return { error: { message: insertError } };
      inserted.push(...rows);
      return { error: null };
    };
    return q;
  };
  const storage = {
    from: () => ({
      upload: async () => (uploadFailures-- > 0 ? { error: { message: "503 storage unavailable" } } : { error: null }),
      remove: async (keys: string[]) => (removedKeys.push(...keys), { error: null }),
    }),
  };
  return { from, storage };
}
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fakeDb() }));

process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, runDentvidWeek, _setStoreRetryMs, SHORT_WEEK_ALERT_KEY, _setPreflight } = await import("./jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { configureOps } = await import("./ops.js");
const { MemoryOpsStore, weekStateKey, _resetLocalOnce } = await import("./ops-alert.js");
const { TransientWeekError } = await import("./retry.js");
const { weekOf } = await import("./schedule.js");
const { UnrecoverableError } = await import("bullmq");
const { judge } = await import("../steps/qa.js");

type Pkg = Record<string, unknown>;
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jobs-week-"));
/** A narrated 30-second render, measured as steps/qa.ts measures it (week.ts produceVideo). */
const STATS_OK = { durationSec: 30, width: 1080, height: 1920, hasAudio: true, meanVolumeDb: -18, longestSilenceSec: 0.6, blackSec: 0 };
const QA_OK = { ok: true, issues: [] as string[], stats: STATS_OK };
const ready = (t: string): Pkg => {
  const videoPath = path.join(DIR, `${t}.mp4`);
  fs.writeFileSync(videoPath, "");
  return { status: "ready", approval: "pending", topic: { title: t }, plan: {}, copy: {}, checks: {}, videoPath, qa: QA_OK };
};
const broken = (t: string): Pkg => ({ status: "rejected", topic: { title: t }, stage: "script", reasons: [], error: "429 Rate limit reached" });
const reviewed = (t: string): Pkg => ({ status: "rejected", topic: { title: t }, stage: "script", reasons: ["mentions a guarantee"] });

let ops: InstanceType<typeof MemoryOpsStore>;
let mails: { subject: string; text: string }[];

beforeEach(() => {
  // No network in tests: the providers are fine unless a test says otherwise.
  _setPreflight(async () => ({ ok: true }));
  vi.clearAllMocks();
  inserted.length = 0;
  uploadFailures = 0;
  usableAlready = 0;
  itemsCountError = null;
  insertFailures = 0;
  insertError = "connection terminated unexpectedly";
  clinicReadsLeft = -1;
  clinicExtra = {};
  removedKeys.length = 0;
  pastItems = [];
  selects.length = 0;
  orders.length = 0;
  _setStoreRetryMs(0);
  _resetLocalOnce();
  ops = new MemoryOpsStore();
  mails = [];
  configureOps({ store: ops, send: async (m) => (mails.push(m), true), env: {} });
  configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), alert: vi.fn(async () => true) });
});

const week = weekOf();

describe("the App Review demo clinic (0024 review_demo)", () => {
  it("gets no week, however the job was queued: no model call, nothing stored", async () => {
    clinicExtra = { review_demo: true };
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { jobId: "w", attemptsMade: 0, attempts: 4 });
    expect(r).toEqual({ ready: 0, flagged: 0, rejected: 0 });
    expect(produceWeek).not.toHaveBeenCalled();
    expect(inserted).toEqual([]);
  });

  it("an ordinary active clinic (review_demo false) still gets its week", async () => {
    clinicExtra = { review_demo: false };
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { jobId: "w", attemptsMade: 0, attempts: 4 });
    expect(r).toMatchObject({ ready: 5 });
  });
});

describe("a week that heals itself", () => {
  it("a full week: stored, the dentist notified, no alert, the delay note cleared", async () => {
    await ops.set(weekStateKey(CLINIC, week), "retrying", 1);
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { jobId: "w", attemptsMade: 1, attempts: 4 });
    expect(r).toMatchObject({ ready: 5, toppedUp: 0 });
    expect(inserted).toHaveLength(5);
    // Not a batch week: the dentist is told at once, in their own zone's terms (TR → Istanbul).
    expect(sendReadyAtCivilHour).toHaveBeenCalledWith({ clinicId: CLINIC, week, tz: "Europe/Istanbul", batch: false, counts: { ready: 5, flagged: 0 } });
    // Stamped with the week they are for.
    expect(inserted.every((row) => row.week_of === week)).toBe(true);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBeNull();
    expect(mails).toEqual([]);
  });

  it("a batch week made on Saturday is stamped with the coming Monday and its email is held for the clinic's morning", async () => {
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2030-01-07", batch: true }, { attempts: 4 });
    expect(inserted.map((row) => row.week_of)).toEqual(Array(5).fill("2030-01-07"));
    expect(sendReadyAtCivilHour).toHaveBeenCalledWith(expect.objectContaining({ week: "2030-01-07", batch: true, tz: "Europe/Istanbul" }));
  });

  it("a job without a week (queued before the field existed) means the week it runs in", async () => {
    produceWeek.mockResolvedValueOnce(["a", "b", "c"].map(ready));
    await runDentvidWeek({ clinicId: CLINIC, count: 3, week: "not-a-week" }, { attempts: 4 });
    expect(inserted.every((row) => row.week_of === week)).toBe(true);
  });

  it("videos are stamped with the week in the job data, not the day the job runs", async () => {
    produceWeek.mockResolvedValueOnce(["a", "b", "c"].map(ready));
    await runDentvidWeek({ clinicId: CLINIC, count: 3, week: "2026-11-02" }, { attempts: 4 });
    expect(inserted.map((r) => r.week_of)).toEqual(["2026-11-02", "2026-11-02", "2026-11-02"]);
    // An old job without a week (or a malformed one) falls back to the current week.
    inserted.length = 0;
    produceWeek.mockResolvedValueOnce(["d", "e", "f"].map(ready));
    await runDentvidWeek({ clinicId: CLINIC, count: 3, week: "next monday" }, { attempts: 4 });
    expect(inserted.every((r) => r.week_of === week)).toBe(true);
  });

  it("a storage blip is retried: the video is kept", async () => {
    uploadFailures = 1;
    produceWeek.mockResolvedValueOnce(["a", "b", "c"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 3 }, { attempts: 4 });
    expect(r.ready).toBe(3);
    expect(inserted.every((row) => row.video_path)).toBe(true);
  });

  it(`fewer than three usable → topped up with extra topics, avoiding this week's titles`, async () => {
    produceWeek.mockResolvedValueOnce([ready("a"), broken("b"), broken("c"), reviewed("d"), broken("e")]).mockResolvedValueOnce([ready("f"), ready("g"), ready("h"), ready("i")]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(produceWeek).toHaveBeenCalledTimes(2);
    const [, , opts] = produceWeek.mock.calls[1] as [unknown, unknown, { count: number; avoidTitles: string[] }];
    expect(opts.count).toBe(4);
    expect(opts.avoidTitles).toEqual(expect.arrayContaining(["a", "b", "c", "d", "e"]));
    expect(r).toMatchObject({ ready: 5, toppedUp: 4 });
    // Technical failures are kept for the owner, never as text the clinic reads.
    const lost = inserted.filter((row) => row.status === "rejected" && row.error);
    expect(lost).toHaveLength(3);
    for (const row of lost) expect(row.findings).toEqual([]);
    expect(mails).toEqual([]);
  });

  it("a week one short of the promised five (a topic the reviewers turned down) is topped up to five, no owner alert", async () => {
    produceWeek.mockResolvedValueOnce([ready("a"), ready("b"), ready("c"), ready("d"), reviewed("e")]).mockResolvedValueOnce([ready("f")]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(produceWeek).toHaveBeenCalledTimes(2);
    const [, , opts] = produceWeek.mock.calls[1] as [unknown, unknown, { count: number; avoidTitles: string[] }];
    expect(opts.count).toBe(1);
    expect(opts.avoidTitles).toEqual(expect.arrayContaining(["a", "b", "c", "d", "e"]));
    expect(r).toMatchObject({ ready: 5, rejected: 1, toppedUp: 1 });
    // The turned-down topic is kept (with a code, not shown raw to the clinic).
    expect(inserted.find((row) => row.title === "e")?.findings).toEqual(["[dv:skipped] mentions a guarantee"]);
    expect(mails).toEqual([]);
  });

  it("a short week whose top-up the spend guard refuses is delivered as it is, and the owner gets one urgent short-week alert with every missing item's reason", async () => {
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.5 })), alert: vi.fn(async () => true) });
    produceWeek.mockResolvedValueOnce([ready("a"), ready("b"), ready("c"), ready("d"), reviewed("e")]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    // Delivered as it is: no automatic top-up beyond the one refused round.
    expect(produceWeek).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ ready: 4, toppedUp: 0 });
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/Eksik hafta.*short week.*Gülüş Dental/i);
    expect(mails[0].subject).toMatch(/ACİL|URGENT|🔴/i);
    expect(mails[0].text).toContain(CLINIC);
    expect(mails[0].text).toContain(week);
    expect(mails[0].text).toMatch(/4 of 5/);
    expect(mails[0].text).toContain("e: mentions a guarantee");
    expect(mails[0].text).toMatch(/spend guard refused the top-up/);
    expect(await ops.get(SHORT_WEEK_ALERT_KEY(CLINIC, week))).not.toBeNull();
  });

  it("the short-week alert goes out once per clinic and week, also on a later day; a failed send does not use it up", async () => {
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.5 })), alert: vi.fn(async () => true) });
    // First run: the mail provider fails, so the claim is given back.
    configureOps({ store: ops, send: async () => false, env: {} });
    produceWeek.mockResolvedValueOnce([ready("a"), ready("b"), ready("c"), reviewed("d"), reviewed("e")]);
    await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(await ops.get(SHORT_WEEK_ALERT_KEY(CLINIC, week))).toBeNull();
    // A later run (the owner's requeue, another day) still short: delivered now…
    configureOps({ store: ops, send: async (m) => (mails.push(m), true), env: {}, now: () => new Date(Date.now() + 86_400_000) });
    _resetLocalOnce();
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.5 })), alert: vi.fn(async () => true) });
    usableAlready = 3;
    produceWeek.mockResolvedValueOnce([reviewed("f")]);
    await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toMatch(/3 of 5/);
    // …and never again for that week, even two days later.
    configureOps({ store: ops, send: async (m) => (mails.push(m), true), env: {}, now: () => new Date(Date.now() + 2 * 86_400_000) });
    _resetLocalOnce();
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.5 })), alert: vi.fn(async () => true) });
    produceWeek.mockResolvedValueOnce([reviewed("g")]);
    await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(mails).toHaveLength(1);
  });

  it("the clinic's history (title, topic, week) reaches the strategist, oldest first, not just past titles", async () => {
    pastItems = [
      { title: "Diş eti kanaması", topic: { title: "Diş eti kanaması", hook: "Fırçalarken kanıyor mu?", service: "Diş eti tedavisi", pillar: "myth", question: "Kanama normal mi?" }, week_of: "2026-11-09", status: "ready" },
      { title: "Reddedilen konu", topic: { title: "Reddedilen konu", hook: "x", service: "İmplant" }, week_of: "2026-11-09", status: "rejected" },
      { title: "İmplant ömrü", topic: { title: "İmplant ömrü", hook: "İmplant ömür boyu mu?", service: "İmplant" }, week_of: "2026-10-26", status: "flagged" },
    ];
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(selects).toContainEqual({ table: "dentvid_items", cols: expect.stringMatching(/title.*topic.*week_of/) });
    expect(orders).toContainEqual({ table: "dentvid_items", col: "week_of", ascending: false });
    const [, , opts] = produceWeek.mock.calls[0] as [unknown, unknown, { avoidTitles: string[]; history: { title: string; hook?: string; service?: string; weekOf?: string }[] }];
    // Every past title still feeds the repeat filter, rejected ones included.
    expect(opts.avoidTitles).toEqual(["Diş eti kanaması", "Reddedilen konu", "İmplant ömrü"]);
    // The memory gets hooks, services and weeks of what the clinic actually received, oldest first.
    expect(opts.history).toEqual([
      { title: "İmplant ömrü", hook: "İmplant ömür boyu mu?", service: "İmplant", weekOf: "2026-10-26" },
      { title: "Diş eti kanaması", hook: "Fırçalarken kanıyor mu?", service: "Diş eti tedavisi", pillar: "myth", question: "Kanama normal mi?", weekOf: "2026-11-09" },
    ]);
  });

  it("the top-up's history includes this week's usable videos", async () => {
    produceWeek
      .mockResolvedValueOnce([{ ...ready("a"), topic: { title: "a", hook: "Hook A?", service: "implants" } }, broken("b"), broken("c")])
      .mockResolvedValueOnce([ready("f"), ready("g")]);
    await runDentvidWeek({ clinicId: CLINIC, count: 3 }, { attempts: 4 });
    const [, , opts] = produceWeek.mock.calls[1] as [unknown, unknown, { history: { title: string; hook?: string; weekOf?: string }[] }];
    expect(opts.history).toEqual([{ title: "a", hook: "Hook A?", service: "implants", weekOf: week }]);
  });

  it("the top-up respects the spend guard: refused → delivered thin, owner told once", async () => {
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.5 })), alert: vi.fn(async () => true) });
    produceWeek.mockResolvedValueOnce([ready("a"), reviewed("b"), reviewed("c")]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(produceWeek).toHaveBeenCalledTimes(1);
    expect(r.ready).toBe(1);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/Eksik hafta.*short week.*Gülüş Dental/i);
    expect(mails[0].text).toContain(CLINIC);
  });

  it("nothing usable for technical reasons → nothing stored, transient error so BullMQ retries; library says 'retrying'", async () => {
    produceWeek.mockResolvedValue(["a", "b", "c", "d", "e"].map(broken));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(TransientWeekError);
    expect(inserted).toEqual([]);
    expect(sendReadyAtCivilHour).not.toHaveBeenCalled();
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("retrying");
    expect(mails).toEqual([]);
  });

  it("a transient API error mid-week → retried silently while attempts remain", async () => {
    produceWeek.mockRejectedValueOnce(Object.assign(new Error("Rate limit reached for requests"), { status: 429 }));
    await expect(runDentvidWeek({ clinicId: CLINIC }, { attemptsMade: 2, attempts: 4 })).rejects.toThrow(/Rate limit/);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("retrying");
    expect(mails).toEqual([]);
  });

  it("the last attempt fails → library says 'delayed', the owner gets ONE email with clinic, what was done and what to do", async () => {
    produceWeek.mockRejectedValue(new Error("render timed out after 900s"));
    await expect(runDentvidWeek({ clinicId: CLINIC }, { attemptsMade: 3, attempts: 4 })).rejects.toThrow(/timed out/);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("delayed");
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/ACİL.*URGENT.*Gülüş Dental/);
    expect(mails[0].text).toMatch(/after 4 attempts/);
    expect(mails[0].text).toContain(CLINIC);
    expect(mails[0].text).toMatch(/What you should do/);
    // The same week failing again the same day: no second email.
    await expect(runDentvidWeek({ clinicId: CLINIC }, { attemptsMade: 3, attempts: 4 })).rejects.toThrow();
    expect(mails).toHaveLength(1);
  });

  it("a permanent error is not retried (UnrecoverableError) and the owner is told at once", async () => {
    produceWeek.mockRejectedValue(Object.assign(new Error("Incorrect API key provided"), { status: 401 }));
    await expect(runDentvidWeek({ clinicId: CLINIC }, { attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("delayed");
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toMatch(/permanent error/);
  });

  it("the AI account is out of credit (OpenAI 429 insufficient_quota) → not retried, 'delayed', the week budget given back", async () => {
    const store = new MemoryGuardStore();
    configureSpend({ guard: new SpendGuard(store, () => guardConfig({})), alert: vi.fn(async () => true) });
    const quota = Object.assign(new Error("429 You exceeded your current quota, please check your plan and billing details."), {
      status: 429,
      code: "insufficient_quota",
      type: "insufficient_quota",
    });
    produceWeek.mockRejectedValue(quota);
    // First attempt of four: still not retried — BullMQ would only hit the same closed door.
    await expect(runDentvidWeek({ clinicId: CLINIC }, { attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("delayed");
    expect(inserted).toEqual([]);
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toMatch(/permanent error/);
    expect(mails[0].text).toMatch(/exceeded your current quota/);
    // Nothing was spent: every counter is back at zero, so the clinic's retry is not refused for it.
    expect([...store.values.values()].every((v) => v === 0)).toBe(true);
    // Several retries during the outage never use up the clinic's weekly runs.
    for (let i = 0; i < 8; i++) await runDentvidWeek({ clinicId: CLINIC }, { attemptsMade: 0, attempts: 4 }).catch(() => {});
    expect(produceWeek).toHaveBeenCalledTimes(9);
  });

  it("every video refused by the provider mid-week → not retried in minutes (permanent), nothing stored", async () => {
    produceWeek.mockResolvedValue(["a", "b", "c"].map((t) => ({ ...broken(t), error: "429 You exceeded your current quota, please check your plan and billing details." })));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 3 }, { attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(UnrecoverableError);
    expect(inserted).toEqual([]);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("delayed");
  });

  it("render failures past the hourly threshold raise one spike alert", async () => {
    configureOps({ store: ops, send: async (m) => (mails.push(m), true), env: { DENTVID_ALERT_RENDER_FAIL_PER_HOUR: "3" } });
    // Each produceWeek call reports its video errors through onVideoError.
    produceWeek.mockImplementation(async (deps: { onVideoError?: (e: Error) => Promise<void> | void }) => {
      for (let i = 0; i < 4; i++) await deps.onVideoError?.(new Error("render crashed: Chromium OOM"));
      return ["a", "b", "c"].map(ready);
    });
    await runDentvidWeek({ clinicId: CLINIC, count: 3 }, { attempts: 4 });
    const spikes = mails.filter((m) => /Render failures spiking/.test(m.subject));
    expect(spikes).toHaveLength(1);
    expect(spikes[0].text).toMatch(/Chromium OOM/);
  });
});

describe("a voice that could not be made never reaches the dentist as a silent video", () => {
  // Before: when the narration (TTS) failed, render() went on without a voice, QA measured "no audio
  // track", the row was stored as "flagged" and counted as one of the week's five: no top-up, no
  // retry, no alert, and the dentist read only "the sound may be quiet in places".
  const QA_EXPECT = { width: 1080, height: 1920, minSec: 8, maxSec: 90, expectAudio: true };
  /** Rendered files and whether their render had a voice. */
  let voiced: Map<string, boolean>;
  let ttsCalls: number;
  /** TTS calls (1-based) that fail, as when ElevenLabs and the OpenAI fallback both refuse. */
  let ttsFails: Set<number>;

  beforeEach(() => {
    voiced = new Map();
    ttsCalls = 0;
    ttsFails = new Set();
    prepareNarration.mockImplementation(async (plan: unknown, dir: string) => {
      ttsCalls++;
      if (ttsFails.has(ttsCalls) || ttsFails.has(0)) throw new Error("tts failed: ElevenLabs 503, OpenAI 500");
      const voiceoverPath = path.join(dir, "voice.mp3");
      fs.writeFileSync(voiceoverPath, "");
      return { plan, voiceoverPath };
    });
    renderPlan.mockImplementation(async (o: { outputPath: string; voiceoverSrc?: string }) => {
      fs.writeFileSync(o.outputPath, "");
      voiced.set(o.outputPath, !!o.voiceoverSrc);
      return { outputPath: o.outputPath };
    });
  });

  /** produceWeek as the real one: each topic rendered through the job's render(), then measured. */
  const renderedWeek = (titles: string[]) => async (deps: { render: (p: unknown, t: unknown) => Promise<string> }) => {
    const out: Pkg[] = [];
    for (const title of titles) {
      const topic = { title };
      const videoPath = await deps.render({ scenes: [], voiceover: { text: "Eins. Zwei.", voice: "nova" } }, topic);
      const has = voiced.get(videoPath) === true;
      const stats = has ? STATS_OK : { ...STATS_OK, hasAudio: false, meanVolumeDb: null, longestSilenceSec: 0 };
      const issues = judge(stats, QA_EXPECT);
      out.push({ status: "ready", approval: "pending", topic, plan: {}, copy: {}, checks: {}, videoPath, qa: { ok: issues.length === 0, issues, stats } });
    }
    return out;
  };

  it("TTS failing for one video: that video is kept for the owner but never delivered, and the week is topped up to five", async () => {
    ttsFails = new Set([3]);
    produceWeek.mockImplementationOnce(renderedWeek(["a", "b", "c", "d", "e"])).mockImplementationOnce(renderedWeek(["f"]));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attemptsMade: 0, attempts: 4 });

    // The silent render happened (render() went on without a voice)…
    expect(renderPlan.mock.calls.filter(([o]) => !(o as { voiceoverSrc?: string }).voiceoverSrc)).toHaveLength(1);
    // …and the top-up asked for exactly the one missing video.
    expect(produceWeek).toHaveBeenCalledTimes(2);
    expect((produceWeek.mock.calls[1][2] as { count: number }).count).toBe(1);
    expect(r).toMatchObject({ ready: 5, flagged: 0, rejected: 1, toppedUp: 1 });

    const silent = inserted.find((row) => row.title === "c")!;
    expect(silent.status).toBe("rejected");
    expect(silent.error).toBe("silent render: no audio track");
    // Its file is tracked on the row (no orphan) for the owner to listen to; the clinic gets no sound reason.
    expect(String(silent.video_path)).toMatch(new RegExp(`^${OWNER}/`));
    expect(silent.findings).toEqual([]);
    // Every video the dentist can review has a voice.
    const usable = inserted.filter((row) => row.status === "ready" || row.status === "flagged");
    expect(usable.map((row) => row.title)).toEqual(["a", "b", "d", "e", "f"]);
    expect(usable.every((row) => (row.qa as { stats: { hasAudio: boolean } }).stats.hasAudio)).toBe(true);
    // The email counts what the dentist will actually find; no short-week alert (five were delivered).
    expect(sendReadyAtCivilHour).toHaveBeenCalledWith(expect.objectContaining({ counts: { ready: 5, flagged: 0 } }));
    expect(mails).toEqual([]);
  });

  it("the top-up refused by the spend guard: the silent video still does not count, and the owner hears of a short week naming it", async () => {
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.5 })), alert: vi.fn(async () => true) });
    ttsFails = new Set([2]);
    produceWeek.mockImplementationOnce(renderedWeek(["a", "b", "c", "d", "e"]));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attemptsMade: 0, attempts: 4 });
    expect(r).toMatchObject({ ready: 4, rejected: 1, toppedUp: 0 });
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toMatch(/4 of 5/);
    expect(mails[0].text).toContain("b: silent render: no audio track");
  });

  it("TTS down for every video: nothing silent is stored, the week fails as transient and BullMQ retries it", async () => {
    ttsFails = new Set([0]);
    produceWeek.mockImplementation(renderedWeek(["a", "b", "c", "d", "e"]));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(TransientWeekError);
    expect(inserted).toEqual([]);
    expect(sendReadyAtCivilHour).not.toHaveBeenCalled();
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("retrying");
    produceWeek.mockReset();
  });

  it("the last attempt with TTS still down: 'delayed' in the library and the owner is told, never a silent week", async () => {
    ttsFails = new Set([0]);
    produceWeek.mockImplementation(renderedWeek(["a", "b", "c"]));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 3, week }, { jobId: "w", attemptsMade: 3, attempts: 4 })).rejects.toThrow(/zero usable videos.*silent render/);
    expect(inserted).toEqual([]);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("delayed");
    expect(mails.some((m) => /Haftalık videolar|week failed/i.test(m.subject))).toBe(true);
    produceWeek.mockReset();
  });
});

describe("a video whose QA check could not run is never 'ready'", () => {
  it("delivered as flagged with the 'qa unavailable' reason, counted as flagged in the dentist's email", async () => {
    // week.ts: qa = await inspectVideo(...).catch(() => undefined) when ffprobe itself fails.
    produceWeek.mockResolvedValueOnce([ready("a"), ready("b"), { ...ready("c"), qa: undefined }, ready("d"), ready("e")]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attemptsMade: 0, attempts: 4 });
    expect(r).toMatchObject({ ready: 4, flagged: 1, rejected: 0, toppedUp: 0 });
    const c = inserted.find((row) => row.title === "c")!;
    expect(c.status).toBe("flagged");
    expect(c.findings).toEqual(["[dv:unchecked] qa unavailable"]);
    expect(c.video_path).toBeTruthy();
    expect(sendReadyAtCivilHour).toHaveBeenCalledWith(expect.objectContaining({ counts: { ready: 4, flagged: 1 } }));
  });
});

describe("reliability: a week is made once, and a database blip does not throw it away (docs/RELIABILITY.md F7, F8)", () => {
  // Before: nothing checked whether the week already existed. A job re-run after the worker died
  // between storing the videos and finishing (BullMQ "stalled"), or a re-queue racing a slow run,
  // made — and paid for — a second full week.
  it("a re-run of a week that is already delivered makes nothing and spends nothing", async () => {
    usableAlready = 5;
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attempts: 4 });
    expect(r).toMatchObject({ ready: 0, already: 5 });
    expect(produceWeek).not.toHaveBeenCalled();
    expect(inserted).toHaveLength(0);
    expect(sendReadyAtCivilHour).not.toHaveBeenCalled();
  });

  it("a re-run of a partly stored week makes only the missing videos", async () => {
    usableAlready = 3;
    produceWeek.mockResolvedValueOnce(["d", "e"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attempts: 4 });
    expect(produceWeek.mock.calls[0][2]).toMatchObject({ count: 2 });
    expect(r).toMatchObject({ ready: 2 });
  });

  it("a top-up run (count = the missing ones) is unchanged", async () => {
    usableAlready = 3;
    produceWeek.mockResolvedValueOnce(["d", "e"].map(ready));
    await runDentvidWeek({ clinicId: CLINIC, count: 2, week }, { jobId: "w", attempts: 4 });
    expect(produceWeek.mock.calls[0][2]).toMatchObject({ count: 2 });
  });

  it("the week's items cannot be read: fails as transient (retried), never guesses", async () => {
    itemsCountError = { message: "503 service unavailable" };
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attemptsMade: 0, attempts: 4 })).rejects.toThrow(/could not be read/);
    expect(produceWeek).not.toHaveBeenCalled();
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("retrying");
  });

  // Before: one failed insert at the very end failed the job; BullMQ's retry re-made the whole week.
  it("an insert that fails twice is retried and the week is stored once", async () => {
    insertFailures = 2;
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attempts: 4 });
    expect(r).toMatchObject({ ready: 5 });
    expect(inserted).toHaveLength(5);
    expect(produceWeek).toHaveBeenCalledTimes(1);
  });

  it("an insert that never works fails the job as transient after its retries (BullMQ retries; the owner hears on the last attempt)", async () => {
    insertFailures = 99;
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5, week }, { jobId: "w", attemptsMade: 3, attempts: 4 })).rejects.toThrow(/insert items/);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("delayed");
    expect(mails.some((m) => /week failed|Haftalık videolar/i.test(m.subject))).toBe(true);
  });
});

describe("reliability: clinic deleted while its week is being made (docs/RELIABILITY.md F10)", () => {
  // Before: the insert hit the foreign key, was treated as a passing error and retried; the
  // videos already uploaded stayed in storage after the account (and its files) had been deleted.
  it("no retry of the foreign-key error, the uploaded files are removed, nothing alerts", async () => {
    clinicReadsLeft = 1; // paying() sees it; by the insert it is gone
    insertFailures = 1;
    insertError = 'insert or update on table "dentvid_items" violates foreign key constraint "dentvid_items_clinic_id_fkey"';
    produceWeek.mockResolvedValueOnce(["a", "b"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 2, week }, { jobId: "w", attempts: 4 });
    expect(r).toMatchObject({ ready: 0 });
    expect(removedKeys.length).toBeGreaterThanOrEqual(2);
    expect(removedKeys.every((k) => k.startsWith(`${OWNER}/`))).toBe(true);
    expect(mails).toEqual([]);
  });
});

describe("provider pre-flight before a week spends", () => {
  it("a refusing provider: nothing produced, nothing reserved, 'taking longer' in the library, one urgent alert naming the provider, retried (transient)", async () => {
    _setPreflight(async () => ({ ok: false, provider: "OpenAI", reason: "HTTP 429 insufficient_quota" }));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(TransientWeekError);
    expect(produceWeek).not.toHaveBeenCalled();
    expect(inserted).toEqual([]);
    expect(await ops.get(weekStateKey(CLINIC, week))).toBe("retrying");
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/OpenAI.*(ACİL|URGENT)|(ACİL|URGENT).*OpenAI/);
    expect(mails[0].text).toContain("insufficient_quota");
    expect(mails[0].text).toContain(CLINIC);
  });

  it("a refusal on a real call is remembered, so the next clinic's week stops before spending; a good week clears it", async () => {
    const { preflight, PROVIDER_DOWN_KEY } = await import("./provider-health.js");
    _setPreflight(() => preflight(ops, { OPENAI_API_KEY: "x" }, (async () => new Response("{}", { status: 200 })) as never));
    produceWeek.mockRejectedValueOnce(Object.assign(new Error("429 You exceeded your current quota"), { status: 429, code: "insufficient_quota" }));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attemptsMade: 0, attempts: 4 })).rejects.toThrow();
    expect(await ops.get(PROVIDER_DOWN_KEY("OpenAI"))).not.toBeNull();
    produceWeek.mockClear();
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(TransientWeekError);
    expect(produceWeek).not.toHaveBeenCalled();
    // The owner topped up; a week succeeds and the memory is cleared.
    await ops.del(PROVIDER_DOWN_KEY("OpenAI"));
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    await ops.set(PROVIDER_DOWN_KEY("OpenAI"), "stale", 60);
    _setPreflight(async () => ({ ok: true }));
    await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(await ops.get(PROVIDER_DOWN_KEY("OpenAI"))).toBeNull();
  });
});
