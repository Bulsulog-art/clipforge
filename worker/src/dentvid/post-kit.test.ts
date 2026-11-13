import { describe, it, expect } from "vitest";
import { buildPostKit, firstSentence, localTags, postHashtags, postKitProblems, softCta, tagWord, trimClosing, withPostKit } from "./post-kit.js";
import { scanHardRules } from "../dental/compliance.js";
import { ctaProblems } from "../dental/style.js";
import type { ItemRow } from "./rows.js";

const TR = { name: "Gülümse Diş Kliniği", city: "İzmir", language: "tr" as const, country: "TR", address: "formal" as const };
const DE = { name: "Zahnarztpraxis am Park", city: "München", language: "de" as const, country: "DE", address: "formal" as const };
const EN = { name: "Riverside Dental", city: "Bristol", language: "en" as const, country: "GB", address: "formal" as const };

const SAMPLES = {
  tr: {
    profile: TR,
    copy: {
      caption:
        "Diş taşı fırçayla çıkmaz; zamanla diş etlerini tahriş edebilir.\n\nProfesyonel temizlik genellikle birkaç dakika sürer ve diş hekiminizin önerdiği aralıklarla yapılır.\n\nBir sonraki kontrolünüzde diş taşınızı sorabilirsiniz.",
      hashtags: ["gulumsedis", "distasi", "distemizligi", "agizsagligi"],
    },
  },
  de: {
    profile: DE,
    copy: {
      caption:
        "Zahnstein lässt sich mit der Zahnbürste nicht entfernen – er kann das Zahnfleisch mit der Zeit reizen.\n\nDie professionelle Zahnreinigung dauert meist unter einer Stunde.\n\nVereinbaren Sie gern einen Termin zur Kontrolle.",
      hashtags: ["zahnarztpraxisampark", "zahnstein", "zahnreinigung", "prophylaxe"],
    },
  },
  en: {
    profile: EN,
    copy: {
      caption: "Tartar can't be brushed away — over time it can irritate your gums.\n\nA professional clean usually takes under an hour.\n\nBook a check-up and ask us about it.",
      hashtags: ["riversidedental", "tartar", "teethcleaning"],
    },
  },
};

describe("softCta", () => {
  it("invites questions without steering in Türkiye (RG 33075)", () => {
    expect(softCta(TR)).toMatch(/hekiminize sorabilirsiniz/);
    expect(ctaProblems(softCta(TR), "TR")).toEqual([]);
    // A Turkish-speaking clinic outside Türkiye gets the clinic's own invitation.
    expect(softCta({ ...TR, country: "DE" })).toBe("Sorularınız için kliniğimize yazabilirsiniz.");
  });

  it("is clean under the hard rules and CTA rules in every language, form and market", () => {
    const markets: Record<string, string[]> = { en: ["GB", "US"], de: ["DE", "AT", "CH"], es: ["ES", "MX"], fr: ["FR", "CH"], tr: ["TR", "DE"], ja: ["JP"], ar: ["AE", "SA"], pl: ["PL"] };
    for (const [language, countries] of Object.entries(markets))
      for (const country of countries)
        for (const address of ["formal", "informal"] as const) {
          const cta = softCta({ language: language as "en", country, address });
          expect(scanHardRules(cta), `${language}/${country}/${address}`).toEqual([]);
          expect(ctaProblems(cta, country), `${language}/${country}/${address}`).toEqual([]);
        }
  });
});

describe("hashtags", () => {
  it("folds Turkish and Polish city names, keeps Japanese and Arabic script", () => {
    expect(tagWord("İzmir", "tr")).toBe("izmir");
    expect(tagWord("Kraków", "pl")).toBe("krakow");
    expect(tagWord("横浜市", "ja")).toBe("横浜市");
    expect(tagWord("أبو ظبي", "ar")).toBe("أبو_ظبي");
    expect(localTags(TR)).toEqual(["izmir", "izmirdishekimi"]);
    expect(localTags({ city: "München", language: "de" })).toEqual(["münchen", "zahnarztmünchen"]);
    expect(localTags({ language: "en" })).toEqual([]);
  });

  it("5–10 tags: the clinic's first, local next, no duplicates, nothing the hard rules reject", () => {
    const tags = postHashtags(["gulumsedis", "distasi", "painless", "garanti", "#distasi"], TR);
    expect(tags[0]).toBe("gulumsedis");
    expect(tags.slice(1, 3)).toEqual(["izmir", "izmirdishekimi"]);
    expect(tags).not.toContain("painless");
    expect(tags).not.toContain("garanti");
    expect(tags.length).toBeGreaterThanOrEqual(5);
    expect(tags.length).toBeLessThanOrEqual(10);
    expect(new Set(tags).size).toBe(tags.length);
    // A long list is capped at ten.
    expect(postHashtags(Array.from({ length: 15 }, (_, i) => `tag${i}`), EN)).toHaveLength(10);
    // No city, few tags: topped up from the language's generic tags.
    expect(postHashtags(["own"], { language: "ja" }).length).toBeGreaterThanOrEqual(5);
  });
});

