/**
 * A clinic's logo, made ready the moment it is chosen — in the browser, at no
 * cost, before the live preview draws it and before it is uploaded.
 *
 * Clinics upload whatever they have: a 6000 px export, a JPEG with a white
 * box around the mark, an SVG from their designer, an iPhone HEIC, an
 * animated GIF, a CMYK print file, a 64 px favicon. The videos only ever
 * need a clean, reasonably sized PNG. So every logo is decoded once,
 * scaled to at most {@link MAX_SIDE} px, a plain white background is
 * knocked out (only the white connected to the border: the white inside an
 * emblem stays), transparent margins are trimmed, and the result is saved as
 * PNG. That file is what the preview shows AND what is uploaded, so the
 * worker renders exactly what the clinic saw (worker/src/dental/logo.ts reads
 * the same file).
 *
 * SVG is never stored or put in a video: it is rasterised here, through an
 * <img> (where browsers run no script and fetch nothing), after a
 * belt-and-braces clean-up of the markup ({@link sanitizeSvg}).
 *
 * The pixel steps are pure functions over RGBA arrays, tested in
 * logo-prepare.test.ts; only {@link prepareLogo} needs a browser.
 */

import { logoColors } from "./logo-colors";

/** Longest side of the prepared logo. The sign-off draws it at most 600 px wide at 1080, so 1024 stays sharp on retina. */
export const MAX_SIDE = 1024;
/** Files larger than this are not even read (a phone would struggle; no logo is this big). */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** Below this longest side a logo will look soft in the videos: the clinic is told, not stopped. */
export const SMALL_SIDE = 200;
/** What the server accepts (storage-quota LOGO_MAX_BYTES). */
const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export type SniffedType = "png" | "jpeg" | "webp" | "gif" | "svg" | "heic" | "avif" | "bmp" | "pdf" | "unknown";

/** What the file really is, from its first bytes — never from its name. */
export function sniffImage(b: Uint8Array): SniffedType {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  const ascii = (i: number, s: string) => [...s].every((ch, k) => b[i + k] === ch.charCodeAt(0));
  if (b.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (b.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "jpeg";
  if (b.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  if (b.length >= 6 && (ascii(0, "GIF87a") || ascii(0, "GIF89a"))) return "gif";
  if (b.length >= 2 && ascii(0, "BM")) return "bmp";
  if (b.length >= 5 && ascii(0, "%PDF-")) return "pdf";
  if (b.length >= 12 && ascii(4, "ftyp")) {
    const brand = String.fromCharCode(...b.subarray(8, 12));
    if (/^(avif|avis)$/.test(brand)) return "avif";
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return "heic";
  }
  // Text: an SVG, possibly after a BOM, an XML declaration, comments or a doctype.
  const head = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 4096))).replace(/^﻿/, "").trimStart();
  if (/^</.test(head) && /<svg[\s>]/i.test(head)) return "svg";
  return "unknown";
}

/** An animated GIF, APNG or animated WebP: only its first frame is used. */
export function isAnimated(b: Uint8Array, type: SniffedType): boolean {
  if (type === "gif") {
    // Count image descriptors (0x2C) that follow a graphic control extension (0x21 0xF9).
    let frames = 0;
    for (let i = 0; i + 1 < b.length && frames < 2; i++) if (b[i] === 0x21 && b[i + 1] === 0xf9) frames++;
    return frames > 1;
  }
  const find = (s: string) => {
    const codes = [...s].map((c) => c.charCodeAt(0));
    const end = Math.min(b.length, 1 << 16);
    for (let i = 0; i + codes.length <= end; i++) if (codes.every((c, k) => b[i + k] === c)) return true;
    return false;
  };
  if (type === "png") return find("acTL");
  if (type === "webp") return find("ANIM");
  return false;
}

/**
 * The pixel size written in a PNG, GIF, JPEG or WebP header (null when it is
 * not there): a huge file can then be decoded straight to a smaller size.
 */
