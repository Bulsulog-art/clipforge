import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { MARKET_HARD_RULES, marketCode, reviewCompliance, scanHardRules, scanMarketRules } from "./compliance.js";
import { captionRules, marketRules } from "./locale.js";
import {
  TR_MANDATORY_NOTICE,
  captionNotice,
  isProcedureTopic,
  screenNotice,
  withCaptionNotice,
  withoutNotice,
} from "./mandatory-notice.js";
import { buildPostKit, postKitProblems } from "../dentvid/post-kit.js";

/**
 * Per-market rule packs: the prompt text each market's writers and reviewer
 * get (locale.ts marketRules) and the deterministic checks for what a
 * phrase can show (hard-rules.ts MARKET_HARD_RULES), with phrases that must
 * hit and phrases that must not, in each market's language.
 */

const ids = (text: string, country: string | undefined) => scanMarketRules(text, country).map((h) => h.rule);

describe("market rule text (what the writers and the reviewer are told)", () => {
  const named: Record<string, RegExp[]> = {
    TR: [/33075/, /sponsorlu/, /md\. 7\/1-ğ/, /md\. 5\/1-l/, /added automatically/],
    DE: [/Heilmittelwerbegesetz \(HWG\)/, /§ 11 Abs\. 1 S\. 3 Nr\. 1 HWG/, /operative plastisch-chirurgische/, /Nr\. 12: never address children under 14/, /Berufsordnung/],
    AT: [/§ 35 Zahnärztegesetz/, /Abs\. 4/],
    CH: [/Art\. 40 Medizinalberufegesetz/],
    ES: [/Real Decreto 1907\/1996/],
    MX: [/COFEPRIS/],
    GB: [/CAP Code/, /GDC/, /specialist/],
    US: [/ADA Code of Ethics \(§ 5\.F/, /16 CFR 255, 465/, /5\.H/, /HIPAA/, /state dental board/],
    JP: [/医療広告ガイドライン/],
    AE: [/DHA/],
    PL: [/Kodeks Etyki Lekarskiej/],
    SG: [/Healthcare Services \(Advertisement\) Regulations 2021/],
  };
  it.each(Object.entries(named))("%s has its own rules", (c, res) => {
    for (const re of res) expect(marketRules(c), `${c} ${re}`).toMatch(re);
  });
  it("UK is the same market as GB; unknown markets get none", () => {
    expect(marketCode("uk")).toBe("GB");
    expect(marketRules("UK")).toBe(marketRules("GB"));
    expect(marketRules("ZZ")).toBe("");
    expect(marketRules(undefined)).toBe("");
  });
  it("never claims legal certainty", () => {
    for (const c of Object.keys(named)) expect(marketRules(c)).not.toMatch(/legal certainty|guaranteed compliant|rechtssicher|HWG-konform|yönetmeliğe uygun/i);
  });
  it("tells the Türkiye caption writer not to write the warning itself", () => {
    expect(captionRules("TR")).toMatch(/added under the caption automatically/);
    expect(captionRules("tr")).toBe(captionRules("TR"));
  });
});

describe("market packs: deterministic checks", () => {
  const cases: { c: string; hit: [string, string][]; clean: string[] }[] = [
    {
      c: "TR",
      hit: [
        ["Bu içerik sponsorlu bir paylaşımdır.", "sponsored"],
        ["Ücretli iş birliği ile hazırlanmıştır. #reklam", "sponsored"],
        ["Sorularınızı yorumlara yazın!", "engagement"],
        ["Videoyu beğenmeyi ve kaydetmeyi unutmayın.", "engagement"],
        ["Bu videoyu paylaşın, sevdikleriniz de öğrensin.", "engagement"],
        ["Takipçilerimiz arasında çekiliş yapıyoruz.", "giveaway"],
        // Booking CTAs and steering to the clinic (the TR preview library's old closings).
        ["Sorularınız için bize ulaşın veya randevu alın!", "booking"],
        ["Daha fazla bilgi için bizimle iletişime geçin ya da randevu alın.", "booking"],
        ["Kontrol randevusu alabilirsiniz.", "booking"],
        ["Randevunuzu hemen oluşturun.", "booking"],
        ["Muayene planlayabilirsiniz.", "booking"],
        ["Bizi arayın, size yardımcı olalım.", "booking"],
        ["Sizi kliniğimizde bekliyoruz.", "booking"],
        ["Detaylar için DM'den yazın.", "booking"],
      ],
      clean: [
        "Diş ipi, fırçanın ulaşamadığı yerleri temizlemeye yardımcı olabilir; hekiminize danışabilirsiniz.",
        "Tedavi planını hekiminizle iş birliği içinde yaparsınız.",
        "Bu bir reklam değil, bilgilendirmedir.",
        "Hasta yorumu değil, bilimsel bilgi: florürlü diş macunu çürük riskini azaltabilir.",
        TR_MANDATORY_NOTICE,
        // Information that only mentions an appointment or a dentist: must not hit.
        "Merak ettiklerinizi bir sonraki randevunuzda hekiminize sorun.",
        "Merak ettiğiniz bir şey varsa bir sonraki kontrolünüzde hekiminize sorabilirsiniz.",
        "Kalıcı dolgu bir sonraki randevuda yapılır; sonraki randevuyu ertelemeyin.",
        "Ağrı artarsa hekiminizle iletişime geçin.",
        "Randevu almadan önce sigortanızın neyi kapsadığını öğrenmek faydalı olabilir.",
        "Yılda en az bir kez diş hekimi kontrolüne gidilmesi önerilir.",
      ],
    },
    {
      c: "DE",
      hit: [
        ["Unser Team sind Spezialisten für Implantate.", "specialist"],
        ["Ihr Implantatspezialist in Köln.", "specialist"],
        ["Wir sind auf Angstpatienten spezialisiert.", "specialist"],
        ["Hallo Kinder, heute lernt ihr Zähneputzen!", "children"],
      ],
      clean: [
        "Bei Bedarf überweist Ihre Zahnärztin Sie an einen Spezialisten.",
        "Fachzahnarzt für Kieferorthopädie ist eine geschützte Weiterbildung.",
        "Eltern sollten bei Kindern bis etwa acht Jahren nachputzen.",
      ],
    },
    {
      c: "AT",
      hit: [["Unsere Ordination: Ihre Spezialisten für Bleaching.", "specialist"]],
      clean: ["Fragen Sie Ihre Zahnärztin, ob eine Überweisung sinnvoll ist."],
    },
    {
      c: "CH",
      hit: [
        ["Nous sommes spécialistes des implants à Genève.", "specialist"],
        ["Siamo specialisti in ortodonzia invisibile.", "specialist"],
        ["Wir sind Spezialisten für Prophylaxe.", "specialist"],
      ],
      clean: ["Votre dentiste peut vous adresser à un spécialiste si nécessaire.", "Il dentista può indirizzarvi a uno specialista."],
    },
    {
      c: "GB",
      hit: [
        ["Our implant specialists will look after you.", "specialist"],
        ["A specialist dental practice in Leeds.", "specialist"],
        ["We also offer Botox for frown lines.", "pom"],
        ["Anti-wrinkle injections at our practice.", "pom"],
      ],
      clean: [
        "Your dentist may refer you to a specialist if a root canal is complex.",
        "Ask your dental team about the options for you.",
      ],
    },
    {
      c: "US",
      hit: [
        ["We're cosmetic specialists in Austin.", "specialist"],
        ["Our board-certified team.", "specialist"],
      ],
      clean: ["Your dentist may refer you to a periodontist, a gum specialist, if needed.", "Ask your dentist at your next checkup."],
    },
    {
      c: "MX",
      hit: [
        ["Clínica autorizada por COFEPRIS.", "permit"],
        ["Aviso de publicidad No. 123456", "permit"],
        ["COFEPRIS: 2333001234", "permit"],
      ],
      clean: ["Pregunta en tu próxima revisión qué opción te conviene.", "La COFEPRIS regula la publicidad de servicios de salud."],
    },
  ];

  for (const { c, hit, clean } of cases) {
    it(`${c}: flags what its rules forbid`, () => {
      for (const [text, rule] of hit) expect(ids(text, c), `${c}: ${text}`).toContain(rule);
    });
    it(`${c}: lets ordinary education through`, () => {
      for (const text of clean) expect(ids(text, c), `${c}: ${text}`).toEqual([]);
    });
  }

  it("a pack applies only in its market", () => {
    expect(ids("Bu içerik sponsorlu.", "DE")).toEqual([]);
    expect(ids("We also offer Botox.", "US")).toEqual([]);
    expect(ids("Our implant specialists.", "UK")).toContain("specialist");
    expect(ids("Our implant specialists.", undefined)).toEqual([]);
    for (const c of ["ES", "JP", "AE", "PL", "SG", "FR"]) expect(MARKET_HARD_RULES[c], c).toBeUndefined();
  });

  it("the compliance agent counts market hits as hard hits: the model cannot wave them through", async () => {
    const client = {
      chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify({ verdict: "pass", issues: [] }) } }] }) } },
    } as unknown as OpenAI;
    const tr = await reviewCompliance(client, { country: "TR", language: "tr" }, "Sorularınızı yorumlara yazın.");
    expect(tr.verdict).toBe("revise");
    expect(tr.hard.map((h) => h.rule)).toEqual(["engagement"]);
    const de = await reviewCompliance(client, { country: "DE", language: "de" }, "Sorularınızı yorumlara yazın.");
    expect(de.verdict).toBe("pass");
  });
});

