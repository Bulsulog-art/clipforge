import { describe, expect, it } from "vitest";
import { MAX_PENDING_UPLOADS, MemorySlotStore, claimUploadSlot, oversizedLogos } from "./upload-slots";
import { planOwnerCleanup } from "./storage-cleanup";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const OTHER = "9f8e7d6c-5b4a-4321-8fed-cba987654321";
const MB = 1024 * 1024;

describe("claimUploadSlot", () => {
  it("gives out at most MAX_PENDING_UPLOADS unused URLs per owner and kind", async () => {
    const s = new MemorySlotStore();
    const none = new Set<string>();
    const max = MAX_PENDING_UPLOADS.recording;
    for (let i = 0; i < max; i++) expect(await claimUploadSlot(s, { ownerId: OWNER, kind: "recording", path: `${OWNER}/recordings/${i}.mp4`, stored: none })).toBe(true);
    expect(await claimUploadSlot(s, { ownerId: OWNER, kind: "recording", path: `${OWNER}/recordings/x.mp4`, stored: none })).toBe(false);
    // Another owner has their own slots.
    expect(await claimUploadSlot(s, { ownerId: OTHER, kind: "recording", path: `${OTHER}/recordings/1.mp4`, stored: none })).toBe(true);
  });

  it("frees a slot once its file is in storage", async () => {
    const s = new MemorySlotStore();
    const a = `${OWNER}/recordings/1.mp4`;
    expect(await claimUploadSlot(s, { ownerId: OWNER, kind: "recording", path: a, stored: new Set(), max: 1 })).toBe(true);
    expect(await claimUploadSlot(s, { ownerId: OWNER, kind: "recording", path: `${OWNER}/recordings/2.mp4`, stored: new Set(), max: 1 })).toBe(false);
    expect(await claimUploadSlot(s, { ownerId: OWNER, kind: "recording", path: `${OWNER}/recordings/2.mp4`, stored: new Set([a]), max: 1 })).toBe(true);
  });

  it("concurrent requests cannot share a slot", async () => {
    const s = new MemorySlotStore();
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => claimUploadSlot(s, { ownerId: OWNER, kind: "recording", path: `${OWNER}/recordings/${i}.mp4`, stored: new Set() })),
    );
    expect(results.filter(Boolean)).toHaveLength(MAX_PENDING_UPLOADS.recording);
  });
});

describe("oversized logos", () => {
  const files = [
    { path: `${OWNER}/logo-1731081600000.png`, size: 400 * MB },
    { path: `${OWNER}/logo-1731081600001.png`, size: 2 * MB },
    { path: `${OWNER}/logo.png`, size: 6 * MB },
    { path: `${OWNER}/recordings/1731081600000.mp4`, size: 400 * MB },
  ];

  it("are logo objects over the logo limit, never the current logo nor a recording", () => {
    expect(oversizedLogos(files, null)).toEqual([`${OWNER}/logo-1731081600000.png`, `${OWNER}/logo.png`]);
    expect(oversizedLogos(files, `${OWNER}/logo.png`)).toEqual([`${OWNER}/logo-1731081600000.png`]);
  });

  it("the storage cleanup removes them at once, whatever their age", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    const fresh = now.toISOString();
    const p = planOwnerCleanup(
      {
        ownerId: OWNER,
        clinic: { plan: "trial", logo_path: `${OWNER}/logo-1731081600001.png` },
        userExists: true,
        files: files.map((f) => ({ ...f, contentType: null, createdAt: fresh })),
      },
      now,
    );
    expect(p.remove).toEqual([`${OWNER}/logo-1731081600000.png`, `${OWNER}/logo.png`]);
  });
});
