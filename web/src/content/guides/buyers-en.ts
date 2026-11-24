import type { Guide } from "../dentvideo";

// English buyer-intent guides (US/UK first), 2026-11-23: agency vs software
// cost and effort, the ways to get patient education videos, video marketing
// for small practices, and the UK and US rules for patient education videos.
//
// Other providers appear only as categories (an agency, a stock video library,
// filming in-house); no competitor is named or described beyond that. The
// sourced comparison with other companies' published prices lives on the
// /videos answer pages (content/solutions/answers-en.ts), which these guides
// link to.
//
// Official texts read on 2026-11-23 with curl: GDC guidance on advertising
// (effective 30 September 2013) and on using social media (effective 27 June
// 2016); the CAP Code scope, Section 3 and Section 12 and the ASA's teeth
// whitening advice (16 September 2025); 45 CFR 164.501 and 164.508 via
// Cornell LII; the ADA Code with advisory opinions revised to October 2024.
// hhs.gov and ftc.gov refused automated requests that day, so those pages are
// not cited here; the US advertising rules guide covers the FTC.
// No statistics, no prices, no percentages (the content tests forbid them).

const GDC_ADVERTISING = { label: "General Dental Council: Guidance on advertising (effective from 30 September 2013)", url: "https://www.gdc-uk.org/standards-guidance/standards-and-guidance/gdc-guidance-for-dental-professionals/guidance-on-advertising" };
const GDC_SOCIAL = { label: "General Dental Council: Guidance on using social media (effective from 27 June 2016, PDF)", url: "https://www.gdc-uk.org/docs/default-source/guidance-documents/guidance-on-using-social-media" };
const CAP_SCOPE = { label: "ASA and CAP: Scope of the CAP Code (marketing on a business's own website and social media)", url: "https://www.asa.org.uk/type/non_broadcast/code_folder/scope-of-the-code.html" };
const CAP_03 = { label: "CAP Code, Section 3: Misleading advertising", url: "https://www.asa.org.uk/type/non_broadcast/code_section/03.html" };
const CAP_12 = { label: "CAP Code, Section 12: Medicines, medical devices, health-related products and beauty products", url: "https://www.asa.org.uk/type/non_broadcast/code_section/12.html" };
const ASA_WHITENING = { label: "ASA and CAP AdviceOnline: Dental: Teeth whitening (16 September 2025)", url: "https://www.asa.org.uk/advice-online/teeth-whitening.html" };
const HIPAA_MARKETING = { label: "45 CFR § 164.501: HIPAA Privacy Rule definitions, including “marketing” (eCFR text via Cornell LII)", url: "https://www.law.cornell.edu/cfr/text/45/164.501" };
const HIPAA_AUTH = { label: "45 CFR § 164.508(a)(3): Authorization required for marketing (eCFR text via Cornell LII)", url: "https://www.law.cornell.edu/cfr/text/45/164.508" };
const ADA_CODE_PDF = { label: "American Dental Association: Principles of Ethics and Code of Professional Conduct, advisory opinions revised to October 2024 (PDF)", url: "https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/about/2025_code_of_ethics_full.pdf" };
const ADA_CODE_PAGE = { label: "American Dental Association: Code of Ethics overview page", url: "https://www.ada.org/about/principles/code-of-ethics" };

const DATE = "2026-11-23";

