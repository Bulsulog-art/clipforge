import type { Queue } from "bullmq";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";

/**
 * Monday delivery. Every Monday the worker starts the week for each clinic
 * that should get one, so the dentist does not have to remember to press a
 * button — the videos are simply there, and an email says so.
 *
 *   active   every week
 *   trial    only the free first week, and only if they never made one
 *   paused / cancelled   nothing
 *
 * The job id is the same one the web app uses ("week:<clinic>:<monday>"),
 * so a clinic that already pressed the button this week gets nothing twice.
 */

/** The Monday (UTC) of the week a date falls in, "YYYY-MM-DD" — same as web/src/lib/dentvid/auth.ts. */
export function weekOf(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

export type ClinicRow = { id: string; plan: string };

export function clinicsToRun(clinics: ClinicRow[], withAWeek: Set<string>): string[] {
  return clinics
    .filter((c) => c.plan === "active" || (c.plan === "trial" && !withAWeek.has(c.id)))
    .map((c) => c.id);
}

export async function dispatchWeeks(db: SupabaseClient, queue: Queue, now = new Date()): Promise<number> {
  const { data: clinics, error } = await db.from("dentvid_clinics").select("id, plan");
  if (error) throw new Error(`dispatch: ${error.message}`);
  const { data: made } = await db.from("dentvid_items").select("clinic_id").eq("kind", "generated");
  const withAWeek = new Set((made ?? []).map((r) => r.clinic_id as string));
  const ids = clinicsToRun((clinics ?? []) as ClinicRow[], withAWeek);
  const week = weekOf(now);
  for (const clinicId of ids) {
    await queue.add("week", { clinicId, count: 5 }, { jobId: `week:${clinicId}:${week}`, attempts: 2, backoff: { type: "exponential", delay: 60_000 } });
  }
  logger.info({ week, clinics: ids.length }, "dentvid: monday dispatch");
  return ids.length;
}
