import { describe, expect, it } from "vitest";
import { isDentvideoOnly, isDentvideoUser, withoutDentvideo } from "./membership";

const dv = (extra: Record<string, unknown> = {}, user_metadata: Record<string, unknown> = {}) => ({
  email: "dr@clinic.example",
  app_metadata: { provider: "email", providers: ["email"], product: "dentvideo", ...extra },
  user_metadata,
  identities: [{ provider: "email" }],
});

describe("isDentvideoUser", () => {
  it("reads the server-written app_metadata only", () => {
    expect(isDentvideoUser(dv())).toBe(true);
    expect(isDentvideoUser({ app_metadata: { products: ["coz", "dentvideo"] } })).toBe(true);
    expect(isDentvideoUser({ app_metadata: { provider: "email" }, user_metadata: { product: "dentvideo" } })).toBe(false);
    expect(isDentvideoUser({ app_metadata: { product: "aires" } })).toBe(false);
    expect(isDentvideoUser(null)).toBe(false);
  });
});

describe("isDentvideoOnly (may account deletion remove the shared login?)", () => {
  it("yes for a plain DentVideo sign-up, verified or not, with GoTrue's identity copy in user_metadata", () => {
    expect(isDentvideoOnly(dv())).toBe(true);
    expect(isDentvideoOnly(dv({ email_verified_at: "x", email_verified_for: "dr@clinic.example", email_verified_via: "code" }))).toBe(true);
    expect(isDentvideoOnly(dv({}, { sub: "id", email: "dr@clinic.example", email_verified: true, phone_verified: false, product: "dentvideo" }))).toBe(true);
  });

  it("no when anything says another app uses the login", () => {
    expect(isDentvideoOnly(dv({ products: ["dentvideo", "coz"] }))).toBe(false);
    expect(isDentvideoOnly(dv({ role: "admin" }))).toBe(false);
    expect(isDentvideoOnly(dv({}, { product: "aires" }))).toBe(false);
    expect(isDentvideoOnly(dv({}, { full_name: "Dr A" }))).toBe(false);
    expect(isDentvideoOnly(dv({ providers: ["email", "google"] }))).toBe(false);
    expect(isDentvideoOnly({ ...dv(), identities: [{ provider: "email" }, { provider: "apple" }] })).toBe(false);
  });

  it("no without the app_metadata marker (user_metadata alone proves nothing)", () => {
    expect(isDentvideoOnly({ app_metadata: { provider: "email" }, user_metadata: { product: "dentvideo" } })).toBe(false);
    expect(isDentvideoOnly(null)).toBe(false);
  });
});

describe("withoutDentvideo", () => {
  it("nulls DentVideo's keys (GoTrue deletes null keys) and leaves the rest", () => {
    expect(withoutDentvideo({ provider: "email", product: "dentvideo", email_verified_at: "x", email_verified_for: "y", role: "r" })).toEqual({
      product: null,
      email_verified_at: null,
      email_verified_for: null,
    });
  });

  it("does not touch another app's product, and drops dentvideo from a products list", () => {
    expect(withoutDentvideo({ product: "aires", products: ["aires", "dentvideo"] })).toEqual({ products: ["aires"] });
    expect(withoutDentvideo({ products: ["dentvideo"] })).toEqual({ products: null });
    expect(withoutDentvideo(null)).toEqual({});
  });
});
