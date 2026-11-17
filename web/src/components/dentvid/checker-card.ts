/**
 * The ad checker's result as an image (PNG), drawn in the visitor's browser
 * on a <canvas>: no server, no upload, no font or image fetched. Loaded only
 * when someone presses "Save result as image" (a separate chunk).
 *
 * The drawing is a pure function of a 2D context (drawCard), so the tests can
 * run it against a recording stub and see what would be painted.
 */

import type { Verdict } from "@/lib/dentvid/checker-markets";

export type CardRow = { verdict: Verdict; label: string; text: string };

export type CardData = {
  dir: "ltr" | "rtl";
  /** "Ad check · Türkiye" */
  title: string;
  /** "OK: 1 · Risky: 2 · Not allowed: 1" */
  summary: string;
  rows: CardRow[];
  /** How many flagged sentences did not fit. */
  more: number;
  /** "dentvideo.com/ad-checker — A careful filter, not legal advice." */
  footer: string;
  /** The page's own font stack (getComputedStyle), so the card matches the page without loading anything. */
  font: string;
};

/** The canvas calls drawCard makes: a subset of CanvasRenderingContext2D. */
export type CardContext = Pick<
  CanvasRenderingContext2D,
  "fillStyle" | "font" | "textAlign" | "textBaseline" | "direction" | "fillRect" | "fillText" | "measureText" | "beginPath" | "fill"
> & { roundRect?: CanvasRenderingContext2D["roundRect"] };

export const CARD_SIZE = 1080;
const PAD = 72;
export const CARD_MAX_ROWS = 5;

const INK = "#14211f";
const BODY = "#33423f";
const PAPER = "#f7f1e7";
const TEAL = "#0f5c5c";
const BADGE: Record<Verdict, [bg: string, fg: string]> = {
  ok: ["#e3f1ee", "#0f5c5c"],
  risky: ["#fde3c2", "#9a3412"],
  banned: ["#fee4e2", "#b42318"],
};

/**
 * Lines of `text` that fit `width`, at most `max`, the last one cut with "…".
 * Words where the script has spaces; characters otherwise (Japanese).
 */
export function wrapLines(ctx: Pick<CardContext, "measureText">, text: string, width: number, max: number): string[] {
  const spaced = /\s/.test(text.trim());
  const tokens = spaced ? text.trim().split(/(\s+)/) : [...text.trim()];
  const lines: string[] = [];
  let line = "";
  for (const tok of tokens) {
    const next = line + tok;
    if (ctx.measureText(next.trim()).width <= width || !line.trim()) {
      line = next;
      continue;
    }
    lines.push(line.trim());
    line = /^\s+$/.test(tok) ? "" : tok;
    if (lines.length === max) break;
  }
  if (lines.length < max && line.trim()) lines.push(line.trim());
  const cut = lines.length === max && lines.join(" ").length < text.trim().replace(/\s+/g, " ").length;
  if (cut) {
    let last = lines[max - 1];
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    lines[max - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function pill(ctx: CardContext, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
  } else ctx.fillRect(x, y, w, h);
}

/** Paint the card. Pure: everything it draws comes from `data`. */
export function drawCard(ctx: CardContext, data: CardData): void {
  const W = CARD_SIZE;
  const rtl = data.dir === "rtl";
  const inner = W - 2 * PAD;
  // Text starts at the reading edge: the left in LTR, the right in RTL.
  const x0 = rtl ? W - PAD : PAD;
  ctx.direction = data.dir;
  ctx.textAlign = "start";
  ctx.textBaseline = "top";

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, W);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, W, 14);

  let y = PAD;
  ctx.fillStyle = TEAL;
  ctx.font = `700 30px ${data.font}`;
  ctx.fillText("DentVideo", x0, y);
  y += 54;
  ctx.fillStyle = INK;
  ctx.font = `700 52px ${data.font}`;
  for (const l of wrapLines(ctx, data.title, inner, 2)) {
    ctx.fillText(l, x0, y);
    y += 64;
  }
  ctx.fillStyle = BODY;
  ctx.font = `500 30px ${data.font}`;
  ctx.fillText(data.summary, x0, y + 6);
  y += 76;

  const bottom = W - PAD - 70;
  for (const row of data.rows.slice(0, CARD_MAX_ROWS)) {
    if (y > bottom - 90) break;
    ctx.font = `700 24px ${data.font}`;
    const bw = Math.min(ctx.measureText(row.label).width + 36, inner);
    const [bg, fg] = BADGE[row.verdict];
    pill(ctx, rtl ? x0 - bw : x0, y, bw, 40, bg);
    ctx.fillStyle = fg;
    ctx.fillText(row.label, rtl ? x0 - 18 : x0 + 18, y + 8);
    y += 52;
    ctx.fillStyle = INK;
    ctx.font = `400 30px ${data.font}`;
    for (const l of wrapLines(ctx, row.text, inner, 2)) {
      ctx.fillText(l, x0, y);
      y += 40;
    }
    y += 22;
  }
  if (data.more > 0) {
    ctx.fillStyle = BODY;
    ctx.font = `500 26px ${data.font}`;
    ctx.fillText(`+${data.more}`, x0, y);
  }

  ctx.fillStyle = "#e4dccd";
  ctx.fillRect(PAD, W - PAD - 52, inner, 2);
  ctx.fillStyle = BODY;
  ctx.font = `500 24px ${data.font}`;
  for (const [i, l] of wrapLines(ctx, data.footer, inner, 2).entries()) ctx.fillText(l, x0, W - PAD - 34 + i * 30);
}

/** The card as a PNG blob, drawn on an off-screen canvas. */
export async function cardBlob(data: CardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  drawCard(ctx, data);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}
