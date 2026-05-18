import path from "node:path";
import fs from "node:fs/promises";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";

export type MusicTrack = {
  id: string;
  name: string;
  mood: string;
  niches: string[];
  duration_sec: number;
  storage_path: string;
  energy: number;
  attribution: string | null;
};

type PickArgs = {
  niche: string;
  /** target clip duration in seconds — we prefer tracks longer than this so the loop is short */
  durationSec: number;
  /** optional mood override (Plus tier UI may pass this) */
  mood?: string | null;
};

/**
 * Picks a music track from the catalog that matches the given niche/mood/duration.
 * Returns null if nothing suitable was found.
 *
 * Selection is biased toward:
 *   1. tracks tagged with the niche (exact match)
 *   2. tracks whose duration ≥ clip duration (avoids audible loop seams)
 *   3. mood = motivational as fallback (works for most viral content)
 */
export async function pickTrack({ niche, durationSec, mood }: PickArgs): Promise<MusicTrack | null> {
  // 1) niche-matched (preferred)
  let q = supabase
    .from("music_tracks")
    .select("id, name, mood, niches, duration_sec, storage_path, energy, attribution")
    .eq("is_active", true)
    .contains("niches", [niche])
    .gte("duration_sec", Math.max(30, Math.ceil(durationSec)));
  if (mood) q = q.eq("mood", mood);
  const { data: byNiche } = await q.limit(8);

  if (byNiche && byNiche.length > 0) {
    return pickRandom(byNiche as MusicTrack[]);
  }

  // 2) mood-only fallback
  if (mood) {
    const { data: byMood } = await supabase
      .from("music_tracks")
      .select("id, name, mood, niches, duration_sec, storage_path, energy, attribution")
      .eq("is_active", true)
      .eq("mood", mood)
      .gte("duration_sec", Math.max(30, Math.ceil(durationSec)))
      .limit(8);
    if (byMood && byMood.length > 0) return pickRandom(byMood as MusicTrack[]);
  }

  // 3) safe default — motivational
  const { data: def } = await supabase
    .from("music_tracks")
    .select("id, name, mood, niches, duration_sec, storage_path, energy, attribution")
    .eq("is_active", true)
    .eq("mood", "motivational")
    .gte("duration_sec", Math.max(30, Math.ceil(durationSec)))
    .limit(8);
  if (def && def.length > 0) return pickRandom(def as MusicTrack[]);

  return null;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Downloads the chosen track to the work directory.
 * Returns null if the file is missing from storage (e.g. catalog row exists
 * but the audio file hasn't been uploaded yet) — caller should treat this as
 * "no music for this clip" rather than fail the whole render.
 */
export async function downloadTrack(
  track: MusicTrack,
  workDir: string,
): Promise<{ localPath: string } | null> {
  const ext = path.extname(track.storage_path) || ".mp3";
  const localPath = path.join(workDir, `bgmusic-${track.id}${ext}`);

  const { data, error } = await supabase.storage
    .from("clipforge-music")
    .download(track.storage_path);

  if (error || !data) {
    logger.warn(
      { trackId: track.id, storagePath: track.storage_path, err: error?.message },
      "bg music track missing in storage — rendering without music",
    );
    return null;
  }

  const buf = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(localPath, buf);
  return { localPath };
}