const AGENCY_VS_SOFTWARE: Guide = {
  locale: "en",
  slug: "dental-marketing-agency-vs-patient-education-video-software",
  category: "tools",
  published: DATE,
  updated: DATE,
  reviewed: DATE,
  title: "Dental marketing agency vs patient education video software: cost and effort compared",
  seoTitle: "Dental agency vs video software: cost and effort",
  seoDescription: "What a dental marketing agency and patient education video software each cost a practice in fees, staff time and approval effort, and who each one suits.",
  description: "Dental marketing agency or patient education video software: what each fee pays for, who does which weekly task, the hidden costs, how to compare quotes and when each is worth it.",
  h1: "Dental marketing agency vs patient education video software: cost and effort compared",
  intro:
    "A dental marketing agency sells people's time, so it usually costs more and can do more: strategy, filming, ads, posting and replies. Patient education video software sells a finished output, so it usually costs less and covers one job: a steady supply of checked educational videos. For most practices the real difference is the dentist's time each week.",
  takeaways: [
    "An agency fee pays for people's hours; a software subscription pays for a fixed weekly output. Compare what arrives ready to post, not the size of the package.",
    "The cost both options hide is the dentist's approval time. Ask how long sign-off takes and who checks advertising wording and clinical accuracy first.",
    "Software covers the weekly educational videos only. Ads, comment replies and filming in the practice still need a person, in-house or at an agency.",
    "In the US, avoid any marketing deal paid as a share of patient fees: the ADA Code treats it as fee splitting.",
  ],
  sections: [
    {
      heading: "What are you actually paying for?",
      paragraphs: [
        "An agency invoice pays for people: an account manager, a strategist, a writer or editor, sometimes a videographer and an ads specialist. Their hours are the product, which is why agencies can take on almost any job and why their fees sit at the top of the range. A retainer usually buys a set number of hours or deliverables a month, plus meetings and reports.",
        "Software pays for an output. Patient education video software produces a fixed number of finished videos on a fixed schedule, and the subscription covers that and little else. It is cheaper because no one is billing hours, and narrower for the same reason.",
        "Neither price on its own tells you much. What matters is the cost of each video you actually post, once you add the time your own team spends briefing, reviewing, correcting and posting.",
      ],
      table: {
        caption: "Dental marketing agency vs patient education video software at a glance",
        columns: ["Question", "Dental marketing agency", "Patient education video software"],
        rows: [
          ["How you pay", "A monthly retainer or a project fee for people's time", "A monthly subscription for a set output"],
          ["What the fee covers", "Whatever the contract lists: strategy, content, filming, ads, posting, replies, reports", "A fixed number of finished videos a week, with captions"],
          ["Your time each week", "Briefings, feedback rounds and sign-off", "Watching and approving finished videos, then posting them"],
          ["Who checks ad wording and clinical accuracy", "Depends on the agency: ask before you sign", "Depends on the tool: some check every script, many do not"],
          ["What it does not do", "Rarely anything, if you pay for it", "Ads, comment replies, filming in the practice, campaign planning"],
          ["Contract", "Often a minimum term and a notice period: read both", "Often monthly; check the terms"],
        ],
        note: "Typical set-ups, not any one provider. Agencies and tools differ, and their offers change.",
      },
    },
    {
      heading: "Who does each weekly task?",
      paragraphs: [
        "“Doing video” is really eight or nine separate jobs. Listing them shows where your own team's time goes under each option, which is usually the part a proposal leaves out.",
      ],
      table: {
        caption: "Who does each weekly video task, by option",
        columns: ["Task", "With an agency", "With patient education video software"],
        rows: [
          ["Choosing topics", "The agency proposes, you agree", "The software plans them, ideally only from treatments you offer"],
          ["Writing scripts", "The agency", "The software"],
          ["Filming", "The agency, on site, or you on your phone", "Not needed for narrated videos; some tools also cut your own recordings"],
          ["Editing, captions and branding", "The agency", "The software"],
          ["Checking advertising wording and clinical accuracy", "Ask who, and how", "Ask whether the tool checks every script, and against which rules"],
          ["Final approval", "The dentist", "The dentist"],
          ["Posting", "Often the agency", "You"],
          ["Replies to comments and messages", "The agency, if contracted", "You"],
          ["Paid ads and reports", "The agency, if contracted", "Not included"],
        ],
      },
      after: [
        "Two rows never move: the dentist approves, and the practice answers for what is published. Our guide on [agency, freelancer, in-house or software](guide:dental-video-marketing-agency-or-software) covers the wider choice, including freelancers and in-house staff.",
      ],
    },
    {
      heading: "What are the hidden costs?",
      paragraphs: [
        "With an agency, the hidden cost is rarely on the invoice. It is the meetings, the feedback rounds, and the drafts that come back with wording a dental regulator would object to: a discount, a giveaway, a carousel of reviews. Each rewrite is the dentist's time. Templates shared across many clients can also make your practice sound like every other one, and if the agency owns the social accounts or the raw footage, leaving gets expensive.",
        "With software, the hidden cost is everything it does not do. Someone still posts, answers comments and decides what to say in a message. A general video app that checks nothing moves the whole compliance job back to you, so a cheap tool can cost more in dentist time than a dearer one that checks every script before you see it.",
        "In the United States there is one more trap. The ADA Code of Ethics, in its advisory opinion on split fees in advertising and marketing services, says that paying a marketing vendor a specific amount or percentage of the fees collected from patients is fee splitting, and the Code prohibits it. It names social media coupons and influencers as examples. Prefer flat fees, and check your state board's rules too.",
      ],
    },
    {
      heading: "How do you compare quotes fairly?",
      paragraphs: ["Packages are hard to compare line by line. Put every option through the same steps instead:"],
      ordered: true,
      list: [
        "Write down what you need each week: how many educational videos, on which channels, and whether you also want ads or comment replies.",
        "Ask each provider how many finished, ready-to-post videos arrive per month, not how many “pieces of content” or “touchpoints”.",
        "Ask who checks each script against your market's advertising rules and for clinical accuracy, before the dentist sees it.",
        "Test the option for a few weeks and time the dentist's approval. If every video needs rewriting, the cheap option is the expensive one.",
        "Read the contract for minimum term, notice period and who owns the accounts, footage and finished videos if you leave.",
        "Divide the monthly fee plus your team's time by the number of videos you actually posted. That is the number to compare.",
      ],
    },
    {
      heading: "When is an agency worth the extra cost?",
      paragraphs: [
        "An agency earns its fee when you want one partner for several jobs at once: a launch or rebrand, paid ads, filming the team on site, replies to comments, a multi-location brand or detailed reporting. It also suits a practice where no one has the time or interest to approve content weekly and the agency can be trusted to know the rules.",
        "Before signing, ask the questions in our [agency or software guide](guide:dental-video-marketing-agency-or-software), and check its ideas against the [dental social media advertising rules](guide:dental-social-media-advertising-rules) for your country.",
      ],
    },
    {
      heading: "When is software enough?",
      paragraphs: [
        "Software is enough when the job is a steady flow of educational videos and you already have someone who can post and answer messages. That describes many single-site and small practices: they want to show up every week, answer the questions patients ask, and keep the wording safe, without a marketing department.",
        "Many practices end up with a mix: software for the weekly videos, the dentist on camera once a month, and an agency or freelancer only for a campaign or ads. Our guides on [dental video marketing for small practices](guide:dental-video-marketing-for-small-practices) and [the ways to get patient education videos](guide:best-way-to-get-patient-education-videos) set out that mix in more detail.",
      ],
    },
    {
      heading: "What does DentVideo cost and include?",
      paragraphs: [
        "[DentVideo](landing:) is patient education video software with two monthly plans, Starter and Practice, listed with their prices on the homepage. There is no minimum term, no setup fee and no discount. Both plans deliver five finished, narrated and captioned vertical videos every Monday, in your colors and logo, with a ready caption and hashtags, on treatments you offer. Every script is software-checked for advertising rules and clinical accuracy before you see it, and nothing goes out until the dentist approves it. Practice adds captioned clips cut from your own phone recordings.",
        "It does not post for you, answer comments, run ads or film in your practice. For a side-by-side with agencies that quotes their own published prices with dates, see [DentVideo vs a dental marketing agency](video:dentvideo-vs-dental-marketing-agency), and for design apps and chatbots too, [DentVideo vs an agency, Canva or ChatGPT](video:dentvideo-vs-agency-canva-chatgpt). Before choosing a plan, you can [see a free preview of your own videos](start:).",
      ],
    },
  ],
  faq: [
    { q: "Is patient education video software cheaper than a dental marketing agency?", a: "Usually, because you pay for a fixed output rather than people's hours. Compare the cost of each video you actually post, including the time your team spends briefing, reviewing and posting." },
    { q: "Can software replace a dental marketing agency?", a: "For the weekly educational videos, often yes. It does not run ads, film in your practice, answer comments or plan campaigns. Many practices keep a person for those jobs and use software for the steady content." },
    { q: "How much of the dentist's time does each option take?", a: "With an agency: briefings, feedback rounds and sign-off. With software that delivers finished videos: watching and approving them, then posting. Test each for a few weeks and time it to know for your practice." },
    { q: "Can a US agency be paid a share of new patients' fees?", a: "The ADA Code of Ethics treats paying a marketing vendor a specific amount or percentage of fees collected from patients as fee splitting, which it prohibits. State rules may also apply. Prefer a flat fee." },
    { q: "Who is responsible if a video breaks advertising rules?", a: "The practice that publishes it, whoever made it. Approve every video yourself, and keep a written rule that nothing is posted without that approval." },
  ],
  sources: [ADA_CODE_PDF],
};

