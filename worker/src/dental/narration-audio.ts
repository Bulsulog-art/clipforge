import fs from "node:fs/promises";
import path from "node:path";
import { fitPlanToVoice, prepareVoiceover, type VoiceOptions } from "../remotion/voiceover.js";
import type { ScenePlan } from "../remotion/scene-plan.js";
import { masterNarration, mixNarrationWithMusic, type MasterOptions } from "./audio-master.js";
import { speechText } from "./speech-text.js";
import { speakingTempo } from "./voice.js";

/**
 * DentVideo narration end to end: the text the voice reads (speech-text.ts),
 * the TTS call (unchanged, prepareVoiceover), then mastering (audio-master.ts):
 * edges trimmed, long pauses shortened, the language's speaking rate, -14 LUFS
 * / -1 dBTP, and — when a track is given — a ducked music bed.
 *
 * Mastering is best effort: if ffmpeg fails, the voice prepareVoiceover made
 * is used as before, so a mastering bug costs polish, never the video.
 */
export type NarrationOptions = VoiceOptions & {
  /** Optional music file to mix under the narration (ducked, faded). */
  musicPath?: string;
  /** Overrides for the mastering chain (tests, evals). */
  master?: MasterOptions;
  /** Called when mastering failed and the unmastered voice was used. */
  onMasterError?: (err: Error) => void;
};

export type Narration = {
  plan: ScenePlan;
  voiceoverPath?: string;
  voiceSeconds?: number;
  voiceModel?: string;
  /** True when the file is the mastered (and maybe music-mixed) one. */
  mastered?: boolean;
};

/** The plan with the narration replaced by what the voice should read. */
export function speechPlan(plan: ScenePlan, language: string | undefined): ScenePlan {
  const text = plan.voiceover?.text;
  if (!text?.trim()) return plan;
  const spoken = speechText(text, language);
  return spoken && spoken !== text ? ({ ...plan, voiceover: { ...plan.voiceover!, text: spoken } } as ScenePlan) : plan;
}

/** prepareVoiceover writes `<label>.mp3` and returns `<label>.loud.mp3`; master from the TTS original. */
async function rawTtsFile(voiceoverPath: string): Promise<string> {
  const raw = voiceoverPath.replace(/\.loud\.mp3$/i, ".mp3");
  if (raw === voiceoverPath) return voiceoverPath;
  return fs.access(raw).then(
    () => raw,
    () => voiceoverPath,
  );
}

export async function prepareNarration(
  plan: ScenePlan,
  workDir: string,
  language: string | undefined,
  opts: NarrationOptions = {},
): Promise<Narration> {
  const { musicPath, master, onMasterError, ...voiceOpts } = opts;
  const voice = await prepareVoiceover(speechPlan(plan, language), workDir, voiceOpts);
  // The stored plan keeps the narrator's own words; only the audio used the spoken form.
  const keepText = (p: ScenePlan): ScenePlan => (plan.voiceover && p.voiceover ? ({ ...p, voiceover: plan.voiceover } as ScenePlan) : p);
  if (!voice?.voiceoverPath) return { ...voice, plan: keepText(voice?.plan ?? plan) };

  try {
    const src = await rawTtsFile(voice.voiceoverPath);
    const tempo = master?.tempo ?? speakingTempo(language, voice.voiceModel);
    const mastered = await masterNarration(src, path.join(workDir, "voiceover.master.wav"), { ...master, tempo });
    let out = mastered;
    if (musicPath) {
      out = await mixNarrationWithMusic(mastered.path, musicPath, path.join(workDir, "voiceover.mix.wav"), { target: master?.target }).catch((e: Error) => {
        onMasterError?.(e);
        return mastered;
      });
    }
    // Slower speech is longer: stretch the plan again (it never shrinks).
    return {
      plan: keepText(fitPlanToVoice(voice.plan, out.seconds)),
      voiceoverPath: out.path,
      voiceSeconds: out.seconds,
      voiceModel: voice.voiceModel,
      mastered: true,
    };
  } catch (e) {
    onMasterError?.(e as Error);
    return { ...voice, plan: keepText(voice.plan) };
  }
}
