import { describe, expect, it } from "vitest";
import { CHECKER_RULES, findHardSpans, scanHardRules } from "./hard-rules";
import golden from "./hard-rules-golden.json";

/**
 * The golden cases the worker computed (worker/src/dental/hard-rules.test.ts
 * writes them; scripts/sync-hard-rules.mjs copies them here). The browser's
 * copy of the engine must give exactly the same hits for the same inputs.
 */
describe("hard rules in the browser = hard rules in the worker", () => {
  it("has golden cases", () => expect(golden.length).toBeGreaterThan(20));

  it.each(golden.map((g, i) => [i, g] as const))("case %i", (_i, g) => {
    expect(scanHardRules(g.input)).toEqual(g.scan);
    expect(findHardSpans(g.input)).toEqual(g.spans);
    expect(findHardSpans(g.input, CHECKER_RULES)).toEqual(g.checker);
  });
});
