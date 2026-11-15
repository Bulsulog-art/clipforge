// dv-internal=1: internal browser (internal-traffic.ts). On every page: keep tiny.
export const INTERNAL_KEY = "dv-internal";

export function isInternalBrowser(s?: Pick<Storage, "getItem">): boolean {
  try {
    return (s ?? localStorage).getItem(INTERNAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInternalBrowser(on = true, s?: Pick<Storage, "setItem" | "removeItem">): void {
  try {
    const st = s ?? localStorage;
    if (on) st.setItem(INTERNAL_KEY, "1");
    else st.removeItem(INTERNAL_KEY);
  } catch {
    // storage blocked
  }
}
