import type { Guide } from "../dentvideo";

// Patient-education videos by treatment, written for US and UK clinics: what
// patients ask about each treatment, which short videos answer it, and what
// the wording must avoid. Mainstream, hedged clinical statements only; no
// prices, statistics or testimonials. One page per treatment, each a true
// translation group (topic) with the German and Turkish pages.

const NHS_ROOT_CANAL = { label: "NHS — Root canal treatment (what happens, recovery, alternatives)", url: "https://www.nhs.uk/tests-and-treatments/root-canal-treatment/" };
const NHS_WHITENING = { label: "NHS — Teeth whitening (who can legally do it, risks, home kits)", url: "https://www.nhs.uk/tests-and-treatments/teeth-whitening/" };
const NHS_BRACES = { label: "NHS — Braces and orthodontic treatment, including clear aligners", url: "https://www.nhs.uk/tests-and-treatments/braces/" };
const NHS_GUMS = { label: "NHS — Gum disease (symptoms, causes, treatment)", url: "https://www.nhs.uk/conditions/gum-disease/" };
const NHS_KIDS = { label: "NHS — Taking care of children's teeth", url: "https://www.nhs.uk/live-well/healthy-teeth-and-gums/taking-care-of-childrens-teeth/" };
const ADA_IMPLANTS = { label: "ADA MouthHealthy — Dental implants", url: "https://www.mouthhealthy.org/all-topics-a-z/implants" };
const ADA_ROOT_CANAL = { label: "ADA MouthHealthy — Root canals", url: "https://www.mouthhealthy.org/all-topics-a-z/root-canals" };
const ADA_WHITENING = { label: "ADA MouthHealthy — Teeth whitening", url: "https://www.mouthhealthy.org/all-topics-a-z/teeth-whitening" };
const ADA_GUMS = { label: "ADA MouthHealthy — Gum disease", url: "https://www.mouthhealthy.org/all-topics-a-z/gum-disease" };

const DATES = { published: "2026-11-14", updated: "2026-11-14", reviewed: "2026-11-14" } as const;

