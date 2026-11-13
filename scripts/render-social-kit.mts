/**
 * Renders DentVideo's own launch posts for Instagram / LinkedIn
 * (text pieces: docs/gtm/08-social-launch-kit.md). Binaries go to <outDir>;
 * none of them belong in git.
 *
 *   cd worker && npx tsx ../scripts/render-social-kit.mts <outDir> [--capture <baseUrl>] [--only <id,id>] [--skip-video]
 *
 *   --capture http://localhost:3000   first records the product screens with Playwright at 390 px
 *                                      (needs `DENTVIDEO_DEV_PREVIEW=1 next dev` in web/, for /dentvideo/dev/*).
 *                                      Without it, the recordings from an earlier run in <outDir>/_work are reused.
 *
 * What it makes:
 *   reels/NN-<id>.mp4               1080×1920, ≤30 s. Nine sample-clinic reels drawn by the product's own
 *                                   composition (worker/src/remotion/Video.tsx, imported read-only) from the
 *                                   live-preview library (web/public/dentvideo/preview) for a fictional sample
 *                                   clinic, plus three DentVideo explainers (kinetic type + screen recordings).
 *   covers/NN-<id>-1080x1920.jpg    the reel's cover; covers/NN-<id>-1080x1350.jpg its 4:5 grid crop.
 *   profile/                        avatar, highlight covers, LinkedIn banner (1584×396), grid contact sheet.
 *
 * Zero API spend: narration is the preview library's existing audio; nothing calls OpenAI or Pexels.
 * Reels longer than 30 s are tightened the way an editor would: pauses between sentences shortened to
 * 0.25 s, then (only if still needed) sped up by at most 18 %, with every scene boundary moved by the
 * same time map so the captions stay on the words.
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { FPS, totalSeconds, type ScenePlan } from "../worker/src/remotion/scene-plan.ts";
import { webpackOverride } from "../worker/src/remotion/webpack-override.ts";
// web/ is not an ESM package, so its modules arrive as CommonJS: take the namespace.
const unwrap = <T,>(m: T): T => ((m as { default?: T }).default ?? m) as T;
const { personalisePlan } = unwrap(await import("../web/src/lib/dentvid/preview-library.ts"));
const { suggestBackgrounds, matchingBackgrounds, defaultBackgrounds } = unwrap(await import("../web/src/lib/dentvid/backgrounds/suggest.ts"));

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireWorker = createRequire(path.join(root, "worker/package.json"));
const { bundle } = (await import(requireWorker.resolve("@remotion/bundler"))) as typeof import("@remotion/bundler");
const { renderMedia, renderStill, selectComposition } = (await import(requireWorker.resolve("@remotion/renderer"))) as typeof import("@remotion/renderer");

const MAX_SECONDS = 29.8;
const LOCAL_SHELL = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
// A preinstalled chrome-headless-shell (this dev box) beats Remotion downloading one.
const BROWSER = process.env.REMOTION_BROWSER_EXECUTABLE || (existsSync(LOCAL_SHELL) ? LOCAL_SHELL : undefined);

// MARK: content

type Lang = "tr" | "es" | "de";

/** Fictional, clearly-sample clinics. Never a real clinic's name, and no handle (a handle could belong to someone). */
const SAMPLE: Record<Lang, { name: string; initial: string; color: string; label: string; kicker: string; url: string }> = {
  tr: { name: "Örnek Diş Kliniği", initial: "Ö", color: "#b6774f", label: "ÖRNEK VİDEO · DentVideo ile hazırlandı", kicker: "ÖRNEK VİDEO · TR", url: "dentvideo.com/tr" },
  es: { name: "Clínica Dental de Ejemplo", initial: "E", color: "#1f4e79", label: "EJEMPLO · hecho con DentVideo", kicker: "EJEMPLO · ES", url: "dentvideo.com/es" },
  de: { name: "Beispiel-Zahnarztpraxis", initial: "B", color: "#2e7d6b", label: "BEISPIELVIDEO · erstellt mit DentVideo", kicker: "BEISPIEL · DE", url: "dentvideo.com/de" },
};

