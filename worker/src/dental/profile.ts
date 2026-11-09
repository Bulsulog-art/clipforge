import { z } from "zod";
import { addressFor } from "./locale.js";

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

/** The languages the product ships (web/src/lib/dentvid/profile.ts LANGUAGES, plus "it"/"pt" for the eval panel). */
export const PROFILE_LANGUAGES = ["en", "de", "es", "fr", "it", "pt", "tr", "ja", "ar", "pl"] as const;

/** A booking link: https only, and only ever written into a caption — the worker never fetches it. */
export const BOOKING_URL = /^https:\/\/[^\s"'<>\\]{3,290}$/i;

/**
 * Everything the agents know about one clinic. Filled once at onboarding;
 * every agent reads it, none of them writes it.
 *
 * The row it comes from is writable by the clinic owner (Liman RLS), so this
 * is a security boundary, not just a shape check:
 *  - there is no logo / URL / path field: the logo comes ONLY from the
 *    storage object at the server-built `<owner>/logo.<ext>` path
 *    (jobs.ts loadClinic), passed to renderers as a separate local file;
 *  - unknown keys (an injected "logo") are dropped;
 *  - optional decorations that fail validation (an odd handle, a non-https
 *    booking link) are dropped rather than failing a paid week.
 * Mirrored by supabase/liman/0007_dentvid_profile_guard.sql on the database.
 */
export const clinicProfileSchema = z.object({
  name: text(1, 80),
  city: text(0, 60).optional().catch(undefined),
  /** ISO 3166-1 alpha-2. Drives which advertising rules apply. */
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((c) => c.toUpperCase()),
  /** Language the videos are written in. */
  language: z.enum(PROFILE_LANGUAGES).default("en"),
  /** What the clinic actually offers. Agents only talk about these. */
  services: z.array(text(2, 60)).min(1).max(20),
  tone: z.enum(["warm", "expert", "playful", "calm"]).default("warm"),
  /**
   * How the clinic addresses patients where the language distinguishes it
   * (Sie/du, usted/tú, vous/tu, siz/sen). A German video that switched from
   * "du" to "Sie" mid-way was seen in a real run.
   */
  address: z.enum(["formal", "informal"]).default("formal"),
  /** Instagram/TikTok handle without @, shown on the CTA scene. */
  handle: z
    .string()
    .trim()
    .transform((h) => h.replace(/^@/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._-]{1,40}$/))
    .optional()
    .catch(undefined),
  /** The clinic's brand colour, "#1a7f8c" — caption highlights and accents. */
  brandColor: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .transform((c) => c.replace(/^#/, "").toUpperCase())
    .optional()
    .catch(undefined),
  /**
   * A second colour from the clinic's logo, used as the video accent when it
   * can be (see brandTheme). Derived from the logo when a job starts
   * (dental/logo.ts brandFromLogo); not something the clinic fills in.
   */
  brandAccent: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .transform((c) => c.replace(/^#/, "").toUpperCase())
    .optional()
    .catch(undefined),
  /** Where a viewer books. Goes in the caption, never on screen, never fetched. */
  bookingUrl: z.string().trim().regex(BOOKING_URL).optional().catch(undefined),
});

export type ClinicProfile = z.infer<typeof clinicProfileSchema>;

/** Content pillars — the weekly mix the strategist balances across. */
export const PILLARS = ["education", "myth", "procedure", "aftercare", "prevention", "team"] as const;
export type Pillar = (typeof PILLARS)[number];

export function addressRule(p: Pick<ClinicProfile, "address" | "language">): string {
  return addressFor(p.language, p.address);
}
