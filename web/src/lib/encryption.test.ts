import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  // Tests need a service role key to derive an encryption key from.
  // Use a fixed dummy so encrypt+decrypt round-trips are deterministic.
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-role-key-do-not-use-in-prod";
});

describe("encryptToken / decryptToken — at-rest AES-256-GCM round trip", () => {
  it("round-trips a TikTok-shaped access token", async () => {
    const { encryptToken, decryptToken } = await import("./encryption");
    const plain = "act.abc123.def456.ghi789-real-tiktok-token";
    const ct = encryptToken(plain);
    expect(ct).not.toEqual(plain);
    expect(ct.startsWith("v1:")).toBe(true);
    expect(decryptToken(ct)).toEqual(plain);
  });

  it("produces a different ciphertext on each call (random IV)", async () => {
    const { encryptToken } = await import("./encryption");
    const plain = "same-input";
    const a = encryptToken(plain);
    const b = encryptToken(plain);
    expect(a).not.toEqual(b);
  });

  it("treats legacy plaintext (no v1: prefix) as already-decrypted (backward compat)", async () => {
    const { decryptToken } = await import("./encryption");
    expect(decryptToken("legacy-plaintext-token")).toEqual("legacy-plaintext-token");
  });

  it("preserves empty strings unchanged", async () => {
    const { encryptToken, decryptToken } = await import("./encryption");
    expect(encryptToken("")).toEqual("");
    expect(decryptToken("")).toEqual("");
  });

  it("throws when ciphertext is tampered (GCM tag mismatch)", async () => {
    const { encryptToken } = await import("./encryption");
    const ct = encryptToken("real-token");
    // Flip a byte in the ciphertext portion
    const parts = ct.split(":");
    const enc = Buffer.from(parts[3], "base64");
    enc[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${enc.toString("base64")}`;
    const { decryptToken } = await import("./encryption");
    expect(() => decryptToken(tampered)).toThrow();
  });
});
