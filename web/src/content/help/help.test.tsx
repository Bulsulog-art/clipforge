import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { HELP, HELP_ARTICLE_META, HELP_CATEGORIES, HELP_IDS, HELP_PATH, helpArticlesIn, type HelpId } from "@/content/help";
import { helpHref } from "@/content/dentvideo-help-links";
import { CHECKER_PATH } from "@/content/dentvideo-checker";
import { dentvideoSitemapEntries, helpJsonLd, helpMetadata } from "@/lib/dentvid/seo-guides";
import { sitemapXml } from "@/lib/dentvid/sitemap";
import { dvUrl } from "@/lib/dentvid/host";
import { equivalentPath } from "@/lib/dentvid/lang-switch";
import { readyEmail } from "@/lib/dentvid/email";
import { notPostedEmail, paymentProblemEmail, welcomeEmail } from "@/lib/dentvid/lifecycle-email";
import { HelpCenter } from "@/components/dentvid/help-center";
import { foldText, matchesQuery } from "@/components/dentvid/help-search";
import { HelpCheckSources, checkMarkets, checkedDate } from "@/components/dentvid/help-check-sources";
import { CHECKER_SOURCES } from "@/content/dentvideo-checker";
import { MARKET_SOURCES } from "@/lib/dentvid/checker-markets";
import { RULE_MARKETS } from "@/content/dentvideo-showcase";
import { CLINICAL_SOURCE_LIST } from "@/lib/dentvid/clinical-sources";

(globalThis as { React?: typeof React }).React = React;

const SRC = join(__dirname, "../..");
const decode = (h: string) =>
  h
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const graphOf = (ld: unknown) => (ld as { "@graph": Record<string, unknown>[] })["@graph"];

describe("help content: every answer in every language", () => {
  it("has the same answers, under the same anchors, in all eight site languages", () => {
    expect(Object.keys(HELP).sort()).toEqual([...LOCALES].sort());
    expect(Object.keys(HELP_ARTICLE_META).sort()).toEqual([...HELP_IDS].sort());
    for (const l of LOCALES) {
      expect(Object.keys(HELP[l].articles).sort(), l).toEqual([...HELP_IDS].sort());
      expect(Object.keys(HELP[l].categories).sort(), l).toEqual([...HELP_CATEGORIES].sort());
    }
  });

  it("gives every answer a question and an answer, with as many steps as in English", () => {
    for (const l of LOCALES) {
      for (const id of HELP_IDS) {
        const a = HELP[l].articles[id];
        expect(a.q.trim(), `${l} ${id}`).not.toBe("");
        expect(a.a.trim(), `${l} ${id}`).not.toBe("");
        expect(a.steps?.length ?? 0, `${l} ${id} steps`).toBe(HELP.en.articles[id].steps?.length ?? 0);
        // The only placeholder is {email}; nothing left over from a template.
        for (const s of [a.q, a.a, ...(a.steps ?? [])]) expect(s.replace(/\{email\}/g, ""), `${l} ${id}`).not.toMatch(/[{}]|TODO|undefined/);
      }
    }
  });

  it("asks a different question in every answer of a language (search and FAQ need them distinct)", () => {
    for (const l of LOCALES) {
      const qs = HELP_IDS.map((id) => HELP[l].articles[id].q.trim().toLowerCase());
      expect(new Set(qs).size, l).toBe(qs.length);
    }
  });

  it("puts every category to use", () => {
    for (const c of HELP_CATEGORIES) expect(helpArticlesIn(c).length, c).toBeGreaterThan(0);
  });

  it("uses no banned words: no guarantees, discounts, 'best' or '#1' in any language", () => {
    const BANNED: Record<Locale, RegExp> = {
      en: /guarant|discount|\bbest\b|#1|number one/i,
      de: /garantie|garantiert|rabatt|\bbeste[nrms]?\b|nummer eins|#1/i,
      es: /garant[ií]a|garantiza|descuento|\bmejor(es)?\b|n[uú]mero uno|#1/i,
      tr: /garanti|indirim|en iyi|bir numara|#1/i,
      fr: /garanti|remise|r[ée]duction|meilleur|num[ée]ro un|#1/i,
      ja: /保証|割引|最高|一番|ナンバーワン|No\.?1|ベスト|#1/i,
      ar: /ضمان|مضمون|خصم|أفضل|رقم واحد|#1/,
      pl: /gwaranc|gwarant|rabat|zni[żz]k|najlepsz|numer jeden|#1/i,
    };
    for (const l of LOCALES) {
      const h = HELP[l];
      const all = [h.meta.title, h.meta.description, h.h1, h.lead, h.stuck.title, h.stuck.body, ...Object.values(h.categories), ...Object.values(h.shots)];
      for (const id of HELP_IDS) all.push(h.articles[id].q, h.articles[id].a, ...(h.articles[id].steps ?? []));
      for (const s of all) expect(s, `${l}: ${s.slice(0, 60)}`).not.toMatch(BANNED[l]);
    }
  });

  it("never says a video is legally approved and never quotes a price", () => {
    for (const l of LOCALES) {
      for (const id of HELP_IDS) {
        const a = HELP[l].articles[id];
        const text = [a.q, a.a, ...(a.steps ?? [])].join(" ");
        expect(text, `${l} ${id}`).not.toMatch(/[$€£]\s?\d|\d\s?(€|TL|USD|EUR)\b/);
        if (l === "en") expect(text, id).not.toMatch(/legally approved|compliant|100%/i);
      }
    }
  });

  it("keeps titles and descriptions short enough to show in search results", () => {
    for (const l of LOCALES) {
      expect(HELP[l].meta.title.length, l).toBeLessThanOrEqual(60);
      expect(HELP[l].meta.description.length, l).toBeLessThanOrEqual(160);
    }
  });
});

