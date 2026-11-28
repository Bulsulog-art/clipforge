import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "agent-token-0123456789abcdefghijklmnop"; // 38 chars
const AGENT = "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

const created: { input: Record<string, unknown>; logo: { ext: string } | null; by: string }[] = [];
const fetched: string[] = [];
const limitKeys: string[] = [];
let limitOk = true;
let logoFetch: (url: string) => Promise<unknown>;

vi.mock("@/lib/rate-limit-server", () => ({
  limitChecks: async (checks: { key: string }[]) => {
    limitKeys.push(...checks.map((c) => c.key));
    return limitOk ? { ok: true, remaining: 1, retryAfterSec: 0 } : { ok: false, remaining: 0, retryAfterSec: 120 };
  },
}));
vi.mock("@/lib/dentvid/demos-server", () => ({
  createDemo: async (input: Record<string, unknown>, logo: { ext: string } | null, by: string) => {
    created.push({ input, logo, by });
    return { ok: true, demo: { token: "Ab3dE5fG7hJ", expires_at: "2027-01-10T12:00:00.000Z" } };
  },
}));
vi.mock("@/lib/dentvid/safe-image-fetch", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/dentvid/safe-image-fetch")>();
  return {
    ...real,
    fetchImageSafely: async (url: string) => {
      fetched.push(url);
      return logoFetch(url);
    },
  };
});

