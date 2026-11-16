import { describe, it, expect, vi } from "vitest";

// dvBearer must act AS the token's user: the public anon key plus the user's
// JWT, so RLS applies. Built with the service-role key it would bypass RLS.

process.env.NEXT_PUBLIC_DENTVID_SUPABASE_URL = "https://db.example";
process.env.NEXT_PUBLIC_DENTVID_SUPABASE_ANON_KEY = "anon-key";
process.env.DENTVID_SERVICE_ROLE_KEY = "service-role-key";

const calls: { url: string; key: string; opts: { global?: { headers?: Record<string, string> }; auth?: Record<string, unknown> } }[] = [];
vi.mock("@supabase/supabase-js", async (orig) => {
  const real = await orig<typeof import("@supabase/supabase-js")>();
  return {
    ...real,
    createClient: (url: string, key: string, opts: never) => {
      calls.push({ url, key, opts });
      return real.createClient(url, key, opts);
    },
  };
});

const { dvBearer } = await import("./supabase");

describe("dvBearer", () => {
  it("uses the anon key and the user's token, never the service role", () => {
    calls.length = 0;
    dvBearer("user.jwt");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://db.example");
    expect(calls[0].key).toBe("anon-key");
    expect(calls[0].key).not.toBe(process.env.DENTVID_SERVICE_ROLE_KEY);
    expect(calls[0].opts.global?.headers?.Authorization).toBe("Bearer user.jwt");
    expect(calls[0].opts.auth?.persistSession).toBe(false);
  });
});
