#!/usr/bin/env node
/**
 * Submit every URL in dentvideo.com's sitemap to IndexNow (Bing, Yandex,
 * Seznam, Naver and the other participating engines). No account needed:
 * ownership is proven by the key file at https://dentvideo.com/<key>.txt.
 *
 *   node scripts/indexnow.mjs              # read the live sitemap and submit
 *   node scripts/indexnow.mjs --dry-run    # print what would be sent
 *   node scripts/indexnow.mjs --sitemap ./sitemap.xml   # a local file or another URL
 *   node scripts/indexnow.mjs https://dentvideo.com/de/guides …   # just these URLs
 *
 * Run it after a deploy that adds or changes pages. Submitting unchanged URLs
 * over and over is pointless; once per deploy is plenty.
 * Behind a proxy (e.g. a sandbox), run with NODE_USE_ENV_PROXY=1.
 */
import { readFile } from "node:fs/promises";

// Keep in step with web/src/lib/dentvid/indexnow.ts (a test checks it).
const KEY = "e6b765322de3360e21f7c4e8fb3c2c40";
const HOST = "dentvideo.com";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const sitemapAt = args.includes("--sitemap") ? args[args.indexOf("--sitemap") + 1] : `https://${HOST}/sitemap.xml`;
const explicit = args.filter((a, i) => /^https?:\/\//.test(a) && args[i - 1] !== "--sitemap");

async function readSitemap(where) {
  if (/^https?:\/\//.test(where)) {
    const res = await fetch(where);
    if (!res.ok) throw new Error(`GET ${where}: HTTP ${res.status}`);
    return res.text();
  }
  return readFile(where, "utf8");
}

const urls = explicit.length
  ? explicit
  : [...(await readSitemap(sitemapAt)).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

const ours = [...new Set(urls)].filter((u) => new URL(u).host === HOST);
if (ours.length === 0) {
  console.error("No dentvideo.com URLs to submit.");
  process.exit(1);
}

if (!dryRun) {
  // IndexNow fetches the key file to verify ownership; fail early if it is not live.
  const keyRes = await fetch(KEY_LOCATION).catch((e) => ({ ok: false, status: String(e) }));
  const body = keyRes.ok ? (await keyRes.text()).trim() : "";
  if (body !== KEY) {
    console.error(`Key file ${KEY_LOCATION} is not serving the key (status ${keyRes.status}). Deploy first.`);
    process.exit(1);
  }
}

// IndexNow accepts up to 10,000 URLs per request.
for (let i = 0; i < ours.length; i += 10000) {
  const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: ours.slice(i, i + 10000) };
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    continue;
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  // 200 OK and 202 Accepted are both success (202: key validation pending).
  console.log(`IndexNow: HTTP ${res.status} for ${payload.urlList.length} URLs`);
  if (res.status !== 200 && res.status !== 202) {
    console.error(await res.text());
    process.exit(1);
  }
}
