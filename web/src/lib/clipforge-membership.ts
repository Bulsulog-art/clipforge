/**
 * Who is a ClipForge user on Liman, the self-hosted Supabase ClipForge shares
 * with DentVideo, Studio and other apps (one auth.users table for all).
 *
 * Membership lives in app_metadata, which only the service role can write:
 *   app_metadata.product  = "clipforge"     when no other product owns the account
 *   app_metadata.products = [..., "clipforge"]  when another product (e.g.
 *                                          "dentvideo") is already `product`
 * The same convention as lib/dentvid/membership.ts, which reads both keys.
 *
 * Accounts copied from the cloud project are marked by
 * scripts/clipforge-liman-copy.mjs; accounts made on Liman are marked the
 * first time they reach ClipForge (lib/supabase/clipforge-profile.ts).
 *
 * Pure: no I/O (clipforge-membership.test.ts).
 */

export const CF_PRODUCT = "clipforge";

type AppMeta = Record<string, unknown> | null | undefined;

export type CfUserLike = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

function productsOf(app: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (typeof app.product === "string" && app.product) out.push(app.product);
  if (Array.isArray(app.products)) for (const p of app.products) if (typeof p === "string" && p) out.push(p);
  return out;
}

/**
 * The app_metadata patch that adds ClipForge to an account, or null when it
 * is already marked. Another app's `product` is never overwritten.
 */
export function joinClipforgePatch(app: AppMeta): Record<string, unknown> | null {
  const a = app ?? {};
  if (productsOf(a).includes(CF_PRODUCT)) return null;
  if (typeof a.product !== "string" || !a.product) return { product: CF_PRODUCT };
  const list = Array.isArray(a.products) ? a.products.filter((p): p is string => typeof p === "string" && !!p) : [];
  return { products: [...list, CF_PRODUCT] };
}

/** app_metadata keys GoTrue itself writes. */
const GOTRUE_APP_KEYS = new Set(["provider", "providers", "product", "products"]);

/**
 * May deleting a ClipForge account remove the shared auth user itself?
 *
 * Only when nothing says another app uses it: no product other than
 * "clipforge" in app_metadata, no other app_metadata keys, and no
 * user_metadata.product naming another app. Accounts with no product at all
 * (made before markers existed) count as ClipForge's. Anything else is
 * shared: ClipForge removes its own data and marker and keeps the login.
 */
export function isClipforgeOnly(user: CfUserLike): boolean {
  if (!user) return false;
  const app = user.app_metadata ?? {};
  if (productsOf(app).some((p) => p !== CF_PRODUCT)) return false;
  for (const k of Object.keys(app)) if (!GOTRUE_APP_KEYS.has(k)) return false;
  const metaProduct = (user.user_metadata ?? {}).product;
  if (metaProduct !== undefined && metaProduct !== CF_PRODUCT) return false;
  return true;
}

/**
 * The app_metadata patch that takes ClipForge off a shared account (GoTrue
 * deletes keys set to null on an admin update), or null when unmarked.
 */
export function leaveClipforgePatch(app: AppMeta): Record<string, unknown> | null {
  const a = app ?? {};
  const patch: Record<string, unknown> = {};
  if (a.product === CF_PRODUCT) patch.product = null;
  if (Array.isArray(a.products) && a.products.includes(CF_PRODUCT)) {
    const rest = a.products.filter((p) => p !== CF_PRODUCT);
    patch.products = rest.length ? rest : null;
  }
  return Object.keys(patch).length ? patch : null;
}
