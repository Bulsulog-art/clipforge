#!/usr/bin/env node
// Downloads DB-IP's free "IP to Country Lite" database (CC BY 4.0,
// https://db-ip.com) into geoip/dbip-country-lite.mmdb, for the in-process
// IP → country lookup in src/lib/dentvid/geo-ip.ts.
//
// Run at Docker build time (web/Dockerfile). Never fails the build: if the
// download or the check fails, no database is written and the site works as
// before (country unknown → prices by time zone, ad-click consent asked).
//
// DB-IP publishes one file per month; the current month's file may not be
// out yet on the 1st, so the previous month is tried next.
//
//   node scripts/fetch-geoip.mjs [outDir]   (default: ./geoip)

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outDir = path.resolve(process.argv[2] ?? "geoip");
const outFile = path.join(outDir, "dbip-country-lite.mmdb");
// The trailer every MaxMind-format database carries before its metadata.
const METADATA_MARKER = Buffer.from("\xab\xcd\xefMaxMind.com", "latin1");

function months(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  const fmt = (yy, mm) => `${yy}-${String(mm + 1).padStart(2, "0")}`;
  return [fmt(y, m), m === 0 ? fmt(y - 1, 11) : fmt(y, m - 1)];
}

async function download(month) {
  const url = `https://download.db-ip.com/free/dbip-country-lite-${month}.mmdb.gz`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${month}: HTTP ${res.status}`);
  const db = zlib.gunzipSync(Buffer.from(await res.arrayBuffer()));
  if (db.length < 1_000_000 || db.lastIndexOf(METADATA_MARKER) < 0) throw new Error(`${month}: not an mmdb file`);
  return db;
}

/** A sanity lookup when mmdb-lib is installed (it is in the Docker builder): a well-known address must resolve. */
async function check(db) {
  let Reader;
  try {
    ({ Reader } = await import("mmdb-lib"));
  } catch {
    return;
  }
  const rec = new Reader(db).get("8.8.8.8");
  if (!rec?.country?.iso_code) throw new Error("lookup check failed");
}

fs.mkdirSync(outDir, { recursive: true });
let done = false;
for (const month of months()) {
  try {
    const db = await download(month);
    await check(db);
    fs.writeFileSync(outFile, db);
    console.log(`[geoip] DB-IP country lite ${month}: ${(db.length / 1048576).toFixed(1)} MB → ${outFile}`);
    done = true;
    break;
  } catch (e) {
    console.warn(`[geoip] ${e instanceof Error ? e.message : e}`);
  }
}
if (!done) console.warn("[geoip] no country database: visitors' country will be unknown (prices by time zone, ad-click consent asked)");
