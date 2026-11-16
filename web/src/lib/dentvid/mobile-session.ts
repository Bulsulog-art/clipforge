import type { Session, User } from "@supabase/supabase-js";
import { z } from "zod";
import { isDentvideoUser } from "./membership";

/** The token set the iPhone app keeps in the Keychain. expiresAt is Unix seconds. */
export type MobileTokens = { accessToken: string; refreshToken: string; expiresAt: number; user: { id: string; email: string | null } };

export const SignInBody = z
  .object({
    email: z.string().trim().toLowerCase().email().max(200),
    password: z.string().min(1).max(200),
  })
  .strict();

export const RefreshBody = z.object({ refreshToken: z.string().min(8).max(2048) }).strict();

export function tokensOf(session: Session | null | undefined, user: User | null | undefined): MobileTokens | null {
  if (!session?.access_token || !session.refresh_token || !user) return null;
  const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
  return { accessToken: session.access_token, refreshToken: session.refresh_token, expiresAt, user: { id: user.id, email: user.email ?? null } };
}

/** May this login use the DentVideo app? Only accounts DentVideo's server marked as its own (app_metadata). */
export const mayUseApp = (user: User | null | undefined) => !!user && isDentvideoUser(user);