describe("texts", () => {
  it("drops a closing 'book a check-up' paragraph the kit replaces, keeps links and the Japanese 自由診療 note", () => {
    expect(trimClosing("A.\n\nBook a check-up today.", "en")).toBe("A.");
    expect(trimClosing("A.\n\nBook online: https://x.example/book", "en")).toContain("https://");
    expect(trimClosing("A.\n\nB is about brushing.", "en")).toContain("B is");
    expect(trimClosing("A。\n\n自由診療（保険適用外）です。ご予約時にご説明します。", "ja")).toContain("自由診療");
    expect(trimClosing("Only one paragraph about a check-up.", "en")).toContain("check-up");
  });

  it("first sentence, cut at a word", () => {
    expect(firstSentence("One. Two.")).toBe("One.");
    expect(firstSentence("歯石は歯ブラシでは取れません。定期的に。")).toBe("歯石は歯ブラシでは取れません。");
    const long = firstSentence(`${"word ".repeat(60)}end.`, 50);
    expect(long.length).toBeLessThanOrEqual(50);
    expect(long.endsWith("…")).toBe(true);
  });

  for (const [lang, s] of Object.entries(SAMPLES)) {
    it(`${lang}: Instagram caption has the body, the invitation, clinic · city and 5–10 tags; the short one fits a Shorts title`, () => {
      const kit = buildPostKit(s.copy, s.profile);
      expect(kit.instagram).toContain(kit.cta);
      expect(kit.instagram).toContain(`📍 ${s.profile.name} · ${s.profile.city}`);
      expect(kit.instagram.length).toBeLessThanOrEqual(2200);
      const tags = kit.instagram.split("\n").at(-1)!.split(" ");
      expect(tags.length).toBeGreaterThanOrEqual(5);
      expect(tags.length).toBeLessThanOrEqual(10);
      expect(tags.every((t) => t.startsWith("#"))).toBe(true);
      expect(kit.short.split("\n")[0]).toContain(kit.cta);
      expect(kit.short.split("\n")[1].split(" ")).toHaveLength(3);
      expect(kit.short.length).toBeLessThanOrEqual(260);
      expect(postKitProblems(kit, s.profile.country)).toEqual([]);
      expect(scanHardRules(kit.instagram)).toEqual([]);
      expect(scanHardRules(kit.short)).toEqual([]);
      // The copywriter's booking line is replaced, not doubled.
      expect(kit.instagram).not.toMatch(/Book a check-up|Vereinbaren Sie|kontrolünüzde diş taşınızı/);
    });
  }

  it("Türkiye: nothing in the kit steers to the clinic", () => {
    const kit = buildPostKit(SAMPLES.tr.copy, TR);
    expect(kit.instagram).not.toMatch(/kliniğimiz|randevu al|bize ulaş|bize yazın/i);
  });

  it("a very long caption gives way to the closing lines, never the other way round", () => {
    const kit = buildPostKit({ caption: "x ".repeat(1500), hashtags: ["own"] }, EN);
    expect(kit.instagram.length).toBeLessThanOrEqual(2200);
    expect(kit.instagram).toContain(kit.cta);
  });
});

describe("withPostKit", () => {
  const row = (copy: unknown): ItemRow => ({ clinic_id: "c", owner_id: "o", kind: "generated", status: "ready", title: "t", findings: [], copy });
  it("adds copy.post and keeps the caption and hashtags", () => {
    const r = withPostKit(row(SAMPLES.en.copy), EN);
    const c = r.copy as { caption: string; hashtags: string[]; post: { v: number; instagram: string } };
    expect(c.caption).toBe(SAMPLES.en.copy.caption);
    expect(c.hashtags).toEqual(SAMPLES.en.copy.hashtags);
    expect(c.post.v).toBe(1);
    expect(c.post.instagram).toContain("#bristol");
  });
  it("leaves a row without a caption alone", () => {
    expect(withPostKit(row(undefined), EN).copy).toBeUndefined();
    expect(withPostKit(row({ caption: "" }), EN).copy).toEqual({ caption: "" });
  });
});
