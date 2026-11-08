import { cookies } from "next/headers";
import { dvServer } from "./supabase";

/** The signed-in DentVideo user and a client acting as them (RLS applies). */
export async function dvSession() {
  const store = await cookies();
  const db = dvServer(store);
  const { data } = await db.auth.getUser();
  return { db, user: data.user ?? null };
}

/** Monday (UTC) of the week a date falls in, as YYYY-MM-DD. */
export function weekOf(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}
