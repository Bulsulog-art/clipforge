import ffmpeg from "fluent-ffmpeg";
import { synthesizeSpeech } from "../steps/tts.js";
import { LIMITS, totalSeconds, type ScenePlan } from "./scene-plan.js";

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

/** Narration target: a little under the platforms' ~-14 so music and peaks keep headroom. */
export const LOUDNESS = { I: -16, TP: -1.5, LRA: 11 } as const;

export type LoudnormMeasure = {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
};

/** Pull loudnorm's `print_format=json` block out of ffmpeg's stderr. */
export function parseLoudnormJson(stderr: string): LoudnormMeasure | null {
  const m = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Record<string, unknown>;
    const keys = ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"] as const;
    // Silence measures as -inf, which the second pass rejects.
    if (!keys.every((k) => Number.isFinite(Number(j[k])))) return null;
    return Object.fromEntries(keys.map((k) => [k, String(j[k])])) as LoudnormMeasure;
  } catch {
    return null;
  }
}

/** The loudnorm filter: linear two-pass when a measurement is given, dynamic one-pass otherwise. */
export function loudnormFilter(m?: LoudnormMeasure | null): string {
  const base = `loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}`;
  if (!m) return base;
  return (
    `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
  );
}

function measureLoudness(input: string): Promise<LoudnormMeasure | null> {
  return new Promise((resolve) => {
    try {
      ffmpeg(input)
        .audioFilters(`${loudnormFilter()}:print_format=json`)
        .noVideo()
        .format("null")
        .on("end", (_out: string | null, err: string | null) => resolve(parseLoudnormJson(err ?? "")))
        .on("error", () => resolve(null))
        .save("-");
    } catch {
      resolve(null);
    }
  });
}

/**
 * TTS comes out quiet (tts-1-hd about -26 LUFS, gpt-4o-mini-tts about -20,
 * measured 2026-11-08); Reels/TikTok/Shorts play at about -14, so
 * unnormalised narration sounds noticeably quieter than the videos around it
 * in a feed. Bring it to -16 LUFS (true peak -1.5 dB).
 *
 * Two-pass: measure first, then apply one linear gain, which keeps the
 * voice's natural dynamics (one-pass loudnorm pumps on short clips). If the
 * measurement fails it falls back to one pass. Fail-soft: if the encode
 * fails the original file is used. Sample rate is pinned to 48 kHz because
 * loudnorm resamples to 192 kHz internally.
 */
export async function normalizeLoudness(input: string): Promise<string> {
  const out = input.replace(/(\.[a-z0-9]+)?$/i, ".loud.mp3");
  const measured = await measureLoudness(input);
  return new Promise((resolve) => {
    try {
      ffmpeg(input)
        .audioFilters(loudnormFilter(measured))
        .audioCodec("libmp3lame")
        .audioBitrate("160k")
        .audioFrequency(48000)
        .on("end", () => resolve(out))
        .on("error", () => resolve(input))
        .save(out);
    } catch {
      resolve(input);
    }
  });
}
