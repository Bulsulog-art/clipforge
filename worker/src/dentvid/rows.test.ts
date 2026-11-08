import { describe, it, expect } from "vitest";
import { rowFromClip, rowFromPackage, storageKey } from "./rows.js";

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
    expect(row.findings[0]).toMatch(/quality: 23.6s of silence/);
  });

  it("stores the suggested background photos, and nothing when there are none", () => {
    const ids3 = ["implants-03", "implants-06", "implants-07"];
    expect(rowFromPackage({ ...(ready as object), suggestedBackgrounds: ids3 } as never, ids, { videoPath: "u1/x.mp4" }).suggested_backgrounds).toEqual(ids3);
    expect("suggested_backgrounds" in rowFromPackage(ready, ids)).toBe(false);
  });

  it("a ready package whose upload failed is flagged, never shown as ready", () => {
    expect(rowFromPackage(ready, ids).status).toBe("flagged");
  });

  it("a rejected topic is kept with its reasons", () => {
    const row = rowFromPackage({ status: "rejected", topic, stage: "script", reasons: ["guarantee"] } as never, ids);
    expect(row.status).toBe("rejected");
    expect(row.findings).toEqual(["guarantee"]);
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

  it("titles a clip without a hook from its first sentence", () => {
    const row = rowFromClip({ ...(clip as object), moment: { start: 0, end: 1, hook: "", score: 1 } } as never, { ...ids, sourcePath: "s" }, { videoPath: "v" });
    expect(row.title).toBe("Zuerst: nichts essen");
  });
});

it("stores under the owner's folder (storage RLS)", () => {
  expect(storageKey("u1", "abc", "mp4")).toBe("u1/abc.mp4");
});
