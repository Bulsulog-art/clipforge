import type { Guide } from "../dentvideo";

// English guides (US and UK first). Rules: describe only what is true today;
// no invented statistics, no prices; regulation hedged and sourced.

const GDC = { label: "General Dental Council — Standards for the Dental Team and guidance on advertising and social media", url: "https://www.gdc-uk.org/" };
const CAP = { label: "ASA / CAP — UK Code of Non-broadcast Advertising (CAP Code)", url: "https://www.asa.org.uk/codes-and-rulings/advertising-codes/non-broadcast-code.html" };
const ICO = { label: "Information Commissioner's Office — UK GDPR and health data", url: "https://ico.org.uk/" };
const FTC_HEALTH = { label: "FTC — Health Products Compliance Guidance", url: "https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance" };
const FTC_ADS = { label: "FTC — Advertising and marketing guidance (Endorsement Guides, reviews and testimonials rule)", url: "https://www.ftc.gov/business-guidance/advertising-marketing" };
const ADA = { label: "American Dental Association — Principles of Ethics and Code of Professional Conduct", url: "https://www.ada.org/about/principles/code-of-ethics" };
const HHS = { label: "U.S. Department of Health and Human Services — HIPAA for professionals", url: "https://www.hhs.gov/hipaa/index.html" };
const HWG = { label: "Germany — Heilmittelwerbegesetz (HWG)", url: "https://www.gesetze-im-internet.de/heilmwerbg/" };
const BOE = { label: "Spain — Real Decreto 1907/1996 (BOE)", url: "https://www.boe.es/eli/es/rd/1996/08/02/1907/con" };
const RG = { label: "Türkiye — Resmî Gazete, 12 November 2025, no. 33075 (health-services promotion regulation)", url: "https://www.resmigazete.gov.tr/eskiler/2025/11/20251112.htm" };

