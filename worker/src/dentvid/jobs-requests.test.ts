import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLiman } from "./memory-liman.js";
import { requestOutcomes, saveOutcomes, MAX_REQUESTS_PER_WEEK } from "./topic-requests.js";
import type { ItemRow } from "./rows.js";

/**
 * The Monday week and a clinic's suggested topics: the oldest pending ones
 * go to the strategist first, and each ends as used (linked to its video),
 * refused with a reason, or still pending. Each stored video carries its
 * subtitle cues, timed from its own narration.
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

const { configureSpend, runDentvidWeek, _setStoreRetryMs } = await import("./jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { configureOps } = await import("./ops.js");
const { MemoryOpsStore } = await import("./ops-alert.js");

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "jobs-req-"));
const T = (title: string, extra: Record<string, unknown> = {}) => ({ title, pillar: "myth", question: "q?", hook: "h", service: "Whitening", ...extra });

/** produceWeek as the real one: renders each ready topic through the job's render(), reports refusals. */
function week(spec: { topics: Record<string, unknown>[]; rejected?: Record<string, unknown>[]; refused?: { request: number; reason: string }[] }) {
  produceWeek.mockImplementationOnce(async (deps: { render: (p: unknown, t: unknown) => Promise<string> }, _profile, opts: { onRefused?: (r: unknown) => void }) => {
    opts.onRefused?.(spec.refused ?? []);
    const out: Record<string, unknown>[] = [];
    for (const topic of spec.topics) {
      const videoPath = await deps.render({ scenes: [], voiceover: { text: "One sentence. Another one.", voice: "nova" } }, topic);
      out.push({ status: "ready", approval: "pending", topic, plan: {}, copy: {}, checks: {}, videoPath });
    }
    for (const topic of spec.rejected ?? []) out.push({ status: "rejected", topic, stage: "script", reasons: ["promises a result"] });
    return out;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  liman.tables.clear();
  liman.files.clear();
  liman.opts.missingTables = [];
  liman.opts.missingColumns = {};
  liman.tables.set("dentvid_clinics", [{ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "starter", profile: { name: "Smile", country: "US", language: "en", services: ["Whitening"] }, logo_path: null }]);
  liman.tables.set("dentvid_items", []);
  liman.tables.set("dentvid_topic_requests", [
    { id: "q1", clinic_id: CLINIC, text: "Does whitening make teeth sensitive?", status: "pending", created_at: "2026-11-01T10:00:00Z" },
    { id: "q2", clinic_id: CLINIC, text: "Veneers in a day", status: "pending", created_at: "2026-11-02T10:00:00Z" },
    { id: "q3", clinic_id: CLINIC, text: "Whitening at home vs at the clinic", status: "pending", created_at: "2026-11-03T10:00:00Z" },
    { id: "q4", clinic_id: CLINIC, text: "Fourth: waits for next week", status: "pending", created_at: "2026-11-04T10:00:00Z" },
    { id: "x1", clinic_id: OTHER, text: "Another clinic's request", status: "pending", created_at: "2026-10-01T10:00:00Z" },
  ]);
  _setStoreRetryMs(0);
  configureOps({ store: new MemoryOpsStore(), send: async () => true, env: {} });
  configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), alert: vi.fn(async () => true) });
  prepareNarration.mockImplementation(async (plan: unknown) => ({ plan, voiceoverPath: "/tmp/v.wav", voiceSeconds: 5, pauses: [{ start: 2.4, end: 2.8 }] }));
  renderPlan.mockImplementation(async () => {
    const out = path.join(DIR, `${Math.random()}.mp4`);
    fs.writeFileSync(out, "");
    return { outputPath: out };
  });
});

const topicRequest = (id: string) => liman.rows("dentvid_topic_requests").find((r) => r.id === id)!;

