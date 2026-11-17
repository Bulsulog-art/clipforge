import { describe, expect, it } from "vitest";
import { CHUNK_RELOAD_SCRIPT, RELOAD_GUARD_KEY, RELOAD_GUARD_MS, isChunkLoadError, reloadOnce } from "./chunk-reload";

class MemoryStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

/** Runs the inline script against a fake window; returns how to fire events and count reloads. */
function boot(storage: MemoryStorage | "throws" = new MemoryStorage(), resources: { name: string; initiatorType: string; responseStatus: number }[] = []) {
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  let reloads = 0;
  const win = {
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] ??= []).push(fn),
    location: { reload: () => reloads++ },
    get sessionStorage() {
      if (storage === "throws") throw new Error("SecurityError");
      return storage;
    },
  };
  new Function("window", "performance", CHUNK_RELOAD_SCRIPT)(win, { getEntriesByType: () => resources });
  const fire = (type: string, e: unknown) => listeners[type]?.forEach((fn) => fn(e));
  return { win, fire, reloads: () => reloads };
}

const script = (src: string) => ({ target: { tagName: "SCRIPT", src } });

describe("isChunkLoadError", () => {
  it("knows webpack, Vite/ESM and Safari's wording, and nothing else", () => {
    expect(isChunkLoadError(Object.assign(new Error("Loading chunk 812 failed.\n(error: https://dentvideo.com/_next/static/chunks/812.js)"), { name: "ChunkLoadError" }))).toBe(true);
    expect(isChunkLoadError(new Error("Loading CSS chunk 31 failed."))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("the inline chunk-reload script", () => {
  it("reloads once when one of the page's own chunks 404s, not again within the guard", () => {
    const s = new MemoryStorage();
    const { fire, reloads } = boot(s);
    fire("error", script("https://dentvideo.com/_next/static/chunks/app/dentvideo/start/page-0f1e.js"));
    expect(reloads()).toBe(1);
    expect(Number(s.getItem(RELOAD_GUARD_KEY))).toBeGreaterThan(0);
    // The reloaded page fails again at once (still mid-rollout): no loop.
    const again = boot(s);
    again.fire("error", script("https://dentvideo.com/_next/static/chunks/main-app.js"));
    expect(again.reloads()).toBe(0);
    // Long after, a new deploy may reload again.
    s.setItem(RELOAD_GUARD_KEY, String(Date.now() - RELOAD_GUARD_MS - 1));
    const later = boot(s);
    later.fire("error", script("https://dentvideo.com/_next/static/chunks/main-app.js"));
    expect(later.reloads()).toBe(1);
  });

  it("reloads for a failed lazy chunk (rejected dynamic import) and a missing stylesheet chunk", () => {
    const a = boot();
    a.fire("unhandledrejection", { reason: Object.assign(new Error("Loading chunk 99 failed."), { name: "ChunkLoadError" }) });
    expect(a.reloads()).toBe(1);
    const b = boot();
    b.fire("error", { target: { tagName: "LINK", rel: "stylesheet", href: "https://dentvideo.com/_next/static/css/a1.css" } });
    expect(b.reloads()).toBe(1);
  });

  it("backstop on load: a /_next/static/ chunk that came back 404 before the listener ran", () => {
    const missed = boot(new MemoryStorage(), [
      { name: "https://dentvideo.com/_next/static/media/font.woff2", initiatorType: "css", responseStatus: 404 },
      { name: "https://dentvideo.com/_next/static/chunks/43229f02-4c77d7552dd1efaf.js", initiatorType: "script", responseStatus: 404 },
    ]);
    missed.fire("load", {});
    expect(missed.reloads()).toBe(1);
    const fine = boot(new MemoryStorage(), [{ name: "https://dentvideo.com/_next/static/chunks/a.js", initiatorType: "script", responseStatus: 200 }]);
    fine.fire("load", {});
    expect(fine.reloads()).toBe(0);
  });

  it("ignores everything else: third-party scripts, images, ordinary errors", () => {
    const { fire, reloads } = boot();
    fire("error", script("https://challenges.cloudflare.com/turnstile/v0/api.js"));
    fire("error", { target: { tagName: "IMG", src: "https://dentvideo.com/_next/static/media/x.png" } });
    fire("error", { message: "Uncaught TypeError: x is undefined", error: new TypeError("x is undefined") });
    fire("unhandledrejection", { reason: new TypeError("Failed to fetch") });
    expect(reloads()).toBe(0);
  });

  it("never reloads when it cannot remember that it tried (storage blocked)", () => {
    const { fire, reloads } = boot("throws");
    fire("error", script("https://dentvideo.com/_next/static/chunks/main-app.js"));
    expect(reloads()).toBe(0);
  });
});

describe("reloadOnce (global-error boundary)", () => {
  it("shares the script's guard", () => {
    const s = new MemoryStorage();
    let n = 0;
    expect(reloadOnce(s, () => n++, 1_000_000)).toBe(true);
    expect(reloadOnce(s, () => n++, 1_000_000 + RELOAD_GUARD_MS - 1)).toBe(false);
    expect(reloadOnce(null, () => n++)).toBe(false);
    expect(n).toBe(1);
  });
});
