import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase";

/** A short-lived URL for the clinic's saved logo (the bucket is private), or null. */
export async function logoSignedUrl(db: SupabaseClient, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
