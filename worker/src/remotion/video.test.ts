import { describe, expect, it } from "vitest";
import { asStatic } from "./Video.js";

describe("asStatic", () => {
  it("resolves a staged file against the public folder", () => {
    expect(asStatic("abc/voiceover.mp3")).toBe("/abc/voiceover.mp3");
  });
  it("passes URLs through, including the browser preview's blob: and data: logos", () => {
    for (const src of ["https://x.test/logo.png", "http://x.test/a.mp3", "blob:https://dentvideo.com/123", "data:image/png;base64,AAAA"])
      expect(asStatic(src)).toBe(src);
  });
});
