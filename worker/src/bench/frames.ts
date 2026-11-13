/**
 * Frame grids: what a week of videos actually looks like, without watching it.
 *
 *   cd worker && npx tsx src/bench/frames.ts --out DIR [--safe] [--mp4 N] [--only en-brush,ja-sensitive]
 *
 * Renders stills (Remotion renderStill, the same bundle and props a week job
 * uses) of a fixed set of the preview library's reviewed sample plans —
 * English, German (long compounds), Turkish, Arabic (right to left), Japanese
 * (no spaces) — each dressed as a paying clinic's video: a brand colour (dark,
 * pale, saturated, and a two-colour logo), library background photos, a
 * clinic logo, and a photo-based stand-in clip for each footage scene. For
 * each video: one frame per scene once its text has landed, plus the hook
 * mid-reveal, tiled into <out>/<id>.png and one <out>/all.png.
 *
 * --safe draws Instagram Reels / TikTok UI keep-out zones over every frame
 * (top bar, the right-hand action rail, the caption block at the bottom), so
 * anything that sits under the platform's own UI is obvious.
 * --entry PATH bundles another copy of the compositions (e.g. main's, checked
 * out with git archive) — the same frames, before and after a change.
 * --mp4 N also renders the first N videos in full (with narration) to <out>/<id>.mp4.
 *
 * No OpenAI calls, no network: plans, narration and photos are all in the repo.
 */
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { getBundle, renderPlan, stagingDir } from "../remotion/render-plan.js";
import { parseScenePlan, sceneFrames, sceneOffsets, type ScenePlan } from "../remotion/scene-plan.js";
import { stageBackgrounds } from "../remotion/backgrounds.js";
import { SAFE_ZONES } from "../remotion/theme.js";

const ROOT = path.resolve(process.cwd(), "..");
const HANDLE = "@brightsmiledental";
const NAME = "Bright Smile Dental";

type Sample = { key: string; lang: string; id: string; brand: string; accent?: string; photos: string[] };

/** Brand colours chosen to stress the theme: deep teal, pale pink, signal yellow, navy with a gold logo. */
export const SAMPLES: Sample[] = [
  { key: "en-brush", lang: "en", id: "cleaning-proper-brushing-technique", brand: "#0E7490", photos: ["cleaning-02", "cleaning-05", "cleaning-06"] },
  { key: "en-aligners", lang: "en", id: "aligners-are-your-clear-aligners-getting-dirty", brand: "#F5C2D0", photos: ["aligners-02", "aligners-03", "aligners-04"] },
  { key: "de-aligners", lang: "de", id: "aligners-aligner-richtig-pflegen", brand: "#F2B705", photos: [] },
  { key: "tr-implant", lang: "tr", id: "implant-implant-tedavisi-sonrasi-bakim", brand: "#1E3A8A", accent: "#D4A017", photos: ["clinic-01", "clinic-04"] },
  { key: "ar-aligners", lang: "ar", id: "aligners-tabdil-altaqwim-alshaffaf", brand: "#7C3AED", photos: ["aligners-05", "aligners-08"] },
  { key: "ja-sensitive", lang: "ja", id: "general-tsumetai-mono-de-shimiru", brand: "#059669", photos: ["calm-01", "calm-03"] },
];

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

function loadPlan(s: Sample): { plan: ScenePlan; mp3: string } {
  const dir = path.join(ROOT, "web/public/dentvideo/preview", s.lang);
  const raw = readFileSync(path.join(dir, `${s.id}.json`), "utf8").replaceAll("{handle}", HANDLE).replaceAll("{name}", NAME);
  const plan = parseScenePlan({
    ...JSON.parse(raw),
    language: s.lang,
    brandColor: s.brand,
    ...(s.accent ? { brandAccent: s.accent } : {}),
    ...(s.photos.length ? { backgrounds: s.photos.map((p) => `/dentvideo/backgrounds/${p}.jpg`) } : {}),
  });
  // Footage scenes play the stand-in clip (user asset 0).
  const scenes = plan.scenes.map((sc) => (sc.kind === "footage" ? { ...sc, source: { type: "user" as const, assetIndex: 0 } } : sc));
  return { plan: { ...plan, scenes } as ScenePlan, mp3: path.join(dir, `${s.id}.mp3`) };
}

