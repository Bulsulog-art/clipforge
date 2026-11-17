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
// The action route's queues: never reached by a request that is refused first.
const queueTouched = vi.fn();
vi.mock("@/lib/queue", () => ({
  dentvidQueue: new Proxy({}, { get: () => queueTouched }),
  queueByName: () => new Proxy({}, { get: () => queueTouched }),
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

// Every admin page, as the framework calls it.
const CLINIC_ID = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const sp = Promise.resolve({});
const PAGES: [string, () => Promise<unknown>][] = [
  ["overview", async () => (await import("@/app/dentvideo/admin/page")).default({ searchParams: sp })],
  ["clinics", async () => (await import("@/app/dentvideo/admin/clinics/page")).default({ searchParams: sp })],
  ["clinic detail", async () => (await import("@/app/dentvideo/admin/clinic/[id]/page")).default({ params: Promise.resolve({ id: CLINIC_ID }), searchParams: sp })],
  ["videos", async () => (await import("@/app/dentvideo/admin/videos/page")).default({ searchParams: sp })],
  ["queue & system", async () => (await import("@/app/dentvideo/admin/system/page")).default({ searchParams: sp })],
  ["emails", async () => (await import("@/app/dentvideo/admin/emails/page")).default({ searchParams: sp })],
  ["billing", async () => (await import("@/app/dentvideo/admin/billing/page")).default({ searchParams: sp })],
  ["funnel & sources", async () => (await import("@/app/dentvideo/admin/funnel/page")).default({ searchParams: Promise.resolve({ days: "90" }) })],
];

/** The action route, posted like the panel's forms do. */
const postAction = async () =>
  (await import("@/app/api/dentvideo/admin/action/route")).POST(
    new Request("https://dentvideo.com/api/dentvideo/admin/action", {
      method: "POST",
      headers: { origin: "https://dentvideo.com", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "pause", clinicId: CLINIC_ID, confirm: "yes", csrf: "x", back: "/admin" }).toString(),
    }),
  );

describe("admin pages and actions are a 404 for everyone else", () => {
  beforeEach(() => {
    vi.stubEnv("DENTVIDEO_ADMIN_USER_IDS", ADMIN);
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("DODO_API_KEY", "");
    user = null;
    // vitest compiles the page's JSX with the classic runtime.
    vi.stubGlobal("React", React);
  });

  it.each(PAGES)("signed-out visitor → 404 (%s)", async (_name, page) => {
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(PAGES)("signed-in clinic owner who is not an admin → 404 (%s)", async (_name, page) => {
    user = { id: OTHER, email: "dr@clinic.example" };
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(PAGES)("a non-admin account with the owner's email address → 404 (%s)", async (_name, page) => {
    user = { id: OTHER, email: "owner@dentvideo.com" };
    vi.stubEnv("DENTVIDEO_ADMIN_USER_IDS", `${ADMIN},owner@dentvideo.com`);
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(PAGES)("no admins configured → 404 even for the owner's account (%s)", async (_name, page) => {
    vi.stubEnv("DENTVIDEO_ADMIN_USER_IDS", "");
    user = { id: ADMIN, email: "owner@dentvideo.com" };
    await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("the action route answers 404 to a signed-out visitor, a clinic owner and when no admins are configured", async () => {
    expect((await postAction()).status).toBe(404);
    user = { id: OTHER, email: "owner@dentvideo.com" };
    expect((await postAction()).status).toBe(404);
    vi.stubEnv("DENTVIDEO_ADMIN_USER_IDS", "");
    user = { id: ADMIN, email: "owner@dentvideo.com" };
    expect((await postAction()).status).toBe(404);
    expect(queueTouched).not.toHaveBeenCalled();
  });

  it("an admin gets each page (the clinic page is a 404 only because the clinic does not exist here)", async () => {
    user = { id: ADMIN, email: "Owner@DentVideo.com" };
    for (const [name, page] of PAGES) {
      if (name === "clinic detail") {
        await expect(page()).rejects.toThrow("NEXT_NOT_FOUND");
        continue;
      }
      const el = (await page()) as { props: { viewer: { email: string } } };
      expect(el.props.viewer.email, name).toBe("Owner@DentVideo.com");
    }
    const el = (await PAGES[0][1]()) as { props: { data: { warnings: string[] } } };
    expect(el.props.data.warnings).toContain("DentVideo backend is not configured.");
  });
});
