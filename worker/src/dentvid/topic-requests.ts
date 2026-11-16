import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.js";
import type { RequestRefusal, RefusalReasonCode } from "../dental/strategist.js";
import type { ItemRow } from "./rows.js";

/**
 * Topics a clinic suggested in the app ("Suggest a topic for next week",
 * web: lib/dentvid/clinic-requests.ts), table dentvid_topic_requests (0025).
 *
 * The Monday week reads the oldest pending suggestions (at most
 * MAX_REQUESTS_PER_WEEK, so the rest of the week stays varied) and hands them
 * to the strategist, which plans them first (dental/strategist.ts). Each one
 * then ends as:
 *   used      its video was made (ready or flagged) — linked by item_id
 *   refused   with a reason the app shows in one sentence:
 *               not_offered / ad_rules / clinical / unclear  (the strategist's filters)
 *               checks  (the video was written but did not pass the reviews)
 *   pending   untouched when its video failed for a technical reason or the
 *             week filled up first — it is tried again the next week.
 *
 * Everything here fails soft: a database without 0025 (or a read error)
 * means a normal week without suggestions, never a failed week.
 */

export const MAX_REQUESTS_PER_WEEK = 3;

export type PendingRequest = { id: string; text: string };
export type RequestReason = RefusalReasonCode | "checks";
export type RequestOutcome = { id: string; status: "used"; itemId: string; week: string } | { id: string; status: "refused"; reason: RequestReason };

/** The clinic's oldest pending suggestions. [] when the table is missing or cannot be read. */
export async function loadPendingRequests(db: SupabaseClient, clinicId: string, limit = MAX_REQUESTS_PER_WEEK): Promise<PendingRequest[]> {
  try {
    const { data, error } = await db
      .from("dentvid_topic_requests")
      .select("id, text")
      .eq("clinic_id", clinicId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) {
      logger.warn({ clinicId, err: error.message }, "dentvid: topic suggestions not read (0025 not applied?)");
      return [];
    }
    return ((data ?? []) as PendingRequest[]).filter((r) => typeof r?.id === "string" && typeof r?.text === "string" && r.text.trim().length >= 3);
  } catch (e) {
    logger.warn({ clinicId, err: (e as Error).message }, "dentvid: topic suggestions not read");
    return [];
  }
}

const requestIndex = (topic: unknown): number | undefined => {
  const i = (topic as { request?: unknown } | null | undefined)?.request;
  return typeof i === "number" && Number.isInteger(i) && i >= 0 ? i : undefined;
};

/**
 * What became of each suggestion this week. Pure. `rows` are the week's rows
 * as stored (a used suggestion's row carries an `id`), `refused` what the
 * strategist could not plan.
 */
export function requestOutcomes(requests: PendingRequest[], rows: (ItemRow & { id?: string })[], refused: RequestRefusal[], week: string): RequestOutcome[] {
  const out = new Map<string, RequestOutcome>();
  for (const r of refused) {
    const req = requests[r.request];
    if (req) out.set(req.id, { id: req.id, status: "refused", reason: r.reason });
  }
  for (const row of rows) {
    const i = requestIndex(row.topic);
    const req = i === undefined ? undefined : requests[i];
    if (!req || out.get(req.id)?.status === "used") continue;
    if ((row.status === "ready" || row.status === "flagged") && row.video_path && row.id) {
      out.set(req.id, { id: req.id, status: "used", itemId: row.id, week });
    } else if (row.status === "rejected" && !row.error && !out.has(req.id)) {
      // Written, but the reviewers turned it down: the clinic hears that it did not pass the checks.
      out.set(req.id, { id: req.id, status: "refused", reason: "checks" });
    }
    // A technical failure leaves it pending: it is tried again next week.
  }
  return [...out.values()];
}

/** Records the outcomes. Only rows still pending and of this clinic move. Never throws. */
export async function saveOutcomes(db: SupabaseClient, clinicId: string, outcomes: RequestOutcome[], now = new Date()): Promise<number> {
  let saved = 0;
  for (const o of outcomes) {
    try {
      const patch =
        o.status === "used"
          ? { status: "used", reason: null, item_id: o.itemId, week_of: o.week, decided_at: now.toISOString() }
          : { status: "refused", reason: o.reason, decided_at: now.toISOString() };
      const { error } = await db.from("dentvid_topic_requests").update(patch).eq("id", o.id).eq("clinic_id", clinicId).eq("status", "pending");
      if (error) logger.warn({ clinicId, requestId: o.id, err: error.message }, "dentvid: topic suggestion outcome not saved");
      else saved++;
    } catch (e) {
      logger.warn({ clinicId, requestId: o.id, err: (e as Error).message }, "dentvid: topic suggestion outcome not saved");
    }
  }
  return saved;
}
