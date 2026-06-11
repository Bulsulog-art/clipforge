import { describe, expect, test } from "vitest";
import {
  toSnapshotRow,
  adapterFor,
  fetchMetrics,
  mockAdapter,
  youtubeAdapter,
  tiktokAdapter,
  instagramAdapter,
} from "./metrics-adapters.js";

describe("metrics/toSnapshotRow", () => {
  test("maps present metrics onto a snapshot row", () => {
    const row = toSnapshotRow(
      { id: "pub-1", user_id: "user-1" },
      { views: 1000, likes: 80, comments: 12, shares: 20, watchTimeSeconds: 5000, meta: { source: "x" } },
    );
    expect(row).toEqual({
      publish_id: "pub-1",
      user_id: "user-1",
      views: 1000,
      likes: 80,
      comments: 12,
      shares: 20,
      watch_time_seconds: 5000,
      meta: { source: "x" },
    });
  });

  test("missing metrics become null (never fake zeros)", () => {
    const row = toSnapshotRow({ id: "p", user_id: "u" }, { likes: 5 });
    expect(row.views).toBeNull();
    expect(row.shares).toBeNull();
    expect(row.watch_time_seconds).toBeNull();
    expect(row.likes).toBe(5);
  });
});

describe("metrics/adapters", () => {
  test("adapterFor routes platforms to their live adapter", () => {
    expect(adapterFor("youtube")).toBe(youtubeAdapter);
    expect(adapterFor("tiktok")).toBe(tiktokAdapter);
    expect(adapterFor("instagram")).toBe(instagramAdapter);
  });

  test("unknown platform + forced mock fall back to the mock adapter", () => {
    expect(adapterFor("facebook")).toBe(mockAdapter);
    expect(adapterFor("youtube", true)).toBe(mockAdapter);
  });

  test("mock metrics are deterministic + plausibly shaped", async () => {
    const a = await mockAdapter({ accessToken: "t", externalPostId: "abc123" });
    const b = await mockAdapter({ accessToken: "t", externalPostId: "abc123" });
    expect(a).toEqual(b); // same id → same numbers (no Math.random)
    expect(a!.views!).toBeGreaterThan(0);
    expect(a!.likes!).toBeLessThan(a!.views!); // likes < views
  });

  test("fetchMetrics with mock returns metrics for any platform, no network", async () => {
    const m = await fetchMetrics("tiktok", { accessToken: "t", externalPostId: "vid-9" }, true);
    expect(m?.views).toBeGreaterThan(0);
  });

  test("fetchMetrics swallows adapter errors → null (a broken platform never kills the run)", async () => {
    const throwing = async () => {
      throw new Error("boom");
    };
    const m = await fetchMetrics("youtube", { accessToken: "t", externalPostId: "x" }, false, throwing);
    expect(m).toBeNull();
  });
});
