/**
 * Run the dental agents end to end from the command line.
 *
 *   npx tsx src/dental/cli.ts <profile.json> [--count 5] [--render] [--out ./dental-out]
 *   npx tsx src/dental/cli.ts <profile.json> --recording dentist.mp4 [--count 3] [--out dir]
 *   npx tsx src/dental/cli.ts <profile.json> --topics topics.json --render [--out dir] [--logo logo.png]
 *
 * --topics: a JSON array of topics (strategist.ts topicSchema) made instead of
 * the strategist's plan — how the sample videos are re-rendered
 * (docs/PREVIEW_RERENDER.md). Each still gets the hook editor, the writers and
 * every review.
 * --logo: the clinic's logo (PNG/JPEG/WebP), drawn as a week job draws it
 * (top corner, and large on the sign-off), so samples look like a paying
 * clinic's videos.
 *
 * --max-usd: stop making chat calls once the metered spend reaches this many
 * dollars (eval.ts spendCap). Every run prints what it spent (chat tokens at
 * eval.ts PRICES, plus the narration at a per-character ceiling).
 *
 * Needs ANTHROPIC_API_KEY for the text (or LLM_PROVIDER=openai) and
 * OPENAI_API_KEY for the narration; --render also needs the Remotion browser (present in
 * the worker image) and uses PEXELS_API_KEY for stock footage when set.
 * Writes one folder per video: plan.json, caption.txt, checks.json and,
 * with --render, video.mp4, the mastered narration (voiceover.master.wav)
 * and the plan exactly as rendered (render-plan.json: timed to the mastered
 * voice, cuts snapped to its pauses) — plus week.json with every package,
 * rejected ones included with their reasons.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type OpenAI from "openai";
import { textClient } from "../lib/text-llm.js";
import { z } from "zod";
import { clinicProfileSchema } from "./profile.js";
import { topicSchema } from "./strategist.js";
import { produceWeek } from "./week.js";
import { clipsFromRecording } from "./recording.js";
import { renderPlan } from "../remotion/render-plan.js";
import { prepareNarration } from "./narration-audio.js";
import { narratorOf, resolveVoice } from "./voice.js";
import { ttsCostUsd } from "./elevenlabs.js";
import { readyLogo, logoStyleOf } from "./logo.js";
import { meterClient, spendCap, usageCost, type Usage } from "./eval.js";

/** tts-1-hd is $30 per million characters; gpt-4o-mini-tts (billed per token) stays under $15/M. */
const TTS_USD_PER_CHAR: Record<string, number> = { "tts-1-hd": 30e-6, "tts-1": 15e-6, "gpt-4o-mini-tts": 15e-6 };

// Node's built-in fetch, not the SDK's bundled node-fetch: the built-in one
// honours HTTPS_PROXY (with NODE_USE_ENV_PROXY=1), so the CLI runs behind a
// proxy as well as directly.
const usage: Usage = {};
let ttsUsd = 0;
/** The text client (Claude by default, lib/text-llm.ts), metered and capped by --max-usd. */
function openaiClient(): OpenAI {
  const client = textClient({ fetch: globalThis.fetch });
  const maxUsd = Number(arg("max-usd") ?? Infinity);
  const cap = spendCap(maxUsd, usage);
  return meterClient(client, usage, Number.isFinite(maxUsd) ? (m) => cap.check(m) : undefined);
}

