import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BILLING_CONFIRM_COPY, billingConfirmText } from "@/content/dentvideo-billing-confirm";
import { LOCALES } from "@/content/dentvideo-locales";
import {
  LIBRARY_DAYS_AFTER_END,
  cancelledEmail,
  confirmKind,
  libraryUntil,
  planChangedEmail,
  reviewDemoCheck,
  sendBillingConfirmation,
  type BillingConfirmNotice,
  type ConfirmDeps,
} from "./billing-confirm-email";
import { KindNotAllowedError, MissingSchemaError, type ClinicForMail, type LifecycleStore, type LogRow, type Sender } from "./lifecycle";
import { noticeDate } from "./retention-email";

const CLINIC = "11111111-2222-3333-4444-555555555555";
const END = "2026-12-10T12:00:00.000Z";
const APP = "https://dentvideo.com";
const CANCEL: BillingConfirmNotice = { kind: "cancelled", subscriptionId: "sub_1", endsAt: END };
const CHANGE: BillingConfirmNotice = { kind: "plan_changed", subscriptionId: "sub_1", tier: "practice", eventAt: "2026-11-24T09:00:00.000Z" };

const clinic = (over: Partial<ClinicForMail> = {}): ClinicForMail => ({
  id: CLINIC,
  owner_id: "owner-1",
  profile: { name: "Örnek Diş Kliniği", language: "tr", country: "TR" },
  plan: "active",
  created_at: "2026-08-01T00:00:00Z",
  email_opt_out_at: null,
  ...over,
});

function memory(c: ClinicForMail | null, owner: { email: string; verified: boolean } | null = { email: "owner@sample-practice.example", verified: true }) {
  const log: LogRow[] = [];
  const released: string[] = [];
  const store: LifecycleStore = {
    trialClinics: async () => [],
    logs: async () => log,
    clinic: async (id) => (c && c.id === id ? c : null),
    claim: async (cid, kind) => (log.some((l) => l.clinic_id === cid && l.kind === kind) ? false : (log.push({ clinic_id: cid, kind, sent_at: "" }), true)),
    release: async (cid, kind) => {
      released.push(kind);
      const i = log.findIndex((l) => l.clinic_id === cid && l.kind === kind);
      if (i >= 0) log.splice(i, 1);
    },
    owner: async () => owner,
    optOut: async () => true,
  };
  return { store, log, released };
}

function sender(ok = true) {
  const sent: { to: string; subject: string; text: string; html: string; key?: string; log?: unknown; headers?: unknown }[] = [];
  const send: Sender = vi.fn(async (to, m, o) => (sent.push({ to, ...m, key: o.idempotencyKey, log: o.log, headers: o.headers }), ok));
  return { send, sent };
}

const deps = (store: LifecycleStore, send: Sender, over: Partial<ConfirmDeps> = {}): ConfirmDeps => ({ store, send, config: { base: APP, enabled: true }, ...over });

/* ------------------------------------------------------------------ the copy */

const DASHES = /[–—]/;
const SHOUTS = /[!！¡]/;
const strings = (o: unknown): string[] => (typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(strings) : []);

