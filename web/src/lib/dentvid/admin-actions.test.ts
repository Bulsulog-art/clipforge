import { describe, expect, it, vi } from "vitest";
import { handleAdminAction, type RouteDeps } from "./admin-action-route";
import { latestWeekCounts, parseAction, runAdminAction, type ActionDeps } from "./admin-actions";
import { auditRow, missingSchema, recordAdminAction, type AuditEntry } from "./admin-audit";
import { csrfSecret, csrfToken, sameOrigin, sessionIdOf, verifyCsrf } from "./admin-csrf";
import { backWithFlash } from "./admin-nav";
import { FIRST_WEEK_JOB_OPTS, RECORDING_JOB_OPTS, RESTYLE_JOB_OPTS, DENTVID_PRIORITY } from "./job-options";
import { WEEK_VIDEOS, weekJobId } from "./week-job";
import { deliveryWeek } from "./week";


const ADMIN = "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d";
const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const ITEM = "5c1f2a3b-4d5e-4f60-8a1b-2c3d4e5f6a7b";
const SESSION = "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b";
const SECRET = "test-secret-at-least-16";
const NOW = new Date("2026-11-11T10:00:00Z");

/* ------------------------------------------------------------------- CSRF */

describe("CSRF token", () => {
  it("verifies only for the same user, the same session and the same secret", () => {
    const t = csrfToken(ADMIN, SESSION, SECRET);
    expect(verifyCsrf(t, ADMIN, SESSION, SECRET)).toBe(true);
    expect(verifyCsrf(t, ADMIN, "another-session-id", SECRET)).toBe(false);
    expect(verifyCsrf(t, CLINIC, SESSION, SECRET)).toBe(false);
    expect(verifyCsrf(t, ADMIN, SESSION, "a-different-secret!!")).toBe(false);
    expect(verifyCsrf(`${t}x`, ADMIN, SESSION, SECRET)).toBe(false);
  });

  it("refuses without a secret, a session or a token", () => {
    expect(verifyCsrf(csrfToken(ADMIN, SESSION, SECRET), ADMIN, SESSION, null)).toBe(false);
    expect(verifyCsrf(csrfToken(ADMIN, "", SECRET), ADMIN, "", SECRET)).toBe(false);
    expect(verifyCsrf(undefined, ADMIN, SESSION, SECRET)).toBe(false);
    expect(verifyCsrf("", ADMIN, SESSION, SECRET)).toBe(false);
  });

  it("takes its secret from DENTVIDEO_ADMIN_CSRF_SECRET, else derives it from the service role key", () => {
    expect(csrfSecret({ DENTVIDEO_ADMIN_CSRF_SECRET: SECRET })).toBe(SECRET);
    const derived = csrfSecret({ DENTVID_SERVICE_ROLE_KEY: "service-role" });
    expect(derived).toMatch(/^[0-9a-f]{64}$/);
    expect(derived).not.toContain("service-role");
    expect(csrfSecret({ DENTVIDEO_ADMIN_CSRF_SECRET: "short" })).toBeNull();
    expect(csrfSecret({})).toBeNull();
  });

  it("reads the session id claim from an access token", () => {
    const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
    expect(sessionIdOf(jwt({ sub: ADMIN, session_id: SESSION }))).toBe(SESSION);
    expect(sessionIdOf(jwt({ sub: ADMIN }))).toBe("");
    expect(sessionIdOf("garbage")).toBe("");
    expect(sessionIdOf(null)).toBe("");
  });

  it("same origin: the site's origins or the request's own host; never cross-site", () => {
    const allowed = ["https://dentvideo.com"];
    expect(sameOrigin({ origin: "https://dentvideo.com", secFetchSite: "same-origin", host: "dentvideo.com" }, allowed)).toBe(true);
    expect(sameOrigin({ origin: "https://clipforge.example", secFetchSite: null, host: "clipforge.example", proto: "https" }, allowed)).toBe(true);
    expect(sameOrigin({ origin: "https://evil.example", secFetchSite: "cross-site", host: "dentvideo.com" }, allowed)).toBe(false);
    expect(sameOrigin({ origin: "https://dentvideo.com", secFetchSite: "cross-site", host: "dentvideo.com" }, allowed)).toBe(false);
    expect(sameOrigin({ origin: null, secFetchSite: null, host: "dentvideo.com" }, allowed)).toBe(false);
    expect(sameOrigin({ origin: "null", secFetchSite: null, host: "dentvideo.com" }, allowed)).toBe(false);
  });
});

