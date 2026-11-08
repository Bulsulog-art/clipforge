import { describe, it, expect } from "vitest";
import { dentvideoPublicUrl, routeForHost } from "./host";

describe("routeForHost", () => {
  const dv = (p: string, q = "") => routeForHost("dentvideo.com", p, q);
  it("serves dentvideo.com from the /dentvideo section", () => {
    expect(dv("/")).toEqual({ kind: "rewrite", path: "/dentvideo" });
    expect(dv("/de")).toEqual({ kind: "rewrite", path: "/dentvideo/de" });
    expect(dv("/guides/x")).toEqual({ kind: "rewrite", path: "/dentvideo/guides/x" });
    expect(dv("/app")).toEqual({ kind: "rewrite", path: "/dentvideo/app" });
    expect(dv("/llms.txt")).toEqual({ kind: "rewrite", path: "/dentvideo/llms.txt" });
    expect(dv("/sitemap.xml")).toEqual({ kind: "rewrite", path: "/dentvideo/sitemap.xml" });
    expect(dv("/robots.txt")).toEqual({ kind: "rewrite", path: "/dentvideo/robots.txt" });
  });
  it("keeps one URL per page and passes app internals through", () => {
    expect(dv("/dentvideo/start", "?lang=tr")).toEqual({ kind: "redirect", url: "https://dentvideo.com/start?lang=tr", status: 308 });
    expect(dv("/dentvideo")).toEqual({ kind: "redirect", url: "https://dentvideo.com/", status: 308 });
    expect(dv("/dentvideo/samples/a.mp4")).toEqual({ kind: "next" });
    expect(dv("/api/dentvideo/week")).toEqual({ kind: "next" });
    expect(dv("/_next/static/x.js")).toEqual({ kind: "next" });
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