const BEST_WAY: Guide = {
  locale: "en",
  slug: "best-way-to-get-patient-education-videos",
  category: "tools",
  sample: "proper-brushing-technique",
  published: DATE,
  updated: DATE,
  reviewed: DATE,
  title: "How to get patient education videos for a dental practice: filming, a library, an agency or a weekly tool",
  seoTitle: "Patient education videos for a dental practice: 4 options",
  seoDescription: "Four ways to get patient education videos for a dental practice: film them, a stock video library, an agency or a weekly done-for-you tool, compared.",
  description: "The four practical ways to get patient education videos for a dental practice, compared on effort, who checks the wording, where the videos can be used and which practice each suits.",
  h1: "Four ways to get patient education videos for a dental practice, compared",
  intro:
    "There are four practical ways to get patient education videos for a dental practice: film them yourself, license a stock video library, hire an agency, or use a weekly done-for-you tool. Filming is the most personal, a library suits chairside explanations, an agency does the most, and a weekly tool usually takes the least of your time.",
  takeaways: [
    "Start from where the videos will be watched: chairside and on your website, or on social media every week. That decides most of the choice.",
    "Filming yourself builds the most trust but costs hours each week in scripting, editing, captions and checking.",
    "A stock library is quick for explaining treatments, but it is generic, may not carry your brand and may not be licensed for social media.",
    "A weekly done-for-you tool suits practices that want to post regularly without filming; the dentist still approves every video.",
  ],
  sections: [
    {
      heading: "Which option fits which practice?",
      paragraphs: [
        "Each option solves a different part of the job. The table compares them on what practices usually ask first. Our [patient education videos guide](guide:patient-education-videos) explains where these videos help most once you have them.",
      ],
      table: {
        caption: "Four ways to get patient education videos for a dental practice",
        columns: ["Option", "What you get", "Your effort each week", "Who checks wording and accuracy", "Fits a practice that"],
        rows: [
          ["Film them yourself", "Videos of your own team, in your own words", "Hours: topics, script, filming, editing, captions", "You", "has a dentist who enjoys the camera and someone who can edit"],
          ["Stock video library", "Ready-made explanations of common treatments", "Minutes to choose and play", "The publisher wrote them; whether they fit your country's ad rules is yours to check", "wants chairside, website or waiting room explanations"],
          ["Dental marketing agency", "Whatever the contract covers, often filming, posting and ads too", "Briefings, feedback and sign-off", "Depends on the agency: ask", "wants one partner to run everything"],
          ["Weekly done-for-you tool", "A set number of finished videos every week in your branding", "Minutes to watch, approve and post", "Depends on the tool: ask whether it checks every script", "wants to post every week without filming"],
        ],
        note: "Typical set-ups, not any one provider. Offers and license terms differ and change.",
      },
    },
    {
      heading: "What does filming them yourself involve?",
      paragraphs: [
        "A phone held vertically by a window, a quiet room and one question per video is enough equipment. Patients trust the person who will treat them, so a short answer from your own dentist or hygienist is hard to beat. Our guide to [Instagram videos for dentists](guide:instagram-videos-for-dentists) shows how to record one useful clip in five minutes.",
        "The cost is time, and it repeats every week. Someone has to pick the topic, write a few lines, film, edit, add captions and a logo, write the caption, check the wording against your advertising rules, and post. Practices that keep it up usually batch the work: one recording session that is cut into several clips. If no one wants to appear on screen, [narrated and hands-only formats](guide:dental-videos-without-being-on-camera) work too.",
      ],
    },
    {
      heading: "What is a stock video library good for, and where does it fall short?",
      paragraphs: [
        "A stock or ready-made library gives you professionally made explanations of common treatments: what a crown is, how an implant is placed, what happens in a root canal. They are useful chairside, on a treatment page of your website and on a [waiting room screen](guide:dental-waiting-room-tv-videos), and they take minutes to use.",
        "The limits are the reverse of the strengths. The videos are the same for every practice that buys them, they rarely carry your logo, colors or voice, and they are not a weekly social media feed. Check three things before you buy:",
      ],
      list: [
        "License: can you post the videos on Instagram, TikTok or YouTube, or only show them in the practice and on your website? What happens to them if you cancel?",
        "Language and market: are they in your patients' language, and does their wording fit your country's advertising rules?",
        "Treatments: do they match what you actually offer, or will patients ask about treatments you do not provide?",
      ],
    },
    {
      heading: "When does an agency make sense?",
      paragraphs: [
        "An agency makes sense when you want more than videos: a strategy, filming your team on site, paid ads, replies to comments and monthly reports. You pay for people's time, so it usually costs the most of the four. Ask who checks each script against your country's rules before you see it, and who owns the footage and accounts if you leave.",
        "Our [agency vs software cost and effort comparison](guide:dental-marketing-agency-vs-patient-education-video-software) walks through the fees, the weekly tasks and the hidden costs side by side.",
      ],
    },
    {
      heading: "What does a weekly done-for-you tool do?",
      paragraphs: [
        "A done-for-you tool makes finished videos for you on a schedule, so the only regular work left is watching, approving and posting. The good ones plan topics only from treatments you offer, brand every video and check the script before you see it.",
        "[DentVideo](landing:) is one: every Monday it delivers five narrated, captioned vertical videos in your colors and logo, in your language, with a ready caption and hashtags. Every script is software-checked for advertising rules and clinical accuracy, and nothing is published until the dentist approves it. On the Practice plan it also turns your own phone recordings into captioned clips. The sample above is a real DentVideo video made for a demo clinic. It does not post for you, run ads or replace a chairside animation library.",
      ],
    },
    {
      heading: "How do you choose? Five questions",
      paragraphs: [],
      ordered: true,
      list: [
        "Where will patients watch: in the chair and on your website, or on social media every week?",
        "Is anyone on your team happy to be on camera regularly?",
        "Who will check every script for advertising rules and clinical accuracy before it goes out?",
        "Is your scarcer resource money or the dentist's time?",
        "Do you need more than videos, such as ads or replies to comments?",
      ],
      after: [
        "If the answers are “social media”, “not really”, “we have no one”, “time” and “no”, a weekly tool usually fits. If they are “in the chair”, a library does that job. If someone loves filming, start there and fill the gaps with one of the others.",
      ],
    },
    {
      heading: "Can you combine the options?",
      paragraphs: [
        "Yes, and many practices do. A common mix is a weekly tool for social media, a library for chairside explanations, and the dentist on camera once a month for the topics where a familiar face matters most. Whatever you combine, keep one person responsible for approval, and plan topics from a list such as our [52-week dental content calendar](guide:dental-social-media-content-calendar).",
        "To see what a weekly tool would make for your own practice, [see a free preview of your own videos](start:) with your logo and colors before you choose a plan. For a version of this comparison that quotes other providers' published prices with dates, see [five ways to make patient education videos](video:ways-to-make-dental-patient-education-videos) and [DentVideo vs an agency, Canva or ChatGPT](video:dentvideo-vs-agency-canva-chatgpt).",
      ],
    },
  ],
  faq: [
    { q: "What is the quickest way to get patient education videos?", a: "A stock library is quickest for a single explanation you can play today. For a steady weekly supply for social media, a done-for-you tool takes the least time: you watch, approve and post." },
    { q: "Can I post stock library videos on Instagram or TikTok?", a: "Only if the license allows it. Some libraries are licensed for chairside, website or waiting room use only. Check the terms for social media posting, adding your logo, and what happens to the videos if you cancel." },
    { q: "Do patient education videos need the dentist on camera?", a: "No. Narrated explainers, hands-only demonstrations and text-led videos answer patients' questions well. A familiar face builds trust faster, so many practices mix both." },
    { q: "Who is responsible for what the videos say?", a: "The practice that shows or posts them, whoever made them. Approve every video, and check it against your country's advertising rules before it goes out." },
  ],
};

