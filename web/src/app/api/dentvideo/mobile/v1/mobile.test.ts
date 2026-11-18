import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

/**
 * The iPhone app's API (api/dentvideo/mobile/v1/**) against an in-memory Liman that enforces
 * row-level security the way the real policies do: a client built with a user's token sees and
 * changes only rows whose owner_id is that user; the service role sees everything.
 *
 * Every route is attacked the same ways: no token, a malformed or unknown token, the dv-auth
 * cookie instead of a token, and clinic A's token against clinic B's rows.
 */

const A = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const B = "2d0c5e8a-3f4b-4c7d-9e0f-1a2b3c4d5e6f";
const OTHER_APP = "3e1d6f9b-4a5c-4d8e-8f1a-2b3c4d5e6f7a";
const TOKEN_A = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJBQUFBIn0.c2lnbmF0dXJlQUFBQQ";
const TOKEN_B = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJCQkJCIn0.c2lnbmF0dXJlQkJCQg";
const TOKEN_OTHER = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJPVEhFUiJ9.c2lnbmF0dXJlT1RIRVI";
const TOKEN_EXPIRED = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJPTERPIn0.c2lnbmF0dXJlT0xETw";
/** Logins made in the app (mobile/v1/signup) that have no clinic yet: code entered, and code still waiting. */
const NEW = "4f2e7a0c-5b6d-4e9f-8a2b-3c4d5e6f7a8b";
const NEW_UNVERIFIED = "5a3f8b1d-6c7e-4f0a-9b3c-4d5e6f7a8b9c";
const TOKEN_NEW = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJORVcifQ.c2lnbmF0dXJlTkVXTkVX";
const TOKEN_NEW_UNVERIFIED = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJORVdVIn0.c2lnbmF0dXJlTkVXVQ";
const DEVICE_A = "a".repeat(64);
const DEVICE_B = "b".repeat(64);

type Row = Record<string, unknown>;
type Db = { dentvid_clinics: Row[]; dentvid_items: Row[]; dentvid_devices: Row[] };
let db: Db;
let devicesTableExists = true;
let revoked: string[];
let queued: unknown[];
let deleteCalls: { id: string }[];
let limitedKeys: string[];

const dvUser = (id: string, email: string) => ({ id, email, app_metadata: { product: "dentvideo" } });
const USERS: Record<string, { id: string; email: string; app_metadata: Record<string, unknown> }> = {
  [TOKEN_A]: dvUser(A, "a@clinic-a.example"),
  [TOKEN_B]: dvUser(B, "b@clinic-b.example"),
  [TOKEN_OTHER]: { id: OTHER_APP, email: "x@other.example", app_metadata: { product: "clipforge" } },
  [TOKEN_NEW]: {
    id: NEW,
    email: "new@clinic-new.example",
    app_metadata: { product: "dentvideo", email_verified_at: "2026-11-18T09:00:00Z", email_verified_for: "new@clinic-new.example", email_verified_via: "code" },
  },
  [TOKEN_NEW_UNVERIFIED]: dvUser(NEW_UNVERIFIED, "later@clinic-new.example"),
};
const PASSWORDS: Record<string, { password: string; token: string }> = {
  "a@clinic-a.example": { password: "right-password", token: TOKEN_A },
  "x@other.example": { password: "right-password", token: TOKEN_OTHER },
};

/** A PostgREST-like query over the in-memory tables. `owner` = the RLS user (null = service role). */
function query(table: keyof Db, owner: string | null) {
  const filters: ((r: Row) => boolean)[] = [];
  let op: "select" | "update" | "upsert" | "delete" = "select";
  let patch: Row = {};
  let upsertRow: Row = {};
  let conflict = "id";
  let returning = false;
  let single = false;
  let headCount = false;
  let limitN = Infinity;
  const visible = (r: Row) => owner === null || r.owner_id === owner;
  const run = () => {
    if (table === "dentvid_devices" && !devicesTableExists) return { data: null, error: { code: "42P01", message: 'relation "public.dentvid_devices" does not exist' } };
    const rows = db[table];
    const match = () => rows.filter((r) => visible(r) && filters.every((f) => f(r)));
    if (op === "select") {
      const m = match().slice(0, limitN);
      if (headCount) return { data: null, count: m.length, error: null };
      return { data: single ? (m[0] ?? null) : m.map((r) => ({ ...r })), error: null };
    }
    if (op === "update") {
      const m = match();
      m.forEach((r) => Object.assign(r, patch));
      return { data: returning ? m.map((r) => ({ ...r })) : null, error: null };
    }
    if (op === "delete") {
      const m = match();
      db[table] = rows.filter((r) => !m.includes(r)) as never;
      return { data: null, error: null };
    }
    const existing = rows.find((r) => r[conflict] === upsertRow[conflict]);
    if (existing) {
      // RLS: a user may only update their own row.
      if (owner !== null && existing.owner_id !== owner) return { data: null, error: { code: "42501", message: "row-level security" } };
      Object.assign(existing, upsertRow);
      return { data: single ? { ...existing } : [{ ...existing }], error: null };
    }
    if (owner !== null && upsertRow.owner_id !== owner) return { data: null, error: { code: "42501", message: "row-level security" } };
    const row = { id: crypto.randomUUID(), ...upsertRow };
    rows.push(row);
    return { data: single ? { ...row } : [{ ...row }], error: null };
  };
  const q = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (op !== "select") returning = true;
      if (opts?.head) headCount = true;
      return q;
    },
    eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), q),
    in: (k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), q),
    order: () => q,
    limit: (n: number) => ((limitN = n), q),
    update: (p: Row) => ((op = "update"), (patch = p), q),
    upsert: (row: Row, opts?: { onConflict?: string }) => ((op = "upsert"), (upsertRow = row), (conflict = opts?.onConflict ?? "id"), q),
    delete: () => ((op = "delete"), q),
    maybeSingle: async () => ((single = true), run()),
    single: async () => ((single = true), run()),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
  };
  return q;
}

