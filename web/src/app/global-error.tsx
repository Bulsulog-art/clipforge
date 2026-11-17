"use client";

import { useEffect } from "react";
import { isChunkLoadError, reloadOnce } from "@/lib/chunk-reload";

/**
 * The last error boundary (it replaces the root layout). A chunk that is gone
 * after a deploy (version skew — lib/chunk-reload) reloads the page once, so
 * it picks up the current build; anything else, or a second failure, shows a
 * plain "reload" screen instead of Next's unstyled default.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const chunk = isChunkLoadError(error);
  useEffect(() => {
    if (!chunk) return;
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
    reloadOnce(storage, () => window.location.reload());
  }, [chunk]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 16, background: "#faf7f2", color: "#13232a" }}>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>{chunk ? "This page was updated" : "Something went wrong"}</h1>
          <p style={{ margin: "0 0 20px", lineHeight: 1.5 }}>Please reload the page to continue.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ font: "inherit", padding: "10px 20px", borderRadius: 999, border: 0, background: "#0f5c5c", color: "#fff", cursor: "pointer" }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
