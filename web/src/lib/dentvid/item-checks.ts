import type { Checked, ScriptLine } from "@/components/dentvid/video-checks";
import { reasonCode } from "./reasons";
import { storedCues } from "./subtitles";

/**
 * What a stored dentvid_items row proves about its checks, and its script, as
 * the library card and the review show them (components/dentvid/video-checks.tsx).
 * Pure: loadItems (items.ts) calls these on the rows it read.
 *
 * The worker stores, for a video we wrote (worker/src/dental/week.ts, dentvid/rows.ts):
 *   checks  { script: { compliance, accuracy }, copy: { compliance, accuracy } },
 *           each review with its verdict ("pass" | "revise" | "block")
 *   qa      { ok, issues, stats }: the picture and sound measurement of the render
 *   findings, with "[dv:unchecked]" when that measurement could not run
 * and, for a clip from the dentist's recording (dental/recording.ts), the
 * reviews of what was said ({ compliance, accuracy }, no caption review) and
 * the words themselves (`spoken`).
 *
 * checkedOf says "checked" only where that proves it:
 *  - a video we wrote, ready or flagged, whose script AND caption passed both
 *    the clinical accuracy and the advertising review;
 *  - never when QA could not run ("[dv:unchecked]", or the old "qa unavailable"):
 *    then nothing is claimed at all;
 *  - "picture and sound" only when the stored QA report is clean, no QA finding
 *    is on the row, and the file was not re-rendered since: a photo update
 *    (or the owner's "retry this video") renders a new file without measuring
 *    it again (worker jobs.ts runDentvidRestyle), so after one the stored
 *    report describes an earlier file and is not claimed.
 * A recorded clip gets no line: its caption is written after the reviews and
 * not reviewed itself, and its QA report is not stored.
 *
 * scriptOf gives the narration, sentence by sentence. With stored subtitle
 * cues (0025) each sentence has the time it starts; without them, plain
 * sentences. A sentence is marked only where the stored review quotes words in
 * it (a recorded clip flagged for wording): the QA findings of a video we wrote
 * ("a pause", "quiet in places") say nothing of where, so nothing is marked.
 */

type Verdict = { verdict?: unknown };
type Review = { compliance?: Verdict; accuracy?: Verdict } | null | undefined;

export type ChecksRow = {
  kind: string;
  status: string;
  checks?: unknown;
  qa?: unknown;
  findings?: unknown;
  restyle_requested_at?: string | null;
};

const QA_CODES = new Set(["pause", "audio", "technical", "unchecked"]);

const findingList = (findings: unknown): string[] => (Array.isArray(findings) ? findings.filter((f): f is string => typeof f === "string") : []);

/** A finding that says the picture and sound measurement never ran on this video. */
function unchecked(finding: string): boolean {
  return reasonCode(finding) === "unchecked" || /\bqa unavailable\b/i.test(finding);
}

const passed = (r: Review) => r?.compliance?.verdict === "pass" && r?.accuracy?.verdict === "pass";

export function checkedOf(r: ChecksRow): Checked | undefined {
  if (r.kind !== "generated" || (r.status !== "ready" && r.status !== "flagged")) return undefined;
  const findings = findingList(r.findings);
  if (findings.some(unchecked)) return undefined;
  const c = r.checks as { script?: Review; copy?: Review } | null | undefined;
  if (!c || typeof c !== "object" || !passed(c.script) || !passed(c.copy)) return undefined;
  const qa = r.qa as { ok?: unknown; issues?: unknown } | null | undefined;
  const clean = !!qa && typeof qa === "object" && qa.ok === true && Array.isArray(qa.issues) && qa.issues.length === 0;
  const qaFinding = findings.some((f) => QA_CODES.has(reasonCode(f) ?? ""));
  return { picture: clean && !qaFinding && !r.restyle_requested_at };
}

/* ------------------------------------------------------------------ script */

