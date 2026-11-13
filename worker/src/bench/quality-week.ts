/**
 * Quality bench: a small real week for a few fixed clinics, scripts and
 * narration through the whole production chain (strategist → hook editor →
 * scene planner → narrator → post-checks → compliance → clinical accuracy →
 * caption → shoot card), with a hard OpenAI spend cap shared across runs.
 *
 *   cd worker && OPENAI_API_KEY=… npx tsx src/bench/quality-week.ts --out DIR
 *        [--only tr,de,en] [--count 3] [--ledger FILE] [--max-usd 3] [--label before]
 *        [--memory titles|full]
 *
 * --ledger is a JSON file that keeps the running total of every bench run
 *   (and of anything else that appends to it, such as the TTS for renders);
 *   no call is made once ledger total + this run reaches --max-usd.
 * --memory says what the clinic's history looks like to produceWeek:
 *   "titles" is what jobs.ts passed before (past titles only), "full" is
 *   title + hook + service + question + week (what it passes now).
 *
 * Writes <out>/week.json (every package, with the deterministic rubric) and
 * <out>/scripts.md (each script as a reviewer reads it). Nothing is rendered;
 * render-week.ts turns chosen packages into MP4s.
 */
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { clinicProfileSchema, type ClinicProfile } from "../dental/profile.js";
import { produceWeek, planText, type VideoPackage } from "../dental/week.js";
import { meterClient, spendCap, usageCost, SpendCapError, type Usage } from "../dental/eval.js";
import { gradeWeek, type RubricScene, type RubricScript } from "../dental/rubric.js";
import { spokenSeconds } from "../dental/style.js";
import type { PastTopic } from "../dental/memory.js";
import { totalSeconds } from "../remotion/scene-plan.js";

export const BENCH_CLINICS: { key: string; profile: ClinicProfile; history: PastTopic[] }[] = [
  {
    key: "tr",
    profile: clinicProfileSchema.parse({
      name: "Boğaziçi İmplant ve Ağız Sağlığı",
      city: "İstanbul",
      country: "TR",
      language: "tr",
      tone: "warm",
      address: "formal",
      services: ["İmplant", "Kemik tozu ve sinüs kaldırma", "Tek seansta implant", "Diş eti tedavisi", "Zirkonyum kaplama"],
      brandColor: "#0E5E6F",
    }),
    history: [
      { title: "İmplant ne kadar dayanır?", hook: "İmplant ömür boyu mu? Pek sayılmaz.", service: "İmplant", question: "İmplant ömür boyu kullanılır mı?", weekOf: "2026-10-26" },
      { title: "İmplanttan sonra ilk 24 saat", hook: "İmplant takıldı, şimdi ne yapmalı?", service: "İmplant", question: "İmplanttan sonra ne yememeliyim?", weekOf: "2026-10-26" },
      { title: "Sinüs kaldırma neden gerekir?", hook: "Üst çenede kemik yetmezse ne olur?", service: "Kemik tozu ve sinüs kaldırma", question: "Sinüs kaldırma ameliyatı neden yapılır?", weekOf: "2026-11-02" },
      { title: "Diş eti kanaması ve implant", hook: "Fırçalarken diş etiniz kanıyor mu?", service: "Diş eti tedavisi", question: "Diş eti kanaması implantı etkiler mi?", weekOf: "2026-11-02" },
      { title: "Zirkonyum kaplama nasıl yapılır?", hook: "Zirkonyum kaplama dişi küçültür mü?", service: "Zirkonyum kaplama", question: "Zirkonyum için diş kesilir mi?", weekOf: "2026-11-09" },
    ],
  },
  {
    key: "de",
    profile: clinicProfileSchema.parse({
      name: "Zahnpraxis am Viktualienmarkt",
      city: "München",
      country: "DE",
      language: "de",
      tone: "expert",
      address: "formal",
      services: ["Professionelle Zahnreinigung", "Aligner-Therapie", "Parodontitis-Prophylaxe", "Kinderprophylaxe", "Bleaching"],
      brandColor: "#2B4C7E",
    }),
    history: [
      { title: "Wie oft zur Professionellen Zahnreinigung?", hook: "Zweimal im Jahr PZR – für alle?", service: "Professionelle Zahnreinigung", question: "Wie oft sollte man eine PZR machen?", weekOf: "2026-10-26" },
      { title: "Aligner 22 Stunden tragen", hook: "Aligner nur nachts tragen? Lieber nicht.", service: "Aligner-Therapie", question: "Wie lange am Tag muss ich Aligner tragen?", weekOf: "2026-10-26" },
      { title: "Zahnfleischbluten und Parodontitis", hook: "Zahnfleischbluten? Bloß nicht die Stelle auslassen.", service: "Parodontitis-Prophylaxe", question: "Ist Zahnfleischbluten ein Zeichen für Parodontitis?", weekOf: "2026-11-02" },
      { title: "Fissurenversiegelung bei Kindern", hook: "Die Backenzähne Ihres Kindes haben tiefe Rillen.", service: "Kinderprophylaxe", question: "Was bringt eine Fissurenversiegelung?", weekOf: "2026-11-09" },
    ],
  },
  {
    key: "en",
    profile: clinicProfileSchema.parse({
      name: "Elm Tree Family Dental",
      city: "Reading",
      country: "GB",
      language: "en",
      tone: "warm",
      address: "informal",
      services: ["Check-ups", "Children's dentistry", "Hygienist appointments", "Fillings", "Emergency appointments"],
      brandColor: "#3E7C59",
    }),
    history: [
      { title: "When should my child first see a dentist?", hook: "First tooth? That's your cue.", service: "Children's dentistry", question: "When should a baby first see the dentist?", weekOf: "2026-10-26" },
      { title: "Spit, don't rinse", hook: "Rinsing after you brush? Not so fast.", service: "Hygienist appointments", question: "Should I rinse after brushing?", weekOf: "2026-11-02" },
      { title: "What to do with a knocked-out tooth", hook: "A tooth just got knocked out. Now what?", service: "Emergency appointments", question: "What do I do if a tooth is knocked out?", weekOf: "2026-11-09" },
    ],
  },
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

type Ledger = { totalUsd: number; entries: { when: string; what: string; usd: number; usage?: Usage }[] };

export async function readLedger(file: string): Promise<Ledger> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as Ledger;
  } catch {
    return { totalUsd: 0, entries: [] };
  }
}

