import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/dentvideo/geo", () => {
  it("returns the edge's country (never the IP), cached in the browser only", async () => {
    const res = GET(new Request("https://dentvideo.com/api/dentvideo/geo", { headers: { "cf-ipcountry": "tr", "x-forwarded-for": "203.0.113.9" } }));
    expect(await res.json()).toEqual({ country: "TR" });
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
  });

  it("null when the edge sends no usable country", async () => {
    for (const headers of [{}, { "cf-ipcountry": "XX" }, { "cf-ipcountry": "T1" }] as Record<string, string>[]) {
      const res = GET(new Request("https://dentvideo.com/api/dentvideo/geo", { headers }));
      expect(await res.json()).toEqual({ country: null });
    }
  });
});
