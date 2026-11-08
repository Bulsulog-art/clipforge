import { describe, it, expect } from "vitest";
import { judge, parseBlackSeconds, parseMeanVolume, parseSilences } from "./qa.js";

const good = { durationSec: 28.9, width: 1080, height: 1920, hasAudio: true, meanVolumeDb: -30.9, longestSilenceSec: 0.8, blackSec: 0 };
const expectNarrated = { width: 1080, height: 1920, minSec: 10, maxSec: 90, expectAudio: true };

describe("QA judgement", () => {
  it("passes a good narrated vertical video", () => {
    expect(judge(good, expectNarrated)).toEqual([]);
  });
  it("fails a narration that covers almost none of the video (seen live: 0.5 s over 24 s)", () => {
    expect(judge({ ...good, longestSilenceSec: 23.5 }, expectNarrated)[0]).toMatch(/silence/);
  });
  it("fails silent audio and a missing track", () => {
    expect(judge({ ...good, meanVolumeDb: -91 }, expectNarrated)[0]).toMatch(/silent/);
    expect(judge({ ...good, hasAudio: false, meanVolumeDb: null }, expectNarrated)[0]).toMatch(/no audio/);
  });
  it("fails wrong resolution, black frames and out-of-range length", () => {
    const issues = judge({ ...good, width: 1920, height: 1080, blackSec: 2, durationSec: 4 }, expectNarrated);
    expect(issues.join(" ")).toMatch(/resolution/);
    expect(issues.join(" ")).toMatch(/black/);
    expect(issues.join(" ")).toMatch(/too short/);
  });
});

describe("ffmpeg output parsing", () => {
  it("reads silences, including one that runs to the end", () => {
    const err = "[silencedetect] silence_start: 1.2\n[silencedetect] silence_end: 3.4 | silence_duration: 2.2\n[silencedetect] silence_start: 20\n";
    expect(parseSilences(err, 24)).toEqual([{ start: 1.2, end: 3.4 }, { start: 20, end: 24 }]);
  });
  it("reads mean volume and black duration", () => {
    expect(parseMeanVolume("[Parsed_volumedetect_0] mean_volume: -30.9 dB")).toBe(-30.9);
    expect(parseMeanVolume("mean_volume: -inf dB")).toBe(-Infinity);
    expect(parseBlackSeconds("black_start:0 black_end:1.5 black_duration:1.5\nblack_duration:0.5")).toBe(2);
  });
});
