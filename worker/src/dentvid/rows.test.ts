import { describe, it, expect } from "vitest";
import { rowFromClip, rowFromPackage, storageKey } from "./rows.js";
import { judge } from "../steps/qa.js";

const ids = { clinicId: "c1", ownerId: "u1" };
const topic = { title: "Whitening myths", pillar: "myth", question: "q", hook: "h", service: "whitening" } as const;
const ready = {
  status: "ready",
  approval: "pending",
  topic,
  plan: { title: "t" },
  copy: { caption: "c", hashtags: ["a"] },
  checks: {},
  videoPath: "/tmp/v.mp4",
} as never;

describe("rowFromPackage", () => {
  it("a reviewed, QA-clean, stored video is ready", () => {
    const row = rowFromPackage({ ...(ready as object), qa: { ok: true, issues: [] } } as never, ids, { videoPath: "u1/x.mp4" });
    expect(row.status).toBe("ready");
    expect(row.findings).toEqual([]);
    expect(row.video_path).toBe("u1/x.mp4");
  });

  it("a QA failure makes it flagged, with the measurement as the reason", () => {
    const row = rowFromPackage(
      { ...(ready as object), qa: { ok: false, issues: ["23.6s of silence (max 3s)"] } } as never,
      ids,
      { videoPath: "u1/x.mp4" },
    );
    expect(row.status).toBe("flagged");
    expect(row.findings[0]).toBe("[dv:pause] quality: 23.6s of silence (max 3s)");
  });

  it("stores the suggested background photos, and nothing when there are none", () => {
    const ids3 = ["implants-03", "implants-06", "implants-07"];
    expect(rowFromPackage({ ...(ready as object), suggestedBackgrounds: ids3 } as never, ids, { videoPath: "u1/x.mp4" }).suggested_backgrounds).toEqual(ids3);
    expect("suggested_backgrounds" in rowFromPackage(ready, ids)).toBe(false);
  });

  it("no narration at all (no audio track) is rejected, keeps its file for the owner, and is never usable", () => {
    const qa = { ok: false, issues: ["no audio track", "28.0s of silence (max 3s)"] };
    const row = rowFromPackage({ ...(ready as object), qa } as never, ids, { videoPath: "u1/x.mp4", thumbPath: "u1/x.jpg" });
    expect(row.status).toBe("rejected");
    // The file stays tracked (no orphan in storage) and the owner can listen to it.
    expect(row.video_path).toBe("u1/x.mp4");
    expect(row.thumb_path).toBe("u1/x.jpg");
    expect(row.qa).toEqual(qa);
    // For the owner only; the clinic reads the calm "not made" sentence, never a sound reason.
    expect(row.error).toBe("silent render: no audio track; 28.0s of silence (max 3s)");
    expect(row.findings).toEqual([]);
    // jobs.ts counts a row as one of the week's five only when it is ready or flagged with a file.
    const usable = (row.status === "ready" || row.status === "flagged") && !!row.video_path;
    expect(usable).toBe(false);
  });

  it("audio too quiet to hear anywhere is rejected the same way, as QA measures it", () => {
    const stats = { durationSec: 30, width: 1080, height: 1920, hasAudio: true, meanVolumeDb: -91, longestSilenceSec: 30, blackSec: 0 };
    const issues = judge(stats, { width: 1080, height: 1920, minSec: 8, maxSec: 90, expectAudio: true });
    expect(issues[0]).toMatch(/^audio is effectively silent/);
    const row = rowFromPackage({ ...(ready as object), qa: { ok: false, issues, stats } } as never, ids, { videoPath: "u1/x.mp4" });
    expect(row.status).toBe("rejected");
    expect(row.error).toMatch(/^silent render: audio is effectively silent \(mean -91\.0 dB\)/);
    expect(row.video_path).toBe("u1/x.mp4");
  });

  it("a long pause in narration that is there stays flagged (the dentist looks), not rejected", () => {
    const row = rowFromPackage({ ...(ready as object), qa: { ok: false, issues: ["4.2s of silence (max 3s)", "0.8s of black frames"] } } as never, ids, { videoPath: "u1/x.mp4" });
    expect(row.status).toBe("flagged");
    expect(row.findings).toEqual(["[dv:pause] quality: 4.2s of silence (max 3s)", "[dv:technical] quality: 0.8s of black frames"]);
    expect(row.error).toBeUndefined();
  });

  it("a render whose QA check crashed is flagged 'qa unavailable', never ready", () => {
    // week.ts: qa = await inspectVideo(...).catch(() => undefined) — the field is there, the report is not.
    const row = rowFromPackage({ ...(ready as object), qa: undefined } as never, ids, { videoPath: "u1/x.mp4" });
    expect(row.status).toBe("flagged");
    expect(row.findings).toEqual(["[dv:unchecked] qa unavailable"]);
    expect(row.video_path).toBe("u1/x.mp4");
    // A garbled report is no report either.
    expect(rowFromPackage({ ...(ready as object), qa: { stats: {} } } as never, ids, { videoPath: "u1/x.mp4" }).findings).toEqual(["[dv:unchecked] qa unavailable"]);
    // Unchecked and not stored: both notes, still flagged.
    expect(rowFromPackage({ ...(ready as object), qa: undefined } as never, ids).findings).toEqual(["[dv:unchecked] qa unavailable", "the video file is missing"]);
  });

  it("a package that was never rendered (planned only) is not called unchecked", () => {
    const { videoPath: _v, ...planned } = ready as unknown as Record<string, unknown>;
    expect(rowFromPackage({ ...planned, qa: undefined } as never, ids).findings).toEqual(["the video file is missing"]);
  });

  it("a ready package whose upload failed is flagged, never shown as ready", () => {
    expect(rowFromPackage(ready, ids).status).toBe("flagged");
  });

  it("a rejected topic is kept with its reasons", () => {
    const row = rowFromPackage({ status: "rejected", topic, stage: "script", reasons: ["guarantee"] } as never, ids);
    expect(row.status).toBe("rejected");
    expect(row.findings).toEqual(["[dv:skipped] guarantee"]);
  });
});