export async function addToLedger(file: string, what: string, usd: number, usage?: Usage): Promise<Ledger> {
  const l = await readLedger(file);
  l.entries.push({ when: new Date().toISOString(), what, usd: Math.round(usd * 10000) / 10000, usage });
  l.totalUsd = Math.round(l.entries.reduce((s, e) => s + e.usd, 0) * 10000) / 10000;
  await fs.writeFile(file, JSON.stringify(l, null, 2));
  return l;
}

export function rubricScript(profile: ClinicProfile, pkg: Extract<VideoPackage, { status: "ready" }>): RubricScript {
  return {
    id: `${profile.language}-${pkg.topic.title}`.slice(0, 80),
    language: profile.language,
    country: profile.country,
    address: profile.address,
    topic: { title: pkg.topic.title, hook: pkg.topic.hook, service: pkg.topic.service, pillar: pkg.topic.pillar, question: pkg.topic.question },
    scenes: pkg.plan.scenes as unknown as RubricScene[],
    narration: pkg.plan.voiceover?.text ?? null,
    caption: pkg.copy.caption,
    clinic: profile.name,
  };
}

function scriptMarkdown(profile: ClinicProfile, pkgs: VideoPackage[], notes: Map<string, string[]>): string {
  const out: string[] = [`# ${profile.name} (${profile.country}, ${profile.language})`, ""];
  for (const p of pkgs) {
    out.push(`## ${p.topic.title} — ${p.status}`);
    out.push(`- service: ${p.topic.service} · pillar: ${p.topic.pillar}`);
    out.push(`- question: ${p.topic.question}`);
    out.push(`- takeaway: ${p.topic.takeaway ?? "(none)"}`);
    out.push(`- planned hook: ${p.topic.hook}`);
    const n = notes.get(p.topic.title) ?? [];
    if (n.length) out.push(`- rewrites: ${n.length}`, ...n.map((x) => `  - ${x.slice(0, 300)}`));
    if (p.status === "rejected") {
      out.push(`- rejected at ${p.stage}: ${[...p.reasons, p.error ?? ""].filter(Boolean).join(" | ")}`, "");
      continue;
    }
    out.push(`- plan seconds: ${totalSeconds(p.plan)} · spoken estimate: ${spokenSeconds(p.plan.voiceover?.text ?? "", profile.language)} s`, "");
    out.push("**Screen**", "```", planText({ ...p.plan, voiceover: undefined }), "```");
    out.push("**Narration**", "", p.plan.voiceover?.text ?? "(none)", "");
    out.push("**Caption**", "", p.copy.caption, "");
  }
  return out.join("\n");
}

