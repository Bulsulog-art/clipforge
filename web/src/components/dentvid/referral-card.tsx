"use client";

import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import type { ReferralText } from "@/content/dentvideo-referral";

/**
 * Settings: the clinic's referral link ("give a month, get a month",
 * lib/dentvid/referrals). The words arrive resolved from the server; this
 * only copies the link.
 */
export function ReferralCard({ text, code, link, showStats }: { text: ReferralText; code: string; link: string; showStats: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (insecure context, denied): the link stays selectable on the page.
    }
  };
  return (
    <section aria-labelledby="referral-title" className="dv-card mt-10 p-5 sm:p-6">
      <h2 id="referral-title" className="flex items-center gap-2 font-semibold text-dv-ink">
        <Gift className="h-5 w-5 text-dv-teal" aria-hidden="true" />
        {text.heading}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-dv-body">{text.lead}</p>
      <div className="mt-4 grid gap-1">
        <span className="text-xs font-medium text-dv-muted">{text.linkLabel}</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={link}
            dir="ltr"
            aria-label={text.linkLabel}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-10 w-full min-w-0 rounded-lg border border-dv-line bg-white px-3 font-mono text-sm text-dv-ink"
          />
          <button type="button" onClick={copy} className="dv-btn dv-btn-secondary shrink-0 px-4 py-2 text-sm !text-dv-teal">
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            <span aria-live="polite">{copied ? text.copied : text.copy}</span>
          </button>
        </div>
        <span className="mt-1 text-xs text-dv-muted">
          {text.codeLabel}: <span className="font-mono text-dv-ink" dir="ltr">{code}</span>
        </span>
      </div>
      <p className="mt-4 text-sm text-dv-ink">{showStats ? text.stats : text.none}</p>
      <p className="mt-2 text-xs leading-relaxed text-dv-muted">{text.terms}</p>
    </section>
  );
}
