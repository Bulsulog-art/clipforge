import { describe, expect, it } from "vitest";
import { UnrecoverableError } from "bullmq";
import { assertRunOk, CRON_JOB_OPTS, failureAlert, MAIL_CRONS } from "./job-failures.js";
import { renderAlert } from "./ops-alert.js";

const err = new Error("active clinics: fetch failed");

describe("failed jobs the owner hears about", () => {
  it("every dentvid-mail cron alerts on its last attempt — watchdogs, reconcile, digest, lifecycle", () => {
    for (const name of MAIL_CRONS) {
      const f = failureAlert("dentvid-mail", { name, attemptsMade: 3, opts: { attempts: 3 } }, err);
      expect(f?.kind).toBe("cron");
      if (f?.kind === "cron") {
        expect(f.alert.key).toBe(`cron_failed:${name}`);
        expect(renderAlert(f.alert).text).toContain("fetch failed");
      }
    }
  });

  it("not while BullMQ will still retry, and the crons get retries at all", () => {
    expect(CRON_JOB_OPTS.attempts).toBeGreaterThan(1);
    expect(failureAlert("dentvid-mail", { name: "watchdog-monday", attemptsMade: 1, opts: { attempts: 3 } }, err)).toBeNull();
    // An UnrecoverableError ends the job now: that is the last attempt.
    expect(failureAlert("dentvid-mail", { name: "billing-reconcile", attemptsMade: 1, opts: { attempts: 3 } }, new UnrecoverableError("x"))?.kind).toBe("cron");
  });

  it("the Saturday dispatch and a dentist's recording alert; a spend-guard refusal (parked, already alerted) and a week do not", () => {
    const d = failureAlert("dentvid", { name: "dispatch", attemptsMade: 3, opts: { attempts: 3 } }, err);
    expect(d?.kind === "cron" && d.alert.severity).toBe("urgent");
    const r = failureAlert("dentvid", { name: "recording", id: "rec:abc", data: { clinicId: "c1" }, attemptsMade: 2, opts: { attempts: 2 } }, new Error("OpenAI 500"));
    expect(r?.kind).toBe("recording");
    if (r?.kind === "recording") {
      expect(r.clinicId).toBe("c1");
      const a = r.build({ id: "c1", name: "Gülüş" });
      expect(a.key).toBe("recording_failed:rec:abc");
      expect(renderAlert(a).subject).toMatch(/recording could not be processed — Gülüş/);
    }
    expect(failureAlert("dentvid", { name: "recording", data: { clinicId: "c1" }, attemptsMade: 2, opts: { attempts: 2 } }, err, { spendRefusal: true })).toBeNull();
    // runDentvidWeek alerts for weeks itself; a second email here would double it.
    expect(failureAlert("dentvid", { name: "week", attemptsMade: 4, opts: { attempts: 4 } }, err)).toBeNull();
    expect(failureAlert("dentvid", undefined, err)).toBeNull();
  });

  it("a lifecycle / digest run that reports ok:false becomes a failure", () => {
    expect(() => assertRunOk("digest", { ok: false, status: 401 })).toThrow(/HTTP 401/);
    expect(() => assertRunOk("lifecycle", { ok: false })).toThrow(/WORKER_INTERNAL_TOKEN/);
    expect(assertRunOk("digest", { ok: true, status: 200 })).toEqual({ ok: true, status: 200 });
  });
});
