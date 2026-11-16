/**
 * Subtitles for a narrated video, from what the pipeline already measures —
 * no extra API call.
 *
 * The TTS providers give us audio, not word timestamps, so there is no word
 * alignment to read. What the pipeline does have, for every narration:
 *   - the narrator's text (plan.voiceover.text),
 *   - the length of the mastered narration (voiceSeconds), which plays from
 *     frame 0 of the video (remotion/Video.tsx),
 *   - the silences in it (audio-master.ts detectPauses: ffmpeg silencedetect
 *     on the mastered file), already used to move scene cuts into pauses.
 *
 * Cues are built from those: the text is split into sentences, and long
 * sentences into short readable pieces; the speech between the pauses is laid
 * out end to end and each piece gets a share of it proportional to its length
 * (characters, without spaces and punctuation); a piece that ends a sentence
 * then ends at the nearest real pause (within SNAP_S) and the next one starts
 * when the voice does. So sentence boundaries sit on measured silences, and
 * inside a sentence the timing is an even estimate — good to well under a
 * second for these 20–60 second narrations, not word-exact.
 *
 * Without pauses (mastering failed and the plain TTS file was used) the
 * pieces are spread over the voice's length alone: `source: "length"`.
 *
 * Pure: no I/O. The web app turns stored cues into SRT and WebVTT on download
 * (web/src/lib/dentvid/subtitles.ts).
 */

export type Cue = { start: number; end: number; text: string };
export type Subtitles = { v: 1; source: "pauses" | "length"; cues: Cue[] };
export type Gap = { start: number; end: number };

/** A pause shorter than this is a breath inside a sentence, not the gap after one. */
export const MIN_GAP_S = 0.2;
/** How far a sentence end may move to land on a measured pause. */
export const SNAP_S = 0.9;
/** A cue is on screen at least this long. */
export const MIN_CUE_S = 0.8;
/** Two silences this close are one pause with a breath in it (voiceover.ts mergePauses uses the same). */
const BLIP_S = 0.15;

const UNSPACED = new Set(["ja", "zh"]);
const isUnspaced = (language: string | undefined) => UNSPACED.has((language ?? "").toLowerCase().slice(0, 2));

/** Characters per subtitle line: about 42 for Latin, Arabic and Cyrillic scripts, 16 for Japanese. Two lines per cue. */
export function lineLimit(language: string | undefined): number {
  return isUnspaced(language) ? 16 : 42;
}

/** How long a piece of text is when spoken: letters and digits only. */
export function weight(text: string): number {
  return Math.max(1, [...text.replace(/[\s\p{P}\p{S}]/gu, "")].length);
}

