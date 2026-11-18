import { dvSession } from "@/lib/dentvid/auth";
import { verifyEmail } from "@/lib/dentvid/handlers/verify-email";

// POST /api/dentvideo/verify-email — the signed-in owner proves they receive
// mail at their account's address (lib/dentvid/verify-email). The body is
// lib/dentvid/handlers/verify-email.ts, shared with the iPhone app's route.
//   { action: "send", onlyIfNone? }   email a new 6-digit code (60 s apart)
//   { action: "confirm", code }       check it; on a match the account is verified
//   { action: "change", email }       correct a mistyped address (unverified accounts only), then send
// Checkout refuses unverified accounts; the plan step shows the code card.
export async function POST(req: Request) {
  const { user } = await dvSession();
  return verifyEmail(user, req);
}
