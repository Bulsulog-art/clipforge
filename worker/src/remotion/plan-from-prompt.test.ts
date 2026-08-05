import { describe, it, expect, vi } from "vitest";
import { planFromPrompt } from "./plan-from-prompt.js";
import { ScenePlanError } from "./scene-plan.js";
import type OpenAI from "openai";

/**
 * The model is stubbed. These tests are about the layer around it — whether a
 * bad response is repaired, refused, or allowed through — which is the part
 * that decides whether a person gets a video or a spinner.
 */

/** What was sent to the model on a given call, flattened for assertions. */
function sentText(create: ReturnType<typeof vi.fn>, call = 0): string {
  const args = create.mock.calls[call]?.[0] as
    | { messages: { content: string }[] }
    | undefined;
  return (args?.messages ?? []).map((m) => m.content).join("\n");
}

const validPlan = {
  title: "Morning routines",
  aspect: "9:16",
  theme: "midnight",
  music: "calm",
  scenes: [
    { kind: "hook", text: "Nobody tells you this", seconds: 3 },
    { kind: "statement", text: "It compounds daily", seconds: 4 },
  ],
};

/** A client that returns the given payloads in order. */
function stubClient(...responses: unknown[]): { client: OpenAI; calls: () => number } {
  let call = 0;
  const create = vi.fn(async () => {
    const body = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return {
      choices: [{ message: { content: typeof body === "string" ? body : JSON.stringify(body) } }],
    };
  });
  return {
    client: { chat: { completions: { create } } } as unknown as OpenAI,
    calls: () => call,
  };
}

describe("a model that behaves", () => {
  it("returns the plan on the first attempt", async () => {
    const { client, calls } = stubClient(validPlan);
    const result = await planFromPrompt({ prompt: "morning routines" }, client);
    expect(result.plan.title).toBe("Morning routines");
    expect(result.repaired).toBe(false);
    expect(calls()).toBe(1);
  });
});

describe("a model that gets it wrong once", () => {
  it("repairs and succeeds", async () => {
    const tooLong = { ...validPlan, scenes: [{ kind: "hook", text: "Hi", seconds: 40 }] };
    const { client, calls } = stubClient(tooLong, validPlan);
    const result = await planFromPrompt({ prompt: "x" }, client);
    expect(result.repaired).toBe(true);
    expect(calls()).toBe(2);
  });

  it("hands the model the actual rule it broke, not just 'try again'", async () => {
    const bad = { ...validPlan, theme: "vaporwave" };
    const create = vi.fn(async ({ messages }: { messages: { content: string }[] }) => {
      const body = create.mock.calls.length === 1 ? bad : validPlan;
      // On the repair call the transcript must carry the failure detail.
      if (create.mock.calls.length === 2) {
        const last = messages[messages.length - 1].content;
        expect(last).toMatch(/rejected/i);
        expect(last).toMatch(/theme/);
      }
      return { choices: [{ message: { content: JSON.stringify(body) } }] };
    });
    const client = { chat: { completions: { create } } } as unknown as OpenAI;
    await planFromPrompt({ prompt: "x" }, client);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe("a model that will not get it right", () => {
  it("gives up after one repair rather than looping", async () => {
    const bad = { ...validPlan, scenes: [] };
    const { client, calls } = stubClient(bad, bad, bad);
    await expect(planFromPrompt({ prompt: "x" }, client)).rejects.toThrow(ScenePlanError);
    expect(calls()).toBe(2);
  });

  it("fails with something showable to a person", async () => {
    const { client } = stubClient({ ...validPlan, scenes: [] });
    try {
      await planFromPrompt({ prompt: "x" }, client);
      expect.unreachable("should have thrown");
    } catch (e) {
      const message = (e as ScenePlanError).userMessage;
      expect(message).toBeTruthy();
      expect(message).not.toMatch(/zod|json|undefined|scenes\./i);
    }
  });

  it("treats unparseable output as a failure, not a crash", async () => {
    const { client } = stubClient("here is your plan!", "still not json");
    await expect(planFromPrompt({ prompt: "x" }, client)).rejects.toThrow(ScenePlanError);
  });

  it("treats an empty completion as a failure", async () => {
    const { client } = stubClient("", "");
    await expect(planFromPrompt({ prompt: "x" }, client)).rejects.toThrow(ScenePlanError);
  });
});

describe("user clips", () => {
  const withUserClip = {
    ...validPlan,
    scenes: [
      { kind: "hook", text: "Watch this", seconds: 3 },
      { kind: "footage", source: { type: "user", assetIndex: 0 }, seconds: 4 },
    ],
  };

  it("accepts a reference to a clip that was attached", async () => {
    const { client } = stubClient(withUserClip);
    const result = await planFromPrompt({ prompt: "x", userAssetCount: 1 }, client);
    expect(result.plan.scenes[1]).toMatchObject({ kind: "footage" });
  });

  it("refuses a reference to a clip that was not attached", async () => {
    const { client } = stubClient(withUserClip, withUserClip);
    await expect(planFromPrompt({ prompt: "x", userAssetCount: 0 }, client))
      .rejects.toThrow(ScenePlanError);
  });

  it("tells the model it may not use user clips when none were attached", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: JSON.stringify(validPlan) } }],
    }));
    const client = { chat: { completions: { create } } } as unknown as OpenAI;
    await planFromPrompt({ prompt: "x", userAssetCount: 0 }, client);
    const sent = sentText(create);
    expect(sent).toMatch(/attached no clips/i);
  });

  it("passes clip descriptions through so the model can place them", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: JSON.stringify(withUserClip) } }],
    }));
    const client = { chat: { completions: { create } } } as unknown as OpenAI;
    await planFromPrompt(
      { prompt: "x", userAssetCount: 1, userAssetDescriptions: ["me talking to camera"] },
      client,
    );
    const sent = sentText(create);
    expect(sent).toMatch(/me talking to camera/);
  });
});

describe("user overrides", () => {
  it("passes an aspect the user picked", async () => {
    const create = vi.fn(async () => ({
      choices: [{ message: { content: JSON.stringify({ ...validPlan, aspect: "1:1" }) } }],
    }));
    const client = { chat: { completions: { create } } } as unknown as OpenAI;
    const result = await planFromPrompt({ prompt: "x", aspect: "1:1" }, client);
    const sent = sentText(create);
    expect(sent).toMatch(/aspect must be "1:1"/);
    expect(result.plan.aspect).toBe("1:1");
  });
});
