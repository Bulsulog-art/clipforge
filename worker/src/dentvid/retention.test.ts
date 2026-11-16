import { beforeEach, describe, expect, it } from "vitest";
import { memoryLiman } from "./memory-liman.js";
import {
  deletableFile,
  noticeKind,
  retentionAlertDue,
  retentionMode,
  retentionStep,
  runRetention,
  supabaseRetentionDb,
  RETENTION_DAYS,
  type NoticeOutcome,
  type RetentionClinic,
} from "./retention.js";
import { alerts } from "./ops-alert.js";

/**
 * 90 days of library after a plan ends, two reminders, then the clinic's
 * videos and files go — and nothing else, for nobody else. Fake time and an
 * in-memory Liman.
 */

const DAY = 86_400_000;
const T0 = new Date("2026-11-16T09:41:00Z");
const at = (days: number) => new Date(T0.getTime() + days * DAY);

const ENDED = { id: "c-ended", owner_id: "aaaaaaaa-0000-4000-8000-000000000001" };
const ACTIVE = { id: "c-active", owner_id: "aaaaaaaa-0000-4000-8000-000000000002" };
const PAUSED = { id: "c-paused", owner_id: "aaaaaaaa-0000-4000-8000-000000000003" };
const TRIAL = { id: "c-trial", owner_id: "aaaaaaaa-0000-4000-8000-000000000004" };

let liman: ReturnType<typeof memoryLiman>;
let notices: { clinicId: string; days: number; deleteOn: string }[];
let answer: NoticeOutcome;

function clinic(c: { id: string; owner_id: string }, plan: string): Record<string, unknown> {
  return { ...c, plan, logo_path: `${c.owner_id}/logo-1731081600000.png`, plan_ended_at: null, library_delete_after: null, library_deleted_at: null };
}

function seedFiles(owner: string) {
  for (const f of ["v1.mp4", "v1.jpg", "v2.mp4", "logo-1731081600000.png", "logo-1700000000000.png", "recordings/1731081600000.mp4"]) liman.files.set(`${owner}/${f}`, { size: 1, created_at: "" });
}

beforeEach(() => {
  liman = memoryLiman({
    dentvid_clinics: [clinic(ENDED, "cancelled"), clinic(ACTIVE, "active"), clinic(PAUSED, "paused"), clinic(TRIAL, "trial")],
    dentvid_items: [ENDED, ACTIVE, PAUSED].flatMap((c) => [
      { id: `${c.id}-1`, clinic_id: c.id, video_path: `${c.owner_id}/v1.mp4`, thumb_path: `${c.owner_id}/v1.jpg`, source_path: null },
      { id: `${c.id}-2`, clinic_id: c.id, video_path: `${c.owner_id}/v2.mp4`, thumb_path: null, source_path: null },
    ]),
    dentvid_topic_requests: [{ id: "t1", clinic_id: ENDED.id, status: "pending" }],
    dentvid_change_requests: [{ id: "r1", clinic_id: ENDED.id, status: "done" }],
    dentvid_email_log: [],
  });
  for (const c of [ENDED, ACTIVE, PAUSED, TRIAL]) seedFiles(c.owner_id);
  notices = [];
  answer = { sent: true, final: false, reason: "sent" };
});

const db = () => supabaseRetentionDb(liman as never);
const notify = async (clinicId: string, days: number, deleteOn: Date, endedAt: string): Promise<NoticeOutcome> => {
  notices.push({ clinicId, days, deleteOn: deleteOn.toISOString() });
  // The web app claims the email log row when it sends (lib/dentvid/retention-email).
  if (answer.sent) liman.rows("dentvid_email_log").push({ clinic_id: clinicId, kind: noticeKind(days as 14 | 1, endedAt), sent_at: new Date().toISOString() });
  return answer;
};
const run = (now: Date, mode: "delete" | "dry-run" = "delete") => runRetention({ db: db(), notify, mode, now });
const row = (id: string) => liman.rows("dentvid_clinics").find((r) => r.id === id)!;
const items = (id: string) => liman.rows("dentvid_items").filter((r) => r.clinic_id === id);
const filesOf = (owner: string) => [...liman.files.keys()].filter((k) => k.startsWith(owner));

