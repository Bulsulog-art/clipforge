import { describe, expect, it } from "vitest";
import { GET } from "./route";

const ask = async (headers: Record<string, string>) => {
  const res = GET(new Request("https://dentvideo.com/api/dentvideo/geo", { headers }));
  return { body: (await res.json()) as Record<string, unknown>, res };
};

describe("GET /api/dentvideo/geo", () => {
  it("returns the edge's country (never the IP) and whether ad-click consent is needed", async () => {
    expect((await ask({ "cf-ipcountry": "tr", "x-forwarded-for": "203.0.113.9" })).body).toEqual({ country: "TR", consentRequired: false });
    expect((await ask({ "cf-ipcountry": "DE" })).body).toEqual({ country: "DE", consentRequired: true });
    expect((await ask({ "cf-ipcountry": "CH" })).body).toEqual({ country: "CH", consentRequired: true });
    expect((await ask({ "x-vercel-ip-country": "US" })).body).toEqual({ country: "US", consentRequired: false });
  });

  it("an unknown country: null, and consent is asked first", async () => {
    for (const headers of [{}, { "cf-ipcountry": "XX" }, { "cf-ipcountry": "T1" }] as Record<string, string>[]) {
      expect((await ask(headers)).body).toEqual({ country: null, consentRequired: true });
    }
  });

  it("is cached in the browser only and sets no cookie", async () => {
    const { res } = await ask({ "cf-ipcountry": "TR" });
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
