import { z } from "zod";

/**
 * The clinic profile the content agents read. Mirrors
 * worker/src/dental/profile.ts — the worker re-validates with its own copy,
 * so a mismatch fails loudly there rather than producing bad content.
 */
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "tr", label: "Türkçe" },
  { code: "ja", label: "日本語" },
  { code: "ar", label: "العربية" },
  { code: "pl", label: "Polski" },
] as const;

/** Free text the agents read: no control characters, nothing that looks like a URL or a file path. */
const NO_URL = /(:\/\/|^\s*(file|data|javascript):|^\s*[/~\\]|\.\.[/\\])/i;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((s) => !CONTROL.test(s) && !NO_URL.test(s), "plain text only");

/** A booking link: https only. It goes in captions; nothing ever fetches it. */
export const BOOKING_URL = /^https:\/\/[^\s"'<>\\]{3,290}$/i;

/**
 * Exactly the keys (and limits) the database accepts for an owner write —
 * supabase/liman/0007_dentvid_profile_guard.sql enforces the same shape, so a
 * direct REST write cannot add a "logo" or a URL the worker would follow.
 * Unknown keys are dropped (zod's default), never stored.
 */
export const clinicProfileSchema = z.object({
  name: text(1, 80),
  city: text(0, 60).optional(),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((c) => c.toUpperCase()),
  language: z.enum(["en", "de", "es", "fr", "it", "pt", "tr", "ja", "ar", "pl"]),
  services: z.array(text(2, 60)).min(1).max(20),
  tone: z.enum(["warm", "expert", "playful", "calm"]).default("warm"),
  address: z.enum(["formal", "informal"]).default("formal"),
  handle: z
    .string()
    .trim()
    .transform((h) => h.replace(/^@/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._-]{1,40}$/))
    .optional(),
  bookingUrl: z.string().trim().regex(BOOKING_URL).optional(),
  brandColor: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .transform((c) => c.replace(/^#/, "").toUpperCase())
    .optional(),
});

export type ClinicProfile = z.infer<typeof clinicProfileSchema>;
