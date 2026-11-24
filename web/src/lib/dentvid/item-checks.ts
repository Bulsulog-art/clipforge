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
 * checkedOf says "checked" only where that proves it, and fails closed:
 *  - a video we wrote, ready or flagged, whose script AND caption passed both
 *    the clinical accuracy and the advertising review, and whose picture and
 *    sound measurement ran (a stored report with a boolean `ok` and a list of
 *    `issues`);
 *  - never when QA could not run ("[dv:unchecked]", the old "qa unavailable",
 *    or no report stored at all): then nothing is claimed;
 *  - never when the row carries any finding other than a QA measurement the
 *    clinic is told about (a pause, the sound, a technical one): wording, an
 *    opening line taken out, a hidden technical marker, or a code this file
 *    does not know yet. A new kind of finding hides the line until it is
 *    added here on purpose, rather than the line claiming past it;
 *  - "picture and sound" only when the stored QA report is clean, no finding
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

/**
 * The only findings a "checked" video may carry: QA measurements of the render, each said to the clinic
 * as its own reason. They say nothing against the reviews, only that picture and sound is not claimed.
 */
const QA_CODES: ReadonlySet<string> = new Set(["pause", "audio", "technical"]);

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
  // Fail closed: any finding that is not a QA measurement (or that this file cannot read) hides the line.
  if (findings.some((f) => !QA_CODES.has(reasonCode(f) ?? ""))) return undefined;
  const c = r.checks as { script?: Review; copy?: Review } | null | undefined;
  if (!c || typeof c !== "object" || !passed(c.script) || !passed(c.copy)) return undefined;
  // The measurement ran only if its report is there and readable; otherwise nobody measured this file.
  const qa = r.qa as { ok?: unknown; issues?: unknown } | null | undefined;
  if (!qa || typeof qa !== "object" || typeof qa.ok !== "boolean" || !Array.isArray(qa.issues)) return undefined;
  const clean = qa.ok && qa.issues.length === 0;
  return { picture: clean && findings.length === 0 && !r.restyle_requested_at };
}

/* ------------------------------------------------------------------ script */

