import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { topicsGet, topicsPost } from "@/lib/dentvid/handlers/requests";

/** GET / POST { text } /api/dentvideo/mobile/v1/topic-requests — same rules as the web (handlers/requests.ts). */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withMobileSession(req, (s) => topicsGet(s));
}

export async function POST(req: Request) {
  return withMobileSession(req, (s) => topicsPost(s, req));
}