/** A clinic wordmark: a dark mark on transparency (the "light chip" case, what most clinics upload). */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="200" viewBox="0 0 660 200">
<path d="M70 30c-30 0-48 22-48 52 0 40 18 88 34 88 14 0 14-42 30-42s16 42 30 42c16 0 34-48 34-88 0-30-18-52-48-52-8 0-12 6-16 6s-8-6-16-6z" fill="#0E7490"/>
<text x="190" y="102" font-family="Inter, sans-serif" font-weight="800" font-size="74" fill="#0B2A3A">Bright Smile</text>
<text x="192" y="160" font-family="Inter, sans-serif" font-weight="600" font-size="38" letter-spacing="6" fill="#4B6472">DENTAL CLINIC</text>
</svg>`;
const LOGO_STYLE = { treatment: "light" as const, aspect: 660 / 200 };

/** A real-looking stand-in for a stock clip: a library photo, slowly pushed in, 1080×1920 H.264. */
function footageClip(dir: string): string {
  const file = path.join(dir, "standin.mp4");
  const photo = path.join(ROOT, "web/public/dentvideo/backgrounds/clinic-06.jpg");
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-loop", "1", "-i", photo, "-t", "8", "-r", "30",
    "-vf", "scale=1300:-2,crop=1300:2310,zoompan=z='1+0.0006*on':d=240:s=1080x1920:fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", file,
  ]);
  return file;
}

/** Keep-out zones of the platforms' own UI, drawn as translucent red over a frame (ImageMagick). */
function drawSafeZones(file: string, width: number, height: number): void {
  const z = SAFE_ZONES;
  const rect = (x0: number, y0: number, x1: number, y1: number) => [
    "-draw",
    `rectangle ${Math.round(x0 * width)},${Math.round(y0 * height)} ${Math.round(x1 * width)},${Math.round(y1 * height)}`,
  ];
  execFileSync("convert", [
    file, "-fill", "rgba(255,0,0,0.22)", "-stroke", "red", "-strokewidth", "3",
    ...rect(0, 0, 1, z.top), ...rect(0, 1 - z.bottom, 1, 1), ...rect(1 - z.end, z.top, 1, 1 - z.bottom),
    file,
  ]);
}

async function main() {
  const argv = process.argv.slice(2);
  const out = path.resolve(arg(argv, "out") ?? "frames-out");
  const only = arg(argv, "only")?.split(",");
  const mp4 = Number(arg(argv, "mp4") ?? 0);
  const safe = argv.includes("--safe");
  await fs.mkdir(out, { recursive: true });
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-frames-"));

  // --entry: another copy of the compositions (e.g. main's, for a before/after pair).
  const entryPoint = path.resolve(arg(argv, "entry") ?? "src/remotion/index.ts");
  const serveUrl = await getBundle(entryPoint);
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
  const chromeMode = process.env.REMOTION_CHROME_MODE === "chrome-for-testing" ? ("chrome-for-testing" as const) : undefined;
  const browser = await openBrowser("chrome", { browserExecutable, ...(chromeMode ? { chromeMode } : {}) });

  const renderId = "frames";
  const assetDir = stagingDir(serveUrl, renderId);
  await fs.mkdir(assetDir, { recursive: true });
  const clip = footageClip(work);
  await fs.copyFile(clip, path.join(assetDir, "standin.mp4"));
  await fs.writeFile(path.join(assetDir, "logo.svg"), LOGO_SVG);
  const logoFile = path.join(work, "logo.svg");
  await fs.writeFile(logoFile, LOGO_SVG);

  const sheets: string[] = [];
  const samples = SAMPLES.filter((s) => !only || only.includes(s.key));
  for (const [n, s] of samples.entries()) {
    const { plan, mp3 } = loadPlan(s);
    const backgroundSrcs = await stageBackgrounds(plan.backgrounds, { assetDir, renderId });
    const footage: Record<string, string> = {};
    plan.scenes.forEach((sc, i) => {
      if (sc.kind === "footage") footage[String(i)] = `${renderId}/standin.mp4`;
    });
    const inputProps = {
      plan,
      footage,
      watermark: false,
      logoSrc: `${renderId}/logo.svg`,
      logoStyle: LOGO_STYLE,
      ...(backgroundSrcs.length ? { backgroundSrcs } : {}),
    };
    const composition = await selectComposition({ serveUrl, id: "ClipForgeVideo", inputProps, puppeteerInstance: browser });
    const offsets = sceneOffsets(plan);
    // The hook mid-reveal, then every scene once its text has landed (and before the next fades in).
    const picks = [
      { frame: 10, label: "hook 0.33s" },
      ...plan.scenes.map((sc, i) => ({ frame: offsets[i] + Math.min(sceneFrames(sc) - 10, Math.max(45, Math.round(sceneFrames(sc) * 0.7))), label: sc.kind })),
    ];
    const files: string[] = [];
    for (const [k, p] of picks.entries()) {
      const file = path.join(work, `${s.key}-${String(k).padStart(2, "0")}.png`);
      await renderStill({ composition, serveUrl, output: file, inputProps, frame: p.frame, puppeteerInstance: browser, imageFormat: "png" });
      if (safe) drawSafeZones(file, 1080, 1920);
      execFileSync("convert", [file, "-resize", "360x640", "-gravity", "South", "-background", "#222", "-splice", "0x36", "-fill", "white", "-pointsize", "22", "-annotate", "+0+6", `${p.label} f${p.frame}`, file]);
      files.push(file);
    }
    const sheet = path.join(out, `${s.key}.png`);
    execFileSync("montage", [...files, "-tile", `${files.length}x1`, "-geometry", "+6+6", "-background", "#111", sheet]);
    sheets.push(sheet);
    console.log(`${s.key}: ${files.length} frames → ${sheet}`);

    if (n < mp4) {
      const dir = await fs.mkdtemp(path.join(work, "v-"));
      const started = Date.now();
      await renderPlan({
        plan,
        workDir: dir,
        outputPath: path.join(out, `${s.key}.mp4`),
        voiceoverSrc: existsSync(mp3) ? mp3 : undefined,
        userAssets: [clip],
        logoSrc: logoFile,
        logoStyle: LOGO_STYLE,
        assetRoots: [path.dirname(mp3), work],
        entryPoint,
      });
      console.log(`${s.key}.mp4 in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    }
  }
  if (sheets.length > 1) execFileSync("montage", [...sheets, "-tile", "1x", "-geometry", "+0+4", "-background", "#111", path.join(out, "all.png")]);
  await browser.close({ silent: true });
  await fs.rm(assetDir, { recursive: true, force: true });
  await fs.rm(work, { recursive: true, force: true });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
