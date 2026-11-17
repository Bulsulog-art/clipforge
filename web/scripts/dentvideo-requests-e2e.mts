#!/usr/bin/env node
/**
 * End-to-end check of the clinic's request flows in a real browser, against a
 * local production build with the backend mocked (no Liman, no queue, no
 * email, no paid API): the dev preview pages render the app from fake data,
 * and every API call the new UI makes is answered by page.route().
 *
 *   DENTVIDEO_DEV_PREVIEW=1 npx next build && DENTVIDEO_DEV_PREVIEW=1 npx next start -p 3100
 *   NODE_PATH=$(npm root -g) node --experimental-strip-types scripts/dentvideo-requests-e2e.mts http://localhost:3100
 *
 * Flows, in all eight languages where they show text:
 *   1. "Suggest a topic for next week": send → appears as waiting; an ad-rules
 *      refusal shows its reason; a waiting one can be removed.
 *   2. "Ask for a change": note → queued with the weekly count; the weekly limit
 *      shows its message; the card states (making / refused with reason / changed).
 *   3. "Download subtitles (.srt)" in "Post it" and on the email's share page: a .srt file downloads.
 *   4. A cancelled plan shows until when the library stays.
 *   5. Settings shows the suggestion box.
 *   Every page: no horizontal overflow at 360 px, no console errors, no unfilled {placeholder}.
 * Exits 1 on any failure.
 */
import { createRequire } from "node:module";
import { REQUESTS_TEXT } from "../src/content/dentvideo-requests.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = (process.argv[2] ?? "http://localhost:3100").replace(/\/+$/, "");
const LOCALES = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"] as const;
const failures: string[] = [];
let checks = 0;
const ok = (cond: unknown, what: string) => {
  checks++;
  if (!cond) failures.push(what);
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] });

async function open(path: string, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m: { type(): string; text(): string }) => {
    if (m.type() === "error" && !/Failed to load resource|favicon|media/i.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e: Error) => errors.push(e.message));
  // Nothing may reach a real backend: unexpected API calls fail the run.
  await page.route("**/api/dentvideo/**", (r: { request(): { url(): string }; fulfill(o: object): unknown }) => {
    // Anonymous funnel events and the price region are fire-and-forget on every page.
    if (/\/api\/dentvideo\/(event|geo)/.test(r.request().url())) return r.fulfill({ status: 204, body: "" });
    failures.push(`unexpected API call ${r.request().url()}`);
    return r.fulfill({ status: 500, body: "{}" });
  });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  return { page, ctx, errors };
}

async function overflow(page: { evaluate(f: () => number): Promise<number> }) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

// 1–2. Library in English: every interaction, success and failure.
{
  const t = REQUESTS_TEXT.en;
  const { page, ctx, errors } = await open("/dentvideo/dev/app?screen=library&state=mixed&lang=en");
  let topicCalls = 0;
  await page.route("**/api/dentvideo/topic-requests", async (r: any) => {
    topicCalls++;
    const body = JSON.parse(r.request().postData() ?? "{}");
    if (/price/i.test(body.text)) return r.fulfill({ status: 400, json: { error: t.topics.errors.adRules, code: "adRules" } });
    return r.fulfill({ json: { ok: true, message: t.topics.sent, topic: { id: "00000000-0000-4000-8000-0000000000f1", text: body.text, status: "pending", reason: null, week_of: null } } });
  });
  await page.route("**/api/dentvideo/topic-requests/*", (r: any) => r.fulfill({ json: { ok: true } }));
  const input = page.getByLabel(t.topics.label);
  await input.fill("How long does sensitivity last after whitening?");
  await page.getByRole("button", { name: t.topics.submit }).click();
  await page.getByText(t.topics.sent).waitFor();
  ok(await page.getByText("How long does sensitivity last after whitening?").isVisible(), "topic: the new suggestion is listed");
  await input.fill("Our best price for implants");
  await page.getByRole("button", { name: t.topics.submit }).click();
  await page.getByRole("alert").filter({ hasText: t.topics.errors.adRules }).waitFor();
  ok(topicCalls === 2, "topic: two POSTs");
  const removes = page.getByRole("button", { name: new RegExp(`^${t.topics.withdraw}:`) });
  const before = await removes.count();
  await removes.first().click();
  await page.waitForTimeout(300);
  ok((await removes.count()) === before - 1, "topic: a waiting suggestion is removed");
  ok((await page.getByText(t.topics.reasons.not_offered).count()) > 0, "topic: a refused suggestion shows its reason");

  let changes = 0;
  await page.route("**/api/dentvideo/items/*/change", async (r: any) => {
    changes++;
    return changes === 1 ? r.fulfill({ json: { ok: true, left: 2 } }) : r.fulfill({ status: 429, json: { error: t.change.errors.limit, code: "limit" } });
  });
  const ask = page.getByRole("button", { name: t.change.button }).first();
  await ask.click();
  await page.getByLabel(t.change.label).fill("Shorter, and say that sensitivity usually fades.");
  await page.getByRole("button", { name: t.change.submit, exact: true }).click();
  await page.getByText(/Changes left this week: 2 of 3/).waitFor();
  await page.getByRole("button", { name: t.change.button }).first().click();
  await page.getByLabel(t.change.label).fill("Another change");
  await page.getByRole("button", { name: t.change.submit, exact: true }).click();
  await page.getByRole("alert").filter({ hasText: t.change.errors.limit }).waitFor();
  ok(changes === 2, "change: two POSTs, one queued and one refused by the weekly limit");
  ok(errors.length === 0, `library en: console errors ${errors.join(" | ")}`);
  await ctx.close();
}