/** The worker's own split of a narration (dental/subtitles.ts sentences): text up to a stop, closing quotes kept. */
const RAW_SENTENCE = /[^.!?…。！？؟]*(?:[.!?…。！？؟]+["'”’»)]*|$)/gu;

/**
 * Titles and short forms written with a full stop that does not end a sentence ("Dr. Smith", "z.B.",
 * "lek. dent."), in lower case, without their last stop. Only words a narration or a dentist's
 * transcript uses in these languages; anything else ends a sentence, as before.
 */
const SHORT_FORMS: ReadonlySet<string> = new Set([
  // English
  "dr", "drs", "mr", "mrs", "ms", "prof", "e.g", "i.e", "vs", "approx",
  // German
  "z.b", "d.h", "u.a", "bzw", "ca", "nr", "evtl", "ggf", "inkl",
  // Spanish
  "dra", "sr", "sra", "srta",
  // French
  "pr", "env",
  // Turkish ("Dt." is a dentist's title; "Op. Dr." a surgeon's, see stopGoesOn)
  "dt", "doç", "uzm",
  // Polish ("lek. dent.", "lek. stom.")
  "lek", "dent", "stom", "np", "tzw", "m.in",
]);

/**
 * Whether the full stop that ends `before` leaves the sentence going on into `after`, and how the two
 * join: "" for a stop with a letter or digit right after it ("2.5", "z.B.", "dentvideo.com"; only
 * where nothing stood between them, `touching`), " " after a title or short form ("Dr. Smith"), or
 * null where the sentence ends there. Two stops or more ("...") always end it, as do "!" and "?".
 */
function stopGoesOn(before: string, after: string, touching: boolean): "" | " " | null {
  if (!after || !before.endsWith(".") || before.endsWith("..")) return null;
  if (touching && /^[\p{L}\p{N}]/u.test(after)) return "";
  const word = before.match(/([\p{L}.]+)\.$/u)?.[1] ?? "";
  const lower = word.toLocaleLowerCase();
  // All capitals is an abbreviation that can end a sentence ("patients with MS."), not a title.
  if ([...word.replace(/\./g, "")].length >= 2 && word === word.toLocaleUpperCase()) return null;
  if (SHORT_FORMS.has(lower) || (lower === "op" && /^dr\b/i.test(after))) return " ";
  return null;
}

/**
 * Sentences of a narration, punctuation kept: the worker's split, without cutting at a decimal point
 * ("2.5 minutes") or after a title ("Dr. Smith"), which a transcript of a dentist's clip often has.
 */
export function sentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  let glue: "" | " " | null = null;
  for (const m of clean.matchAll(RAW_SENTENCE)) {
    const s = m[0].trim();
    if (!s) continue;
    if (glue !== null && out.length) out[out.length - 1] += glue + s;
    else out.push(s);
    const end = (m.index ?? 0) + m[0].length;
    glue = stopGoesOn(out[out.length - 1], clean.slice(end).trimStart(), end < clean.length && clean[end] !== " ");
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

/**
 * The stored cues grouped back into sentences, each starting where its first cue does. The worker's
 * split cuts at a decimal point and after a title too ("for 2." | "5 minutes.", "Dr." | "Smith says"),
 * so a cue that ends that way does not end the sentence: a digit after a digit and a stop joins with
 * no space ("2.5"), a title with one.
 */
export function linesFromCues(subtitles: unknown, language?: unknown): ScriptLine[] {
  const cues = storedCues(subtitles);
  const glue = unspaced(language) ? "" : " ";
  const out: ScriptLine[] = [];
  let text = "";
  let join = glue;
  let at: number | null = null;
  const flush = () => {
    if (text && at !== null) out.push({ text, at: Math.round(at * 10) / 10 });
    text = "";
    join = glue;
    at = null;
  };
  cues.forEach((c, k) => {
    const piece = c.text.split("\n").join(glue).trim();
    if (!piece) return;
    if (at === null) at = c.start;
    text = text ? text + join + piece : piece;
    join = glue;
    if (!ENDS_SENTENCE.test(piece)) return;
    const next = cues[k + 1]?.text.trim() ?? "";
    const on = /\d\.$/.test(piece) && /^\d/.test(next) ? "" : stopGoesOn(text, next, false);
    if (on === null) flush();
    else join = on === "" ? "" : glue;
  });
  flush();
  return out;
}

const norm = (s: string) =>
  s
    .toLocaleLowerCase()
    .replace(/[“”„‚«»‹›"'’‘`「」『』]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** The words a stored review quotes from what it read: hard-rule matches and each issue's quote. */
export function quotesOf(review: unknown): string[] {
  const r = review as { compliance?: { hard?: unknown; issues?: unknown }; accuracy?: { issues?: unknown } } | null | undefined;
  if (!r || typeof r !== "object") return [];
  const pick = (list: unknown, key: "match" | "quote") =>
    Array.isArray(list) ? list.map((x) => (x as Record<string, unknown> | null)?.[key]).filter((q): q is string => typeof q === "string") : [];
  return [...pick(r.compliance?.hard, "match"), ...pick(r.compliance?.issues, "quote"), ...pick(r.accuracy?.issues, "quote")]
    .map((q) => norm(q).replace(/^[\s.,;:!?…、。！？-]+|[\s.,;:!?…、。！？-]+$/gu, ""))
    .filter((q) => [...q].length >= 3);
}

/** Letters of scripts written without spaces between words: there are no word edges to look for. */
const UNSPACED = /[\p{scx=Han}\p{scx=Hira}\p{scx=Kana}]/u;
const WORDISH = /[\p{L}\p{N}\p{M}]/u;
const NOT_BEFORE = "(?<![\\p{L}\\p{N}\\p{M}])";
const NOT_AFTER = "(?![\\p{L}\\p{N}\\p{M}])";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/**
 * A quote as a pattern for whole words: "cure" is found in "this cure works", never in "secure", as
 * the hard rules find words (hard-rules.ts w()). At an edge written in Japanese or Chinese it matches
 * wherever it occurs, as the hard rules do there.
 */
function quotePattern(q: string): RegExp {
  const chars = [...q];
  const edge = (c: string) => WORDISH.test(c) && !UNSPACED.test(c);
  return new RegExp(`${edge(chars[0]) ? NOT_BEFORE : ""}${escapeRe(q)}${edge(chars[chars.length - 1]) ? NOT_AFTER : ""}`, "gu");
}

/** A sentence that ends with a Japanese or Chinese full stop is followed by the next with no space. */
const UNSPACED_STOP = /[。！？][」』"”’)）]*$/u;

/**
 * Marks each sentence a quote is found in. The quotes are looked for in the whole narration, joined
 * the way it is shown, so a quote that runs over two sentences marks both, and a short sentence
 * ("Absolutely.") is marked only where the quote really is, never because a quote elsewhere happens to
 * hold its words. A quote that is not found marks nothing: no guessing.
 */
export function markQuoted(lines: ScriptLine[], quotes: string[]): ScriptLine[] {
  if (!quotes.length || !lines.length) return lines;
  let all = "";
  const spans = lines.map((l, k) => {
    if (k > 0) all += UNSPACED_STOP.test(lines[k - 1].text.trim()) ? "" : " ";
    const start = all.length;
    all += norm(l.text);
    return { start, end: all.length };
  });
  const marked = new Set<number>();
  for (const q of quotes) {
    for (const m of all.matchAll(quotePattern(q))) {
      const from = m.index ?? 0;
      const to = from + m[0].length;
      spans.forEach((s, k) => {
        if (from < s.end && to > s.start) marked.add(k);
      });
    }
  }
  return lines.map((l, k) => (marked.has(k) ? { ...l, marked: true as const } : l));
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
