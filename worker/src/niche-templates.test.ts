import { describe, expect, test } from "vitest";
import { NICHE_TEMPLATES, resolveNicheTemplate } from "./niche-templates.js";

const CAPTION_STYLES = ["bold-pop", "clean", "neon", "hype", "minimal"];
const THUMBNAIL_STYLES = ["mrbeast", "cinematic", "minimal"];
const MUSIC_MOODS = ["hype", "chill", "motivational", "dramatic", "lofi", "cinematic", "comedic"];

// The 12 niches the web studio offers + default — every one must resolve to a
// template whose values are valid for the downstream enums.
const STUDIO_NICHES = [
  "motivation", "business", "finance", "health", "tech", "education",
  "comedy", "fitness", "spirituality", "history", "science", "lifestyle",
];

describe("niche-templates", () => {
  test("every studio niche has a template with valid axis values", () => {
    for (const niche of STUDIO_NICHES) {
      const t = NICHE_TEMPLATES[niche];
      expect(t, `missing template for ${niche}`).toBeDefined();
      expect(CAPTION_STYLES).toContain(t.captionStyle);
      expect(THUMBNAIL_STYLES).toContain(t.thumbnailStyle);
      expect(MUSIC_MOODS).toContain(t.musicMood);
      expect(t.hookTone.length).toBeGreaterThan(10);
    }
  });

  test("unknown niche falls back to the default template", () => {
    expect(resolveNicheTemplate("does-not-exist")).toEqual(NICHE_TEMPLATES.default);
    expect(resolveNicheTemplate(undefined)).toEqual(NICHE_TEMPLATES.default);
    expect(resolveNicheTemplate(null)).toEqual(NICHE_TEMPLATES.default);
  });

  test("resolution is case-insensitive", () => {
    expect(resolveNicheTemplate("COMEDY")).toEqual(NICHE_TEMPLATES.comedy);
  });

  test("templates are genuinely differentiated (not all identical)", () => {
    const captionSet = new Set(STUDIO_NICHES.map((n) => NICHE_TEMPLATES[n].captionStyle));
    const moodSet = new Set(STUDIO_NICHES.map((n) => NICHE_TEMPLATES[n].musicMood));
    expect(captionSet.size).toBeGreaterThanOrEqual(4);
    expect(moodSet.size).toBeGreaterThanOrEqual(4);
  });
});
