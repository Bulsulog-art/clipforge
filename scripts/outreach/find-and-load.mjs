#!/usr/bin/env node
// DentVideo outbound pipeline: find -> verify -> personalise -> load into Instantly.
//
//   node scripts/outreach/find-and-load.mjs --market us --max 400 [--dry-run] [--activate]
//
// Steps
//   1. Apify "microworlds/leads-finder": dentists / practice owners in the market.
//   2. Apify "bounceverify/bounceverify-email-verifier": keep status=valid only
//      (no catch-all, role-based or disposable addresses; they hurt sender reputation).
//   3. Drop anyone already in the Instantly workspace (skip_if_in_workspace).
//   4. Greeting "Hi Dr. <Last>," for dentists, otherwise "Hi <First>,".
//   5. Upload into the market's campaign.
//
// Credentials: APIFY_TOKEN and INSTANTLY_API_KEY. In the Claude cloud environment the
// network proxy injects both headers, so any placeholder value works there.
// Spend: each run is capped with maxTotalChargeUsd (finder $2, verifier $1).
// About $0.80 per 100 valid leads as measured on 2026-11-28.
//
// Markets are limited to places where cold B2B email is lawful with an opt-out
// (docs/gtm/02-outreach-law-and-channels.md). Adding a market needs the owner's OK.

import { writeFileSync, mkdirSync } from "node:fs";

const MARKETS = {
  us: {
    campaign: "dbd035f8-bbb9-4701-9739-2a82c8d02d1d", // DentVideo-EN-US-v3
    country: "United States",
    input: { contact_location: ["united states"] },
  },
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => {
    if (!a.startsWith("--")) return [];
    const next = all[i + 1];
    return [a.slice(2), next && !next.startsWith("--") ? next : true];
  }).filter((p) => p.length),
);
const market = MARKETS[args.market ?? "us"];
if (!market) throw new Error(`Unknown market ${args.market}. Known: ${Object.keys(MARKETS).join(", ")}`);
const max = Math.min(Number(args.max ?? 400), 1000);
const dry = Boolean(args["dry-run"]);
const outDir = args.out ?? `outreach-runs/${new Date().toISOString().slice(0, 10)}`;
mkdirSync(outDir, { recursive: true });

const APIFY = "https://api.apify.com/v2";
const INST = "https://api.instantly.ai/api/v2";
const apifyH = { Authorization: `Bearer ${process.env.APIFY_TOKEN ?? "proxy"}`, "Content-Type": "application/json" };
const instH = { Authorization: `Bearer ${process.env.INSTANTLY_API_KEY ?? "proxy"}`, "Content-Type": "application/json" };

async function j(url, init) {
  const r = await fetch(url, init);
  const t = await r.text();
  if (!r.ok) throw new Error(`${init?.method ?? "GET"} ${url} -> ${r.status}: ${t.slice(0, 300)}`);
  return JSON.parse(t);
}

async function runActor(actor, input, capUsd) {
  const run = (await j(`${APIFY}/acts/${actor}/runs?maxTotalChargeUsd=${capUsd}`, {
    method: "POST", headers: apifyH, body: JSON.stringify(input),
  })).data;
  for (;;) {
    const s = (await j(`${APIFY}/actor-runs/${run.id}`, { headers: apifyH })).data;
    if (!["READY", "RUNNING"].includes(s.status)) {
      if (s.status !== "SUCCEEDED") throw new Error(`${actor} ended ${s.status}`);
      console.log(`${actor}: ${s.status}, $${(s.usageTotalUsd ?? 0).toFixed(2)}`);
      return j(`${APIFY}/datasets/${run.defaultDatasetId}/items?clean=1`, { headers: apifyH });
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

const SUFFIX = /,?\s*(P\.?C\.?|PLLC|LLC|L\.L\.C\.|Inc\.?|DDS|DMD|PA|P\.A\.|Ltd\.?)$/i;
const DENTIST = /dentist|dds|dmd|orthodont|endodont|periodont|prosthodont/;
const NOT_DECIDER = /associate|hygien|assistant|student|resident|intern/;

const raw = await runActor("microworlds~leads-finder", {
  max_result: max,
  include_mobile: false,
  email_status: ["verified"],
  contact_job_titles: ["dentist", "owner", "practice owner", "DDS", "DMD", "founder", "general dentist",
    "cosmetic dentist", "practice manager"],
  company_industry: ["Medical Practice", "Health, Wellness & Fitness", "Hospital & Health Care"],
  keywords: ["dental", "dentistry"],
  company_num_employees_range: ["1-10", "11-20", "21-50"],
  ...market.input,
}, 2);
writeFileSync(`${outDir}/leads_raw.json`, JSON.stringify(raw));

const seen = new Set();
const leads = raw.filter((x) => {
  const e = (x.email ?? "").trim().toLowerCase();
  if (!e || seen.has(e)) return false;
  if ((x.country ?? market.country) !== market.country) return false;
  if (NOT_DECIDER.test((x.title ?? "").toLowerCase())) return false;
  seen.add(e);
  return true;
});
console.log(`found ${raw.length}, decision-makers with email ${leads.length}`);
if (!leads.length) process.exit(0);

const verified = await runActor("bounceverify~bounceverify-email-verifier", { emails: leads.map((x) => x.email) }, 1);
const ok = new Set(verified
  .filter((v) => v.status === "valid" && !v.is_role_based && !v.is_disposable && !v.is_spamtrap)
  .map((v) => v.email.toLowerCase()));

const upload = leads.filter((x) => ok.has(x.email.toLowerCase())).map((x) => {
  const first = (x.first_name ?? "").trim();
  const last = (x.last_name ?? "").trim();
  const title = (x.title ?? "").toLowerCase();
  const greeting = last && DENTIST.test(title) ? `Hi Dr. ${last},` : first ? `Hi ${first},` : "Hi,";
  return {
    email: x.email.toLowerCase(),
    first_name: first,
    last_name: last,
    company_name: (x.organization_name ?? "").trim().replace(SUFFIX, "").trim() || "your practice",
    website: x.organization_website_url ?? "",
    custom_variables: { greeting, city: x.city ?? "", title: x.title ?? "" },
  };
});
writeFileSync(`${outDir}/upload.json`, JSON.stringify(upload, null, 1));
console.log(`verified valid: ${upload.length}`);

if (dry) {
  console.log("dry run: nothing uploaded");
  process.exit(0);
}
const res = await j(`${INST}/leads/add`, {
  method: "POST", headers: instH,
  body: JSON.stringify({ campaign_id: market.campaign, skip_if_in_workspace: true, verify_leads_on_import: false, leads: upload }),
});
console.log(`instantly: uploaded ${res.leads_uploaded}, skipped ${res.skipped_count}, duplicates ${res.duplicated_leads}, blocklist ${res.in_blocklist}`);
if (args.activate) {
  await j(`${INST}/campaigns/${market.campaign}/activate`, { method: "POST", headers: instH, body: "{}" });
  console.log("campaign active");
}
