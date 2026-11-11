import { dvHref } from "./host";
import { adminPath, FLASH_PARAM, type AdminSection } from "./admin-nav";
import type { AdminLinks } from "@/components/dentvid/admin-ui";

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
