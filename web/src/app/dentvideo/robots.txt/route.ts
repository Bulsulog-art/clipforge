import { robotsTxt } from "@/lib/dentvid/robots";

// dentvideo.com/robots.txt (the middleware maps it here on that host).
export const dynamic = "force-static";

export function GET() {
  return new Response(robotsTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
