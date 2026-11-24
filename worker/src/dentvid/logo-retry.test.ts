import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryLiman } from "./memory-liman.js";

/**
 * The clinic's logo is downloaded with retries (logo-fetch.ts). Before, the
 * error of storage.download was ignored: one blip and five videos were made
 * without the logo and marked ready, and a photo restyle could replace a
 * video that had the logo with one that did not. Now a clinic with a logo
 * never gets a video without it: the run stops before any paid call, gives
 * its budget back and is retried (a week, a recording) or keeps the old video
 * (a restyle, a change). A logo file that is gone from storage is told to the
 * owner; a new week is still made, without it.
 */

vi.mock("openai", () => ({ default: class {} }));
const produceWeek = vi.fn();
const produceVideo = vi.fn();
vi.mock("../dental/week.js", () => ({ produceWeek, produceVideo }));
const clipsFromRecording = vi.fn(async () => []);
vi.mock("../dental/recording.js", () => ({ clipsFromRecording }));
const prepareNarration = vi.fn();
vi.mock("../dental/narration-audio.js", () => ({ prepareNarration }));
const renderPlan = vi.fn();
vi.mock("../remotion/render-plan.js", () => ({ renderPlan }));
vi.mock("../dental/questions.js", () => ({ patientSearches: vi.fn(async () => []) }));
vi.mock("./notify.js", () => ({ notifyReady: vi.fn(async () => true), sendReadyAtCivilHour: vi.fn(async () => ({ sent: true })) }));
// A downloaded logo is "analysed" without ffmpeg: what matters here is whether it reaches the render.
vi.mock("../dental/logo.js", () => ({
  readyLogo: vi.fn(async (_bytes: Uint8Array, dir: string) => ({ ok: true, file: path.join(dir, "logo.png"), analysis: { treatment: "plain" } })),
  brandFromLogo: () => ({}),
  logoStyleOf: () => ({ aspect: 3 }),
}));
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
const LOGO = `${OWNER}/logo-1731081600000.png`;
const WEEK = "2030-01-07";
const PROFILE = { name: "Sample Dental Practice", country: "US", language: "en", services: ["Whitening", "Implants"] };
const TOPIC = { title: "Whitening and sensitivity", pillar: "myth", question: "Does whitening hurt?", hook: "That twinge after whitening?", service: "Whitening" };

const liman = memoryLiman();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => liman }));
process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, loadClinic, runDentvidChange, runDentvidRecording, runDentvidRestyle, runDentvidWeek, _setPreflight, _setStoreRetryMs } = await import("./jobs.js");
const { downloadLogo, isNotFound, LOGO_TRIES, LogoMissingError, LogoMissingForNowError, LogoUnavailableError, _setLogoRetryWaits } = await import("./logo-fetch.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { configureOps } = await import("./ops.js");
const { MemoryOpsStore, weekStateKey, _resetLocalOnce } = await import("./ops-alert.js");
const { TransientWeekError, classifyFailure } = await import("./retry.js");

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "logo-retry-"));
let mails: { subject: string; text: string }[];
let ops: InstanceType<typeof MemoryOpsStore>;
let guardStore: InstanceType<typeof MemoryGuardStore>;
/** How each download of the logo answers, in order; after the list, the file as storage has it. */
let answers: ("503" | "throw" | "empty" | "missing" | "ok")[];
let downloads: string[];

const realFrom = liman.storage.from;
liman.storage.from = (() => {
  const bucket = realFrom();
  return {
    ...bucket,
    async download(key: string) {
      downloads.push(key);
      const a = answers.shift() ?? (liman.files.has(key) ? "ok" : "missing");
      if (a === "503") return { data: null, error: { message: "Service Unavailable", status: 503, statusCode: "503" } };
      if (a === "throw") throw new Error("fetch failed: ECONNRESET");
      if (a === "empty") return { data: null, error: null };
      if (a === "missing") return { data: null, error: { message: "Object not found", status: 400, statusCode: "404" } };
      return { data: new Blob(["png"]), error: null };
    },
  };
}) as typeof liman.storage.from;

