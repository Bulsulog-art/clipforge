/**
 * The agents' report card.
 *
 *   npx tsx src/dental/eval.ts [--per 4] [--out ./dental-eval] [--only tr,de]
 *
 * A fixed panel of clinics (four countries, four languages, different tones
 * and forms of address) is run through the whole agent chain without
 * rendering, and the result is measured the same way every time:
 *
 *   ready rate        how many planned topics survive both reviewers
 *   first-pass rate   how many pass without a rewrite (rewrites cost money
 *                     and usually mean the writer misread the brief)
 *   hook score        a judge watching as a patient scrolling a feed: would
 *                     they stop, and is the question left open (1-5)
 *   voice score       does the narration sound like a dentist talking in
 *                     that language, or like a translated leaflet (1-5)
 *   spread            distinct services covered by the ready videos
 *
 * The point is to change a prompt and see the numbers move, instead of
 * reading three outputs and deciding it "feels better". Results land in
 * <out>/report.md and <out>/eval.json, one row per video, with the reasons
 * for every rewrite and rejection.
 */
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
import { clinicProfileSchema, type ClinicProfile } from "./profile.js";
import { planWeek, type Topic } from "./strategist.js";
import { planText, produceVideo, type VideoPackage } from "./week.js";

export const PANEL: ClinicProfile[] = [
  { name: "Gülüş Ağız ve Diş Sağlığı", city: "İzmir", country: "TR", language: "tr", tone: "warm", address: "formal",
    services: ["Diş taşı temizliği", "Diş beyazlatma", "İmplant", "Kanal tedavisi", "Çocuk diş hekimliği"] },
  { name: "Zahnpraxis am Isartor", city: "München", country: "DE", language: "de", tone: "expert", address: "formal",
    services: ["Professionelle Zahnreinigung", "Implantate", "Bleaching", "Wurzelbehandlung", "Aligner"] },
  { name: "Clínica Dental Retiro", city: "Madrid", country: "ES", language: "es", tone: "calm", address: "informal",
    services: ["Limpieza dental", "Blanqueamiento", "Implantes", "Ortodoncia invisible", "Endodoncia"] },
  { name: "Barton Creek Family Dental", city: "Austin", country: "US", language: "en", tone: "playful", address: "informal",
    services: ["Cleanings", "Teeth whitening", "Clear aligners", "Children's dentistry", "Dental implants"] },
].map((p) => clinicProfileSchema.parse(p));

const judgeSchema = z.object({
  hook: z.number().int().min(1).max(5),
  hookWhy: z.string(),
  voice: z.number().int().min(1).max(5),
  voiceWhy: z.string(),
});

/** One independent judge, deliberately not the writer's model or prompt. */
export async function judge(client: OpenAI, profile: ClinicProfile, hook: string, narration: string) {
  return agentJson(client, {
    model: REVIEW_MODEL,
    temperature: 0,
    system: `You judge short dental-education videos for a clinic's Instagram/TikTok, as a native ${profile.language} speaker.
Score strictly; 3 is "fine, forgettable", 5 is rare.
hook (1-5): you are a patient scrolling a feed. Would this first line make you stop? 5 = specific, surprising or relatable, leaves a question open. 1 = textbook label or gives the whole answer away.
voice (1-5): does the narration sound like a real dentist talking to one patient in natural ${profile.language}? 5 = natural, varied, warm. 1 = stiff, translated, repetitive, list read aloud.
Return JSON: { "hook", "hookWhy", "voice", "voiceWhy" } — reasons in English, one sentence each.`,
    user: `Hook: ${hook}\n\nNarration: ${narration}`,
    schema: judgeSchema,
  });
}

export type EvalRow = {
  clinic: string;
  language: string;
  topic: string;
  service: string;
  status: "ready" | "rejected";
  stage?: string;
  /** Rewrites asked for before the script passed (0 = first pass). */
  rewrites: number;
  /** Why each rewrite or the rejection happened. */
  notes: string[];
  hook?: string;
  hookScore?: number;
  hookWhy?: string;
  voiceScore?: number;
  voiceWhy?: string;
};

export function summarise(rows: EvalRow[]) {
  const ready = rows.filter((r) => r.status === "ready");
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0);
  const byLang = [...new Set(rows.map((r) => r.language))].map((language) => {
    const rs = rows.filter((r) => r.language === language);
    const ok = rs.filter((r) => r.status === "ready");
    return {
      language,
      readyRate: avg(rs.map((r) => (r.status === "ready" ? 1 : 0))),
      firstPass: avg(rs.map((r) => (r.status === "ready" && r.rewrites === 0 ? 1 : 0))),
      hook: avg(ok.map((r) => r.hookScore ?? 0)),
      voice: avg(ok.map((r) => r.voiceScore ?? 0)),
      services: new Set(ok.map((r) => r.service.toLowerCase())).size,
      videos: rs.length,
    };
  });
  return {
    videos: rows.length,
    readyRate: avg(rows.map((r) => (r.status === "ready" ? 1 : 0))),
    firstPass: avg(rows.map((r) => (r.status === "ready" && r.rewrites === 0 ? 1 : 0))),
    hook: avg(ready.map((r) => r.hookScore ?? 0)),
    voice: avg(ready.map((r) => r.voiceScore ?? 0)),
    byLang,
  };
}

