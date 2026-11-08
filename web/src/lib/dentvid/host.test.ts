import { describe, it, expect } from "vitest";
import { dentvideoHref, dentvideoPublicUrl, routeForHost } from "./host";

describe("routeForHost", () => {
  const dv = (p: string, q = "") => routeForHost("dentvideo.com", p, q);
  it("serves dentvideo.com from the /dentvideo section", () => {
    expect(dv("/")).toEqual({ kind: "rewrite", path: "/dentvideo" });
    expect(dv("/de")).toEqual({ kind: "rewrite", path: "/dentvideo/de" });
    expect(dv("/guides/x")).toEqual({ kind: "rewrite", path: "/dentvideo/guides/x" });
    expect(dv("/app")).toEqual({ kind: "rewrite", path: "/dentvideo/app" });
    expect(dv("/llms.txt")).toEqual({ kind: "rewrite", path: "/dentvideo/llms.txt" });
    expect(dv("/sitemap.xml")).toEqual({ kind: "rewrite", path: "/dentvideo/sitemap.xml" });
    expect(dv("/robots.txt")).toEqual({ kind: "rewrite", path: "/dentvideo/robots.txt" });  });
  it("keeps one URL per page and passes app internals through", () => {
    expect(dv("/dentvideo/start", "?lang=tr")).toEqual({ kind: "redirect", url: "https://dentvideo.com/start?lang=tr", status: 308 });
    expect(dv("/dentvideo")).toEqual({ kind: "redirect", url: "https://dentvideo.com/", status: 308 });
    expect(dv("/dentvideo/samples/a.mp4")).toEqual({ kind: "next" });
    // The live preview's library: plans, narration and its font.
    expect(dv("/dentvideo/preview/tr/whitening-x.json")).toEqual({ kind: "next" });
    expect(dv("/dentvideo/preview/tr/whitening-x.mp3")).toEqual({ kind: "next" });
    expect(dv("/dentvideo/preview/fonts/inter-latin-wght-normal.woff2")).toEqual({ kind: "next" });
    expect(routeForHost("clipforge.bulsulabs.com", "/dentvideo/preview/de/a.json", "", "https://dentvideo.com")).toEqual({ kind: "next" });
    expect(dv("/api/dentvideo/week")).toEqual({ kind: "next" });
    expect(dv("/_next/static/x.js")).toEqual({ kind: "next" });
    // Share images are served in place: og:image URLs must not redirect.
    expect(dv("/dentvideo/opengraph-image", "?390f74971b3fdf2e")).toEqual({ kind: "next" });
    expect(dv("/dentvideo/tr/opengraph-image")).toEqual({ kind: "next" });
    expect(dv("/dentvideo/guides/x/opengraph-image")).toEqual({ kind: "next" });
    expect(routeForHost("www.dentvideo.com", "/de", "")).toEqual({ kind: "redirect", url: "https://dentvideo.com/de", status: 308 });
  });
  it("leaves the main site alone until dentvideo.com is made canonical", () => {
    expect(routeForHost("clipforge.bulsulabs.com", "/dentvideo/de", "")).toEqual({ kind: "next" });
    expect(routeForHost("clipforge.bulsulabs.com", "/dentvideo/de", "", "https://dentvideo.com")).toEqual({ kind: "redirect", url: "https://dentvideo.com/de", status: 301 });
    expect(routeForHost("clipforge.bulsulabs.com", "/pricing", "", "https://dentvideo.com")).toEqual({ kind: "next" });
  });
});

describe("dentvideoPublicUrl", () => {
  it("uses the app URL until a canonical domain is set", () => {
    expect(dentvideoPublicUrl("/dentvideo/de", undefined, "https://clipforge.bulsulabs.com")).toBe("https://clipforge.bulsulabs.com/dentvideo/de");
    expect(dentvideoPublicUrl("/dentvideo/de", "https://dentvideo.com", "x")).toBe("https://dentvideo.com/de");
    expect(dentvideoPublicUrl("/dentvideo", "https://dentvideo.com", "x")).toBe("https://dentvideo.com/");
  });
});

describe("dentvideoHref", () => {
  it("keeps in-app paths until a canonical domain is set", () => {
    expect(dentvideoHref("/dentvideo/de", undefined)).toBe("/dentvideo/de");
    expect(dentvideoHref("/dentvideo", undefined)).toBe("/dentvideo");
  });
  it("links straight to the clean dentvideo.com path once it is", () => {
    const c = "https://dentvideo.com";
    expect(dentvideoHref("/dentvideo", c)).toBe("/");
    expect(dentvideoHref("/dentvideo/de", c)).toBe("/de");
    expect(dentvideoHref("/dentvideo#how", c)).toBe("/#how");
    expect(dentvideoHref("/dentvideo/de#pricing", c)).toBe("/de#pricing");
    expect(dentvideoHref("/dentvideo/start?lang=tr", c)).toBe("/start?lang=tr");
    expect(dentvideoHref("/dentvideo?x=1", c)).toBe("/?x=1");
    expect(dentvideoHref("/dentvideo/guides/patient-education-videos", c)).toBe("/guides/patient-education-videos");
  });
  it("leaves other links alone", () => {
    const c = "https://dentvideo.com";
    expect(dentvideoHref("/dentvideos", c)).toBe("/dentvideos");
    expect(dentvideoHref("https://example.com/dentvideo", c)).toBe("https://example.com/dentvideo");
    expect(dentvideoHref("#how", c)).toBe("#how");
  });
});
