import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { changePost } from "@/lib/dentvid/handlers/requests";

/** POST /api/dentvideo/mobile/v1/items/{id}/change { note } — same rules as the web (handlers/requests.ts). */
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withMobileSession(req, (s) => changePost(s, id, req));
}
