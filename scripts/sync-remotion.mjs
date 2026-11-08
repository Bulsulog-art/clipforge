#!/usr/bin/env node
/**
 * Mirrors the video composition from the worker into the web app, so the
 * browser preview (web/src/components/dentvid/live-preview.tsx) draws the
 * SAME frames the worker renders.
 *
 *   node scripts/sync-remotion.mjs          write web/src/remotion/ from worker/src/remotion/
 *   node scripts/sync-remotion.mjs --check  exit 1 if the mirror has drifted
 *
 * worker/src/remotion is the source of truth. A mirror rather than an import
 * because web and worker are built as separate Docker contexts (./web and
 * ./worker): the web image cannot reach ../worker at build time. The copy is
 * mechanical — a header, and `.js` import suffixes dropped so Next (webpack
 * and Turbopack) resolve the .ts/.tsx files — and web/src/remotion/sync.test.ts
 * fails the web test run if it ever differs from what this script would write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "worker/src/remotion");
const DEST = path.join(root, "web/src/remotion");

/** Browser-safe modules only: no node:, no @remotion/renderer, no fs. */
const FILES = [
  "Video.tsx",
  "LogoMark.tsx",
  "Watermark.tsx",
  "animation.ts",
  "logo-style.ts",
  "scene-plan.ts",
  "theme.ts",
  "scenes/index.tsx",
  "scenes/primitives.tsx",
  "scenes/text-scenes.tsx",
  "scenes/data-scenes.tsx",
  "scenes/footage-scene.tsx",
];

function mirror(source, file) {
  const header =
    `// GENERATED from worker/src/remotion/${file} by scripts/sync-remotion.mjs — do not edit here.\n` +
    `// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.\n`;
  // `from "./x.js"` → `from "./x"`: relative imports only.
  return header + source.replace(/(from\s+["'](?:\.{1,2}\/)[^"']*?)\.js(["'])/g, "$1$2");
}

const check = process.argv.includes("--check");
let drift = 0;
for (const file of FILES) {
  const want = mirror(fs.readFileSync(path.join(SRC, file), "utf8"), file);
  const dest = path.join(DEST, file);
  const have = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : undefined;
  if (have === want) continue;
  if (check) {
    console.error(`drifted: web/src/remotion/${file}`);
    drift++;
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, want);
    console.log(`wrote web/src/remotion/${file}`);
  }
}
if (check && drift) {
  console.error(`\n${drift} file(s) differ from worker/src/remotion — run: node scripts/sync-remotion.mjs`);
  process.exit(1);
}