/* ------------------------------------------------------------------ fakes */

type Row = Record<string, unknown>;

/** A tiny PostgREST stand-in: select / eq / order / limit / maybeSingle / update / insert on in-memory tables. */
function fakeDb(tables: Record<string, Row[]>, opts: { missing?: string[] } = {}) {
  const writes: { table: string; op: string; values: Row; filters: [string, unknown][] }[] = [];
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let op: "select" | "update" | "insert" = "select";
    let values: Row = {};
    const result = () => {
      if (opts.missing?.includes(table)) return { data: null, error: { code: "42P01", message: `relation "${table}" does not exist` } };
      const rows = (tables[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v));
      if (op === "update") {
        for (const k of Object.keys(values)) if (rows[0] && !(k in rows[0]) && k.startsWith("admin_")) return { data: null, error: { code: "42703", message: `column "${k}" does not exist` } };
        rows.forEach((r) => Object.assign(r, values));
        writes.push({ table, op, values, filters: [...filters] });
        return { data: rows, error: null };
      }
      if (op === "insert") {
        (tables[table] ??= []).push(values);
        writes.push({ table, op, values, filters: [] });
        return { data: null, error: null };
      }
      return { data: rows, error: null };
    };
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      order: () => q,
      limit: () => q,
      update: (v: Row) => ((op = "update"), (values = v), q),
      insert: (v: Row) => ((op = "insert"), (values = v), Promise.resolve(result())),
      maybeSingle: async () => {
        const r = result();
        return { data: (r.data as Row[] | null)?.[0] ?? null, error: r.error };
      },
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, bad),
    };
    return q;
  };
  return { db: { from } as unknown as ActionDeps["db"], writes };
}

type Job = { state: string; removed?: boolean; retried?: boolean; priority?: number };

function fakeQueue(jobs: Record<string, Job> = {}) {
  const added: { name: string; data: unknown; opts: Record<string, unknown> }[] = [];
  const handle = (id: string) => {
    const j = jobs[id];
    if (!j) return null;
    return {
      getState: async () => j.state,
      remove: async () => {
        j.removed = true;
        delete jobs[id];
      },
      retry: async () => {
        j.retried = true;
      },
      changePriority: async (o: { priority: number }) => {
        j.priority = o.priority;
      },
    };
  };
  return { queue: { getJob: async (id: string) => handle(id), add: async (name: string, data: unknown, opts: Record<string, unknown>) => added.push({ name, data, opts }) }, added, jobs };
}

const clinicRow = (extra: Row = {}): Row => ({ id: CLINIC, plan: "active", admin_paused_at: null, admin_pause_note: null, profile: { name: "Praxis" }, ...extra });

function deps(tables: Record<string, Row[]>, jobs: Record<string, Job> = {}, more: Partial<ActionDeps> = {}) {
  const d = fakeDb(tables);
  const q = fakeQueue(jobs);
  const sendReady = vi.fn(async () => ({ sent: true as const }));
  const actionDeps: ActionDeps = { db: d.db, dentvid: q.queue, queueFor: () => q.queue, sendReady, now: () => NOW, ...more };
  return { actionDeps, writes: d.writes, added: q.added, jobs: q.jobs, sendReady };
}

/* ---------------------------------------------------------------- actions */

describe("parseAction", () => {
  it("accepts well-formed actions only", () => {
    expect(parseAction({ action: "requeue_week", clinicId: CLINIC.toUpperCase() })).toEqual({ action: "requeue_week", clinicId: CLINIC });
    expect(parseAction({ action: "requeue_week", clinicId: "nope" })).toBeNull();
    expect(parseAction({ action: "drop_table", clinicId: CLINIC })).toBeNull();
    expect(parseAction({ action: "comp_month", clinicId: CLINIC, months: "1", note: "" })).toBeNull();
    expect(parseAction({ action: "comp_month", clinicId: CLINIC, months: "12", note: "goodwill" })).toBeNull();
    expect(parseAction({ action: "comp_month", clinicId: CLINIC, months: "2", note: " late week " })).toEqual({ action: "comp_month", clinicId: CLINIC, months: 2, note: "late week" });
    expect(parseAction({ action: "retry_job", queue: "dentvid", jobId: `week:${CLINIC}:2026-11-16` })).toEqual({ action: "retry_job", queue: "dentvid", jobId: `week:${CLINIC}:2026-11-16` });
    expect(parseAction({ action: "retry_job", queue: "bull", jobId: "1" })).toBeNull();
    expect(parseAction({ action: "retry_job", queue: "dentvid", jobId: "a*b" })).toBeNull();
    expect(parseAction({ action: "retry_job", queue: "dentvid", jobId: "../x" })).toBeNull();
  });
});