export function imageSize(b: Uint8Array, type: SniffedType): { width: number; height: number } | null {
  const u16be = (i: number) => (b[i] << 8) | b[i + 1];
  const u16le = (i: number) => b[i] | (b[i + 1] << 8);
  const u32be = (i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  const ok = (width: number, height: number) => (width > 0 && height > 0 ? { width, height } : null);
  if (type === "png" && b.length >= 24) return ok(u32be(16), u32be(20));
  if (type === "gif" && b.length >= 10) return ok(u16le(6), u16le(8));
  if (type === "webp" && b.length >= 30) {
    const chunk = String.fromCharCode(...b.subarray(12, 16));
    if (chunk === "VP8 ") return ok(u16le(26) & 0x3fff, u16le(28) & 0x3fff);
    if (chunk === "VP8L") return ok(1 + (u16le(21) & 0x3fff), 1 + (((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10)) & 0x3fff));
    if (chunk === "VP8X") return ok(1 + (b[24] | (b[25] << 8) | (b[26] << 16)), 1 + (b[27] | (b[28] << 8) | (b[29] << 16)));
    return null;
  }
  if (type === "jpeg") {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) {
        i++;
        continue;
      }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return ok(u16be(i + 7), u16be(i + 5));
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) {
        i += 2;
        continue;
      }
      i += 2 + u16be(i + 2);
    }
  }
  return null;
}

// MARK: - SVG

/** No logo's markup is this long; past it the SVG is refused rather than cleaned. */
const MAX_SVG_CHARS = 5_000_000;

/**
 * Removes every <tag>…</tag> and <tag/> (any namespace prefix), in one pass
 * over the text: an opening tag whose closing tag never comes takes the rest
 * of the document with it. (A lazy regex here was quadratic on hostile input:
 * 20 000 unclosed "<script " took ten seconds.)
 */
function dropElements(s: string, tag: string): string {
  const open = new RegExp(`<(?:[\\w-]+:)?${tag}(?=[\\s/>])`, "gi");
  const close = new RegExp(`</(?:[\\w-]+:)?${tag}\\s*>`, "gi");
  let out = "";
  let from = 0;
  for (;;) {
    open.lastIndex = from;
    const m = open.exec(s);
    if (!m) return out + s.slice(from);
    out += s.slice(from, m.index);
    const gt = s.indexOf(">", m.index);
    if (gt < 0) return out;
    if (s[gt - 1] === "/") {
      from = gt + 1;
      continue;
    }
    close.lastIndex = gt + 1;
    const c = close.exec(s);
    if (!c) return out;
    from = c.index + c[0].length;
  }
}

const XML_ENTITIES = new Set(["amp", "lt", "gt", "quot", "apos"]);
const DANGEROUS_ELEMENTS = ["script", "foreignObject", "iframe", "object", "embed", "audio", "video", "canvas", "handler", "listener", "animate", "animateMotion", "animateTransform", "set"];

/**
 * Cleans an SVG's markup before it is rasterised. Defence in depth: the SVG
 * is only ever drawn through an <img> (browsers run no script and load no
 * external resource there) and immediately turned into PNG pixels, so even a
 * markup trick that slipped past this would have nothing to run in.
 *
 * - the doctype goes; its internal entities are inlined only when they are
 *   plain text (no nesting: no "billion laughs"), external ones become empty
 * - script, foreignObject, embedded documents, animation (which can rewrite
 *   attributes) and <use> (which can point at other files) are removed
 * - on* handlers, javascript: and any non-local href, external url(...) and
 *   @import are removed
 *
 * Returns null when there is no <svg> element left to draw.
 */