// Deep links to the operative texts (checked 2026-11-10).
const GDC_ADV = { label: "General Dental Council — Guidance on advertising", url: "https://www.gdc-uk.org/standards-guidance/standards-and-guidance/gdc-guidance-for-dental-professionals/guidance-on-advertising" };
const GDC_SM = { label: "General Dental Council — Guidance on using social media (in effect since 27 June 2016)", url: "https://www.gdc-uk.org/docs/default-source/guidance-documents/guidance-on-using-social-media" };
const CAP12 = { label: "CAP Code, Section 12 — Medicines, medical devices, health-related products and beauty products", url: "https://www.asa.org.uk/type/non_broadcast/code_section/12.html" };
const ASA_POM = { label: "ASA / CAP advice — Healthcare: prescription-only medicines", url: "https://www.asa.org.uk/advice-online/healthcare-prescription-only-medicine.html" };
const FTC_255 = { label: "FTC Endorsement Guides, 16 CFR Part 255 (revised 2023) — eCFR", url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255" };
const FTC_465 = { label: "FTC — Final rule on consumer reviews and testimonials, 16 CFR Part 465 (in force since 21 October 2024)", url: "https://www.ftc.gov/system/files/ftc_gov/pdf/r311003consumerreviewstestimonialsfinalrulefrn.pdf" };
const FTC_EIR = { label: "FTC — Endorsements, influencers and reviews (business guidance)", url: "https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews" };
const ADA_2025 = { label: "American Dental Association — Principles of Ethics and Code of Professional Conduct, 2025 edition (PDF)", url: "https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/about/2025_code_of_ethics_full.pdf" };
const ADA_NEWS = { label: "ADA News — Code updates address ethical concerns with social media influencers (February 2025)", url: "https://adanews.ada.org/ada-news/2025/february/ada-code-updates-address-ethical-concerns-with-social-media-influencers/" };
const TX_108 = { label: "Texas — 22 Tex. Admin. Code ch. 108, subchapter E (Business Promotion, §§ 108.50–108.63), via Cornell LII", url: "https://www.law.cornell.edu/regulations/texas/title-22/part-5/chapter-108/subchapter-E" };
const TX_10857 = { label: "Texas — 22 Tex. Admin. Code § 108.57, False, misleading or deceptive advertising, via Cornell LII", url: "https://www.law.cornell.edu/regulations/texas/22-Tex-Admin-Code-SS-108-57" };
const FL_466 = { label: "Florida Statutes § 466.019 — Advertising by dentists (Florida Senate)", url: "https://flsenate.gov/Laws/Statutes/2024/466.019" };
const FL_64B5 = { label: "Florida — Fla. Admin. Code r. 64B5-4.003, Advertisement of fees and discounted services, via Cornell LII", url: "https://www.law.cornell.edu/regulations/florida/Fla-Admin-Code-Ann-R-64B5-4-003" };
const CA_651 = { label: "California — Business and Professions Code § 651 (California Legislative Information)", url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=651" };
const CDA_ELITE = { label: "California Dental Association — Dental practice settles HHS complaint over patient information disclosed in review replies (2019)", url: "https://www.cda.org/news-events/dental-practice-pays-10k-to-settle-disclosures-of-patients-phi-on-social-media" };
const HWG11 = { label: "Germany — Heilmittelwerbegesetz § 11 (advertising to the public)", url: "https://www.gesetze-im-internet.de/heilmwerbg/__11.html" };
const R4127 = { label: "France — Code de la santé publique, art. R. 4127-215-1 (Légifrance)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042743767" };
const DHA = { label: "Dubai Health Authority — Standards for Medical Advertisement Content in Social Media (v1.1)", url: "https://www.dha.gov.ae/uploads/042022/Standards%20for%20Medical%20Advertisement%20Content%20in%20Social%20Media2022433965.pdf" };
const MHLW = { label: "Japan — Ministry of Health, Labour and Welfare: medical advertising rules (医療広告ガイドライン)", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/kokokukisei/index.html" };
const PL_UDL = { label: "Poland — Act on Medical Activity (ustawa o działalności leczniczej), art. 14, consolidated text Dz.U. 2026 poz. 156", url: "https://eli.gov.pl/eli/DU/2026/156" };

export const GUIDES_EN: Guide[] = [
  {
    locale: "en",
    slug: "instagram-videos-for-dentists",
    topic: "instagram-videos",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Instagram videos for dentists: what to post, how to film it and what to avoid",
    seoTitle: "Instagram for dentists: what to post in Reels",
    seoDescription: "Which short videos patients watch, the Reels format, captions, posting rhythm, five-minute filming and what health-advertising rules restrict for dentists.",
    description: "A practical guide for dental clinics: which short videos patients watch, the Reels format, captions, posting rhythm, five-minute filming and what health-advertising rules restrict.",
    h1: "Instagram videos for dentists: what to post, and how to keep it simple",
    intro:
      "The best Instagram videos for dentists answer one patient question in 20 to 60 seconds: vertical, captioned and worded carefully. One to three a week is enough. Guarantees, “painless”, discounts, superlatives and patient testimonials should stay out, because health-advertising rules restrict them in many countries, including under GDC and ASA guidance in the UK and FTC rules in the US.",
    sections: [
      {
        heading: "Why patients watch dentists' videos",
        paragraphs: [
          "Most patients look a clinic up before they book. A short video lets them see who will be treating them and hear how that person explains things. In a field where many people are anxious, that sense of already knowing the dentist often decides the appointment more than any photo of the waiting room.",
          "The aim is to educate, not to sell. That genuinely helps patients and keeps you on the right side of advertising rules, which allow accurate information but restrict promises and pressure. The detail is in our overview of [dental social media advertising rules](guide:dental-social-media-advertising-rules).",
        ],
      },
      {
        heading: "What patients actually want to see",
        paragraphs: [
          "The questions people ask at the chair are the best topics. Answer one per video. For a year's worth of ideas, see [dental social media post ideas](guide:dental-social-media-post-ideas).",
        ],
        list: [
          "Does whitening damage enamel?",
          "How long does an implant take, and what are the stages?",
          "What should I do after a root canal?",
          "When are bleeding gums something to worry about?",
          "When should my child first see a dentist?",
          "How do I clean my clear aligners?",
          "Does a scale and polish wear teeth down?",
        ],
        after: [
          "Only cover treatments your clinic actually provides. A video about something you do not offer sends interested patients to the wrong place.",
        ],
      },
      {
        heading: "The Reels format: first second, one idea, captions",
        paragraphs: [
          "Short videos go out as Reels in vertical 9:16. Put the question in the first second, spoken and on screen. Answer it in two or three plain sentences, then close calmly — “If you're unsure, we can look at it at your next check-up” — with no pressure and no offer.",
          "Add captions. Many people watch with the sound off, and captions also help viewers with hearing loss and patients whose first language is different from yours. Keep them in the lower third, above the app's icons.",
        ],
      },
      {
        heading: "Reels, Stories and your profile: which video goes where",
        paragraphs: [
          "Reels are the likeliest way to reach people who do not follow you yet, so they suit question-and-answer videos. Stories disappear after 24 hours and are for everyday contact with existing followers: a moment from the clinic, a reminder, a poll. Pinned videos on your profile are what a new visitor sees first; three good candidates are an introduction to the dentist, “what happens at your first visit” and the most common question you get.",
          "Organise Story Highlights by topic — “First visit”, “Aftercare”, “Children” — so patients find what they need in two taps.",
        ],
      },
      {
        heading: "Rhythm over volume",
        paragraphs: [
          "Consistency matters more than volume. One to three short educational videos a week is manageable for most clinics. Fixed days make the team's job easier and give followers a habit.",
          "The most efficient approach is to talk for five minutes once and cut several short clips from it, so one session covers a week. For weeks with no time to film, narrated education videos fill the gap; see [patient-education videos](guide:patient-education-videos).",
        ],
      },
      {
        heading: "Filming in five minutes",
        paragraphs: [],
        list: [
          "Pick three or four questions and jot down two or three points for each; do not memorise a script.",
          "Phone vertical, at eye level, on a small tripod or holder.",
          "Face a window for soft light; never stand with the window behind you.",
          "Use a clip-on microphone if you can: sound matters more than picture.",
          "Check the frame: no patients, no screens with records, no identifiable X-rays.",
          "Answer each question as you would to a patient, and pause for two seconds between questions to make editing easy.",
        ],
        ordered: true,
        after: ["One relaxed take is usually better than a polished, read-out script. Patients want a dentist they can understand and trust, not a presenter."],
      },
      {
        heading: "What to keep out",
        paragraphs: [
          "Health advertising is regulated in most countries, and a clinic's Instagram is usually treated as advertising. Commonly restricted:",
        ],
        list: [
          "Guarantees and absolutes: “painless”, “guaranteed results”, “permanent”, “lasts a lifetime”",
          "Superlatives and comparisons: “the best clinic in town”, “number one for implants”",
          "Discounts, giveaways and limited-time offers as a lure",
          "Before-and-after images that suggest a typical or guaranteed result",
          "Patient testimonials and reviews used to persuade",
          "Identifiable patients without written consent",
        ],
        after: [
          "The safest content is educational and hedged: “usually”, “for most people”, “your dentist will advise you”. Rules differ by country and change, so check with your regulator or professional body. UK clinics should read [the GDC and ASA rules](guide:dental-advertising-rules-uk-gdc-asa); US clinics, [the FTC, ADA and state board rules](guide:dental-advertising-rules-us).",
        ],
      },
      {
        heading: "How DentVideo helps",
        paragraphs: [
          "[DentVideo](landing:) plans five topics a week from the services you offer and real patient questions, writes and narrates the videos, and captions them in your colours with your logo. Every script is checked twice — for commonly restricted advertising claims and for clinical accuracy. Your own recordings are never reworded; anything worth a second look is marked with the reason. Nothing goes out until you approve it. [See a live preview with your logo before you pay](start:).",
        ],
      },
    ],
    faq: [
      { q: "How often should a dental clinic post videos?", a: "Consistency matters more than volume. One to three short educational videos a week is manageable for most clinics and keeps the account active." },
      { q: "How long should a dental Instagram video be?", a: "About 20 to 60 seconds is enough to answer one question. Longer topics work better split into several videos, one question each." },
      { q: "Do I need professional equipment?", a: "No. A recent phone, a window for light, a clip-on microphone and a quiet room are enough for short educational videos." },
      { q: "Can I show patient cases?", a: "Only with the patient's informed, written consent, and in many countries before-and-after images are restricted in advertising. Check your national rules first." },
      { q: "Can I use the same video on TikTok and YouTube Shorts?", a: "Yes. A vertical, captioned short video works on Reels, TikTok and YouTube Shorts; just adapt the caption text for each platform." },
    ],
    sources: [GDC, CAP, FTC_ADS, ADA],
  },
  {
    locale: "en",
    slug: "patient-education-videos",
    topic: "patient-education",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Patient-education videos for dental clinics: topics, uses and accuracy",
    seoTitle: "Dental patient education videos: topics and uses",
    seoDescription: "Why short patient education videos help dental clinics, which topics to start with, a script template, where to use them and how to keep them accurate.",
    description: "Why short patient-education videos help dental clinics, which topics to cover first, a script template, where to use them and how to keep them accurate.",
    h1: "Patient-education videos for dental clinics",
    intro:
      "Dental patient-education videos are short films, usually 30 to 90 seconds, that explain what a treatment is, how it is done and what to do afterwards. Clinics use them to calm nerves before an appointment, reinforce aftercare at home and give every patient the same accurate explanation. They support the consent conversation with the dentist; they do not replace it.",
    sections: [
      {
        heading: "What an education video solves",
        paragraphs: [
          "Much of what is said in the surgery is forgotten by the time the patient gets home, especially if they were anxious or still numb. A short video can be watched again whenever it is needed. The team no longer answers the same question ten times a day, and every patient gets the same reviewed information.",
          "Valid consent comes from a conversation with the dentist, documented as your rules require. Videos prepare and remind; they do not replace that conversation.",
        ],
      },
      {
        heading: "Where education videos help most",
        paragraphs: ["Start with what your team explains every day. Three moments work well:"],
        list: [
          "Before a first visit: what happens at a check-up, what to bring, why an X-ray may be taken.",
          "Before a treatment: root canal, implant, extraction, hygiene appointment, aligners — the steps in plain words.",
          "After a treatment: aftercare following an extraction, eating after a filling, cleaning around implants, sensitivity after whitening.",
          "For children and parents: baby teeth, the first visit, fissure sealants and fluoride varnish.",
        ],
      },
      {
        heading: "A script template that works",
        paragraphs: ["Using the same simple structure every time makes videos easier to write and to watch:"],
        list: [
          "Question (first 3 seconds): “When can I eat after an extraction?”",
          "Short answer (1 sentence): “Usually once the numbness wears off — something soft and lukewarm.”",
          "Why (1–2 sentences): why the blood clot matters for healing.",
          "What to do (2–3 points): procedure-specific advice, such as avoiding hot drinks, straws and smoking on the first day.",
          "When to call (1 sentence): “If bleeding or pain gets worse, call us.”",
          "Close: “Your dentist will give you advice for your own situation.”",
        ],
        ordered: true,
        after: ["The “when to call” line matters most in aftercare videos: patients need to know what is normal and what is not."],
      },
      {
        heading: "Keeping them accurate",
        paragraphs: [
          "Stay with mainstream guidance and hedge where outcomes vary: “usually”, “for most people”, “your dentist will tell you”. Keep aftercare specific to the procedure — advice that is right after an extraction can be wrong after a filling.",
          "Make sure the caption under the video says the same thing as the video, and have a dentist review every video before it goes out. When the videos are posted on social media, advertising rules apply too; see [dental social media advertising rules](guide:dental-social-media-advertising-rules).",
        ],
      },
      {
        heading: "Where to use them",
        paragraphs: ["The same short video works in many places:"],
        list: [
          "Instagram, TikTok and YouTube Shorts, as educational content",
          "The waiting-room screen, as a silent captioned loop",
          "Appointment reminders and aftercare messages, where the patient has agreed to that channel",
          "Treatment pages on your website",
        ],
        after: [
          "Sending videos by email or text needs an appropriate legal basis and a secure channel; marketing messages without consent are not allowed in the UK or EU and are restricted in the US.",
        ],
      },
      {
        heading: "Accessibility and patients who speak other languages",
        paragraphs: [
          "Captions help viewers with hearing loss and anyone watching without sound. Short sentences, everyday words and a plain translation of each technical term (“periodontitis — advanced gum disease”) make videos easier to follow.",
          "If many of your patients are more comfortable in Spanish, Polish, Urdu or another language, having your most common aftercare videos in those languages too reduces misunderstandings.",
        ],
      },
      {
        heading: "Making them part of the team's routine",
        paragraphs: [
          "Videos only help if the team uses them. Reception can send “Your first visit” with the booking confirmation; the nurse can point to the aftercare video at the end of treatment; the dentist can say “there's a short video you can watch at home”. A simple table of which video goes with which treatment is enough. Review the videos once a year, or whenever your protocol changes.",
        ],
      },
      {
        heading: "Should the dentist appear, or use narration?",
        paragraphs: [
          "Patients trust the person who will treat them, so videos of the dentist explaining things are the most effective. Filming every week is rarely realistic, though. A good balance: explain the most common topics yourself and cover the rest with narrated education videos. For filming tips, see [Instagram videos for dentists](guide:instagram-videos-for-dentists).",
          "[DentVideo](landing:) plans a week of topics from the services you offer, writes and narrates the videos in your language, checks each one for clinical accuracy and advertising rules, and leaves the final approval to you. You download approved videos with their caption for social media, the waiting room or your website.",
        ],
      },
    ],
    faq: [
      { q: "How long should a patient-education video be?", a: "Short enough to watch in one go: about 30 to 90 seconds for one topic. Longer explanations work better split into several videos, one per step." },
      { q: "Does a video replace the consent conversation?", a: "No. Consent comes from a conversation with the dentist, documented as your rules require. A video prepares and reminds." },
      { q: "Should the dentist appear in the videos?", a: "When possible, yes. Patients trust the person who will treat them; narrated videos are a good fallback for busy weeks." },
      { q: "Do waiting-room videos need sound?", a: "No. Captioned videos are understandable without sound and are less intrusive in a waiting room." },
      { q: "Who should check education videos?", a: "A dentist should watch every video before it is used, especially aftercare advice, which has to match your practice's own protocol." },
      { q: "Which videos should a clinic make first?", a: "The topics asked about most and that worry patients most: extraction aftercare, root canal treatment, the stages of an implant and the first visit." },
    ],
    sources: [GDC, ADA, ICO],
  },
  {
    locale: "en",
    slug: "dental-social-media-advertising-rules",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-10",
    reviewed: "2026-11-10",
    title: "Dental social media and advertising rules: what to watch for, country by country",
    seoTitle: "Dental advertising guidelines for social media",
    seoDescription: "The claims health-advertising rules commonly restrict in dental social media posts, with pointers for the UK, US, Germany, Spain, France and Türkiye.",
    description: "The claims health-advertising rules commonly restrict in dental social media posts, with pointers to the UK, US, Germany, Spain, France and Türkiye. Not legal advice.",
    h1: "Dental social media and advertising rules: what to watch for",
    intro:
      "A dental clinic's social media posts are usually treated as advertising, and health advertising is regulated in most countries. The claims most often restricted are guarantees and “painless”, superlatives and comparisons, prices and discounts used as a lure, before-and-after promises and patient testimonials. The details differ by country, so check your national regulator. This is general information, not legal advice.",
    sections: [
      {
        heading: "Is a clinic post advertising?",
        paragraphs: [
          "Content a clinic publishes to make itself known is generally treated as advertising, even when it is educational in tone. The channel does not matter: website, Google profile, Instagram, TikTok and YouTube are all in scope. A dentist's personal account is usually caught too when it is used to talk about their practice.",
          "That does not mean you cannot post. It means what you post must be accurate, verifiable and not misleading, and must not create false expectations.",
        ],
      },
      {
        heading: "Which claims are commonly restricted?",
        paragraphs: ["Not every country restricts all of these, but many restrict several:"],
        list: [
          "Guarantees of results and absolutes: “painless”, “guaranteed”, “permanent”, “lasts a lifetime”",
          "Superlatives and comparisons with other clinics: “the best”, “number one”, “leading”",
          "Prices, discounts, free offers and limited-time deals used as a lure",
          "Before-and-after images that suggest a typical or guaranteed result",
          "Patient testimonials, reviews and thank-you messages",
          "Claims that a treatment has no risks or cures a condition",
          "Advertising prescription-only medicines (such as botulinum toxin) to the public",
        ],
      },
      {
        heading: "Which rules apply in which country?",
        paragraphs: [
          "The table names the main texts a dental clinic's posts are judged against in each market we cover. It is a starting point, not a summary of everything that applies: always read the current text or ask your regulator or professional body.",
        ],
        table: {
          caption: "Dental advertising rules by country (as of November 2026)",
          columns: ["Country", "Main texts", "What they mean for posts"],
          rows: [
            ["United Kingdom", "GDC Standards and guidance on advertising and on social media; ASA's CAP Code (Section 12 for health)", "Objective claims need evidence you hold before posting; “specialist” only for those on a GDC specialist list; no advertising of prescription-only medicines such as Botox to the public. [UK guide](guide:dental-advertising-rules-uk-gdc-asa)"],
            ["United States", "FTC Act Section 5; Endorsement Guides (16 CFR 255); reviews and testimonials rule (16 CFR 465); state dental board rules; ADA Code for members; HIPAA", "Truthful, substantiated claims; disclosed material connections; no fake or bought reviews; state-specific rules on guarantees, specialties and fee ads. [US guide](guide:dental-advertising-rules-us)"],
            ["Germany", "Heilmittelwerbegesetz (§§ 3, 7, 11 HWG); UWG; dental chambers' professional codes (§ 21 MBO-Z model)", "Factual information is allowed; boastful, misleading or comparative advertising is not; gifts and discounts only in narrow exceptions; before-and-after comparisons banned for non-medically necessary cosmetic procedures."],
            ["Austria / Switzerland", "§ 35 Zahnärztegesetz and the dental chamber's advertising guideline (AT); Art. 40 Medizinalberufegesetz (CH)", "Advertising must be objective, not misleading and not intrusive."],
            ["Spain", "Real Decreto 1907/1996; Ley 14/1986 General de Sanidad; regional health-advertising rules; dental code of ethics", "Some regions require prior authorisation of health advertising; the Supreme Court has upheld a ban on using celebrities in dental clinic ads."],
            ["France", "Code de la santé publique, art. R. 4127-215 and R. 4127-215-1 (decree of 22 December 2020); Ordre's recommendations", "Fair, honest, clear information that helps patients choose; no third-party testimonials, no comparisons with other dentists, nothing that encourages unnecessary care; dentistry may not be practised as a business."],
            ["Türkiye", "Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik (Resmî Gazete, 12 November 2025, no. 33075)", "Advertising of health services is banned; promotion and information are limited. Prices, discounts, campaigns and patient thank-you posts are high-risk."],
            ["Japan", "Medical Care Act advertising rules and the MHLW 医療広告ガイドライン", "Patient testimonials about treatment may not be used in advertising; before-and-after photos and self-pay treatment information are allowed only with detailed explanation (treatment, usual cost, main risks and side effects)."],
            ["Poland", "Art. 14 of the Act on Medical Activity; art. 71 of the Code of Medical Ethics (from 1 January 2025)", "Information about services is allowed, but it may not have “the features of advertising”: keep posts factual and educational."],
            ["UAE (Dubai)", "DHA Standards for Medical Advertisement Content in Social Media; MOHAP and DoH Abu Dhabi rules", "Absolute or exaggerated claims such as “the best”, “guaranteed success” or “no side effects” are prohibited; some emirates require an advertising permit."],
          ],
          note: "Not legal advice. Rules change; check the official text linked under Sources.",
        },
      },
      {
        heading: "What can a dentist say instead?",
        paragraphs: ["Almost any piece of information can be given without a promise. The right-hand column works in every market we cover:"],
        table: {
          caption: "Risky wording and a safer alternative",
          columns: ["Risky wording", "Why it is risky", "Safer wording"],
          rows: [
            ["“Painless implants”", "An absolute claim about the patient's experience that cannot be substantiated", "“The procedure is done under local anaesthetic; most people feel some tenderness for a few days afterwards.”"],
            ["“Guaranteed whiter teeth”", "A guaranteed result; creates unjustified expectations", "“Results vary from person to person; we'll check first whether whitening suits you.”"],
            ["“Permanent” / “lasts a lifetime”", "Overstates durability", "“With good care and regular check-ups it can last many years.”"],
            ["“The best clinic in town”", "A superlative and an implied comparison with other clinics", "Verifiable facts: treatments offered, qualifications, languages spoken, opening hours"],
            ["“Special offer, this month only”", "A price inducement and urgency; banned outright in some markets", "No offer. Invite people to ask a question or book a check-up"],
            ["A carousel of five-star reviews", "Testimonials are restricted in several markets and confirm who is a patient", "An educational video answering the question those patients asked"],
          ],
        },
        after: [
          "Educate rather than promise, invite viewers to ask or book a check-up rather than offering a deal, and keep patient information out of posts unless you have documented consent and the rules allow it. Our guide to [patient consent on dental social media](guide:patient-consent-dental-social-media) covers the privacy side.",
        ],
      },
      {
        heading: "The platforms have rules too",
        paragraphs: [
          "Separately from the law, Meta and TikTok apply their own advertising policies to paid posts. Both restrict health and cosmetic ads that promise unlikely results, and Meta's standards restrict before-and-after imagery and content that plays on insecurities about appearance. An ad can be rejected or an account restricted even where the law would allow it, so check the current policy before you boost a post.",
        ],
      },
      {
        heading: "A checklist before you post",
        paragraphs: ["If any answer is yes, rewrite or ask:"],
        list: [
          "Does it promise a result, no pain or permanence?",
          "Does it use a superlative or compare you with other clinics?",
          "Does it offer a discount, gift or giveaway?",
          "Does it include before-and-after images or patient reviews?",
          "Is anyone identifiable, and do you have their written consent?",
          "Is the clinical statement correct, and does the advice belong to the right procedure?",
        ],
      },
      {
        heading: "How DentVideo helps",
        paragraphs: [
          "[DentVideo](landing:) checks every script and caption for these commonly restricted claims in ten languages, sends anything risky back for a rewrite, and marks your own recordings for review instead of changing your words. It is a careful filter, not legal advice: you approve every video, and you remain responsible for what your clinic publishes. For topics that are safe to post, see [dental social media post ideas](guide:dental-social-media-post-ideas).",
        ],
      },
    ],
    faq: [
      { q: "Is a clinic's Instagram post considered advertising?", a: "In most countries, yes: content published by a clinic to attract patients is usually treated as advertising, so health-advertising rules apply." },
      { q: "Can I mention prices?", a: "It depends on the country. The UK and US allow accurate price information, while others, such as Türkiye, restrict price and discount advertising for health services. Check your national rules before mentioning prices." },
      { q: "Are before-and-after photos allowed?", a: "Rules vary. Some countries restrict them for certain procedures, and almost everywhere they must not mislead about typical results. You always need the patient's written consent." },
      { q: "Can I share patient reviews?", a: "Several countries restrict testimonials in health advertising, and privacy law applies to anything that identifies a patient. Where they are allowed, they must be genuine and not misleading." },
      { q: "Is this legal advice?", a: "No. Rules vary by country and change over time; confirm the requirements with your national dental council, regulator or a lawyer." },
    ],
    sources: [GDC_ADV, CAP12, FTC_255, HWG11, BOE, R4127, RG, MHLW, PL_UDL, DHA],
  },
  {
    locale: "en",
    slug: "dental-social-media-post-ideas",
    topic: "post-ideas",
    category: "ideas",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Dental social media post ideas: a year of safe topics for Instagram, Reels and TikTok",
    seoTitle: "Dental social media post ideas for a whole year",
    seoDescription: "A year of dental social media post ideas: patient questions, treatments explained, aftercare, team, seasonal topics, captions and what to avoid.",
    description: "Dental social media post ideas: patient questions, treatments explained, aftercare, team and practice, seasonal topics, a sample month, captions and hashtags, and what to avoid.",
    h1: "Dental social media post ideas",
    intro:
      "The safest and most-watched dental social media posts are short videos that answer common patient questions, explain treatments step by step, give aftercare tips and introduce the team. Discount promotions, giveaways, testimonials and before-and-after promises do not belong on the list: health-advertising rules restrict them in many countries, and they do little to build trust.",
    sections: [
      {
        heading: "Three rules for choosing a topic",
        paragraphs: ["Three questions tell you whether an idea will make a good post:"],
        list: [
          "Do patients really ask this? Questions from the chair, the phone and Google are the best topics.",
          "Do we offer it? Only explain treatments your clinic provides.",
          "Does it inform, or push? Not “Book now, offer ends Friday”, but “Ask us about it at your next check-up”.",
        ],
      },
      {
        heading: "Patient questions, answered briefly",
        paragraphs: [
          "This series can be the backbone of your account: one question, 20 to 60 seconds, a careful answer. Searches like “is … bad for you”, “how long does … take” and “after …” show what really worries people:",
        ],
        list: [
          "Is teeth whitening bad for your teeth?",
          "How long does a dental implant take?",
          "What can I eat after a tooth extraction?",
          "Is pain normal after a root canal?",
          "Can receding gums grow back?",
          "How do I know if I grind my teeth at night?",
          "What causes bad breath?",
        ],
      },
      {
        heading: "Treatments explained and aftercare",
        paragraphs: [
          "Anxiety often comes from the unknown. Videos that walk through the steps of a treatment take a lot of worry out of the appointment, and aftercare videos go home with the patient. We cover these in [patient-education videos](guide:patient-education-videos).",
        ],
        list: [
          "Root canal treatment step by step: what happens and how long it takes",
          "The first 24 hours after a filling",
          "Cleaning and storing clear aligners",
          "Brushing technique, floss and interdental brushes",
          "Baby teeth and a child's first visit",
          "Keeping implants clean",
        ],
      },
      {
        heading: "Your practice and your team",
        paragraphs: [
          "People trust people, not logos. Short introduction videos take the edge off a first visit. Keep it factual here too: “Our hygienist Sam shows you what happens at a hygiene appointment” is information; “the most experienced team in the city” is a superlative.",
        ],
        list: [
          "The dentist introduces themselves: areas of interest and how they work",
          "What happens at your first appointment",
          "How we sterilise instruments (with no patients in shot)",
          "Getting here, parking and accessibility",
          "What we do for nervous patients",
        ],
      },
      {
        heading: "Seasonal topics",
        paragraphs: ["The calendar supplies reliable hooks, for example:"],
        list: [
          "World Oral Health Day, 20 March",
          "National Children's Dental Health Month in the US (February)",
          "Back to school: brushing routines and check-ups for children",
          "Halloween, Easter and the holidays: sweets and teeth, without lecturing",
          "Summer sports: mouthguards",
          "Year end: a reminder to book the annual check-up (information, not an offer)",
        ],
      },
      {
        heading: "Where to find more topics",
        paragraphs: [
          "When the list runs dry, look in three places. Your team: reception and nurses know best what patients ask on the phone and in the chair — ask them to note every question for a week. Google: type “dental implant” or “teeth whitening” into the search box and read the suggestions; patterns such as “is … safe”, “how long” and “after” reveal real concerns. Your own account: comments and messages under your videos are your next topic.",
          "Price questions come up often but are rarely a good video. Answer them individually; if they keep coming, explain the steps of the treatment and what affects the plan, rather than numbers.",
        ],
      },
      {
        heading: "Captions and hashtags",
        paragraphs: [
          "The caption repeats briefly what the video says and adds no promise. A structure that works: the question on the first line, the answer in two or three sentences, then “Your dentist will advise you on your own situation”. Your clinic's name and town are enough to be found locally.",
          "Hashtags: topic and place (#oralhealth, #dentalimplants, #manchesterdentist), five to ten relevant ones rather than thirty random ones. Avoid superlatives such as #bestdentist and anything that suggests a deal.",
        ],
      },
      {
        heading: "What to avoid",
        paragraphs: [
          "Some social media advice that works in other industries is risky for a dental clinic: discount promotions, giveaways, “what our patients say” posts, screenshots of thank-you messages, before-and-after carousels and influencer deals without legal review. The reasons are in [dental social media advertising rules](guide:dental-social-media-advertising-rules). Any image of an identifiable patient also needs written consent.",
        ],
      },
      {
        heading: "A sample month",
        paragraphs: ["Here is a month at three posts a week:"],
        list: [
          "Week 1: “Is whitening bad for your teeth?” · “The first 24 hours after a filling” · Meet the dentist",
          "Week 2: “When are bleeding gums a worry?” · “Brushing technique” · Your first appointment",
          "Week 3: “How long does an implant take?” · “What to eat after an extraction” · How we sterilise",
          "Week 4: “When should my child first see a dentist?” · “Signs of teeth grinding” · Getting here",
        ],
        after: [
          "Three a week too many? Start with one. [DentVideo](landing:) does this planning for you: each week it picks five topics from your services and real patient questions, writes, narrates and checks the videos, and you only approve.",
        ],
      },
    ],
    faq: [
      { q: "What should a dental practice post on Instagram?", a: "Short answers to patient questions, clear explanations of treatments, aftercare tips and introductions to the team — informative, carefully worded and free of promises." },
      { q: "How many posts a week?", a: "One to three a week is manageable for most practices. Consistency matters more than frequency." },
      { q: "Do I need different content for TikTok?", a: "Usually not. The same vertical, captioned short video works on Reels, TikTok and YouTube Shorts; adapt the caption." },
      { q: "Can a dental practice run a giveaway?", a: "In many countries giveaways and gifts are restricted in health advertising, and even where allowed they attract followers who are not patients. Most practices are better off without them." },
      { q: "Should I reply to comments?", a: "Yes, politely and in general terms. Never discuss a person's own case in public; invite them to book or call instead, and never confirm that someone is your patient." },
    ],
    sources: [GDC, CAP, FTC_ADS, ADA],
  },
  {
    locale: "en",
    slug: "dental-advertising-rules-uk-gdc-asa",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-10",
    reviewed: "2026-11-10",
    title: "UK dental advertising rules for social media: GDC standards and the ASA's CAP Code",
    seoTitle: "GDC social media guidance and the CAP Code",
    seoDescription: "What UK dentists can post on social media under GDC standards and the ASA's CAP Code: testimonials, prices, Botox, specialist titles and UK GDPR.",
    description: "What UK dentists can post on Instagram and TikTok: GDC standards and advertising guidance, CAP Code substantiation, testimonials, prices, Botox, specialist titles and UK GDPR. Not legal advice.",
    h1: "UK dental advertising rules for social media",
    intro:
      "In the UK, dental social media posts must follow the General Dental Council's standards and guidance on advertising and the ASA's CAP Code. In short: be legal, decent, honest and truthful; hold evidence for every objective claim; do not mislead about results or qualifications; do not promote prescription-only medicines such as Botox to the public; and get written consent before featuring a patient.",
    sections: [
      {
        heading: "Which rules apply to UK dental posts?",
        paragraphs: [
          "The General Dental Council regulates you as a registrant. Its Standards for the Dental Team expect any advertising and information you produce to be accurate and not misleading, and its guidance on advertising and on social media sets out what that means in practice. A breach can become a fitness-to-practise matter.",
          "The Advertising Standards Authority enforces the CAP Code, which covers marketing on websites and social media, including a clinic's own Instagram, TikTok and paid ads. It can rule against an ad and require it to be withdrawn, whoever wrote it.",
        ],
      },
      {
        heading: "What does the CAP Code require?",
        paragraphs: ["The most relevant principles for dental posts; read the current Code for the exact rules:"],
        list: [
          "Substantiation: you must hold documentary evidence for objective claims before you publish them, and health claims need suitable evidence.",
          "No misleading content: about results, risks, what a treatment involves or how long it lasts.",
          "Testimonials must be genuine and must not be used to make claims you could not otherwise substantiate.",
          "Prices, where given, must be accurate and not misleading, including what is and is not included.",
          "Prescription-only medicines, including botulinum toxin, may not be advertised to the public; promoting a consultation is a different matter, but naming the medicine is not.",
          "Ads must be obviously identifiable as marketing, including influencer posts.",
        ],
      },
      {
        heading: "What does the GDC expect?",
        paragraphs: [
          "The GDC's guidance asks for information that is factual and verifiable. In practice this means: describe treatments accurately and without promising outcomes; only use the title “specialist” if you are on the relevant GDC specialist list (dental care professionals have no specialist lists and must avoid titles that imply one); state qualifications correctly; and make clear in practice publicity whether the practice is NHS (or equivalent), mixed or wholly private.",
          "Its Guidance on using social media, in effect since 27 June 2016, says the standards do not change because you are online: patients must not be identifiable when cases are discussed, closed professional groups may still be visible to the public, and the guidance applies even if you do not say you are a dental professional.",
          "Rules on what appears where can change, so check the current guidance on the GDC website rather than relying on older summaries.",
        ],
      },
      {
        heading: "What must a UK practice website show?",
        paragraphs: [
          "The GDC's guidance on advertising lists details that should appear wherever a website names the dental professionals who treat patients. Use it as a checklist for the website your Instagram bio links to:",
        ],
        list: [
          "Each professional's name and GDC registration number",
          "Their professional qualification and the country where it was obtained",
          "The practice's name, address and contact details",
          "Whether the practice provides NHS (or equivalent) care, private care or both",
          "How to complain: the practice procedure and, if a complaint is not resolved, the NHS complaints body or the Dental Complaints Service for private treatment",
          "The date the website was last updated",
        ],
        after: [
          "Check the current wording of the guidance before relying on this list: the items above summarise it, and the GDC may revise it.",
        ],
      },
      {
        heading: "Safer wording for common posts",
        paragraphs: [],
        list: [
          "Instead of “pain-free root canals”: “Treatment is done under local anaesthetic. Most people feel some tenderness for a day or two afterwards.”",
          "Instead of “Botox from …”: talk about facial-aesthetic consultations without naming the prescription medicine.",
          "Instead of “Manchester's leading implant specialist” (unless on the specialist list): “Dr Patel has a special interest in implant dentistry.”",
          "Instead of “results guaranteed”: “Results vary; we'll talk through what's realistic for you at your consultation.”",
          "Instead of a carousel of reviews: an educational video answering the question those patients asked.",
        ],
      },
      {
        heading: "Patients, consent and UK GDPR",
        paragraphs: [
          "Health information is special category data under UK GDPR, and the duty of confidentiality applies on social media as it does in the surgery. Featuring a patient — their face, voice, name, radiograph or story — needs explicit, informed, written consent that is specific to that use and can be withdrawn. Keep it separate from treatment consent and store it with the record.",
          "Take care when replying to online reviews: confirming that someone is your patient, or discussing their treatment, can itself be a breach. For more, see our guide to [patient consent on dental social media](guide:patient-consent-dental-social-media).",
        ],
      },
      {
        heading: "A UK checklist before you post",
        paragraphs: [],
        list: [
          "Can we substantiate every objective claim with evidence we already hold?",
          "Does anything promise a result, no pain or permanence?",
          "Are titles and qualifications stated correctly, and “specialist” used only by those on the list?",
          "Does the post name or promote a prescription-only medicine?",
          "Are prices, if any, accurate and complete?",
          "Is anyone identifiable, and do we have their written consent?",
          "Is a paid partnership clearly labelled as an ad?",
        ],
      },
      {
        heading: "How DentVideo helps",
        paragraphs: [
          "[DentVideo](landing:) writes educational videos that stay away from these risks: no guarantees, “painless”, superlatives, prices, before-and-after promises or testimonials, and every script reviewed for clinical accuracy. Your own recordings are marked for review instead of being reworded. It is a careful filter, not legal advice — you approve every video. For topics that work well, see [dental social media post ideas](guide:dental-social-media-post-ideas); for the wider picture, [advertising rules by country](guide:dental-social-media-advertising-rules).",
        ],
      },
    ],
    faq: [
      { q: "Can UK dentists advertise on Instagram?", a: "Yes, provided posts are legal, decent, honest and truthful, objective claims are substantiated, and they follow the GDC's standards and guidance on advertising and social media." },
      { q: "Can a UK dental practice post patient testimonials?", a: "Testimonials must be genuine, held on file with consent and not used to make claims you could not otherwise substantiate. Health claims in testimonials still need evidence." },
      { q: "Can I advertise Botox on my practice's social media?", a: "No. Botulinum toxin is a prescription-only medicine and may not be advertised to the public. You can promote a consultation for facial aesthetics without naming the medicine." },
      { q: "Can I show prices in UK dental posts?", a: "Yes, price information is allowed in the UK, but it must be accurate and must not mislead about what is included. Avoid lures such as “from” prices that few patients will actually pay." },
      { q: "Can I call myself a specialist?", a: "Only if you are on the relevant GDC specialist list. Otherwise describe a special interest accurately." },
      { q: "Is this legal advice?", a: "No. It is a general overview; check the current GDC guidance and CAP Code, and ask your indemnity provider or a lawyer about specific cases." },
    ],
    sources: [GDC_ADV, GDC_SM, CAP, CAP12, ASA_POM, ICO],
  },
  {
    locale: "en",
    slug: "dental-advertising-rules-us",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-10",
    reviewed: "2026-11-10",
    title: "Dental advertising rules in the US: FTC, ADA Code, state boards and HIPAA on social media",
    seoTitle: "US dental advertising rules: FTC, ADA, HIPAA",
    seoDescription: "What US dental practices can post on social media: FTC advertising and endorsement rules, reviews, the ADA Code, state dental boards and HIPAA.",
    description: "What US dental practices can post on social media: FTC truth-in-advertising and endorsement rules, the reviews and testimonials rule, ADA Code, state dental boards and HIPAA. Not legal advice.",
    h1: "Dental advertising rules in the US for social media",
    intro:
      "In the United States, dental social media posts are governed by the FTC's truth-in-advertising rules, its Endorsement Guides and its rule on consumer reviews and testimonials, by your state dental board's advertising rules and, for ADA members, by the ADA Code of Ethics. HIPAA adds that patients' photos, stories and even the fact that someone is a patient need written authorization before marketing use.",
    sections: [
      {
        heading: "What do federal FTC rules require?",
        paragraphs: [
          "Under Section 5 of the FTC Act, advertising must be truthful and not misleading, and objective claims need a reasonable basis before you make them. For health-related claims the FTC expects competent and reliable scientific evidence, as set out in its Health Products Compliance Guidance. A post that says a treatment is painless, permanent or guaranteed is a claim you would have to support.",
          "The FTC's Endorsement Guides (16 CFR Part 255, revised in 2023) cover testimonials and influencer posts: endorsements must reflect the endorser's honest experience, a consumer testimonial is not competent and reliable scientific evidence, results that are not typical must not be presented as typical, and any material connection — payment, free treatment, a discount — must be disclosed clearly and conspicuously. A disclosure hidden behind a “more” link does not count. Tags in social media posts can themselves be endorsements.",
          "Since 21 October 2024 the FTC's Trade Regulation Rule on the Use of Consumer Reviews and Testimonials (16 CFR Part 465) has also applied. It prohibits fake reviews and testimonials, buying reviews conditioned on what they say, and suppressing negative reviews, and it allows civil penalties for knowing violations. Offering patients a discount for a five-star review falls on the wrong side of it.",
        ],
      },
      {
        heading: "What do state dental boards add?",
        paragraphs: [
          "Each state's dental practice act and board rules add their own advertising requirements, and they differ. Three large states show the range; the summaries describe the rule texts as published in late 2026 and are not a substitute for reading them:",
        ],
        table: {
          caption: "Examples of state dental advertising rules",
          columns: ["State", "Rule", "What it says, in short"],
          rows: [
            ["Texas", "22 Tex. Admin. Code §§ 108.50–108.63 (Business Promotion), esp. § 108.57", "Dentists may not advertise in a way that is false, misleading, deceptive or “not readily subject to verification”. Examples include implying a guarantee or creating unjustified expectations about results, and testimonials from people who are not patients of record. § 108.54 governs specialty claims and § 108.60 requires keeping records of advertisements."],
            ["Florida", "Fla. Stat. § 466.019; Fla. Admin. Code r. 64B5-4.002 and 64B5-4.003", "Ads may not contain laudatory statements about a dentist, create unjustified expectations of favorable results or make claims about the quality of services. Every ad must identify the Florida-licensed dentist responsible for it. An advertised fee must state the period it is in effect and describe the service in ADA wording or by ADA code; free or discounted services need the disclosure required by § 456.062 and the dates they are available."],
            ["California", "Business and Professions Code § 651", "Licensees may not disseminate public communications that are false, fraudulent, misleading or deceptive, including a statement, endorsement or testimonial likely to mislead because it leaves out material facts. The section also sets out when a dentist may state board certification or that a practice is limited to certain fields."],
          ],
          note: "Other states have comparable rules. Your state board's website is the authoritative source; check it before running a campaign, especially across state lines.",
        },
        after: [
          "Common themes across states: “specialist” only when you meet the state's or a recognized specialty's criteria; complete disclosure of advertised fees and discounts; limits on guarantees and on testimonials; and keeping copies of what you published.",
        ],
      },
      {
        heading: "What does the ADA Code of Ethics say?",
        paragraphs: [
          "For ADA members, Section 5 of the Code (Veracity) prohibits advertising that is false or misleading in any material respect, and its advisory opinions address specialty announcements, testimonials and before-and-after images. In 2025 the ADA added Advisory Opinion 5.F.7 on social media, which restates the duty to present factual information on social platforms and gives examples of unsubstantiated claims, and amended Advisory Opinion 4.E.1 so its rules on split-fee arrangements for marketing services also cover influencers. Members should read the current Code on ada.org; non-members still face the same expectations from state boards and the FTC.",
        ],
      },
      {
        heading: "What does HIPAA mean for patient photos and reviews?",
        paragraphs: [
          "Patient photos, videos, radiographs, names and stories are protected health information. Using them in marketing generally requires the patient's written HIPAA authorization, separate from treatment consent, and the patient can revoke it. Simply confirming that someone is your patient can be a disclosure.",
          "This matters most when replying to online reviews. In 2019 the HHS Office for Civil Rights settled with a Dallas dental practice that had disclosed a patient's last name, treatment plan and insurance details in a reply to a Yelp review; besides a payment, the practice accepted a corrective action plan with two years of monitoring. A safe reply thanks the reviewer and invites them to call the office, without confirming they are a patient or mentioning treatment. More in [patient consent on dental social media](guide:patient-consent-dental-social-media).",
        ],
      },
      {
        heading: "Safer wording for common posts",
        paragraphs: [],
        list: [
          "Instead of “pain-free dentistry”: “We use local anesthetic, and we'll check in with you throughout.”",
          "Instead of “guaranteed perfect smile”: “Results vary; we'll talk about what's realistic at your consultation.”",
          "Instead of “Dallas's top implant specialist”: accurate credentials, and “specialist” only if you meet the criteria.",
          "Instead of reposting a five-star review: an educational video answering the question that patient asked.",
          "For a paid influencer post: a clear “#ad” or “paid partnership” label, and claims you can support.",
        ],
      },
      {
        heading: "Paid ads: the platforms have rules too",
        paragraphs: [
          "Separately from the law, Meta and TikTok apply their own advertising policies to paid posts. Both restrict health and cosmetic ads that promise unlikely results, and Meta's standards restrict before-and-after imagery and content that plays on insecurities about appearance. An ad can be rejected or an account restricted even where the law would allow it, so check the current policy before you boost a post.",
        ],
      },
      {
        heading: "A US checklist before you post",
        paragraphs: [],
        list: [
          "Can we support every objective claim with evidence we already have?",
          "Does anything promise a result, no pain or permanence?",
          "Is “specialist” used only where the state's criteria are met?",
          "Are any advertised fees or discounts complete and compliant with state rules?",
          "Do testimonials reflect typical results, and are material connections disclosed?",
          "Is anyone identifiable, and do we have a signed HIPAA authorization for marketing?",
          "Have we checked our state board's advertising rules?",
        ],
      },
      {
        heading: "How DentVideo helps",
        paragraphs: [
          "[DentVideo](landing:) makes educational videos that avoid the riskiest claims — guarantees, “painless”, superlatives, prices, before-and-after promises and testimonials — and checks every script for clinical accuracy. It needs no patient footage, and your own recordings are flagged for review rather than reworded. It is not legal advice; you approve every video. See [dental social media post ideas](guide:dental-social-media-post-ideas) for topics, and the [country-by-country overview](guide:dental-social-media-advertising-rules) if you work across borders.",
        ],
      },
    ],
    faq: [
      { q: "Can dentists post patient testimonials in the US?", a: "Often yes, but they must reflect honest experience, must not imply atypical results are typical, must disclose any material connection, and need the patient's written HIPAA authorization. Some state boards add restrictions." },
      { q: "Can I post before-and-after photos?", a: "Generally, with the patient's written HIPAA authorization and without misleading about typical results. Check your state board's rules and, for ADA members, the Code's advisory opinions." },
      { q: "How should I reply to a negative online review?", a: "Without confirming the person is a patient or mentioning any treatment. Thank them, and invite them to contact the office directly." },
      { q: "Do I need to label paid influencer posts?", a: "Yes. The FTC requires clear disclosure of any material connection, such as payment or free treatment, in a way people will notice." },
      { q: "Is this legal advice?", a: "No. It is a general overview; rules vary by state and change. Confirm with your state dental board, your malpractice carrier or a healthcare attorney." },
    ],
    sources: [FTC_HEALTH, FTC_255, FTC_465, FTC_EIR, ADA_2025, ADA_NEWS, TX_108, TX_10857, FL_466, FL_64B5, CA_651, HHS, CDA_ELITE],
  },
  {
    locale: "en",
    slug: "patient-consent-dental-social-media",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-10",
    reviewed: "2026-11-10",
    title: "Patient photos, videos and reviews on dental social media: consent, HIPAA and UK GDPR",
    seoTitle: "Dental social media consent: photos, HIPAA, GDPR",
    seoDescription: "What a dental practice needs before posting patient photos or videos: written consent or HIPAA authorization, what the form says and review replies.",
    description: "What dental practices need before posting patient photos, videos or stories: written consent or HIPAA authorization, what the form should say, review replies and safe alternatives. Not legal advice.",
    h1: "Patient photos and videos on dental social media: consent and privacy",
    intro:
      "A dental practice should only post a patient's face, voice, name, radiograph or story with the patient's explicit, written consent for that specific use — a HIPAA authorization in the US, explicit consent under UK GDPR in the UK — which the patient can withdraw. Treatment consent does not cover social media, and even confirming someone is a patient can breach confidentiality.",
    sections: [
      {
        heading: "Why this deserves its own checklist",
        paragraphs: [
          "A before-and-after smile, a patient's thank-you video or an X-ray with a name in the corner looks harmless. But it combines three sensitive things: health information, a person's image, and advertising. A mistake in any of them can lead to a privacy complaint, a regulator's inquiry or a damaged relationship with a patient.",
        ],
      },
      {
        heading: "What the law expects",
        paragraphs: ["In outline; always check the current rules where you practise:"],
        list: [
          "United States: patient images and stories are protected health information under HIPAA; marketing use generally requires a signed authorization that states what will be used, for what, and how to revoke it.",
          "United Kingdom: health information is special category data under UK GDPR, and the duty of confidentiality applies online. Explicit, informed consent is the usual basis for publishing; the GDC's guidance on social media points the same way.",
          "European Union: Article 9 of the GDPR treats health data as a special category; national data-protection authorities enforce it.",
          "Everywhere: advertising rules still apply on top. Consent does not make a misleading before-and-after acceptable; see [dental social media advertising rules](guide:dental-social-media-advertising-rules).",
        ],
      },
      {
        heading: "What a good consent form says",
        paragraphs: [],
        list: [
          "Separate from treatment consent: agreeing to treatment is not agreeing to appear on Instagram.",
          "Specific: what will be used (intraoral photo, full face, voice, first name), where (Instagram, website, waiting room) and for how long.",
          "Freely given: treatment must not depend on it, and no discount should be offered in exchange.",
          "Written and signed, and stored with the patient record.",
          "Revocable: how to withdraw, and what you will do (remove posts you control within a reasonable time).",
          "For children: signed by a parent or guardian, with the child's own view taken into account.",
        ],
      },
      {
        heading: "How to ask without making it awkward",
        paragraphs: [
          "Do not ask in the chair or in a hurry. Ask at the end of treatment, calmly and in writing. Explain in one sentence why (“it helps us show other patients what this treatment involves”), show the exact image you would use, and make clear that saying no changes nothing about their care. If they hesitate, treat it as a no.",
          "Offer smaller options: an intraoral photo only, no name, website only rather than social media. Many patients are comfortable with a limited version even when they would not want to appear on camera.",
        ],
      },
      {
        heading: "Before you film in the clinic",
        paragraphs: [
          "Most problems come from the background, not the patient you are featuring. Before recording, check for monitors showing records, the appointment book, radiographs with names, and other patients in the waiting room or the next surgery. Turn off location tagging if you do not need it, and never tag a patient unless they asked you to.",
          "Your team has image rights too. Get written consent from staff who appear in videos, and agree in advance what happens to those videos if they leave.",
        ],
      },
      {
        heading: "Replying to online reviews",
        paragraphs: [
          "Replying to a review is where many practices slip. Confirming that the reviewer is a patient, mentioning their treatment or correcting their account with details from the record can all disclose health information. In 2019 the US Department of Health and Human Services settled with a Dallas dental practice for exactly this: its replies to Yelp reviews had disclosed a patient's last name, treatment plan and insurance details. A safe reply thanks the person, says you take feedback seriously, and invites them to contact the practice directly — nothing more.",
        ],
      },
      {
        heading: "Alternatives that need no patient data",
        paragraphs: [
          "Most useful content does not need real patients at all: the dentist explaining to camera, models and typodonts, diagrams, animation and narrated videos. They are easier to produce, never have to be taken down when consent is withdrawn and raise no advertising questions. Ideas in [dental social media post ideas](guide:dental-social-media-post-ideas).",
          "[DentVideo](landing:) makes exactly this kind of video: narrated, captioned education in your colours, or clips cut from your own recording, with every script checked for promises and testimonials. You approve everything. [See your own videos before you pay](start:).",
        ],
      },
    ],
    faq: [
      { q: "Can I post a patient's before-and-after photos?", a: "Only with their explicit, written consent or HIPAA authorization for that specific use, and without misleading about typical results. Advertising rules in your country may add restrictions." },
      { q: "Do staff need to sign consent forms to appear in videos?", a: "Yes, it is good practice everywhere and often required. Agree in writing how the videos will be used and what happens to them if the person leaves the practice." },
      { q: "Can I repost a patient's own post that tags the practice?", a: "Be careful: resharing it in your marketing turns their post into your testimonial and confirms they are your patient. Ask for written consent first, and check your advertising rules on testimonials." },
      { q: "Does treatment consent cover social media?", a: "No. Publishing is a different purpose and needs separate, specific, written consent that the patient can withdraw." },
      { q: "What if a patient withdraws consent?", a: "Stop using the image and remove posts you control within a reasonable time. Explain this process when you ask for consent." },
      { q: "Can I post an X-ray with the name removed?", a: "If nothing reasonably identifies the patient, the risk is much lower. Still check file names, metadata and context before posting." },
      { q: "Is this legal advice?", a: "No. It is general information. Ask your data-protection officer, privacy officer, indemnity provider or a lawyer about specific cases." },
    ],
    sources: [HHS, CDA_ELITE, ICO, GDC_SM, FTC_255],
  },
  {
    locale: "en",
    slug: "dental-video-marketing-agency-or-software",
    topic: "agency-or-tool",
    category: "tools",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Dental video marketing: agency, freelancer, in-house or software?",
    seoTitle: "Dental video marketing: agency or software?",
    seoDescription: "Dental video marketing compared: agency, freelancer, in-house team or software, questions to ask before signing, a weekly workflow and who is responsible.",
    description: "How to run a dental practice's social media video: agency, freelancer, in-house team or software compared, questions to ask before signing, a weekly workflow and who is responsible.",
    h1: "Dental video marketing: agency, freelancer, in-house or software?",
    intro:
      "A dental practice has four ways to produce social media video: a dental marketing agency, a freelance content creator, someone on the team, or software that makes the content. Whichever you choose, the deciding question is the same: does the content follow health-advertising rules, and does a dentist approve every post before it goes live?",
    sections: [
      {
        heading: "First, decide what you need",
        paragraphs: [
          "“Doing social media” covers very different jobs: planning topics, writing, filming and editing, design, posting, replying to messages and reporting. For most practices the hard part is producing accurate, compliant content consistently. Knowing which part you want to hand off is the first step to choosing well.",
        ],
      },
      {
        heading: "Four options, pros and cons",
        paragraphs: [],
        list: [
          "Agency: handles planning, design and posting, and saves time. Often expensive, and not every agency knows health-advertising rules — promotions, giveaways and before-and-after carousels are standard elsewhere and risky for a dental practice.",
          "Freelance creator: more flexible and often more affordable, strong on filming and editing. Continuity depends on one person, and knowledge of the rules varies.",
          "In-house: nobody knows the practice and patients better, and the content sounds authentic. But time is short and patients always come first.",
          "Software: produces regular content quickly and predictably. General tools do not know health-advertising rules; even with a specialised tool, the final check belongs to the dentist.",
        ],
      },
      {
        heading: "Questions to ask before you sign",
        paragraphs: ["Ask any agency or freelancer:"],
        list: [
          "How do you make sure content follows the GDC and CAP Code (UK) or FTC and state board rules (US)?",
          "Do you suggest promotions, giveaways, testimonials or before-and-after posts? (If yes, be careful.)",
          "Does every post go to a dentist for approval before publishing?",
          "Who writes clinical content, and who checks it?",
          "Who collects patient and staff consent, and where is it stored?",
          "Will you sign a business associate agreement (US) or data-processing agreement (UK/EU) if you see patient data?",
          "Who owns the accounts, raw footage and content if we part ways?",
        ],
      },
      {
        heading: "Responsibility stays with the practice",
        paragraphs: [
          "Whoever makes it, the content goes out in the practice's name. If an agency's discount promotion triggers a complaint, the practice and the dentist answer for it. Put in writing that nothing is published without approval. The checklist in [dental social media advertising rules](guide:dental-social-media-advertising-rules) is a good basis for that sign-off.",
        ],
      },
      {
        heading: "How to compare proposals",
        paragraphs: ["Packages include different things and are hard to compare directly. Judge them on the same criteria instead:"],
        list: [
          "How many posts a week actually arrive ready to publish?",
          "How long does approval take the dentist — a quick watch, or a rewrite every time?",
          "Who checks clinical accuracy and advertising rules before approval?",
          "Does it sound like your practice, or like a template many practices receive?",
          "What happens to accounts and content if you switch provider?",
        ],
        after: [
          "A trial period answers these fastest. Watch whether approval time goes down; if every post needs rewriting, even a cheap option is expensive.",
        ],
      },
      {
        heading: "A weekly workflow that works",
        paragraphs: [],
        list: [
          "Monday: choose the week's topics (patient questions, season, the practice's treatments).",
          "Tuesday: videos and captions are prepared; if planned, the dentist records five minutes.",
          "Wednesday: the dentist watches each post and approves it or asks for changes.",
          "Thursday and Friday: approved posts go out; the team answers messages.",
          "Month end: what was watched, what questions came in; that feeds next month's plan.",
        ],
        ordered: true,
      },
      {
        heading: "If the team runs it in-house",
        paragraphs: [
          "Treat it as a job with fixed time each week, not something for quiet moments. The ideal person communicates well with patients, writes carefully and is discreet with data. Give them a short summary of the advertising rules and the approval checklist; clinical content is always approved by a dentist.",
          "Prepare reply templates for messages too: appointment requests, price questions (answered privately), pain or emergencies (the practice phone number). No diagnosing by direct message.",
        ],
      },
      {
        heading: "The mixed model most practices settle on",
        paragraphs: [
          "For many practices, what lasts is a mix: regular education videos come from a tool or an outside provider, the dentist adds a short recording of their own once or twice a month, and the team posts and replies. The account stays active, sounds like the practice and nobody is under weekly pressure. Topics in [dental social media post ideas](guide:dental-social-media-post-ideas); filming tips in [Instagram videos for dentists](guide:instagram-videos-for-dentists).",
          "[DentVideo](landing:) is software for the content part: it makes five short education videos a week, checks every script for clinical accuracy and advertising rules, and cuts your own recordings into captioned clips. Posting and replies stay with you or your agency — DentVideo does not publish anything itself. [See a live preview with your logo before you pay](start:). For a side-by-side table, see [how DentVideo compares with an agency, Canva and ChatGPT](video:dentvideo-vs-agency-canva-chatgpt).",
        ],
      },
    ],
    faq: [
      { q: "Is a dental marketing agency worth it?", a: "It saves time, but it can be risky if it does not know health-advertising rules. What matters most is that a dentist approves every post before it goes live." },
      { q: "Who is responsible for an agency's mistakes?", a: "In front of regulators and boards, usually the practice and the dentist. Put the approval process and responsibilities in the contract." },
      { q: "Is software enough to run dental social media?", a: "It can be enough to produce content consistently. Replying to messages and the final check still sit with the practice." },
      { q: "Who should own the social media accounts?", a: "Always the practice. Give access through roles rather than shared personal passwords, so you never lose the account when you change provider." },
      { q: "How much of the dentist's time does it take?", a: "A fixed quarter of an hour a week is often enough for approval when content arrives already checked. Add about five minutes if you record yourself." },
    ],
    sources: [GDC, CAP, FTC_ADS, HHS],
  },
];