function request(body: unknown, auth: string | null = `Bearer ${TOKEN}`) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth !== null) headers.authorization = auth;
  return new Request("https://dentvideo.com/api/dentvideo/agent/demos", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function post(body: unknown, auth?: string | null) {
  const { POST } = await import("./route");
  const res = await POST(request(body, auth));
  return { status: res.status, headers: res.headers, body: (await res.json()) as Record<string, unknown> };
}

const VALID = { clinicName: "Örnek Diş Kliniği", city: "İzmir", country: "tr", language: "tr" };

beforeEach(() => {
  process.env.DENTVIDEO_AGENT_TOKEN = TOKEN;
  process.env.DENTVIDEO_AGENT_USER_ID = AGENT;
  created.length = 0;
  fetched.length = 0;
  limitKeys.length = 0;
  limitOk = true;
  logoFetch = async () => {
    const { checkImageBytes } = await vi.importActual<typeof import("@/lib/dentvid/safe-image-fetch")>("@/lib/dentvid/safe-image-fetch");
    return checkImageBytes(PNG, "image/png", 2 * 1024 * 1024);
  };
});

describe("fails closed: a plain 404 and nothing created", () => {
  it("when DENTVIDEO_AGENT_TOKEN is unset, even with an empty bearer", async () => {
    delete process.env.DENTVIDEO_AGENT_TOKEN;
    expect((await post(VALID)).status).toBe(404);
    expect((await post(VALID, "Bearer ")).status).toBe(404);
    expect((await post(VALID, "Bearer undefined")).status).toBe(404);
  });

  it("when the configured token is shorter than 32 characters, even if the caller sends it", async () => {
    process.env.DENTVIDEO_AGENT_TOKEN = "short-token-123";
    expect((await post(VALID, "Bearer short-token-123")).status).toBe(404);
  });

  it("when DENTVIDEO_AGENT_USER_ID is unset or not a UUID", async () => {
    delete process.env.DENTVIDEO_AGENT_USER_ID;
    expect((await post(VALID)).status).toBe(404);
    process.env.DENTVIDEO_AGENT_USER_ID = "agent";
    expect((await post(VALID)).status).toBe(404);
  });

  it("for a wrong token, a prefix of it, or a longer one", async () => {
    for (const auth of ["Bearer wrong-token-0123456789abcdefghijklmnop", `Bearer ${TOKEN.slice(0, -1)}`, `Bearer ${TOKEN}x`, `Basic ${TOKEN}`, TOKEN]) {
      expect((await post(VALID, auth)).status, auth).toBe(404);
    }
  });

  it("for a missing Authorization header", async () => {
    expect((await post(VALID, null)).status).toBe(404);
  });

  // None of the above may create a demo, fetch a logo or spend rate-limit budget.
  afterEach(() => {
    expect(created).toEqual([]);
    expect(fetched).toEqual([]);
    expect(limitKeys).toEqual([]);
  });
});

describe("creating a demo", () => {
  it("returns the token and the absolute demo URL, recorded under the agent's id", async () => {
    const r = await post(VALID);
    expect(r.status).toBe(200);
    expect(r.body.token).toBe("Ab3dE5fG7hJ");
    expect(r.body.url).toMatch(/^https:\/\/.+\/tr\/d\/Ab3dE5fG7hJ$/);
    expect(r.body.logo).toBe("none");
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ input: { clinicName: "Örnek Diş Kliniği", country: "TR", language: "tr", campaign: "tr-launch" }, logo: null, by: AGENT });
    expect(limitKeys).toEqual([`rl:demoagent:user:${AGENT}`]);
  });

  it("is case-insensitive about the Bearer word", async () => {
    expect((await post(VALID, `bearer ${TOKEN}`)).status).toBe(200);
  });

  it("stores a logo fetched from its URL", async () => {
    const r = await post({ ...VALID, logoUrl: "https://clinic.example/logo.png" });
    expect(r.status).toBe(200);
    expect(r.body.logo).toBe("stored");
    expect(fetched).toEqual(["https://clinic.example/logo.png"]);
    expect(created[0].logo?.ext).toBe("png");
  });

  it("still creates the demo, without a logo, when the logo cannot be fetched", async () => {
    const { ImageFetchError } = await vi.importActual<typeof import("@/lib/dentvid/safe-image-fetch")>("@/lib/dentvid/safe-image-fetch");
    logoFetch = async () => {
      throw new ImageFetchError("status", "The logo URL answered 403.");
    };
    const r = await post({ ...VALID, logoUrl: "https://clinic.example/logo.png" });
    expect(r.status).toBe(200);
    expect(r.body.logo).toBe("skipped");
    expect(r.body.logoError).toBe("The logo URL answered 403.");
    expect(r.body.url).toMatch(/\/tr\/d\/Ab3dE5fG7hJ$/);
    expect(created).toHaveLength(1);
    expect(created[0].logo).toBeNull();
  });

  it("never fetches a logo URL on the server's own network (the real SSRF guard runs) and skips the logo", async () => {
    const real = await vi.importActual<typeof import("@/lib/dentvid/safe-image-fetch")>("@/lib/dentvid/safe-image-fetch");
    const connected: string[] = [];
    logoFetch = (url) =>
      real.fetchImageSafely(url, {
        resolve: async () => ["127.0.0.1"],
        transport: async () => {
          connected.push(url);
          throw new Error("must not connect");
        },
      });
    for (const logoUrl of ["https://127.0.0.1/logo.png", "https://169.254.169.254/latest/meta-data", "https://localhost/logo.png", "https://[::1]/x.png", "https://internal.example/logo.png"]) {
      const r = await post({ ...VALID, logoUrl });
      expect(r.status, logoUrl).toBe(200);
      expect(r.body.logo, logoUrl).toBe("skipped");
    }
    expect(connected).toEqual([]);
    expect(created.every((c) => c.logo === null)).toBe(true);
  });
});

describe("checks the body", () => {
  it("answers 400 to a bad field, a non-object or broken JSON — and creates nothing", async () => {
    for (const body of [
      { clinicName: "", language: "tr" },
      { clinicName: "X", language: "xx" },
      { clinicName: "X", language: "tr", colour: "red" },
      { clinicName: "X", language: "tr", logoUrl: "http://clinic.example/logo.png" },
      [VALID],
      "null",
      "{not json",
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(created).toEqual([]);
    expect(fetched).toEqual([]);
  });

  it("answers 413 to an oversized body", async () => {
    const r = await post({ ...VALID, note: "x".repeat(10_000) });
    expect(r.status).toBe(413);
    expect(created).toEqual([]);
  });
});

describe("rate limit", () => {
  it("answers 429 with Retry-After once the hourly budget is spent, before reading the body", async () => {
    limitOk = false;
    const r = await post({ ...VALID, logoUrl: "https://clinic.example/logo.png" });
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("120");
    expect(created).toEqual([]);
    expect(fetched).toEqual([]);
  });
});
