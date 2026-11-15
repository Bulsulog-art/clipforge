import { describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>([
  ["sb-dv-auth-token", "x"],
  ["dv-step", "plan"],
  ["dv-lang", "de"],
]);

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n) } : undefined),
    delete: (n: string) => void jar.delete(n),
  }),
}));
vi.mock("@/lib/dentvid/supabase", () => ({ dvServer: () => ({ auth: {} }), dvAdmin: () => ({ auth: { admin: {} } }) }));
vi.mock("@/lib/dentvid/sign-out", () => ({
  isDvAuthCookieName: (n: string) => n.startsWith("sb-dv-auth"),
  signOutEverywhere: async () => ({ global: true }),
}));

const { POST } = await import("./route");

describe("POST /api/dentvideo/signout", () => {
  it("clears the auth cookies and the wizard's dv-step cookie, and keeps the language", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(jar.has("sb-dv-auth-token")).toBe(false);
    expect(jar.has("dv-step")).toBe(false);
    expect(jar.get("dv-lang")).toBe("de");
  });
});
