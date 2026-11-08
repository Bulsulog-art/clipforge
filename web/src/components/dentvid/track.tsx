"use client";

import { useEffect } from "react";
import { externalReferrerHost } from "@/lib/dentvid/events";
import { trackDv } from "@/lib/dentvid/events-client";

/**
 * Counts a landing view, once per browser tab and locale: the locale, the
 * utm_* tags when present, and the referring site's host (never its path).
 * Renders nothing.
 */
export function LandingView({ locale }: { locale: string }) {
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const props: Record<string, string> = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
        const v = q.get(k);
        if (v) props[k] = v.slice(0, 40);
      }
      const ref = document.referrer ? externalReferrerHost(document.referrer, window.location.hostname) : undefined;
      if (ref) props.ref = ref;
      trackDv("landing_view", { locale, props, once: `landing:${locale}` });
    } catch {
      // never break the page
    }
  }, [locale]);
  return null;
}