describe("help pages: SEO", () => {
  it("each language has a self-canonical page with reciprocal hreflang and x-default", () => {
    for (const l of LOCALES) {
      const m = helpMetadata(l);
      expect(m.alternates?.canonical, l).toBe(dvUrl(HELP_PATH[l]));
      const langs = m.alternates?.languages as Record<string, string>;
      expect(Object.keys(langs).sort(), l).toEqual([...LOCALES, "x-default"].sort());
      for (const o of LOCALES) expect(langs[o], `${l} → ${o}`).toBe(dvUrl(HELP_PATH[o]));
      expect(langs["x-default"]).toBe(dvUrl(HELP_PATH.en));
      // Reciprocity: every alternate names this page back.
      for (const o of LOCALES) expect((helpMetadata(o).alternates?.languages as Record<string, string>)[l]).toBe(dvUrl(HELP_PATH[l]));
    }
  });

  it("is in the sitemap in every language, with its alternates", () => {
    const entries = dentvideoSitemapEntries();
    for (const l of LOCALES) {
      const e = entries.find((x) => x.path === HELP_PATH[l]);
      expect(e, l).toBeTruthy();
      expect(Object.keys(e!.alternates ?? {}).length, l).toBe(LOCALES.length + 1);
    }
    const xml = sitemapXml();
    for (const l of LOCALES) expect(xml).toContain(`<loc>https://dentvideo.com${HELP_PATH[l].replace(/^\/dentvideo/, "")}</loc>`);
  });

  it("the language switcher keeps a reader on the help center", () => {
    for (const l of LOCALES) for (const t of LOCALES) expect(equivalentPath(HELP_PATH[l], t)).toBe(HELP_PATH[t]);
  });

  it("links the free ad checker from the answers about the software check, responsibility and the closing line", () => {
    for (const l of LOCALES) {
      const html = renderToStaticMarkup(<HelpCenter locale={l} />);
      const links = [...html.matchAll(/<a [^>]*data-help-checker="true" href="([^"]+)"/g)].map((m) => m[1]);
      expect(links.length, l).toBe(HELP_IDS.filter((id) => HELP_ARTICLE_META[id].checker).length);
      expect(links.length).toBeGreaterThanOrEqual(2);
      for (const href of links) expect(href, l).toBe(CHECKER_PATH[l]);
    }
  });

  it("emits an FAQPage built only from the questions and answers the page shows", () => {
    for (const l of LOCALES) {
      const html = decode(renderToStaticMarkup(<HelpCenter locale={l} />));
      const faq = graphOf(helpJsonLd(l)).find((n) => n["@type"] === "FAQPage")!;
      const qs = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
      expect(qs.length, l).toBe(HELP_IDS.length);
      for (const [i, q] of qs.entries()) {
        const id = HELP_IDS[i];
        expect(html, `${l} ${id} anchor`).toContain(`id="${id}"`);
        expect(html, `${l} ${id} question`).toContain(q.name);
        // Every line of the structured answer is on the page (steps without their numbers).
        for (const line of q.acceptedAnswer.text.split("\n")) {
          const shown = line.replace(/^\d+\. /, "");
          for (const part of shown.split(/hello@dentvideo\.com/)) if (part.trim()) expect(html, `${l} ${id}: ${part.slice(0, 50)}`).toContain(part.trim().slice(0, 40));
        }
      }
      // The page says where to write when the answers run out.
      expect(html).toContain("mailto:hello@dentvideo.com");
      expect(html).toContain(HELP[l].stuck.title);
      // Right to left where the language is.
      expect(html).toContain(`dir="${l === "ar" ? "rtl" : "ltr"}"`);
    }
  });

  it("shows only screenshots that exist in that language", () => {
    for (const l of LOCALES) {
      const html = renderToStaticMarkup(<HelpCenter locale={l} />);
      for (const m of html.matchAll(/src="(\/dentvideo\/landing\/[^"]+)"/g)) {
        expect(() => readFileSync(join(SRC, "../public", m[1])), m[1]).not.toThrow();
      }
    }
  });
});