const storage = (owner: string | null) => ({
  from: () => ({
    createSignedUrls: async (paths: string[]) => ({
      data: paths.filter((p) => owner === null || p.startsWith(`${owner}/`)).map((p) => ({ path: p, signedUrl: `https://liman.example/sign/${p}?t=1` })),
      error: null,
    }),
    createSignedUrl: async (p: string) => ({ data: owner === null || p.startsWith(`${owner}/`) ? { signedUrl: `https://liman.example/sign/${p}` } : null, error: null }),
    createSignedUploadUrl: async (p: string) => ({ data: { token: "upl", path: p, signedUrl: `https://liman.example/upload/sign/dentvid/${p}?token=upl` }, error: null }),
    list: async () => ({ data: [], error: null }),
  }),
});

function client(owner: string | null, token?: string) {
  return {
    from: (t: keyof Db) => query(t, owner),
    storage: storage(owner),
    auth: {
      getUser: async (jwt: string) => {
        const u = USERS[jwt];
        return u && jwt === token ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: "invalid JWT" } };
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const p = PASSWORDS[email];
        if (!p || p.password !== password) return { data: { session: null, user: null }, error: { message: "Invalid login credentials" } };
        const user = USERS[p.token];
        return { data: { user, session: { access_token: p.token, refresh_token: `refresh-${user.id}`, expires_at: 2_000_000_000 } }, error: null };
      },
      refreshSession: async ({ refresh_token }: { refresh_token: string }) => {
        const entry = Object.entries(USERS).find(([, u]) => `refresh-${u.id}` === refresh_token);
        if (!entry) return { data: { session: null, user: null }, error: { message: "Invalid Refresh Token" } };
        return { data: { user: entry[1], session: { access_token: entry[0], refresh_token: `${refresh_token}-2`, expires_at: 2_000_000_100 } }, error: null };
      },
      signOut: async () => ({ error: null }),
      admin: { signOut: async (jwt: string) => (revoked.push(jwt), { error: null }) },
    },
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, opts?: { global?: { headers?: Record<string, string> } }) => {
    const auth = opts?.global?.headers?.Authorization;
    const token = auth?.replace(/^Bearer /, "");
    const user = token ? USERS[token] : undefined;
    // A forged / expired token reaches PostgREST as an invalid JWT: it sees nothing.
    return client(user ? user.id : "nobody", token);
  },
}));
vi.mock("@/lib/dentvid/supabase", () => ({ BUCKET: "dentvid", dvAdmin: () => client(null) }));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors, dvLocale: async () => "en" }));
vi.mock("@/lib/rate-limit-server", () => ({
  rateLimited: async (checks: { key: string }[]) =>
    checks.some((c) => limitedKeys.some((k) => c.key.startsWith(k))) ? new Response(JSON.stringify({ error: "Too many" }), { status: 429 }) : null,
  uploadSlotStore: async () => null,
}));
vi.mock("@/lib/dentvid/events-server", () => ({ recordEvent: vi.fn() }));
vi.mock("@/lib/dentvid/email", async (orig) => ({ ...(await orig<typeof import("@/lib/dentvid/email")>()), sendEmail: vi.fn(async () => true) }));
vi.mock("@/lib/dentvid/hot-leads-server", () => ({ raiseHotLead: vi.fn(async () => "duplicate") }));
vi.mock("@/lib/queue", () => ({ dentvidQueue: { add: async (...a: unknown[]) => (queued.push(a), {}) } }));
vi.mock("@/lib/dentvid/ops-server", () => ({ noteEnqueueFailure: async () => {} }));
vi.mock("@/lib/dentvid/account", () => ({
  listOwnerFiles: async () => [],
  deleteDentvideoAccount: async (args: { user: { id: string } }) => (deleteCalls.push({ id: args.user.id }), { ok: true }),
}));
vi.mock("@/lib/dentvid/dodo-account", () => ({ dodoApiKey: () => null, dodoCancelSubscription: vi.fn(), dodoGetSubscription: vi.fn() }));

