import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const getSession = vi.fn();
let pendingSet: { name: string; value: string; options: Record<string, unknown> }[] = [];
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_u: string, _k: string, opts: { cookieOptions: { name: string }; cookies: { setAll: (a: typeof pendingSet) => void } }) => ({
    auth: {
      getSession: async () => {
        await getSession(opts.cookieOptions.name);
        if (pendingSet.length) opts.cookies.setAll(pendingSet);
        return { data: { session: null } };
      },
    },
  }),
}));

const { shouldRefreshDvSession, withFreshDvSession } = await import("./session-refresh");

const SIGNED_IN = "dv-auth=base64-abc; other=1";

describe("shouldRefreshDvSession", () => {
  it("refreshes a signed-in clinic's per-person pages", () => {
    for (const p of ["/dentvideo/app", "/dentvideo/app/settings", "/dentvideo/start", "/dentvideo/admin"]) {
      expect(shouldRefreshDvSession(p, "GET", SIGNED_IN)).toBe(true);
    }
    expect(shouldRefreshDvSession("/dentvideo/start", "GET", "dv-auth.0=a; dv-auth.1=b")).toBe(true);
  });

  it("never touches public, cacheable pages, files, share images, other methods, or visitors without a session", () => {
    expect(shouldRefreshDvSession("/dentvideo", "GET", SIGNED_IN)).toBe(false);
    expect(shouldRefreshDvSession("/dentvideo/tr", "GET", SIGNED_IN)).toBe(false);
    expect(shouldRefreshDvSession("/dentvideo/guides", "GET", SIGNED_IN)).toBe(false);
    expect(shouldRefreshDvSession("/dentvideo/preview/en/x.mp3", "GET", SIGNED_IN)).toBe(false);
    expect(shouldRefreshDvSession("/dentvideo/de/opengraph-image", "GET", SIGNED_IN)).toBe(false);
    expect(shouldRefreshDvSession("/dentvideo/app", "POST", SIGNED_IN)).toBe(false);
    expect(shouldRefreshDvSession("/dentvideo/app", "GET", "other=1")).toBe(false);
    expect(shouldRefreshDvSession("/dentvideo/app", "GET", "dv-auth=")).toBe(false);
    expect(shouldRefreshDvSession("/dashboard", "GET", SIGNED_IN)).toBe(false);
  });
});

describe("withFreshDvSession", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DENTVID_SUPABASE_URL", "https://liman.example");
    vi.stubEnv("NEXT_PUBLIC_DENTVID_SUPABASE_ANON_KEY", "anon");
    getSession.mockReset();
    pendingSet = [];
  });
  afterEach(() => vi.unstubAllEnvs());

  const req = () => new NextRequest("https://dentvideo.com/app", { headers: { cookie: "dv-auth=old" } });

  it("a valid session: the response is left alone, using DentVideo's cookie name", async () => {
    const r = req();
    const res = await withFreshDvSession(r, () => NextResponse.next({ request: r }));
    expect(getSession).toHaveBeenCalledWith("dv-auth");
    expect(res.cookies.getAll()).toEqual([]);
  });

  it("a refreshed session: new cookies go on the response and on the request the page renders with", async () => {
    pendingSet = [{ name: "dv-auth", value: "new", options: { path: "/", sameSite: "lax" } }];
    const r = req();
    const res = await withFreshDvSession(r, () => NextResponse.next({ request: r }));
    expect(res.cookies.get("dv-auth")?.value).toBe("new");
    expect(r.cookies.get("dv-auth")?.value).toBe("new");
    expect(r.headers.get("cookie")).toContain("dv-auth=new");
  });

  it("Liman unreachable: the page is still served", async () => {
    getSession.mockRejectedValueOnce(new Error("fetch failed"));
    const r = req();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await withFreshDvSession(r, () => NextResponse.next({ request: r }));
    expect(res.status).toBe(200);
    warn.mockRestore();
  });

  it("not configured: no session work", async () => {
    vi.stubEnv("NEXT_PUBLIC_DENTVID_SUPABASE_URL", "");
    const r = req();
    await withFreshDvSession(r, () => NextResponse.next({ request: r }));
    expect(getSession).not.toHaveBeenCalled();
  });
});