describe("requeue this week", () => {
  const week = deliveryWeek(NOW);
  const jobId = weekJobId(CLINIC, week);

  it("queues the week with the same job id and first-week options as the clinic's own button", async () => {
    const t = deps({ dentvid_clinics: [clinicRow()] });
    const r = await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, t.actionDeps);
    expect(r).toMatchObject({ outcome: "ok", code: "week_queued" });
    expect(t.added).toEqual([{ name: "week", data: { clinicId: CLINIC, count: WEEK_VIDEOS, week }, opts: { jobId, ...FIRST_WEEK_JOB_OPTS } }]);
  });

  it("moves a waiting batch week to the front instead of queueing it twice", async () => {
    const t = deps({ dentvid_clinics: [clinicRow()] }, { [jobId]: { state: "prioritized" } });
    expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, t.actionDeps)).code).toBe("week_promoted");
    expect(t.jobs[jobId].priority).toBe(DENTVID_PRIORITY.firstWeek);
    expect(t.added).toEqual([]);
  });

  it("re-queues a failed week; leaves a running or made week alone", async () => {
    const failed = deps({ dentvid_clinics: [clinicRow()] }, { [jobId]: { state: "failed" } });
    expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, failed.actionDeps)).code).toBe("week_queued");
    expect(failed.added).toHaveLength(1);

    const running = deps({ dentvid_clinics: [clinicRow()] }, { [jobId]: { state: "active" } });
    expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, running.actionDeps)).code).toBe("week_running");

    const made = deps(
      { dentvid_clinics: [clinicRow()], dentvid_items: [{ clinic_id: CLINIC, kind: "generated", week_of: week, status: "ready", video_path: "x/y.mp4" }] },
      { [jobId]: { state: "completed" } },
    );
    expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, made.actionDeps)).code).toBe("week_made");
    expect(made.added).toEqual([]);

    const empty = deps({ dentvid_clinics: [clinicRow()], dentvid_items: [] }, { [jobId]: { state: "completed" } });
    expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, empty.actionDeps)).code).toBe("week_queued");
  });

  it("refuses a paused or unknown clinic, and says so when the queue is down", async () => {
    const paused = deps({ dentvid_clinics: [clinicRow({ admin_paused_at: NOW.toISOString() })] });
    expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, paused.actionDeps)).code).toBe("clinic_paused");
    expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, deps({ dentvid_clinics: [] }).actionDeps)).code).toBe("no_clinic");
    const down = deps({ dentvid_clinics: [clinicRow()] });
    down.actionDeps.dentvid.getJob = async () => {
      throw new Error("Connection is closed.");
    };
    expect(await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, down.actionDeps)).toMatchObject({ outcome: "error", code: "queue_down" });
  });

  it("refuses a clinic without an active plan instead of a 'queued' that the worker silently skips", async () => {
    for (const plan of ["trial", "paused", "cancelled"]) {
      const t = deps({ dentvid_clinics: [clinicRow({ plan })], dentvid_items: [{ id: ITEM, clinic_id: CLINIC, kind: "generated", status: "flagged", plan: {} }] });
      expect((await runAdminAction({ action: "requeue_week", clinicId: CLINIC }, t.actionDeps)).code).toBe("not_paying");
      expect((await runAdminAction({ action: "retry_video", itemId: ITEM }, t.actionDeps)).code).toBe("not_paying");
      expect(t.added).toEqual([]);
      expect(t.writes).toEqual([]);
    }
  });
});

