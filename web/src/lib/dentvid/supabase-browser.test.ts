import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// @supabase/ssr keeps ONE browser client per page (whatever its URL) unless
// told otherwise. The root layout's ClipForge UTM capture creates ClipForge's
// client first for any visitor with a referrer or UTM tags; DentVideo's
// sign-in, logo upload and password reset then ran against ClipForge's
// project. dvBrowser() must always talk to Liman.

const LIMAN = "https://liman.example.test";
const CLIPFORGE = "https://clipforge.example.test";

function fakeBrowser() {
  const g = globalThis as Record<string, unknown>;
  g.window = globalThis;
  g.document = { cookie: "" };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_DENTVID_SUPABASE_URL", LIMAN);
  vi.stubEnv("NEXT_PUBLIC_DENTVID_SUPABASE_ANON_KEY", "dv-anon");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", CLIPFORGE);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "cf-anon");
  fakeBrowser();
});

// The fake window/document stay for the whole file: the clients' background
// session refresh may still run after a test ends (vitest isolates files).
afterEach(() => {
  vi.unstubAllEnvs();
});

const urlOf = (client: unknown) => (client as { supabaseUrl: string }).supabaseUrl;

describe("dvBrowser", () => {
  it("talks to Liman even when ClipForge's browser client was created first on the page", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const { dvBrowser } = await import("./supabase");
    expect(urlOf(createClient())).toBe(CLIPFORGE);
    expect(urlOf(dvBrowser())).toBe(LIMAN);
  });

  it("does not hand its client to ClipForge code created after it", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const { dvBrowser } = await import("./supabase");
    expect(urlOf(dvBrowser())).toBe(LIMAN);
    expect(urlOf(createClient())).toBe(CLIPFORGE);
  });

  it("reuses one client per page (one auth listener, one session)", async () => {
    const { dvBrowser } = await import("./supabase");
    expect(dvBrowser()).toBe(dvBrowser());
  });
});