export function reportMarkdown(rows: EvalRow[], s: ReturnType<typeof summarise>, when: string): string {
  const lines = [
    `# DentVideo agent eval — ${when}`,
    "",
    `**${s.videos} videos** · ready ${pct(s.readyRate)} · first pass ${pct(s.firstPass)} · hook ${s.hook}/5 · voice ${s.voice}/5`,
    "",
    "| Language | Ready | First pass | Hook | Voice | Services | Videos |",
    "|---|---|---|---|---|---|---|",
    ...s.byLang.map((l) => `| ${l.language} | ${pct(l.readyRate)} | ${pct(l.firstPass)} | ${l.hook} | ${l.voice} | ${l.services} | ${l.videos} |`),
    "",
    "## Videos",
    "",
  ];
  for (const r of rows) {
    lines.push(`### [${r.status}${r.stage ? `:${r.stage}` : ""}] ${r.language} · ${r.topic}`);
    if (r.hook) lines.push(`- Hook (${r.hookScore}/5): ${r.hook} — ${r.hookWhy}`);
    if (r.voiceScore) lines.push(`- Voice ${r.voiceScore}/5 — ${r.voiceWhy}`);
    lines.push(`- Rewrites: ${r.rewrites}`);
    for (const n of r.notes.slice(0, 6)) lines.push(`  - ${n}`);
    lines.push("");
  }
  return lines.join("\n");
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

async function evalClinic(client: OpenAI, profile: ClinicProfile, per: number): Promise<EvalRow[]> {
  const topics = await planWeek(client, profile, { count: per });
  const rows: EvalRow[] = [];
  for (const topic of topics) {
    const notes: string[] = [];
    let rewrites = 0;
    const log = (msg: string, extra?: Record<string, unknown>) => {
      if (!msg.startsWith("script")) return;
      if (extra?.verdict === "revise" || extra?.problems) {
        rewrites++;
        notes.push(`${msg}: ${JSON.stringify(extra.problems ?? extra.fixes ?? extra.verdict)}`);
      }
    };
    let pkg: VideoPackage;
    try {
      pkg = await produceVideo({ client, log }, profile, topic);
    } catch (err) {
      rows.push(base(profile, topic, { status: "rejected", stage: "error", rewrites, notes: [...notes, (err as Error).message] }));
      continue;
    }
    if (pkg.status === "rejected") {
      rows.push(base(profile, topic, { status: "rejected", stage: pkg.stage, rewrites, notes: [...notes, ...pkg.reasons] }));
      continue;
    }
    const hookScene = pkg.plan.scenes.find((s) => s.kind === "hook");
    const hook = hookScene && "text" in hookScene ? hookScene.text : topic.hook;
    const verdict = await judge(client, profile, hook, pkg.plan.voiceover?.text ?? planText(pkg.plan));
    rows.push(
      base(profile, topic, {
        status: "ready",
        rewrites,
        notes,
        hook,
        hookScore: verdict.hook,
        hookWhy: verdict.hookWhy,
        voiceScore: verdict.voice,
        voiceWhy: verdict.voiceWhy,
      }),
    );
  }
  return rows;
}

function base(profile: ClinicProfile, topic: Topic, rest: Omit<EvalRow, "clinic" | "language" | "topic" | "service">): EvalRow {
  return { clinic: profile.name, language: profile.language, topic: topic.title, service: topic.service, ...rest };
}

async function main() {
  const arg = (n: string) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const per = Number(arg("per") ?? 4);
  const out = path.resolve(arg("out") ?? "dental-eval");
  const only = arg("only")?.split(",");
  const client = new OpenAI({ fetch: globalThis.fetch as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>["fetch"] });
  const panel = PANEL.filter((p) => !only || only.includes(p.language));

  // Clinics run in parallel; each clinic's videos run in order, as in production.
  const rows = (await Promise.all(panel.map((p) => evalClinic(client, p, per)))).flat();
  const s = summarise(rows);
  const when = new Date().toISOString().slice(0, 16).replace("T", " ");
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, "eval.json"), JSON.stringify({ when, summary: s, rows }, null, 2));
  await fs.writeFile(path.join(out, "report.md"), reportMarkdown(rows, s, when));
  console.log(reportMarkdown(rows, s, when).split("## Videos")[0]);
}

if (process.argv[1] && /eval\.(ts|js|mts)$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
