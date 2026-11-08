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
export async function prepareVoiceover(
  plan: ScenePlan,
  workDir: string,
): Promise<{ plan: ScenePlan; voiceoverPath?: string; voiceSeconds?: number }> {
  const text = plan.voiceover?.text?.trim();
  if (!text) return { plan };
  const { audioPath } = await synthesizeSpeech({
    text,
    voiceId: plan.voiceover?.voice ?? "nova",
    workDir,
    label: "voiceover",
    modelId: "tts-1-hd",
  });
  const voiceSeconds = await probeSeconds(audioPath);
  return { plan: fitPlanToVoice(plan, voiceSeconds), voiceoverPath: audioPath, voiceSeconds };
}
