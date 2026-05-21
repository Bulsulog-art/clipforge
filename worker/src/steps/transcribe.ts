import fs from "node:fs";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type Word = { word: string; start: number; end: number };
export type Transcript = { language: string; text: string; words: Word[] };

/**
 * Transcribe audio → text + word timestamps.
 *
 * Two backends, switched by env. The wire shape both produce is identical so
 * callers don't care which path ran:
 *
 *   1. Local faster-whisper service (preferred for cost).
 *      Activated when `WHISPER_LOCAL_URL` is set (e.g. http://whisper:8080
 *      inside the docker-compose network). Hits POST /v1/audio/transcriptions
 *      on that host. ~0$ marginal cost — just CPU cycles on our own server.
 *      See worker/whisper-service/ for the FastAPI+faster-whisper implementation.
 *
 *   2. OpenAI Whisper API fallback.
 *      Used when WHISPER_LOCAL_URL is unset, blank, or the local service
 *      errors out (network drop, OOM, model still loading on cold start).
 *      Cost: $0.006/min. Kept as automatic fallback so a whisper-service
 *      restart never breaks the pipeline — the job just gets a bit pricier
 *      for the duration of the outage.
 *
 * To force one backend in tests:
 *   WHISPER_LOCAL_URL="" — always OpenAI
 *   WHISPER_LOCAL_URL=http://… + WHISPER_NO_FALLBACK=1 — local only, throw on miss
 */
export async function transcribe(filePath: string, language = "en"): Promise<Transcript> {
  const localUrl = (process.env.WHISPER_LOCAL_URL ?? "").trim();
  if (localUrl) {
    try {
      return await transcribeLocal(localUrl, filePath, language);
    } catch (err) {
      if (process.env.WHISPER_NO_FALLBACK === "1") throw err;
      // eslint-disable-next-line no-console
      console.warn(
        `[transcribe] local whisper-service failed (${(err as Error).message}); falling back to OpenAI Whisper API`,
      );
      // fall through to OpenAI path below
    }
  }
  return transcribeOpenAI(filePath, language);
}

// ── Local faster-whisper service ─────────────────────────────────────────────
//
// The service speaks an OpenAI-compatible multipart form, so we just rebuild
// a FormData with the same field names and POST it. The JSON shape that comes
// back matches our `Transcript` type (see worker/whisper-service/server.py).
async function transcribeLocal(
  baseUrl: string,
  filePath: string,
  language: string,
): Promise<Transcript> {
  const form = new FormData();
  const buf = await fs.promises.readFile(filePath);
  // Filename hint helps the server pick the right ffmpeg demuxer.
  const ext = filePath.split(".").pop() ?? "m4a";
  form.append("file", new Blob([buf]), `audio.${ext}`);
  form.append("language", language);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities", "word");

  const url = `${baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`;
  const res = await fetch(url, { method: "POST", body: form as unknown as BodyInit });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`whisper-service ${res.status}: ${body.slice(0, 200)}`);
  }
  const r = (await res.json()) as {
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

// ── OpenAI Whisper API fallback ──────────────────────────────────────────────
async function transcribeOpenAI(filePath: string, language: string): Promise<Transcript> {
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
