import { describe, expect, it } from "vitest";
import { resetRequestOutcome, signedOutMode, stepAfterSignIn } from "./start-mode";
import { MAX_PASSWORD_BYTES, passwordTooLong, resetSaveOutcome } from "./password";
import { AUTH_COPY } from "@/content/dentvideo-auth";
import { LOCALES } from "@/content/dentvideo-locales";

const q = (s: string) => new URLSearchParams(s);

describe("signedOutMode", () => {
  it("shows sign-in for links from people who have an account", () => {
    expect(signedOutMode(q("step=plan&lang=tr"))).toBe("signin"); // activation email
    expect(signedOutMode(q("step=preview"))).toBe("signin");
    expect(signedOutMode(q("mode=signin"))).toBe("signin"); // /app while signed out
  });
  it("keeps sign-up for everyone else, and an explicit mode wins", () => {
    expect(signedOutMode(q(""))).toBe("signup");
    expect(signedOutMode(q("lang=de&demo=abc&utm_source=demo"))).toBe("signup");
    expect(signedOutMode(q("step=account"))).toBe("signup");
    expect(signedOutMode(q("step=nonsense"))).toBe("signup");
    expect(signedOutMode(q("mode=forgot&step=plan"))).toBe("forgot");
    expect(signedOutMode(q("mode=signup&step=plan"))).toBe("signup");
  });
});

describe("stepAfterSignIn", () => {
  it("returns to the step the link asked for", () => {
    expect(stepAfterSignIn(q("step=plan"))).toBe("plan");
    expect(stepAfterSignIn(q("mode=signin"))).toBeNull();
    expect(stepAfterSignIn(q("step=account"))).toBeNull();
    expect(stepAfterSignIn(q("step=../../evil"))).toBeNull();
  });
});

describe("resetRequestOutcome (forgot password)", () => {
  const res = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  it("says the link is on its way only on 200", async () => {
    expect(await resetRequestOutcome(res(200, { ok: true }), "failed")).toEqual({ ok: true });
  });
  it("shows the API's refusal (too many attempts), not 'sent'", async () => {
    expect(await resetRequestOutcome(res(429, { error: "Zu viele Versuche." }), "failed")).toEqual({ ok: false, error: "Zu viele Versuche." });
  });
  it("falls back when there is no answer or no message", async () => {
    expect(await resetRequestOutcome(null, "failed")).toEqual({ ok: false, error: "failed" });
    expect(await resetRequestOutcome({ ok: false, status: 429, json: async () => Promise.reject(new Error("html")) }, "failed")).toEqual({ ok: false, error: "failed" });
    expect(await resetRequestOutcome(res(403, { error: "Bad Origin" }), "failed")).toEqual({ ok: false, error: "failed" });
    expect(await resetRequestOutcome(res(502, { error: "Bad Gateway" }), "failed")).toEqual({ ok: false, error: "failed" });
  });
});

describe("password limits", () => {
  it("refuses over 72 bytes, counting bytes not characters", () => {
    expect(passwordTooLong("a".repeat(MAX_PASSWORD_BYTES))).toBe(false);
    expect(passwordTooLong("a".repeat(MAX_PASSWORD_BYTES + 1))).toBe(true);
    expect(passwordTooLong("ş".repeat(37))).toBe(true); // 74 bytes, 37 characters
    expect(passwordTooLong("şifre-güzel-2026")).toBe(false);
  });
  it("every language explains the limit", () => {
    for (const l of LOCALES) expect(AUTH_COPY[l].passwordTooLong).toMatch(/72/);
  });
  it("/reset: the same password as before is not 'link expired'", () => {
    expect(resetSaveOutcome(null)).toBe("saved");
    expect(resetSaveOutcome({ code: "same_password", message: "New password should be different from the old password." })).toBe("saved");
    expect(resetSaveOutcome({ message: "Password cannot be longer than 72 characters" })).toBe("tooLong");
    expect(resetSaveOutcome({ code: "session_not_found", message: "Auth session missing!" })).toBe("invalid");
  });
});