function spendLine(): string {
  const chat = usageCost(usage);
  const calls = Object.values(usage).reduce((n, u) => n + u.calls, 0);
  return `spend: chat ${chat === undefined ? "unknown (model without a price)" : `$${chat.toFixed(4)}`} in ${calls} calls, narration ~$${ttsUsd.toFixed(4)}`;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const slug = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60);

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error("usage: tsx src/dental/cli.ts <profile.json> [--count 5] [--render] [--out dir]");
    process.exit(2);
  }
  const profile = clinicProfileSchema.parse(JSON.parse(await fs.readFile(file, "utf8")));
  const outDir = path.resolve(arg("out") ?? "dental-out");
  const doRender = process.argv.includes("--render");
  await fs.mkdir(outDir, { recursive: true });

  const topicsFile = arg("topics");
  const topics = topicsFile ? z.array(topicSchema).min(1).parse(JSON.parse(await fs.readFile(topicsFile, "utf8"))) : undefined;

  const recording = arg("recording");
  if (recording) {
    // The dentist's own video → reviewed, captioned clips.
    const clips = await clipsFromRecording(
      { client: openaiClient(), workDir: outDir, render: true, log: (msg, extra) => console.log(`· ${msg}`, extra ?? "") },
      profile,
      path.resolve(recording),
      undefined,
      { maxClips: Number(arg("count") ?? 3) },
    );
    await fs.writeFile(path.join(outDir, "clips.json"), JSON.stringify(clips, null, 2));
    for (const c of clips) {
      console.log(
        `\n[${c.status}] ${c.moment.start.toFixed(1)}–${c.moment.end.toFixed(1)}s  ${c.moment.hook}` +
          (c.findings.length ? `\n  needs attention: ${c.findings.join(" | ")}` : "") +
          `\n  ${c.videoPath ?? ""}`,
      );
    }
    return;
  }

  const logoArg = arg("logo");
  const logo = logoArg ? await readyLogo(new Uint8Array(await fs.readFile(path.resolve(logoArg))), outDir) : undefined;
  if (logo && !logo.ok) console.warn(`  ! logo not used: ${logo.reason}`);
  const logoSrc = logo?.ok ? logo.file : undefined;
  const logoStyle = logo?.ok ? logoStyleOf(logo.analysis) : undefined;

  const week = await produceWeek(
    {
      // Node's built-in fetch, not the SDK's bundled node-fetch: the built-in
      // one honours HTTPS_PROXY (with NODE_USE_ENV_PROXY=1), so the CLI runs
      // behind a proxy as well as directly.
      client: openaiClient(),
      log: (msg, extra) => console.log(`· ${msg}`, extra ?? ""),
      render: doRender
        ? async (plan, topic) => {
            const dir = path.join(outDir, slug(topic.title));
            await fs.mkdir(dir, { recursive: true });
            const voiceCfg = resolveVoice(profile.language, process.env, profile.country, narratorOf(profile));
            const voice = await prepareNarration(plan, dir, profile.language, {
              ...voiceCfg,
              onFallback: (e) => console.warn(`  ! tts model failed, used tts-1-hd: ${e.message}`),
              onProviderFallback: (e) => console.warn(`  ! elevenlabs failed, narrated with openai: ${e.message}`),
              onMasterError: (e) => console.warn(`  ! narration mastering failed, used the plain voice: ${e.message}`),
            });
            // Priced by the provider and model that actually spoke.
            const chars = voice.ttsChars ?? plan.voiceover?.text.length ?? 0;
            ttsUsd += voice.ttsProvider === "elevenlabs" ? ttsCostUsd(chars, "elevenlabs") : chars * (TTS_USD_PER_CHAR[voice.voiceModel ?? voiceCfg.model] ?? 30e-6);
            // The plan as rendered (timed to the mastered voice, cuts on its pauses):
            // the preview library replays it scene for scene (build-dentvideo-preview.mts).
            await fs.writeFile(path.join(dir, "render-plan.json"), JSON.stringify(voice.plan, null, 2));
            const res = await renderPlan({
              plan: voice.plan,
              voiceoverSrc: voice.voiceoverPath,
              workDir: dir,
              outputPath: path.join(dir, "video.mp4"),
              pexelsApiKey: process.env.PEXELS_API_KEY,
              logoSrc,
              logoStyle,
              assetRoots: [outDir],
              onWarn: (m) => console.warn(`  ! ${m}`),
            });
            return res.outputPath;
          }
        : undefined,
    },
    profile,
    { count: Number(arg("count") ?? topics?.length ?? 5), ...(topics ? { topics } : {}) },
  );

  for (const pkg of week) {
    const dir = path.join(outDir, slug(pkg.topic.title));
    await fs.mkdir(dir, { recursive: true });
    if (pkg.status === "ready") {
      await fs.writeFile(path.join(dir, "plan.json"), JSON.stringify(pkg.plan, null, 2));
      await fs.writeFile(
        path.join(dir, "caption.txt"),
        `${pkg.copy.caption}\n\n${pkg.copy.hashtags.map((h) => `#${h}`).join(" ")}\n`,
      );
      await fs.writeFile(path.join(dir, "checks.json"), JSON.stringify(pkg.checks, null, 2));
      if (pkg.shootCard) await fs.writeFile(path.join(dir, "shoot-card.json"), JSON.stringify(pkg.shootCard, null, 2));
    }
    console.log(`${pkg.status === "ready" ? "✓" : "✗"} ${pkg.topic.title}${pkg.status === "rejected" ? ` — rejected at ${pkg.stage}` : ""}`);
  }
  await fs.writeFile(path.join(outDir, "week.json"), JSON.stringify(week, null, 2));
  console.log(`\n${week.filter((w) => w.status === "ready").length}/${week.length} ready → ${outDir}`);
  console.log(spendLine());
}

main().catch((e) => {
  console.error(e);
  console.error(spendLine());
  process.exit(1);
});
