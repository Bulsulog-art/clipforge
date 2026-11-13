import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEventRow, type DvEventName, type DvEventRow } from "./events";

/**
 * Store a funnel event (table dentvid_events, migration
 * supabase/liman/0006_dentvid_events.sql). Never throws, never rejects and
 * never blocks the caller for long: a missing table, an unconfigured
 * backend or a slow database only means the event is not counted.
 *
 * Usage (fire-and-forget): `void recordEvent("signup_completed", { locale })`.
 */

/** Table missing (0006 not applied): stop trying for a while instead of erroring every request. */
let missingUntil = 0;
const MISSING_BACKOFF_MS = 10 * 60_000;
const TIMEOUT_MS = 1500;

export const missingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || /relation .*dentvid_events.* does not exist|Could not find the table/i.test(e.message ?? ""));

export async function insertEventRow(row: DvEventRow, db?: SupabaseClient): Promise<boolean> {
  if (Date.now() < missingUntil) return false;
  try {
    const client = db ?? (await import("./supabase")).dvAdmin();
    const insert = Promise.resolve(client.from("dentvid_events").insert(row)) as Promise<{ error: { code?: string; message?: string } | null }>;
    const timeout = new Promise<{ error: { message: string } }>((resolve) => setTimeout(() => resolve({ error: { message: "timeout" } }), TIMEOUT_MS));
    const { error } = await Promise.race([insert, timeout]);
    if (!error) return true;
    if (missingTable(error)) missingUntil = Date.now() + MISSING_BACKOFF_MS;
    else console.warn("[dentvideo events] not stored", row.name, error.message);
    return false;
  } catch (e) {
    console.warn("[dentvideo events] not stored", row.name, (e as Error).message);
    return false;
  }
}

/** Record a server-side event. Props go through the same allow-list as browser events. */
export function recordEvent(
  name: DvEventName,
  opts: { locale?: string | null; props?: Record<string, unknown>; clinicId?: string | null; db?: SupabaseClient; geo?: string } = {},
): Promise<boolean> {
  const row = buildEventRow({ name, locale: opts.locale, props: opts.props, clinicId: opts.clinicId, geo: opts.geo });
  if (!row) return Promise.resolve(false);
  return insertEventRow(row, opts.db).catch(() => false);
}

/**
 * The events that show a clinic got as far as the plan step: it saw the
 * plans, clicked one, or was handed a checkout. Recorded with its clinic id
 * (the event route looks it up from the session; checkout_opened is
 * server-side), so they outlive the dv-step cookie that sign-out clears and
 * follow the clinic to another device.
 */
export const PLAN_REACHED_EVENTS: readonly DvEventName[] = ["plan_viewed", "plan_clicked", "checkout_opened"];

/**
 * Has this clinic ever reached the plan step (lib/dentvid/onboarding
 * resolveStep's `reachedPlan`)? False when it cannot tell — the table is
 * missing, the backend is slow or down — so /start falls back to the cookie.
 */
export async function clinicReachedPlan(clinicId: string, db?: SupabaseClient): Promise<boolean> {
  if (!clinicId || Date.now() < missingUntil) return false;
  try {
    const client = db ?? (await import("./supabase")).dvAdmin();
    const query = Promise.resolve(
      client.from("dentvid_events").select("id").eq("clinic_id", clinicId).in("name", [...PLAN_REACHED_EVENTS]).limit(1),
    ) as Promise<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>;
    const timeout = new Promise<{ data: null; error: { message: string } }>((resolve) => setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), TIMEOUT_MS));
    const { data, error } = await Promise.race([query, timeout]);
    if (error) {
      if (missingTable(error)) missingUntil = Date.now() + MISSING_BACKOFF_MS;
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/** The body as text, or null once it passes `max` bytes (the declared length is not trusted). */
export async function readCapped(req: Request, max: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > max) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** For tests. */
export function _resetEventBackoff() {
  missingUntil = 0;
}
