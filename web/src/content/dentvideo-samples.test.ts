import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { LOCALES } from "./dentvideo";
import { SAMPLE_VIDEOS, sampleSrc, samplesFor } from "./dentvideo-samples";
import { landingJsonLd } from "@/lib/dentvid/seo";

const publicFile = (src: string) => path.join(__dirname, "../../public", src);

const WITH_SAMPLES = LOCALES.filter((l) => samplesFor(l));

describe("sample week per landing", () => {
  it("the original five landings have samples; Japanese, Arabic and Polish do not borrow another language's", () => {
    expect(WITH_SAMPLES).toEqual(["en", "de", "es", "tr", "fr"]);
    for (const l of ["ja", "ar", "pl"] as const) expect(SAMPLE_VIDEOS[l]).toBeUndefined();
  });

  it.each(WITH_SAMPLES)("%s lists three distinct samples whose files exist", (locale) => {
    const list = SAMPLE_VIDEOS[locale]!;
    expect(new Set(list.map((v) => v.slug)).size).toBe(3);
    for (const v of list) {
      expect(existsSync(publicFile(sampleSrc(locale, v.slug, "mp4"))), `${locale}/${v.slug}.mp4`).toBe(true);
      expect(existsSync(publicFile(sampleSrc(locale, v.slug, "jpg"))), `${locale}/${v.slug}.jpg`).toBe(true);
      expect(v.seconds).toBeGreaterThan(5);
      expect(v.seconds).toBeLessThan(60);
    }
  });

  it.each(LOCALES)("%s landing describes its own samples (if any), in its own language", (locale) => {
    const videos = (landingJsonLd(locale)["@graph"] as Record<string, unknown>[]).filter((n) => n["@type"] === "VideoObject");
    expect(videos).toHaveLength(samplesFor(locale) ? 3 : 0);
    for (const v of videos) {
      expect(v.inLanguage).toBe(locale);
      expect(String(v.contentUrl)).toContain(`/dentvideo/samples/${locale}/`);
    }
  });
});