const BASE = "https://dentvideo.com/api/dentvideo/mobile/v1";
function req(path: string, init: { method?: string; token?: string | null; body?: unknown; cookie?: string; auth?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.auth) headers.authorization = init.auth;
  if (init.cookie) headers.cookie = init.cookie;
  return new Request(`${BASE}/${path}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}
async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, headers: res.headers };
}

const ITEM_A = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";
const ITEM_A2 = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6b";
const ITEM_A3 = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6c";
const ITEM_B = "8c0d1e2f-3a4b-4c5d-9e6f-0a1b2c3d4e5f";
const WEEK = "2026-11-16";

beforeEach(() => {
  revoked = [];
  queued = [];
  deleteCalls = [];
  limitedKeys = [];
  devicesTableExists = true;
  const item = (id: string, owner: string, clinic: string, extra: Row = {}) => ({
    id,
    owner_id: owner,
    clinic_id: clinic,
    kind: "generated",
    status: "ready",
    approval: "pending",
    title: `Video ${id.slice(-2)}`,
    week_of: WEEK,
    copy: { caption: "Floss once a day. It takes two minutes.", hashtags: ["dentist", "floss"] },
    findings: [],
    video_path: `${owner}/videos/${id}.mp4`,
    thumb_path: `${owner}/videos/${id}.jpg`,
    shoot_card: null,
    created_at: "2026-11-15T20:00:00Z",
    ...extra,
  });
  db = {
    dentvid_clinics: [
      { id: "clinic-a", owner_id: A, profile: { name: "Clinic A", language: "de", country: "DE", services: ["implants"] }, plan: "active", plan_tier: "practice", logo_path: null },
      { id: "clinic-b", owner_id: B, profile: { name: "Clinic B", language: "tr", country: "TR", services: ["whitening"] }, plan: "active", plan_tier: "starter", logo_path: null },
    ],
    dentvid_items: [
      item(ITEM_A, A, "clinic-a", { shoot_card: { opening: "Hello", points: ["One", "Two"], closing: "Bye", minutes: 2, junk: "<x>" } }),
      item(ITEM_A2, A, "clinic-a", { status: "flagged", findings: ["[dv:pause] quality: 3.1s of silence (max 3s)"] }),
      item(ITEM_A3, A, "clinic-a", { status: "working" }),
      item(ITEM_B, B, "clinic-b"),
    ],
    dentvid_devices: [{ id: "d-b", owner_id: B, token: DEVICE_B, environment: "production", ready_push: true }],
  };
});

/* ------------------------------------------------------------------ auth */

describe("every authenticated mobile route refuses requests without a valid DentVideo bearer token", () => {
  const routes: [string, string, () => Promise<Record<string, (r: Request, ctx?: never) => Promise<Response>>>, unknown?][] = [
    ["GET", "me", () => import("./me/route") as never],
    ["GET", "items", () => import("./items/route") as never],
    ["POST", "items/approve-week", () => import("./items/approve-week/route") as never, { week: WEEK }],
    ["POST", "devices", () => import("./devices/route") as never, { token: DEVICE_A }],
    ["DELETE", "devices", () => import("./devices/route") as never, { token: DEVICE_B }],
    ["POST", "upload-url", () => import("./upload-url/route") as never, { kind: "recording", size: 1000, contentType: "video/mp4" }],
    ["POST", "recording", () => import("./recording/route") as never, { path: `${A}/recordings/1731000000000.mp4` }],
    ["POST", "clinic", () => import("./clinic/route") as never, { profile: { name: "X", country: "DE", language: "de", services: ["implants"] } }],
    ["POST", "account/delete", () => import("./account/delete/route") as never, { confirm: "DELETE" }],
    ["POST", "session/signout", () => import("./session/signout/route") as never, {}],
    ["GET", "topic-requests", () => import("./topic-requests/route") as never],
    ["POST", "topic-requests", () => import("./topic-requests/route") as never, { text: "How long does sensitivity last?" }],
  ];
  const attempts: [string, { token?: string; cookie?: string; auth?: string }][] = [
    ["no header", {}],
    ["the web's dv-auth cookie only", { cookie: "dv-auth=base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0" }],
    ["a token that is not a JWT", { auth: "Bearer not-a-jwt" }],
    ["Basic instead of Bearer", { auth: `Basic ${TOKEN_A}` }],
    ["an expired / unknown token", { token: TOKEN_EXPIRED }],
    ["another app's account on the shared Liman", { token: TOKEN_OTHER }],
  ];
  for (const [method, path, load, body] of routes) {
    it(`${method} ${path}`, async () => {
      const mod = await load();
      const before = JSON.stringify(db);
      for (const [label, a] of attempts) {
        const res = await mod[method](req(path, { method, body, ...a }));
        expect(res.status, `${path}: ${label}`).toBe(401);
        expect(res.headers.get("cache-control"), label).toBe("no-store");
      }
      expect(JSON.stringify(db)).toBe(before);
      expect(queued).toEqual([]);
      expect(deleteCalls).toEqual([]);
      expect(revoked).toEqual([]);
    });
  }
  it("POST items/{id}/change, GET items/{id}/subtitles, DELETE topic-requests/{id}", async () => {
    const change = await import("./items/[id]/change/route");
    const subs = await import("./items/[id]/subtitles/route");
    const topic = await import("./topic-requests/[id]/route");
    const before = JSON.stringify(db);
    for (const [label, a] of attempts) {
      const ctx = { params: Promise.resolve({ id: ITEM_A }) };
      expect((await change.POST(req(`items/${ITEM_A}/change`, { method: "POST", body: { note: "Shorter please" }, ...a }), ctx)).status, label).toBe(401);
      expect((await subs.GET(req(`items/${ITEM_A}/subtitles`, { ...a }), ctx)).status, label).toBe(401);
      expect((await topic.DELETE(req(`topic-requests/${ITEM_A}`, { method: "DELETE", ...a }), ctx)).status, label).toBe(401);
    }
    expect(JSON.stringify(db)).toBe(before);
    expect(queued).toEqual([]);
  });

  it("PATCH items/{id}", async () => {
    const { PATCH } = await import("./items/[id]/route");
    for (const [label, a] of attempts) {
      const res = await PATCH(req(`items/${ITEM_A}`, { method: "PATCH", body: { approval: "approved" }, ...a }), { params: Promise.resolve({ id: ITEM_A }) });
      expect(res.status, label).toBe(401);
    }
    expect(db.dentvid_items.find((i) => i.id === ITEM_A)?.approval).toBe("pending");
  });
});

describe("POST session (sign in)", () => {
  it("answers the token set for a DentVideo account, and sets no cookie", async () => {
    const { POST } = await import("./session/route");
    const r = await json(await POST(req("session", { method: "POST", body: { email: " A@Clinic-A.example ", password: "right-password" } })));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ accessToken: TOKEN_A, refreshToken: `refresh-${A}`, expiresAt: 2_000_000_000, user: { id: A, email: "a@clinic-a.example" } });
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("gives the same answer for a wrong password and an unknown address", async () => {
    const { POST } = await import("./session/route");
    const wrong = await json(await POST(req("session", { method: "POST", body: { email: "a@clinic-a.example", password: "nope" } })));
    const unknown = await json(await POST(req("session", { method: "POST", body: { email: "who@nowhere.example", password: "nope" } })));
    expect(wrong.status).toBe(401);
    expect(unknown).toEqual({ ...wrong, headers: unknown.headers });
    expect(wrong.body.code).toBe("invalid_credentials");
  });

  it("refuses another app's account and revokes the session it just got", async () => {
    const { POST } = await import("./session/route");
    const r = await json(await POST(req("session", { method: "POST", body: { email: "x@other.example", password: "right-password" } })));
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("not_dentvideo");
    expect(r.body).not.toHaveProperty("accessToken");
    expect(revoked).toEqual([TOKEN_OTHER]);
  });

  it("is rate limited per address and per IP", async () => {
    const { POST } = await import("./session/route");
    limitedKeys = ["rl:msignin:email:a@clinic-a.example"];
    expect((await POST(req("session", { method: "POST", body: { email: "a@clinic-a.example", password: "right-password" } }))).status).toBe(429);
    limitedKeys = ["rl:msignin:ip:"];
    expect((await POST(req("session", { method: "POST", body: { email: "a@clinic-a.example", password: "right-password" } }))).status).toBe(429);
  });

  it("refuses malformed bodies and unknown keys", async () => {
    const { POST } = await import("./session/route");
    for (const body of [null, {}, { email: "not-an-email", password: "x" }, { email: "a@clinic-a.example", password: "right-password", admin: true }]) {
      expect((await POST(req("session", { method: "POST", body }))).status).toBe(400);
    }
  });
});

describe("POST session/refresh", () => {
  it("rotates the token set", async () => {
    const { POST } = await import("./session/refresh/route");
    const r = await json(await POST(req("session/refresh", { method: "POST", body: { refreshToken: `refresh-${A}` } })));
    expect(r.status).toBe(200);
    expect(r.body.refreshToken).toBe(`refresh-${A}-2`);
  });
  it("401 for an unknown refresh token or another app's account", async () => {
    const { POST } = await import("./session/refresh/route");
    expect((await POST(req("session/refresh", { method: "POST", body: { refreshToken: "refresh-unknown" } }))).status).toBe(401);
    expect((await POST(req("session/refresh", { method: "POST", body: { refreshToken: `refresh-${OTHER_APP}` } }))).status).toBe(401);
    expect((await POST(req("session/refresh", { method: "POST", body: {} }))).status).toBe(401);
  });
});

describe("POST session/signout", () => {
  it("revokes this session and forgets only the caller's own device token", async () => {
    db.dentvid_devices.push({ id: "d-a", owner_id: A, token: DEVICE_A, environment: "production", ready_push: true });
    const { POST } = await import("./session/signout/route");
    // Clinic A names clinic B's token: B's row stays.
    expect((await POST(req("session/signout", { method: "POST", token: TOKEN_A, body: { deviceToken: DEVICE_B } }))).status).toBe(200);
    expect(db.dentvid_devices.map((d) => d.token)).toEqual([DEVICE_B, DEVICE_A]);
    await POST(req("session/signout", { method: "POST", token: TOKEN_A, body: { deviceToken: DEVICE_A } }));
    expect(db.dentvid_devices.map((d) => d.token)).toEqual([DEVICE_B]);
    expect(revoked).toEqual([TOKEN_A, TOKEN_A]);
  });
});

/* ------------------------------------------------------------------ reads */

describe("GET me", () => {
  it("answers the caller's own clinic and plan, with no price anywhere", async () => {
    const { GET } = await import("./me/route");
    const r = await json(await GET(req("me", { token: TOKEN_A })));
    expect(r.status).toBe(200);
    expect(r.body.user).toEqual({ id: A, email: "a@clinic-a.example" });
    expect((r.body.clinic as { id: string }).id).toBe("clinic-a");
    expect(r.body.plan).toMatchObject({ state: "active", tier: "practice", canMake: true, recordings: true, adminPaused: false });
    expect(r.body.locale).toBe("de");
    expect(JSON.stringify(r.body)).not.toMatch(/price|amount|€|\$|checkout|pdt_/i);
  });
  it("a Starter clinic has no own recordings; a clinic without a plan cannot make videos", async () => {
    const { GET } = await import("./me/route");
    expect((await json(await GET(req("me", { token: TOKEN_B })))).body.plan).toMatchObject({ tier: "starter", recordings: false });
    db.dentvid_clinics[0].plan = "trial";
    expect((await json(await GET(req("me", { token: TOKEN_A })))).body.plan).toMatchObject({ state: "trial", canMake: false, recordings: false });
  });
  it("an account without a clinic gets clinic: null and plan: null", async () => {
    db.dentvid_clinics = db.dentvid_clinics.filter((c) => c.owner_id !== A);
    const { GET } = await import("./me/route");
    const r = await json(await GET(req("me", { token: TOKEN_A })));
    expect(r.body).toMatchObject({ clinic: null, plan: null });
  });
});

describe("GET items", () => {
  it("lists only the caller's videos, with reason codes, slots, cleaned filming cards and signed URLs", async () => {
    const { GET } = await import("./items/route");
    const r = await json(await GET(req("items", { token: TOKEN_A })));
    expect(r.status).toBe(200);
    const items = r.body.items as Record<string, unknown>[];
    expect(items.map((i) => i.id).sort()).toEqual([ITEM_A, ITEM_A2, ITEM_A3].sort());
    const a = items.find((i) => i.id === ITEM_A)!;
    expect(a.videoUrl).toMatch(new RegExp(`^https://liman.example/sign/${A}/`));
    expect(a.shootCard).toEqual({ opening: "Hello", points: ["One", "Two"], closing: "Bye", minutes: 2 });
    expect(a.slot).toMatchObject({ date: expect.stringMatching(/^2026-11-(16|17|18|19|20)$/), time: expect.stringMatching(/^\d\d:\d\d$/) });
    expect(a.post).toMatchObject({ instagram: expect.stringContaining("#dentist") });
    const flagged = items.find((i) => i.id === ITEM_A2)!;
    expect(flagged.reasons).toEqual(["pause"]);
    // Raw internal findings never leave the server.
    expect(JSON.stringify(r.body)).not.toContain("3.1s of silence");
    // A video still being made has no slot.
    expect(items.find((i) => i.id === ITEM_A3)!.slot).toBeNull();
    expect(r.body.currentWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.stringify(r.body)).not.toContain(ITEM_B);
  });
});

