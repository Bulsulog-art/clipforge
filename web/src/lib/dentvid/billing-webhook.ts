import type { SupabaseClient } from "@supabase/supabase-js";
import { applyTransition, dvTransition, type ClinicBilling, type DodoEventData } from "./billing";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DvWebhookResult = { status: 200 | 500; body: Record<string, unknown> };

type ClinicRow = ClinicBilling & { id: string; owner_id: string };

/** 0002 not applied yet: PostgREST reports an unknown column. */
const missingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42703" || e.code === "PGRST204" || /column .* does not exist|Could not find the .* column/i.test(e.message ?? ""));

async function findClinic(db: SupabaseClient, by: "id" | "dodo_subscription_id", value: string): Promise<{ row: ClinicRow | null; error: string | null }> {
  const full = await db.from("dentvid_clinics").select("id, owner_id, plan, plan_tier, dodo_subscription_id, plan_renews_at").eq(by, value).maybeSingle();
  if (!full.error) return { row: (full.data as ClinicRow | null) ?? null, error: null };
  if (!missingColumn(full.error)) return { row: null, error: full.error.message };
  if (by !== "id") return { row: null, error: null };
  const base = await db.from("dentvid_clinics").select("id, owner_id, plan").eq("id", value).maybeSingle();
  return { row: (base.data as ClinicRow | null) ?? null, error: base.error?.message ?? null };
}

/**
 * A verified Dodo event that belongs to DentVideo: move the clinic's plan.
 * Unknown clinics and events that change nothing are acknowledged (200) —
 * retrying will not change them; database errors return 500 so Dodo retries.
 */
export async function handleDentvideoEvent(db: SupabaseClient, evt: { type: string; data: DodoEventData }): Promise<DvWebhookResult> {
  const d = evt.data ?? {};
  const t = dvTransition(evt.type, d);
  if (!t) return { status: 200, body: { ok: true, app: "dentvideo", ignored: evt.type } };

  const metaClinic = typeof d.metadata?.clinic_id === "string" && UUID.test(d.metadata.clinic_id) ? d.metadata.clinic_id : null;
  const metaOwner = typeof d.metadata?.owner_id === "string" ? d.metadata.owner_id : null;

  let found = metaClinic ? await findClinic(db, "id", metaClinic) : { row: null, error: null };
  if (!found.row && !found.error) found = await findClinic(db, "dodo_subscription_id", t.subscriptionId);
  if (found.error) return { status: 500, body: { error: found.error } };
  const clinic = found.row;
  if (!clinic) {
    console.warn("[dodo:dentvideo] no clinic for event", evt.type, t.subscriptionId);
    return { status: 200, body: { ok: true, app: "dentvideo", ignored: "no clinic" } };
  }
  if (metaOwner && clinic.owner_id !== metaOwner) {
    console.warn("[dodo:dentvideo] clinic/owner mismatch", evt.type, t.subscriptionId);
    return { status: 200, body: { ok: true, app: "dentvideo", ignored: "owner mismatch" } };
  }

  const update = applyTransition(clinic, t);
  if (!update) return { status: 200, body: { ok: true, app: "dentvideo", unchanged: true } };

  const now = new Date().toISOString();
  let { error } = await db.from("dentvid_clinics").update({ ...update, updated_at: now }).eq("id", clinic.id);
  if (error && missingColumn(error)) {
    // Billing columns not migrated yet: the plan itself still moves.
    ({ error } = await db.from("dentvid_clinics").update({ plan: update.plan ?? clinic.plan, updated_at: now }).eq("id", clinic.id));
  }
  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { ok: true, app: "dentvideo", plan: update.plan ?? clinic.plan } };
}
