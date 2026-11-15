/**
 * DentVideo's public content, in every language, in one place.
 *
 * The landings (/dentvideo, /dentvideo/de, …), the guides, the structured
 * data, the sitemap and /dentvideo/llms.txt all read from here, so a fact
 * changes once and every page and every answer engine sees the same thing.
 *
 * Rules for anything written here:
 * - describe only what the product does today;
 * - no price figures at all: `pricing.from` holds a {price} slot that is filled
 *   from lib/dentvid/pricing.ts (the list prices Dodo charges, per currency);
 *   no statistics, no testimonials
 *   (the ROI maths lives in docs/POSITIONING.md);
 * - never promise patients or bookings; the ROI line stays hedged;
 * - advertising-rule content stays general and hedged and names only
 *   regulations that exist; the clinic is told to check its national rules.
 */

import type { GuideExtras, SectionExtras } from "./guides/types";
import { GUIDE_LIBRARY, mergeGuides } from "./guides";

import {
  HREFLANG,
  LANDING_PATH,
  LANGUAGE_NAME,
  LOCALES,
  OWN_ROUTE_LOCALES,
  RTL_LOCALES,
  SHARED_ROUTE_LOCALES,
  dirOf,
  type Locale,
} from "./dentvideo-locales";

// The languages themselves live in a small module of their own, so the browser can have them without this file.
export { HREFLANG, LANDING_PATH, LANGUAGE_NAME, LOCALES, OWN_ROUTE_LOCALES, RTL_LOCALES, SHARED_ROUTE_LOCALES, dirOf, type Locale };

import type { Faq, LandingContent } from "./landing/types";
import { en } from "./landing/en";
import { de } from "./landing/de";
import { es } from "./landing/es";
import { tr } from "./landing/tr";
import { fr } from "./landing/fr";
import { ja } from "./landing/ja";
import { ar } from "./landing/ar";
import { pl } from "./landing/pl";

export type { Comparison, ComparisonRow, Faq, LandingContent, PricingTier, TitledText } from "./landing/types";

/** Each landing's copy lives in content/landing/<locale>.ts; the shape (and the rules for it) in content/landing/types.ts. */
export const LANDING: Record<Locale, LandingContent> = { en, de, es, tr, fr, ja, ar, pl };

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
        "DentVideo checks every script and caption for these commonly restricted claims in ten languages, sends anything risky back for a rewrite, and marks your own recordings for review instead of changing your words. It is a careful filter, not legal advice: you approve every video, and you remain responsible for what your clinic publishes.",
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

/**
 * Whether a language has a guides hub. A language without guides gets no hub
 * page, no "Guides" link and no sitemap entry: the site never advertises a
 * page that would be empty. Every language has guides today.
 */
export function hasGuides(locale: Locale): boolean {
  return guidesFor(locale).length > 0;
}

/** The languages with a guides hub, in LOCALES order. */
export const GUIDE_HUB_LOCALES: Locale[] = LOCALES.filter(hasGuides);