describe("library retention after a plan ends", () => {
  it("the whole life of an ended plan: stamp, 14-day email, 1-day email, deletion on day 90 — settings and current logo kept", async () => {
    let r = await run(T0);
    expect(r.stamped).toBe(1);
    expect(row(ENDED.id).plan_ended_at).toBe(T0.toISOString());

    // Day 75: not yet.
    r = await run(at(75));
    expect(notices).toEqual([]);
    // Day 76: the 14-day reminder, and the date is fixed.
    r = await run(at(76));
    expect(notices).toEqual([{ clinicId: ENDED.id, days: 14, deleteOn: at(RETENTION_DAYS).toISOString() }]);
    expect(row(ENDED.id).library_delete_after).toBe(at(90).toISOString());
    // Day 89: the last reminder.
    await run(at(89));
    expect(notices.map((n) => n.days)).toEqual([14, 1]);
    expect(items(ENDED.id)).toHaveLength(2);
    // Day 90: gone.
    r = await run(at(90));
    expect(r.deleted).toEqual({ clinics: 1, items: 2, files: 5 });
    expect(items(ENDED.id)).toHaveLength(0);
    expect(filesOf(ENDED.owner_id)).toEqual([`${ENDED.owner_id}/logo-1731081600000.png`]);
    expect(liman.rows("dentvid_topic_requests")).toHaveLength(0);
    expect(liman.rows("dentvid_change_requests")).toHaveLength(0);
    expect(row(ENDED.id)).toMatchObject({ plan: "cancelled", library_deleted_at: at(90).toISOString() });
    expect(retentionAlertDue(r)).toBe(true);
    expect(alerts.retention({ ...r, mode: "delete" }).what[0]).toContain("1 clinic(s)");

    // Active, paused and trial clinics: never touched.
    for (const c of [ACTIVE, PAUSED]) {
      expect(items(c.id)).toHaveLength(2);
      expect(filesOf(c.owner_id)).toHaveLength(6);
    }
    expect(filesOf(TRIAL.owner_id)).toHaveLength(6);
    for (const c of [ACTIVE, PAUSED, TRIAL]) expect(row(c.id).plan_ended_at).toBeNull();
  });

  it("is idempotent: running again (or on a second worker) the same day, or later, changes nothing", async () => {
    await run(T0);
    await run(at(76));
    await run(at(89));
    await run(at(90));
    const before = JSON.stringify([...liman.tables]);
    const r = await run(at(90));
    await run(at(120));
    expect(JSON.stringify([...liman.tables])).toBe(before);
    expect(r.deleted.clinics).toBe(0);
    expect(notices.map((n) => n.days)).toEqual([14, 1]);
  });

  it("dry run: no stamp, no email, no deletion — only the counts", async () => {
    row(ENDED.id).plan_ended_at = at(-100).toISOString();
    row(ENDED.id).library_delete_after = at(-1).toISOString();
    liman.rows("dentvid_email_log").push({ clinic_id: ENDED.id, kind: noticeKind(1, at(-100).toISOString()) });
    row(ACTIVE.id).plan = "active";
    const r = await run(T0, "dry-run");
    expect(r.due).toEqual({ clinics: 1, items: 2, files: 5 });
    expect(r.deleted.clinics).toBe(0);
    expect(items(ENDED.id)).toHaveLength(2);
    expect(filesOf(ENDED.owner_id)).toHaveLength(6);
    expect(notices).toEqual([]);
    expect(retentionAlertDue(r)).toBe(true);
    expect(alerts.retention({ ...r, mode: "dry-run" }).titleEn).toMatch(/dry run/i);
  });

  it("a clinic that subscribes again keeps everything; a later end starts a new 90 days", async () => {
    await run(T0);
    row(ENDED.id).plan = "active";
    const r = await run(at(80));
    expect(r.cleared).toBe(1);
    expect(row(ENDED.id).plan_ended_at).toBeNull();
    await run(at(100));
    expect(items(ENDED.id)).toHaveLength(2);
    row(ENDED.id).plan = "cancelled";
    await run(at(110));
    expect(row(ENDED.id).plan_ended_at).toBe(at(110).toISOString());
    await run(at(150));
    expect(items(ENDED.id)).toHaveLength(2);
  });

  it("re-reads the clinic right before deleting: a re-subscription in between saves the library", async () => {
    row(ENDED.id).plan_ended_at = at(-100).toISOString();
    row(ENDED.id).library_delete_after = at(-1).toISOString();
    liman.rows("dentvid_email_log").push({ clinic_id: ENDED.id, kind: noticeKind(1, at(-100).toISOString()) });
    const d = db();
    const original = d.clinic;
    d.clinic = async (id) => {
      row(ENDED.id).plan = "active";
      return original(id);
    };
    const r = await runRetention({ db: d, notify, mode: "delete", now: T0 });
    expect(r.deleted.clinics).toBe(0);
    expect(items(ENDED.id)).toHaveLength(2);
  });

  it("always gives at least 14 days' notice, even when the 90 days are already over (job was off)", async () => {
    row(ENDED.id).plan_ended_at = at(-120).toISOString();
    await run(T0);
    expect(notices).toEqual([{ clinicId: ENDED.id, days: 14, deleteOn: at(14).toISOString() }]);
    await run(at(1));
    expect(items(ENDED.id)).toHaveLength(2);
    await run(at(13));
    await run(at(14));
    expect(items(ENDED.id)).toHaveLength(0);
  });

  it("a missed 1-day run: the email goes, the library waits one more day", async () => {
    row(ENDED.id).plan_ended_at = at(-91).toISOString();
    row(ENDED.id).library_delete_after = at(-1).toISOString();
    await run(T0);
    expect(notices.map((n) => n.days)).toEqual([1]);
    expect(items(ENDED.id)).toHaveLength(2);
    await run(at(1));
    expect(items(ENDED.id)).toHaveLength(0);
  });

  it("an owner who cannot be emailed (no verified address) does not keep the library forever", async () => {
    answer = { sent: false, final: true, reason: "no email" };
    await run(T0);
    await run(at(76));
    expect(row(ENDED.id).library_delete_after).toBe(at(90).toISOString());
    await run(at(89));
    expect(items(ENDED.id)).toHaveLength(2);
    await run(at(90));
    expect(items(ENDED.id)).toHaveLength(0);
  });

  it("a passing email failure tries again the next day and never deletes without notice", async () => {
    answer = { sent: false, final: false, reason: "HTTP 503" };
    row(ENDED.id).plan_ended_at = at(-95).toISOString();
    await run(T0);
    expect(row(ENDED.id).library_delete_after).toBeNull();
    await run(at(1));
    await run(at(30));
    expect(items(ENDED.id)).toHaveLength(2);
  });

  it("without migration 0024 it does nothing", async () => {
    liman.opts.missingColumns = { dentvid_clinics: ["plan_ended_at"] };
    const r = await run(T0);
    expect(r.stopped).toBe("migration missing");
    expect(retentionAlertDue(r)).toBe(false);
  });
});

