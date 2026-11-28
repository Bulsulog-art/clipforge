/**
 * Value bench: one realistic week for three clinics in three markets, read the
 * way the clinic owner reads it — would a dentist proudly post this?
 *
 *   cd worker && ANTHROPIC_API_KEY=… OPENAI_API_KEY=… npx tsx src/bench/value-week.ts --out DIR
 *        [--only tr,de,us] [--count 3] [--render 1] [--ledger FILE] [--max-usd 3] [--label before]
 *
 * Clinics: a general practice in İzmir (TR, formal, information-only market),
 * a family practice in München (DE, Sie) and a family practice in Austin,
 * Texas (US, informal). Each has a few weeks of made-up history. The week is
 * planned for Monday 16 November 2026, with real patient searches (Google
 * suggestions, as the weekly job uses them) when the network allows.
 *
 * --render N renders the first N ready videos of each clinic with the
 * production render path (mastered narration, library backgrounds, the
 * clinic's colour and a generated logo) and writes a contact sheet of frames
 * next to each video. TTS is metered by characters and added to the ledger.
 *
 * Writes <out>/<clinic>.md (topics, screen, narration, footage, backgrounds,
 * Instagram and Shorts post text as the clinic would paste them) and
 * <out>/week.json.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type OpenAI from "openai";
import { textClient } from "../lib/text-llm.js";
import { clinicProfileSchema, type ClinicProfile } from "../dental/profile.js";
import { produceWeek, planText, type VideoPackage } from "../dental/week.js";
import { meterClient, spendCap, usageCost, SpendCapError, type Usage } from "../dental/eval.js";
import { gradeWeek } from "../dental/rubric.js";
import { spokenSeconds } from "../dental/style.js";
import type { PastTopic } from "../dental/memory.js";
import { patientSearches } from "../dental/questions.js";
import { prepareNarration } from "../dental/narration-audio.js";
import { resolveVoice } from "../dental/voice.js";
import { analyseLogo, logoStyleOf } from "../dental/logo.js";
import { buildPostKit } from "../dentvid/post-kit.js";
import { renderPlan } from "../remotion/render-plan.js";
import { totalSeconds } from "../remotion/scene-plan.js";
import { addToLedger, readLedger, rubricScript } from "./quality-week.js";

const run = promisify(execFile);

export const VALUE_CLINICS: { key: string; profile: ClinicProfile; history: PastTopic[]; initials: string }[] = [
  {
    key: "tr",
    initials: "KD",
    profile: clinicProfileSchema.parse({
      name: "Körfez Diş Polikliniği",
      city: "İzmir",
      country: "TR",
      language: "tr",
      tone: "warm",
      address: "formal",
      services: ["Diş taşı temizliği", "Diş beyazlatma", "İmplant", "Kanal tedavisi", "Çocuk diş hekimliği", "Şeffaf plak tedavisi"],
      brandColor: "#0A6E8A",
      handle: "korfezdis",
    }),
    history: [
      { title: "Diş taşı temizliği dişe zarar verir mi?", hook: "Diş taşı temizliği mineyi aşındırır mı? Pek sayılmaz.", service: "Diş taşı temizliği", question: "Diş taşı temizliği zararlı mı?", weekOf: "2026-10-26" },
      { title: "İmplant sonrası ilk gün", hook: "İmplanttan sonraki ilk akşam neye dikkat edilir?", service: "İmplant", question: "İmplant sonrası ne yenir?", weekOf: "2026-11-02" },
      { title: "Şeffaf plak günde kaç saat takılır?", hook: "Plağı sadece geceleri takmak yeter mi?", service: "Şeffaf plak tedavisi", question: "Şeffaf plak kaç saat takılmalı?", weekOf: "2026-11-09" },
    ],
  },
  {
    key: "de",
    initials: "IZ",
    profile: clinicProfileSchema.parse({
      name: "Zahnarztpraxis Isartal",
      city: "München",
      country: "DE",
      language: "de",
      tone: "calm",
      address: "formal",
      services: ["Professionelle Zahnreinigung", "Kinderzahnheilkunde", "Füllungen", "Implantate", "Bleaching", "Behandlung von Angstpatienten"],
      brandColor: "#1F4E5F",
      handle: "zahnarzt.isartal",
    }),
    history: [
      { title: "Wie oft zur PZR?", hook: "Zweimal im Jahr PZR – muss das sein?", service: "Professionelle Zahnreinigung", question: "Wie oft sollte man eine PZR machen?", weekOf: "2026-10-26" },
      { title: "Angst vor dem Zahnarzt", hook: "Herzklopfen schon im Wartezimmer?", service: "Behandlung von Angstpatienten", question: "Was hilft gegen Zahnarztangst?", weekOf: "2026-11-02" },
      { title: "Kunststofffüllung oder Amalgam?", hook: "Amalgam ist seit 2025 Geschichte – und jetzt?", service: "Füllungen", question: "Welche Füllung bekommt man statt Amalgam?", weekOf: "2026-11-09" },
    ],
  },
  {
    key: "us",
    initials: "LO",
    profile: clinicProfileSchema.parse({
      name: "Live Oak Family Dentistry",
      city: "Austin",
      country: "US",
      language: "en",
      tone: "warm",
      address: "informal",
      services: ["Cleanings and exams", "Kids' dentistry", "Clear aligners", "Teeth whitening", "Emergency dental care", "Fillings and crowns"],
      brandColor: "#B5532E",
      handle: "liveoakfamilydental",
      bookingUrl: "https://example.com/book",
    }),
    history: [
      { title: "Halloween candy: timing beats amount", hook: "That bowl of Halloween candy on the counter…", service: "Kids' dentistry", question: "Is Halloween candy bad for kids' teeth?", weekOf: "2026-10-26" },
      { title: "Why your gums bleed when you floss", hook: "Pink in the sink when you floss?", service: "Cleanings and exams", question: "Why do my gums bleed when I floss?", weekOf: "2026-11-02" },
      { title: "Whitening strips and sensitivity", hook: "Whitening strips made your teeth zing?", service: "Teeth whitening", question: "Why do whitening strips make teeth sensitive?", weekOf: "2026-11-09" },
    ],
  },
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

/** tts-1-hd: $30 per million characters; gpt-4o-mini-tts is billed per token, ~$15/M characters is a safe ceiling. */
const TTS_USD_PER_CHAR: Record<string, number> = { "tts-1-hd": 30e-6, "tts-1": 15e-6, "gpt-4o-mini-tts": 15e-6 };

