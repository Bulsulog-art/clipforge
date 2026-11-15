import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TOLERANCE_LU, correctionFilter, enforceLoudness, loudnessCorrection } from "./loudness-guard.js";

describe("loudnessCorrection", () => {
  it("leaves a render on target alone", () => {
    expect(loudnessCorrection({ I: -14.4, TP: -4.5 })).toBeNull(); // what a mastered narration renders to
    expect(loudnessCorrection({ I: -14 - TOLERANCE_LU, TP: -2 })).toBeNull();
  });

  it("brings the published samples' levels up to -14 LUFS", () => {
    expect(loudnessCorrection({ I: -26.9, TP: -8.8 })).toEqual({ gainDb: 12.9 }); // en, unmastered TTS
    expect(loudnessCorrection({ I: -17.1, TP: -4.7 })).toEqual({ gainDb: 3.1 }); // ja, old loudnorm
  });

  it("turns a hot render down, and limits one that peaks over the ceiling even at the right loudness", () => {
    expect(loudnessCorrection({ I: -10, TP: -0.5 })).toEqual({ gainDb: -4 });
    expect(loudnessCorrection({ I: -14.2, TP: -0.3 })).toEqual({ gainDb: 0.2 });
  });

  it("never raises silence", () => {
    expect(loudnessCorrection({ I: NaN, TP: NaN })).toBeNull();
    expect(loudnessCorrection({ I: -70, TP: -60 })).toBeNull();
  });

  it("limits at a true-peak ceiling 0.5 dB under -1 dBTP", () => {
    const f = correctionFilter({ gainDb: 3.1 });
    expect(f).toContain("volume=3.1dB");
    expect(f).toContain("aresample=192000"); // 4x oversampled: a true-peak limiter
    expect(f).toMatch(/alimiter=limit=0\.84\d\d/); // 10^(-1.5/20)
  });
});

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasFfmpeg)("enforceLoudness on a real mp4", () => {
  const make = (dir: string, db: number) => {
    const file = path.join(dir, `v${db}.mp4`);
    execFileSync("ffmpeg", [
      "-v", "error", "-y",
      "-f", "lavfi", "-i", "color=c=0x0E7490:s=108x192:d=4:r=30",
      "-f", "lavfi", "-i", "anoisesrc=d=4:c=pink:a=0.5",
      "-af", `volume=${db}dB`, "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", file,
    ]);
    return file;
  };

  it("lifts a quiet render onto -14 LUFS / under -1 dBTP and keeps the video stream as it was", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loudguard-"));
    const file = make(dir, -22);
    const videoBefore = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,nb_frames", "-of", "csv=p=0", file]).toString();
    const r = await enforceLoudness(file);
    expect(r.corrected).toBe(true);
    expect(r.before.I).toBeLessThan(-18);
    expect(Math.abs(r.after.I - -14)).toBeLessThanOrEqual(TOLERANCE_LU);
    expect(r.after.TP).toBeLessThanOrEqual(-1);
    const videoAfter = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,nb_frames", "-of", "csv=p=0", file]).toString();
    expect(videoAfter).toBe(videoBefore);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
