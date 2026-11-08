import { sitemapXml } from "@/lib/dentvid/sitemap";

// dentvideo.com/sitemap.xml (the middleware maps it here on that host).
export const dynamic = "force-static";

export function GET() {
  return new Response(sitemapXml(), { headers: { "content-type": "application/xml; charset=utf-8" } });
}
