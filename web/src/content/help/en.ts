import type { HelpContent } from "./types";

export const en: HelpContent = {
  meta: {
    title: "DentVideo help center: answers for clinics",
    description: "Step-by-step answers for clinics using DentVideo: first videos, approval, posting, settings, recordings, billing, invoices, privacy and your account.",
  },
  nav: "Help",
  h1: "How can we help?",
  lead: "Short answers for clinics using DentVideo, from your first week of videos to invoices and your data. Search, or pick a topic.",
  search: {
    label: "Search the help center",
    placeholder: "For example: cancel, invoice, approve",
    none: "No answer matches that search. Try another word, or write to us.",
    count: { one: "1 answer", other: "{n} answers" },
  },
  topics: "Topics",
  categories: {
    start: "Getting started",
    review: "Review and approval",
    posting: "Posting your videos",
    settings: "Your clinic's videos",
    recording: "Recording yourself",
    billing: "Plan, billing and invoices",
    account: "Data, privacy and your account",
  },
  readMore: "Read more:",
  shots: {
    setup: "Settings: your clinic's details, logo and color.",
    week: "Videos: this week's videos waiting for your approval.",
    card: "A video marked “Needs a look”, with what to check before posting.",
  },
  stuck: {
    title: "Still stuck?",
    body: "Write to {email}. A person reads every message. If you write from the app (Settings → Help & contact), your clinic ID is filled in, so we find your account straight away.",
  },
  checkSources: {
    clinical: "Patient pages we compared the aftercare rules with",
    advertising: "Official sources by country",
    checked: "Each page was read and compared with its rule on {date}.",
  },
  articles: {
    "first-videos": {
      q: "When do my first videos arrive?",
      a: "Your first week of videos is made right after payment and is usually ready within an hour. The Videos page updates by itself, and we email you as soon as the videos are ready for your review.\n\nAfter that, five new videos arrive every Monday, and we email you each time.",
    },
    "no-videos-this-week": {
      q: "This week's videos aren't there yet. What do I do?",
      a: "New videos are made every Monday. If this week's are not in your library yet, tap “Make this week's videos” on the Videos page. It's usually done within an hour.\n\nIf the page says the videos are delayed, we are already retrying and will email you when they are ready. You can also tap “Try again now”.\n\nA video marked “Could not be made” needs nothing from you. If it happens again, write to us.",
    },
    topics: {
      q: "How are the topics chosen, and can I suggest one?",
      a: "Each week we choose five topics from the services in your settings and the questions patients ask about them. Videos are only ever about services you offer, so an accurate list of services matters most.\n\nTo suggest a topic, use “Suggest a topic for next week” on the Videos page or in Settings: one patient question or subject, up to 140 characters. We use waiting suggestions first, up to three a week, when they fit your services and pass the same clinical and advertising checks as every video. Under “Your suggestions” you see what became of each one, and a suggestion we could not make shows the reason. Under “Topics we did not make” you see the other topics that were left out.",

    },
    "sign-in": {
      q: "I can't sign in, or the email code doesn't arrive.",
      a: "Look in your spam or promotions folder for mail from {email} and mark it as not spam, so the next emails arrive. A code works for 15 minutes, and you can ask for a new one on the sign-in screen.\n\nForgot your password? Tap “Forgot your password?” on the sign-in screen. If no email arrives at all, write to us with the address you signed up with.",
    },
    approve: {
      q: "How do I approve a video?",
      a: "Nothing is published until you approve it, and approving only marks a video as ready to post. We never post for you.",
      steps: [
        "Open Videos and tap “Watch and approve”.",
        "Watch each video, then tap “Approve”, or “Decline” if it isn't right.",
        "When several videos are ready, “Approve all” approves them in one tap. Videos that need a look are never included.",
      ],
    },
    "needs-a-look": {
      q: "What does “Needs a look” mean?",
      a: "Our software check marked something in that video for you to read once more, for example a wording that your country's advertising rules may treat strictly. The reason is on the card, under “What to check before posting”.\n\nWatch the video with that reason in mind. If it suits your clinic, approve it. If not, decline it with a short note. A marked video is never approved without you.",
    },
    "software-check": {
      q: "What does the software check do, and what doesn't it do?",
      a: "Before you see a script, software checks it twice: once for claims that health-advertising rules commonly restrict (promised results, “painless”, “permanent”, superlatives, prices, special offers, before-and-after promises, testimonials), and once against mainstream clinical guidance. What fails is rewritten or not made, and anything worth a second look is marked with the reason.\n\nIt is an automated check. It is not legal advice and not a review by a lawyer or your professional body. Rules differ by country and change over time, so the final say is yours.",
    },
    "how-we-check": {
      q: "How does DentVideo check a video, and against which sources?",
      a: "Before you see one of the videos we write for you, software checks its script and caption twice. Both checks are done by AI software, not by a dentist. Your approval is the final check: nothing is posted until you approve it, and you post it yourself.\n\nOne check is clinical accuracy. The software judges each statement by mainstream guidance, at the level of national health and dental bodies such as the NHS and the American Dental Association (ADA). It looks for wrong or outdated facts, aftercare advice that belongs to a different procedure, and a caption that contradicts the video. Its aftercare rules were compared with the patient pages of the NHS, the ADA, the Oral Health Foundation and the American Association of Orthodontists (AAO), listed below.\n\nThe other check is advertising. The software looks for claims that health-advertising rules commonly restrict, such as promised results, “painless”, superlatives, prices and offers, testimonials and before-and-after promises. For clinics in the countries listed below, it also applies that country's own rules. The list names the official sources for each country, the same ones our free ad checker cites. In other countries it applies the general rules only, and your country's rules may ask for more.\n\nA script that fails a check is rewritten and checked again, or the video is not made. Anything worth a second look is marked “Needs a look” with the reason. Clips cut from your own recordings get the same two checks on what you say, but your words are never changed: anything worth a second look is marked. The software can miss things or get them wrong. It is not a review by a dentist, a lawyer or your professional body, and it is not legal advice.",
    },
    responsibility: {
      q: "Who is responsible for what we post?",
      a: "Your clinic is. You approve every video and post it from your own accounts, so you remain responsible for what you publish, including under your country's health-advertising rules.\n\nThe software check helps you spot common problems, but it does not replace your judgement or legal advice. If you are unsure about a topic or a phrase, decline the video, or ask your professional body before posting.",
    },
    "wrong-video": {
      q: "A video is wrong. What can I do?",
      a: "Don't approve it: a video you don't approve goes nowhere. Tap “Decline”, choose what is wrong and add a note if you like. Your note reaches our team together with the video.\n\nTo have one video changed, tap “Ask for a change” on its card and write what should be different. Only that video is made again, with the same checks, and you approve it again before posting. You can ask for up to 3 changes a week. If the changed version does not pass the checks, your current video stays as it is and the card says so. To change all future videos (logo, color, services, language, voice), use Settings.",

    },
    "background-photos": {
      q: "Can I change a video's background photos?",
      a: "Yes. On the video's card, open “Caption and hashtags · Background photos”, tap one to four photos and tap “Apply”. The video is made again with them. The card shows “Updating photos” until the new version is ready.",
    },
    share: {
      q: "How do I post a video?",
      a: "If sharing doesn't work on your device, tap “Download” and post the video as usual. DentVideo never posts for you and never asks for your social media passwords; if an agency or a colleague runs your accounts, send them the approved videos.",
      steps: [
        "Open an approved video and tap “Post it”.",
        "On a phone, tap “Save video + copy caption”: the video is saved and the caption with hashtags is copied. On a computer, the video downloads instead.",
        "Open Instagram, TikTok, Facebook or WhatsApp, pick the video from your gallery and paste the caption.",
        "Back in DentVideo, tap “Mark as posted”, so you can see what is still to post.",
      ],
    },
    instagram: {
      q: "How do I post a Reel on Instagram?",
      a: "Post from your clinic's account. The caption already contains hashtags; you can shorten or edit it before you share.",
      steps: ["In DentVideo, tap “Post it” and save the video with its caption.", "In Instagram, tap + and choose Reel.", "Pick the video from your gallery, paste the caption and share."],
    },
    "tiktok-shorts": {
      q: "How do I post on TikTok or YouTube Shorts?",
      a: "In “Post it”, use the shorter “TikTok · Shorts” text.\n\nTikTok: tap +, pick the video from your gallery, paste the text and post.\n\nYouTube: in the YouTube app, tap + and upload the video from your gallery. YouTube shows short vertical videos as Shorts. Paste the text as the title or description.",
    },
    facebook: {
      q: "How do I post on Facebook?",
      a: "The videos are vertical MP4 files, the format Facebook Reels take.",
      steps: ["Switch to your clinic's Page, not your personal profile.", "Create a Reel and pick the video.", "Paste the caption and share."],
    },
    "google-business": {
      q: "Can I add the videos to our Google Business Profile?",
      a: "DentVideo has no direct connection to Google, but you can upload a saved video yourself: open your Business Profile on Google Search or Maps, choose to add a photo or video and pick the file.\n\nGoogle reviews videos before showing them and accepts only short clips, so check Google's current limits in its own help pages. If a video is refused, share it on your other channels instead. Hashtags do nothing there, so leave them out.",
    },
    "posting-times": {
      q: "When is a good time to post?",
      a: "Each approved video shows a suggested day and time. We spread the week's videos from Monday to Friday and alternate between lunchtime and the evening in your clinic's country, when many people look at their phones.\n\nThese are suggestions, not rules: posting regularly matters more than the exact minute. Your Instagram or TikTok statistics show when your own followers are online.",
    },
    captions: {
      q: "Do the videos have captions? Are they accessible?",
      a: "Every video shows its key points as text in the picture, so it can be followed with the sound off. The on-screen text is a short version of what the narrator says, not a word-for-word transcript.\n\nFor the full narration, tap “Download subtitles (.srt)” in “Post it”, next to the video download. The file has the narrator's exact words. Its timing is calculated from the pauses in the narration, so it is close but not exact to the word: watch it once with the video before you upload. Videos made before subtitle files existed, and clips from your own recordings, have no .srt file (the clips already show your words on screen).\n\nYouTube and Facebook let you upload an .srt file with a video, where they offer subtitles or captions. Instagram and TikTok do not take a subtitle file: the key points are already in the video, and you can also turn on the app's own automatic captions when you post and correct them with the text from the .srt file. Check that no text appears twice.",

    },
    "other-uses": {
      q: "Can we use the videos on our website or in the waiting room?",
      a: "Yes. The videos made for your clinic are yours to use for your clinic's communication, for example on your website, in a newsletter or on a waiting-room screen. You may keep using the videos you downloaded after you cancel.\n\nSome videos contain licensed stock footage, which may only be used as part of the video, not on its own.",
    },
    "logo-colors": {
      q: "How do I change our logo or brand color?",
      a: "Your next videos use the new logo and color. Videos that are already made keep the old ones.",
      steps: [
        "Open Settings.",
        "Under “Logo and color”, upload a new logo (ideally a PNG with a transparent background, up to 5 MB) or choose a color.",
        "Tap “Save changes”.",
      ],
    },
    language: {
      q: "Can we change the language of the videos, or how they address patients?",
      a: "Yes, in Settings: “Language of your videos” and “How you address patients” (formal or informal). Videos are made in English, German, Spanish, French, Italian, Portuguese, Turkish, Japanese, Arabic and Polish.\n\nThe change applies to your next videos. The app itself switches to that language too, where it is available.",
    },
    services: {
      q: "Why do the services in Settings matter?",
      a: "Videos are only ever made about the treatments listed under “Services you offer”: a treatment that is missing never gets a video, and one you don't offer never appears. Separate services with commas, or use the quick-add buttons.\n\n“Tone” (warm, expert, calm or playful) shapes how the scripts are written. Changes apply to your next videos.",
    },
    "narrator-voice": {
      q: "Can we choose the narrator's voice?",
      a: "Yes. Under “Narrator voice” in Settings, choose a female or a male voice. The narration is a synthetic voice in your videos' language, and we say so openly.\n\nThe choice applies to new videos; videos already made keep their voice. If you want your own voice, the Practice plan turns your recordings into clips.",
    },
    "closing-line": {
      q: "What is the closing line, and why wasn't mine accepted?",
      a: "It is one optional, calm sentence added under the caption of each post, for example “Questions about your gums? Bring them to your next check-up.” If you leave it empty, your posts use our own closing lines.\n\nBefore it is saved, the line is checked against the same advertising rules as the videos. It may not promise results, sound urgent, use an exclamation mark, be a general “contact us”, or steer people to book where your country's rules restrict that. The message under the field says what to change.",
    },
    record: {
      q: "How do I record myself? (Practice plan)",
      a: "We cut your recording into short clips with captions and your logo, check each clip and email you when they are ready, usually within 10 minutes. Your words are never changed; anything worth a second look is marked.\n\nFiles: MP4, MOV or WebM, up to 500 MB. Recordings are part of the Practice plan; on Starter, the Record page shows how to switch. If a patient can be seen or heard, you need that patient's documented consent first.",
      steps: [
        "Open Record and pick one of this week's filming cards.",
        "Prop your phone at eye level near a window and talk through the card, for one to ten minutes.",
        "Choose the video, tap “Upload and make clips” and keep the page open until the upload finishes.",
      ],
    },
    plans: {
      q: "What is the difference between Starter and Practice, and how do we switch?",
      a: "Both include five narrated, captioned videos every Monday, the software check, and your logo and colors. Practice adds clips made from your own recordings, with filming cards that tell you what to record. Current prices are on the plan screen in the app.\n\nTo switch, open Settings → Plan and billing → “Change plan”. The difference for the rest of the billing period is charged or credited the same day. If you only see an “Email us” card there, write to us and we'll switch it for you.",
    },
    invoices: {
      q: "Where do I find invoices and receipts?",
      a: "Payments are handled by Dodo Payments, our merchant of record: Dodo sells you the subscription, charges your card, collects any taxes and issues the invoice. That is also the name on your card statement.\n\nYou get a receipt by email after every payment, and you can download invoices under Settings → Plan and billing → “Manage billing”. Because Dodo issues the invoice, DentVideo does not send a second one.",
    },
    "update-card": {
      q: "How do we change the card we pay with?",
      a: "Open Settings → Plan and billing and tap “Manage billing”. You change the card in our payment provider's secure portal; we never see your full card details.\n\nIf the button isn't there, write to us and we'll send you a secure link. Never send card details by email.",
    },
    "payment-failed": {
      q: "Our payment failed and the videos are paused. What now?",
      a: "Your videos stay in your library, and you can still share them. Only new weekly videos are paused until a payment goes through.\n\nTap “Update payment details” on the Videos page or in Settings, or “Email us for a secure link”. Please don't buy a new plan: you would be charged twice. Once the card works, your weekly videos start again.",
    },
    cancel: {
      q: "How do we cancel?",
      a: "Plans are monthly, with no minimum term. Open Settings → Plan and billing → “Manage billing” and cancel in the payment portal, or write to us and we'll do it for you.\n\nCanceling stops the next payment, and you keep access until the end of the period you have paid for. A period that has started is not refunded in part, unless the law requires it or the service failed; the details are in our Refund Policy.",
    },
    "after-cancel": {
      q: "What happens to our videos after we cancel?",
      a: "No new videos are made once the paid period ends. Your library stays for 90 days after that: you can still watch, download and share your videos, and the Videos page shows the date. We email you 14 days and 1 day before it. After the 90 days, the videos, recordings and subtitle files are deleted; your settings and logo are kept.\n\nThe videos you downloaded are yours to use, also after you cancel, so download the ones you want to keep, or everything at once in Settings → Your data → “Download my data”. If you choose a plan again on the Videos page before then, everything stays. If you delete your account, everything is removed at once.",

    },
    group: {
      q: "We have a second location. How do we add it?",
      a: "Groups and practices with several locations are set up with us rather than in the app. Write to us with your locations, and we'll set them up with you. The price is per location.",
    },
    "patient-data": {
      q: "Can we upload patient information, or videos that show patients?",
      a: "DentVideo works without patient data, so please don't upload patient records, and never send patient information to us by email.\n\nIf a recording shows or names a patient, you need that patient's explicit, documented consent before you upload it. DentVideo is not designed for protected health information under the US HIPAA rules.",
    },
    "privacy-dpa": {
      q: "How is our data protected? Is there a data processing agreement?",
      a: "Our Privacy Policy lists what we process, which providers receive it and how long it is kept. For personal data in your uploads, your clinic is the controller and we act as your processor under our Data Processing Agreement, which is part of our terms.\n\nWe don't use your uploads or videos to train AI models, and we don't show your clinic's videos to other customers.",
    },
    "export-data": {
      q: "How do we download all our data?",
      a: "Open Settings → Your data → “Download my data”. You get one file with your clinic details, every video's script, caption and review, and download links for your videos, recordings and logo. The links work for 24 hours, so download what you need soon after.",
    },
    "delete-account": {
      q: "How do we delete our account?",
      a: "Open Settings → Your data → “Delete my account…” and type your clinic name to confirm. Your clinic details, videos, recordings, logo and login are removed straight away and cannot be restored, so download your data first if you want a copy.\n\nIf your plan is still active, the dialog says whether it is canceled at the same time or whether you need to cancel it first. Our payment provider keeps invoices as long as tax law requires, and backup copies are overwritten within 30 days.",
    },
    "reminder-emails": {
      q: "Can we stop the reminder emails?",
      a: "Yes. Every reminder and monthly summary has an “Unsubscribe” link at the bottom. Emails about your account, payments and ready videos keep arriving, because they are part of the service.",
    },
  },
};
