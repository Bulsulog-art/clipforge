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
  /** The Monday this item belongs to; set by the week job from the job data (not the run date). */
  week_of?: string;
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
  const missingVideo = stored ? [] : [MISSING_VIDEO];
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
  const findings = stored ? clip.findings : [...clip.findings, MISSING_VIDEO];
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
