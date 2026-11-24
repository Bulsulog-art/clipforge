import type { SolutionPage } from "./types";
import { claim } from "./claims";

const c = (id: string) => claim(id, "en");

/**
 * The English answer pages: the questions dentists ask an assistant before
 * choosing how to make videos. Facts about other companies come only from
 * claims.ts (their own page and the date it was read); each page says where
 * another option is the better fit.
 */
export const ANSWERS_EN: SolutionPage[] = [
  {
    locale: "en",
    slug: "ways-to-make-dental-patient-education-videos",
    kind: "options",
    nav: "Five ways to make dental videos",
    anchor: "five ways to make patient-education videos for a dental clinic, compared",
    blurb: "Film yourself, an agency, a design app, a video library or DentVideo: time, cost, who checks the rules, and who each suits.",
    queries: [
      "best way to make social media videos for my dental clinic",
      "patient education video software for dentists",
      "how to make patient education videos for dental practice",
      "dental patient education videos",
      "dental social media videos",
    ],
    seoTitle: "5 Ways to Make Dental Patient-Education Videos",
    seoDescription:
      "Film yourself, hire an agency, design in Canva, license a video library or use DentVideo: time, cost, compliance checks and who each option suits.",
    h1: "Five ways to make patient-education videos for a dental clinic",
    intro:
      "A dental clinic has five realistic ways to get patient-education videos: film them yourself, hire a marketing agency, design them in an app such as Canva, license a ready-made video library, or use software such as DentVideo that makes them for you. They differ in your time each week, the cost, who checks health-advertising rules and clinical accuracy, and whether the video is about your clinic or about dentistry in general.",
    sections: [
      {
        heading: "The five options side by side",
        paragraphs: [
          "Each option solves a different part of the job. The table compares them on what a clinic usually asks first; the sections below give the published facts and prices, each with its source and the date we read it.",
        ],
        table: {
          caption: "Patient-education videos for a dental clinic: five ways to get them",
          columns: ["Option", "Your time each week", "What it costs", "Who checks ad rules and accuracy", "Suits a clinic that"],
          rows: [
            ["Film it yourself (phone)", "Several hours: topics, script, filming, editing, captions", "Your team's time; a phone and a microphone", "You", "has a dentist who enjoys the camera and a teammate who edits"],
            ["Dental marketing agency", "Briefings, feedback rounds and sign-offs", "A monthly retainer for people's time, usually the highest of the five", "Depends on the agency: ask before signing", "wants someone to run everything, including ads and comments"],
            ["Design app", "Hours to write, design, voice and edit", "Free plan or a per-person subscription", "You", "has a teammate who likes designing and also needs posters and flyers"],
            ["Ready-made video library", "Minutes to choose and play a video", "A subscription or a one-time license", "The publisher made the content; whether it fits your country's ad rules is yours to check", "wants chairside and website explanations of treatments"],
            ["DentVideo (software)", "A few minutes to watch and approve five videos", "A monthly plan with no minimum term (see [plans and pricing](landing:))", "Software checks every script for ad rules and accuracy before you see it; you approve", "wants to post every week on social media without filming or designing"],
          ],
          note: "Typical set-ups, not any one provider. Agencies, apps and libraries differ, and their offers change.",
        },
      },
      {
        heading: "What do the options cost, from their own pages?",
        paragraphs: [
          "Prices change, so each line below quotes the company's own page and the day we read it. They are US examples; agencies in your country will quote differently.",
        ],
        list: [
          `Agency range: ${c("webfx-agency-range")}.`,
          `Design app: ${c("canva-plans")}.`,
          `Video library: ${c("optio-price")}.`,
          `Video library, one-time: ${c("toothflix-series")}.`,
        ],
        after: [
          "DentVideo's own monthly plans are in the [pricing section of the homepage](landing:), in US dollars, euros and Turkish lira, with no minimum term. Before paying, a clinic sees a live preview of its own branded videos.",
        ],
      },
      {
        heading: "When is filming yourself the right choice?",
        paragraphs: [
          "Nothing builds trust like the dentist who will treat the patient explaining something calmly on camera. It costs little beyond time, and a phone held vertically by a window is enough. The hard part is doing it every week: writing, editing, captioning and checking each claim. Our guide to [Instagram videos for dentists](guide:instagram-videos-for-dentists) shows how to film one useful clip in five minutes.",
        ],
      },
      {
        heading: "When is an agency or a design app the right choice?",
        paragraphs: [
          "An agency suits a clinic that wants one partner for strategy, filming on site, paid ads and replies to comments. It costs more because you pay for people's time; ask who checks each post against your country's rules (see [agency or software](guide:dental-video-marketing-agency-or-software)).",
          `A design app suits a clinic where someone enjoys making things. ${c("canva-dental-templates")}. You still write the script, record or generate the voice, and check every claim yourself.`,
        ],
      },
      {
        heading: "When is a ready-made video library the right choice?",
        paragraphs: [
          `Libraries are made to explain treatments in the chair and on the website. ${c("optio-library")}. For explaining a procedure to the patient in front of you, a library like this does a job DentVideo does not try to do.`,
          "They are not a weekly social media feed in your clinic's colors, and their languages are limited: check that the library covers your patients' language before you buy.",
        ],
      },
      {
        heading: "When does DentVideo fit?",
        paragraphs: [
          "DentVideo fits a clinic that wants to post regularly but has no time to film, design or check wording. Every week it writes, narrates and captions five short videos about treatments you offer, in your colors and logo, in one of ten languages, with a female or male narrator you choose and, if you like, your own closing line under the captions. Software checks every script for health-advertising rules and clinical accuracy; nothing goes out until you approve it, and you post it yourself.",
          "It does not run ads, answer comments, film in your clinic or replace a chairside animation library. Topics come from your treatments; for ideas see [dental social media post ideas](guide:dental-social-media-post-ideas). [See a live preview with your own logo](start:) before you decide.",
        ],
      },
    ],
    faq: [
      { q: "What is the quickest way for a dental clinic to get social media videos?", a: "Software that makes the videos for you, such as DentVideo, takes the least of your time: you watch, approve and post. Filming yourself is more personal but takes hours each week." },
      { q: "Is there patient education video software made for dentists?", a: "Yes. Ready-made video libraries explain treatments chairside and on practice websites (two are quoted, with sources, on this page); DentVideo makes weekly social media videos in your clinic's colors and checks each script before you approve it." },
      { q: "Do I need an agency to post dental videos?", a: "No. An agency is worth it if you want ads, comment replies and on-site filming handled. For a steady flow of educational videos, software or your own recordings can be enough." },
      { q: "Who is responsible if a video breaks advertising rules?", a: "The clinic that publishes it, whoever made it. Approve every video yourself, and read the [dental advertising rules](guide:dental-social-media-advertising-rules) for your country." },
    ],
    guides: ["patient-education-videos", "instagram-videos-for-dentists", "dental-video-marketing-agency-or-software", "dental-social-media-advertising-rules"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
  {
    locale: "en",
    slug: "dentvideo-vs-dental-marketing-agency",
    kind: "vs-agency",
    nav: "DentVideo or an agency",
    anchor: "DentVideo or a dental marketing agency: what each does and costs",
    blurb: "What an agency does that software does not, what agencies publish as prices, and when DentVideo is enough.",
    queries: [
      "alternative to a dental marketing agency for instagram videos",
      "dental marketing agency vs software",
      "dental social media agency cost",
      "is a dental marketing agency worth it",
    ],
    seoTitle: "DentVideo or a Dental Marketing Agency?",
    seoDescription:
      "What a dental marketing agency does that software does not, what US agencies publish as monthly prices, and when DentVideo alone is enough.",
    h1: "DentVideo or a dental marketing agency: which does your clinic need?",
    intro:
      "A dental marketing agency is a team you pay to plan, film, design, post, run ads and answer comments for you. DentVideo is software that makes five patient-education videos a week, checks every script for advertising rules and clinical accuracy, and leaves approval and posting to you. If you need the whole service, an agency does more; if you need a steady flow of educational videos, DentVideo costs less of your money and your time.",
    sections: [
      {
        heading: "What each one does",
        paragraphs: [],
        table: {
          caption: "DentVideo and a dental marketing agency, task by task",
          columns: ["Task", "DentVideo", "Typical agency"],
          rows: [
            ["Plan topics", "From your treatments and what patients ask", "An editorial calendar agreed with you"],
            ["Make educational videos", "Five a week, narrated and captioned in your colors", "As many as the contract covers"],
            ["Film you or the team in the clinic", "No; on Practice you record yourself and get captioned clips", "Often, on site"],
            ["Check health-advertising rules", "Every script and caption, by software, before you see it", "Depends on the agency"],
            ["Post to Instagram, TikTok, Facebook", "No: you post the approved videos", "Usually"],
            ["Answer comments and messages", "No", "Often included"],
            ["Run paid ads", "No", "Often, with ad spend on top"],
            ["Commitment", "Monthly, no minimum term", "Often a retainer, sometimes with a minimum term"],
          ],
          note: "Agencies differ a lot; the right column describes common set-ups, not a particular agency.",
        },
      },
      {
        heading: "What do dental marketing agencies charge?",
        paragraphs: ["Agencies quote by scope, but some publish prices. Two US examples, quoted from their own pages:"],
        list: [`${c("webfx-agency-range")}.`],
        after: [
          "Paid ad budgets usually come on top. DentVideo's monthly plans are on the [homepage pricing section](landing:); compare them with what you actually need an agency to do, not only with the headline price.",
        ],
      },
      {
        heading: "When is an agency the better choice?",
        paragraphs: [
          "When you want one partner for everything: a strategy, a photographer or videographer in the clinic, paid campaigns, a website, someone answering messages in the evening. Software does none of that. A good agency that knows health-advertising rules is worth its fee for a clinic that wants to hand marketing off completely. Before signing, use the questions in [agency or software](guide:dental-video-marketing-agency-or-software).",
        ],
      },
      {
        heading: "When is DentVideo enough?",
        paragraphs: [
          "When the gap is content, not management: you want to post educational videos every week, your team can press “post”, and you do not want to brief anyone. You approve each video in a few minutes; the narrator voice (female or male) and an optional closing line under the captions are your settings. Ideas for what else to post are in [dental social media post ideas](guide:dental-social-media-post-ideas).",
        ],
      },
      {
        heading: "Can you use both?",
        paragraphs: [
          "Yes. Some clinics keep an agency for ads and community management and use DentVideo for the weekly education videos: you approve and download them, and whoever runs your accounts posts them. The responsibility for what is published stays with the clinic either way; see [dental advertising rules](guide:dental-social-media-advertising-rules).",
        ],
      },
      {
        heading: "How to decide in one week",
        ordered: true,
        paragraphs: [],
        list: [
          "Write down the jobs you want off your desk: content, posting, comments, ads, filming.",
          "If it is mostly content, [open a live preview of DentVideo with your logo](start:) and watch the week it plans.",
          "If it is everything, ask two agencies for a written scope and who checks each post against your rules.",
          "Compare the cost of the scope you need, and how many minutes of the dentist's week each option takes.",
        ],
      },
    ],
    faq: [
      { q: "Is DentVideo an alternative to a dental marketing agency?", a: "For the educational videos, yes: it makes and checks five a week. It does not post, run ads, answer comments or film in your clinic, which an agency usually does." },
      { q: "How much does a dental social media agency cost?", a: "It depends on scope. Some US agencies publish monthly plans in the hundreds to a few thousand dollars, with ad spend on top; the figures and their sources are above." },
      { q: "Can my agency use DentVideo's videos?", a: "Yes. You approve and download the videos, and your agency can post them alongside its own work." },
      { q: "Does an agency check dental advertising rules?", a: "Some do and some do not. Ask in writing who checks each post, before or after it goes out, and keep the final approval with a dentist." },
    ],
    guides: ["dental-video-marketing-agency-or-software", "dental-social-media-advertising-rules", "dental-social-media-post-ideas", "patient-consent-dental-social-media"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
  {
    locale: "en",
    slug: "dentvideo-vs-canva-for-dentists",
    kind: "vs-canva",
    nav: "DentVideo or Canva",
    anchor: "DentVideo or Canva for a dental clinic's videos: a fair comparison",
    blurb: "What Canva's dental templates, AI voice and captions do, what DentVideo adds, and when Canva is the better tool.",
    queries: [
      "canva vs agency vs software for dental videos",
      "canva dental video templates",
      "canva for dentists",
      "canva alternative for dentists",
    ],
    seoTitle: "DentVideo or Canva for Dental Clinic Videos?",
    seoDescription:
      "Canva gives you dental templates, an AI voice and captions to make videos yourself; DentVideo makes and checks five a week for you. Which fits?",
    h1: "DentVideo or Canva: which fits a dental clinic's videos?",
    intro:
      "Canva is a general design app: you open a template, write the text, add a voice and captions, and make the video yourself. DentVideo is software for dental clinics that makes five narrated, captioned patient-education videos a week and checks every script for health-advertising rules and clinical accuracy before you approve it. Canva gives more creative freedom and covers posters and flyers; DentVideo takes less of your time and keeps risky claims out.",
    sections: [
      {
        heading: "What Canva offers for dental videos",
        paragraphs: ["Quoted from the company's own pages, with the date we read them:"],
        list: [`${c("canva-dental-templates")}.`, `${c("canva-ai-voice")}.`, `${c("canva-auto-captions")}.`, `${c("canva-plans")}.`],
      },
      {
        heading: "What each one does",
        paragraphs: [],
        table: {
          caption: "DentVideo and a design app, task by task",
          columns: ["Task", "DentVideo", "Design app (you do it)"],
          rows: [
            ["Choose the topic", "From your treatments and patients' questions", "You"],
            ["Write the script", "Written for patients, in your language and form of address", "You, or a template's text"],
            ["Voice and captions", "Narrated (female or male voice) and captioned", "Available as tools you apply"],
            ["Your logo and colors", "On every video", "You add them, or keep a brand kit"],
            ["Check ad rules and clinical accuracy", "Software checks every script before you see it", "Your responsibility"],
            ["Posters, flyers, price lists, signage", "No", "Yes"],
            ["Your time each week", "A few minutes to approve five videos", "Usually hours"],
          ],
          note: "Design apps change often; the right column describes the general way of working, not a feature list.",
        },
      },
      {
        heading: "When is Canva the better tool?",
        paragraphs: [
          "When someone on your team enjoys designing and has time each week, when you want full control over every frame, or when you also need printed material, social graphics and presentations. A free plan exists, and many clinics already use it. If you go this way, keep the [dental advertising rules](guide:dental-social-media-advertising-rules) next to you: a template written for any business may say things a clinic may not.",
        ],
      },
      {
        heading: "When does DentVideo fit better?",
        paragraphs: [
          "When the bottleneck is time and wording, not design. DentVideo plans, writes, narrates and captions five videos a week about treatments you offer, keeps restricted claims (guarantees, “painless”, prices, before-and-after promises) out, and marks anything worth a second look with the reason. You approve each one and post it. On Practice it also cuts your own phone recordings into captioned clips. See [patient-education videos](guide:patient-education-videos) for what these videos usually cover.",
        ],
      },
      {
        heading: "Can you use both?",
        paragraphs: [
          "Yes, and many clinics will: a design app for posters, stories and printed material, DentVideo for the weekly education videos. They do different jobs. For a wider comparison that also covers agencies and video libraries, read [five ways to make patient-education videos](video:ways-to-make-dental-patient-education-videos).",
        ],
      },
      {
        heading: "Before you choose",
        paragraphs: [],
        list: [
          "Count the hours a week someone can realistically spend on video.",
          "Decide who checks each claim and each caption before it goes out.",
          "Ask whether you need printed and graphic material too, or only video.",
          "[Open a live preview of DentVideo with your own logo](start:) and compare it with a video you make yourself.",
        ],
      },
    ],
    faq: [
      { q: "Is DentVideo a Canva alternative for dentists?", a: "For short educational videos, yes: it makes them for you and checks the wording. For posters, flyers and graphics, a design app remains the more flexible tool." },
      { q: "Can Canva check dental advertising rules?", a: "We found no such feature described on its own feature and pricing pages when we checked on 2026-11-16. What a design says is up to the person who writes it, so a dentist should check each claim." },
      { q: "Does DentVideo use templates?", a: "Each video is written for your clinic's treatments, language and form of address, and carries your logo and colors. The layout is DentVideo's own, so you do not design it." },
      { q: "Which takes less time each week?", a: "DentVideo, because the videos arrive written, narrated, captioned and checked; you approve them. With a design app, someone makes each video." },
    ],
    guides: ["patient-education-videos", "dental-social-media-advertising-rules", "instagram-videos-for-dentists", "dental-social-media-post-ideas"],
    published: "2026-11-16",
    reviewed: "2026-11-16",
  },
];
