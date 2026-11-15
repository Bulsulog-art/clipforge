import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ScenePlan } from "./scene-plan.js";
import { localizeTheme, theme as resolveTheme } from "./theme.js";

/**
 * Checks, before a single frame is rendered, that the box can draw the plan
 * in the fonts its theme was designed with.
 *
 * Headless Chrome on Linux finds fonts through fontconfig, and when a family
 * is missing it does not fail: it quietly draws the text in whatever the
 * system has. Two published samples went out that way (Nov 2026,
 * de/bleaching-zahnschmelz and pl/wybielanie-przed-slubem, both rendered
 * with `dental/cli.ts --render` outside the worker image): the German one in
 * Liberation Serif, because the Editorial theme then led with a Playfair
 * Display no box had; the Polish one in Noto Serif Display with a
 * synthesised ("faux") bold, because the box had the regular face only.
 * The worker image installs and checks every family (worker/Dockerfile,
 * RENDER_FONTS in theme.ts), but nothing stopped a render anywhere else.
 * Now the render refuses instead (render-plan.ts calls assertRenderFonts).
 *
 * What is checked, through fontconfig — exactly what Chrome will see:
 *  - the family each of the theme's stacks leads with (after the language's
 *    own fonts are put in front) is installed;
 *  - it has a bold face (headlines are 700–900; without one Chrome smears
 *    the regular face);
 *  - every letter on screen is drawn by one of those families or by Inter
 *    (every stack's sans fallback), so no glyph comes from a font nobody chose.
 */

export type FontFace = { family: string; weight: number; ranges: [number, number][] };
export type FcList = (pattern: string) => Promise<string>;

/** fontconfig's weight for Bold (FC_WEIGHT_BOLD); a variable font lists its range. */
const FC_BOLD = 200;

const run = promisify(execFile);

export const fcList: FcList = async (pattern) =>
  (await run("fc-list", ["--format", "%{family[0]}|%{weight}|%{charset}\\n", pattern], { maxBuffer: 16 * 1024 * 1024 })).stdout;

/** "20-7e a0-ac 2c6" → [[0x20,0x7e],[0xa0,0xac],[0x2c6,0x2c6]]. */
export function parseCharset(charset: string): [number, number][] {
  return charset
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((r) => {
      const [a, b] = r.split("-").map((h) => parseInt(h, 16));
      return [a, Number.isFinite(b) ? b : a] as [number, number];
    })
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
}

export function parseFaces(out: string): FontFace[] {
  return out
    .split("\n")
    .map((line) => line.split("|"))
    .filter((p) => p.length >= 3 && p[0])
    .map(([family, weight, charset]) => ({
      family,
      // "200" or, for a variable font, "[100 900]": the heaviest it can draw.
      weight: Math.max(0, ...(weight.match(/\d+(\.\d+)?/g) ?? ["0"]).map(Number)),
      ranges: parseCharset(charset),
    }));
}

/** The first family of a CSS font stack, unquoted. */
export function leadFamily(stack: string): string {
  return stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
}

/** Every string a viewer can read in the plan (scene text, captions, the on-screen notice). */
export function screenStrings(plan: ScenePlan): string[] {
  const out: string[] = [];
  const walk = (v: unknown, key?: string) => {
    if (typeof v === "string") {
      // Ids, queries and sources are not drawn.
      if (!key || !["kind", "type", "query", "src", "id", "voice", "aspect", "theme", "music", "language"].includes(key)) out.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(plan.scenes);
  if (plan.disclaimer) out.push(plan.disclaimer);
  return out;
}

const covers = (f: FontFace, cp: number) => f.ranges.some(([a, b]) => cp >= a && cp <= b);

/** What would render in a font nobody chose, or [] when the box has everything. */
export async function renderFontProblems(plan: Pick<ScenePlan, "theme" | "language" | "scenes" | "disclaimer">, list: FcList = fcList): Promise<string[]> {
  const t = localizeTheme(resolveTheme(plan.theme), plan.language);
  const leads = [...new Set([leadFamily(t.displayFont), leadFamily(t.bodyFont)])];
  const families = [...new Set([...leads, "Inter"])];
  const faces = new Map<string, FontFace[]>();
  for (const f of families) faces.set(f, parseFaces(await list(`:family=${f}`)));

  const problems: string[] = [];
  for (const f of leads) {
    const have = faces.get(f)!;
    if (!have.length) problems.push(`font "${f}" (theme ${plan.theme}) is not installed — the text would render in a fallback`);
    else if (!have.some((x) => x.weight >= FC_BOLD)) problems.push(`font "${f}" has no bold face — headlines would render in a synthesised bold`);
  }
  const all = [...faces.values()].flat();
  const letters = new Set([...screenStrings(plan as ScenePlan).join("")].filter((c) => /\p{L}/u.test(c)));
  const missing = [...letters].filter((c) => !all.some((f) => covers(f, c.codePointAt(0)!)));
  if (all.length && missing.length) problems.push(`no render font draws ${missing.slice(0, 12).map((c) => `"${c}"`).join(" ")} — those letters would come from a fallback font`);
  return problems;
}

/**
 * Throws when the plan would render in fallback fonts. Only Linux is
 * checked: that is where the renderer's Chrome uses fontconfig (and where
 * every render we ship runs); elsewhere `onWarn` is told it was skipped.
 */
export async function assertRenderFonts(
  plan: Pick<ScenePlan, "theme" | "language" | "scenes" | "disclaimer">,
  opts: { list?: FcList; platform?: NodeJS.Platform; onWarn?: (m: string) => void } = {},
): Promise<void> {
  if ((opts.platform ?? process.platform) !== "linux") {
    opts.onWarn?.("font check skipped: not Linux (fontconfig)");
    return;
  }
  let problems: string[];
  try {
    problems = await renderFontProblems(plan, opts.list);
  } catch (e) {
    throw new Error(`cannot check the render fonts (is fontconfig installed?): ${(e as Error).message}`);
  }
  if (problems.length) throw new Error(`refusing to render with fallback fonts: ${problems.join("; ")} (install them as worker/Dockerfile does)`);
}
