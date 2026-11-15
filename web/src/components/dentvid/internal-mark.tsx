"use client";

import { useEffect } from "react";
import { markInternalBrowser } from "@/lib/dentvid/internal-flag";

/**
 * Rendered by the server only on pages where the signed-in account is
 * internal (lib/dentvid/internal-traffic) or an admin: marks this browser
 * (localStorage dv-internal=1), so its later anonymous visits — after
 * sign-out too — are tagged internal and never keep an ad click.
 * Renders nothing.
 */
export function InternalMark() {
  useEffect(() => {
    markInternalBrowser();
  }, []);
  return null;
}
