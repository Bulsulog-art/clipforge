// Client-safe (no node imports): used by the web new-project page and the jobs API.

/** YouTube answers downloads from data-centre IPs with a bot check, so a
 * YouTube job fails on our servers after minutes of waiting (7 of 8 in the
 * 30 days to 2026-11-16). We refuse the link up front and point at upload. */
const YOUTUBE_SOURCE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);

export const YOUTUBE_BLOCKED_MESSAGE =
  "YouTube blocks downloads from our servers, so YouTube links can't be imported. Download the video and upload the file instead.";

export function isYouTubeSourceUrl(u: string): boolean {
  try {
    return YOUTUBE_SOURCE_HOSTS.has(new URL(u.trim()).hostname.toLowerCase());
  } catch {
    return false;
  }
}
