/**
 * Listening test for DentVideo narration: the same scripts spoken by each TTS
 * candidate, measured the same way.
 *
 *   npx tsx src/dental/voice-eval.ts --from <dental eval dir>/eval.json --out <dir> \
 *     [--per-lang 2] [--candidates tts-1-hd,gpt-4o-mini-tts]
 *
 * Narrations come from a text eval run (eval.ts stores each ready video's
 * narration and planned length), so the voices read real scripts.
 *
 * Per clip:
 *   seconds / target   spoken length vs the plan's length (the video is
 *                      stretched to the voice, so long = slower video)
 *   wps                words per second
 *   LUFS, silence      ffmpeg ebur128 integrated loudness; total silence
 *                      (pauses over 0.6s at -40 dB)
 *   WER                gpt-4o-transcribe's transcript vs the script: words
 *                      the voice dropped, swapped or garbled
 *   natural / accuracy gpt-audio listens and scores 1-10, and lists any
 *                      mispronounced words
 * Plus a side-by-side score per script, asked in both orders to cancel the
 * judge's position bias.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { voiceInstructions } from "./voice.js";

const run = promisify(execFile);
const API = "https://api.openai.com/v1";
const key = () => process.env.OPENAI_API_KEY ?? "";

/** Word error rate after lower-casing and stripping punctuation. */
export function wer(reference: string, hypothesis: string): number {
  const norm = (s: string) =>
    s
      .toLocaleLowerCase()
      .normalize("NFC")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
  const r = norm(reference);
  const h = norm(hypothesis);
  if (!r.length) return h.length ? 1 : 0;
  let prev = Array.from({ length: h.length + 1 }, (_, j) => j);
  for (let i = 1; i <= r.length; i++) {
    const cur = [i];
    for (let j = 1; j <= h.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return Math.round((prev[h.length] / r.length) * 1000) / 1000;
}

type Candidate = { name: string; model: string; voice?: string; instructions: boolean };

const CANDIDATES: Record<string, Candidate> = {
  "tts-1-hd": { name: "tts-1-hd", model: "tts-1-hd", instructions: false },
  "gpt-4o-mini-tts": { name: "gpt-4o-mini-tts", model: "gpt-4o-mini-tts", instructions: true },
  "gpt-4o-mini-tts-marin": { name: "gpt-4o-mini-tts-marin", model: "gpt-4o-mini-tts", voice: "marin", instructions: true },
};

async function speak(c: Candidate, text: string, voice: string, language: string, out: string) {
  const res = await fetch(`${API}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: c.model,
      voice: c.voice ?? voice,
      input: text,
      response_format: "mp3",
      ...(c.instructions ? { instructions: voiceInstructions(language) } : {}),
    }),
  });
  if (!res.ok) throw new Error(`tts ${c.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  await fs.writeFile(out, Buffer.from(await res.arrayBuffer()));
}

async function measure(file: string) {
  const dur = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  const loud = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128,silencedetect=n=-40dB:d=0.6", "-f", "null", "-"]).catch(
    (e: { stderr?: string }) => ({ stderr: e.stderr ?? "" }),
  );
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(loud.stderr.split("Summary:").pop() ?? "")?.[1]);
  const silence = [...loud.stderr.matchAll(/silence_duration: ([\d.]+)/g)].reduce((a, m) => a + Number(m[1]), 0);
  return { seconds: Number(dur.stdout.trim()), lufs, silence: Math.round(silence * 100) / 100 };
}

async function transcribe(file: string, language: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([await fs.readFile(file)], { type: "audio/mpeg" }), path.basename(file));
  form.append("model", "gpt-4o-transcribe");
  form.append("language", language);
  const res = await fetch(`${API}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key()}` }, body: form });
  if (!res.ok) throw new Error(`transcribe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { text: string }).text;
}

/**
 * Ask the audio model about one or more labelled clips. Audio goes first and
 * the question last: asked the other way round, gpt-audio sometimes answered
 * as if no audio had been attached. Non-JSON answers (it occasionally
 * refuses) are retried twice.
 */
async function listen(prompt: string, clips: { label?: string; file: string }[]): Promise<Record<string, unknown>> {
  const content: unknown[] = [];
  for (const c of clips) {
    if (c.label) content.push({ type: "text", text: c.label });
    content.push({ type: "input_audio", input_audio: { data: (await fs.readFile(c.file)).toString("base64"), format: "mp3" } });
  }
  content.push({ type: "text", text: prompt });
  let raw = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.VOICE_JUDGE_MODEL ?? "gpt-audio", modalities: ["text"], temperature: 0, messages: [{ role: "user", content }] }),
    });
    if (!res.ok) throw new Error(`judge ${res.status}: ${(await res.text()).slice(0, 200)}`);
    raw = ((await res.json()) as { choices: { message: { content: string } }[] }).choices[0].message.content ?? "";
    const json = /\{[\s\S]*\}/.exec(raw)?.[0];
    try {
      if (json) return JSON.parse(json);
    } catch {
      // not JSON: ask again
    }
  }
  return { raw };
}

const RUBRIC = (language: string) =>
  `Score strictly on 1-10; 6 is "clearly synthetic but acceptable", 9-10 only if you would believe a real ${language}-speaking dentist recorded it.
natural: human prosody — varied intonation, natural pauses and stress, no robotic or flat delivery, no odd rhythm.
accuracy: every word pronounced correctly for a native ${language} speaker, dental terms included; foreign accent or wrong stress costs points.
warmth: sounds like a calm, kind dentist talking to one patient, not an announcer or an advert.`;

async function main() {
  const arg = (n: string) => {
    const i = process.argv.indexOf(`--${n}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const from = arg("from");
  if (!from) throw new Error("--from <eval.json> is required");
  const out = path.resolve(arg("out") ?? "voice-eval");
  const perLang = Number(arg("per-lang") ?? 2);
  const names = (arg("candidates") ?? "tts-1-hd,gpt-4o-mini-tts").split(",");
  const candidates = names.map((n) => CANDIDATES[n] ?? { name: n, model: n, instructions: !n.startsWith("tts-1") });
  await fs.mkdir(out, { recursive: true });

  type Row = { language: string; narration?: string; planSeconds?: number; status: string };
  const { rows } = JSON.parse(await fs.readFile(from, "utf8")) as { rows: Row[] };
  const scripts = [...new Set(rows.map((r) => r.language))].flatMap((lang) =>
    rows.filter((r) => r.language === lang && r.status === "ready" && r.narration).slice(0, perLang),
  );

  const results: Record<string, unknown>[] = [];
  for (const [i, s] of scripts.entries()) {
    const files: Record<string, string> = {};
    for (const c of candidates) {
      const file = path.join(out, `${s.language}-${i}-${c.name}.mp3`);
      await speak(c, s.narration!, "nova", s.language, file);
      files[c.name] = file;
      const m = await measure(file);
      const transcript = await transcribe(file, s.language);
      const words = s.narration!.split(/\s+/).length;
      const verdict = await listen(
        `You are a native ${s.language} speaker judging the recording above: the voice-over of a dental clinic's patient-education video. The script is:\n"""${s.narration}"""\n${RUBRIC(s.language)}\nReturn JSON only: {"natural":n,"accuracy":n,"warmth":n,"mispronounced":["word", ...],"why":"one sentence"}.`,
        [{ file }],
      ).catch((e: Error): Record<string, unknown> => ({ error: e.message }));
      results.push({
        language: s.language,
        script: i,
        candidate: c.name,
        target: s.planSeconds,
        ...m,
        ratio: s.planSeconds ? Math.round((m.seconds / s.planSeconds) * 100) / 100 : undefined,
        wps: Math.round((words / m.seconds) * 100) / 100,
        wer: wer(s.narration!, transcript),
        transcript,
        ...verdict,
      });
      console.log(JSON.stringify(results.at(-1)));
    }
    if (candidates.length === 2) {
      // Both clips scored side by side, in both orders: asked only "which do
      // you prefer", gpt-audio picked whichever came second every time.
      const ask = `Recordings A and B above are two voices reading the same ${s.language} dental-video voice-over. Score each one.\n${RUBRIC(s.language)}\nReturn JSON only: {"A":{"natural":n,"accuracy":n,"warmth":n},"B":{"natural":n,"accuracy":n,"warmth":n},"why":"one sentence"}.`;
      const [c0, c1] = candidates.map((c) => c.name);
      const sum = (v: unknown) => {
        const o = (v ?? {}) as Record<string, number>;
        return (Number(o.natural) || 0) + (Number(o.accuracy) || 0) + (Number(o.warmth) || 0);
      };
      const first = await listen(ask, [{ label: "Recording A:", file: files[c0] }, { label: "Recording B:", file: files[c1] }]).catch((e: Error): Record<string, unknown> => ({ error: e.message }));
      const second = await listen(ask, [{ label: "Recording A:", file: files[c1] }, { label: "Recording B:", file: files[c0] }]).catch((e: Error): Record<string, unknown> => ({ error: e.message }));
      results.push({
        language: s.language,
        script: i,
        pairwise: true,
        // natural+accuracy+warmth (3-30), averaged over both orders.
        score: { [c0]: (sum(first.A) + sum(second.B)) / 2, [c1]: (sum(first.B) + sum(second.A)) / 2 },
        why: [first.why, second.why],
      });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
  await fs.writeFile(path.join(out, "voice-eval.json"), JSON.stringify(results, null, 2));
}

if (process.argv[1] && /voice-eval\.(ts|js|mts)$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
