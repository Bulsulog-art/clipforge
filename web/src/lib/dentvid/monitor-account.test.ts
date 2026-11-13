import { describe, expect, it, vi } from "vitest";
import { isMonitorEmail, isMonitorSignup, monitorAuthorised } from "./monitor-account";
import { sendVerificationCode } from "./verify-email-server";

const TOKEN = "monitor-token-0123456789abcdef";

describe("monitor accounts", () => {
  it("recognises e2e-monitor addresses only", () => {
    expect(isMonitorEmail("e2e-monitor+1731400000000abc@bulsulabs.com")).toBe(true);
    expect(isMonitorEmail("E2E-Monitor+smoke-1@bulsulabs.com ")).toBe(true);
    expect(isMonitorEmail("e2e-monitor@bulsulabs.com")).toBe(true);
    expect(isMonitorEmail("e2e-funnel@bulsulabs.com")).toBe(false);
    expect(isMonitorEmail("dr.e2e-monitor+1@clinic.example")).toBe(false);
    expect(isMonitorEmail("e2e-monitorx@bulsulabs.com")).toBe(false);
    expect(isMonitorEmail(null)).toBe(false);
  });

  it("the token must be configured (16+ characters) and match exactly", () => {
    expect(monitorAuthorised(TOKEN, { DENTVIDEO_MONITOR_TOKEN: TOKEN })).toBe(true);
    expect(monitorAuthorised(`${TOKEN}x`, { DENTVIDEO_MONITOR_TOKEN: TOKEN })).toBe(false);
    expect(monitorAuthorised(TOKEN, {})).toBe(false);
    expect(monitorAuthorised("", { DENTVIDEO_MONITOR_TOKEN: "" })).toBe(false);
    expect(monitorAuthorised("short", { DENTVIDEO_MONITOR_TOKEN: "short" })).toBe(false);
    expect(isMonitorSignup("e2e-monitor+1@bulsulabs.com", TOKEN, { DENTVIDEO_MONITOR_TOKEN: TOKEN })).toBe(true);
    expect(isMonitorSignup("dr@clinic.example", TOKEN, { DENTVIDEO_MONITOR_TOKEN: TOKEN })).toBe(false);
  });

  it("no verification email is ever sent to a monitor address", async () => {
    const send = vi.fn(async () => true);
    const kv = { get: vi.fn(), set: vi.fn(), del: vi.fn(), incr: vi.fn() } as never;
    expect(await sendVerificationCode({ userId: "u", email: "e2e-monitor+1@bulsulabs.com", language: "en", send, kv })).toEqual({ ok: true });
    expect(send).not.toHaveBeenCalled();
  });
});
