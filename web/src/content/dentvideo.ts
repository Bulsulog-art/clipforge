/**
 * DentVideo's public content, in every language, in one place.
 *
 * The landings (/dentvideo, /dentvideo/de, …), the guides, the structured
 * data, the sitemap and /dentvideo/llms.txt all read from here, so a fact
 * changes once and every page and every answer engine sees the same thing.
 *
 * Rules for anything written here:
 * - describe only what the product does today;
 * - prices only in `pricing` (owner-approved USD list prices, kept in step with
 *   lib/dentvid/billing by dentvideo.test.ts); no statistics, no testimonials
 *   (the ROI maths lives in docs/POSITIONING.md);
 * - never promise patients or bookings; the ROI line stays hedged;
 * - advertising-rule content stays general and hedged and names only
 *   regulations that exist; the clinic is told to check its national rules.
 */

import type { GuideExtras, SectionExtras } from "./guides/types";
import { GUIDE_LIBRARY, mergeGuides } from "./guides";

export const LOCALES = ["en", "de", "es", "tr", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const LANDING_PATH: Record<Locale, string> = {
  en: "/dentvideo",
  de: "/dentvideo/de",
  es: "/dentvideo/es",
  tr: "/dentvideo/tr",
  fr: "/dentvideo/fr",
};

/** Each language's own name, for the language switcher. */
export const LANGUAGE_NAME: Record<Locale, string> = { en: "English", de: "Deutsch", es: "Español", tr: "Türkçe", fr: "Français" };

/** BCP-47 tags for hreflang. */
export const HREFLANG: Record<Locale, string> = { en: "en", de: "de", es: "es", tr: "tr", fr: "fr" };

export type Faq = { q: string; a: string };

/** "DentVideo vs an agency vs doing it yourself": three columns, the same rows in every locale. */
export type Comparison = {
  heading: string;
  text: string;
  /** DentVideo, a social media agency, doing it yourself — always in this order. */
  columns: [string, string, string];
  rows: { label: string; values: [string, string, string] }[];
  /** The ROI framing: honest about not promising patients. No figures here (see docs/POSITIONING.md). */
  roi: string;
  roiNote: string;
};

export type PricingTier = { name: string; price: string; blurb: string; features: [string, string, string] };

export type LandingContent = {
  meta: { title: string; description: string; ogDescription: string };
  hero: { eyebrow: string; h1: string; lead: string; cta: string; note: string };
  mock: { hook: string; caption: string; label: string };
  /** Labels for the hero video's play/pause control. */
  video: { play: string; pause: string };
  problem: { title: string; text: string }[];
  how: { heading: string; steps: { title: string; text: string }[] };
  /** Real output for a demo clinic, shown as-is. */
  samples: { heading: string; text: string; note: string };
  checks: { heading: string; items: { title: string; text: string }[] };
  compare: Comparison;
  /** The plans. Currency figures are allowed here and nowhere else (dentvideo.test.ts). */
  pricing: {
    heading: string;
    text: string;
    cta: string;
    perMonth: string;
    recommended: string;
    foundingBadge: string;
    /** The founding offer, in the owner's words. */
    founding: string;
    /** Practice billed yearly. */
    yearly: string;
    note: string;
    /** Starter, Practice, Group — always in this order. */
    tiers: [PricingTier, PricingTier, PricingTier];
  };
  /** "Try it with your logo": a small live preview on the landing that leads to /start. */
  teaser: {
    eyebrow: string;
    heading: string;
    text: string;
    name: string;
    namePlaceholder: string;
    logo: string;
    color: string;
    cta: string;
    note: string;
  };
  guidesHeading: string;
  faqHeading: string;
  faq: Faq[];
};

export const LANDING: Record<Locale, LandingContent> = {
  en: {
    meta: {
      title: "DentVideo — patient-education videos for dental clinics",
      description:
        "Five narrated, captioned patient-education videos for your clinic every Monday — on what patients in your country actually search for, in your colours, checked for health-advertising rules and clinical accuracy. You approve in one tap. English, German, Spanish, French, Italian, Portuguese, Turkish.",
      ogDescription: "Five patient videos every Monday, checked before you see them. You just approve.",
    },
    hero: {
      eyebrow: "For dental clinics",
      h1: "Be the dentist patients feel they already know.",
      lead: "Patients choose a dentist they already know from Instagram and Google. But filming and editing take evenings you don't have — and one wrong word, like “painless” or a price, can bring a complaint. DentVideo keeps you visible every week: five videos answering what patients near you actually search for, in your colours, checked for risky wording, for a few minutes of your time. Less than an agency, and unlike Canva or ChatGPT, it does the work and the checking for you.",
      cta: "See your preview",
      note: "See your own branded videos live before you pay. Founding price for the first 100 clinics.",
    },
    mock: { hook: "Does whitening damage enamel?", caption: "When it is supervised, usually not.", label: "Ready for your review" },
    video: { play: "Play", pause: "Pause" },
    problem: [
      { title: "No time to post", text: "Patients look you up before they book. But scripting, filming and editing every week takes evenings you do not have — so the account goes quiet." },
      { title: "One wrong word is a complaint", text: "“Painless”, “guaranteed”, a price or a before-and-after can break health-advertising rules. Agencies and generic AI tools rarely check for that, and the risk stays with you." },
      { title: "What DentVideo does", text: "A week of on-brand, checked videos arrives every Monday. Your part: a few minutes to watch, one tap to approve, one tap to share." },
    ],
    how: {
      heading: "How it works",
      steps: [
        { title: "Set up once", text: "Language, services, tone, colours and logo — two minutes. Videos are only ever about the treatments you offer." },
        { title: "Five videos every Monday", text: "Topics come from what patients in your country search on Google. Each one is narrated, captioned and in your colours, and we email you when the week is ready." },
        { title: "Approve and share", text: "Approve the whole week in one tap, or one by one. Share to Instagram or TikTok from your phone with the caption already copied. Anything that needs your eye is marked, with the reason." },
      ],
    },
    samples: { heading: "A sample week", text: "Three videos DentVideo made for a demo clinic, exactly as they came out — narrated, captioned and checked. Yours are made in your language, colours and tone.", note: "Demo clinic. Made by DentVideo, unedited." },
    checks: {
      heading: "Checked twice before you see it",
      items: [
        { title: "Advertising rules", text: "No guarantees, “painless”, “permanent”, “best”, prices, discounts, before-and-after promises or testimonials — caught in seven languages." },
        { title: "Clinical accuracy", text: "A reviewer acting as a general dentist checks every statement against mainstream guidance — and that advice belongs to the right procedure." },
        { title: "Sound and picture", text: "Every video is measured before delivery: narration present and audible, no silent gaps or black frames, the right size for each platform." },
      ],
    },
    compare: {
      heading: "DentVideo vs an agency vs doing it yourself",
      text: "All three can fill your feed. Only one checks every line against health-advertising rules before it reaches you — without needing your evenings.",
      columns: ["DentVideo", "Social media agency", "Doing it yourself"],
      rows: [
        { label: "What it costs", values: ["One flat monthly plan — a fraction of an agency retainer", "Usually hundreds to thousands a month, often with a minimum term", "Cheap tools, paid for with your evenings"] },
        { label: "Your time each week", values: ["A few minutes to watch and approve", "Briefings, feedback rounds and sign-offs", "Hours to script, film, edit and caption"] },
        { label: "Health-advertising check", values: ["Every script and caption, twice, before you see it", "Depends on the agency — ask who checks it", "Up to you"] },
        { label: "Topics", values: ["What patients in your country actually search for", "The agency's content calendar", "Whatever you have time to think of"] },
        { label: "Consistency", values: ["Five videos every Monday, automatically", "As agreed in the contract", "Until the week gets busy"] },
        { label: "Languages", values: ["Seven, written natively", "Usually one", "Yours"] },
      ],
      roi: "We can't promise you patients — no one honestly can. But a single implant or aligner case is typically worth more than a year of DentVideo.",
      roiNote: "Based on typical private fees for one implant or aligner treatment. Your fees and results will differ.",
    },
    pricing: {
      heading: "See it first. Then choose a plan.",
      text: "Before you pay, watch a live preview of how your own videos will look — your logo, your colours, your clinic's name. Then choose a plan: monthly, cancel anytime. Your first week of videos is made right after payment.",
      cta: "See your preview",
      perMonth: "/month",
      recommended: "Recommended",
      foundingBadge: "Founding offer",
      founding: "Practice for $39/month for 12 months — first 100 clinics",
      yearly: "or $690 a year — 12 months for the price of 10",
      note: "Prices in USD. Taxes may apply.",
      tiers: [
        {
          name: "Starter",
          price: "$39",
          blurb: "For a single clinic getting started.",
          features: [
            "Five narrated, captioned videos every Monday",
            "Checked for advertising rules and clinical accuracy",
            "Your logo and brand colours in every video",
          ],
        },
        {
          name: "Practice",
          price: "$69",
          blurb: "For clinics that want their own faces on screen.",
          features: ["Everything in Starter", "Your own recordings turned into captioned clips", "Filming cards for your own clips"],
        },
        {
          name: "Group",
          price: "$219",
          blurb: "For small groups with several sites.",
          features: [
            "Up to three locations",
            "Five videos per location every Monday",
            "One consistent, checked voice across sites",
          ],
        },
      ],
    },
    teaser: {
      eyebrow: "Try it with your logo",
      heading: "See your videos before you pay",
      text: "Type your clinic's name, add your logo and pick a colour — the preview changes as you go. Nothing leaves your browser until you create an account.",
      name: "Clinic name",
      namePlaceholder: "Your clinic",
      logo: "Add your logo",
      color: "Brand colour",
      cta: "Continue to your full preview",
      note: "Monthly, cancel anytime. You pay only when you choose a plan.",
    },
    guidesHeading: "Guides",
    faqHeading: "Questions",
    faq: [
      { q: "Why pay for this when I could use Canva or ChatGPT?", a: "You could, if you have the hours. Those tools give you a blank canvas: you still choose topics, write a script that stays within advertising rules, record, edit, caption and post. DentVideo does all of that every Monday and checks every line twice. Your part is a few minutes of watching and two taps." },
      { q: "How is this different from a social media agency?", a: "An agency usually means a monthly retainer, briefings and feedback rounds — and you have to ask who checks the content against health-advertising rules. DentVideo costs a fraction of that, needs no meetings, and puts every script through an advertising-rules reviewer and a clinical-accuracy reviewer before you see it. If you already work with an agency, they can post DentVideo's videos for you." },
      { q: "Will this bring me new patients?", a: "We won't promise numbers — no one honestly can, and health-advertising rules frown on promises too. What DentVideo does is keep you visible every week with clear answers to the questions patients search, so they feel they know you before they book. A single implant or aligner case is typically worth more than a year of DentVideo, so it does not have to do much to pay for itself." },
      { q: "Is this allowed under the advertising rules where I practise?", a: "Patient education is generally allowed; promotion that promises results generally is not. That is the line our reviewers hold: no guarantees, “painless”, superlatives, prices, discounts, before-and-after or testimonials. The rules differ by country — in the UK, the GDC's guidance and the CAP Code apply; in the US, your state dental board's rules and the FTC's truth-in-advertising rules. We are not a law firm and you approve every video, so check anything unusual with your professional body." },
      { q: "Will it look like generic AI content?", a: "The narration is a synthetic voice in your language, but there are no fake doctors, avatar faces or patients: stock footage is limited to objects, never people, clinics or treatments, and every video carries your logo and colours. For the most personal touch, record five minutes of yourself and we turn it into captioned clips of you." },
      { q: "How much of my time does it take?", a: "Two minutes to set up, once. After that, a few minutes each Monday: we email you when the week is ready, you watch, approve everything in one tap — anything that needs your eye is marked with the reason — and share from your phone." },
      { q: "Do I have to film anything?", a: "No, but it helps. Each week you get educational videos made for you — written, narrated and captioned in your language. If you also record five minutes of yourself talking through one of our filming cards, we turn it into short clips of you, which patients trust most." },
      { q: "Do you post to Instagram or TikTok for me?", a: "Not automatically yet. On your phone, an approved video opens the share menu with the video attached and its caption already copied, so posting to Instagram or TikTok takes one tap. Nothing ever goes out without you." },
      { q: "Will you change what I say in my own recordings?", a: "Never. If something you said could be read as a promise or is worth a second look, the clip is marked for your attention with the reason and a suggested wording — the decision stays with you." },
      { q: "Which languages are supported?", a: "English, German, Spanish, French, Italian, Portuguese and Turkish, with formal or informal address as your clinic prefers." },
      { q: "Can I see my videos before I pay?", a: "Yes. Create an account, describe your clinic and you see a live preview of how your videos will look with your own logo, colours and name, right in your browser. If you like it, choose a plan: your first week of videos is made right after payment, and we email you when it is ready. Plans are monthly, you can cancel anytime, and the first clinics to join get a founding price." },
    ],
  },

  de: {
    meta: {
      title: "DentVideo — Patientenaufklärungs-Videos für Zahnarztpraxen",
      description:
        "Jeden Montag fünf vertonte, untertitelte Aufklärungsvideos für Ihre Praxis — zu dem, was Patienten in Ihrem Land wirklich suchen, in Ihren Praxisfarben, geprüft auf Heilmittelwerberecht und fachliche Richtigkeit. Sie geben mit einem Tipp frei. Auf Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch und Türkisch.",
      ogDescription: "Jeden Montag fünf Patientenvideos, geprüft, bevor Sie sie sehen. Sie geben nur noch frei.",
    },
    hero: {
      eyebrow: "Für Zahnarztpraxen",
      h1: "Werden Sie die Praxis, die Patienten schon zu kennen glauben.",
      lead: "Patienten wählen eine Praxis, die sie schon von Instagram und Google kennen. Doch Drehen und Schneiden kosten Abende, die Sie nicht haben — und ein falsches Wort wie „schmerzfrei“ oder ein Preis kann eine Beschwerde nach sich ziehen. DentVideo hält Sie jede Woche sichtbar: fünf Videos zu dem, was Patienten in Ihrer Nähe wirklich suchen, in Ihren Farben, auf riskante Formulierungen geprüft, für ein paar Minuten Ihrer Zeit. Günstiger als eine Agentur — und anders als Canva oder ChatGPT erledigt DentVideo die Arbeit und die Prüfung für Sie.",
      cta: "Ihre Vorschau ansehen",
      note: "Sehen Sie Ihre eigenen Videos mit Ihrer Marke live, bevor Sie zahlen. Gründungspreis für die ersten 100 Praxen.",
    },
    mock: { hook: "Schadet Bleaching dem Zahnschmelz?", caption: "Unter zahnärztlicher Aufsicht in der Regel nicht.", label: "Bereit zur Prüfung" },
    video: { play: "Abspielen", pause: "Pausieren" },
    problem: [
      { title: "Keine Zeit zum Posten", text: "Patienten informieren sich online, bevor sie einen Termin buchen. Doch Skript, Dreh und Schnitt kosten jede Woche Stunden, die Sie nicht haben — also bleibt der Kanal still." },
      { title: "Ein falsches Wort, eine Abmahnung", text: "„Schmerzfrei“, „garantiert“, ein Preis oder ein Vorher-Nachher-Bild kann gegen das Heilmittelwerbegesetz verstoßen. Agenturen und allgemeine KI-Tools prüfen das selten — das Risiko bleibt bei Ihnen." },
      { title: "Was DentVideo macht", text: "Jeden Montag kommt eine Woche geprüfter Videos in Ihrem Praxisauftritt. Ihr Teil: ein paar Minuten ansehen, ein Tipp zum Freigeben, ein Tipp zum Teilen." },
    ],
    how: {
      heading: "So funktioniert es",
      steps: [
        { title: "Einmal einrichten", text: "Sprache, Leistungen, Tonalität, Farben und Logo — zwei Minuten. Die Videos behandeln nur Leistungen, die Sie anbieten." },
        { title: "Jeden Montag fünf Videos", text: "Die Themen stammen aus dem, was Patienten in Ihrem Land bei Google suchen. Jedes Video ist vertont, untertitelt und in Ihren Farben — und Sie erhalten eine E-Mail, sobald die Woche bereitsteht." },
        { title: "Freigeben und teilen", text: "Die ganze Woche mit einem Tipp freigeben oder jedes Video einzeln. Direkt vom Handy auf Instagram oder TikTok teilen, der Begleittext ist schon kopiert. Was Ihren Blick braucht, ist markiert — mit Begründung." },
      ],
    },
    samples: { heading: "Eine Beispielwoche", text: "Drei Videos, die DentVideo für eine Demo-Praxis erstellt hat – genau so, wie sie herauskamen: vertont, untertitelt und geprüft. Ihre Videos entstehen in Ihrer Sprache, Ihren Farben und Ihrem Ton.", note: "Demo-Praxis. Von DentVideo erstellt, unbearbeitet." },
    checks: {
      heading: "Zweimal geprüft, bevor Sie es sehen",
      items: [
        { title: "Werberecht", text: "Keine Garantien, kein „schmerzfrei“, „dauerhaft“, „die beste Praxis“, keine Preise, Rabatte, Vorher-Nachher-Versprechen oder Patientenstimmen — erkannt in sieben Sprachen." },
        { title: "Fachliche Richtigkeit", text: "Ein Prüfer in der Rolle eines Allgemeinzahnarztes gleicht jede Aussage mit anerkannten Empfehlungen ab — und prüft, ob ein Rat zur richtigen Behandlung gehört." },
        { title: "Ton und Bild", text: "Jedes Video wird vor der Auslieferung vermessen: Sprecher hörbar, keine stillen Lücken oder schwarzen Bilder, das richtige Format für jede Plattform." },
      ],
    },
    compare: {
      heading: "DentVideo, Agentur oder selbst machen?",
      text: "Alle drei füllen Ihren Kanal. Nur eine Option prüft jede Zeile auf Werberecht, bevor sie bei Ihnen ankommt — und braucht dafür nicht Ihre Abende.",
      columns: ["DentVideo", "Social-Media-Agentur", "Selbst machen"],
      rows: [
        { label: "Kosten", values: ["Ein fester Monatspreis — ein Bruchteil eines Agenturhonorars", "Meist mehrere hundert bis einige tausend Euro im Monat, oft mit Mindestlaufzeit", "Günstige Tools, bezahlt mit Ihren Abenden"] },
        { label: "Ihre Zeit pro Woche", values: ["Ein paar Minuten zum Ansehen und Freigeben", "Briefings, Korrekturschleifen, Abstimmungen", "Stunden für Skript, Dreh, Schnitt und Untertitel"] },
        { label: "Werberechtliche Prüfung", values: ["Jedes Skript und jeder Text, zweimal, bevor Sie es sehen", "Je nach Agentur — fragen Sie, wer prüft", "Liegt bei Ihnen"] },
        { label: "Themen", values: ["Was Patienten in Ihrem Land wirklich suchen", "Der Redaktionsplan der Agentur", "Was Ihnen gerade einfällt"] },
        { label: "Regelmäßigkeit", values: ["Fünf Videos, jeden Montag, automatisch", "Wie im Vertrag vereinbart", "Bis die Woche voll wird"] },
        { label: "Sprachen", values: ["Sieben, muttersprachlich formuliert", "Meist eine", "Ihre"] },
      ],
      roi: "Patienten können wir Ihnen nicht versprechen — das kann niemand ehrlich. Aber schon ein einzelner Implantat- oder Aligner-Fall ist in der Regel mehr wert als ein Jahr DentVideo.",
      roiNote: "Bezogen auf übliche Privathonorare für eine Implantat- oder Aligner-Behandlung. Ihre Honorare und Ergebnisse können abweichen.",
    },
    pricing: {
      heading: "Erst ansehen. Dann Tarif wählen.",
      text: "Bevor Sie zahlen, sehen Sie in einer Live-Vorschau, wie Ihre eigenen Videos aussehen — mit Ihrem Logo, Ihren Farben und dem Namen Ihrer Praxis. Dann wählen Sie einen Tarif: monatlich, jederzeit kündbar. Ihre erste Woche Videos entsteht direkt nach der Zahlung.",
      cta: "Ihre Vorschau ansehen",
      perMonth: "/Monat",
      recommended: "Empfohlen",
      foundingBadge: "Gründungsangebot",
      founding: "Practice für 39 $/Monat, 12 Monate lang — für die ersten 100 Praxen",
      yearly: "oder 690 $ im Jahr — 12 Monate zum Preis von 10",
      note: "Preise in USD, ggf. zzgl. Steuern.",
      tiers: [
        {
          name: "Starter",
          price: "39 $",
          blurb: "Für eine Praxis, die einfach anfangen will.",
          features: [
            "Jeden Montag fünf vertonte, untertitelte Videos",
            "Geprüft auf Werberecht und fachliche Richtigkeit",
            "Ihr Logo und Ihre Markenfarben in jedem Video",
          ],
        },
        {
          name: "Practice",
          price: "69 $",
          blurb: "Für Praxen, die selbst vor der Kamera stehen wollen.",
          features: ["Alles aus Starter", "Ihre eigenen Aufnahmen als untertitelte Clips", "Drehkarten für Ihre eigenen Clips"],
        },
        {
          name: "Group",
          price: "219 $",
          blurb: "Für kleine Praxisgruppen mit mehreren Standorten.",
          features: [
            "Bis zu drei Standorte",
            "Fünf Videos pro Standort, jeden Montag",
            "Ein einheitlicher, geprüfter Auftritt an allen Standorten",
          ],
        },
      ],
    },
    teaser: {
      eyebrow: "Mit Ihrem Logo ausprobieren",
      heading: "Ihre Videos sehen, bevor Sie zahlen",
      text: "Geben Sie den Namen Ihrer Praxis ein, fügen Sie Ihr Logo hinzu und wählen Sie eine Farbe — die Vorschau ändert sich sofort. Nichts verlässt Ihren Browser, bevor Sie ein Konto anlegen.",
      name: "Name der Praxis",
      namePlaceholder: "Ihre Praxis",
      logo: "Logo hinzufügen",
      color: "Markenfarbe",
      cta: "Weiter zur vollständigen Vorschau",
      note: "Monatlich, jederzeit kündbar. Sie zahlen erst, wenn Sie einen Tarif wählen.",
    },
    guidesHeading: "Ratgeber",
    faqHeading: "Häufige Fragen",
    faq: [
      { q: "Warum dafür zahlen, wenn es Canva oder ChatGPT gibt?", a: "Können Sie — wenn Sie die Stunden haben. Diese Tools geben Ihnen eine leere Fläche: Themen wählen, ein werberechtlich sauberes Skript schreiben, aufnehmen, schneiden, untertiteln und posten bleibt bei Ihnen. DentVideo erledigt all das jeden Montag und prüft jede Zeile zweimal. Ihr Teil: ein paar Minuten ansehen und zwei Tipps." },
      { q: "Was ist der Unterschied zu einer Social-Media-Agentur?", a: "Eine Agentur bedeutet meist ein monatliches Honorar, Briefings und Korrekturschleifen — und Sie müssen nachfragen, wer die Inhalte auf das Heilmittelwerbegesetz prüft. DentVideo kostet einen Bruchteil davon, braucht keine Termine und schickt jedes Skript durch eine werberechtliche und eine fachliche Prüfung, bevor Sie es sehen. Arbeiten Sie bereits mit einer Agentur, kann sie die DentVideo-Videos für Sie posten." },
      { q: "Bringt mir das neue Patienten?", a: "Zahlen versprechen wir nicht — das kann niemand ehrlich, und das Werberecht sieht Versprechen ohnehin kritisch. DentVideo sorgt dafür, dass Sie jede Woche mit klaren Antworten auf die Fragen sichtbar sind, die Patienten suchen, sodass man Sie schon vor dem ersten Termin kennt. Ein einzelner Implantat- oder Aligner-Fall ist in der Regel mehr wert als ein Jahr DentVideo — es muss also nicht viel bewirken, um sich zu lohnen." },
      { q: "Ist das mit dem Werberecht vereinbar?", a: "Sachliche Patienteninformation ist grundsätzlich zulässig, Werbung mit Erfolgsversprechen nicht. Genau diese Grenze halten unsere Prüfer ein: keine Garantien, kein „schmerzfrei“, keine Superlative, Preise, Rabatte, Vorher-Nachher-Darstellungen oder Patientenstimmen. Maßgeblich sind in Deutschland das Heilmittelwerbegesetz (HWG) und die Berufsordnung Ihrer Landeszahnärztekammer. Wir sind keine Kanzlei, und Sie geben jedes Video frei — klären Sie Ungewöhnliches bitte mit Ihrer Kammer." },
      { q: "Wirkt das nicht wie beliebiger KI-Content?", a: "Die Stimme ist eine synthetische Sprecherstimme in Ihrer Sprache, aber es gibt keine falschen Ärzte, Avatar-Gesichter oder Patienten: Stockmaterial zeigt nur Gegenstände, nie Menschen, Praxen oder Behandlungen, und jedes Video trägt Ihr Logo und Ihre Farben. Am persönlichsten wird es, wenn Sie fünf Minuten von sich aufnehmen — daraus schneiden wir untertitelte Clips mit Ihnen." },
      { q: "Wie viel Zeit kostet mich das?", a: "Einmalig zwei Minuten für die Einrichtung. Danach jeden Montag ein paar Minuten: Sie bekommen eine E-Mail, sobald die Woche bereitsteht, sehen sie an, geben alles mit einem Tipp frei — was Ihren Blick braucht, ist mit Begründung markiert — und teilen vom Handy." },
      { q: "Muss ich selbst filmen?", a: "Nein, aber es hilft. Jede Woche erhalten Sie Aufklärungsvideos, die für Sie geschrieben, vertont und in Ihrer Sprache untertitelt werden. Wenn Sie zusätzlich fünf Minuten zu einer unserer Drehkarten sprechen, schneiden wir daraus kurze Clips mit Ihnen — denen vertrauen Patienten am meisten." },
      { q: "Posten Sie für mich auf Instagram oder TikTok?", a: "Noch nicht automatisch. Auf dem Handy öffnet ein freigegebenes Video das Teilen-Menü mit angehängtem Video, der Begleittext ist bereits kopiert — Instagram oder TikTok ist also ein Tipp. Ohne Sie geht nie etwas hinaus." },
      { q: "Verändern Sie, was ich in meinen Aufnahmen sage?", a: "Nie. Wenn etwas als Versprechen verstanden werden könnte oder einen zweiten Blick wert ist, wird der Clip für Sie markiert — mit Begründung und einem Formulierungsvorschlag. Die Entscheidung bleibt bei Ihnen." },
      { q: "Welche Sprachen gibt es?", a: "Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch und Türkisch — mit „Sie“ oder „du“, wie Ihre Praxis es möchte." },
      { q: "Kann ich meine Videos sehen, bevor ich zahle?", a: "Ja. Legen Sie ein Konto an und beschreiben Sie Ihre Praxis — dann sehen Sie direkt im Browser eine Live-Vorschau, wie Ihre Videos mit Ihrem eigenen Logo, Ihren Farben und Ihrem Namen aussehen. Wenn sie Ihnen gefällt, wählen Sie einen Tarif: Ihre erste Woche Videos entsteht direkt nach der Zahlung, und wir schicken Ihnen eine E-Mail, sobald sie fertig ist. Die Tarife sind monatlich und jederzeit kündbar; die ersten Praxen erhalten einen Gründungspreis." },
    ],
  },

  es: {
    meta: {
      title: "DentVideo — vídeos educativos para clínicas dentales",
      description:
        "Cada lunes, cinco vídeos educativos con voz y subtítulos para tu clínica: sobre lo que los pacientes de tu país buscan de verdad, con tus colores, revisados en normas de publicidad sanitaria y precisión clínica. Los apruebas con un toque. En español, inglés, alemán, francés, italiano, portugués y turco.",
      ogDescription: "Cinco vídeos para pacientes cada lunes, revisados antes de que los veas. Tú solo apruebas.",
    },
    hero: {
      eyebrow: "Para clínicas dentales",
      h1: "Sé el dentista que tus pacientes sienten que ya conocen.",
      lead: "Los pacientes eligen al dentista que ya conocen por Instagram y Google. Pero grabar y editar te quita tardes que no tienes, y una palabra equivocada, como «sin dolor» o un precio, puede acabar en una reclamación. DentVideo te mantiene visible cada semana: cinco vídeos que responden a lo que de verdad buscan los pacientes de tu zona, con tus colores, revisados para evitar expresiones de riesgo, por unos minutos de tu tiempo. Cuesta menos que una agencia y, a diferencia de Canva o ChatGPT, hace el trabajo y la revisión por ti.",
      cta: "Ver tu vista previa",
      note: "Ve en directo tus propios vídeos con tu marca antes de pagar. Precio de fundadoras para las primeras 100 clínicas.",
    },
    mock: { hook: "¿El blanqueamiento daña el esmalte?", caption: "Bajo supervisión, normalmente no.", label: "Listo para revisar" },
    video: { play: "Reproducir", pause: "Pausar" },
    problem: [
      { title: "No hay tiempo para publicar", text: "Los pacientes te buscan en internet antes de pedir cita. Pero escribir, grabar y editar cada semana se come horas que no tienes, y la cuenta se queda parada." },
      { title: "Una palabra de más, un problema", text: "“Sin dolor”, “garantizado”, un precio o un antes y después pueden incumplir las normas de publicidad sanitaria. Las agencias y las herramientas de IA genéricas rara vez lo revisan, y el riesgo es tuyo." },
      { title: "Lo que hace DentVideo", text: "Cada lunes llega una semana de vídeos con la imagen de tu clínica y ya revisados. Tu parte: unos minutos para verlos, un toque para aprobar y otro para compartir." },
    ],
    how: {
      heading: "Cómo funciona",
      steps: [
        { title: "Configúralo una vez", text: "Idioma, tratamientos, tono, colores y logo: dos minutos. Los vídeos solo tratan los servicios que ofreces." },
        { title: "Cinco vídeos cada lunes", text: "Los temas salen de lo que los pacientes de tu país buscan en Google. Cada vídeo lleva voz, subtítulos y tus colores, y te avisamos por email cuando la semana está lista." },
        { title: "Aprueba y comparte", text: "Aprueba toda la semana con un toque, o vídeo a vídeo. Compártelos en Instagram o TikTok desde el móvil con el texto ya copiado. Lo que necesita tu atención aparece marcado, con el motivo." },
      ],
    },
    samples: { heading: "Una semana de ejemplo", text: "Tres vídeos que DentVideo hizo para una clínica de demostración, tal como salieron: narrados, subtitulados y revisados. Los tuyos se hacen en tu idioma, con tus colores y tu tono.", note: "Clínica de demostración. Hechos por DentVideo, sin editar." },
    checks: {
      heading: "Revisado dos veces antes de que lo veas",
      items: [
        { title: "Normas de publicidad", text: "Sin garantías, “sin dolor”, “permanente”, “la mejor clínica”, precios, descuentos, promesas de antes y después ni testimonios, detectados en siete idiomas." },
        { title: "Precisión clínica", text: "Un revisor con el criterio de un dentista general contrasta cada afirmación con las recomendaciones aceptadas y comprueba que cada consejo corresponde al tratamiento correcto." },
        { title: "Sonido e imagen", text: "Cada vídeo se mide antes de entregarse: voz presente y audible, sin silencios largos ni fotogramas negros, en el formato correcto para cada plataforma." },
      ],
    },
    compare: {
      heading: "DentVideo, una agencia o hacerlo tú",
      text: "Las tres opciones llenan tu perfil. Solo una revisa cada frase según las normas de publicidad sanitaria antes de que llegue a ti, y sin quitarte las tardes.",
      columns: ["DentVideo", "Agencia de redes", "Hacerlo tú"],
      rows: [
        { label: "Cuánto cuesta", values: ["Una cuota mensual fija, una fracción de lo que cuesta una agencia", "Normalmente cientos de euros al mes o más, a menudo con permanencia", "Herramientas baratas, pagadas con tus tardes"] },
        { label: "Tu tiempo cada semana", values: ["Unos minutos para ver y aprobar", "Briefings, rondas de cambios y aprobaciones", "Horas para escribir, grabar, editar y subtitular"] },
        { label: "Revisión de publicidad sanitaria", values: ["Cada guion y cada texto, dos veces, antes de que lo veas", "Depende de la agencia: pregunta quién lo revisa", "Cosa tuya"] },
        { label: "Temas", values: ["Lo que los pacientes de tu país buscan de verdad", "El calendario de contenidos de la agencia", "Lo que se te ocurra"] },
        { label: "Constancia", values: ["Cinco vídeos cada lunes, automáticamente", "Lo que diga el contrato", "Hasta que la semana se complica"] },
        { label: "Idiomas", values: ["Siete, redactados de forma nativa", "Normalmente uno", "El tuyo"] },
      ],
      roi: "No podemos prometerte pacientes; nadie puede hacerlo con honestidad. Pero un solo caso de implante o de alineadores suele valer más que un año de DentVideo.",
      roiNote: "Según los honorarios privados habituales de un tratamiento de implante o de alineadores. Tus honorarios y tus resultados pueden variar.",
    },
    pricing: {
      heading: "Primero lo ves. Luego eliges plan.",
      text: "Antes de pagar, ves una vista previa en directo de cómo serán tus propios vídeos: tu logo, tus colores, el nombre de tu clínica. Después eliges un plan: mensual y cancelas cuando quieras. Tu primera semana de vídeos se crea justo después del pago.",
      cta: "Ver tu vista previa",
      perMonth: "/mes",
      recommended: "Recomendado",
      foundingBadge: "Oferta fundadora",
      founding: "Practice por 39 $/mes durante 12 meses — primeras 100 clínicas",
      yearly: "o 690 $ al año: 12 meses al precio de 10",
      note: "Precios en USD. Pueden aplicarse impuestos.",
      tiers: [
        {
          name: "Starter",
          price: "39 $",
          blurb: "Para una clínica que quiere empezar.",
          features: [
            "Cinco vídeos narrados y subtitulados cada lunes",
            "Revisados según las normas de publicidad y la exactitud clínica",
            "Tu logo y tus colores en cada vídeo",
          ],
        },
        {
          name: "Practice",
          price: "69 $",
          blurb: "Para clínicas que quieren salir ellas mismas en cámara.",
          features: ["Todo lo de Starter", "Tus propias grabaciones convertidas en clips subtitulados", "Fichas de grabación para tus propios clips"],
        },
        {
          name: "Group",
          price: "219 $",
          blurb: "Para pequeños grupos con varias sedes.",
          features: ["Hasta tres sedes", "Cinco vídeos por sede cada lunes", "Una voz coherente y revisada en todas las sedes"],
        },
      ],
    },
    teaser: {
      eyebrow: "Pruébalo con tu logo",
      heading: "Ve tus vídeos antes de pagar",
      text: "Escribe el nombre de tu clínica, añade tu logo y elige un color: la vista previa cambia al momento. Nada sale de tu navegador hasta que creas una cuenta.",
      name: "Nombre de la clínica",
      namePlaceholder: "Tu clínica",
      logo: "Añade tu logo",
      color: "Color de marca",
      cta: "Ver la vista previa completa",
      note: "Mensual, cancela cuando quieras. Solo pagas cuando eliges un plan.",
    },
    guidesHeading: "Guías",
    faqHeading: "Preguntas frecuentes",
    faq: [
      { q: "¿Por qué pagar si puedo usar Canva o ChatGPT?", a: "Puedes, si tienes las horas. Esas herramientas te dan un lienzo en blanco: elegir temas, escribir un guion que respete las normas de publicidad, grabar, editar, subtitular y publicar sigue siendo cosa tuya. DentVideo lo hace todo cada lunes y revisa cada frase dos veces. Tu parte: unos minutos para verlo y dos toques." },
      { q: "¿En qué se diferencia de una agencia de redes sociales?", a: "Una agencia suele implicar una cuota mensual, briefings y rondas de cambios, y tienes que preguntar quién revisa el contenido frente a las normas de publicidad sanitaria. DentVideo cuesta una fracción, no necesita reuniones y pasa cada guion por una revisión de publicidad y otra de precisión clínica antes de que lo veas. Si ya trabajas con una agencia, puede publicar los vídeos de DentVideo por ti." },
      { q: "¿Me traerá pacientes nuevos?", a: "No prometemos cifras: nadie puede hacerlo con honestidad, y las normas de publicidad sanitaria tampoco ven bien las promesas. Lo que hace DentVideo es mantenerte visible cada semana con respuestas claras a lo que los pacientes buscan, para que sientan que te conocen antes de pedir cita. Un solo caso de implante o de alineadores suele valer más que un año de DentVideo, así que no necesita hacer mucho para pagarse solo." },
      { q: "¿Está permitido por las normas de publicidad sanitaria?", a: "La información sanitaria al paciente está, en general, permitida; la promoción que promete resultados, no. Esa es la línea que mantienen nuestros revisores: sin garantías, “sin dolor”, superlativos, precios, descuentos, antes y después ni testimonios. En España aplican el Real Decreto 1907/1996, la normativa de tu comunidad autónoma y el código deontológico del Consejo General de Dentistas. No somos un despacho de abogados y tú apruebas cada vídeo, así que consulta con tu colegio cualquier caso dudoso." },
      { q: "¿No parecerá contenido genérico de IA?", a: "La voz es sintética, en tu idioma, pero no hay médicos falsos, avatares ni pacientes: las imágenes de archivo se limitan a objetos, nunca personas, clínicas ni tratamientos, y cada vídeo lleva tu logo y tus colores. Para el toque más personal, grábate cinco minutos y lo convertimos en clips subtitulados contigo." },
      { q: "¿Cuánto tiempo me lleva?", a: "Dos minutos para configurarlo, una sola vez. Después, unos minutos cada lunes: te avisamos por email cuando la semana está lista, la ves, apruebas todo con un toque —lo que necesita tu atención aparece marcado con el motivo— y compartes desde el móvil." },
      { q: "¿Tengo que grabar algo?", a: "No, aunque ayuda. Cada semana recibes vídeos educativos hechos para ti: escritos, con voz y subtitulados en tu idioma. Si además grabas cinco minutos hablando sobre una de nuestras tarjetas, lo convertimos en clips cortos contigo, que es lo que más confianza genera en los pacientes." },
      { q: "¿Publicáis en Instagram o TikTok por mí?", a: "Todavía no de forma automática. En el móvil, un vídeo aprobado abre el menú de compartir con el vídeo adjunto y el texto ya copiado, así que publicarlo en Instagram o TikTok es un toque. Nunca sale nada sin ti." },
      { q: "¿Cambiaréis lo que digo en mis grabaciones?", a: "Nunca. Si algo de lo que dices puede entenderse como una promesa o merece una segunda mirada, el clip se marca para ti con el motivo y una redacción sugerida. La decisión es tuya." },
      { q: "¿Qué idiomas hay?", a: "Español, inglés, alemán, francés, italiano, portugués y turco, con trato de tú o de usted, como prefiera tu clínica." },
      { q: "¿Puedo ver mis vídeos antes de pagar?", a: "Sí. Crea una cuenta, describe tu clínica y verás en el navegador una vista previa en directo de cómo serán tus vídeos con tu propio logo, tus colores y tu nombre. Si te gusta, elige un plan: tu primera semana de vídeos se crea justo después del pago y te avisamos por correo cuando esté lista. Los planes son mensuales, puedes cancelar cuando quieras y las primeras clínicas en unirse tienen un precio de fundadoras." },
    ],
  },

  tr: {
    meta: {
      title: "DentVideo — diş klinikleri için hasta bilgilendirme videoları",
      description:
        "Kliniğiniz için her pazartesi beş seslendirilmiş, altyazılı hasta bilgilendirme videosu: ülkenizdeki hastaların gerçekten aradığı konularda, sizin renklerinizde, sağlık tanıtım kurallarına ve klinik doğruluğa göre denetlenmiş. Tek dokunuşla onaylarsınız. Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca, Portekizce.",
      ogDescription: "Her pazartesi beş hasta videosu, siz görmeden denetlenmiş. Size yalnızca onaylamak kalır.",
    },
    hero: {
      eyebrow: "Diş klinikleri için",
      h1: "Hastaların zaten tanıdığını hissettiği hekim siz olun.",
      lead: "Hastalar Instagram'dan ve Google'dan zaten tanıdıkları hekimi seçer. Ama çekim ve kurgu sizde olmayan akşamları ister; “ağrısız” gibi tek bir yanlış kelime ya da bir fiyat da şikâyete yol açabilir. DentVideo sizi her hafta görünür tutar: bölgenizdeki hastaların gerçekten aradığı sorulara yanıt veren beş video, kliniğinizin renklerinde, riskli ifadelere karşı denetlenmiş, yalnızca birkaç dakikanızı alarak. Bir ajanstan daha uygun; Canva veya ChatGPT'den farklı olarak işi de denetimi de sizin yerinize yapar.",
      cta: "Önizlemenizi görün",
      note: "Ödeme yapmadan önce markalı videolarınızı canlı görün. İlk 100 kliniğe kurucu fiyatı.",
    },
    mock: { hook: "Diş beyazlatma mineye zarar verir mi?", caption: "Hekim kontrolünde genellikle hayır.", label: "İncelemenize hazır" },
    video: { play: "Oynat", pause: "Duraklat" },
    problem: [
      { title: "Paylaşıma vakit yok", text: "Hastalar randevu almadan önce sizi internette araştırır. Ama her hafta metin yazmak, çekmek ve kurgulamak ayıramadığınız saatler demek; hesap da sessizleşir." },
      { title: "Tek yanlış kelime, tek şikâyet", text: "“Acısız”, “garantili”, bir fiyat ya da öncesi-sonrası görseli sağlık hizmetlerinde tanıtım kurallarına aykırı olabilir. Ajanslar ve genel yapay zekâ araçları bunu nadiren denetler; risk sizde kalır." },
      { title: "DentVideo ne yapar", text: "Her pazartesi, kliniğinizin kimliğinde ve denetlenmiş bir haftalık video gelir. Size düşen: birkaç dakika izlemek, onay için bir dokunuş, paylaşım için bir dokunuş." },
    ],
    how: {
      heading: "Nasıl çalışır",
      steps: [
        { title: "Bir kez kurun", text: "Dil, tedaviler, üslup, renkler ve logo: iki dakika. Videolar yalnızca sunduğunuz tedaviler hakkında olur." },
        { title: "Her pazartesi beş video", text: "Konular, ülkenizdeki hastaların Google'da aradıklarından seçilir. Her video seslendirilmiş, altyazılı ve sizin renklerinizdedir; hafta hazır olduğunda size e-posta gelir." },
        { title: "Onaylayın ve paylaşın", text: "Haftanın tamamını tek dokunuşla ya da tek tek onaylayın. Açıklaması kopyalanmış haliyle telefonunuzdan Instagram'a veya TikTok'a paylaşın. Dikkatinizi gerektiren her şey gerekçesiyle işaretlenir." },
      ],
    },
    samples: { heading: "Örnek bir hafta", text: "DentVideo'nun bir demo klinik için hazırladığı üç video, çıktığı haliyle: seslendirilmiş, altyazılı ve kontrol edilmiş. Sizinkiler kendi dilinizde, renklerinizde ve üslubunuzda hazırlanır.", note: "Demo klinik. DentVideo hazırladı, düzenlenmedi." },
    checks: {
      heading: "Siz görmeden önce iki kez denetlenir",
      items: [
        { title: "Reklam kuralları", text: "Garanti, “acısız”, “kalıcı”, “en iyi klinik”, fiyat, indirim, öncesi-sonrası vaadi ve hasta yorumu yok; yedi dilde yakalanır." },
        { title: "Klinik doğruluk", text: "Genel diş hekimi gözüyle çalışan bir denetçi her ifadeyi kabul görmüş önerilerle karşılaştırır ve her tavsiyenin doğru tedaviye ait olduğunu kontrol eder." },
        { title: "Ses ve görüntü", text: "Her video teslimden önce ölçülür: seslendirme var ve duyuluyor, uzun sessizlik ya da siyah kare yok, her platform için doğru boyutta." },
      ],
    },
    compare: {
      heading: "DentVideo mu, ajans mı, kendiniz mi?",
      text: "Üçü de hesabınızı doldurur. Yalnızca biri her cümleyi size ulaşmadan önce sağlık tanıtım kurallarına göre denetler ve bunun için akşamlarınızı istemez.",
      columns: ["DentVideo", "Sosyal medya ajansı", "Kendiniz yapmak"],
      rows: [
        { label: "Maliyet", values: ["Sabit aylık ücret; bir ajans ücretinin küçük bir kısmı", "Aylık binlerce, çoğu zaman on binlerce lira; genellikle taahhütlü", "Ucuz araçlar; bedelini akşamlarınız öder"] },
        { label: "Haftalık zamanınız", values: ["İzleyip onaylamak için birkaç dakika", "Brifingler, revizyon turları, onaylar", "Metin, çekim, kurgu ve altyazı için saatler"] },
        { label: "Tanıtım kuralları denetimi", values: ["Her senaryo ve açıklama, siz görmeden iki kez", "Ajansa bağlı; kimin denetlediğini sorun", "Size kalmış"] },
        { label: "Konular", values: ["Ülkenizdeki hastaların gerçekten aradıkları", "Ajansın içerik takvimi", "O an aklınıza gelen"] },
        { label: "Süreklilik", values: ["Her pazartesi beş video, kendiliğinden", "Sözleşmede ne yazıyorsa", "Hafta yoğunlaşana kadar"] },
        { label: "Diller", values: ["Yedi dil, ana dilinde yazılmış", "Genellikle bir", "Sizin diliniz"] },
      ],
      roi: "Size hasta sözü veremeyiz; bunu dürüstçe kimse veremez. Ama tek bir implant hastası çoğu zaman DentVideo'nun yaklaşık bir yıllık bedelini karşılar.",
      roiNote: "Tek diş implant tedavisinin yaygın özel muayenehane ücretlerine göre. Sizin ücretleriniz ve sonuçlarınız farklı olabilir.",
    },
    pricing: {
      heading: "Önce görün. Sonra plan seçin.",
      text: "Ödeme yapmadan önce kendi videolarınızın nasıl görüneceğini canlı önizlemede görün: logonuz, renkleriniz, kliniğinizin adı. Sonra bir plan seçin: aylık, istediğiniz zaman iptal. İlk haftanızın videoları ödemenin hemen ardından hazırlanır.",
      cta: "Önizlemenizi görün",
      perMonth: "/ay",
      recommended: "Önerilen",
      foundingBadge: "Kurucu teklifi",
      founding: "12 ay boyunca aylık $39 ile Practice — ilk 100 klinik için",
      yearly: "ya da yıllık $690 — 10 ay fiyatına 12 ay",
      note: "Fiyatlar USD cinsindendir. Vergiler eklenebilir.",
      tiers: [
        {
          name: "Starter",
          price: "$39",
          blurb: "Yeni başlayan tek bir klinik için.",
          features: [
            "Her pazartesi beş seslendirilmiş, altyazılı video",
            "Reklam kuralları ve klinik doğruluk açısından kontrol edilir",
            "Her videoda logonuz ve marka renkleriniz",
          ],
        },
        {
          name: "Practice",
          price: "$69",
          blurb: "Kameranın karşısına kendisi geçmek isteyen klinikler için.",
          features: ["Starter'daki her şey", "Kendi kayıtlarınızdan altyazılı klipler", "Kendi videolarınız için çekim kartları"],
        },
        {
          name: "Group",
          price: "$219",
          blurb: "Birden fazla şubesi olan küçük gruplar için.",
          features: ["En fazla üç şube", "Her pazartesi şube başına beş video", "Tüm şubelerde tutarlı, kontrol edilmiş bir dil"],
        },
      ],
    },
    teaser: {
      eyebrow: "Logonuzla deneyin",
      heading: "Ödemeden önce videolarınızı görün",
      text: "Kliniğinizin adını yazın, logonuzu ekleyin ve bir renk seçin — önizleme anında değişir. Hesap açana kadar hiçbir şey tarayıcınızdan çıkmaz.",
      name: "Klinik adı",
      namePlaceholder: "Kliniğiniz",
      logo: "Logonuzu ekleyin",
      color: "Marka rengi",
      cta: "Tam önizlemeye devam edin",
      note: "Aylık, istediğiniz zaman iptal. Yalnızca plan seçtiğinizde ödersiniz.",
    },
    guidesHeading: "Rehberler",
    faqHeading: "Sık sorulan sorular",
    faq: [
      { q: "Canva ya da ChatGPT varken neden ödeyeyim?", a: "Vaktiniz varsa kullanabilirsiniz. Bu araçlar size boş bir sayfa verir: konu seçmek, tanıtım kurallarına uyan bir metin yazmak, çekmek, kurgulamak, altyazılamak ve paylaşmak yine size kalır. DentVideo bunların hepsini her pazartesi yapar ve her cümleyi iki kez denetler. Size düşen birkaç dakika izlemek ve iki dokunuş." },
      { q: "Bir sosyal medya ajansından farkı ne?", a: "Ajans genellikle aylık ücret, brifing ve revizyon turları demektir; içeriği sağlık tanıtım kurallarına göre kimin denetlediğini de sormanız gerekir. DentVideo bunun küçük bir kısmına mal olur, toplantı gerektirmez ve her senaryoyu siz görmeden önce hem reklam kuralları hem de klinik doğruluk denetiminden geçirir. Zaten bir ajansla çalışıyorsanız, DentVideo videolarını sizin yerinize o paylaşabilir." },
      { q: "Bu bana yeni hasta getirir mi?", a: "Rakam sözü vermiyoruz; bunu dürüstçe kimse veremez, tanıtım kuralları da vaatleri hoş karşılamaz. DentVideo'nun yaptığı, hastaların aradığı sorulara net yanıtlarla sizi her hafta görünür kılmaktır; böylece hastalar randevudan önce sizi tanıdıklarını hisseder. Tek bir implant hastası çoğu zaman DentVideo'nun yaklaşık bir yıllık bedelini karşılar; yani kendini amorti etmesi için çok şey yapması gerekmez." },
      { q: "Bu, sağlıkta tanıtım kurallarına uygun mu?", a: "Hastayı bilgilendirmek genel olarak serbesttir; sonuç vaat eden tanıtım ise değildir. Denetçilerimiz tam bu çizgiyi korur: garanti, “acısız”, üstünlük iddiası, fiyat, indirim, öncesi-sonrası ya da hasta yorumu yok. Türkiye'de Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik ve meslek etiği kuralları geçerlidir. Biz bir hukuk bürosu değiliz ve her videoyu siz onaylarsınız; olağan dışı bir durumda odanıza danışın." },
      { q: "Sıradan yapay zekâ içeriği gibi görünmez mi?", a: "Seslendirme, kendi dilinizde sentetik bir sestir; ama sahte hekim, avatar yüz ya da hasta yoktur. Stok görüntüler yalnızca nesnelerle sınırlıdır; insan, klinik ya da tedavi sahnesi kullanılmaz ve her video sizin logonuzu ve renklerinizi taşır. En kişisel dokunuş için beş dakika kendinizi kaydedin; bunu sizin olduğunuz altyazılı kliplere dönüştürürüz." },
      { q: "Ne kadar vaktimi alır?", a: "Kurulum bir kez, iki dakika. Sonrasında her pazartesi birkaç dakika: Hafta hazır olduğunda size e-posta gelir, izlersiniz, hepsini tek dokunuşla onaylarsınız (dikkatinizi gerektiren her şey gerekçesiyle işaretlidir) ve telefonunuzdan paylaşırsınız." },
      { q: "Çekim yapmam gerekiyor mu?", a: "Hayır, ama faydası olur. Her hafta sizin için yazılmış, seslendirilmiş ve kendi dilinizde altyazılanmış bilgilendirme videoları alırsınız. Ayrıca çekim kartlarımızdan biriyle beş dakika konuşursanız, bunu hastaların en çok güvendiği şeye, yani sizin olduğunuz kısa kliplere dönüştürürüz." },
      { q: "Instagram ya da TikTok'ta benim yerime paylaşıyor musunuz?", a: "Henüz otomatik değil. Telefonunuzda onayladığınız video, paylaşım menüsünü video ekli olarak açar ve açıklama panoya kopyalanır; Instagram ya da TikTok'ta paylaşmak tek dokunuştur. Hiçbir şey sizsiz yayınlanmaz." },
      { q: "Kendi kayıtlarımda söylediklerimi değiştiriyor musunuz?", a: "Asla. Söylediğiniz bir şey vaat gibi anlaşılabiliyorsa ya da ikinci kez bakmaya değerse, klip gerekçesi ve önerilen bir ifadeyle sizin için işaretlenir. Karar her zaman sizindir." },
      { q: "Hangi diller destekleniyor?", a: "Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca ve Portekizce; kliniğinizin tercihine göre “siz” ya da “sen” hitabıyla." },
      { q: "Ödeme yapmadan önce videolarımı görebilir miyim?", a: "Evet. Bir hesap açıp kliniğinizi tanıttığınızda, videolarınızın kendi logonuz, renkleriniz ve adınızla nasıl görüneceğini doğrudan tarayıcınızda canlı önizlemede görürsünüz. Beğenirseniz bir plan seçin: ilk haftanızın videoları ödemenin hemen ardından hazırlanır ve hazır olduğunda size e-posta göndeririz. Planlar aylıktır, istediğiniz zaman iptal edebilirsiniz; ilk katılan klinikler kurucu fiyatından yararlanır." },
    ],
  },

  fr: {
    meta: {
      title: "DentVideo — vidéos d'information patient pour cabinets dentaires",
      description:
        "Chaque lundi, cinq vidéos d'information patient en voix off et sous-titrées pour votre cabinet : sur ce que les patients de votre pays recherchent vraiment, à vos couleurs, vérifiées au regard des règles de communication en santé et de l'exactitude clinique. Vous validez d'un geste. En français, anglais, allemand, espagnol, italien, portugais et turc.",
      ogDescription: "Cinq vidéos patient chaque lundi, vérifiées avant que vous les voyiez. Vous n'avez qu'à valider.",
    },
    hero: {
      eyebrow: "Pour les cabinets dentaires",
      h1: "Devenez le dentiste que les patients ont l'impression de connaître.",
      lead: "Les patients choisissent un dentiste qu'ils connaissent déjà par Instagram et Google. Mais filmer et monter demande des soirées que vous n'avez pas — et un seul mauvais mot, comme « sans douleur » ou un prix, peut valoir une plainte. DentVideo vous rend visible chaque semaine : cinq vidéos qui répondent à ce que les patients de votre région recherchent vraiment, à vos couleurs, vérifiées contre les formulations à risque, pour quelques minutes de votre temps. Moins cher qu'une agence et, contrairement à Canva ou ChatGPT, DentVideo fait le travail et la vérification pour vous.",
      cta: "Voir votre aperçu",
      note: "Voyez en direct vos propres vidéos à votre image avant de payer. Tarif fondateur pour les 100 premiers cabinets.",
    },
    mock: { hook: "Le blanchiment abîme-t-il l'émail ?", caption: "Encadré par un dentiste, en général non.", label: "Prête pour validation" },
    video: { play: "Lire", pause: "Mettre en pause" },
    problem: [
      { title: "Pas le temps de publier", text: "Les patients se renseignent en ligne avant de prendre rendez-vous. Mais écrire, filmer et monter chaque semaine demande des heures que vous n'avez pas, et le compte reste muet." },
      { title: "Un mot de trop, une plainte", text: "« Sans douleur », « garanti », un prix ou un avant-après peuvent enfreindre les règles déontologiques de communication. Les agences et les outils d'IA généralistes le vérifient rarement, et le risque reste le vôtre." },
      { title: "Ce que fait DentVideo", text: "Chaque lundi, une semaine de vidéos à l'image de votre cabinet, déjà vérifiées. Votre part : quelques minutes pour regarder, un geste pour valider, un geste pour partager." },
    ],
    how: {
      heading: "Comment ça marche",
      steps: [
        { title: "Configurez une fois", text: "Langue, soins, ton, couleurs et logo : deux minutes. Les vidéos ne parlent que des soins que vous proposez." },
        { title: "Cinq vidéos chaque lundi", text: "Les sujets viennent de ce que les patients de votre pays recherchent sur Google. Chaque vidéo est en voix off, sous-titrée et à vos couleurs, et un e-mail vous prévient quand la semaine est prête." },
        { title: "Validez et partagez", text: "Validez toute la semaine d'un geste, ou vidéo par vidéo. Partagez sur Instagram ou TikTok depuis votre téléphone, texte déjà copié. Ce qui demande votre attention est signalé, avec la raison." },
      ],
    },
    samples: { heading: "Une semaine d'exemple", text: "Trois vidéos réalisées par DentVideo pour un cabinet de démonstration, telles qu'elles sont sorties : commentées, sous-titrées et vérifiées. Les vôtres sont faites dans votre langue, vos couleurs et votre ton.", note: "Cabinet de démonstration. Réalisées par DentVideo, sans retouche." },
    checks: {
      heading: "Vérifié deux fois avant que vous le voyiez",
      items: [
        { title: "Règles de communication", text: "Pas de garantie, de « sans douleur », de « définitif », de « meilleur cabinet », de prix, de réduction, de promesse avant-après ni de témoignage — repérés dans sept langues." },
        { title: "Exactitude clinique", text: "Un relecteur dans le rôle d'un omnipraticien confronte chaque affirmation aux recommandations reconnues et vérifie que chaque conseil correspond au bon soin." },
        { title: "Son et image", text: "Chaque vidéo est mesurée avant livraison : voix présente et audible, pas de silences ni d'images noires, le bon format pour chaque plateforme." },
      ],
    },
    compare: {
      heading: "DentVideo, une agence ou le faire vous-même ?",
      text: "Les trois remplissent votre compte. Une seule vérifie chaque phrase au regard des règles de communication en santé avant qu'elle vous parvienne, sans prendre vos soirées.",
      columns: ["DentVideo", "Agence social media", "Le faire vous-même"],
      rows: [
        { label: "Coût", values: ["Un abonnement mensuel fixe, une fraction du prix d'une agence", "Souvent plusieurs centaines d'euros par mois ou plus, parfois avec engagement", "Des outils peu chers, payés avec vos soirées"] },
        { label: "Votre temps chaque semaine", values: ["Quelques minutes pour regarder et valider", "Briefs, allers-retours et validations", "Des heures d'écriture, de tournage, de montage et de sous-titrage"] },
        { label: "Vérification déontologique", values: ["Chaque script et chaque texte, deux fois, avant que vous les voyiez", "Selon l'agence : demandez qui vérifie", "À votre charge"] },
        { label: "Sujets", values: ["Ce que les patients de votre pays recherchent vraiment", "Le calendrier éditorial de l'agence", "Ce qui vous vient à l'esprit"] },
        { label: "Régularité", values: ["Cinq vidéos chaque lundi, automatiquement", "Selon le contrat", "Jusqu'à ce que la semaine se charge"] },
        { label: "Langues", values: ["Sept, rédigées nativement", "Souvent une seule", "La vôtre"] },
      ],
      roi: "Nous ne pouvons pas vous promettre de patients ; personne ne le peut honnêtement. Mais un seul traitement implantaire ou par aligneurs vaut en général plus qu'une année de DentVideo.",
      roiNote: "Sur la base des honoraires habituels d'un traitement implantaire ou par aligneurs. Vos honoraires et vos résultats peuvent différer.",
    },
    pricing: {
      heading: "Voyez d'abord. Choisissez ensuite.",
      text: "Avant de payer, découvrez un aperçu en direct de vos propres vidéos : votre logo, vos couleurs, le nom de votre cabinet. Choisissez ensuite une formule : mensuelle, résiliable à tout moment. Votre première semaine de vidéos est réalisée dès le paiement.",
      cta: "Voir votre aperçu",
      perMonth: "/mois",
      recommended: "Recommandée",
      foundingBadge: "Offre fondateurs",
      founding: "Practice à 39 $/mois pendant 12 mois — pour les 100 premiers cabinets",
      yearly: "ou 690 $ par an — 12 mois pour le prix de 10",
      note: "Prix en USD, taxes éventuelles en sus.",
      tiers: [
        {
          name: "Starter",
          price: "39 $",
          blurb: "Pour un cabinet qui veut se lancer simplement.",
          features: [
            "Cinq vidéos commentées et sous-titrées chaque lundi",
            "Vérifiées selon les règles de communication et l'exactitude clinique",
            "Votre logo et vos couleurs dans chaque vidéo",
          ],
        },
        {
          name: "Practice",
          price: "69 $",
          blurb: "Pour les cabinets qui veulent apparaître eux-mêmes à l'écran.",
          features: [
            "Tout ce qu'inclut Starter",
            "Vos propres enregistrements transformés en clips sous-titrés",
            "Fiches de tournage pour vos propres clips",
          ],
        },
        {
          name: "Group",
          price: "219 $",
          blurb: "Pour les petits groupes de plusieurs cabinets.",
          features: [
            "Jusqu'à trois sites",
            "Cinq vidéos par site chaque lundi",
            "Une communication cohérente et vérifiée sur tous les sites",
          ],
        },
      ],
    },
    teaser: {
      eyebrow: "Essayez avec votre logo",
      heading: "Voyez vos vidéos avant de payer",
      text: "Saisissez le nom de votre cabinet, ajoutez votre logo et choisissez une couleur : l'aperçu change aussitôt. Rien ne quitte votre navigateur avant la création de votre compte.",
      name: "Nom du cabinet",
      namePlaceholder: "Votre cabinet",
      logo: "Ajouter votre logo",
      color: "Couleur de marque",
      cta: "Continuer vers l'aperçu complet",
      note: "Mensuel, résiliable à tout moment. Vous ne payez qu'en choisissant une formule.",
    },
    guidesHeading: "Guides",
    faqHeading: "Questions fréquentes",
    faq: [
      { q: "Pourquoi payer alors qu'il existe Canva ou ChatGPT ?", a: "Vous pouvez, si vous avez les heures. Ces outils vous donnent une page blanche : choisir les sujets, écrire un script conforme aux règles de communication, filmer, monter, sous-titrer et publier reste à votre charge. DentVideo fait tout cela chaque lundi et vérifie chaque phrase deux fois. Votre part : quelques minutes de visionnage et deux gestes." },
      { q: "Quelle différence avec une agence social media ?", a: "Une agence, c'est en général un forfait mensuel, des briefs et des allers-retours — et il faut demander qui vérifie le contenu au regard des règles déontologiques. DentVideo coûte une fraction de ce prix, ne demande aucune réunion et soumet chaque script à une relecture réglementaire et à une relecture clinique avant que vous le voyiez. Si vous travaillez déjà avec une agence, elle peut publier les vidéos DentVideo pour vous." },
      { q: "Est-ce que cela m'apportera de nouveaux patients ?", a: "Nous ne promettons pas de chiffres : personne ne le peut honnêtement, et les règles de communication en santé n'aiment pas les promesses. DentVideo vous rend visible chaque semaine avec des réponses claires aux questions que les patients recherchent, pour qu'ils aient le sentiment de vous connaître avant de prendre rendez-vous. Un seul traitement implantaire ou par aligneurs vaut en général plus qu'une année de DentVideo : il n'a pas besoin de faire beaucoup pour être rentable." },
      { q: "Est-ce compatible avec la déontologie ?", a: "L'information du patient est en principe permise ; la publicité qui promet un résultat ne l'est pas. C'est la ligne que tiennent nos relecteurs : pas de garantie, de « sans douleur », de superlatif, de prix, de réduction, d'avant-après ni de témoignage. En France, le code de déontologie des chirurgiens-dentistes (article R.4127-215-1 du code de la santé publique) et les recommandations de l'Ordre encadrent cette communication. Nous ne sommes pas un cabinet d'avocats et vous validez chaque vidéo : en cas de doute, interrogez votre conseil départemental." },
      { q: "Est-ce que cela ressemblera à du contenu IA générique ?", a: "La voix off est une voix de synthèse dans votre langue, mais il n'y a ni faux médecin, ni avatar, ni patient : les images d'illustration se limitent à des objets, jamais des personnes, des cabinets ou des soins, et chaque vidéo porte votre logo et vos couleurs. Pour la touche la plus personnelle, enregistrez-vous cinq minutes et nous en tirons des extraits sous-titrés où l'on vous voit." },
      { q: "Combien de temps cela me prend-il ?", a: "Deux minutes de configuration, une seule fois. Ensuite, quelques minutes chaque lundi : un e-mail vous prévient quand la semaine est prête, vous regardez, validez tout d'un geste — ce qui demande votre attention est signalé avec la raison — et partagez depuis votre téléphone." },
      { q: "Dois-je filmer quelque chose ?", a: "Non, mais cela aide. Chaque semaine, vous recevez des vidéos d'information réalisées pour vous : rédigées, mises en voix et sous-titrées dans votre langue. Si vous enregistrez aussi cinq minutes à partir d'une de nos fiches, nous en tirons de courts extraits où l'on vous voit, ce qui inspire le plus confiance aux patients." },
      { q: "Publiez-vous sur Instagram ou TikTok à ma place ?", a: "Pas encore automatiquement. Sur votre téléphone, une vidéo validée ouvre le menu de partage avec la vidéo jointe et le texte déjà copié : publier sur Instagram ou TikTok tient en un geste. Rien ne part jamais sans vous." },
      { q: "Modifiez-vous ce que je dis dans mes enregistrements ?", a: "Jamais. Si un propos peut être compris comme une promesse ou mérite d'être revu, l'extrait vous est signalé avec la raison et une formulation suggérée. La décision vous appartient." },
      { q: "Quelles langues sont disponibles ?", a: "Français, anglais, allemand, espagnol, italien, portugais et turc, avec vouvoiement ou tutoiement selon votre cabinet." },
      { q: "Puis-je voir mes vidéos avant de payer ?", a: "Oui. Créez un compte, décrivez votre cabinet et vous verrez, directement dans le navigateur, un aperçu en direct de vos vidéos avec votre logo, vos couleurs et votre nom. S'il vous convient, choisissez une formule : votre première semaine de vidéos est réalisée dès le paiement, et nous vous prévenons par e-mail quand elle est prête. Les formules sont mensuelles, résiliables à tout moment, et les premiers cabinets inscrits bénéficient d'un tarif fondateur." },
    ],
  },
};

export type GuideSection = { heading: string; paragraphs: string[] } & SectionExtras;
export type Guide = {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
  faq: Faq[];
} & GuideExtras;

// The first guides; the full library (and longer versions of these) lives in content/guides/.
const BASE_GUIDES: Guide[] = [
  {
    locale: "en",
    slug: "instagram-videos-for-dentists",
    title: "Instagram videos for dentists: what to post and how to keep it simple",
    description: "A practical guide for dental clinics: which short videos patients actually watch, how to film them in five minutes, and what to avoid in health advertising.",
    h1: "Instagram videos for dentists: what to post, and how to keep it simple",
    intro: "Most patients look a clinic up before they book. Short videos let them see who will be treating them and hear how you explain things — which is often what decides the appointment. You do not need a studio or a weekly content plan to do it well.",
    sections: [
      { heading: "What patients actually want to see", paragraphs: [
        "The questions people ask at the chair are the best topics: does whitening damage enamel, how long does an implant take, what should I do after a root canal, when should my child first see a dentist. Answering one question per video keeps each one short and useful.",
        "Show the people, not just the equipment. A calm, clear explanation from the dentist does more for trust than a montage of the waiting room.",
      ]},
      { heading: "Keep each video to one idea", paragraphs: [
        "Open with the question in the first second, give the answer in two or three plain sentences, and close by inviting viewers to ask or book a check-up. Around 20 to 60 seconds is enough for most topics.",
        "Add captions. Many people watch with the sound off, and captions also help viewers whose first language is different from yours.",
      ]},
      { heading: "Filming in five minutes", paragraphs: [
        "Hold the phone vertically at eye level, stand facing a window for soft light, and record in a quiet room. Talk through three or four points as you would to a patient, then stop. One relaxed take is usually better than a scripted one.",
        "A single five-minute recording can be cut into several short clips, each answering one question — so one session can cover a week.",
      ]},
      { heading: "What to avoid", paragraphs: [
        "Health advertising is regulated in many countries. Phrases such as “painless”, “guaranteed results”, “permanent” or “the best clinic in town”, prices and discounts, before-and-after promises and patient testimonials are restricted or banned in several markets. The safest content is educational and hedged: “usually”, “for most people”, “ask your dentist”.",
        "Rules differ by country and change, so check the requirements of your national dental council or regulator before you publish.",
      ]},
      { heading: "How DentVideo helps", paragraphs: [
        "DentVideo turns a short recording of you into captioned clips with your logo, and writes and narrates educational videos for the weeks when you cannot film. Every script is checked for clinical accuracy and advertising rules, and nothing is published until you approve it.",
      ]},
    ],
    faq: [
      { q: "How often should a dental clinic post videos?", a: "Consistency matters more than volume. One to three short educational videos a week is manageable for most clinics and keeps the account active." },
      { q: "Do I need professional equipment?", a: "No. A recent phone, a window for light and a quiet room are enough for short educational videos." },
      { q: "Can I show patient cases?", a: "Only with the patient's informed, documented consent, and in many countries before-and-after images are restricted in advertising. Check your national rules first." },
    ],
  },
  {
    locale: "en",
    slug: "patient-education-videos",
    title: "Patient-education videos for dental clinics: a practical guide",
    description: "Why short patient-education videos help dental clinics, which topics to cover first, and how to keep them accurate.",
    h1: "Patient-education videos for dental clinics",
    intro: "A patient who understands a treatment arrives calmer, asks better questions and follows aftercare more closely. Short videos let you give the same clear explanation to everyone, before and after their visit.",
    sections: [
      { heading: "Where education videos help most", paragraphs: [
        "Before a first visit: what happens at a check-up, how a cleaning feels, what to bring. Before a treatment: what a root canal or an implant involves, step by step. After a treatment: aftercare that is easy to forget once the patient is home.",
      ]},
      { heading: "Topics to start with", paragraphs: [
        "Start with the questions your team hears every day: sensitivity after whitening, how long an implant takes to heal, what to eat after a filling, when children should first see a dentist, how often to have a professional cleaning. Each one is a short video.",
      ]},
      { heading: "Keeping them accurate", paragraphs: [
        "Stay with mainstream guidance and hedge where outcomes vary: “usually”, “for most people”, “your dentist will tell you”. Keep aftercare specific to the procedure — advice that is right after an extraction can be wrong after a filling.",
        "Make sure the caption under the video says the same thing as the video itself, and have a dentist review every video before it goes out.",
      ]},
      { heading: "Where to use them", paragraphs: [
        "Social media, your website, the waiting room screen, and messages sent to patients before or after an appointment. The same short video works in all of them.",
      ]},
      { heading: "How DentVideo helps", paragraphs: [
        "DentVideo plans a week of topics from the services you offer, writes and narrates the videos in your language, checks each one for clinical accuracy and advertising rules, and leaves the final approval to you.",
      ]},
    ],
    faq: [
      { q: "How long should a patient-education video be?", a: "Short enough to watch in one go: about 20 to 60 seconds for one topic. Longer explanations work better split into several videos." },
      { q: "Should the dentist appear in the videos?", a: "When possible, yes. Patients trust the person who will treat them; narrated videos are a good fallback for busy weeks." },
    ],
  },
  {
    locale: "en",
    slug: "dental-social-media-advertising-rules",
    title: "Dental social media and advertising rules: what to watch for",
    description: "An overview of the claims that health-advertising rules commonly restrict in dental social media posts, with pointers to national rules. Not legal advice.",
    h1: "Dental social media and advertising rules: what to watch for",
    intro: "Social media posts by a clinic are usually treated as advertising. Health advertising is regulated in most countries, and the rules differ. This overview covers the claims that are commonly restricted and where to look for your national rules. It is general information, not legal advice.",
    sections: [
      { heading: "Claims that are commonly restricted", paragraphs: [
        "Guarantees of results and absolutes such as “painless” or “permanent”; superlatives and comparisons with other clinics (“the best”, “number one”); prices, discounts and limited-time offers; before-and-after promises; patient testimonials and reviews; and claims to cure a condition. Not every country restricts all of these, but many restrict several.",
      ]},
      { heading: "Examples of national rules", paragraphs: [
        "Germany: the Heilmittelwerbegesetz (HWG) governs advertising for medical treatments, together with professional rules for dentists.",
        "United Kingdom: the General Dental Council's standards for the dental team, and the ASA's CAP Code for advertising.",
        "United States: the FTC's truth-in-advertising rules apply, alongside state dental board rules.",
        "Spain: Real Decreto 1907/1996 regulates advertising with a health purpose, alongside regional rules and the professional code of ethics.",
        "Türkiye: the Ministry of Health regulation on promotion and information activities in health services strictly limits promotional content by health providers.",
        "France: the dentists' code of ethics in the Code de la santé publique sets what information a practice may communicate.",
      ]},
      { heading: "Safer ways to say it", paragraphs: [
        "Educate rather than promise: explain what a treatment involves and what is typical, and hedge where outcomes vary. Invite viewers to ask or book a check-up instead of offering a deal. Keep patient information out of posts unless you have documented consent and the rules allow it.",
      ]},
      { heading: "How DentVideo helps", paragraphs: [
        "DentVideo checks every script and caption for these commonly restricted claims in seven languages, sends anything risky back for a rewrite, and marks your own recordings for review instead of changing your words. It is a careful filter, not legal advice: you approve every video, and you remain responsible for what your clinic publishes.",
      ]},
    ],
    faq: [
      { q: "Is a clinic's Instagram post considered advertising?", a: "In most countries, yes: content published by a clinic to attract patients is usually treated as advertising, so health-advertising rules apply." },
      { q: "Can I mention prices?", a: "It depends on the country. Several restrict price and discount advertising for health services. Check your national rules before mentioning prices." },
      { q: "Is this legal advice?", a: "No. Rules vary by country and change over time; confirm the requirements with your national dental council, regulator or a lawyer." },
    ],
  },
  {
    locale: "de",
    slug: "instagram-videos-fuer-zahnarztpraxen",
    title: "Instagram-Videos für Zahnarztpraxen: Themen, Dreh und Werberecht",
    description: "Ein praktischer Ratgeber für Zahnarztpraxen: welche Kurzvideos Patienten ansehen, wie Sie sie in fünf Minuten drehen und was das Heilmittelwerbegesetz verbietet.",
    h1: "Instagram-Videos für Zahnarztpraxen",
    intro: "Viele Patienten schauen sich eine Praxis online an, bevor sie einen Termin vereinbaren. Kurze Videos zeigen, wer sie behandeln wird und wie Sie erklären — oft gibt genau das den Ausschlag. Dafür brauchen Sie weder Studio noch Redaktionsplan.",
    sections: [
      { heading: "Welche Themen funktionieren", paragraphs: [
        "Die besten Themen sind die Fragen, die Patienten am Behandlungsstuhl stellen: Schadet Bleaching dem Zahnschmelz? Wie lange dauert ein Implantat? Was muss ich nach einer Wurzelbehandlung beachten? Wann sollte mein Kind zum ersten Mal zum Zahnarzt? Eine Frage pro Video hält es kurz und nützlich.",
      ]},
      { heading: "Ein Gedanke pro Video", paragraphs: [
        "Stellen Sie die Frage in der ersten Sekunde, beantworten Sie sie in zwei, drei klaren Sätzen und laden Sie am Ende zu Fragen oder einem Kontrolltermin ein. 20 bis 60 Sekunden reichen für die meisten Themen. Untertitel sind Pflicht: Viele sehen ohne Ton.",
      ]},
      { heading: "In fünf Minuten gedreht", paragraphs: [
        "Handy hochkant auf Augenhöhe, Gesicht zum Fenster, ruhiger Raum. Sprechen Sie drei, vier Punkte so, wie Sie es einem Patienten erklären würden. Eine entspannte Aufnahme ist meist besser als ein abgelesenes Skript — und aus fünf Minuten lassen sich mehrere kurze Clips schneiden.",
      ]},
      { heading: "Was das Werberecht verbietet", paragraphs: [
        "In Deutschland regeln das Heilmittelwerbegesetz (HWG) und die Berufsordnung der Zahnärzte, was in der Werbung für Behandlungen zulässig ist. Heikel sind unter anderem Erfolgsversprechen und Begriffe wie „schmerzfrei“ oder „garantiert“, Superlative und Vergleiche mit anderen Praxen, Rabatte sowie Vorher-Nachher-Darstellungen bei bestimmten Eingriffen. Sachliche Aufklärung mit vorsichtigen Formulierungen („in der Regel“, „fragen Sie Ihre Zahnärztin“) ist der sichere Weg.",
        "Die Regeln ändern sich und hängen vom Einzelfall ab — im Zweifel fragen Sie Ihre Zahnärztekammer.",
      ]},
      { heading: "Wie DentVideo hilft", paragraphs: [
        "DentVideo schneidet aus einer kurzen Aufnahme von Ihnen untertitelte Clips mit Ihrem Logo und schreibt und vertont Aufklärungsvideos für Wochen ohne Dreh. Jedes Skript wird auf fachliche Richtigkeit und Werberecht geprüft, und nichts wird veröffentlicht, bevor Sie es freigeben.",
      ]},
    ],
    faq: [
      { q: "Wie oft sollte eine Praxis Videos posten?", a: "Regelmäßigkeit zählt mehr als Menge. Ein bis drei kurze Aufklärungsvideos pro Woche sind für die meisten Praxen gut machbar." },
      { q: "Darf ich Patientenfälle zeigen?", a: "Nur mit dokumentierter Einwilligung, und Vorher-Nachher-Darstellungen sind in der Werbung für bestimmte Eingriffe eingeschränkt. Klären Sie das vorher mit Ihrer Kammer." },
    ],
  },
  {
    locale: "es",
    slug: "videos-para-clinicas-dentales",
    title: "Vídeos para clínicas dentales en redes sociales: guía práctica",
    description: "Qué vídeos cortos ven los pacientes, cómo grabarlos en cinco minutos y qué limita la publicidad sanitaria en España y otros países.",
    h1: "Vídeos para clínicas dentales en redes sociales",
    intro: "Muchos pacientes miran la clínica en internet antes de pedir cita. Los vídeos cortos les dejan ver quién les va a tratar y cómo explicas las cosas, y eso suele decidir la cita. No hace falta un estudio ni un calendario editorial para hacerlo bien.",
    sections: [
      { heading: "Qué temas funcionan", paragraphs: [
        "Los mejores temas son las preguntas que oyes en el sillón: ¿el blanqueamiento daña el esmalte?, ¿cuánto tarda un implante?, ¿qué hago después de una endodoncia?, ¿cuándo debe ir mi hijo al dentista por primera vez? Una pregunta por vídeo lo mantiene corto y útil.",
      ]},
      { heading: "Una idea por vídeo", paragraphs: [
        "Plantea la pregunta en el primer segundo, respóndela en dos o tres frases claras y termina invitando a preguntar o a pedir una revisión. Entre 20 y 60 segundos basta para casi todo. Añade subtítulos: mucha gente mira sin sonido.",
      ]},
      { heading: "Grabado en cinco minutos", paragraphs: [
        "Móvil en vertical a la altura de los ojos, de cara a una ventana y en una sala tranquila. Explica tres o cuatro puntos como se los contarías a un paciente. Una toma relajada suele funcionar mejor que un guion leído, y de cinco minutos salen varios clips cortos.",
      ]},
      { heading: "Lo que limita la publicidad sanitaria", paragraphs: [
        "En España, el Real Decreto 1907/1996 regula la publicidad con finalidad sanitaria, junto con la normativa autonómica y el código deontológico. Son delicadas, entre otras, las promesas de resultados y expresiones como “sin dolor” o “garantizado”, los superlativos y comparaciones con otras clínicas, los descuentos y las promesas de antes y después. Lo más seguro es informar con prudencia: “normalmente”, “consulta con tu dentista”.",
        "Las normas cambian y varían por país y región; ante la duda, consulta a tu colegio profesional.",
      ]},
      { heading: "Cómo ayuda DentVideo", paragraphs: [
        "DentVideo convierte una grabación corta tuya en clips subtitulados con tu logo, y escribe y pone voz a vídeos educativos para las semanas en que no puedes grabar. Cada guion se revisa en precisión clínica y normas de publicidad, y nada se publica sin tu aprobación.",
      ]},
    ],
    faq: [
      { q: "¿Cada cuánto debería publicar una clínica?", a: "Importa más la constancia que el volumen. Uno a tres vídeos educativos cortos por semana es asumible para la mayoría de clínicas." },
      { q: "¿Puedo mostrar casos de pacientes?", a: "Solo con un consentimiento documentado, y en publicidad las imágenes de antes y después están limitadas en muchos lugares. Consulta antes la normativa aplicable." },
    ],
  },
  {
    locale: "tr",
    slug: "dis-hekimleri-icin-instagram-videolari",
    title: "Diş hekimleri için Instagram videoları: konu, çekim ve reklam kuralları",
    description: "Diş klinikleri için pratik rehber: hastaların izlediği kısa videolar, beş dakikada çekim ve sağlık hizmetlerinde tanıtım kurallarına dikkat edilmesi gerekenler.",
    h1: "Diş hekimleri için Instagram videoları",
    intro: "Hastaların çoğu randevu almadan önce kliniği internette inceler. Kısa videolar, onları kimin tedavi edeceğini ve sizin nasıl anlattığınızı gösterir; randevuyu çoğu zaman bu belirler. Bunun için stüdyoya ya da içerik takvimine ihtiyacınız yok.",
    sections: [
      { heading: "Hangi konular işe yarar", paragraphs: [
        "En iyi konular, hastaların koltukta sorduğu sorulardır: Beyazlatma mineye zarar verir mi? İmplant ne kadar sürer? Kanal tedavisinden sonra nelere dikkat etmeliyim? Çocuğum ilk kez ne zaman diş hekimine gitmeli? Her videoda tek bir soru, videoyu kısa ve faydalı tutar.",
      ]},
      { heading: "Her videoda tek fikir", paragraphs: [
        "Soruyu ilk saniyede sorun, iki üç sade cümleyle yanıtlayın ve sonunda soru sormaya ya da kontrol randevusuna davet edin. Çoğu konu için 20–60 saniye yeterlidir. Altyazı ekleyin: birçok kişi sesi kapalı izler.",
      ]},
      { heading: "Beş dakikada çekim", paragraphs: [
        "Telefonu dikey ve göz hizasında tutun, yüzünüz pencereye dönük olsun, sessiz bir odada çekin. Üç dört noktayı bir hastaya anlatır gibi anlatın. Rahat tek bir çekim, okunan bir metinden genellikle daha iyidir; beş dakikalık bir kayıttan birkaç kısa klip çıkar.",
      ]},
      { heading: "Tanıtım kuralları neyi sınırlar", paragraphs: [
        "Türkiye'de Sağlık Bakanlığı'nın sağlık hizmetlerinde tanıtım ve bilgilendirme faaliyetleri hakkındaki yönetmeliği, sağlık kuruluşlarının tanıtım içeriklerini sıkı biçimde sınırlar. Garanti ve “acısız” gibi kesin ifadeler, “en iyi” gibi üstünlük iddiaları ve başka kliniklerle karşılaştırma, fiyat ve indirim duyuruları, öncesi-sonrası vaatleri ve hasta yorumları sorun yaratabilir. En güvenli yol, temkinli ifadelerle bilgilendirmektir: “genellikle”, “hekiminize danışın”.",
        "Kurallar değişebilir ve duruma göre yorumlanır; emin olmadığınızda bağlı olduğunuz meslek odasına ya da il sağlık müdürlüğüne danışın.",
      ]},
      { heading: "DentVideo nasıl yardımcı olur", paragraphs: [
        "DentVideo, sizin kısa bir kaydınızı logonuzla altyazılı kliplere dönüştürür; çekim yapamadığınız haftalar için bilgilendirme videolarını yazar ve seslendirir. Her senaryo klinik doğruluk ve tanıtım kurallarına göre denetlenir, siz onaylamadan hiçbir şey yayınlanmaz.",
      ]},
    ],
    faq: [
      { q: "Bir klinik ne sıklıkla video paylaşmalı?", a: "Miktardan çok düzen önemlidir. Haftada bir ila üç kısa bilgilendirme videosu çoğu klinik için sürdürülebilirdir." },
      { q: "Hasta vakalarını gösterebilir miyim?", a: "Yalnızca belgelenmiş onamla; ayrıca tanıtım kuralları öncesi-sonrası görsellerini sınırlayabilir. Paylaşmadan önce güncel mevzuatı kontrol edin." },
    ],
  },
  {
    locale: "fr",
    slug: "videos-pour-cabinets-dentaires",
    title: "Vidéos pour cabinets dentaires : sujets, tournage et règles de communication",
    description: "Guide pratique pour les cabinets dentaires : quelles vidéos courtes les patients regardent, comment les tourner en cinq minutes et ce que les règles déontologiques encadrent.",
    h1: "Vidéos pour cabinets dentaires",
    intro: "Beaucoup de patients regardent un cabinet en ligne avant de prendre rendez-vous. De courtes vidéos leur montrent qui va les soigner et comment vous expliquez les choses, ce qui fait souvent la différence. Nul besoin d'un studio ni d'un planning éditorial.",
    sections: [
      { heading: "Les sujets qui fonctionnent", paragraphs: [
        "Les meilleurs sujets sont les questions posées au fauteuil : le blanchiment abîme-t-il l'émail ? Combien de temps dure un implant ? Que faire après un traitement de canal ? Quand emmener son enfant chez le dentiste pour la première fois ? Une question par vidéo la garde courte et utile.",
      ]},
      { heading: "Une idée par vidéo", paragraphs: [
        "Posez la question dès la première seconde, répondez en deux ou trois phrases simples et terminez en invitant à poser une question ou à prendre rendez-vous pour un contrôle. 20 à 60 secondes suffisent le plus souvent. Ajoutez des sous-titres : beaucoup regardent sans le son.",
      ]},
      { heading: "Tourné en cinq minutes", paragraphs: [
        "Téléphone à la verticale, à hauteur des yeux, face à une fenêtre, dans une pièce calme. Expliquez trois ou quatre points comme vous le feriez à un patient. Une prise détendue vaut souvent mieux qu'un texte lu, et cinq minutes donnent plusieurs extraits courts.",
      ]},
      { heading: "Ce que les règles encadrent", paragraphs: [
        "En France, le code de déontologie des chirurgiens-dentistes, intégré au Code de la santé publique, encadre l'information qu'un cabinet peut diffuser : elle doit rester loyale, honnête et ne pas relever du procédé commercial. Les promesses de résultat, les termes comme « sans douleur » ou « garanti », les superlatifs et comparaisons, les réductions et les promesses avant-après sont à éviter. Le plus sûr est d'informer avec prudence : « en général », « parlez-en à votre dentiste ».",
        "Les règles évoluent ; en cas de doute, renseignez-vous auprès de votre conseil de l'Ordre.",
      ]},
      { heading: "Comment DentVideo vous aide", paragraphs: [
        "DentVideo transforme un court enregistrement de vous en extraits sous-titrés avec votre logo, et rédige et met en voix des vidéos d'information pour les semaines où vous ne pouvez pas filmer. Chaque script est vérifié pour l'exactitude clinique et les règles de communication, et rien n'est publié sans votre validation.",
      ]},
    ],
    faq: [
      { q: "À quelle fréquence publier ?", a: "La régularité compte plus que le volume. Une à trois vidéos d'information courtes par semaine reste réaliste pour la plupart des cabinets." },
      { q: "Puis-je montrer des cas de patients ?", a: "Uniquement avec un consentement documenté, et les règles de communication peuvent encadrer les images avant-après. Vérifiez auprès de l'Ordre avant de publier." },
    ],
  },
];

export const GUIDES: Guide[] = mergeGuides(BASE_GUIDES, GUIDE_LIBRARY);

export function guidePath(g: Pick<Guide, "slug">): string {
  return `/dentvideo/guides/${g.slug}`;
}

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesFor(locale: Locale): Guide[] {
  return GUIDES.filter((g) => g.locale === locale);
}
