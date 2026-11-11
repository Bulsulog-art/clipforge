import type { LegalText } from "./types";

/** English: the authoritative text. */
export const EN: LegalText = {
  ui: {
    updated: "Last updated",
    prevails: null,
    englishVersion: "English version",
    country: "Montenegro",
    operator: {
      company: "Company",
      legalForm: "Legal form",
      legalFormValue: "Limited liability company under the laws of Montenegro",
      office: "Registered office",
      register: "Register",
      registerValue: "Central Register of Business Entities (CRPS), Montenegro",
      registrationNumber: "Registration number",
      taxId: "Tax ID (PIB)",
      director: "Managing director",
      contact: "Email",
      brand: "Brand",
      brandValue: "{brand} — product: DentVideo",
    },
    table: { provider: "Provider", purpose: "Purpose", data: "Data", location: "Location" },
  },

  subprocessors: {
    hostinger: {
      purpose: "Virtual private server that runs dentvideo.com, the video workers, our database, logins and file storage (our own installation of the open-source Supabase software).",
      data: "All service data: account, clinic profile, uploads, videos, billing references, logs.",
      location: "Germany (EU)",
    },
    openai: {
      purpose: "Writes and reviews scripts, creates the synthetic narration, and transcribes uploaded recordings when our own transcription service is unavailable.",
      data: "Clinic profile details used in scripts, script text, recording audio (for transcription).",
      location: "United States",
    },
    resend: {
      purpose: "Sends service emails (sign-in codes, \"your videos are ready\", billing notices).",
      data: "Email address, clinic name, email content.",
      location: "United States",
    },
    dodo: {
      purpose: "Checkout, subscriptions, invoices, taxes and refunds as merchant of record. For payment data Dodo Payments is an independent controller.",
      data: "Email address, name and billing details, payment data, subscription status.",
      location: "See Dodo Payments' privacy policy",
    },
  },

  docs: {
    terms: {
      title: "Terms of Service",
      description: "The terms for using DentVideo, the patient-education video service for dental clinics, operated by BLS AI Automation DOO (Bulsu Labs), Podgorica, Montenegro.",
      intro: [
        "These terms are the agreement between {legalName} (\"we\", \"us\"), which runs DentVideo under its brand {brand}, and the clinic or professional who creates a DentVideo account (\"you\"). By creating an account or paying for a plan you accept them. If you accept them for a clinic, you confirm that you may bind that clinic.",
        "We have written them in plain language. If anything is unclear, write to {email} before you subscribe.",
      ],
      sections: [
        {
          heading: "1. Who we are",
          blocks: [{ operator: true }],
        },
        {
          heading: "2. For businesses only",
          blocks: [
            "DentVideo is a tool for dental clinics and dental professionals. It is offered only to businesses and professionals acting for their practice, not to consumers or patients. By using it you confirm that you act in the course of your business or profession.",
          ],
        },
        {
          heading: "3. The service",
          blocks: [
            "DentVideo makes short, narrated and captioned patient-education videos for dental clinics. Each week it plans topics from the services you offer, writes scripts, narrates them with a synthetic voice, renders the videos with your clinic's name, colours and logo, and runs automated checks for health-advertising wording and clinical plausibility. On plans that include it, it also turns recordings you upload into short captioned clips.",
            "DentVideo is not a medical device and does not give medical, legal or regulatory advice.",
          ],
        },
        {
          heading: "4. You approve everything before it is published",
          blocks: [
            "Nothing DentVideo makes is published automatically, and DentVideo does not post to social networks. You decide whether to approve, download and share each video, and you are the publisher of anything you share.",
            "Our checks are an aid, not a guarantee. Scripts are written and reviewed by AI models and can contain mistakes. Before you publish, you are responsible for making sure each video is accurate for your practice and follows the rules that apply to you: your professional body's code, health-advertising law and the platforms' rules.",
          ],
        },
        {
          heading: "5. Your account",
          blocks: [
            "Give accurate details about your clinic and keep your login private. You are responsible for what happens under your account. Tell us at {email} if you think someone else has used it.",
          ],
        },
        {
          heading: "6. Plans, prices and payment",
          blocks: [
            "DentVideo is paid in advance; there is no free trial. Before you pay, you can see a live preview of videos in your clinic's name, colours and logo. Current plans, in US dollars:",
            {
              list: [
                "Starter: {starter} per month.",
                "Practice: {practice} per month, or {practiceYear} per year.",
                "Group (groups and multi-location practices): custom terms by agreement — contact {email}. Group cannot be bought on the website.",
                "Founding offer: Practice monthly at {foundingPrice} per month for your first {foundingMonths} months, for the first {foundingClinics} clinics only. After those {foundingMonths} months the subscription continues at the regular Practice price of {practice} per month unless you cancel. The offer ends once {foundingClinics} clinics have taken it.",
              ],
            },
            "Payments are handled by Dodo Payments, which acts as merchant of record and authorised reseller: it sells you the subscription, charges your payment method, appears on your card statement, calculates and collects any applicable taxes and issues your invoice. Dodo Payments' buyer terms also apply to the purchase. We never see your full card details.",
            "Subscriptions renew automatically at the end of each billing period (monthly or yearly) until cancelled. If a payment fails, we may pause new videos until it is resolved.",
            "We may change list prices. We will tell you at least 30 days in advance by email, and a new price applies only from your next renewal after that notice.",
          ],
        },
        {
          heading: "7. Cancellation and refunds",
          blocks: [
            "You can cancel at any time; cancellation takes effect at the end of the period you have paid for, and you keep access until then. Payments for a period that has started are not refunded in part, except where the law requires it or the service failed. The details are in our [Refund Policy](refunds), which is part of these terms.",
          ],
        },
        {
          heading: "8. Your content and patient data",
          blocks: [
            "You keep all rights in what you upload: your logo, clinic details and recordings. You give us permission to store and process them only to run DentVideo for you, including passing them to the providers listed in our [Privacy Policy](privacy).",
            "You confirm that you have the right to use what you upload and that everyone who appears or speaks in a recording has agreed to it.",
            "DentVideo is designed to work without patient data. Do not upload patient records. If a recording shows or names a patient, you need that patient's explicit, documented consent. For any personal data in your uploads you are the controller and we act as your processor under our [Data Processing Agreement](dpa), which is part of these terms.",
            "DentVideo is not designed to act as a HIPAA business associate and must not be used to store or process protected health information under US law.",
          ],
        },
        {
          heading: "9. What you get",
          blocks: [
            "The videos, scripts and captions made for your clinic are yours to use for your clinic's communication, including after you cancel, for everything you have downloaded.",
            "Some videos contain stock footage from Pexels, used under the Pexels licence, and a synthetic voice. You may use them as part of the videos, but not separately (for example, by extracting and reselling the footage).",
            "We do not use your uploads or your videos to train AI models, and we do not show your clinic's videos to other customers.",
            "DentVideo itself (the software, design, templates and brand) remains ours.",
          ],
        },
        {
          heading: "10. Acceptable use",
          blocks: [
            "Do not use DentVideo to make content that is misleading, unlawful or that promises treatment results, and do not try to break, overload, copy or resell the service, or to access other clinics' data.",
            "We may suspend or close an account that breaks these terms. Where possible we tell you first and give you a chance to fix the problem.",
          ],
        },
        {
          heading: "11. Availability and changes",
          blocks: [
            "We work to deliver your videos every week, but we cannot promise the service will always be available or free of errors. Weekly delivery can be delayed, for example by an outage at one of our providers.",
            "We improve DentVideo continuously and may change how it works. If we remove something central to your plan, we tell you in advance, and you may cancel.",
          ],
        },
        {
          heading: "12. Liability",
          blocks: [
            "Nothing in these terms limits liability that cannot be limited by law, such as liability for intent or gross negligence.",
            "Otherwise we are not liable for indirect or consequential losses (for example lost profits, lost patients or harm to reputation), and our total liability for all claims is limited to what you paid us in the 12 months before the claim arose.",
            "Because you approve and publish every video, you are responsible for claims arising from content you publish, including complaints under health-advertising rules.",
          ],
        },
        {
          heading: "13. Ending the agreement",
          blocks: [
            "You can end the agreement by cancelling your plan and deleting your account in Settings. We can end it with 30 days' notice, or at once under section 10. When an account is deleted we delete its data as described in the [Privacy Policy](privacy).",
          ],
        },
        {
          heading: "14. Changes to these terms",
          blocks: [
            "We may update these terms. We email you about material changes at least 30 days before they take effect. If you keep using DentVideo after that, the new terms apply; if you do not accept them, you may cancel before they take effect.",
          ],
        },
        {
          heading: "15. Governing law and courts",
          blocks: [
            "These terms are governed by the laws of Montenegro, and the courts in Podgorica have jurisdiction. This does not take away any protection that the mandatory law of the country where you are based gives you and that cannot be excluded by agreement.",
            "The English text of these terms is authoritative. Translations are provided for convenience; if they differ, the English version prevails.",
          ],
        },
        {
          heading: "16. Contact",
          blocks: ["Questions about DentVideo: {email}. Company matters: {companyEmail}."],
        },
      ],
    },

    privacy: {
      title: "Privacy Policy",
      description: "What personal data DentVideo processes, why, which providers receive it, how long it is kept and your rights.",
      intro: [
        "This policy explains what personal data {legalName} (\"we\", \"us\") handles when a clinic uses DentVideo or when someone visits dentvideo.com, why, who else receives it and how long we keep it.",
        "DentVideo is built to work without patient data. Patients do not use DentVideo, and we ask clinics not to upload anything that identifies a patient without that patient's consent.",
      ],
      sections: [
        {
          heading: "1. Who is responsible",
          blocks: [
            "The controller for account, billing and website data is:",
            { operator: true },
            "For recordings and other material a clinic uploads, the clinic decides what is uploaded and why: the clinic is the controller and we process that data on its behalf under our [Data Processing Agreement](dpa).",
            "Privacy questions and requests: {email}.",
          ],
        },
        {
          heading: "2. What we collect",
          blocks: [
            {
              list: [
                "Account: your email address and your login (we store a password hash, never the password itself), and whether your email address is confirmed.",
                "Clinic profile: clinic name, city and country, language, the treatments you offer, tone, social-media handle, booking link, brand colours and logo.",
                "Recordings you upload (on plans that include them): video and audio, which contain the voice and image of whoever appears, and a transcript.",
                "What we make for you: topics, scripts, captions, narration, rendered videos, check results and your approvals.",
                "Billing: your plan, subscription status, renewal date and the Dodo Payments subscription, customer and payment references. Card details are handled by Dodo Payments and never reach us.",
                "Emails: a record of which service emails we sent to your clinic, and whether you unsubscribed from reminders.",
                "Usage events: a small first-party record of steps such as \"landing page viewed\" or \"plan chosen\", with the page language, campaign tags (utm) and the referring website's host. These events store no cookie ID, no IP address, no browser details and no name or email.",
                "Technical data: your IP address and request details are processed to deliver pages, keep the service secure and limit abuse (short-lived rate-limit counters).",
              ],
            },
          ],
        },
        {
          heading: "3. Cookies and browser storage",
          blocks: [
            "We use only what the service needs: login session cookies, a cookie that remembers your language, a cookie that remembers how far you got in sign-up, and short-lived browser storage while you sign up. We use no advertising or third-party analytics cookies.",
          ],
        },
        {
          heading: "4. Why we use it and on what legal basis",
          blocks: [
            {
              list: [
                "To provide DentVideo under our contract with you: make your videos, process your recordings, show them in your library and email you about them (contract).",
                "To take payment and manage your subscription (contract).",
                "To keep the service secure, prevent abuse and fix errors (legitimate interests).",
                "To understand which pages and channels bring clinics, using the anonymous usage events above (legitimate interests).",
                "To send reminders about an unfinished sign-up, which you can stop with the unsubscribe link (legitimate interests).",
                "To meet legal obligations, such as accounting and tax records (legal obligation).",
              ],
            },
            "We do not sell personal data, we do not use it for advertising, and we do not use your uploads or videos to train AI models.",
          ],
        },
        {
          heading: "5. Who receives it",
          blocks: [
            "We use a small number of providers. Each receives only what it needs for its task:",
            { subprocessors: true },
            "We also look up general search terms (such as a treatment name and language) in Google's public search suggestions and in the Pexels stock-video library. These requests contain no personal data. Our database, logins and file storage run on our own installation of the open-source Supabase software on our server; Supabase Inc. does not receive the data.",
          ],
        },
        {
          heading: "6. International transfers",
          blocks: [
            "We are established in Montenegro, which is outside the EU/EEA. Some providers process data in other countries, including the United States. Where the law that applies to the data requires a safeguard for such a transfer, we rely on an adequacy decision where one exists or on standard contractual clauses (for the UK, with the UK addendum) in our agreements with those providers.",
          ],
        },
        {
          heading: "7. How long we keep it",
          blocks: [
            {
              list: [
                "Account, clinic profile, uploads and videos: while your account exists. When you delete your account in Settings, we delete your files, videos, clinic profile and billing references from our live systems straight away, and your login unless you also use it for another {brand} app. Copies in server backups are overwritten as the backups roll over; within 30 days of deletion no DentVideo data about your account remains with us, except as listed below. We do not restore deleted accounts from backups.",
                "Usage events: kept as anonymous statistics; deleting your account removes their link to your clinic.",
                "Invoices and payment records: kept by Dodo Payments as merchant of record under its own legal obligations, and by us as far as accounting and tax law requires.",
                "Rate-limit counters: minutes to hours.",
                "Clinics we contact with a personalised demo: we create the demo ourselves from public business information (clinic name, city, country, brand colour and logo) and keep it for up to 60 days, unless the clinic signs up. To have a demo deleted sooner, write to {email}.",
              ],
            },
          ],
        },
        {
          heading: "8. Your rights",
          blocks: [
            "Depending on the law that applies to you, you can ask us for access to your data, correction, deletion, restriction, a copy in a portable format, and you can object to processing based on legitimate interests. You can delete your account yourself in Settings. Write to {email}; we answer within one month.",
            "You can also complain to a data protection authority: in Montenegro the Agency for Personal Data Protection and Free Access to Information; in the EU/EEA the authority in your country; in the UK the Information Commissioner's Office; in Türkiye the Personal Data Protection Authority (KVKK).",
            "We apply Montenegro's law on personal data protection and, where they apply to our processing, the EU General Data Protection Regulation (GDPR), the UK GDPR and Türkiye's Law No. 6698 on the Protection of Personal Data (KVKK).",
          ],
        },
        {
          heading: "9. Security",
          blocks: [
            "Connections are encrypted (HTTPS). Each clinic's data is isolated in the database by access rules, files are served only through short-lived signed links, and access to the servers is limited to the people who run DentVideo. No system is perfectly secure; if a breach affects your data, we tell you without undue delay.",
          ],
        },
        {
          heading: "10. Children",
          blocks: ["DentVideo is a business service and is not meant for anyone under 18."],
        },
        {
          heading: "11. Changes",
          blocks: [
            "We update this policy when what we do changes, and change the date at the top. We email account holders about material changes.",
          ],
        },
      ],
    },

    refunds: {
      title: "Refund Policy",
      description: "How cancelling and refunds work for DentVideo subscriptions, including the founding offer.",
      intro: ["This policy is part of our [Terms of Service](terms). In short: cancel any time, keep access until the end of the period you paid for, and if the service failed, we make it right."],
      sections: [
        {
          heading: "1. Cancelling",
          blocks: [
            "You can cancel at any time in Settings (Manage billing) or by writing to {email}. Cancellation stops the next renewal; it takes effect at the end of the monthly or yearly period you have already paid for, and you keep full access until then. Videos you have downloaded stay yours. Deleting your account also cancels the subscription, at once.",
          ],
        },
        {
          heading: "2. No partial-period refunds",
          blocks: [
            "We do not refund the unused part of a period that has started, monthly or yearly, except where the law requires a refund or where the service failed as described below. If you switch plans, the difference for the rest of the current period is charged or credited straight away.",
          ],
        },
        {
          heading: "3. When the service failed",
          blocks: [
            "If, because of a fault on our side, a week's videos were not delivered or could not be used, tell us at {email} within 14 days. We will either make that week's videos again or refund the part of your payment for that period, at our choice. Delays of a few days caused by an outage at one of our providers, or videos you declined for reasons of taste, do not count as a failure.",
          ],
        },
        {
          heading: "4. Founding offer",
          blocks: [
            "The founding offer gives the first {foundingClinics} clinics the Practice plan at {foundingPrice} per month for {foundingMonths} months, paid monthly. After those {foundingMonths} months the same subscription continues at the regular Practice price of {practice} per month unless you cancel. The founding price is tied to that subscription: if you cancel, it ends and may not be available again.",
          ],
        },
        {
          heading: "5. How refunds are paid",
          blocks: [
            "Dodo Payments is the merchant of record for every DentVideo purchase, so refunds are paid by Dodo Payments to the original payment method, including any tax it collected on the refunded amount. Ask us first at {email}; you can also contact Dodo Payments under its buyer terms. Your bank may take several days to show the refund.",
          ],
        },
        {
          heading: "6. Your statutory rights",
          blocks: [
            "DentVideo is sold to businesses and professionals. Where mandatory law nevertheless gives you a right to cancel or to a refund, that right applies in addition to this policy.",
          ],
        },
      ],
    },

    dpa: {
      title: "Data Processing Agreement",
      description: "DentVideo's data processing agreement under Article 28 GDPR: what we process for clinics, how, and the list of sub-processors.",
      intro: [
        "This Data Processing Agreement (\"DPA\") is part of the [Terms of Service](terms) between the clinic (\"controller\") and {legalName} (\"processor\"). It applies whenever material the clinic puts into DentVideo contains personal data and the clinic is the controller of that data. It is concluded when the clinic accepts the Terms; no signature is needed. On request we also provide it as a signed document.",
      ],
      sections: [
        {
          heading: "1. Processor",
          blocks: [{ operator: true }],
        },
        {
          heading: "2. Subject matter, nature and purpose",
          blocks: [
            "We process the clinic's personal data only to provide DentVideo: to store uploads, transcribe recordings, write, narrate and render videos, run checks, show the results in the clinic's library and send service emails. Processing lasts for as long as the clinic uses DentVideo, plus the deletion period in section 9.",
            {
              list: [
                "Data subjects: the clinic's dentists and staff; people who appear or speak in recordings the clinic uploads; patients only if the clinic uploads material that identifies them.",
                "Categories of data: names, email addresses, image and voice, transcripts, clinic profile details. Health data is not required by DentVideo; it is processed only if the clinic uploads it, in which case the clinic is responsible for having a legal basis and the patient's explicit consent.",
              ],
            },
          ],
        },
        {
          heading: "3. Instructions",
          blocks: [
            "We process the data only on the clinic's documented instructions, which are the Terms, this DPA and the clinic's use of the service's settings, unless the law requires otherwise; in that case we tell the clinic first unless the law forbids it. If we believe an instruction breaks data protection law, we tell the clinic.",
          ],
        },
        {
          heading: "4. Confidentiality",
          blocks: ["Everyone at {shortName} who can access the data is bound to confidentiality."],
        },
        {
          heading: "5. Security measures",
          blocks: [
            {
              list: [
                "Encryption in transit (HTTPS) for every connection to the site, the app and our database.",
                "Isolation of each clinic's data by database access rules; a clinic can read only its own rows and files.",
                "Files served only through short-lived signed links; uploads limited by type and size.",
                "Server and provider accounts limited to the people who run DentVideo.",
                "Rate limits and spending limits on every paid processing step.",
                "Self-service account deletion that removes the clinic's data, as described in section 9.",
              ],
            },
          ],
        },
        {
          heading: "6. Sub-processors",
          blocks: [
            "The clinic gives general authorisation for the sub-processors below. We impose data protection obligations on each of them that are no less protective than this DPA, as far as their standard terms allow, and remain responsible for them.",
            { subprocessors: true },
            "We email the clinic at least 30 days before we add or replace a sub-processor. If the clinic objects on reasonable data protection grounds and we cannot resolve it, the clinic may cancel and we refund any prepaid fee for the period after the change.",
            "Not sub-processors: Supabase is open-source software that we run ourselves on the server above (Supabase Inc. receives no data). Google search suggestions and the Pexels stock-video library receive only general search terms, never personal data. Dodo Payments acts for payment data as an independent controller under its own terms.",
          ],
        },
        {
          heading: "7. International transfers",
          blocks: [
            "We are established in Montenegro, outside the EU/EEA, and some sub-processors process data in the United States. Where the GDPR, the UK GDPR or other applicable law requires a transfer mechanism for data sent to us or to a sub-processor, the parties rely on an adequacy decision where one exists, or else on the European Commission's standard contractual clauses (controller-to-processor or processor-to-processor module, with the UK addendum where relevant), which we sign on request.",
          ],
        },
        {
          heading: "8. Assistance, breaches and audits",
          blocks: [
            {
              list: [
                "We help the clinic answer requests from data subjects, for example by finding or deleting material, as far as the service allows.",
                "We help the clinic with security, data protection impact assessments and consultations with authorities where they concern our processing.",
                "We notify the clinic of a personal data breach affecting its data without undue delay after becoming aware of it, with the information we have.",
                "We make available the information needed to show compliance with this DPA and allow audits on reasonable notice, at most once a year unless an authority requires more, at the clinic's cost.",
              ],
            },
          ],
        },
        {
          heading: "9. Deletion at the end",
          blocks: [
            "The clinic can download its videos at any time. When the clinic deletes its account, we delete its data from our live systems straight away; copies in backups are overwritten as they roll over, and within 30 days no clinic data remains with us, unless the law requires us to keep it.",
          ],
        },
        {
          heading: "10. Law and precedence",
          blocks: [
            "This DPA follows the governing law and courts of the Terms, without limiting the rights of data subjects or authorities under the GDPR or other applicable data protection law. If this DPA conflicts with the Terms on data protection, this DPA prevails. The English text is authoritative.",
          ],
        },
      ],
    },

    imprint: {
      title: "Imprint",
      description: "Legal notice for dentvideo.com: BLS AI Automation DOO, Podgorica, Montenegro — register, tax ID, managing director and contact.",
      intro: ["Information about the provider of dentvideo.com (under § 5 of the German Digital Services Act, DDG, and Article 5 of the EU E-Commerce Directive)."],
      sections: [
        {
          heading: "Provider",
          blocks: [{ operator: true }],
        },
        {
          heading: "Responsible for content",
          blocks: ["{director}, {address}."],
        },
        {
          heading: "Dispute resolution",
          blocks: [
            "DentVideo is offered to businesses and professionals. We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.",
          ],
        },
      ],
    },
  },
};
