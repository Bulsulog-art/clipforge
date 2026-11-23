import type { Guide } from "../dentvideo";

// Replying to patient reviews (US first, UK note). HHS enforcement facts from the
// HHS resolution agreements and contemporaneous trade-press reports (checked
// 2026-11-17). No settlement amounts: the content tests forbid money figures.

const HHS_NEW_VISION = { label: "HHS Office for Civil Rights: Resolution agreement with New Vision Dental (B. Brandon Au, DDS, Inc.), 2022", url: "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/new-vision/index.html" };
const HHS_ELITE = { label: "HHS Office for Civil Rights: Resolution agreement and corrective action plan, Elite Dental Associates, Dallas (2019, PDF)", url: "https://www.hhs.gov/sites/default/files/elite-dental-ra-cap.pdf" };
const CDA_ELITE = { label: "California Dental Association: Dental practice settles HHS complaint over patient information disclosed in review replies (2019)", url: "https://www.cda.org/news-events/dental-practice-pays-10k-to-settle-disclosures-of-patients-phi-on-social-media" };
const HHS_PRIVACY = { label: "U.S. Department of Health and Human Services: HIPAA Privacy Rule for professionals", url: "https://www.hhs.gov/hipaa/for-professionals/privacy/index.html" };
const FTC_465 = { label: "FTC: Final rule on consumer reviews and testimonials, 16 CFR Part 465 (in force since 21 October 2024)", url: "https://www.ftc.gov/system/files/ftc_gov/pdf/r311003consumerreviewstestimonialsfinalrulefrn.pdf" };
const FTC_REVIEWS = { label: "FTC reviews hub: business guidance, including the Consumer Review Fairness Act", url: "https://www.ftc.gov/reviews" };
const GOOGLE_REVIEWS = { label: "Google Business Profile Help: Manage customer reviews", url: "https://support.google.com/business/answer/3474050" };
const GDC_SM = { label: "General Dental Council: Guidance on using social media (in effect since 27 June 2016)", url: "https://www.gdc-uk.org/docs/default-source/guidance-documents/guidance-on-using-social-media" };

