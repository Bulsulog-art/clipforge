import { describe, expect, test } from "vitest";
import { buildWinningHint } from "./winning-hint.js";

describe("closed-loop/buildWinningHint", () => {
  test("no track record → empty hint (unbiased prompt)", () => {
    expect(buildWinningHint([])).toBe("");
    expect(buildWinningHint(["", "  "])).toBe("");
  });

  test("includes the creator's winning hooks", () => {
    const hint = buildWinningHint(["The truth about focus", "Do this every morning"]);
    expect(hint).toContain("The truth about focus");
    expect(hint).toContain("Do this every morning");
    expect(hint).toContain("similar energy");
  });

  test("caps at 5 hooks and trims blanks", () => {
    const hint = buildWinningHint(["a", " b ", "c", "d", "e", "f", "g"]);
    const bullets = (hint.match(/•/g) ?? []).length;
    expect(bullets).toBe(5);
    expect(hint).toContain("• b"); // trimmed
  });
});
