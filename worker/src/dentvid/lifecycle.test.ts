import { afterEach, describe, expect, it, vi } from "vitest";
import { LIFECYCLE_SCHEDULE, runLifecycle } from "./lifecycle.js";

describe("hourly lifecycle run", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("runs once an hour, off the top of the hour", () => {
    expect(LIFECYCLE_SCHEDULE.pattern).toBe("23 * * * *");
    expect(LIFECYCLE_SCHEDULE.tz).toBe("UTC");
  });

  it("asks the web app to send due reminders, with the internal token", async () => {
    process.env.WORKER_INTERNAL_TOKEN = "tok";
    delete process.env.DENTVIDEO_APP_URL;
    const f = vi.fn(async () => new Response(JSON.stringify({ due: 2, sent: 2, failed: 0, skipped: {} }), { status: 200 }));
    const r = await runLifecycle(f as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://dentvideo.com/api/internal/dentvideo/lifecycle");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
  });

  it("does nothing without a token, and never throws", async () => {
    delete process.env.WORKER_INTERNAL_TOKEN;
    const f = vi.fn();
    expect((await runLifecycle(f as unknown as typeof fetch)).ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
    process.env.WORKER_INTERNAL_TOKEN = "tok";
    const down = vi.fn(async () => {
      throw new Error("down");
    });
    expect((await runLifecycle(down as unknown as typeof fetch)).ok).toBe(false);
  });
});