export const TREATMENTS_EN: Guide[] = [
  {
    locale: "en",
    slug: "dental-implant-patient-education-videos",
    topic: "treatment-implants",
    category: "treatments",
    ...DATES,
    title: "Dental implant patient education videos: what patients ask, what to film and what to avoid saying",
    seoTitle: "Dental implant patient education videos",
    seoDescription: "Which short implant videos to make for patients, the questions they answer, and the implant claims to avoid: lifetime promises, before/after, testimonials.",
    description: "A practical guide for dental clinics: the questions patients ask about implants, six short videos that answer them, a script structure and the wording that health-advertising rules restrict.",
    h1: "Dental implant patient education videos: what to make and what to avoid",
    intro:
      "A dental implant patient education video is a short, plain-language clip that explains one step of implant treatment — assessment, placement, healing, the crown, or aftercare — so patients arrive with realistic expectations. The most useful ones answer a single question in under a minute, describe the usual sequence without promising a result, and end by inviting the viewer to ask whether implants suit them.",
    sections: [
      {
        heading: "What do patients ask about dental implants?",
        paragraphs: [
          "Implant patients usually research for weeks before they book a consultation, and the same questions come up at almost every first visit. Each one is a video topic. Start with the questions your own team hears most; the list below is a common starting point.",
        ],
        list: [
          "Does it all happen in one appointment, or how many visits does an implant take?",
          "Why do I have to wait between the implant and the final tooth?",
          "Will I be without a tooth while it heals?",
          "Am I suitable — what about bone loss, smoking or diabetes?",
          "What does the procedure feel like, and what happens on the day?",
          "How do I clean around an implant, and does it need check-ups?",
          "What is the difference between an implant, a bridge and a denture?",
          "What should I eat and avoid in the first days after placement?",
        ],
        after: [
          "Notice what is missing from that list: “How much does it cost?” is a real question, but price promotion is restricted or regulated in many countries, so it belongs in a consultation or on your fee page rather than in a social video.",
        ],
      },
      {
        heading: "Which implant videos should a clinic make?",
        paragraphs: [
          "Six short videos cover most of the journey from first search to aftercare. Each can be posted on social media, linked from your implant page, or sent to a patient before the consultation.",
        ],
        table: {
          caption: "Six implant videos and where each helps",
          columns: ["Video", "What it answers", "Where it helps most"],
          rows: [
            ["The stages of implant treatment", "Why it is several visits, not one", "Social media; implant page on your website"],
            ["Is an implant right for me?", "Assessment, X-rays or scans, gum health and bone", "Before the first consultation"],
            ["Implant, bridge or denture?", "The options in neutral terms, decided after an examination", "Website; consultation follow-up"],
            ["The day of placement", "What happens in the chair, local anaesthetic, how long it takes", "Message to the patient before surgery"],
            ["The first week after placement", "Swelling, soft food, cleaning, when to call the clinic", "Aftercare message; waiting room"],
            ["Looking after an implant long term", "Cleaning, check-ups, why gums around implants need care too", "Social media; recall reminders"],
          ],
        },
      },
      {
        heading: "What should implant videos avoid saying?",
        paragraphs: [
          "Implants are a high-value treatment, which is exactly why regulators look closely at how they are advertised. The safest videos explain; they do not sell. The wording below is commonly restricted across the UK, the US and the EU — the exact rules differ by country, so check yours in our [overview of dental advertising rules](guide:dental-social-media-advertising-rules).",
        ],
        table: {
          caption: "Implant wording: risky and safer",
          columns: ["Risky wording", "Why it is a problem", "Safer wording"],
          rows: [
            ["“Permanent teeth” or “teeth for life”", "Implants need maintenance and can fail; it is a promise of a result", "“Designed to be long-lasting with good care and regular check-ups”"],
            ["“Painless implants”", "An absolute claim no clinic can guarantee for every patient", "“Placed under local anaesthetic; we explain what you may feel afterwards”"],
            ["“New teeth in one day” as a headline", "Misleading if it applies only to some cases and leaves out the healing phase", "“In some cases a temporary tooth can be fitted the same day — ask whether that applies to you”"],
            ["Before-and-after photos of a patient", "Restricted or banned for some treatments in several countries, and they need written consent", "An illustration or a model showing the stages"],
            ["Patient testimonials", "Restricted in many countries and covered by consumer law in others", "Explain the process in your own words"],
          ],
        },
        after: [
          "Before you post, paste the caption into our free [“Is my post allowed?” checker](checker:) for a quick first pass. It is a filter, not legal advice; UK clinics should also read the [GDC and CAP Code guide](guide:dental-advertising-rules-uk-gdc-asa) and US clinics the [US dental advertising rules](guide:dental-advertising-rules-us).",
        ],
      },
      {
        heading: "How do you explain an implant in 30 seconds?",
        ordered: true,
        paragraphs: ["Use the same five beats for every implant video. It keeps each clip short and makes a series feel consistent."],
        list: [
          "Open with the patient's question, on screen and spoken, in the first second: “Why can't I get my implant tooth straight away?”",
          "Answer it in one or two plain sentences: the implant needs time to bond with the bone before it carries a crown.",
          "Add one practical detail: many patients wear a temporary tooth or denture during healing.",
          "Name the limit honestly: healing time and options depend on the individual case.",
          "Close with an invitation, not a promise: “Ask us at your check-up whether implants suit you.”",
        ],
        after: [
          "Captions matter more than usual here: implant videos are often watched by older patients, many with the sound off. Our guide to [patient education videos](guide:patient-education-videos) covers length, captions and waiting-room use in more detail.",
        ],
      },
      {
        heading: "Where do implant videos fit in a posting plan?",
        paragraphs: [
          "Implant content works as a short series rather than a one-off. Post the stages video first, then the suitability and aftercare videos in the following weeks, so someone who finds one can watch the rest. Mix them with prevention and everyday topics — a feed that is only implants reads like an advert. The [dental social media post ideas](guide:dental-social-media-post-ideas) guide shows how treatment topics fit into a balanced month, and the [52-week content calendar](guide:dental-social-media-content-calendar) suggests when to schedule them.",
          "Use the same videos off social media too. A link to the stages video in the email that confirms an implant consultation answers the first questions before the patient sits down, and a loop of the aftercare video on a waiting-room screen reminds current patients why check-ups matter.",
        ],
      },
      {
        heading: "How DentVideo makes implant videos for your clinic",
        paragraphs: [
          "[DentVideo](landing:) plans videos only from the treatments you list. If you offer implants, implant topics such as the stages, suitability and aftercare come up in your weekly set alongside prevention topics. Each video is narrated and captioned in your language and colours, and each script is checked for the claims above — “permanent”, “painless”, guarantees, prices, before-and-after promises — and for clinical accuracy before you see it. Nothing is posted until you approve it. You can [see a live preview with your own logo](start:) before choosing a plan.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I use implant animations from a manufacturer in my clinic's videos?",
        a: "Often yes, if the manufacturer's licence allows it — check the terms. Be careful that the video does not turn into product promotion for an implant brand: in several countries promoting a medical device to the public has its own rules.",
      },
      {
        q: "Should implant videos mention how long implants last?",
        a: "Describe what affects longevity — cleaning, check-ups, gum health, smoking — rather than giving a number of years. A specific lifetime reads as a promise and is hard to support for an individual patient.",
      },
      {
        q: "Can I show a patient's implant X-ray in a video?",
        a: "Only with the patient's explicit written consent for that use, and with identifying details removed. Even then, an illustration or a model usually explains the stages more clearly and avoids the consent question entirely.",
      },
      {
        q: "How long should an implant education video be?",
        a: "For social media, about 20 to 60 seconds and one question per video. For the website or a pre-surgery message, one to three minutes covering the whole sequence works well.",
      },
    ],
    sources: [ADA_IMPLANTS],
  },
  {
    locale: "en",
    slug: "clear-aligner-patient-education-videos",
    topic: "treatment-aligners",
    category: "treatments",
    ...DATES,
    sample: "caring-for-clear-aligners",
    title: "Clear aligner patient education videos: topics, a script structure and claims to avoid",
    seoTitle: "Clear aligner patient education videos",
    seoDescription: "Short clear aligner videos patients actually need: wear time, cleaning, attachments, retainers — and the “invisible” and “in X months” claims to avoid.",
    description: "What patients ask about clear aligners, six short videos that answer it, how to script them in five beats, and the wording that advertising rules restrict.",
    h1: "Clear aligner patient education videos: what to make and what to avoid",
    intro:
      "A clear aligner patient education video explains one part of aligner treatment — how many hours to wear them, how to clean them, what attachments are, what happens at check-ups, why a retainer follows — in a short, captioned clip. The useful ones help patients stick to treatment; they do not promise a result or a finish date, because both depend on the case and on how the aligners are worn.",
    sections: [
      {
        heading: "What do patients ask about clear aligners?",
        paragraphs: [
          "Aligner patients have two kinds of question: before treatment (“is this for me?”) and during treatment (“what do I do now?”). The second kind is where videos help most, because a patient who understands the routine is more likely to follow it.",
        ],
        list: [
          "How many hours a day do I really have to wear them?",
          "Can I eat or drink with my aligners in?",
          "How do I clean aligners, and why do they sometimes smell?",
          "What are the small bumps on my teeth (attachments)?",
          "Is it normal for a new set to feel tight?",
          "What happens if I lose an aligner or forget to wear it?",
          "Why do I need a retainer when treatment ends?",
          "Can aligners treat my case, or do I need braces?",
        ],
      },
      {
        heading: "Which aligner videos should a clinic make?",
        paragraphs: ["These six cover the questions above. Most of them are just as useful in a message to a patient who has just started treatment as they are on social media."],
        table: {
          caption: "Six clear aligner videos and where each helps",
          columns: ["Video", "What it answers", "Where it helps most"],
          rows: [
            ["Wearing time, explained", "Why aligners only work while they are in", "Start-of-treatment message; social media"],
            ["Eating and drinking with aligners", "Take them out for anything but water, then brush", "Social media; waiting room"],
            ["Keeping aligners clean and fresh", "Rinsing, gentle cleaning, why hot water is a bad idea", "Start-of-treatment message"],
            ["What attachments are for", "Small tooth-coloured shapes that help the aligner grip", "Before the attachment appointment"],
            ["A new set feels tight", "Pressure is common for a day or two; when to call the clinic", "Social media; follow-up message"],
            ["Why a retainer comes next", "Teeth can move back; retainers keep the result", "End-of-treatment message"],
          ],
        },
      },
      {
        heading: "What should aligner videos avoid saying?",
        paragraphs: [
          "Aligners are marketed heavily by manufacturers and direct-to-consumer brands, so clinic videos sometimes copy that tone by accident. Regulators judge a clinic's post as health advertising. The [overview of dental advertising rules](guide:dental-social-media-advertising-rules) shows how the rules differ by country; these are the patterns to avoid almost everywhere.",
        ],
        table: {
          caption: "Aligner wording: risky and safer",
          columns: ["Risky wording", "Why it is a problem", "Safer wording"],
          rows: [
            ["“Completely invisible”", "An absolute claim; aligners are less noticeable, not invisible", "“Clear and much less noticeable than fixed braces”"],
            ["“Straight teeth in six months”", "Promises a result and a timeline that depend on the case and the patient", "“Treatment time depends on your teeth; we explain it after an assessment”"],
            ["“No dentist visits needed”", "Misleading; aligner treatment needs clinical supervision", "“You'll have regular check-ins so we can see how your teeth are moving”"],
            ["Brand names as the headline", "Turns education into product promotion", "Describe the treatment, not the brand"],
            ["Before-and-after smiles of patients", "Restricted in several countries; needs explicit consent", "Explain the stages with models or illustrations"],
          ],
        },
        after: [
          "Run captions through our free [“Is my post allowed?” checker](checker:) before posting. For photos of patients in any form, read the [guide to patient consent for social media](guide:patient-consent-dental-social-media) first.",
        ],
      },
      {
        heading: "How do you script an aligner video?",
        ordered: true,
        paragraphs: ["Five beats keep each video short and on one point:"],
        list: [
          "Hook with a real moment: “That funny smell from your aligners? Here's why.”",
          "Explain the cause in one sentence: bacteria build up when aligners go back in without brushing.",
          "Give the habit: rinse, brush teeth before putting them back, clean the aligners gently.",
          "Add the limit: if something hurts or an aligner cracks, contact the clinic rather than waiting.",
          "Close with an invitation: “Questions about your aligners? Ask us at your next check-in.”",
        ],
      },
      {
        heading: "When should aligner videos be posted or sent?",
        paragraphs: [
          "Aligner videos do double duty. On social media they show people considering treatment what it involves day to day — which is more convincing than a promise and much safer. In a patient's inbox they reduce the routine questions your team answers by phone. Send the wearing-time and cleaning videos when a patient starts, the tight-set video with the second or third set, and the retainer video near the end.",
          "If your clinic posts a few times a week, one aligner video a week alongside prevention topics is plenty; the [dental social media post ideas](guide:dental-social-media-post-ideas) guide shows a balanced mix.",
        ],
      },
      {
        heading: "How DentVideo makes aligner videos for your clinic",
        paragraphs: [
          "The sample above is a real DentVideo video for a demo clinic. If you list clear aligners as a service, [DentVideo](landing:) plans aligner topics like these into your weekly set, writes and narrates them in your language and colours, and checks each script for absolute claims, promised timelines, brand promotion and clinical accuracy before you see it. You approve each one and post it yourself. [See a live preview with your logo](start:) before you pay.",
        ],
      },
    ],
    faq: [
      {
        q: "Can a clinic name an aligner brand in its videos?",
        a: "Saying which system you use is usually fine as information. A video built around the brand, using the manufacturer's slogans, reads as product advertising — keep the focus on the treatment and the patient's questions.",
      },
      {
        q: "Should aligner videos give a number of hours of wear?",
        a: "Yes, if it is the instruction your clinic actually gives. Present it as the clinic's instruction for its patients, not a universal rule, and remind viewers to follow what their own dentist or orthodontist tells them.",
      },
      {
        q: "Are aligner selfies from patients allowed on the clinic's account?",
        a: "Only with the patient's explicit written consent for that specific use, and depending on your country, a patient's photo can count as a testimonial. When in doubt, explain instead of showing.",
      },
    ],
    sources: [NHS_BRACES],
  },
  {
    locale: "en",
    slug: "teeth-whitening-patient-education-videos",
    topic: "treatment-whitening",
    category: "treatments",
    ...DATES,
    sample: "whitening-myths-debunked",
    title: "Teeth whitening patient education videos: myths, sensitivity and the claims to avoid",
    seoTitle: "Teeth whitening patient education videos",
    seoDescription: "Short whitening videos for dental clinics: enamel myths, sensitivity, crowns and fillings, home kits — and the before/after and “instant” claims to avoid.",
    description: "What patients ask about teeth whitening, six short videos that answer it, a five-beat script and the wording that health and consumer rules restrict for cosmetic treatments.",
    h1: "Teeth whitening patient education videos: what to make and what to avoid",
    intro:
      "A teeth whitening patient education video answers one question about whitening — does it damage enamel, why do teeth feel sensitive afterwards, will it change my crowns, are shop-bought kits the same — in a short, captioned clip. Whitening is a cosmetic treatment, which makes it the topic where clinic videos most easily slide into advertising, so the useful ones explain the facts and leave the decision to a consultation.",
    sections: [
      {
        heading: "What do patients ask about teeth whitening?",
        paragraphs: ["Whitening questions are mostly about safety and expectations. Each is a short video:"],
        list: [
          "Does whitening damage or thin the enamel?",
          "Why are my teeth sensitive after whitening, and how long does it last?",
          "Will whitening change the colour of my crowns, veneers or fillings?",
          "Is home whitening with trays from the clinic different from shop-bought kits?",
          "Can I drink coffee or red wine after whitening?",
          "How long does a whitening result last?",
          "Is whitening suitable during pregnancy or for teenagers?",
          "Why does my dentist want to examine my teeth first?",
        ],
      },
      {
        heading: "Which whitening videos should a clinic make?",
        paragraphs: ["Six videos answer most of these questions without promising a shade or a result."],
        table: {
          caption: "Six whitening videos and where each helps",
          columns: ["Video", "What it answers", "Where it helps most"],
          rows: [
            ["Whitening and enamel: the myth", "What professional whitening does and does not do to enamel", "Social media"],
            ["Sensitivity after whitening", "Why it happens, that it is usually temporary, what helps", "Aftercare message; social media"],
            ["Crowns and fillings don't whiten", "Why existing restorations may need planning", "Before the consultation"],
            ["Clinic trays or shop kits?", "Supervision, fit, and who may legally provide whitening", "Social media; website"],
            ["The first days after whitening", "Staining food and drink, smoking, when to call", "Aftercare message"],
            ["Why we check your teeth first", "Decay, gum problems and restorations to rule out first", "Website; waiting room"],
          ],
        },
        after: [
          "In the UK, the NHS notes that whitening may only be carried out by a dentist or another regulated dental professional on a dentist's prescription — a useful, factual point for the “clinic or kit” video (see sources).",
        ],
      },
      {
        heading: "What should whitening videos avoid saying?",
        paragraphs: [
          "Cosmetic treatments attract the strictest scrutiny of before-and-after images and result promises. These are the patterns to leave out; for the rules in your country, see our [dental advertising rules overview](guide:dental-social-media-advertising-rules).",
        ],
        table: {
          caption: "Whitening wording: risky and safer",
          columns: ["Risky wording", "Why it is a problem", "Safer wording"],
          rows: [
            ["“Eight shades whiter” or “Hollywood smile”", "A promised result that varies from person to person", "“How much lighter teeth become depends on their starting colour”"],
            ["“Instant results”", "Misleading when several sessions or days are usual", "“We explain how many sessions or days your treatment usually takes”"],
            ["“No sensitivity”", "Sensitivity is a common, usually temporary side effect", "“Some people feel temporary sensitivity; we explain how to manage it”"],
            ["Before-and-after photos", "Restricted for cosmetic treatments in several countries; need consent", "Explain with a shade guide or illustration"],
            ["“Summer whitening deal” or discounts", "Price promotion of a health service is restricted in many countries", "Leave offers out of social videos"],
          ],
        },
        after: [
          "A quick way to catch these before posting is our free [“Is my post allowed?” checker](checker:). UK clinics will find the GDC and ASA position in the [UK rules guide](guide:dental-advertising-rules-uk-gdc-asa).",
        ],
      },
      {
        heading: "How do you script a whitening video in 30 seconds?",
        ordered: true,
        paragraphs: ["The same five beats work for every whitening topic:"],
        list: [
          "Start with the myth or the question: “Whitening thins your enamel? Not quite.”",
          "Give the plain answer in one or two sentences, without a number of shades.",
          "Add the practical tip: what to avoid for the first days, or what helps with sensitivity.",
          "Name the limit: crowns and fillings keep their colour; results vary.",
          "Invite, don't sell: “Ask us whether whitening suits your teeth.”",
        ],
      },
      {
        heading: "When should whitening videos be posted?",
        paragraphs: [
          "Interest in whitening tends to rise before weddings, holidays and the new year, and it is tempting to post more cosmetic content then. Keep the mix balanced: a feed full of whitening reads as advertising. One myth-busting whitening video a month next to prevention topics is a sensible rhythm; the [content calendar](guide:dental-social-media-content-calendar) shows where cosmetic topics fit across the year.",
          "The aftercare video is just as valuable off social media: send it on the day of treatment so patients have the advice at home.",
          "Whitening videos are also a good place to show how your clinic thinks. A clinic that explains why it checks for decay and gum problems first, and that says plainly that results vary, earns more trust than one that promises a perfect shade — and it stays on the right side of the rules at the same time.",
        ],
      },
      {
        heading: "How DentVideo makes whitening videos for your clinic",
        paragraphs: [
          "The sample above — “Whitening thins your enamel? Not quite.” — is a real DentVideo video for a demo clinic. If whitening is one of your services, [DentVideo](landing:) plans myth-busting and aftercare topics into your weekly set, narrated and captioned in your language and colours, and checks every script for promised shades, “instant” claims, price promotion and clinical accuracy before you see it. [See your own branded preview](start:) before you choose a plan.",
        ],
      },
    ],
    faq: [
      {
        q: "Can a dental clinic post whitening before-and-after photos?",
        a: "It depends on the country, and the trend is stricter. Several regulators restrict before-and-after images for cosmetic treatments, and all require the patient's explicit consent. Educational videos without patient photos avoid the question.",
      },
      {
        q: "Should whitening videos mention home kits from shops?",
        a: "Yes, factually: explain the difference between supervised whitening and kits bought elsewhere, and where your country restricts who may provide whitening, say so. Avoid disparaging named products.",
      },
      {
        q: "Is it fine to post a whitening video every week?",
        a: "Better not. A feed dominated by one cosmetic treatment reads like an advert. Mix whitening with prevention, children's dentistry and everyday questions.",
      },
    ],
    sources: [NHS_WHITENING, ADA_WHITENING],
  },
  {
    locale: "en",
    slug: "pediatric-dental-patient-education-videos",
    topic: "treatment-kids",
    category: "treatments",
    ...DATES,
    title: "Pediatric dental patient education videos: topics for parents, consent and what to avoid",
    seoTitle: "Pediatric dental videos for parents",
    seoDescription: "Children's dentistry videos for parents: first visit, brushing, sugar, teething, dental fear — plus consent for children's images and wording to avoid.",
    description: "What parents ask about their children's teeth, six short videos that answer it, how to talk about dental fear, and the consent and advertising rules that apply to children.",
    h1: "Pediatric dental patient education videos: what to make for parents",
    intro:
      "A pediatric dental patient education video is a short clip for parents — not children — that answers one question about a child's teeth: when to book the first visit, how to brush a toddler's teeth, what sugar and night-time bottles do, how to prepare a nervous child. The useful ones are calm and practical, use no images of real children without consent, and never scare parents into booking.",
    sections: [
      {
        heading: "What do parents ask about their children's teeth?",
        paragraphs: ["Parents' questions are practical and often anxious. Each makes a short, reassuring video:"],
        list: [
          "When should my child first see a dentist?",
          "How do I brush a baby's or toddler's teeth, and with how much toothpaste?",
          "Is it a problem if my child falls asleep with a bottle?",
          "What snacks and drinks are hardest on children's teeth?",
          "Teething: what is normal and when should I worry?",
          "My child is scared of the dentist — what should I say before the visit?",
          "What are fissure sealants and fluoride varnish?",
          "Do baby teeth matter if they fall out anyway?",
        ],
      },
      {
        heading: "Which children's dentistry videos should a clinic make?",
        paragraphs: ["These six are aimed at parents and are just as useful in a message before a child's first appointment as on social media."],
        table: {
          caption: "Six videos for parents and where each helps",
          columns: ["Video", "What it answers", "Where it helps most"],
          rows: [
            ["The first visit", "When to come and what happens — mostly a look and a chat", "Social media; booking confirmation"],
            ["Brushing little teeth", "Technique, a parent's help, a small smear or pea-sized amount of fluoride toothpaste as advised", "Social media; waiting room"],
            ["Bottles and night-time drinks", "Why milk or juice at night is hard on teeth", "Social media"],
            ["Snacks and how often", "Frequency of sugar matters as well as amount", "Social media; school-term reminders"],
            ["Preparing a nervous child", "Words that help, words that backfire", "Message before the appointment"],
            ["Sealants and varnish", "What they are and why the dentist may suggest them", "Website; follow-up message"],
          ],
        },
        after: [
          "Follow your national guidance for toothpaste amounts and the age of the first visit; the NHS page in the sources is a clear reference for UK clinics.",
        ],
      },
      {
        heading: "What should children's dentistry videos avoid?",
        paragraphs: [
          "Two extra layers apply when children are involved: consent for any image of a child, and advertising rules that protect children. Some countries restrict advertising for health treatments aimed mainly at children — another reason to address parents, not kids. See the [dental advertising rules overview](guide:dental-social-media-advertising-rules) for your country.",
        ],
        table: {
          caption: "Children's dentistry wording: risky and safer",
          columns: ["Risky wording or content", "Why it is a problem", "Safer approach"],
          rows: [
            ["A real child in the chair, filmed in the clinic", "Needs a parent's explicit written consent; the child cannot consent", "Use illustrations, toys or hands-only shots, or skip faces"],
            ["“It won't hurt at all”", "An absolute promise; it also plants the idea of pain in a child's mind", "“The dentist will count your teeth and show you the tools”"],
            ["Scary images of decayed baby teeth", "Fear-based messaging and potentially distressing", "Explain the cause and the habit that prevents it"],
            ["Prizes or contests aimed at children", "Restricted for health services in some countries", "Address parents with practical information"],
            ["“Kids' check-up special”", "Price promotion of a health service", "Leave prices and offers out of social videos"],
          ],
        },
        after: [
          "For images of any patient, child or adult, read the [guide to patient consent for social media](guide:patient-consent-dental-social-media). Our free [“Is my post allowed?” checker](checker:) catches common wording problems in captions.",
        ],
      },
      {
        heading: "How do you talk about dental fear in a video?",
        paragraphs: [
          "Parents often say “don't be scared” or “it won't hurt” with good intentions, but both put the idea of fear and pain into the child's head. A short video for parents can suggest calmer language instead: describe what will happen in neutral words (“the dentist will count your teeth”), read a picture book about a dentist visit, let the child bring a favourite toy, and keep your own worries to yourself.",
          "This is one of the most shared kinds of clinic video, because it helps parents directly — and it shows how your clinic treats children without a single image of one.",
        ],
      },
      {
        heading: "How should a clinic schedule videos for parents?",
        ordered: true,
        paragraphs: ["Children's topics follow the family calendar. A simple rhythm:"],
        list: [
          "Before school starts: the first-visit video and the brushing video.",
          "Around holidays with lots of sweets: the snacks-and-frequency video.",
          "When you send a booking confirmation for a child's first appointment: the nervous-child video.",
          "Every few months: the sealants and varnish video for parents of school-age children.",
        ],
        after: [
          "The [52-week content calendar](guide:dental-social-media-content-calendar) includes these alongside the rest of the year, and the [patient education video guide](guide:patient-education-videos) covers waiting-room use.",
        ],
      },
      {
        heading: "How DentVideo makes children's dentistry videos",
        paragraphs: [
          "If you list children's dentistry as a service, [DentVideo](landing:) plans parent-focused topics like these into your weekly set. The videos use no avatar children or real patients — footage is limited to objects — and every script is checked for absolute promises, fear-based wording and clinical accuracy before you see it. You approve each one. [See a live preview with your clinic's logo](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Can I post photos of children treated at my clinic?",
        a: "Only with a parent's or guardian's explicit written consent for that specific use, and many clinics decide against it altogether. Videos for parents work well without any child on screen.",
      },
      {
        q: "Should pediatric videos be made for children or parents?",
        a: "For social media and advertising purposes, address parents. Some countries restrict health advertising aimed mainly at children, and parents are the ones who book.",
      },
      {
        q: "When should a child first see the dentist?",
        a: "Guidance varies slightly by country; common advice is around the time the first teeth appear or by the first birthday. State your national guidance in the video rather than a single universal age.",
      },
    ],
    sources: [NHS_KIDS],
  },
  {
    locale: "en",
    slug: "gum-disease-patient-education-videos",
    topic: "treatment-gum-disease",
    category: "treatments",
    ...DATES,
    title: "Gum disease patient education videos: bleeding gums, periodontitis and wording to avoid",
    seoTitle: "Gum disease patient education videos",
    seoDescription: "Short gum disease videos for dental clinics: bleeding gums, gingivitis vs periodontitis, cleaning, maintenance — and scare claims and images to avoid.",
    description: "What patients ask about gum disease, six short videos that answer it, how to talk about links with general health without scaring people, and wording advertising rules restrict.",
    h1: "Gum disease patient education videos: what to make and what to avoid",
    intro:
      "A gum disease patient education video explains one thing about gum health — why gums bleed, the difference between gingivitis and periodontitis, what a deep clean involves, why maintenance visits matter — in a short, calm clip. Gum disease is common and often causes no pain in its early stages, so these videos help patients notice the signs early; they should inform, not frighten.",
    sections: [
      {
        heading: "What do patients ask about gum disease?",
        paragraphs: ["Many patients do not know they have gum disease until a dentist tells them. Their questions are a good list of video topics:"],
        list: [
          "My gums bleed when I brush — should I stop brushing there?",
          "What is the difference between gingivitis and periodontitis?",
          "Can gum disease be reversed?",
          "What happens during a deep cleaning (scaling and root planing)?",
          "Why do I need more frequent hygiene visits now?",
          "Does smoking affect my gums?",
          "Is gum disease linked to diabetes or other health problems?",
          "How do I clean between my teeth properly?",
        ],
        after: [
          "The first question is the most common and the most useful to answer: many people brush bleeding areas less, which tends to make things worse. A 30-second video that says “keep cleaning gently and book a check-up” helps.",
        ],
      },
      {
        heading: "Which gum disease videos should a clinic make?",
        paragraphs: ["These six cover the path from first sign to long-term maintenance:"],
        table: {
          caption: "Six gum disease videos and where each helps",
          columns: ["Video", "What it answers", "Where it helps most"],
          rows: [
            ["Bleeding gums: a warning sign", "Why gums bleed and why to keep cleaning gently", "Social media"],
            ["Gingivitis or periodontitis?", "The early, reversible stage and the deeper stage", "Social media; website"],
            ["What a deep clean involves", "Scaling and root planing in plain words", "Message before the appointment"],
            ["Cleaning between teeth", "Interdental brushes or floss, as the hygienist advises", "Waiting room; social media"],
            ["Why maintenance visits matter", "Gum disease needs ongoing care after treatment", "Recall reminders"],
            ["Smoking and your gums", "How smoking can hide bleeding and affect healing", "Social media"],
          ],
        },
      },
      {
        heading: "What should gum disease videos avoid?",
        paragraphs: [
          "Gum disease is where fear-based marketing is most tempting: graphic photos, threats of tooth loss, and big claims about heart disease. Several countries restrict health advertising that is misleading or uses distressing images. Check the details in our [dental advertising rules overview](guide:dental-social-media-advertising-rules).",
        ],
        table: {
          caption: "Gum disease wording: risky and safer",
          columns: ["Risky wording or content", "Why it is a problem", "Safer approach"],
          rows: [
            ["Close-ups of severe gum disease", "Distressing images can be restricted and drive viewers away", "Illustrations or a calm explanation of the signs"],
            ["“Gum disease causes heart attacks”", "Overstates research that shows associations, not simple causes", "“Research links gum health with some general health conditions; ask us what that means for you”"],
            ["“You will lose your teeth”", "Fear-based and not true for every patient", "“Untreated, it can lead to loose teeth — treated early, it can often be managed well”"],
            ["“Cure gum disease for good”", "Periodontitis usually needs ongoing maintenance", "“Treatment and regular maintenance can keep it under control”"],
            ["“Painless deep cleaning”", "An absolute claim about how a patient will feel", "“Usually done with local anaesthetic; we explain what to expect”"],
          ],
        },
        after: [
          "Paste captions into our free [“Is my post allowed?” checker](checker:) before posting; it catches “painless”, guarantees and similar claims in ten languages.",
        ],
      },
      {
        heading: "How do you script a gum disease video?",
        ordered: true,
        paragraphs: ["The same five beats keep every video calm and short:"],
        list: [
          "Hook with the sign, not the disease: “Pink in the sink when you brush?”",
          "Explain in one sentence: bleeding is often the gums reacting to plaque along the gumline.",
          "Give the habit: keep brushing gently, clean between teeth, don't skip the area.",
          "Name the limit: if bleeding continues for more than a week or two, it needs a check-up.",
          "Invite: “Book a check-up so we can look at your gums properly.”",
        ],
      },
      {
        heading: "When should gum disease videos be posted?",
        paragraphs: [
          "Gum health fits naturally into any month, and several countries hold gum health awareness days or months — the [content calendar](guide:dental-social-media-content-calendar) lists the dates for your market. Post the bleeding-gums video early in a series; it is the one most viewers recognise themselves in. Send the deep-clean video before scaling appointments and the maintenance video with recall reminders.",
          "Gum topics also balance a feed heavy on cosmetic treatments. Our [dental social media post ideas](guide:dental-social-media-post-ideas) guide shows a month that mixes prevention, treatment and the team.",
          "Hygienists are often the most natural presenters for gum topics. If a hygienist on your team is willing to record a few minutes, a clip of them showing an interdental brush on a model is more convincing than any graphic — and it puts a familiar face to the maintenance visits you are asking patients to keep.",
        ],
      },
      {
        heading: "How DentVideo makes gum disease videos",
        paragraphs: [
          "[DentVideo](landing:) plans gum health topics into your weekly set from the services you offer, writes and narrates them in your language and colours, and checks every script for fear-based wording, overstated health claims, “painless” promises and clinical accuracy before you see it. No graphic images are used: footage is limited to objects. [See a live preview with your logo](start:) before you pay.",
        ],
      },
    ],
    faq: [
      {
        q: "Can a clinic say gum disease is linked to diabetes or heart disease?",
        a: "Carefully. Research shows associations between gum health and some general conditions, but not simple cause and effect. Say that there are links and suggest patients ask their dentist, rather than stating a cause.",
      },
      {
        q: "Is it fine to show photos of gum disease in a post?",
        a: "Clinical photos of severe disease can be distressing and, in some countries, restricted in advertising. They also need consent if they come from a patient. Illustrations or a clear explanation of the signs usually work better.",
      },
      {
        q: "How often should a clinic post about gum health?",
        a: "A gum health video every few weeks keeps the topic visible without dominating your feed. Pair it with prevention topics such as cleaning between teeth.",
      },
    ],
    sources: [NHS_GUMS, ADA_GUMS],
  },
  {
    locale: "en",
    slug: "root-canal-patient-education-videos",
    topic: "treatment-root-canal",
    category: "treatments",
    ...DATES,
    title: "Root canal patient education videos: myths, what happens and the wording to avoid",
    seoTitle: "Root canal patient education videos",
    seoDescription: "Short root canal videos for dental clinics: what happens, why a crown may follow, aftercare and myths — without absolute promises or fear-based wording.",
    description: "What patients ask about root canal treatment, six short videos that answer it, how to handle root canal fear and myths, and the claims to avoid in captions and scripts.",
    h1: "Root canal patient education videos: what to make and what to avoid",
    intro:
      "A root canal patient education video explains one part of root canal treatment — why it is needed, what happens in the chair, what to expect afterwards, why a crown may follow — in a short, calm clip. Root canal treatment has a reputation that is worse than the experience many patients describe, so these videos help most when they replace myths with plain facts, without promising that nobody will feel anything.",
    sections: [
      {
        heading: "What do patients ask about root canal treatment?",
        paragraphs: ["Most root canal questions come from fear or from stories patients have heard. Each is a good short video:"],
        list: [
          "Why do I need a root canal — can't you just fill the tooth?",
          "Does a root canal hurt?",
          "What actually happens during the treatment?",
          "How many visits does it take?",
          "Why do I need a crown afterwards?",
          "What should I expect in the days after treatment?",
          "Is it better to just take the tooth out?",
          "Is it true that root canals make you ill?",
        ],
      },
      {
        heading: "Which root canal videos should a clinic make?",
        paragraphs: ["These six take a patient from diagnosis to aftercare:"],
        table: {
          caption: "Six root canal videos and where each helps",
          columns: ["Video", "What it answers", "Where it helps most"],
          rows: [
            ["Why a root canal?", "Inflamed or infected pulp, and the aim of keeping the tooth", "Social media; website"],
            ["What happens in the chair", "Local anaesthetic, cleaning the canals, filling and sealing", "Message before the appointment"],
            ["One visit or two?", "Why it depends on the tooth and the infection", "Message before the appointment"],
            ["Why a crown often follows", "Protecting a back tooth after treatment", "Follow-up message"],
            ["The days afterwards", "Tenderness, chewing on the other side, when to call", "Aftercare message"],
            ["Root canal myths", "Common stories, and what mainstream dental bodies say", "Social media"],
          ],
        },
      },
      {
        heading: "What should root canal videos avoid saying?",
        paragraphs: [
          "“Painless root canal” is probably the single most common restricted claim in dental posts. Absolute promises about how a patient will feel are a problem in most countries; see the [dental advertising rules overview](guide:dental-social-media-advertising-rules) for yours.",
        ],
        table: {
          caption: "Root canal wording: risky and safer",
          columns: ["Risky wording", "Why it is a problem", "Safer wording"],
          rows: [
            ["“Painless root canals”", "An absolute claim no clinic can guarantee", "“Done under local anaesthetic — many patients say it feels similar to a filling”"],
            ["“Saves your tooth forever”", "A promised, permanent result", "“The aim is to keep your own tooth; with a good restoration and care it can last a long time”"],
            ["“Root canal or lose your tooth!”", "Fear-based pressure", "“The alternative is usually removing the tooth; we explain both options”"],
            ["Graphic footage of an open tooth", "Distressing; adds to fear rather than reducing it", "An illustration of the tooth's layers"],
            ["Patient quotes such as “didn't feel a thing”", "A testimonial, restricted in many countries", "Explain the anaesthetic in your own words"],
          ],
        },
        after: [
          "Our free [“Is my post allowed?” checker](checker:) flags “painless” and similar words in captions before you post.",
        ],
      },
      {
        heading: "How do you address root canal fear in a short video?",
        paragraphs: [
          "Fear grows in the gap between what patients imagine and what actually happens. A good root canal video narrows that gap: it names the worry in the first second, describes the steps in neutral language, and says what the patient can do if they feel anything during treatment (raise a hand, and the dentist stops). It does not tell people they will feel nothing.",
          "The myth video deserves care. Some patients have read that root canal treatment causes illness. Mainstream dental bodies, including the ADA, describe this idea as unsupported by current evidence; you can say that, link a source in the caption, and avoid mocking anyone who asks.",
        ],
        list: [
          "Hook: “Heard root canals are the worst? Here's what actually happens.”",
          "One sentence on why: the inside of the tooth is inflamed or infected.",
          "Three steps: numbing, cleaning the canals, filling and sealing.",
          "One honest limit: the tooth may feel tender for a few days.",
          "Invite: “Ask us anything before your appointment.”",
        ],
        ordered: true,
      },
      {
        heading: "Where do root canal videos help most?",
        paragraphs: [
          "Off social media more than on it. The single most useful moment is the message that confirms a root canal appointment: a 40-second explanation the patient can watch at home reduces the anxiety that leads to cancellations. The aftercare video belongs in the follow-up message on the same day. On social media, the myth video and the why-a-root-canal video work well as part of a balanced mix — see the [dental social media post ideas](guide:dental-social-media-post-ideas) guide and the [patient education video guide](guide:patient-education-videos).",
        ],
      },
      {
        heading: "How DentVideo makes root canal videos",
        paragraphs: [
          "If you offer endodontic treatment, [DentVideo](landing:) plans root canal topics into your weekly set, narrated and captioned in your language and colours. Every script is checked for “painless” and other absolute claims, fear-based wording, testimonials and clinical accuracy before you see it, and nothing is posted until you approve it. [See a live preview with your own logo](start:).",
        ],
      },
    ],
    faq: [
      {
        q: "Can a dentist say a root canal doesn't hurt?",
        a: "Avoid absolute promises such as “painless”. You can explain that treatment is done under local anaesthetic and that many patients describe it as similar to a filling, and that some tenderness afterwards is common.",
      },
      {
        q: "Should a root canal video mention extraction as an alternative?",
        a: "Yes. Presenting the options fairly is part of informed consent and makes the video more trustworthy. Explain that the choice depends on the tooth and is made after an examination.",
      },
      {
        q: "How do I respond to comments claiming root canals cause illness?",
        a: "Politely, without arguing in public: say that mainstream dental bodies do not support that claim, link a reputable source, and invite the person to discuss their concerns at an appointment.",
      },
    ],
    sources: [NHS_ROOT_CANAL, ADA_ROOT_CANAL],
  },
];
