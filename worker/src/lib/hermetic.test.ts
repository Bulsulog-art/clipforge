import { describe, expect, it } from "vitest";
import { llmProvider } from "./text-llm.js";

// vitest.setup.ts: run the suite with ANTHROPIC_API_KEY or LLM_PROVIDER=anthropic in the shell and this still holds.
describe("the test suite never reaches a paid text API", () => {
  it("has no Anthropic key and no provider switch from the shell, so text defaults to the mocked OpenAI client", () => {
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(process.env.LLM_PROVIDER).toBeUndefined();
    expect(llmProvider()).toBe("openai");
  });
});