type ClinicPost = { kind: "clinic"; id: string; lang: Lang; preview: string; service: string; cover: string };
type Beat = Record<string, unknown> & { type: "type" | "screen" | "end"; seconds: number };
type ExplainerPost = { kind: "explainer"; id: string; cover: string; coverShot: string; beats: Beat[] };
type Post = ClinicPost | ExplainerPost;

/** Posting order. On a 3-column profile this puts the three explainers in one column (rows 2–4). */
export const POSTS: Post[] = [
  {
    kind: "explainer",
    id: "dentvideo-nedir",
    cover: "Her pazartesi beş hasta videosu",
    coverShot: "landing.png",
    beats: [
      { type: "type", seconds: 3.2, kicker: "Diş klinikleri için", lines: ["Her pazartesi", "beş kısa", "hasta videosu."], accent: [2] },
      { type: "screen", seconds: 7, kicker: "dentvideo.com/tr", caption: "Seslendirilmiş, altyazılı, kliniğinizin renklerinde.", src: "captures/landing", from: 0.3 },
      {
        type: "type",
        seconds: 3.8,
        dark: true,
        kicker: "Her metin",
        lines: ["iki kez", "kontrol edilir."],
        accent: [0],
        small: "Sağlık tanıtım kurallarına ve klinik doğruluğa göre. Hukuki danışmanlık değil; dikkatli bir filtre.",
      },
      { type: "type", seconds: 3.4, lines: ["Siz onaylarsınız.", "Siz paylaşırsınız."], accent: [1], small: "DentVideo hiçbir şeyi kendi kendine paylaşmaz." },
      { type: "end", seconds: 3.6, lines: ["Ödemeden önce", "kendi önizlemeniz."], url: "dentvideo.com/tr", small: "Aylık $49'dan · taahhüt yok" },
    ],
  },
  { kind: "clinic", id: "tr-implant-asamalari", lang: "tr", preview: "tr/implant-implant-tedavisinin-asamalari", service: "İmplant", cover: "İmplant tedavisinin aşamaları" },
  { kind: "clinic", id: "tr-beyazlatma", lang: "tr", preview: "tr/whitening-dis-beyazlatma-mit", service: "Diş beyazlatma", cover: "Beyazlatma ve hassasiyet" },
  {
    kind: "explainer",
    id: "nasil-calisir",
    cover: "Nasıl çalışır? Üç adım",
    coverShot: "preview.png",
    beats: [
      { type: "type", seconds: 2.8, kicker: "Nasıl çalışır?", lines: ["Üç adım.", "Bir kez", "iki dakika."], accent: [0] },
      { type: "screen", seconds: 6, kicker: "1 · Kliniğiniz", caption: "Adınız, hizmetleriniz, logonuz ve renginiz.", src: "captures/clinic", from: 0.3 },
      { type: "screen", seconds: 7.6, kicker: "2 · Canlı önizleme", caption: "Ödemeden önce videolarınızı kendi renginizle görün.", src: "captures/preview", from: 0.3 },
      { type: "screen", seconds: 6.2, kicker: "3 · Onay", caption: "Her pazartesi yeni videolar: izleyin, onaylayın, paylaşın.", src: "captures/app", from: 0.3 },
      { type: "end", seconds: 3.6, lines: ["Kendi önizlemenizi", "görün."], url: "dentvideo.com/tr", small: "İlk 100 kliniğe kurucu fiyatı: Practice planı 12 ay boyunca aylık $49" },
    ],
  },
  { kind: "clinic", id: "tr-cocuk", lang: "tr", preview: "tr/children-cocuk-dis-hekimligi-onleme", service: "Çocuk diş hekimliği", cover: "Çocuklarda çürüğü önlemek" },
  { kind: "clinic", id: "tr-dis-tasi", lang: "tr", preview: "tr/cleaning-dis-tasi-temizligi-saglikli-bir-gulumseme-icin-t", service: "Diş taşı temizliği", cover: "Diş taşı neden temizlenir?" },
  {
    kind: "explainer",
    id: "kontrol",
    cover: "Paylaşmadan önce iki kez kontrol",
    coverShot: "check.png",
    beats: [
      {
        type: "type",
        seconds: 3.6,
        dark: true,
        kicker: "Tek yanlış kelime",
        lines: ["“Acısız.”", "“Garantili.”", "“Bembeyaz.”"],
        small: "Sağlık hizmetleri tanıtımında bu sözcükler kurallara aykırı olabilir.",
      },
      { type: "screen", seconds: 7.4, kicker: "Uygulamada", caption: "Göz atılması gereken videoda nedeni kartın üzerinde yazar.", src: "captures/check", from: 0.3 },
      { type: "type", seconds: 4.2, kicker: "DentVideo'da yok", lines: ["Avatar doktor.", "Sahte hasta.", "Otomatik paylaşım."], accent: [2], small: "Hasta sayısı vaadi de yok." },
      { type: "end", seconds: 3.6, lines: ["Dikkatli bir filtre;", "son söz hekimin."], url: "dentvideo.com/tr", small: "Hukuki danışmanlık değildir." },
    ],
  },
  { kind: "clinic", id: "tr-seffaf-plak", lang: "tr", preview: "tr/aligners-seffaf-plak-tedavisi-islem", service: "Şeffaf plak", cover: "Şeffaf plak nasıl uygulanır?" },
  { kind: "clinic", id: "es-blanqueamiento", lang: "es", preview: "es/whitening-blanqueamiento-dental-y-sensibilidad", service: "Blanqueamiento dental", cover: "Blanqueamiento y sensibilidad" },
  { kind: "clinic", id: "tr-implant-bakim", lang: "tr", preview: "tr/implant-implant-tedavisi-sonrasi-bakim", service: "İmplant", cover: "İmplant sonrası bakım" },
  { kind: "clinic", id: "de-aligner-pflege", lang: "de", preview: "de/aligners-aligner-richtig-pflegen", service: "Aligner", cover: "Aligner richtig pflegen" },
  { kind: "clinic", id: "es-limpieza", lang: "es", preview: "es/cleaning-lo-que-no-debes-hacer-tras-una-limpieza-dental", service: "Limpieza dental", cover: "Después de una limpieza" },
];