describe("suggested topics in the Monday week", () => {
  it("hands the clinic's oldest pending suggestions (its own only, at most three) to the strategist, then records what became of each", async () => {
    week({
      topics: [T("Sensitivity after whitening", { request: 0 }), T("a"), T("b"), T("c"), T("d")],
      rejected: [T("At home vs in the clinic", { request: 2 })],
      refused: [{ request: 1, reason: "not_offered" }],
    });
    await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2026-11-09" }, { attempts: 4 });
    const opts = produceWeek.mock.calls[0][2] as { requests: string[] };
    expect(opts.requests).toEqual(["Does whitening make teeth sensitive?", "Veneers in a day", "Whitening at home vs at the clinic"]);
    expect(opts.requests).toHaveLength(MAX_REQUESTS_PER_WEEK);
    const used = topicRequest("q1");
    expect(used.status).toBe("used");
    expect(used.week_of).toBe("2026-11-09");
    // Linked to the very video made from it.
    const video = liman.rows("dentvid_items").find((r) => r.id === used.item_id)!;
    expect(video.title).toBe("Sensitivity after whitening");
    expect(topicRequest("q2")).toMatchObject({ status: "refused", reason: "not_offered" });
    expect(topicRequest("q3")).toMatchObject({ status: "refused", reason: "checks" });
    expect(topicRequest("q4").status).toBe("pending");
    expect(topicRequest("x1").status).toBe("pending");
  });

  it("stores each video's subtitle cues, timed from its own narration", async () => {
    week({ topics: [T("a"), T("b"), T("c"), T("d"), T("e")] });
    await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2026-11-09" }, { attempts: 4 });
    const rows = liman.rows("dentvid_items");
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      const subs = r.subtitles as { source: string; cues: { start: number; end: number }[] };
      expect(subs.source).toBe("pauses");
      expect(subs.cues[0].end).toBeCloseTo(2.4, 2);
      expect(subs.cues[1].start).toBeCloseTo(2.8, 2);
    }
  });

  it("a database without 0024 makes a normal week: no suggestions, videos stored without subtitles", async () => {
    liman.opts.missingTables = ["dentvid_topic_requests"];
    liman.opts.missingColumns = { dentvid_items: ["subtitles"] };
    week({ topics: [T("a"), T("b"), T("c"), T("d"), T("e")] });
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week: "2026-11-09" }, { attempts: 4 });
    expect(r.ready).toBe(5);
    expect((produceWeek.mock.calls[0][2] as { requests?: string[] }).requests).toBeUndefined();
    expect(liman.rows("dentvid_items")).toHaveLength(5);
    expect(liman.rows("dentvid_items").every((r) => !("subtitles" in r))).toBe(true);
  });
});

describe("requestOutcomes / saveOutcomes", () => {
  const reqs = [
    { id: "a", text: "x" },
    { id: "b", text: "y" },
    { id: "c", text: "z" },
  ];
  const row = (r: Partial<ItemRow> & { id?: string }): ItemRow & { id?: string } => ({ clinic_id: CLINIC, owner_id: OWNER, kind: "generated", status: "ready", title: "t", findings: [], ...r });

  it("used with a link, refused with the reason, and a technical failure stays pending", () => {
    const out = requestOutcomes(
      reqs,
      [row({ id: "i1", topic: { request: 0 }, video_path: "o/v.mp4" }), row({ status: "rejected", topic: { request: 1 }, error: "429" }), row({ status: "rejected", topic: { request: 2 } })],
      [],
      "2026-11-09",
    );
    expect(out).toEqual([
      { id: "a", status: "used", itemId: "i1", week: "2026-11-09" },
      { id: "c", status: "refused", reason: "checks" },
    ]);
  });

  it("only moves this clinic's pending rows", async () => {
    const db = memoryLiman({
      dentvid_topic_requests: [
        { id: "a", clinic_id: CLINIC, status: "pending" },
        { id: "b", clinic_id: OTHER, status: "pending" },
        { id: "c", clinic_id: CLINIC, status: "used" },
      ],
    });
    await saveOutcomes(db as never, CLINIC, [
      { id: "a", status: "refused", reason: "unclear" },
      { id: "b", status: "refused", reason: "unclear" },
      { id: "c", status: "refused", reason: "unclear" },
    ]);
    expect(db.rows("dentvid_topic_requests").map((r) => r.status)).toEqual(["refused", "pending", "used"]);
  });
});
