import { signup } from "@/lib/dentvid/handlers/signup";

// POST /api/dentvideo/signup — the web form's sign-up. The work (bot brakes,
// limits, account, verification code, session cookie) is in
// lib/dentvid/handlers/signup.ts, shared with the iPhone app's
// POST /api/dentvideo/mobile/v1/signup.
export async function POST(req: Request) {
  return signup(req, "web");
}