describe("the copy, in every DentVideo language", () => {
  it("exists for all eight languages, with every key filled", () => {
    expect(Object.keys(BILLING_CONFIRM_COPY).sort()).toEqual([...LOCALES].sort());
    const keys = (o: object): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v).map((s) => `${k}.${s}`) : [k]));
    const want = keys(BILLING_CONFIRM_COPY.en).sort();
    for (const l of LOCALES) {
      expect(keys(BILLING_CONFIRM_COPY[l]).sort(), l).toEqual(want);
      for (const s of strings(BILLING_CONFIRM_COPY[l])) expect(s.trim().length, l).toBeGreaterThan(0);
    }
  });

  it("has no em or en dashes and no exclamation marks", () => {
    for (const l of LOCALES) {
      for (const s of strings(BILLING_CONFIRM_COPY[l])) {
        expect(s, `${l}: ${s}`).not.toMatch(DASHES);
        expect(s, `${l}: ${s}`).not.toMatch(SHOUTS);
      }
    }
  });

  it("names the dates and the tier where it should, and promises nothing the product does not do", () => {
    for (const l of LOCALES) {
      const c = BILLING_CONFIRM_COPY[l];
      expect(c.cancelled.title, l).toContain("{end}");
      expect(c.cancelled.body, l).toContain("{end}");
      expect(c.cancelled.library, l).toContain("{library}");
      expect(c.cancelled.library, l).toContain("90");
      expect(c.cancelled.again, l).toContain("{end}");
      expect(c.changed.subject, l).toContain("{tier}");
      expect(c.changed.body, l).toContain("{tier}");
      expect(c.changed.money, l).toContain("Dodo Payments");
      // No placeholder that is never filled.
      for (const s of strings(c)) expect(s.replace(/\{(end|library|tier|clinic)\}/g, ""), `${l}: ${s}`).not.toMatch(/[{}]/);
    }
    const en = strings(BILLING_CONFIRM_COPY.en).join(" ");
    expect(en).not.toMatch(/refund|guarantee|within \d+ (hours|days)|credit you/i);
    // US spelling, like the rest of the shared English copy.
    expect(en).not.toMatch(/colour|\bcancelled\b/i);
  });

  it("falls back to English for a language DentVideo does not speak", () => {
    expect(billingConfirmText("it").lang).toBe("en");
    expect(billingConfirmText("constructor").lang).toBe("en");
    expect(billingConfirmText(null).lang).toBe("en");
    expect(billingConfirmText("pl").lang).toBe("pl");
  });

  it("keeps the library for the same 90 days as the worker's retention and the privacy policy", () => {
    const worker = fs.readFileSync(path.resolve(__dirname, "../../../../worker/src/dentvid/retention.ts"), "utf8");
    expect(worker).toMatch(new RegExp(`export const RETENTION_DAYS = ${LIBRARY_DAYS_AFTER_END};`));
    const privacy = fs.readFileSync(path.resolve(__dirname, "../../content/legal/en.ts"), "utf8");
    expect(privacy).toMatch(/for 90 days after it ends/);
    expect(libraryUntil(new Date(END)).toISOString()).toBe("2027-03-10T12:00:00.000Z");
  });
});

/* ------------------------------------------------------------------ rendering */

describe("rendering", () => {
  it("the cancellation names the day the videos stop and the day the library stays until, in every language", () => {
    for (const l of LOCALES) {
      const msg = cancelledEmail({ language: l, clinicName: "Örnek Diş Kliniği", endsAt: new Date(END), timeZone: "Europe/Istanbul", appUrl: `${APP}/app` });
      const end = noticeDate(l, new Date(END), "Europe/Istanbul");
      const library = noticeDate(l, libraryUntil(new Date(END)), "Europe/Istanbul");
      expect(msg.text, l).toContain(end);
      expect(msg.text, l).toContain(library);
      expect(msg.html, l).toContain(end);
      expect(msg.subject + msg.text, l).not.toMatch(DASHES);
      expect(msg.subject + msg.text, l).not.toMatch(SHOUTS);
      expect(msg.text, l).not.toMatch(/\{(end|library|clinic)\}/);
      expect(msg.html, l).toContain(`href="${APP}/app"`);
      expect(msg.html, l).toContain(`lang="${l}"`);
    }
    expect(cancelledEmail({ language: "en", clinicName: "Sample Dental Practice", endsAt: new Date(END), appUrl: `${APP}/app` }).text).toContain(
      `You keep getting your weekly videos until ${noticeDate("en", new Date(END))}.`,
    );
    expect(cancelledEmail({ language: "ar", clinicName: "", endsAt: new Date(END), appUrl: `${APP}/app` }).html).toContain('dir="rtl"');
  });

  it("the date is the clinic's own day: midnight UTC is still the evening before in New York", () => {
    const midnight = new Date("2026-12-10T00:00:00Z");
    const msg = cancelledEmail({ language: "en", clinicName: "", endsAt: midnight, timeZone: "America/New_York", appUrl: `${APP}/app` });
    expect(msg.subject).toBe("Your DentVideo plan is canceled");
    const local = noticeDate("en", new Date("2026-12-09T12:00:00Z"));
    expect(local).not.toBe(noticeDate("en", midnight));
    expect(msg.text).toContain(`until ${local}.`);
    expect(msg.text).toContain("Hello,");
  });

  it("greets a clinic without a name plainly, in every language", () => {
    for (const l of LOCALES) {
      for (const msg of [
        cancelledEmail({ language: l, clinicName: "  ", endsAt: new Date(END), appUrl: `${APP}/app` }),
        planChangedEmail({ language: l, clinicName: "", tier: "starter", appUrl: `${APP}/app` }),
      ]) {
        const hello = msg.text.split("\n\n")[1];
        expect(hello, l).toBe(BILLING_CONFIRM_COPY[l].helloNoName);
        expect(hello, l).not.toMatch(/[,:،、]\s*[,:،、]|\{clinic\}/);
      }
      expect(planChangedEmail({ language: l, clinicName: "Örnek Diş Kliniği", tier: "starter", appUrl: `${APP}/app` }).text.split("\n\n")[1], l).toContain("Örnek Diş Kliniği");
    }
  });

  it("the plan change names the new plan, what it brings, and who handles the difference", () => {
    for (const l of LOCALES) {
      const msg = planChangedEmail({ language: l, clinicName: "Örnek Diş Kliniği", tier: "practice", appUrl: `${APP}/app` });
      expect(msg.subject, l).toContain("Practice");
      expect(msg.text, l).toContain(BILLING_CONFIRM_COPY[l].changed.practice);
      expect(msg.text, l).toContain("Dodo Payments");
      expect(msg.subject + msg.text, l).not.toMatch(DASHES);
      expect(msg.subject + msg.text, l).not.toMatch(SHOUTS);
      expect(msg.html, l).toContain(`href="${APP}/app/settings#billing-title"`);
    }
    const starter = planChangedEmail({ language: "en", clinicName: "Sample Dental Practice", tier: "starter", appUrl: `${APP}/app` });
    expect(starter.subject).toBe("Your DentVideo plan is now Starter");
    expect(starter.text).toContain("Starter brings you five narrated, captioned videos every Monday");
    expect(starter.text).not.toContain("recordings");
    // Group is set up by hand: no feature line is claimed for it.
    const group = planChangedEmail({ language: "en", clinicName: "", tier: "group", appUrl: `${APP}/app` });
    expect(group.subject).toBe("Your DentVideo plan is now Group");
    expect(group.text).not.toContain("brings you");
  });
});

