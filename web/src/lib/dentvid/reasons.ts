/**
 * What a clinic reads about a flagged video or a topic that was not made.
 *
 * dentvid_items.findings holds internal English for the team — QA
 * measurements ("3.1s of silence (max 3s)") and reviewer critiques of a
 * draft. The worker stores each with a machine code
 * (worker/src/dentvid/reasons.ts): "[dv:pause] quality: 3.1s of silence".
 * A clinic only ever sees the code, as a calm sentence in its own language
 * (content/dentvideo-reasons.ts). Rows written before the codes are mapped by
 * pattern; anything unrecognised falls back to a generic sentence. The raw
 * text is for the admin panel only (findingText).
 */

/** Keep in step with worker/src/dentvid/reasons.ts REASON_CODES, plus the fallback. */
export const CLINIC_REASONS = ["pause", "audio", "technical", "wording", "opening", "skipped", "unavailable", "generic"] as const;
export type ClinicReason = (typeof CLINIC_REASONS)[number];

const TAG = /^\[dv:([a-z]+)\]\s*/;

/** Technical markers for the owner only: never a reason a clinic reads. */
const TECHNICAL = [/^could not produce:/i, /^the video file is missing$/i, /^could not store/i];

function qaCode(issue: string): ClinicReason {
  if (/of silence/i.test(issue)) return "pause";
  if (/no audio|\bsilent\b|quiet/i.test(issue)) return "audio";
  return "technical";
}

/** The code of one stored finding, or null when it is technical (hidden). */
export function reasonCode(finding: string, status?: string | null): ClinicReason | null {
  const f = finding.trim();
  if (!f || TECHNICAL.some((r) => r.test(f))) return null;
  const tagged = f.match(TAG);
  if (tagged) {
    const code = tagged[1] as ClinicReason;
    return (CLINIC_REASONS as readonly string[]).includes(code) ? code : status === "rejected" ? "skipped" : "generic";
  }
  // Rows from before the codes: map what the worker used to write.
  if (status === "rejected") return "skipped";
  if (/^quality:\s*/i.test(f)) return qaCode(f.replace(/^quality:\s*/i, ""));
  if (/^hook removed/i.test(f)) return "opening";
  // A reviewer's note on a recording quoted the words it was about.
  if (/^"[^"]*":/.test(f)) return "wording";
  return "generic";
}

/** The reasons a clinic may read: codes only, each once, in order. */
export function clinicReasons(findings: unknown, status?: string | null): ClinicReason[] {
  const list = Array.isArray(findings) ? findings.filter((f): f is string => typeof f === "string") : [];
  const out: ClinicReason[] = [];
  for (const f of list) {
    const c = reasonCode(f, status);
    if (c && !out.includes(c)) out.push(c);
  }
  // A topic that was not made always says why, even when its only note was technical.
  if (status === "rejected" && out.length === 0) return ["unavailable"];
  // "generic" only when nothing more specific is there.
  return out.length > 1 ? out.filter((c) => c !== "generic") : out;
}

/** A finding's raw text, without its code (admin panel, owner emails). */
export function findingText(finding: string): string {
  return finding.replace(TAG, "");
}
