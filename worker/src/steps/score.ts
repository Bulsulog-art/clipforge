import OpenAI from "openai";
import { z } from "zod";
import type { Transcript } from "./transcribe.js";
import { resolveNicheTemplate } from "../niche-templates.js";
import { buildWinningHint } from "../jobs/winning-patterns.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Moment = z.object({
  start: z.number().nonnegative(),
  end: z.number().positive(),
  score: z.number().min(0).max(10),
  hook: z.string().min(4).max(120),
  caption: z.string().min(4).max(220),
  hashtags: z.array(z.string()).max(6),
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
  const segments = buildSegments(input.transcript, input.minSec, input.maxSec);

  const promptBrief = (input.userPrompt ?? "").trim();
  const winningHint = buildWinningHint(input.winningHooks ?? []);
  const hookTone = resolveNicheTemplate(input.niche).hookTone;

  const system = `You score short-form viral clip candidates for the "${input.niche}" niche.
Return ONLY JSON matching this schema:
{ "moments": [ { "start": number, "end": number, "score": 0-10, "hook": string, "caption": string, "hashtags": string[] } ] }

Rules:
- Pick the ${input.maxClips} highest-viral moments from the transcript.
- A great hook is < 9 words, written like a TikTok caption. Hook tone for this niche: ${hookTone}.
- Captions: snappy, niche-appropriate, ≤ 200 chars, no quotes around it.
- Hashtags: 3–5, lowercase, no spaces, no #.
- Scores reflect viral potential, share-ability, hook strength.
- Each clip duration ${input.minSec}–${input.maxSec} seconds.
- Boundaries must land on natural sentence breaks.${
    promptBrief
      ? `\n\nIMPORTANT — the user is looking for specific clips: "${promptBrief}". Return ONLY moments that genuinely match this request. If fewer than ${input.maxClips} match, return only those — do NOT pad with unrelated moments. Rank the strongest matches highest.`
      : ""
  }${winningHint ? `\n\n${winningHint}` : ""}`;

  const user = `TRANSCRIPT SEGMENTS:\n${segments
    .map((s, i) => `[${i}] ${s.start.toFixed(2)}–${s.end.toFixed(2)}s: ${s.text}`)
    .join("\n")}`;

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

function buildSegments(t: Transcript, minSec: number, maxSec: number) {
  const window = (minSec + maxSec) / 2;
  const out: { start: number; end: number; text: string }[] = [];
  let bucketStart = t.words[0]?.start ?? 0;
  let text = "";
  for (const w of t.words) {
    text += `${w.word} `;
    if (w.end - bucketStart >= window) {
      out.push({ start: bucketStart, end: w.end, text: text.trim() });
      bucketStart = w.end;
      text = "";
    }
  }
  if (text.trim()) out.push({ start: bucketStart, end: t.words.at(-1)?.end ?? bucketStart, text: text.trim() });
  return out;
}
