import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOwnerId, auditRef, buildAccountExport, confirmMatches, deleteDentvideoAccount, isOwnPath, listOwnerFiles, loadAccountRecords, type DodoDeps } from "./account";

const A = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const B = "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f";
const CLINIC_A = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const CLINIC_B = "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d";

type Row = Record<string, unknown>;

/**
 * An in-memory stand-in for the parts of supabase-js the account code uses:
 * the two DentVideo tables, the "dentvid" bucket and auth.admin.deleteUser.
 * `leaky` makes table reads ignore their filters (as if RLS and the query
 * were both wrong) to prove the code's own owner checks hold.
 */
type AuthUser = { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; identities?: { provider: string }[] };

function fakeSupabase(opts: { leaky?: boolean; authUsers?: Record<string, Partial<AuthUser>> } = {}) {
  const tables: Record<string, Row[]> = {
    dentvid_clinics: [
      { id: CLINIC_A, owner_id: A, profile: { name: "Riverside Dental", language: "en" }, logo_path: `${A}/logo.png`, plan: "trial", dodo_subscription_id: null },
      { id: CLINIC_B, owner_id: B, profile: { name: "Other Clinic" }, logo_path: `${B}/logo.png`, plan: "active", dodo_subscription_id: "sub_B" },
    ],
    dentvid_items: [
      { id: "i1", clinic_id: CLINIC_A, owner_id: A, title: "Brushing", spoken: "Two minutes…", copy: { caption: "Brush well" }, video_path: `${A}/videos/v1.mp4`, thumb_path: `${A}/videos/v1.jpg`, source_path: null },
      { id: "i2", clinic_id: CLINIC_A, owner_id: A, title: "My recording", copy: null, video_path: `${A}/videos/v2.mp4`, thumb_path: null, source_path: `${A}/recordings/1700000000000.mp4` },
      { id: "i3", clinic_id: CLINIC_B, owner_id: B, title: "Not yours", copy: { caption: "secret" }, video_path: `${B}/videos/x.mp4`, thumb_path: null, source_path: null },
    ],
  };
  const files = new Map<string, { size: number; mimetype: string }>(
    [
      `${A}/logo.png`,
      `${A}/videos/v1.mp4`,
      `${A}/videos/v1.jpg`,
      `${A}/videos/v2.mp4`,
      `${A}/recordings/1700000000000.mp4`,
      `${B}/logo.png`,
      `${B}/videos/x.mp4`,
    ].map((p) => [p, { size: 1000, mimetype: p.endsWith(".png") ? "image/png" : "video/mp4" }]),
  );
  const users = new Set([A, B]);
  const dvOnly = { app_metadata: { provider: "email", providers: ["email"], product: "dentvideo" }, user_metadata: {}, identities: [{ provider: "email" }] };
  const authUsers = new Map<string, AuthUser>([A, B].map((id) => [id, { id, ...dvOnly, ...(opts.authUsers?.[id] ?? {}) } as AuthUser]));
  const calls: string[] = [];

  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let mode: "select" | "delete" = "select";
    const rows = () => (opts.leaky ? tables[table] : tables[table].filter((r) => filters.every(([k, v]) => r[k] === v)));
    const q = {
      select: () => q,
      order: () => q,
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      delete: () => ((mode = "delete"), q),
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      then(resolve: (v: unknown) => void) {
        if (mode === "delete") {
          const gone = tables[table].filter((r) => filters.every(([k, v]) => r[k] === v));
          tables[table] = tables[table].filter((r) => !gone.includes(r));
          calls.push(`delete ${table} ${JSON.stringify(filters)}`);
          return resolve({ error: null, count: gone.length });
        }
        return resolve({ data: rows(), error: null });
      },
    };
    return q;
  };

  const storage = {
    from: () => ({
      list: async (prefix: string) => {
        const names = new Map<string, boolean>();
        for (const p of files.keys()) {
          if (!p.startsWith(`${prefix}/`)) continue;
          const rest = p.slice(prefix.length + 1);
          const [head, ...more] = rest.split("/");
          names.set(head, more.length > 0 || names.get(head) === true);
        }
        return {
          data: [...names].map(([name, isFolder]) =>
            isFolder ? { name, id: null, metadata: null } : { name, id: `id-${name}`, metadata: files.get(`${prefix}/${name}`) },
          ),
          error: null,
        };
      },
      remove: async (paths: string[]) => {
        calls.push(`storage.remove ${paths.length}`);
        for (const p of paths) files.delete(p);
        return { data: paths.map((name) => ({ name })), error: null };
      },
      createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ path: p, signedUrl: `https://liman.example/sign/${p}?t=1`, error: null })), error: null }),
    }),
  };

  const auth = {
    admin: {
      getUserById: async (id: string) => {
        if (!users.has(id)) return { data: { user: null }, error: { status: 404, code: "user_not_found", message: "User not found" } };
        return { data: { user: authUsers.get(id) }, error: null };
      },
      updateUserById: async (id: string, attrs: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) => {
        calls.push(`auth.updateUserById ${id} ${JSON.stringify(attrs)}`);
        const u = authUsers.get(id)!;
        // GoTrue merges metadata and drops keys set to null.
        const merge = (base: Record<string, unknown> = {}, patch: Record<string, unknown> = {}) =>
          Object.fromEntries(Object.entries({ ...base, ...patch }).filter(([, v]) => v !== null));
        if (attrs.app_metadata) u.app_metadata = merge(u.app_metadata, attrs.app_metadata);
        if (attrs.user_metadata) u.user_metadata = merge(u.user_metadata, attrs.user_metadata);
        return { data: { user: u }, error: null };
      },
      deleteUser: async (id: string) => {
        calls.push(`auth.deleteUser ${id}`);
        if (!users.has(id)) return { data: null, error: { status: 404, message: "User not found" } };
        users.delete(id);
        return { data: {}, error: null };
      },
    },
  };

  return { db: { from, storage, auth } as unknown as SupabaseClient, tables, files, users, authUsers, calls };
}

