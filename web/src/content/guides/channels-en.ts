import type { Guide } from "../dentvideo";

// English channel guides (US/UK first), 2026-11-22: YouTube Shorts, the waiting
// room screen, Google Business Profile, Instagram captions and videos without
// filming yourself. Platform facts were read on the official help pages on
// 2026-11-22 (YouTube Help, Google Business Profile Help, GOV.UK). The
// Instagram hashtag cap of five per post was announced by Instagram in
// December 2025 and reported widely; the guide tells readers to check the app.
// No statistics, no prices, no percentages (the content tests forbid them).

const YT_SHORTS = { label: "YouTube Help: Get started creating YouTube Shorts", url: "https://support.google.com/youtube/answer/10059070" };
const YT_THREE_MIN = { label: "YouTube Help: Understand three-minute YouTube Shorts", url: "https://support.google.com/youtube/answer/15424877" };
const YT_HEALTH = { label: "YouTube Help: Apply to be a source in YouTube health features", url: "https://support.google.com/youtube/answer/12796915" };
const YT_MEDICAL = { label: "YouTube Help: Medical misinformation policy", url: "https://support.google.com/youtube/answer/13813322" };
const YT_GENAI = { label: "YouTube Help: Disclosing use of GenAI content", url: "https://support.google.com/youtube/answer/14328491" };
const GBP_MEDIA = { label: "Google Business Profile Help: Manage your Business Profile photos and videos (video guidelines)", url: "https://support.google.com/business/answer/6103862" };
const GBP_POSTS = { label: "Google Business Profile Help: Create and manage posts on your Business Profile", url: "https://support.google.com/business/answer/7342169" };
const GBP_POLICY = { label: "Google Business Profile Help: Photos, videos and posts content policy", url: "https://support.google.com/business/answer/7213077" };
const GBP_REVIEWS = { label: "Google Business Profile Help: Manage customer reviews", url: "https://support.google.com/business/answer/3474050" };
const GOVUK_MUSIC = { label: "GOV.UK: Licence to play live or recorded music (TheMusicLicence)", url: "https://www.gov.uk/licence-to-play-live-or-recorded-music" };
const HHS_PRIVACY = { label: "U.S. Department of Health and Human Services: HIPAA Privacy Rule for professionals", url: "https://www.hhs.gov/hipaa/for-professionals/privacy/index.html" };
const GDC_SM = { label: "General Dental Council: Guidance on using social media", url: "https://www.gdc-uk.org/docs/default-source/guidance-documents/guidance-on-using-social-media" };
const CAP_CODE = { label: "ASA and CAP: The UK Code of Non-broadcast Advertising and Direct and Promotional Marketing (CAP Code)", url: "https://www.asa.org.uk/codes-and-rulings/advertising-codes/non-broadcast-code.html" };

const DATE = "2026-11-22";

