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
 *   natural / accuracy gpt-audio listens and scores 1-5, and lists any
 *                      mispronounced words
 * Plus a pairwise preference per script (both orders, to cancel position bias).
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

async function listen(prompt: string, files: string[]): Promise<Record<string, unknown>> {
  const content: unknown[] = [{ type: "text", text: prompt }];
  for (const f of files) content.push({ type: "input_audio", input_audio: { data: (await fs.readFile(f)).toString("base64"), format: "mp3" } });
  const res = await fetch(`${API}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.VOICE_JUDGE_MODEL ?? "gpt-audio", modalities: ["text"], temperature: 0, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`judge ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const raw = ((await res.json()) as { choices: { message: { content: string } }[] }).choices[0].message.content;
  try {
    return JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
  } catch {
    return { raw };
  }
}

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
        `You are a native ${s.language} speaker judging the voice-over of a dental clinic's patient-education video. The script is:\n"""${s.narration}"""\nListen to the recording. Return JSON only: {"natural":1-5,"accuracy":1-5,"warmth":1-5,"mispronounced":["word", ...],"why":"one sentence"}. natural: sounds like a real person, not a machine (5 = indistinguishable from a human). accuracy: every word said and pronounced correctly in ${s.language}, dental terms included. warmth: a calm, kind dentist speaking to one patient.`,
        [file],
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
      const [a, b] = candidates.map((c) => files[c.name]);
      const ask = `Two recordings of the same ${s.language} dental-video voice-over follow (first, then second). Which would a ${s.language}-speaking patient prefer to hear from their dentist: more natural, correctly pronounced, warm? Return JSON only: {"prefer":"first"|"second","why":"one sentence"}.`;
      const ab = await listen(ask, [a, b]).catch((e: Error): Record<string, unknown> => ({ error: e.message }));
      const ba = await listen(ask, [b, a]).catch((e: Error): Record<string, unknown> => ({ error: e.message }));
      results.push({
        language: s.language,
        script: i,
        pairwise: true,
        votesFor: { [candidates[0].name]: (ab.prefer === "first" ? 1 : 0) + (ba.prefer === "second" ? 1 : 0), [candidates[1].name]: (ab.prefer === "second" ? 1 : 0) + (ba.prefer === "first" ? 1 : 0) },
        why: [ab.why, ba.why],
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