async function main() {
  const out = path.resolve(arg("out") ?? "quality-week");
  const only = arg("only")?.split(",");
  const count = Number(arg("count") ?? 3);
  const ledgerFile = path.resolve(arg("ledger") ?? path.join(out, "..", "ledger.json"));
  const maxUsd = Number(arg("max-usd") ?? 3);
  const label = arg("label") ?? "run";
  const memory = (arg("memory") ?? "full") as "titles" | "full";
  const today = new Date(arg("today") ?? "2026-11-16T08:00:00Z");

  const spent = (await readLedger(ledgerFile)).totalUsd;
  const room = maxUsd - spent;
  if (room <= 0.05) throw new Error(`ledger already at $${spent} of $${maxUsd} — not starting`);
  console.log(`ledger: $${spent} spent, this run may use up to $${room.toFixed(2)}`);

  const usage: Usage = {};
  const cap = spendCap(room, usage);
  const fetchOpt = { fetch: globalThis.fetch as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>["fetch"] };
  const client = meterClient(new OpenAI(fetchOpt), usage, (m) => cap.check(m));
  await fs.mkdir(out, { recursive: true });

  const clinics = BENCH_CLINICS.filter((c) => !only || only.includes(c.key));
  const result: Record<string, unknown> = {};
  try {
    await Promise.all(
      clinics.map(async (c) => {
        const notes = new Map<string, string[]>();
        const log = (msg: string, extra?: Record<string, unknown>) => {
          const t = String(extra?.topic ?? "");
          if (extra?.problems || (extra?.verdict && extra.verdict !== "pass")) {
            const list = notes.get(t) ?? [];
            list.push(`${msg}: ${JSON.stringify(extra.problems ?? extra.fixes ?? extra.verdict)}`);
            notes.set(t, list);
          }
        };
        const opts =
          memory === "full"
            ? { count, history: c.history, today }
            : { count, avoidTitles: c.history.map((h) => h.title), today };
        let pkgs: VideoPackage[] = [];
        try {
          pkgs = await produceWeek({ client, log }, c.profile, opts);
        } catch (e) {
          if (!(e instanceof SpendCapError)) throw e;
          console.error(`${c.key}: spend cap reached`);
        }
        const ready = pkgs.filter((p): p is Extract<VideoPackage, { status: "ready" }> => p.status === "ready");
        const grade = gradeWeek(ready.map((p) => rubricScript(c.profile, p)), c.history);
        result[c.key] = { profile: c.profile, history: c.history, packages: pkgs, notes: Object.fromEntries(notes), rubric: grade };
        await fs.writeFile(path.join(out, `${c.key}.md`), scriptMarkdown(c.profile, pkgs, notes));
        console.log(`${c.key}: ${ready.length} ready of ${pkgs.length}; rubric ${grade.overall} (variety ${grade.variety})`);
      }),
    );
  } finally {
    const usd = usageCost(usage) ?? 0;
    const ledger = await addToLedger(ledgerFile, `quality-week ${label} (${clinics.map((c) => c.key).join(",")})`, usd, usage);
    await fs.writeFile(path.join(out, "week.json"), JSON.stringify({ label, memory, usage, usd, result }, null, 2));
    console.log(`this run: $${usd.toFixed(4)} · ledger total: $${ledger.totalUsd}`);
    console.log(JSON.stringify(usage));
  }
}

if (process.argv[1] && /quality-week\.(ts|js)$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
