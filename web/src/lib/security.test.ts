import { describe, expect, it } from "vitest";
import { isAllowedSourceUrl, isOwnedPath, bearerEquals } from "./security";

describe("isAllowedSourceUrl — SSRF allowlist", () => {
  it("allows youtube watch URL", () => {
    expect(isAllowedSourceUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
  });
  it("allows youtu.be short URL", () => {
    expect(isAllowedSourceUrl("https://youtu.be/abc123")).toBe(true);
  });
  it("allows tiktok mobile URL", () => {
    expect(isAllowedSourceUrl("https://vm.tiktok.com/ZMabc/")).toBe(true);
  });
  it("rejects file:// (attempted local file read)", () => {
    expect(isAllowedSourceUrl("file:///etc/passwd")).toBe(false);
  });
  it("rejects AWS metadata endpoint", () => {
    expect(isAllowedSourceUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
  });
  it("rejects internal RFC1918 address", () => {
    expect(isAllowedSourceUrl("http://10.0.0.1/admin")).toBe(false);
  });
  it("rejects loopback", () => {
    expect(isAllowedSourceUrl("http://127.0.0.1:6379")).toBe(false);
  });
  it("rejects malformed URL", () => {
    expect(isAllowedSourceUrl("not a url")).toBe(false);
  });
  it("rejects javascript: protocol", () => {
    expect(isAllowedSourceUrl("javascript:alert(1)")).toBe(false);
  });
  it("rejects spoofed hostname trick", () => {
    expect(isAllowedSourceUrl("https://evil.com/youtube.com")).toBe(false);
  });
  it("rejects subdomain of youtube.com.evil.com", () => {
    expect(isAllowedSourceUrl("https://youtube.com.evil.com/")).toBe(false);
  });
});

describe("isOwnedPath — avatar customImagePath ownership", () => {
  const me = "11111111-1111-1111-1111-111111111111";
  const them = "22222222-2222-2222-2222-222222222222";

  it("accepts a path under my own UUID", () => {
    expect(isOwnedPath(`${me}/faces/abc.jpg`, me)).toBe(true);
  });
  it("rejects another user's path (deepfake guard)", () => {
    expect(isOwnedPath(`${them}/faces/abc.jpg`, me)).toBe(false);
  });
  it("rejects parent-directory traversal", () => {
    expect(isOwnedPath(`${me}/../${them}/faces/abc.jpg`, me)).toBe(false);
  });
  it("rejects a prefix-only match (UUID followed by extra chars)", () => {
    expect(isOwnedPath(`${me}-extra/faces/abc.jpg`, me)).toBe(false);
  });
  it("accepts empty/undefined as no-op (optional field)", () => {
    expect(isOwnedPath(undefined, me)).toBe(true);
    expect(isOwnedPath(null, me)).toBe(true);
  });
});

describe("bearerEquals — RevenueCat webhook constant-time auth", () => {
  const secret = "supersecret_webhook_token_12345";

  it("returns true on exact match", () => {
    expect(bearerEquals(`Bearer ${secret}`, secret)).toBe(true);
  });
  it("returns false on different secret", () => {
    expect(bearerEquals(`Bearer wrong`, secret)).toBe(false);
  });
  it("returns false on missing Bearer prefix", () => {
    expect(bearerEquals(secret, secret)).toBe(false);
  });
  it("returns false on null header", () => {
    expect(bearerEquals(null, secret)).toBe(false);
  });
  it("returns false if server-side secret is missing", () => {
    expect(bearerEquals(`Bearer ${secret}`, undefined)).toBe(false);
  });
  it("returns false on a length-only-matching candidate (no early-exit oracle)", () => {
    const same_length_garbage = `Bearer ${"x".repeat(secret.length)}`;
    expect(bearerEquals(same_length_garbage, secret)).toBe(false);
  });
});
