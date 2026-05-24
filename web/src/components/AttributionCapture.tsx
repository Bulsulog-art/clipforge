"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Two-step attribution capture:
 *
 *   1. On every landing, sniff URL UTM params + document.referrer and
 *      persist to localStorage. Idempotent — last UTM-bearing visit
 *      wins.
 *   2. If a Supabase session is already active AND we have stashed
 *      attribution that hasn't been submitted, POST it to
 *      /api/account/attribution. The endpoint is itself idempotent
 *      (only writes if profile.signup_source is null) so a replay
 *      from a returning visitor is safe.
 *
 * Drop <AttributionCapture/> anywhere in the layout — it renders
 * nothing visible, just runs the useEffect on mount.
 */
const LS_KEY = "clipforge.attribution";
const LS_SUBMITTED_KEY = "clipforge.attribution.submitted";

export function AttributionCapture() {
  useEffect(() => {
    try {
      captureUtmFromUrl();
      void submitIfReady();
    } catch {
      // Never let an analytics quirk break the page.
    }
  }, []);

  return null;
}

function captureUtmFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = params.get(key);
    if (v) utm[key] = v;
  }
  // Even without explicit UTM, capture the referrer so an organic visitor
  // from Hacker News still tells us where they came from.
  if (Object.keys(utm).length === 0 && !document.referrer) return;
  const stash = {
    ...utm,
    referrer: document.referrer || undefined,
    landingPath: window.location.pathname,
    capturedAt: Date.now(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(stash));
}

async function submitIfReady() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LS_SUBMITTED_KEY) === "1") return;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;   // wait until user signs in

  let stash: Record<string, unknown>;
  try { stash = JSON.parse(raw); }
  catch { return; }

  const body = {
    utmSource:   stash.utm_source,
    utmMedium:   stash.utm_medium,
    utmCampaign: stash.utm_campaign,
    utmContent:  stash.utm_content,
    utmTerm:     stash.utm_term,
    referrer:    stash.referrer,
    landingPath: stash.landingPath,
  };

  try {
    const res = await fetch("/api/account/attribution", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      // Mark submitted so a returning logged-in user doesn't keep
      // re-firing the request.
      localStorage.setItem(LS_SUBMITTED_KEY, "1");
    }
  } catch {
    // Silent — we'll retry on the next landing.
  }
}
