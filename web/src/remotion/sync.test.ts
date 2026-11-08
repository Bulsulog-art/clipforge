import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * web/src/remotion is a mechanical mirror of worker/src/remotion (the
 * render's source of truth), so the live preview draws what the worker
 * renders. If this fails: edit the worker file, then run
 * `node scripts/sync-remotion.mjs` from the repo root.
 */
const root = path.resolve(__dirname, "../../..");
const script = path.join(root, "scripts/sync-remotion.mjs");

describe("composition mirror", () => {
  it.skipIf(!fs.existsSync(path.join(root, "worker/src/remotion")))("matches worker/src/remotion", () => {
    expect(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
