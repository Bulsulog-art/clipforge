import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";

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

  const hookLines = wrap(args.hook, 14).slice(0, 3);
  const fontSize = hookLines.length === 1 ? 110 : hookLines.length === 2 ? 96 : 84;

  // Compose: peak frame → vibrance + contrast + vignette + gradient overlay strip + text
  await new Promise<void>((resolve, reject) => {
    const drawtexts = hookLines.map((line, i) => {
      const y = `(h*0.62)+${i * Math.round(fontSize * 1.05)}`;
      const safe = escapeDrawText(line);
      // bold glow effect: 3 layers — bigger black, gradient-fill, white core
      return [
        `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
          `text='${safe}':fontcolor=black@0.85:fontsize=${fontSize + 6}:` +
          `x=(w-text_w)/2+4:y=${y}+4`,
        `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
          `text='${safe}':fontcolor=${color1}:fontsize=${fontSize}:` +
          `borderw=4:bordercolor=black:x=(w-text_w)/2:y=${y}`,
      ].join(",");
    }).join(",");

    ffmpeg(args.videoPath)
      .seekInput(peakSec)
      .frames(1)
      .videoFilters([
        // saturate + punchy
        "eq=saturation=1.35:contrast=1.18:brightness=0.02",
        // vignette for focus
        "vignette=angle=PI/5",
        // subtle bottom-fade so caption sits on darker pixels
        `drawbox=x=0:y=ih*0.55:w=iw:h=ih*0.45:color=black@0.45:t=fill`,
        // accent stripe top
        `drawbox=x=0:y=0:w=iw:h=8:color=${color1}:t=fill`,
        `drawbox=x=0:y=ih-8:w=iw:h=8:color=${color2}:t=fill`,
        // text
        drawtexts,
      ])
      .outputOptions(["-q:v", "2", "-vf", "scale=1080:1920:flags=lanczos"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });

  if (args.aiBackground && process.env.REPLICATE_API_TOKEN) {
    try {
      await enhanceWithReplicate(out);
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "replicate enhance failed — keeping CPU thumb");
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
 * Optional AI enhance via Replicate Flux Schnell.
 * Sends the CPU thumbnail as init image with a "youtube thumbnail" prompt
 * to add depth and pop.
 */
async function enhanceWithReplicate(localJpgPath: string) {
  const fileData = await fs.readFile(localJpgPath);
  const base64 = `data:image/jpeg;base64,${fileData.toString("base64")}`;

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
      input: {
        prompt: "viral YouTube thumbnail, mr beast style, dramatic lighting, vibrant colors, bold composition",
        image: base64,
        prompt_strength: 0.55,
        output_format: "jpg",
        num_outputs: 1,
        aspect_ratio: "9:16",
      },
    }),
  });
  if (!res.ok) throw new Error(`Replicate ${res.status}`);

  const job = (await res.json()) as { id: string; urls: { get: string } };

  // poll
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    await new Promise((r) => setTimeout(r, 1500));
    const sr = await fetch(job.urls.get, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    });
    const status = (await sr.json()) as { status: string; output?: string[] };
    if (status.status === "succeeded" && status.output?.[0]) {
      const img = await fetch(status.output[0]);
      const buf = Buffer.from(await img.arrayBuffer());
      await fs.writeFile(localJpgPath, buf);
      return;
    }
    if (status.status === "failed" || status.status === "canceled") {
      throw new Error(`Replicate ${status.status}`);
    }
  }
  throw new Error("Replicate enhance timed out");
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
