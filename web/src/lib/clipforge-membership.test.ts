import { describe, expect, it } from "vitest";
import { isClipforgeOnly, joinClipforgePatch, leaveClipforgePatch } from "./clipforge-membership";
import { isDentvideoOnly, isDentvideoUser } from "./dentvid/membership";

describe("joinClipforgePatch", () => {
  it("sets product on an unmarked account", () => {
    expect(joinClipforgePatch({ provider: "apple", providers: ["apple"] })).toEqual({ product: "clipforge" });
    expect(joinClipforgePatch(null)).toEqual({ product: "clipforge" });
  });
  it("is null when already a ClipForge account", () => {
    expect(joinClipforgePatch({ product: "clipforge" })).toBeNull();
    expect(joinClipforgePatch({ product: "dentvideo", products: ["clipforge"] })).toBeNull();
  });
  it("never overwrites another product: adds to products", () => {
    expect(joinClipforgePatch({ product: "dentvideo" })).toEqual({ products: ["clipforge"] });
    expect(joinClipforgePatch({ product: "dentvideo", products: ["studio"] })).toEqual({ products: ["studio", "clipforge"] });
  });
  it("keeps the account a DentVideo account, and no longer DentVideo-only", () => {
    const app = { product: "dentvideo", provider: "email", providers: ["email"] };
    const joined = { ...app, ...joinClipforgePatch(app) };
    expect(isDentvideoUser({ app_metadata: joined })).toBe(true);
    expect(isDentvideoOnly({ app_metadata: joined, identities: [{ provider: "email" }] })).toBe(false);
  });
});

describe("isClipforgeOnly", () => {
  it("accepts ClipForge-marked and legacy unmarked accounts", () => {
    expect(isClipforgeOnly({ app_metadata: { product: "clipforge", provider: "apple", providers: ["apple"] } })).toBe(true);
    expect(isClipforgeOnly({ app_metadata: { provider: "email", providers: ["email", "apple"] } })).toBe(true);
  });
  it("treats another product, foreign app_metadata keys or user_metadata.product as shared", () => {
    expect(isClipforgeOnly({ app_metadata: { product: "dentvideo", products: ["clipforge"] } })).toBe(false);
    expect(isClipforgeOnly({ app_metadata: { product: "clipforge", role: "owner" } })).toBe(false);
    expect(isClipforgeOnly({ app_metadata: { product: "clipforge" }, user_metadata: { product: "dentvideo" } })).toBe(false);
    expect(isClipforgeOnly(null)).toBe(false);
  });
});

describe("leaveClipforgePatch", () => {
  it("clears ClipForge's marker and nothing else", () => {
    expect(leaveClipforgePatch({ product: "clipforge" })).toEqual({ product: null });
    expect(leaveClipforgePatch({ product: "dentvideo", products: ["clipforge"] })).toEqual({ products: null });
    expect(leaveClipforgePatch({ product: "dentvideo", products: ["studio", "clipforge"] })).toEqual({ products: ["studio"] });
    expect(leaveClipforgePatch({ product: "dentvideo" })).toBeNull();
  });
});
