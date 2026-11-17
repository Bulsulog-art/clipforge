import { z } from "zod";
import { CLOSING_LINE_MAX } from "./closing-line";

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

/** The narrator choices in clinic settings (worker/src/dental/profile.ts narratorVoice). */
export const NARRATOR_VOICES = ["female", "male"] as const;
export type NarratorVoice = (typeof NARRATOR_VOICES)[number];

/** Free text the agents read: no control characters, nothing that looks like a URL or a file path. */
const NO_URL = /(:\/\/|^\s*(file|data|javascript):|^\s*[/~\\]|\.\.[/\\])/i;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
/** Line breaks: every field is one line (a clinic name ends up in an email subject). */
const LINE_BREAKS = /[\r\n\u0085\u2028\u2029]+/g;
/**
 * The database guard (0007 dentvid_plain_text) counts code points; JS
 * `.length` counts UTF-16 units, so "😀😀" is 4 here and 2 there. The
 * minimum is counted the database's way, or a value the guard refuses would
 * pass here and reach the clinic route's service-role fallback (security
 * round 3). The maximum stays in UTF-16 units: stricter than the database,
 * and what the worker's copy of this schema counts.
 */
const text = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.replace(LINE_BREAKS, " ").trim())
    .pipe(
      z
        .string()
        .max(max)
        .refine((s) => [...s].length >= min, `at least ${min} characters`)
        .refine((s) => !CONTROL.test(s) && !NO_URL.test(s), "plain text only"),
    );

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
  /**
   * The clinic's own closing line under its captions. The shape is checked
   * here (and by 0021 in the database); whether it may go out in the
   * clinic's market is checked by the clinic route with closing-line.ts,
   * the same rules the worker applies (it falls back to its own line).
   */
  closingLine: text(4, CLOSING_LINE_MAX).optional(),
  /**
   * Who narrates the videos (settings only). Unset means female, as in the
   * worker (dental/voice.ts narratorOf). 0022 adds it to the database guard.
   */
  narratorVoice: z.enum(NARRATOR_VOICES).optional(),
});

export type ClinicProfile = z.infer<typeof clinicProfileSchema>;