/** Every budget counter at zero: the run gave back what it reserved. */
const nothingReserved = () => [...guardStore.values.values()].every((v) => v === 0);

beforeEach(() => {
  vi.clearAllMocks();
  _setPreflight(async () => ({ ok: true }));
  _setStoreRetryMs(0);
  _setLogoRetryWaits([0, 0]);
  _resetLocalOnce();
  answers = [];
  downloads = [];
  liman.tables.clear();
  liman.files.clear();
  liman.opts.missingTables = ["dentvid_topic_requests"];
  liman.tables.set("dentvid_clinics", [{ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "practice", profile: PROFILE, logo_path: LOGO }]);
  liman.tables.set("dentvid_items", [
    { id: "item-a", clinic_id: CLINIC, owner_id: OWNER, kind: "generated", status: "ready", approval: "approved", topic: TOPIC, findings: [], plan: { title: "Old", aspect: "9:16", theme: "editorial", scenes: [{ kind: "hook", text: "Old", seconds: 3 }, { kind: "statement", text: "Ask us how", seconds: 4 }], voiceover: { text: "Old narration.", voice: "nova" } }, video_path: `${OWNER}/old.mp4`, thumb_path: `${OWNER}/old.jpg`, restyle_status: "queued" },
  ]);
  liman.tables.set("dentvid_change_requests", []);
  liman.files.set(LOGO, { size: 3, created_at: "" });
  liman.files.set(`${OWNER}/old.mp4`, { size: 1, created_at: "" });
  ops = new MemoryOpsStore();
  mails = [];
  configureOps({ store: ops, send: async (m) => (mails.push(m), true), env: {} });
  guardStore = new MemoryGuardStore();
  configureSpend({ guard: new SpendGuard(guardStore, () => guardConfig({})), alert: vi.fn(async () => true) });
  prepareNarration.mockImplementation(async (plan: unknown) => ({ plan, voiceoverPath: "/tmp/v.wav", voiceSeconds: 6, pauses: [] }));
  renderPlan.mockImplementation(async () => {
    const out = path.join(DIR, `${Math.random()}.mp4`);
    fs.writeFileSync(out, "");
    return { outputPath: out };
  });
  produceWeek.mockImplementation(async (deps: { render: (p: unknown, t: unknown) => Promise<string> }) => {
    const out: Record<string, unknown>[] = [];
    for (const t of ["a", "b", "c", "d", "e"]) {
      const videoPath = await deps.render({ scenes: [], voiceover: { text: "One sentence.", voice: "nova" } }, { title: t });
      out.push({ status: "ready", approval: "pending", topic: { ...TOPIC, title: t }, plan: {}, copy: {}, checks: {}, videoPath });
    }
    return out;
  });
});