type Ready = Extract<VideoPackage, { status: "ready" }>;

function markdown(c: (typeof VALUE_CLINICS)[number], pkgs: VideoPackage[], searches: string[]): string {
  const p = c.profile;
  const out: string[] = [`# ${p.name} — ${p.city}, ${p.country} (${p.language}, ${p.address})`, "", `Services: ${p.services.join(", ")}`, ""];
  out.push(`Patient searches given to the strategist (${searches.length}): ${searches.slice(0, 30).join(" | ") || "(none)"}`, "");
  for (const pkg of pkgs) {
    out.push(`## ${pkg.topic.title} — ${pkg.status}`);
    out.push(`- service: ${pkg.topic.service} · pillar: ${pkg.topic.pillar}`);
    out.push(`- question: ${pkg.topic.question}`);
    out.push(`- takeaway: ${pkg.topic.takeaway ?? "(none)"}`);
    out.push(`- hook: ${pkg.topic.hook}`);
    if (pkg.status === "rejected") {
      out.push(`- rejected at ${pkg.stage}: ${[...pkg.reasons, pkg.error ?? ""].filter(Boolean).join(" | ")}`, "");
      continue;
    }
    const footage = pkg.plan.scenes.filter((s) => s.kind === "footage").map((s) => (s.source.type === "stock" ? s.source.query : s.source.type));
    out.push(`- seconds: plan ${totalSeconds(pkg.plan)} · spoken estimate ${spokenSeconds(pkg.plan.voiceover?.text ?? "", p.language)} · voice ${pkg.plan.voiceover?.voice ?? "-"}`);
    out.push(`- footage: ${footage.join(", ") || "-"} · backgrounds: ${(pkg.plan.backgrounds ?? []).map((b) => path.basename(b)).join(", ") || "-"}`);
    if (pkg.plan.disclaimer) out.push(`- on-screen notice: ${pkg.plan.disclaimer}`);
    if (pkg.videoPath) out.push(`- video: ${pkg.videoPath}`);
    out.push("", "**Screen**", "```", planText({ ...pkg.plan, voiceover: undefined }), "```");
    out.push("**Narration**", "", pkg.plan.voiceover?.text ?? "(none)", "");
    const kit = buildPostKit(pkg.copy, p);
    out.push("**Instagram**", "```", kit.instagram, "```", "**Shorts / TikTok**", "```", kit.short, "```", "");
  }
  return out.join("\n");
}

/** A plain round logo with the clinic's initials in its colour, as a clinic might upload. */
async function makeLogo(dir: string, initials: string, colour: string): Promise<string> {
  const file = path.join(dir, "logo.png");
  await run("convert", [
    "-size", "400x400", "xc:none", "-fill", `#${colour}`, "-draw", "circle 200,200 200,10",
    "-fill", "white", "-font", "DejaVu-Sans-Bold", "-pointsize", "150", "-gravity", "center", "-annotate", "+0+0", initials, file,
  ]);
  return file;
}

/** One frame every ~2.5 s, tiled, so the whole video can be read at a glance. */
async function contactSheet(video: string, out: string): Promise<void> {
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-vf", "fps=0.4,scale=270:-1,tile=6x2", "-frames:v", "1", out]);
}

