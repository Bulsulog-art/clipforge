import { describe, expect, it } from "vitest";
import { GET } from "./route";

const ask = async (headers: Record<string, string>) => {
  const res = GET(new Request("https://dentvideo.com/api/dentvideo/geo", { headers }));
  return { body: (await res.json()) as Record<string, unknown>, res };
};

describe("GET /api/dentvideo/geo", () => {
  it("answers yes/no from the edge's country header, never the country itself", async () => {
    expect((await ask({ "cf-ipcountry": "DE" })).body).toEqual({ consentRequired: true });
    expect((await ask({ "cf-ipcountry": "CH" })).body).toEqual({ consentRequired: true });
    expect((await ask({ "cf-ipcountry": "TR" })).body).toEqual({ consentRequired: false });
    expect((await ask({ "x-vercel-ip-country": "US" })).body).toEqual({ consentRequired: false });
  });

  it("an unknown country asks first", async () => {
    expect((await ask({})).body).toEqual({ consentRequired: true });
    expect((await ask({ "cf-ipcountry": "XX" })).body).toEqual({ consentRequired: true });
  });

  it("is never cached by a shared cache and sets no cookie", async () => {
    const { res } = await ask({ "cf-ipcountry": "TR" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
