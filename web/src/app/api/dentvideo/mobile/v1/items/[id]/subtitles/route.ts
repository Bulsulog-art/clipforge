import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { subtitlesGet } from "@/lib/dentvid/handlers/requests";

/** GET /api/dentvideo/mobile/v1/items/{id}/subtitles?format=srt|vtt — the video's subtitle file (lib/dentvid/subtitles.ts). */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withMobileSession(req, (s) => subtitlesGet(s, id, req));
}
