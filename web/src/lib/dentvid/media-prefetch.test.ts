import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { _resetMediaPrefetch, prefetchMedia } from "./media-prefetch";

type El = { preload: string; muted: boolean; src: string };
const made: El[] = [];
const make = () => {
  const el = { preload: "", muted: false, src: "" };
  made.push(el);
  return el;
};

beforeEach(() => {
  _resetMediaPrefetch();
  made.length = 0;
});

describe("prefetchMedia", () => {
  it("warms through a muted, preloading media element (Accept-Encoding: identity), once per file", () => {
    expect(prefetchMedia("/dentvideo/preview/en/a.mp3", make)).toBe(true);
    expect(made).toEqual([{ preload: "auto", muted: true, src: "/dentvideo/preview/en/a.mp3" }]);
    expect(prefetchMedia("/dentvideo/preview/en/a.mp3", make)).toBe(false);
    expect(made).toHaveLength(1);
  });

  it("does nothing where there is no Audio (server render)", () => {
    expect(prefetchMedia("/dentvideo/preview/en/a.mp3")).toBe(false);
  });

  it("holds only the last few, so a long session does not pin every file", () => {
    for (const id of ["a", "b", "c", "d", "e"]) prefetchMedia(`/x/${id}.mp3`, make);
    // The oldest were let go: asking again warms them anew.
    expect(prefetchMedia("/x/a.mp3", make)).toBe(true);
    expect(prefetchMedia("/x/e.mp3", make)).toBe(false);
  });
});

describe("the live preview never fetch()es its narration", () => {
  it("prefetches the next mp3 through prefetchMedia", () => {
    const src = readFileSync(path.join(__dirname, "../../components/dentvid/live-preview-player.tsx"), "utf8");
    expect(src).not.toMatch(/fetch\([^)]*\.mp3/);
    expect(src).toMatch(/prefetchMedia\(`\$\{BASE\}\/\$\{lang\}\/\$\{id\}\.mp3`\)/);
  });
});
