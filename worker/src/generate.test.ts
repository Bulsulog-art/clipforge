import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs/promises";

/**
 * These are about the credit ledger, which is the part of this job that costs
 * real money when it is wrong. Everything else — planning, rendering — is
 * covered where it lives; here the question is only ever "who got charged, and
 * did they get it back".
 */

const rpc = vi.fn();
const update = vi.fn();
const insert = vi.fn();
const storageUpload = vi.fn();
const storageDownload = vi.fn();

vi.mock("./supabase.js", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (table: string) => ({
      update: (values: unknown) => {
        update(table, values);
        return { eq: () => Promise.resolve({ error: null }) };
      },
      insert: (values: unknown) => {
        insert(table, values);
        return Promise.resolve({ error: null });
      },
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { tier: "starter", watermark_enabled: false } }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => storageUpload(...a),
        download: (...a: unknown[]) => storageDownload(...a),
      }),
    },
  },
}));

vi.mock("./logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const planFromPrompt = vi.fn();
vi.mock("./remotion/plan-from-prompt.js", () => ({
  planFromPrompt: (...a: unknown[]) => planFromPrompt(...a),
}));

const renderPlan = vi.fn();
vi.mock("./remotion/render-plan.js", () => ({
  renderPlan: (...a: unknown[]) => renderPlan(...a),
}));

const { runGenerate } = await import("./generate.js");
const { ScenePlanError } = await import("./remotion/scene-plan.js");

const plan = {
  title: "T",
  aspect: "9:16",
  theme: "midnight",
  music: "none",
  scenes: [
    { kind: "hook", text: "Hi", seconds: 3 },
    { kind: "statement", text: "There", seconds: 4 },
  ],
};

/** Every rpc call made, as [name, args] pairs. */
const rpcCalls = () => rpc.mock.calls.map((c) => [c[0], c[1]] as [string, Record<string, unknown>]);
const called = (name: string) => rpcCalls().filter(([n]) => n === name);

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: 1, error: null });
  planFromPrompt.mockResolvedValue({ plan, repaired: false });
  storageUpload.mockResolvedValue({ error: null });
  // renderPlan is stubbed, so nothing writes the output file. Create it, or
  // the job correctly fails on the "did the render actually produce a file"
  // check that exists precisely to catch that case in production.
  renderPlan.mockImplementation(async (args: { outputPath: string }) => {
    await fs.writeFile(args.outputPath, Buffer.from([0, 1, 2, 3]));
    return { outputPath: args.outputPath, durationSec: 7, width: 1080, height: 1920, missingFootage: 0 };
  });
});

const payload = { jobId: "job-1", userId: "user-1", prompt: "morning routines" };

describe("a job that works", () => {
  it("charges once and never refunds", async () => {
    await runGenerate(payload);
    expect(called("consume_credits")).toHaveLength(1);
    expect(called("grant_credits")).toHaveLength(0);
  });

  it("records the finished video", async () => {
    await runGenerate(payload);
    const clip = insert.mock.calls.find(([table]) => table === "clips");
    expect(clip).toBeDefined();
    expect(clip?.[1]).toMatchObject({ status: "ready", aspect_ratio: "9:16" });
  });

  it("finishes at 100%", async () => {
    await runGenerate(payload);
    const progresses = update.mock.calls
      .filter(([table]) => table === "video_jobs")
      .map(([, v]) => v as { status?: string; progress?: number });
    expect(progresses.at(-1)).toMatchObject({ status: "ready", progress: 100 });
  });
});

describe("a job that fails after being charged", () => {
  it("refunds exactly once", async () => {
    renderPlan.mockRejectedValue(new Error("ffmpeg exploded"));
    await expect(runGenerate(payload)).rejects.toThrow();
    expect(called("consume_credits")).toHaveLength(1);
    expect(called("grant_credits")).toHaveLength(1);
  });

  it("marks the job failed with something a person can act on", async () => {
    renderPlan.mockRejectedValue(new Error("ENOSPC: no space left on device"));
    await expect(runGenerate(payload)).rejects.toThrow();
    const failed = update.mock.calls
      .filter(([table]) => table === "video_jobs")
      .map(([, v]) => v as { status?: string; error_message?: string })
      .find((v) => v.status === "failed");
    expect(failed?.error_message).toBeTruthy();
    expect(failed?.error_message).not.toMatch(/ENOSPC|device/);
  });

  it("passes a plan failure through in the user's language", async () => {
    planFromPrompt.mockRejectedValue(
      new ScenePlanError("scenes: too few", "Try describing it in a sentence or two."),
    );
    await expect(runGenerate(payload)).rejects.toThrow();
    const failed = update.mock.calls
      .filter(([table]) => table === "video_jobs")
      .map(([, v]) => v as { status?: string; error_message?: string })
      .find((v) => v.status === "failed");
    expect(failed?.error_message).toBe("Try describing it in a sentence or two.");
  });
});

describe("a job that was never charged", () => {
  it("does not mint credits out of a failure to pay", async () => {
    // consume_credits raises P0001 when the balance is short.
    rpc.mockImplementation(async (name: string) =>
      name === "consume_credits"
        ? { data: null, error: { code: "P0001", message: "insufficient" } }
        : { data: 1, error: null },
    );

    await expect(runGenerate(payload)).rejects.toThrow(/insufficient_credits/);
    expect(called("grant_credits")).toHaveLength(0);
  });

  it("tells the person why, rather than showing an error code", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "consume_credits"
        ? { data: null, error: { code: "P0001", message: "insufficient" } }
        : { data: 1, error: null },
    );

    await expect(runGenerate(payload)).rejects.toThrow();
    const failed = update.mock.calls
      .filter(([table]) => table === "video_jobs")
      .map(([, v]) => v as { status?: string; error_message?: string })
      .find((v) => v.status === "failed");
    expect(failed?.error_message).toMatch(/out of credits/i);
    expect(failed?.error_message).not.toMatch(/P0001|insufficient_credits/);
  });
});

describe("watermark", () => {
  it("is off for a paying member", async () => {
    await runGenerate(payload);
    expect(renderPlan.mock.calls[0][0]).toMatchObject({ watermark: false });
  });
});

describe("a render that lies about succeeding", () => {
  it("fails the job and refunds, rather than throwing from a stream", async () => {
    renderPlan.mockResolvedValue({
      outputPath: "/tmp/never-written.mp4",
      durationSec: 7,
      width: 1080,
      height: 1920,
      missingFootage: 0,
    });
    await expect(runGenerate(payload)).rejects.toThrow(/produced no file/);
    expect(called("grant_credits")).toHaveLength(1);
  });
});
