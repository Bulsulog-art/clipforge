import { describe, expect, it } from "vitest";
import { DV_AUTH_COOKIE, hasDvSessionCookie } from "./session-cookie";
import { COOKIE_NAME } from "./supabase";

describe("DentVideo session cookie", () => {
  it("is the cookie the Supabase clients use", () => {
    expect(COOKIE_NAME).toBe(DV_AUTH_COOKIE);
  });

  it("sees a whole or chunked session", () => {
    expect(hasDvSessionCookie("dv-auth=base64-eyJ")).toBe(true);
    expect(hasDvSessionCookie("dv-lang=tr; dv-auth.0=base64-eyJ; dv-auth.1=abc")).toBe(true);
    expect(hasDvSessionCookie("a=1;dv-auth.0=x")).toBe(true);
  });

  it("is not fooled by other cookies, empty values or look-alikes", () => {
    expect(hasDvSessionCookie("")).toBe(false);
    expect(hasDvSessionCookie(null)).toBe(false);
    expect(hasDvSessionCookie("dv-auth=")).toBe(false);
    expect(hasDvSessionCookie("dv-auth-code-verifier=x; dv-step=plan")).toBe(false);
    expect(hasDvSessionCookie("sb-xyz-auth-token=x; dv-authx=1; xdv-auth=1")).toBe(false);
  });
});
