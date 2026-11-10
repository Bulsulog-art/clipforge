"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Script from "next/script";

/**
 * Cloudflare Turnstile on the sign-up form (lib/dentvid/turnstile.ts checks
 * the token server-side). Rendered only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is
 * set; the CSP allows challenges.cloudflare.com only then (next.config.ts).
 */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

export type TurnstileHandle = { reset: () => void };

export const TurnstileWidget = forwardRef<TurnstileHandle, { locale: string; onToken: (token: string | null) => void }>(function TurnstileWidget(
  { locale, onToken },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  const mount = () => {
    if (!box.current || !window.turnstile || id.current) return;
    id.current = window.turnstile.render(box.current, {
      sitekey: TURNSTILE_SITE_KEY,
      language: locale,
      callback: (t: string) => cb.current(t),
      "expired-callback": () => cb.current(null),
      "error-callback": () => cb.current(null),
    });
  };

  useEffect(() => {
    mount();
    return () => {
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
    // Mount once; the script's onReady covers a script that loads later.
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => {
      cb.current(null);
      if (id.current && window.turnstile) window.turnstile.reset(id.current);
    },
  }));

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mount} />
      <div ref={box} className="flex min-h-[65px] justify-center" />
    </>
  );
});