describe("retry a video", () => {
  it("re-renders a generated video from its stored plan (restyle job, its usual options)", async () => {
    const t = deps({ dentvid_clinics: [clinicRow()], dentvid_items: [{ id: ITEM, clinic_id: CLINIC, kind: "generated", status: "flagged", plan: { scenes: [] }, source_path: null }] });
    expect((await runAdminAction({ action: "retry_video", itemId: ITEM }, t.actionDeps)).code).toBe("video_requeued");
    expect(t.added[0]).toMatchObject({ name: "restyle", data: { itemId: ITEM }, opts: RESTYLE_JOB_OPTS });
    expect(t.writes.find((w) => w.table === "dentvid_items")?.values).toMatchObject({ restyle_status: "queued" });
  });

  it("reprocesses a recording from its source", async () => {
    const t = deps({ dentvid_clinics: [clinicRow()], dentvid_items: [{ id: ITEM, clinic_id: CLINIC, kind: "recording", status: "failed", plan: null, source_path: `${ADMIN}/recordings/a.mp4` }] });
    expect((await runAdminAction({ action: "retry_video", itemId: ITEM }, t.actionDeps)).code).toBe("recording_requeued");
    expect(t.added[0]).toMatchObject({ name: "recording", data: { clinicId: CLINIC, sourcePath: `${ADMIN}/recordings/a.mp4` }, opts: RECORDING_JOB_OPTS });
  });

  it("cannot retry a video with nothing to re-render, nor one already queued, nor for a paused clinic", async () => {
    const none = deps({ dentvid_clinics: [clinicRow()], dentvid_items: [{ id: ITEM, clinic_id: CLINIC, kind: "generated", status: "rejected", plan: null }] });
    expect((await runAdminAction({ action: "retry_video", itemId: ITEM }, none.actionDeps)).code).toBe("video_not_retryable");
    const pending = deps({ dentvid_clinics: [clinicRow()], dentvid_items: [{ id: ITEM, clinic_id: CLINIC, kind: "generated", status: "flagged", plan: {}, restyle_status: "queued" }] });
    expect((await runAdminAction({ action: "retry_video", itemId: ITEM }, pending.actionDeps)).code).toBe("restyle_pending");
    const paused = deps({ dentvid_clinics: [clinicRow({ admin_paused_at: NOW.toISOString() })], dentvid_items: [{ id: ITEM, clinic_id: CLINIC, kind: "generated", status: "flagged", plan: {} }] });
    expect((await runAdminAction({ action: "retry_video", itemId: ITEM }, paused.actionDeps)).code).toBe("clinic_paused");
    expect(none.added.length + pending.added.length + paused.added.length).toBe(0);
  });
});

describe("resend the ready email", () => {
  it("announces the latest week's ready and flagged videos with a file", async () => {
    expect(
      latestWeekCounts([
        { week_of: "2026-11-09", status: "ready", video_path: "a" },
        { week_of: "2026-11-09", status: "flagged", video_path: "b" },
        { week_of: "2026-11-09", status: "flagged", video_path: null },
        { week_of: "2026-11-02", status: "ready", video_path: "c" },
      ]),
    ).toEqual({ week: "2026-11-09", ready: 1, flagged: 1 });
    const t = deps({ dentvid_clinics: [clinicRow()], dentvid_items: [{ clinic_id: CLINIC, kind: "generated", week_of: "2026-11-09", status: "ready", video_path: "a" }] });
    expect((await runAdminAction({ action: "resend_ready", clinicId: CLINIC }, t.actionDeps)).code).toBe("ready_sent");
    expect(t.sendReady).toHaveBeenCalledWith(CLINIC, { ready: 1, flagged: 0 });
  });

  it("sends nothing when no video is ready", async () => {
    const t = deps({ dentvid_clinics: [clinicRow()], dentvid_items: [] });
    expect((await runAdminAction({ action: "resend_ready", clinicId: CLINIC }, t.actionDeps)).code).toBe("nothing_ready");
    expect(t.sendReady).not.toHaveBeenCalled();
  });
});

