/**
 * The admin panel's sections and links, shared by the real pages and the dev
 * harness. Pure (no env): each caller passes how a section's path becomes an
 * href (dvHref on the site, the harness's own query on the dev pages).
 */

export const ADMIN_SECTIONS = [
  { key: "overview", label: "Overview", path: "" },
  { key: "clinics", label: "Clinics", path: "/clinics" },
  { key: "videos", label: "Videos", path: "/videos" },
  { key: "system", label: "Queue & system", path: "/system" },
  { key: "emails", label: "Emails", path: "/emails" },
  { key: "billing", label: "Billing", path: "/billing" },
  { key: "funnel", label: "Funnel & sources", path: "/funnel" },
  // Built separately (personalised demo links); always linked.
  { key: "demos", label: "Demos", path: "/demos" },
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

/** In-app path of a section ("/dentvideo/admin/clinics"). */
export const adminPath = (section: AdminSection | string, rest = "") => {
  const s = ADMIN_SECTIONS.find((x) => x.key === section);
  return `/dentvideo/admin${s ? s.path : ""}${rest}`;
};

/** The flash parameter the action route appends to the page it returns to. */
export const FLASH_PARAM = "flash";

/**
 * Where the action route may send the browser back to: an admin page of this
 * site (with or without the /dentvideo prefix that dentvideo.com hides),
 * never another host or a protocol-relative URL. Anything else → the overview.
 * Any old flash is dropped and the new one appended.
 */
export function backWithFlash(back: unknown, code: string, fallback = "/dentvideo/admin"): string {
  let path = fallback;
  if (typeof back === "string" && back.length <= 500 && /^\/(dentvideo\/)?admin(?:\/[A-Za-z0-9_\-/]*)?(?:\?[^#\s\\]*)?$/.test(back) && !back.startsWith("//") && !back.includes("..")) {
    path = back;
  }
  const [p, q = ""] = path.split("?");
  const params = new URLSearchParams(q);
  params.delete(FLASH_PARAM);
  params.set(FLASH_PARAM, code);
  return `${p}?${params.toString()}`;
}
