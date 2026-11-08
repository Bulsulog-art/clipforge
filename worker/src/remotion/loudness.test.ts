import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeLoudness } from "./voiceover.js";

const hasFfmpeg = (() => { try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; } })();

describe.skipIf(!hasFfmpeg)("normalizeLoudness", () => {
  it("raises quiet narration to about -16 LUFS", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "loud-"));
    const quiet = path.join(dir, "v.mp3");
    execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=300:duration=4", "-af", "volume=-30dB", quiet]);
    const out = await normalizeLoudness(quiet);
    expect(out).not.toBe(quiet);
    const log = execFileSync("ffmpeg", ["-hide_banner", "-i", out, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).toString();
    void log;
    const stats = execFileSync("sh", ["-c", `ffmpeg -hide_banner -i "${out}" -af ebur128 -f null - 2>&1 | grep -E '^\\s+I:' | tail -1`], { encoding: "utf8" });
    const lufs = Number(stats.match(/-?\d+(\.\d+)?/)?.[0]);
    expect(lufs).toBeGreaterThan(-19);
    expect(lufs).toBeLessThan(-13);
  });
  it("keeps the original file when ffmpeg fails", async () => {
    expect(await normalizeLoudness("/nonexistent/x.mp3")).toBe("/nonexistent/x.mp3");
  });
});