describe("pause, comp, retry job", () => {
  it("pauses and unpauses with the 0010 columns, and asks for the migration without them", async () => {
    const t = deps({ dentvid_clinics: [clinicRow()] });
    expect((await runAdminAction({ action: "pause", clinicId: CLINIC, note: "card dispute" }, t.actionDeps)).code).toBe("paused");
    expect(t.writes[0].values).toEqual({ admin_paused_at: NOW.toISOString(), admin_pause_note: "card dispute" });
    expect((await runAdminAction({ action: "unpause", clinicId: CLINIC }, t.actionDeps)).code).toBe("unpaused");
    expect(t.writes[1].values).toEqual({ admin_paused_at: null, admin_pause_note: null });
    expect((await runAdminAction({ action: "unpause", clinicId: CLINIC }, t.actionDeps)).code).toBe("not_paused");

    const old = deps({ dentvid_clinics: [{ id: CLINIC, plan: "active" }] });
    expect((await runAdminAction({ action: "pause", clinicId: CLINIC, note: "" }, old.actionDeps)).code).toBe("needs_migration");
  });

  it("records a comp without touching billing", async () => {
    const t = deps({ dentvid_clinics: [clinicRow()] });
    const r = await runAdminAction({ action: "comp_month", clinicId: CLINIC, months: 1, note: "late first week" }, t.actionDeps);
    expect(r).toMatchObject({ outcome: "ok", code: "comp_recorded" });
    expect(t.writes).toEqual([]);
  });

  it("retries only a failed job, only on the DentVideo queues", async () => {
    const t = deps({}, { j1: { state: "failed" }, j2: { state: "completed" } });
    expect((await runAdminAction({ action: "retry_job", queue: "dentvid", jobId: "j1" }, t.actionDeps)).code).toBe("job_retried");
    expect(t.jobs.j1.retried).toBe(true);
    expect((await runAdminAction({ action: "retry_job", queue: "dentvid", jobId: "j2" }, t.actionDeps)).code).toBe("job_not_failed");
    expect((await runAdminAction({ action: "retry_job", queue: "dentvid", jobId: "gone" }, t.actionDeps)).code).toBe("no_job");
    expect((await runAdminAction({ action: "retry_job", queue: "publish", jobId: "j1" }, t.actionDeps)).code).toBe("queue_not_allowed");
  });
});

/* ------------------------------------------------------------------ audit */

describe("audit", () => {
  const entry: AuditEntry = { adminId: ADMIN, adminEmail: "owner@dentvideo.com", action: "pause", clinicId: CLINIC, params: { note: "x" }, outcome: "ok", detail: "paused" };

  it("stores who, what, which clinic and how it went", async () => {
    const d = fakeDb({ dentvid_admin_actions: [] });
    const log = vi.fn();
    expect(await recordAdminAction(d.db, entry, log)).toBe("stored");
    expect(d.writes[0]).toMatchObject({ table: "dentvid_admin_actions", op: "insert", values: auditRow(entry) });
    expect(d.writes[0].values).toMatchObject({ admin_id: ADMIN, admin_email: "owner@dentvideo.com", action: "pause", clinic_id: CLINIC, outcome: "ok" });
    expect(log).toHaveBeenCalled();
  });

  it("falls back to the server log when the table is missing (0010 not applied)", async () => {
    const d = fakeDb({}, { missing: ["dentvid_admin_actions"] });
    const log = vi.fn();
    expect(await recordAdminAction(d.db, entry, log)).toBe("logged");
    expect(log).toHaveBeenCalledWith("[dentvideo admin] action", expect.objectContaining({ action: "pause", clinic_id: CLINIC }));
    expect(await recordAdminAction(null, entry, log)).toBe("logged");
    expect(missingSchema({ code: "PGRST205" })).toBe(true);
    expect(missingSchema({ code: "23505" })).toBe(false);
  });

  it("trims long fields to the table's limits", () => {
    expect(auditRow({ ...entry, detail: "x".repeat(5000), target: "t".repeat(500) })).toMatchObject({ detail: "x".repeat(1000), target: "t".repeat(200) });
  });
});

/* ------------------------------------------------------------------ route */

