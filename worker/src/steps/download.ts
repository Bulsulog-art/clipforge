import path from "node:path";
import fs from "node:fs/promises";
import { create as createYtDlp } from "youtube-dl-exec";
import ffmpeg from "fluent-ffmpeg";
import { supabase } from "../supabase.js";

const ytdl = createYtDlp(process.env.YTDLP_PATH ?? "yt-dlp");

export type DownloadResult = { path: string; durationSec: number; title: string };

/**
 * Thrown when the source platform refuses the download from this server —
 * in practice YouTube's "Sign in to confirm you're not a bot" challenge,
 * which it serves aggressively to datacenter IPs. It is not a bug in our
 * pipeline and it is not the user's fault, so it must not surface as a raw
 * yt-dlp stack trace. The caller turns it into a plain instruction: upload
 * the file instead.
 */
export class SourceBlockedError extends Error {
  readonly userMessage: string;
  constructor(platform: string) {
    super(`${platform} blocked this download from the server`);
    this.name = "SourceBlockedError";
    this.userMessage =
      `${platform} is blocking downloads from our servers right now. ` +
      `Upload the video file directly and we'll clip it the same way.`;
  }
}

/** yt-dlp signatures that mean "the platform blocked us", not "bad link". */
function isPlatformBlock(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("confirm you") && m.includes("bot") ||
    m.includes("sign in to confirm") ||
    m.includes("cookies-from-browser") ||
    m.includes("http error 429") ||
    m.includes("this content isn't available")
  );
}

/**
 * Optional escape hatches for the platform block, both off by default:
 *   YTDLP_COOKIES_FILE — path to a Netscape cookies.txt inside the container.
 *   YTDLP_PROXY        — proxy URL (a residential proxy defeats the IP block).
 * Neither is required for the upload path, which is why upload is the one we
 * point users at instead of quietly adding a recurring cost.
 */
function sourceAuthOptions(): Record<string, string> {
  const opts: Record<string, string> = {};
  const cookies = process.env.YTDLP_COOKIES_FILE;
  const proxy = process.env.YTDLP_PROXY;
  if (cookies) opts.cookies = cookies;
  if (proxy) opts.proxy = proxy;
  return opts;
}

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
  let info: unknown;
  try {
    info = await ytdl(p.sourceUrl, {
      output: local,
      format: "bv*[height<=1080]+ba/b[height<=1080]",
      mergeOutputFormat: "mp4",
      noPlaylist: true,
      quiet: true,
      noWarnings: true,
      ...sourceAuthOptions(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isPlatformBlock(msg)) {
      const platform = p.sourceType === "tiktok_url" ? "TikTok" : "YouTube";
      throw new SourceBlockedError(platform);
    }
    throw e;
  }
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
