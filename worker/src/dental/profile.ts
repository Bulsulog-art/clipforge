import { z } from "zod";

/**
 * Everything the agents know about one clinic. Filled once at onboarding;
 * every agent reads it, none of them writes it.
 */
export const clinicProfileSchema = z.object({
  name: z.string().min(1).max(80),
  city: z.string().max(60).optional(),
  /** ISO 3166-1 alpha-2. Drives which advertising rules apply. */
  country: z.string().length(2).toUpperCase(),
  /** BCP-47-ish language the videos are written in, e.g. "en", "tr". */
  language: z.string().min(2).max(8).default("en"),
  /** What the clinic actually offers. Agents only talk about these. */
  services: z.array(z.string().min(2).max(60)).min(1).max(20),
  tone: z.enum(["warm", "expert", "playful", "calm"]).default("warm"),
  /**
   * How the clinic addresses patients where the language distinguishes it
   * (Sie/du, usted/tú, vous/tu, siz/sen). A German video that switched from
   * "du" to "Sie" mid-way was seen in a real run.
   */
  address: z.enum(["formal", "informal"]).default("formal"),
  /** Instagram/TikTok handle without @, shown on the CTA scene. */
  handle: z.string().max(40).optional(),
  /** The clinic's brand colour, "#1a7f8c" — caption highlights and accents. */
  brandColor: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .transform((c) => c.replace(/^#/, "").toUpperCase())
    .optional(),
  /**
   * A second colour from the clinic's logo, used as the video accent when it
   * can be (see brandTheme). Derived from the logo when a job starts
   * (dental/logo.ts brandFromLogo); not something the clinic fills in.
   */
  brandAccent: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .transform((c) => c.replace(/^#/, "").toUpperCase())
    .optional(),
  /** Path or URL of the clinic's logo (PNG with transparency works best). */
  logo: z.string().max(500).optional(),
  /** Where a viewer books. Goes in the caption, never on screen. */
  bookingUrl: z.string().url().optional(),
});

export type ClinicProfile = z.infer<typeof clinicProfileSchema>;

/** Content pillars — the weekly mix the strategist balances across. */
export const PILLARS = ["education", "myth", "procedure", "aftercare", "prevention", "team"] as const;
export type Pillar = (typeof PILLARS)[number];

export function addressRule(p: Pick<ClinicProfile, "address" | "language">): string {
  return p.address === "informal"
    ? `Address the viewer informally (e.g. du / tú / tu / sen) and consistently, every line.`
    : `Address the viewer formally (e.g. Sie / usted / vous / siz) and consistently, every line.`;
}
