/**
 * Run the dental agents end to end from the command line.
 *
 *   npx tsx src/dental/cli.ts <profile.json> [--count 5] [--render] [--out ./dental-out]
 *
 * Needs OPENAI_API_KEY; --render also needs the Remotion browser (present in
 * the worker image) and uses PEXELS_API_KEY for stock footage when set.
 * Writes one folder per video: plan.json, caption.txt, checks.json and,
 * with --render, video.mp4 — plus week.json with every package, rejected
 * ones included with their reasons.
 */
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { clinicProfileSchema } from "./profile.js";
import { produceWeek } from "./week.js";
import { renderPlan } from "../remotion/render-plan.js";
import { prepareVoiceover } from "../remotion/voiceover.js";

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

  const week = await produceWeek(
    {
      // Node's built-in fetch, not the SDK's bundled node-fetch: the built-in
      // one honours HTTPS_PROXY (with NODE_USE_ENV_PROXY=1), so the CLI runs
      // behind a proxy as well as directly.
      client: new OpenAI({ fetch: globalThis.fetch as unknown as ConstructorParameters<typeof OpenAI>[0] extends infer O ? O extends { fetch?: infer F } ? F : never : never }),
      log: (msg, extra) => console.log(`· ${msg}`, extra ?? ""),
      render: doRender
        ? async (plan, topic) => {
            const dir = path.join(outDir, slug(topic.title));
            await fs.mkdir(dir, { recursive: true });
            const voice = await prepareVoiceover(plan, dir);
            const res = await renderPlan({
              plan: voice.plan,
              voiceoverSrc: voice.voiceoverPath,
              workDir: dir,
              outputPath: path.join(dir, "video.mp4"),
              pexelsApiKey: process.env.PEXELS_API_KEY,
              onWarn: (m) => console.warn(`  ! ${m}`),
            });
            return res.outputPath;
          }
        : undefined,
    },
    profile,
    { count: Number(arg("count") ?? 5) },
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
