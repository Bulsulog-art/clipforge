import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// The funnel event of the ready email needs a real database: not from a test.
vi.mock("./events-server", () => ({ recordEvent: vi.fn(async () => true) }));

import { approveToken } from "./approve-link";
import { cancelledEmail, sendBillingConfirmation } from "./billing-confirm-email";
import type { ClinicForMail, LifecycleStore, Sender } from "./lifecycle";
import { loadPostView, type PostItem, type PostLinkStore } from "./post-link";
import { sendReadyNotice, videoRows } from "./ready-notice";
import { noticeDate, retentionEmail, sendRetentionNotice } from "./retention-email";

/**
 * Dates and posting times in the emails and the one-video post page follow the clinic's
 * country, as the app does (app-ui.ts dateLocale, posting.ts slotLabel): an English clinic
 * in the US, Canada, Australia or New Zealand reads its own date order and a 12-hour clock;
 * every other clinic reads exactly what it read before.
 */

const CLINIC = "5f1e2d3c-4b5a-4968-8776-655443322110";
const OWNER = "owner-1";
const END = "2026-12-10T00:00:00.000Z";
const SECRET = "test-secret-0123456789";
const WEEK = "2026-11-09";
const NOW = new Date("2026-11-09T08:00:00Z");

/** "Mon 7:00 PM": a weekday and a 12-hour time, kept on one line. */
const TWELVE_HOUR = /^(Mon|Tue|Wed|Thu|Fri) \d{1,2}:\d{2} (AM|PM|a\.m\.|p\.m\.|am|pm)$/;
const TWENTY_FOUR = /^\S+ \d{2}:\d{2}$/;

describe("noticeDate: the clinic's own date format", () => {
  const d = new Date(END);
  it("US and Canadian English clinics read the month first", () => {
    expect(noticeDate("en", d, "America/New_York", "US")).toBe("December 9, 2026");
    expect(noticeDate("en", d, "America/Toronto", "ca")).toBe("December 9, 2026");
  });
  it("Australia and New Zealand keep the day first (their own order), as do the UK and every other English clinic", () => {
    expect(noticeDate("en", d, "Australia/Sydney", "AU")).toBe("10 December 2026");
    expect(noticeDate("en", d, "Pacific/Auckland", "NZ")).toBe("10 December 2026");
    for (const country of ["GB", "IE", "DE", null, undefined, ""]) expect(noticeDate("en", d, "UTC", country), String(country)).toBe("10 December 2026");
  });
  it("another language is never changed by the country", () => {
    expect(noticeDate("de", d, "UTC", "US")).toBe(noticeDate("de", d, "UTC"));
    expect(noticeDate("tr", d, "UTC", "US")).toBe(noticeDate("tr", d, "UTC"));
    expect(noticeDate("es", d, "UTC", "US")).toBe("10 de diciembre de 2026");
  });
  it("a bad time zone still prints a date (UTC), in the country's format", () => {
    expect(noticeDate("en", d, "Not/AZone", "US")).toBe("December 10, 2026");
  });
});

/* ------------------------------------------------------------------ billing confirmation */

function lifecycleStore(profile: ClinicForMail["profile"], plan = "active"): LifecycleStore {
  const claimed = new Set<string>();
  const row: ClinicForMail = { id: CLINIC, owner_id: OWNER, profile, plan, created_at: "2026-10-01T00:00:00Z", email_opt_out_at: null };
  return {
    trialClinics: async () => [],
    logs: async () => [],
    clinic: async (id) => (id === CLINIC ? row : null),
    claim: async (_c, kind) => (claimed.has(kind) ? false : (claimed.add(kind), true)),
    release: async (_c, kind) => void claimed.delete(kind),
    owner: async () => ({ email: "dr@clinic.example", verified: true }),
    optOut: async () => true,
  };
}

function sender() {
  const sent: { to: string; subject: string; text: string; html: string }[] = [];
  const send: Sender = async (to, msg) => (sent.push({ to, subject: msg.subject, text: msg.text, html: msg.html }), true);
  return { sent, send };
}

