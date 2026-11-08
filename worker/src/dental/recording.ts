import path from "node:path";
import type OpenAI from "openai";
import { extractAudio } from "../steps/extract-audio.js";
import { transcribe, type Transcript } from "../steps/transcribe.js";
import { scoreMoments, type Moment } from "../steps/score.js";
import { renderClipFile } from "../steps/render.js";
import { detectFaces, faceCropOffset } from "../steps/reframe.js";
import { resolveAspect } from "../aspect.js";
import { reviewCompliance, scanHardRules, type ComplianceResult } from "./compliance.js";
import { reviewAccuracy, type AccuracyResult } from "./accuracy.js";
import { writePostCopy, type PostCopy } from "./copywriter.js";
import type { ClinicProfile } from "./profile.js";
import type { Topic } from "./strategist.js";

/**
 * The recording agent: the dentist's own video in, branded clips out.
 *
 * This is the part patients trust — the clinic's own dentist, speaking. The
 * dentist films from a shoot card on a phone; this turns the recording into
 * short vertical clips with captions, the speaker kept in frame, and a
 * caption written from what was actually said.
 *
 * The dentist's words are never rewritten. Each clip's spoken text still
 * goes through both reviewers, and a clip with findings is not dropped but
 * marked "flagged" with the reasons, so the dentist sees exactly what to
 * reconsider before approving. Nothing here is published automatically.
 */

export type RecordedClip = {
  status: "ready" | "flagged";
  approval: "pending";
  moment: Pick<Moment, "start" | "end" | "hook" | "score">;
  /** What the dentist said in this clip, verbatim from the transcript. */
  spoken: string;
  copy: PostCopy;
  checks: { compliance: ComplianceResult; accuracy: AccuracyResult };
  /** Why the clip needs the dentist's attention (flagged only). */
  findings: string[];
  videoPath?: string;
  thumbPath?: string;
};

export type RecordingDeps = {
  client: OpenAI;
  workDir: string;
  /** Render the clips to files. Off = review and copy only. */
  render?: boolean;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
};

export function spokenText(t: Transcript, start: number, end: number): string {
  return t.words
    .filter((w) => w.end > start && w.start < end)
    .map((w) => w.word)
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

export function findingsOf(c: ComplianceResult, a: AccuracyResult): string[] {
  return [
    ...c.hard.map((h) => `"${h.match}": ${h.why}`),
    ...c.issues.map((i) => `"${i.quote}": ${i.problem} → ${i.fix}`),
    ...a.issues.map((i) => `"${i.quote}": ${i.problem} → ${i.fix}`),
  ];
}

export async function clipsFromRecording(
  deps: RecordingDeps,
  profile: ClinicProfile,
  videoPath: string,
  topic?: Topic,
  opts: { maxClips?: number } = {},
): Promise<RecordedClip[]> {
  const audio = await extractAudio(videoPath, deps.workDir);
  const transcript = await transcribe(audio, profile.language);
  deps.log?.("transcribed", { words: transcript.words.length });

  const moments = await scoreMoments({
    transcript,
    niche: "dental",
    maxClips: opts.maxClips ?? 4,
    minSec: 12,
    maxSec: 60,
    userPrompt: topic
      ? `Moments where the dentist explains "${topic.title}" clearly enough to stand alone. Hooks and captions in ${profile.language}.`
      : `Self-contained explanations a patient would find useful. Hooks and captions in ${profile.language}.`,
  });
  deps.log?.("moments", { count: moments.length });

  const out: RecordedClip[] = [];
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i];
    const spoken = spokenText(transcript, m.start, m.end);
    // Without a shoot-card topic, the clip's subject is whatever the dentist
    // talked about — never assume one of the clinic's services. (Assuming the
    // first one flagged a root-canal explanation as "off topic" for cleanings.)
    const clipTopic: Topic = topic ?? {
      title: m.hook,
      pillar: "education",
      question: m.hook,
      hook: m.hook,
      service: "whatever the dentist is explaining in this clip",
    };

    const compliance = await reviewCompliance(deps.client, profile, spoken);
    const accuracy = await reviewAccuracy(deps.client, profile, clipTopic, { script: spoken }, "recording");
    const findings = compliance.verdict === "pass" && accuracy.verdict === "pass" ? [] : findingsOf(compliance, accuracy);
    // The hook is written by the model, not said by the dentist, and it is
    // burned on screen in large type. One that makes a risky claim is not
    // shown at all. (Seen live: "Wurzelbehandlung ist heute schmerzfrei!")
    const hookHits = scanHardRules(m.hook);
    const hook = hookHits.length ? "" : m.hook;
    if (hookHits.length) findings.push(`hook removed — "${m.hook}": ${hookHits.map((h) => h.why).join(" ")}`);

    // The caption may only say what the dentist said.
    const copy = await writePostCopy(deps.client, profile, { ...clipTopic, hook: hook || clipTopic.question }, [], spoken);

    let clipVideo: string | undefined;
    let clipThumb: string | undefined;
    if (deps.render) {
      const outAspect = resolveAspect("9:16");
      const faces = await detectFaces({ sourcePath: videoPath, clipStartSec: m.start, clipEndSec: m.end });
      const faceCropX = faces
        ? faceCropOffset({ srcW: faces.width, srcH: faces.height, outW: outAspect.w, outH: outAspect.h, centresSrcX: faces.centres })
        : undefined;
      const clip = await renderClipFile({
        sourcePath: videoPath,
        index: i,
        moment: { ...m, hook },
        transcript,
        niche: "dental",
        captionStyle: "clean",
        aspect: "9:16",
        faceCropX,
        workDir: deps.workDir,
        watermark: false,
      });
      clipVideo = clip.videoPath;
      clipThumb = clip.thumbPath;
    }

    out.push({
      status: findings.length ? "flagged" : "ready",
      approval: "pending",
      moment: { start: m.start, end: m.end, hook, score: m.score },
      spoken,
      copy,
      checks: { compliance, accuracy },
      findings,
      videoPath: clipVideo,
      thumbPath: clipThumb,
    });
    deps.log?.("clip", { i, status: out.at(-1)!.status, seconds: Math.round(m.end - m.start) });
  }
  return out;
}

export function clipDir(workDir: string, i: number): string {
  return path.join(workDir, `clip-${i}`);
}
