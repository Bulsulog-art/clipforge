import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach } from "vitest";
import { backgroundFile, stageBackgrounds } from "./backgrounds.js";
import { THEME_LIST, brandTheme } from "./theme.js";
import { PHOTO_TINT_MAX, overlayCss, photoOverlay } from "./photo-overlay.js";

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "bg-test-"));
});

const jpeg = (body = "x") =>
  (async () => new Response(Buffer.from(body), { status: 200, headers: { "content-type": "image/jpeg" } })) as unknown as typeof fetch;

describe("backgroundFile", () => {
  it("uses the local copy when there is one (monorepo / dev)", async () => {
    await fs.writeFile(path.join(root, "implants-03.jpg"), "local");
    const p = await backgroundFile("/dentvideo/backgrounds/implants-03.jpg", {
      dirs: [root],
      fetchImpl: (() => { throw new Error("must not download"); }) as never,
    });
    expect(await fs.readFile(p, "utf8")).toBe("local");
  });

  it("downloads once from the site, then serves from the cache", async () => {
    let calls = 0;
    const fetchImpl = (async (url: string) => {
      calls++;
      expect(url).toBe("https://cdn.test/dentvideo/backgrounds/whitening-02.jpg");
      return new Response(Buffer.from("remote"), { status: 200, headers: { "content-type": "image/jpeg" } });
    }) as unknown as typeof fetch;
    const opts = { dirs: [], cacheDir: path.join(root, "cache"), baseUrl: "https://cdn.test/", fetchImpl };
    const a = await backgroundFile("/dentvideo/backgrounds/whitening-02.jpg", opts);
    const b = await backgroundFile("/dentvideo/backgrounds/whitening-02.jpg", opts);
    expect(a).toBe(b);
    expect(calls).toBe(1);
    expect(await fs.readFile(a, "utf8")).toBe("remote");
  });

  it("refuses anything that is not a library path", async () => {
    await expect(backgroundFile("https://evil.test/x.jpg", { dirs: [] })).rejects.toThrow(/not a library/);
  });

  it("rejects an HTML page served in place of the photo", async () => {
    const fetchImpl = (async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    await expect(
      backgroundFile("/dentvideo/backgrounds/aligners-02.jpg", { dirs: [], cacheDir: path.join(root, "c"), fetchImpl }),
    ).rejects.toThrow(/text\/html/);
  });
});

describe("stageBackgrounds", () => {
  it("stages in order and skips what it cannot get, with a warning", async () => {
    const assetDir = path.join(root, "stage");
    await fs.mkdir(assetDir);
    const warnings: string[] = [];
    const staged = await stageBackgrounds(
      ["/dentvideo/backgrounds/implants-03.jpg", "/elsewhere/x.jpg", "/dentvideo/backgrounds/implants-05.jpg"],
      { assetDir, renderId: "r1", dirs: [], cacheDir: path.join(root, "cache"), fetchImpl: jpeg(), onWarn: (m) => warnings.push(m) },
    );
    expect(staged).toEqual(["r1/implants-03.jpg", "r1/implants-05.jpg"]);
    expect(warnings).toHaveLength(1);
    expect(await fs.readdir(assetDir)).toEqual(["implants-03.jpg", "implants-05.jpg"]);
  });

  it("does nothing for a plan without backgrounds", async () => {
    expect(await stageBackgrounds(undefined, { assetDir: root, renderId: "r" })).toEqual([]);
  });
});

describe("what is laid over a library photo", () => {
  // The photo layer (background-layer.tsx) draws exactly overlayCss(photoOverlay(theme)) over every photo.
  const themes = THEME_LIST.flatMap((base) => [undefined, "#1A7F8C", "#1E3A8A", "#D97706", "#E91E63", "#A7D8F0"].map((b) => brandTheme(base, b)));

  it(`is a light wash, at most ${PHOTO_TINT_MAX}, for every theme and clinic colour`, () => {
    for (const t of themes) {
      const css = overlayCss(photoOverlay(t));
      // One flat colour: no band of the photo gets a heavier tint than the rest.
      const alphas = [...css.matchAll(/rgba\(\d+,\d+,\d+,([\d.]+)\)/g)].map((m) => Number(m[1]));
      expect(alphas).toHaveLength(1);
      expect(alphas[0]).toBeLessThanOrEqual(PHOTO_TINT_MAX);
    }
  });

  it("leaves the readability to the plate behind the text, which is stronger than the wash", () => {
    for (const t of themes) {
      const o = photoOverlay(t);
      expect(o.scrim).toBeGreaterThan(0);
      expect(1 - (1 - o.alpha) * (1 - o.scrim)).toBeGreaterThan(o.alpha);
    }
  });
});
