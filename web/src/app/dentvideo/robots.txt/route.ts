// dentvideo.com/robots.txt (the middleware maps it here on that host).
export function GET() {
  const body = ["User-agent: *", "Allow: /", "Disallow: /app", "Disallow: /start", "Disallow: /dev/", "Disallow: /api/", "", "Sitemap: https://dentvideo.com/sitemap.xml", ""].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
