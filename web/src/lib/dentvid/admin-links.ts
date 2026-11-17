import { dvHref } from "./host";
import { adminPath, FLASH_PARAM, type AdminSection } from "./admin-nav";
import type { AdminLinks, InternalView } from "@/components/dentvid/admin-ui";
import type { InternalExcluded } from "./internal-traffic";

/** Links of the real admin panel (dentvideo.com/admin/… once canonical, else /dentvideo/admin/…). */
export const siteAdminLinks: AdminLinks = {
  section: (key: AdminSection, query = "") => dvHref(adminPath(key, query)),
  clinic: (id: string) => dvHref(`/dentvideo/admin/clinic/${id}`),
  form: (key: AdminSection) => ({ action: dvHref(adminPath(key)), hidden: {} }),
};

type Params = Record<string, string | string[] | undefined>;

/** The page's own URL (without the flash), for an action to return to. */
export function backPath(path: string, sp: Params): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === FLASH_PARAM || v === undefined) continue;
    p.set(k, Array.isArray(v) ? v[0] ?? "" : v);
  }
  const s = p.toString();
  return dvHref(s ? `${path}?${s}` : path);
}

export const flashOf = (sp: Params): string | null => {
  const v = sp[FLASH_PARAM];
  return typeof v === "string" ? v : null;
};

/** This page with one query parameter set (or removed with null), flash dropped. */
export function withParam(path: string, sp: Params, key: string, value: string | null): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === FLASH_PARAM || k === key || v === undefined) continue;
    p.set(k, Array.isArray(v) ? v[0] ?? "" : v);
  }
  if (value !== null) p.set(key, value);
  const s = p.toString();
  return dvHref(s ? `${path}?${s}` : path);
}

/** The internal-traffic switch for a data screen (lib/dentvid/internal-traffic): ?internal=1 includes it. */
export function internalView(path: string, sp: Params, state: { included: boolean; excluded: InternalExcluded } | undefined): InternalView | undefined {
  if (!state) return undefined;
  return { ...state, includeHref: withParam(path, sp, "internal", "1"), excludeHref: withParam(path, sp, "internal", null) };
}
