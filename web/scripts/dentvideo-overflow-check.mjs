#!/usr/bin/env node
/**
 * DentVideo layout check: no page scrolls sideways and no element sticks out
 * of the viewport, in every language, at phone, tablet and desktop widths.
 *
 *   DENTVIDEO_DEV_PREVIEW=1 pnpm build && DENTVIDEO_DEV_PREVIEW=1 pnpm start -p 3100
 *   node scripts/dentvideo-overflow-check.mjs http://localhost:3100
 *
 * Needs Playwright (`require('playwright')`), which is not a dependency of the
 * app: install it next to the script or run where it is available. Exits 1 on
 * any finding. Read-only page loads: no sign-up, no payment, no email.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = (process.argv[2] ?? "http://localhost:3100").replace(/\/+$/, "");
const LOCALES = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"];
const WIDTHS = [360, 390, 768, 1280, 1440];
const pre = (l) => (l === "en" ? "/dentvideo" : `/dentvideo/${l}`);

const pages = [
  ...LOCALES.flatMap((l) => [pre(l), `${pre(l)}/examples`, `${pre(l)}/about`, `${pre(l)}/guides`, `${pre(l)}/help`]),
  "/dentvideo/privacy",
  "/dentvideo/terms",
  "/dentvideo/dpa",
  "/dentvideo/start",
  "/dentvideo/reset",
  "/dentvideo/guides/heilmittelwerbegesetz-zahnarzt-social-media",
  // The signed-in app and the sign-up wizard from fake data (404 unless DENTVIDEO_DEV_PREVIEW=1).
  ...LOCALES.flatMap((l) => [
    `/dentvideo/dev/app?screen=library&state=mixed&lang=${l}`,
    `/dentvideo/dev/app?screen=library&state=posting&lang=${l}`,
    `/dentvideo/dev/app?screen=settings&lang=${l}`,
    `/dentvideo/dev/app?screen=record&lang=${l}`,
    `/dentvideo/dev/funnel?step=plan&lang=${l}`,
    `/dentvideo/dev/post?lang=${l}`,
  ]),
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ reducedMotion: "reduce" });
// Funnel events from this run are ours: the server tags them internal (web/src/lib/dentvid/internal-request.ts).
await ctx.route("**/api/dentvideo/event", (r) => r.continue({ headers: { ...r.request().headers(), "x-dv-internal": "1" } }));
const findings = [];
for (const path of pages) {
  for (const width of WIDTHS) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width, height: 900 });
    const res = await page.goto(base + path, { waitUntil: "load" });
    if (!res || res.status() >= 400) {
      findings.push(`${path} @${width}: HTTP ${res?.status()}`);
      await page.close();
      continue;
    }
    await page.waitForTimeout(400);
    const out = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      if (document.documentElement.scrollWidth > vw + 1) bad.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`);
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(el).position === "fixed") continue;
        // Elements inside a scrolling or clipping box (the sample-video row, a color input) are meant to.
        let a = el.parentElement;
        let clipped = false;
        while (a && a !== document.body) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) { clipped = true; break; }
          a = a.parentElement;
        }
        if (!clipped && (r.right > vw + 1 || r.left < -1)) bad.push(`<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 40)}" sticks out`);
        if (bad.length > 4) break;
      }
      return bad;
    });
    for (const b of out) findings.push(`${path} @${width}: ${b}`);
    await page.close();
  }
}
await browser.close();
if (findings.length) {
  console.error(findings.join("\n"));
  process.exit(1);
}
console.log(`OK: ${pages.length} pages × ${WIDTHS.length} widths, nothing overflows.`);
