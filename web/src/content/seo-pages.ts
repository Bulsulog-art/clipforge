/**
 * Search landing pages. Each one answers one real query ("podcast to clips",
 * "OpusClip alternative") with what ClipForge actually does — nothing on
 * these pages may describe a feature that is not live. Competitor pages
 * describe ClipForge, not the competitor's prices or limits, which change
 * and which we cannot keep accurate.
 *
 * Rendered by app/(seo)/[section]/[slug]; listed in the sitemap and llms.txt.
 */

export type SeoFaq = { q: string; a: string };
export type SeoPage = {
  section: "use-cases" | "alternatives";
  slug: string;
  /** <title> — the query, said plainly. */
  title: string;
  description: string;
  h1: string;
  intro: string;
  steps?: { title: string; body: string }[];
  points: string[];
  body: { heading: string; text: string }[];
  faqs: SeoFaq[];
};

const HOW_IT_WORKS = [
  {
    title: "Upload the long video",
    body: "Drop in an MP4 or MOV, or paste a YouTube link. Free accounts take sources up to 5 minutes; Plus takes up to 90.",
  },
  {
    title: "ClipForge picks the moments",
    body: "The audio is transcribed word by word, then every sentence-level moment is scored for hook strength and whether it makes sense on its own. You get up to 12 clips of 25 to 70 seconds, best first.",
  },
  {
    title: "Captions, framing, hook, thumbnail",
    body: "Each clip is cut to 9:16 around the speaker's face, gets word-by-word burned-in captions in one of 5 styles, a hook line and a thumbnail.",
  },
  {
    title: "Download and post",
    body: "Download the MP4s and post them to TikTok, Instagram Reels or YouTube Shorts.",
  },
];

const COMMON_FAQS: SeoFaq[] = [
  {
    q: "Is ClipForge free?",
    a: "Your first clip set is free, with no credit card: a source up to 5 minutes, clips with a small watermark. Plus is $6.99 a week or $49.99 a year and removes the watermark, raises the source limit to 90 minutes and adds credits every cycle.",
  },
  {
    q: "How long does it take?",
    a: "Usually a few minutes for a typical podcast episode: transcription, scoring and rendering all run automatically after upload.",
  },
  {
    q: "Do I need the rights to the video?",
    a: "Yes. Only upload videos you own or are licensed to use.",
  },
];

