import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { deleteAccount } from "@/lib/dentvid/handlers/account-delete";

/** POST /api/dentvideo/mobile/v1/account/delete { confirm } — App Store guideline 5.1.1(v); the web's deletion, step for step. */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withMobileSession(req, (s) => deleteAccount(s, req));
}