const cancelNotice = { kind: "cancelled" as const, subscriptionId: "sub_1", endsAt: END, since: null };

describe("billing confirmation: the cancellation's dates", () => {
  it("a US clinic reads 'December 9, 2026' (its own day, in its own zone), and its library date the same way", async () => {
    const { sent, send } = sender();
    const r = await sendBillingConfirmation(
      { store: lifecycleStore({ name: "Main Street Dental", language: "en", country: "US", timezone: "America/New_York" }), send, config: { base: "https://dentvideo.com", enabled: true } },
      CLINIC,
      cancelNotice,
    );
    expect(r).toBe("sent");
    expect(sent[0].text).toContain("You keep getting your weekly videos until December 9, 2026.");
    expect(sent[0].text).toContain("until March 9, 2027");
    expect(sent[0].text).not.toMatch(/\b9 December 2026\b/);
  });

  it("a UK clinic and a clinic with no country keep '9 December 2026'", async () => {
    for (const country of ["GB", undefined]) {
      const { sent, send } = sender();
      await sendBillingConfirmation(
        { store: lifecycleStore({ name: "High Street Dental", language: "en", country, timezone: "America/New_York" }), send, config: { base: "https://dentvideo.com", enabled: true } },
        CLINIC,
        cancelNotice,
      );
      expect(sent[0].text, String(country)).toContain("until 9 December 2026.");
    }
  });

  it("a Turkish clinic's email is unchanged by the country argument", () => {
    const withUs = cancelledEmail({ language: "tr", clinicName: "Örnek", endsAt: new Date(END), timeZone: "Europe/Istanbul", country: "US", appUrl: "https://dentvideo.com/app" });
    const plain = cancelledEmail({ language: "tr", clinicName: "Örnek", endsAt: new Date(END), timeZone: "Europe/Istanbul", appUrl: "https://dentvideo.com/app" });
    expect(withUs.text).toBe(plain.text);
    expect(withUs.text).toContain(noticeDate("tr", new Date(END), "Europe/Istanbul"));
  });
});

/* ------------------------------------------------------------------ retention notices */

describe("retention notices: the deletion date", () => {
  const args = { days: 14 as const, endedAt: new Date("2026-12-10T12:00:00Z"), deleteOn: new Date("2027-03-10T12:00:00Z"), timeZone: "UTC", appUrl: "https://dentvideo.com/app" };

  it("an English clinic in Canada reads 'March 10, 2027'; the UK reads '10 March 2027'", () => {
    expect(retentionEmail({ ...args, language: "en", clinicName: "C", country: "CA" }).text).toContain("March 10, 2027");
    const uk = retentionEmail({ ...args, language: "en", clinicName: "C", country: "GB" }).text;
    expect(uk).toContain("10 March 2027");
    expect(uk).not.toContain("March 10, 2027");
  });

  it("the sender passes the clinic's country", async () => {
    const { sent, send } = sender();
    const store = lifecycleStore({ name: "Main Street Dental", language: "en", country: "US", timezone: "America/Chicago" }, "cancelled");
    const r = await sendRetentionNotice({ store, send, config: { base: "https://dentvideo.com" } }, { clinicId: CLINIC, days: 1, deleteOn: new Date("2027-03-10T18:00:00Z"), endedAt: "2026-12-10T18:00:00Z" });
    expect(r).toMatchObject({ sent: true });
    expect(sent[0].text).toContain("March 10, 2027");
    expect(sent[0].text).not.toContain("10 March 2027");
  });
});

/* ------------------------------------------------------------------ the one-video post page */

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const weekItems = (): PostItem[] =>
  [1, 2, 3].map((n) => ({ id: id(n), title: `Video ${n}`, kind: "generated", status: "ready", approval: "pending", week_of: WEEK, video_path: `o/${n}.mp4`, thumb_path: null, copy: null, posted_at: null }));

function postStore(clinic: { language: string; country?: string | null }): PostLinkStore {
  const items = weekItems();
  return {
    clinic: async (c) => (c === CLINIC ? { plan: "active", ...clinic } : null),
    week: async (c, w) => (c === CLINIC && w === WEEK ? items : []),
    approve: async () => false,
    posted: async () => "none",
    signed: async (paths) => new Map(paths.map((p) => [p, `https://liman.example/${p}?sig=1`])),
  };
}

