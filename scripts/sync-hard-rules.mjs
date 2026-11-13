#!/usr/bin/env node
/**
 * Mirrors the compliance hard rules from the worker into the web app, so the
 * free public checker (dentvideo.com/ad-checker, components/dentvid/ad-checker.tsx)
 * flags exactly what the video pipeline's compliance agent flags — in the
 * visitor's browser, with no server call and no model.
 *
 *   node scripts/sync-hard-rules.mjs          write the web copies from the worker
 *   node scripts/sync-hard-rules.mjs --check  exit 1 if a copy has drifted
 *
 * worker/src/dental/hard-rules.ts is the source of truth (compliance.ts
 * re-exports it). A mirror rather than an import because web and worker are
 * built as separate Docker contexts (./web and ./worker), as with
 * scripts/sync-remotion.mjs. The golden cases travel too, so the web test
 * (web/src/lib/dentvid/hard-rules.test.ts) proves the same inputs give the
 * same hits on both sides; web/src/lib/dentvid/hard-rules.sync.test.ts runs
 * this script with --check.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** [source under worker/src/dental, destination under web/src/lib/dentvid] */
const FILES = [
  ["hard-rules.ts", "hard-rules.ts"],
  ["fixtures/hard-rules-golden.json", "hard-rules-golden.json"],
];

function mirror(source, from) {
  // JSON has no comments: the golden file is copied byte for byte.
  if (from.endsWith(".json")) return source;
  const header =
    `// GENERATED from worker/src/dental/${from} by scripts/sync-hard-rules.mjs — do not edit here.\n` +
    `// Edit the worker file and re-run the script; web/src/lib/dentvid/hard-rules.sync.test.ts checks they match.\n`;
  return header + source;
}

const check = process.argv.includes("--check");
let drift = 0;
for (const [from, to] of FILES) {
  const want = mirror(fs.readFileSync(path.join(root, "worker/src/dental", from), "utf8"), from);
  const dest = path.join(root, "web/src/lib/dentvid", to);
  const have = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : undefined;
  if (have === want) continue;
  if (check) {
    console.error(`drifted: web/src/lib/dentvid/${to}`);
    drift++;
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, want);
    console.log(`wrote web/src/lib/dentvid/${to}`);
  }
}
if (check && drift) {
  console.error(`\n${drift} file(s) differ from worker/src/dental — run: node scripts/sync-hard-rules.mjs`);
  process.exit(1);
}
