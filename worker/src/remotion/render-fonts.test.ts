import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { assertRenderFonts, leadFamily, parseCharset, parseFaces, renderFontProblems, screenStrings, type FcList } from "./render-fonts.js";
import type { ScenePlan } from "./scene-plan.js";

const LATIN = "20-7e a0-17f";

/** A fake fontconfig: family → lines of "family|weight|charset". */
function fc(db: Record<string, string[]>): FcList {
  return async (pattern) => {
    const family = pattern.replace(/^:family=/, "");
    return (db[family] ?? []).map((l) => `${family}|${l}\n`).join("");
  };
}

const plan = (over: Partial<ScenePlan> = {}): ScenePlan =>
  ({
    title: "t",
    aspect: "9:16",
    theme: "editorial",
    music: "none",
    language: "pl",
    scenes: [
      { kind: "hook", text: "Ślub za tydzień, a wybielanie teraz?", seconds: 3 },
      { kind: "cta", text: "Prosimy zapytać dentystę.", handle: "@gabinet.demo", seconds: 3 },
    ],
    ...over,
  }) as ScenePlan;

const FULL = {
  Inter: [`80|${LATIN}`, `200|${LATIN}`],
  "Noto Serif Display": [`80|${LATIN}`, `200|${LATIN}`],
};

describe("render fonts", () => {
  it("parses fontconfig output, variable weights included", () => {
    expect(parseCharset("20-7e a0 2c6-2c7")).toEqual([[0x20, 0x7e], [0xa0, 0xa0], [0x2c6, 0x2c7]]);
    expect(parseFaces("Inter|[100 900]|20-7e\nInter|80|20-7e\n").map((f) => f.weight)).toEqual([900, 80]);
    expect(leadFamily('"Noto Serif Display", "Playfair Display", serif')).toBe("Noto Serif Display");
  });

  it("collects what is drawn, not ids or queries", () => {
    const s = screenStrings(
      plan({
        scenes: [{ kind: "footage", source: { type: "stock", query: "toothbrush macro" }, caption: "Ząb", seconds: 3 }],
        disclaimer: "Uwaga",
      } as Partial<ScenePlan>),
    );
    expect(s).toEqual(["Ząb", "Uwaga"]);
  });

  it("passes when the theme's families, a bold face and every letter are installed", async () => {
    expect(await renderFontProblems(plan(), fc(FULL))).toEqual([]);
  });

  // de/bleaching-zahnschmelz (Nov 2026): Editorial's serif was missing, the video came out in Liberation Serif.
  it("refuses a theme whose lead family is missing", async () => {
    const problems = await renderFontProblems(plan(), fc({ Inter: FULL.Inter }));
    expect(problems.join()).toMatch(/"Noto Serif Display".*not installed/);
    await expect(assertRenderFonts(plan(), { list: fc({ Inter: FULL.Inter }), platform: "linux" })).rejects.toThrow(/fallback fonts/);
  });

  // pl/wybielanie-przed-slubem (Nov 2026): only the regular face, so Chrome smeared it into a fake bold.
  it("refuses a lead family with no bold face", async () => {
    const problems = await renderFontProblems(plan(), fc({ ...FULL, "Noto Serif Display": [`80|${LATIN}`] }));
    expect(problems.join()).toMatch(/no bold face/);
  });

  it("refuses letters no render font draws", async () => {
    const turkish = plan({ theme: "midnight", language: "tr", scenes: [{ kind: "hook", text: "İmplant ğ", seconds: 3 }] } as Partial<ScenePlan>);
    const problems = await renderFontProblems(turkish, fc({ Inter: ["200|20-7e a0-ff"] }));
    expect(problems.join()).toMatch(/"İ" "ğ"/);
  });

  it("checks the language's own families for Japanese and Arabic", async () => {
    const ja = plan({ theme: "midnight", language: "ja", scenes: [{ kind: "hook", text: "冷たい水", seconds: 3 }] } as Partial<ScenePlan>);
    const problems = await renderFontProblems(ja, fc(FULL));
    expect(problems.join()).toMatch(/"Noto Sans CJK JP".*not installed/);
    expect(problems.join()).toMatch(/"冷"/);
  });

  it("only checks on Linux, where Chrome uses fontconfig", async () => {
    const warn: string[] = [];
    await assertRenderFonts(plan(), { list: fc({}), platform: "darwin", onWarn: (m) => warn.push(m) });
    expect(warn[0]).toMatch(/skipped/);
  });

  it("is called before every render", async () => {
    const src = (await import("node:fs")).readFileSync(new URL("./render-plan.ts", import.meta.url), "utf8");
    const body = src.slice(src.indexOf("export async function renderPlan"));
    expect(body.indexOf("assertRenderFonts(")).toBeGreaterThan(0);
    expect(body.indexOf("assertRenderFonts(")).toBeLessThan(body.indexOf("getBundle("));
  });

  // On a box with fontconfig (the worker image, a dev sandbox), the real check runs against what is installed.
  const hasFc = (() => {
    try {
      execFileSync("fc-list", ["--version"], { stdio: "ignore" });
      return process.platform === "linux";
    } catch {
      return false;
    }
  })();
  it.skipIf(!hasFc)("reads the real fontconfig", async () => {
    const problems = await renderFontProblems(plan({ theme: "midnight" }));
    // Either everything is there, or it says exactly what is not: never a silent pass on a missing font.
    for (const p of problems) expect(p).toMatch(/not installed|no bold face|no render font/);
  });
});
