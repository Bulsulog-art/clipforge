import { execFile } from "node:child_process";

/**
 * Mastering for DentVideo narration (and an optional music bed under it).
 *
 * What the old chain did: one single-pass `loudnorm=I=-16:TP=-1.5` on the raw
 * TTS mp3. Measured on the 43 preview narrations in
 * web/public/dentvideo/preview (ebur128, true peak): integrated loudness
 * -16.7 to -18.5 LUFS (single-pass loudnorm runs dynamic and undershoots),
 * true peak up to +0.2 dBTP (clips after AAC), up to 1.4 s of dead air at
 * the end and 1.4 s pauses mid-sentence.
 *
 * What this does, in two passes over the file:
 *   1. analyse  loudnorm (EBU R128 integrated / true peak / LRA, as JSON) and
 *               silencedetect, on the same high-passed 48 kHz signal.
 *   2. render   trim the edges to fixed pads, shorten over-long pauses,
 *               optional tempo (speaking rate), click-free fades, then one
 *               linear gain to the target and a true-peak limiter that runs
 *               at 4x oversampling (so it catches inter-sample peaks).
 *
 * Linear gain + limiter instead of loudnorm's own second pass: loudnorm only
 * stays linear when the gain fits under the peak ceiling; TTS peaks are
 * 2-4 dB above that, so it falls back to dynamic mode, which on a Polish
 * preview landed at -15.2 instead of -14. The limiter touches only the few peaks.
 *
 * Target: -14 LUFS integrated, -1 dBTP — what Reels, TikTok and Shorts
 * normalise to, so the narration neither gets turned down (and loses its
 * peaks to their limiter) nor sounds quieter than the next video.
 */

export type LoudnessTarget = { I: number; TP: number; LRA: number };
export const SOCIAL_TARGET: LoudnessTarget = { I: -14, TP: -1, LRA: 11 };

export type LoudnessStats = { I: number; TP: number; LRA: number; thresh: number };
export type Silence = { start: number; end: number };
export type Cut = [number, number];

export type MasterOptions = {
  target?: LoudnessTarget;
  /** Speaking-rate factor (atempo), e.g. 0.94 = 6% slower. 1 = unchanged. */
  tempo?: number;
  /** Silence before the first word, seconds. */
  leadPad?: number;
  /** Silence after the last word, seconds. */
  tailPad?: number;
  /** Longest pause kept inside the narration, seconds (longer ones are shortened to this). */
  maxPause?: number;
};

export const MASTER_DEFAULTS = { leadPad: 0.15, tailPad: 0.35, maxPause: 0.8 } as const;

/** Below this level counts as silence (TTS noise floor is far below; speech tails are above). */
const SILENCE_DB = -50;
/** Speech kept either side of a cut, so soft onsets and decays are never clipped. */
const GUARD = 0.03;
/** Silence this close to either end of the file counts as touching it. */
const EDGE = 0.1;

function ffmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile("ffmpeg", ["-hide_banner", "-nostats", ...args], { maxBuffer: 32 * 1024 * 1024 }, (err, _out, stderr) =>
      err ? reject(new Error(`ffmpeg: ${String(stderr).split("\n").filter(Boolean).slice(-3).join(" | ") || err.message}`)) : resolve(String(stderr)),
    ),
  );
}

export function probeDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) =>
    execFile("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], (err, out) => {
      const d = Number(String(out).trim());
      if (err || !Number.isFinite(d)) reject(err ?? new Error(`ffprobe: no duration for ${file}`));
      else resolve(d);
    }),
  );
}

/** The JSON block `loudnorm=print_format=json` prints at the end of stderr. */
export function parseLoudnorm(stderr: string): LoudnessStats {
  const at = stderr.lastIndexOf("{");
  const end = stderr.indexOf("}", at);
  if (at < 0 || end < 0) throw new Error("loudnorm: no measurement in ffmpeg output");
  const j = JSON.parse(stderr.slice(at, end + 1)) as Record<string, string>;
  const num = (k: string) => {
    const v = Number(j[k]);
    if (!Number.isFinite(v)) throw new Error(`loudnorm: ${k}=${j[k]}`);
    return v;
  };
  return { I: num("input_i"), TP: num("input_tp"), LRA: num("input_lra"), thresh: num("input_thresh") };
}

/** silencedetect's start/end lines → spans. An unclosed last span runs to the end of the file. */
export function parseSilences(stderr: string, duration: number): Silence[] {
  const out: Silence[] = [];
  let start: number | null = null;
  for (const m of stderr.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const t = Number(m[2]);
    if (m[1] === "start") start = Math.max(0, t);
    else if (start !== null) {
      out.push({ start, end: Math.min(duration, t) });
      start = null;
    }
  }
  if (start !== null && start < duration) out.push({ start, end: duration });
  return out;
}

/**
 * Which stretches of the source to drop: silence before the first word and
 * after the last (pads are added back as clean digital silence), and the
 * middle of any pause longer than `maxPause` — the pause keeps its two ends,
 * so the breath and decay either side stay natural.
 */