const SMALL_PRACTICES: Guide = {
  locale: "en",
  slug: "dental-video-marketing-for-small-practices",
  category: "video",
  sample: "proper-brushing-technique",
  published: DATE,
  updated: DATE,
  reviewed: DATE,
  title: "Dental video marketing for small practices: a simple weekly plan that works without a marketing team",
  seoTitle: "Dental video marketing for small practices",
  seoDescription: "Dental video marketing for a small practice: which channels to start with, what to post, how much time it takes each week and what to avoid.",
  description: "How a small dental practice can market itself with short patient education videos: channels, topics, a weekly routine, what to avoid, how to tell if it works and who should make them.",
  h1: "Dental video marketing for small practices",
  intro:
    "Dental video marketing for a small practice means posting short, captioned patient education videos on a rhythm you can keep, usually two to five a week, on the one or two channels your patients use. You do not need a studio, a big budget or daily posts. You need useful topics, careful wording and a simple weekly routine.",
  takeaways: [
    "Start with one or two channels, such as Instagram and your Google Business Profile, rather than every platform at once.",
    "Make every video answer one question patients really ask, about a treatment you offer, in under a minute.",
    "A rhythm you can keep for a year matters more than volume. Batch the work into one short session a week.",
    "Keep discounts, testimonials, before-and-after promises and “painless” claims out: they are restricted in many markets.",
  ],
  sections: [
    {
      heading: "What does video marketing look like for a small dental practice?",
      paragraphs: [
        "For a small practice, video marketing is mostly patient education that happens to be public. A short clip answers a question your front desk hears every week: does whitening damage enamel, what happens at a first check-up, how to clean around an implant. People who are choosing a dentist watch it, recognize your name and colors, and get a feel for how you explain things.",
        "It is not a campaign, a viral trend or a discount. Those take time and budget a small team does not have, and in many countries they break health-advertising rules. Steady, calm, useful videos are cheaper to make and safer to post.",
      ],
    },
    {
      heading: "Which channels should a small practice start with?",
      paragraphs: [
        "Pick the one or two places your patients already look, post there consistently, and reuse the same vertical videos elsewhere when you have time:",
      ],
      list: [
        "Instagram Reels: where many local patients look a practice up. See [Instagram videos for dentists](guide:instagram-videos-for-dentists).",
        "Google Business Profile: what people see when they search for a dentist nearby. See [Google Business Profile for dentists](guide:google-business-profile-for-dentists).",
        "YouTube Shorts: the same videos, found through search for months. See [YouTube Shorts for dentists](guide:youtube-shorts-for-dentists).",
        "TikTok: worth it if your patients are younger and someone enjoys it. See [TikTok for dentists](guide:tiktok-for-dentists).",
        "Your website and waiting room screen: the same videos on treatment pages and in the practice.",
      ],
    },
    {
      heading: "What should the videos be about?",
      paragraphs: [
        "Start with the questions your team answers every week, then the treatments you offer, then the seasons: school starts, sports mouthguards, holiday sweets. One question per video keeps each one short and easy to find. Our [dental social media post ideas](guide:dental-social-media-post-ideas) and the [52-week content calendar](guide:dental-social-media-content-calendar) give you a year of topics, and the treatment guides cover [implants](guide:dental-implant-patient-education-videos), [whitening](guide:teeth-whitening-patient-education-videos) and [root canal](guide:root-canal-patient-education-videos) in detail.",
        "Only make videos about treatments you actually provide. A video about aligners from a practice that does not offer them sends patients elsewhere.",
      ],
    },
    {
      heading: "How much time does it take each week?",
      paragraphs: [
        "That depends almost entirely on who makes the videos. If you film and edit yourself, plan for a few hours a week, mostly in editing and captions. If a tool or an agency delivers finished videos, the regular work is watching, approving and posting. Either way, a fixed weekly slot works better than fitting it in between patients:",
      ],
      ordered: true,
      list: [
        "Monday: decide or receive the week's topics.",
        "Tuesday: the dentist watches each video and approves it or asks for a change.",
        "Wednesday: schedule the approved videos with their captions for the rest of the week.",
        "Every day: one person checks comments and messages and answers privately where needed.",
        "Once a month: look at which questions came up and feed them into next month's topics.",
      ],
      after: [
        "Two to five videos a week is a realistic range for most small practices; our guide on [how often a dental practice should post](guide:how-often-should-a-dental-practice-post) explains how to choose.",
      ],
    },
    {
      heading: "What should a small practice avoid?",
      paragraphs: [
        "Most problems come from copying what works in other industries. A practice account is advertising in most countries, so the restricted claims are the same as in a printed ad:",
      ],
      list: [
        "Promises and absolutes: “guaranteed results”, “painless”, “permanent”.",
        "Superlatives and comparisons: “the top dentist in town”.",
        "Prices and discounts used as a lure, and giveaways.",
        "Before-and-after promises and patient testimonials.",
        "Any patient, or patient information, without written consent for that specific use. See [patient consent for dental social media](guide:patient-consent-dental-social-media).",
      ],
      after: [
        "The rules differ by country: see the [UK](guide:patient-education-videos-uk-dental-practices) and [US](guide:patient-education-videos-us-dental-practices) guides for patient education videos, and paste any caption into the free [“Is my post allowed?” checker](checker:) before you post.",
      ],
    },
    {
      heading: "How do you know if it is working?",
      paragraphs: [
        "Not by views alone. A local practice does not need a large audience; it needs the right few hundred people nearby to recognize it. Look at signals that relate to patients rather than reach:",
      ],
      list: [
        "New patients who mention a video, or ask about a topic you posted.",
        "Profile visits, website clicks and calls from your Google Business Profile.",
        "Saves and shares, which show a video was useful enough to keep.",
        "Fewer repeated questions at the front desk once a video answers them.",
      ],
      after: [
        "Give it a few months before judging. Video marketing for a practice works through familiarity, and familiarity builds slowly.",
      ],
    },
    {
      heading: "Should you do it yourself, hire help or use software?",
      paragraphs: [
        "Do it yourself if someone on the team enjoys filming and has protected time for it. Hire an agency if you also want ads, comment replies and on-site filming handled. Use software if the job is a steady supply of educational videos and time is what you lack. Our comparisons of [the four ways to get patient education videos](guide:best-way-to-get-patient-education-videos) and of [agency vs software cost and effort](guide:dental-marketing-agency-vs-patient-education-video-software) go through each in detail.",
        "[DentVideo](landing:) is built for small practices in that last group. Every Monday it delivers five finished, narrated and captioned videos in your colors and logo, on treatments you offer, with every script software-checked for clinical accuracy and advertising rules. The dentist approves each one and posts it. The sample above is a real DentVideo video for a demo clinic, and you can [see a free preview of your own videos](start:) before choosing a plan.",
      ],
    },
  ],
  faq: [
    { q: "Is video marketing worth it for a small dental practice?", a: "It can be, if the videos are useful and regular. Short answers to patients' questions help people nearby get to know you before they book. It works over months, not days, and it should never rely on discounts or promises." },
    { q: "How many videos should a small practice post?", a: "No platform requires a number. Two to five a week, kept up for a year, works better for most small practices than daily posting followed by silence." },
    { q: "Does a small practice need to be on TikTok?", a: "No. Start where your patients already look, usually Instagram and your Google Business Profile. Add TikTok or YouTube Shorts later by reusing the same vertical videos." },
    { q: "Can we do video marketing without anyone on camera?", a: "Yes. Narrated explainers, hands-only demonstrations and text-led videos work well. If you use an AI voice, never present it as a real dentist speaking." },
    { q: "What does it cost?", a: "Filming yourself costs your team's time. An agency charges a retainer for people's hours. Software charges a monthly subscription for a set output. DentVideo's two plans are listed on its homepage, with no minimum term." },
  ],
};

