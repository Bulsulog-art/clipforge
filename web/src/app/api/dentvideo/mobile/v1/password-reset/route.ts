/**
 * POST /api/dentvideo/mobile/v1/password-reset { email, locale } — the web's "forgot password"
 * (same rate limits, same answer whether or not the account exists, same email). The link opens
 * dentvideo.com/reset, where the new password is chosen; the app then signs in with it.
 */
export { POST } from "../../../password-reset/route";
export const dynamic = "force-dynamic";
