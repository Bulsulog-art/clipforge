import { describe, expect, it } from "vitest";
import { isClipforgePage } from "./AttributionCapture";

describe("isClipforgePage", () => {
  it("stays off dentvideo.com (its own attribution and login)", () => {
    expect(isClipforgePage("dentvideo.com", "/")).toBe(false);
    expect(isClipforgePage("dentvideo.com", "/start")).toBe(false);
    expect(isClipforgePage("www.dentvideo.com", "/tr")).toBe(false);
  });

  it("stays off the /dentvideo section on the app host", () => {
    expect(isClipforgePage("clipforge.bulsulabs.com", "/dentvideo")).toBe(false);
    expect(isClipforgePage("clipforge.bulsulabs.com", "/dentvideo/start")).toBe(false);
  });

  it("runs on ClipForge's own pages", () => {
    expect(isClipforgePage("clipforge.bulsulabs.com", "/")).toBe(true);
    expect(isClipforgePage("clipforge.bulsulabs.com", "/dashboard")).toBe(true);
    expect(isClipforgePage("localhost", "/dentvideos-are-not-a-thing")).toBe(true);
  });
});
