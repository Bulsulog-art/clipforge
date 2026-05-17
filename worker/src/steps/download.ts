import path from "node:path";
import fs from "node:fs/promises";
import { create as createYtDlp } from "youtube-dl-exec";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "../supabase.js";

const ytdl = createYtDlp(process.env.YTDLP_PATH ?? "yt-dlp");

export type DownloadResult = { path: string; durationSec: number; title: string };

export async function downloadSource(
  p: { sourceType: string; sourceUrl?: string; storagePath?: string },
  workDir: string,
): Promise<DownloadResult> {
  if (p.sourceType === "upload" && p.storagePath) {
    const { data, error } = await supabase.storage.from("clipforge-videos-raw").download(p.storagePath);
    if (error || !data) throw new Error(error?.message ?? "download fail");
    const local = path.join(workDir, "input.mp4");
    await fs.writeFile(local, Buffer.from(await data.arrayBuffer()));
    const meta = await probe(local);
    return { path: local, durationSec: meta.durationSec, title: path.basename(p.storagePath) };
  }

  if (!p.sourceUrl) throw new Error("sourceUrl missing");
  const local = path.join(workDir, "input.mp4");
  const info = await ytdl(p.sourceUrl, {
    output: local,
    format: "bv*[height<=1080]+ba/b[height<=1080]",
    mergeOutputFormat: "mp4",
    noPlaylist: true,
    quiet: true,
    noWarnings: true,
  });
  const probed = await probe(local);
  return {
    path: local,
    durationSec: probed.durationSec,
    title: typeof info === "object" && info && "title" in info ? String((info as any).title) : "Untitled",
  };
}

function probe(file: string): Promise<{ durationSec: number }> {
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return rej(err);
      res({ durationSec: Number(data.format.duration ?? 0) });
    });
  });
}