const HIGHLIGHTS = [
  { id: "ornekler", icon: "play" },
  { id: "nasil", icon: "steps" },
  { id: "kontrol", icon: "shield" },
  { id: "fiyat", icon: "tag" },
  { id: "sss", icon: "question" },
  { id: "diller", icon: "globe" },
] as const;

// MARK: audio tightening

type Cut = { from: number; to: number };

async function probeSeconds(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(stdout.trim());
}

async function silences(file: string): Promise<Cut[]> {
  const { stderr } = await run("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"], { maxBuffer: 1 << 24 });
  const out: Cut[] = [];
  let start: number | undefined;
  for (const line of stderr.split("\n")) {
    const s = /silence_start: ([\d.]+)/.exec(line);
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (s) start = Number(s[1]);
    if (e && start !== undefined) {
      out.push({ from: start, to: Number(e[1]) });
      start = undefined;
    }
  }
  return out;
}

/** Original time → time after the cuts. */
const mapper = (cuts: Cut[]) => (t: number) => t - cuts.reduce((n, c) => n + Math.max(0, Math.min(t, c.to) - c.from), 0);

/**
 * Fits a plan + narration under MAX_SECONDS. Returns the plan as-is when it already fits.
 * Otherwise writes <out> (wav) and returns the plan with every scene boundary moved by the same map.
 */
