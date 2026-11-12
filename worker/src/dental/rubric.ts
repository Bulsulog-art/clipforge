/**
 * The script quality rubric, as code. docs/QUALITY.md is the human version.
 *
 * Seven dimensions, each scored 1-5:
 *   hook        lands in ~2 s, specific, opens a question it does not answer
 *   clarity     one takeaway; not too many points; a length a Reel holds
 *   accuracy    no invented numbers, no procedure mix-ups, medication defers
 *               to the dentist, narration adds no facts the screen lacks
 *   native      spoken register, no AI filler or stock tics, not the screen
 *               read aloud, no word hammered, consistent form of address
 *   compliance  the hard rules (compliance.ts) plus market-specific red flags
 *   cta         present, calm, specific, legal in the market
 *   variety     across a week (and against the clinic's history): openers,
 *               closings, hook shapes, services, near-duplicate topics
 *
 * Deterministic and free: it runs offline on fixtures, inside the live eval
 * next to the LLM judge, and (its blocking subset) as a post-check in
 * production. It catches what a pattern can see; whether a hook is
 * *delightful* is still the judge's and the dentist's call. Scores start at
 * 5 and lose the severity of each finding (1 minor, 2 major, 4 blocker),
 * floored at 1.
 */
import { scanHardRules } from "./compliance.js";
import { speechUnits } from "./locale.js";
import {
  clinicalFlags,
  ctaProblems,
  fillerHits,
  hookBudget,
  hookProblems,
  hookShape,
  NARRATION_SECONDS,
  numbersIn,
  registerHits,
  spokenRate,
  unhedgedClaims,
  spokenSeconds,
  STOCK_OPENERS,
} from "./style.js";

export const DIMENSIONS = ["hook", "clarity", "accuracy", "native", "compliance", "cta", "variety"] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export type Severity = 1 | 2 | 4;
export type Finding = { dim: Dimension; severity: Severity; code: string; detail: string };

/** Loose on purpose: a ScenePlan scene, a fixture scene or an example scene all fit. */
export type RubricScene = {
  kind: string;
  text?: string;
  sub?: string;
  heading?: string;
  items?: string[];
  caption?: string;
  value?: string;
  label?: string;
  context?: string;
  left?: { label?: string; text?: string };
  right?: { label?: string; text?: string };
};

export type RubricScript = {
  id?: string;
  language: string;
  country: string;
  address?: "formal" | "informal";
  topic: { title: string; hook?: string; service?: string; pillar?: string; question?: string };
  scenes: RubricScene[];
  narration?: string | null;
  caption?: string | null;
};

export type ScriptGrade = {
  id?: string;
  scores: Record<Exclude<Dimension, "variety">, number>;
  findings: Finding[];
  /** Mean of the six per-script dimensions (variety is graded per week). */
  overall: number;
};

const lang2 = (l: string) => l.toLowerCase().slice(0, 2);
const round2 = (x: number) => Math.round(x * 100) / 100;
const norm = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Every on-screen string, in order. */
export function screenLines(scenes: RubricScene[]): string[] {
  const out: string[] = [];
  for (const s of scenes) {
    for (const v of [s.text, s.sub, s.heading, s.caption, s.value && `${s.value} ${s.label ?? ""}`, s.context]) if (v) out.push(v);
    for (const i of s.items ?? []) out.push(i);
    for (const side of [s.left, s.right]) if (side) out.push([side.label, side.text].filter(Boolean).join(": "));
  }
  return out;
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。？！؟…])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function hookOf(s: RubricScript): string {
  const scene = s.scenes.find((x) => x.kind === "hook");
  return (scene?.text ?? s.topic.hook ?? "").trim();
}
function ctaOf(s: RubricScript): string | undefined {
  return s.scenes.find((x) => x.kind === "cta")?.text;
}

/** Share of narration sentences that are (nearly) an on-screen line read out. */
export function readAloudShare(narration: string, screen: string[]): number {
  const lines = screen.map(norm).filter((l) => l.split(" ").length >= 3);
  const ss = sentences(narration).map(norm).filter(Boolean);
  if (!ss.length) return 0;
  const hit = ss.filter((s) => lines.some((l) => l === s || (l.length > 12 && s.includes(l)) || (s.length > 12 && l.includes(s))));
  return hit.length / ss.length;
}

