import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetClipforgeProfileCache, ensureClipforgeProfile } from "./clipforge-profile";

function fakeSvc(inserted: boolean, error: { message: string } | null = null) {
  const upsert = vi.fn(() => ({ select: async () => ({ data: inserted ? [{ id: "u1" }] : [], error }) }));
  const updateUserById = vi.fn(async () => ({ error: null }));
  const svc = { from: vi.fn(() => ({ upsert })), auth: { admin: { updateUserById } } };
  return { svc: svc as never, upsert, updateUserById };
}

const user = { id: "u1", email: "a@example.com", app_metadata: { provider: "apple", providers: ["apple"] } };

describe("ensureClipforgeProfile", () => {
  beforeEach(() => _resetClipforgeProfileCache());

  it("creates the profile with the old trigger's values and marks a new account", async () => {
    const f = fakeSvc(true);
    await ensureClipforgeProfile(user, f.svc);
    expect(f.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1", email: "a@example.com", credits_balance: 1 }),
      { onConflict: "id", ignoreDuplicates: true },
    );
    expect(f.updateUserById).toHaveBeenCalledWith("u1", { app_metadata: { product: "clipforge" } });
  });

  it("adds clipforge to products on another app's account", async () => {
    const f = fakeSvc(true);
    await ensureClipforgeProfile({ ...user, app_metadata: { product: "dentvideo" } }, f.svc);
    expect(f.updateUserById).toHaveBeenCalledWith("u1", { app_metadata: { products: ["clipforge"] } });
  });

  it("leaves an existing profile and its account alone, and asks once per process", async () => {
    const f = fakeSvc(false);
    await ensureClipforgeProfile(user, f.svc);
    await ensureClipforgeProfile(user, f.svc);
    expect(f.upsert).toHaveBeenCalledTimes(1);
    expect(f.updateUserById).not.toHaveBeenCalled();
  });

  it("retries after a failure and never throws", async () => {
    const bad = fakeSvc(false, { message: "boom" });
    await expect(ensureClipforgeProfile(user, bad.svc)).resolves.toBeUndefined();
    const ok = fakeSvc(false);
    await ensureClipforgeProfile(user, ok.svc);
    expect(ok.upsert).toHaveBeenCalledTimes(1);
  });

  it("skips users without an email (the cloud trigger did too)", async () => {
    const f = fakeSvc(true);
    await ensureClipforgeProfile({ ...user, email: undefined }, f.svc);
    expect(f.upsert).not.toHaveBeenCalled();
  });
});
