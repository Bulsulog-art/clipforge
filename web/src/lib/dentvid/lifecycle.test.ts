import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  baseKind,
  dueNudges,
  GAP_H,
  idempotencyKey,
  isTestEmail,
  KindNotAllowedError,
  SEQUENCE,
  lifecycleConfig,
  MissingSchemaError,
  NUDGE_RULES,
  runNudges,
  sendWelcome,
  type ClinicForMail,
  type LifecycleConfig,
  type LifecycleStore,
  type LogRow,
  type Sender,
} from "./lifecycle";
import { verifyUnsubscribeToken } from "./unsubscribe-token";
import { handleDentvideoEvent } from "./billing-webhook";
import { emailLogFromKey } from "./email";

const H = 3600_000;
const NOW = new Date("2026-11-09T10:23:00Z");
const ago = (h: number, from = NOW) => new Date(from.getTime() - h * H).toISOString();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const clinic = (n: number, over: Partial<ClinicForMail> = {}): ClinicForMail => ({
  id: id(n),
  owner_id: `owner-${n}`,
  profile: { name: `Clinic ${n}`, language: "tr" },
  plan: "trial",
  created_at: ago(30),
  email_opt_out_at: null,
  ...over,
});

/** In-memory Liman: clinics, owners' emails and the email log, with the same unique rule. */
function memoryStore(clinics: ClinicForMail[], emails: Record<string, string> = {}, opts: { missing?: boolean; unverified?: Set<string> } = {}) {
  const rows = new Map(clinics.map((c) => [c.id, { ...c }]));
  const log: LogRow[] = [];
  let clock = NOW;
  const guard = () => {
    if (opts.missing) throw new MissingSchemaError("dentvid_email_log");
  };
  const store: LifecycleStore = {
    async trialClinics(after, before, limit) {
      guard();
      return [...rows.values()]
        .filter((c) => c.plan === "trial" && !c.email_opt_out_at && Date.parse(c.created_at) >= after.getTime() && Date.parse(c.created_at) <= before.getTime())
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, limit)
        .map((c) => ({ ...c }));
    },
    async logs(ids) {
      guard();
      return log.filter((l) => ids.includes(l.clinic_id));
    },
    async clinic(cid) {
      guard();
      const c = rows.get(cid);
      return c ? { ...c } : null;
    },
    async claim(cid, kind) {
      guard();
      if (log.some((l) => l.clinic_id === cid && l.kind === kind)) return false;
      log.push({ clinic_id: cid, kind, sent_at: clock.toISOString() });
      return true;
    },
    async release(cid, kind) {
      const i = log.findIndex((l) => l.clinic_id === cid && l.kind === kind);
      if (i >= 0) log.splice(i, 1);
    },
    async owner(owner) {
      return { email: emails[owner] ?? `${owner}@clinic.example`, verified: !opts.unverified?.has(owner) };
    },
    async optOut(cid, at) {
      const c = rows.get(cid);
      if (!c) return false;
      c.email_opt_out_at = at.toISOString();
      return true;
    },
  };
  return {
    store,
    log,
    rows,
    setClock: (d: Date) => (clock = d),
  };
}

const cfg = (over: Partial<LifecycleConfig> = {}): LifecycleConfig => ({
  ...lifecycleConfig({ NEXT_PUBLIC_DENTVIDEO_URL: "https://dentvideo.com", DENTVIDEO_UNSUBSCRIBE_SECRET: "s3cret" }),
  ...over,
});

function sender() {
  const sent: { to: string; subject: string; html: string; text: string; headers?: Record<string, string>; key?: string }[] = [];
  const send: Sender = vi.fn(async (to, msg, o) => {
    sent.push({ to, ...msg, headers: o.headers, key: o.idempotencyKey });
    return true;
  });
  return { send, sent };
}

const allowAll = async () => true;

