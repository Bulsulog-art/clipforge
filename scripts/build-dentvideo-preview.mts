/**
 * Builds the live preview's static library (web/public/dentvideo/preview/)
 * from videos that ALREADY passed the compliance and accuracy reviewers:
 * a `dental/cli.ts` output folder per video (plan.json + voiceover.mp3,
 * with week.json beside them saying the package was "ready").
 *
 *   cd worker && npx tsx ../scripts/build-dentvideo-preview.mts <selection.json>
 *
 * selection.json: { "<lang>": [{ "dir": "/abs/path/to/video-folder", "name": "Demo Clinic", "handle": "democlinic" }, ...] }
 *
 * For each video:
 *   - the narration is loudness-normalised (-16 LUFS, as voiceover.ts does)
 *     and squeezed to mono 64 kbps — speech does not need more;
 *   - the plan is timed to that narration exactly as the worker times it
 *     (fitPlanToVoice), so the preview runs scene for scene like the render;
 *   - the sample clinic's name and handle are replaced with {name}/{handle},
 *     filled with the visitor's at play time (preview-library.ts), and any
 *     narration that SAYS the sample clinic's name is refused — audio cannot
 *     be personalised;
 *   - the voice-over text, brand colours and footage queries are dropped:
 *     the browser needs none of them (footage scenes draw their caption on
 *     the brand background, as a render without stock footage does).
 *
 * Writes <lang>/<id>.json + <lang>/<id>.mp3 and web/src/lib/dentvid/preview-manifest.ts.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { parseScenePlan, totalSeconds, type ScenePlan } from "../worker/src/remotion/scene-plan.ts";
import { fitPlanToVoice } from "../worker/src/remotion/voiceover.ts";
// web/ is not an ESM package, so its module arrives as CommonJS: take the namespace.
const webLib = await import("../web/src/lib/dentvid/preview-library.ts");
const { serviceCategory, HANDLE_TOKEN, NAME_TOKEN } = ((webLib as { default?: typeof webLib }).default ?? webLib) as typeof webLib;

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "web/public/dentvideo/preview");

type Pick = { dir: string; name: string; handle: string };

async function seconds(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(stdout.trim());
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function tokenise(text: string, pick: Pick): string {
  return text
    .replace(new RegExp(`@?${escape(pick.handle)}`, "gi"), HANDLE_TOKEN)
    .replace(new RegExp(escape(pick.name), "gi"), NAME_TOKEN);
}

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

async function main() {
  const selection: Record<string, Pick[]> = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  const manifest: Record<string, unknown[]> = {};
  let bytes = 0;
  for (const [lang, picks] of Object.entries(selection)) {
    await fs.rm(path.join(OUT, lang), { recursive: true, force: true });
    await fs.mkdir(path.join(OUT, lang), { recursive: true });
    manifest[lang] = [];
    for (const pick of picks) {
      const week = JSON.parse(await fs.readFile(path.join(pick.dir, "..", "week.json"), "utf8")) as {
        status: string;
        topic: { title: string; service: string; pillar?: string };
        plan?: ScenePlan;
        checks?: Record<string, { compliance: { verdict: string }; accuracy: { verdict: string } }>;
      }[];
      const raw = JSON.parse(await fs.readFile(path.join(pick.dir, "plan.json"), "utf8")) as ScenePlan;
      const pkg = week.find((p) => p.plan?.title === raw.title);
      if (!pkg || pkg.status !== "ready") throw new Error(`${pick.dir}: not a reviewed, ready package`);
      for (const [stage, c] of Object.entries(pkg.checks ?? {}))
        if (c.compliance.verdict === "fail" || c.accuracy.verdict === "fail") throw new Error(`${pick.dir}: ${stage} review failed`);
      const spoken = raw.voiceover?.text ?? "";
      if (new RegExp(escape(pick.name), "i").test(spoken) || new RegExp(escape(pick.handle), "i").test(spoken))
        throw new Error(`${pick.dir}: the narration says the sample clinic's name`);

      const category = serviceCategory(pkg.topic.service);
      const id = `${category ?? "general"}-${slug(pkg.topic.title)}`;
      const mp3 = path.join(OUT, lang, `${id}.mp3`);
      await run("ffmpeg", [
        "-v", "error", "-y", "-i", path.join(pick.dir, "voiceover.mp3"),
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k",
        "-map_metadata", "-1", mp3,
      ]);
      const voice = await seconds(mp3);
      const timed = fitPlanToVoice(parseScenePlan(raw), voice);
      const scenes = timed.scenes.map((s) => {
        const text = JSON.parse(tokenise(JSON.stringify(s), pick));
        // Footage: the caption on the brand background (no stock clip in the preview).
        if (text.kind === "footage") text.source = { type: "stock", query: "preview" };
        return text;
      });
      const leftover = JSON.stringify(scenes).match(/demo/i);
      if (leftover) throw new Error(`${pick.dir}: sample clinic text left on screen: ${JSON.stringify(scenes)}`);
      const plan = { title: pkg.topic.title, aspect: timed.aspect, theme: timed.theme, music: "none", scenes };
      await fs.writeFile(path.join(OUT, lang, `${id}.json`), JSON.stringify(plan));
      const size = (await fs.stat(mp3)).size + JSON.stringify(plan).length;
      bytes += size;
      manifest[lang].push({ id, category, service: pkg.topic.service, title: pkg.topic.title, seconds: Math.round(totalSeconds(timed) * 10) / 10 });
      console.log(`${lang}/${id}  ${category ?? "-"}  ${timed.theme}  voice ${voice.toFixed(1)}s video ${totalSeconds(timed).toFixed(1)}s  ${(size / 1024).toFixed(0)} KB`);
    }
  }
  const ts =
    `// GENERATED by scripts/build-dentvideo-preview.mts — the live preview's library (files in public/dentvideo/preview/).\n` +
    `import type { ServiceCategory } from "./preview-library";\n\n` +
    `export type PreviewEntry = { id: string; category?: ServiceCategory; service: string; title: string; seconds: number };\n\n` +
    `export const PREVIEW_MANIFEST: Record<"en" | "de" | "es" | "fr" | "tr", PreviewEntry[]> = ${JSON.stringify(manifest, null, 2)};\n`;
  await fs.writeFile(path.join(root, "web/src/lib/dentvid/preview-manifest.ts"), ts);
  console.log(`\ntotal ${(bytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
