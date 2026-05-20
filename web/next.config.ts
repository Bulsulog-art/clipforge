import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required for the Docker runner stage which copies /app/.next/standalone
  // and /app/public into a slim node:22 image and runs `node server.js`.
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "cdn.clipforge.bulsulabs.xyz" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  async headers() {
    // CSP scoped to what we actually load: our Supabase project, Sentry,
    // RevenueCat, and our CDN. Inline scripts are allowed for Next's
    // bootstrap & React hydration ('self' + 'unsafe-inline' is the
    // pragmatic Next.js default — tighten with nonces post-launch).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://cdn.clipforge.bulsulabs.xyz https://img.youtube.com",
      "media-src 'self' https://*.supabase.co https://cdn.clipforge.bulsulabs.xyz blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.revenuecat.com https://api.openai.com https://fal.run",
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
          // preload-list requirements so we can submit clipforge.bulsulabs.xyz
          // after we've been TLS-only for a while.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