describe("rowFromClip", () => {
  const clip = {
    status: "ready",
    approval: "pending",
    moment: { start: 0, end: 17, hook: "Was beachten?", score: 8 },
    spoken: "Zuerst: nichts essen. Dann …",
    copy: { caption: "c", hashtags: ["a"] },
    checks: {},
    findings: [],
  } as never;

  it("keeps the dentist's findings and the source", () => {
    const row = rowFromClip(clip, { ...ids, sourcePath: "u1/src.mp4" }, { videoPath: "u1/k.mp4" });
    expect(row.status).toBe("ready");
    expect(row.kind).toBe("recording");
    expect(row.source_path).toBe("u1/src.mp4");
  });

  it("codes a clip's findings (QA, removed hook, reviewer), and leaves the missing-file marker alone", () => {
    const row = rowFromClip(
      { ...(clip as object), findings: ["quality: no audio track", 'hook removed — "x": y', '"q": problem → fix'] } as never,
      { ...ids, sourcePath: "s" },
    );
    expect(row.findings).toEqual(["[dv:audio] quality: no audio track", '[dv:opening] hook removed — "x": y', '[dv:wording] "q": problem → fix', "the video file is missing"]);
  });

  it("titles a clip without a hook from its first sentence", () => {
    const row = rowFromClip({ ...(clip as object), moment: { start: 0, end: 1, hook: "", score: 1 } } as never, { ...ids, sourcePath: "s" }, { videoPath: "v" });
    expect(row.title).toBe("Zuerst: nichts essen");
  });
});

it("stores under the owner's folder (storage RLS)", () => {
  expect(storageKey("u1", "abc", "mp4")).toBe("u1/abc.mp4");
});
