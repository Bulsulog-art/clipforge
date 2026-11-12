import { describe, expect, it, vi } from "vitest";
import { duePaying, lifecycleConfig, runPaying, type ClinicForMail, type LifecycleStore, type LogRow, type Sender, type WeekStats } from "./lifecycle";
import type { MonthStats } from "./lifecycle-email";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Thursday 12 Nov 2026, 10:23 UTC = 13:23 in Istanbul.
const THU = new Date("2026-11-12T10:23:00Z");
// Monday 2 Nov 2026, 10:23 UTC: the first weekday of the month.
const MON = new Date("2026-11-02T10:23:00Z");

const clinic = (n: number, over: Partial<ClinicForMail> = {}): ClinicForMail => ({
  id: id(n),
  owner_id: `owner-${n}`,
  profile: { name: `Klinik ${n}`, language: "tr", country: "TR" },
  plan: "active",
  created_at: "2026-08-01T00:00:00Z",
  email_opt_out_at: null,
  ...over,
});

function memory(clinics: ClinicForMail[], week: Partial<WeekStats> = {}, month: MonthStats | null = { made: 16, approved: 12, shared: 0 }, emails: Record<string, string> = {}) {
  const log: LogRow[] = [];
  const rows = new Map(clinics.map((c) => [c.id, c]));
  const store: LifecycleStore = {
    trialClinics: async () => [],
    activeClinics: async () => [...rows.values()].filter((c) => c.plan === "active" && !c.email_opt_out_at),
    logs: async (ids) => log.filter((l) => ids.includes(l.clinic_id)),
    clinic: async (cid) => rows.get(cid) ?? null,
    claim: async (cid, kind) => (log.some((l) => l.clinic_id === cid && l.kind === kind) ? false : (log.push({ clinic_id: cid, kind, sent_at: "" }), true)),
    release: async () => {},
    owner: async (o) => ({ email: emails[o] ?? `${o}@x.test`, verified: true }),
    optOut: async () => true,
    weekStats: async () => ({ approved: 3, pending: 1, shared: 0, firstReadyAt: "2026-11-08T22:00:00Z", ...week }),
    monthStats: async () => month,
  };
  return { store, log, rows };
}

const cfg = () => lifecycleConfig({ NEXT_PUBLIC_DENTVIDEO_URL: "https://dentvideo.com", DENTVIDEO_UNSUBSCRIBE_SECRET: "s" });
function sender() {
  const sent: { to: string; subject: string; text: string; html: string; headers?: Record<string, string>; key?: string }[] = [];
  const send: Sender = vi.fn(async (to, m, o) => (sent.push({ to, ...m, headers: o.headers, key: o.idempotencyKey }), true));
  return { send, sent };
}

describe("which paying-clinic email is due", () => {
  it("posting nudge on Thursday in the clinic's daytime; monthly summary early in the month on a weekday", () => {
    expect(duePaying(clinic(1), new Set(), THU)).toEqual({ kind: "nudge_post_2026_11_09", type: "post", week: "2026-11-09" });
    expect(duePaying(clinic(1), new Set(["nudge_post_2026_11_09"]), THU)).toBeNull();
    expect(duePaying(clinic(1), new Set(), new Date("2026-11-11T10:23:00Z"))).toBeNull(); // Wednesday
    expect(duePaying(clinic(1), new Set(), new Date("2026-11-12T19:00:00Z"))).toBeNull(); // 22:00 Istanbul
    expect(duePaying(clinic(1), new Set(), MON)).toEqual({ kind: "monthly_2026_10", type: "monthly", year: 2026, month: 10 });
    expect(duePaying(clinic(1), new Set(["monthly_2026_10"]), MON)).toBeNull();
    expect(duePaying(clinic(1), new Set(), new Date("2026-11-01T10:23:00Z"))).toBeNull(); // Sunday the 1st
    expect(duePaying(clinic(1), new Set(), new Date("2027-01-04T10:23:00Z"))).toMatchObject({ kind: "monthly_2026_12" });
    // A clinic that started paying in the last week of October gets no October summary.
    expect(duePaying(clinic(1, { created_at: "2026-10-28T00:00:00Z" }), new Set(), MON)).toBeNull();
    expect(duePaying(clinic(1, { plan: "trial" }), new Set(), THU)).toBeNull();
    expect(duePaying(clinic(1, { email_opt_out_at: "2026-11-01T00:00:00Z" }), new Set(), THU)).toBeNull();
  });
});

describe("runPaying", () => {
  it("nudges a clinic that has not shared this week, once, with unsubscribe headers", async () => {
    const m = memory([clinic(1)]);
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(r.sent).toBe(1);
    expect(sent[0].subject).toBe("Bu haftanın videoları sizi bekliyor");
    expect(sent[0].text).toContain("onaylanmış ve paylaşıma hazır 3 video");
    expect(sent[0].text).toContain("onayınızı bekleyen 1 video");
    expect(sent[0].html).toContain('href="https://dentvideo.com/app"');
    expect(sent[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent[0].key).toBe(`dentvideo-nudge_post-${id(1)}-2026-11-09`);
    await runPaying({ store: m.store, send, allow: async () => true, now: new Date(THU.getTime() + 3600_000), config: cfg() });
    expect(sent).toHaveLength(1);
  });

  it("does not nudge when something was shared, nothing is ready, the week is too fresh, or shares are unknown", async () => {
    for (const week of [{ shared: 1 }, { approved: 0, pending: 0 }, { firstReadyAt: "2026-11-11T12:00:00Z" }, { shared: null }] as Partial<WeekStats>[]) {
      const m = memory([clinic(1)], week);
      const { send, sent } = sender();
      await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
      expect(sent, JSON.stringify(week)).toHaveLength(0);
    }
  });

  it("monthly summary with three numbers; none when nothing was made", async () => {
    const m = memory([clinic(1, { profile: { name: "Smile", language: "en", country: "GB" } })]);
    const { send, sent } = sender();
    await runPaying({ store: m.store, send, allow: async () => true, now: MON, config: cfg() });
    expect(sent[0].subject).toBe("Your DentVideo month: October 2026");
    expect(sent[0].text).toContain("16 — videos made");
    expect(sent[0].text).toContain("None were shared from the app yet.");
    const empty = memory([clinic(1)], {}, { made: 0, approved: 0, shared: 0 });
    const b = sender();
    await runPaying({ store: empty.store, send: b.send, allow: async () => true, now: MON, config: cfg() });
    expect(b.sent).toHaveLength(0);
  });

  it("skips test accounts and clinics that stopped paying", async () => {
    const m = memory([clinic(1), clinic(2)], {}, null, { "owner-1": "e2e-pay@x.test" });
    m.store.clinic = async (cid) => (cid === id(2) ? clinic(2, { plan: "paused" }) : clinic(1));
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(sent).toHaveLength(0);
    expect(r.skipped).toMatchObject({ "test account": 1, "not active": 1 });
  });
});