describe("re-subscribing during the 90 days, and fake time across DST", () => {
  for (const [label, day] of [
    ["day 1", 1],
    ["day 50", 50],
    ["day 77, after the 14-day email", 77],
    ["day 89, after the 1-day email", 89],
  ] as const) {
    it(`subscribed again on ${label}: nothing is deleted, no more emails, even if the plan ends again later`, async () => {
      await run(T0);
      for (let d = 1; d <= day; d++) await run(at(d));
      const mailsBefore = notices.length;
      row(ENDED.id).plan = "active";
      for (let d = day + 1; d <= 200; d += 1) await run(at(d));
      expect(items(ENDED.id)).toHaveLength(2);
      expect(filesOf(ENDED.owner_id)).toHaveLength(6);
      expect(notices).toHaveLength(mailsBefore);
      expect(row(ENDED.id)).toMatchObject({ plan_ended_at: null, library_delete_after: null, library_deleted_at: null });
    });
  }

  it("subscribed again and then only paused (a failed payment): still never deleted", async () => {
    await run(T0);
    row(ENDED.id).plan = "paused";
    for (let d = 1; d <= 120; d += 7) await run(at(d));
    expect(items(ENDED.id)).toHaveLength(2);
    expect(notices).toEqual([]);
  });

  it("subscribed again while the library was being listed (after the re-read): the conditional claim stops the deletion", async () => {
    row(ENDED.id).plan_ended_at = at(-100).toISOString();
    row(ENDED.id).library_delete_after = at(-1).toISOString();
    liman.rows("dentvid_email_log").push({ clinic_id: ENDED.id, kind: noticeKind(1, at(-100).toISOString()) });
    const d = db();
    const library = d.library;
    d.library = async (c) => {
      row(ENDED.id).plan = "active";
      return library(c);
    };
    const r = await runRetention({ db: d, notify, mode: "delete", now: T0 });
    expect(r.deleted.clinics).toBe(0);
    expect(items(ENDED.id)).toHaveLength(2);
    expect(filesOf(ENDED.owner_id)).toHaveLength(6);
    expect(row(ENDED.id).library_deleted_at).toBeNull();
  });

  it("a deletion that fails half-way is un-marked and finished by the next run", async () => {
    row(ENDED.id).plan_ended_at = at(-100).toISOString();
    row(ENDED.id).library_delete_after = at(-1).toISOString();
    liman.rows("dentvid_email_log").push({ clinic_id: ENDED.id, kind: noticeKind(1, at(-100).toISOString()) });
    const d = db();
    const del = d.deleteLibrary;
    d.deleteLibrary = async () => {
      throw new Error("storage 503");
    };
    const r = await runRetention({ db: d, notify, mode: "delete", now: T0 });
    expect(r.errors).toHaveLength(1);
    expect(row(ENDED.id).library_deleted_at).toBeNull();
    d.deleteLibrary = del;
    await runRetention({ db: d, notify, mode: "delete", now: at(1) });
    expect(items(ENDED.id)).toHaveLength(0);
  });

  it("two workers running the same day delete once", async () => {
    row(ENDED.id).plan_ended_at = at(-100).toISOString();
    row(ENDED.id).library_delete_after = at(-1).toISOString();
    liman.rows("dentvid_email_log").push({ clinic_id: ENDED.id, kind: noticeKind(1, at(-100).toISOString()) });
    const [a, b] = await Promise.all([run(T0), run(T0)]);
    expect(a.deleted.clinics + b.deleted.clinics).toBe(1);
  });

  for (const [zone, ended] of [
    ["Europe (DST ends 25 Oct 2026)", "2026-10-20T08:00:00Z"],
    ["US (DST starts 14 Mar 2027)", "2027-01-05T15:00:00Z"],
    ["Europe (DST starts 28 Mar 2027)", "2027-03-01T23:30:00Z"],
  ] as const) {
    it(`${zone}: exactly 90 × 24 h, the emails on day 76 and day 89, deletion on day 90, whatever the clock change`, async () => {
      const E = new Date(ended);
      const on = (days: number, extraMin = 0) => new Date(E.getTime() + days * DAY + extraMin * 60_000);
      row(ENDED.id).plan_ended_at = E.toISOString();
      await runRetention({ db: db(), notify, mode: "delete", now: on(75, 59 * 24) });
      expect(notices).toEqual([]);
      await runRetention({ db: db(), notify, mode: "delete", now: on(76) });
      expect(notices[0]).toMatchObject({ days: 14, deleteOn: on(90).toISOString() });
      await runRetention({ db: db(), notify, mode: "delete", now: on(89) });
      expect(notices.map((n) => n.days)).toEqual([14, 1]);
      await runRetention({ db: db(), notify, mode: "delete", now: on(90, -1) });
      expect(items(ENDED.id)).toHaveLength(2);
      await runRetention({ db: db(), notify, mode: "delete", now: on(90) });
      expect(items(ENDED.id)).toHaveLength(0);
    });
  }
});

