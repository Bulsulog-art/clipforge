"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { DvCtaWhere } from "@/lib/dentvid/events";
import { attributionFrom, captureAttribution } from "@/lib/dentvid/attribution";
import { trackDv } from "@/lib/dentvid/events-client";

/**
 * Counts a landing view, once per browser tab and locale: the locale, the
 * utm_* tags when present, and the referring site's host (never its path).
 * Renders nothing.
 */
export function LandingView({ locale }: { locale: string }) {
  useEffect(() => {
    try {
      // This visit's own source (for the view), and the tab's first touch kept for the sign-up.
      const visit = attributionFrom(window.location.search, document.referrer, window.location.hostname);
      captureAttribution(visit);
      trackDv("landing_view", { locale, props: visit, once: `landing:${locale}` });
    } catch {
      // never break the page
    }
  }, [locale]);
  return null;
}

/**
 * The hero's main button: down to the landing's own preview (#try), which
 * needs no account — the sign-up is the next step from there. Counted as
 * try_clicked, not cta_clicked (which stays "a button into the sign-up").
 * A plain in-page anchor, so it works before the page's JavaScript has run.
 */
export function TryLink({ locale, className, children }: { locale: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href="#try"
      className={className}
      data-cta="hero"
      onClick={(e) => {
        trackDv("try_clicked", { locale, props: { where: "hero" } });
        const target = document.getElementById("try");
        if (!target || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        window.history.pushState(window.history.state, "", "#try");
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      }}
    >
      {children}
    </a>
  );
}

/**
 * A link into the sign-up that counts the click (cta_clicked, with where it
 * sits on the page). The navigation never waits for the event.
 */
export function TrackedLink({
  href,
  locale,
  where,
  className,
  children,
}: {
  href: string;
  locale: string;
  where: DvCtaWhere;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} data-cta={where} onClick={() => trackDv("cta_clicked", { locale, props: { where } })}>
      {children}
    </Link>
  );
}
