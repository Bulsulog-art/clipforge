import { describe, expect, it } from "vitest";
import { clipFinding, isSilentIssue, qaFinding, qaReasonCode, REASON_CODES, reasonText, tagReason, UNCHECKED_FINDING } from "./reasons.js";
import { judge } from "../steps/qa.js";

describe("reason codes", () => {
  it("codes every QA issue judge() can produce", () => {
    const stats = { durationSec: 2, width: 100, height: 100, hasAudio: true, meanVolumeDb: -60, longestSilenceSec: 3.1, blackSec: 2 };
    const issues = judge(stats, { width: 1080, height: 1920, minSec: 10, maxSec: 60, expectAudio: true, maxSilenceSec: 3 });
    expect(issues.map(qaReasonCode)).toEqual(["technical", "technical", "audio", "pause", "technical"]);
    expect(qaReasonCode("no audio track")).toBe("audio");
  });

  it("tags once and strips the tag for the team", () => {
    const f = qaFinding("3.1s of silence (max 3s)");
    expect(f).toBe("[dv:pause] quality: 3.1s of silence (max 3s)");
    expect(tagReason("technical", f)).toBe(f);
    expect(reasonText(f)).toBe("quality: 3.1s of silence (max 3s)");
    expect(clipFinding(f)).toBe(f);
  });

  it("tells a render with no narration at all from a pause in narration that is there", () => {
    const stats = { durationSec: 30, width: 1080, height: 1920, hasAudio: true, meanVolumeDb: -91, longestSilenceSec: 30, blackSec: 0 };
    const quiet = judge(stats, { width: 1080, height: 1920, expectAudio: true });
    expect(quiet.filter(isSilentIssue)).toEqual([quiet[0]]);
    expect(isSilentIssue("no audio track")).toBe(true);
    expect(isSilentIssue("4.2s of silence (max 3s)")).toBe(false);
    expect(isSilentIssue("0.8s of black frames")).toBe(false);
  });

  it("a render nobody could measure has its own code, kept in step with the web app's list", () => {
    expect(REASON_CODES).toContain("unchecked");
    expect(UNCHECKED_FINDING).toBe("[dv:unchecked] qa unavailable");
    expect(reasonText(UNCHECKED_FINDING)).toBe("qa unavailable");
  });
});
