import type { SupabaseClient } from "@supabase/supabase-js";
import { accountText } from "@/content/dentvideo-account";
import { dvLocale } from "./locale-server";

/** The signed-in owner's clinic row (or null), always scoped by owner_id. */
export async function ownClinic(db: SupabaseClient, ownerId: string): Promise<Record<string, unknown> | null> {
  const { data } = await db.from("dentvid_clinics").select("*").eq("owner_id", ownerId).maybeSingle();
  const row = (data as Record<string, unknown> | null) ?? null;
  // RLS already limits the read to the owner; this is the belt to its braces.
  return row && row.owner_id === ownerId ? row : null;
}

/** Account-screen messages in the clinic's language. */
export async function accountErrors(clinic: Record<string, unknown> | null) {
  const language = (clinic?.profile as { language?: string } | undefined)?.language;
  return accountText(await dvLocale(language)).errors;
}
