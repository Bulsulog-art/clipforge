/**
 * Who is a DentVideo user on Liman, the self-hosted Supabase DentVideo
 * shares with other apps.
 *
 * Everything that grants or proves something lives in **app_metadata**,
 * which only the service role can write (GoTrue's admin API). user_metadata
 * is not used for any decision: any signed-in user can rewrite their own
 * with `PUT /auth/v1/user { data: … }`.
 *
 *   app_metadata.product = "dentvideo"   set at sign-up (/api/dentvideo/signup)
 *                                        and by scripts/dentvideo-backfill-app-metadata.mjs
 *                                        for accounts made before this change
 *   app_metadata.email_verified_at/for/via   proven ownership (lib/dentvid/verify-email)
 *
 * The database checks the same marker: migration 0008 limits the DentVideo
 * tables and storage to users whose app_metadata.product is "dentvideo".
 *
 * Pure: no I/O, so the rules are unit-tested (membership.test.ts).
 */

export const DV_PRODUCT = "dentvideo";

/** The app_metadata keys DentVideo owns. Removed when a shared account leaves DentVideo. */
export const DV_APP_METADATA_KEYS = ["product", "email_verified_at", "email_verified_for", "email_verified_via"] as const;

export type AuthUserLike = {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: { provider?: string | null }[] | null;
} | null | undefined;

/** The products listed on an account (app_metadata.product, plus an optional app_metadata.products list). */
function productsOf(app: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (typeof app.product === "string" && app.product) out.push(app.product);
  if (Array.isArray(app.products)) for (const p of app.products) if (typeof p === "string" && p) out.push(p);
  return out;
}

/** Is this a DentVideo account? Only the server-written app_metadata counts. */
export function isDentvideoUser(user: AuthUserLike): boolean {
  return productsOf(user?.app_metadata ?? {}).includes(DV_PRODUCT);
}

/** app_metadata keys GoTrue itself writes; they say nothing about which app owns the user. */
const GOTRUE_APP_KEYS = new Set(["provider", "providers"]);
/** user_metadata keys GoTrue copies from the identity, plus DentVideo's own legacy keys (pre-0008 accounts). */
const NEUTRAL_USER_KEYS = new Set(["sub", "email", "email_verified", "phone_verified", "product", "email_verified_at", "email_verified_for", "email_verified_via"]);

/**
 * May account deletion remove the shared Liman auth user itself?
 *
 * Only when the account is provably DentVideo's alone:
 *   - app_metadata says product "dentvideo", and lists no other product;
 *   - app_metadata holds nothing but GoTrue's own keys and DentVideo's keys
 *     (another app storing a role, tenant, plan… there means it uses this user);
 *   - user_metadata.product, if present, is "dentvideo" and user_metadata has
 *     no keys beyond GoTrue's identity copy and DentVideo's legacy keys;
 *   - every login identity is plain email.
 *
 * Anything else — including an account we cannot read — is treated as shared:
 * DentVideo removes only its own data and its markers and leaves the login.
 * The rule errs towards keeping a login: a stray key in a DentVideo-only
 * user's own user_metadata keeps their (now empty) login alive, never the
 * other way round.
 */
export function isDentvideoOnly(user: AuthUserLike): boolean {
  if (!user || !isDentvideoUser(user)) return false;
  const app = user.app_metadata ?? {};
  if (productsOf(app).some((p) => p !== DV_PRODUCT)) return false;
  for (const k of Object.keys(app)) {
    if (GOTRUE_APP_KEYS.has(k) || (DV_APP_METADATA_KEYS as readonly string[]).includes(k) || k === "products") continue;
    return false;
  }
  const providers = Array.isArray(app.providers) ? app.providers : [];
  if (providers.some((p) => p !== "email")) return false;
  if ((user.identities ?? []).some((i) => i?.provider && i.provider !== "email")) return false;
  const meta = user.user_metadata ?? {};
  if (meta.product !== undefined && meta.product !== DV_PRODUCT) return false;
  for (const k of Object.keys(meta)) if (!NEUTRAL_USER_KEYS.has(k)) return false;
  return true;
}

/**
 * The app_metadata update that takes DentVideo off a shared account: its
 * keys set to null (GoTrue deletes null keys on an admin update), and
 * "dentvideo" dropped from a products list if one exists.
 */
export function withoutDentvideo(app: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of DV_APP_METADATA_KEYS) if (app && k in app) patch[k] = null;
  if (app?.product !== undefined && app.product !== DV_PRODUCT) delete patch.product;
  if (Array.isArray(app?.products)) {
    const rest = (app!.products as unknown[]).filter((p) => p !== DV_PRODUCT);
    patch.products = rest.length ? rest : null;
  }
  return patch;
}