/* ------------------------------------------------------------------ writes */

describe("PATCH items/{id}", () => {
  const patch = async (id: string, token: string, body: unknown) => {
    const { PATCH } = await import("./items/[id]/route");
    return json(await PATCH(req(`items/${id}`, { method: "PATCH", token, body }), { params: Promise.resolve({ id }) }));
  };
  it("approves, declines with a note, and ticks posted — the web's rules", async () => {
    expect((await patch(ITEM_A, TOKEN_A, { approval: "approved" })).status).toBe(200);
    expect((await patch(ITEM_A, TOKEN_A, { posted: true })).body).toEqual({ ok: true, stored: true });
    expect(typeof db.dentvid_items.find((i) => i.id === ITEM_A)?.posted_at).toBe("string");
    expect((await patch(ITEM_A2, TOKEN_A, { approval: "rejected", note: "Wrong service" })).status).toBe(200);
    expect(db.dentvid_items.find((i) => i.id === ITEM_A2)).toMatchObject({ approval: "rejected", approval_note: "Wrong service" });
    // Still being made: nothing to decide.
    expect((await patch(ITEM_A3, TOKEN_A, { approval: "approved" })).status).toBe(409);
  });
  it("clinic A cannot approve, decline or tick clinic B's video", async () => {
    db.dentvid_items.find((i) => i.id === ITEM_B)!.approval = "approved";
    for (const body of [{ approval: "rejected" }, { approval: "pending" }, { posted: true }]) {
      expect((await patch(ITEM_B, TOKEN_A, body)).status).toBe(409);
    }
    expect(db.dentvid_items.find((i) => i.id === ITEM_B)).toMatchObject({ approval: "approved" });
    expect(db.dentvid_items.find((i) => i.id === ITEM_B)?.posted_at).toBeUndefined();
  });
});

