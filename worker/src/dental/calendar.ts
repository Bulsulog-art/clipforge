/**
 * Seasonal and awareness-day hooks.
 *
 * "Why is the clinic posting this today?" is the cheapest hook there is:
 * World Oral Health Day, Türkiye's Ağız ve Diş Sağlığı Haftası, the German
 * Tag der Zahngesundheit, Ramadan, back to school, holiday sweets. The dates
 * follow the per-market content calendars published on the site
 * (web/src/content/guides/calendar*.ts, verified against the organisers'
 * pages on 2026-11-10; the US and UK observances re-checked on 2026-11-24);
 * moving dates (Ramadan, Eid, Easter) are listed per year or computed.
 *
 * An observance run by an organisation carries the organiser's page as
 * `source`. Every US and UK one also appears in the English calendar guide
 * (web/src/content/guides/calendar.ts), and a test there keeps the two in step.
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
  window: (year: number) => Window | undefined;
  /** The organiser's own page the date was checked against (organised observances only). */
  source?: string;
};

/**
 * `approximate` marks a year whose exact dates the organiser has not
 * published yet: the window is the usual span, and the strategist is told to
 * name the season rather than a date.
 */
export type Window = { start: string; end: string; approximate?: true };

const d = (y: number, m: number, day: number) => `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const fixed = (m1: number, d1: number, m2: number, d2: number) => (y: number) => ({ start: d(y, m1, d1), end: d(y, m2, d2) });
/** Days in month `m` (1–12) of year `y`: February has 29 in leap years. */
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** The whole calendar month `m`, for month-long observances. */
const month = (m: number) => (y: number) => ({ start: d(y, m, 1), end: d(y, m, daysIn(y, m)) });
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

/**
 * National Smile Month (Oral Health Foundation) by year, as the organiser
 * publishes it: "Between 11 May and 11 June 2026" on
 * https://www.dentalhealth.org/smilemonth (read 2026-11-24). A year without an
 * entry gets the usual mid-May to mid-June span, marked approximate; add the
 * new year's dates here once the Oral Health Foundation announces them.
 */
export const SMILE_MONTH: Record<number, { start: string; end: string }> = {
  2026: { start: "2026-05-11", end: "2026-06-11" },
};

export const OBSERVANCES: Observance[] = [
  {
    id: "world-oral-health-day",
    countries: "*",
    name: { en: "World Oral Health Day (20 March)", tr: "Dünya Ağız ve Diş Sağlığı Günü (20 Mart)", de: "Weltmundgesundheitstag (20. März)", es: "Día Mundial de la Salud Bucodental (20 de marzo)" },
    angle: "how mouth health and general health are linked, explained carefully and hedged (no scare claims)",
    window: fixed(3, 13, 3, 21),
    source: "https://www.worldoralhealthday.org/",
  },
  {
    id: "tr-agiz-dis-sagligi-haftasi",
    countries: ["TR"],
    name: { en: "Oral and Dental Health Week, around Dentists' Day (22 November)", tr: "Ağız ve Diş Sağlığı Haftası ve 22 Kasım Diş Hekimliği Günü" },
    angle: "one simple daily habit for the whole family, or what a dentist actually checks at a routine visit",
    window: fixed(11, 16, 11, 28),
    source: "https://www.tdb.org.tr/",
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
    source: "https://www.tagderzahngesundheit.de/",
  },
  {
    id: "mx-dia-del-nino",
    countries: ["MX"],
    name: { en: "Día del Niño (30 April)", es: "Día del Niño (30 de abril)" },
    angle: "children's teeth: first visit, toothpaste amount, sweets and timing",
    window: fixed(4, 23, 4, 30),
  },
  {
    // American Dental Association: "February is National Children's Dental
    // Health Month (NCDHM)" (read 2026-11-24). The whole month, 29 days in a leap year.
    id: "us-childrens-dental-health-month",
    countries: ["US"],
    name: { en: "National Children's Dental Health Month (February)" },
    angle: "children's teeth: first visit, toothpaste amount, sealants",
    window: month(2),
    source: "https://www.ada.org/resources/community-initiatives/national-childrens-dental-health-month",
  },
  {
    // The Oral Cancer Foundation: "April is Oral Cancer Awareness month"
    // (read 2026-11-24); the American Dental Hygienists' Association lists it
    // for April too. The foundation's campaign is built on free screening
    // events, which is exactly what a clinic's video must not offer.
    id: "us-oral-cancer-awareness-month",
    countries: ["US"],
    name: { en: "Oral Cancer Awareness Month (April)" },
    angle:
      "what the dentist looks at for signs of oral cancer during a routine exam (lips, cheeks, tongue, the floor and roof of the mouth, the throat), the changes worth showing a dentist or doctor (a sore that does not heal, a red or white patch, a lump or thickening) and well-known risk factors such as tobacco and alcohol; calm and factual, no statistics or survival figures, no scare claims, and never a screening offer or event",
    window: month(4),
    source: "https://oralcancerfoundation.org/events/oral-head-neck-cancer-awareness-month/",
  },
  {
    // American Association of Oral and Maxillofacial Surgeons, 30 March 2026:
    // "April is National Facial Protection Month", led by AAOMS with the
    // Academy for Sports Dentistry, the AAPD and the AAO (read 2026-11-24).
    // The spring sports season in the US.
    id: "us-facial-protection-month",
    countries: ["US"],
    name: { en: "National Facial Protection Month (April)" },
    angle:
      "protecting teeth and face in spring sports and play: a mouthguard for contact sports and a helmet for bikes, scooters and skateboards; stock, boil-and-bite or custom-made mouthguards in plain words; what to do in the first minutes if a tooth is knocked out; no injury statistics",
    window: month(4),
    source: "https://myoms.org/april-is-national-facial-protection-month-suit-up-for-spring-sports-and-outdoor-fun/",
  },
  {
    // American Dental Hygienists' Association: "National Dental Hygiene Month
    // | October" in the association's own events menu (read 2026-11-24 on
    // https://www.adha.org/; the month's page below refuses scripted reads).
    id: "us-dental-hygiene-month",
    countries: ["US"],
    name: { en: "National Dental Hygiene Month (October)" },
    angle:
      "what a dental hygienist does at a cleaning visit, step by step, or one daily habit done well (two minutes of brushing twice a day, cleaning between the teeth, water instead of sugary drinks between meals)",
    window: month(10),
    source: "https://www.adha.org/ndhm",
  },
  {
    // Oral Health Foundation, see SMILE_MONTH above.
    id: "gb-national-smile-month",
    countries: ["GB"],
    name: { en: "National Smile Month (mid-May to mid-June)" },
    angle: "one family habit (brushing, sugar timing, check-ups)",
    window: (y) => SMILE_MONTH[y] ?? { start: d(y, 5, 15), end: d(y, 6, 15), approximate: true },
    source: "https://www.dentalhealth.org/smilemonth",
  },
  {
    // Oral Health Foundation: "Mouth Cancer Action Month is a charity
    // campaign that takes place in November", message "if in doubt, get
    // checked out"; the signs below are the foundation's own list on
    // https://www.dentalhealth.org/spotthesigns (read 2026-11-24).
    id: "gb-mouth-cancer-action-month",
    countries: ["GB"],
    name: { en: "Mouth Cancer Action Month (November)" },
    angle:
      "how to check your own mouth in about a minute (lips, cheeks, tongue, the roof of the mouth), the changes worth having checked by a dentist or doctor (a mouth ulcer that does not heal, a red or white patch, an unusual lump) and that a routine check-up includes a look for them; the campaign's message is 'if in doubt, get checked out'; calm and factual, no statistics or survival figures, no scare claims",
    window: month(11),
    source: "https://www.dentalhealth.org/mouthcancer",
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
    // Thanksgiving: fourth Thursday of November. Holiday meals mean grazing
    // all afternoon, pecan pie and nuts; a cracked tooth over a long weekend.
    id: "us-thanksgiving",
    countries: ["US"],
    name: { en: "Thanksgiving" },
    angle: "grazing on pie and snacks all afternoon vs. with the meal; cracking nuts or hard candy with teeth; what to do if a tooth chips over the long weekend",
    window: (y) => {
      const nov1 = new Date(Date.UTC(y, 10, 1)).getUTCDay();
      const day = 1 + ((4 - nov1 + 7) % 7) + 21;
      return { start: d(y, 11, day - 9), end: d(y, 11, day) };
    },
  },
  {
    // The question US patients search every November–December ("use dental
    // benefits before end of year"). Many plans run on the calendar year, but
    // not all, so it is explained, never pushed.
    id: "us-plan-year",
    countries: ["US"],
    name: { en: "End of the dental plan year" },
    angle: "how a dental plan year usually works (annual maximum, what resets, that many but not all plans follow the calendar year) and that checking your own plan is worth five minutes — information only, never 'use it or lose it' urgency, no prices",
    window: fixed(11, 1, 12, 20),
  },
  {
    // The Bonusheft: a check-up entry each calendar year raises the statutory
    // insurance subsidy for dentures and crowns later. Patients ask about it
    // before the year ends.
    id: "de-bonusheft",
    countries: ["DE"],
    name: { en: "The Bonusheft before the year ends", de: "Bonusheft zum Jahresende" },
    angle: "what the Bonusheft is and that the yearly check-up entry counts per calendar year — explained calmly, without percentages unless certain, never as urgency to book",
    window: fixed(11, 1, 12, 20),
  },
  {
    // Cold, dry winter air and hot drinks: the twinge from cold air on a walk
    // is one of the most searched winter tooth questions in TR and DE.
    id: "winter-sensitivity",
    countries: ["TR", "DE", "AT", "CH", "PL", "FR", "IT", "GB", "US", "CA"],
    name: { en: "Winter cold", tr: "Kış soğukları", de: "Winterkälte" },
    angle: "why cold air or a hot drink can make teeth twinge, what usually helps (sensitive toothpaste, gentle brushing) and which signs are worth showing a dentist",
    // Spans the new year: the window "of" year y runs from mid-November y-1 to mid-February y.
    window: (y) => ({ start: d(y - 1, 11, 15), end: d(y, 2, 15) }),
  },
  {
    id: "new-year-habits",
    countries: "*",
    name: { en: "New year", tr: "Yeni yıl", de: "Neues Jahr", es: "Año nuevo" },
    angle: "one small habit to start (two minutes twice a day, cleaning between teeth, a check-up reminder)",
    window: (y) => ({ start: d(y, 1, 1), end: d(y, 1, 14) }),
  },
];

export type Upcoming = { id: string; name: string; angle: string; start: string; end: string; approximate?: true };

/**
 * What a clinic in `country` could tie a video to between `date` and
 * `date + horizonDays` (the week being planned).
 */
export function upcomingObservances(country: string, language: string, date: Date = new Date(), horizonDays = 10): Upcoming[] {
  // "UK" is how people write Great Britain; the same market (hard-rules.ts marketCode).
  const c = country.trim().toUpperCase() === "UK" ? "GB" : country.trim().toUpperCase();
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

/** The dates as the strategist sees them; an unconfirmed year is said to be approximate. */
function when(u: Upcoming): string {
  return u.approximate
    ? `around ${u.start}–${u.end}; the organiser has not published this year's exact dates, so name the season, never a specific date`
    : `${u.start}–${u.end}`;
}

/** The strategist's seasonal line; empty when nothing falls in the coming days. */
export function seasonalBrief(country: string, language: string, date: Date = new Date()): string {
  const up = upcomingObservances(country, language, date);
  if (!up.length) return "";
  return [
    `This week in the clinic's market: ${up.map((u) => `${u.name} (${when(u)}): ${u.angle}`).join("; ")}.`,
    `Patients notice a practice that talks about what is happening now: when one of these fits a service the clinic offers, build ONE video of the week on it. Tie AT MOST ONE video to it, only if it fits one of the clinic's services, and only educationally — never an offer, discount, giveaway or "special" around the date. Name the occasion in the hook or first line so the timing is the reason to watch. Skip it if a recent video already covered the same angle.`,
  ].join(" ");
}