const YOUTUBE_SHORTS: Guide = {
  locale: "en",
  slug: "youtube-shorts-for-dentists",
  category: "video",
  published: DATE,
  updated: "2026-11-23",
  reviewed: DATE,
  title: "YouTube Shorts for dentists: what to post, how long, and what YouTube's health rules mean for you",
  seoTitle: "YouTube Shorts for dentists: what to post",
  seoDescription: "What a dental practice should post as YouTube Shorts, how long they can be, how Shorts differ from Reels and TikTok, and YouTube's health and AI rules.",
  description: "A guide for dental practices on YouTube Shorts: topics patients search for, length and format, titles, YouTube's medical misinformation and AI disclosure rules, and reusing videos.",
  h1: "YouTube Shorts for dentists",
  intro:
    "YouTube Shorts are vertical videos of up to three minutes that YouTube shows in the Shorts feed and search. For a dental practice they are an easy second home for the patient education videos you make for Instagram or TikTok. Because YouTube is also a search engine, a Short titled with a patient's exact question can be found for months.",
  takeaways: [
    "Shorts are vertical videos of up to three minutes, found in the Shorts feed and in search.",
    "Title each Short with the patient's question in their own words, and put the practice name in the description.",
    "YouTube removes content that contradicts health authorities' guidance, so stay with mainstream advice.",
    "Disclose realistic AI content, and never use an AI voice or face that imitates a real dentist.",
  ],
  sections: [
    {
      heading: "Why should a dental practice bother with YouTube Shorts?",
      paragraphs: [
        "Patients search YouTube the way they search Google: “what happens during a root canal”, “is teeth whitening safe”, “how long does an implant take to heal”. A clear answer from a real practice in their area is useful to them and builds the familiarity that makes booking easier. YouTube also belongs to Google, and YouTube videos often appear in Google search results for how-to and explanation queries.",
        "Shorts need no new content plan. The vertical, captioned videos you post as Reels or TikToks are the right shape already. What changes is the title, the description and a little more attention to the question each video answers.",
      ],
    },
    {
      heading: "How long can a YouTube Short be, and what format works?",
      paragraphs: [
        "YouTube's help pages describe Shorts as vertical (or square) videos of up to three minutes. You can record them in the YouTube app or upload a vertical video from your phone or computer. For patient education, shorter is still kinder: most single questions can be answered well in 20 to 60 seconds, and the three-minute limit is useful for the few topics that need a step-by-step walk-through, such as aftercare after an extraction.",
      ],
      list: [
        "Vertical 9:16, the same file you post as a Reel or TikTok.",
        "Burned-in captions, because many people watch with the sound off.",
        "One question per video, asked in the first second or two.",
        "A calm closing line: “ask us at your next check-up” rather than a sales push.",
        "No other platform's watermark: export the clean file and upload that.",
      ],
    },
    {
      heading: "What should dentists post as Shorts?",
      paragraphs: [
        "The topics that work are the ones patients search for. Start with the questions your front desk answers every week, then the treatments you offer. Our [52-week dental content calendar](guide:dental-social-media-content-calendar) and the [dental social media post ideas](guide:dental-social-media-post-ideas) list give you a year of them. Good Shorts topics include:",
      ],
      list: [
        "Myths: “does whitening damage enamel?”, “do I need to see a dentist if nothing hurts?”",
        "What happens during a procedure: a filling, a crown, a root canal, a scale and polish.",
        "Aftercare: the first day after an extraction, eating with a new crown, cleaning around an implant.",
        "Children: first visit, thumb sucking, fluoride, sports mouthguards.",
        "Everyday habits: flossing or interdental brushes, electric or manual brushes, snacking and acid.",
      ],
      after: [
        "Treatment-specific scripts and the wording to avoid are in our guides on [implant](guide:dental-implant-patient-education-videos), [whitening](guide:teeth-whitening-patient-education-videos) and [root canal](guide:root-canal-patient-education-videos) patient education videos.",
      ],
    },
    {
      heading: "How should you title and describe a dental Short?",
      paragraphs: [
        "Write the title as the patient's question, in their words: “How long does a dental implant take?” beats “Implant journey” or a string of emojis. Put the practice name in the description, not the title. In the description, add two or three plain sentences that repeat the answer, your town or city if it is natural, and a note that the video is general information and not a diagnosis.",
        "A few hashtags in the description are fine; they help YouTube file the video, not much more. Avoid tags or titles that make claims a regulator would object to, such as “painless”, “guaranteed” or “the town's top dentist”. Those are as much advertising on YouTube as anywhere else; see the [US](guide:dental-advertising-rules-us) and [UK](guide:dental-advertising-rules-uk-gdc-asa) rules.",
      ],
    },
    {
      heading: "What do YouTube's health rules mean for a dental practice?",
      paragraphs: [
        "YouTube's medical misinformation policy removes content that contradicts health authorities' guidance on topics such as prevention, treatment and the safety of approved treatments. Mainstream dental advice is far from that line, but avoid presenting fringe claims (for example, that fluoride is dangerous at normal levels) as fact.",
        "YouTube also runs health source information panels and a health content shelf for vetted sources. As of this guide's review date, the individual application is open in a list of countries including the US and the UK, and the professions YouTube lists are licensed doctors, nurses, psychologists, marriage and family therapists and clinical social workers. Dentists are not on that list, so do not plan your channel around getting the label. It also requires a channel focused mainly on health with a minimum level of watch time.",
      ],
    },
    {
      heading: "Do AI-made or narrated Shorts need an AI label?",
      paragraphs: [
        "YouTube asks creators to disclose realistic content that is made or meaningfully altered with AI, such as making a real person appear to say something they did not say, or a realistic scene that did not happen. Its own examples of what does not need disclosure include using AI to help write a script, creating captions and clearly non-realistic animation. A narrated explainer that does not pretend to be a real dentist speaking is usually outside the rule, but read the current list and tick the “AI use” box in YouTube Studio when in doubt.",
        "Never use an AI voice or face that imitates a real dentist, and never present synthetic footage as a real patient's result.",
      ],
    },
    {
      heading: "How often should a practice post Shorts?",
      paragraphs: [
        "There is no frequency YouTube requires. A rhythm you can keep up, such as two to five a week posted alongside Reels and TikToks, matters more than a burst followed by silence. Our guide on [how often a dental practice should post](guide:how-often-should-a-dental-practice-post) covers timing per platform, and [TikTok for dentists](guide:tiktok-for-dentists) covers what differs on TikTok.",
        "If making the videos is the bottleneck, [DentVideo](landing:) delivers five finished, narrated and captioned vertical patient-education videos every Monday in your practice's colors and logo, with every script software-checked for clinical accuracy and advertising rules. You approve each one and upload it to YouTube, Instagram or TikTok yourself. You can [see a free preview of your own videos](start:) before choosing a plan.",
      ],
    },
  ],
  faq: [
    { q: "How long can a YouTube Short be?", a: "Up to three minutes, in a vertical or square format, according to YouTube's help pages. For a single patient question, 20 to 60 seconds is usually enough." },
    { q: "Can I post the same video as a Reel, a TikTok and a Short?", a: "Yes. Upload the clean vertical file without another app's watermark, and rewrite the title and description for YouTube as the question a patient would search." },
    { q: "Can a dentist get YouTube's health source label?", a: "Not on the current individual criteria: YouTube lists licensed doctors, nurses, psychologists, marriage and family therapists and clinical social workers. Check YouTube's help page, as the list may change." },
    { q: "Do I have to label narrated videos as AI?", a: "YouTube requires disclosure for realistic AI content that could mislead, such as a real person appearing to say something they did not. Scripts and captions made with AI do not need it. When unsure, disclose." },
    { q: "Should Shorts link to our booking page?", a: "A link in the description or channel is fine where your market allows it. Keep the video itself educational and the call to action calm, without urgency or offers." },
    { q: "Is this legal advice?", a: "No. It is general information about YouTube's published policies and US and UK advertising rules as of the review date." },
  ],
  sources: [YT_SHORTS, YT_THREE_MIN, YT_MEDICAL, YT_HEALTH, YT_GENAI],
};

