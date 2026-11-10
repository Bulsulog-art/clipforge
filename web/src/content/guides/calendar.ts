import type { Guide } from "../dentvideo";

// "A year of posts" guides: one weekly theme for 52 weeks, written per market
// (not translated): each uses the awareness dates that exist in that market,
// verified against the organiser's own pages (2026-11-10). Every theme is
// educational, so the calendar stays within the local advertising rules; no
// prices, offers, testimonials or before-and-after posts anywhere in it.

export const FDI = { label: "FDI World Dental Federation — World Oral Health Day (20 March)", url: "https://www.worldoralhealthday.org/" };
export const ADA_NCDHM = { label: "American Dental Association — National Children's Dental Health Month (February)", url: "https://www.ada.org/resources/community-initiatives/national-childrens-dental-health-month" };
export const OHF_SMILE = { label: "Oral Health Foundation — National Smile Month (UK, mid-May to mid-June)", url: "https://www.dentalhealth.org/what-is-national-smile-month" };
export const TDZ = { label: "Aktionskreis Tag der Zahngesundheit — 25. September (Motto 2026: „Gesund beginnt im Mund – Kau dich fit!“)", url: "https://www.tagderzahngesundheit.de/" };
export const TDB_20MART = { label: "Türk Dişhekimleri Birliği — 20 Mart Dünya Ağız ve Diş Sağlığı Günü basın açıklaması", url: "https://www.tdb.org.tr/userfiles/files/20Mart_Basın_Aciklamasi.pdf" };
export const TDB = { label: "Türk Dişhekimleri Birliği — duyurular (22 Kasım Diş Hekimliği Günü ve Ağız ve Diş Sağlığı Haftası)", url: "https://www.tdb.org.tr/" };

export const CALENDAR_PUBLISHED = "2026-11-10";

