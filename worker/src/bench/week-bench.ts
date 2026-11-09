/**
 * Render benchmark: one realistic DentVideo week (5 videos), no OpenAI calls.
 *
 *   cd worker && npx tsx src/bench/week-bench.ts [--lang en] [--videos 5]
 *        [--concurrency N] [--preset veryfast] [--no-footage] [--nice 10] [--out DIR]
 *
 *   # the production box has 2 cores: pin the benchmark to two
 *   taskset -c 0,1 npx tsx src/bench/week-bench.ts
 *
 * What it renders: the stored, already-reviewed sample plans and narration of
 * the live preview library (web/public/dentvideo/preview/<lang>), dressed the
 * way a paying clinic's week is — a brand colour, three library background
 * photos per video (as defaultBackgrounds picks them), the narration mp3, and
 * a real 1080×1920 H.264 clip standing in for each stock-footage scene, so
 * footage decoding costs what it costs in production. Each video goes through
 * renderPlan() — the same function, flags and bundle a week job uses — one
 * after the other, as produceWeek renders them.
 *
 * What it reports: wall time per video and for the week, frames per second,
 * CPU seconds (this process + Chromium + ffmpeg + compositor), and the peak
 * memory of the whole process tree (PSS, so Chromium's shared pages are not
 * counted once per process; RSS too). Numbers go to stdout and, with --out,
 * to <out>/bench.json. docs/CAPACITY.md turns them into clinics per night.
 *
 * Not included: the OpenAI time of a real week (scripting, reviews, TTS).
 * That is network wait, not CPU — docs/CAPACITY.md adds it separately.
 */
import fs from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getBundle, renderPlan } from "../remotion/render-plan.js";
import { parseScenePlan, totalFrames, type ScenePlan } from "../remotion/scene-plan.js";
import { renderConcurrency, renderTuning } from "../remotion/capacity.js";
import { BACKGROUND_LIBRARY } from "../dentvid/backgrounds/library.js";
import { backgroundSrc } from "../dentvid/backgrounds/suggest.js";
import { withNicedChildren } from "../dentvid/nice.js";

type Args = { lang: string; videos: number; concurrency: number; preset?: string; footage: boolean; out?: string; nice: number };

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    lang: get("lang") ?? "en",
    videos: Number(get("videos") ?? 5),
    concurrency: Number(get("concurrency") ?? renderConcurrency({ ...process.env, REMOTION_CONCURRENCY: process.env.REMOTION_CONCURRENCY ?? String(Math.max(1, affinity() - 1)) })),
    preset: get("preset"),
    footage: !argv.includes("--no-footage"),
    out: get("out"),
    // As a weekend batch week runs (dentvid/nice.ts): 10. 0 = normal priority.
    nice: Number(get("nice") ?? 0),
  };
}

/* ------------------------------------------------------------ memory */

const PAGE = 4096;

function childrenOf(): Map<number, number[]> {
  const kids = new Map<number, number[]>();
  for (const name of readdirSync("/proc")) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const stat = readFileSync(`/proc/${name}/stat`, "utf8");
      const ppid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
      const list = kids.get(ppid) ?? [];
      list.push(Number(name));
      kids.set(ppid, list);
    } catch {
      // gone
    }
  }
  return kids;
}

function tree(root: number): number[] {
  const kids = childrenOf();
  const out: number[] = [];
  const stack = [root];
  while (stack.length) {
    const pid = stack.pop()!;
    out.push(pid);
    stack.push(...(kids.get(pid) ?? []));
  }
  return out;
}

function memOf(pid: number): { pss: number; rss: number } {
  try {
    const roll = readFileSync(`/proc/${pid}/smaps_rollup`, "utf8");
    const kb = (k: string) => Number(new RegExp(`^${k}:\\s+(\\d+) kB`, "m").exec(roll)?.[1] ?? 0) * 1024;
    return { pss: kb("Pss"), rss: kb("Rss") };
  } catch {
    try {
      const rss = Number(readFileSync(`/proc/${pid}/statm`, "utf8").split(" ")[1]) * PAGE;
      return { pss: rss, rss };
    } catch {
      return { pss: 0, rss: 0 };
    }
  }
}