async function fitReel(plan: ScenePlan, mp3: string, out: string): Promise<{ plan: ScenePlan; audio: string; note: string }> {
  const planLen = totalSeconds(plan);
  if (planLen <= MAX_SECONDS) return { plan, audio: mp3, note: `as made (${planLen.toFixed(1)} s)` };
  const voice = await probeSeconds(mp3);
  const KEEP = 0.25;
  const cuts: Cut[] = [];
  for (const s of await silences(mp3)) {
    if (s.from <= 0.05) cuts.push({ from: 0.08, to: Math.max(0.08, s.to) }); // leading silence → 0.08 s
    else if (s.to >= voice - 0.05) cuts.push({ from: s.from + 0.3, to: voice }); // trailing → 0.3 s
    else if (s.to - s.from > KEEP) cuts.push({ from: s.from + KEEP / 2, to: s.to - KEEP / 2 });
  }
  const m = mapper(cuts.filter((c) => c.to > c.from));
  const tail = Math.min(1, Math.max(0.6, planLen - voice)); // the sign-off holds a beat after the last word
  const tightened = m(voice) + tail;
  const rate = Math.max(1, tightened / MAX_SECONDS);
  if (rate > 1.18) throw new Error(`${plan.title}: ${tightened.toFixed(1)} s after tightening; would need ${rate.toFixed(2)}× — pick another video`);

  // Audio: the kept segments, joined, then tempo (pitch kept).
  const keep: Cut[] = [];
  let at = 0;
  for (const c of [...cuts].sort((a, b) => a.from - b.from)) {
    if (c.from > at) keep.push({ from: at, to: c.from });
    at = Math.max(at, c.to);
  }
  if (at < voice) keep.push({ from: at, to: voice });
  const parts = keep.map((k, i) => `[0:a]atrim=${k.from.toFixed(3)}:${k.to.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`);
  const filter = `${parts.join(";")};${keep.map((_, i) => `[a${i}]`).join("")}concat=n=${keep.length}:v=0:a=1[j];[j]atempo=${rate.toFixed(4)}[o]`;
  await run("ffmpeg", ["-v", "error", "-y", "-i", mp3, "-filter_complex", filter, "-map", "[o]", "-ar", "48000", out]);

  // Scenes: each boundary through the same map, then the tempo.
  const bounds: number[] = [0];
  for (const s of plan.scenes) bounds.push(bounds[bounds.length - 1] + s.seconds);
  const moved = bounds.map((b, i) => (i === bounds.length - 1 ? tightened : Math.min(m(Math.min(b, voice)), tightened)) / rate);
  const scenes = plan.scenes.map((s, i) => ({ ...s, seconds: Math.round((moved[i + 1] - moved[i]) * 100) / 100 }));
  const fitted = { ...plan, scenes } as ScenePlan;
  return {
    plan: fitted,
    audio: out,
    note: `tightened ${planLen.toFixed(1)} → ${totalSeconds(fitted).toFixed(1)} s (pauses −${(m(0) + (voice - m(voice))).toFixed(1)} s, tempo ×${rate.toFixed(2)})`,
  };
}

// MARK: capture (Playwright, 390 px)

