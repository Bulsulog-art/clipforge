import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import ffmpeg from "fluent-ffmpeg";
import { clipforgeModel, textClient } from "../lib/text-llm.js";
import { modelParams } from "../lib/model-params.js";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { buildKaraokeASS } from "./captions.js";
import type { Word } from "./transcribe.js";


const LANGUAGE_LABEL: Record<string, string> = {
  en: "English", tr: "Türkçe", es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", ar: "Arabic", ru: "Russian", ja: "Japanese", ko: "Korean",
  it: "Italian", nl: "Dutch", pl: "Polish", id: "Indonesian", hi: "Hindi",
};

type Args = {
  userId: string;
  derivativeId: string;
  sourceClipPath: string;
  sourceTranscriptWords: Word[];   // original word timestamps from the clip's parent video job
  clipStartSec: number;
  clipEndSec: number;
  niche: string;
  targetLanguage: string;
  voiceClone: boolean;             // future: ElevenLabs lip sync (premium)
  workDir: string;
};

/**
 * Translate the captions of a clip to another language and re-burn them.
 *
 * MVP path (no voice clone): keep original audio, replace burned subtitles in
 * the target language. Costs about $0.001 in tokens on the small model
 * (claude-haiku-5-5, or gpt-4o-mini with LLM_PROVIDER=openai).
 *
 * Voice clone path (later): pipe ElevenLabs voice clone with translated text
 * into the new audio track + Sync Labs lip sync. ~$0.40/min.
 */
export async function runTranslation(args: Args) {
  const labelTarget = LANGUAGE_LABEL[args.targetLanguage] ?? args.targetLanguage;

  // 1) Pull translated words (preserve timestamps) — ask GPT to translate word-by-word.
  // We keep word timing aligned by translating phrase-by-phrase, then map words proportionally.
  const phrases = chunkPhrases(args.sourceTranscriptWords, args.clipStartSec, args.clipEndSec);
  if (phrases.length === 0) throw new Error("Empty transcript for translation");

  const translated = await translatePhrases(phrases.map((p) => p.text), args.niche, labelTarget);

  // 2) Distribute translated words back into the same time windows
  const translatedWords: Word[] = [];
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const targetText = translated[i] ?? p.text;
    const targetWords = targetText.split(/\s+/).filter(Boolean);
    if (targetWords.length === 0) continue;
    const sliceDur = (p.endSec - p.startSec) / targetWords.length;
    targetWords.forEach((w, j) => {
      translatedWords.push({
        word: w,
        start: p.startSec + j * sliceDur,
        end: p.startSec + (j + 1) * sliceDur,
      });
    });
  }

  // 3) Generate new ASS file in target language
  const captionFile = path.join(args.workDir, `tr-${args.derivativeId}.ass`);
  await fs.writeFile(
    captionFile,
    buildKaraokeASS(translatedWords, args.niche, args.clipStartSec, args.clipEndSec),
  );

  // 4) Download source clip
  const { data: src, error } = await supabase.storage
    .from("clipforge-videos-rendered")
    .download(args.sourceClipPath);
  if (error || !src) throw new Error(error?.message ?? "source clip not found");
  const srcLocal = path.join(args.workDir, `src-${args.derivativeId}.mp4`);
  await fs.writeFile(srcLocal, Buffer.from(await src.arrayBuffer()));

  // 5) Re-burn with new captions (replaces existing burned-in subs by overlaying on the rendered clip)
  // Since the source already has English captions burned in, we add a dark band at the bottom
  // to hide them, then overlay new translated captions on top.
  const out = path.join(args.workDir, `out-${args.derivativeId}.mp4`);
  await new Promise<void>((resolve, reject) => {
    ffmpeg(srcLocal)
      .videoFilters([
        // mask original subtitle area (~bottom 18%)
        `drawbox=x=0:y=ih*0.82:w=iw:h=ih*0.18:color=black:t=fill`,
        // burn translated ASS
        `ass=${escapePath(captionFile)}`,
      ])
      .outputOptions([
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "copy",
        "-movflags", "+faststart",
      ])
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });

  // 6) Upload + cleanup
  const storagePath = `${args.userId}/derivatives/${args.derivativeId}.mp4`;
  const { error: upErr } = await supabase.storage
    .from("clipforge-videos-rendered")
    .upload(storagePath, createReadStream(out) as any, {
      contentType: "video/mp4",
      upsert: true,
      duplex: "half",
    } as any);
  if (upErr) throw upErr;

  await Promise.all([
    fs.unlink(out).catch(() => {}),
    fs.unlink(srcLocal).catch(() => {}),
    fs.unlink(captionFile).catch(() => {}),
  ]);

  logger.info({ derivativeId: args.derivativeId, lang: args.targetLanguage }, "translation rendered");
  return { storagePath };
}

function chunkPhrases(
  words: Word[],
  clipStart: number,
  clipEnd: number,
): { startSec: number; endSec: number; text: string }[] {
  const filtered = words.filter(
    (w) => w.start >= clipStart - 0.05 && w.end <= clipEnd + 0.05,
  );
  const out: { startSec: number; endSec: number; text: string }[] = [];
  const window = 2.5;
  let bucketStart = filtered[0]?.start ?? clipStart;
  let text = "";
  for (const w of filtered) {
    text += `${w.word} `;
    if (w.end - bucketStart >= window) {
      out.push({ startSec: bucketStart, endSec: w.end, text: text.trim() });
      bucketStart = w.end;
      text = "";
    }
  }
  if (text.trim()) {
    out.push({
      startSec: bucketStart,
      endSec: filtered.at(-1)?.end ?? bucketStart + window,
      text: text.trim(),
    });
  }
  return out;
}

function escapePath(p: string) {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

/** The model call: one translated phrase per input phrase, in order. Throws when the count does not match. */
export async function translatePhrases(phrases: string[], niche: string, labelTarget: string): Promise<string[]> {
  const model = clipforgeModel();
  const completion = await textClient().chat.completions.create({
    model,
    response_format: { type: "json_object" },
    ...modelParams(model, 0.3),
    messages: [
      {
        role: "system",
        content: `You translate short video captions to ${labelTarget}.
Return JSON: { "phrases": ["…", "…"] } — one translated phrase per input.
Keep natural, conversational, niche-aware tone. Preserve emphasis.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          niche,
          phrases,
        }),
      },
    ],
  });
  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as { phrases: string[] };
  if (!Array.isArray(parsed.phrases) || parsed.phrases.length !== phrases.length) {
    throw new Error("translation phrase count mismatch");
  }
  return parsed.phrases.map((p) => String(p));
}
