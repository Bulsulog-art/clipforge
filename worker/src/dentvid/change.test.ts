import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLiman } from "./memory-liman.js";

/**
 * "Ask for a change" on one video (jobs.ts runDentvidChange): only that video
 * is re-made, through the same writer and reviewers, inside the spend guard,
 * for the clinic that owns it; the old video stays unless the new one passed.
 */

vi.mock("openai", () => ({ default: class {} }));
const produceVideo = vi.fn();
vi.mock("../dental/week.js", () => ({ produceVideo, produceWeek: vi.fn() }));
vi.mock("../dental/recording.js", () => ({ clipsFromRecording: vi.fn() }));
const prepareNarration = vi.fn();
vi.mock("../dental/narration-audio.js", () => ({ prepareNarration }));
const renderPlan = vi.fn();
vi.mock("../remotion/render-plan.js", () => ({ renderPlan }));
vi.mock("../dental/questions.js", () => ({ patientSearches: vi.fn(async () => []) }));
vi.mock("./notify.js", () => ({ notifyReady: vi.fn(async () => true), sendReadyAtCivilHour: vi.fn() }));
vi.mock("fluent-ffmpeg", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["seekInput", "frames", "size"]) chain[m] = () => chain;
  chain.on = (ev: string, cb: (e?: Error) => void) => {
    if (ev === "error") setTimeout(() => cb(new Error("no ffmpeg")), 0);
    return chain;
  };
  chain.save = () => chain;
  return { default: Object.assign(() => chain, { ffprobe: (_f: string, cb: (e: Error) => void) => cb(new Error("no ffprobe")) }) };
});

const A = { clinic: "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d", owner: "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e" };
const B = { clinic: "9a9a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d", owner: "2d2d4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e" };
const PROFILE = { name: "Sample Dental Practice", country: "US", language: "en", services: ["Whitening", "Implants"] };
const TOPIC = { title: "Whitening and sensitivity", pillar: "myth", question: "Does whitening hurt?", hook: "That twinge after whitening?", service: "Whitening" };

const liman = memoryLiman();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => liman }));
process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, runDentvidChange } = await import("./jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { configureOps } = await import("./ops.js");
const { MemoryOpsStore, _resetLocalOnce } = await import("./ops-alert.js");

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "change-"));
let mails: { subject: string; text: string }[];
let spendAlerts: string[];
let guardStore: InstanceType<typeof MemoryGuardStore>;

function seed() {
  liman.tables.clear();
  liman.files.clear();
  liman.tables.set("dentvid_clinics", [
    { id: A.clinic, owner_id: A.owner, plan: "active", plan_tier: "starter", profile: PROFILE, logo_path: null },
    { id: B.clinic, owner_id: B.owner, plan: "active", plan_tier: "starter", profile: PROFILE, logo_path: null },
  ]);
  liman.tables.set("dentvid_items", [
    { id: "item-a", clinic_id: A.clinic, owner_id: A.owner, kind: "generated", status: "ready", approval: "approved", posted_at: "2026-11-10T10:00:00Z", topic: TOPIC, plan: { scenes: [{ kind: "hook", text: "Old" }], voiceover: { text: "Old narration.", voice: "nova" } }, video_path: `${A.owner}/old.mp4`, thumb_path: `${A.owner}/old.jpg` },
    { id: "item-b", clinic_id: B.clinic, owner_id: B.owner, kind: "generated", status: "ready", approval: "pending", topic: TOPIC, plan: { scenes: [] }, video_path: `${B.owner}/b.mp4`, thumb_path: null },
  ]);
  liman.files.set(`${A.owner}/old.mp4`, { size: 1, created_at: "" });
  liman.files.set(`${A.owner}/old.jpg`, { size: 1, created_at: "" });
  liman.tables.set("dentvid_change_requests", []);
}

const request = (id: string, who: typeof A, itemId: string, note = "Make it shorter and calmer") =>
  liman.rows("dentvid_change_requests").push({ id, clinic_id: who.clinic, owner_id: who.owner, item_id: itemId, note, status: "queued" });
const req = (id: string) => liman.rows("dentvid_change_requests").find((r) => r.id === id)!;
const item = (id: string) => liman.rows("dentvid_items").find((r) => r.id === id)!;