// The card states of a change.
{
  const t = REQUESTS_TEXT.en.change;
  const { page, ctx } = await open("/dentvideo/dev/app?screen=library&state=changing&lang=en");
  ok(await page.getByText(t.status.working).first().isVisible(), "change card: making your change");
  ok(await page.getByText(t.reasons.checks).first().isVisible(), "change card: refused with the reason");
  ok(await page.getByText(t.status.done).first().isVisible(), "change card: changed, approve again");
  await ctx.close();
}

// 3. Subtitles: in "Post it", and on the email's share page.
{
  const t = REQUESTS_TEXT.en.subtitles;
  const { page, ctx } = await open("/dentvideo/dev/app?screen=library&state=posting&lang=en");
  // Chromium does not route downloads through page.route: the real (backend-less) server answers,
  // so this checks the link and that a signed-out browser gets nothing. The file's content is
  // covered by api/dentvideo/requests-routes.test.ts.
  await page.getByRole("button", { name: "Post it" }).first().click();
  const link = page.getByRole("link", { name: t.download }).first();
  await link.waitFor();
  const [dl] = await Promise.all([page.waitForEvent("download"), link.click()]);
  ok(/\/api\/dentvideo\/items\/t\d\/subtitles\?format=srt$/.test(dl.url()), `subtitles: the post step downloads the video's .srt (got ${dl.url()})`);
  const anon = await page.request.get(dl.url());
  ok(anon.status() === 401, `subtitles: signed out gets 401, not a file (got ${anon.status()})`);
  await ctx.close();

  const share = await open("/dentvideo/dev/post?lang=en&state=approved");
  const btn = share.page.getByRole("button", { name: t.download });
  const [dl2] = await Promise.all([share.page.waitForEvent("download"), btn.click()]);
  ok(dl2.suggestedFilename().endsWith(".srt"), "subtitles: the email share page downloads an .srt");
  await share.ctx.close();
}

// 4–5 and every language: texts, no placeholders, no overflow, no console errors.
for (const lang of LOCALES) {
  const t = REQUESTS_TEXT[lang];
  for (const [path, must] of [
    [`/dentvideo/dev/app?screen=library&state=mixed&lang=${lang}`, [t.topics.title, t.change.button]],
    [`/dentvideo/dev/app?screen=library&state=changing&lang=${lang}`, [t.change.status.working]],
    [`/dentvideo/dev/app?screen=library&state=cancelled&lang=${lang}`, [t.retention.notice.split("{")[0].trim()].filter(Boolean)],
    [`/dentvideo/dev/app?screen=settings&lang=${lang}`, [t.topics.title]],
    [`/dentvideo/dev/post?lang=${lang}&state=approved`, [t.subtitles.download]],
  ] as [string, string[]][]) {
    const { page, ctx, errors } = await open(path, 360);
    const text = await page.locator("main").innerText();
    for (const m of must) ok(text.includes(m), `${path}: shows "${m}"`);
    ok(!/\{(n|max|date|ended)\}/.test(text), `${path}: an unfilled placeholder`);
    const over = await overflow(page);
    ok(over <= 1, `${path}: ${over}px horizontal overflow at 360 px`);
    ok(errors.length === 0, `${path}: console errors ${errors.join(" | ")}`);
    await ctx.close();
  }
}

await browser.close();
console.log(`${checks - failures.length}/${checks} checks passed`);
if (failures.length) {
  for (const f of failures) console.log(`FAIL ${f}`);
  process.exit(1);
}
