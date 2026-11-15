import ffmpeg from "fluent-ffmpeg";
import { synthesizeSpeech } from "../steps/tts.js";
import { FPS, LIMITS, totalSeconds, type ScenePlan } from "./scene-plan.js";

/**
 * Narration for a scene plan.
 *
 * The plan's scene lengths are the model's guess at reading speed; real
 * speech is whatever length it is. Rendered as-is, a narration longer than
 * the video is cut off mid-sentence. So the plan is stretched to the
 * narration (never shrunk below the model's timing, which is what keeps
 * text on screen long enough to read), within the renderer's limits.
 */

/** Seconds of video kept after the last word, so it does not end abruptly. */
export const TAIL_SECONDS = 0.8;

export function fitPlanToVoice(plan: ScenePlan, voiceSeconds: number): ScenePlan {
  const current = totalSeconds(plan);
  const target = Math.min(LIMITS.totalSeconds.max, voiceSeconds + TAIL_SECONDS);
  if (!(target > current)) return plan;

  const factor = target / current;
  const round = (n: number) => Math.round(n * 10) / 10;
  const clamp = (n: number) => Math.min(LIMITS.sceneSeconds.max, Math.max(LIMITS.sceneSeconds.min, n));
  const scenes = plan.scenes.map((s) => ({ ...s, seconds: clamp(round(s.seconds * factor)) }));

  // Scenes that hit the per-scene ceiling leave time unplaced; give it to
  // the scenes that still have room, so the total still covers the voice.
  let short = target - scenes.reduce((a, s) => a + s.seconds, 0);
  for (let guard = 0; short > 0.05 && guard < 20; guard++) {
    const room = scenes.filter((s) => s.seconds < LIMITS.sceneSeconds.max);
    if (!room.length) break;
    const each = short / room.length;
    for (const s of room) s.seconds = clamp(round(s.seconds + each));
    short = target - scenes.reduce((a, s) => a + s.seconds, 0);
  }
  return { ...plan, scenes } as ScenePlan;
}

/** A stretch of silence in the narration, in seconds from its start (= from frame 0). */
export type Pause = { start: number; end: number };

/** How far a cut may move to land in a pause, seconds. Further than this it is probably the wrong pause. */
export const SNAP_RANGE = 1.0;
/** Pauses shorter than this are breaths inside a sentence, not the gap between two. */
export const MIN_SNAP_PAUSE = 0.2;
/** The cut lands this long before the next words start, so the new card is up as they are heard. */
const CUT_LEAD = 0.15;
/** Seconds of distance one second of pause length is worth when choosing between pauses. */
const LENGTH_WEIGHT = 0.5;
/** Two silences this close together are one pause with a click or a breath in it (TTS leaves ~0.14 s of breath noise mid-pause). */
const BLIP = 0.15;

/** Joins silences split by a blip (a breath, a click) into the one pause they are. Detect with a short minimum (50 ms) and merge here: a 0.5 s pause in three pieces is invisible to a 0.2 s detector. */
export function mergePauses(pauses: Pause[]): Pause[] {
  const out: Pause[] = [];
  for (const p of [...pauses].sort((a, b) => a.start - b.start)) {
    const last = out.at(-1);
    if (last && p.start - last.end < BLIP) last.end = Math.max(last.end, p.end);
    else out.push({ ...p });
  }
  return out;
}

/**
 * Moves each cut between scenes into the nearest pause in the narration.
 *
 * Scene lengths are the model's guess at reading time, stretched in
 * proportion to the real narration (fitPlanToVoice), so a card regularly
 * changed in the middle of a spoken sentence: in the English brushing sample
 * the cut at 14.0 s falls 0.8 s into a phrase and the one at 6.0 s 0.13 s
 * after the next sentence has started (silencedetect on the published mp4,
 * pauses at 12.7-13.2 s and 5.4-5.9 s). The TTS leaves a clear gap between
 * sentences; each cut is moved to the best one near it (within SNAP_RANGE:
 * near, and long rather than short — a "?" inside the hook is a shorter gap
 * than the end of it), just before the next sentence starts, so the card
 * changes when the voice does.
 *
 * Deterministic and conservative: cuts keep their order, each pause is used
 * once, every scene stays within the plan's length limits, the total running
 * time is unchanged, and a cut with no pause near it stays where it was.
 */