/** Content stems used 4+ times in the narration ("dayanır… dayanabilir… dayanıyorlar…"). */
export function hammeredWords(text: string, language: string): string[] {
  if (["ja", "zh"].includes(lang2(language))) return [];
  const counts = new Map<string, number>();
  for (const tok of norm(text).split(" ")) {
    if (tok.length < 5) continue;
    const stem = tok.slice(0, 5);
    counts.set(stem, (counts.get(stem) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n >= 4).map(([s]) => s);
}

/** Formal and informal address mixed in one script (seen live: "du" switching to "Sie"). */
export function mixedAddress(text: string, language: string): boolean {
  const l = lang2(language);
  if (l === "de") {
    const formal = /(?<=\p{Ll}[^.!?]*\s)(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihnen)(?![\p{L}])/u.test(text);
    const informal = /(?<![\p{L}])(du|dich|dir|dein|deine|deinen|deinem|deiner)(?![\p{L}])/iu.test(text);
    return formal && informal;
  }
  if (l === "es") {
    const formal = /(?<![\p{L}])(usted|ustedes)(?![\p{L}])/iu.test(text);
    const informal = /(?<![\p{L}])(tú|contigo|tienes|puedes|quieres|cepíllate|pregúntanos)(?![\p{L}])/iu.test(text);
    return formal && informal;
  }
  return false;
}

const score = (fs: Finding[], dim: Dimension) => Math.max(1, 5 - fs.filter((f) => f.dim === dim).reduce((a, f) => a + f.severity, 0));

export function gradeScript(s: RubricScript): ScriptGrade {
  const f: Finding[] = [];
  const add = (dim: Dimension, severity: Severity, code: string, detail: string) => f.push({ dim, severity, code, detail });
  const language = s.language;
  const screen = screenLines(s.scenes);
  const screenText = screen.join("\n");
  const narration = (s.narration ?? "").trim();
  const everything = [screenText, narration, s.caption ?? ""].join("\n");

  // ---- hook
  const hook = hookOf(s);
  if (!hook) add("hook", 4, "hook_missing", "no hook scene");
  else {
    for (const p of hookProblems(hook, language)) {
      const sev: Severity = p.code === "flat_statement" ? 1 : 2;
      add("hook", sev, `hook_${p.code}`, p.detail);
    }
    const units = speechUnits(hook, language);
    if (units > hookBudget(language) && !hookProblems(hook, language).some((p) => p.code === "too_long"))
      add("hook", 1, "hook_slow", `${units} units — longer than the ~2-second budget (${hookBudget(language)})`);
  }
  if (narration) {
    const first = sentences(narration)[0] ?? "";
    if (speechUnits(first, language) > Math.round(spokenRate(language) * 5))
      add("hook", 1, "hook_slow_open", `the narration's first sentence takes ~${spokenSeconds(first, language)} s — the hook must land in the first 2`);
  }

  // ---- clarity
  const points = s.scenes.reduce((n, x) => n + (x.kind === "statement" ? 1 : 0) + (x.items?.length ?? 0) + (x.left ? 1 : 0) + (x.right ? 1 : 0), 0);
  if (points > 8) add("clarity", 1, "too_many_points", `${points} points on screen — one takeaway needs fewer`);
  if (s.scenes.length > 7) add("clarity", 1, "too_many_scenes", `${s.scenes.length} scenes`);
  for (const x of s.scenes) if ((x.items?.length ?? 0) > 4) add("clarity", 1, "long_list", `list of ${x.items!.length} items`);
  for (const line of screen) {
    if (speechUnits(line, language) > (["ja"].includes(lang2(language)) ? 50 : 22)) {
      add("clarity", 1, "dense_screen", `on-screen line too long to read: ${line.slice(0, 60)}…`);
      break;
    }
  }
  for (let i = 1; i < s.scenes.length; i++)
    if (s.scenes[i].kind === "statement" && s.scenes[i - 1].kind === "statement") {
      add("clarity", 1, "statement_run", "two statement scenes in a row — the brief asks for a list or compare between");
      break;
    }
  if (narration) {
    const sec = spokenSeconds(narration, language);
    if (sec < NARRATION_SECONDS.min || sec > NARRATION_SECONDS.max) add("clarity", 2, "length_out_of_range", `narration ~${sec} s (needs ${NARRATION_SECONDS.min}-${NARRATION_SECONDS.max})`);
    else if (sec < NARRATION_SECONDS.idealMin || sec > NARRATION_SECONDS.idealMax) add("clarity", 1, "length_off_ideal", `narration ~${sec} s (ideal ${NARRATION_SECONDS.idealMin}-${NARRATION_SECONDS.idealMax})`);
  }

  // ---- accuracy (what a pattern can see; the clinical reviewer does the rest)
  for (const c of clinicalFlags(everything)) add("accuracy", 2, "clinical_flag", c);
  for (const c of unhedgedClaims(`${screenText}\n${narration}`, language).slice(0, 2)) add("accuracy", 1, "unhedged_claim", `effect stated as certain: ${c.slice(0, 80)}`);
  if (narration) {
    const onScreen = numbersIn(screenText);
    const added = [...numbersIn(narration)].filter((n) => !onScreen.has(n));
    if (added.length) add("accuracy", 1, "narration_adds_numbers", `narration states numbers not on screen: ${added.join(", ")}`);
  }
  if (s.caption) {
    const script = numbersIn(`${screenText}\n${narration}`);
    const added = [...numbersIn(s.caption)].filter((n) => !script.has(n));
    if (added.length) add("accuracy", 1, "caption_adds_numbers", `caption states numbers the video does not: ${added.join(", ")}`);
  }

  // ---- native register
  const spoken = narration || screenText;
  const cta = ctaOf(s) ?? "";
  for (const p of fillerHits(everything.replace(cta, ""), language)) add("native", 1, "filler", `generic filler: "${p}"`);
  for (const p of registerHits(spoken, language)) add("native", 1, "written_register", `written, not spoken: "${p}"`);
  if (narration) {
    if (STOCK_OPENERS.test(narration)) add("native", 1, "stock_opener", `stock opener: "${narration.slice(0, 30)}…"`);
    const share = readAloudShare(narration, screen);
    if (share >= 0.6) add("native", 2, "reads_screen_aloud", `${Math.round(share * 100)}% of narration sentences are on-screen lines read out`);
    const ham = hammeredWords(narration, language);
    if (ham.length) add("native", 1, "repetitive", `same word 4+ times: ${ham.join(", ")}`);
    const lens = sentences(narration).map((x) => speechUnits(x, language));
    if (lens.length >= 5) {
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
      if (sd < 2) add("native", 1, "monotone", `sentences all ~${Math.round(mean)} words long`);
    }
  }
  if (mixedAddress(everything, language)) add("native", 2, "mixed_address", "formal and informal address mixed");

  // ---- compliance
  for (const h of scanHardRules(everything)) add("compliance", 4, `hard_${h.rule}`, `"${h.match}" — ${h.why}`);
  if (/(tehdit|sessiz katil|silent killer|tickende zeitbombe|bomba de relojería|peligro silencioso)/iu.test(everything))
    add("compliance", 1, "fear", "fear framing — explain risks calmly");
  if (/(necesitas|necesita|you need|brauchen sie|brauchst du|ihtiyacınız var)\s+(una |a |eine |)?(endodoncia|root canal|wurzelbehandlung|kanal tedavisi|implant\p{L}*)/iu.test(everything))
    add("compliance", 1, "diagnoses_viewer", "tells the viewer they need a treatment");
  if (s.country.toUpperCase() === "TR" && /(uzman hekim|uzman doktor|uzmanlarımız)/iu.test(everything))
    add("compliance", 1, "specialist_claim", '"uzman" implies a specialist title the clinic may not hold');
  if (s.country.toUpperCase() === "MX" && /cofepris/iu.test(everything)) add("compliance", 2, "cofepris_number", "never write a COFEPRIS legend or number");

  // ---- cta
  for (const p of ctaProblems(cta || undefined, s.country)) {
    const sev: Severity = p.code === "missing" || p.code === "pressure" ? 2 : 1;
    add("cta", sev, `cta_${p.code}`, p.detail);
  }

  const scores = {
    hook: score(f, "hook"),
    clarity: score(f, "clarity"),
    accuracy: score(f, "accuracy"),
    native: score(f, "native"),
    compliance: score(f, "compliance"),
    cta: score(f, "cta"),
  };
  const overall = round2(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
  return { id: s.id, scores, findings: f, overall };
}

/** What the clinic already posted, for repetition checks. */
export type PastTopic = { title: string; hook?: string; service?: string; pillar?: string; question?: string; weekOf?: string };

const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length > 2));
export function similarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n / (A.size + B.size - n);
}
const firstWords = (s: string, n = 2) => norm(s).split(" ").slice(0, n).join(" ");

