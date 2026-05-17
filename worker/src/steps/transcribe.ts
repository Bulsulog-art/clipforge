import fs from "node:fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type Word = { word: string; start: number; end: number };
export type Transcript = { language: string; text: string; words: Word[] };

export async function transcribe(filePath: string, language = "en"): Promise<Transcript> {
  const file = fs.createReadStream(filePath);
  const result = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language,
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
  } as any);

  const r = result as unknown as {
    language: string;
    text: string;
    words?: Word[];
    segments?: { start: number; end: number; text: string }[];
  };

  return {
    language: r.language,
    text: r.text,
    words:
      r.words ??
      (r.segments ?? []).map((s) => ({ word: s.text.trim(), start: s.start, end: s.end })),
  };
}
