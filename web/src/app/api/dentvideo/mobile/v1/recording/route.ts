import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { startRecording } from "@/lib/dentvid/handlers/recording";

/** POST /api/dentvideo/mobile/v1/recording { path } — process an uploaded recording (own folder only; same rules as the web). */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, (s) => startRecording(s, req));
}