const WAITING_ROOM: Guide = {
  locale: "en",
  slug: "dental-waiting-room-tv-videos",
  category: "video",
  published: DATE,
  updated: "2026-11-23",
  reviewed: DATE,
  title: "Dental waiting room TV: what to show patients, and what to keep off the screen",
  seoTitle: "Dental waiting room TV: what to show patients",
  seoDescription: "What a dental practice should play on its waiting room screen: patient-education topics, sound, captions, music licenses, privacy and how to keep it fresh.",
  description: "A practical guide to dental waiting room TV: which patient-education videos to show, sound and captions, screen format, music licensing in the UK, patient privacy, and how to keep the loop up to date.",
  h1: "Dental waiting room TV: what to show patients",
  intro:
    "A waiting room screen is most useful as quiet patient education: short, captioned videos that answer the questions patients are about to ask, played without sound or with sound low. It should calm people and inform them, not sell to them. Keep it to your own treatments, refresh it regularly, and keep anything that identifies a patient off the screen.",
  takeaways: [
    "Use the screen for quiet patient education: short, captioned videos that answer the questions patients are about to ask.",
    "Play videos without sound or with the sound low.",
    "In the UK, playing music at a business usually needs a license.",
    "Keep anything that identifies a patient off the screen, and refresh the loop every week or two.",
  ],
  sections: [
    {
      heading: "What should a dental waiting room screen show?",
      paragraphs: [
        "Think about who is sitting there: patients waiting for their own appointment, parents with children, people who are anxious. The most useful content answers what they are wondering in that moment, in plain language, in under a minute per video.",
      ],
      list: [
        "What happens at a check-up, a scale and polish, a filling or a root canal, explained calmly.",
        "Aftercare for common treatments, so patients hear it before they need it.",
        "Prevention: brushing technique, interdental cleaning, sugar and acid, mouthguards for sport.",
        "Children's topics while families wait: first visit, teething, fluoride, thumb sucking.",
        "Practical information: how to cancel, emergency contact routes, accessibility and parking.",
        "The treatments you offer, explained as education (what it is, who it may suit, what to ask), never as an offer.",
      ],
      after: [
        "For a deeper list of patient-education topics and how to make them accurate, see [patient-education videos for dental clinics](guide:patient-education-videos).",
      ],
    },
    {
      heading: "Should waiting room videos have sound?",
      paragraphs: [
        "Usually not, or very low. Sound in a small room competes with the front desk, phone calls and conversation, and repeated narration wears on staff by the second hour. Burned-in captions let patients follow every word in silence. If you play sound, keep it low and make sure the loop is long enough that people waiting a while do not hear the same video three times.",
        "Captions also help patients who are hard of hearing and those whose first language is different from yours. If many of your patients speak another language, a few videos in that language are a thoughtful touch.",
      ],
    },
    {
      heading: "Do you need a license to play music or TV in a dental waiting room?",
      paragraphs: [
        "In the UK, GOV.UK says you usually need a license to play live or recorded music in public or at your business, including background music from a radio or music channel, and that the license is TheMusicLicence from PPL PRS. Royalty-free music does not need it. Playing broadcast TV on the screen also raises TV licensing questions. In the US, playing commercial music or streaming playlists in a business can require licenses from performing rights organizations.",
        "The simplest route is to play your own videos with no music, or with music the video maker has the right to use for public display, and to check with the licensing bodies if you also play radio or TV.",
      ],
    },
    {
      heading: "What should never appear on a waiting room screen?",
      paragraphs: [
        "Patient privacy matters more in a waiting room than anywhere else, because the audience is other patients. Under HIPAA in the US and UK GDPR and the GDC's confidentiality standards in the UK, nothing that identifies a patient belongs on a shared screen without a clear, specific consent.",
      ],
      list: [
        "No patient names, appointment lists or “now serving” boards with full names.",
        "No before-and-after photos or videos without written consent that covers display in the practice; see [patient consent on dental social media](guide:patient-consent-dental-social-media).",
        "No patient testimonials or reviews presented as endorsements, which advertising rules restrict in many markets.",
        "No prices, discounts or “limited time” offers, which can turn education into regulated advertising.",
        "No live news channels, which can show distressing content to anxious patients and children.",
      ],
    },
    {
      heading: "What screen format and setup works?",
      paragraphs: [
        "Most waiting room TVs are landscape, while most short patient-education videos today are vertical, because they are made for phones. A vertical video on a landscape screen plays with bars on both sides, which is fine and often looks deliberate if the bars match your brand color. Some practices mount a second screen in portrait so phone-format videos fill it. A media player, a smart TV's USB playback or a simple digital signage app can loop a folder of MP4 files.",
        "Place the screen where people can see it without facing each other, not opposite the reception desk where staff would watch it all day.",
      ],
    },
    {
      heading: "How do you keep a waiting room loop fresh?",
      paragraphs: [
        "A loop that never changes becomes wallpaper. Regular patients notice the same five videos within a couple of visits. Add new videos every week or two, retire seasonal ones (holiday sweets, back-to-school check-ups) when the season ends, and match topics to what you see in the diary: more children's content in school holidays, more aftercare on surgery days.",
        "The same videos can go on your website and social media, which keeps the work in one place. Our [52-week content calendar](guide:dental-social-media-content-calendar) gives a year of topics. [DentVideo](landing:) delivers five new narrated, captioned patient-education videos every Monday in your practice's colors and logo, checked for clinical accuracy and advertising rules before you approve them, as MP4 files you can download for the waiting room screen and post online. You can [see a free preview of your own videos](start:) before choosing a plan.",
      ],
    },
  ],
  faq: [
    { q: "How long should a waiting room video be?", a: "Short: 20 to 60 seconds per topic, in a loop of many topics, so a patient waiting a few minutes sees several different answers rather than one long film." },
    { q: "Is a waiting room screen advertising?", a: "It can be. Content about your own treatments shown to patients is often treated as promotion, so keep it educational and free of promises, prices and testimonials." },
    { q: "Can we show before-and-after photos in the waiting room?", a: "Only with written consent that specifically covers display in the practice, and only where your advertising rules allow them. Many practices leave them off the screen entirely." },
    { q: "Do we need a music license in the UK?", a: "Usually yes if you play recorded music, radio or a music channel at your business, according to GOV.UK; the license is TheMusicLicence from PPL PRS. Royalty-free music does not need one." },
    { q: "Can we use our social media videos on the waiting room TV?", a: "Yes, if they are captioned and educational. Vertical videos play with side bars on a landscape screen, or fill a screen mounted in portrait." },
  ],
  sources: [GOVUK_MUSIC, HHS_PRIVACY, GDC_SM, CAP_CODE],
};