describe("POST items/approve-week", () => {
  it("approves the week's ready, undecided videos of the caller only (flagged ones wait for a look)", async () => {
    const { POST } = await import("./items/approve-week/route");
    const r = await json(await POST(req("items/approve-week", { method: "POST", token: TOKEN_A, body: { week: WEEK } })));
    expect(r.body).toEqual({ ok: true, approved: 1, ids: [ITEM_A] });
    const by = (id: string) => db.dentvid_items.find((i) => i.id === id)!.approval;
    expect([by(ITEM_A), by(ITEM_A2), by(ITEM_A3), by(ITEM_B)]).toEqual(["approved", "pending", "pending", "pending"]);
  });
  it("refuses a malformed week", async () => {
    const { POST } = await import("./items/approve-week/route");
    for (const week of ["2026-11", "next", "2026-11-16; drop table"]) {
      expect((await POST(req("items/approve-week", { method: "POST", token: TOKEN_A, body: { week } }))).status).toBe(400);
    }
  });
});

describe("devices", () => {
  it("stores the caller's token under the caller's id, whatever the body says", async () => {
    const { POST } = await import("./devices/route");
    expect((await POST(req("devices", { method: "POST", token: TOKEN_A, body: { token: DEVICE_A.toUpperCase(), environment: "development", locale: "de", readyPush: false } }))).status).toBe(200);
    expect(db.dentvid_devices.find((d) => d.token === DEVICE_A)).toMatchObject({ owner_id: A, environment: "development", ready_push: false, locale: "de" });
    // An owner_id in the body is refused (strict), never used.
    expect((await POST(req("devices", { method: "POST", token: TOKEN_A, body: { token: DEVICE_A, owner_id: B } }))).status).toBe(400);
  });
  it("refuses tokens that are not APNs hex", async () => {
    const { POST } = await import("./devices/route");
    for (const token of ["", "xyz", "a".repeat(63), `${"a".repeat(64)}'--`]) {
      expect((await POST(req("devices", { method: "POST", token: TOKEN_A, body: { token } }))).status).toBe(400);
    }
  });
  it("clinic A cannot delete clinic B's token", async () => {
    const { DELETE } = await import("./devices/route");
    expect((await DELETE(req("devices", { method: "DELETE", token: TOKEN_A, body: { token: DEVICE_B } }))).status).toBe(200);
    expect(db.dentvid_devices.map((d) => d.owner_id)).toEqual([B]);
    expect((await DELETE(req("devices", { method: "DELETE", token: TOKEN_B, body: { token: DEVICE_B } }))).status).toBe(200);
    expect(db.dentvid_devices).toEqual([]);
  });
  it("before migration 0023 answers stored: false instead of failing", async () => {
    devicesTableExists = false;
    const { POST } = await import("./devices/route");
    expect((await json(await POST(req("devices", { method: "POST", token: TOKEN_A, body: { token: DEVICE_A } })))).body).toEqual({ ok: true, stored: false });
  });
});

