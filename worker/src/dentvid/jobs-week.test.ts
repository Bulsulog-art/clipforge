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
vi.mock("../remotion/render-plan.js", () => ({ renderPlan: vi.fn() }));
vi.mock("../dental/questions.js", () => ({ patientSearches: vi.fn(async () => []) }));
const notifyReady = vi.fn(async () => true);
vi.mock("./notify.js", () => ({ notifyReady }));
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

function fakeDb() {
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.limit = async () => ({ data: [] });
    q.maybeSingle = async () => ({
      data: table === "dentvid_clinics" ? { id: CLINIC, plan: "active", plan_tier: "practice", profile: { name: "Gülüş Dental", country: "TR" } } : null,
      error: null,
    });
    q.single = async () => ({
      data: { id: CLINIC, owner_id: OWNER, profile: { name: "Gülüş Dental", country: "TR", language: "tr", services: ["implants", "whitening"] }, logo_path: null },
      error: null,
    });
    q.insert = async (rows: Record<string, unknown>[]) => {
      inserted.push(...rows);
      return { error: null };
    };
    return q;
  };
  const storage = {
    from: () => ({
      upload: async () => (uploadFailures-- > 0 ? { error: { message: "503 storage unavailable" } } : { error: null }),
    }),
  };
  return { from, storage };
}
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fakeDb() }));

process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, runDentvidWeek, _setStoreRetryMs, MIN_USABLE_VIDEOS } = await import("./jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { configureOps } = await import("./ops.js");
const { MemoryOpsStore, weekStateKey, _resetLocalOnce } = await import("./ops-alert.js");
const { TransientWeekError } = await import("./retry.js");
const { weekOf } = await import("./schedule.js");
const { UnrecoverableError } = await import("bullmq");

type Pkg = Record<string, unknown>;
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jobs-week-"));
const ready = (t: string): Pkg => {
  const videoPath = path.join(DIR, `${t}.mp4`);
  fs.writeFileSync(videoPath, "");
  return { status: "ready", approval: "pending", topic: { title: t }, plan: {}, copy: {}, checks: {}, videoPath };
};
const broken = (t: string): Pkg => ({ status: "rejected", topic: { title: t }, stage: "script", reasons: [], error: "429 Rate limit reached" });
const reviewed = (t: string): Pkg => ({ status: "rejected", topic: { title: t }, stage: "script", reasons: ["mentions a guarantee"] });

let ops: InstanceType<typeof MemoryOpsStore>;
let mails: { subject: string; text: string }[];

beforeEach(() => {
  vi.clearAllMocks();
  inserted.length = 0;
  uploadFailures = 0;
  _setStoreRetryMs(0);
  _resetLocalOnce();
  ops = new MemoryOpsStore();
  mails = [];
  configureOps({ store: ops, send: async (m) => (mails.push(m), true), env: {} });
  configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), alert: vi.fn(async () => true) });
});

const week = weekOf();

describe("a week that heals itself", () => {
  it("a full week: stored, the dentist notified, no alert, the delay note cleared", async () => {
    await ops.set(weekStateKey(CLINIC, week), "retrying", 1);
    produceWeek.mockResolvedValueOnce(["a", "b", "c", "d", "e"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { jobId: "w", attemptsMade: 1, attempts: 4 });
    expect(r).toMatchObject({ ready: 5, toppedUp: 0 });
    expect(inserted).toHaveLength(5);
    expect(notifyReady).toHaveBeenCalledWith(CLINIC, "week", { ready: 5, flagged: 0 });
    expect(await ops.get(weekStateKey(CLINIC, week))).toBeNull();
    expect(mails).toEqual([]);
  });

  it("a storage blip is retried: the video is kept", async () => {
    uploadFailures = 1;
    produceWeek.mockResolvedValueOnce(["a", "b", "c"].map(ready));
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 3 }, { attempts: 4 });
    expect(r.ready).toBe(3);
    expect(inserted.every((row) => row.video_path)).toBe(true);
  });

  it(`fewer than ${MIN_USABLE_VIDEOS} usable → topped up with extra topics, avoiding this week's titles`, async () => {
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

  it("the top-up respects the spend guard: refused → delivered thin, owner told once", async () => {
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.5 })), alert: vi.fn(async () => true) });
    produceWeek.mockResolvedValueOnce([ready("a"), reviewed("b"), reviewed("c")]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attempts: 4 });
    expect(produceWeek).toHaveBeenCalledTimes(1);
    expect(r.ready).toBe(1);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/Eksik hafta.*thin week.*Gülüş Dental/i);
    expect(mails[0].text).toContain(CLINIC);
  });

  it("nothing usable for technical reasons → nothing stored, transient error so BullMQ retries; library says 'retrying'", async () => {
    produceWeek.mockResolvedValue(["a", "b", "c", "d", "e"].map(broken));
    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5 }, { attemptsMade: 0, attempts: 4 })).rejects.toBeInstanceOf(TransientWeekError);
    expect(inserted).toEqual([]);
    expect(notifyReady).not.toHaveBeenCalled();
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
