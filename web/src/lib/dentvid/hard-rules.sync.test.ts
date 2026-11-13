import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * lib/dentvid/hard-rules.ts (and its golden cases) are a mechanical mirror of
 * worker/src/dental/hard-rules.ts, so the public ad checker flags what the
 * video pipeline flags. If this fails: edit the worker file, then run
 * `node scripts/sync-hard-rules.mjs` from the repo root.
 */
const root = path.resolve(__dirname, "../../../..");
const script = path.join(root, "scripts/sync-hard-rules.mjs");

describe("hard-rules mirror", () => {
  it.skipIf(!fs.existsSync(path.join(root, "worker/src/dental/hard-rules.ts")))("matches worker/src/dental/hard-rules.ts", () => {
    expect(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