export function sanitizeSvg(input: string): string | null {
  let s = input.replace(/^﻿/, "");
  // Entities from the internal subset (Illustrator declares its namespaces this way).
  const entities = new Map<string, string>();
  const doctype = s.match(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/i);
  if (doctype) {
    for (const m of (doctype[1] ?? "").matchAll(/<!ENTITY\s+([\w.-]+)\s+(SYSTEM|PUBLIC)?\s*("[^"]*"|'[^']*')/g)) {
      const value = m[3].slice(1, -1);
      entities.set(m[1], m[2] || /[&<%]/.test(value) ? "" : value);
    }
    s = s.replace(doctype[0], "");
  }
  s = s.replace(/<!ENTITY[\s\S]*?>/gi, "").replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, "");
  s = s.replace(/&([A-Za-z_][\w.-]*);/g, (all, name: string) => (XML_ENTITIES.has(name) ? all : entities.get(name) ?? ""));
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (m) => (/<\/?script|javascript:|@import|url\(/i.test(m) ? "" : m));
  for (const tag of DANGEROUS_ELEMENTS) s = dropElements(s, tag);
  // Event handlers, in any quoting.
  s = s.replace(/\s(?:[\w-]+:)?on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Links: only same-document references (#id) and inline raster data stay.
  s = s.replace(/\s((?:xlink:)?href|src)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi, (all, _attr: string, _q: string, d?: string, single?: string) => {
    const v = (d ?? single ?? _q).trim();
    return /^#[\w.-]*$/.test(v) || /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]*$/i.test(v) ? all : "";
  });
  s = s.replace(/@import[^;]*;?/gi, "");
  s = s.replace(/url\(([^)]{0,2048})\)/gi, (all, v: string) => (/^\s*(['"]?)#[\w.-]+\1\s*$/.test(v) ? all : "none"));
  s = s.replace(/javascript:/gi, "");
  return /<svg[\s>]/i.test(s) ? s : null;
}

/**
 * The size an SVG is rasterised at: its own width/height (or viewBox)
 * scaled so the longest side is `side` — an SVG is sharp at any size.
 * Writes that size onto the root element, so the browser draws it there.
 */
export function sizeSvg(svg: string, side = MAX_SIDE): { svg: string; width: number; height: number } {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const num = (name: string) => {
    const m = root.match(new RegExp(`\\s${name}\\s*=\\s*["']?\\s*([\\d.]+)(px)?\\s*["']?`, "i"));
    return m ? parseFloat(m[1]) : NaN;
  };
  const vb = root.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  let w = num("width");
  let h = num("height");
  if (!(w > 0 && h > 0) && vb) [w, h] = [parseFloat(vb[1]), parseFloat(vb[2])];
  if (!(w > 0 && h > 0)) [w, h] = [300, 150];
  const k = side / Math.max(w, h);
  const width = Math.max(1, Math.round(w * k));
  const height = Math.max(1, Math.round(h * k));
  let next = root.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  if (!vb && Number.isFinite(num("width")) && Number.isFinite(num("height"))) next = next.replace(/<svg\b/i, `<svg viewBox="0 0 ${num("width")} ${num("height")}"`);
  next = next.replace(/<svg\b/i, `<svg width="${width}" height="${height}"`);
  return { svg: root ? svg.replace(root, next) : svg, width, height };
}

// MARK: - Pixels

type Rgba = Uint8ClampedArray | Uint8Array;

/** Near-white: every channel at least this, which also catches off-white paper and light JPEG noise. */
const PAPER = 228;

/**
 * Removes a plain white (or off-white) background: the pixels of paper
 * colour connected to the image's border, plus the soft edge around the
 * mark (so its anti-aliasing is kept, unblended from white). White inside
 * the mark — the tooth in a blue circle — is not connected to the border and
 * stays. Only for opaque images whose border is almost all paper; a logo on
 * a coloured block keeps its block (it is part of the brand).
 *
 * Changes `data` in place. Returns whether it did anything; it refuses (and
 * changes nothing) when the result would leave almost nothing visible.
 */
export function knockOutWhite(data: Rgba, width: number, height: number): boolean {
  const n = width * height;
  if (n < 4) return false;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return false; // has its own transparency
  const isPaper = (p: number) => data[p * 4] >= PAPER && data[p * 4 + 1] >= PAPER && data[p * 4 + 2] >= PAPER;
  // The border must be paper almost all the way round.
  let border = 0;
  let paper = 0;
  const visit = (x: number, y: number) => {
    border++;
    if (isPaper(y * width + x)) paper++;
  };
  for (let x = 0; x < width; x++) {
    visit(x, 0);
    if (height > 1) visit(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    visit(0, y);
    if (width > 1) visit(width - 1, y);
  }
  if (paper < border * 0.9) return false;

  // Flood the paper from the border (4-connected, iterative).
  const bg = new Uint8Array(n);
  const stack: number[] = [];
  const seed = (p: number) => {
    if (!bg[p] && isPaper(p)) {
      bg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  let filled = 0;
  while (stack.length) {
    const p = stack.pop()!;
    filled++;
    const x = p % width;
    if (x > 0) seed(p - 1);
    if (x < width - 1) seed(p + 1);
    if (p >= width) seed(p - width);
    if (p < n - width) seed(p + width);
  }
  // Nearly everything is paper: a white logo on white, or a blank image. Leave it alone.
  if (filled > n * 0.985) return false;

  // The soft edge: up to 2 px into the mark from the background.
  const edge = new Uint8Array(n);
  let ring = bg.slice();
  for (let step = 0; step < 2; step++) {
    const next = ring.slice();
    for (let p = 0; p < n; p++) {
      if (!ring[p]) continue;
      const x = p % width;
      const around = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width];
      for (const q of around) if (q >= 0 && q < n && !ring[q]) {
        next[q] = 1;
        edge[q] = 1;
      }
    }
    ring = next;
  }

  // The paper goes. The soft edge is un-blended from white, relative to the
  // mark it borders: a half-grey pixel next to black is half-transparent
  // black, but a solid blue pixel next to blue stays solid blue.
  const dark = (p: number) => Math.max(255 - data[p * 4], 255 - data[p * 4 + 1], 255 - data[p * 4 + 2]) / 255;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (bg[p]) {
      data[i + 3] = 0;
      continue;
    }
    if (!edge[p]) continue;
    const x = p % width;
    const y = (p - x) / width;
    // Thin strokes have no interior within reach: then the darkest of the edge itself.
    let ref = 0;
    let near = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
        const q = yy * width + xx;
        if (bg[q]) continue;
        if (!edge[q]) ref = Math.max(ref, dark(q));
        else near = Math.max(near, dark(q));
      }
    const a = Math.min(1, dark(p) / (ref || near || 1));
    if (a >= 0.999) continue;
    if (a < 0.06) {
      data[i + 3] = 0;
      continue;
    }
    const un = (c: number) => Math.round(Math.max(0, Math.min(255, (c - 255 * (1 - a)) / a)));
    data[i] = un(data[i]);
    data[i + 1] = un(data[i + 1]);
    data[i + 2] = un(data[i + 2]);
    data[i + 3] = Math.round(a * 255);
  }
  return true;
}

/**
 * The visible part of an image with transparency, plus a little breathing
 * room, in pixels. Null when nothing is visible; the whole image when there
 * is nothing worth trimming.
 */
export function visibleBounds(data: Rgba, width: number, height: number, alphaMin = 16): { x: number; y: number; w: number; h: number } | null {
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] >= alphaMin) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
  const x = Math.max(0, x0 - pad);
  const y = Math.max(0, y0 - pad);
  return { x, y, w: Math.min(width, x1 + 1 + pad) - x, h: Math.min(height, y1 + 1 + pad) - y };
}

/** Fraction of pixels that are visible (alpha at least `alphaMin`). */
export function visibleShare(data: Rgba, alphaMin = 16): number {
  let v = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] >= alphaMin) v++;
  return v / Math.max(1, data.length / 4);
}

/** The size a source is drawn at: longest side at most `side`, never enlarged. */
export function fitSize(width: number, height: number, side = MAX_SIDE): { width: number; height: number } {
  const k = Math.min(1, side / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

// MARK: - In the browser

export type LogoProblem = "too-big" | "heic" | "not-an-image" | "unreadable" | "empty";

export type PreparedLogo = {
  ok: true;
  /** The PNG to preview and upload. */
  file: File;
  /** The same logo with its original background kept, when the background was removed (the clinic can choose it). Encoded on request. */
  original?: () => Promise<File | null>;
  width: number;
  height: number;
  /** The source's own size, before scaling. */
  sourceWidth: number;
  sourceHeight: number;
  /** A white background was removed. */
  cleaned: boolean;
  /** Small source: it will look soft. */
  small: boolean;
  /** An animation: its first frame is used. */
  animated: boolean;
  type: SniffedType;
};

export type LogoRefusal = { ok: false; problem: LogoProblem; type?: SniffedType };

type Source = { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; width: number; height: number; close: () => void };

async function svgSource(file: Blob): Promise<Source | null> {
  const clean = sanitizeSvg(await file.text());
  if (!clean) return null;
  const sized = sizeSvg(clean);
  const url = URL.createObjectURL(new Blob([sized.svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), width: sized.width, height: sized.height, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

async function rasterSource(file: Blob, known: { width: number; height: number } | null): Promise<Source | null> {
  try {
    // First frame of an animation; CMYK and EXIF orientation are handled by the decoder.
    // A huge export is decoded straight to about the size we keep (a JPEG at a fraction of the
    // work): only the width is given, so the decoder keeps the proportions whatever the orientation.
    const big = known && Math.max(known.width, known.height) > MAX_SIDE * 1.5;
    const opts = { imageOrientation: "from-image", ...(big ? { resizeWidth: Math.round((known.width * MAX_SIDE * 1.5) / Math.max(known.width, known.height)), resizeQuality: "high" } : {}) };
    const bitmap = await createImageBitmap(file, opts as ImageBitmapOptions);
    if (!bitmap.width || !bitmap.height) return null;
    return { draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h), width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    // Older browsers without createImageBitmap(Blob) support for this type: through an <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (!img.naturalWidth || !img.naturalHeight) return null;
      return { draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      return null;
    }
  }
}

function canvas(w: number, h: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  return ctx ? { c, ctx } : null;
}

const toPng = (c: HTMLCanvasElement) => new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));

async function encode(data: ImageData, name: string): Promise<{ file: File; width: number; height: number } | null> {
  // Usually well under the upload limit; a photographic logo at 1024 may not be.
  for (const side of [MAX_SIDE, 768, 512]) {
    const box = fitSize(data.width, data.height, side);
    const full = canvas(data.width, data.height);
    if (!full) return null;
    full.ctx.putImageData(data, 0, 0);
    let out = full.c;
    if (box.width !== data.width) {
      const small = canvas(box.width, box.height);
      if (!small) return null;
      small.ctx.imageSmoothingQuality = "high";
      small.ctx.drawImage(full.c, 0, 0, box.width, box.height);
      out = small.c;
    }
    const blob = await toPng(out);
    if (!blob) return null;
    if (blob.size <= UPLOAD_MAX_BYTES) return { file: new File([blob], name, { type: "image/png" }), width: box.width, height: box.height };
  }
  return null;
}

/** The chip the videos would draw this logo on: the same reading the preview and the worker do, at 160 px. */
function chipFor(img: ImageData): string {
  const box = fitSize(img.width, img.height, 160);
  const full = canvas(img.width, img.height);
  const small = canvas(box.width, box.height);
  if (!full || !small) return "light";
  full.ctx.putImageData(img, 0, 0);
  small.ctx.drawImage(full.c, 0, 0, box.width, box.height);
  return logoColors(small.ctx.getImageData(0, 0, box.width, box.height).data, box.width, box.height).treatment;
}

const FILE_TYPES: Partial<Record<SniffedType, [string, string]>> = { png: ["image/png", "png"], jpeg: ["image/jpeg", "jpg"], webp: ["image/webp", "webp"] };

/** Crops ImageData to its visible part (when it has transparency worth trimming). */
function trim(img: ImageData): ImageData {
  const b = visibleBounds(img.data, img.width, img.height);
  if (!b || (b.w === img.width && b.h === img.height)) return img;
  const c = canvas(b.w, b.h);
  if (!c) return img;
  c.ctx.putImageData(img, -b.x, -b.y);
  return c.ctx.getImageData(0, 0, b.w, b.h);
}

/**
 * Decodes, scales, cleans and re-encodes a chosen logo (see the module
 * comment). Resolves a refusal with the reason, never throws.
 */
export async function prepareLogo(file: Blob & { name?: string }): Promise<PreparedLogo | LogoRefusal> {
  if (file.size > MAX_INPUT_BYTES) return { ok: false, problem: "too-big" };
  if (file.size === 0) return { ok: false, problem: "empty" };
  let type: SniffedType = "unknown";
  let head = new Uint8Array();
  try {
    head = new Uint8Array(await file.slice(0, 1 << 16).arrayBuffer());
    type = sniffImage(head);
  } catch {
    return { ok: false, problem: "unreadable" };
  }
  if (type === "pdf") return { ok: false, problem: "not-an-image", type };
  if (type === "unknown") return { ok: false, problem: "not-an-image", type };
  const known = imageSize(head, type);
  const source = type === "svg" ? await svgSource(file) : await rasterSource(file, known);
  if (!source) return { ok: false, problem: type === "heic" ? "heic" : "unreadable", type };
  try {
    const size = fitSize(source.width, source.height);
    const c = canvas(size.width, size.height);
    if (!c) return { ok: false, problem: "unreadable", type };
    c.ctx.imageSmoothingQuality = "high";
    source.draw(c.ctx, size.width, size.height);
    let img: ImageData;
    try {
      img = c.ctx.getImageData(0, 0, size.width, size.height);
    } catch {
      return { ok: false, problem: "unreadable", type }; // a tainted canvas
    }
    const base = (file.name ?? "logo").replace(/\.[^.]+$/, "").slice(0, 60) || "logo";
    const originalPixels = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
    let cleaned = knockOutWhite(img.data, img.width, img.height);
    // A mark drawn for white paper must still sit on the videos' light chip once its paper is
    // gone. If the videos would read it as a pale mark (a large white area inside the emblem),
    // they would put it on a dark chip and the coloured lettering would sink: keep the white box.
    if (cleaned && chipFor(trim(img)) !== "light") {
      img = new ImageData(new Uint8ClampedArray(originalPixels.data), img.width, img.height);
      cleaned = false;
    }
    if (visibleShare(img.data) < 0.002) return { ok: false, problem: "empty", type };
    const [srcW, srcH] = known ? [known.width, known.height] : [source.width, source.height];
    const animated = isAnimated(head, type);
    // Already right (a PNG, JPEG or WebP of a sensible size, nothing removed): kept byte for byte.
    // The videos crop transparent margins themselves (logo-style crop), so there is nothing to gain
    // from re-encoding, and the preview appears sooner.
    const asIs = !cleaned && !animated && FILE_TYPES[type] && Math.max(srcW, srcH) <= MAX_SIDE && file.size <= UPLOAD_MAX_BYTES;
    const main = asIs
      ? { file: new File([file], `${base}.${FILE_TYPES[type]![1]}`, { type: FILE_TYPES[type]![0] }), width: srcW, height: srcH }
      : await encode(trim(img), `${base}.png`);
    if (!main) return { ok: false, problem: "unreadable", type };
    return {
      ok: true,
      file: main.file,
      ...(cleaned ? { original: async () => (await encode(originalPixels, `${base}.png`))?.file ?? null } : {}),
      width: main.width,
      height: main.height,
      sourceWidth: srcW,
      sourceHeight: srcH,
      cleaned,
      small: Math.max(srcW, srcH) < SMALL_SIDE,
      animated,
      type,
    };
  } finally {
    source.close();
  }
}
