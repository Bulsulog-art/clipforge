import { describe, it, expect } from "vitest";
import { planRetry, type RetryableJob } from "./retry-job";

/**
 * The bug these are written against: every retry went to the clipping queue,
 * so a failed prompt→video job was handed to a worker that wanted a source
 * file to cut up. It failed a second time, identically, and the prompt never
 * travelled with it.
 */

const base: RetryableJob = {
  id: "job-1",
  user_id: "user-1",
  source_type: "generate",
  source_url: null,
  storage_path: null,
  niche: null,
  language: "en",
  clip_prompt: "3 signs your morning routine is broken",
  aspect_ratio: "9:16",
  source_asset_paths: null,
  scene_plan: null,
};

describe("a generated video", () => {
  it("goes to the generate queue, not the clipping one", () => {
    expect(planRetry(base).queue).toBe("generate");
  });

  it("carries the prompt, or the worker has nothing to build from", () => {
    const plan = planRetry(base);
    expect(plan.queue === "generate" && plan.payload.prompt).toBe(
      "3 signs your morning routine is broken",
    );
  });

  it("carries the clips the person attached", () => {
    const plan = planRetry({ ...base, source_asset_paths: ["user-1/generate-assets/a.mp4"] });
    expect(plan.queue === "generate" && plan.payload.assetPaths).toEqual([
      "user-1/generate-assets/a.mp4",
    ]);
  });

  it("keeps the look when the first run got as far as writing a plan", () => {
    const plan = planRetry({ ...base, scene_plan: { theme: "candy", scenes: [] } });
    expect(plan.queue === "generate" && plan.payload.theme).toBe("candy");
  });

  it("lets the model choose again when there is no plan to read", () => {
    const plan = planRetry(base);
    expect(plan.queue === "generate" && plan.payload.theme).toBeUndefined();
  });

  it("survives a scene_plan that is not a plan at all", () => {
    for (const junk of [null, "oops", 42, [], { theme: 7 }]) {
      const plan = planRetry({ ...base, scene_plan: junk });
      expect(plan.queue === "generate" && plan.payload.theme).toBeUndefined();
    }
  });

  it("refuses rather than queueing a job with nothing to build", () => {
    const plan = planRetry({ ...base, clip_prompt: "   " });
    expect(plan.queue).toBeNull();
    expect(plan.queue === null && plan.error).toMatch(/no prompt/i);
  });

  it("retries twice, not three times — a render costs real CPU", () => {
    const plan = planRetry(base);
    expect(plan.queue !== null && plan.options.attempts).toBe(2);
  });
});

describe("a clipping job", () => {
  const upload: RetryableJob = {
    ...base,
    source_type: "upload",
    storage_path: "user-1/source.mp4",
    niche: "business",
    clip_prompt: null,
  };

  it("still goes to the clipping queue", () => {
    expect(planRetry(upload).queue).toBe("video");
  });

  it("keeps its source and its niche", () => {
    const plan = planRetry(upload);
    expect(plan.queue === "video" && plan.payload.storagePath).toBe("user-1/source.mp4");
    expect(plan.queue === "video" && plan.payload.niche).toBe("business");
  });

  it("falls back to a default niche rather than sending null", () => {
    const plan = planRetry({ ...upload, niche: null });
    expect(plan.queue === "video" && plan.payload.niche).toBe("motivation");
  });

  it("does not need a prompt", () => {
    expect(planRetry(upload).queue).toBe("video");
  });
});
