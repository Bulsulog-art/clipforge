import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { LOCALES } from "./dentvideo";
import { SAMPLE_VIDEOS, sampleSrc } from "./dentvideo-samples";
import { landingJsonLd } from "@/lib/dentvid/seo";

const publicFile = (src: string) => path.join(__dirname, "../../public", src);

describe("sample week per landing", () => {
  it.each(LOCALES)("%s lists three distinct samples whose files exist", (locale) => {
    const list = SAMPLE_VIDEOS[locale];
    expect(new Set(list.map((v) => v.slug)).size).toBe(3);
    for (const v of list) {
      expect(existsSync(publicFile(sampleSrc(locale, v.slug, "mp4"))), `${locale}/${v.slug}.mp4`).toBe(true);
      expect(existsSync(publicFile(sampleSrc(locale, v.slug, "jpg"))), `${locale}/${v.slug}.jpg`).toBe(true);
      expect(v.seconds).toBeGreaterThan(5);
      expect(v.seconds).toBeLessThan(60);
    }
  });

  it.each(LOCALES)("%s landing describes its own samples, in its own language", (locale) => {
    const videos = (landingJsonLd(locale)["@graph"] as Record<string, unknown>[]).filter((n) => n["@type"] === "VideoObject");
    expect(videos).toHaveLength(3);
    for (const v of videos) {
      expect(v.inLanguage).toBe(locale);
      expect(String(v.contentUrl)).toContain(`/dentvideo/samples/${locale}/`);
    }
  });
});
