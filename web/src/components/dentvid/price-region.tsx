"use client";

import { useEffect } from "react";
import { dvPriceContext, guessCountry } from "@/lib/dentvid/price-region";

/** Marks <html data-dv-cur data-dv-tax> with the visitor's billing currency, so price.tsx shows its variant. */
export function PriceRegion({ locale }: { locale: string }) {
  useEffect(() => {
    let timeZone: string | null = null;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {}
    // The edge's country; the browser caches the answer for an hour (Cache-Control: private).
    void fetch("/api/dentvideo/geo", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((b: { country?: unknown } | null) => {
        const geo = typeof b?.country === "string" ? b.country : null;
        const { currency, tax } = dvPriceContext(guessCountry({ geo, timeZone, locale }));
        document.documentElement.dataset.dvCur = currency;
        document.documentElement.dataset.dvTax = tax;
      });
  }, [locale]);
  return null;
}