export type WeekGrade = { variety: number; findings: Finding[]; scripts: ScriptGrade[]; overall: number };

/**
 * A week of scripts for one clinic, graded together: each script on its own
 * six dimensions, plus the week's variety (and repetition of `history`).
 */
export function gradeWeek(scripts: RubricScript[], history: PastTopic[] = []): WeekGrade {
  const f: Finding[] = [];
  const add = (severity: Severity, code: string, detail: string) => f.push({ dim: "variety", severity, code, detail });
  const repeats = (values: string[], what: string, code: string) => {
    const seen = new Map<string, number>();
    for (const v of values.filter(Boolean)) seen.set(v, (seen.get(v) ?? 0) + 1);
    for (const [v, n] of seen) if (n > 1) add(1, code, `${what} repeated ${n}×: "${v}"`);
  };
  repeats(scripts.map((s) => firstWords(ctaOf(s) ?? "", 3)), "closing line opening", "same_cta");
  repeats(scripts.map((s) => (s.narration ? firstWords(s.narration, 2) : "")), "narration opener", "same_opener");
  repeats(scripts.map((s) => firstWords(hookOf(s), 2)), "hook opening", "same_hook_opening");
  const shapes = scripts.map((s) => hookShape(hookOf(s)));
  const questions = shapes.filter((x) => x === "question").length;
  if (scripts.length >= 3 && questions / scripts.length > 0.6) add(1, "question_hooks", `${questions}/${scripts.length} hooks are plain questions`);
  const services = new Map<string, number>();
  for (const s of scripts) {
    const k = (s.topic.service ?? "").toLowerCase();
    if (k) services.set(k, (services.get(k) ?? 0) + 1);
  }
  for (const [k, n] of services) if (n > 2) add(1, "service_crowding", `${n} videos on "${k}"`);
  for (let i = 0; i < scripts.length; i++)
    for (let j = i + 1; j < scripts.length; j++)
      if (similarity(scripts[i].topic.title, scripts[j].topic.title) >= 0.5)
        add(2, "duplicate_in_week", `"${scripts[i].topic.title}" ≈ "${scripts[j].topic.title}"`);
  for (const s of scripts) {
    const past = history.find(
      (h) => similarity(h.title, s.topic.title) >= 0.5 || (h.question && s.topic.question && similarity(h.question, s.topic.question) >= 0.6) || (h.hook && norm(h.hook) === norm(hookOf(s))),
    );
    if (past) add(2, "repeats_history", `"${s.topic.title}" repeats an earlier video: "${past.title}"`);
  }
  const variety = Math.max(1, 5 - f.reduce((a, x) => a + x.severity, 0));
  const graded = scripts.map(gradeScript);
  const overall = graded.length ? round2(graded.reduce((a, g) => a + (g.overall * 6 + variety) / 7, 0) / graded.length) : 0;
  return { variety, findings: f, scripts: graded, overall };
}

