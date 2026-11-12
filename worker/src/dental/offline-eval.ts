/**
 * The offline script eval: the rubric (rubric.ts) over saved scripts, no API.
 *
 *   npx tsx src/dental/offline-eval.ts                       # the 30 baseline scripts + the reference examples
 *   npx tsx src/dental/offline-eval.ts --fixtures dental-eval/scripts.json --out dental-eval
 *
 * A fixtures file is a JSON array of RubricScript objects (plus optional
 * "week" to group a clinic's week for the variety score). The live eval
 * (eval.ts) writes one in this format, so a paid run can be re-graded for
 * free after any rubric change. Where hand grades exist for the same ids
 * (fixtures/baseline-grades.json) the report shows how well the automatic
 * rubric agrees with them.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXAMPLES } from "./examples.js";
import { DIMENSIONS, gradeCorpus, gradeScript, type CorpusSummary, type RubricScript, type WeekGrade } from "./rubric.js";

export type FixtureScript = RubricScript & { week?: string; source?: string; status?: string };
export type HandGrade = Partial<Record<(typeof DIMENSIONS)[number], number>> & { note?: string };

const here = path.dirname(fileURLToPath(import.meta.url));
export const BASELINE_FIXTURES = path.join(here, "fixtures", "baseline-scripts.json");
export const BASELINE_GRADES = path.join(here, "fixtures", "baseline-grades.json");

export async function loadFixtures(file = BASELINE_FIXTURES): Promise<FixtureScript[]> {
  return JSON.parse(await fs.readFile(file, "utf8")) as FixtureScript[];
}

export async function loadHandGrades(file = BASELINE_GRADES): Promise<Record<string, HandGrade>> {
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as Record<string, HandGrade | string>;
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("_"))) as Record<string, HandGrade>;
  } catch {
    return {};
  }
}

/** The reference scripts in rubric form, so they can be graded like any output. */
export function examplesAsScripts(): RubricScript[] {
  return EXAMPLES.map((e) => ({
    id: `example-${e.id}`,
    language: e.language,
    country: e.country,
    address: e.address,
    topic: { title: e.title, hook: e.hook, service: e.service, pillar: e.pillar, question: e.question },
    scenes: e.scenes,
    narration: e.narration,
  }));
}

export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx && syy ? Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100 : 0;
}

/** Agreement between the automatic rubric and hand grades on the six per-script dimensions. */
export function agreement(scripts: FixtureScript[], hand: Record<string, HandGrade>) {
  const dims = DIMENSIONS.filter((d) => d !== "variety");
  const graded = scripts.filter((s) => s.id && hand[s.id]).map((s) => ({ auto: gradeScript(s), hand: hand[s.id!] }));
  const overallHand = graded.map((g) => dims.reduce((a, d) => a + (g.hand[d] ?? 0), 0) / dims.length);
  const overallAuto = graded.map((g) => g.auto.overall);
  return {
    n: graded.length,
    overall: pearson(overallAuto, overallHand),
    handMean: Math.round((overallHand.reduce((a, b) => a + b, 0) / (overallHand.length || 1)) * 100) / 100,
    byDimension: Object.fromEntries(
      dims.map((d) => [d, pearson(graded.map((g) => g.auto.scores[d]), graded.map((g) => g.hand[d] ?? 0))]),
    ) as Record<string, number>,
    handByDimension: Object.fromEntries(
      dims.map((d) => [d, Math.round((graded.reduce((a, g) => a + (g.hand[d] ?? 0), 0) / (graded.length || 1)) * 100) / 100]),
    ) as Record<string, number>,
  };
}

export function reportMarkdown(title: string, summary: CorpusSummary, weeks: Map<string, WeekGrade>, scripts: FixtureScript[], extra: string[] = []): string {
  const dimHead = DIMENSIONS.join(" | ");
  const lines = [
    `# ${title}`,
    "",
    `**${summary.scripts} scripts** · overall ${summary.overall}/5`,
    "",
    `| Language | Scripts | Overall | ${dimHead} |`,
    `|---|---|---|${DIMENSIONS.map(() => "---").join("|")}|`,
    `| all | ${summary.scripts} | ${summary.overall} | ${DIMENSIONS.map((d) => summary.byDimension[d]).join(" | ")} |`,
    ...summary.byLanguage.map((l) => `| ${l.language} | ${l.scripts} | ${l.overall} | ${DIMENSIONS.map((d) => l.byDimension[d]).join(" | ")} |`),
    "",
    "Most frequent findings: " + summary.topFindings.slice(0, 12).map((t) => `${t.code} (${t.count})`).join(", "),
    "",
    ...extra,
    "## Scripts",
    "",
  ];
  const byId = new Map(scripts.map((s) => [s.id, s]));
  for (const [week, wg] of weeks) {
    lines.push(`### Week ${week} — variety ${wg.variety}/5`);
    for (const f of wg.findings) lines.push(`- variety: ${f.detail}`);
    for (const g of wg.scripts) {
      const s = byId.get(g.id);
      lines.push(`- **${g.id}** ${g.overall}/5 — ${DIMENSIONS.filter((d) => d !== "variety").map((d) => `${d} ${g.scores[d as keyof typeof g.scores]}`).join(", ")}`);
      if (s) lines.push(`  - hook: ${s.scenes.find((x) => x.kind === "hook")?.text ?? s.topic.hook ?? ""}`);
      for (const f of g.findings) lines.push(`  - ${f.dim} −${f.severity}: ${f.detail}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const arg = (n: string) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const file = arg("fixtures");
  const scripts = await loadFixtures(file);
  const { summary, weeks } = gradeCorpus(scripts, (s) => (s as FixtureScript).week ?? "all");
  const extra: string[] = [];
  const hand = await loadHandGrades(arg("grades") ?? BASELINE_GRADES);
  const agree = agreement(scripts, hand);
  if (agree.n) {
    extra.push(
      `Hand grades for ${agree.n} scripts: mean ${agree.handMean}/5 (${Object.entries(agree.handByDimension).map(([d, v]) => `${d} ${v}`).join(", ")}).`,
      `Agreement with the rubric (Pearson r): overall ${agree.overall}; ${Object.entries(agree.byDimension).map(([d, r]) => `${d} ${r}`).join(", ")}.`,
      "",
    );
  }
  if (!file) {
    const ex = gradeCorpus(examplesAsScripts(), (s) => s.language);
    extra.push(`Reference examples (examples.ts): overall ${ex.summary.overall}/5 over ${ex.summary.scripts} scripts — the bar the writers are shown.`, "");
  }
  const report = reportMarkdown(file ? `Offline script eval — ${path.basename(file)}` : "Offline script eval — baseline (30 scripts)", summary, weeks, scripts, extra);
  const out = arg("out");
  if (out) {
    await fs.mkdir(out, { recursive: true });
    await fs.writeFile(path.join(out, "offline-report.md"), report);
    await fs.writeFile(path.join(out, "offline-eval.json"), JSON.stringify({ summary, agreement: agree, weeks: Object.fromEntries(weeks) }, null, 2));
  }
  console.log(process.argv.includes("--full") ? report : report.split("## Scripts")[0]);
}

if (process.argv[1] && /offline-eval\.(ts|js|mts)$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