describe("help: how a video is checked, with its sources", () => {
  const ID: HelpId = "how-we-check";
  const answer = (l: Locale) => HELP[l].articles[ID];
  /** The label of a marked video in each language's app ("Needs a look"), as the needs-a-look answer names it. */
  const NEEDS_A_LOOK: Record<Locale, string> = { en: "Needs a look", de: "Bitte ansehen", es: "Revísalo", tr: "Göz atın", fr: "À revoir", ja: "要確認", ar: "يحتاج نظرة", pl: "Do przejrzenia" };
  /** "AI software, not a dentist" and "your approval is the final check", in each language. */
  const SAYS: Record<Locale, { ai: RegExp; approval: RegExp }> = {
    en: { ai: /AI software, not by a dentist/, approval: /Your approval is the final check/ },
    de: { ai: /KI-Software, kein Zahnarzt/, approval: /letzte Prüfung ist Ihre Freigabe/ },
    es: { ai: /software de IA, no un dentista/, approval: /revisión final es tu aprobación/ },
    tr: { ai: /diş hekimi değil, yapay zekâ yazılımı/, approval: /Son kontrol sizin onayınızdır/ },
    fr: { ai: /logiciel d'IA, pas par un dentiste/, approval: /dernier contrôle, c'est votre validation/ },
    ja: { ai: /歯科医師ではなくAIソフトウェア/, approval: /最終確認は医院による承認/ },
    ar: { ai: /برنامج ذكاء اصطناعي، لا طبيب أسنان/, approval: /الفحص الأخير هو اعتمادكم/ },
    pl: { ai: /oprogramowanie AI, a nie lekarz dentysta/, approval: /Ostatnią kontrolą jest Państwa akceptacja/ },
  };

  it("sits in Review and approval, right after the answer on the software check", () => {
    expect(HELP_ARTICLE_META[ID].category).toBe("review");
    expect(HELP_IDS.indexOf(ID)).toBe(HELP_IDS.indexOf("software-check") + 1);
    expect(helpArticlesIn("review")).toContain(ID);
  });

  it.each(LOCALES)("%s: says the reviewer is AI software, not a dentist, and that the dentist's approval is the final check", (l) => {
    expect(answer(l).a).toMatch(SAYS[l].ai);
    expect(answer(l).a).toMatch(SAYS[l].approval);
    // The app's own label for a marked video, and four paragraphs like the English one.
    expect(answer(l).a).toContain(NEEDS_A_LOOK[l]);
    expect(HELP[l].articles["needs-a-look"].q).toContain(NEEDS_A_LOOK[l]);
    expect(answer(l).a.split("\n\n")).toHaveLength(4);
  });

  it.each(LOCALES)("%s: names the clinical bodies whose pages the aftercare rules were compared with", (l) => {
    for (const name of ["NHS", "ADA", "Oral Health Foundation", "AAO"]) expect(answer(l).a, name).toContain(name);
  });

  /**
   * The rules came first and the pages were looked up for them, and for some
   * rules the pages say less (lib/dentvid/clinical-sources.ts `gap`). So the
   * answer and the list heading say the rules were compared with the pages,
   * never that they agree with them or rest on them.
   */
  const COMPARED: Record<Locale, { says: RegExp; heading: RegExp; not: RegExp }> = {
    en: { says: /aftercare rules were compared with the patient pages of the NHS/, heading: /^Patient pages we compared the aftercare rules with$/, not: /agree with|based on|rest on|behind the/i },
    de: { says: /Regeln zur Nachsorge wurden mit den unten aufgeführten Patientenseiten .* verglichen\./, heading: /^Patientenseiten, mit denen wir die Nachsorge-Regeln verglichen haben/, not: /überein|hinter den|beruhen/ },
    es: { says: /reglas de cuidados posteriores se compararon con las páginas para pacientes del NHS/, heading: /^Páginas para pacientes con las que comparamos las reglas/, not: /coinciden|se basan/ },
    tr: { says: /aşağıda listelenen hasta sayfalarıyla karşılaştırıldı\./, heading: /^Tedavi sonrası bakım kurallarını karşılaştırdığımız hasta sayfaları/, not: /örtüşür|dayan/ },
    fr: { says: /suites de soins ont été comparées aux pages patients du NHS/, heading: /^Pages patients auxquelles nous avons comparé les règles de suivi/, not: /concordent|reposent/ },
    ja: { says: /患者向けページと照合しました。/, heading: /^術後ケアのルールと照合した患者向けページ/, not: /一致して|根拠/ },
    ar: { says: /وقد قورنت قواعده الخاصة بالعناية بعد العلاج بصفحات المرضى/, heading: /^صفحات المرضى التي قارنّا بها قواعد العناية بعد العلاج/, not: /تتفق|تستند/ },
    pl: { says: /zasady postępowania po zabiegach porównaliśmy ze stronami dla pacjentów NHS/, heading: /^Strony dla pacjentów, z którymi porównaliśmy zasady/, not: /są zgodne|opiera/ },
  };

  it.each(LOCALES)("%s: says the aftercare rules were compared with the pages, and claims no more", (l) => {
    const c = COMPARED[l];
    expect(answer(l).a).toMatch(c.says);
    expect(HELP[l].checkSources.clinical).toMatch(c.heading);
    for (const text of [answer(l).q, answer(l).a, HELP[l].checkSources.clinical]) expect(text).not.toMatch(c.not);
  });

  it("the wording check is not a no-op: the earlier claims fail it", () => {
    expect("Its aftercare rules agree with the patient pages of the NHS").toMatch(COMPARED.en.not);
    expect("Patient pages behind the aftercare rules").toMatch(COMPARED.en.not);
    expect("Tedavi sonrası bakım kurallarının dayandığı hasta sayfaları").toMatch(COMPARED.tr.not);
    expect("術後ケアのルールの根拠となる患者向けページ").toMatch(COMPARED.ja.not);
  });

  /**
   * Some of the ad checker's sources are a body's home page or a court notice,
   * not a text on health advertising: the answer calls them official sources.
   */
  const OFFICIAL: Record<Locale, { list: RegExp; heading: string; not: RegExp }> = {
    en: { list: /The list names the official sources for each country/, heading: "Official sources by country", not: /official texts/i },
    de: { list: /Die Liste nennt die offiziellen Quellen für jedes Land/, heading: "Offizielle Quellen nach Land", not: /amtliche|Texte (jedes|nach)/i },
    es: { list: /La lista recoge las fuentes oficiales de cada país/, heading: "Fuentes oficiales por país", not: /textos oficiales/i },
    tr: { list: /Listede her ülke için resmî kaynaklar yer alır/, heading: "Ülkelere göre resmî kaynaklar", not: /resmî metin/ },
    fr: { list: /La liste indique les sources officielles de chaque pays/, heading: "Sources officielles par pays", not: /textes officiels/i },
    ja: { list: /一覧には、各国の公式な情報源を挙げています/, heading: "国別の公式情報源", not: /公的な文書/ },
    ar: { list: /وتذكر القائمة المصادر الرسمية لكل بلد/, heading: "المصادر الرسمية حسب البلد", not: /النصوص الرسمية/ },
    pl: { list: /Lista podaje oficjalne źródła dla każdego kraju/, heading: "Oficjalne źródła według kraju", not: /teksty urzędowe/i },
  };

  it.each(LOCALES)("%s: calls the country list official sources, not official texts on health advertising", (l) => {
    const o = OFFICIAL[l];
    expect(answer(l).a).toMatch(o.list);
    expect(HELP[l].checkSources.advertising).toBe(o.heading);
    for (const text of [answer(l).a, HELP[l].checkSources.advertising]) expect(text).not.toMatch(o.not);
  });

  /**
   * Script, caption and rewrite: true for the videos we write (dental/week.ts).
   * A recorded clip is checked on the dentist's spoken words only, its caption
   * is not reviewed, and nothing is rewritten (dental/recording.ts).
   */
  const WRITTEN: Record<Locale, RegExp> = {
    en: /^Before you see one of the videos we write for you, software checks its script and caption twice\./,
    de: /^Bevor Sie eines der Videos sehen, die wir für Sie schreiben, prüft Software/,
    es: /^Antes de que veas uno de los vídeos que escribimos para ti, un software revisa/,
    tr: /^Sizin için yazdığımız videolardan birini görmeden önce yazılım/,
    fr: /^Avant que vous ne voyiez l'une des vidéos que nous écrivons pour vous, un logiciel vérifie/,
    ja: /^こちらで原稿を書く動画は、ご覧いただく前に/,
    ar: /^قبل أن تروا أي فيديو نكتبه لكم، يفحص البرنامج/,
    pl: /^Zanim zobaczą Państwo jeden z filmów, które dla Państwa piszemy, program/,
  };
  const RECORDED: Record<Locale, RegExp> = {
    en: /Clips cut from your own recordings get the same two checks on what you say, but your words are never changed: anything worth a second look is marked\./,
    de: /Clips aus Ihren eigenen Aufnahmen durchlaufen dieselben beiden Prüfungen .*, aber Ihre Worte werden nie verändert/,
    es: /Los clips de tus propias grabaciones pasan las mismas dos revisiones .*, pero tus palabras nunca se cambian/,
    tr: /Kendi kayıtlarınızdan hazırlanan klipler .* aynı iki kontrolden geçer, ancak sözleriniz asla değiştirilmez/,
    fr: /Les extraits tirés de vos propres enregistrements passent les deux mêmes contrôles .*, mais vos mots ne sont jamais modifiés/,
    ja: /ご自身の撮影映像から作るクリップも.*同じ2つのチェックを行いますが、言葉が変えられることはありません/,
    ar: /أما المقاطع المأخوذة من تسجيلاتكم فتمر بالفحصين نفسيهما .*، لكن كلماتكم لا تُغيَّر أبداً/,
    pl: /Klipy z Państwa własnych nagrań przechodzą te same dwie kontrole .*, ale Państwa słowa nigdy nie są zmieniane/,
  };

  it.each(LOCALES)("%s: promises script, caption and rewrite only for the videos we write; recorded clips are checked on what was said, never changed", (l) => {
    const paragraphs = answer(l).a.split("\n\n");
    expect(paragraphs[0]).toMatch(WRITTEN[l]);
    expect(paragraphs[3]).toMatch(RECORDED[l]);
  });

  it("the scope check is not a no-op: the earlier opening, which covered every video, fails it", () => {
    expect("Before you see a video, software checks its script and caption twice.").not.toMatch(WRITTEN.en);
  });

  it("claims no compliance, guarantee or dentist's approval, and uses no dash as punctuation", () => {
    for (const l of LOCALES) {
      const text = [answer(l).q, answer(l).a, ...Object.values(HELP[l].checkSources)].join(" ");
      expect(text, l).not.toMatch(/[—–]/);
      expect(text, l).not.toMatch(/!/);
    }
    const en = answer("en").a;
    expect(en).not.toMatch(/compliant|compliance|guarantee|approved by (a )?dentist|reviewed by (a )?dentist|100%/i);
  });

  it.each(LOCALES)("%s: lists every clinical source and the advertising sources of each country the reviewer has rules for", (l) => {
    const html = renderToStaticMarkup(<HelpCenter locale={l} />);
    const card = html.slice(html.indexOf(`id="${ID}"`), html.indexOf("</article>", html.indexOf(`id="${ID}"`)));
    expect(card.length).toBeGreaterThan(500);
    expect(card.match(/data-help-source="clinical"/g)?.length).toBe(CLINICAL_SOURCE_LIST.length);
    for (const s of CLINICAL_SOURCE_LIST) expect(card, s.url).toContain(`href="${s.url}"`);
    // Every country the reviewer is briefed for, each with its official texts (or the rule's name where none is linked).
    for (const m of RULE_MARKETS) expect(card, m.code).toContain(`data-help-market="${m.code}"`);
    for (const m of checkMarkets(l)) {
      expect(m.sources.length + (m.rule ? 1 : 0), m.code).toBeGreaterThan(0);
      for (const s of m.sources) expect(card, `${m.code} ${s.url}`).toContain(s.url.replace(/&/g, "&amp;"));
    }
    // France has checker sources but no rules in the reviewer: not listed as checked.
    for (const k of MARKET_SOURCES.FR) expect(card, k).not.toContain(CHECKER_SOURCES[k].url);
    expect(card).not.toContain('data-help-market="FR"');
    // The day the clinical pages were read, written out in the page's language.
    expect(decode(card)).toContain(HELP[l].checkSources.checked.replace("{date}", checkedDate(l)));
    expect(checkedDate(l)).toMatch(/2026|٢٠٢٦/);
    // External links open in a new tab without handing over the page.
    for (const a of card.matchAll(/<a [^>]*data-help-source="[^"]+"[^>]*>/g)) {
      expect(a[0]).toContain('target="_blank"');
      expect(a[0]).toContain('rel="noopener noreferrer"');
    }
  });

  it("the Gulf lists the Dubai and Saudi texts; a country without a linked text shows its rule's name", () => {
    const gulf = checkMarkets("ar").find((m) => m.code === "GULF")!;
    expect(gulf.sources.map((s) => s.url)).toEqual([...MARKET_SOURCES.AE, ...MARKET_SOURCES.SA].map((k) => CHECKER_SOURCES[k].url));
    const sg = checkMarkets("en").find((m) => m.code === "SG")!;
    expect(sg.sources).toEqual([]);
    expect(sg.rule).toBe(RULE_MARKETS.find((m) => m.code === "SG")!.rule);
    const html = renderToStaticMarkup(<HelpCheckSources locale="en" />);
    expect(decode(html)).toContain(sg.rule!);
    // The page's own markets first: German page leads with Germany.
    expect(checkMarkets("de")[0].code).toBe("DE");
  });

  it.each(LOCALES)("%s: the answer on the software check links to it", (l) => {
    const html = renderToStaticMarkup(<HelpCenter locale={l} />);
    const card = html.slice(html.indexOf('id="software-check"'), html.indexOf("</article>", html.indexOf('id="software-check"')));
    expect(card).toMatch(new RegExp(`<a href="#${ID}"[^>]*data-help-see="${ID}"`));
    expect(decode(card)).toContain(answer(l).q);
    // Only that answer gets the see-also link.
    expect(html.match(/data-help-see=/g)?.length).toBe(1);
  });

  it("the source lists are folded, with every label filled in every language", () => {
    for (const l of LOCALES) {
      const c = HELP[l].checkSources;
      for (const v of Object.values(c)) expect(v.trim(), l).not.toBe("");
      expect(c.checked, l).toContain("{date}");
      const html = renderToStaticMarkup(<HelpCheckSources locale={l} />);
      expect(html.match(/<details/g)?.length, l).toBe(2);
      expect(html, l).not.toMatch(/<details[^>]* open/);
    }
  });
});

