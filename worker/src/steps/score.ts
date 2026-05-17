import OpenAI from "openai";
import { z } from "zod";
import type { Transcript } from "./transcribe.js";

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
}): Promise<Moment[]> {
  const segments = buildSegments(input.transcript, input.minSec, input.maxSec);

  const system = `You score short-form viral clip candidates for the "${input.niche}" niche.
Return ONLY JSON matching this schema:
{ "moments": [ { "start": number, "end": number, "score": 0-10, "hook": string, "caption": string, "hashtags": string[] } ] }

Rules:
- Pick the ${input.maxClips} highest-viral moments from the transcript.
- A great hook is < 9 words, evokes curiosity/emotion, written like a TikTok caption.
- Captions: snappy, niche-appropriate, ≤ 200 chars, no quotes around it.
- Hashtags: 3–5, lowercase, no spaces, no #.
- Scores reflect viral potential, share-ability, hook strength.
- Each clip duration ${input.minSec}–${input.maxSec} seconds.
- Boundaries must land on natural sentence breaks.`;

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
  return parsed.moments
    .filter((m) => m.end - m.start >= input.minSec && m.end - m.start <= input.maxSec)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxClips);
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
