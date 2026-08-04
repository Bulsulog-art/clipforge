import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { appOrigin, appUrl } from "./app-url";

/**
 * The bug these guard against was live in production: every redirect resolved
 * to the Docker container's hostname, so "Connect your YouTube account" sent
 * people to `https://89703a684f8a:3000/login`.
 */
function reqWith(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("appOrigin", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
  });

  it("prefers the configured app url", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://clipforge.bulsulabs.com";
    expect(appOrigin(reqWith("http://89703a684f8a:3000/api/auth/youtube")))
      .toBe("https://clipforge.bulsulabs.com");
  });

  it("strips a trailing slash from the configured value", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://clipforge.bulsulabs.com/";
    expect(appOrigin()).toBe("https://clipforge.bulsulabs.com");
  });

  it("ignores a configured value that points at a container host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://89703a684f8a:3000";
    expect(appOrigin()).toBe("https://clipforge.bulsulabs.com");
  });

  it("falls back to the proxy's forwarded host", () => {
    const req = reqWith("http://89703a684f8a:3000/api/auth/tiktok", {
      "x-forwarded-host": "clipforge.bulsulabs.com",
      "x-forwarded-proto": "https",
    });
    expect(appOrigin(req)).toBe("https://clipforge.bulsulabs.com");
  });

  it("never returns the container host, even with no other signal", () => {
    const req = reqWith("http://89703a684f8a:3000/api/auth/instagram");
    expect(appOrigin(req)).toBe("https://clipforge.bulsulabs.com");
  });

  it("rejects private network hosts", () => {
    for (const host of ["10.0.0.4:3000", "172.17.0.2:3000", "192.168.1.9:3000"]) {
      expect(appOrigin(reqWith(`http://${host}/x`))).toBe("https://clipforge.bulsulabs.com");
    }
  });

  it("uses a real request origin when it is publicly reachable", () => {
    const req = reqWith("https://staging.clipforge.dev/api/auth/x");
    expect(appOrigin(req)).toBe("https://staging.clipforge.dev");
  });
});

describe("appUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://clipforge.bulsulabs.com";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("builds absolute urls for paths", () => {
    expect(appUrl("/login")).toBe("https://clipforge.bulsulabs.com/login");
  });

  it("keeps query strings intact", () => {
    expect(appUrl("/dashboard/social?error=youtube_not_configured"))
      .toBe("https://clipforge.bulsulabs.com/dashboard/social?error=youtube_not_configured");
  });

  it("does not double the slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://clipforge.bulsulabs.com/";
    expect(appUrl("/api/auth/youtube/callback"))
      .toBe("https://clipforge.bulsulabs.com/api/auth/youtube/callback");
  });
});