/** Sentences of a narration, punctuation kept. Handles ". ! ? … 。 ！ ？ ؟". */
export function sentences(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  const re = /[^.!?…。！？؟]*(?:[.!?…。！？؟]+["'”’»)]*|$)/gu;
  for (const m of clean.matchAll(re)) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

/**
 * A sentence cut into pieces of at most `2 × lineLimit` characters: at a
 * comma (or 、，؛) when that keeps both sides readable, otherwise between words
 * (or, in Japanese, between characters).
 */
export function pieces(sentence: string, language: string | undefined): string[] {
  const max = lineLimit(language) * 2;
  if ([...sentence].length <= max) return [sentence];
  const unspaced = isUnspaced(language);
  const chars = [...sentence];
  // Best break: the last comma-like mark in the first `max` characters, if it is past a third of it.
  const window = chars.slice(0, max + 1).join("");
  let cut = -1;
  for (const m of window.matchAll(/[,،、，;؛:]/gu)) if (m.index !== undefined && m.index >= max / 3) cut = [...window.slice(0, m.index + 1)].length;
  if (cut < 0) {
    if (unspaced) cut = max;
    else {
      const space = window.lastIndexOf(" ", max);
      cut = space > max / 3 ? [...window.slice(0, space)].length : max;
    }
  }
  const head = chars.slice(0, cut).join("").trim();
  const tail = chars.slice(cut).join("").trim();
  return tail ? [head, ...pieces(tail, language)] : [head];
}

/** Lines of one cue: at most two, broken at a space near the middle when it is longer than one line. */
export function wrap(text: string, language: string | undefined): string {
  const limit = lineLimit(language);
  const chars = [...text];
  if (chars.length <= limit) return text;
  if (isUnspaced(language)) {
    const mid = Math.ceil(chars.length / 2);
    return `${chars.slice(0, mid).join("")}\n${chars.slice(mid).join("")}`;
  }
  const mid = Math.floor(text.length / 2);
  const left = text.lastIndexOf(" ", mid);
  const right = text.indexOf(" ", mid);
  const at = left < 0 ? right : right < 0 ? left : mid - left <= right - mid ? left : right;
  return at <= 0 ? text : `${text.slice(0, at)}\n${text.slice(at + 1)}`;
}

/** Silences long enough to be a gap between phrases, merged across breaths, inside (0, total). */
export function gapsOf(pauses: Gap[], total: number): Gap[] {
  const merged: Gap[] = [];
  for (const p of [...pauses].filter((p) => Number.isFinite(p.start) && Number.isFinite(p.end) && p.end > p.start).sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && p.start - last.end <= BLIP_S) last.end = Math.max(last.end, p.end);
    else merged.push({ start: Math.max(0, p.start), end: Math.min(total, p.end) });
  }
  return merged.filter((g) => g.end - g.start >= MIN_GAP_S || g.start <= 0.01 || g.end >= total - 0.01);
}

/** The stretches where the voice speaks: [0, total] minus the gaps. */
export function speechSpans(gaps: Gap[], total: number): Gap[] {
  const spans: Gap[] = [];
  let at = 0;
  for (const g of gaps) {
    if (g.start > at) spans.push({ start: at, end: Math.min(g.start, total) });
    at = Math.max(at, g.end);
  }
  if (at < total) spans.push({ start: at, end: total });
  return spans.filter((s) => s.end - s.start > 0.05);
}

/** A position on the speech-only timeline (seconds of voice) → a time in the video. */
function toVideoTime(spans: Gap[], speechAt: number): number {
  let left = speechAt;
  for (const s of spans) {
    const len = s.end - s.start;
    if (left <= len) return s.start + left;
    left -= len;
  }
  return spans.at(-1)?.end ?? 0;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Timed cues for one narration. `pauses` are the silences detectPauses found
 * in the mastered file (seconds from its start = from frame 0), `voiceSeconds`
 * its length. Empty when there is no text or no length.
 */
export function subtitleCues(text: string | undefined, voiceSeconds: number | undefined, pauses: Gap[] | undefined, language: string | undefined): Subtitles | null {
  const total = Number(voiceSeconds);
  const parts = sentences(text ?? "").map((s) => pieces(s, language).map((p, i, all) => ({ text: p, endsSentence: i === all.length - 1 })));
  const flat = parts.flat();
  if (!flat.length || !(total > 0)) return null;
  const gaps = pauses?.length ? gapsOf(pauses, total) : [];
  const spans = gaps.length ? speechSpans(gaps, total) : [{ start: 0, end: total }];
  const speech = spans.reduce((a, s) => a + (s.end - s.start), 0);
  const weights = flat.map((p) => weight(p.text));
  const sum = weights.reduce((a, b) => a + b, 0);

  // Proportional layout over the speech only.
  let acc = 0;
  const cues: Cue[] = flat.map((p, i) => {
    const from = toVideoTime(spans, (acc / sum) * speech);
    acc += weights[i];
    const to = toVideoTime(spans, (acc / sum) * speech);
    return { start: from, end: to, text: p.text };
  });

  // A sentence ends where the voice really stops: the nearest gap within SNAP_S.
  const inner = gaps.filter((g) => g.start > 0.01 && g.end < total - 0.01);
  const used = new Set<number>();
  const distance = (g: Gap, at: number) => (at >= g.start && at <= g.end ? 0 : Math.min(Math.abs(g.start - at), Math.abs(g.end - at)));
  for (let i = 0; i < cues.length - 1; i++) {
    if (!flat[i].endsSentence) continue;
    const at = cues[i].end;
    let best = -1;
    for (const [k, g] of inner.entries()) {
      if (used.has(k) || distance(g, at) > SNAP_S) continue;
      if (best < 0 || distance(g, at) < distance(inner[best], at)) best = k;
    }
    if (best < 0) continue;
    const g = inner[best];
    if (g.start <= cues[i].start || g.end >= cues[i + 1].end) continue;
    used.add(best);
    cues[i].end = g.start;
    cues[i + 1].start = g.end;
  }

  // Readable and in order: no overlaps, at least MIN_CUE_S each where there is room, inside [0, total].
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const next = cues[i + 1];
    c.start = Math.max(0, i > 0 ? Math.max(c.start, cues[i - 1].end) : c.start);
    if (c.end - c.start < MIN_CUE_S) c.end = Math.min(next ? Math.max(next.start, c.start + MIN_CUE_S) : total, c.start + MIN_CUE_S, total);
    if (next && c.end > next.start) next.start = c.end;
    c.end = Math.min(c.end, total);
  }
  const out = cues
    .filter((c) => c.end > c.start)
    .map((c) => ({ start: round(c.start), end: round(c.end), text: wrap(c.text, language) }));
  return out.length ? { v: 1, source: gaps.length ? "pauses" : "length", cues: out } : null;
}
