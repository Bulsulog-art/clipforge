import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DELAY_LOG_KIND, sendDelayNotice } from "./delay-notice";
import { DELIVERY_NOTICES } from "@/content/dentvideo-delivery-notices";

const CLINIC = "5f1e2d3c-4b5a-4968-8776-655443322110";

/** The clinic row, its owner's address and a head count of the week's usable videos, like supabase-js answers them. */
function fakeDb(opts: { email?: string | null; language?: string; delivered?: number; countError?: boolean; noClinic?: boolean } = {}) {
  const counts: Record<string, unknown>[] = [];
  const db = {
    from: (table: string) => {
      const f: Record<string, unknown> = {};
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => ((f[c] = v), q),
        in: (c: string, v: unknown) => ((f[c] = v), q),
        maybeSingle: async () => ({ data: opts.noClinic ? null : { owner_id: "owner-1", profile: { name: "Smile & Co", language: opts.language ?? "en" } }, error: null }),
        then: (res: (v: unknown) => unknown) => {
          counts.push({ table, ...f });
          return Promise.resolve(opts.countError ? { count: null, error: { message: "boom" } } : { count: opts.delivered ?? 0, error: null }).then(res);
        },
      };
      return q;
    },
    auth: { admin: { getUserById: async () => ({ data: { user: opts.email === null ? null : { email: opts.email ?? "dr@klinik.example" } } }) } },
  };
  return { db: db as unknown as SupabaseClient, counts };
}

let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  send = vi.fn(async () => true);
});
type Sent = [string, { subject: string; text: string }, { idempotencyKey: string; log: { clinicId: string; kind: string; language: string | null } }];

describe("sendDelayNotice", () => {
  it("late: emails the owner in the clinic's language, logged and keyed per clinic and week", async () => {
    const { db, counts } = fakeDb({ language: "de" });
    expect(await sendDelayNotice(db, CLINIC, "late", { week: "2026-11-16", send })).toEqual({ sent: true });
    const [to, msg, opts] = send.mock.calls[0] as unknown as Sent;
    expect(to).toBe("dr@klinik.example");
    expect(msg.subject).toBe(DELIVERY_NOTICES.de.late.subject);
    expect(msg.text).toContain(DELIVERY_NOTICES.de.late.body);
    expect(opts.log).toEqual({ clinicId: CLINIC, kind: "week_late", language: "de" });
    // Resend keeps one send per key for a day: a retried call cannot mail twice.
    expect(opts.idempotencyKey).toBe(`dentvideo-week-late-${CLINIC}-2026-11-16`);
    // It looked at that week's usable videos first.
    expect(counts).toEqual([{ table: "dentvid_items", clinic_id: CLINIC, kind: "generated", week_of: "2026-11-16", status: ["ready", "flagged"] }]);
  });

  it("first-late: the first-week wording, its own log kind", async () => {
    await sendDelayNotice(fakeDb().db, CLINIC, "first-late", { week: "2026-11-16", send });
    const [, msg, opts] = send.mock.calls[0] as unknown as Sent;
    expect(msg.subject).toBe("Your first videos are taking a little longer");
    expect(opts.log.kind).toBe("first_week_late");
    expect(DELAY_LOG_KIND).toEqual({ late: "week_late", "first-late": "first_week_late" });
    // The email log's kind check (0010: ^[a-z_]{3,40}$).
    for (const k of Object.values(DELAY_LOG_KIND)) expect(k).toMatch(/^[a-z_]{3,40}$/);
  });

  it("never to a test account, an owner without an address, or a clinic that does not exist", async () => {
    expect(await sendDelayNotice(fakeDb({ email: "e2e-monitor+1@bulsulabs.com" }).db, CLINIC, "late", { week: "2026-11-16", send })).toEqual({ sent: false, reason: "test account" });
    expect(await sendDelayNotice(fakeDb({ email: null }).db, CLINIC, "late", { week: "2026-11-16", send })).toEqual({ sent: false, reason: "no email" });
    expect(await sendDelayNotice(fakeDb({ noClinic: true }).db, CLINIC, "late", { week: "2026-11-16", send })).toEqual({ sent: false, reason: "no clinic" });
    expect(send).not.toHaveBeenCalled();
  });

  it("not when the week arrived in the meantime (a 'late' email next to the 'ready' one would confuse)", async () => {
    expect(await sendDelayNotice(fakeDb({ delivered: 3 }).db, CLINIC, "late", { week: "2026-11-16", send })).toEqual({ sent: false, reason: "already delivered" });
    expect(send).not.toHaveBeenCalled();
    // The check failing is not a reason for silence.
    expect(await sendDelayNotice(fakeDb({ countError: true }).db, CLINIC, "late", { week: "2026-11-16", send })).toEqual({ sent: true });
  });

  it("without a (valid) week it still sends, keyed per clinic", async () => {
    const { db, counts } = fakeDb();
    await sendDelayNotice(db, CLINIC, "late", { week: "16 Nov", send });
    expect(counts).toEqual([]);
    expect((send.mock.calls[0] as unknown as Sent)[2].idempotencyKey).toBe(`dentvideo-week-late-${CLINIC}`);
  });

  it("a failed send is reported as such (the worker classifies it as worth a retry)", async () => {
    send.mockResolvedValueOnce(false);
    expect(await sendDelayNotice(fakeDb().db, CLINIC, "late", { week: "2026-11-16", send })).toEqual({ sent: false, reason: "send failed" });
  });

  it("Italian and Portuguese clinics get the English note", async () => {
    await sendDelayNotice(fakeDb({ language: "it" }).db, CLINIC, "late", { week: "2026-11-16", send });
    expect((send.mock.calls[0] as unknown as Sent)[1].subject).toBe(DELIVERY_NOTICES.en.late.subject);
  });
});
