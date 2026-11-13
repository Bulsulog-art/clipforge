import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The clinic's logo as the renders get it: only the owner's logo key (the
 * old fixed name or the versioned one the web writes now), and only bytes
 * that are a real, decodable image. Anything else is left out with a
 * warning, so the videos are made without a logo instead of failing or
 * drawing a broken box.
 */

vi.mock("openai", () => ({ default: class {} }));
// Module-level clients elsewhere in the import graph; loadClinic gets its own fake.
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({}) }));
const warn = vi.fn();
vi.mock("../logger.js", () => ({ logger: { warn, info: vi.fn(), error: vi.fn() } }));

const { loadClinic, isOwnerLogoKey } = await import("./jobs.js");

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const OTHER = "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f";
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "clinic-logo-"));
afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

function fakeDb(logoPath: string | null, bytes: Uint8Array | null) {
  const downloads: string[] = [];
  const db = {
    from: () => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.single = async () => ({
        data: { id: CLINIC, owner_id: OWNER, profile: { name: "Riverside Dental", country: "GB", language: "en", services: ["implants"] }, logo_path: logoPath },
        error: null,
      });
      return q;
    },
    storage: {
      from: () => ({
        download: async (key: string) => {
          downloads.push(key);
          return { data: bytes ? new Blob([new Uint8Array(bytes)]) : null, error: bytes ? null : { message: "not found" } };
        },
      }),
    },
  };
  return { db: db as unknown as SupabaseClient, downloads };
}

let work: string;
beforeEach(() => {
  warn.mockClear();
  work = fs.mkdtempSync(path.join(DIR, "job-"));
});

describe("isOwnerLogoKey", () => {
  it("accepts the owner's fixed and versioned logo names, nothing else", () => {
    expect(isOwnerLogoKey(`${OWNER}/logo.png`, OWNER)).toBe(true);
    expect(isOwnerLogoKey(`${OWNER}/logo-1731081600000.webp`, OWNER)).toBe(true);
    expect(isOwnerLogoKey(`${OWNER}/logo-1731081600000.JPG`, OWNER)).toBe(true);
    expect(isOwnerLogoKey(`${OTHER}/logo-1731081600000.png`, OWNER)).toBe(false);
    expect(isOwnerLogoKey(`${OWNER}/logo-1731081600000.svg`, OWNER)).toBe(false);
    expect(isOwnerLogoKey(`${OWNER}/recordings/1731081600000.mp4`, OWNER)).toBe(false);
    expect(isOwnerLogoKey(`${OWNER}/x/logo.png`, OWNER)).toBe(false);
    expect(isOwnerLogoKey(`${OWNER}/../${OTHER}/logo.png`, OWNER)).toBe(false);
    expect(isOwnerLogoKey(`${OWNER}/logo-abc.png`, OWNER)).toBe(false);
  });
});

describe("loadClinic — the logo", () => {
  it("an HTML page stored as the logo: no logo, a warning, nothing written", async () => {
    const { db, downloads } = fakeDb(`${OWNER}/logo-1731081600000.png`, new TextEncoder().encode("<!DOCTYPE html><title>404</title>"));
    const c = await loadClinic(db, CLINIC, work);
    expect(downloads).toEqual([`${OWNER}/logo-1731081600000.png`]);
    expect(c.logoPath).toBeUndefined();
    expect(c.logoStyle).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ reason: "not-an-image" }), expect.stringContaining("rendering without it"));
    expect(fs.readdirSync(work)).toEqual([]);
  });

  it("a key that is not the owner's logo is never downloaded", async () => {
    const { db, downloads } = fakeDb(`${OTHER}/logo.png`, new Uint8Array([0x89]));
    expect((await loadClinic(db, CLINIC, work)).logoPath).toBeUndefined();
    expect(downloads).toEqual([]);
  });

  it.skipIf(!hasFfmpeg)("a real (versioned) PNG logo is rendered, with its style", async () => {
    const src = path.join(DIR, "real.png");
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x14286E:s=300x100", "-frames:v", "1", src]);
    const { db } = fakeDb(`${OWNER}/logo-1731081600000.png`, fs.readFileSync(src));
    const c = await loadClinic(db, CLINIC, work);
    expect(c.logoPath).toBe(path.join(work, "logo.png"));
    expect(c.logoStyle?.aspect).toBeCloseTo(3, 2);
    expect(warn).not.toHaveBeenCalled();
  });

  it.skipIf(!hasFfmpeg)("a PNG header on a broken body: no logo, a warning", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3, 4]);
    const { db } = fakeDb(`${OWNER}/logo.png`, bytes);
    const c = await loadClinic(db, CLINIC, work);
    expect(c.logoPath).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ reason: "undecodable" }), expect.any(String));
    expect(fs.readdirSync(work)).toEqual([]);
  });
});
