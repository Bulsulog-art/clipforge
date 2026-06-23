import OpenAI from "openai";
import { z } from "zod";
import type { Transcript } from "./transcribe.js";
import { resolveNicheTemplate } from "../niche-templates.js";
import { buildWinningHint } from "../jobs/winning-patterns.js";

const Moment = z.object({
  start: z.number().nonnegative(),
  end: z.number().positive(),
  score: z.number().min(0).max(10),
  hook: z.string().min(4).max(120),
  caption: z.string().min(4).max(220),
  hashtags: z.array(z.string()).max(6),
  // 1–3 highest-impact spoken words to highlight in the captions. Optional so a
  // model response without them (or any other Moment producer) never breaks.
  keywords: z.array(z.string()).max(4).optional(),
});
const Response = z.object({ moments: z.array(Moment) });

export type Moment = z.infer<typeof Moment>;

export async function scoreMoments(input: {
  transcript: Transcript;
  niche: string;
  maxClips: number;
  minSec: number;
  maxSec: number;
  /**
   * Optional natural-language brief ("Clip every time I talk about pricing",
   * "just the funny bits"). When set, the model only returns moments that
   * genuinely match it — our answer to OpusClip's ClipAnything.
   */
  userPrompt?: string;
  /**
   * Hooks from this creator's best-performing past clips (closed learning
   * loop). Biases selection toward what already works for them. Empty = no bias.
   */
  winningHooks?: string[];
}): Promise<Moment[]> {
  const segments = buildSentenceSegments(input.transcript, input.maxSec);

  const promptBrief = (input.userPrompt ?? "").trim();
  const winningHint = buildWinningHint(input.winningHooks ?? []);
  const hookTone = resolveNicheTemplate(input.niche).hookTone;

  const system = `You score short-form viral clip candidates for the "${input.niche}" niche.
Return ONLY JSON matching this schema:
{ "moments": [ { "start": number, "end": number, "score": 0-10, "hook": string, "caption": string, "hashtags": string[], "keywords": string[] } ] }

The TRANSCRIPT below is split into sentence-level segments, each tagged with its [index] and start–end timestamps.

How to choose a moment:
- A moment is a span covering ONE or MORE CONSECUTIVE segments that together form a complete, self-contained thought (a clear setup that pays off). Combine adjacent segments freely when the idea continues across them.
- "start" must equal the start time of the first segment you include; "end" must equal the end time of the last. Never start or end mid-sentence.
- The clip must make sense ALONE, with zero external context.

What makes a moment go viral (rank on this):
- The opening line decides everything — the first ~3 seconds must be a scroll-stopping hook: a curiosity gap, a bold/contrarian claim, a surprising number, or a sharp question. Reject moments that open on filler, throat-clearing, or "so, um, yeah".
- Favor emotional peaks, a strong opinion, a concrete result/number, a story beat, or a payoff/punchline.
- Avoid rambling, repetition, and anything that needs the prior context to land.

Output rules:
- Return the ${input.maxClips} strongest moments, highest score first.
- "hook": < 9 words, written like a TikTok caption. Hook tone for this niche: ${hookTone}.
- "caption": snappy, niche-appropriate, ≤ 200 chars, no surrounding quotes.
- "hashtags": 3–5, lowercase, no spaces, no #.
- "keywords": 1–3 of the single most impactful words that ACTUALLY APPEAR in that moment's spoken text — we highlight them in captions for punch.
- "score" (0–10): reflects hook strength + share-ability + standalone clarity.
- Each clip duration ${input.minSec}–${input.maxSec} seconds.${
    promptBrief
      ? `\n\nIMPORTANT — the user is looking for specific clips: "${promptBrief}". Return ONLY moments that genuinely match this request. If fewer than ${input.maxClips} match, return only those — do NOT pad with unrelated moments. Rank the strongest matches highest.`
      : ""
  }${winningHint ? `\n\n${winningHint}` : ""}`;

  const user = `TRANSCRIPT SEGMENTS:\n${segments
    .map((s, i) => `[${i}] ${s.start.toFixed(2)}–${s.end.toFixed(2)}s: ${s.text}`)
    .join("\n")}`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = Response.parse(JSON.parse(raw));

  // Clamp GPT-chosen boundaries to the REAL source duration. The model can
  // hallucinate timestamps past the end of the audio (or a tiny negative
  // start), which would make ffmpeg cut beyond the source and produce a
  // broken/black clip. The transcript's last word end is our known upper
  // bound. Re-check the duration filter AFTER clamping so a moment that
  // collapses below minSec is dropped rather than rendered as a stub.
  const sourceEnd = input.transcript.words.at(-1)?.end ?? 0;
  return parsed.moments
    .map((m) => {
      const start = Math.max(0, Math.min(m.start, sourceEnd));
      const end = Math.max(start, Math.min(m.end, sourceEnd));
      return { ...m, start, end };
    })
    .filter((m) => {
      const dur = m.end - m.start;
      return dur >= input.minSec && dur <= input.maxSec;
    })
    // Tighten each clip to its actual speech envelope so it doesn't open or
    // close on dead air — a clip that starts 1.5s before the first word (or
    // lingers in silence after the last) feels sloppy and tanks retention in
    // the first second. Because buildKaraokeASS + the ffmpeg cut both derive
    // from these bounds, tightening here keeps captions, audio and duration in
    // sync automatically. We only trim silence (never extend), keep a little
    // breathing room, and skip the trim if it would drop the clip below minSec.
    .map((m) => tightenToSpeech(m, input.transcript.words, input.minSec))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxClips);
}

