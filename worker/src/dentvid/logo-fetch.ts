import { TransientWeekError } from "./retry.js";
import type { ClinicRef, OwnerAlert } from "./ops-alert.js";

/**
 * The clinic's logo, downloaded from storage for a render, with retries.
 *
 * Before, jobs.ts read only the data of storage.download and ignored its
 * error: one storage blip and five videos were made without the clinic's
 * logo (and without the colours taken from it) and marked ready, and a photo
 * restyle could replace a video that had the logo with one that did not.
 *
 * Now a download is tried LOGO_TRIES times, a little apart, and then:
 *   unreachable  storage did not answer, or answered with an error other than
 *                "not found": the run stops before any paid call. A week
 *                (and a recording) fails as transient, so BullMQ retries it
 *                in a few minutes; a restyle or a change keeps the old video.
 *                Nothing is ever made without a logo the clinic has.
 *   missing      storage says the file is not there (deleted by hand, a
 *                failed migration): no retry brings it back. A new week or a
 *                recording is made without it (the clinic's name is drawn in
 *                the corner, as for a clinic that never uploaded one), so the
 *                clinic still gets its videos, and the owner is asked to have
 *                the logo uploaded again. A restyle or a change, which would
 *                replace a video that has the logo, does not run.
 * Either way a run that stops gives its spend reservation back: nothing was spent.
 */

/** Tries per download, and the waits between them (1 s, then 3 s). */
export const LOGO_TRIES = 3;
let waitsMs = [1_000, 3_000];

/** For tests. */
export function _setLogoRetryWaits(ms: number[]): void {
  waitsMs = ms;
}

/** The logo could not be downloaded (not "missing"): the run stops before it spends, and is retried. */
export class LogoUnavailableError extends TransientWeekError {
  constructor(
    public key: string,
    public detail: string,
  ) {
    super(`the clinic's logo could not be downloaded after ${LOGO_TRIES} tries (${detail}); nothing was made without it`);
  }
}

/** The logo file is not in storage: a restyle or a change, which would drop it from a video, does not run. */
export class LogoMissingError extends Error {
  constructor(public key: string) {
    super(`the clinic's logo file is missing from storage (${key}); the video with the logo is kept`);
  }
}

type StorageError = { message?: unknown; status?: unknown; statusCode?: unknown; error?: unknown } | null | undefined;

/** Storage answered that the object does not exist (Supabase storage: 404, or 400 with statusCode "404" / "Object not found"). */
export function isNotFound(e: StorageError): boolean {
  if (!e) return false;
  if (e.status === 404 || e.statusCode === 404 || e.statusCode === "404") return true;
  const text = `${typeof e.message === "string" ? e.message : ""} ${typeof e.error === "string" ? e.error : ""}`;
  return /\bnot[ _]?found\b|no such (key|object)/i.test(text);
}

export type LogoDownload = { ok: true; blob: Blob; tries: number } | { ok: false; missing: boolean; error: string; tries: number };

/** The slice of a Supabase storage bucket a download needs. */
export type LogoBucket = { download(key: string): PromiseLike<{ data: Blob | null; error: StorageError }> };

/** Download the logo, tried LOGO_TRIES times; a "not found" answer is not retried. Never throws. */
export async function downloadLogo(bucket: LogoBucket, key: string, onRetry: (tryNo: number, error: string) => void = () => {}): Promise<LogoDownload> {
  let last = "no answer";
  for (let n = 1; n <= LOGO_TRIES; n++) {
    let data: Blob | null = null;
    let error: StorageError = null;
    try {
      ({ data, error } = await bucket.download(key));
    } catch (e) {
      error = { message: (e as Error)?.message ?? String(e) };
    }
    if (!error && data) return { ok: true, blob: data, tries: n };
    if (error && isNotFound(error)) return { ok: false, missing: true, error: describe(error), tries: n };
    last = error ? describe(error) : "storage returned no file";
    if (n < LOGO_TRIES) {
      onRetry(n, last);
      await new Promise((r) => setTimeout(r, waitsMs[Math.min(n - 1, waitsMs.length - 1)] ?? 0));
    }
  }
  return { ok: false, missing: false, error: last, tries: LOGO_TRIES };
}

function describe(e: NonNullable<StorageError>): string {
  const msg = typeof e.message === "string" && e.message ? e.message : "storage error";
  const code = e.statusCode ?? e.status;
  return (code !== undefined && code !== null && !msg.includes(String(code)) ? `${msg} (${String(code)})` : msg).slice(0, 300);
}

/**
 * The run that needed the logo, for the owner's alert. A change request has
 * its own failure alert (jobs.ts runDentvidChange, which carries this error),
 * so it raises no logo alert: one email per failure.
 *   week, recording  retried by the queue in a few minutes
 *   restyle          the clinic's card says the update did not work; the old video stays
 */
export type LogoJob = "week" | "recording" | "restyle";

const UNREACHABLE_DONE: Record<LogoJob, string> = {
  week: "The week was stopped before any paid call and will be retried by itself in a few minutes. No video is made without the logo. Its budget was given back.",
  recording: "The recording was stopped before any paid call and will be retried by itself in a few minutes. No clip is made without the logo. Its budget was given back.",
  restyle: "The photo update was not made: the clinic keeps the video it has, and its card says the update did not work (it is tried once more by itself). Its budget was given back.",
};

/**
 * Storage would not give us a clinic's logo. One alert a day for the whole worker (key
 * logo_unavailable): a storage outage hits every clinic in the batch at once, and the
 * runs retry by themselves; the week's own failure alert names each clinic if it lasts.
 */
export function logoUnavailableAlert(a: { clinic: ClinicRef; key: string; error: string; job: LogoJob }): OwnerAlert {
  return {
    key: "logo_unavailable",
    severity: "warning",
    titleTr: "Klinik logosu depodan indirilemedi",
    titleEn: "A clinic's logo could not be downloaded",
    clinic: a.clinic,
    what: [`Storage did not give us the clinic's logo after ${LOGO_TRIES} tries, so its ${a.job === "restyle" ? "photo update" : a.job} could not be made with it.`],
    facts: [
      ["Logo file", a.key],
      ["Error", a.error],
    ],
    done: [UNREACHABLE_DONE[a.job], "No email went to the clinic. Other clinics' logo failures today are only in the worker logs."],
    todo: ["Nothing if it was a short storage blip. If it keeps failing, check Liman's storage service (dentvid bucket) and the worker logs."],
  };
}

/** The clinic's logo file is gone from storage: once a day per clinic (key logo_missing:<clinic>). */
export function logoMissingAlert(a: { clinic: ClinicRef; key: string; error: string; job: LogoJob }): OwnerAlert {
  return {
    key: `logo_missing:${a.clinic.id}`,
    severity: "warning",
    titleTr: "Klinik logosu depoda yok",
    titleEn: "A clinic's logo file is missing",
    clinic: a.clinic,
    what: ["The clinic's profile points to a logo, but storage says the file is not there."],
    facts: [
      ["Logo file", a.key],
      ["Storage said", a.error],
    ],
    done: [
      a.job === "restyle"
        ? "The photo update was not made, so the clinic keeps the video it has, with its logo. Its budget was given back."
        : `The ${a.job} was made without the logo: the clinic's name is shown in the corner instead, as for a clinic that never uploaded one.`,
      "No email went to the clinic.",
    ],
    todo: ["Ask the clinic to upload its logo again in Settings, or look in the dentvid bucket for what happened to the file."],
  };
}