const dodo = (status = "active") => {
  const log: string[] = [];
  const deps: DodoDeps = {
    getSubscription: vi.fn(async (id: string) => (log.push(`get ${id}`), { subscription_id: id, status })),
    cancelSubscription: vi.fn(async (id: string) => void log.push(`cancel ${id}`)),
  };
  return { deps, log };
};

describe("owner guards", () => {
  it("accepts only a uuid owner id and paths inside its folder", () => {
    expect(() => assertOwnerId("../etc")).toThrow();
    expect(() => assertOwnerId("")).toThrow();
    expect(isOwnPath(`${A}/videos/v1.mp4`, A)).toBe(true);
    expect(isOwnPath(`${A}/../${B}/logo.png`, A)).toBe(false);
    expect(isOwnPath(`${A}//x`, A)).toBe(false);
    expect(isOwnPath(`${B}/logo.png`, A)).toBe(false);
    expect(isOwnPath(`${A}x/logo.png`, A)).toBe(false);
  });

  it("lists only the owner's own files, walking folders", async () => {
    const { db } = fakeSupabase();
    const paths = (await listOwnerFiles(db, A)).map((f) => f.path).sort();
    expect(paths).toEqual([`${A}/logo.png`, `${A}/recordings/1700000000000.mp4`, `${A}/videos/v1.jpg`, `${A}/videos/v1.mp4`, `${A}/videos/v2.mp4`]);
  });

  it("compares the typed clinic name calmly (case, spaces, Unicode form)", () => {
    expect(confirmMatches("  riverside   DENTAL ", "Riverside Dental")).toBe(true);
    expect(confirmMatches("Gülümse Diş Kliniği".normalize("NFD"), "Gülümse Diş Kliniği")).toBe(true);
    expect(confirmMatches("Riverside", "Riverside Dental")).toBe(false);
    expect(confirmMatches("", "")).toBe(false);
  });
});