const UK_PRACTICES: Guide = {
  locale: "en",
  slug: "patient-education-videos-uk-dental-practices",
  category: "rules",
  published: DATE,
  updated: DATE,
  reviewed: DATE,
  title: "Patient education videos for UK dental practices: what the GDC guidance and the CAP Code mean for each video",
  seoTitle: "Patient education videos for UK dental practices",
  seoDescription: "What GDC guidance and the CAP Code mean for a UK dental practice's patient education videos: claims, GDC numbers, whitening, Botox, consent, a checklist.",
  description: "For UK dental practices posting patient education videos: when they count as advertising, what GDC guidance requires, the CAP Code basics, consent and a pre-post checklist.",
  h1: "Patient education videos for UK dental practices",
  intro:
    "UK dental practices can post patient education videos freely, but each one counts as practice publicity. The GDC expects it to be accurate, balanced and not misleading, naming GDC numbers and NHS or private status where its guidance requires. The CAP Code covers claims on your own website and social media, and patients need explicit consent before appearing.",
  takeaways: [
    "Treat every video and caption on a practice account as advertising: the CAP Code covers marketing on a business's own website and social media.",
    "GDC guidance asks for accurate, balanced information, claims backed by facts and no unjustified expectations about results.",
    "When you promote a treatment on social media, say it may not suit everyone and depends on an assessment.",
    "Prescription-only treatments, such as anti-wrinkle injections, may not be advertised to the public under the CAP Code.",
    "Patients, their records and their stories need explicit consent for that specific use.",
  ],
  sections: [
    {
      heading: "Does a patient education video count as advertising in the UK?",
      paragraphs: [
        "Usually, yes. The CAP Code's scope includes marketing communications by businesses on their own websites, or in other non-paid-for space online under their control, that are directly connected with the supply of their services. A practice's Instagram, TikTok or YouTube account is space under its control, and a video about a treatment you offer is connected with supplying it, however educational the tone.",
        "The General Dental Council looks at it from the other side. Its guidance on advertising says that whenever you or your practice produce information containing your name, you are responsible for checking that it is correct. So the safe working assumption is simple: every video and caption is practice publicity, judged by the GDC guidance and the CAP Code. Our [UK dental advertising rules guide](guide:dental-advertising-rules-uk-gdc-asa) covers both in more depth; this page applies them to patient education videos.",
      ],
    },
    {
      heading: "What does the GDC guidance on advertising require?",
      paragraphs: [
        "The guidance on advertising (effective from 30 September 2013) builds on standard 1.3.3 of the Standards for the Dental Team: advertising and information you produce must be accurate, not misleading, and follow the GDC's guidance on ethical advertising. For information that contains your name, it asks you to:",
      ],
      list: [
        "keep information current and accurate;",
        "include your GDC registration number;",
        "use clear language that patients are likely to understand;",
        "back up claims with facts and avoid ambiguous statements;",
        "avoid statements likely to create an unjustified expectation about the results you can achieve;",
        "make clear in advertisements and practice publicity whether the practice is NHS, mixed or wholly private.",
      ],
      after: [
        "Two further points matter for video. If you promote services on social networking sites, the guidance says you must make clear that the treatment may not be appropriate for every patient and depends on a satisfactory assessment. And titles matter: a dentist who is not on a GDC specialist list must not use titles that imply specialist status, such as “orthodontist” or “periodontist”, or say they “specialise in” a treatment. Phrases such as “special interest in” are the accepted alternative.",
        "In practice, many practices add the dentist's GDC number to the caption whenever a video names them, keep NHS or private status in the profile and on the website, and end treatment videos with a line such as “Whether this suits you depends on an assessment.”",
      ],
    },
    {
      heading: "What does the CAP Code mean for educational videos?",
      paragraphs: [
        "The CAP Code rules most likely to touch a dental video are short. Section 3 says marketing must not materially mislead, and that marketers must hold documentary evidence before making claims that consumers are likely to regard as objective. Section 12 adds health-specific rules:",
      ],
      list: [
        "Rule 12.1: objective claims must be backed by evidence, where relevant trials on people.",
        "Rule 12.2: marketers must not discourage essential treatment, though accurate and responsible general information about a condition may be given.",
        "Rule 12.6: no false claims that a product can treat disease, restore a function or change appearance.",
        "Rule 12.12: prescription-only medicines and prescription-only medical treatments may not be advertised to the public. This is why a practice cannot promote anti-wrinkle injections by name in its videos.",
      ],
      after: [
        "Whitening is the treatment where videos most often cross the line. The ASA's advice on teeth whitening (updated 16 September 2025) says performance claims need robust evidence, that results should not be promised fast or after one use unless substantiated, and that long-term results should not be claimed from evidence of short-term whitening. Our [teeth whitening patient education videos](guide:teeth-whitening-patient-education-videos) guide shows wording that stays factual.",
      ],
    },
    {
      heading: "Which wording is risky, and what is safer?",
      paragraphs: [
        "Most problems sit in a single phrase. The table shows common ones in UK dental videos and calmer wording that gives the same information.",
      ],
      table: {
        caption: "UK patient education videos: risky wording and safer alternatives",
        columns: ["Risky wording", "Why it is a problem", "Safer wording"],
        rows: [
          ["“Painless implants”", "An unjustified expectation about results (GDC) and an unsubstantiated claim (CAP Code)", "“Implants are placed under local anaesthetic. We'll talk you through what to expect.”"],
          ["“Instant whitening, eight shades whiter”", "Speed and shade claims need robust evidence (ASA whitening advice)", "“Whitening can lighten natural teeth. How much varies, and we'll check your teeth first.”"],
          ["“Our orthodontist explains”, for a dentist not on the specialist list", "Implies specialist status (GDC guidance on titles)", "“Our dentist, who has a special interest in orthodontics, explains”"],
          ["“Book Botox with your check-up”", "Advertises a prescription-only treatment to the public (CAP 12.12)", "Leave it out of public videos; discuss it in a consultation"],
          ["“Perfect teeth for everyone”", "Ignores that treatment depends on an assessment (GDC social media point)", "“Whether this suits you depends on an assessment.”"],
        ],
        note: "Examples for illustration, not a complete list. Check the current GDC guidance and CAP Code before you rely on them.",
      },
    },
    {
      heading: "How do you handle patients and consent on camera?",
      paragraphs: [
        "The GDC's guidance on using social media (effective from 27 June 2016) says you must not post information about patients that could identify them, must be careful not to share identifiable information without their explicit consent, and should specify to the patient how exactly the information will be used. It also warns that several pieces of anonymised information together can identify someone.",
        "For video, that means no patients in the background, no screens or appointment books in shot, no radiographs or photos that could be linked to a person, and no patient stories without explicit, written consent for that specific use. Health information is also special category data under UK GDPR. Our guide to [patient consent for dental social media](guide:patient-consent-dental-social-media) has a consent form checklist. Educational videos that use models, diagrams or narration need no patient data at all.",
      ],
    },
    {
      heading: "What should a UK practice check before posting each video?",
      paragraphs: [],
      ordered: true,
      list: [
        "Is every factual claim something you could support with evidence if asked?",
        "Does the video avoid promising results, speed or permanence?",
        "If a dentist is named, is their GDC registration number in the caption, and is their title accurate?",
        "If it promotes a treatment, does it say the treatment may not suit everyone and depends on an assessment?",
        "Does it mention or show any prescription-only treatment? If so, take it out.",
        "Is there any patient, patient information or identifiable detail in the frame or the caption without explicit consent?",
        "Is your NHS, mixed or private status clear on the profile or website the video points to?",
      ],
      after: [
        "Paste the caption or script into the free [“Is my post allowed?” checker](checker:), choose the UK, and it will mark each sentence with the reason and a calmer wording. It is a filter, not legal advice.",
      ],
    },
    {
      heading: "How does DentVideo handle the UK rules?",
      paragraphs: [
        "[DentVideo](landing:) writes each week's five patient education videos with the GDC guidance and the CAP Code in mind, then software-checks every script and caption for commonly restricted claims and for clinical accuracy before you see it. It uses no patients and needs no patient data. The dentist approves every video and posts it, so adding a GDC number or a practice-specific line stays in your hands.",
        "For how this compares with filming yourself, a library or an agency, see [the four ways to get patient education videos](guide:best-way-to-get-patient-education-videos). You can [see a free preview of your own videos](start:) before choosing a plan. More UK and US guides are on the [guides page](guides:).",
      ],
    },
  ],
  faq: [
    { q: "Do I need to put my GDC number on social media videos?", a: "The GDC's guidance on advertising says information that contains your name should include your GDC registration number. If a video or caption names a dentist, the simplest way to meet that is to add the number to the caption." },
    { q: "Can a UK dental practice post videos about teeth whitening?", a: "Yes, as factual education. Avoid speed, shade and long-lasting claims you cannot support with robust evidence; the ASA's whitening advice lists rulings against such claims. Make clear that suitability depends on an assessment." },
    { q: "Can we mention anti-wrinkle injections in our videos?", a: "Not as a promoted treatment. CAP Code rule 12.12 says prescription-only medicines and prescription-only medical treatments may not be advertised to the public. Discuss them in a consultation instead." },
    { q: "Is an educational video exempt from the CAP Code?", a: "Not automatically. The Code covers a business's marketing on its own website and social media where it is connected with supplying its services. A treatment video on a practice account usually is." },
    { q: "Is this legal advice?", a: "No. It is general information based on the GDC guidance and the CAP Code as read on the review date. Check the current texts, or ask your indemnity provider, before relying on it." },
  ],
  sources: [GDC_ADVERTISING, GDC_SOCIAL, CAP_SCOPE, CAP_03, CAP_12, ASA_WHITENING],
};