describe("downloadLogo", () => {
  const bucket = (list: (() => Promise<{ data: Blob | null; error: unknown }>)[]) => {
    let n = 0;
    return { download: vi.fn(async () => list[Math.min(n++, list.length - 1)]()) } as never as { download: ReturnType<typeof vi.fn> };
  };
  const ok = async () => ({ data: new Blob(["x"]), error: null });
  const down = async () => ({ data: null, error: { message: "Bad Gateway", status: 502, statusCode: "502" } });

  it("a blip is tried again: the logo comes on the second try", async () => {
    const b = bucket([down, ok]);
    const onRetry = vi.fn();
    const r = await downloadLogo(b as never, LOGO, onRetry);
    expect(r).toMatchObject({ ok: true, tries: 2 });
    expect(onRetry).toHaveBeenCalledWith(1, "Bad Gateway (502)");
  });

  it(`storage not answering: ${LOGO_TRIES} tries, then 'unreachable' with the last error`, async () => {
    expect(LOGO_TRIES).toBe(3);
    const b = bucket([down]);
    expect(await downloadLogo(b as never, LOGO)).toEqual({ ok: false, missing: false, error: "Bad Gateway (502)", tries: 3 });
    expect(b.download).toHaveBeenCalledTimes(3);
    // A thrown network error and an empty answer are retried the same way.
    const t = bucket([async () => Promise.reject(new Error("fetch failed")), async () => ({ data: null, error: null })]);
    expect(await downloadLogo(t as never, LOGO)).toEqual({ ok: false, missing: false, error: "storage returned no file", tries: 3 });
  });

  it("a file that is not there is not retried", async () => {
    // Supabase storage's answer for a missing object, over HTTP 400 or 404, and its code when the body has no statusCode.
    for (const error of [
      { message: "Object not found", status: 400, statusCode: "404" },
      { message: "Object not found", status: 404, statusCode: "404" },
      { message: "object not found.", status: 404, statusCode: "NoSuchKey" },
      { message: "The resource was not found", status: 404, statusCode: "NoSuchKey" },
    ]) {
      const b = bucket([async () => ({ data: null, error })]);
      expect(await downloadLogo(b as never, LOGO)).toMatchObject({ ok: false, missing: true, tries: 1 });
      expect(b.download).toHaveBeenCalledTimes(1);
    }
    expect(isNotFound({ message: "Service Unavailable", status: 503 })).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });

  it("any other 404 is storage misrouted or misconfigured, not a missing file: retried, then 'unreachable'", async () => {
    // storage-js gives every error the HTTP status and, without a body statusCode, the status again.
    for (const error of [
      { message: "Bucket not found", status: 400, statusCode: "404" },
      { message: "no Route matched with those values", status: 404, statusCode: "404" },
      { message: "Not Found", status: 404, statusCode: "404" },
      { message: "HTTP 404 error", status: 404, statusCode: "404" },
      { message: "not found" },
    ]) {
      expect(isNotFound(error)).toBe(false);
      const b = bucket([async () => ({ data: null, error })]);
      expect(await downloadLogo(b as never, LOGO)).toMatchObject({ ok: false, missing: false, tries: LOGO_TRIES });
      expect(b.download).toHaveBeenCalledTimes(LOGO_TRIES);
    }
  });
});