class PeakSampler {
  peakPss = 0;
  peakRss = 0;
  peakProcs = 0;
  private timer?: NodeJS.Timeout;
  start(everyMs = 250) {
    this.timer = setInterval(() => {
      let pss = 0;
      let rss = 0;
      const pids = tree(process.pid);
      for (const pid of pids) {
        const m = memOf(pid);
        pss += m.pss;
        rss += m.rss;
      }
      this.peakPss = Math.max(this.peakPss, pss);
      this.peakRss = Math.max(this.peakRss, rss);
      this.peakProcs = Math.max(this.peakProcs, pids.length);
    }, everyMs);
    this.timer.unref();
  }
  stop() {
    clearInterval(this.timer);
  }
}

/** CPU seconds used so far by this process and its reaped children (Chromium, ffmpeg, compositor). */
function cpuSeconds(): number {
  const self = process.resourceUsage();
  const stat = readFileSync("/proc/self/stat", "utf8");
  const f = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
  // fields 16/17 of /proc/<pid>/stat (cutime, cstime) → index 13/14 after the comm field
  const children = (Number(f[13]) + Number(f[14])) / 100;
  return (self.userCPUTime + self.systemCPUTime) / 1e6 + children;
}

/* ------------------------------------------------------------ the week */

const ROOT = path.resolve(process.cwd(), "..");
const SAMPLE_NAME = "Bright Smile Dental";
const SAMPLE_HANDLE = "@brightsmiledental";

function samplePlans(lang: string, n: number): { id: string; plan: ScenePlan; mp3: string }[] {
  const dir = path.join(ROOT, "web/public/dentvideo/preview", lang);
  if (!existsSync(dir)) throw new Error(`no preview library for "${lang}" at ${dir}`);
  const ids = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
  const out = [];
  for (let i = 0; i < n; i++) {
    const id = ids[i % ids.length];
    const raw = readFileSync(path.join(dir, `${id}.json`), "utf8").replaceAll("{handle}", SAMPLE_HANDLE).replaceAll("{name}", SAMPLE_NAME);
    const category = id.split("-")[0];
    const photos = BACKGROUND_LIBRARY.filter((b) => b.category === category).slice(0, 3);
    const plan = parseScenePlan({
      ...JSON.parse(raw),
      language: lang,
      brandColor: "#0E7490",
      ...(photos.length ? { backgrounds: photos.map((p) => backgroundSrc(p.id)) } : {}),
    });
    out.push({ id, plan, mp3: path.join(dir, `${id}.mp3`) });
  }
  return out;
}

/** A stand-in for a Pexels clip: 1080×1920 H.264, 8 s, busy enough that decoding is real work. */
function footageClip(dir: string): string {
  const file = path.join(dir, "stock-standin.mp4");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=1080x1920:d=8:r=30", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", file]);
  return file;
}

