import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PUBLIC_PAGE_CACHE, publicCacheControl } from "./cache-policy";
import { routeForHost } from "./host";

/**
 * The marketing site may sit in a shared cache; nothing signed-in, per-person
 * or cookie-setting ever may. docs/CAPACITY.md ("Web caching").
 */

describe("public cache headers", () => {
  it.each([
    "/dentvideo",
    "/dentvideo/de",
    "/dentvideo/ja",
    "/dentvideo/ar",
    "/dentvideo/pl",
    "/dentvideo/about",
    "/dentvideo/fr/about",
    "/dentvideo/guides",
    "/dentvideo/ja/guides",
    "/dentvideo/guides/patient-education-videos",
    "/dentvideo/videos/zahnarztpraxis-videos-ki",
    "/dentvideo/llms.txt",
    "/dentvideo/llms-full.txt",
    "/dentvideo/sitemap.xml",
    "/dentvideo/robots.txt",
  ])("%s is public: a CDN may keep it an hour, serve it stale a day; browsers revalidate", (p) => {
    expect(publicCacheControl(p)).toBe(PUBLIC_PAGE_CACHE);
    expect(PUBLIC_PAGE_CACHE).toBe("public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  });

  it.each([
    "/dentvideo/app",
    "/dentvideo/app/settings",
    "/dentvideo/app/record",
    "/dentvideo/start",
    "/dentvideo/reset",
    "/dentvideo/admin",
    "/dentvideo/admin/clinic/abc",
    "/dentvideo/dev/app",
    "/dentvideo/account-deleted",
    "/dentvideo/preview-demo",
    "/dentvideo/en",
    "/dentvideo/xx",
    "/dentvideo/de/app",
    "/dentvideo/guides/../app",
    "/dentvideo/guides/a/b",
    "/api/dentvideo/week",
    "/api/dentvideo/checkout",
    "/dashboard",
    "/login",
    "/studio/new",
  ])("%s is never marked public", (p) => {
    expect(publicCacheControl(p)).toBeNull();
  });

  it("only GET and HEAD", () => {
    expect(publicCacheControl("/dentvideo", "HEAD")).toBe(PUBLIC_PAGE_CACHE);
    expect(publicCacheControl("/dentvideo", "POST")).toBeNull();
  });

  it("follows dentvideo.com's clean URLs through the host rewrite", () => {
    const at = (p: string) => {
      const r = routeForHost("dentvideo.com", p, "");
      return r.kind === "rewrite" ? publicCacheControl(r.path) : null;
    };
    expect(at("/")).toBe(PUBLIC_PAGE_CACHE);
    expect(at("/de/about")).toBe(PUBLIC_PAGE_CACHE);
    expect(at("/guides/patient-education-videos")).toBe(PUBLIC_PAGE_CACHE);
    expect(at("/app")).toBeNull();
    expect(at("/start")).toBeNull();
  });

  it("the cacheable English, Arabic and Japanese pages are prerendered (force-static), not rendered per request", () => {
    const app = path.resolve(__dirname, "../../app/dentvideo");
    for (const f of ["page.tsx", "about/page.tsx", "guides/page.tsx", "ar/page.tsx", "ar/about/page.tsx", "ar/guides/page.tsx", "ja/page.tsx", "ja/about/page.tsx", "ja/guides/page.tsx"]) {
      expect(fs.readFileSync(path.join(app, f), "utf8"), f).toMatch(/export const dynamic = "force-static";/);
    }
  });
});
