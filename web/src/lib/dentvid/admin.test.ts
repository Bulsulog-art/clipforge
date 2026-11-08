import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminUserIds, isAdminUser } from "./admin";

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

const ADMIN = "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d";
const OTHER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";

describe("admin user ids", () => {
  it("parses the env list in any case and separator, ignoring non-ids", () => {
    expect(adminUserIds({ DENTVIDEO_ADMIN_USER_IDS: ` ${ADMIN.toUpperCase()}, ${OTHER};owner@dentvideo.com  not-a-uuid ` })).toEqual([ADMIN, OTHER]);
    expect(adminUserIds({})).toEqual([]);
  });

  it("matches only listed ids, exactly", () => {
    const env = { DENTVIDEO_ADMIN_USER_IDS: ADMIN };
    expect(isAdminUser(ADMIN, env)).toBe(true);
    expect(isAdminUser(ADMIN.toUpperCase(), env)).toBe(true);
    expect(isAdminUser(OTHER, env)).toBe(false);
    expect(isAdminUser(ADMIN.slice(0, -1), env)).toBe(false);
    expect(isAdminUser("", env)).toBe(false);
    expect(isAdminUser(null, env)).toBe(false);
    // Unset → nobody, not everybody.
    expect(isAdminUser(ADMIN, {})).toBe(false);
    expect(isAdminUser("", { DENTVIDEO_ADMIN_USER_IDS: "" })).toBe(false);
  });

  it("an email in the list grants nothing", () => {
    expect(isAdminUser("owner@dentvideo.com", { DENTVIDEO_ADMIN_USER_IDS: "owner@dentvideo.com" })).toBe(false);
  });
});

describe("admin pages are a 404 for everyone else", () => {
  beforeEach(() => {
    vi.stubEnv("DENTVIDEO_ADMIN_USER_IDS", ADMIN);
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
    user = { id: OTHER, email: "dr@clinic.example" };
    await expect(dashboard()).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(clinic()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("a non-admin account with the owner's email address → 404 (email grants nothing)", async () => {
    user = { id: OTHER, email: "owner@dentvideo.com" };
    vi.stubEnv("DENTVIDEO_ADMIN_USER_IDS", `${ADMIN},owner@dentvideo.com`);
    await expect(dashboard()).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(clinic()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("no admins configured → 404 even for the owner's account", async () => {
    vi.stubEnv("DENTVIDEO_ADMIN_USER_IDS", "");
    user = { id: ADMIN, email: "owner@dentvideo.com" };
    await expect(dashboard()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("an admin gets the dashboard", async () => {
    user = { id: ADMIN, email: "Owner@DentVideo.com" };
    const el = (await dashboard()) as { props: { viewer: string; data: { warnings: string[] } } };
    expect(el.props.viewer).toBe("Owner@DentVideo.com");
    expect(el.props.data.warnings).toContain("DentVideo backend is not configured.");
  });
});
