import { describe, expect, it, vi } from "vitest";
import {
  MemoryKv,
  VERIFY_RULES,
  checkCode,
  cleanCode,
  generateCode,
  hashCode,
  isEmailVerified,
  issueCode,
  pendingCode,
  verifiedAppMetadata,
  verifyKey,
  verifySecret,
} from "./verify-email";
import { exchangeRecovery } from "./verify-email-server";
import { codeEmail } from "./verify-email-message";

const USER = "7d1c6a0e-3b2f-4e5d-9a8b-1c2d3e4f5a6b";
const SECRET = "test-secret";
const T0 = Date.parse("2026-11-08T10:00:00Z");

function setup() {
  let now = T0;
  const kv = new MemoryKv(() => now);
  return { kv, at: (ms: number) => (now = T0 + ms), now: () => now };
}

const issue = (kv: MemoryKv, now: number, over: Partial<Parameters<typeof issueCode>[1]> = {}) =>
  issueCode(kv, { userId: USER, email: "Dr@Clinic.example", secret: SECRET, now, ...over });

describe("code generation and hashing", () => {
  it("is six digits, leading zeros kept", () => {
    expect(generateCode(() => 42)).toBe("000042");
    expect(generateCode(() => 999_999)).toBe("999999");
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it("stores only an HMAC bound to the user and the address", async () => {
    const { kv } = setup();
    const r = await issue(kv, T0, { rand: () => 123456 });
    expect(r).toEqual({ ok: true, code: "123456" });
    const raw = (await kv.get(verifyKey(USER)))!;
    expect(raw).not.toContain("123456");
    const rec = JSON.parse(raw);
    expect(rec.h).toBe(hashCode({ userId: USER, email: "dr@clinic.example", code: "123456", secret: SECRET }));
    expect(rec.h).not.toBe(hashCode({ userId: "someone-else", email: "dr@clinic.example", code: "123456", secret: SECRET }));
    expect(rec.h).not.toBe(hashCode({ userId: USER, email: "other@clinic.example", code: "123456", secret: SECRET }));
    expect(rec.h).not.toBe(hashCode({ userId: USER, email: "dr@clinic.example", code: "123456", secret: "other" }));
    expect(rec).toMatchObject({ email: "dr@clinic.example", attempts: 0, exp: T0 + 15 * 60_000 });
  });

  it("reads digits typed with spaces, Arabic-Indic or full-width numerals", () => {
    expect(cleanCode(" 123 456 ")).toBe("123456");
    expect(cleanCode("١٢٣٤٥٦")).toBe("123456");
    expect(cleanCode("１２３４５６")).toBe("123456");
  });

  it("uses a dedicated secret when set, else the service key, else none", () => {
    expect(verifySecret({ DENTVIDEO_VERIFY_SECRET: "a", DENTVID_SERVICE_ROLE_KEY: "b" })).toBe("a");
    expect(verifySecret({ DENTVID_SERVICE_ROLE_KEY: "b" })).toBe("b");
    expect(verifySecret({})).toBeNull();
  });
});

describe("checking a code", () => {
  it("accepts the right code once, case- and space-insensitively on the address", async () => {
    const { kv } = setup();
    await issue(kv, T0, { rand: () => 654321 });
    expect(await checkCode(kv, { userId: USER, email: " dr@clinic.EXAMPLE", code: "654 321", secret: SECRET, now: T0 + 1000 })).toEqual({ ok: true });
    // One use.
    expect(await checkCode(kv, { userId: USER, email: "dr@clinic.example", code: "654321", secret: SECRET, now: T0 + 2000 })).toEqual({ ok: false, reason: "none" });
  });

  it("expires after 15 minutes", async () => {
    const { kv, at } = setup();
    await issue(kv, T0, { rand: () => 111111 });
    at(VERIFY_RULES.ttlSec * 1000 - 1);
    expect(await checkCode(kv, { userId: USER, email: "dr@clinic.example", code: "000000", secret: SECRET, now: T0 + VERIFY_RULES.ttlSec * 1000 - 1 })).toMatchObject({ reason: "wrong" });
    // Past expiry the record is gone (Redis TTL) or refused (clock check).
    expect(await checkCode(kv, { userId: USER, email: "dr@clinic.example", code: "111111", secret: SECRET, now: T0 + VERIFY_RULES.ttlSec * 1000 })).toMatchObject({ ok: false });
    const { kv: kv2 } = setup();
    await issue(kv2, T0, { rand: () => 111111 });
    const rec = JSON.parse((await kv2.get(verifyKey(USER)))!);
    expect(rec.exp).toBe(T0 + VERIFY_RULES.ttlSec * 1000);
    expect(await checkCode(kv2, { userId: USER, email: "dr@clinic.example", code: "111111", secret: SECRET, now: rec.exp + 1 })).toEqual({ ok: false, reason: "expired" });
  });

  it("allows five tries, then the code is gone and a new one must be sent", async () => {
    const { kv } = setup();
    await issue(kv, T0, { rand: () => 222222 });
    const tryCode = (code: string) => checkCode(kv, { userId: USER, email: "dr@clinic.example", code, secret: SECRET, now: T0 + 5000 });
    expect(await tryCode("000001")).toEqual({ ok: false, reason: "wrong", attemptsLeft: 4 });
    expect(await tryCode("000002")).toEqual({ ok: false, reason: "wrong", attemptsLeft: 3 });
    expect(await tryCode("000003")).toEqual({ ok: false, reason: "wrong", attemptsLeft: 2 });
    expect(await tryCode("000004")).toEqual({ ok: false, reason: "wrong", attemptsLeft: 1 });
    expect(await tryCode("000005")).toEqual({ ok: false, reason: "locked" });
    // Even the right code no longer works.
    expect(await tryCode("222222")).toEqual({ ok: false, reason: "none" });
  });

  it("refuses anything that is not six digits without counting a try", async () => {
    const { kv } = setup();
    await issue(kv, T0);
    expect(await checkCode(kv, { userId: USER, email: "dr@clinic.example", code: "12345", secret: SECRET, now: T0 })).toEqual({ ok: false, reason: "malformed" });
    expect(JSON.parse((await kv.get(verifyKey(USER)))!).attempts).toBe(0);
  });

  it("a code sent to an earlier address does not verify a changed one", async () => {
    const { kv } = setup();
    await issue(kv, T0, { rand: () => 333333 });
    expect(await checkCode(kv, { userId: USER, email: "new@clinic.example", code: "333333", secret: SECRET, now: T0 + 1000 })).toMatchObject({ ok: false, reason: "wrong" });
  });
});

describe("resending", () => {
  it("waits 60 s between codes, and a new code replaces the old one", async () => {
    const { kv } = setup();
    const first = await issue(kv, T0, { rand: () => 444444 });
    expect(first.ok).toBe(true);
    expect(await issue(kv, T0 + 20_000)).toEqual({ ok: false, reason: "cooldown", retryAfterSec: 40 });
    const second = await issue(kv, T0 + 60_000, { rand: () => 555555 });
    expect(second).toEqual({ ok: true, code: "555555" });
    expect(await checkCode(kv, { userId: USER, email: "dr@clinic.example", code: "444444", secret: SECRET, now: T0 + 61_000 })).toMatchObject({ reason: "wrong" });
    expect(await checkCode(kv, { userId: USER, email: "dr@clinic.example", code: "555555", secret: SECRET, now: T0 + 62_000 })).toEqual({ ok: true });
  });

  it("onlyIfNone leaves a waiting code alone; an address correction skips the cooldown", async () => {
    const { kv } = setup();
    await issue(kv, T0, { rand: () => 666666 });
    expect(await issue(kv, T0 + 90_000, { onlyIfNone: true })).toEqual({ ok: false, reason: "pending" });
    expect(await pendingCode(kv, { userId: USER, email: "dr@clinic.example", now: T0 + 10_000 })).toEqual({ resendInSec: 50 });
    expect(await pendingCode(kv, { userId: USER, email: "new@clinic.example", now: T0 + 10_000 })).toBeNull();
    const fixed = await issue(kv, T0 + 5_000, { email: "new@clinic.example", ignoreCooldown: true, rand: () => 777777 });
    expect(fixed).toEqual({ ok: true, code: "777777" });
    expect(await checkCode(kv, { userId: USER, email: "new@clinic.example", code: "777777", secret: SECRET, now: T0 + 6_000 })).toEqual({ ok: true });
  });
});

describe("the verified flag", () => {
  it("holds only for the address it was proven for", () => {
    const meta = verifiedAppMetadata("Dr@Clinic.example", "code", new Date(T0));
    expect(meta).toEqual({ email_verified_at: new Date(T0).toISOString(), email_verified_for: "dr@clinic.example", email_verified_via: "code" });
    const app_metadata = { product: "dentvideo", ...meta };
    expect(isEmailVerified({ email: "dr@clinic.example", app_metadata })).toBe(true);
    expect(isEmailVerified({ email: "other@clinic.example", app_metadata })).toBe(false);
    // Accounts from before verification existed: confirmed by Supabase, not by us.
    expect(isEmailVerified({ email: "dr@clinic.example", app_metadata: { product: "dentvideo" } })).toBe(false);
    expect(isEmailVerified(null)).toBe(false);
  });

  it("ignores user_metadata, which the user can set themselves (PUT /auth/v1/user)", () => {
    const forged = { email: "dr@clinic.example", app_metadata: { product: "dentvideo" }, user_metadata: verifiedAppMetadata("dr@clinic.example", "code") };
    expect(isEmailVerified(forged)).toBe(false);
  });
});

describe("the code secret", () => {
  it("prefers DENTVIDEO_VERIFY_SECRET", () => {
    const warn = vi.fn();
    expect(verifySecret({ DENTVIDEO_VERIFY_SECRET: " own ", DENTVID_SERVICE_ROLE_KEY: "srk", NODE_ENV: "production" }, warn)).toBe("own");
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to the service-role key, warning once in production", () => {
    const warn = vi.fn();
    expect(verifySecret({ DENTVID_SERVICE_ROLE_KEY: "srk", NODE_ENV: "production" }, warn)).toBe("srk");
    expect(verifySecret({ DENTVID_SERVICE_ROLE_KEY: "srk", NODE_ENV: "production" }, warn)).toBe("srk");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("DENTVIDEO_VERIFY_SECRET");
    expect(verifySecret({}, warn)).toBeNull();
  });
});

describe("password reset proves ownership", () => {
  const session = { access_token: "at", refresh_token: "rt" };

  it("a successful recovery-token exchange marks the account verified and ends other sessions (reclaims a squatted address)", async () => {
    const markVerified = vi.fn(async () => true);
    const signOutOthers = vi.fn(async () => {});
    const r = await exchangeRecovery("hash-1", {
      verify: async () => ({ session, user: { id: USER, email: "dr@clinic.example", app_metadata: { product: "dentvideo" } } }),
      markVerified,
      signOutOthers,
      join: async () => true,
    });
    expect(r).toEqual({ access_token: "at", refresh_token: "rt", verified: true });
    expect(markVerified).toHaveBeenCalledWith(USER, "dr@clinic.example", "reset");
    expect(signOutOthers).toHaveBeenCalledWith("at");
  });

  it("a failure to end other sessions does not fail the exchange", async () => {
    const r = await exchangeRecovery("hash-1", {
      verify: async () => ({ session, user: { id: USER, email: "dr@clinic.example", app_metadata: {} } }),
      markVerified: async () => true,
      signOutOthers: async () => {
        throw new Error("down");
      },
      join: async () => true,
    });
    expect(r).toMatchObject({ verified: true });
  });

  it("an invalid or used token proves nothing", async () => {
    const markVerified = vi.fn(async () => true);
    const signOutOthers = vi.fn(async () => {});
    expect(await exchangeRecovery("bad", { verify: async () => ({ session: null, user: null }), markVerified, signOutOthers, join: async () => true })).toBeNull();
    expect(markVerified).not.toHaveBeenCalled();
    expect(signOutOthers).not.toHaveBeenCalled();
  });

  it("an already verified account is not written again and keeps its other sessions", async () => {
    const markVerified = vi.fn(async () => true);
    const signOutOthers = vi.fn(async () => {});
    const user = { id: USER, email: "dr@clinic.example", app_metadata: verifiedAppMetadata("dr@clinic.example", "code") };
    expect(await exchangeRecovery("h", { verify: async () => ({ session, user }), markVerified, signOutOthers, join: async () => true })).toMatchObject({ verified: true });
    expect(markVerified).not.toHaveBeenCalled();
    expect(signOutOthers).not.toHaveBeenCalled();
  });
});

describe("a reset link lets an account another app made with the address into DentVideo", () => {
  const session = { access_token: "at", refresh_token: "rt" };
  const base = { markVerified: async () => true, signOutOthers: async () => {} };

  it("adds DentVideo to an account no DentVideo marker is on", async () => {
    const join = vi.fn(async () => true);
    await exchangeRecovery("h", { ...base, join, verify: async () => ({ session, user: { id: USER, email: "dr@clinic.example", app_metadata: { provider: "email" } } }) });
    expect(join).toHaveBeenCalledWith(USER);
  });

  it("leaves a DentVideo account as it is", async () => {
    const join = vi.fn(async () => true);
    await exchangeRecovery("h", { ...base, join, verify: async () => ({ session, user: { id: USER, email: "dr@clinic.example", app_metadata: { product: "dentvideo" } } }) });
    expect(join).not.toHaveBeenCalled();
  });

  it("an invalid token joins nothing", async () => {
    const join = vi.fn(async () => true);
    await exchangeRecovery("bad", { ...base, join, verify: async () => ({ session: null, user: null }) });
    expect(join).not.toHaveBeenCalled();
  });
});

describe("the code email", () => {
  it("is in the visitor's language, carries the code, and flips for Arabic", () => {
    const tr = codeEmail({ language: "tr", code: "048213" });
    expect(tr.subject).toBe("DentVideo kodunuz: 048213");
    expect(tr.text).toContain("048 213");
    expect(tr.html).toContain('lang="tr" dir="ltr"');
    const ar = codeEmail({ language: "ar", code: "048213" });
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.html).toMatch(/<span dir="ltr"[^>]*style="font-family:'SF Mono'/);
    expect(codeEmail({ language: "it", code: "111111" }).subject).toBe("111111 is your DentVideo code");
  });
});