export function silenceCuts(silences: Silence[], duration: number, maxPause: number = MASTER_DEFAULTS.maxPause): Cut[] {
  const cuts: Cut[] = [];
  const r = (n: number) => Math.round(n * 1000) / 1000;
  for (const s of silences) {
    // An mp3's last frame can end a few tens of ms before the container says.
    const leading = s.start <= EDGE;
    const trailing = s.end >= duration - EDGE;
    if (leading && trailing) return []; // all silence: leave it to the caller
    if (leading) {
      if (s.end - GUARD > 0) cuts.push([0, r(s.end - GUARD)]);
    } else if (trailing) {
      if (duration - (s.start + GUARD) > 0) cuts.push([r(s.start + GUARD), r(duration)]);
    } else if (s.end - s.start > maxPause) {
      const half = maxPause / 2;
      cuts.push([r(s.start + half), r(s.end - half)]);
    }
  }
  return cuts;
}

/** Length of the source after the cuts. */
export function keptSeconds(duration: number, cuts: Cut[]): number {
  return Math.max(0, duration - cuts.reduce((a, [s, e]) => a + (e - s), 0));
}

/** An aselect filter that drops the cut spans and re-times what is left. */
export function selectFilter(cuts: Cut[]): string | null {
  if (!cuts.length) return null;
  const expr = cuts.map(([s, e]) => `between(t\\,${s}\\,${e})`).join("+");
  return `aselect='not(${expr})',asetpts=N/SR/TB`;
}

/** Gain that lands the integrated loudness on target. Linear, so the voice's dynamics are untouched. */
export function gainTo(target: LoudnessTarget, measured: LoudnessStats): number {
  return Math.round((target.I - measured.I) * 100) / 100;
}

/**
 * The render chain. The limiter runs on a 4x-oversampled signal, so its
 * ceiling is a true-peak ceiling; it sits 0.5 dB under the target to leave
 * room for the AAC encode that follows in the video.
 */
export function masterFilter(p: {
  cuts: Cut[];
  keptSeconds: number;
  gainDb: number;
  target: LoudnessTarget;
  tempo?: number;
  leadPad?: number;
  tailPad?: number;
}): string {
  const tempo = p.tempo && Math.abs(p.tempo - 1) > 0.001 ? Math.min(2, Math.max(0.5, p.tempo)) : 1;
  const spoken = p.keptSeconds / tempo;
  const fadeOut = Math.min(0.06, spoken / 4);
  const lead = Math.round((p.leadPad ?? MASTER_DEFAULTS.leadPad) * 1000);
  const tail = p.tailPad ?? MASTER_DEFAULTS.tailPad;
  const ceiling = Math.pow(10, (p.target.TP - 0.5) / 20).toFixed(4);
  return [
    "aresample=48000",
    "highpass=f=70",
    selectFilter(p.cuts),
    tempo !== 1 ? `atempo=${tempo}` : null,
    // Fades of a few milliseconds: no click where speech was cut out of silence.
    "afade=t=in:st=0:d=0.015",
    `afade=t=out:st=${Math.max(0, spoken - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`,
    `volume=${p.gainDb}dB`,
    "aresample=192000",
    `alimiter=limit=${ceiling}:attack=1:release=60:level=false:latency=true`,
    "aresample=48000",
    lead > 0 ? `adelay=${lead}:all=1` : null,
    tail > 0 ? `apad=pad_dur=${tail}` : null,
  ]
    .filter(Boolean)
    .join(",");
}

