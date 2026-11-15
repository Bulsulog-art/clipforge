"use client";

import { useEffect } from "react";
import { fetchDvGeo } from "@/lib/dentvid/geo-client";
import { dvPriceContext, guessCountry } from "@/lib/dentvid/price-region";

/** Marks <html data-dv-cur data-dv-tax> with the visitor's billing currency, so price.tsx shows its variant. */
export function PriceRegion({ locale }: { locale: string }) {
  useEffect(() => {
    let timeZone: string | null = null;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {}
    // The server's IP → country answer: one request per page, shared with the ad-consent prompt.
    void fetchDvGeo().then((g) => {
      const { currency, tax } = dvPriceContext(guessCountry({ geo: g?.country ?? null, timeZone, locale }));
      document.documentElement.dataset.dvCur = currency;
      document.documentElement.dataset.dvTax = tax;
    });
  }, [locale]);
  return null;
}