describe("help search", () => {
  it("ignores case and accents, and needs every word", () => {
    expect(foldText("İptal Facturación")).toBe("iptal facturacion");
    expect(matchesQuery("Wie kündigen wir?", "KUNDIGEN")).toBe(true);
    expect(matchesQuery("¿Dónde encuentro las facturas?", "factura donde")).toBe(true);
    expect(matchesQuery("How do we cancel?", "cancel invoice")).toBe(false);
    expect(matchesQuery("anything", "  ")).toBe(true);
    expect(matchesQuery("解約するには？", "解約")).toBe(true);
  });
});

/** Every help anchor a source file links to: HelpLink ids (also inside ternaries), helpCenterLink ids, heroHelp's answers. */
function anchorsIn(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of src.matchAll(/<HelpLink\b[^>]*?\bid=(?:"([^"]+)"|\{([^}]*)\})/gs)) {
    if (m[1]) out.push(m[1]);
    else for (const s of m[2].matchAll(/"([a-z][a-z-]*)"/g)) if (!["instagram", "tiktok", "facebook", "whatsapp"].includes(s[1]) || HELP_IDS.includes(s[1] as HelpId)) out.push(s[1]);
  }
  for (const m of src.matchAll(/helpCenterLink\([^)]*?"([a-z-]+)"[^)]*\)/g)) out.push(m[1]);
  for (const m of src.matchAll(/helpCenterLink\([^)]*?\?\s*"([a-z-]+)"\s*:\s*"([a-z-]+)"/g)) out.push(m[1], m[2]);
  const hero = src.match(/function heroHelp[\s\S]*?\n\}/);
  if (hero) for (const m of hero[0].matchAll(/return "([a-z-]+)"/g)) out.push(m[1]);
  return out;
}

