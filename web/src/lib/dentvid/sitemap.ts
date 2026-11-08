import { dentvideoSitemapEntries } from "./seo-guides";
import { dentvideoPublicUrl } from "./host";

// The sitemap always names dentvideo.com: it is only served on that host.
const url = (path: string) => dentvideoPublicUrl(path, "https://dentvideo.com", "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Absolute dentvideo.com URLs of every public page, in sitemap order. */
export function sitemapUrls(): string[] {
  return dentvideoSitemapEntries().map((e) => url(e.path));
}

/**
 * Every page with its last change and, where a true translation exists, its
 * hreflang alternates
 * (https://developers.google.com/search/docs/specialty/international/localized-versions#sitemap).
 */
export function sitemapXml(): string {
  const urls = dentvideoSitemapEntries()
    .map((e) => {
      const alts = Object.entries(e.alternates ?? {})
        .map(([lang, p]) => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${esc(url(p))}"/>`)
        .join("");
      return `  <url>\n    <loc>${esc(url(e.path))}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <priority>${e.priority}</priority>${alts}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}