describe("the action route", () => {
  const viewer = { id: ADMIN, email: "owner@dentvideo.com", sessionId: SESSION, csrf: csrfToken(ADMIN, SESSION, SECRET) };
  const form = (o: Record<string, string>) => new URLSearchParams({ csrf: viewer.csrf, confirm: "yes", back: "/admin/clinic/" + CLINIC, ...o }).toString();
  const req = (body: string, headers: Record<string, string> = {}) =>
    new Request("https://dentvideo.com/api/dentvideo/admin/action", {
      method: "POST",
      headers: { origin: "https://dentvideo.com", "sec-fetch-site": "same-origin", host: "dentvideo.com", "content-type": "application/x-www-form-urlencoded", ...headers },
      body,
    });

  function route(opts: { viewer?: typeof viewer | null; limitOk?: boolean; audited?: "stored" | "logged" } = {}) {
    const t = deps({ dentvid_clinics: [clinicRow()] });
    const audits: AuditEntry[] = [];
    const run = vi.fn(() => t.actionDeps);
    const r: RouteDeps = {
      viewer: async () => (opts.viewer === undefined ? viewer : opts.viewer),
      allowedOrigins: ["https://dentvideo.com"],
      env: { DENTVIDEO_ADMIN_CSRF_SECRET: SECRET },
      limit: async () => opts.limitOk ?? true,
      actions: run,
      audit: async (e) => (audits.push(e), opts.audited ?? "stored"),
    };
    return { r, t, audits, run };
  }
  const flash = (res: Response) => new URL(res.headers.get("location")!, "https://x").searchParams.get("flash");

  it("404 for a non-admin, before anything else", async () => {
    const { r, run, audits } = route({ viewer: null });
    expect((await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC })), r)).status).toBe(404);
    expect(run).not.toHaveBeenCalled();
    expect(audits).toEqual([]);
  });

  it("403 for a cross-site post", async () => {
    const { r, run } = route();
    expect((await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC }), { origin: "https://evil.example", "sec-fetch-site": "cross-site" }), r)).status).toBe(403);
    expect((await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC }), { origin: "" }), r)).status).toBe(403);
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses a wrong or missing CSRF token, a missing confirmation, a bad action and a rate-limited admin — none of them acts", async () => {
    const { r, run, audits } = route();
    expect(flash(await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC, csrf: "forged" })), r))).toBe("bad_csrf");
    expect(flash(await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC, csrf: csrfToken(ADMIN, "old-session-id-1234", SECRET) })), r))).toBe("bad_csrf");
    expect(flash(await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC, confirm: "" })), r))).toBe("not_confirmed");
    expect(flash(await handleAdminAction(req(form({ action: "delete_everything", clinicId: CLINIC })), r))).toBe("bad_request");
    expect(flash(await handleAdminAction(req("{}", { "content-type": "application/json" }), r))).toBe("bad_request");
    const limited = route({ limitOk: false });
    expect(flash(await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC })), limited.r))).toBe("rate_limited");
    expect(run).not.toHaveBeenCalled();
    expect(limited.run).not.toHaveBeenCalled();
    expect(audits).toEqual([]);
  });

  it("runs the action, audits it and returns 303 to the page with a flash code", async () => {
    const { r, t, audits } = route();
    const res = await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC, note: "dispute" })), r);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`/admin/clinic/${CLINIC}?flash=paused`);
    expect(t.writes[0].values).toMatchObject({ admin_pause_note: "dispute" });
    expect(audits).toEqual([expect.objectContaining({ adminId: ADMIN, adminEmail: "owner@dentvideo.com", action: "pause", clinicId: CLINIC, outcome: "ok", params: { clinicId: CLINIC, note: "dispute" } })]);
  });

  it("audits refusals too, and says when a change was not stored in the audit table", async () => {
    const refused = route();
    await handleAdminAction(req(form({ action: "unpause", clinicId: CLINIC })), refused.r);
    expect(refused.audits[0]).toMatchObject({ action: "unpause", outcome: "refused", detail: "not_paused" });
    const unaudited = route({ audited: "logged" });
    expect(flash(await handleAdminAction(req(form({ action: "pause", clinicId: CLINIC })), unaudited.r))).toBe("not_audited");
  });

  it("only ever redirects back into the admin panel", async () => {
    expect(backWithFlash("/admin/videos?status=problem&flash=old", "ok")).toBe("/admin/videos?status=problem&flash=ok");
    expect(backWithFlash("/dentvideo/admin/clinic/abc", "ok")).toBe("/dentvideo/admin/clinic/abc?flash=ok");
    expect(backWithFlash("https://evil.example/admin", "ok")).toBe("/dentvideo/admin?flash=ok");
    expect(backWithFlash("//evil.example/admin", "ok")).toBe("/dentvideo/admin?flash=ok");
    expect(backWithFlash("/admin/../app", "ok")).toBe("/dentvideo/admin?flash=ok");
    expect(backWithFlash("/app", "ok")).toBe("/dentvideo/admin?flash=ok");
    expect(backWithFlash(undefined, "ok")).toBe("/dentvideo/admin?flash=ok");
  });
});
