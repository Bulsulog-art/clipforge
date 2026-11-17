import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planBackfill, runBackfill } from "./backfill";
import { planOwnerCleanup } from "./storage-cleanup";

const U = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";

describe("planBackfill (user_metadata → app_metadata)", () => {
  it("marks a DentVideo sign-up and copies a verified flag proven for the current address", () => {
    const user = {
      id: U,
      email: "dr@clinic.example",
      app_metadata: { provider: "email" },
      user_metadata: { product: "dentvideo", email_verified_at: "2026-11-01T00:00:00Z", email_verified_for: "Dr@Clinic.example", email_verified_via: "code" },
    };
    expect(planBackfill(user, { copyVerified: true })).toEqual({
      app_metadata: { product: "dentvideo", email_verified_at: "2026-11-01T00:00:00Z", email_verified_for: "dr@clinic.example", email_verified_via: "legacy_user_metadata" },
    });
    expect(planBackfill(user, { copyVerified: false })).toEqual({ app_metadata: { product: "dentvideo" } });
  });

  it("does not copy a flag for another address, and does nothing for an account already done", () => {
    const stale = { id: U, email: "new@clinic.example", app_metadata: {}, user_metadata: { product: "dentvideo", email_verified_at: "x", email_verified_for: "old@clinic.example" } };
    expect(planBackfill(stale, { copyVerified: true })).toEqual({ app_metadata: { product: "dentvideo" } });
    const done = { id: U, email: "dr@clinic.example", app_metadata: { product: "dentvideo" }, user_metadata: { product: "dentvideo" } };
    expect(planBackfill(done, { copyVerified: true })).toBeNull();
  });

  it("never touches accounts without the DentVideo sign-up marker, and keeps another app's product", () => {
    expect(planBackfill({ id: U, user_metadata: {}, app_metadata: {} }, { copyVerified: true })).toBeNull();
    expect(planBackfill({ id: U, user_metadata: { product: "coz" } }, { copyVerified: true })).toBeNull();
    expect(planBackfill({ id: U, app_metadata: { product: "aires" }, user_metadata: { product: "dentvideo" } }, { copyVerified: false })).toEqual({
      app_metadata: { products: ["aires", "dentvideo"] },
    });
  });

  it("runBackfill pages through users, writes only with apply, and lists clinic owners it would not mark", async () => {
    const users = [
      { id: "a", email: "a@x", app_metadata: {}, user_metadata: { product: "dentvideo" } },
      { id: "b", email: "b@x", app_metadata: { product: "aires" }, user_metadata: {} },
    ];
    const updateUserById = vi.fn(async () => ({ error: null }));
    const db = {
      auth: { admin: { listUsers: async () => ({ data: { users }, error: null }), updateUserById } },
      from: () => ({ select: async () => ({ data: [{ owner_id: "a" }, { owner_id: "b" }], error: null }) }),
    } as unknown as SupabaseClient;
    const dry = await runBackfill({ db, apply: false, copyVerified: true, log: () => {} });
    expect(dry).toEqual({ scanned: 2, marked: 1, verifiedCopied: 0, unmarkedClinicOwners: ["b"] });
    expect(updateUserById).not.toHaveBeenCalled();
    await runBackfill({ db, apply: true, copyVerified: true, log: () => {} });
    expect(updateUserById).toHaveBeenCalledWith("a", { app_metadata: { product: "dentvideo" } });
  });
});

describe("planOwnerCleanup (orphaned storage of unpaid accounts)", () => {
  const now = new Date("2026-11-09T00:00:00Z");
  const old = "2026-09-01T00:00:00Z";
  const recent = "2026-11-01T00:00:00Z";
  const files = [
    { path: `${U}/logo-1.png`, size: 100, contentType: "image/png", createdAt: old },
    { path: `${U}/logo-2.png`, size: 200, contentType: "image/png", createdAt: old },
    { path: `${U}/recordings/1.mp4`, size: 5000, contentType: "video/mp4", createdAt: old },
    { path: `${U}/logo-3.png`, size: 300, contentType: "image/png", createdAt: recent },
    { path: `${U}/nodate.png`, size: 300, contentType: "image/png", createdAt: null },
  ];

  it("removes an unpaid account's files older than 30 days, keeping its current logo", () => {
    const p = planOwnerCleanup({ ownerId: U, clinic: { plan: "trial", logo_path: `${U}/logo-2.png` }, userExists: true, files }, now);
    expect(p).toMatchObject({ reason: "unpaid", remove: [`${U}/logo-1.png`, `${U}/recordings/1.mp4`], bytes: 5100, keep: 3 });
  });

  it("removes old files of a folder whose account is gone; never touches a paying clinic", () => {
    expect(planOwnerCleanup({ ownerId: U, clinic: null, userExists: false, files }, now)).toMatchObject({ reason: "no account", remove: [`${U}/logo-1.png`, `${U}/logo-2.png`, `${U}/recordings/1.mp4`] });
    for (const plan of ["active", "paused", "cancelled"]) {
      expect(planOwnerCleanup({ ownerId: U, clinic: { plan, logo_path: null }, userExists: true, files }, now)).toMatchObject({ reason: "paying", remove: [] });
    }
  });

  it("only ever plans paths inside the owner's folder", () => {
    const other = [{ path: `9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f/logo.png`, size: 1, contentType: null, createdAt: old }];
    expect(planOwnerCleanup({ ownerId: U, clinic: null, userExists: false, files: other }, now).remove).toEqual([]);
  });
});