export const SEO_PAGES: SeoPage[] = [
  {
    section: "use-cases",
    slug: "podcast-to-clips",
    title: "Podcast to clips: turn an episode into vertical shorts with AI",
    description:
      "Upload a podcast episode and get up to 12 captioned 9:16 clips, framed on the speaker and ranked by hook strength. Free first clip set.",
    h1: "Turn a podcast episode into short clips, automatically",
    intro:
      "A one-hour episode has a handful of moments that would work as a 40-second short. ClipForge finds them, cuts them to vertical, keeps the speaker in frame and burns in captions, so you can post the episode's best minutes instead of the whole thing.",
    steps: HOW_IT_WORKS,
    points: [
      "Moments start and end on full sentences, not mid-word",
      "Landscape two-camera setups reframed around the person speaking",
      "Word-by-word captions — most short-form is watched muted",
      "Tell it what to look for: “every time we talk about pricing”",
    ],
    body: [
      {
        heading: "Why podcasts clip well",
        text: "Podcasts are long, conversational and full of self-contained opinions, stories and numbers. Those are exactly the moments that hold attention in a feed. The hard part is finding them in an hour of audio; that is the part ClipForge automates.",
      },
      {
        heading: "Prompt it for a theme",
        text: "Instead of the generally strongest moments you can describe what you want, for example “the funny bits” or “anything about hiring”, and ClipForge returns only matching moments instead of padding the set.",
      },
    ],
    faqs: [
      {
        q: "Does it work with audio-only podcasts?",
        a: "ClipForge needs a video file. For audio-only shows, export the episode as a video with a static image first.",
      },
      ...COMMON_FAQS,
    ],
  },
  {
    section: "use-cases",
    slug: "youtube-to-shorts",
    title: "YouTube video to Shorts: AI cuts your long video into vertical clips",
    description:
      "Turn a long YouTube video into YouTube Shorts, TikToks and Reels: AI picks the moments, captions them and reframes to 9:16. Free to start.",
    h1: "Turn a long YouTube video into Shorts",
    intro:
      "Shorts are the cheapest way to send new viewers to your long videos. ClipForge takes the long video, finds the moments that work alone, and gives you vertical, captioned clips ready to upload as Shorts.",
    steps: HOW_IT_WORKS,
    points: [
      "Paste a YouTube link or upload the file",
      "Up to 12 clips of 25–70 seconds, best first",
      "A written hook and caption suggestion for each clip",
      "9:16 framing that follows the face, not a centre crop",
    ],
    body: [
      {
        heading: "If the YouTube link is blocked",
        text: "YouTube sometimes refuses automated downloads. When that happens ClipForge tells you so; download the video from YouTube Studio and upload the file instead — the result is the same.",
      },
      {
        heading: "Clip length",
        text: "Shorts can be up to 3 minutes, but the clips that hold attention are usually under a minute. ClipForge targets 25 to 70 seconds so each clip has a setup and a payoff.",
      },
    ],
    faqs: COMMON_FAQS,
  },
  {
    section: "use-cases",
    slug: "video-to-tiktok",
    title: "Long video to TikTok: AI clips with captions, framed for 9:16",
    description:
      "Repurpose a long video into TikToks: AI finds the strongest moments, adds word-by-word captions and reframes landscape footage to vertical.",
    h1: "Repurpose a long video into TikToks",
    intro:
      "TikTok rewards a strong first second and captions people can read without sound. ClipForge scores every candidate moment on its opening line and burns in word-by-word captions, so each clip starts with a reason to keep watching.",
    steps: HOW_IT_WORKS,
    points: [
      "Openers are scored: clips that start on filler are ranked down",
      "5 caption styles, from clean to loud",
      "Silence at the start and end is trimmed",
      "Translate a finished clip into 15+ languages",
    ],
    body: [
      {
        heading: "Built for the first three seconds",
        text: "The scoring prompt rejects moments that open with throat-clearing and favours a question, a bold claim, a number or the start of a story. That ranking is what decides which clips come first in your set.",
      },
    ],
    faqs: COMMON_FAQS,
  },
  {
    section: "use-cases",
    slug: "webinar-to-clips",
    title: "Webinar to clips: turn a recorded webinar into short videos",
    description:
      "Cut a recorded webinar or talk into short, captioned clips for LinkedIn, Reels and Shorts. AI picks the self-contained moments.",
    h1: "Turn a recorded webinar into short clips",
    intro:
      "A 60-minute webinar usually has five or six answers worth sharing on their own. ClipForge finds those self-contained answers, cuts them to vertical or square and captions them, so the recording keeps working after the live session.",
    steps: HOW_IT_WORKS,
    points: [
      "Ask for a topic: “every answer about onboarding”",
      "Square 1:1 and landscape 16:9 outputs as well as 9:16",
      "Sources up to 90 minutes on Plus",
      "Captions keep the clip readable in a muted feed",
    ],
    body: [
      {
        heading: "Pick the format for the channel",
        text: "Vertical 9:16 for Reels, TikTok and Shorts; square 1:1 for LinkedIn and feed posts; 16:9 when you want to keep the original frame.",
      },
    ],
    faqs: COMMON_FAQS,
  },
  {
    section: "use-cases",
    slug: "auto-captions-for-short-videos",
    title: "Auto captions for short videos: word-by-word, burned in",
    description:
      "Add animated word-by-word captions to short vertical videos automatically. 5 styles, burned into the MP4, from your long video.",
    h1: "Word-by-word captions, added automatically",
    intro:
      "Most short-form video is watched with the sound off. ClipForge transcribes every word with its timing and burns animated captions into each clip, highlighting the punchiest words, so the clip still lands in a muted feed.",
    steps: HOW_IT_WORKS,
    points: [
      "Burned into the MP4 — no separate subtitle file to upload",
      "5 styles: Bold Pop, Clean, Neon, HYPE and Minimal",
      "Key words emphasised automatically",
      "Captions timed to each spoken word",
    ],
    body: [
      {
        heading: "From a long video, not a short one",
        text: "ClipForge is built to start from the long recording: it finds the moments, then captions them. If you only need captions on a clip you already cut, upload that clip and it is treated as a short source.",
      },
    ],
    faqs: COMMON_FAQS,
  },
  {
    section: "alternatives",
    slug: "opusclip-alternative",
    title: "OpusClip alternative: AI clipping from $6.99/week",
    description:
      "Looking for an OpusClip alternative? ClipForge turns long videos into captioned, speaker-framed vertical clips. Free first clip set, then $6.99/week or $49.99/year.",
    h1: "An OpusClip alternative for creators who pay their own bills",
    intro:
      "OpusClip popularised AI clipping. ClipForge does the same core job — long video in, ranked vertical clips out — and is priced for individual creators: one free clip set, then $6.99 a week or $49.99 a year.",
    points: [
      "Up to 12 ranked clips per video",
      "Prompt what to clip, or let it pick the strongest moments",
      "Speaker-tracked 9:16 framing",
      "Web and a native iOS app",
    ],
    body: [
      {
        heading: "What ClipForge does",
        text: "It transcribes the video, scores sentence-level moments for hook strength and standalone clarity, cuts the best ones to 9:16 around the speaker, burns in word-by-word captions, and writes a hook and a thumbnail for each.",
      },
      {
        heading: "How to compare",
        text: "Run the same video through both and compare the clips you would actually post. Check each tool's current pricing and limits on its own site — they change often, and we only describe ours.",
      },
    ],
    faqs: COMMON_FAQS,
  },
  {
    section: "alternatives",
    slug: "klap-alternative",
    title: "Klap alternative: turn long videos into TikToks and Shorts",
    description:
      "A Klap alternative that turns long videos into captioned, speaker-framed vertical clips. Free first clip set; Plus from $6.99/week.",
    h1: "A Klap alternative with prompt-driven clipping",
    intro:
      "If you want long-video-to-shorts without an agency-sized bill, ClipForge is a simple option: upload, get up to 12 ranked clips with captions and speaker-tracked framing, download, post.",
    points: [
      "Describe the clips you want in plain words",
      "5 caption styles and niche-tuned looks",
      "1:1 and 16:9 outputs besides 9:16",
      "Free to try, no card",
    ],
    body: [
      {
        heading: "How to compare",
        text: "Try the same source in both tools and judge by the clips. For their current pricing and limits, check Klap's site; this page only describes ClipForge.",
      },
    ],
    faqs: COMMON_FAQS,
  },
  {
    section: "alternatives",
    slug: "vizard-alternative",
    title: "Vizard alternative: AI video clipping for podcasts and talks",
    description:
      "A Vizard alternative for podcasts, interviews and talks: AI finds the moments, captions them and frames the speaker in 9:16.",
    h1: "A Vizard alternative for podcasts and talks",
    intro:
      "ClipForge is focused on one workflow: a long, talk-driven video in, short clips out. It works best on podcasts, interviews, webinars and talking-head videos, where the moments live in what people say.",
    points: [
      "Moments chosen from the transcript, sentence by sentence",
      "Face-tracked vertical framing for two-person setups",
      "Translate a clip into 15+ languages",
      "$49.99 a year for 1,200 credits",
    ],
    body: [
      {
        heading: "How to compare",
        text: "Run one episode through both and compare. Vizard's current pricing and limits are on its own site; this page describes ClipForge only.",
      },
    ],
    faqs: COMMON_FAQS,
  },
];

export function findSeoPage(section: string, slug: string): SeoPage | undefined {
  return SEO_PAGES.find((p) => p.section === section && p.slug === slug);
}
