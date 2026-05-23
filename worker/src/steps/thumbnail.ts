import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { runFalSync } from "../fal.js";

type ThumbStyle = "mrbeast" | "cinematic" | "minimal";

type ThumbArgs = {
  userId: string;
  jobId: string;
  clipIndex: number;
  videoPath: string;          // rendered MP4
  hook: string;               // viral hook text
  niche: string;
  durationSec: number;
  workDir: string;
  /** Premium feature: call Replicate for AI background. Default: false (free). */
  aiBackground?: boolean;
  /**
   * Compose recipe to use. Picked by the user in the iOS New Project sheet.
   *   mrbeast   — punchy, saturated, big bold hook (default; legacy behaviour)
   *   cinematic — letterbox bars, desaturated, lower-third hook in light weight
   *   minimal   — clean frame, small caption pill bottom-centre, no overlay
   */
  style?: ThumbStyle;
};

const NICHE_GRADIENT: Record<string, [string, string]> = {
  motivation: ["#FF3366", "#FF6B35"],
  business:   ["#0EA5E9", "#1E40AF"],
  finance:    ["#FFD700", "#FF8C00"],
  health:     ["#10B981", "#059669"],
  tech:       ["#8B5CF6", "#3B82F6"],
  comedy:     ["#FBBF24", "#EF4444"],
  fitness:    ["#FF1744", "#FF6B6B"],
  spirituality:["#F4A623", "#92400E"],
  default:    ["#FF3366", "#FF6699"],
};

/**
 * Generate a Mr.Beast-style thumbnail:
 *  - extract peak frame from the rendered clip (at ~15% in)
 *  - apply vibrance, contrast, vignette
 *  - overlay 2-3-line bold hook with niche gradient + black outline
 *  - export 1080×1920 jpg (9:16 — matches clip)
 *
 * Cost: ~$0 (CPU only). If aiBackground=true, ~$0.003 via Replicate Flux.
 */
export async function generateThumbnail(args: ThumbArgs): Promise<{ storagePath: string }> {
  const out = path.join(args.workDir, `thumb-${args.clipIndex}.jpg`);
  const peakSec = Math.min(0.6 + args.durationSec * 0.15, args.durationSec - 0.2);
  const [color1, color2] = NICHE_GRADIENT[args.niche] ?? NICHE_GRADIENT.default;
  const style: ThumbStyle = args.style ?? "mrbeast";
  const filters = buildVideoFilters(style, args.hook, color1, color2);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(args.videoPath)
      .seekInput(peakSec)
      .frames(1)
      .videoFilters(filters)
      .outputOptions(["-q:v", "2", "-vf", "scale=1080:1920:flags=lanczos"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });

  if (args.aiBackground && process.env.FAL_KEY) {
    try {
      await enhanceWithFalFlux(out);
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "fal enhance failed — keeping CPU thumb");
    }
  }

  const storagePath = `${args.userId}/${args.jobId}/thumb-${args.clipIndex}.jpg`;
  const { error } = await supabase.storage
    .from("clipforge-thumbnails")
    .upload(storagePath, createReadStream(out) as any, {
      contentType: "image/jpeg",
      upsert: true,
      duplex: "half",
    } as any);
  if (error) throw error;

  await fs.unlink(out).catch(() => {});
  return { storagePath };
}

/**
 * Optional AI enhance via FAL.ai Flux Schnell (img2img).
 * Sends the CPU thumbnail as init image with a "youtube thumbnail" prompt
 * to add depth and pop. Costs ~$0.003/image — ~10x cheaper than Replicate.
 */
async function enhanceWithFalFlux(localJpgPath: string) {
  const fileData = await fs.readFile(localJpgPath);
  const base64 = `data:image/jpeg;base64,${fileData.toString("base64")}`;

  // fal-ai/flux/schnell with image_url performs img2img. ~3 sec on average.
  const result = await runFalSync<{ images?: Array<{ url: string }> }>(
    "fal-ai/flux/schnell",
    {
      prompt: "viral YouTube thumbnail, mr beast style, dramatic lighting, vibrant colors, bold composition",
      image_url: base64,
      strength: 0.55,
      image_size: "portrait_9_16",
      num_images: 1,
      enable_safety_checker: false,
    },
  );

  const outUrl = result.images?.[0]?.url;
  if (!outUrl) throw new Error("FAL Flux returned no image");
  const img = await fetch(outUrl);
  const buf = Buffer.from(await img.arrayBuffer());
  await fs.writeFile(localJpgPath, buf);
}