async function capture(baseUrl: string, dir: string, only?: string[]) {
  const pwPath = process.env.PLAYWRIGHT_MODULE ?? "/opt/node-tools/node_modules/playwright/index.mjs";
  const { chromium } = (await import(pwPath)) as typeof import("playwright");
  await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
  // The dev harness shows a fictional clinic; the launch kit's sample clinic replaces it on screen.
  const RENAME: [string, string][] = [
    ["Gülümse Diş Kliniği", SAMPLE.tr.name],
    ["riverside.dental", ""],
  ];
  const flows: Record<string, (p: import("playwright").Page) => Promise<void>> = {
    landing: async (p) => {
      await p.goto(`${baseUrl}/dentvideo/tr`, { waitUntil: "networkidle" });
      await settle(p);
      await p.waitForTimeout(2600);
      await smoothTo(p, "#how", 1800);
      await p.waitForTimeout(1500);
      await smoothTo(p, "#samples", 1800);
      await p.waitForTimeout(2200);
    },
    clinic: async (p) => {
      await p.goto(`${baseUrl}/dentvideo/dev/funnel?step=clinic&lang=tr`, { waitUntil: "networkidle" });
      await settle(p);
      const name = p.getByLabel("Klinik adı");
      await name.fill("");
      await p.waitForTimeout(500);
      await name.pressSequentially(SAMPLE.tr.name, { delay: 65 });
      await p.waitForTimeout(500);
      await smoothBy(p, 760, 1300);
      await p.waitForTimeout(300);
      await p.locator('button[title="#1f4e79"]').click();
      await p.waitForTimeout(700);
      await p.locator('button[title="#b6774f"]').click();
      await p.waitForTimeout(1500);
    },
    preview: async (p) => {
      await p.goto(`${baseUrl}/dentvideo/dev/funnel?step=preview&lang=tr`, { waitUntil: "networkidle" });
      await settle(p);
      await smoothBy(p, 330, 700);
      await p.waitForTimeout(2200);
      await smoothBy(p, 1250, 1100);
      await p.locator('button[title="#1f4e79"]').click();
      await p.waitForTimeout(400);
      await smoothBy(p, -1250, 1000);
      await p.waitForTimeout(2600);
    },
    app: async (p) => {
      await p.goto(`${baseUrl}/dentvideo/dev/app?lang=tr`, { waitUntil: "networkidle" });
      await settle(p);
      await p.waitForTimeout(2200);
      await smoothBy(p, 1150, 1600);
      await p.waitForTimeout(2600);
    },
    check: async (p) => {
      await p.goto(`${baseUrl}/dentvideo/dev/app?lang=tr`, { waitUntil: "networkidle" });
      await smoothBy(p, 560, 10);
      await settle(p);
      await p.waitForTimeout(1600);
      await smoothBy(p, 130, 1200);
      await p.waitForTimeout(3600);
    },
  };
  // Recording: a CDP screencast in device pixels (Playwright's recordVideo keeps CSS pixels, 390 wide).
  // Frames arrive only when the screen changes, each with its timestamp; ffmpeg's concat demuxer
  // turns them into a constant 30 fps clip. Recording starts once the page is settled, so no trimming.
  let rec: { cdp: import("playwright").CDPSession; frames: { t: number; data: string }[] } | undefined;
  async function settle(p: import("playwright").Page) {
    await p.addStyleTag({ content: "nextjs-portal{display:none!important} *{scrollbar-width:none!important}" });
    await p.evaluate((pairs) => {
      const swap = () => {
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode())
          for (const [a, b] of pairs) if (n.nodeValue?.includes(a)) n.nodeValue = n.nodeValue.split(a).join(b);
        for (const el of document.querySelectorAll("input")) {
          for (const [a, b] of pairs)
            if (el.value.includes(a)) {
              // React owns the value: set it through the native setter and tell React.
              Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, el.value.split(a).join(b));
              el.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
      };
      swap();
      new MutationObserver(swap).observe(document.body, { subtree: true, childList: true, characterData: true });
    }, RENAME);
    await p.waitForTimeout(600);
    const cdp = await p.context().newCDPSession(p);
    const frames: { t: number; data: string }[] = [];
    cdp.on("Page.screencastFrame", (f) => {
      frames.push({ t: f.metadata.timestamp ?? Date.now() / 1000, data: f.data });
      void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1170, maxHeight: 2532, everyNthFrame: 1 });
    rec = { cdp, frames };
  }
  if (!only) await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  for (const [id, flow] of Object.entries(flows)) {
    if (only && !only.includes(id)) continue;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "tr-TR" });
    // tsx (esbuild keepNames) wraps functions passed to page.evaluate in __name(); give the page one.
    await ctx.addInitScript({ content: "globalThis.__name = (f) => f;" });
    const page = await ctx.newPage();
    page.setDefaultTimeout(180_000);
    rec = undefined;
    await flow(page);
    if (!rec) throw new Error(`${id}: flow never settled`);
    const { cdp, frames } = rec as NonNullable<typeof rec>;
    const end = Date.now() / 1000;
    await cdp.send("Page.stopScreencast");
    await ctx.close();
    const fdir = path.join(dir, `${id}-frames`);
    await fs.mkdir(fdir, { recursive: true });
    const list: string[] = ["ffconcat version 1.0"];
    for (const [i, f] of frames.entries()) {
      const file = path.join(fdir, `${String(i).padStart(5, "0")}.jpg`);
      await fs.writeFile(file, Buffer.from(f.data, "base64"));
      const next = frames[i + 1]?.t ?? Math.max(f.t + 0.04, end);
      list.push(`file '${file}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
    }
    list.push(`file '${path.join(fdir, `${String(frames.length - 1).padStart(5, "0")}.jpg`)}'`);
    await fs.writeFile(path.join(fdir, "list.ffconcat"), list.join("\n") + "\n");
    await run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(fdir, "list.ffconcat"), "-vf", "fps=30,scale=1170:-2,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "medium", path.join(dir, `${id}.mp4`)]);
    await fs.rm(fdir, { recursive: true, force: true });
    console.log(`captured ${id}: ${frames.length} frames, ${(end - frames[0].t).toFixed(1)} s`);
  }
  await browser.close();
}

async function smoothBy(p: import("playwright").Page, dy: number, ms: number) {
  await p.evaluate(
    ([dy, ms]) =>
      new Promise<void>((done) => {
        const y0 = window.scrollY;
        const t0 = performance.now();
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          window.scrollTo(0, y0 + dy * e);
          if (k < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      }),
    [dy, ms] as const,
  );
}

async function smoothTo(p: import("playwright").Page, selector: string, ms: number) {
  const dy = await p.evaluate((s) => (document.querySelector(s)?.getBoundingClientRect().top ?? 0) - 64, selector);
  await smoothBy(p, dy, ms);
}

// MARK: main

async function main() {
  const args = process.argv.slice(2);
  const outDir = path.resolve(args[0] ?? "");
  if (!args[0]) throw new Error("usage: render-social-kit.mts <outDir> [--capture <baseUrl>] [--only id,id] [--skip-video]");
  const flag = (n: string) => {
    const i = args.indexOf(n);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const only = flag("--only")?.split(",");
  const skipVideo = args.includes("--skip-video");
  const work = path.join(outDir, "_work");
  const pub = path.join(work, "public");
  for (const d of ["reels", "covers", "profile", "_work/public/audio", "_work/public/brand", "_work/public/fonts", "_work/public/logos", "_work/public/captures", "_work/public/stills", "_work/public/bg"])
    await fs.mkdir(path.join(outDir, d), { recursive: true });

  const capturesDir = path.join(work, "captures");
  const base = flag("--capture");
  // --flows check,app: re-record only those screens.
  if (base) await capture(base.replace(/\/$/, ""), capturesDir, flag("--flows")?.split(","));
  const captureFrames: Record<string, number> = {};
  for (const id of ["landing", "clinic", "preview", "app", "check"]) {
    // As a JPEG sequence at the phone screen's width: the explainer draws frame by frame, no video decoder.
    const seq = path.join(pub, "captures", id);
    await fs.rm(seq, { recursive: true, force: true });
    await fs.mkdir(seq, { recursive: true });
    await run("ffmpeg", ["-v", "error", "-y", "-i", path.join(capturesDir, `${id}.mp4`), "-vf", "fps=30,scale=624:-2", "-q:v", "3", path.join(seq, "%05d.jpg")]);
    captureFrames[`captures/${id}`] = (await fs.readdir(seq)).length;
    await run("ffmpeg", ["-v", "error", "-y", "-ss", "0.5", "-i", path.join(capturesDir, `${id}.mp4`), "-frames:v", "1", path.join(pub, "stills", `${id}.png`)]);
  }

  // Brand files and fonts.
  for (const f of ["icon.svg", "logo.svg", "logo-dark.svg"]) await fs.copyFile(path.join(root, "web/public/dentvideo", f), path.join(pub, "brand", f));
  for (const f of ["InstrumentSerif-Regular.ttf", "PlusJakartaSans-SemiBold.ttf"]) await fs.copyFile(path.join(root, "web/assets/fonts", f), path.join(pub, "fonts", f));
  // The sample clinics' logos: a monogram in the clinic colour (drawn here, deliberately plain).
  for (const [lang, s] of Object.entries(SAMPLE)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><circle cx="120" cy="120" r="112" fill="${s.color}"/><circle cx="120" cy="120" r="96" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><text x="120" y="158" text-anchor="middle" font-family="Noto Serif Display, Georgia, serif" font-size="118" fill="#fff">${s.initial}</text></svg>`;
    await fs.writeFile(path.join(pub, "logos", `${lang}.svg`), svg);
  }

  const serveUrl = await bundle({
    entryPoint: path.join(root, "scripts/social-kit/Kit.tsx"),
    publicDir: pub,
    webpackOverride: (c) => {
      const w = webpackOverride(c);
      return { ...w, resolve: { ...w.resolve, modules: [path.join(root, "worker/node_modules"), "node_modules"] } };
    },
  });
  // The bundle copied public/ when it was built; files staged from here on go into its own copy.
  const live = path.join(serveUrl, "public");
  for (const d of ["audio", "bg", "stills"]) await fs.mkdir(path.join(live, d), { recursive: true });
  // Generous timeouts: this renders on shared dev boxes where a tab can wait a long time for a frame.
  const common = { serveUrl, browserExecutable: BROWSER ?? null, timeoutInMilliseconds: 180_000 } as const;
  const report: string[] = [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const stillJpg = async (id: string, props: Record<string, unknown>, out: string, frame = 0) => {
    const composition = await selectComposition({ ...common, id, inputProps: props });
    const png = out.replace(/\.jpg$/, ".png");
    await renderStill({ ...common, composition, inputProps: props, output: png, frame, imageFormat: "png" });
    if (out.endsWith(".jpg")) {
      await run("ffmpeg", ["-v", "error", "-y", "-i", png, "-q:v", "2", out]);
      await fs.rm(png);
    }
  };

  for (const [i, post] of POSTS.entries()) {
    const num = pad(i + 1);
    const name = `${num}-${post.id}`;
    if (only && !only.includes(post.id)) continue;
    let props: Record<string, unknown>;
    let compId: string;
    let screen: string;
    if (post.kind === "clinic") {
      const s = SAMPLE[post.lang];
      const raw = JSON.parse(await fs.readFile(path.join(root, "web/public/dentvideo/preview", `${post.preview}.json`), "utf8")) as ScenePlan;
      const personal = personalisePlan(raw as unknown as { scenes: Record<string, unknown>[] }, { name: s.name }) as unknown as ScenePlan;
      const mp3 = path.join(root, "web/public/dentvideo/preview", `${post.preview}.mp3`);
      const fit = await fitReel(personal, mp3, path.join(live, "audio", `${post.id}.wav`));
      if (fit.audio === mp3) await fs.copyFile(mp3, path.join(live, "audio", `${post.id}.mp3`));
      // The same photos a real week would get (web live preview / worker dental/week.ts).
      const input = { plan: raw as never, topic: raw.title, service: post.service, language: post.lang };
      const relevant = matchingBackgrounds(input);
      const bgs = defaultBackgrounds(suggestBackgrounds(input).filter((id: string) => relevant.has(id)), totalSeconds(raw));
      for (const b of bgs) await fs.copyFile(path.join(root, "web/public/dentvideo/backgrounds", `${b}.jpg`), path.join(live, "bg", `${b}.jpg`));
      props = {
        plan: { ...fit.plan, language: post.lang, brandColor: s.color.slice(1).toUpperCase() },
        voiceoverSrc: `audio/${path.basename(fit.audio === mp3 ? `${post.id}.mp3` : fit.audio)}`,
        logoSrc: `logos/${post.lang}.svg`,
        // A round mark that brings its own background: no chip, square box (as dental/logo.ts would decide).
        logoStyle: { treatment: "none", aspect: 1 },
        backgroundSrcs: bgs.map((b: string) => `bg/${b}.jpg`),
        label: s.label,
        url: s.url,
      };
      compId = "ClinicReel";
      // Cover screen: the reel's own frame once the hook has landed.
      screen = `stills/${post.id}.png`;
      const comp = await selectComposition({ ...common, id: compId, inputProps: props });
      await renderStill({ ...common, composition: comp, inputProps: props, output: path.join(live, screen), frame: 60, imageFormat: "png" });
      report.push(`${name}: ${fit.note}; backgrounds ${bgs.join(", ") || "none"}`);
    } else {
      props = { beats: post.beats.map((b) => (b.type === "screen" ? { ...b, frames: captureFrames[b.src as string] } : b)) };
      compId = "Explainer";
      screen = `stills/${post.coverShot}`;
    }
    const mp4 = path.join(outDir, "reels", `${name}.mp4`);
    // Resumable: a reel already rendered is kept (delete it, or pass --force, to render it again).
    if (!skipVideo && (args.includes("--force") || !existsSync(mp4))) {
      const composition = await selectComposition({ ...common, id: compId, inputProps: props });
      await renderMedia({ ...common, composition, inputProps: props, codec: "h264", crf: 20, outputLocation: mp4, concurrency: Number(process.env.KIT_CONCURRENCY ?? 2), audioCodec: "aac" });
      console.log(`rendered ${name} ${(composition.durationInFrames / FPS).toFixed(1)} s`);
    }
    // Covers: full 9:16 for the reel, 4:5 crop for the grid (the cover keeps everything inside y 285–1635).
    const kicker = post.kind === "clinic" ? SAMPLE[post.lang].kicker : "DENTVIDEO";
    const coverFull = path.join(outDir, "covers", `${name}-1080x1920.jpg`);
    await stillJpg("Cover", { dark: post.kind === "clinic", kicker, title: post.cover, screenSrc: screen, num: `${num}/12` }, coverFull);
    await run("ffmpeg", ["-v", "error", "-y", "-i", coverFull, "-vf", "crop=1080:1350:0:285", "-q:v", "2", path.join(outDir, "covers", `${name}-1080x1350.jpg`)]);
    // Instagram's grid now shows taller 3:4 thumbnails; the same cover, cropped to 1080×1440, for that.
    await run("ffmpeg", ["-v", "error", "-y", "-i", coverFull, "-vf", "crop=1080:1440:0:240", "-q:v", "2", path.join(outDir, "covers", `${name}-1080x1440.jpg`)]);
  }

  await fs.writeFile(path.join(outDir, `render-report${only ? "-partial" : ""}.txt`), report.join("\n") + "\n");
  console.log(report.join("\n"));
  if (only) return;

  // Profile kit.
  await stillJpg("Avatar", {}, path.join(outDir, "profile", "avatar-1080.png"));
  for (const h of HIGHLIGHTS) {
    const full = path.join(outDir, "profile", `highlight-${h.id}-1080x1920.png`);
    await stillJpg("Highlight", { icon: h.icon }, full);
  }
  await stillJpg(
    "Banner",
    {
      line: "Patient-education videos for dental clinics, every Monday.",
      sub: "Narrated, captioned, in the clinic's colours. Checked twice; the dentist approves every video.",
      shots: ["stills/tr-implant-asamalari.png", "stills/es-blanqueamiento.png", "stills/de-aligner-pflege.png"],
    },
    path.join(outDir, "profile", "linkedin-banner-1584x396.png"),
  );

  // Contact sheets: the profile grid with the three explainers pinned (top row), newest first after them;
  // on day 0 (posts 1–9) and after post 12.
  const crop = (i: number) => path.join(outDir, "covers", `${pad(i + 1)}-${POSTS[i].id}-1080x1350.jpg`);
  const pinned = POSTS.flatMap((p, i) => (p.kind === "explainer" ? [i] : []));
  for (const [label, upTo] of [["day0", 9], ["week4", 12]] as const) {
    const rest = POSTS.slice(0, upTo).flatMap((p, i) => (p.kind === "explainer" ? [] : [i])).reverse();
    const cells = [...pinned, ...rest].map(crop);
    const inputs = cells.flatMap((c) => ["-i", c]);
    const tiles = cells.map((_, i) => `[${i}:v]scale=360:450[t${i}]`).join(";");
    const layout = cells.map((_, i) => `${(i % 3) * 364}_${Math.floor(i / 3) * 454}`).join("|");
    await run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `${tiles};${cells.map((_, i) => `[t${i}]`).join("")}xstack=inputs=${cells.length}:layout=${layout}:fill=white[o]`, "-map", "[o]", "-q:v", "2", path.join(outDir, "profile", `grid-contact-sheet-${label}.jpg`)]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
