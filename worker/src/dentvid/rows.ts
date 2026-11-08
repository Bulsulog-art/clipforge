import type { VideoPackage } from "../dental/week.js";
import type { RecordedClip } from "../dental/recording.js";

/**
 * How agent output becomes a dentvid_items row. Pure, so the mapping — and
 * in particular the status a clinic sees — is tested directly.
 *
 *   ready    passed every review and the QA measurements
 *   flagged  usable, but the dentist must look first (reviewer findings,
 *            or a QA issue such as silent narration)
 *   rejected could not be made safely; kept so nothing disappears silently
 */

export type ItemRow = {
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
  /** Technical failure, for the owner (admin dashboard) only — the clinic's library never shows it. */
  error?: string;
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
      // Reviewer reasons are for the dentist; a technical error is not.
      findings: pkg.reasons,
      ...(pkg.error ? { error: pkg.error.slice(0, 500) } : {}),
    };
  }
  const qaIssues = pkg.qa && !pkg.qa.ok ? pkg.qa.issues.map((i) => `quality: ${i}`) : [];
  // A package meant to be rendered that has no stored video is not ready.
  const missingVideo = stored ? [] : ["the video file is missing"];
  const findings = [...qaIssues, ...missingVideo];
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

export function rowFromClip(
  clip: RecordedClip,
  ids: { clinicId: string; ownerId: string; sourcePath: string },
  stored?: { videoPath: string; thumbPath?: string },
): ItemRow {
  const findings = stored ? clip.findings : [...clip.findings, "the video file is missing"];
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
