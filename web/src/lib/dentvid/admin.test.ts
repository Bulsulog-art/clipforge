import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminEmails, isAdminEmail } from "./admin";

let user: { id: string; email?: string } | null = null;

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({ user, db: {} }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  },
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));
// No backend in tests: the dashboard renders its "not configured" state.
vi.mock("@/lib/dentvid/supabase", () => ({
  dvAdmin: () => {
    throw new Error("DentVideo backend is not configured");
  },
}));

describe("admin emails", () => {
  it("parses the env list in any case and separator", () => {
    expect(adminEmails({ DENTVIDEO_ADMIN_EMAILS: " Owner@DentVideo.com, partner@dentvideo.com;ops@x.io  bad-entry " })).toEqual([
      "owner@dentvideo.com",
      "partner@dentvideo.com",
      "ops@x.io",
    ]);
    expect(adminEmails({})).toEqual([]);
  });

  it("matches only listed emails, exactly", () => {
    const env = { DENTVIDEO_ADMIN_EMAILS: "owner@dentvideo.com" };
    expect(isAdminEmail("OWNER@dentvideo.com", env)).toBe(true);
    expect(isAdminEmail("owner@dentvideo.co", env)).toBe(false);
    expect(isAdminEmail("xowner@dentvideo.com", env)).toBe(false);
    expect(isAdminEmail("", env)).toBe(false);
    expect(isAdminEmail(null, env)).toBe(false);
    // Unset → nobody, not everybody.
    expect(isAdminEmail("owner@dentvideo.com", {})).toBe(false);
    expect(isAdminEmail("", { DENTVIDEO_ADMIN_EMAILS: "" })).toBe(false);
  });
});

describe("admin pages are a 404 for everyone else", () => {
  beforeEach(() => {
    vi.stubEnv("DENTVIDEO_ADMIN_EMAILS", "owner@dentvideo.com");
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("DODO_API_KEY", "");
    user = null;
    // vitest compiles the page's JSX with the classic runtime.
    vi.stubGlobal("React", React);
  });

  const dashboard = async () => (await import("@/app/dentvideo/admin/page")).default({ searchParams: Promise.resolve({}) });
  const clinic = async () =>
    (await import("@/app/dentvideo/admin/clinic/[id]/page")).default({ params: Promise.resolve({ id: "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d" }) });

  it("signed-out visitor → 404", async () => {
    await expect(dashboard()).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(clinic()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("signed-in clinic owner who is not an admin → 404", async () => {
    user = { id: "u1", email: "dr@clinic.example" };
    await expect(dashboard()).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(clinic()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("no admins configured → 404 even for the owner's address", async () => {
    vi.stubEnv("DENTVIDEO_ADMIN_EMAILS", "");
    user = { id: "u2", email: "owner@dentvideo.com" };
    await expect(dashboard()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("an admin gets the dashboard", async () => {
    user = { id: "u2", email: "Owner@DentVideo.com" };
    const el = (await dashboard()) as { props: { viewer: string; data: { warnings: string[] } } };
    expect(el.props.viewer).toBe("Owner@DentVideo.com");
    expect(el.props.data.warnings).toContain("DentVideo backend is not configured.");
  });
});