function withStandInFootage(plan: ScenePlan): ScenePlan {
  return {
    ...plan,
    scenes: plan.scenes.map((s) => (s.kind === "footage" ? { ...s, source: { type: "user" as const, assetIndex: 0 } } : s)),
  } as ScenePlan;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tuning = { ...renderTuning(process.env, affinity()), ...(args.preset ? { x264Preset: args.preset as ReturnType<typeof renderTuning>["x264Preset"] } : {}) };
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "dentvid-bench-"));
  const box = { cores: os.cpus().length, affinity: affinity(), totalGb: +(os.totalmem() / 1024 ** 3).toFixed(1), cpu: os.cpus()[0]?.model ?? "?" };
  console.log(`box: ${box.affinity} usable core(s) of ${box.cores}, ${box.totalGb} GB, ${box.cpu}`);
  console.log(`render: concurrency ${args.concurrency}, x264 ${tuning.x264Preset}, footage cache ${tuning.offthreadVideoCacheSizeInBytes / 1024 / 1024} MB`);

  const sampler = new PeakSampler();
  sampler.start();

  const t0 = Date.now();
  await getBundle(path.resolve(process.cwd(), "src/remotion/index.ts"));
  const bundleSec = (Date.now() - t0) / 1000;
  console.log(`bundle: ${bundleSec.toFixed(1)} s (once per worker process)`);

  const clip = args.footage ? footageClip(work) : undefined;
  const videos: { id: string; seconds: number; frames: number; wallSec: number; cpuSec: number; bytes: number }[] = [];
  const weekStart = Date.now();
  const cpuStart = cpuSeconds();
  for (const [i, v] of samplePlans(args.lang, args.videos).entries()) {
    const dir = await fs.mkdtemp(path.join(work, `v${i}-`));
    const plan = clip ? withStandInFootage(v.plan) : v.plan;
    const started = Date.now();
    const cpuBefore = cpuSeconds();
    const res = await withNicedChildren(args.nice, () =>
      renderPlan({
        plan,
        voiceoverSrc: v.mp3,
        workDir: dir,
        outputPath: path.join(dir, "video.mp4"),
        userAssets: clip ? [clip] : [],
        concurrency: args.concurrency,
        tuning,
        onWarn: (m) => console.warn(`  warn: ${m}`),
      }),
    );
    const wallSec = (Date.now() - started) / 1000;
    const frames = totalFrames(plan);
    const bytes = (await fs.stat(res.outputPath)).size;
    videos.push({ id: v.id, seconds: res.durationSec, frames, wallSec, cpuSec: cpuSeconds() - cpuBefore, bytes });
    console.log(
      `  ${String(i + 1).padStart(2)}. ${v.id.slice(0, 48).padEnd(48)} ${res.durationSec.toFixed(1).padStart(5)} s video  ${wallSec.toFixed(1).padStart(6)} s wall  ${(frames / wallSec).toFixed(1).padStart(5)} fps  ${(bytes / 1024 / 1024).toFixed(1)} MB`,
    );
  }
  const weekSec = (Date.now() - weekStart) / 1000;
  const weekCpu = cpuSeconds() - cpuStart;
  sampler.stop();

  const result = {
    at: new Date().toISOString(),
    box,
    lang: args.lang,
    concurrency: args.concurrency,
    nice: args.nice,
    tuning,
    footage: !!clip,
    bundleSec: +bundleSec.toFixed(1),
    weekWallSec: +weekSec.toFixed(1),
    weekCpuSec: +weekCpu.toFixed(1),
    videoSeconds: +videos.reduce((s, v) => s + v.seconds, 0).toFixed(1),
    frames: videos.reduce((s, v) => s + v.frames, 0),
    peakTreePssMb: Math.round(sampler.peakPss / 1024 / 1024),
    peakTreeRssMb: Math.round(sampler.peakRss / 1024 / 1024),
    peakProcesses: sampler.peakProcs,
    nodeMaxRssMb: Math.round(process.resourceUsage().maxRSS / 1024),
    videos,
  };
  console.log(
    `week: ${result.weekWallSec} s wall (${(result.weekWallSec / 60).toFixed(1)} min) for ${videos.length} videos / ${result.videoSeconds} s of video / ${result.frames} frames; ` +
      `${result.weekCpuSec} CPU-s; peak memory ${result.peakTreePssMb} MB PSS (${result.peakTreeRssMb} MB RSS) across ${result.peakProcesses} processes`,
  );
  if (args.out) {
    await fs.mkdir(args.out, { recursive: true });
    await fs.writeFile(path.join(args.out, "bench.json"), JSON.stringify(result, null, 2));
  }
  await fs.rm(work, { recursive: true, force: true });
  process.exit(0);
}

function affinity(): number {
  try {
    const status = readFileSync("/proc/self/status", "utf8");
    const list = /^Cpus_allowed_list:\s*(.+)$/m.exec(status)?.[1] ?? "";
    return list.split(",").reduce((n, part) => {
      const [a, b] = part.split("-").map(Number);
      return n + (b === undefined ? 1 : b - a + 1);
    }, 0) || os.cpus().length;
  } catch {
    return os.cpus().length;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
