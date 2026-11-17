import { describe, it, expect } from "vitest";
import { fitSize, imageSize, isAnimated, knockOutWhite, MAX_SIDE, prepareLogo, sanitizeSvg, sizeSvg, sniffImage, visibleBounds, visibleShare } from "./logo-prepare";
import { LOGO_TEXT, logoNotes, logoProblemText } from "@/content/dentvideo-logo";
import { LOCALES } from "@/content/dentvideo-locales";

type Px = [number, number, number, number];
function image(w: number, h: number, bg: Px, shapes: { x: number; y: number; w: number; h: number; c: Px }[] = []) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(bg, i * 4);
  for (const s of shapes) for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) data.set(s.c, (y * w + x) * 4);
  return data;
}
const alphaAt = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];
const bytes = (...v: (number | string)[]) => new Uint8Array(v.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe("sniffImage: what a file is, from its bytes, whatever its name", () => {
  it("knows the formats clinics upload", () => {
    expect(sniffImage(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe("png");
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffImage(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("webp");
    expect(sniffImage(bytes("GIF89a", 1, 0))).toBe("gif");
    expect(sniffImage(bytes(0, 0, 0, 0x18, "ftypheic", 0, 0, 0, 0))).toBe("heic");
    expect(sniffImage(bytes(0, 0, 0, 0x18, "ftypmif1", 0, 0, 0, 0))).toBe("heic");
    expect(sniffImage(bytes(0, 0, 0, 0x18, "ftypavif", 0, 0, 0, 0))).toBe("avif");
    expect(sniffImage(new TextEncoder().encode('﻿<?xml version="1.0"?>\n<!-- x -->\n<svg viewBox="0 0 1 1"/>'))).toBe("svg");
  });
  it("refuses a PDF or a text file renamed .png", () => {
    expect(sniffImage(bytes("%PDF-1.4\n"))).toBe("pdf");
    expect(sniffImage(new TextEncoder().encode("hello, this is not an image"))).toBe("unknown");
    expect(sniffImage(new TextEncoder().encode("<html><body>not svg</body></html>"))).toBe("unknown");
    expect(sniffImage(new Uint8Array())).toBe("unknown");
  });
  it("tells an animated GIF from a still one", () => {
    const frame = [0x21, 0xf9, 4, 0, 0, 0, 0, 0, 0x2c];
    expect(isAnimated(bytes("GIF89a", ...frame), "gif")).toBe(false);
    expect(isAnimated(bytes("GIF89a", ...frame, ...frame), "gif")).toBe(true);
    expect(isAnimated(bytes(0x89, "PNG", 0, 0, 0, 0, "acTL"), "png")).toBe(true);
  });
});

describe("sanitizeSvg (security): nothing in an SVG logo can run or reach out", () => {
  const evil = `<?xml version="1.0"?>
<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd"><!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;">]>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="400" height="200" onload="steal()" ONCLICK='x()'>
<script>window.__pwned=2;</script><svg:script>bad()</svg:script><script href="https://evil.example/a.js"/>
<image href="https://evil.example/track.png"/><image xlink:href="//evil.example/t2.png"/>
<image href="data:image/png;base64,iVBORw0KGgo="/>
<foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="p()"/></div></foreignObject>
<a href="javascript:alert(1)"><circle cx="100" cy="100" r="80" fill="url(#g)"/></a>
<use href="#g"/><use href="https://evil.example/sprite.svg#a"/>
<set attributeName="href" to="javascript:alert(2)"/><animate attributeName="href" values="javascript:alert(3)"/>
<style>@import url("https://evil.example/s.css"); circle{fill:url(https://evil.example/p#x)}</style>
<rect style="fill:url('http://evil.example/q')"/>
<iframe src="https://evil.example"></iframe><embed src="x"/>
<text>&xxe;&lol2;Evil &amp; co</text>
</svg>`;
  const clean = sanitizeSvg(evil)!;

  it("keeps a drawable svg", () => {
    expect(clean).toMatch(/<svg[\s>]/);
    expect(clean).toContain("<circle");
    expect(clean).toContain("Evil &amp; co");
  });
  it("removes scripts, handlers and embedded documents", () => {
    expect(clean).not.toMatch(/<(\w+:)?script/i);
    expect(clean).not.toMatch(/\son\w+\s*=/i);
    expect(clean).not.toMatch(/foreignObject|<iframe|<embed|<set\b|<animate/i);
    expect(clean).not.toMatch(/javascript:/i);
  });
  it("removes every external reference (no tracking pixel, no file read)", () => {
    expect(clean).not.toMatch(/evil\.example/);
    expect(clean).not.toMatch(/@import/);
    expect(clean).not.toMatch(/file:\/\/|passwd|ENTITY|DOCTYPE/);
    // Same-document references and inline raster data are kept.
    expect(clean).toContain('href="#g"');
    expect(clean).toContain("url(#g)");
    expect(clean).toContain("data:image/png;base64");
  });
  it("does not expand nested entities (no billion laughs)", () => {
    expect(clean).not.toContain("lollol");
  });
  it("inlines plain entities from an Illustrator export", () => {
    const ai = `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x" [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]><svg xmlns="&ns_svg;"><rect width="1" height="1"/></svg>`;
    expect(sanitizeSvg(ai)).toBe('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  });
  it("refuses markup with no svg left to draw", () => {
    expect(sanitizeSvg("<html><script>x()</script></html>")).toBeNull();
  });
  it("is quick on hostile input (no catastrophic backtracking)", () => {
    const t = performance.now();
    sanitizeSvg("<svg>" + "<script ".repeat(20000) + "on".repeat(20000) + "=".repeat(5000) + "url(".repeat(20000));
    expect(performance.now() - t).toBeLessThan(1500);
  });
  it("is sized to rasterise sharply, keeping its proportions", () => {
    expect(sizeSvg('<svg viewBox="0 0 400 200"><g/></svg>')).toMatchObject({ width: MAX_SIDE, height: MAX_SIDE / 2 });
    const s = sizeSvg('<svg width="40px" height="80"><g/></svg>');
    expect(s).toMatchObject({ width: 512, height: 1024 });
    expect(s.svg).toContain('viewBox="0 0 40 80"');
    expect(sizeSvg("<svg><g/></svg>")).toMatchObject({ width: 1024, height: 512 });
  });
});

describe("knockOutWhite: a JPEG logo on white paper", () => {
  const W: Px = [255, 255, 255, 255];
  const BLUE: Px = [11, 94, 168, 255];

  it("removes the white connected to the border and keeps the white inside the mark", () => {
    // A blue ring with a white centre, on white paper.
    const d = image(40, 40, W, [
      { x: 10, y: 10, w: 20, h: 20, c: BLUE },
      { x: 17, y: 17, w: 6, h: 6, c: W },
    ]);
    expect(knockOutWhite(d, 40, 40)).toBe(true);
    expect(alphaAt(d, 40, 0, 0)).toBe(0);
    expect(alphaAt(d, 40, 5, 30)).toBe(0);
    expect(alphaAt(d, 40, 12, 12)).toBe(255); // the mark
    expect(alphaAt(d, 40, 20, 20)).toBe(255); // the white inside it stays
    expect(visibleBounds(d, 40, 40)).toEqual({ x: 9, y: 9, w: 22, h: 22 });
  });

  it("treats off-white paper and JPEG noise as background", () => {
    const d = image(30, 30, [246, 244, 241, 255], [{ x: 10, y: 10, w: 10, h: 10, c: BLUE }]);
    d.set([236, 240, 233, 255], (2 * 30 + 3) * 4);
    expect(knockOutWhite(d, 30, 30)).toBe(true);
    expect(alphaAt(d, 30, 3, 2)).toBe(0);
    expect(alphaAt(d, 30, 0, 0)).toBe(0);
  });

  it("keeps an anti-aliased edge soft, un-blended from white", () => {
    const d = image(20, 20, W, [
      { x: 5, y: 5, w: 10, h: 10, c: [0, 0, 0, 255] },
      { x: 4, y: 5, w: 1, h: 10, c: [128, 128, 128, 255] },
    ]);
    knockOutWhite(d, 20, 20);
    const i = (5 * 20 + 4) * 4;
    expect(d[i + 3]).toBeGreaterThan(110);
    expect(d[i + 3]).toBeLessThan(145);
    expect(d[i]).toBeLessThan(10); // its colour is the black of the mark, half transparent
  });

  it("leaves a logo on a coloured block, a transparent logo and a white-on-white image alone", () => {
    const block = image(20, 20, [15, 92, 92, 255], [{ x: 5, y: 5, w: 10, h: 10, c: W }]);
    expect(knockOutWhite(block, 20, 20)).toBe(false);
    const clear = image(20, 20, [0, 0, 0, 0], [{ x: 5, y: 5, w: 10, h: 10, c: BLUE }]);
    expect(knockOutWhite(clear, 20, 20)).toBe(false);
    const blank = image(20, 20, W);
    const before = blank.slice();
    expect(knockOutWhite(blank, 20, 20)).toBe(false);
    expect(blank).toEqual(before);
  });

  it("does not flood through a mark that touches the border only partly", () => {
    // A frame logo: border mostly white (>90%), a dark bar along one edge.
    const d = image(50, 50, W, [{ x: 0, y: 20, w: 50, h: 3, c: BLUE }]);
    expect(knockOutWhite(d, 50, 50)).toBe(true);
    expect(alphaAt(d, 50, 25, 21)).toBe(255);
    expect(visibleShare(d)).toBeGreaterThan(0.05);
  });
});

describe("imageSize: the size in the header, so a huge export is decoded small", () => {
  it("reads PNG, GIF and JPEG headers", () => {
    const png = bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, "IHDR", 0, 0, 0x17, 0x70, 0, 0, 0x01, 0x2c);
    expect(imageSize(png, "png")).toEqual({ width: 6000, height: 300 });
    expect(imageSize(bytes("GIF89a", 0x2c, 0x01, 0x64, 0), "gif")).toEqual({ width: 300, height: 100 });
    // SOI, an APP0 segment of 16 bytes, then SOF0: precision 8, height 4000, width 6000.
    const app0 = [0xff, 0xe0, 0, 16, ...new Array(14).fill(0)];
    const jpeg = bytes(0xff, 0xd8, ...app0, 0xff, 0xc0, 0, 17, 8, 0x0f, 0xa0, 0x17, 0x70, 3);
    expect(imageSize(jpeg, "jpeg")).toEqual({ width: 6000, height: 4000 });
  });
  it("gives up quietly on a broken header", () => {
    expect(imageSize(bytes(0xff, 0xd8, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0, 0), "jpeg")).toBeNull();
    expect(imageSize(bytes(0x89, "PNG"), "png")).toBeNull();
  });
});

describe("sizes", () => {
  it("scales a 6000 px export down and never enlarges a 64 px favicon", () => {
    expect(fitSize(6000, 6000)).toEqual({ width: 1024, height: 1024 });
    expect(fitSize(3000, 260)).toEqual({ width: 1024, height: 89 });
    expect(fitSize(64, 64)).toEqual({ width: 64, height: 64 });
  });
});

describe("prepareLogo refuses before decoding anything", () => {
  it("a file over the input limit", async () => {
    const big = { size: 26 * 1024 * 1024, name: "x.png" } as Blob & { name: string };
    expect(await prepareLogo(big)).toEqual({ ok: false, problem: "too-big" });
  });
  it("an empty file, a PDF and a renamed text file", async () => {
    expect(await prepareLogo(new Blob([]))).toEqual({ ok: false, problem: "empty" });
    expect(await prepareLogo(new Blob(["%PDF-1.4 hello"]))).toMatchObject({ ok: false, problem: "not-an-image", type: "pdf" });
    expect(await prepareLogo(new Blob(["just some notes"]))).toMatchObject({ ok: false, problem: "not-an-image" });
  });
});

describe("logo messages in every language", () => {
  it("has every message, filled, in each locale", () => {
    for (const l of LOCALES) {
      const t = LOGO_TEXT[l];
      for (const [k, v] of Object.entries(t)) expect(v.trim(), `${l}.${k}`).not.toBe("");
      expect(logoProblemText(t, "too-big", 25)).toContain("25");
      expect(logoProblemText(t, "heic")).toMatch(/HEIC/);
      expect(logoNotes(t, { small: true, animated: true, sourceWidth: 64, sourceHeight: 48 }).join(" ")).toMatch(/64×48/);
      expect(logoNotes(t, { small: false, animated: false, sourceWidth: 900, sourceHeight: 900 })).toEqual([]);
    }
  });
  it("is not English in the other languages", () => {
    for (const l of LOCALES.filter((x) => x !== "en")) {
      expect(LOGO_TEXT[l].cleaned, l).not.toBe(LOGO_TEXT.en.cleaned);
      expect(LOGO_TEXT[l].retry, l).not.toBe(LOGO_TEXT.en.retry);
    }
  });
});
