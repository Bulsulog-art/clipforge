import { describe, expect, it } from "vitest";
import { DELIVERY_NOTICES, DELIVERY_NOTICE_LANGUAGES, deliveryNoticesText, hasDeliveryNotices } from "./dentvideo-delivery-notices";
import { LOCALES } from "./dentvideo-locales";

/** Every leaf string with its path, e.g. "first.post.body" or "short.checks.1". */
function leaves(o: unknown, path = ""): [string, string][] {
  if (typeof o === "string") return [[path, o]];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const en = new Map(leaves(DELIVERY_NOTICES.en));

describe("delivery notices copy parity", () => {
  it("covers exactly the site's eight languages; Italian, Portuguese and unknown ones get English", () => {
    expect([...DELIVERY_NOTICE_LANGUAGES].sort()).toEqual([...LOCALES].sort());
    expect(LOCALES).toHaveLength(8);
    expect(deliveryNoticesText("it").lang).toBe("en");
    expect(deliveryNoticesText("pt").lang).toBe("en");
    expect(deliveryNoticesText(undefined).lang).toBe("en");
    expect(deliveryNoticesText("ar").lang).toBe("ar");
    expect(hasDeliveryNotices("ja")).toBe(true);
    expect(hasDeliveryNotices("it")).toBe(false);
  });

  for (const lang of DELIVERY_NOTICE_LANGUAGES) {
    it(`${lang}: same structure and placeholders as English, nothing empty`, () => {
      const mine = new Map(leaves(DELIVERY_NOTICES[lang]));
      expect([...mine.keys()]).toEqual([...en.keys()]);
      for (const [k, v] of mine) {
        expect(v.trim(), `${lang}.${k}`).not.toBe("");
        expect(placeholders(v), `${lang}.${k}`).toEqual(placeholders(en.get(k)!));
      }
    });
  }

  it("the short-week lines write the count out the way the rest of the sentence does (no '3 of … five')", () => {
    // Japanese counts with digits throughout ("5本のうち3本"); every other language spells both numbers out.
    const words: Record<string, string[]> = {
      en: ["One", "Two", "Three", "Four"],
      de: ["Eines", "Zwei", "Drei", "Vier"],
      es: ["Uno", "Dos", "Tres", "Cuatro"],
      fr: ["Une", "Deux", "Trois", "Quatre"],
      tr: ["biri", "ikisi", "üçü", "dördü"],
      ja: ["1本", "2本", "3本", "4本"],
      ar: ["واحد", "فيديوه", "ثلاثة", "أربعة"],
      pl: ["Jeden", "Dwa", "Trzy", "Cztery"],
    };
    for (const lang of DELIVERY_NOTICE_LANGUAGES) {
      for (const reason of ["checks", "unfinished"] as const) {
        for (const n of [1, 2, 3, 4] as const) {
          const line = DELIVERY_NOTICES[lang].short[reason][n];
          const at = `${lang}.short.${reason}.${n}`;
          expect(line, at).toContain(words[lang][n - 1]);
          if (lang === "ja") expect(line, at).toContain("5本のうち");
          else expect(line, at).not.toMatch(/\d/);
        }
      }
    }
  });

  it("only the 'checks' lines blame our checks; the 'unfinished' ones (a technical failure) never do", () => {
    const checks: Record<string, RegExp> = {
      en: /our checks/,
      de: /Prüfung/,
      es: /comprobaciones/,
      fr: /vérifications/,
      tr: /kontrol/,
      ja: /チェック/,
      ar: /فحوص/,
      pl: /kontrol/,
    };
    for (const lang of DELIVERY_NOTICE_LANGUAGES) {
      for (const n of [1, 2, 3, 4] as const) {
        expect(DELIVERY_NOTICES[lang].short.checks[n], `${lang} checks ${n}`).toMatch(checks[lang]);
        expect(DELIVERY_NOTICES[lang].short.unfinished[n], `${lang} unfinished ${n}`).not.toMatch(checks[lang]);
      }
    }
  });

  it("is really translated: no other language reuses an English sentence", () => {
    for (const lang of DELIVERY_NOTICE_LANGUAGES.filter((l) => l !== "en")) {
      for (const [k, v] of leaves(DELIVERY_NOTICES[lang])) if (v.length > 12) expect(v, `${lang}.${k}`).not.toBe(en.get(k));
    }
  });

  it("writes like a careful person: no em or en dashes, no exclamation marks, no hype", () => {
    for (const lang of DELIVERY_NOTICE_LANGUAGES) {
      for (const [k, v] of leaves(DELIVERY_NOTICES[lang])) {
        expect(v, `${lang}.${k}`).not.toMatch(/[—–]/);
        expect(v, `${lang}.${k}`).not.toMatch(/[!¡！]/);
        expect(v, `${lang}.${k}`).not.toMatch(/amazing|awesome|incredible|\bbest\b|#1|unglaublich|increíble|incroyable|harika|最高|رائع|niesamowit/i);
      }
    }
  });

  it("promises nothing the product does not keep: no remake, credit, refund, discount, guarantee or deadline", () => {
    const banned = [
      /remake|redo|credit|refund|discount|free|compensat|guarant|within \d|by (monday|tomorrow|tonight)|\d+ ?(hours?|minutes?)/i,
      /erstatt|gutschrift|rabatt|kostenlos|garant|neu (erstellt|gemacht)|innerhalb von \d/i,
      /reembols|descuento|gratis|garant|rehac|compensa/i,
      /rembours|remise|gratuit|garanti|refai|dédommag/i,
      /iade|indirim|ücretsiz|garanti|telafi|yeniden (yap|hazırla)|\d+ saat/i,
      /返金|割引|無料|保証|作り直|補償|\d+時間/,
      /استرداد|خصم|مجان|ضمان|تعويض|إعادة (إعداد|صنع)|\d+ ساع/,
      /zwrot|rabat|bezpłat|gwaranc|rekompens|ponown(ie|e) (przygot|nagr)|\d+ godz/i,
    ];
    for (const lang of DELIVERY_NOTICE_LANGUAGES) for (const [k, v] of leaves(DELIVERY_NOTICES[lang])) for (const b of banned) expect(v, `${lang}.${k}`).not.toMatch(b);
  });

  it("the late notices say what the dentist needs in every language: late, nothing extra charged, we will email; 'queued' only in the queued wording", () => {
    // [late, nothing extra charged, we will email]; then the queued claim; then the "alerted, on it" of the held wording.
    const said: Record<string, { common: RegExp[]; queued: RegExp; held: RegExp }> = {
      en: { common: [/longer than usual/, /nothing extra is charged/, /email you/], queued: /queued|on (its|their) way/, held: /alerted and are on it/ },
      de: { common: [/länger als sonst/, /keine zusätzlichen Kosten/, /schreiben Ihnen/], queued: /Warteschlange|unterwegs/, held: /informiert und kümmern uns darum/ },
      es: { common: [/más de lo habitual/, /no se cobra nada extra/, /Te escribiremos/], queued: /en la cola|en camino/, held: /avisados y trabajando en ello/ },
      fr: { common: [/plus de temps que d'habitude/, /rien de plus ne vous est facturé/, /Nous vous écrirons/], queued: /file d'attente|en route/, held: /prévenus et nous nous en occupons/ },
      tr: { common: [/her zamankinden uzun/, /ek bir ücret alınmaz/, /e-posta göndereceğiz/], queued: /Sırada|yolda/, held: /haberdar ve ilgileniyor/ },
      ja: { common: [/いつもより/, /追加の料金はかかりません/, /メールでお知らせします/], queued: /順番|制作は進んで/, held: /担当者が状況を把握し、対応しています/ },
      ar: { common: [/أطول من المعتاد/, /لا تُضاف أي رسوم/, /سنراسلكم/], queued: /قائمة الانتظار|في الطريق|في طريقها/, held: /فريقنا على علم ويعمل على ذلك/ },
      pl: { common: [/dłużej niż zwykle/, /dodatkowych opłat/, /Napiszemy/], queued: /w kolejce|w drodze/, held: /Wiemy o tym i już nad tym pracujemy/ },
    };
    for (const lang of DELIVERY_NOTICE_LANGUAGES) {
      const s = said[lang];
      for (const t of [DELIVERY_NOTICES[lang].late, DELIVERY_NOTICES[lang].firstLate]) {
        const queued = `${t.subject} ${t.queued.preheader} ${t.queued.title} ${t.queued.body} ${t.next}`;
        const held = `${t.subject} ${t.held.preheader} ${t.held.title} ${t.held.body} ${t.next}`;
        for (const re of s.common) {
          expect(queued, `${lang} queued: ${re}`).toMatch(re);
          expect(held, `${lang} held: ${re}`).toMatch(re);
        }
        expect(t.queued.body, `${lang} queued`).toMatch(s.queued);
        expect(held, `${lang} held: alerted`).toMatch(s.held);
        // The held wording is sent when the week is NOT queued: it must not say it is, or that it is on its way.
        expect(held, `${lang} held must not claim queued`).not.toMatch(s.queued);
      }
    }
  });
});