export type CorpusSummary = {
  scripts: number;
  overall: number;
  byDimension: Record<Dimension, number>;
  byLanguage: { language: string; scripts: number; overall: number; byDimension: Record<Dimension, number> }[];
  topFindings: { code: string; count: number }[];
};

/** Grades a corpus grouped into weeks by `weekOf(script)`. */
export function gradeCorpus(scripts: RubricScript[], weekOf: (s: RubricScript) => string = () => "all"): { summary: CorpusSummary; weeks: Map<string, WeekGrade> } {
  const groups = new Map<string, RubricScript[]>();
  for (const s of scripts) groups.set(weekOf(s), [...(groups.get(weekOf(s)) ?? []), s]);
  const weeks = new Map([...groups].map(([k, v]) => [k, gradeWeek(v)]));
  const rows: { language: string; dims: Record<Dimension, number>; findings: Finding[] }[] = [];
  for (const [k, wg] of weeks) {
    const list = groups.get(k)!;
    wg.scripts.forEach((g, i) => rows.push({ language: lang2(list[i].language), dims: { ...g.scores, variety: wg.variety }, findings: [...g.findings, ...wg.findings] }));
  }
  const avgDims = (rs: typeof rows) =>
    Object.fromEntries(DIMENSIONS.map((d) => [d, rs.length ? round2(rs.reduce((a, r) => a + r.dims[d], 0) / rs.length) : 0])) as Record<Dimension, number>;
  const mean = (d: Record<Dimension, number>) => round2(DIMENSIONS.reduce((a, k) => a + d[k], 0) / DIMENSIONS.length);
  const byDimension = avgDims(rows);
  const counts = new Map<string, number>();
  for (const r of rows) for (const x of new Set(r.findings.map((y) => y.code))) counts.set(x, (counts.get(x) ?? 0) + 1);
  return {
    weeks,
    summary: {
      scripts: rows.length,
      overall: mean(byDimension),
      byDimension,
      byLanguage: [...new Set(rows.map((r) => r.language))].map((language) => {
        const rs = rows.filter((r) => r.language === language);
        const d = avgDims(rs);
        return { language, scripts: rs.length, overall: mean(d), byDimension: d };
      }),
      topFindings: [...counts].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count })),
    },
  };
}
