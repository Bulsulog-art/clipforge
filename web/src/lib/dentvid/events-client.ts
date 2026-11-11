import type { DvEventName } from "./events";
import { readAttribution } from "./attribution";

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
    const body = JSON.stringify({ name, locale: opts.locale, props: { ...readAttribution(), ...(opts.props ?? {}) } });
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
