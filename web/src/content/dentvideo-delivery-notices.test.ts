import { describe, expect, it } from "vitest";
import { DELIVERY_NOTICES, DELIVERY_NOTICE_LANGUAGES, deliveryNoticesText, hasDeliveryNotices } from "./dentvideo-delivery-notices";
import { LOCALES } from "./dentvideo-locales";

/** Every leaf string with its path, e.g. "first.post.body" or "short.one". */
function leaves(o: unknown, path = ""): [string, string][] {
  if (typeof o === "string") return [[path, o]];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
/** Plural forms only some languages need (Polish and Arabic "few"); the rest must match English key for key. */
const optional = (k: string) => /^short\.(few|many)$/.test(k);
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
      expect([...mine.keys()].filter((k) => !optional(k))).toEqual([...en.keys()].filter((k) => !optional(k)));
      for (const [k, v] of mine) {
        expect(v.trim(), `${lang}.${k}`).not.toBe("");
        // A plural form may spell the number out ("Two of…"); every other string carries exactly English's placeholders.
        if (k.startsWith("short.")) expect(placeholders(v).filter((p) => p !== "n"), `${lang}.${k}`).toEqual([]);
        else expect(placeholders(v), `${lang}.${k}`).toEqual(placeholders(en.get(k)!));
      }
      // The counts that use a number say it.
      expect(DELIVERY_NOTICES[lang].short.other, lang).toContain("{n}");
    });
  }

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

  it("the late notices say the four things the dentist needs, in every language: late, queued, nothing extra charged, we will email", () => {
    const said = {
      en: [/longer than usual/, /queued/, /nothing extra is charged/, /email you/],
      de: [/länger als sonst/, /Warteschlange/, /keine zusätzlichen Kosten/, /schreiben Ihnen/],
      es: [/más de lo habitual/, /en la cola/, /no se cobra nada extra/, /Te escribiremos/],
      fr: [/plus de temps que d'habitude/, /file d'attente/, /rien de plus ne vous est facturé/, /Nous vous écrirons/],
      tr: [/her zamankinden uzun/, /Sırada/, /ek bir ücret alınmaz/, /e-posta göndereceğiz/],
      ja: [/いつもより/, /順番/, /追加の料金はかかりません/, /メールでお知らせします/],
      ar: [/أطول من المعتاد/, /قائمة الانتظار/, /لا تُضاف أي رسوم/, /سنراسلكم/],
      pl: [/dłużej niż zwykle/, /w kolejce/, /dodatkowych opłat/, /Napiszemy/],
    } as const;
    for (const lang of DELIVERY_NOTICE_LANGUAGES) {
      for (const t of [DELIVERY_NOTICES[lang].late, DELIVERY_NOTICES[lang].firstLate]) {
        const text = `${t.body} ${t.next}`;
        for (const re of said[lang]) expect(text, `${lang}: ${re}`).toMatch(re);
      }
    }
  });
});