describe("deleteDentvideoAccount", () => {
  it("removes the owner's storage, videos, clinic and login — in that order — and nothing of another clinic", async () => {
    const s = fakeSupabase();
    const log = vi.fn();
    const res = await deleteDentvideoAccount({ admin: s.db, user: { id: A, email: "dr@a.example" }, confirm: "Riverside Dental", dodo: null, log });
    expect(res).toEqual({ ok: true, files: 5, items: 2, clinic: true, cancelledSubscription: false, userDeleted: true, loginKept: false });

    const order = s.calls.map((c) => c.split(" ").slice(0, 2).join(" "));
    expect(order).toEqual(["storage.remove 5", "delete dentvid_items", "delete dentvid_clinics", `auth.deleteUser ${A}`]);
    for (const c of s.calls.filter((c) => c.startsWith("delete"))) expect(c).toContain(`["owner_id","${A}"]`);

    // Clinic B is untouched.
    expect([...s.files.keys()].sort()).toEqual([`${B}/logo.png`, `${B}/videos/x.mp4`]);
    expect(s.tables.dentvid_items.map((r) => r.id)).toEqual(["i3"]);
    expect(s.tables.dentvid_clinics.map((r) => r.id)).toEqual([CLINIC_B]);
    expect([...s.users]).toEqual([B]);

    // One audit line, without the id, name or email.
    expect(log).toHaveBeenCalledTimes(1);
    const line = JSON.stringify(log.mock.calls[0][0]);
    expect(line).toContain("dentvideo.account_deleted");
    expect(line).toContain(auditRef(A));
    expect(line).not.toContain(A);
    expect(line).not.toContain("Riverside");
    expect(line).not.toContain("dr@a.example");
  });

  it("is idempotent: a second run (or a retry after a partial failure) finishes cleanly", async () => {
    const s = fakeSupabase();
    const args = { admin: s.db, user: { id: A, email: "dr@a.example" }, confirm: "Riverside Dental", dodo: null, log: () => {} };
    expect((await deleteDentvideoAccount(args)).ok).toBe(true);
    const again = await deleteDentvideoAccount(args);
    expect(again).toEqual({ ok: true, files: 0, items: 0, clinic: false, cancelledSubscription: false, userDeleted: false, loginKept: false });
    expect(s.tables.dentvid_clinics).toHaveLength(1);
    expect(s.files.size).toBe(2);
  });

  it("keeps a login another Liman app also uses: only DentVideo's data and markers go", async () => {
    const s = fakeSupabase({
      authUsers: {
        [A]: {
          app_metadata: { provider: "email", providers: ["email"], product: "dentvideo", email_verified_at: "2026-11-01T00:00:00Z", email_verified_for: "dr@a.example", email_verified_via: "code", role: "aires_admin" },
          user_metadata: { product: "dentvideo", full_name: "Dr A" },
        },
      },
    });
    const log = vi.fn();
    const res = await deleteDentvideoAccount({ admin: s.db, user: { id: A, email: "dr@a.example" }, confirm: "Riverside Dental", dodo: null, log });
    expect(res).toMatchObject({ ok: true, files: 5, items: 2, clinic: true, userDeleted: false, loginKept: true });
    expect(s.calls.some((c) => c.startsWith("auth.deleteUser"))).toBe(false);
    expect([...s.users].sort()).toEqual([A, B].sort());
    // DentVideo's keys are gone; the other app's are untouched.
    expect(s.authUsers.get(A)!.app_metadata).toEqual({ provider: "email", providers: ["email"], role: "aires_admin" });
    expect(s.authUsers.get(A)!.user_metadata).toEqual({ full_name: "Dr A" });
    expect(JSON.stringify(log.mock.calls[0][0])).toContain("kept_shared");
  });

  it("never deletes a login whose only DentVideo claim is user_metadata (anyone can write that)", async () => {
    const s = fakeSupabase({ authUsers: { [A]: { app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { product: "dentvideo" } } } });
    const res = await deleteDentvideoAccount({ admin: s.db, user: { id: A, email: "dr@a.example" }, confirm: "Riverside Dental", dodo: null, log: () => {} });
    expect(res).toMatchObject({ ok: true, userDeleted: false, loginKept: true });
    expect(s.users.has(A)).toBe(true);
    expect(s.tables.dentvid_clinics.map((r) => r.id)).toEqual([CLINIC_B]);
  });

  it("keeps a login with another product listed or a non-email identity", async () => {
    for (const other of [
      { app_metadata: { provider: "email", product: "dentvideo", products: ["dentvideo", "coz"] } },
      { app_metadata: { provider: "google", providers: ["email", "google"], product: "dentvideo" }, identities: [{ provider: "email" }, { provider: "google" }] },
    ]) {
      const s = fakeSupabase({ authUsers: { [A]: other } });
      expect(await deleteDentvideoAccount({ admin: s.db, user: { id: A }, confirm: "Riverside Dental", dodo: null, log: () => {} })).toMatchObject({ ok: true, loginKept: true });
      expect(s.users.has(A)).toBe(true);
    }
  });

  it("deletes nothing when the typed name does not match", async () => {
    const s = fakeSupabase();
    const res = await deleteDentvideoAccount({ admin: s.db, user: { id: A }, confirm: "Other Clinic", dodo: null });
    expect(res).toEqual({ ok: false, reason: "confirm" });
    expect(s.calls).toEqual([]);
  });

  it("asks to cancel first when the plan is paid and there is no Dodo API key", async () => {
    const s = fakeSupabase();
    s.tables.dentvid_clinics[0].plan = "active";
    s.tables.dentvid_clinics[0].dodo_subscription_id = "sub_A";
    const res = await deleteDentvideoAccount({ admin: s.db, user: { id: A }, confirm: "Riverside Dental", dodo: null });
    expect(res).toEqual({ ok: false, reason: "subscription_active" });
    expect(s.calls).toEqual([]);
  });

  it("cancels the clinic's own subscription before deleting anything when the API is available", async () => {
    const s = fakeSupabase();
    s.tables.dentvid_clinics[0].plan = "active";
    s.tables.dentvid_clinics[0].dodo_subscription_id = "sub_A";
    const d = dodo("active");
    const res = await deleteDentvideoAccount({ admin: s.db, user: { id: A }, confirm: "Riverside Dental", dodo: d.deps, log: () => {} });
    expect(res).toMatchObject({ ok: true, cancelledSubscription: true });
    expect(d.log).toEqual(["get sub_A", "cancel sub_A"]);
    expect(d.deps.cancelSubscription).not.toHaveBeenCalledWith("sub_B");
  });

  it("does not cancel a subscription that already ended, and stops before deleting when billing fails", async () => {
    const s = fakeSupabase();
    s.tables.dentvid_clinics[0].plan = "paused";
    s.tables.dentvid_clinics[0].dodo_subscription_id = "sub_A";
    const ended = dodo("cancelled");
    expect(await deleteDentvideoAccount({ admin: s.db, user: { id: A }, confirm: "Riverside Dental", dodo: ended.deps, log: () => {} })).toMatchObject({ ok: true, cancelledSubscription: false });
    expect(ended.log).toEqual(["get sub_A"]);

    const t = fakeSupabase();
    t.tables.dentvid_clinics[0].plan = "active";
    t.tables.dentvid_clinics[0].dodo_subscription_id = "sub_A";
    const failing: DodoDeps = { getSubscription: async () => ({ subscription_id: "sub_A", status: "active" }), cancelSubscription: async () => Promise.reject(new Error("503")) };
    expect(await deleteDentvideoAccount({ admin: t.db, user: { id: A }, confirm: "Riverside Dental", dodo: failing })).toEqual({ ok: false, reason: "billing_failed", step: "billing" });
    expect(t.calls).toEqual([]);
  });

  it("never acts on another clinic's row even if a read leaks it", async () => {
    const s = fakeSupabase({ leaky: true });
    // The leaky read returns clinic A first; flip the order so B's row comes back for A.
    s.tables.dentvid_clinics.reverse();
    const res = await deleteDentvideoAccount({ admin: s.db, user: { id: A }, confirm: "Other Clinic", dodo: null });
    expect(res).toEqual({ ok: false, reason: "failed", step: "lookup" });
    expect(s.calls).toEqual([]);
  });
});