describe("scheduler: which activation email is due (fake clock)", () => {
  const due = (h: number, logs: LogRow[] = [], over: Partial<ClinicForMail> = {}, opts = {}) => dueNudges([clinic(1, { created_at: ago(h), ...over })], logs, NOW, opts);
  const sentAt = (kind: string, h: number): LogRow => ({ clinic_id: id(1), kind, sent_at: ago(h) });

  it("day 0 / 1 / 3 / 7 windows, nothing before 2 h or after 14 days", () => {
    expect(due(1.9)).toEqual([]);
    expect(due(2)).toEqual([{ clinicId: id(1), kind: "nudge_start" }]);
    expect(due(30)).toEqual([{ clinicId: id(1), kind: "nudge_preview" }]);
    expect(due(80)).toEqual([{ clinicId: id(1), kind: "nudge_objections" }]);
    expect(due(170)).toEqual([{ clinicId: id(1), kind: "nudge_offer" }]);
    expect(due(NUDGE_RULES.lastUntilH)).toEqual([]);
    expect(SEQUENCE.map((s) => s.kind)).toEqual(["nudge_start", "nudge_preview", "nudge_objections", "nudge_offer"]);
  });

  it("no catch-up burst, never backwards, never twice, at least GAP_H apart", () => {
    // First seen at 80 h with nothing sent: only day 3, not days 0 and 1 as well.
    expect(due(80).map((d) => d.kind)).toEqual(["nudge_objections"]);
    expect(due(30, [sentAt("nudge_preview", 2)])).toEqual([]);
    expect(due(80, [sentAt("nudge_offer", 1)])).toEqual([]);
    expect(due(80, [sentAt("nudge_preview", GAP_H - 1)])).toEqual([]);
    expect(due(80, [sentAt("nudge_preview", GAP_H)])).toEqual([{ clinicId: id(1), kind: "nudge_objections" }]);
  });

  it("day 7 only while founding seats are left", () => {
    expect(due(170, [], {}, { offerOpen: false })).toEqual([]);
    expect(due(170, [], {}, { offerOpen: true })).toHaveLength(1);
  });

  it("respects quiet hours in the clinic's own zone", () => {
    // NOW is 10:23 UTC: 19:23 in Tokyo (inside the window), 05:23 in New York (outside), 13:23 in Istanbul.
    expect(due(30, [], { profile: { language: "ja", country: "JP" } })).toHaveLength(1);
    expect(due(30, [], { profile: { language: "en", country: "US" } })).toEqual([]);
    expect(due(30, [], { profile: { language: "tr", country: "TR" } })).toHaveLength(1);
    // An explicit zone wins over the country.
    expect(due(30, [], { profile: { language: "en", country: "TR", timezone: "America/Los_Angeles" } })).toEqual([]);
    const late = dueNudges([clinic(1, { created_at: ago(30), profile: { country: "JP" } })], [], new Date("2026-11-09T12:00:00Z"));
    expect(late).toEqual([]); // 21:00 in Tokyo
  });

  it("walks one clinic through two weeks of hourly runs: exactly four emails, day 0, 1, 3 and 7", async () => {
    const created = new Date("2026-11-01T09:10:00Z");
    const m = memoryStore([clinic(1, { created_at: created.toISOString() })]);
    const { send, sent } = sender();
    const at: number[] = [];
    for (let h = 0; h <= 14 * 24; h++) {
      const now = new Date(created.getTime() + h * H);
      m.setClock(now);
      const before = sent.length;
      await runNudges({ store: m.store, send, allow: allowAll, now, config: cfg() });
      if (sent.length > before) at.push(h);
    }
    expect(at).toEqual([2, 24, 72, 168]);
    expect(m.log.map((l) => l.kind)).toEqual(["nudge_start", "nudge_preview", "nudge_objections", "nudge_offer"]);
    for (const s of sent) expect(s.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("the sequence stops for good the moment the clinic pays", async () => {
    const created = new Date("2026-11-01T09:10:00Z");
    const m = memoryStore([clinic(1, { created_at: created.toISOString() })]);
    const { send, sent } = sender();
    for (let h = 0; h <= 14 * 24; h++) {
      const now = new Date(created.getTime() + h * H);
      if (h === 30) m.rows.get(id(1))!.plan = "active";
      m.setClock(now);
      await runNudges({ store: m.store, send, allow: allowAll, now, config: cfg() });
    }
    expect(m.log.map((l) => l.kind)).toEqual(["nudge_start", "nudge_preview"]);
    expect(sent).toHaveLength(2);
  });

  it("the sequence stops for good after an unsubscribe", async () => {
    const created = new Date("2026-11-01T09:10:00Z");
    const m = memoryStore([clinic(1, { created_at: created.toISOString() })]);
    const { send, sent } = sender();
    for (let h = 0; h <= 14 * 24; h++) {
      const now = new Date(created.getTime() + h * H);
      if (h === 3) await m.store.optOut(id(1), now);
      m.setClock(now);
      await runNudges({ store: m.store, send, allow: allowAll, now, config: cfg() });
    }
    expect(sent).toHaveLength(1);
  });

  it("never selects a paid, opted-out or unknown clinic", () => {
    const list = [clinic(1, { plan: "active" }), clinic(2, { email_opt_out_at: ago(1) }), clinic(3, { plan: "cancelled" }), clinic(4)];
    expect(dueNudges(list, [], NOW).map((d) => d.clinicId)).toEqual([id(4)]);
  });
});

describe("runNudges: sending", () => {
  it("sends in the clinic's language with a deep link, a signed unsubscribe link and one-click headers", async () => {
    const m = memoryStore([clinic(1)]);
    const { send, sent } = sender();
    const r = await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg() });
    expect(r).toMatchObject({ due: 1, sent: 1, failed: 0 });
    const mail = sent[0];
    expect(mail.to).toBe("owner-1@clinic.example");
    expect(mail.subject).toBe("Kliniğinize özel örnek videolar");
    expect(mail.html).toContain('href="https://dentvideo.com/start?step=preview&amp;lang=tr"');
    expect(mail.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const link = /<(https:\/\/dentvideo\.com\/api\/dentvideo\/unsubscribe\?t=[^>]+)>/.exec(mail.headers?.["List-Unsubscribe"] ?? "")?.[1];
    expect(link).toBeTruthy();
    expect(mail.html).toContain(link!.replace(/&/g, "&amp;"));
    expect(verifyUnsubscribeToken(decodeURIComponent(new URL(link!).searchParams.get("t")!), "s3cret")).toBe(id(1));
    expect(mail.key).toBe(`dentvideo-nudge_preview-${id(1)}`);
  });

  it("is idempotent: a second (or racing) run sends nothing more", async () => {
    const m = memoryStore([clinic(1), clinic(2)]);
    const { send, sent } = sender();
    await Promise.all([
      runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg() }),
      runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg() }),
    ]);
    await runNudges({ store: m.store, send, allow: allowAll, now: new Date(NOW.getTime() + H), config: cfg() });
    expect(sent.map((s) => s.to).sort()).toEqual(["owner-1@clinic.example", "owner-2@clinic.example"]);
  });

  it("stops for a clinic that paid, opted out or was deleted after it was selected", async () => {
    for (const change of ["paid", "opted out", "deleted"] as const) {
      const m = memoryStore([clinic(1)]);
      const real = m.store.clinic.bind(m.store);
      m.store.clinic = async (cid) => {
        if (change === "deleted") m.rows.delete(cid);
        if (change === "paid") m.rows.get(cid)!.plan = "active";
        if (change === "opted out") await m.store.optOut(cid, NOW);
        return real(cid);
      };
      const { send, sent } = sender();
      const r = await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg() });
      expect(sent, change).toHaveLength(0);
      expect(r.skipped[change], change).toBe(1);
      expect(m.log, change).toHaveLength(0);
    }
  });

  it("skips owners who have not confirmed their address, without using up the reminder", async () => {
    const unverified = new Set(["owner-1"]);
    const m = memoryStore([clinic(1), clinic(2)], {}, { unverified });
    const { send, sent } = sender();
    const r = await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg() });
    expect(sent.map((s) => s.to)).toEqual(["owner-2@clinic.example"]);
    expect(r.skipped.unverified).toBe(1);
    expect(m.log.map((l) => l.clinic_id)).toEqual([id(2)]);
    // Confirmed an hour later: reminder 1 goes out then.
    unverified.delete("owner-1");
    const later = new Date(NOW.getTime() + H);
    m.setClock(later);
    await runNudges({ store: m.store, send, allow: allowAll, now: later, config: cfg() });
    expect(sent.map((s) => s.to)).toEqual(["owner-2@clinic.example", "owner-1@clinic.example"]);
  });

  it("skips test accounts (e2e-…) and owners without an email", async () => {
    const m = memoryStore([clinic(1), clinic(2), clinic(3)], { "owner-1": "e2e-funnel-123@dentvideo.test", "owner-2": "" });
    const { send, sent } = sender();
    const r = await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg() });
    expect(sent.map((s) => s.to)).toEqual(["owner-3@clinic.example"]);
    expect(r.skipped).toMatchObject({ "test account": 1, "no email": 1 });
    expect(isTestEmail("E2E-x@y.z")).toBe(true);
    expect(isTestEmail("dr.e2e-@y.z")).toBe(false);
  });

  it("releases the claim when the send fails, so the next hour retries", async () => {
    const m = memoryStore([clinic(1)]);
    const failing: Sender = vi.fn(async () => false);
    const r = await runNudges({ store: m.store, send: failing, allow: allowAll, now: NOW, config: cfg() });
    expect(r).toMatchObject({ sent: 0, failed: 1 });
    expect(m.log).toHaveLength(0);
    const { send, sent } = sender();
    await runNudges({ store: m.store, send, allow: allowAll, now: new Date(NOW.getTime() + H), config: cfg() });
    expect(sent).toHaveLength(1);
  });

  it("respects the global hourly cap and the per-run cap", async () => {
    const m = memoryStore([1, 2, 3, 4, 5].map((n) => clinic(n)));
    const { send, sent } = sender();
    let budget = 2;
    const r = await runNudges({ store: m.store, send, allow: async () => budget-- > 0, now: NOW, config: cfg() });
    expect(sent).toHaveLength(2);
    expect(r.stopped).toBe("hourly cap");
    const r2 = await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg({ maxPerRun: 1 }) });
    expect(sent).toHaveLength(3);
    expect(r2.stopped).toBe("run cap");
  });

  it("fails soft when migration 0005 is missing, when switched off, or without an unsubscribe secret", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { send, sent } = sender();
    const missing = memoryStore([clinic(1)], {}, { missing: true });
    expect((await runNudges({ store: missing.store, send, allow: allowAll, now: NOW, config: cfg() })).stopped).toBe("migration missing");
    expect((await runNudges({ store: missing.store, send, allow: allowAll, now: NOW, config: cfg() })).stopped).toBe("migration missing");
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("0005"))).toHaveLength(1); // logged once
    const m = memoryStore([clinic(1)]);
    expect((await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg({ enabled: false }) })).stopped).toBe("disabled");
    expect((await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg({ secret: null }) })).stopped).toBe("no unsubscribe secret");
    expect(sent).toHaveLength(0);
    warn.mockRestore();
  });

  it("day 7 carries the founding offer from billing.ts while open, and is not sent at all once closed", async () => {
    const created = ago(170);
    const open = memoryStore([clinic(1, { created_at: created, profile: { name: "Smile", language: "en" } })]);
    const a = sender();
    await runNudges({ store: open.store, send: a.send, allow: allowAll, now: NOW, config: { ...cfg(), seats: { left: 41, reliable: true } } });
    expect(a.sent[0].subject).toBe("Founding offer: Practice for $49/month for 12 months");
    expect(a.sent[0].text).toContain("first 100 clinics");
    expect(a.sent[0].text).toContain("then $99/month");
    expect(a.sent[0].text).toContain("KURUCU100");
    expect(a.sent[0].text).toContain("41 of 100");
    expect(a.sent[0].html).toContain("https://dentvideo.com/start?step=plan&amp;lang=en");

    const closed = memoryStore([clinic(1, { created_at: created, profile: { name: "Smile", language: "en" } })]);
    const b = sender();
    const closedCfg = lifecycleConfig({ NEXT_PUBLIC_DENTVIDEO_URL: "https://dentvideo.com", DENTVIDEO_UNSUBSCRIBE_SECRET: "s", DENTVIDEO_FOUNDING_OFFER: "off" });
    const r = await runNudges({ store: closed.store, send: b.send, allow: allowAll, now: NOW, config: closedCfg });
    expect(b.sent).toHaveLength(0);
    expect(r.due).toBe(0);
    expect(closed.log).toHaveLength(0);
  });

  it("skips (without failing the run) a kind the database does not allow yet (migration 0011)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = memoryStore([clinic(1, { created_at: ago(3) }), clinic(2)]);
    const realClaim = m.store.claim.bind(m.store);
    m.store.claim = async (cid, kind) => {
      if (kind === "nudge_start") throw new KindNotAllowedError(kind);
      return realClaim(cid, kind);
    };
    const { send, sent } = sender();
    const r = await runNudges({ store: m.store, send, allow: allowAll, now: NOW, config: cfg() });
    expect(r.skipped["migration 0011 missing"]).toBe(1);
    expect(sent.map((s) => s.to)).toEqual(["owner-2@clinic.example"]);
    warn.mockRestore();
  });
});