async function main() {
  const out = path.resolve(arg("out") ?? "value-week");
  const only = arg("only")?.split(",");
  const count = Number(arg("count") ?? 3);
  const renderN = Number(arg("render") ?? 0);
  const ledgerFile = path.resolve(arg("ledger") ?? path.join(out, "..", "ledger.json"));
  const maxUsd = Number(arg("max-usd") ?? 3);
  const label = arg("label") ?? "run";
  const today = new Date(arg("today") ?? "2026-11-16T08:00:00Z");

  const spent = (await readLedger(ledgerFile)).totalUsd;
  const room = maxUsd - spent;
  if (room <= 0.05) throw new Error(`ledger already at $${spent} of $${maxUsd} — not starting`);
  console.log(`ledger: $${spent} spent, this run may use up to $${room.toFixed(2)}`);

  const usage: Usage = {};
  const cap = spendCap(room, usage);
  const fetchOpt = { fetch: globalThis.fetch };
  const client = meterClient(textClient(fetchOpt), usage, (m) => cap.check(m));
  await fs.mkdir(out, { recursive: true });
  let ttsUsd = 0;

  const clinics = VALUE_CLINICS.filter((c) => !only || only.includes(c.key));
  const result: Record<string, unknown> = {};
  try {
    await Promise.all(
      clinics.map(async (c) => {
        const dir = path.join(out, c.key);
        await fs.mkdir(dir, { recursive: true });
        const logo = renderN ? await makeLogo(dir, c.initials, c.profile.brandColor ?? "0A6E8A") : undefined;
        const logoStyle = logo ? logoStyleOf(await analyseLogo(logo)) : undefined;
        const notes: { msg: string; extra?: Record<string, unknown> }[] = [];
        let searches: string[] = [];
        let rendered = 0;
        let pkgs: VideoPackage[] = [];
        try {
          pkgs = await produceWeek(
            {
              client,
              log: (msg, extra) => notes.push({ msg, extra }),
              searches: async (p) => (searches = await patientSearches(p.services, p.language, p.country)),
              render: renderN
                ? async (plan, topic) => {
                    if (rendered >= renderN) return "";
                    rendered++;
                    const vdir = path.join(dir, `v${rendered}`);
                    await fs.mkdir(vdir, { recursive: true });
                    const voiceCfg = resolveVoice(c.profile.language, process.env, c.profile.country);
                    const voice = await prepareNarration(plan, vdir, c.profile.language, voiceCfg);
                    ttsUsd += (plan.voiceover?.text.length ?? 0) * (TTS_USD_PER_CHAR[voice.voiceModel ?? voiceCfg.model] ?? 30e-6);
                    await fs.writeFile(path.join(vdir, "render-plan.json"), JSON.stringify(voice.plan, null, 2));
                    const res = await renderPlan({
                      plan: voice.plan,
                      voiceoverSrc: voice.voiceoverPath,
                      workDir: vdir,
                      outputPath: path.join(vdir, "video.mp4"),
                      pexelsApiKey: process.env.PEXELS_API_KEY,
                      logoSrc: logo,
                      logoStyle,
                      onWarn: (m) => console.warn(`  ! ${c.key}: ${m}`),
                    });
                    await contactSheet(res.outputPath, path.join(vdir, "frames.png")).catch((e) => console.warn(`  ! frames: ${(e as Error).message}`));
                    console.log(`${c.key}: rendered "${topic.title}" (${res.durationSec.toFixed(1)} s, voice ${voice.voiceModel ?? "?"}, ${voice.voiceSeconds?.toFixed(1) ?? "?"} s spoken)`);
                    return res.outputPath;
                  }
                : undefined,
            },
            c.profile,
            { count, history: c.history, today },
          );
        } catch (e) {
          if (!(e instanceof SpendCapError)) throw e;
          console.error(`${c.key}: spend cap reached`);
        }
        const ready = pkgs.filter((p): p is Ready => p.status === "ready");
        const grade = gradeWeek(ready.map((p) => rubricScript(c.profile, p)), c.history);
        result[c.key] = { profile: c.profile, history: c.history, searches, packages: pkgs, notes, rubric: grade };
        await fs.writeFile(path.join(out, `${c.key}.md`), markdown(c, pkgs, searches));
        console.log(`${c.key}: ${ready.length} ready of ${pkgs.length}; rubric ${grade.overall} (variety ${grade.variety})`);
      }),
    );
  } finally {
    const usd = (usageCost(usage) ?? 0) + ttsUsd;
    const ledger = await addToLedger(ledgerFile, `value-week ${label} (${clinics.map((c) => c.key).join(",")})`, usd, usage);
    await fs.writeFile(path.join(out, "week.json"), JSON.stringify({ label, usage, ttsUsd, usd, result }, null, 2));
    console.log(`this run: $${usd.toFixed(4)} (tts $${ttsUsd.toFixed(4)}) · ledger total: $${ledger.totalUsd}`);
  }
}

if (process.argv[1] && /value-week\.(ts|js)$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
