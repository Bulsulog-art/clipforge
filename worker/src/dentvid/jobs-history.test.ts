import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLiman } from "./memory-liman.js";
import type { PastTopic } from "../dental/memory.js";

/**
 * The Monday week reads the clinic's past items with the dentist's side of
 * each one (decision, decline reason and words, posted tick) and the plan's
 * photos, and hands them to the planner as history. A database without the
 * posted tick (0012) still plans the week with the history it has.
 */

vi.mock("openai", () => ({ default: class {} }));
const produceWeek = vi.fn();
vi.mock("../dental/week.js", () => ({ produceWeek, produceVideo: vi.fn() }));
vi.mock("../dental/recording.js", () => ({ clipsFromRecording: vi.fn() }));
const prepareNarration = vi.fn();
vi.mock("../dental/narration-audio.js", () => ({ prepareNarration }));
const renderPlan = vi.fn();
vi.mock("../remotion/render-plan.js", () => ({ renderPlan }));
vi.mock("../dental/questions.js", () => ({ patientSearches: vi.fn(async () => []) }));
vi.mock("./notify.js", () => ({ notifyReady: vi.fn(async () => true), sendReadyAtCivilHour: vi.fn(async () => ({ sent: true })) }));
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

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const OTHER = "9a9a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const liman = memoryLiman();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => liman }));
process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, runDentvidWeek, _setStoreRetryMs, _setPreflight } = await import("./jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { configureOps } = await import("./ops.js");
const { MemoryOpsStore } = await import("./ops-alert.js");

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jobs-hist-"));
const BG = (n: string) => `/dentvideo/backgrounds/smile-${n}.jpg`;
const T = (title: string, service = "Whitening") => ({ title, pillar: "myth", question: `${title}?`, hook: `${title} hook`, service });

/** produceWeek as the real one: renders each ready topic, each plan with its photos; `rejected` topics fail review. */
function week(ready: string[], rejected: string[] = []) {
  produceWeek.mockImplementationOnce(async (deps: { render: (p: unknown, t: unknown) => Promise<string> }) => {
    const out: Record<string, unknown>[] = [];
    for (const [i, title] of ready.entries()) {
      const topic = T(title);
      const videoPath = await deps.render({ scenes: [], voiceover: { text: "One sentence.", voice: "nova" } }, topic);
      out.push({ status: "ready", approval: "pending", topic, plan: { title, backgrounds: [BG(`0${i + 1}`), "https://not-ours.example/x.jpg"] }, copy: {}, checks: {}, videoPath });
    }
    for (const title of rejected) out.push({ status: "rejected", topic: T(title), stage: "script", reasons: ["promises a result"] });
    return out;
  });
}
const historyOf = (call: number) => (produceWeek.mock.calls[call][2] as { history: PastTopic[] }).history;
const past = (title: string, week_of: string, extra: Record<string, unknown> = {}) => ({
  id: `past-${title}`,
  clinic_id: CLINIC,
  owner_id: OWNER,
  kind: "generated",
  status: "ready",
  approval: "pending",
  title,
  topic: T(title, extra.service as string | undefined),
  plan: { title, backgrounds: [BG("07")] },
  week_of,
  video_path: `${OWNER}/${title}.mp4`,
  ...extra,
});

beforeEach(() => {
  _setPreflight(async () => ({ ok: true }));
  vi.clearAllMocks();
  liman.tables.clear();
  liman.files.clear();
  liman.opts.missingTables = ["dentvid_topic_requests"];
  liman.opts.missingColumns = {};
  // Selects return only the columns they name, as the real database does: what reaches the planner is what the query asked for.
  liman.opts.project = true;
  liman.tables.set("dentvid_clinics", [{ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "starter", profile: { name: "Smile", country: "US", language: "en", services: ["Whitening", "Implants"] }, logo_path: null }]);
  liman.tables.set("dentvid_items", [
    past("Implants are not for us", "2026-11-02", { service: "Implants", approval: "rejected", approval_note: "[notUs] We refer implants out.\u0007 See https://example.com/why", updated_at: "2026-11-04T12:00:00Z" }),
    past("Whitening and coffee", "2026-10-26", { approval: "approved", posted_at: "2026-10-28T09:00:00Z", plan: { title: "Whitening and coffee", backgrounds: [BG("07")], footageIds: [500, 501] } }),
    past("Floss or water flosser", "2026-10-26", { approval: "approved", plan: null }),
    past("Undone decline", "2026-10-19", { approval: "pending", approval_note: "[wrong] kept after an undo" }),
    { ...past("Another clinic's video", "2026-11-02", { approval: "rejected", approval_note: "[wrong] other clinic" }), clinic_id: OTHER, owner_id: "someone-else" },
  ]);
  _setStoreRetryMs(0);
  configureOps({ store: new MemoryOpsStore(), send: async () => true, env: {} });
  configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), alert: vi.fn(async () => true) });
  prepareNarration.mockImplementation(async (plan: unknown) => ({ plan, voiceoverPath: "/tmp/v.wav", voiceSeconds: 5, pauses: [] }));
  renderPlan.mockImplementation(async () => {
    const out = path.join(DIR, `${Math.random()}.mp4`);
    fs.writeFileSync(out, "");
    return { outputPath: out };
  });
});

