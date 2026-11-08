import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No "X-Powered-By: Next.js" banner.
  poweredByHeader: false,
  // Required for the Docker runner stage which copies /app/.next/standalone
  // and /app/public into a slim node:22 image and runs `node server.js`.
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "cdn.clipforge.bulsulabs.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  async headers() {
    // DentVideo's backend (Liman, self-hosted Supabase): the browser signs in,
    // uploads recordings/logos and plays signed video URLs from it directly.
    let liman = "";
    try {
      liman = process.env.NEXT_PUBLIC_DENTVID_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_DENTVID_SUPABASE_URL).origin : "";
    } catch {
      liman = "";
    }
    const limanWs = liman.startsWith("https://") ? liman.replace(/^https:/, "wss:") : "";
    const extra = (...xs: string[]) => xs.filter(Boolean).map((x) => ` ${x}`).join("");
    // CSP scoped to what we actually load: our Supabase project, Sentry,
    // RevenueCat, and our CDN. Inline scripts are allowed for Next's
    // bootstrap & React hydration ('self' + 'unsafe-inline' is the
    // pragmatic Next.js default — tighten with nonces post-launch).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `img-src 'self' data: blob: https://*.supabase.co https://cdn.clipforge.bulsulabs.com https://img.youtube.com${extra(liman)}`,
      // data: for the live preview's player, which unlocks its audio tags with a silent data: mp3.
      `media-src 'self' https://*.supabase.co https://cdn.clipforge.bulsulabs.com blob: data:${extra(liman)}`,
      // OpenAI and fal.ai are called server-side only, so they are not listed.
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.revenuecat.com${extra(liman, limanWs)}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // HSTS: 2-year max-age + includeSubDomains + preload. Match HSTS
          // preload-list requirements so we can submit clipforge.bulsulabs.com
          // after we've been TLS-only for a while.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
