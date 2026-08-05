import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveStockClip, resolveStockClips, pickFile, scoreVideo } from "./stock.js";

/**
 * Every one of these is about failing soft. A stock provider having a bad
 * afternoon must not cost a user the video they asked for — the scene falls
 * back to the theme background and the render continues.
 */

let workDir: string;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "stock-test-"));
});
afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

const video = (over: Record<string, unknown> = {}) => ({
  id: 1,
  width: 1080,
  height: 1920,
  duration: 10,
  video_files: [
    { link: "https://x/sd.mp4", width: 640, height: 1138, file_type: "video/mp4", quality: "sd" },
    { link: "https://x/hd.mp4", width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" },
    { link: "https://x/uhd.mp4", width: 2160, height: 3840, file_type: "video/mp4", quality: "uhd" },
  ],
  ...over,
});

function fetchStub(handlers: {
  search?: () => Response;
  download?: () => Response;
}): typeof fetch {
  return (async (url: string) => {
    if (String(url).includes("api.pexels.com")) {
      return handlers.search
        ? handlers.search()
        : new Response(JSON.stringify({ videos: [video()] }), { status: 200 });
    }
    return handlers.download
      ? handlers.download()
      : new Response(new Uint8Array([0, 1, 2, 3]), { status: 200 });
  }) as unknown as typeof fetch;
}

const baseOpts = () => ({
  apiKey: "test-key",
  workDir,
  aspect: "9:16" as const,
  targetWidth: 1080,
});

describe("the happy path", () => {
  it("downloads a clip and reports where it landed", async () => {
    const clip = await resolveStockClip("sunrise over city", 4, {
      ...baseOpts(),
      fetchImpl: fetchStub({}),
    });
    expect(clip).toBeDefined();
    expect(clip?.query).toBe("sunrise over city");
    await expect(fs.stat(clip!.path)).resolves.toBeTruthy();
  });

  it("asks for the orientation the video actually needs", async () => {
    const seen: string[] = [];
    const impl = (async (url: string) => {
      seen.push(String(url));
      if (String(url).includes("api.pexels.com")) {
        return new Response(JSON.stringify({ videos: [video()] }), { status: 200 });
      }
      return new Response(new Uint8Array([1]), { status: 200 });
    }) as unknown as typeof fetch;

    await resolveStockClip("q", 4, { ...baseOpts(), aspect: "16:9", fetchImpl: impl });
    expect(seen[0]).toMatch(/orientation=landscape/);
  });
});

describe("every failure returns undefined instead of throwing", () => {
  it("no api key", async () => {
    const warnings: string[] = [];
    const clip = await resolveStockClip("q", 4, {
      ...baseOpts(),
      apiKey: undefined,
      fetchImpl: fetchStub({}),
      onWarn: (m) => warnings.push(m),
    });
    expect(clip).toBeUndefined();
    expect(warnings[0]).toMatch(/no PEXELS_API_KEY/);
  });

  it("search returns an error status", async () => {
    const clip = await resolveStockClip("q", 4, {
      ...baseOpts(),
      fetchImpl: fetchStub({ search: () => new Response("nope", { status: 429 }) }),
    });
    expect(clip).toBeUndefined();
  });

  it("search finds nothing", async () => {
    const clip = await resolveStockClip("q", 4, {
      ...baseOpts(),
      fetchImpl: fetchStub({
        search: () => new Response(JSON.stringify({ videos: [] }), { status: 200 }),
      }),
    });
    expect(clip).toBeUndefined();
  });

  it("the network throws", async () => {
    const clip = await resolveStockClip("q", 4, {
      ...baseOpts(),
      fetchImpl: (async () => {
        throw new Error("ECONNRESET");
      }) as unknown as typeof fetch,
    });
    expect(clip).toBeUndefined();
  });

  it("the download fails", async () => {
    const clip = await resolveStockClip("q", 4, {
      ...baseOpts(),
      fetchImpl: fetchStub({ download: () => new Response("gone", { status: 404 }) }),
    });
    expect(clip).toBeUndefined();
  });

  it("the result has no usable mp4", async () => {
    const webmOnly = video({
      video_files: [
        { link: "https://x/a.webm", width: 1080, height: 1920, file_type: "video/webm", quality: "hd" },
      ],
    });
    const clip = await resolveStockClip("q", 4, {
      ...baseOpts(),
      fetchImpl: fetchStub({
        search: () => new Response(JSON.stringify({ videos: [webmOnly] }), { status: 200 }),
      }),
    });
    expect(clip).toBeUndefined();
  });

  it("the file is absurdly large", async () => {
    const huge = new Uint8Array(61 * 1024 * 1024);
    const clip = await resolveStockClip("q", 4, {
      ...baseOpts(),
      fetchImpl: fetchStub({ download: () => new Response(huge, { status: 200 }) }),
    });
    expect(clip).toBeUndefined();
  });
});

describe("picking the file", () => {
  it("takes the smallest file that still covers the frame", () => {
    expect(pickFile(video() as never, 1080)?.link).toBe("https://x/hd.mp4");
  });

  it("does not pull 4K to fill a 1080 frame", () => {
    expect(pickFile(video() as never, 640)?.link).toBe("https://x/sd.mp4");
  });

  it("falls back to the largest available rather than dropping the shot", () => {
    expect(pickFile(video() as never, 5000)?.link).toBe("https://x/uhd.mp4");
  });

  it("ignores non-mp4 files", () => {
    const mixed = video({
      video_files: [
        { link: "https://x/a.webm", width: 4000, height: 4000, file_type: "video/webm", quality: "uhd" },
        { link: "https://x/b.mp4", width: 720, height: 1280, file_type: "video/mp4", quality: "hd" },
      ],
    });
    expect(pickFile(mixed as never, 1080)?.link).toBe("https://x/b.mp4");
  });
});

describe("choosing between results", () => {
  it("prefers a clip whose orientation already matches", () => {
    const portrait = video({ width: 1080, height: 1920, duration: 10 });
    const landscape = video({ width: 1920, height: 1080, duration: 10 });
    expect(scoreVideo(portrait as never, 4, true)).toBeGreaterThan(
      scoreVideo(landscape as never, 4, true),
    );
  });

  it("prefers a clip long enough to cover the scene", () => {
    const long = video({ duration: 12 });
    const short = video({ duration: 2 });
    expect(scoreVideo(long as never, 8, true)).toBeGreaterThan(scoreVideo(short as never, 8, true));
  });

  it("does not keep rewarding length past what the scene needs", () => {
    const enough = video({ duration: 5 });
    const excessive = video({ duration: 500 });
    expect(scoreVideo(excessive as never, 4, true)).toBe(scoreVideo(enough as never, 4, true));
  });
});

describe("resolving a whole plan", () => {
  it("maps each query to its clip", async () => {
    const map = await resolveStockClips(
      [
        { query: "sunrise", seconds: 4 },
        { query: "coffee", seconds: 3 },
      ],
      { ...baseOpts(), fetchImpl: fetchStub({}) },
    );
    expect(map.size).toBe(2);
    expect(map.get("sunrise")).toBeDefined();
  });

  it("keeps the clips it did find when one query fails", async () => {
    let call = 0;
    const impl = (async (url: string) => {
      if (String(url).includes("api.pexels.com")) {
        call += 1;
        return call === 1
          ? new Response(JSON.stringify({ videos: [] }), { status: 200 })
          : new Response(JSON.stringify({ videos: [video()] }), { status: 200 });
      }
      return new Response(new Uint8Array([1]), { status: 200 });
    }) as unknown as typeof fetch;

    const map = await resolveStockClips(
      [
        { query: "nothing here", seconds: 4 },
        { query: "coffee", seconds: 3 },
      ],
      { ...baseOpts(), fetchImpl: impl },
    );
    expect(map.has("nothing here")).toBe(false);
    expect(map.has("coffee")).toBe(true);
  });

  it("returns an empty map rather than failing when everything fails", async () => {
    const map = await resolveStockClips([{ query: "a", seconds: 4 }], {
      ...baseOpts(),
      apiKey: undefined,
      fetchImpl: fetchStub({}),
    });
    expect(map.size).toBe(0);
  });
});
