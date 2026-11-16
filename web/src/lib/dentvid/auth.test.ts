import { describe, it, expect, vi, beforeEach } from "vitest";

let authHeader: string | null = null;
const getUserCalls: unknown[] = [];
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] })),
  headers: vi.fn(async () => ({ get: (k: string) => (k === "authorization" ? authHeader : null) })),
}));
vi.mock("./supabase", () => ({
  dvBearer: (token: string) => ({
    kind: "bearer",
    auth: { getUser: async (t: string) => (getUserCalls.push(["bearer", token, t]), { data: { user: t === "good.jwt" ? { id: "u1" } : null } }) },
  }),
  dvServer: () => ({ kind: "cookie", auth: { getUser: async () => (getUserCalls.push(["cookie"]), { data: { user: null } }) } }),
}));
const { weekOf, bearerToken, dvSession } = await import("./auth");

describe("weekOf", () => {
  it("returns the Monday of the week, in UTC", () => {
    expect(weekOf(new Date("2026-11-08T03:00:00Z"))).toBe("2026-11-02"); // Sunday → previous Monday
    expect(weekOf(new Date("2026-11-09T23:59:00Z"))).toBe("2026-11-09"); // Monday
    expect(weekOf(new Date("2026-11-11T12:00:00Z"))).toBe("2026-11-09"); // Wednesday
  });
});

describe("dvSession — the iOS app's bearer token", () => {
  beforeEach(() => {
    authHeader = null;
    getUserCalls.length = 0;
  });

  it("parses only a well-formed bearer header", () => {
    expect(bearerToken("Bearer abc.def")).toBe("abc.def");
    expect(bearerToken("bearer abc")).toBe("abc");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer ")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });

  it("verifies the bearer token with Supabase and acts as that user", async () => {
    authHeader = "Bearer good.jwt";
    const s = await dvSession();
    expect(s.user).toEqual({ id: "u1" });
    expect((s.db as unknown as { kind: string }).kind).toBe("bearer");
    expect(getUserCalls).toEqual([["bearer", "good.jwt", "good.jwt"]]);
  });

  it("a token Supabase rejects is no user, and never falls back to the cookie", async () => {
    authHeader = "Bearer forged";
    const s = await dvSession();
    expect(s.user).toBeNull();
    expect(getUserCalls).toEqual([["bearer", "forged", "forged"]]);
  });

  it("without a header the cookie session is used, as before", async () => {
    const s = await dvSession();
    expect((s.db as unknown as { kind: string }).kind).toBe("cookie");
  });
});