const LEAD_PAD_SEC = 0.15;  // a touch of air before the first word
const TRAIL_PAD_SEC = 0.30; // let the last word land before cutting

function tightenToSpeech(
  m: Moment,
  words: Transcript["words"],
  minSec: number,
): Moment {
  const inside = words.filter((w) => w.end > m.start && w.start < m.end);
  if (inside.length === 0) return m;
  const firstStart = inside[0].start;
  const lastEnd = inside[inside.length - 1].end;
  const start = Math.max(m.start, firstStart - LEAD_PAD_SEC);
  const end = Math.min(m.end, lastEnd + TRAIL_PAD_SEC);
  // Don't over-trim: if the speech envelope is shorter than the minimum clip
  // length, keep the original bounds rather than ship an ultra-short clip.
  if (end - start < minSec) return m;
  return { ...m, start, end };
}

export type Segment = { start: number; end: number; text: string };

/**
 * Group the word-level transcript into SENTENCE-level segments so the scorer
 * sees natural thought units instead of an arbitrary fixed-second grid. The
 * model then composes a clip from one or more consecutive sentences, so a
 * moment can begin on a real setup and end on its payoff. Same single LLM call
 * — no extra cost, materially better boundaries.
 *
 * - A sentence ends on terminal punctuation (. ? ! …) carried by a word token.
 * - A runaway unpunctuated stretch is force-split at maxSec so no single
 *   segment is longer than one clip.
 * - For very long sources we cap the segment count (LLM token budget) by
 *   merging adjacent sentences — only triggers past MAX_SEGMENTS.
 */
export function buildSentenceSegments(t: Transcript, maxSec: number): Segment[] {
  const words = t.words;
  if (words.length === 0) return [];

  const sentences: Segment[] = [];
  let start = words[0].start;
  let buf = "";
  const flush = (end: number) => {
    const text = buf.trim();
    if (text) sentences.push({ start, end, text });
    buf = "";
  };
  for (const w of words) {
    if (!buf) start = w.start;
    buf += `${w.word} `;
    const endsSentence = /[.!?…]["')\]]?$/.test(w.word.trim());
    const tooLong = w.end - start >= maxSec;
    if (endsSentence || tooLong) flush(w.end);
  }
  if (buf.trim()) flush(words[words.length - 1].end);

  // Token-budget guard for very long sources: merge adjacent sentences until
  // under the cap. Normal-length videos pass through untouched.
  const MAX_SEGMENTS = 240;
  let segs = sentences;
  while (segs.length > MAX_SEGMENTS) {
    const merged: Segment[] = [];
    for (let i = 0; i < segs.length; i += 2) {
      const a = segs[i];
      const b = segs[i + 1];
      merged.push(b ? { start: a.start, end: b.end, text: `${a.text} ${b.text}` } : a);
    }
    segs = merged;
  }
  return segs;
}
