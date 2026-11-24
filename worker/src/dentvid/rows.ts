import type { VideoPackage } from "../dental/week.js";
import type { RecordedClip } from "../dental/recording.js";
import { clipFinding, isSilentIssue, qaFinding, tagReason, UNCHECKED_FINDING } from "./reasons.js";

/**
 * How agent output becomes a dentvid_items row. Pure, so the mapping — and
 * in particular the status a clinic sees — is tested directly.
 *
 *   ready    passed every review and the QA measurements
 *   flagged  usable, but the dentist must look first (reviewer findings, a
 *            QA issue such as a long pause, or a QA check that could not run)
 *   rejected could not be made safely; kept so nothing disappears silently
 *
 * A generated video with no narration at all (QA: "no audio track", or a
 * measured mean volume too low to hear, seen when the voice could not be made
 * and the video was rendered without it) is rejected, not flagged: it is not a
 * video a clinic can post. It never counts as one of the week's five, so the
 * week's top-up makes another in its place (jobs.ts usableRow). Its uploaded
 * file is named in the row's error, for the owner only, and NOT in video_path
 * or thumb_path: the clinic's library signs and plays every video_path it is
 * given (the iPhone app lists rejected rows as "not made" cards), and the
 * clinic must never see or play a silent render. The file lives in the
 * owner's folder, which account deletion and retention remove as a whole.
 *
 * A render whose loudness could not be measured (an audio track, but the
 * volume pass printed no mean, e.g. ffmpeg cut short on a busy box) is not
 * called silent: QA's "mean ? dB" is no measurement. It is flagged
 * "qa unavailable" like a render whose QA could not run at all, so a good
 * narrated video is never thrown away and replaced at the clinic's cost.
 */

export type ItemRow = {
  /** Set only when something must point to the row before it is stored (a suggested topic's video). */
  id?: string;
  clinic_id: string;
  owner_id: string;
  kind: "generated" | "recording";
  status: "ready" | "flagged" | "rejected";
  title: string;
  topic?: unknown;
  plan?: unknown;
  /** Library photo ids offered for this video (0003_dentvid_backgrounds.sql). */
  suggested_backgrounds?: string[];
  copy?: unknown;
  spoken?: string;
  checks?: unknown;
  findings: string[];
  shoot_card?: unknown;
  qa?: unknown;
  video_path?: string;
  thumb_path?: string;
  source_path?: string;
  /** The Monday this item belongs to; set by the week job from the job data (not the run date). */
  week_of?: string;
  /** Technical failure, for the owner (admin dashboard) only — the clinic's library never shows it. */
  error?: string;
  /** Timed narration cues (dental/subtitles.ts; 0025_dentvid_clinic_requests.sql). */
  subtitles?: unknown;
};

export function rowFromPackage(
  pkg: VideoPackage,
  ids: { clinicId: string; ownerId: string },
  stored?: { videoPath: string; thumbPath?: string },
): ItemRow {
  if (pkg.status === "rejected") {
    return {
      clinic_id: ids.clinicId,
      owner_id: ids.ownerId,
      kind: "generated",
      status: "rejected",
      title: pkg.topic.title,
      topic: pkg.topic,
      // Reviewer reasons are internal English for the team: stored with a
      // code (reasons.ts) the app turns into a calm sentence in the clinic's
      // language. A technical error is for the owner only.
      findings: pkg.reasons.map((r) => tagReason("skipped", r)),
      ...(pkg.error ? { error: pkg.error.slice(0, 500) } : {}),
    };
  }
  const issues = pkg.qa && !pkg.qa.ok && Array.isArray(pkg.qa.issues) ? pkg.qa.issues : [];
  const silentIssues = issues.filter(isSilentIssue);
  // "Effectively silent (mean ? dB)" on a track that is there: the loudness was not measured.
  const unmeasured = silentIssues.length > 0 && loudnessUnmeasured(pkg.qa);
  if (silentIssues.length && !unmeasured) {
    const file = stored?.videoPath ? ` (file kept for the owner: ${stored.videoPath})` : "";
    return {
      clinic_id: ids.clinicId,
      owner_id: ids.ownerId,
      kind: "generated",
      status: "rejected",
      title: pkg.topic.title,
      topic: pkg.topic,
      plan: pkg.plan,
      copy: pkg.copy,
      checks: pkg.checks,
      // No clinic-facing finding: a topic not made reads "we couldn't make this one" (web reasons.ts).
      findings: [],
      qa: pkg.qa,
      // No video_path / thumb_path: the clinic's library would sign and play them.
      // For the owner (admin panel, short-week alert); a technical failure, so the week retries or tops up.
      error: `${`silent render: ${issues.join("; ")}`.slice(0, 500 - file.length)}${file}`,
    };
  }
  const qaIssues = (unmeasured ? issues.filter((i) => !isSilentIssue(i)) : issues).map(qaFinding);
  // A rendered video whose QA measurement could not run has been checked by
  // nobody. week.ts reports the qa field for every render it measured
  // (undefined when inspectVideo threw); such a video is never "ready".
  // Nor is one whose loudness pass printed nothing: its sound is unchecked.
  const unchecked = pkg.videoPath && (unmeasured || qaMissing(pkg)) ? [UNCHECKED_FINDING] : [];
  // A package meant to be rendered that has no stored video is not ready.
  const missingVideo = stored ? [] : [MISSING_VIDEO];
  const findings = [...qaIssues, ...unchecked, ...missingVideo];
  return {
    clinic_id: ids.clinicId,
    owner_id: ids.ownerId,
    kind: "generated",
    status: findings.length ? "flagged" : "ready",
    title: pkg.topic.title,
    topic: pkg.topic,
    plan: pkg.plan,
    ...(pkg.suggestedBackgrounds?.length ? { suggested_backgrounds: pkg.suggestedBackgrounds } : {}),
    copy: pkg.copy,
    checks: pkg.checks,
    findings,
    shoot_card: pkg.shootCard,
    qa: pkg.qa,
    video_path: stored?.videoPath,
    thumb_path: stored?.thumbPath,
  };
}

