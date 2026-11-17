import { describe, expect, it, vi } from "vitest";
import { isDvAuthCookieName, signOutEverywhere, type SignOutDeps } from "./sign-out";
import { signOutDentvideo } from "./sign-out-client";

function deps(over: Partial<SignOutDeps> & { answers?: ({ status?: number; message?: string } | null)[] } = {}) {
  const revoked: string[] = [];
  const answers = [...(over.answers ?? [null])];
  const d: SignOutDeps = {
    session: over.session ?? (async () => ({ access_token: "stale" })),
    refresh: over.refresh ?? (async () => ({ access_token: "fresh" })),
    revoke:
      over.revoke ??
      (async (jwt, scope) => {
        expect(scope).toBe("global");
        revoked.push(jwt);
        return answers.shift() ?? null;
      }),
  };
  return { d, revoked };
}

describe("signing out everywhere", () => {
  it("revokes every session with the server's token", async () => {
    const { d, revoked } = deps();
    expect(await signOutEverywhere(d)).toEqual({ global: true });
    expect(revoked).toEqual(["stale"]);
  });

  it("a refused token (the 401 from logout?scope=global) is refreshed once and revoked again", async () => {
    const { d, revoked } = deps({ answers: [{ status: 401, message: "invalid JWT" }, null] });
    expect(await signOutEverywhere(d)).toEqual({ global: true });
    expect(revoked).toEqual(["stale", "fresh"]);
    const forbidden = deps({ answers: [{ status: 403, message: "session_not_found" }, null] });
    expect(await signOutEverywhere(forbidden.d)).toEqual({ global: true });
  });

  it("says so when the other sessions could not be ended", async () => {
    const noRefresh = deps({ answers: [{ status: 401 }], refresh: async () => null });
    expect((await signOutEverywhere(noRefresh.d)).global).toBe(false);
    const down = deps({ answers: [{ status: 500, message: "boom" }] });
    expect(await signOutEverywhere(down.d)).toEqual({ global: false, error: "500 boom" });
    const throwing = deps({ revoke: async () => Promise.reject(new Error("network")) });
    expect((await signOutEverywhere(throwing.d)).global).toBe(false);
  });

  it("no session, or an account that no longer exists: nothing left to end", async () => {
    expect(await signOutEverywhere(deps({ session: async () => null }).d)).toEqual({ global: true });
    expect(await signOutEverywhere(deps({ answers: [{ status: 404 }] }).d)).toEqual({ global: true });
  });

  it("clears exactly this browser's DentVideo session cookies", () => {
    for (const n of ["dv-auth", "dv-auth.0", "dv-auth.12", "dv-auth-code-verifier"]) expect(isDvAuthCookieName(n), n).toBe(true);
    for (const n of ["dv-lang", "dv-step", "dv-demo", "sb-abc-auth-token", "dv-authx", "dv-auth.x"]) expect(isDvAuthCookieName(n), n).toBe(false);
  });
});

describe("sign-out from the browser", () => {
  it("asks the server, and reports whether every session ended", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, global: true }), { status: 200 }));
    expect(await signOutDentvideo(fetcher as unknown as typeof fetch)).toEqual({ global: true });
    expect(fetcher).toHaveBeenCalledWith("/api/dentvideo/signout", { method: "POST", credentials: "same-origin" });
  });
});