/** EBU R128 of a finished file: integrated loudness, true peak, loudness range. */
export async function measureLoudness(file: string): Promise<{ I: number; TP: number; LRA: number }> {
  const log = await ffmpeg(["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const s = log.slice(log.lastIndexOf("Summary"));
  const get = (re: RegExp) => Number(s.match(re)?.[1]);
  return { I: get(/I:\s+(-?[\d.]+) LUFS/), TP: get(/Peak:\s+(-?[\d.]+|-inf) dBFS/), LRA: get(/LRA:\s+(-?[\d.]+) LU/) };
}

async function analyse(input: string, target: LoudnessTarget) {
  const duration = await probeDuration(input);
  const log = await ffmpeg([
    "-i", input,
    "-af", `aresample=48000,highpass=f=70,silencedetect=n=${SILENCE_DB}dB:d=0.05,loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:print_format=json`,
    "-f", "null", "-",
  ]);
  return { duration, loud: parseLoudnorm(log), silences: parseSilences(log, duration) };
}

export type MasterResult = { path: string; seconds: number; gainDb: number; before: LoudnessStats };

/**
 * Master one narration to `output` (48 kHz mono WAV — lossless until the
 * video's own AAC encode). Throws on ffmpeg failure; callers fall back to
 * the unmastered file.
 */
export async function masterNarration(input: string, output: string, opts: MasterOptions = {}): Promise<MasterResult> {
  const target = opts.target ?? SOCIAL_TARGET;
  const { duration, loud, silences } = await analyse(input, target);
  if (!Number.isFinite(loud.I) || loud.I < -60) throw new Error(`narration is silent (${loud.I} LUFS)`);
  const cuts = silenceCuts(silences, duration, opts.maxPause ?? MASTER_DEFAULTS.maxPause);
  const kept = keptSeconds(duration, cuts);
  const render = (gainDb: number) =>
    ffmpeg(["-y", "-i", input, "-af", masterFilter({ cuts, keptSeconds: kept, gainDb, target, tempo: opts.tempo, leadPad: opts.leadPad, tailPad: opts.tailPad }), "-ac", "1", "-c:a", "pcm_s16le", output]);
  let gainDb = gainTo(target, loud);
  await render(gainDb);
  // The limiter shaves the peaks the gain pushed over the ceiling, which costs
  // 0.3-1.1 LU on TTS (measured on the previews). Measure and correct once.
  const got = await measureLoudness(output);
  const short = Math.round((target.I - got.I) * 100) / 100;
  if (Number.isFinite(short) && Math.abs(short) > 0.2) {
    gainDb = Math.round((gainDb + short) * 100) / 100;
    await render(gainDb);
  }
  return { path: output, seconds: await probeDuration(output), gainDb, before: loud };
}

export type MusicOptions = {
  target?: LoudnessTarget;
  /** Music level with no voice over it, in LU under the voice's loudness. */
  bedBelowVoice?: number;
  /** Extra reduction while the voice speaks (sidechain ducking), dB. */
  duckDb?: number;
  fadeIn?: number;
  fadeOut?: number;
};

export const MUSIC_DEFAULTS = { bedBelowVoice: 16, duckDb: 8, fadeIn: 1.0, fadeOut: 1.5 } as const;

/**
 * The music-bed chain: loop/trim to the voice, set the bed level, carve the
 * speech band so the bed never masks consonants, fade in and out, duck under
 * the voice (sidechain compressor keyed on the narration), mix, limit.
 */
export function musicMixFilter(p: { seconds: number; musicGainDb: number; voiceGainDb?: number; ceilingDbtp: number; opts?: MusicOptions }): string {
  const o = { ...MUSIC_DEFAULTS, ...(p.opts ?? {}) };
  const fadeOut = Math.min(o.fadeOut, p.seconds / 3);
  const fadeIn = Math.min(o.fadeIn, p.seconds / 3);
  // Ratio that gives about `duckDb` of reduction for a voice ~20 dB above the threshold.
  const ratio = Math.min(20, Math.max(1.5, 20 / Math.max(1, 20 - o.duckDb))).toFixed(2);
  const ceiling = Math.pow(10, (p.ceilingDbtp - 0.5) / 20).toFixed(4);
  return [
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${p.voiceGainDb ?? 0}dB,asplit=2[voice][key]`,
    `[1:a]aresample=48000,aformat=channel_layouts=stereo,aloop=loop=-1:size=2147483647,atrim=duration=${p.seconds.toFixed(3)},asetpts=N/SR/TB,` +
      `highpass=f=60,equalizer=f=2500:t=q:w=1.2:g=-4,volume=${p.musicGainDb}dB,` +
      `afade=t=in:st=0:d=${fadeIn.toFixed(2)},afade=t=out:st=${Math.max(0, p.seconds - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(2)}[bed]`,
    `[bed][key]sidechaincompress=threshold=0.02:ratio=${ratio}:attack=15:release=450:makeup=1:knee=4[ducked]`,
    `[voice][ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,aresample=192000,` +
      `alimiter=limit=${ceiling}:attack=1:release=60:level=false:latency=true,aresample=48000[out]`,
  ].join(";");
}

/**
 * Mix a mastered narration with a music track: the bed sits `bedBelowVoice`
 * LU under the voice and ducks a further ~`duckDb` while words are spoken;
 * the mix is then measured and brought back onto the target. Output is a
 * 48 kHz stereo WAV the length of the narration.
 */
export async function mixNarrationWithMusic(voice: string, music: string, output: string, opts: MusicOptions = {}): Promise<MasterResult> {
  const target = opts.target ?? SOCIAL_TARGET;
  const o = { ...MUSIC_DEFAULTS, ...opts };
  const seconds = await probeDuration(voice);
  const [v, m] = await Promise.all([measureLoudness(voice), measureLoudness(music)]);
  if (!Number.isFinite(m.I) || m.I < -60) throw new Error("music track is silent");
  const musicGainDb = Math.round((v.I - o.bedBelowVoice - m.I) * 100) / 100;
  const mix = (voiceGainDb: number, out: string) =>
    ffmpeg(["-y", "-i", voice, "-i", music, "-filter_complex", musicMixFilter({ seconds, musicGainDb: musicGainDb + voiceGainDb, voiceGainDb, ceilingDbtp: target.TP, opts }), "-map", "[out]", "-c:a", "pcm_s16le", out]);
  // Pass 1 at unity, measure, pass 2 with the correction (the bed adds ~0.1-0.5 LU).
  await mix(0, output);
  const first = await measureLoudness(output);
  const corr = Math.round((target.I - first.I) * 100) / 100;
  if (Math.abs(corr) > 0.2) await mix(corr, output);
  return { path: output, seconds: await probeDuration(output), gainDb: corr, before: { ...first, thresh: NaN } };
}