/**
 * The QA report is absent although week.ts tried to measure the render: the
 * field is there but empty (inspectVideo threw), or it is not a report.
 * Packages built without the field at all (callers that never measure, such
 * as test doubles of week.ts) are judged by the other rules.
 */
/**
 * QA called the audio silent without having measured it: the track is there
 * (hasAudio) but the volume pass gave no mean (steps/qa.ts parseMeanVolume
 * null, judged "effectively silent (mean ? dB)"). A measured -inf (digital
 * silence) is a measurement. A report without its stats is read by its words.
 */
function loudnessUnmeasured(qa: unknown): boolean {
  const stats = (qa as { stats?: { hasAudio?: unknown; meanVolumeDb?: unknown } } | null | undefined)?.stats;
  if (stats && typeof stats === "object" && typeof stats.hasAudio === "boolean") {
    return stats.hasAudio && (typeof stats.meanVolumeDb !== "number" || Number.isNaN(stats.meanVolumeDb));
  }
  const issues = (qa as { issues?: unknown } | null | undefined)?.issues;
  return Array.isArray(issues) && issues.some((i) => typeof i === "string" && /effectively silent \(mean \? dB\)/i.test(i)) && !issues.some((i) => i === "no audio track");
}

function qaMissing(pkg: Extract<VideoPackage, { status: "ready" }>): boolean {
  if (!("qa" in pkg)) return false;
  const qa = pkg.qa as { ok?: unknown; issues?: unknown } | null | undefined;
  return !qa || typeof qa.ok !== "boolean" || !Array.isArray(qa.issues);
}

export function rowFromClip(
  clip: RecordedClip,
  ids: { clinicId: string; ownerId: string; sourcePath: string },
  stored?: { videoPath: string; thumbPath?: string },
): ItemRow {
  const coded = clip.findings.map((f) => clipFinding(f, [MISSING_VIDEO]));
  const findings = stored ? coded : [...coded, MISSING_VIDEO];
  return {
    clinic_id: ids.clinicId,
    owner_id: ids.ownerId,
    kind: "recording",
    status: findings.length ? "flagged" : "ready",
    title: clip.moment.hook || clip.spoken.split(/[.!?]/)[0].slice(0, 80) || "Clip",
    copy: clip.copy,
    spoken: clip.spoken,
    checks: clip.checks,
    findings,
    video_path: stored?.videoPath,
    thumb_path: stored?.thumbPath,
    source_path: ids.sourcePath,
  };
}

/** Storage keys live under the owner's folder (storage RLS checks it). */
export function storageKey(ownerId: string, itemKey: string, ext: "mp4" | "jpg"): string {
  return `${ownerId}/${itemKey}.${ext}`;
}

/** The finding a package gets when its video could not be stored (rowFromPackage / rowFromClip). */
export const MISSING_VIDEO = "the video file is missing";

/**
 * A row's status and findings once a re-render (restyle, or the owner's
 * "retry this video" in the admin panel) has stored a fresh video: the
 * "file is missing" finding goes; a row flagged only for that becomes ready;
 * a legacy "failed" row becomes flagged (the dentist looks first). Any other
 * status is left alone: a reviewer's verdict is never upgraded by a render.
 */
export function afterRerender(status: string | null | undefined, findings: unknown): { status?: "ready" | "flagged"; findings?: string[] } {
  const list = Array.isArray(findings) ? findings.filter((f): f is string => typeof f === "string") : [];
  const kept = list.filter((f) => f !== MISSING_VIDEO);
  const changed = kept.length !== list.length;
  if (status === "failed") return { status: "flagged", ...(changed ? { findings: kept } : {}) };
  if (status === "flagged" && changed) return kept.length ? { findings: kept } : { status: "ready", findings: kept };
  return changed ? { findings: kept } : {};
}
