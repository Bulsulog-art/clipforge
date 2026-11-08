import { dentvideoPaths } from "@/lib/dentvid/seo";
import { dentvideoPublicUrl } from "@/lib/dentvid/host";

// dentvideo.com/sitemap.xml (the middleware maps it here on that host).
export function GET() {
  const urls = dentvideoPaths()
    .map((p) => `  <url><loc>${dentvideoPublicUrl(p, "https://dentvideo.com", "")}</loc><priority>${p === "/dentvideo" ? "1.0" : "0.7"}</priority></url>`)
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