/**
 * Build the FFmpeg filter chain for a given thumbnail style. Each style is
 * a curated combination of colour grade + overlay geometry. Keep this pure
 * (no I/O) so the recipe can be unit-tested if we ever add coverage.
 */
function buildVideoFilters(
  style: ThumbStyle,
  hook: string,
  color1: string,
  color2: string,
): string[] {
  switch (style) {
    case "cinematic": return cinematicFilters(hook, color1, color2);
    case "minimal":   return minimalFilters(hook, color1);
    case "mrbeast":
    default:          return mrBeastFilters(hook, color1, color2);
  }
}

function mrBeastFilters(hook: string, color1: string, color2: string): string[] {
  const hookLines = wrap(hook, 14).slice(0, 3);
  const fontSize = hookLines.length === 1 ? 110 : hookLines.length === 2 ? 96 : 84;
  const drawtexts = hookLines.map((line, i) => {
    const y = `(h*0.62)+${i * Math.round(fontSize * 1.05)}`;
    const safe = escapeDrawText(line);
    return [
      `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
        `text='${safe}':fontcolor=black@0.85:fontsize=${fontSize + 6}:` +
        `x=(w-text_w)/2+4:y=${y}+4`,
      `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
        `text='${safe}':fontcolor=${color1}:fontsize=${fontSize}:` +
        `borderw=4:bordercolor=black:x=(w-text_w)/2:y=${y}`,
    ].join(",");
  }).join(",");

  return [
    "eq=saturation=1.35:contrast=1.18:brightness=0.02",
    "vignette=angle=PI/5",
    `drawbox=x=0:y=ih*0.55:w=iw:h=ih*0.45:color=black@0.45:t=fill`,
    `drawbox=x=0:y=0:w=iw:h=8:color=${color1}:t=fill`,
    `drawbox=x=0:y=ih-8:w=iw:h=8:color=${color2}:t=fill`,
    drawtexts,
  ];
}

function cinematicFilters(hook: string, color1: string, color2: string): string[] {
  // Two lines max; thinner type, lower-third placement; letterbox bars top + bottom.
  const hookLines = wrap(hook, 22).slice(0, 2);
  const fontSize = hookLines.length === 1 ? 84 : 70;
  const drawtexts = hookLines.map((line, i) => {
    const y = `(h*0.78)+${i * Math.round(fontSize * 1.1)}`;
    const safe = escapeDrawText(line);
    return `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
      `text='${safe}':fontcolor=white:fontsize=${fontSize}:` +
      `borderw=2:bordercolor=black@0.6:x=(w-text_w)/2:y=${y}`;
  }).join(",");

  return [
    // desaturate + boost contrast for that filmic look
    "eq=saturation=0.85:contrast=1.12:brightness=-0.02",
    // letterbox bars
    `drawbox=x=0:y=0:w=iw:h=ih*0.12:color=black:t=fill`,
    `drawbox=x=0:y=ih*0.88:w=iw:h=ih*0.12:color=black:t=fill`,
    // thin accent line just above caption
    `drawbox=x=iw*0.15:y=ih*0.74:w=iw*0.70:h=2:color=${color1}:t=fill`,
    // light film grain via noise filter
    "noise=alls=8:allf=t",
    drawtexts,
  ];
}

function minimalFilters(hook: string, color1: string): string[] {
  // One short line in a pill at bottom-centre. Frame stays clean.
  const line = (wrap(hook, 30)[0] ?? "").slice(0, 38);
  const fontSize = 56;
  const safe = escapeDrawText(line);
  const drawtext = `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
    `text='${safe}':fontcolor=white:fontsize=${fontSize}:` +
    `box=1:boxcolor=black@0.62:boxborderw=22:` +
    `x=(w-text_w)/2:y=h-180`;

  return [
    "eq=saturation=1.05:contrast=1.05",
    // gentle accent dot top-left
    `drawbox=x=60:y=60:w=10:h=10:color=${color1}:t=fill`,
    drawtext,
  ];
}

function wrap(text: string, perLine: number): string[] {
  const words = text.replace(/[\.!?]+$/g, "").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > perLine && line) {
      out.push(line.trim().toUpperCase());
      line = w;
    } else {
      line = `${line} ${w}`;
    }
  }
  if (line.trim()) out.push(line.trim().toUpperCase());
  return out;
}

function escapeDrawText(s: string) {
  return s.replace(/['"\\:%]/g, " ").replace(/\n/g, " ");
}
