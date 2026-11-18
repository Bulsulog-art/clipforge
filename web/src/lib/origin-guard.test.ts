import { describe, expect, it } from "vitest";
import { allowedOrigins, isBadOrigin, isMobileApiPath } from "./origin-guard";

const allowed = allowedOrigins({ NEXT_PUBLIC_APP_URL: "https://clipforge.bulsulabs.com/", NODE_ENV: "production" });
const base = { method: "POST", origin: null, authorization: null, allowed };

describe("isBadOrigin", () => {
  it("lets the iOS app upload: bearer token, no Origin header", () => {
    expect(
      isBadOrigin({ ...base, pathname: "/api/jobs/upload", authorization: "Bearer eyJhbGciOi.abc.def" }),
    ).toBe(false);
  });

  it("lets the iOS app send analytics the same way", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/events", authorization: "bearer tok" })).toBe(false);
  });

  it("still refuses a cookie-authenticated POST with no Origin", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/jobs" })).toBe(true);
  });

  it("still refuses a cookie-authenticated POST from another site", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/jobs", origin: "https://evil.example" })).toBe(true);
  });

  it("does not accept an empty bearer as a token", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/jobs", authorization: "Bearer " })).toBe(true);
  });

  it("allows the site's own origin", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/jobs", origin: "https://clipforge.bulsulabs.com" })).toBe(false);
  });

  it("ignores reads and non-API paths", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/jobs", method: "GET" })).toBe(false);
    expect(isBadOrigin({ ...base, pathname: "/login" })).toBe(false);
  });

  it("leaves webhooks to their own auth", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/revenuecat/webhook" })).toBe(false);
  });
});

describe("Dodo webhook", () => {
  it("is not blocked for having no Origin (it verifies its own signature)", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/dodo/webhook" })).toBe(false);
    // DentVideo's RevenueCat webhook (App Store purchases) authenticates its own Authorization header.
    expect(isBadOrigin({ ...base, pathname: "/api/dentvideo/revenuecat/webhook" })).toBe(false);
  });
});

describe("DentVideo routes", () => {
  it("keep the Origin check when a bearer header is sent (cookie-only routes)", () => {
    for (const pathname of ["/api/dentvideo/account/export", "/api/dentvideo/join", "/api/dentvideo/checkout"]) {
      expect(isBadOrigin({ ...base, pathname, authorization: "Bearer anything" }), pathname).toBe(true);
      expect(isBadOrigin({ ...base, pathname, authorization: "Bearer anything", origin: "https://evil.example" }), pathname).toBe(true);
      expect(isBadOrigin({ ...base, pathname, authorization: "Bearer anything", origin: "https://dentvideo.com" }), pathname).toBe(false);
    }
  });

  it("let the iOS app's bearer calls through on exactly the routes that verify the token", () => {
    const item = "/api/dentvideo/items/9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";
    for (const pathname of [item, "/api/dentvideo/account/delete"]) {
      expect(isBadOrigin({ ...base, method: "PATCH", pathname, authorization: "Bearer jwt" }), pathname).toBe(false);
      // Without the bearer header (a cookie request) the Origin check still applies.
      expect(isBadOrigin({ ...base, method: "PATCH", pathname }), pathname).toBe(true);
    }
    // Look-alikes and sub-routes are not exempt.
    for (const pathname of [`${item}/backgrounds`, "/api/dentvideo/items/x", "/api/dentvideo/account/delete/x", "/api/dentvideo/account/export"]) {
      expect(isBadOrigin({ ...base, pathname, authorization: "Bearer jwt" }), pathname).toBe(true);
    }
  });

  it("leave the worker's internal calls and the signed unsubscribe link alone", () => {
    expect(isBadOrigin({ ...base, pathname: "/api/internal/dentvideo/notify", authorization: "Bearer worker-token" })).toBe(false);
    expect(isBadOrigin({ ...base, pathname: "/api/dentvideo/unsubscribe" })).toBe(false);
  });

  it("exempt only the cookie-free iPhone API (/api/dentvideo/mobile/), with or without a bearer", () => {
    for (const pathname of ["/api/dentvideo/mobile/v1/session", "/api/dentvideo/mobile/v1/items/x", "/api/dentvideo/mobile/v1/account/delete"]) {
      expect(isBadOrigin({ ...base, pathname }), pathname).toBe(false);
      expect(isBadOrigin({ ...base, pathname, authorization: "Bearer a.b.c" }), pathname).toBe(false);
    }
    // Look-alikes stay guarded.
    for (const pathname of ["/api/dentvideo/mobile", "/api/dentvideo/mobileX/v1", "/api/dentvideo/items/mobile/v1"]) {
      expect(isMobileApiPath(pathname), pathname).toBe(false);
      expect(isBadOrigin({ ...base, pathname, authorization: "Bearer a.b.c" }), pathname).toBe(true);
    }
  });
});