/** produceVideo as the real one calls it: it renders through the job's render(), then returns the package. */
function makes(status: "ready" | "rejected", opts: { error?: string } = {}) {
  produceVideo.mockImplementationOnce(async (deps: { render: (plan: unknown, topic: unknown) => Promise<string> }, _profile, topic) => {
    if (status === "rejected") return { status: "rejected", topic, stage: "script", reasons: ["still promises a result"], ...(opts.error ? { error: opts.error } : {}) };
    const videoPath = await deps.render({ scenes: [], voiceover: { text: "New narration. Calmer now.", voice: "nova" } }, topic);
    return { status: "ready", approval: "pending", topic, plan: { scenes: [{ kind: "hook", text: "New" }] }, copy: { caption: "New caption", hashtags: [] }, checks: {}, videoPath };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  seed();
  _resetLocalOnce();
  mails = [];
  spendAlerts = [];
  configureOps({ store: new MemoryOpsStore(), send: async (m) => (mails.push(m), true), env: {} });
  guardStore = new MemoryGuardStore();
  configureSpend({ guard: new SpendGuard(guardStore, () => guardConfig({})), alert: async (subject) => (spendAlerts.push(subject), true) });
  prepareNarration.mockImplementation(async (plan: unknown) => ({ plan, voiceoverPath: "/tmp/v.wav", voiceSeconds: 6, pauses: [{ start: 2.9, end: 3.3 }] }));
  renderPlan.mockImplementation(async () => {
    const out = path.join(DIR, `${Math.random()}.mp4`);
    fs.writeFileSync(out, "");
    return { outputPath: out };
  });
});

describe("a change request re-makes only that one video", () => {
  it("with the clinic's note as guidance, then replaces the video, times new subtitles and asks for approval again", async () => {
    request("r1", A, "item-a");
    makes("ready");
    expect(await runDentvidChange({ requestId: "r1" })).toEqual({ status: "done" });
    const [, profile, topic, , , change] = produceVideo.mock.calls[0];
    expect(profile).toMatchObject({ name: "Sample Dental Practice" });
    expect(topic).toMatchObject({ title: TOPIC.title });
    expect(change).toEqual({ note: "Make it shorter and calmer", base: { scenes: [{ kind: "hook", text: "Old" }], voiceover: { text: "Old narration.", voice: "nova" } } });
    const row = item("item-a");
    expect(row.plan).toEqual({ scenes: [{ kind: "hook", text: "New" }] });
    expect(row.approval).toBe("pending");
    expect(row.posted_at).toBeNull();
    expect(row.video_path).not.toBe(`${A.owner}/old.mp4`);
    expect(String(row.video_path).startsWith(`${A.owner}/`)).toBe(true);
    expect((row.subtitles as { cues: unknown[] }).cues.length).toBeGreaterThan(0);
    // The old files are gone, the other clinic's video untouched.
    expect(liman.files.has(`${A.owner}/old.mp4`)).toBe(false);
    expect(item("item-b").video_path).toBe(`${B.owner}/b.mp4`);
    expect(req("r1")).toMatchObject({ status: "done", reason: null });
    expect(mails).toEqual([]);
  });

  it("clinic A's request can never touch clinic B's video", async () => {
    request("r2", A, "item-b");
    expect(await runDentvidChange({ requestId: "r2" })).toEqual({ status: "refused", reason: "not_possible" });
    expect(produceVideo).not.toHaveBeenCalled();
    expect(item("item-b").video_path).toBe(`${B.owner}/b.mp4`);
    expect(req("r2")).toMatchObject({ status: "refused", reason: "not_possible" });
    expect([...guardStore.values.values()].every((v) => v === 0)).toBe(true);
  });

  it("a clinic without an active plan gets nothing made and nothing spent", async () => {
    liman.rows("dentvid_clinics")[0].plan = "cancelled";
    request("r3", A, "item-a");
    expect(await runDentvidChange({ requestId: "r3" })).toEqual({ status: "refused", reason: "no_plan" });
    expect(produceVideo).not.toHaveBeenCalled();
    expect(guardStore.values.size).toBe(0);
  });

  it("at most three a week per clinic: the fourth is refused by the spend guard before any paid call, and the owner is told", async () => {
    for (const id of ["c1", "c2", "c3", "c4"]) {
      request(id, A, "item-a");
      if (id !== "c4") makes("ready");
      await runDentvidChange({ requestId: id });
    }
    expect(produceVideo).toHaveBeenCalledTimes(3);
    expect(req("c4")).toMatchObject({ status: "failed", reason: "busy" });
    expect(spendAlerts.some((s) => s.includes("clinic_weekly_changes"))).toBe(true);
    // Clinic B still has its own three.
    request("b1", B, "item-b");
    makes("ready");
    expect(await runDentvidChange({ requestId: "b1" })).toEqual({ status: "done" });
  });

  it("the App Review demo clinic (active by hand, never paid) gets no change made and nothing spent", async () => {
    liman.rows("dentvid_clinics")[0].review_demo = true;
    request("rd", A, "item-a");
    expect(await runDentvidChange({ requestId: "rd" })).toEqual({ status: "refused", reason: "no_plan" });
    expect(produceVideo).not.toHaveBeenCalled();
    expect(guardStore.values.size).toBe(0);
  });

  it("never past the clinic's daily $ cap, whatever the weekly count", async () => {
    configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => ({ ...guardConfig({}), clinicDailyUsd: 0.1 })), alert: async (s) => (spendAlerts.push(s), true) });
    request("r4", A, "item-a");
    expect(await runDentvidChange({ requestId: "r4" })).toEqual({ status: "failed", reason: "busy" });
    expect(produceVideo).not.toHaveBeenCalled();
  });

  it("a changed version the reviewers turn down leaves the old video exactly as it was", async () => {
    request("r5", A, "item-a");
    makes("rejected");
    expect(await runDentvidChange({ requestId: "r5" })).toEqual({ status: "refused", reason: "checks" });
    expect(item("item-a")).toMatchObject({ video_path: `${A.owner}/old.mp4`, approval: "approved" });
    expect(liman.files.has(`${A.owner}/old.mp4`)).toBe(true);
    expect(mails).toEqual([]);
  });

  it("a technical failure: old video kept, request failed, owner alerted once, not retried", async () => {
    request("r6", A, "item-a");
    makes("rejected", { error: "render timed out" });
    expect(await runDentvidChange({ requestId: "r6" })).toEqual({ status: "failed", reason: "technical" });
    expect(item("item-a").video_path).toBe(`${A.owner}/old.mp4`);
    expect(req("r6")).toMatchObject({ status: "failed", reason: "technical" });
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/change request could not be made/i);
  });

  it("a change that renders with no sound: old video and thumbnail kept, new files removed, request failed, owner alerted once", async () => {
    request("r6s", A, "item-a");
    const before = new Set(liman.files.keys());
    produceVideo.mockImplementationOnce(async (deps: { render: (plan: unknown, topic: unknown) => Promise<string> }, _profile, topic) => {
      const videoPath = await deps.render({ scenes: [], voiceover: { text: "New narration.", voice: "nova" } }, topic);
      return {
        status: "ready", approval: "pending", topic, plan: { scenes: [{ kind: "hook", text: "New" }] }, copy: { caption: "c", hashtags: [] }, checks: {}, videoPath,
        qa: { ok: false, issues: ["no audio track"], stats: { durationSec: 30, width: 1080, height: 1920, hasAudio: false, meanVolumeDb: null, longestSilenceSec: 0, blackSec: 0 } },
      };
    });
    expect(await runDentvidChange({ requestId: "r6s" })).toEqual({ status: "failed", reason: "technical" });
    expect(item("item-a")).toMatchObject({ status: "ready", approval: "approved", video_path: `${A.owner}/old.mp4`, thumb_path: `${A.owner}/old.jpg` });
    expect(liman.files.has(`${A.owner}/old.mp4`)).toBe(true);
    expect(liman.files.has(`${A.owner}/old.jpg`)).toBe(true);
    expect([...liman.files.keys()].filter((k) => !before.has(k))).toEqual([]);
    expect(req("r6s")).toMatchObject({ status: "failed", reason: "technical" });
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/change request could not be made/i);
  });

  it("is idempotent: a request that already ran is left alone", async () => {
    request("r7", A, "item-a");
    makes("ready");
    await runDentvidChange({ requestId: "r7" });
    expect(await runDentvidChange({ requestId: "r7" })).toEqual({ status: "skipped", reason: "already done" });
    expect(produceVideo).toHaveBeenCalledTimes(1);
  });

  it("duplicate delivery: the same request run twice at the same moment is made (and paid) once", async () => {
    request("d1", A, "item-a");
    makes("ready");
    makes("ready");
    const results = await Promise.all([runDentvidChange({ requestId: "d1" }), runDentvidChange({ requestId: "d1" })]);
    expect(produceVideo).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.status).sort()).toEqual(["done", "skipped"]);
    expect([...guardStore.values.entries()].find(([k]) => k.startsWith("dv:spend:ops:change:"))?.[1]).toBe(1);
  });

  it("five requests racing for one clinic: never more than the weekly three are made or reserved", async () => {
    for (const id of ["p1", "p2", "p3", "p4", "p5"]) {
      request(id, A, "item-a");
      makes("ready");
    }
    const results = await Promise.all(["p1", "p2", "p3", "p4", "p5"].map((id) => runDentvidChange({ requestId: id })));
    expect(produceVideo).toHaveBeenCalledTimes(3);
    expect(results.filter((r) => r.status === "failed" && r.reason === "busy")).toHaveLength(2);
    expect([...guardStore.values.entries()].find(([k]) => k.startsWith(`dv:spend:ops:change:${A.clinic}`))?.[1]).toBe(3);
  });

  it("without the subtitles column (0025 partly applied) the change is still stored", async () => {
    const missing = memoryLiman({}, { missingColumns: { dentvid_items: ["subtitles"] } });
    // Same tables, but a database that refuses the column.
    for (const [k, v] of liman.tables) missing.tables.set(k, v);
    const { updateItem } = await import("./jobs.js");
    const err = await updateItem(missing as never, "item-a", { title: "x", subtitles: { v: 1 } });
    expect(err).toBeNull();
    expect(item("item-a").title).toBe("x");
  });
});
