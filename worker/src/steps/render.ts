import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "../supabase.js";
import type { Moment } from "./score.js";

type Args = {
  userId: string;
  jobId: string;
  sourcePath: string;
  index: number;
  moment: Moment;
  workDir: string;
};

export async function renderClip(a: Args) {
  const out = path.join(a.workDir, `clip-${a.index}.mp4`);
  const thumb = path.join(a.workDir, `clip-${a.index}.jpg`);
  const duration = a.moment.end - a.moment.start;

  // 1) cut + scale to 9:16 + burn-in subtitle (simple variant)
  await new Promise<void>((resolve, reject) => {
    ffmpeg(a.sourcePath)
      .setStartTime(a.moment.start)
      .duration(duration)
      .videoFilters([
        // center-crop to 9:16
        "scale=-2:1920:force_original_aspect_ratio=increase",
        "crop=1080:1920",
        // hook overlay
        `drawtext=fontfile=/usr/share/fonts/truetype/inter/Inter-Bold.ttf:` +
          `text='${escapeDrawText(a.moment.hook)}':fontcolor=white:fontsize=72:` +
          `borderw=4:bordercolor=black:x=(w-text_w)/2:y=180:line_spacing=10`,
      ])
      .audioFilters(["loudnorm=I=-16:LRA=11:TP=-1.5"])
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-crf 21",
        "-c:a aac",
        "-b:a 192k",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-r 30",
      ])
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });

  // 2) thumbnail at mid clip
  await new Promise<void>((resolve, reject) => {
    ffmpeg(out)
      .seekInput(Math.min(2, duration / 2))
      .frames(1)
      .size("540x960")
      .on("end", () => resolve())
      .on("error", reject)
      .save(thumb);
  });

  // 3) upload to storage
  const storagePath = `${a.userId}/${a.jobId}/clip-${a.index}.mp4`;
  const thumbPath = `${a.userId}/${a.jobId}/clip-${a.index}.jpg`;
  const [{ error: vErr }, { error: tErr }] = await Promise.all([
    supabase.storage.from("clipforge-videos-rendered").upload(storagePath, createReadStream(out) as any, {
      contentType: "video/mp4",
      upsert: true,
      duplex: "half",
    } as any),
    supabase.storage.from("clipforge-thumbnails").upload(thumbPath, createReadStream(thumb) as any, {
      contentType: "image/jpeg",
      upsert: true,
      duplex: "half",
    } as any),
  ]);
  if (vErr) throw vErr;
  if (tErr) throw tErr;

  await fs.unlink(out).catch(() => {});
  await fs.unlink(thumb).catch(() => {});

  return { storagePath, thumbnailPath: thumbPath, durationSec: duration };
}

function escapeDrawText(s: string) {
  return s.replace(/['"\\:%]/g, " ").replace(/\n/g, " ").slice(0, 80);
}
