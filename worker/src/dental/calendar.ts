/**
 * Seasonal and awareness-day hooks.
 *
 * "Why is the clinic posting this today?" is the cheapest hook there is:
 * World Oral Health Day, Türkiye's Ağız ve Diş Sağlığı Haftası, the German
 * Tag der Zahngesundheit, Ramadan, back to school, holiday sweets. The dates
 * follow the per-market content calendars published on the site
 * (web/src/content/guides/calendar*.ts, verified against the organisers'
 * pages on 2026-11-10); moving dates (Ramadan, Eid, Easter) are listed per
 * year or computed.
 *
 * The strategist is offered what falls in the coming days and may use it for
 * at most ONE video, only when it fits a service the clinic offers. Every
 * angle is educational — awareness days are exactly when clinics are tempted
 * into "Smile Month discounts", which the market rules forbid.
 */

export type Observance = {
  id: string;
  /** Country codes, or "*" for everywhere. */
  countries: string[] | "*";
  /** Local names by language; "en" is the fallback. */
  name: Partial<Record<string, string>> & { en: string };
  /** The educational angle, for the strategist. */
  angle: string;
  /** Days on which it is worth posting about, for a given year (UTC dates, inclusive). */
  window: (year: number) => { start: string; end: string } | undefined;
};

const d = (y: number, m: number, day: number) => `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const fixed = (m1: number, d1: number, m2: number, d2: number) => (y: number) => ({ start: d(y, m1, d1), end: d(y, m2, d2) });
const shift = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);

/** Gregorian Easter Sunday (anonymous / Meeus algorithm). */
export function easter(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return d(year, month, day);
}

/**
 * Ramadan and Eid al-Fitr by Gregorian year — approximate (±1 day: the
 * start depends on the moon sighting). Years without an entry are skipped
 * rather than guessed; extend the table when it runs out.
 */
export const RAMADAN: Record<number, { start: string; eid: string }> = {
  2026: { start: "2026-02-18", eid: "2026-03-20" },
  2027: { start: "2027-02-08", eid: "2027-03-10" },
  2028: { start: "2028-01-28", eid: "2028-02-26" },
};

const MUSLIM_MARKETS = ["TR", "AE", "SA", "QA", "KW", "BH", "OM"];

export const OBSERVANCES: Observance[] = [
  {
    id: "world-oral-health-day",
    countries: "*",
    name: { en: "World Oral Health Day (20 March)", tr: "Dünya Ağız ve Diş Sağlığı Günü (20 Mart)", de: "Weltmundgesundheitstag (20. März)", es: "Día Mundial de la Salud Bucodental (20 de marzo)" },
    angle: "how mouth health and general health are linked, explained carefully and hedged (no scare claims)",
    window: fixed(3, 13, 3, 21),
  },
  {
    id: "tr-agiz-dis-sagligi-haftasi",
    countries: ["TR"],
    name: { en: "Oral and Dental Health Week, around Dentists' Day (22 November)", tr: "Ağız ve Diş Sağlığı Haftası ve 22 Kasım Diş Hekimliği Günü" },
    angle: "one simple daily habit for the whole family, or what a dentist actually checks at a routine visit",
    window: fixed(11, 16, 11, 28),
  },
  {
    id: "tr-23-nisan",
    countries: ["TR"],
    name: { en: "Children's Day (23 April)", tr: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı" },
    angle: "children's teeth: first visit, how much toothpaste, making brushing a game",
    window: fixed(4, 17, 4, 23),
  },
  {
    id: "de-tag-der-zahngesundheit",
    countries: ["DE"],
    name: { en: "Tag der Zahngesundheit (25 September)", de: "Tag der Zahngesundheit (25. September)" },
    angle: "the year's motto (2026: „Gesund beginnt im Mund – Kau dich fit!“ — chewing well), or one prevention habit",
    window: fixed(9, 18, 9, 26),
  },
  {
    id: "mx-dia-del-nino",
    countries: ["MX"],
    name: { en: "Día del Niño (30 April)", es: "Día del Niño (30 de abril)" },
    angle: "children's teeth: first visit, toothpaste amount, sweets and timing",
    window: fixed(4, 23, 4, 30),
  },
  {
    id: "us-childrens-dental-health-month",
    countries: ["US"],
    name: { en: "National Children's Dental Health Month (February)" },
    angle: "children's teeth: first visit, toothpaste amount, sealants",
    window: fixed(2, 1, 2, 28),
  },
  {
    id: "gb-national-smile-month",
    countries: ["GB"],
    name: { en: "National Smile Month (mid-May to mid-June; check this year's dates)" },
    angle: "one family habit (brushing, sugar timing, check-ups)",
    window: fixed(5, 11, 6, 11),
  },
  {
    id: "ramadan",
    countries: MUSLIM_MARKETS,
    name: { en: "Ramadan", tr: "Ramazan", ar: "رمضان" },
    angle: "oral care between iftar and sahur: when to brush, dry mouth, fresh breath while fasting — dental advice only, never fasting or medical rulings",
    window: (y) => (RAMADAN[y] ? { start: shift(RAMADAN[y].start, -5), end: shift(RAMADAN[y].eid, -2) } : undefined),
  },
  {
    id: "eid-al-fitr",
    countries: MUSLIM_MARKETS,
    name: { en: "Eid al-Fitr (the Sugar Feast)", tr: "Ramazan Bayramı (Şeker Bayramı)", ar: "عيد الفطر" },
    angle: "sweets and teeth: why when you eat them matters as much as how many, rinsing with water after sweets",
    window: (y) => (RAMADAN[y] ? { start: shift(RAMADAN[y].eid, -6), end: shift(RAMADAN[y].eid, 2) } : undefined),
  },
  {
    id: "easter",
    countries: ["DE", "AT", "CH", "ES", "MX", "FR", "IT", "PT", "PL", "GB", "US"],
    name: { en: "Easter", de: "Ostern", es: "Semana Santa", fr: "Pâques", it: "Pasqua", pt: "Páscoa", pl: "Wielkanoc" },
    angle: "chocolate and sweets timing, or travelling over the holidays (taking the toothbrush, what to do about toothache away from home)",
    window: (y) => ({ start: shift(easter(y), -10), end: shift(easter(y), 1) }),
  },
  {
    id: "back-to-school",
    countries: ["TR", "DE", "AT", "CH", "ES", "FR", "IT", "PT", "PL", "US", "GB", "CA", "AE", "SA"],
    name: { en: "Back to school", tr: "Okulların açılması", de: "Schulanfang", es: "Vuelta al cole", fr: "La rentrée", it: "Ritorno a scuola", pt: "Regresso às aulas", pl: "Powrót do szkoły" },
    angle: "lunchbox and drink swaps that are kinder to teeth, sports mouthguards, an orthodontic check",
    window: fixed(8, 25, 9, 20),
  },
  {
    id: "mx-regreso-a-clases",
    countries: ["MX"],
    name: { en: "Back to school", es: "Regreso a clases" },
    angle: "lunchbox and drink swaps that are kinder to teeth, an orthodontic check",
    window: fixed(8, 18, 9, 5),
  },
  {
    id: "halloween",
    countries: ["US", "GB", "CA", "IE"],
    name: { en: "Halloween" },
    angle: "sweets with a meal rather than grazing all evening; sticky vs. quick-dissolving sweets",
    window: fixed(10, 24, 10, 31),
  },
  {
    id: "christmas-sweets",
    countries: ["DE", "AT", "CH", "ES", "MX", "FR", "IT", "PT", "PL", "GB", "US", "CA"],
    name: { en: "The holidays", de: "Advent und Weihnachten", es: "Navidad", fr: "Les fêtes", it: "Natale", pt: "Natal", pl: "Święta" },
    angle: "hard nougat, nuts and sticky sweets (turrón, Plätzchen): cracked teeth and fillings; what counts as a dental emergency over the holidays",
    window: fixed(12, 8, 12, 30),
  },
  {
    id: "new-year-habits",
    countries: "*",
    name: { en: "New year", tr: "Yeni yıl", de: "Neues Jahr", es: "Año nuevo" },
    angle: "one small habit to start (two minutes twice a day, cleaning between teeth, a check-up reminder)",
    window: (y) => ({ start: d(y, 1, 1), end: d(y, 1, 14) }),
  },
];

export type Upcoming = { id: string; name: string; angle: string; start: string; end: string };

/**
 * What a clinic in `country` could tie a video to between `date` and
 * `date + horizonDays` (the week being planned).
 */
export function upcomingObservances(country: string, language: string, date: Date = new Date(), horizonDays = 10): Upcoming[] {
  const c = country.toUpperCase();
  const lang = language.toLowerCase().slice(0, 2);
  const from = date.toISOString().slice(0, 10);
  const to = shift(from, horizonDays);
  const out: Upcoming[] = [];
  for (const o of OBSERVANCES) {
    if (o.countries !== "*" && !o.countries.includes(c)) continue;
    for (const y of [date.getUTCFullYear(), date.getUTCFullYear() + 1]) {
      const w = o.window(y);
      if (w && w.start <= to && w.end >= from) {
        out.push({ id: o.id, name: o.name[lang] ?? o.name.en, angle: o.angle, ...w });
        break;
      }
    }
  }
  return out;
}

/** The strategist's seasonal line; empty when nothing falls in the coming days. */
export function seasonalBrief(country: string, language: string, date: Date = new Date()): string {
  const up = upcomingObservances(country, language, date);
  if (!up.length) return "";
  return [
    `Coming up for this clinic's market (optional): ${up.map((u) => `${u.name} (${u.start}–${u.end}): ${u.angle}`).join("; ")}.`,
    `Tie AT MOST ONE video to it, only if it fits one of the clinic's services, and only educationally — never an offer, discount, giveaway or "special" around the date. Name the occasion in the hook or first line so the timing is the reason to watch. Skip it if a recent video already covered the same angle.`,
  ].join(" ");
}
