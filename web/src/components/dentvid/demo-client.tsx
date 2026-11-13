"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Mail } from "lucide-react";
import type { Locale } from "@/content/dentvideo";
import { captureAttribution } from "@/lib/dentvid/attribution";
import { trackDv } from "@/lib/dentvid/events-client";
import { rememberDemo } from "@/lib/dentvid/demo-cookie";
import type { PreviewProfile } from "./live-preview";

/**
 * The browser half of a personalised demo page (/<lang>/d/<token>):
 * the clinic's branded preview, the view beacon and the tracked buttons.
 */

const LivePreview = dynamic(() => import("./live-preview").then((m) => m.LivePreview), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true" className="mx-auto aspect-[9/19.5] w-full max-w-[300px] animate-pulse rounded-[2.6rem] bg-[#1b2523] p-[10px]">
      <div className="h-full rounded-[2.1rem] bg-[#0b3f3e]" />
    </div>
  ),
});

export function DemoPreview({ token, profile }: { token: string; profile: PreviewProfile }) {
  return <LivePreview profile={profile} demoToken={token} />;
}

/**
 * Counts the view (once per tab; the server rate-limits per address too),
 * keeps the demo as this tab's first-touch source, and remembers the demo
 * so the sign-up can fill in the clinic. Renders nothing.
 */
export function DemoView({ token, campaign, locale }: { token: string; campaign: string; locale: Locale }) {
  useEffect(() => {
    try {
      captureAttribution({ utm_source: "demo", utm_medium: "dm", utm_campaign: campaign, utm_content: token });
      rememberDemo(token);
      // Automated browsers (headless scanners, test tools) are not a clinic looking.
      if (navigator.webdriver) return;
      const key = `dv-demo-view:${token}`;
      const send = () => {
        try {
          if (sessionStorage.getItem(key)) return;
          sessionStorage.setItem(key, "1");
        } catch {
          // storage blocked: count it anyway (the server limits repeats)
        }
        void fetch("/api/dentvideo/demo/view", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, locale }),
          keepalive: true,
          credentials: "same-origin",
        }).catch(() => {});
      };
      // A prerendered or background tab is not a view until someone looks at it.
      if (document.visibilityState === "visible") return send();
      const onVisible = () => {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", onVisible);
        send();
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => document.removeEventListener("visibilitychange", onVisible);
    } catch {
      // never break the page
    }
  }, [token, campaign, locale]);
  return null;
}

export function DemoActions({
  token,
  locale,
  startHref,
  mailHref,
  cta,
  ask,
  colour,
}: {
  token: string;
  locale: Locale;
  startHref: string;
  mailHref: string;
  cta: string;
  ask: string;
  colour: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <a
        href={startHref}
        onClick={() => trackDv("demo_cta_clicked", { locale, props: { demo: token, where: "start" } })}
        className="dv-btn group px-7 py-4 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(8,46,45,0.6)]"
        style={{ background: colour }}
        data-cta="demo-start"
      >
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
      </a>
      <a
        href={mailHref}
        onClick={() => trackDv("demo_cta_clicked", { locale, props: { demo: token, where: "question" } })}
        className="dv-btn dv-btn-secondary px-6 py-4 text-base"
        data-cta="demo-question"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        {ask}
      </a>
    </div>
  );
}
