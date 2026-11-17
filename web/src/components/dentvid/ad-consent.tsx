"use client";

import { useEffect, useState, type ComponentType } from "react";
import { captureFromLocation } from "@/lib/dentvid/attribution";

/**
 * Mounted once by the DentVideo layout, on every page a visit can start on.
 * Keeps the visit's first-touch source for the tab (lib/dentvid/attribution),
 * in browser storage only: no cookie, same cached HTML for everyone. Only
 * when the URL carries a Google Ads click id does it load the click-id and
 * consent code (ad-consent-prompt, a separate chunk). Renders nothing otherwise.
 */
export function AdCapture() {
  const [Prompt, setPrompt] = useState<ComponentType | null>(null);
  useEffect(() => {
    captureFromLocation();
    if (/[?&]dv_internal=/.test(window.location.search)) {
      import("@/lib/dentvid/internal-optin").then((m) => m.applyInternalParam()).catch(() => {});
    }
    if (/[?&](?:gclid|gbraid|wbraid)=/.test(window.location.search)) {
      import("./ad-consent-prompt").then((m) => setPrompt(() => m.AdConsent)).catch(() => {});
    }
  }, []);
  return Prompt ? <Prompt /> : null;
}
