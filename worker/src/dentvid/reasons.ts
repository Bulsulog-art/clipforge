/**
 * Why a video was flagged, or a topic not made — as a machine code the app
 * turns into a short, calm sentence in the clinic's language.
 *
 * The raw reviewer / QA text ("3.1s of silence (max 3s)", a reviewer's
 * critique of a draft) is internal English meant for the team. It stays in
 * dentvid_items.findings for the admin panel, prefixed with its code:
 *
 *   "[dv:pause] quality: 3.1s of silence (max 3s)"
 *
 * The web app (web/src/lib/dentvid/reasons.ts) reads the code and never shows
 * the text to a clinic. Rows written before the codes existed are mapped by
 * pattern there. Keep the two lists of codes in step.
 */

export const REASON_CODES = [
  /** A pause in the narration longer than the QA allows. */
  "pause",
  /** No audio, or audio too quiet to hear. */
  "audio",
  /** Another QA measurement (length, resolution, black frames). */
  "technical",
  /** A reviewer flagged the wording of a recording. */
  "wording",
  /** The model's on-screen opening line was removed (hard rules). */
  "opening",
  /** A topic that was not made: the script did not meet the quality bar. */
  "skipped",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

const TAG = /^\[dv:([a-z]+)\]\s*/;

/** "[dv:code] text": the code for the app, the text for the team. */
export function tagReason(code: ReasonCode, text: string): string {
  return TAG.test(text) ? text : `[dv:${code}] ${text}`;
}

/** The text without its code (owner alerts, logs). */
export function reasonText(finding: string): string {
  return finding.replace(TAG, "");
}

/** The code of a QA issue (steps/qa.ts judge). */
export function qaReasonCode(issue: string): ReasonCode {
  if (/of silence/i.test(issue)) return "pause";
  if (/no audio track|effectively silent/i.test(issue)) return "audio";
  return "technical";
}

/** A QA issue as a stored finding. */
export function qaFinding(issue: string): string {
  return tagReason(qaReasonCode(issue), `quality: ${issue}`);
}

/**
 * A recording clip's findings (dental/recording.ts) as stored findings:
 * QA issues ("quality: …"), the removed hook, or a reviewer's note.
 * Untagged technical markers (MISSING_VIDEO) pass through; the app hides them.
 */
export function clipFinding(f: string, technical: readonly string[] = []): string {
  if (TAG.test(f) || technical.includes(f)) return f;
  if (/^quality:\s*/i.test(f)) return tagReason(qaReasonCode(f.replace(/^quality:\s*/i, "")), f);
  if (/^hook removed/i.test(f)) return tagReason("opening", f);
  return tagReason("wording", f);
}