const GOOGLE_PROFILE: Guide = {
  locale: "en",
  slug: "google-business-profile-for-dentists",
  category: "ideas",
  published: DATE,
  updated: "2026-11-23",
  reviewed: DATE,
  title: "Google Business Profile for dentists: posts, photos and videos that help patients choose you",
  seoTitle: "Google Business Profile posts for dentists",
  seoDescription: "What a dental practice should post on its Google Business Profile: update ideas, video rules, photos, reviews and what Google and ad rules do not allow.",
  description: "A guide for dental practices on Google Business Profile: what to post as updates, Google's video and photo requirements, scheduling, reviews, privacy and advertising rules, and how to keep it current.",
  h1: "Google Business Profile for dentists: posts, photos and videos",
  intro:
    "Your Google Business Profile is often the first thing a patient sees when searching for a dentist nearby: hours, reviews, photos and your latest posts, on Google Search and Maps. Keeping it current with real photos, short educational updates and calm review replies takes little time. Google allows videos of up to 30 seconds and scheduled posts.",
  takeaways: [
    "The Google Business Profile is often the first thing patients see when they search for a dentist nearby.",
    "Short educational updates, real photos and calm review replies keep it current without much time.",
    "As of the review date, profile videos can be up to 30 seconds long, up to 75 MB and 720p or higher.",
    "Never confirm in a review reply that the reviewer is a patient.",
  ],
  sections: [
    {
      heading: "Why does the Google Business Profile matter for a dental practice?",
      paragraphs: [
        "People looking for a dentist usually search with a place in mind: “dentist near me”, “emergency dentist in Leeds”, “pediatric dentist Austin”. The profile that appears answers their first practical questions before they visit your website. An empty or outdated profile, with old photos and no recent posts, gives a weaker first impression than a practice that clearly looks after it.",
        "The basics come first: correct name, address, phone number, opening hours (including holiday hours), categories, services and a link to your booking page. Posts and videos sit on top of that foundation.",
      ],
    },
    {
      heading: "What kinds of posts can a dentist publish?",
      paragraphs: [
        "Google Business Profile offers three post types. Updates share information about your business with a description, photo or video and an action button. Offers need a title and dates. Events have start and end dates. According to Google's help page, posts appear under Updates or Overview on mobile and in the “From the owner” section on a computer, on both Search and Maps, and posts older than six months are archived unless they have a date range.",
        "For a dental practice, updates are the workhorse. Offers are the risky type: discounts and free treatment offers are restricted by advertising rules in many markets, so use them only if your rules allow and the offer is plainly worded.",
      ],
      table: {
        caption: "Google Business Profile post ideas for a dental practice",
        columns: ["Post idea", "What to include", "What to avoid"],
        rows: [
          ["A patient question answered", "A short captioned video and two sentences repeating the answer", "Claims of results, “painless”, “guaranteed”"],
          ["Holiday or changed opening hours", "Dates, how to reach you in an emergency", "Phone numbers typed in the text; use the Call button"],
          ["Meet the team", "Name, role and a friendly line, with their consent", "Credentials the person does not hold"],
          ["New service or equipment", "What it is and who it may suit, as education", "Superlatives such as “the most advanced in town”"],
          ["Seasonal reminder", "Back-to-school check-ups, sports mouthguards, holiday sweets", "Urgency or “book now before it's too late”"],
        ],
      },
    },
    {
      heading: "What are Google's rules for videos and photos on a Business Profile?",
      paragraphs: [
        "Google's video guidelines for a Business Profile, as of this guide's review date: up to 30 seconds long, up to 75 MB, and 720p or higher resolution. Videos and photos appear only after the profile is verified. A short vertical patient-education video fits, but trim anything longer than 30 seconds before you upload it.",
        "Google's content policy applies to everything you upload and post, and you remain responsible for meeting the laws that apply to you. Google may also remove posts with contact details it cannot verify, such as phone numbers, email addresses or social media handles typed into the text; use the built-in Call now or link button instead.",
      ],
      list: [
        "Real photos of the outside of the building and the entrance, so patients recognize it.",
        "Reception, waiting room and a treatment room, tidy and with no screens or paperwork showing patient details.",
        "The team, with each person's permission.",
        "Short captioned videos answering common questions.",
        "No stock photos of smiling models presented as your patients, and no before-and-after images without consent and a check of your rules.",
      ],
    },
    {
      heading: "How often should a practice post on Google Business Profile?",
      paragraphs: [
        "Google does not publish a required frequency. A steady rhythm such as one update a week is realistic and keeps the profile looking cared for. Google lets you schedule a post for later and set some posts to repeat, so a month of updates can be prepared in one sitting. Our guide on [how often a dental practice should post](guide:how-often-should-a-dental-practice-post) covers the other platforms.",
        "The easiest source of posts is the content you already make for Instagram and TikTok: the same short video, trimmed to 30 seconds, with a two-sentence description. Our [dental social media post ideas](guide:dental-social-media-post-ideas) give a year of topics.",
      ],
    },
    {
      heading: "How should a practice handle Google reviews?",
      paragraphs: [
        "Reviews are part of the profile patients read most. Reply to them, but never confirm that the reviewer is a patient or mention any treatment, visit or bill: under HIPAA in the US, and under confidentiality duties in the UK, that is protected information even when the reviewer posted it first. Our guide on [responding to negative dental reviews without breaking HIPAA](guide:how-to-respond-to-negative-dental-reviews-hipaa) has safe reply templates.",
        "You may ask patients for reviews, but ask everyone, not only happy patients, and offer nothing in exchange. Google explains in its help pages how to reply to reviews and how to report one that breaks its policies.",
      ],
    },
    {
      heading: "Are Business Profile posts advertising?",
      paragraphs: [
        "In most markets, yes. What a practice publishes about itself to attract patients is treated as advertising, whatever the channel. The same rules apply as on Instagram: no misleading claims, no guarantees of results, careful use of testimonials, and in the UK the GDC's standards and the CAP Code. See [dental advertising rules in the US](guide:dental-advertising-rules-us) and [in the UK](guide:dental-advertising-rules-uk-gdc-asa). You can paste a post into our free [“Is my post allowed?” ad checker](checker:) to catch common restricted wording before you publish; it is a careful filter, not legal advice.",
        "If you want a steady supply of short videos for your profile and social media, [DentVideo](landing:) delivers five narrated, captioned patient-education videos every Monday in your practice's colors and logo, each checked for clinical accuracy and advertising rules before you approve it. You download them and post them yourself. You can [see a free preview of your own videos](start:) before choosing a plan.",
      ],
    },
  ],
  faq: [
    { q: "How long can a Google Business Profile video be?", a: "Up to 30 seconds, up to 75 MB and at least 720p, according to Google's video guidelines as of the review date. Trim longer videos before uploading." },
    { q: "Do Google Business Profile posts expire?", a: "Google's help page says posts older than six months are archived unless a date range is set. Regular updates keep the profile current." },
    { q: "Can I put our phone number in a post?", a: "Google may remove posts with contact details it cannot verify. Use the Call now button, which uses the verified phone number on your profile." },
    { q: "Can a dental practice post offers or discounts?", a: "Google allows Offer posts, but advertising rules in many markets restrict discounts and free treatment offers for dental services. Check your rules first, or stick to educational updates." },
    { q: "Can I reply to reviews by name?", a: "Avoid it. A reply should never confirm that someone is a patient or mention their care. A short, general reply that invites them to contact the practice is safer." },
  ],
  sources: [GBP_MEDIA, GBP_POSTS, GBP_POLICY, GBP_REVIEWS],
};