/** Sentences of a narration, punctuation kept: the worker's own split (dental/subtitles.ts sentences). */
export function sentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  for (const m of clean.matchAll(/[^.!?…。！？؟]*(?:[.!?…。！？؟]+["'”’»)]*|$)/gu)) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

/** Japanese and Chinese are written without spaces: their cue pieces and lines join without one. */
const unspaced = (language: unknown) => typeof language === "string" && /^(ja|zh)/i.test(language);
const ENDS_SENTENCE = /[.!?…。！？؟]+["'”’»)]*$/u;

/** Most sentences a script shows, and most characters in all (a narration of 90 s is about 1,500). */
const MAX_LINES = 80;
const MAX_CHARS = 4000;

function capped(lines: ScriptLine[]): ScriptLine[] | undefined {
  const out: ScriptLine[] = [];
  let used = 0;
  for (const l of lines.slice(0, MAX_LINES)) {
    if (used + l.text.length > MAX_CHARS) break;
    used += l.text.length;
    out.push(l);
  }
  return out.length ? out : undefined;
}

/** The stored cues grouped back into sentences, each starting where its first cue does. */
export function linesFromCues(subtitles: unknown, language?: unknown): ScriptLine[] {
  const cues = storedCues(subtitles);
  const glue = unspaced(language) ? "" : " ";
  const out: ScriptLine[] = [];
  let parts: string[] = [];
  let at: number | null = null;
  const flush = () => {
    const text = parts.join(glue).trim();
    if (text && at !== null) out.push({ text, at: Math.round(at * 10) / 10 });
    parts = [];
    at = null;
  };
  for (const c of cues) {
    if (at === null) at = c.start;
    parts.push(c.text.split("\n").join(glue));
    if (ENDS_SENTENCE.test(c.text.trim())) flush();
  }
  flush();
  return out;
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase()
    .replace(/[“”„«»"'’‘`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** The words a stored review quotes from what it read: hard-rule matches and each issue's quote. */
export function quotesOf(review: unknown): string[] {
  const r = review as { compliance?: { hard?: unknown; issues?: unknown }; accuracy?: { issues?: unknown } } | null | undefined;
  if (!r || typeof r !== "object") return [];
  const pick = (list: unknown, key: "match" | "quote") =>
    Array.isArray(list) ? list.map((x) => (x as Record<string, unknown> | null)?.[key]).filter((q): q is string => typeof q === "string") : [];
  return [...pick(r.compliance?.hard, "match"), ...pick(r.compliance?.issues, "quote"), ...pick(r.accuracy?.issues, "quote")]
    .map((q) => norm(q).replace(/^[\s.,;:!?…-]+|[\s.,;:!?…-]+$/g, ""))
    .filter((q) => [...q].length >= 3);
}

/** Marks each sentence that holds one of the quoted words (or lies inside a quote that runs over several). */
export function markQuoted(lines: ScriptLine[], quotes: string[]): ScriptLine[] {
  if (!quotes.length) return lines;
  return lines.map((l) => {
    const s = norm(l.text);
    const bare = s.replace(/[.!?…。！？؟]+$/u, "");
    return quotes.some((q) => s.includes(q) || (bare.length >= 3 && q.includes(bare))) ? { ...l, marked: true as const } : l;
  });
}

export type ScriptRow = ChecksRow & {
  plan?: { language?: unknown; voiceover?: { text?: unknown } | null } | null;
  subtitles?: unknown;
  spoken?: unknown;
};

export function scriptOf(r: ScriptRow): ScriptLine[] | undefined {
  if (r.status !== "ready" && r.status !== "flagged") return undefined;
  if (r.kind === "recording") {
    const lines = sentences(typeof r.spoken === "string" ? r.spoken : "").map((text) => ({ text }));
    // Only a clip flagged for its wording points at words; its reviews quote them.
    const wording = findingList(r.findings).some((f) => reasonCode(f, r.status) === "wording");
    return capped(wording ? markQuoted(lines, quotesOf(r.checks)) : lines);
  }
  if (r.kind !== "generated") return undefined;
  const timed = linesFromCues(r.subtitles, r.plan?.language);
  if (timed.length) return capped(timed);
  const text = r.plan?.voiceover?.text;
  return capped(sentences(typeof text === "string" ? text : "").map((t) => ({ text: t })));
}
