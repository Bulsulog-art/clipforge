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
  /** Instagram/TikTok handle without @, shown on the CTA scene. */
  handle: z.string().max(40).optional(),
  /** Where a viewer books. Goes in the caption, never on screen. */
  bookingUrl: z.string().url().optional(),
});

export type ClinicProfile = z.infer<typeof clinicProfileSchema>;

/** Content pillars — the weekly mix the strategist balances across. */
export const PILLARS = ["education", "myth", "procedure", "aftercare", "prevention", "team"] as const;
export type Pillar = (typeof PILLARS)[number];
