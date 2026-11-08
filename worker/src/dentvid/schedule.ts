import type { Queue } from "bullmq";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";

/**
 * Monday delivery. Every Monday the worker starts the week for each clinic
 * that should get one, so the dentist does not have to remember to press a
 * button — the videos are simply there, and an email says so.
 *
 *   active               every week
 *   trial                never — "trial" means signed up but not paid yet.
 *                        There is no free week: such a clinic has seen a live
 *                        preview in the browser, and its first week is queued
 *                        by the payment webhook the moment it pays.
 *   paused / cancelled   nothing
 *
 * The job id is the same one the web app uses ("week:<clinic>:<monday>",
 * web/src/lib/dentvid/week-job.ts), so a clinic whose week was already
 * queued (button or payment) gets nothing twice.
 */

/** The Monday (UTC) of the week a date falls in, "YYYY-MM-DD" — same as web/src/lib/dentvid/week.ts. */
export function weekOf(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

export type ClinicRow = { id: string; plan: string };

/** Only a paying clinic has videos made (no API spend before payment). */
export function isPaying(plan: string | null | undefined): boolean {
  return plan === "active";
}

export function clinicsToRun(clinics: ClinicRow[]): string[] {
  return clinics.filter((c) => isPaying(c.plan)).map((c) => c.id);
}

export async function dispatchWeeks(db: SupabaseClient, queue: Queue, now = new Date()): Promise<number> {
  const { data: clinics, error } = await db.from("dentvid_clinics").select("id, plan").eq("plan", "active");
  if (error) throw new Error(`dispatch: ${error.message}`);
  const ids = clinicsToRun((clinics ?? []) as ClinicRow[]);
  const week = weekOf(now);
  for (const clinicId of ids) {
    await queue.add("week", { clinicId, count: 5 }, { jobId: `week:${clinicId}:${week}`, attempts: 2, backoff: { type: "exponential", delay: 60_000 } });
  }
  logger.info({ week, clinics: ids.length }, "dentvid: monday dispatch");
  return ids.length;
}
