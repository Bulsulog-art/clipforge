import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The spend guard sits in front of every paid call in the dentvid jobs: when
 * a cap is reached (or generation is paused) the job must not construct an
 * OpenAI client, write a week, transcribe or synthesise speech.
 */

const openaiCtor = vi.fn();
vi.mock("openai", () => ({
  default: class {
    constructor() {
      openaiCtor();
    }
  },
}));
const produceWeek = vi.fn(async () => []);
vi.mock("../dental/week.js", () => ({ produceWeek }));
const clipsFromRecording = vi.fn(async () => []);
vi.mock("../dental/recording.js", () => ({ clipsFromRecording }));
const prepareVoiceover = vi.fn();
vi.mock("../remotion/voiceover.js", () => ({ prepareVoiceover }));
const renderPlan = vi.fn();
vi.mock("../remotion/render-plan.js", () => ({ renderPlan }));
vi.mock("./notify.js", () => ({ notifyReady: vi.fn(async () => true) }));

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const updates: unknown[] = [];
/** When set, reading the clinic fails the way supabase-js reports Liman being down. */
let clinicReadError: { message: string } | null = null;
let clinicTier: string | null = null;

/** Enough of supabase-js for the guard paths: an active clinic and one generated item. */
function fakeDb() {
  const from = (table: string) => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.limit = async () => ({ data: [] });
    q.maybeSingle = async () =>
      table === "dentvid_clinics" && clinicReadError ? { data: null, error: clinicReadError } : { data: table === "dentvid_clinics" ? { plan: "active", plan_tier: clinicTier } : null, error: null };
    q.single = async () =>
      table === "dentvid_items"
        ? { data: { id: "item-1", clinic_id: CLINIC, owner_id: OWNER, kind: "generated", plan: { scenes: [] }, video_path: null, thumb_path: null }, error: null }
        : { data: { id: CLINIC, owner_id: OWNER, profile: {}, logo_path: null }, error: null };
    q.update = (row: unknown) => {
      updates.push(row);
      return { eq: () => ({ then: (ok: () => void) => Promise.resolve().then(ok) }) };
    };
    return q;
  };
  return { from, storage: { from: () => ({}) } };
}
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fakeDb() }));

process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, runDentvidWeek, runDentvidRecording, runDentvidRestyle, SpendRefusedError } = await import("./jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { MemoryParkStore } = await import("./park.js");

beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  clinicReadError = null;
  clinicTier = null;
});

describe("dentvid jobs behind the spend guard", () => {
  it("cap reached → the week is parked, the owner alerted, and no OpenAI call is made", async () => {
    const store = new MemoryGuardStore();
    const park = new MemoryParkStore();
    const alert = vi.fn(async () => true);
    const guard = new SpendGuard(store, () => ({ ...guardConfig({}), dailyUsd: 0 }));
    configureSpend({ guard, park, alert });

    await expect(runDentvidWeek({ clinicId: CLINIC, count: 5 }, { jobId: `week:${CLINIC}:2026-11-09` })).rejects.toBeInstanceOf(SpendRefusedError);
    expect(openaiCtor).not.toHaveBeenCalled();
    expect(produceWeek).not.toHaveBeenCalled();
    expect([...park.m.keys()]).toEqual([`week:${CLINIC}:2026-11-09`]);
    expect(park.m.get(`week:${CLINIC}:2026-11-09`)?.reason).toBe("global_daily_usd");
    expect(alert).toHaveBeenCalledTimes(1);

    // A second refused job the same day: parked too, but no second email.
    await expect(runDentvidWeek({ clinicId: "c2" }, { jobId: "week:c2:2026-11-09" })).rejects.toBeInstanceOf(SpendRefusedError);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it("kill switch → a recording is never transcribed", async () => {
    const park = new MemoryParkStore();
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({ DENTVID_PAUSE_GENERATION: "1" })), park, alert: vi.fn(async () => true) });
    await expect(runDentvidRecording({ clinicId: CLINIC, sourcePath: `${OWNER}/recordings/1.mp4` }, { jobId: "rec:1" })).rejects.toBeInstanceOf(SpendRefusedError);
    expect(clipsFromRecording).not.toHaveBeenCalled();
    expect(openaiCtor).not.toHaveBeenCalled();
    expect(park.m.has("rec:1")).toBe(true);
  });

  it("counter store down → fail closed: nothing spent, the job errors for a later retry", async () => {
    const store = new MemoryGuardStore();
    store.down = true;
    configureSpend({ guard: new SpendGuard(store, () => guardConfig({})), park: null, alert: vi.fn(async () => true) });
    await expect(runDentvidWeek({ clinicId: CLINIC }, { jobId: "w" })).rejects.toThrow(/store_unavailable/);
    expect(produceWeek).not.toHaveBeenCalled();
  });

  it("restyle over the daily limit → refused, card marked failed, no TTS", async () => {
    const store = new MemoryGuardStore();
    configureSpend({ guard: new SpendGuard(store, () => ({ ...guardConfig({}), maxRestylesPerClinicDay: 0 })), alert: vi.fn(async () => true) });
    expect(await runDentvidRestyle({ itemId: "item-1" })).toEqual({ ok: false });
    expect(prepareVoiceover).not.toHaveBeenCalled();
    expect(renderPlan).not.toHaveBeenCalled();
    expect(updates).toContainEqual(expect.objectContaining({ restyle_status: "failed" }));
  });

  it("Liman down when the week starts → the job fails transiently (retried), it does not complete as skipped", async () => {
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), park: null, alert: vi.fn(async () => true) });
    clinicReadError = { message: "fetch failed" };
    const { classifyFailure } = await import("./retry.js");
    const err = await runDentvidWeek({ clinicId: CLINIC }, { jobId: "w", attemptsMade: 0, attempts: 4 }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(classifyFailure(err)).toBe("transient");
    expect(produceWeek).not.toHaveBeenCalled();
    await expect(runDentvidRecording({ clinicId: CLINIC, sourcePath: `${OWNER}/recordings/1.mp4` }, { jobId: "rec:2" })).rejects.toThrow(/could not be read/);
  });

  it("a recording for a Starter clinic (e.g. queued before a downgrade) is skipped before any spend", async () => {
    clinicTier = "starter";
    const park = new MemoryParkStore();
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), park, alert: vi.fn(async () => true) });
    expect(await runDentvidRecording({ clinicId: CLINIC, sourcePath: `${OWNER}/recordings/1.mp4` }, { jobId: "rec:2" })).toEqual({ clips: 0 });
    expect(clipsFromRecording).not.toHaveBeenCalled();
    expect(openaiCtor).not.toHaveBeenCalled();
  });
});
