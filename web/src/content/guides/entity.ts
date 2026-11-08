import type { Faq, Locale } from "../dentvideo";

/**
 * The facts about DentVideo itself, stated the same way everywhere: the About
 * pages, llms.txt, llms-full.txt and the structured data. Answer engines quote
 * what is stated plainly and consistently, so this is the one place to change
 * them. Same rules as the landing copy: only what the product does today, no
 * statistics, no testimonials; prices only in the "Price" fact, checked against
 * lib/dentvid/billing by guides.test.ts.
 */
export type EntityFacts = {
  meta: { title: string; description: string };
  h1: string;
  /** One quotable sentence: what DentVideo is. */
  definition: string;
  facts: { label: string; value: string }[];
  sections: { heading: string; paragraphs: string[] }[];
  faq: Faq[];
};

export const PUBLISHER_NAME = "Bulsu Labs";
export const PUBLISHER_URL = "https://bulsulabs.com";
export const SITE_URL = "https://dentvideo.com";
/** The languages DentVideo makes videos in (the site itself is in eight: not Italian or Portuguese). */
export const VIDEO_LANGUAGES = ["en", "de", "es", "fr", "it", "pt", "tr", "ja", "ar", "pl"] as const;

export const ENTITY: Record<Locale, EntityFacts> = {
  en: {
    meta: {
      title: "About DentVideo — what it is, who it is for, how checks work",
      description:
        "DentVideo is a web app by Bulsu Labs that makes short, narrated patient-education videos for dental clinics in ten languages and checks each one for clinical accuracy and health-advertising rules before the dentist approves it.",
    },
    h1: "About DentVideo",
    definition:
      "DentVideo is a web app for dental clinics that makes short patient-education videos — narrated, captioned and in the clinic's colours — and checks every script for clinical accuracy and health-advertising rules before the dentist approves it. It is made by Bulsu Labs.",
    facts: [
      { label: "What it is", value: "A web app (software as a service) that makes short educational videos for dental clinics' social media, website and waiting room." },
      { label: "Who it is for", value: "Dentists and dental clinics that want to post regularly without filming every week or hiring an agency." },
      { label: "Languages", value: "English, German, Spanish, French, Italian, Portuguese, Turkish, Japanese, Arabic and Polish, with formal or informal address." },
      { label: "What a clinic gets", value: "Five short educational videos a week answering real patient questions, narrated and captioned in the clinic's colours and logo, with a ready caption and hashtags. A dentist can also record five minutes of themselves and get short captioned clips of their own voice." },
      { label: "How content is checked", value: "Software checks every script and caption twice: once against commonly restricted advertising claims (guarantees, “painless”, “permanent”, superlatives, prices, discounts, before-and-after promises, testimonials) and once by a reviewer acting as a general dentist against mainstream clinical guidance. What fails is rewritten or not made. The dentist's own words are never changed; a clip worth a second look is marked with the reason." },
      { label: "Who decides", value: "The dentist. Nothing is published until the clinic approves it, and DentVideo does not post to social networks itself: the clinic downloads approved videos and posts them." },
      { label: "Legal status of the checks", value: "A careful filter, not legal advice. The clinic remains responsible for what it publishes and should check its national rules." },
      { label: "Price", value: "Paid plans from $39/month: Starter $39/month, Practice $69/month (or $690 a year), Group $219/month. Monthly, with no minimum term. Before paying, a clinic sees a live preview of its own branded videos with its logo and colours; its first week of videos is made right after payment. Founding offer: Practice at $39/month for 12 months for the first 100 clinics." },
      { label: "Publisher", value: "Bulsu Labs (bulsulabs.com)." },
      { label: "Website", value: "dentvideo.com — in English, German, Spanish, Turkish, French, Japanese, Arabic and Polish." },
    ],
    sections: [
      {
        heading: "Why DentVideo exists",
        paragraphs: [
          "Patients tend to choose a dentist they feel they already know, and short videos are one of the easiest ways for them to get to know you. But posting every week takes time a clinic rarely has, and health advertising is regulated: a single “painless”, a discount or a before-and-after promise can break the rules in many countries. General video tools do not know the difference.",
          "DentVideo was built to make the regular part easy and the risky part visible: the videos are made for you, checked the way a careful colleague would check them, and the final word stays with the dentist.",
        ],
      },
      {
        heading: "How a week works",
        paragraphs: [
          "A clinic describes itself once: language, services, tone, colours and logo. Videos are only ever about the services the clinic offers. Each week DentVideo plans five topics from those services and the questions patients ask, writes and narrates the videos, captions them, and puts them through the checks. The dentist watches, approves or declines each one and downloads the approved videos with a caption and hashtags.",
          "When the dentist has five minutes, a filming card suggests what to say; DentVideo cuts the recording into short captioned clips with the clinic's logo. Patients usually trust the person who will treat them most, so these clips are the strongest videos a clinic can post.",
        ],
      },
    ],
    faq: [
      { q: "What is DentVideo?", a: "A web app for dental clinics that makes short, narrated and captioned patient-education videos in ten languages and checks each one for clinical accuracy and health-advertising rules before the dentist approves it." },
      { q: "Who makes DentVideo?", a: "Bulsu Labs." },
      { q: "Does DentVideo post to Instagram or TikTok automatically?", a: "No. The clinic approves each video, downloads it with a ready caption and hashtags, and posts it itself." },
      { q: "Is DentVideo's compliance check legal advice?", a: "No. It catches commonly restricted claims and flags anything worth a second look, but rules differ by country and change; the clinic remains responsible for what it publishes." },
    ],
  },
  de: {
    meta: {
      title: "Über DentVideo — was es ist, für wen, wie geprüft wird",
      description:
        "DentVideo ist eine Web-App von Bulsu Labs, die kurze, vertonte Aufklärungsvideos für Zahnarztpraxen in zehn Sprachen erstellt und jedes vor der Freigabe auf fachliche Richtigkeit und Werberecht im Gesundheitswesen prüft.",
    },
    h1: "Über DentVideo",
    definition:
      "DentVideo ist eine Web-App für Zahnarztpraxen, die kurze Patientenaufklärungsvideos erstellt — vertont, untertitelt und in den Farben der Praxis — und jedes Skript auf fachliche Richtigkeit und Werberecht prüft, bevor die Zahnärztin oder der Zahnarzt es freigibt. Entwickelt von Bulsu Labs.",
    facts: [
      { label: "Was es ist", value: "Eine Web-App (Software as a Service), die kurze Aufklärungsvideos für Social Media, Website und Wartezimmer von Zahnarztpraxen erstellt." },
      { label: "Für wen", value: "Zahnärztinnen, Zahnärzte und Praxen, die regelmäßig posten möchten, ohne jede Woche zu drehen oder eine Agentur zu beauftragen." },
      { label: "Sprachen", value: "Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch, Türkisch, Japanisch, Arabisch und Polnisch, mit Sie oder Du." },
      { label: "Was die Praxis bekommt", value: "Fünf kurze Aufklärungsvideos pro Woche zu echten Patientenfragen, vertont und untertitelt, mit Logo und Praxisfarben, inklusive fertigem Beitragstext und Hashtags. Wer fünf Minuten selbst spricht, bekommt daraus kurze untertitelte Clips mit der eigenen Stimme." },
      { label: "Wie geprüft wird", value: "Software prüft jedes Skript und jeden Beitragstext zweimal: auf häufig verbotene Werbeaussagen (Garantien, „schmerzfrei“, „dauerhaft“, Superlative, Preise, Rabatte, Vorher-Nachher-Versprechen, Patientenstimmen) und durch einen Prüfer in der Rolle eines Allgemeinzahnarztes auf fachliche Richtigkeit. Was durchfällt, wird umgeschrieben oder nicht erstellt. Eigene Aufnahmen werden nie verändert; Auffälliges wird mit Begründung markiert." },
      { label: "Wer entscheidet", value: "Die Praxis. Nichts wird veröffentlicht, bevor sie es freigibt, und DentVideo postet nicht selbst: Freigegebene Videos werden heruntergeladen und von der Praxis gepostet." },
      { label: "Rechtlicher Stellenwert", value: "Ein sorgfältiger Filter, keine Rechtsberatung. Verantwortlich für Veröffentlichungen bleibt die Praxis." },
      { label: "Preis", value: "Tarife ab 39 $ im Monat: Starter 39 $, Practice 69 $ (oder 690 $ im Jahr), Group 219 $ im Monat. Monatlich, ohne Mindestlaufzeit. Vor der Zahlung sieht eine Praxis eine Live-Vorschau ihrer eigenen Videos mit Logo und Farben; die erste Woche Videos entsteht direkt nach der Zahlung. Gründungsangebot: Practice für 39 $ im Monat, 12 Monate lang, für die ersten 100 Praxen." },
      { label: "Anbieter", value: "Bulsu Labs (bulsulabs.com)." },
      { label: "Website", value: "dentvideo.com — auf Deutsch, Englisch, Spanisch, Türkisch, Französisch, Japanisch, Arabisch und Polnisch." },
    ],
    sections: [
      {
        heading: "Warum es DentVideo gibt",
        paragraphs: [
          "Patienten wählen gern eine Praxis, die sie schon ein wenig zu kennen glauben — kurze Videos sind dafür einer der einfachsten Wege. Doch jede Woche zu posten kostet Zeit, und Werbung für Heilbehandlungen ist reguliert: Ein „schmerzfrei“, ein Rabatt oder ein Vorher-Nachher-Versprechen kann gegen das Heilmittelwerbegesetz oder die Berufsordnung verstoßen. Allgemeine Video-Tools kennen diesen Unterschied nicht.",
          "DentVideo macht den regelmäßigen Teil einfach und den riskanten Teil sichtbar: Die Videos werden für Sie erstellt, so geprüft, wie eine sorgfältige Kollegin prüfen würde, und das letzte Wort hat die Praxis.",
        ],
      },
      {
        heading: "So läuft eine Woche",
        paragraphs: [
          "Die Praxis beschreibt sich einmal: Sprache, Leistungen, Tonalität, Farben und Logo. Videos behandeln nur Leistungen, die die Praxis anbietet. Jede Woche plant DentVideo fünf Themen aus diesen Leistungen und den Fragen, die Patienten stellen, schreibt und vertont die Videos, untertitelt sie und prüft sie. Die Praxis sieht sich jedes an, gibt es frei oder lehnt es ab und lädt freigegebene Videos mit Text und Hashtags herunter.",
          "Wenn fünf Minuten Zeit sind, schlägt eine Drehkarte vor, was Sie sagen könnten; DentVideo schneidet die Aufnahme in kurze untertitelte Clips mit Ihrem Logo.",
        ],
      },
    ],
    faq: [
      { q: "Was ist DentVideo?", a: "Eine Web-App für Zahnarztpraxen, die kurze, vertonte und untertitelte Aufklärungsvideos in zehn Sprachen erstellt und jedes vor der Freigabe auf fachliche Richtigkeit und Werberecht prüft." },
      { q: "Wer steht hinter DentVideo?", a: "Bulsu Labs." },
      { q: "Postet DentVideo automatisch auf Instagram oder TikTok?", a: "Nein. Die Praxis gibt jedes Video frei, lädt es mit fertigem Text und Hashtags herunter und postet es selbst." },
      { q: "Ist die Prüfung eine Rechtsberatung?", a: "Nein. Sie fängt häufig verbotene Aussagen ab und markiert Auffälliges, doch die Regeln unterscheiden sich je Land und ändern sich; verantwortlich bleibt die Praxis." },
    ],
  },
  es: {
    meta: {
      title: "Sobre DentVideo — qué es, para quién y cómo se revisa",
      description:
        "DentVideo es una aplicación web de Bulsu Labs que crea vídeos educativos cortos y narrados para clínicas dentales en diez idiomas y revisa cada uno en precisión clínica y normas de publicidad sanitaria antes de que el dentista lo apruebe.",
    },
    h1: "Sobre DentVideo",
    definition:
      "DentVideo es una aplicación web para clínicas dentales que crea vídeos cortos de educación al paciente —narrados, subtitulados y con los colores de la clínica— y revisa cada guion en precisión clínica y normas de publicidad sanitaria antes de que el dentista lo apruebe. La desarrolla Bulsu Labs.",
    facts: [
      { label: "Qué es", value: "Una aplicación web (software como servicio) que crea vídeos educativos cortos para las redes sociales, la web y la sala de espera de clínicas dentales." },
      { label: "Para quién", value: "Dentistas y clínicas dentales que quieren publicar con regularidad sin grabar cada semana ni contratar una agencia." },
      { label: "Idiomas", value: "Español, inglés, alemán, francés, italiano, portugués, turco, japonés, árabe y polaco, con trato de usted o de tú." },
      { label: "Qué recibe la clínica", value: "Cinco vídeos educativos cortos a la semana que responden preguntas reales de pacientes, narrados y subtitulados con el logo y los colores de la clínica, con texto y hashtags listos. Si el dentista graba cinco minutos hablando, recibe clips cortos subtitulados con su propia voz." },
      { label: "Cómo se revisa", value: "Un software revisa cada guion y cada texto dos veces: frente a las afirmaciones publicitarias que suelen estar restringidas (garantías, “sin dolor”, “permanente”, superlativos, precios, descuentos, promesas de antes y después, testimonios) y mediante un revisor que actúa como dentista general frente a las guías clínicas habituales. Lo que no pasa se reescribe o no se hace. Las grabaciones propias nunca se modifican; lo que merece otra mirada se marca con el motivo." },
      { label: "Quién decide", value: "La clínica. Nada se publica sin su aprobación, y DentVideo no publica en redes por sí mismo: la clínica descarga los vídeos aprobados y los publica." },
      { label: "Valor jurídico", value: "Un filtro cuidadoso, no asesoramiento jurídico. La clínica sigue siendo responsable de lo que publica." },
      { label: "Precio", value: "Planes desde 39 $ al mes: Starter 39 $, Practice 69 $ (o 690 $ al año), Group 219 $ al mes. Mensuales y sin permanencia. Antes de pagar, la clínica ve una vista previa en directo de sus propios vídeos con su logo y sus colores; su primera semana de vídeos se crea justo después del pago. Oferta de fundadoras: Practice a 39 $ al mes durante 12 meses para las primeras 100 clínicas." },
      { label: "Empresa", value: "Bulsu Labs (bulsulabs.com)." },
      { label: "Web", value: "dentvideo.com — en español, inglés, alemán, turco, francés, japonés, árabe y polaco." },
    ],
    sections: [
      {
        heading: "Por qué existe DentVideo",
        paragraphs: [
          "Los pacientes suelen elegir un dentista al que sienten que ya conocen, y los vídeos cortos son una de las formas más sencillas de conseguirlo. Pero publicar cada semana lleva tiempo, y la publicidad sanitaria está regulada: un “sin dolor”, un descuento o una promesa de antes y después puede incumplir las normas. Las herramientas de vídeo genéricas no distinguen esos matices.",
          "DentVideo hace fácil la parte regular y visible la parte arriesgada: los vídeos se hacen por ti, se revisan como lo haría un colega cuidadoso y la última palabra es del dentista.",
        ],
      },
      {
        heading: "Cómo funciona una semana",
        paragraphs: [
          "La clínica se describe una vez: idioma, tratamientos, tono, colores y logo. Los vídeos tratan solo de tratamientos que la clínica ofrece. Cada semana DentVideo planifica cinco temas a partir de esos tratamientos y de las preguntas de los pacientes, escribe y narra los vídeos, los subtitula y los revisa. El dentista los ve, aprueba o rechaza cada uno y descarga los aprobados con su texto y hashtags.",
          "Cuando hay cinco minutos, una tarjeta de grabación sugiere qué decir; DentVideo corta la grabación en clips cortos subtitulados con el logo de la clínica.",
        ],
      },
    ],
    faq: [
      { q: "¿Qué es DentVideo?", a: "Una aplicación web para clínicas dentales que crea vídeos educativos cortos, narrados y subtitulados en diez idiomas y revisa cada uno en precisión clínica y normas de publicidad sanitaria antes de que el dentista lo apruebe." },
      { q: "¿Quién desarrolla DentVideo?", a: "Bulsu Labs." },
      { q: "¿DentVideo publica automáticamente en Instagram o TikTok?", a: "No. La clínica aprueba cada vídeo, lo descarga con texto y hashtags listos y lo publica ella misma." },
      { q: "¿La revisión es asesoramiento jurídico?", a: "No. Detecta afirmaciones que suelen estar restringidas y marca lo dudoso, pero las normas cambian y varían por país y comunidad; la clínica sigue siendo responsable." },
    ],
  },
  tr: {
    meta: {
      title: "DentVideo hakkında — nedir, kimin için, nasıl denetlenir",
      description:
        "DentVideo, Bulsu Labs'in geliştirdiği; diş klinikleri için on dilde kısa, seslendirmeli hasta bilgilendirme videoları üreten ve her birini hekim onayından önce klinik doğruluk ve sağlık tanıtım kurallarına göre denetleyen bir web uygulamasıdır.",
    },
    h1: "DentVideo hakkında",
    definition:
      "DentVideo, diş klinikleri için kısa hasta bilgilendirme videoları üreten —seslendirilmiş, altyazılı ve kliniğin renklerinde— ve her senaryoyu diş hekimi onaylamadan önce klinik doğruluk ve sağlık tanıtım kurallarına göre denetleyen bir web uygulamasıdır. Bulsu Labs tarafından geliştirilir.",
    facts: [
      { label: "Nedir", value: "Diş kliniklerinin sosyal medyası, web sitesi ve bekleme salonu için kısa bilgilendirme videoları üreten bir web uygulaması (hizmet olarak yazılım)." },
      { label: "Kimin için", value: "Her hafta çekim yapmadan ya da ajansla çalışmadan düzenli paylaşım yapmak isteyen diş hekimleri ve diş klinikleri." },
      { label: "Diller", value: "Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca, Portekizce, Japonca, Arapça ve Lehçe; “siz” ya da “sen” hitabıyla." },
      { label: "Klinik ne alır", value: "Haftada beş kısa bilgilendirme videosu: gerçek hasta sorularını yanıtlar, seslendirilmiş ve altyazılıdır, kliniğin logosu ve renkleriyle hazırlanır, açıklama metni ve etiketleriyle gelir. Hekim beş dakikalık bir kayıt yaparsa, kendi sesinden kısa altyazılı klipler de hazırlanır." },
      { label: "Nasıl denetlenir", value: "Yazılım her senaryoyu ve metni iki kez denetler: sıkça kısıtlanan tanıtım ifadelerine karşı (garanti, “acısız”, “kalıcı”, üstünlük iddiaları, fiyat, indirim, öncesi-sonrası vaatleri, hasta yorumları) ve genel diş hekimi rolündeki bir denetçiyle yaygın klinik bilgiye karşı. Geçemeyen yeniden yazılır ya da üretilmez. Hekimin kendi sözleri asla değiştirilmez; dikkat gerektiren bir klip gerekçesiyle işaretlenir." },
      { label: "Kim karar verir", value: "Klinik. Onaylanmadan hiçbir şey yayınlanmaz ve DentVideo sosyal ağlarda kendisi paylaşım yapmaz: klinik onayladığı videoları indirir ve kendisi paylaşır." },
      { label: "Hukuki niteliği", value: "Özenli bir filtre; hukuki danışmanlık değildir. Yayınlanan içerikten klinik sorumludur." },
      { label: "Ücret", value: "Aylık $39'dan başlayan planlar: Starter $39, Practice $69 (ya da yıllık $690), Group $219 (aylık). Aylık, asgari süre yok. Klinik, ödeme yapmadan önce kendi videolarının logosu ve renkleriyle canlı önizlemesini görür; ilk haftanın videoları ödemenin hemen ardından hazırlanır. Kurucu teklifi: ilk 100 klinik için 12 ay boyunca aylık $39'a Practice." },
      { label: "Geliştiren", value: "Bulsu Labs (bulsulabs.com)." },
      { label: "Web sitesi", value: "dentvideo.com — Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, Japonca, Arapça ve Lehçe." },
    ],
    sections: [
      {
        heading: "DentVideo neden var",
        paragraphs: [
          "Hastalar çoğu zaman zaten tanıdığını hissettiği hekimi seçer; kısa videolar bunun en kolay yollarından biridir. Ancak her hafta paylaşım yapmak zaman ister ve Türkiye'de sağlık hizmetlerinde tanıtım sıkı kurallara bağlıdır: tek bir “acısız”, bir indirim ya da öncesi-sonrası vaadi yönetmeliğe aykırı olabilir. Genel video araçları bu farkı bilmez.",
          "DentVideo düzenli kısmı kolaylaştırır, riskli kısmı görünür kılar: videolar sizin için hazırlanır, özenli bir meslektaşın bakacağı gibi denetlenir ve son söz hekimde kalır.",
        ],
      },
      {
        heading: "Bir hafta nasıl işler",
        paragraphs: [
          "Klinik kendini bir kez tanıtır: dil, tedaviler, üslup, renkler ve logo. Videolar yalnızca kliniğin sunduğu tedavilerle ilgilidir. DentVideo her hafta bu tedavilerden ve hastaların sorduğu sorulardan beş konu planlar, videoları yazar ve seslendirir, altyazılar ve denetler. Hekim her birini izler, onaylar ya da reddeder ve onaylananları açıklama metni ve etiketleriyle indirir.",
          "Beş dakikanız olduğunda bir çekim kartı ne söyleyebileceğinizi önerir; DentVideo kaydı logonuzla kısa, altyazılı kliplere böler.",
        ],
      },
    ],
    faq: [
      { q: "DentVideo nedir?", a: "Diş klinikleri için on dilde kısa, seslendirmeli ve altyazılı hasta bilgilendirme videoları üreten ve her birini hekim onayından önce klinik doğruluk ve tanıtım kurallarına göre denetleyen bir web uygulamasıdır." },
      { q: "DentVideo'yu kim geliştiriyor?", a: "Bulsu Labs." },
      { q: "DentVideo Instagram'a ya da TikTok'a otomatik paylaşım yapar mı?", a: "Hayır. Klinik her videoyu onaylar, hazır metin ve etiketlerle indirir ve kendisi paylaşır." },
      { q: "Denetim hukuki danışmanlık yerine geçer mi?", a: "Hayır. Sıkça kısıtlanan ifadeleri yakalar ve dikkat gerektireni işaretler; ancak kurallar değişebilir ve yorum gerektirir, yayından klinik sorumludur." },
    ],
  },
  fr: {
    meta: {
      title: "À propos de DentVideo — ce que c'est, pour qui, comment c'est vérifié",
      description:
        "DentVideo est une application web de Bulsu Labs qui crée de courtes vidéos d'information patient, narrées, pour les cabinets dentaires en dix langues, et vérifie chacune pour l'exactitude clinique et les règles de communication avant validation par le praticien.",
    },
    h1: "À propos de DentVideo",
    definition:
      "DentVideo est une application web pour cabinets dentaires qui crée de courtes vidéos d'information patient — narrées, sous-titrées et aux couleurs du cabinet — et vérifie chaque script pour l'exactitude clinique et les règles de communication en santé avant que le chirurgien-dentiste ne le valide. Elle est développée par Bulsu Labs.",
    facts: [
      { label: "Ce que c'est", value: "Une application web (logiciel en ligne) qui crée de courtes vidéos d'information pour les réseaux sociaux, le site et la salle d'attente des cabinets dentaires." },
      { label: "Pour qui", value: "Les chirurgiens-dentistes et cabinets qui veulent publier régulièrement sans filmer chaque semaine ni passer par une agence." },
      { label: "Langues", value: "Français, anglais, allemand, espagnol, italien, portugais, turc, japonais, arabe et polonais, avec vouvoiement ou tutoiement." },
      { label: "Ce que reçoit le cabinet", value: "Cinq courtes vidéos d'information par semaine répondant à de vraies questions de patients, narrées et sous-titrées aux couleurs et avec le logo du cabinet, avec un texte et des hashtags prêts. Un praticien qui s'enregistre cinq minutes reçoit de courts extraits sous-titrés avec sa propre voix." },
      { label: "Comment c'est vérifié", value: "Un logiciel vérifie chaque script et chaque texte deux fois : face aux allégations publicitaires couramment encadrées (garanties, « sans douleur », « définitif », superlatifs, prix, réductions, promesses avant-après, témoignages) et par un relecteur agissant comme un omnipraticien face aux recommandations cliniques courantes. Ce qui échoue est réécrit ou n'est pas produit. Vos propres enregistrements ne sont jamais modifiés ; ce qui mérite un second regard est signalé avec la raison." },
      { label: "Qui décide", value: "Le cabinet. Rien n'est publié sans sa validation, et DentVideo ne publie pas lui-même sur les réseaux : le cabinet télécharge les vidéos validées et les publie." },
      { label: "Portée juridique", value: "Un filtre attentif, pas un conseil juridique. Le cabinet reste responsable de ce qu'il publie." },
      { label: "Prix", value: "Formules à partir de 39 $ par mois : Starter 39 $, Practice 69 $ (ou 690 $ par an), Group 219 $ par mois. Mensuelles, sans engagement. Avant de payer, le cabinet voit un aperçu en direct de ses propres vidéos, à son logo et à ses couleurs ; sa première semaine de vidéos est réalisée dès le paiement. Offre fondateur : Practice à 39 $ par mois pendant 12 mois pour les 100 premiers cabinets." },
      { label: "Éditeur", value: "Bulsu Labs (bulsulabs.com)." },
      { label: "Site", value: "dentvideo.com — en français, anglais, allemand, espagnol, turc, japonais, arabe et polonais." },
    ],
    sections: [
      {
        heading: "Pourquoi DentVideo existe",
        paragraphs: [
          "Les patients choisissent volontiers un praticien qu'ils ont l'impression de déjà connaître, et les vidéos courtes sont l'un des moyens les plus simples d'y parvenir. Mais publier chaque semaine prend du temps, et la communication des chirurgiens-dentistes est encadrée : un « sans douleur », une réduction ou une promesse avant-après peut contrevenir au code de déontologie. Les outils vidéo génériques ne font pas la différence.",
          "DentVideo rend la partie régulière simple et la partie risquée visible : les vidéos sont faites pour vous, vérifiées comme le ferait un confrère attentif, et le dernier mot reste au praticien.",
        ],
      },
      {
        heading: "Comment se déroule une semaine",
        paragraphs: [
          "Le cabinet se décrit une fois : langue, soins, ton, couleurs et logo. Les vidéos ne portent que sur les soins proposés par le cabinet. Chaque semaine, DentVideo planifie cinq sujets à partir de ces soins et des questions des patients, rédige et met en voix les vidéos, les sous-titre et les vérifie. Le praticien regarde, valide ou refuse chacune et télécharge les vidéos validées avec leur texte et leurs hashtags.",
          "Quand vous avez cinq minutes, une fiche de tournage vous suggère quoi dire ; DentVideo découpe l'enregistrement en courts extraits sous-titrés avec votre logo.",
        ],
      },
    ],
    faq: [
      { q: "Qu'est-ce que DentVideo ?", a: "Une application web pour cabinets dentaires qui crée de courtes vidéos d'information patient, narrées et sous-titrées, en dix langues, et vérifie chacune pour l'exactitude clinique et les règles de communication avant validation par le praticien." },
      { q: "Qui développe DentVideo ?", a: "Bulsu Labs." },
      { q: "DentVideo publie-t-il automatiquement sur Instagram ou TikTok ?", a: "Non. Le cabinet valide chaque vidéo, la télécharge avec un texte et des hashtags prêts et la publie lui-même." },
      { q: "La vérification vaut-elle conseil juridique ?", a: "Non. Elle repère les allégations couramment encadrées et signale ce qui mérite un second regard, mais les règles évoluent ; le cabinet reste responsable de ce qu'il publie." },
    ],
  },
  ja: {
    meta: {
      title: "DentVideoについて：サービスの内容、対象、チェックのしくみ",
      description:
        "DentVideoは、Bulsu Labsが提供するウェブアプリです。歯科医院向けに、ナレーション付きの短い患者さん向け説明動画を10言語で制作し、院長先生の承認の前に、臨床的な正確性と医療広告の観点から1本ずつチェックします。",
    },
    h1: "DentVideoについて",
    definition:
      "DentVideoは、歯科医院のための患者さん向け説明動画を制作するウェブアプリです。ナレーションと字幕を付け、医院のカラーで仕上げた短い動画を作り、院長先生が承認する前に、すべての台本を臨床的な正確性と医療広告の観点からチェックします。提供はBulsu Labsです。",
    facts: [
      { label: "サービスの内容", value: "歯科医院のSNS、ウェブサイト、待合室で使える短い説明動画を制作するウェブアプリ（SaaS）です。" },
      { label: "対象", value: "毎週撮影したり代理店に依頼したりせずに、定期的に発信を続けたい歯科医師・歯科医院。" },
      { label: "言語", value: "日本語、英語、ドイツ語、スペイン語、フランス語、イタリア語、ポルトガル語、トルコ語、アラビア語、ポーランド語。日本語はです・ます調で作ります。" },
      { label: "医院に届くもの", value: "患者さんの実際の疑問に答える短い説明動画を毎週5本。ナレーションと字幕付きで、医院のロゴとカラー入り。キャプションとハッシュタグも用意します。院長先生が5分ほどお話しになった動画からは、ご本人の声による字幕付きの短いクリップも作れます。" },
      { label: "チェックのしくみ", value: "すべての台本とキャプションを、ソフトウェアが2回チェックします。1回目は、一般に規制されやすい広告表現（効果の保証、「痛くない」「永久」、最上級の表現、料金、割引、ビフォーアフター、体験談）について。2回目は、一般歯科医の立場で確認するレビュアーが、標準的な臨床の知見に照らして確認します。基準を満たさないものは書き直すか、制作しません。院長先生ご自身の言葉は変更せず、確認が必要なクリップには理由を添えて印を付けます。" },
      { label: "判断するのは", value: "院長先生です。医院が承認するまで何も公開されず、DentVideoがSNSに投稿することもありません。承認した動画は医院がダウンロードして投稿します。" },
      { label: "チェックの位置づけ", value: "丁寧なフィルターであり、法的助言ではありません。公開する内容の責任は医院にあり、国内のルールのご確認をお願いしています。" },
      { label: "料金", value: "有料プランは月額$39から：Starter 月額$39、Practice 月額$69（年額$690）、Group 月額$219。月単位の契約で、最低契約期間はありません。お支払いの前に、医院のロゴとカラーで仕上げた動画のライブプレビューを確認でき、初週の動画はお支払い後すぐに制作されます。先行導入価格：先着100院は、Practiceが12か月間 月額$39。" },
      { label: "提供元", value: "Bulsu Labs（bulsulabs.com）" },
      { label: "ウェブサイト", value: "dentvideo.com（日本語、英語、ドイツ語、スペイン語、トルコ語、フランス語、アラビア語、ポーランド語）" },
    ],
    sections: [
      {
        heading: "DentVideoをつくった理由",
        paragraphs: [
          "患者さんは、すでに知っていると感じる歯科医院を選ぶ傾向があり、短い動画はそのための手軽な方法のひとつです。ただ、毎週投稿を続けるには時間がかかり、医療広告にはルールがあります。「痛くない」の一言や割引、ビフォーアフターは、医療広告ガイドライン上の問題になりえます。一般的な動画ツールは、その違いを知りません。",
          "DentVideoは、続ける部分を簡単にし、気をつけるべき部分を見えるようにするためにつくりました。動画は医院のために制作し、注意深い同僚が確認するようにチェックし、最終的な判断は院長先生に委ねます。",
        ],
      },
      {
        heading: "1週間の流れ",
        paragraphs: [
          "医院は最初に一度だけ、言語、診療内容、トーン、カラー、ロゴを登録します。動画は、医院が実際に行っている診療についてだけ作られます。DentVideoは毎週、その診療内容と患者さんの疑問から5つのテーマを選び、台本を書いてナレーションを付け、字幕を入れてチェックします。院長先生は1本ずつご覧になって承認または見送りを選び、承認した動画をキャプションとハッシュタグとともにダウンロードします。",
          "5分ほど時間があるときは、撮影カードが話す内容を提案します。DentVideoは撮影した動画を、医院のロゴ入りの字幕付きクリップに分けます。",
        ],
      },
    ],
    faq: [
      { q: "DentVideoとは何ですか？", a: "歯科医院のためのウェブアプリです。ナレーションと字幕付きの短い患者さん向け説明動画を10言語で制作し、院長先生の承認の前に、臨床的な正確性と医療広告の観点から1本ずつチェックします。" },
      { q: "DentVideoはどこが提供していますか？", a: "Bulsu Labsです。" },
      { q: "InstagramやTikTokに自動で投稿されますか？", a: "されません。医院が動画を1本ずつ承認し、キャプションとハッシュタグとともにダウンロードして、ご自身で投稿します。" },
      { q: "DentVideoのチェックは法的助言にあたりますか？", a: "あたりません。一般に規制されやすい表現を検出し、確認が必要な箇所に印を付けますが、ルールは国によって異なり、変わることもあります。公開する内容の責任は医院にあります。" },
    ],
  },
  ar: {
    meta: {
      title: "عن DentVideo: ما هو، ولمن، وكيف تتم المراجعة",
      description:
        "DentVideo تطبيق ويب من Bulsu Labs يُعدّ لعيادات الأسنان فيديوهات توعوية قصيرة للمرضى بتعليق صوتي في عشر لغات، ويراجع كل فيديو للدقة السريرية وضوابط الإعلان الصحي قبل أن يعتمده طبيب الأسنان.",
    },
    h1: "عن DentVideo",
    definition:
      "DentVideo تطبيق ويب لعيادات الأسنان يُعدّ فيديوهات توعوية قصيرة للمرضى، بتعليق صوتي ونص على الشاشة وبألوان العيادة، ويراجع كل نص للدقة السريرية وضوابط الإعلان الصحي قبل أن يعتمده طبيب الأسنان. تطوّره Bulsu Labs.",
    facts: [
      { label: "ما هو", value: "تطبيق ويب (برمجيات كخدمة) يُعدّ فيديوهات توعوية قصيرة لحسابات عيادات الأسنان على وسائل التواصل ولمواقعها وغرف انتظارها." },
      { label: "لمن", value: "أطباء الأسنان وعيادات الأسنان الذين يريدون النشر بانتظام دون تصوير كل أسبوع أو التعاقد مع وكالة." },
      { label: "اللغات", value: "العربية والإنجليزية والألمانية والإسبانية والفرنسية والإيطالية والبرتغالية والتركية واليابانية والبولندية، مع مخاطبة رسمية أو ودّية. العربية بفصحى مبسّطة وبصيغة الجمع." },
      { label: "ما تحصل عليه العيادة", value: "خمسة فيديوهات توعوية قصيرة أسبوعياً تجيب عن أسئلة حقيقية يطرحها المرضى، بتعليق صوتي ونص على الشاشة وبشعار العيادة وألوانها، مع نص مرافق ووسوم جاهزة. ويمكن لطبيب الأسنان تسجيل خمس دقائق لنفسه للحصول على مقاطع قصيرة بصوته." },
      { label: "كيف تتم المراجعة", value: "يراجع البرنامج كل نص وكل تعليق مرتين: مرة مقابل الادعاءات الإعلانية المقيّدة عادةً (الضمانات، و«بدون ألم»، و«دائم»، وصيغ التفضيل، والأسعار، والخصومات، ووعود قبل وبعد، وشهادات المرضى)، ومرة عبر مراجِع يعمل بعين طبيب أسنان عام مقابل الإرشادات السريرية المعتمدة. ما لا يجتاز المراجعة يُعاد كتابته أو لا يُعدّ. ولا تُغيَّر كلمات الطبيب نفسه أبداً، وما يستحق نظرة ثانية يُعلَّم مع السبب." },
      { label: "من يقرّر", value: "طبيب الأسنان. لا يُنشر شيء قبل أن تعتمده العيادة، ولا ينشر DentVideo على الشبكات الاجتماعية بنفسه: تنزّل العيادة الفيديوهات المعتمدة وتنشرها." },
      { label: "الصفة القانونية للمراجعة", value: "مرشّح دقيق، وليست استشارة قانونية. تبقى العيادة مسؤولة عمّا تنشره وعن تصاريح الإعلان المطلوبة لديها، وعليها التحقق من الضوابط المحلية." },
      { label: "السعر", value: "باقات مدفوعة تبدأ من $39 شهرياً: Starter بسعر $39 شهرياً، وPractice بسعر $69 شهرياً (أو $690 سنوياً)، وGroup بسعر $219 شهرياً. اشتراك شهري دون حد أدنى للمدة. قبل الدفع تشاهد العيادة معاينة حية لفيديوهاتها بشعارها وألوانها، ويُعدّ أسبوعها الأول فور الدفع. سعر المؤسسين: باقة Practice بسعر $39 شهرياً لمدة 12 شهراً لأول 100 عيادة." },
      { label: "الناشر", value: "Bulsu Labs (bulsulabs.com)." },
      { label: "الموقع", value: "dentvideo.com بالعربية والإنجليزية والألمانية والإسبانية والتركية والفرنسية واليابانية والبولندية." },
    ],
    sections: [
      {
        heading: "لماذا وُجد DentVideo",
        paragraphs: [
          "يميل المرضى إلى اختيار طبيب أسنان يشعرون أنهم يعرفونه، والفيديوهات القصيرة من أسهل الطرق لذلك. لكن النشر كل أسبوع يحتاج وقتاً نادراً ما تملكه العيادة، والإعلان الصحي منظَّم: كلمة مثل «بدون ألم» أو خصم أو وعد قبل وبعد قد يخالف معايير الجهات الصحية. وأدوات الفيديو العامة لا تعرف هذا الفرق.",
          "صُمّم DentVideo ليجعل الجزء المتكرر سهلاً والجزء الحساس واضحاً: تُعدّ الفيديوهات لكم، وتُراجَع كما يراجعها زميل حريص، وتبقى الكلمة الأخيرة لطبيب الأسنان.",
        ],
      },
      {
        heading: "كيف يسير الأسبوع",
        paragraphs: [
          "تصف العيادة نفسها مرة واحدة: اللغة والخدمات والأسلوب والألوان والشعار. ولا تتناول الفيديوهات إلا الخدمات التي تقدّمها. كل أسبوع يخطّط DentVideo خمسة مواضيع من هذه الخدمات ومن أسئلة المرضى، فيكتب الفيديوهات ويسجّلها صوتياً ويضيف النص ويراجعها. يشاهد طبيب الأسنان كل فيديو فيعتمده أو يرفضه، وينزّل الفيديوهات المعتمدة مع النص المرافق والوسوم.",
          "وحين تتوفّر خمس دقائق، تقترح بطاقة التصوير ما يمكن قوله، ويقسّم DentVideo التسجيل إلى مقاطع قصيرة مع النص وشعار العيادة.",
        ],
      },
    ],
    faq: [
      { q: "ما هو DentVideo؟", a: "تطبيق ويب لعيادات الأسنان يُعدّ فيديوهات توعوية قصيرة للمرضى بتعليق صوتي ونص على الشاشة في عشر لغات، ويراجع كلاً منها للدقة السريرية وضوابط الإعلان الصحي قبل أن يعتمده طبيب الأسنان." },
      { q: "من يطوّر DentVideo؟", a: "Bulsu Labs." },
      { q: "هل ينشر DentVideo تلقائياً على إنستغرام أو تيك توك؟", a: "لا. تعتمد العيادة كل فيديو، وتنزّله مع نص مرافق ووسوم جاهزة، وتنشره بنفسها." },
      { q: "هل مراجعة DentVideo استشارة قانونية؟", a: "لا. هي ترصد الادعاءات المقيّدة عادةً وتعلّم ما يستحق نظرة ثانية، لكن الضوابط تختلف من بلد إلى آخر وتتغيّر، وتبقى العيادة مسؤولة عمّا تنشره." },
    ],
  },
  pl: {
    meta: {
      title: "O DentVideo: czym jest, dla kogo i jak działa kontrola",
      description:
        "DentVideo to aplikacja internetowa Bulsu Labs, która tworzy dla gabinetów stomatologicznych krótkie filmy edukacyjne z lektorem w dziesięciu językach i sprawdza każdy pod kątem poprawności klinicznej i zasad reklamy medycznej, zanim zatwierdzi go lekarz dentysta.",
    },
    h1: "O DentVideo",
    definition:
      "DentVideo to aplikacja internetowa dla gabinetów stomatologicznych, która tworzy krótkie filmy edukacyjne dla pacjentów, z lektorem, napisami i w kolorach gabinetu, i sprawdza każdy scenariusz pod kątem poprawności klinicznej i zasad reklamy medycznej, zanim zatwierdzi go lekarz dentysta. Tworzy ją Bulsu Labs.",
    facts: [
      { label: "Czym jest", value: "Aplikacja internetowa (oprogramowanie w modelu SaaS), która tworzy krótkie filmy edukacyjne do mediów społecznościowych, na stronę internetową i do poczekalni gabinetów stomatologicznych." },
      { label: "Dla kogo", value: "Dla lekarzy dentystów i gabinetów, które chcą regularnie publikować bez cotygodniowego nagrywania i bez agencji." },
      { label: "Języki", value: "Polski, angielski, niemiecki, hiszpański, francuski, włoski, portugalski, turecki, japoński i arabski, z formą „Państwo” albo „ty”." },
      { label: "Co otrzymuje gabinet", value: "Pięć krótkich filmów edukacyjnych tygodniowo, odpowiadających na prawdziwe pytania pacjentów, z lektorem i napisami, z logo i w kolorach gabinetu, z gotowym opisem i hashtagami. Lekarz dentysta może też nagrać pięć minut z własnym udziałem i otrzymać krótkie klipy z napisami, mówione własnym głosem." },
      { label: "Jak działa kontrola", value: "Oprogramowanie sprawdza każdy scenariusz i opis dwukrotnie: raz pod kątem twierdzeń reklamowych, które zwykle są ograniczane (gwarancje, „bezbolesny”, „trwały”, superlatywy, ceny, rabaty, obietnice przed i po, opinie pacjentów), i raz przez recenzenta w roli lekarza dentysty ogólnego, który porównuje treść z aktualną wiedzą kliniczną. To, co nie przechodzi kontroli, jest pisane od nowa albo nie powstaje. Słowa samego lekarza nigdy nie są zmieniane; klip, który warto przejrzeć ponownie, zostaje oznaczony wraz z powodem." },
      { label: "Kto decyduje", value: "Lekarz dentysta. Nic nie zostaje opublikowane bez akceptacji gabinetu, a DentVideo samo niczego nie publikuje w mediach społecznościowych: gabinet pobiera zatwierdzone filmy i publikuje je sam." },
      { label: "Charakter prawny kontroli", value: "Staranny filtr, a nie porada prawna. Za publikowane treści odpowiada gabinet, który powinien sprawdzić obowiązujące go zasady." },
      { label: "Cena", value: "Płatne plany od 39 $ miesięcznie: Starter 39 $, Practice 69 $ (lub 690 $ rocznie), Group 219 $ miesięcznie. Rozliczenie miesięczne, bez minimalnego okresu umowy. Przed płatnością gabinet widzi podgląd na żywo własnych filmów z logo i kolorami; pierwszy tydzień filmów powstaje zaraz po płatności. Oferta założycielska: Practice za 39 $ miesięcznie przez 12 miesięcy dla pierwszych 100 gabinetów." },
      { label: "Wydawca", value: "Bulsu Labs (bulsulabs.com)." },
      { label: "Strona", value: "dentvideo.com: po polsku, angielsku, niemiecku, hiszpańsku, turecku, francusku, japońsku i arabsku." },
    ],
    sections: [
      {
        heading: "Dlaczego powstało DentVideo",
        paragraphs: [
          "Pacjenci chętnie wybierają dentystę, którego mają wrażenie, że już znają, a krótkie filmy to jeden z najprostszych sposobów, by do tego doprowadzić. Jednak cotygodniowe publikowanie wymaga czasu, a informowanie o usługach medycznych podlega zasadom: jedno „bezbolesny”, rabat czy obietnica przed i po mogą je naruszać. Ogólne narzędzia do wideo nie znają tej różnicy.",
          "DentVideo ułatwia regularną część pracy i uwidacznia część ryzykowną: filmy powstają za Państwa, są sprawdzane tak, jak sprawdziłby je uważny kolega po fachu, a ostatnie słowo należy do lekarza dentysty.",
        ],
      },
      {
        heading: "Jak wygląda tydzień",
        paragraphs: [
          "Gabinet opisuje się jeden raz: język, zabiegi, ton, kolory i logo. Filmy dotyczą wyłącznie zabiegów, które gabinet wykonuje. Co tydzień DentVideo planuje pięć tematów na podstawie tych zabiegów i pytań pacjentów, pisze filmy, nagrywa je z lektorem, dodaje napisy i je sprawdza. Lekarz dentysta ogląda każdy, zatwierdza go lub odrzuca i pobiera zatwierdzone filmy z opisem i hashtagami.",
          "Gdy znajdzie się pięć minut, karta do nagrania podpowiada, co powiedzieć; DentVideo dzieli nagranie na krótkie klipy z napisami i logo gabinetu.",
        ],
      },
    ],
    faq: [
      { q: "Czym jest DentVideo?", a: "Aplikacją internetową dla gabinetów stomatologicznych, która tworzy krótkie filmy edukacyjne z lektorem i napisami w dziesięciu językach i sprawdza każdy pod kątem poprawności klinicznej i zasad reklamy medycznej, zanim zatwierdzi go lekarz dentysta." },
      { q: "Kto tworzy DentVideo?", a: "Bulsu Labs." },
      { q: "Czy DentVideo publikuje automatycznie na Instagramie lub TikToku?", a: "Nie. Gabinet zatwierdza każdy film, pobiera go z gotowym opisem i hashtagami i publikuje sam." },
      { q: "Czy kontrola DentVideo jest poradą prawną?", a: "Nie. Wychwytuje twierdzenia, które zwykle są ograniczane, i oznacza to, co warto przejrzeć ponownie, ale zasady różnią się między krajami i się zmieniają; za publikowane treści odpowiada gabinet." },
    ],
  },
};
