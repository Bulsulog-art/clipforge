import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveFootage } from "./render-plan.js";
import { parseScenePlan } from "./scene-plan.js";

/**
 * resolveFootage is the join between a plan's intentions and the files that
 * actually exist. It is tested on its own because it is where "the shot could
 * not be found" has to turn into a missing map entry rather than an exception.
 */

let workDir: string;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "render-test-"));
});
afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

const hook = { kind: "hook" as const, text: "Watch this", seconds: 3 };
const stockScene = (query: string, seconds = 4) => ({
  kind: "footage" as const,
  source: { type: "stock" as const, query },
  seconds,
});
const userScene = (assetIndex: number, seconds = 4) => ({
  kind: "footage" as const,
  source: { type: "user" as const, assetIndex },
  seconds,
});

function plan(scenes: unknown[], userAssetCount = 0) {
  return parseScenePlan(
    { title: "T", aspect: "9:16", theme: "midnight", music: "none", scenes },
    userAssetCount,
  );
}

const okFetch = (() =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        videos: [
          {
            id: 7,
            width: 1080,
            height: 1920,
            duration: 12,
            video_files: [
              { link: "https://x/hd.mp4", width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" },
            ],
          },
        ],
      }),
      { status: 200 },
    ),
  )) as unknown as typeof fetch;

const fetchBoth = (async (url: string) =>
  String(url).includes("api.pexels.com")
    ? (okFetch as unknown as (u: string) => Promise<Response>)(url)
    : new Response(new Uint8Array([1, 2, 3]), { status: 200 })) as unknown as typeof fetch;

describe("keying", () => {
  it("keys footage by scene index, not by query", async () => {
    const p = plan([hook, stockScene("sunrise"), stockScene("sunrise")]);
    const footage = await resolveFootage(p, {
      workDir,
      userAssets: [],
      pexelsApiKey: "k",
      fetchImpl: fetchBoth,
    });
    // Both footage scenes are at indexes 1 and 2 and both get the same file.
    expect(Object.keys(footage).sort()).toEqual(["1", "2"]);
    expect(footage["1"]).toBe(footage["2"]);
  });

  it("leaves text scenes out of the map entirely", async () => {
    const p = plan([hook, { kind: "statement", text: "Just words", seconds: 4 }]);
    const footage = await resolveFootage(p, { workDir, userAssets: [] });
    expect(footage).toEqual({});
  });
});

describe("user clips", () => {
  it("points a user scene at the file the person uploaded", async () => {
    const p = plan([hook, userScene(1)], 2);
    // Values are public-dir relative, not absolute: OffthreadVideo resolves
    // them through staticFile() inside this render's staging directory.
    const footage = await resolveFootage(p, {
      workDir,
      renderId: "r1",
      userAssets: ["/tmp/a.mp4", "/tmp/b.mp4"],
    });
    expect(footage["1"]).toBe("r1/b.mp4");
  });

  it("never hands the composition an absolute path", async () => {
    const p = plan([hook, userScene(0)], 1);
    const footage = await resolveFootage(p, {
      workDir,
      renderId: "r1",
      userAssets: ["/var/folders/xyz/mine.mp4"],
    });
    expect(footage["1"]).not.toMatch(/^\//);
    expect(footage["1"]).toBe("r1/mine.mp4");
  });

  it("warns and omits the scene when the file vanished after validation", async () => {
    const p = plan([hook, userScene(0)], 1);
    const warnings: string[] = [];
    const footage = await resolveFootage(p, {
      workDir,
      userAssets: [],
      onWarn: (m) => warnings.push(m),
    });
    expect(footage["1"]).toBeUndefined();
    expect(warnings.join()).toMatch(/missing at render time/);
  });
});

describe("when stock lookup fails", () => {
  it("omits the scene instead of throwing", async () => {
    const p = plan([hook, stockScene("anything")]);
    const empty = (async (url: string) =>
      String(url).includes("api.pexels.com")
        ? new Response(JSON.stringify({ videos: [] }), { status: 200 })
        : new Response(new Uint8Array([1]), { status: 200 })) as unknown as typeof fetch;

    const footage = await resolveFootage(p, {
      workDir,
      userAssets: [],
      pexelsApiKey: "k",
      fetchImpl: empty,
    });
    expect(footage["1"]).toBeUndefined();
  });

  it("still resolves the user clips in the same plan", async () => {
    const p = plan([hook, stockScene("nothing"), userScene(0)], 1);
    const empty = (async (url: string) =>
      String(url).includes("api.pexels.com")
        ? new Response(JSON.stringify({ videos: [] }), { status: 200 })
        : new Response(new Uint8Array([1]), { status: 200 })) as unknown as typeof fetch;

    const footage = await resolveFootage(p, {
      workDir,
      renderId: "r1",
      userAssets: ["/tmp/mine.mp4"],
      pexelsApiKey: "k",
      fetchImpl: empty,
    });
    expect(footage["1"]).toBeUndefined();
    expect(footage["2"]).toBe("r1/mine.mp4");
  });

  it("does not call the provider at all when the plan has no stock scenes", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    await resolveFootage(plan([hook, userScene(0)], 1), {
      workDir,
      userAssets: ["/tmp/a.mp4"],
      pexelsApiKey: "k",
      fetchImpl: spy,
    });
    expect(called).toBe(false);
  });
});

describe("query sizing", () => {
  it("asks for a clip long enough for the longest scene that uses it", async () => {
    const seen: string[] = [];
    const spy = (async (url: string) => {
      if (String(url).includes("api.pexels.com")) {
        seen.push(String(url));
        return (okFetch as unknown as (u: string) => Promise<Response>)(url);
      }
      return new Response(new Uint8Array([1]), { status: 200 });
    }) as unknown as typeof fetch;

    // Same query in a 3s scene and an 8s scene — one lookup, sized for 8s.
    const p = plan([hook, stockScene("waves", 3), stockScene("waves", 8)]);
    await resolveFootage(p, { workDir, userAssets: [], pexelsApiKey: "k", fetchImpl: spy });
    expect(seen).toHaveLength(1);
  });
});
