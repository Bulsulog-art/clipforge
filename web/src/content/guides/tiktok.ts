import type { Guide } from "../dentvideo";

// "TikTok for dentists": a real, distinct search in the US and UK that the
// Instagram guide only touches. Written from TikTok's own published rules and
// the US/UK advertising rules the other guides already cite; no invented
// view counts, growth figures or "go viral" promises.

const TIKTOK_INTEGRITY = {
  label: "TikTok Community Guidelines — Integrity and authenticity (AI-generated content labels, unoriginal content)",
  url: "https://www.tiktok.com/community-guidelines/en/integrity-authenticity",
};
const FTC_ENDORSEMENTS = { label: "FTC — Endorsements, influencers and reviews (business guidance)", url: "https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews" };
const ADA_INFLUENCERS = {
  label: "ADA News (February 2025) — ADA Code updates address ethical concerns with social media influencers",
  url: "https://adanews.ada.org/ada-news/2025/february/ada-code-updates-address-ethical-concerns-with-social-media-influencers/",
};
const GDC_SOCIAL = { label: "General Dental Council — Guidance on using social media", url: "https://www.gdc-uk.org/docs/default-source/guidance-documents/guidance-on-using-social-media" };

export const TIKTOK_EN: Guide = {
  locale: "en",
  slug: "tiktok-for-dentists",
  topic: "tiktok-for-dentists",
  category: "video",
  published: "2026-11-15",
  updated: "2026-11-15",
  reviewed: "2026-11-15",
  title: "TikTok for dentists: what to post, how often, and what to keep off it",
  seoTitle: "TikTok for dentists: what to post and what to avoid",
  seoDescription: "A practical TikTok guide for dental practices: which videos patients watch, captions and search, sounds, AI labels, posting rhythm and the ad rules.",
  description: "A practical guide to TikTok for dental practices: videos that help patients, how TikTok search works for a local clinic, sounds, AI labels, posting rhythm and the ad rules that still apply.",
  h1: "TikTok for dentists: what to post, how often, and what to keep off it",
  intro:
    "TikTok works for a dental practice when it is used the same way as a good chairside conversation: short vertical videos that answer one real patient question clearly, posted on a rhythm the team can keep. A clinic does not need dances or trends. It needs useful answers, captions, honest wording and a quick check against the advertising and privacy rules before each post.",
  sections: [
    {
      heading: "Is TikTok worth it for a dental practice?",
      paragraphs: [
        "It depends on who you treat and how much time you have. TikTok shows short videos to people who do not follow you yet, so a useful answer can reach local people who have never heard of the practice. Many people also use TikTok to look things up, typing questions such as “do whitening strips hurt your teeth” into its search bar the way they would into Google.",
        "It is less useful if your patients are mostly people who rarely use the app, or if nobody on the team can give it an hour or two a week. A small rhythm on Instagram and TikTok with the same videos is usually more realistic than a separate strategy for each platform. If you already post Reels, our guide to [Instagram videos for dentists](guide:instagram-videos-for-dentists) covers the shared basics.",
      ],
    },
    {
      heading: "What should a dentist post on TikTok?",
      paragraphs: [
        "The questions patients ask at the chair are the most reliable source of topics, because they are what people type into the search bar. One question per video keeps each one short and easy to find.",
      ],
      list: [
        "Myths, answered calmly: does whitening damage enamel, is flossing really needed, do electric brushes clean better",
        "What to expect: what happens at a first check-up, how a filling is done, the steps of an implant",
        "Aftercare: the first day after an extraction, eating with aligners, sensitivity after whitening",
        "Prevention: brushing technique, children's first visit, what bleeding gums can mean",
        "The team: who people will meet at reception and in the chair, in their own words",
        "The practice: how to find the entrance, what the waiting area looks like, how appointments work",
      ],
      after: [
        "For a full year of topics, use the [dental social media content calendar](guide:dental-social-media-content-calendar) or the longer list of [dental social media post ideas](guide:dental-social-media-post-ideas).",
      ],
    },
    {
      heading: "How should a TikTok video for a clinic be made?",
      paragraphs: [
        "Film vertically (9:16, for example 1080 × 1920). Put the question on screen and say it in the first second, give the answer in two or three plain sentences, and end with a calm next step such as “ask us at your next check-up”. Most patient questions fit in 20 to 45 seconds.",
        "Add captions to every video. Many people watch with the sound off, and the words on screen, the spoken words and the caption text all help TikTok understand what the video is about when someone searches. Write the caption the way a patient would phrase the question, then add a few plain hashtags that describe the topic and your town, not a long block of popular tags.",
      ],
      table: {
        caption: "A TikTok video for a dental clinic, second by second",
        columns: ["Part", "What it does", "Example"],
        rows: [
          ["First second", "States the question on screen and aloud", "“Does whitening damage your enamel?”"],
          ["Answer", "Two or three plain sentences, hedged where it matters", "“For most people, no. Sensitivity for a day or two is the common side effect.”"],
          ["Context", "When to ask a dentist", "“If it lasts longer, tell us at your check-up.”"],
          ["Close", "The clinic name and a calm next step, no offer", "“Questions? Ask us at your next visit.”"],
        ],
      },
    },
    {
      heading: "Can a dental clinic use trending sounds?",
      paragraphs: [
        "Be careful. Music on TikTok is licensed for personal use; business accounts are generally limited to sounds cleared for commercial use, which TikTok offers in its commercial sound library. Using a popular song on a clinic's business account can get the sound muted or the video removed. A voice explaining something clearly needs no music at all, or only quiet background audio from the commercial library.",
        "Trends that make fun of patients, show anyone in the chair without written consent, or turn treatment into a joke are risky for a health professional even when they are popular. The GDC and the ADA both remind dentists that professional standards apply on social media as everywhere else.",
      ],
    },
    {
      heading: "Do AI-made videos need a label on TikTok?",
      paragraphs: [
        "TikTok's Community Guidelines require creators to label AI-generated or significantly edited content that shows realistic-looking scenes or people, and say unlabeled content may be removed, restricted or labeled by TikTok. If a video uses a synthetic voice or realistic generated visuals, turn on the AI-generated content setting when you post. It costs nothing and keeps the account in good standing.",
        "The same guidelines say content that only reuses other people's material without adding anything new is not eligible for the For You feed. Post your own videos natively: upload the original file rather than a download from another app with its watermark.",
      ],
    },
    {
      heading: "How often should a clinic post on TikTok?",
      paragraphs: [
        "TikTok does not publish a required posting frequency, and claims that daily posting is necessary come mostly from agencies selling it. Two to four videos a week that you can keep up all year is a sensible start for most practices, and the same videos can go to Instagram Reels and YouTube Shorts. With a business or creator account, TikTok's analytics show when your followers are active, which is a better guide to timing than any general chart. Our guide on [how often a dental practice should post](guide:how-often-should-a-dental-practice-post) goes into rhythms by the time you have.",
      ],
    },
    {
      heading: "Which rules apply to a dental practice's TikTok?",
      paragraphs: [
        "A clinic's TikTok is advertising for the practice, so the same rules apply as on the website. In the US that means the FTC's truth-in-advertising and endorsement rules, the ADA Code of Ethics (updated in 2025 with influencer guidance) and your state dental board's advertising rules. In the UK it means the GDC standards and the CAP Code. The [US dental advertising rules](guide:dental-advertising-rules-us) and [UK rules](guide:dental-advertising-rules-uk-gdc-asa) guides go into detail.",
      ],
      list: [
        "No promised results, “guaranteed”, “permanent” or “painless” claims",
        "No before-and-after clips or patient stories without written consent, and none where your rules restrict them",
        "No prices, discounts or giveaways in posts where your market restricts them",
        "Disclose any paid partnership or free product, as the FTC's endorsement rules require",
        "Never film patients, charts or screens with patient data in view; see [patient consent on dental social media](guide:patient-consent-dental-social-media)",
      ],
      after: [
        "Our free [“Is my post allowed?” checker](checker:) gives a first pass on any caption in seconds. It is a filter, not legal advice.",
      ],
    },
    {
      heading: "How can a clinic keep TikTok going without filming every day?",
      ordered: true,
      paragraphs: ["Clinics that keep a TikTok alive for a year usually batch the work:"],
      list: [
        "Collect the week's patient questions at the chair.",
        "Film or approve all of the week's videos in one sitting.",
        "Check every caption against the advertising rules.",
        "Schedule them, and post the same files to Reels and Shorts.",
        "Once a month, look at which questions people watched to the end and make more of those.",
      ],
      after: [
        "[DentVideo](landing:) was made for this rhythm. Every Monday it makes five narrated, captioned vertical patient-education videos in your clinic's colors, each software-checked for clinical accuracy and advertising rules. You approve, download and post them yourself, to TikTok, Instagram or both; DentVideo does not post for you. [See a live preview with your logo](start:) before choosing a plan.",
      ],
    },
  ],
  faq: [
    { q: "Should a dentist have a personal or a practice TikTok?", a: "A practice account under the clinic's name is simpler to hand over and to keep within advertising rules. A dentist's personal account that talks about their work is still treated as professional communication." },
    { q: "Can dentists use TikTok ads?", a: "Yes, but paid ads have their own TikTok advertising policies for health services on top of national advertising rules. Many clinics start with organic educational videos and only consider ads later." },
    { q: "Can I repost my Instagram Reels on TikTok?", a: "Yes. Upload the original vertical file to each platform instead of a download with another app's watermark, and shorten the caption for each one." },
    { q: "Do I need to show my face on TikTok?", a: "No. Narrated, captioned explainers work without a face. Short clips of the dentist answering questions often build the most trust when someone has the time to film." },
  ],
  sources: [TIKTOK_INTEGRITY, FTC_ENDORSEMENTS, ADA_INFLUENCERS, GDC_SOCIAL],
};