describe("links into the help center from the app and the emails", () => {
  const files = [
    ...readdirSync(join(SRC, "components/dentvid")).map((f) => join(SRC, "components/dentvid", f)),
    ...readdirSync(join(SRC, "lib/dentvid")).map((f) => join(SRC, "lib/dentvid", f)),
  ].filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
  const linked = files.flatMap((f) => anchorsIn(f).map((id) => ({ f, id })));

  it("finds the links (the app links settings, recording, empty weeks, billing states, the post sheet; the emails link too)", () => {
    const ids = new Set(linked.map((x) => x.id));
    for (const id of ["services", "closing-line", "narrator-voice", "record", "plans", "no-videos-this-week", "needs-a-look", "topics", "payment-failed", "after-cancel", "instagram", "tiktok-shorts", "facebook", "share", "invoices", "cancel", "first-videos", "approve"] as HelpId[]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("only to answers that exist", () => {
    for (const { f, id } of linked) expect(HELP_IDS as readonly string[], `${f}: #${id}`).toContain(id);
  });

  it("emails link the matching answer in the clinic's language (English for Italian and Portuguese)", () => {
    const base = { clinicName: "Klinik", appUrl: "https://dentvideo.com/app" };
    for (const lang of [...LOCALES, "it", "pt"]) {
      const helpLocale = ((LOCALES as readonly string[]).includes(lang) ? lang : "en") as Locale;
      const url = (id?: HelpId) => `https://dentvideo.com${helpHref(helpLocale, id).replace(/^\/dentvideo/, "")}`;
      const cases: [string, string][] = [
        [welcomeEmail({ ...base, language: lang }).html, url()],
        [readyEmail({ ...base, kind: "week", counts: { ready: 3, flagged: 1 }, language: lang })!.html, url("approve")],
        [readyEmail({ ...base, kind: "week", counts: { ready: 0, flagged: 2 }, language: lang })!.html, url("needs-a-look")],
        [paymentProblemEmail({ ...base, language: lang, kind: "failed", fix: "portal" }).html, url("payment-failed")],
        [paymentProblemEmail({ ...base, language: lang, kind: "on_hold", fix: "email" }).html, url("payment-failed")],
        [notPostedEmail({ ...base, language: lang, url: "https://dentvideo.com/app", unsubscribeUrl: "https://dentvideo.com/u", approved: 2, pending: 1 }).html, url("share")],
      ];
      for (const [html, href] of cases) {
        expect(html, `${lang} ${href}`).toContain(`href="${href}"`);
        const anchor = href.split("#")[1];
        if (anchor) expect(decode(html), `${lang} ${anchor}`).toContain(HELP[helpLocale].articles[anchor as HelpId].q);
      }
    }
  });

  it("the text part of an email carries the link too", () => {
    const m = paymentProblemEmail({ language: "de", clinicName: "Praxis", kind: "failed", fix: "portal", appUrl: "https://dentvideo.com/app" });
    expect(m.text).toContain("https://dentvideo.com/de/help#payment-failed");
  });
});