describe("Türkiye mandatory warning (RG 33075 md. 7/1-k)", () => {
  it("is the regulation's sentence, word for word, and passes every check", () => {
    expect(TR_MANDATORY_NOTICE).toBe(
      "Her cerrahi veya girişimsel işlemde sonuçlar kişiden kişiye değişiklik gösterebilir. İşlem öncesinde hekiminizden detaylı görüş almanız önerilir.",
    );
    expect(scanHardRules(TR_MANDATORY_NOTICE)).toEqual([]);
    expect(scanMarketRules(TR_MANDATORY_NOTICE, "TR")).toEqual([]);
  });

  it("only Türkiye clinics get it", () => {
    expect(captionNotice("TR")).toBe(TR_MANDATORY_NOTICE);
    expect(captionNotice("tr")).toBe(TR_MANDATORY_NOTICE);
    for (const c of ["DE", "GB", "US", "AE", undefined]) expect(captionNotice(c), String(c)).toBeUndefined();
  });

  it("decides procedure topics from the topic's metadata", () => {
    const t = (service: string, title: string, question = "Ne bilmeliyim?") => ({ service, title, question });
    for (const p of [
      t("İmplant", "İmplant kaç yıl dayanır?"),
      t("Kanal tedavisi", "Kanal tedavisi acıtır mı?"),
      t("Diş beyazlatma", "Beyazlatma mineye zarar verir mi?"),
      t("Ortodonti", "Şeffaf plak kimler için uygun?"),
      t("Gömülü diş", "Yirmilik dişler neden çekilir?"),
      t("Zirkonyum kaplama", "Zirkonyum nedir?"),
      t("Diş taşı temizliği", "Diş taşı temizliği dişi aşındırır mı?"),
      t("Pedodonti", "Çocuğum ilk kez diş hekimine gidiyor"), // unclear: on screen to be safe
      t("implants", "How long do implants last?", "Do implants last forever?"),
    ])
      expect(isProcedureTopic(p), p.title).toBe(true);
    for (const h of [
      t("Ağız ve diş sağlığı kontrolü", "Dişler günde kaç dakika fırçalanmalı?"),
      t("Genel muayene", "Diş ipi her gün kullanılmalı mı?"),
      t("Ağız hijyeni", "Kronik ağız kokusu neden olur?"),
      t("check-ups", "How long should you brush?"),
    ])
      expect(isProcedureTopic(h), h.title).toBe(false);
  });

  it("on screen for procedure topics in Türkiye only", () => {
    const implant = { service: "İmplant", title: "İmplant süreci", question: "İmplant nasıl yapılır?" };
    const brushing = { service: "Kontrol", title: "Doğru fırçalama", question: "Kaç dakika fırçalamalı?" };
    expect(screenNotice("TR", implant)).toBe(TR_MANDATORY_NOTICE);
    expect(screenNotice("TR", brushing)).toBeUndefined();
    expect(screenNotice("DE", implant)).toBeUndefined();
  });

  it("goes under the caption exactly once, as its own paragraph", () => {
    const caption = "İmplant genellikle birkaç aşamada yapılır.\n\nSize uygun olanı hekiminize sorabilirsiniz.";
    const once = withCaptionNotice(caption, "TR");
    expect(once).toBe(`${caption}\n\n${TR_MANDATORY_NOTICE}`);
    expect(withCaptionNotice(once, "TR")).toBe(once);
    // A writer that put it in the middle anyway: moved to the end, not doubled.
    const middle = `İmplant birkaç aşamada yapılır. ${TR_MANDATORY_NOTICE}\n\nHekiminize sorabilirsiniz.`;
    expect(withCaptionNotice(middle, "TR").split(TR_MANDATORY_NOTICE)).toHaveLength(2);
    expect(withCaptionNotice(middle, "TR").endsWith(TR_MANDATORY_NOTICE)).toBe(true);
    expect(withoutNotice(once, TR_MANDATORY_NOTICE)).toBe(caption);
    expect(withCaptionNotice(caption, "DE")).toBe(caption);
  });

  it("is a fixed line of the post kit in both texts, never cut with a long body", () => {
    const profile = { name: "Gülüş Kliniği", city: "İzmir", language: "tr" as const, country: "TR", address: "formal" as const };
    const long = `${"İmplant hakkında bilgi. ".repeat(120)}\n\n${TR_MANDATORY_NOTICE}`;
    const kit = buildPostKit({ caption: long, hashtags: ["gulusklinigi", "implant", "izmir"] }, profile);
    expect(kit.instagram.length).toBeLessThanOrEqual(2200);
    expect(kit.instagram.split(TR_MANDATORY_NOTICE)).toHaveLength(2);
    expect(kit.short).toContain(TR_MANDATORY_NOTICE);
    expect(postKitProblems(kit, "TR")).toEqual([]);
    // Older captions without the sentence get it from the kit all the same.
    const old = buildPostKit({ caption: "İmplant genellikle birkaç aşamada yapılır.", hashtags: ["gulusklinigi", "implant"] }, profile);
    expect(old.instagram).toContain(TR_MANDATORY_NOTICE);
    const de = buildPostKit({ caption: "Implantate werden meist in mehreren Schritten gesetzt.", hashtags: ["praxis", "implantat"] }, { ...profile, language: "de" as const, country: "DE", city: "Köln" });
    expect(de.instagram).not.toContain(TR_MANDATORY_NOTICE);
    expect(postKitProblems({ ...kit, short: "x" }, "TR").join(" ")).toMatch(/notice missing/);
  });
});
