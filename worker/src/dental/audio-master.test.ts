import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  gainTo,
  keptSeconds,
  masterFilter,
  masterNarration,
  measureLoudness,
  mixNarrationWithMusic,
  musicMixFilter,
  parseLoudnorm,
  parseSilences,
  selectFilter,
  silenceCuts,
  SOCIAL_TARGET,
} from "./audio-master.js";

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe("parsers", () => {
  it("reads loudnorm's JSON block", () => {
    const log = `[Parsed_loudnorm_2 @ 0x1] \n{\n\t"input_i" : "-17.76",\n\t"input_tp" : "0.30",\n\t"input_lra" : "3.10",\n\t"input_thresh" : "-28.12",\n\t"output_i" : "-15.24",\n\t"normalization_type" : "dynamic",\n\t"target_offset" : "1.24"\n}\n`;
    expect(parseLoudnorm(log)).toEqual({ I: -17.76, TP: 0.3, LRA: 3.1, thresh: -28.12 });
    expect(() => parseLoudnorm("no json")).toThrow();
  });
  it("pairs silence starts and ends; an open one runs to the end", () => {
    const log = "silence_start: -0.002\nsilence_end: 0.06 | silence_duration: 0.06\nsilence_start: 3.5\nsilence_end: 4.9 | x\nsilence_start: 9.7\n";
    expect(parseSilences(log, 10)).toEqual([
      { start: 0, end: 0.06 },
      { start: 3.5, end: 4.9 },
      { start: 9.7, end: 10 },
    ]);
  });
});

describe("silenceCuts", () => {
  it("trims both edges (keeping a guard) and shortens only over-long pauses", () => {
    const cuts = silenceCuts(
      [
        { start: 0, end: 0.4 },
        { start: 3, end: 3.5 }, // a normal pause: kept
        { start: 6, end: 7.4 }, // 1.4 s: shortened to 0.8, both ends kept
        { start: 9.6, end: 9.95 }, // ends within 0.1 s of the file end: trailing
      ],
      10,
      0.8,
    );
    expect(cuts).toEqual([
      [0, 0.37],
      [6.4, 7],
      [9.63, 10],
    ]);
    expect(keptSeconds(10, cuts)).toBeCloseTo(10 - 0.37 - 0.6 - 0.37, 5);
  });
  it("leaves an all-silent file alone", () => {
    expect(silenceCuts([{ start: 0, end: 5 }], 5)).toEqual([]);
  });
});

describe("filters", () => {
  it("aselect drops the cut spans and re-times", () => {
    expect(selectFilter([])).toBeNull();
    expect(selectFilter([[0, 0.3], [5, 6]])).toBe("aselect='not(between(t\\,0\\,0.3)+between(t\\,5\\,6))',asetpts=N/SR/TB");
  });
  it("gain lands the measured loudness on target", () => {
    expect(gainTo(SOCIAL_TARGET, { I: -17.3, TP: -0.7, LRA: 3, thresh: -28 })).toBe(3.3);
  });
  it("master chain: tempo only when asked, fades at the spoken end, oversampled limiter under the ceiling, pads", () => {
    const f = masterFilter({ cuts: [], keptSeconds: 10, gainDb: 3, target: SOCIAL_TARGET, tempo: 0.92, leadPad: 0.15, tailPad: 0.35 });
    expect(f).toContain("atempo=0.92");
    expect(f).toContain(`afade=t=out:st=${(10 / 0.92 - 0.06).toFixed(3)}`);
    expect(f).toMatch(/volume=3dB,aresample=192000,alimiter=limit=0\.8414/); // -1.5 dBFS at 4x = a true-peak ceiling
    expect(f).toContain("adelay=150:all=1");
    expect(f).toContain("apad=pad_dur=0.35");
    expect(masterFilter({ cuts: [], keptSeconds: 10, gainDb: 0, target: SOCIAL_TARGET, tempo: 1 })).not.toContain("atempo");
  });
  it("music chain ducks the bed with the voice as the key and fades it", () => {
    const f = musicMixFilter({ seconds: 30, musicGainDb: -20, ceilingDbtp: -1 });
    expect(f).toContain("[bed][key]sidechaincompress");
    expect(f).toContain("afade=t=in:st=0:d=1.00");
    expect(f).toContain("afade=t=out:st=28.500:d=1.50");
    expect(f).toContain("amix=inputs=2:duration=first");
  });
});

