import { describe, expect, it } from "vitest";
import { GUIDES, LANDING, LOCALES } from "./dentvideo";
import { APP_TEXT } from "./dentvideo-app";
import { ENTITY } from "./guides/entity";
import { GUIDE_UI } from "./guides/ui";
import { SOLUTIONS } from "./solutions";
import { SOLUTION_UI } from "./solutions/ui";
import { EMAIL_LANGUAGES, readyEmail } from "@/lib/dentvid/email";
import { llmsFullTxt, llmsTxt } from "@/lib/dentvid/llms";

/**
 * There is no free week any more: a clinic sees a live preview of its own
 * branded videos in the browser, chooses a plan, and its first week is made
 * right after payment. No public or in-app text may still promise a free
 * week, a free trial or "no card".
 */
const FREE_TRIAL_CLAIMS: RegExp[] = [
  // en
  /free (first )?week/i,
  /first week (is |of videos is )?free/i,
  /week free/i,
  /free trial/i,
  /trial week/i,
  /no card/i,
  /without a card/i,
  // de
  /kostenlose (erste )?woche/i,
  /erste woche (ist )?kostenlos/i,
  /kostenlos(e|en)? testen/i,
  /(ohne|keine) kreditkarte/i,
  // es
  /semana gratis/i,
  /primera semana (es )?gratis/i,
  /prueba gratis/i,
  /sin tarjeta/i,
  // tr
  /ücretsiz (ilk )?hafta/i,
  /hafta\S* (\S+ )?ücretsiz/i,
  /haftanızı ücretsiz/i,
  /kart gerekmez/i,
  /ücretsiz deneme/i,
  // ja (無料 only if something really is free — nothing is)
  /無料/,
  /お試し(期間|プラン|版)/,
  /無料体験/,
  /トライアル/,
  // ar
  /مجان/,
  /تجربة مجانية/,
  /بدون بطاقة/,
  // pl
  /za darmo/i,
  /bezpłatn/i,
  /darmow/i,
  /bez karty/i,
  // fr
  /semaine (offerte|gratuite)/i,
  /première semaine (est |vous est )?(offerte|gratuite)/i,
  /essai gratuit/i,
  /sans carte/i,
];

function claimsIn(text: string): string[] {
  return FREE_TRIAL_CLAIMS.flatMap((re) => {
    const m = text.match(re);
    return m ? [`${re} → “${text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + m[0].length + 40)}”`] : [];
  });
}

describe("no free-trial claims anywhere", () => {
  it("the scanner catches the old copy", () => {
    for (const old of [
      "Start your free first week",
      "No card. Seven languages.",
      "Erste Woche kostenlos starten",
      "Empieza tu primera semana gratis",
      "İlk haftanızı ücretsiz başlatın",
      "Commencer la première semaine gratuite",
      "Votre première semaine vous est offerte.",
      "What happens after the free week?",
      "Try your first week free",
      "İlk haftayı ücretsiz deneyebilirsiniz",
      "Essayez la première semaine gratuitement",
      "最初の1週間は無料です",
      "الأسبوع الأول مجاناً",
      "Pierwszy tydzień za darmo",
      "Bezpłatny okres próbny",
    ]) {
      expect(claimsIn(old), old).not.toEqual([]);
    }
  });

  it.each(LOCALES)("landing (%s)", (l) => {
    expect(claimsIn(JSON.stringify(LANDING[l]))).toEqual([]);
  });

  it.each(LOCALES)("app interface (%s)", (l) => {
    expect(claimsIn(JSON.stringify(APP_TEXT[l]))).toEqual([]);
  });

  it.each(LOCALES)("About facts and guide CTAs (%s)", (l) => {
    expect(claimsIn(JSON.stringify(ENTITY[l]))).toEqual([]);
    expect(claimsIn(JSON.stringify(GUIDE_UI[l]))).toEqual([]);
  });

  it("guides", () => {
    expect(claimsIn(JSON.stringify(GUIDES))).toEqual([]);
  });

  it("commercial pages and their interface words", () => {
    expect(claimsIn(JSON.stringify(SOLUTIONS))).toEqual([]);
    expect(claimsIn(JSON.stringify(SOLUTION_UI))).toEqual([]);
  });

  it("llms.txt and llms-full.txt", () => {
    expect(claimsIn(llmsTxt())).toEqual([]);
    expect(claimsIn(llmsFullTxt())).toEqual([]);
  });

  it("emails", () => {
    for (const language of EMAIL_LANGUAGES) {
      for (const kind of ["week", "recording"] as const) {
        const m = readyEmail({ kind, counts: { ready: 4, flagged: 1 }, clinicName: "Clinic", language, appUrl: "https://dentvideo.com/app" });
        expect(claimsIn(`${m?.subject} ${m?.text}`), `${language} ${kind}`).toEqual([]);
      }
    }
  });

  it("the new promise is there instead: a live preview before paying, CTA to /start", () => {
    for (const l of LOCALES) {
      const c = LANDING[l];
      expect(c.hero.cta, l).toBe(c.pricing.cta);
      expect(c.faq.length, l).toBe(LANDING.en.faq.length);
      expect(c.teaser.cta.trim().length, l).toBeGreaterThan(0);
    }
    expect(LANDING.en.hero.cta).toBe("See your preview");
    expect(LANDING.en.faq.at(-1)?.q).toBe("Can I see my videos before I pay?");
  });
});