describe("buildAccountExport", () => {
  it("has the clinic, every video's script and caption, and signed links — only for this owner", async () => {
    const s = fakeSupabase({ leaky: true }); // even if the reads returned every row
    const out = await buildAccountExport(s.db, { id: A, email: "dr@a.example", created_at: "2026-01-01T00:00:00Z" }, new Date("2026-11-08T10:00:00Z"));
    expect(out.format).toBe("dentvideo-export/1");
    expect(out.links_expire_at).toBe("2026-11-09T10:00:00.000Z");
    expect(out.account).toEqual({ id: A, email: "dr@a.example", created_at: "2026-01-01T00:00:00Z" });
    expect(out.clinic).toMatchObject({ id: CLINIC_A, profile: { name: "Riverside Dental" }, logo_url: `https://liman.example/sign/${A}/logo.png?t=1` });
    expect(out.videos.map((v) => v.id)).toEqual(["i1", "i2"]);
    expect(out.videos[0]).toMatchObject({ spoken: "Two minutes…", copy: { caption: "Brush well" }, links: { video: expect.stringContaining(`${A}/videos/v1.mp4`), thumbnail: expect.any(String) } });
    expect(out.videos[1].links.source).toContain(`${A}/recordings/`);
    expect(out.files.map((f) => f.path).sort()).toEqual([`${A}/logo.png`, `${A}/recordings/1700000000000.mp4`, `${A}/videos/v1.jpg`, `${A}/videos/v1.mp4`, `${A}/videos/v2.mp4`]);

    const text = JSON.stringify(out);
    expect(text).not.toContain(B);
    expect(text).not.toContain("Other Clinic");
    expect(text).not.toContain("secret");
  });

  it("drops another owner's clinic row if a read leaks it", async () => {
    const s = fakeSupabase({ leaky: true });
    s.tables.dentvid_clinics.reverse();
    const out = await buildAccountExport(s.db, { id: A });
    expect(out.clinic).toBeNull();
    expect(JSON.stringify(out)).not.toContain(B);
  });
});

