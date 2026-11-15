import { beforeEach, describe, expect, it, vi } from "vitest";

let cookie: string | undefined = "en";
let session: { user: { id: string } | null; language?: string } = { user: null };

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (k === "dv-lang" || k.includes("lang") ? (cookie ? { value: cookie } : undefined) : undefined) }),
  headers: async () => ({ get: () => "en-US,en;q=0.9" }),
}));
vi.mock("./auth", () => ({
  dvSession: async () => ({
    user: session.user,
    db: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { profile: { language: session.language } } }) }) }) }),
    },
  }),
}));

const { clinicLocale } = await import("./locale-server");

beforeEach(() => {
  cookie = "en";
  session = { user: null };
});

describe("clinicLocale (browser tab titles of the signed-in app)", () => {
  it("is the clinic's language when signed in, whatever the cookie says", async () => {
    session = { user: { id: "u1" }, language: "de" };
    expect(await clinicLocale()).toBe("de");
  });

  it("falls back to the visitor's language without a session", async () => {
    expect(await clinicLocale()).toBe("en");
  });
});
