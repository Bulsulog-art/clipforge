import { cookies, headers } from "next/headers";
import { dvBearer, dvServer } from "./supabase";

export { deliveryWeek, weekOf } from "./week";

/** The access token of an `Authorization: Bearer <jwt>` header, or null. */
export function bearerToken(authorization: string | null): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec((authorization ?? "").trim());
  return m ? m[1] : null;
}

/**
 * The signed-in DentVideo user and a client acting as them (RLS applies).
 *
 * The web app signs in with the "dv-auth" cookie. The iOS app has no cookie:
 * it sends its Supabase access token as a bearer header, which Supabase
 * verifies exactly as it verifies the cookie's token. A bearer request is not
 * exposed to CSRF (no browser adds the header by itself; see lib/origin-guard).
 */
export async function dvSession() {
  const token = bearerToken((await headers()).get("authorization"));
  if (token) {
    const db = dvBearer(token);
    const { data } = await db.auth.getUser(token);
    return { db, user: data.user ?? null };
  }
  const store = await cookies();
  const db = dvServer(store);
  const { data } = await db.auth.getUser();
  return { db, user: data.user ?? null };
}