describe("a week for a clinic with a logo", () => {
  const run = (attemptsMade = 0) => runDentvidWeek({ clinicId: CLINIC, count: 5, week: WEEK }, { jobId: `week:${CLINIC}:${WEEK}`, attemptsMade, attempts: 4 });

  it("a blip: the logo comes on a retry and every video is made with it", async () => {
    answers = ["503"];
    const r = await run();
    expect(r).toMatchObject({ ready: 5 });
    expect(downloads).toEqual([LOGO, LOGO]);
    expect(renderPlan).toHaveBeenCalledTimes(5);
    expect(renderPlan.mock.calls.every(([o]) => typeof (o as { logoSrc?: string }).logoSrc === "string")).toBe(true);
    expect(mails).toEqual([]);
  });

  it("storage will not give it: nothing is made without it, the budget goes back, the week fails as transient (retried), the owner hears once", async () => {
    answers = ["503", "throw", "503"];
    const err = await run().catch((e) => e);
    expect(err).toBeInstanceOf(LogoUnavailableError);
    expect(err).toBeInstanceOf(TransientWeekError);
    expect(classifyFailure(err)).toBe("transient");
    expect(downloads).toHaveLength(LOGO_TRIES);
    expect(produceWeek).not.toHaveBeenCalled();
    expect(renderPlan).not.toHaveBeenCalled();
    expect(liman.rows("dentvid_items")).toHaveLength(1);
    expect(nothingReserved()).toBe(true);
    expect(await ops.get(weekStateKey(CLINIC, WEEK))).toBe("retrying");
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/logo could not be downloaded/);
    expect(mails[0].text).toContain(LOGO);
    expect(mails[0].text).toMatch(/Service Unavailable/);
    // The next attempt (or another clinic) failing the same day: logged, not another email.
    answers = ["503", "503", "503"];
    await expect(run(1)).rejects.toBeInstanceOf(LogoUnavailableError);
    expect(mails).toHaveLength(1);
    expect(nothingReserved()).toBe(true);
  });

  it("the last attempt still failing: the week is 'delayed', never delivered without the logo", async () => {
    answers = ["503", "503", "503"];
    await expect(run(3)).rejects.toBeInstanceOf(LogoUnavailableError);
    expect(produceWeek).not.toHaveBeenCalled();
    expect(await ops.get(weekStateKey(CLINIC, WEEK))).toBe("delayed");
  });

  it("the logo file reported missing before the week's last attempt: nothing made without it, the budget goes back, retried, the owner hears once", async () => {
    liman.files.delete(LOGO);
    const err = await run(0).catch((e) => e);
    expect(err).toBeInstanceOf(LogoMissingForNowError);
    expect(classifyFailure(err)).toBe("transient");
    expect(downloads).toEqual([LOGO]);
    expect(produceWeek).not.toHaveBeenCalled();
    expect(renderPlan).not.toHaveBeenCalled();
    expect(nothingReserved()).toBe(true);
    expect(await ops.get(weekStateKey(CLINIC, WEEK))).toBe("retrying");
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/logo file is missing/);
    // One email for every attempt that day: it says what happens if the file stays missing.
    expect(mails[0].text).toMatch(/tried again by itself in a few minutes/);
    expect(mails[0].text).toMatch(/still not there on its last attempt, the week is made without the logo/);
    expect(mails[0].text).toMatch(/upload its logo again/);
    expect(mails[0].text).toMatch(/several clinics' logos/);
    // Storage back in step on the next attempt: the week is made with the logo.
    liman.files.set(LOGO, { size: 3, created_at: "" });
    expect(await run(1)).toMatchObject({ ready: 5 });
    expect(renderPlan.mock.calls.every(([o]) => typeof (o as { logoSrc?: string }).logoSrc === "string")).toBe(true);
    expect(mails).toHaveLength(1);
  });

  it("still missing on the week's last attempt: the week is made (the clinic's name in the corner), no second email that day", async () => {
    liman.files.delete(LOGO);
    await expect(run(0)).rejects.toBeInstanceOf(LogoMissingForNowError);
    const r = await run(3);
    expect(r).toMatchObject({ ready: 5 });
    expect(downloads).toEqual([LOGO, LOGO]);
    expect(renderPlan.mock.calls.every(([o]) => (o as { logoSrc?: string }).logoSrc === undefined)).toBe(true);
    expect(mails).toHaveLength(1);
  });

  it("missing on its only attempt (a direct run, or the extra run): made without it, and the owner is told so", async () => {
    liman.files.delete(LOGO);
    const r = await runDentvidWeek({ clinicId: CLINIC, count: 5, week: WEEK }, { jobId: `week:${CLINIC}:${WEEK}`, attemptsMade: 0, attempts: 1 });
    expect(r).toMatchObject({ ready: 5 });
    expect(renderPlan.mock.calls.every(([o]) => (o as { logoSrc?: string }).logoSrc === undefined)).toBe(true);
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toMatch(/The week was made without the logo/);
    expect(mails[0].text).not.toMatch(/tried again by itself/);
  });

  it("a storage route or bucket answering 404 is not 'missing': the week never goes ahead without the logo, even on its last attempt", async () => {
    // Kong in front of storage, its route lost after a deploy: every path answers 404.
    const usual = liman.storage.from;
    liman.storage.from = (() => ({
      ...usual(),
      async download(key: string) {
        downloads.push(key);
        return { data: null, error: { message: "no Route matched with those values", status: 404, statusCode: "404" } };
      },
    })) as typeof liman.storage.from;
    try {
      await expect(run(3)).rejects.toBeInstanceOf(LogoUnavailableError);
      expect(downloads).toHaveLength(LOGO_TRIES);
      expect(produceWeek).not.toHaveBeenCalled();
      expect(await ops.get(weekStateKey(CLINIC, WEEK))).toBe("delayed");
      expect(mails[0].subject).toMatch(/logo could not be downloaded/);
    } finally {
      liman.storage.from = usual;
    }
  });
});

