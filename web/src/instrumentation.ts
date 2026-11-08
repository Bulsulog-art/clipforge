import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    release: process.env.GIT_COMMIT_SHA,
  });
}

export async function onRequestError(...args: Parameters<typeof Sentry.captureRequestError>) {
  // Count server errors for the owner's hourly 5xx spike alert (lib/dentvid/ops-server.ts).
  // Node runtime only (Redis); never lets the counter get in Sentry's way.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const [, request, context] = args as unknown as [unknown, { path?: string }, { routePath?: string }];
      const { noteServerError } = await import("./lib/dentvid/ops-server");
      await noteServerError(context?.routePath ?? request?.path?.split("?")[0] ?? "unknown");
    } catch {
      // best effort
    }
  }
  return Sentry.captureRequestError(...args);
}
