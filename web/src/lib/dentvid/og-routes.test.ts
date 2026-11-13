import * as React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Vitest compiles JSX to React.createElement (classic runtime), as in demo-page.test.tsx.
(globalThis as { React?: typeof React }).React = React;

/**
 * Every kind of share card renders a 1200×630 PNG. Fonts for Japanese and
 * Arabic come from Google Fonts at build time; here the network is cut, so
 * those cards take their wordless fallback and the test stays offline.
 */
beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(async () => {
    throw new Error("offline in tests");
  }));
});
afterAll(() => vi.unstubAllGlobals());

async function png(res: Response) {
  expect(res.headers.get("content-type")).toBe("image/png");
  const buf = Buffer.from(await res.arrayBuffer());
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  // IHDR: width and height right after the signature and chunk header.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const ROUTES: [string, () => Promise<Response>][] = [
  ["landing en", async () => (await import("@/app/dentvideo/opengraph-image")).default()],
  ["landing tr", async () => (await import("@/app/dentvideo/[locale]/opengraph-image")).default({ params: { locale: "tr" } })],
  ["landing ar", async () => (await import("@/app/dentvideo/ar/opengraph-image")).default()],
  ["guide", async () => (await import("@/app/dentvideo/guides/[slug]/opengraph-image")).default({ params: { slug: "patient-education-videos" } })],
  ["guides hub de", async () => (await import("@/app/dentvideo/[locale]/guides/opengraph-image")).default({ params: { locale: "de" } })],
  ["about en", async () => (await import("@/app/dentvideo/about/opengraph-image")).default()],
  ["about ja", async () => (await import("@/app/dentvideo/ja/about/opengraph-image")).default()],
  ["legal pl", async () => (await import("@/app/dentvideo/[locale]/[doc]/opengraph-image")).default({ params: { locale: "pl", doc: "privacy" } })],
  ["legal ar", async () => (await import("@/app/dentvideo/ar/[doc]/opengraph-image")).default({ params: { doc: "terms" } })],
  ["imprint en", async () => (await import("@/app/dentvideo/imprint/opengraph-image")).default()],
  ["videos", async () => (await import("@/app/dentvideo/videos/[slug]/opengraph-image")).default({ params: { slug: "zahnarztpraxis-videos-ki" } })],
];

describe("share card routes", () => {
  for (const [name, render] of ROUTES) {
    it(`${name} returns a 1200×630 PNG`, async () => {
      expect(await png(await render())).toEqual({ width: 1200, height: 630 });
    }, 30_000);
  }
});
