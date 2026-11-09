import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertLocalMedia, isInside, mediaRoots, probeDuration, safeInputArgs, UnsafeMediaInputError } from "./media-input.js";
import { analyseLogo } from "../dental/logo.js";
import { stageLocalAsset } from "../remotion/render-plan.js";
import { clinicProfileSchema } from "../dental/profile.js";

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

let dir: string;
let secret: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "media-input-"));
  // A file outside the job dir that a hostile "video" would try to pull in.
  secret = path.join(dir, "..", `secret-${process.pid}.txt`);
  fs.writeFileSync(secret, "TOP SECRET");
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(secret, { force: true });
});

describe("assertLocalMedia", () => {
  it("accepts a file inside the temp dir and refuses URLs, protocols, relative paths and other dirs", () => {
    const f = path.join(dir, "a.png");
    fs.writeFileSync(f, "x");
    expect(assertLocalMedia(f)).toBe(f);
    for (const bad of ["http://169.254.169.254/latest", "file:///etc/passwd", "concat:/tmp/a|/etc/passwd", "subfile,,start,0,end,0,,:/etc/passwd", "a.png", "/etc/passwd"]) {
      expect(() => assertLocalMedia(bad), bad).toThrow(UnsafeMediaInputError);
    }
  });

  it("follows symlinks: a link in the temp dir pointing out is refused", () => {
    const link = path.join(dir, "link.png");
    fs.symlinkSync("/etc/hostname", link);
    expect(isInside(link, mediaRoots())).toBe(false);
    expect(() => assertLocalMedia(link)).toThrow(UnsafeMediaInputError);
  });

  it("pins protocols and demuxers", () => {
    expect(safeInputArgs("image")).toEqual(["-protocol_whitelist", "file,pipe", "-format_whitelist", expect.stringContaining("png_pipe")]);
    expect(safeInputArgs("video").join(" ")).not.toMatch(/hls|concat|http/);
  });
});

describe.skipIf(!hasFfmpeg)("ffmpeg never follows a playlist disguised as media", () => {
  const hls = (target: string) => `#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:1.0,\n${target}\n#EXT-X-ENDLIST\n`;

  it("an HLS 'logo' pointing at a local file or a URL is not read", async () => {
    for (const target of [`file://${secret}`, "http://169.254.169.254/latest/meta-data"]) {
      const f = path.join(dir, "logo.png");
      fs.writeFileSync(f, hls(target));
      await expect(analyseLogo(f)).rejects.toThrow();
    }
  });

  it("an HLS 'recording' has no duration, so the job refuses it before anything else reads it", async () => {
    // Even named .m3u8 (where ffmpeg's own HLS sniffing would accept it), the demuxer allow-list refuses it.
    for (const name of ["source.mp4", "source.m3u8"]) {
      const f = path.join(dir, name);
      fs.writeFileSync(f, hls(`file://${secret}`));
      expect(Number.isNaN(await probeDuration(f)), name).toBe(true);
    }
    // Control: without the allow-lists ffmpeg would follow the .m3u8 playlist to the local file.
    const plain = spawnSync("ffprobe", ["-v", "verbose", path.join(dir, "source.m3u8")]).stderr.toString();
    expect(plain).toMatch(/hls/i);
  });

  it("a real recording and a real logo still work", async () => {
    const mp4 = path.join(dir, "real.mp4");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=d=1:s=64x64", "-f", "lavfi", "-i", "sine=d=1", "-shortest", mp4]);
    expect(await probeDuration(mp4)).toBeGreaterThan(0.5);
    const png = path.join(dir, "real.png");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=navy:s=64x32", "-frames:v", "1", png]);
    const a = await analyseLogo(png);
    expect(a.contentAspect).toBeGreaterThan(1);
  });
});

describe("Remotion staging only takes local files from the job's directories", () => {
  it("stages a file in the work dir, refuses URLs and files elsewhere", async () => {
    const assetDir = fs.mkdtempSync(path.join(dir, "stage-"));
    const ok = path.join(dir, "voice.mp3");
    fs.writeFileSync(ok, "id3");
    const warnings: string[] = [];
    const opts = { assetDir, renderId: "r1", roots: mediaRoots([dir]), onWarn: (m: string) => warnings.push(m) };
    expect(await stageLocalAsset(ok, opts)).toBe("r1/voice.mp3");
    expect(await stageLocalAsset("http://169.254.169.254/latest", { ...opts, what: "logo" })).toBeUndefined();
    expect(await stageLocalAsset("/etc/passwd", { ...opts, what: "logo" })).toBeUndefined();
    expect(await stageLocalAsset("relative/logo.png", { ...opts, what: "logo" })).toBeUndefined();
    expect(fs.readdirSync(assetDir)).toEqual(["voice.mp3"]);
    expect(warnings).toHaveLength(3);
  });
});

describe("worker clinic profile", () => {
  const base = { name: "Gülüş Dental", country: "tr", language: "tr", services: ["İmplant", "Beyazlatma"] };

  it("has no logo field: an injected logo / URL / path is dropped", () => {
    const p = clinicProfileSchema.parse({ ...base, logo: "/etc/passwd", logoUrl: "http://169.254.169.254/" }) as Record<string, unknown>;
    expect(p.logo).toBeUndefined();
    expect(p.logoUrl).toBeUndefined();
    expect(p.country).toBe("TR");
  });

  it("drops a non-https booking link and an odd handle instead of failing the week", () => {
    const p = clinicProfileSchema.parse({ ...base, bookingUrl: "file:///etc/passwd", handle: "../../x" });
    expect(p.bookingUrl).toBeUndefined();
    expect(p.handle).toBeUndefined();
    expect(clinicProfileSchema.parse({ ...base, bookingUrl: "http://clinic.example/book" }).bookingUrl).toBeUndefined();
    const ok = clinicProfileSchema.parse({ ...base, bookingUrl: "https://clinic.example/book", handle: "@gulus.dental" });
    expect(ok.bookingUrl).toBe("https://clinic.example/book");
    expect(ok.handle).toBe("gulus.dental");
  });

  it("refuses URLs or paths in the text the agents read, unknown languages and over-long fields", () => {
    expect(() => clinicProfileSchema.parse({ ...base, name: "http://evil.example" })).toThrow();
    expect(() => clinicProfileSchema.parse({ ...base, services: ["/etc/passwd"] })).toThrow();
    expect(() => clinicProfileSchema.parse({ ...base, language: "xx" })).toThrow();
    expect(() => clinicProfileSchema.parse({ ...base, name: "x".repeat(81) })).toThrow();
    expect(() => clinicProfileSchema.parse({ ...base, services: [] })).toThrow();
  });
});