describe("recordings", () => {
  it("upload-url signs a path in the caller's own folder and returns the full upload address", async () => {
    const { POST } = await import("./upload-url/route");
    const r = await json(await POST(req("upload-url", { method: "POST", token: TOKEN_A, body: { kind: "recording", size: 300 * 1024 * 1024, contentType: "video/quicktime", name: "take.mov" } })));
    expect(r.status).toBe(200);
    expect(r.body.path).toMatch(new RegExp(`^${A}/recordings/\\d+\\.mov$`));
    expect(r.body.uploadUrl).toBe(`https://liman.example/upload/sign/dentvid/${r.body.path}?token=upl`);
  });
  it("upload-url refuses over 500 MB, and Starter clinics (402, no price in the answer)", async () => {
    const { POST } = await import("./upload-url/route");
    expect((await POST(req("upload-url", { method: "POST", token: TOKEN_A, body: { kind: "recording", size: 501 * 1024 * 1024, contentType: "video/mp4" } }))).status).toBe(400);
    const starter = await json(await POST(req("upload-url", { method: "POST", token: TOKEN_B, body: { kind: "recording", size: 1000, contentType: "video/mp4" } })));
    expect(starter.status).toBe(402);
    expect(JSON.stringify(starter.body)).not.toMatch(/€|\$|\d+\s?(EUR|USD|TL)/);
  });
  it("recording queues only a path in the caller's own folder", async () => {
    const { POST } = await import("./recording/route");
    expect((await POST(req("recording", { method: "POST", token: TOKEN_A, body: { path: `${B}/recordings/1731000000000.mp4` } }))).status).toBe(400);
    expect((await POST(req("recording", { method: "POST", token: TOKEN_A, body: { path: `${A}/../${B}/recordings/1731000000000.mp4` } }))).status).toBe(400);
    expect(queued).toEqual([]);
    expect((await POST(req("recording", { method: "POST", token: TOKEN_A, body: { path: `${A}/recordings/1731000000000.mp4` } }))).status).toBe(200);
    expect(queued).toHaveLength(1);
    expect((queued[0] as [string, { clinicId: string }])[1].clinicId).toBe("clinic-a");
  });
});

