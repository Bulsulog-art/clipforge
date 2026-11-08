import { INDEXNOW_KEY } from "@/lib/dentvid/indexnow";

// dentvideo.com/<key>.txt — proves to IndexNow that we own the host (lib/dentvid/indexnow.ts).
export const dynamic = "force-static";

export function GET() {
  return new Response(INDEXNOW_KEY, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
