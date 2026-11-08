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
] as const;

export const clinicProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  city: z.string().trim().max(60).optional(),
  country: z.string().trim().length(2).toUpperCase(),
  language: z.enum(["en", "de", "es", "fr", "it", "pt", "tr"]),
  services: z.array(z.string().trim().min(2).max(60)).min(1).max(20),
  tone: z.enum(["warm", "expert", "playful", "calm"]).default("warm"),
  address: z.enum(["formal", "informal"]).default("formal"),
  handle: z.string().trim().max(41).transform((h) => h.replace(/^@/, "")).optional(),
  bookingUrl: z.string().trim().url().optional(),
  brandColor: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .transform((c) => c.replace(/^#/, "").toUpperCase())
    .optional(),
});

export type ClinicProfile = z.infer<typeof clinicProfileSchema>;