describe("POST clinic (settings)", () => {
  const profile = { name: "Clinic A", country: "DE", language: "de", services: ["implants"], narratorVoice: "male", tone: "calm" };
  it("saves the caller's own profile with the web's validation", async () => {
    const { POST } = await import("./clinic/route");
    expect((await POST(req("clinic", { method: "POST", token: TOKEN_A, body: { profile } }))).status).toBe(200);
    expect(db.dentvid_clinics.find((c) => c.owner_id === A)?.profile).toMatchObject({ narratorVoice: "male", tone: "calm" });
    expect((await POST(req("clinic", { method: "POST", token: TOKEN_A, body: { profile: { ...profile, name: "" } } }))).status).toBe(400);
    expect((await POST(req("clinic", { method: "POST", token: TOKEN_A, body: { profile: { ...profile, bookingUrl: "javascript:alert(1)" } } }))).status).toBe(400);
  });
  it("never touches another clinic and never takes a logo path from the app", async () => {
    const { POST } = await import("./clinic/route");
    const before = JSON.stringify(db.dentvid_clinics.find((c) => c.owner_id === B));
    await POST(req("clinic", { method: "POST", token: TOKEN_A, body: { profile, logoPath: `${B}/logo.png`, owner_id: B } }));
    expect(JSON.stringify(db.dentvid_clinics.find((c) => c.owner_id === B))).toBe(before);
    expect(db.dentvid_clinics.find((c) => c.owner_id === A)?.logo_path).toBeNull();
  });
});

