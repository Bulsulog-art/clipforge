import { describe, expect, it } from "vitest";
import { unsubscribeSecret, unsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe-token";
import { isBadOrigin } from "@/lib/origin-guard";

const A = "11111111-2222-4333-8444-555555555555";
const B = "99999999-2222-4333-8444-555555555555";

describe("unsubscribe token", () => {
  it("round-trips for the clinic it was made for", () => {
    const t = unsubscribeToken(A, "secret");
    expect(verifyUnsubscribeToken(t, "secret")).toBe(A);
    expect(verifyUnsubscribeToken(unsubscribeToken(A.toUpperCase(), "secret"), "secret")).toBe(A);
  });

  it("rejects another secret, another clinic, tampering and junk", () => {
    const t = unsubscribeToken(A, "secret");
    const [, sig] = t.split(".");
    expect(verifyUnsubscribeToken(t, "other")).toBeNull();
    expect(verifyUnsubscribeToken(`${B}.${sig}`, "secret")).toBeNull();
    expect(verifyUnsubscribeToken(`${t}x`, "secret")).toBeNull();
    expect(verifyUnsubscribeToken(`${t}.extra`, "secret")).toBeNull();
    expect(verifyUnsubscribeToken(t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"), "secret")).toBeNull();
    for (const junk of ["", "x", `${A}.`, `.${sig}`, "not-a-uuid." + sig, null, undefined]) expect(verifyUnsubscribeToken(junk, "secret")).toBeNull();
    expect(verifyUnsubscribeToken(t, null)).toBeNull();
    expect(() => unsubscribeToken("../etc", "secret")).toThrow();
  });

  it("uses its own secret, else the worker token, else none", () => {
    expect(unsubscribeSecret({ DENTVIDEO_UNSUBSCRIBE_SECRET: "a", WORKER_INTERNAL_TOKEN: "b" })).toBe("a");
    expect(unsubscribeSecret({ WORKER_INTERNAL_TOKEN: "b" })).toBe("b");
    expect(unsubscribeSecret({})).toBeNull();
  });

  it("one-click POSTs from mail providers (no Origin) reach the route", () => {
    expect(isBadOrigin({ pathname: "/api/dentvideo/unsubscribe", method: "POST", origin: null, authorization: null, allowed: ["https://dentvideo.com"] })).toBe(false);
    expect(isBadOrigin({ pathname: "/api/dentvideo/clinic", method: "POST", origin: null, authorization: null, allowed: ["https://dentvideo.com"] })).toBe(true);
  });
});
