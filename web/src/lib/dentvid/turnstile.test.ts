import { describe, expect, it, vi } from "vitest";
import { TURNSTILE_VERIFY_URL, turnstileEnabled, verifyTurnstile } from "./turnstile";

const on = { TURNSTILE_SECRET_KEY: "0x-secret", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x-site" };
const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("Turnstile", () => {
  it("is off unless both keys are set, and then lets everything through", async () => {
    expect(turnstileEnabled({})).toBe(false);
    expect(turnstileEnabled({ TURNSTILE_SECRET_KEY: "x" })).toBe(false);
    expect(turnstileEnabled(on)).toBe(true);
    const fetch = reply({ success: false });
    expect(await verifyTurnstile(undefined, "1.2.3.4", { env: {}, fetch })).toEqual({ ok: true, skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("when on: needs a token and Cloudflare's yes", async () => {
    expect(await verifyTurnstile(undefined, "1.2.3.4", { env: on, fetch: reply({ success: true }) })).toEqual({ ok: false, reason: "missing" });
    const yes = reply({ success: true });
    expect(await verifyTurnstile("tok", "1.2.3.4", { env: on, fetch: yes })).toEqual({ ok: true });
    const [url, init] = yes.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const sent = new URLSearchParams(init.body as URLSearchParams);
    expect(sent.get("secret")).toBe("0x-secret");
    expect(sent.get("response")).toBe("tok");
    expect(sent.get("remoteip")).toBe("1.2.3.4");
    expect(await verifyTurnstile("tok", "1.2.3.4", { env: on, fetch: reply({ success: false }) })).toEqual({ ok: false, reason: "rejected" });
  });

  it("fails closed when Cloudflare cannot be reached", async () => {
    expect(await verifyTurnstile("tok", null, { env: on, fetch: reply({}, 500) })).toEqual({ ok: false, reason: "unavailable" });
    const down = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    expect(await verifyTurnstile("tok", null, { env: on, fetch: down as unknown as typeof fetch })).toEqual({ ok: false, reason: "unavailable" });
  });
});