export function snapScenesToPauses(plan: ScenePlan, pauses: Pause[]): ScenePlan {
  const n = plan.scenes.length;
  if (n < 2) return plan;
  const { min, max } = LIMITS.sceneSeconds;
  const total = plan.scenes.reduce((a, s) => a + s.seconds, 0);
  const cuts: number[] = [];
  let acc = 0;
  for (const s of plan.scenes.slice(0, -1)) cuts.push((acc += s.seconds));

  // Where a cut would go for each pause: late in the gap, but never in its first half.
  const targets = mergePauses(pauses)
    .filter((p) => p.end - p.start >= MIN_SNAP_PAUSE && p.start > 0 && p.end < total)
    .map((p) => ({ at: Math.max((p.start + p.end) / 2, p.end - CUT_LEAD), length: p.end - p.start }))
    .sort((a, b) => a.at - b.at);
  // A longer pause is more likely the end of a sentence than a comma or a "?"
  // inside one: it wins over a nearer short one unless that is much nearer.
  const cost = (t: { at: number; length: number }, cut: number) => Math.abs(t.at - cut) - LENGTH_WEIGHT * t.length;
  const used = new Set<number>();

  const snapped: number[] = [];
  let prev = 0;
  for (const [k, cut] of cuts.entries()) {
    // Room the scenes still to come need, so a cut never squeezes them under the minimum.
    const after = n - 1 - k;
    const lo = prev + min;
    // ...nor leaves the next scene, if its own cut stays put, under the minimum.
    const hi = Math.min(prev + max, total - after * min, (cuts[k + 1] ?? total) - min);
    let best: number | undefined;
    for (const [j, t] of targets.entries()) {
      if (used.has(j) || t.at < lo || t.at > hi || Math.abs(t.at - cut) > SNAP_RANGE) continue;
      if (best === undefined || cost(t, cut) < cost(targets[best], cut)) best = j;
    }
    let at = cut;
    if (best !== undefined) {
      used.add(best);
      at = targets[best].at;
    }
    at = Math.min(Math.max(at, lo), hi);
    snapped.push(at);
    prev = at;
  }
  const last = total - prev;
  if (last < min - 1e-9 || last > max + 1e-9) return plan;

  // Seconds on the frame grid, so rounding never drifts the total.
  const grid = (t: number) => Math.round(t * FPS) / FPS;
  const edges = [0, ...snapped.map(grid), grid(total)];
  const scenes = plan.scenes.map((s, i) => ({ ...s, seconds: Math.round((edges[i + 1] - edges[i]) * 1000) / 1000 }));
  if (scenes.some((s) => s.seconds < min - 1e-9 || s.seconds > max + 1e-9)) return plan;
  return { ...plan, scenes } as ScenePlan;
}

export function probeSeconds(file: string): Promise<number> {
  return new Promise((resolve, reject) =>
    ffmpeg.ffprobe(file, (err, data) => (err ? reject(err) : resolve(Number(data.format.duration ?? 0)))),
  );
}

/**
 * Speak the plan's voiceover and return the audio plus a plan timed to it.
 * No voiceover in the plan → the plan unchanged and no audio.
 */
export const DEFAULT_VOICE_MODEL = "tts-1-hd";

export type VoiceOptions = {
  /** TTS model; default tts-1-hd. */
  model?: string;
  /** Tone/pronunciation brief for steerable models (gpt-4o-mini-tts). */
  instructions?: string;
  /** Called when the configured model failed and tts-1-hd was used instead. */
  onFallback?: (err: Error) => void;
};

export async function prepareVoiceover(
  plan: ScenePlan,
  workDir: string,
  opts: VoiceOptions = {},
): Promise<{ plan: ScenePlan; voiceoverPath?: string; voiceSeconds?: number; voiceModel?: string }> {
  const text = plan.voiceover?.text?.trim();
  if (!text) return { plan };
  const base = { text, voiceId: plan.voiceover?.voice ?? "nova", workDir, label: "voiceover" };
  const model = opts.model ?? DEFAULT_VOICE_MODEL;
  let used = model;
  const audioPath = await synthesizeSpeech({ ...base, modelId: model, instructions: opts.instructions })
    .catch(async (err: Error) => {
      // A newer model failing (outage, quota, a voice it lacks) must not cost
      // the video: say it once more on the long-standing model, plainly.
      if (model === DEFAULT_VOICE_MODEL) throw err;
      opts.onFallback?.(err);
      used = DEFAULT_VOICE_MODEL;
      return synthesizeSpeech({ ...base, modelId: DEFAULT_VOICE_MODEL });
    })
    .then((r) => r.audioPath);
  const loud = await normalizeLoudness(audioPath);
  const voiceSeconds = await probeSeconds(loud);
  return { plan: fitPlanToVoice(plan, voiceSeconds), voiceoverPath: loud, voiceSeconds, voiceModel: used };
}

/**
 * TTS comes out around -26 LUFS; Reels/TikTok/Shorts play at about -14, so
 * unnormalised narration sounds noticeably quieter than the videos around it
 * in a feed. Bring it to -16 LUFS (true peak -1.5 dB). Fail-soft: on any
 * ffmpeg error the original file is used.
 */
export function normalizeLoudness(input: string): Promise<string> {
  const out = input.replace(/(\.[a-z0-9]+)?$/i, ".loud.mp3");
  return new Promise((resolve) => {
    try {
      ffmpeg(input)
        .audioFilters("loudnorm=I=-16:TP=-1.5:LRA=11")
        .audioCodec("libmp3lame")
        .audioBitrate("160k")
        .on("end", () => resolve(out))
        .on("error", () => resolve(input))
        .save(out);
    } catch {
      resolve(input);
    }
  });
}