const CAPTIONS: Guide = {
  locale: "en",
  slug: "dental-instagram-captions",
  category: "ideas",
  published: DATE,
  updated: "2026-11-23",
  reviewed: DATE,
  title: "Dental Instagram captions: templates, hashtags and the wording to avoid",
  seoTitle: "Dental Instagram captions: templates and hashtags",
  seoDescription: "How to write Instagram captions for a dental practice: a simple structure, templates by post type, how many hashtags to use and wording ad rules restrict.",
  description: "Instagram captions for dental practices: a three-part structure, templates for education, aftercare, team and seasonal posts, hashtags and the claims ad rules restrict.",
  h1: "Dental Instagram captions: templates, hashtags and wording to avoid",
  intro:
    "A good dental Instagram caption repeats the patient's question, answers it in one or two plain sentences and ends with a calm invitation to ask. It does not promise results, mention prices or call anything “painless”. Instagram now allows at most five hashtags per post, so choose a few precise topic and place tags rather than a long block.",
  takeaways: [
    "Open with the patient's question, answer it in one or two plain sentences and close with a calm invitation to ask.",
    "Instagram allows at most five hashtags per post, so choose a few precise topic and place tags.",
    "A caption is advertising text: no promises, no prices and nothing called “painless”.",
    "Mention a patient only with written consent for that specific use.",
  ],
  sections: [
    {
      heading: "What makes a dental caption work?",
      paragraphs: [
        "Most people decide in the first line whether to keep reading, and Instagram shows only that line before “more”. So the first line should be the question the post answers, in the words a patient uses: “Can whitening make your teeth sensitive?” rather than “Whitening Wednesday!”.",
        "After that, keep it short. Two or three sentences with the core answer, a hedge where the answer depends on the person (“usually”, “for most people”, “ask your dentist”), and one closing line. Captions are also read by Instagram's search, so plain words about the topic help people find the post.",
      ],
      list: [
        "Line one: the patient's question.",
        "Lines two and three: the answer in plain language, hedged where it depends on the person.",
        "Last line: a calm invitation, such as “Ask us at your next check-up.”",
        "Then a few hashtags, and your location tag on the post itself.",
      ],
    },
    {
      heading: "Which caption templates can a dental practice reuse?",
      paragraphs: [
        "Templates save time as long as each caption still answers one real question. Adapt these to your treatments and your voice:",
      ],
      table: {
        caption: "Dental Instagram caption templates by post type",
        columns: ["Post type", "Template", "Example"],
        rows: [
          ["Patient question", "[Question]? [Short answer]. [When to ask a dentist]. Ask us at your next visit.", "“Do I need to floss if I brush twice a day? Brushing misses the gaps between teeth, which is where floss or small brushes help. If your gums bleed when you clean between them, mention it at your next check-up.”"],
          ["Myth", "Myth: [claim]. What we tell patients: [plain fact, hedged]. Questions? Ask us.", "“Myth: whitening strips damage enamel. What we tell patients: used as directed, whitening products are generally considered safe, though some people get temporary sensitivity. Ask us what suits your teeth.”"],
          ["Aftercare", "Just had [treatment]? For the first [time]: [two or three steps]. Call us if [warning sign].", "“Just had a tooth out? For the first day: no rinsing, no straws, soft food on the other side. Call us if the bleeding does not settle.”"],
          ["Meet the team", "Meet [name], our [role]. [One friendly, true detail]. Say hello next time you visit.", "“Meet Priya, our hygienist. She is the one who will show you how to use interdental brushes. Say hello next time you visit.”"],
          ["Seasonal", "[Season or event] reminder: [one practical tip]. [Calm closing line].", "“Sports season reminder: a mouthguard protects teeth during contact sports. Ask us about the options at your child's next check-up.”"],
        ],
        note: "Examples are illustrative; check clinical statements against your own guidance and your market's advertising rules.",
      },
    },
    {
      heading: "How many hashtags should a dental practice use?",
      paragraphs: [
        "Instagram announced in December 2025 that posts and Reels are limited to five hashtags, after testing lower limits, and has said for some time that hashtags play a small part in reach. Check the current limit in the app, which tells you when you go over it. Five precise tags beat thirty generic ones even where more are allowed.",
        "Mix topic and place: one or two about the subject (for example #dentalimplants or #oralhealth), one about your town or city (#leedsdentist), and your practice's own tag if you use one. Avoid tags that make claims, such as “#bestdentist” or “#painlessdentistry”: they are part of your advertising text, just like the caption.",
      ],
    },
    {
      heading: "What wording should dental captions avoid?",
      paragraphs: [
        "A caption is advertising text in most markets, even under an educational video. The claims below are commonly restricted by dental advertising rules in the US and the UK and in many other countries. The details are in our guides to [US dental advertising rules](guide:dental-advertising-rules-us) and [UK rules under the GDC and the CAP Code](guide:dental-advertising-rules-uk-gdc-asa).",
      ],
      table: {
        caption: "Risky caption wording and calmer alternatives",
        columns: ["Risky wording", "Why it is risky", "Calmer wording"],
        rows: [
          ["“Painless implants”", "An absolute claim no one can promise every patient", "“We explain how we keep you comfortable during treatment”"],
          ["“Guaranteed perfect smile”", "A promise of results", "“We talk through what is realistic for your teeth”"],
          ["“The best dentist in Austin”", "An unverifiable superlative", "“Your local dental team in Austin”"],
          ["“Our patients love us!” with a patient quote", "A testimonial, restricted in many markets", "Leave reviews to the review platforms"],
          ["“Free whitening with every check-up this month”", "A discount or inducement, often restricted", "An educational post about whitening, with no offer"],
        ],
      },
      after: [
        "You can paste a draft caption into our free [“Is my post allowed?” ad checker](checker:) to catch these patterns before you post. It marks each sentence for your country with the reason; it is a careful filter, not legal advice.",
      ],
    },
    {
      heading: "Should captions mention patients?",
      paragraphs: [
        "Only with written consent for that specific use. A caption such as “So happy for Sarah after her veneers!” identifies a patient and their treatment. In the US, that is protected health information under HIPAA without a signed authorization; in the UK, confidentiality and UK GDPR apply. Our guide on [patient consent on dental social media](guide:patient-consent-dental-social-media) covers what a valid consent includes. Educational posts that do not feature a patient avoid the question entirely.",
      ],
    },
    {
      heading: "How can you write captions faster every week?",
      paragraphs: [
        "Batch them. Write a week's captions in one sitting from a list of topics, using the templates above, and have the dentist read them once before they are scheduled. Keep a short list of phrases your practice never uses, and a list of calm closing lines you rotate.",
        "[DentVideo](landing:) does this part with the videos: every Monday it delivers five narrated, captioned patient-education videos in your practice's colors and logo, each with a ready-to-post caption and hashtags, all software-checked for clinical accuracy and advertising rules. You approve and post them yourself. You can [see a free preview of your own videos](start:) before choosing a plan. For topics, see our [dental social media post ideas](guide:dental-social-media-post-ideas).",
      ],
    },
  ],
  faq: [
    { q: "How long should a dental Instagram caption be?", a: "Short: the question, a two or three sentence answer and one closing line. The first line matters most, because Instagram shows only that before “more”." },
    { q: "How many hashtags can I use on Instagram?", a: "Instagram announced a limit of five hashtags per post and Reel in December 2025. Use a few precise topic and place tags, and check the app for the current limit." },
    { q: "Can I use emojis in dental captions?", a: "Yes, in moderation, if they suit your practice's tone. Keep the first line readable as a question and avoid emojis that imply claims, such as a trophy next to your name." },
    { q: "Can a caption say “book now”?", a: "A calm invitation to ask or book is usually fine in the US and the UK. Avoid urgency, limited-time pressure and offers. Some markets, such as Türkiye, restrict booking calls in health posts." },
    { q: "Do captions need a disclaimer?", a: "A short line such as “general information, not a diagnosis” is a sensible habit for educational posts, though no US or UK rule requires a set wording." },
  ],
  sources: [CAP_CODE, GDC_SM, HHS_PRIVACY],
};

