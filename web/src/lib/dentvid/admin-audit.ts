import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The owner panel's audit log (dentvid_admin_actions, 0010_dentvid_admin.sql):
 * who did what to which clinic, when, and how it went. Every action is also
 * written to the server log, so nothing goes unrecorded while the table is
 * not there yet (the panel then says "not audited — apply 0010").
 */

export type AuditEntry = {
  adminId: string;
  adminEmail?: string | null;
  action: string;
  clinicId?: string | null;
  target?: string | null;
  params?: Record<string, unknown>;
  outcome: "ok" | "refused" | "error";
  detail?: string | null;
};

export type AuditRow = {
  id: number;
  admin_id: string;
  admin_email: string | null;
  action: string;
  clinic_id: string | null;
  target: string | null;
  params: Record<string, unknown>;
  outcome: string;
  detail: string | null;
  created_at: string;
};

type Db = Pick<SupabaseClient, "from">;

/** A table or column that a migration (0010) has not created yet. */
export const missingSchema = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (["42P01", "PGRST205", "42703", "PGRST204"].includes(e.code ?? "") || /does not exist|Could not find the (table|.*column)/i.test(e.message ?? ""));

/** The row written for an entry (trimmed to the table's limits). */
export function auditRow(e: AuditEntry) {
  return {
    admin_id: e.adminId,
    admin_email: e.adminEmail ?? null,
    action: e.action,
    clinic_id: e.clinicId ?? null,
    target: e.target ? e.target.slice(0, 200) : null,
    params: e.params ?? {},
    outcome: e.outcome,
    detail: e.detail ? e.detail.slice(0, 1000) : null,
  };
}

/** Records one action. "logged" = server log only (table missing or write failed). Never throws. */
export async function recordAdminAction(db: Db | null, e: AuditEntry, log: (msg: string, data: unknown) => void = console.info): Promise<"stored" | "logged"> {
  const row = auditRow(e);
  log("[dentvideo admin] action", row);
  if (!db) return "logged";
  try {
    const { error } = await db.from("dentvid_admin_actions").insert(row);
    if (error) {
      if (!missingSchema(error)) console.error("[dentvideo admin] audit write failed", error.message);
      return "logged";
    }
    return "stored";
  } catch (err) {
    console.error("[dentvideo admin] audit write failed", (err as Error).message);
    return "logged";
  }
}

/** Recent actions, optionally for one clinic. null when the table is missing. */
export async function loadAdminActions(db: Db, opts: { clinicId?: string; limit?: number } = {}): Promise<AuditRow[] | null> {
  try {
    let q = db.from("dentvid_admin_actions").select("*");
    if (opts.clinicId) q = q.eq("clinic_id", opts.clinicId);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 50);
    if (error) return null;
    return (data ?? []) as AuditRow[];
  } catch {
    return null;
  }
}
