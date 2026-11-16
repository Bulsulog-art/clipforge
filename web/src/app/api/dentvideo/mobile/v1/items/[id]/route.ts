import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { patchItem } from "@/lib/dentvid/handlers/item-patch";

/** PATCH /api/dentvideo/mobile/v1/items/{id} { approval, note? } | { posted } — same rules as the web (handlers/item-patch.ts). */
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withMobileSession(req, (s) => patchItem(s, id, req));
}
