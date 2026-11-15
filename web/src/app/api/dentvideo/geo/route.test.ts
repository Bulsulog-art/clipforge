import { afterEach, describe, expect, it, vi } from "vitest";

// The country database: a fake reader keyed by address (the real reader is tested in lib/dentvid/geo-ip.test.ts).
const DB: Record<string, string> = { "88.255.1.1": "TR", "194.25.3.4": "DE", "203.0.113.9": "CH", "8.8.8.8": "US" };
vi.mock("mmdb-lib", () => ({
  Reader: class {
    get(ip: string) {
      return DB[ip] ? { country: { iso_code: DB[ip] } } : null;
    }
  },
}));
vi.mock("node:fs", async (orig) => {
  const fs = (await orig()) as typeof import("node:fs");
  return { ...fs, default: { ...fs, readFileSync: () => Buffer.alloc(0) } };
});

const { GET } = await import("./route");
const { resetCountryReader } = await import("@/lib/dentvid/geo-ip");

const ask = async (headers: Record<string, string>) => {
  const res = GET(new Request("https://dentvideo.com/api/dentvideo/geo", { headers }));
  return { body: (await res.json()) as Record<string, unknown>, res };
};

afterEach(() => {
  vi.unstubAllEnvs();
  resetCountryReader();
});

describe("GET /api/dentvideo/geo", () => {
  it("returns the country of the connecting address (never the IP) and whether ad-click consent is needed", async () => {
    expect((await ask({ "x-forwarded-for": "88.255.1.1" })).body).toEqual({ country: "TR", consentRequired: false });
    expect((await ask({ "x-forwarded-for": "194.25.3.4" })).body).toEqual({ country: "DE", consentRequired: true });
    expect((await ask({ "x-forwarded-for": "203.0.113.9" })).body).toEqual({ country: "CH", consentRequired: true });
    expect((await ask({ "x-real-ip": "8.8.8.8" })).body).toEqual({ country: "US", consentRequired: false });
  });

  it("ignores a client-sent CF-IPCountry (or similar): a German visitor cannot skip the consent prompt by claiming TR", async () => {
    for (const spoof of ["cf-ipcountry", "x-vercel-ip-country", "x-country-code"]) {
      expect((await ask({ [spoof]: "TR", "x-forwarded-for": "194.25.3.4" })).body, spoof).toEqual({ country: "DE", consentRequired: true });
      expect((await ask({ [spoof]: "TR" })).body, spoof).toEqual({ country: null, consentRequired: true });
    }
    // Nor by prepending a Turkish address to X-Forwarded-For (Traefik appends the real one last).
    expect((await ask({ "x-forwarded-for": "88.255.1.1, 194.25.3.4" })).body).toEqual({ country: "DE", consentRequired: true });
  });

  it("trusts an edge header only with DENTVID_TRUST_EDGE_COUNTRY=1", async () => {
    vi.stubEnv("DENTVID_TRUST_EDGE_COUNTRY", "1");
    expect((await ask({ "cf-ipcountry": "tr", "x-forwarded-for": "194.25.3.4" })).body).toEqual({ country: "TR", consentRequired: false });
  });

  it("an unknown country: null, and consent is asked first", async () => {
    for (const headers of [{}, { "x-forwarded-for": "10.0.0.1" }, { "x-forwarded-for": "not-an-ip" }] as Record<string, string>[]) {
      expect((await ask(headers)).body).toEqual({ country: null, consentRequired: true });
    }
  });

  it("is cached in the browser only, sets no cookie and does not echo the address", async () => {
    const { res, body } = await ask({ "x-forwarded-for": "88.255.1.1" });
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(JSON.stringify(body)).not.toContain("88.255");
  });
});