async function postSlot(clinic: { language: string; country?: string | null }) {
  const v = await loadPostView(approveToken(CLINIC, WEEK, SECRET, NOW), id(1), { store: postStore(clinic), secret: SECRET, now: NOW });
  if (v.state !== "ready") throw new Error(v.state);
  return v.item.slot;
}

describe("post page: the suggested posting time", () => {
  it("a US, Canadian, Australian or New Zealand English clinic reads a 12-hour clock", async () => {
    for (const country of ["US", "CA", "AU", "NZ"]) expect(await postSlot({ language: "en", country }), country).toMatch(TWELVE_HOUR);
    expect(await postSlot({ language: "en", country: "US" })).toMatch(/PM$/);
  });
  it("a UK clinic, an English clinic with no country and a German clinic in the US read 24 hours", async () => {
    for (const c of [{ language: "en", country: "GB" }, { language: "en", country: null }, { language: "de", country: "US" }]) expect(await postSlot(c), JSON.stringify(c)).toMatch(TWENTY_FOUR);
  });
});

/* ------------------------------------------------------------------ the Monday email */

describe("ready email: each video's posting time", () => {
  const items = [1, 2].map((n) => ({ id: id(n), title: `Video ${n}`, week_of: WEEK, thumb_path: null, status: "ready", approval: "pending", copy: null }));
  const rows = (language: string, country?: string | null) =>
    videoRows(items, { week: WEEK, language, country, base: "https://dentvideo.com", clinicId: CLINIC, secret: SECRET, thumbUrl: () => undefined, now: NOW });

  it("'Post Tue 7:00 PM' for a US clinic, 'Post Tue 19:00' for a UK one", () => {
    const us = rows("en", "US").map((r) => r.slot);
    for (const s of us) expect(s).toMatch(/^Post (Mon|Tue|Wed|Thu|Fri) \d{1,2}:\d{2} (AM|PM)$/);
    for (const s of rows("en", "GB").map((r) => r.slot)) expect(s).toMatch(/^Post (Mon|Tue|Wed|Thu|Fri) \d{2}:\d{2}$/);
    for (const s of rows("tr", "US").map((r) => r.slot)) expect(s).not.toMatch(/AM|PM/);
  });

  it("the sender takes the country from the clinic's profile", async () => {
    const rowsDb = items.map((i, n) => ({ ...i, kind: "generated", created_at: `${WEEK}T05:00:0${n}Z`, clinic_id: CLINIC, error: null }));
    const db = {
      from: (table: string) => {
        const q = {
          select: () => q,
          eq: () => q,
          in: () => q,
          lt: () => q,
          order: () => q,
          limit: () => q,
          maybeSingle: async () => ({ data: table === "dentvid_clinics" ? { id: CLINIC, owner_id: OWNER, profile: { name: "Main Street Dental", language: "en", country: "US" }, logo_path: null } : null, error: null }),
          then: (res: (v: unknown) => unknown) => Promise.resolve(table === "dentvid_items" ? { data: rowsDb, count: 1, error: null } : { data: [], count: 1, error: null }).then(res),
        };
        return q;
      },
      auth: { admin: { getUserById: async () => ({ data: { user: { email: "dr@clinic.example" } } }) } },
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
    } as unknown as SupabaseClient;
    vi.stubEnv("DENTVIDEO_UNSUBSCRIBE_SECRET", SECRET);
    const send = vi.fn(async () => true);
    const r = await sendReadyNotice(db, CLINIC, "week", { ready: 2, flagged: 0 }, { send, recordFunnel: false, now: NOW });
    vi.unstubAllEnvs();
    expect(r).toEqual({ sent: true });
    const msg = (send.mock.calls[0] as unknown as [string, { text: string }])[1];
    expect(msg.text).toMatch(/Post (Mon|Tue|Wed|Thu|Fri) \d{1,2}:\d{2} PM/);
  });
});