/* ------------------------------------------------------------------ sending */

describe("sendBillingConfirmation", () => {
  it("sends the cancellation once, in the clinic's language, transactional (no unsubscribe headers)", async () => {
    const m = memory(clinic());
    const { send, sent } = sender();
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, CANCEL)).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("owner@sample-practice.example");
    expect(sent[0].subject).toBe("DentVideo planınız iptal edildi");
    expect(sent[0].text).toContain("10 Aralık 2026");
    expect(sent[0].text).toContain("10 Mart 2027");
    expect(sent[0].headers).toBeUndefined();
    expect(sent[0].log).toEqual({ clinicId: CLINIC, kind: "plan_cancelled", language: "tr" });
    expect(sent[0].key).toBe(`dentvideo-${confirmKind(CANCEL).replace(/_/g, "-")}-${CLINIC}`);
    expect(m.log.map((l) => l.kind)).toEqual([confirmKind(CANCEL)]);
    // The same subscription again (a repeat, or cancelled then expired with another date): nothing new.
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, { ...CANCEL, endsAt: "2026-12-11T00:00:00Z" })).toBe("already sent");
    expect(sent).toHaveLength(1);
    // A later subscription of the same clinic that is cancelled in its turn is a new confirmation.
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, { ...CANCEL, subscriptionId: "sub_2" })).toBe("sent");
    expect(sent).toHaveLength(2);
  });

  it("each plan change event is confirmed once; going back and forth is two events", async () => {
    const m = memory(clinic({ profile: { name: "Sample Dental Practice", language: "en" } }));
    const { send, sent } = sender();
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, CHANGE)).toBe("sent");
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, CHANGE)).toBe("already sent");
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, { ...CHANGE, tier: "starter", eventAt: "2026-11-25T09:00:00.000Z" })).toBe("sent");
    expect(sent.map((s) => s.subject)).toEqual(["Your DentVideo plan is now Practice", "Your DentVideo plan is now Starter"]);
    expect(sent[0].log).toEqual({ clinicId: CLINIC, kind: "plan_changed", language: "en" });
    // Every claim fits the email log's kind rule (0011).
    for (const l of m.log) expect(l.kind).toMatch(/^[a-z][a-z0-9_]{2,39}$/);
    expect(confirmKind({ ...CHANGE, tier: "group", subscriptionId: "sub_" + "X".repeat(60) })).toMatch(/^[a-z][a-z0-9_]{2,39}$/);
  });

  it("still goes to a clinic that unsubscribed from reminders (it is about its plan)", async () => {
    const m = memory(clinic({ email_opt_out_at: "2026-11-01T00:00:00Z" }));
    const { send, sent } = sender();
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, CANCEL)).toBe("sent");
    expect(sent).toHaveLength(1);
  });

  it("never to: no clinic, a clinic no longer active, the review demo clinic, no address, a test account, an unproven address", async () => {
    const cases: [ReturnType<typeof memory>, Partial<ConfirmDeps>, string][] = [
      [memory(null), {}, "no clinic"],
      [memory(clinic({ plan: "cancelled" })), {}, "not active"],
      [memory(clinic({ plan: "paused" })), {}, "not active"],
      [memory(clinic()), { isDemo: async () => true }, "demo clinic"],
      [memory(clinic(), null), {}, "no email"],
      [memory(clinic(), { email: "", verified: true }), {}, "no email"],
      [memory(clinic(), { email: "e2e-123@dentvideo.test", verified: true }), {}, "test account"],
      [memory(clinic(), { email: "owner@sample-practice.example", verified: false }), {}, "unverified"],
    ];
    for (const [m, over, want] of cases) {
      const { send } = sender();
      expect(await sendBillingConfirmation(deps(m.store, send, over), CLINIC, CANCEL), want).toBe(want);
      expect(send, want).not.toHaveBeenCalled();
      expect(m.log, want).toEqual([]);
    }
  });

  it("switched off with the lifecycle switch, like the other clinic emails", async () => {
    const m = memory(clinic());
    const { send } = sender();
    expect(await sendBillingConfirmation(deps(m.store, send, { config: { base: APP, enabled: false } }), CLINIC, CANCEL)).toBe("disabled");
    expect(send).not.toHaveBeenCalled();
  });

  it("a failed send releases the claim (a later qualifying event may try again) and says failed", async () => {
    const m = memory(clinic());
    const { send } = sender(false);
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, CANCEL)).toBe("failed");
    expect(m.released).toEqual([confirmKind(CANCEL)]);
    expect(m.log).toEqual([]);
  });

  it("an unreadable end date sends nothing and claims nothing", async () => {
    const m = memory(clinic());
    const { send } = sender();
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, { ...CANCEL, endsAt: "soon" })).toBe("bad date");
    expect(send).not.toHaveBeenCalled();
    expect(m.log).toEqual([]);
  });

  it("before migration 0011 the email log refuses the kind: a Redis key keeps it to once instead", async () => {
    const m = memory(clinic());
    m.store.claim = async (_c, kind) => {
      throw new KindNotAllowedError(kind);
    };
    const keys = new Set<string>();
    const fallbackClaim = vi.fn(async (k: string) => (keys.has(k) ? false : (keys.add(k), true)));
    const { send, sent } = sender();
    expect(await sendBillingConfirmation(deps(m.store, send, { fallbackClaim }), CLINIC, CANCEL)).toBe("sent");
    expect(await sendBillingConfirmation(deps(m.store, send, { fallbackClaim }), CLINIC, CANCEL)).toBe("already sent");
    expect(sent).toHaveLength(1);
    expect([...keys]).toEqual([`dv:billconfirm:${CLINIC}:${confirmKind(CANCEL)}`]);
  });

  it("no email log table at all (0005): the Redis key too; the clinic table missing reads as 'migration missing'", async () => {
    const m = memory(clinic());
    m.store.claim = async () => {
      throw new MissingSchemaError("dentvid_email_log");
    };
    const { send } = sender();
    expect(await sendBillingConfirmation(deps(m.store, send, { fallbackClaim: async () => true }), CLINIC, CHANGE)).toBe("sent");
    m.store.clinic = async () => {
      throw new MissingSchemaError("dentvid_clinics.email_opt_out_at");
    };
    expect(await sendBillingConfirmation(deps(m.store, send), CLINIC, CHANGE)).toBe("migration missing");
  });

  it("an unexpected database error is thrown to the caller (the webhook turns it into 'failed' and carries on)", async () => {
    const m = memory(clinic());
    m.store.claim = async () => {
      throw new Error("connection reset");
    };
    const { send } = sender();
    await expect(sendBillingConfirmation(deps(m.store, send), CLINIC, CANCEL)).rejects.toThrow("connection reset");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("reviewDemoCheck", () => {
  const db = (result: { data: unknown; error: unknown }) =>
    ({
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => result };
        return q;
      },
    }) as unknown as SupabaseClient;

  it("reads review_demo; a missing column (0024 not applied) or a failed read is not a demo", async () => {
    expect(await reviewDemoCheck(db({ data: { review_demo: true }, error: null }))(CLINIC)).toBe(true);
    expect(await reviewDemoCheck(db({ data: { review_demo: false }, error: null }))(CLINIC)).toBe(false);
    expect(await reviewDemoCheck(db({ data: null, error: null }))(CLINIC)).toBe(false);
    expect(await reviewDemoCheck(db({ data: null, error: { code: "42703", message: "column dentvid_clinics.review_demo does not exist" } }))(CLINIC)).toBe(false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await reviewDemoCheck(db({ data: null, error: { code: "08006", message: "connection failure" } }))(CLINIC)).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