const US_PRACTICES: Guide = {
  locale: "en",
  slug: "patient-education-videos-us-dental-practices",
  category: "rules",
  published: DATE,
  updated: DATE,
  reviewed: DATE,
  title: "Patient education videos for US dental practices: HIPAA, state board advertising rules and the ADA Code",
  seoTitle: "Patient education videos for US dental practices",
  seoDescription: "What HIPAA, state dental board advertising rules and the ADA Code mean for a US dental practice's patient education videos, with a pre-post checklist.",
  description: "For US dental practices posting patient education videos: when HIPAA authorization is needed, what state board rules usually cover, the ADA Code on authorship, and a checklist.",
  h1: "Patient education videos for US dental practices",
  intro:
    "US dental practices can post general patient education videos without any HIPAA authorization, because they use no patient information. HIPAA matters the moment a real patient appears or is identifiable. Beyond that, your state dental board's advertising rules and, for ADA members, the ADA Code apply: no false or misleading claims and honest disclosure of authorship.",
  takeaways: [
    "A general education video that uses no patient information needs no HIPAA authorization; featuring a patient for marketing does.",
    "Sending your own patients a video about their treatment is generally a treatment communication, not marketing, unless a third party pays you to send it.",
    "State dental boards set their own advertising rules, so read your board's rules on misleading claims, specialty titles, fees and testimonials.",
    "The ADA Code treats health content published under a dentist's name without truthful disclosure of source and authorship as misleading.",
  ],
  sections: [
    {
      heading: "Does HIPAA apply to patient education videos?",
      paragraphs: [
        "HIPAA's Privacy Rule protects patients' health information, not dental topics. A narrated video explaining how to floss, what a crown is or what to expect after an extraction contains no protected health information, so it needs no authorization, however widely you post it.",
        "The Rule's definition of marketing (45 CFR 164.501) is a communication about a product or service that encourages people to buy or use it. Under 45 CFR 164.508(a)(3), a covered entity needs a patient's written authorization for any use or disclosure of protected health information for marketing, with narrow exceptions such as face-to-face communication. So the question for each video is not “is this marketing?” but “does it use anything about a real patient?”",
        "The same definition excludes communications for a patient's own treatment, for example recommending treatment or describing a service the practice provides, unless the practice receives payment from a third party for sending them. Sending a root canal patient your aftercare video before their appointment generally falls on that side of the line.",
      ],
    },
    {
      heading: "When do you need a patient's written HIPAA authorization?",
      paragraphs: ["Whenever a video or caption uses a real patient's information to promote the practice. Common cases:"],
      list: [
        "A patient's face, voice, smile or hands in the video, including in the background.",
        "Their story, quote or thank-you, even without a name.",
        "Radiographs, intraoral photos or scans that could be linked to them.",
        "Tagging, naming or otherwise confirming that someone is a patient, including in replies to comments and reviews.",
        "Sending patients a video about another company's product because that company pays you.",
      ],
      after: [
        "Our guide to [patient consent for dental social media](guide:patient-consent-dental-social-media) covers what a HIPAA authorization for marketing should say, and [how to respond to negative dental reviews](guide:how-to-respond-to-negative-dental-reviews-hipaa) covers the reply trap. Videos built from models, diagrams and narration avoid the question entirely.",
      ],
    },
    {
      heading: "What do state dental board advertising rules usually cover?",
      paragraphs: [
        "Each state's dental practice act and board rules set their own advertising requirements, and they differ. Read your own board's rules before you rely on any summary. In general terms they commonly address:",
      ],
      list: [
        "False, misleading or deceptive claims, including claims about results.",
        "Specialty announcements: who may call themselves a specialist, and how general dentists may describe their services.",
        "Advertised fees and discounts, and the disclosures that must go with them.",
        "Testimonials and endorsements, and when they need a disclaimer.",
        "Which licensed dentist is responsible for the advertisement.",
      ],
      after: [
        "Our [US dental advertising rules guide](guide:dental-advertising-rules-us) quotes the rules of three large states, Texas, Florida and California, and the federal FTC rules that apply on top of them. Patient education videos that make no offers, show no prices and use no testimonials stay clear of most of these provisions.",
      ],
    },
    {
      heading: "What does the ADA Code say about educational content?",
      paragraphs: [
        "The ADA Principles of Ethics and Code of Professional Conduct bind ADA members, and its wording is a useful benchmark for everyone. Section 5.F says no dentist shall advertise or solicit patients in any form of communication, including social media, in a manner that is false or misleading in any material respect. Four advisory opinions matter for videos:",
      ],
      list: [
        "5.F.1, published communications: a dental health article or message published under a dentist's byline without truthful disclosure of its source and authorship is a misleading representation.",
        "5.F.2, examples of false or misleading: statements that create an unjustified expectation about results, or claim superior quality without reasonable substantiation.",
        "5.F.7, social media: claims that a product or service is safe and effective need scientific support. The Code gives unsubstantiated statements about fluoride as an example, and requires paid partnerships to be disclosed.",
        "5.I, general practitioners: general dentists may announce the services they provide, but must avoid implying specialization.",
      ],
      after: [
        "5.F.1 is the one practices overlook. If a video was written by an agency or software, do not present it as the dentist's own work, for example “Dr. Lee explains”, unless the dentist wrote or genuinely reviewed it. “Reviewed by Dr. Lee” is fine when it is true.",
      ],
    },
    {
      heading: "Which wording is risky, and what is safer?",
      paragraphs: ["Most problems sit in one phrase. Common ones in US dental videos, and calmer wording that keeps the information:"],
      table: {
        caption: "US patient education videos: risky wording and safer alternatives",
        columns: ["Risky wording", "Why it is a problem", "Safer wording"],
        rows: [
          ["“Painless root canals”", "An unjustified expectation about results (ADA 5.F.2; state misleading-advertising rules)", "“Done under local anesthetic. We'll explain what to expect.”"],
          ["“The safest whitening in town”", "A superiority claim that needs substantiation", "“Professional whitening starts with a check of your teeth and gums.”"],
          ["“Fluoride is toxic, so we avoid it”", "An unsubstantiated safety claim (ADA 5.F.7)", "Stay with mainstream guidance; answer fluoride questions in person"],
          ["“Our implant specialist”, for a general dentist", "Implies specialization (ADA 5.H and 5.I; state specialty rules)", "“Our general dentist, who places implants”"],
          ["“Look at Maria's new smile!”", "Identifies a patient for marketing (HIPAA authorization needed)", "Use a model or animation, or get written authorization first"],
        ],
        note: "Examples for illustration, not a complete list. Your state board's rules decide what applies to you.",
      },
    },
    {
      heading: "What should a US practice check before posting each video?",
      paragraphs: [],
      ordered: true,
      list: [
        "Does the video or caption use any real patient's information? If yes, is there a signed HIPAA authorization for this use?",
        "Is every factual claim supported by mainstream evidence?",
        "Does it avoid promising results, comfort or permanence?",
        "Does it avoid superiority claims and specialist titles the dentist cannot use in your state?",
        "If it mentions a fee or discount, does it meet your state board's disclosure rules? Better: leave prices out of education videos.",
        "Is authorship honest: does it avoid presenting someone else's script as the dentist's own words?",
        "If a vendor paid for a mention, is the paid partnership disclosed?",
      ],
      after: [
        "Paste the caption or script into the free [“Is my post allowed?” checker](checker:), choose the US, and it will mark each sentence with the reason and a calmer wording. It is a filter, not legal advice.",
      ],
    },
    {
      heading: "How does DentVideo fit the US rules?",
      paragraphs: [
        "[DentVideo](landing:) never asks for patient information, so the videos it makes contain no protected health information. Each week's five patient education videos are written with the ADA Code and FTC rules in mind, and every script and caption is software-checked for commonly restricted claims and clinical accuracy before you see it. The dentist approves every video and posts it, and the site says plainly that scripts are written by software and narrated by a synthetic voice, which keeps authorship honest.",
        "For how this compares with filming yourself, a library or an agency, see [the four ways to get patient education videos](guide:best-way-to-get-patient-education-videos) and [dental video marketing for small practices](guide:dental-video-marketing-for-small-practices). You can [see a free preview of your own videos](start:) before choosing a plan.",
      ],
    },
  ],
  faq: [
    { q: "Do I need patient consent for general education videos?", a: "Not under HIPAA, if the video uses no patient information. A narrated explainer about flossing or crowns needs no authorization. You need written authorization as soon as a real patient, their story or their images are used to promote the practice." },
    { q: "Can I send patient education videos to my own patients?", a: "Generally yes. HIPAA's definition of marketing excludes communications about a patient's own treatment, such as aftercare, unless a third party pays you to send them. Follow your usual communication preferences and opt-outs." },
    { q: "Does the ADA Code apply if I am not an ADA member?", a: "The Code binds ADA members. Every licensed dentist is bound by their state's dental practice act and board rules, which also prohibit misleading advertising. The Code is a useful benchmark either way." },
    { q: "Do I need to say a video was made with software?", a: "The ADA Code treats content published under a dentist's byline without truthful disclosure of source and authorship as misleading, so do not present it as the dentist's own words. Platforms may also require labels for realistic AI content." },
    { q: "Is this legal advice?", a: "No. It is general information based on the HIPAA Privacy Rule text and the ADA Code as read on the review date. State rules vary; check your board's rules or ask a healthcare attorney before relying on it." },
  ],
  sources: [HIPAA_MARKETING, HIPAA_AUTH, ADA_CODE_PDF, ADA_CODE_PAGE],
};

/** In hub order: the two decision guides, the small-practice guide, then the UK and US rules pages. */
export const BUYERS_EN: Guide[] = [AGENCY_VS_SOFTWARE, BEST_WAY, SMALL_PRACTICES, UK_PRACTICES, US_PRACTICES];
