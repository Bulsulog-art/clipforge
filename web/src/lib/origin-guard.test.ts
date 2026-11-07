import { describe, expect, it } from "vitest";
import { allowedOrigins, isBadOrigin } from "./origin-guard";

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
  });
});