const NO_CAMERA: Guide = {
  locale: "en",
  slug: "dental-videos-without-being-on-camera",
  category: "video",
  published: DATE,
  updated: "2026-11-23",
  reviewed: DATE,
  title: "Dental videos without being on camera: formats that work when the dentist does not want to film",
  seoTitle: "Dental videos without being on camera",
  seoDescription: "How a dental practice can post patient-education videos when no one wants to be filmed: narrated explainers, hands-only demos, text videos and AI rules.",
  description: "A guide for dentists who do not want to appear on camera: video formats that still build trust, what to film instead of faces, narration and AI voices, platform disclosure rules and patient privacy.",
  h1: "Dental videos without being on camera",
  intro:
    "A dental practice can post useful videos without anyone on camera. Narrated explainers, hands-only demonstrations, text-led videos and calm footage of the practice all work, as long as each answers one real question accurately. If you use an AI voice, never present it as a real dentist, and follow each platform's AI disclosure rules.",
  takeaways: [
    "Narrated explainers, hands-only demonstrations, text-led videos and footage of objects all work without a face.",
    "Without a dentist on screen the script carries the weight, so have a dentist read every script.",
    "Never present an AI voice as a real dentist, and follow each platform's AI disclosure rules.",
    "Two to five videos a week is realistic for most practices when the work is batched.",
  ],
  sections: [
    {
      heading: "Do dental videos need the dentist on camera?",
      paragraphs: [
        "No. A dentist explaining something on camera builds familiarity quickly, which is why many guides recommend it, including ours on [Instagram videos for dentists](guide:instagram-videos-for-dentists). But a practice that never posts because nobody wants to film helps no patient. Many dentists are uncomfortable on camera, short on time, or work in a team where no single face should represent the practice.",
        "Patients mostly want a clear, calm answer to their question. A well-made explainer without a face does that job, and the practice can add a few videos of the team later, when someone is ready.",
      ],
    },
    {
      heading: "Which video formats work without a face?",
      paragraphs: ["These formats work on Reels, TikTok, YouTube Shorts and the waiting room screen:"],
      table: {
        caption: "Dental video formats that need no one on camera",
        columns: ["Format", "What it looks like", "Good for"],
        rows: [
          ["Narrated explainer", "A voice explains the topic over simple visuals, with captions", "Procedures, myths, prevention"],
          ["Hands-only demo", "Hands demonstrate on a model or with the product, filmed from above", "Brushing, interdental brushes, aligner care, mouthguards"],
          ["Text-led video", "Short lines of text appear one after another over calm footage", "Aftercare steps, practical information, quick tips"],
          ["Practice tour", "Slow footage of the entrance, reception and a treatment room, with captions", "Nervous patients, first visits"],
          ["Voice-only from the dentist", "The dentist's own voice recorded on a phone, over visuals", "Personal tone without being filmed"],
        ],
      },
    },
    {
      heading: "What can you film instead of people?",
      paragraphs: [
        "Objects and places carry a dental video well. A tooth model, a toothbrush and interdental brush, an aligner case, a mouthguard, the view from the chair, the instruments laid out before a check-up (clean and covered), the sterilization area, the reception desk. Film in natural light, vertically, with the phone held steady or resting on something.",
        "Check every frame before posting. Monitors, appointment books, X-rays with names, prescriptions and the corner of another patient's face are the usual privacy problems. Our guide on [patient consent on dental social media](guide:patient-consent-dental-social-media) explains what needs consent; footage with no patient in it avoids the question.",
      ],
    },
    {
      heading: "Can you use an AI voice or AI-made video?",
      paragraphs: [
        "You can, with care. A synthetic narrator reading an accurate, checked script is a practical way to post regularly without recording. Three rules keep it honest. First, never imitate a real person's voice or face, and never make it appear that a real dentist said something they did not. Second, never use synthetic footage to suggest a real patient or a real treatment result. Third, follow each platform's disclosure rules.",
        "YouTube requires creators to disclose realistic content that is made or meaningfully altered with AI, such as a real person appearing to say something they did not, and lists AI help with scripts and captions as not needing disclosure. Instagram and TikTok have their own AI labels. When a video could be mistaken for something real, label it. Our guide to [TikTok for dentists](guide:tiktok-for-dentists) covers TikTok's AI labels.",
      ],
    },
    {
      heading: "How do you keep faceless videos accurate and within the rules?",
      paragraphs: [
        "Without a dentist on screen, the script carries all the weight, so have a dentist read every script before it goes out. Keep each video to one question, hedge where the answer depends on the patient (“usually”, “for most people”, “ask your dentist”), and leave out claims that advertising rules restrict: guarantees, “painless”, superlatives, prices and testimonials.",
        "Those rules apply whatever the format. See [dental advertising rules in the US](guide:dental-advertising-rules-us) and [in the UK](guide:dental-advertising-rules-uk-gdc-asa), and paste a caption into our free [“Is my post allowed?” ad checker](checker:) for a quick check; it is a careful filter, not legal advice.",
      ],
    },
    {
      heading: "How can a practice post weekly without filming?",
      paragraphs: [
        "Pick a format, batch the work, and keep a rhythm you can sustain. Two to five videos a week is realistic for most practices; see [how often a dental practice should post](guide:how-often-should-a-dental-practice-post). Our [dental social media content calendar](guide:dental-social-media-content-calendar) gives you 52 weeks of topics.",
        "[DentVideo](landing:) was built for practices that do not want to film every week. Every Monday it delivers five narrated, captioned vertical patient-education videos in your practice's colors and logo, with no avatar faces and no fake patients: the narration is a synthetic voice and the site says so. Every script is software-checked for clinical accuracy and advertising rules, and nothing is published until the dentist approves it. On the Practice plan, a dentist who is ready can also record a few minutes and get captioned clips of their own voice. You can [see a free preview of your own videos](start:) before choosing a plan.",
        "To weigh this against filming yourself, a stock video library or an agency, see [four ways to get patient education videos](guide:best-way-to-get-patient-education-videos).",
      ],
    },
  ],
  faq: [
    { q: "Do faceless dental videos work?", a: "They can answer patients' questions just as clearly. A face builds familiarity faster, so many practices mix narrated explainers with occasional team videos when someone is ready." },
    { q: "Is it allowed to use an AI voice for dental videos?", a: "Generally yes, if the voice does not imitate a real person and the video does not pretend a real dentist is speaking. Follow each platform's AI disclosure rules." },
    { q: "What should I film if I do not want to be on camera?", a: "Tooth models, toothbrushes and interdental brushes, aligner cases, the practice entrance and reception, and a clean treatment room, with no screens or paperwork showing patient details." },
    { q: "Can I use stock footage of smiling people?", a: "Use it sparingly and never present stock models as your patients or as treatment results. Footage of objects and your own practice is safer and more honest." },
    { q: "Does the dentist still need to check the videos?", a: "Yes. Without a dentist on screen the script carries the clinical message, so a dentist should read every script and approve every video before it is posted." },
  ],
  sources: [YT_GENAI, YT_MEDICAL, GDC_SM, HHS_PRIVACY],
};

/** In hub order: the channel guides, then the format guide. */
export const CHANNELS_EN: Guide[] = [YOUTUBE_SHORTS, GOOGLE_PROFILE, CAPTIONS, WAITING_ROOM, NO_CAMERA];