/** A stand-in for TTS: tone "words" with pauses, at a quiet -26 LUFS-ish level, with silence at both ends. */
function fakeNarration(dir: string): string {
  const out = path.join(dir, "voice.mp3");
  const word = (f: number, d: number) => `sine=frequency=${f}:duration=${d}`;
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono:d=0.6",
    "-f", "lavfi", "-i", word(220, 1.5),
    "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono:d=1.6", // an over-long pause
    "-f", "lavfi", "-i", word(330, 1.5),
    "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono:d=1.2",
    "-filter_complex", "[1]aresample=24000,volume=-22dB,tremolo=f=4:d=0.6[a];[3]aresample=24000,volume=-22dB,tremolo=f=5:d=0.6[b];[0][a][2][b][4]concat=n=5:v=0:a=1",
    "-c:a", "libmp3lame", "-b:a", "64k", out,
  ]);
  return out;
}

function silences(file: string): Array<[number, number]> {
  const log = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -i "${file}" -af silencedetect=n=-45dB:d=0.05 -f null - 2>&1`], { encoding: "utf8" });
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
  return parseSilences(log, dur).map((s) => [s.start, s.end]);
}

// Real ffmpeg renders: a few seconds each, much longer on a busy machine.
describe.skipIf(!hasFfmpeg)("masterNarration (ffmpeg)", { timeout: 60_000 }, () => {
  it("hits -14 LUFS / -1 dBTP, trims the edges to the pads and caps the long pause", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "master-"));
    const src = fakeNarration(dir);
    const r = await masterNarration(src, path.join(dir, "out.wav"));
    const m = await measureLoudness(r.path);
    expect(Math.abs(m.I - SOCIAL_TARGET.I)).toBeLessThanOrEqual(0.5);
    expect(m.TP).toBeLessThanOrEqual(SOCIAL_TARGET.TP);
    const s = silences(r.path);
    const lead = s[0][0] < 0.01 ? s[0][1] : 0;
    const tail = r.seconds - s[s.length - 1][0];
    expect(lead).toBeGreaterThan(0.1);
    expect(lead).toBeLessThan(0.3);
    expect(tail).toBeGreaterThan(0.25);
    expect(tail).toBeLessThan(0.6);
    const inner = s.filter(([a, b]) => a > 0.01 && b < r.seconds - 0.05).map(([a, b]) => b - a);
    expect(Math.max(...inner)).toBeLessThan(1.0); // was 1.6 s
    expect(r.seconds).toBeLessThan(6.4 - 0.5); // source 6.4 s
  });
  it("slows the speech by the tempo factor", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "master-"));
    const src = fakeNarration(dir);
    const plain = await masterNarration(src, path.join(dir, "a.wav"));
    const slow = await masterNarration(src, path.join(dir, "b.wav"), { tempo: 0.9 });
    const pads = 0.15 + 0.35;
    expect((slow.seconds - pads) / (plain.seconds - pads)).toBeCloseTo(1 / 0.9, 1);
  });
  it("throws on a silent file (the caller keeps the plain voice)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "master-"));
    const src = path.join(dir, "s.wav");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono:d=2", src]);
    await expect(masterNarration(src, path.join(dir, "o.wav"))).rejects.toThrow();
  });
  it("mixes a ducked, faded music bed and keeps the mix on target", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "master-"));
    const voice = (await masterNarration(fakeNarration(dir), path.join(dir, "v.wav"))).path;
    const music = path.join(dir, "m.wav");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anoisesrc=d=3:c=pink:a=0.3", "-ac", "2", music]); // shorter than the voice: must loop
    const r = await mixNarrationWithMusic(voice, music, path.join(dir, "mix.wav"));
    const m = await measureLoudness(r.path);
    expect(Math.abs(m.I - SOCIAL_TARGET.I)).toBeLessThanOrEqual(0.5);
    expect(m.TP).toBeLessThanOrEqual(SOCIAL_TARGET.TP);
    expect(r.seconds).toBeCloseTo(Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice], { encoding: "utf8" })), 1);
    // The bed is faded in: the first 50 ms are far quieter than the voice.
    const head = execFileSync("sh", ["-c", `ffmpeg -hide_banner -nostats -t 0.05 -i "${r.path}" -af volumedetect -f null - 2>&1 | grep max_volume`], { encoding: "utf8" });
    expect(Number(head.match(/(-?[\d.]+) dB/)?.[1])).toBeLessThan(-30);
  });
});
