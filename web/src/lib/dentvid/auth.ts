import { cookies } from "next/headers";
import { dvServer } from "./supabase";

export { deliveryWeek, weekOf } from "./week";

/** The signed-in DentVideo user and a client acting as them (RLS applies). */
export async function dvSession() {
  const store = await cookies();
  const db = dvServer(store);
  const { data } = await db.auth.getUser();
  return { db, user: data.user ?? null };
}
