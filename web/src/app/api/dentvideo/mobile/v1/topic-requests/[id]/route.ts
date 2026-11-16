import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { topicDelete } from "@/lib/dentvid/handlers/requests";

/** DELETE /api/dentvideo/mobile/v1/topic-requests/{id} — withdraw a waiting suggestion (handlers/requests.ts). */
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withMobileSession(req, (s) => topicDelete(s, id));
}