describe("the week job's history carries the dentist's decisions", () => {
  it("decision, reason tag, cleaned words, posted tick and photos reach the planner, for this clinic only", async () => {
    week(["a", "b", "c", "d", "e"]);
    await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2026-11-09" }, { attempts: 4 });
    const h = historyOf(0);
    expect(h.map((x) => x.title)).toEqual(["Undone decline", "Whitening and coffee", "Floss or water flosser", "Implants are not for us"]);
    const by = (t: string) => h.find((x) => x.title === t)!;
    expect(by("Implants are not for us")).toMatchObject({ service: "Implants", weekOf: "2026-11-02", decision: "rejected", decidedAt: "2026-11-04T12:00:00Z", reason: "notUs", note: "We refer implants out. See", backgrounds: [BG("07")] });
    expect(by("Implants are not for us").posted).toBeUndefined();
    expect(by("Whitening and coffee")).toMatchObject({ decision: "approved", posted: true, backgrounds: [BG("07")], footageIds: [500, 501] });
    // The stock clips come from the stored plan through plan->footageIds; a plan without them gives none.
    expect(by("Implants are not for us").footageIds).toBeUndefined();
    // A plan without photos, and a decision undone: nothing made up.
    expect(by("Floss or water flosser")).toEqual({ title: "Floss or water flosser", hook: "Floss or water flosser hook", service: "Whitening", pillar: "myth", question: "Floss or water flosser?", weekOf: "2026-10-26", decision: "approved" });
    expect(by("Undone decline").decision).toBeUndefined();
    expect(by("Undone decline").note).toBeUndefined();
    expect(JSON.stringify(h)).not.toMatch(/other clinic|https:|\u0007/);
    // The titles still go to the repeat filter, declined ones included.
    expect((produceWeek.mock.calls[0][2] as { avoidTitles: string[] }).avoidTitles).toContain("Implants are not for us");
  });

  it("the top-up's history adds this week's videos with their plan's photos", async () => {
    week(["a", "b", "c", "d"], ["Turned down"]);
    week(["e"]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2026-11-09" }, { attempts: 4 });
    expect(r.ready).toBe(5);
    expect(produceWeek).toHaveBeenCalledTimes(2);
    const topup = historyOf(1);
    const thisWeek = topup.filter((x) => x.weekOf === "2026-11-09");
    expect(thisWeek.map((x) => x.title)).toEqual(["a", "b", "c", "d"]);
    expect(thisWeek.map((x) => x.backgrounds)).toEqual([[BG("01")], [BG("02")], [BG("03")], [BG("04")]]);
    // Last week's decisions are still there.
    expect(topup.find((x) => x.title === "Implants are not for us")).toMatchObject({ decision: "rejected", reason: "notUs" });
  });

  it("a database without posted_at (0012) still learns from the dentist's decisions", async () => {
    liman.opts.missingColumns = { dentvid_items: ["posted_at"] };
    week(["a", "b", "c", "d", "e"]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2026-11-09" }, { attempts: 4 });
    expect(r.ready).toBe(5);
    const h = historyOf(0);
    expect(h.map((x) => x.title)).toEqual(["Undone decline", "Whitening and coffee", "Floss or water flosser", "Implants are not for us"]);
    // Only the posted tick is missing: decisions, reasons, words and photos still arrive.
    expect(h.find((x) => x.title === "Implants are not for us")).toMatchObject({ decision: "rejected", reason: "notUs", note: "We refer implants out. See", backgrounds: [BG("07")] });
    expect(h.find((x) => x.title === "Whitening and coffee")).toMatchObject({ decision: "approved", footageIds: [500, 501] });
    expect(h.some((x) => x.posted)).toBe(false);
    expect(JSON.stringify(h)).not.toMatch(/other clinic/);
  });

  it("if the decisions cannot be read either, the week is planned with the bare history", async () => {
    liman.opts.missingColumns = { dentvid_items: ["posted_at", "approval_note"] };
    week(["a", "b", "c", "d", "e"]);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2026-11-09" }, { attempts: 4 });
    expect(r.ready).toBe(5);
    const h = historyOf(0);
    expect(h.map((x) => x.title)).toEqual(["Undone decline", "Whitening and coffee", "Floss or water flosser", "Implants are not for us"]);
    // Read with the columns every database has: titles, hooks, services and weeks, no decisions.
    expect(h.find((x) => x.title === "Implants are not for us")).toEqual({ title: "Implants are not for us", hook: "Implants are not for us hook", service: "Implants", pillar: "myth", question: "Implants are not for us?", weekOf: "2026-11-02" });
    expect(h.some((x) => x.decision || x.posted || x.backgrounds || x.footageIds)).toBe(false);
    expect(JSON.stringify(h)).not.toMatch(/other clinic/);
  });
});
