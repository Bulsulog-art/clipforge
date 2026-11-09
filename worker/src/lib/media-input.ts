import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

/**
 * Guard rails for every ffmpeg / ffprobe call that reads a file a customer
 * influenced (an uploaded logo, an uploaded recording, anything derived from
 * them).
 *
 * ffmpeg is a network client and a playlist interpreter: given an HLS or
 * concat "video" it happily opens http://, file:///etc/passwd or any other
 * URL named inside it. So user-influenced input is only ever read:
 *
 *   - from a local path inside a directory we created (a job's temp dir),
 *     resolved through symlinks — never a URL, never a path the customer chose;
 *   - with `-protocol_whitelist file,pipe` (no http, tcp, data, concat, …);
 *   - with a demuxer allow-list for the kind of file it should be, so a
 *     playlist or concat script disguised as .mp4 / .png is refused outright
 *     instead of being followed.
 */

export const PROTOCOL_WHITELIST = "file,pipe";

/** Demuxers a clinic recording may use (MP4/MOV, Matroska/WebM). */
export const VIDEO_FORMATS = "mov,mp4,m4a,3gp,3g2,mj2,matroska,webm";
/** Demuxers a logo may use (PNG, JPEG, WebP; image2 is the still-image file reader). */
export const IMAGE_FORMATS = "image2,png_pipe,jpeg_pipe,webp_pipe";
/** Our own audio files (TTS output, normalised narration). */
export const AUDIO_FORMATS = "mp3,wav,mov,mp4,m4a,3gp,3g2,mj2,ogg,matroska,webm,aac";

export type MediaKind = "video" | "image" | "audio";

const FORMATS: Record<MediaKind, string> = { video: VIDEO_FORMATS, image: IMAGE_FORMATS, audio: AUDIO_FORMATS };

/** Input options (ffmpeg / ffprobe argv) that pin protocols and demuxers for one input. */
export function safeInputArgs(kind: MediaKind): string[] {
  return ["-protocol_whitelist", PROTOCOL_WHITELIST, "-format_whitelist", FORMATS[kind]];
}

/** The directories user-influenced media may be read from: the OS temp dir (job work dirs live there) plus any given. */
export function mediaRoots(extra: (string | undefined)[] = []): string[] {
  return [os.tmpdir(), ...extra].filter((d): d is string => !!d).map((d) => realOrResolved(d));
}

function realOrResolved(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/** Is `file` (after resolving symlinks) inside one of `roots`? */
export function isInside(file: string, roots: string[]): boolean {
  const real = realOrResolved(file);
  return roots.some((r) => {
    const rel = path.relative(r, real);
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  });
}

export class UnsafeMediaInputError extends Error {}

/**
 * Throws unless `file` is a plain local path inside one of the allowed roots
 * (default: the OS temp dir). Refuses URLs and anything with a protocol
 * prefix ("http:", "file:", "concat:", "subfile,,…") — ffmpeg would parse
 * those as protocols, not file names.
 */
export function assertLocalMedia(file: string, roots: string[] = mediaRoots()): string {
  if (typeof file !== "string" || !file) throw new UnsafeMediaInputError("no media path");
  if (/^[a-z][a-z0-9+.-]*:/i.test(file) || file.includes("\0")) throw new UnsafeMediaInputError(`not a local path: ${file.slice(0, 80)}`);
  if (!path.isAbsolute(file)) throw new UnsafeMediaInputError(`not an absolute path: ${file.slice(0, 80)}`);
  if (!isInside(file, roots)) throw new UnsafeMediaInputError(`media outside the job's directory: ${file.slice(0, 120)}`);
  return file;
}

const execFileP = promisify(execFile);

/**
 * Duration in seconds of a user-influenced media file, read with the
 * protocol and demuxer allow-lists: NaN when unreadable, outside the job's
 * directories, or not the expected kind of file (a playlist or concat
 * script in disguise) — callers refuse the file before anything else reads it.
 */
export async function probeDuration(file: string, kind: MediaKind = "video"): Promise<number> {
  try {
    const { stdout } = await execFileP(
      "ffprobe",
      ["-v", "error", ...safeInputArgs(kind), "-show_entries", "format=duration", "-of", "csv=p=0", assertLocalMedia(file)],
      { timeout: 60_000 },
    );
    const n = Number(stdout.trim().split("\n")[0]);
    return Number.isFinite(n) && n > 0 ? n : Number.NaN;
  } catch {
    return Number.NaN;
  }
}