describe("rules", () => {
  const c: RetentionClinic = { id: "x", owner_id: "aaaaaaaa-0000-4000-8000-000000000001", plan: "cancelled", logo_path: "aaaaaaaa-0000-4000-8000-000000000001/logo.png", plan_ended_at: null, library_delete_after: null, library_deleted_at: null };

  it("only a cancelled plan is ever stamped; anything else only loses its dates", () => {
    expect(retentionStep(c, new Set(), T0)).toEqual({ kind: "stamp" });
    for (const plan of ["active", "paused", "trial"]) {
      expect(retentionStep({ ...c, plan }, new Set(), T0)).toEqual({ kind: "none" });
      expect(retentionStep({ ...c, plan, plan_ended_at: T0.toISOString() }, new Set(), at(200))).toEqual({ kind: "clear" });
    }
  });

  it("files: only inside the clinic's own folder, never its current logo, never a traversal", () => {
    expect(deletableFile(`${c.owner_id}/v.mp4`, c)).toBe(true);
    expect(deletableFile(c.logo_path!, c)).toBe(false);
    expect(deletableFile("bbbbbbbb-0000-4000-8000-000000000009/v.mp4", c)).toBe(false);
    expect(deletableFile(`${c.owner_id}/../other/v.mp4`, c)).toBe(false);
    expect(deletableFile(`${c.owner_id}//v.mp4`, c)).toBe(false);
  });

  it("mode: delete by default, dry-run and off by env", () => {
    expect(retentionMode({})).toBe("delete");
    expect(retentionMode({ DENTVID_RETENTION_MODE: "dry-run" })).toBe("dry-run");
    expect(retentionMode({ DENTVID_RETENTION_MODE: "off" })).toBe("off");
  });

  it("the email log kind names the plan's end day", () => {
    expect(noticeKind(14, "2026-11-16T09:41:00.000Z")).toBe("retention14_2026_11_16");
    expect(noticeKind(1, "2026-11-16T09:41:00.000Z")).toMatch(/^[a-z][a-z0-9_]{2,39}$/);
  });
});
