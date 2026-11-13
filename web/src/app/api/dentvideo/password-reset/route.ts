import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { dvUrl } from "@/lib/dentvid/host";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { sendEmail } from "@/lib/dentvid/email";
import { resetEmail } from "@/lib/dentvid/reset-email";

// POST /api/dentvideo/password-reset — email a "choose a new password" link.
//
// Liman's own mailer is not set up for DentVideo (it hosts other apps), so the
// recovery token comes from the admin API and the email goes out through
// Resend in the clinic's language. The link opens /reset, which exchanges the
// token for a session in the browser. The answer is the same whether or not
// the account exists, so the form can't be used to discover who has one.
//
// An account another app made with the same address (Liman is shared) gets
// the link too: opening it from that mailbox proves the address is theirs,
// and the exchange then adds DentVideo to the account (lib/dentvid/join).

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  locale: z.string().max(8).optional(),
});

const MIN = 60;

export async function POST(req: Request) {
  const err = await dvErrors();
  const ip = clientIp(req.headers);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.badSignup }, { status: 400 });
  const { email } = parsed.data;
  const language = parsed.data.locale ?? "en";

  const limited = await rateLimited(
    [
      { key: `rl:reset:ip:${ip}`, rule: { limit: 5, windowSec: 60 * MIN } },
      { key: `rl:reset:email:${email}`, rule: LIMITS.resetEmail },
      { key: `rl:reset:emailday:${email}`, rule: LIMITS.resetEmailDay },
      { key: "rl:reset:global", rule: { limit: 200, windowSec: 60 * MIN } },
    ],
    () => err.tooMany,
  );
  if (limited) return limited;

  try {
    const { data, error } = await dvAdmin().auth.admin.generateLink({ type: "recovery", email });
    const hashed = data?.properties?.hashed_token;
    if (!error && hashed && data?.user) {
      const link = dvUrl(`/dentvideo/reset?token_hash=${encodeURIComponent(hashed)}&lang=${encodeURIComponent(language)}`);
      const sent = await sendEmail(email, resetEmail({ language, link }));
      if (!sent) console.error("[dentvideo reset] email not sent");
    }
  } catch (e) {
    console.error("[dentvideo reset] failed", (e as Error).message);
  }
  return NextResponse.json({ ok: true });
}
