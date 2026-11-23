import type { DvEventName } from "./events";
import { readAttribution } from "./attribution";
import { isInternalBrowser } from "./internal-flag";

/**
 * "mobile", "tablet" or "desktop" from the pointer and the screen's short side: a touch screen
 * under 600 CSS px is a phone. Coarse on purpose (events.ts DV_DEVICES); never the user agent.
 */
export function deviceKind(w: Pick<Window, "matchMedia" | "screen"> = window): "mobile" | "tablet" | "desktop" | undefined {
  try {
    const touch = w.matchMedia("(pointer: coarse)").matches && !w.matchMedia("(any-pointer: fine)").matches;
    if (!touch) return "desktop";
    return Math.min(w.screen.width, w.screen.height) < 600 ? "mobile" : "tablet";
  } catch {
    return undefined;
  }
}

function deviceProp(): { device?: string } {
  const d = deviceKind();
  return d ? { device: d } : {};
}

/**
 * Send a funnel event from the browser — fire-and-forget. Never throws,
 * never awaits anything the UI waits for, sets no cookie and stores no id.
 * `once` keeps a per-tab flag in sessionStorage (cleared when the tab
 * closes) so a reload does not count the same step twice.
 */
export function trackDv(name: DvEventName, opts: { locale?: string; props?: Record<string, string | number | boolean>; once?: string } = {}): void {
  try {
    if (typeof window === "undefined") return;
    if (opts.once) {
      const key = `dv-ev:${opts.once}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // storage unavailable: count it anyway
      }
    }
    // The tab's first-touch source rides along on every event (lib/dentvid/attribution).
    // Internal browser (owner, QA, e2e) or automation: tagged.
    const bot = typeof navigator !== "undefined" && navigator.webdriver === true;
    const body = JSON.stringify({ name, locale: opts.locale, props: { ...readAttribution(), ...deviceProp(), ...(opts.props ?? {}), ...(isInternalBrowser() || bot ? { internal: true } : {}) } });
    void fetch("/api/dentvideo/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}