describe("welcome after the first payment", () => {
  it("is sent once per clinic, without an unsubscribe header (transactional)", async () => {
    const m = memoryStore([clinic(1, { plan: "active", profile: { name: "Praxis Mitte", language: "de" } })]);
    const { send, sent } = sender();
    expect(await sendWelcome({ store: m.store, send, config: cfg() }, id(1))).toBe("sent");
    expect(await sendWelcome({ store: m.store, send, config: cfg() }, id(1))).toBe("already sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Willkommen bei DentVideo, Praxis Mitte");
    expect(sent[0].html).toContain('href="https://dentvideo.com/app"');
    expect(sent[0].headers).toBeUndefined();
  });

  it("skips test accounts and missing clinics, and fails soft without the migration", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { send, sent } = sender();
    const m = memoryStore([clinic(1, { plan: "active" })], { "owner-1": "e2e-pay@x.test" });
    expect(await sendWelcome({ store: m.store, send, config: cfg() }, id(1))).toBe("test account");
    expect(await sendWelcome({ store: m.store, send, config: cfg() }, id(9))).toBe("no clinic");
    const missing = memoryStore([clinic(1, { plan: "active" })], {}, { missing: true });
    expect(await sendWelcome({ store: missing.store, send, config: cfg() }, id(1))).toBe("migration missing");
    expect(sent).toHaveLength(0);
    warn.mockRestore();
  });

  it("goes only to an owner who confirmed the address", async () => {
    const { send, sent } = sender();
    const m = memoryStore([clinic(1, { plan: "active" })], {}, { unverified: new Set(["owner-1"]) });
    expect(await sendWelcome({ store: m.store, send, config: cfg() }, id(1))).toBe("unverified");
    expect(m.log).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("the payment webhook asks for it only when a clinic becomes active", async () => {
    const clinicRow: Record<string, unknown> = { id: id(1), owner_id: "owner-1", plan: "trial", plan_tier: null, dodo_subscription_id: null, plan_renews_at: null };
    const db = {
      from() {
        const filters: [string, unknown][] = [];
        let patch: Record<string, unknown> | null = null;
        const q = {
          select: () => q,
          update: (p: Record<string, unknown>) => ((patch = p), q),
          eq: (k: string, v: unknown) => (filters.push([k, v]), q),
          maybeSingle: async () => ({ data: filters.every(([k, v]) => clinicRow[k] === v) ? { ...clinicRow } : null, error: null }),
          then(resolve: (v: unknown) => void) {
            if (patch) Object.assign(clinicRow, patch);
            return resolve({ error: null });
          },
        };
        return q;
      },
    } as unknown as SupabaseClient;
    const evt = (type: string, status: string) => ({
      type,
      data: { subscription_id: "sub_1", product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN", status, metadata: { app: "dentvideo", clinic_id: id(1), owner_id: "owner-1" } },
    });
    const welcome = vi.fn(async () => "sent");
    const enqueueWeek = vi.fn(async () => "queued" as const);
    const r = await handleDentvideoEvent(db, evt("subscription.active", "active"), { enqueueWeek, sendWelcome: welcome });
    expect(r.body).toMatchObject({ plan: "active", welcomeEmail: "sent" });
    await handleDentvideoEvent(db, evt("subscription.renewed", "active"), { enqueueWeek, sendWelcome: welcome });
    expect(welcome).toHaveBeenCalledTimes(1);
  });
});

describe("kinds", () => {
  it("match the migrations' check constraints", async () => {
    const { readFileSync } = await import("node:fs");
    const v5 = readFileSync(new URL("../../../../supabase/liman/0005_dentvid_email.sql", import.meta.url), "utf8");
    for (const k of ["welcome", "nudge_preview", "nudge_offer"]) expect(v5).toContain(`'${k}'`);
    expect(v5).toMatch(/unique \(clinic_id, kind\)/);
    const v11 = readFileSync(new URL("../../../../supabase/liman/0011_dentvid_email_kinds.sql", import.meta.url), "utf8");
    const re = new RegExp(/kind ~ '([^']+)'/.exec(v11)![1]);
    for (const k of [...SEQUENCE.map((s) => s.kind), "welcome", "nudge_post_2026_11_09", "monthly_2026_10"]) {
      expect(k, k).toMatch(re);
      expect(k.length, k).toBeLessThanOrEqual(40);
    }
  });

  it("idempotency keys stay readable by the admin log", () => {
    expect(idempotencyKey("nudge_start", id(1))).toBe(`dentvideo-nudge_start-${id(1)}`);
    expect(idempotencyKey("nudge_post_2026_11_09", id(1))).toBe(`dentvideo-nudge_post-${id(1)}-2026-11-09`);
    expect(idempotencyKey("monthly_2026_10", id(1))).toBe(`dentvideo-monthly-${id(1)}-2026-10-01`);
    expect(emailLogFromKey(idempotencyKey("nudge_post_2026_11_09", id(1)))).toEqual({ clinicId: id(1), kind: "nudge_post" });
    expect(baseKind("monthly_2026_10")).toBe("monthly");
  });
});