export const CALENDAR_EN: Guide = {
  locale: "en",
  slug: "dental-social-media-content-calendar",
  topic: "content-calendar",
  category: "ideas",
  published: CALENDAR_PUBLISHED,
  updated: CALENDAR_PUBLISHED,
  reviewed: CALENDAR_PUBLISHED,
  title: "Dental social media content calendar: 52 weeks of post ideas for a dental clinic",
  seoTitle: "Dental social media calendar: 52 weekly topics",
  seoDescription: "A year of dental Instagram and TikTok topics, one per week, tied to World Oral Health Day and other real dates, and safe under advertising rules.",
  description: "A 52-week dental social media calendar: one educational topic per week, the awareness dates worth planning around in the US and UK, and what to keep out.",
  h1: "Dental social media content calendar: 52 weeks of topics",
  intro:
    "A dental social media calendar is a list of one educational topic per week, planned a quarter ahead and anchored to dates that recur every year, such as World Oral Health Day on 20 March. Below are 52 weekly topics a dental clinic can post on Instagram, TikTok or YouTube Shorts. Each one answers a question patients really ask, so none of them needs a discount, a testimonial or a before-and-after photo.",
  sections: [
    {
      heading: "How should a dental clinic plan a year of posts?",
      paragraphs: [
        "Plan themes, not posts. A theme per week (“sensitive teeth”, “mouthguards”) can become one short video, a carousel and a story question, and it gives everyone at the practice the same answer to “what are we posting this week?”. Most clinics that stop posting stop because nobody owned that question.",
        "A simple routine that works for a small team:",
      ],
      ordered: true,
      list: [
        "Once a quarter, copy the next 13 weeks from the calendar below and cross out any topic for a service you do not offer.",
        "Swap in the questions patients asked at the chair last quarter. Real questions beat any list.",
        "Decide who records and who approves. The dentist should approve every clinical statement before it is posted.",
        "Batch-record: one 20-minute session can cover four weeks of short answers.",
        "Keep a log of what was posted and when, with the approved wording. Several regulators expect you to be able to show what you published.",
      ],
    },
    {
      heading: "Which dates belong in a dental calendar?",
      paragraphs: [
        "Awareness dates give a post a reason to exist on that day and are easy to plan around. Use the ones run by recognised organisations, and check the organiser's site for this year's theme:",
      ],
      table: {
        caption: "Recurring oral-health dates for US and UK clinics",
        columns: ["When", "Observance", "Organiser", "Where"],
        rows: [
          ["February", "National Children's Dental Health Month", "American Dental Association", "United States"],
          ["20 March", "World Oral Health Day", "FDI World Dental Federation", "Worldwide"],
          ["Mid-May to mid-June (11 May–11 June in 2026)", "National Smile Month", "Oral Health Foundation", "United Kingdom"],
          ["Late August to September", "Back to school", "—", "Everywhere: lunchboxes, sports mouthguards, orthodontic checks"],
          ["31 October", "Halloween", "—", "US and UK: sweets and timing"],
        ],
        note: "Dates and themes change; confirm them on the organisers' pages listed under Sources.",
      },
    },
    {
      heading: "Weeks 1–13 (January to March): routines and children",
      paragraphs: ["The new year is when people start habits, and February is children's dental health month in the US:"],
      list: [
        "Week 1 — Brushing basics: two minutes, twice a day, and angling the brush towards the gumline.",
        "Week 2 — Floss or interdental brushes: which suits which gaps, shown on a model.",
        "Week 3 — Bleeding gums: why they are a reason to book a check-up, not to stop brushing.",
        "Week 4 — What happens at a check-up and clean, step by step.",
        "Week 5 — When should a child first see the dentist?",
        "Week 6 — How much toothpaste for children: a smear for toddlers, a pea-sized amount from about age three.",
        "Week 7 — Snacking and sugary drinks: why how often matters as much as how much.",
        "Week 8 — Fissure sealants: what they are and who they may suit.",
        "Week 9 — Sensitive teeth: common causes and what usually helps.",
        "Week 10 — Mouthguards for sport: custom-made or boil-and-bite.",
        "Week 11 — Dry mouth: medicines that can cause it and why it matters for teeth.",
        "Week 12 — World Oral Health Day (20 March): what the links between oral and general health do and do not mean.",
        "Week 13 — Meet the team: who does what at the practice.",
      ],
    },
    {
      heading: "Weeks 14–26 (April to June): treatments explained",
      paragraphs: ["Spring is a good time to explain treatments calmly, before people need them. In the UK, National Smile Month falls in this quarter:"],
      list: [
        "Week 14 — How often to replace a toothbrush, and the signs it is worn.",
        "Week 15 — Electric or manual toothbrush: why technique matters more than the brush.",
        "Week 16 — Wisdom teeth: when they need attention and when they can be left alone.",
        "Week 17 — Acid erosion: fizzy drinks, citrus and why to wait a while before brushing after them.",
        "Week 18 — Whitening: what to expect, how long it may last and who it may not suit.",
        "Week 19 — Bad breath: the common causes and when to see the dentist.",
        "Week 20 — National Smile Month: three habits for the whole family.",
        "Week 21 — Nervous about the dentist? What you can tell us, and what we can do.",
        "Week 22 — Root canal treatment explained, without the myths.",
        "Week 23 — Filling or crown: why some teeth need more than a filling.",
        "Week 24 — Smoking, vaping and gum health.",
        "Week 25 — Pregnancy and gums: why a check-up is worth it.",
        "Week 26 — Question week: answer three questions patients asked this quarter.",
      ],
    },
    {
      heading: "Weeks 27–39 (July to September): holidays and back to school",
      paragraphs: ["Summer brings travel and sport; September brings school routines:"],
      list: [
        "Week 27 — A knocked-out tooth: what to do in the first minutes and why speed matters.",
        "Week 28 — A travel kit for teeth, and what to do about toothache abroad.",
        "Week 29 — Ice, pens and bottle caps: habits that chip teeth.",
        "Week 30 — Teeth grinding: signs to look for and what a night guard does.",
        "Week 31 — Dental implants: what the process involves, step by step.",
        "Week 32 — Replacing a missing tooth: implant, bridge or denture, in plain words.",
        "Week 33 — Clear aligners: how they move teeth and what wearing them involves.",
        "Week 34 — Back to school: lunchbox and drink swaps that are kinder to teeth.",
        "Week 35 — When should a child have an orthodontic check?",
        "Week 36 — Cleaning around braces.",
        "Week 37 — Gum disease: from gingivitis to periodontitis, and why early care matters.",
        "Week 38 — Diabetes and gum health.",
        "Week 39 — Behind the scenes: how instruments are cleaned and sterilised.",
      ],
    },
    {
      heading: "Weeks 40–52 (October to December): prevention and the holidays",
      paragraphs: ["The end of the year is about prevention, sweets and practical information:"],
      list: [
        "Week 40 — Fluoride: what it does and where it comes from.",
        "Week 41 — Mouthwash: when it helps and when it is not needed.",
        "Week 42 — Halloween: why sweets with a meal are kinder than grazing all evening.",
        "Week 43 — Dentures: daily cleaning and overnight care.",
        "Week 44 — Caring for an older parent's teeth.",
        "Week 45 — Dental X-rays: why your dentist may recommend them and how often.",
        "Week 46 — Signs of a cracked tooth.",
        "Week 47 — Toothache before your appointment: what is reasonable to do at home.",
        "Week 48 — Sticky sweets and hard nuts: what to watch for over the holidays.",
        "Week 49 — Holiday opening hours, and what counts as a dental emergency.",
        "Week 50 — What a hygienist appointment involves.",
        "Week 51 — The year's questions: a recap of what patients asked most.",
        "Week 52 — Set a check-up reminder for the new year.",
      ],
    },
    {
      heading: "What should stay out of the calendar?",
      paragraphs: [
        "Awareness days are a common trigger for posts that break advertising rules: a “Smile Month discount”, a giveaway, a carousel of reviews. Keep the calendar educational. Leave out prices and offers, patient testimonials, before-and-after photos, and words such as “painless”, “guaranteed” or “permanent”. The rules differ by country; see [dental advertising rules country by country](guide:dental-social-media-advertising-rules), and for patients who appear on camera, [patient consent on dental social media](guide:patient-consent-dental-social-media).",
        "Clinical accuracy matters as much as the advertising rules. Each topic above is mainstream advice, but how it is phrased is the dentist's call: hedge (“usually”, “for most people”), and say “ask your dentist” where advice depends on the patient.",
      ],
    },
    {
      heading: "Which format fits which week?",
      paragraphs: [
        "Three formats cover almost every topic. A 20–40 second talking-head answer from the dentist works for questions (“does whitening damage enamel?”). A narrated explainer with captions works for procedures (implants, root canals). A short behind-the-scenes clip works for team and hygiene weeks. More on making them in [Instagram videos for dentists](guide:instagram-videos-for-dentists), and more single-post ideas in [dental social media post ideas](guide:dental-social-media-post-ideas).",
        "[DentVideo](landing:) turns a calendar like this into five narrated, captioned videos a week in your language and colours, checks every script for commonly restricted advertising claims and for clinical accuracy, and waits for your approval before anything is downloaded. [See a live preview with your own logo](start:).",
      ],
    },
  ],
  faq: [
    { q: "How often should a dental clinic post on social media?", a: "Consistency matters more than volume. One to three short educational posts a week is manageable for most clinics; this calendar gives one theme per week that can become one or more posts." },
    { q: "Which dates should a dental practice post about?", a: "World Oral Health Day on 20 March everywhere; National Children's Dental Health Month in February in the US; National Smile Month from mid-May to mid-June in the UK; and seasonal moments such as back to school and Halloween." },
    { q: "Can I run a promotion on an awareness day?", a: "Usually it is safer not to. Discounts and giveaways tied to health awareness days are restricted or banned in several countries, and they turn an educational post into an advert." },
    { q: "Should I post the same topics on Instagram, TikTok and YouTube Shorts?", a: "Yes. A vertical, captioned video of 20 to 60 seconds works on all three; adapt the caption and hashtags to each platform." },
    { q: "Does every topic suit every clinic?", a: "No. Only post about services you offer, and replace any topic with a question your own patients asked. Real questions are the most useful content." },
  ],
  sources: [FDI, ADA_NCDHM, OHF_SMILE],
};