export const REVIEW_REPLIES_EN: Guide = {
  locale: "en",
  slug: "how-to-respond-to-negative-dental-reviews-hipaa",
  category: "rules",
  published: "2026-11-17",
  updated: "2026-11-23",
  reviewed: "2026-11-17",
  title: "How to respond to a negative dental review without breaking HIPAA",
  seoTitle: "How to respond to a negative dental review (HIPAA)",
  seoDescription: "What a dental practice may say in a public reply to a bad review under HIPAA, what led to HHS settlements, reply templates and what to do offline.",
  description: "A guide for dental practices on replying to negative online reviews: what HIPAA allows, the HHS dental settlements over Yelp replies, safe reply templates, review removal and the FTC review rules.",
  h1: "How to respond to a negative dental review without breaking HIPAA",
  intro:
    "A dental practice can reply to a negative review, but the public reply must not confirm the reviewer is a patient or mention any treatment, visit, bill or insurance detail. HIPAA protects that information even when the patient posted it first, and HHS has settled with dental practices over it. Safe replies are short, general and move the conversation offline.",
  takeaways: [
    "Never confirm in a public reply that the reviewer is a patient, or mention treatment, visits, bills or insurance.",
    "Under HIPAA that information stays protected even when the patient posted it first.",
    "A safe reply thanks the reviewer, says you take concerns seriously and gives a direct contact.",
    "Handle the complaint privately, and give the team a one-page review policy.",
  ],
  sections: [
    {
      heading: "Why is replying to a review a HIPAA risk?",
      paragraphs: [
        "The HIPAA Privacy Rule protects individually identifiable health information held by a covered entity, and a dental practice that bills insurance electronically is a covered entity. The fact that someone is your patient is itself protected health information. So is the date of their visit, the treatment they had, what they were charged and what their insurer paid.",
        "A reviewer who writes “my crown fell out after two weeks” has disclosed their own information. That does not give the practice permission to disclose more, or even to confirm it. HIPAA has no exception for defending your reputation in public. The only reliable route to discussing a patient's care publicly is a written HIPAA authorization from that patient, which an unhappy reviewer is unlikely to give.",
      ],
    },
    {
      heading: "What happened to dental practices that got this wrong?",
      paragraphs: [
        "Two published HHS Office for Civil Rights (OCR) cases involve dental practices and review replies. Both ended in a monetary settlement and a corrective action plan:",
      ],
      table: {
        caption: "HHS OCR enforcement involving dental practices and online review replies",
        columns: ["Year announced", "Practice", "What the replies disclosed", "Outcome"],
        rows: [
          ["2019", "Elite Dental Associates, Dallas, Texas", "A patient's last name and details of their health condition in a reply to a Yelp review; OCR found replies disclosing information about other patients too", "Settlement and a corrective action plan with two years of monitoring"],
          ["2022", "New Vision Dental (B. Brandon Au, DDS, Inc.), California", "Patient names, treatment and insurance information in replies to Yelp reviews", "Settlement and a corrective action plan"],
        ],
        note: "Sources: the HHS resolution agreements and trade-press reports listed under Sources.",
      },
      after: [
        "Both started with a complaint from the reviewer. Practices of any size are in scope: OCR has said in announcing these cases that providers must not disclose patients' information when responding to online reviews. Corrective action plans of this kind typically require written policies on disclosures, staff training and, where it was missing content, a revised notice of privacy practices.",
      ],
    },
    {
      heading: "What can a dental practice say in a public reply?",
      paragraphs: [
        "Write every reply as if the reviewer might not be your patient at all. Thank them for the feedback, say that you take concerns seriously, and give a direct contact route. Do not use their name unless it is already the visible account name, and even then a neutral greeting is safer. Some practices use one standard reply for every review, positive or negative, so that a reply never singles anyone out.",
      ],
      table: {
        caption: "Risky reply, why it is risky, and a safer reply",
        columns: ["Risky reply", "Why it is risky", "Safer reply"],
        rows: [
          ["“We're sorry your implant failed, Mr. Lopez, but you missed your follow-up visit.”", "Confirms the person is a patient, names a treatment and an appointment", "“Thank you for your feedback. We take every concern seriously. Please call our office manager at the number on our profile so we can talk this through.”"],
          ["“Our records show you were told about the cost before treatment.”", "Discloses billing information and confirms a record exists", "“We'd welcome the chance to discuss this privately. Please contact our office directly.”"],
          ["“This reviewer has never been to our practice.”", "Can itself confirm or deny patient status", "“We could not match this to our experience and would like to understand more. Please reach out to our office directly.”"],
          ["“Thank you, Sarah, we loved doing your whitening!”", "A friendly reply to a positive review still discloses treatment", "“Thank you for taking the time to leave a review. We look forward to seeing you.”"],
        ],
      },
      after: [
        "Keep replies free of advertising claims too. A reply that promises “painless” care or “guaranteed results” is public marketing text like any other post. You can paste a draft reply into our free [“Is my post allowed?” ad checker](checker:) to catch common restricted claims before you publish; it is a careful filter, not legal advice.",
      ],
    },
    {
      heading: "What should happen offline?",
      paragraphs: ["The public reply is the smallest part of handling a complaint. The real work happens privately:"],
      ordered: true,
      list: [
        "Log the review and alert the dentist or practice manager the same day.",
        "Check internally, without saying anything publicly, whether the reviewer is a patient and what happened.",
        "If they are a patient, contact them privately by phone or a secure channel you already use with them, not by social media direct message.",
        "Listen first. Many complaints are about waiting times, billing or communication rather than clinical care.",
        "Agree what you will do, document it in the record, and follow up.",
        "If the patient chooses to update their review, that is their decision. Do not ask for it in exchange for anything.",
      ],
    },
    {
      heading: "Can a practice remove or prevent bad reviews?",
      paragraphs: [
        "A practice may report a review to the platform if it breaks the platform's own policy, for example spam, off-topic content or a conflict of interest. Google explains in its Business Profile help how to reply to reviews and how to report a review you believe violates its policies. Disagreeing with an honest opinion is not a policy violation.",
        "Federal law limits what a business can do to stop reviews. The Consumer Review Fairness Act makes contract terms that penalize or restrict honest reviews void, so do not put “no negative reviews” clauses in patient forms. The FTC rule on consumer reviews and testimonials (16 CFR Part 465), in force since October 2024, also prohibits using unjustified legal threats, intimidation or false accusations to prevent or remove a review, and prohibits fake reviews and buying positive ones. Offering patients a reward only in exchange for a positive review is the kind of conduct the rule targets.",
      ],
    },
    {
      heading: "Does the same apply in the UK?",
      paragraphs: [
        "HIPAA is US law, but the principle is the same in the UK. The General Dental Council's standards require dental professionals to keep patient information confidential, and its guidance on using social media applies that duty to online comments: a reply should not reveal anything about a patient's care. UK GDPR treats health data as special category data. The safe reply pattern above works in both countries. For UK advertising rules more broadly, see [dental advertising rules in the UK](guide:dental-advertising-rules-uk-gdc-asa).",
      ],
    },
    {
      heading: "How do you build a review policy for the team?",
      paragraphs: [
        "Most mistakes happen when a team member replies quickly from a phone. A one-page policy prevents that. Decide who may reply (usually one or two people), the standard reply texts, the rule that no reply ever confirms patient status or mentions care, and the escalation path for angry or legal-sounding reviews. Train everyone who has access to the practice's Google, Yelp, Facebook and Instagram accounts, and keep a record that the training happened.",
        "The same caution applies to comments under your own posts and to photos and videos of patients, which need a written authorization; see our guide to [patient consent on dental social media](guide:patient-consent-dental-social-media). For US advertising rules in general, read [dental advertising rules in the US](guide:dental-advertising-rules-us).",
        "Reviews also shape what you post. If several people ask the same question, a short education video answering it helps the next patient more than any reply. [DentVideo](landing:) makes five such videos a week in your practice's branding, checks every script for clinical accuracy and commonly restricted advertising claims, and publishes nothing without your approval.",
      ],
    },
  ],
  faq: [
    { q: "Can a dentist respond to a Google review at all?", a: "Yes. HIPAA does not ban replying. It bans disclosing protected health information, including the fact that the reviewer is a patient. A short, general reply that invites the person to contact the office is fine." },
    { q: "The patient posted their own treatment details. Can I correct them?", a: "Not publicly. A patient sharing their own information does not authorize the practice to disclose or confirm anything. Correct the record privately with the patient, not in the reply." },
    { q: "Should I reply to every review?", a: "Many practices reply to all reviews with the same neutral text so that no reply singles anyone out. Whatever you choose, keep every reply free of patient details." },
    { q: "Can I ask patients to leave reviews?", a: "Yes, if you ask everyone, not only happy patients, and offer nothing in exchange for a positive review. The FTC rule on reviews prohibits buying or faking reviews." },
    { q: "Can I sue someone over a negative review?", a: "Defamation claims are possible in principle but rarely helpful, and unjustified legal threats to remove a review can breach the FTC review rule. Talk to a lawyer before any legal step." },
    { q: "Is this legal advice?", a: "No. It is general information about US and UK rules as of the review date. For a specific situation, ask your state dental association, your malpractice carrier or a healthcare attorney." },
  ],
  sources: [HHS_ELITE, HHS_NEW_VISION, CDA_ELITE, HHS_PRIVACY, FTC_465, FTC_REVIEWS, GOOGLE_REVIEWS, GDC_SM],
};