describe("POST clinic (a login made in the app, no clinic yet)", () => {
  // What the app sends (ClinicSetupView → APIClient.saveClinic): nil fields left out, colour without "#".
  const appProfile = { name: "  Praxis Neu ", country: "de", language: "de", services: ["Implantate", "Bleaching"], tone: "warm", address: "formal", brandColor: "0E7C7B" };
  const clinicsOf = (owner: string) => db.dentvid_clinics.filter((c) => c.owner_id === owner);

  beforeEach(async () => {
    vi.mocked((await import("@/lib/dentvid/events-server")).recordEvent).mockClear();
    vi.mocked((await import("@/lib/dentvid/email")).sendEmail).mockClear();
  });

  it("creates the clinic, owned by the token's login, with the web's normalisation and defaults", async () => {
    const { POST } = await import("./clinic/route");
    const r = await json(await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: appProfile } })));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const rows = clinicsOf(NEW);
    expect(rows).toHaveLength(1);
    expect(r.body).toEqual({ id: rows[0].id });
    // clinicProfileSchema: trimmed name, upper-case country and colour; tone/address defaults kept.
    expect(rows[0].profile).toEqual({ name: "Praxis Neu", country: "DE", language: "de", services: ["Implantate", "Bleaching"], tone: "warm", address: "formal", brandColor: "0E7C7B" });
    expect(rows[0]).not.toHaveProperty("logo_path");
    // Defaults the schema fills when the app leaves them out.
    const { POST: again } = await import("./clinic/route");
    db.dentvid_clinics = db.dentvid_clinics.filter((c) => c.owner_id !== NEW);
    expect((await again(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: { name: "P", country: "DE", language: "de", services: ["Implantate"] } } }))).status).toBe(200);
    expect(clinicsOf(NEW)[0].profile).toMatchObject({ tone: "warm", address: "formal" });
    // Nobody else's rows moved.
    expect(clinicsOf(A)).toHaveLength(1);
    expect(clinicsOf(B)).toHaveLength(1);
  });

  it("records the web's analytics (clinic_saved, once per save) and sends no email: the welcome waits for the first payment", async () => {
    const { recordEvent } = await import("@/lib/dentvid/events-server");
    const { sendEmail } = await import("@/lib/dentvid/email");
    const { POST } = await import("./clinic/route");
    const r = await json(await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: appProfile } })));
    expect(r.status).toBe(200);
    expect(vi.mocked(recordEvent)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordEvent)).toHaveBeenCalledWith("clinic_saved", expect.objectContaining({ clinicId: r.body.id, locale: "de", props: { country: "DE", language: "de" }, internal: false }));
    // Saving again (the user taps Save twice, or edits later) is a second clinic_saved for the same clinic, never a welcome.
    await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: { ...appProfile, city: "Berlin" } } }));
    expect(vi.mocked(recordEvent)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(recordEvent).mock.calls[1][1]).toMatchObject({ clinicId: r.body.id });
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it("an account whose email code is still waiting gets its clinic too, as on the web (the purchase waits for the code)", async () => {
    const { POST } = await import("./clinic/route");
    const r = await json(await POST(req("clinic", { method: "POST", token: TOKEN_NEW_UNVERIFIED, body: { profile: appProfile } })));
    expect(r.status).toBe(200);
    expect(clinicsOf(NEW_UNVERIFIED)).toHaveLength(1);
  });

  it("one clinic per login: a second create saves the same clinic (same id), never a second row", async () => {
    const { POST } = await import("./clinic/route");
    const first = await json(await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: appProfile } })));
    const second = await json(await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: { ...appProfile, name: "Praxis Zwei" } } })));
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(clinicsOf(NEW)).toHaveLength(1);
    expect(clinicsOf(NEW)[0].profile).toMatchObject({ name: "Praxis Zwei" });
  });

  it("cannot create or take over a clinic for another login: owner_id, id and logoPath in the body are ignored", async () => {
    const { POST } = await import("./clinic/route");
    const before = JSON.stringify(db.dentvid_clinics);
    const r = await json(
      await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: appProfile, owner_id: B, id: "clinic-b", logoPath: `${B}/logo.png`, demoToken: "AbCdEf123456", attribution: { src: "x" } } })),
    );
    expect(r.status).toBe(200);
    // Only the caller's own row was added; A's and B's rows are byte for byte what they were.
    expect(JSON.stringify(db.dentvid_clinics.filter((c) => c.owner_id !== NEW))).toBe(before);
    const own = clinicsOf(NEW);
    expect(own).toHaveLength(1);
    expect(own[0].id).not.toBe("clinic-b");
    expect(own[0]).not.toHaveProperty("logo_path");
    // B's token cannot reach the new clinic either: saving with it changes B's own clinic only.
    await POST(req("clinic", { method: "POST", token: TOKEN_B, body: { profile: { ...appProfile, name: "B again" }, owner_id: NEW } }));
    expect(clinicsOf(NEW)[0].profile).toMatchObject({ name: "Praxis Neu" });
    expect(clinicsOf(B)[0].profile).toMatchObject({ name: "B again" });
  });

  it("creates nothing for any of the six bearer-auth attack shapes", async () => {
    const { POST } = await import("./clinic/route");
    const before = JSON.stringify(db);
    const attempts: [string, { token?: string; cookie?: string; auth?: string }][] = [
      ["no header", {}],
      ["the web's dv-auth cookie only", { cookie: "dv-auth=base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0" }],
      ["a token that is not a JWT", { auth: "Bearer not-a-jwt" }],
      ["Basic instead of Bearer", { auth: `Basic ${TOKEN_NEW}` }],
      ["an expired / unknown token", { token: TOKEN_EXPIRED }],
      ["another app's account on the shared Liman", { token: TOKEN_OTHER }],
    ];
    for (const [label, a] of attempts) {
      const r = await json(await POST(req("clinic", { method: "POST", body: { profile: appProfile }, ...a })));
      expect(r.status, label).toBe(401);
      expect(r.body.code, label).toBe("unauthorized");
      expect(r.headers.get("cache-control"), label).toBe("no-store");
    }
    expect(JSON.stringify(db)).toBe(before);
  });

  it("refuses an invalid profile with the web's errors and creates nothing", async () => {
    const { POST } = await import("./clinic/route");
    const bad: [string, unknown, string | null][] = [
      ["no profile", undefined, null],
      ["empty name", { ...appProfile, name: " " }, "profile.name"],
      ["no services", { ...appProfile, services: [] }, "profile.services"],
      ["unknown language", { ...appProfile, language: "xx" }, "profile.language"],
      ["bad country", { ...appProfile, country: "Germany" }, "profile.country"],
      ["script booking link", { ...appProfile, bookingUrl: "javascript:alert(1)" }, "profile.bookingUrl"],
      ["bad colour", { ...appProfile, brandColor: "teal" }, "profile.brandColor"],
      ["name over 80", { ...appProfile, name: "x".repeat(81) }, "profile.name"],
      ["21 services", { ...appProfile, services: Array.from({ length: 21 }, (_, i) => `Service ${i}`) }, "profile.services"],
    ];
    for (const [label, profile, field] of bad) {
      const r = await json(await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: profile === undefined ? {} : { profile } })));
      expect(r.status, label).toBe(400);
      expect(String(r.body.error), label).toContain(APP_TEXT.en.errors.invalidProfile);
      if (field) expect(String(r.body.error), label).toContain(`(${field})`);
    }
    // Not JSON at all.
    const raw = new Request(`${BASE}/clinic`, { method: "POST", headers: { authorization: `Bearer ${TOKEN_NEW}`, "content-type": "application/json" }, body: "{not json" });
    expect((await POST(raw)).status).toBe(400);
    expect(clinicsOf(NEW)).toHaveLength(0);
  });

  it("refuses a closing line the clinic's market rules refuse (field + code), and is rate-limited per login", async () => {
    const { POST } = await import("./clinic/route");
    const r = await json(await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: { ...appProfile, country: "TR", language: "tr", closingLine: "Hemen randevu alın, kliniğimizde sizi bekliyoruz" } } })));
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ field: "closingLine", code: "closing_line" });
    expect(clinicsOf(NEW)).toHaveLength(0);
    limitedKeys = [`rl:clinic:user:${NEW}`];
    expect((await POST(req("clinic", { method: "POST", token: TOKEN_NEW, body: { profile: appProfile } }))).status).toBe(429);
    expect(clinicsOf(NEW)).toHaveLength(0);
  });
});

describe("POST account/delete", () => {
  it("deletes the token's own account, never one named in the body", async () => {
    const { POST } = await import("./account/delete/route");
    expect((await POST(req("account/delete", { method: "POST", token: TOKEN_A, body: { confirm: "DELETE", userId: B } }))).status).toBe(200);
    expect(deleteCalls).toEqual([{ id: A }]);
  });
  it("needs the confirmation", async () => {
    const { POST } = await import("./account/delete/route");
    expect((await POST(req("account/delete", { method: "POST", token: TOKEN_A, body: {} }))).status).toBe(400);
    expect(deleteCalls).toEqual([]);
  });
});