describe("export: billing, email and event records (GDPR art. 15)", () => {
  /** The service-role tables, with a row of another clinic in each; `leaky` ignores the clinic filter. */
  function serviceDb(opts: { leaky?: boolean; missing?: string[] } = {}) {
    const tables: Record<string, Row[]> = {
      dentvid_subscriptions: [
        { dodo_subscription_id: "sub_A", clinic_id: CLINIC_A, status: "active", tier: "practice" },
        { dodo_subscription_id: "sub_B", clinic_id: CLINIC_B, status: "active", tier: "starter" },
      ],
      dentvid_payments: [
        { dodo_payment_id: "pay_A", clinic_id: CLINIC_A },
        { dodo_payment_id: "pay_B", clinic_id: CLINIC_B },
      ],
      dentvid_email_log: [{ clinic_id: CLINIC_A, kind: "welcome", sent_at: "2026-11-01T00:00:00Z" }, { clinic_id: CLINIC_B, kind: "welcome" }],
      dentvid_email_sends: [{ clinic_id: CLINIC_A, kind: "ready", status: "sent" }, { clinic_id: CLINIC_B, kind: "ready", status: "sent" }],
      dentvid_events: [{ clinic_id: CLINIC_A, name: "clinic_saved", props: {} }, { clinic_id: CLINIC_B, name: "clinic_saved", props: {} }],
    };
    const asked: string[] = [];
    const from = (table: string) => {
      const filters: [string, unknown][] = [];
      const q = {
        select: () => q,
        order: () => q,
        limit: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        then(resolve: (v: unknown) => void) {
          asked.push(`${table} ${JSON.stringify(filters)}`);
          if (opts.missing?.includes(table)) return resolve({ data: null, error: { code: "42P01", message: `relation "public.${table}" does not exist` } });
          const rows = opts.leaky ? tables[table] : tables[table].filter((r) => filters.every(([k, v]) => r[k] === v));
          return resolve({ data: rows, error: null });
        },
      };
      return q;
    };
    return { db: { from } as unknown as SupabaseClient, asked };
  }

  it("adds the clinic's subscriptions, payments, emails and events — scoped to its own clinic id", async () => {
    const s = fakeSupabase();
    const svc = serviceDb({ leaky: true }); // even if every read returned every clinic's rows
    const out = await buildAccountExport(s.db, { id: A }, new Date(), (clinicId) => loadAccountRecords(svc.db, clinicId));
    expect(out.records?.subscriptions.map((r) => r.dodo_subscription_id)).toEqual(["sub_A"]);
    expect(out.records?.payments.map((r) => r.dodo_payment_id)).toEqual(["pay_A"]);
    expect(out.records?.emails).toHaveLength(1);
    expect(out.records?.email_sends).toHaveLength(1);
    expect(out.records?.events).toHaveLength(1);
    expect(svc.asked.every((q) => q.includes(CLINIC_A))).toBe(true);
    const text = JSON.stringify(out);
    expect(text).not.toContain(CLINIC_B);
    expect(text).not.toContain("sub_B");
  });

  it("skips a table that is not migrated yet, and reads nothing without a clinic", async () => {
    const svc = serviceDb({ missing: ["dentvid_email_sends"] });
    const r = await loadAccountRecords(svc.db, CLINIC_A);
    expect(r.email_sends).toEqual([]);
    expect(r.subscriptions).toHaveLength(1);
    const none = serviceDb();
    expect(await loadAccountRecords(none.db, null)).toEqual({ subscriptions: [], payments: [], emails: [], email_sends: [], events: [] });
    expect(none.asked).toEqual([]);
  });
});