describe("re-renders keep the video that has the logo", () => {
  it("a restyle whose logo cannot be downloaded: the old video stays, the card says it failed, nothing paid", async () => {
    answers = ["503", "503", "503"];
    await expect(runDentvidRestyle({ itemId: "item-a" })).rejects.toBeInstanceOf(LogoUnavailableError);
    const item = liman.rows("dentvid_items").find((r) => r.id === "item-a")!;
    expect(item).toMatchObject({ video_path: `${OWNER}/old.mp4`, thumb_path: `${OWNER}/old.jpg`, restyle_status: "failed" });
    expect(liman.files.has(`${OWNER}/old.mp4`)).toBe(true);
    expect(prepareNarration).not.toHaveBeenCalled();
    expect(renderPlan).not.toHaveBeenCalled();
    expect(nothingReserved()).toBe(true);
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toMatch(/photo update/);
  });

  it("a restyle whose logo file is gone: not re-rendered without it", async () => {
    liman.files.delete(LOGO);
    await expect(runDentvidRestyle({ itemId: "item-a" })).rejects.toBeInstanceOf(LogoMissingError);
    expect(liman.rows("dentvid_items")[0]).toMatchObject({ video_path: `${OWNER}/old.mp4`, restyle_status: "failed" });
    expect(renderPlan).not.toHaveBeenCalled();
    expect(nothingReserved()).toBe(true);
  });

  it("a restyle with its logo after one blip goes ahead with the logo", async () => {
    answers = ["throw"];
    expect(await runDentvidRestyle({ itemId: "item-a" })).toEqual({ ok: true });
    expect((renderPlan.mock.calls[0][0] as { logoSrc?: string }).logoSrc).toEqual(expect.any(String));
  });

  it("a change whose logo cannot be downloaded: old video kept, request failed, the clinic's weekly change given back, ONE email", async () => {
    answers = ["503", "503", "503"];
    liman.rows("dentvid_change_requests").push({ id: "r1", clinic_id: CLINIC, owner_id: OWNER, item_id: "item-a", note: "Calmer please", status: "queued" });
    expect(await runDentvidChange({ requestId: "r1" })).toEqual({ status: "failed", reason: "technical" });
    expect(produceVideo).not.toHaveBeenCalled();
    expect(liman.rows("dentvid_items")[0]).toMatchObject({ video_path: `${OWNER}/old.mp4`, approval: "approved" });
    expect(liman.rows("dentvid_change_requests")[0]).toMatchObject({ status: "failed", reason: "technical" });
    expect(nothingReserved()).toBe(true);
    // The change's own alert carries why; no separate logo email.
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/change request could not be made/i);
    expect(mails[0].text).toMatch(/logo could not be downloaded/);
  });
});

describe("a recording for a clinic with a logo", () => {
  it("storage will not give the logo: nothing transcribed, the budget goes back, retried as transient", async () => {
    answers = ["empty", "empty", "empty"];
    const err = await runDentvidRecording({ clinicId: CLINIC, sourcePath: `${OWNER}/recordings/1.mp4` }, { jobId: "rec:1" }).catch((e) => e);
    expect(err).toBeInstanceOf(LogoUnavailableError);
    expect(classifyFailure(err)).toBe("transient");
    expect(clipsFromRecording).not.toHaveBeenCalled();
    expect(nothingReserved()).toBe(true);
  });
});

describe("loadClinic", () => {
  it("without a job to name (a caller that alerts itself), a failure is thrown but no logo email is sent", async () => {
    answers = ["503", "503", "503"];
    await expect(loadClinic(liman as never, CLINIC, fs.mkdtempSync(path.join(DIR, "w-")))).rejects.toBeInstanceOf(LogoUnavailableError);
    expect(mails).toEqual([]);
  });

  it("a clinic without a logo is never downloaded", async () => {
    liman.rows("dentvid_clinics")[0].logo_path = null;
    const c = await loadClinic(liman as never, CLINIC, fs.mkdtempSync(path.join(DIR, "w-")), { alertAs: "week" });
    expect(c.logoPath).toBeUndefined();
    expect(downloads).toEqual([]);
  });
});
