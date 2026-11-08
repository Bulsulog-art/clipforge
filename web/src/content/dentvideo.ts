/**
 * DentVideo's public content, in every language, in one place.
 *
 * The landings (/dentvideo, /dentvideo/de, …), the guides, the structured
 * data, the sitemap and /dentvideo/llms.txt all read from here, so a fact
 * changes once and every page and every answer engine sees the same thing.
 *
 * Rules for anything written here:
 * - describe only what the product does today;
 * - no prices (none are set yet — the first week is free), no statistics,
 *   no testimonials;
 * - advertising-rule content stays general and hedged and names only
 *   regulations that exist; the clinic is told to check its national rules.
 */

export const LOCALES = ["en", "de", "es", "tr", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const LANDING_PATH: Record<Locale, string> = {
  en: "/dentvideo",
  de: "/dentvideo/de",
  es: "/dentvideo/es",
  tr: "/dentvideo/tr",
  fr: "/dentvideo/fr",
};

/** BCP-47 tags for hreflang. */
export const HREFLANG: Record<Locale, string> = { en: "en", de: "de", es: "es", tr: "tr", fr: "fr" };

export type Faq = { q: string; a: string };

/** Real output for a demo clinic (worker/src/dental/cli.ts --render), unedited; files in public/dentvideo/samples. */
export const SAMPLE_VIDEOS = [
  { slug: "whitening-myths-debunked", name: "Whitening thins your enamel? Not quite.", seconds: 27 },
  { slug: "caring-for-clear-aligners", name: "That funky smell from your aligners? Avoid it this way.", seconds: 21 },
  { slug: "proper-brushing-technique", name: "Missing spots when you brush? Here's a clue.", seconds: 20 },
] as const;

export type LandingContent = {
  meta: { title: string; description: string; ogDescription: string };
  hero: { eyebrow: string; h1: string; lead: string; cta: string; note: string };
  mock: { hook: string; caption: string; label: string };
  problem: { title: string; text: string }[];
  how: { heading: string; steps: { title: string; text: string }[] };
  /** Real output for a demo clinic, shown as-is. */
  samples: { heading: string; text: string; note: string };
  checks: { heading: string; items: { title: string; text: string }[] };
  pricing: { heading: string; text: string; cta: string };
  guidesHeading: string;
  faqHeading: string;
  faq: Faq[];
};

export const LANDING: Record<Locale, LandingContent> = {
  en: {
    meta: {
      title: "DentVideo — patient-education videos for dental clinics",
      description:
        "Turn a five-minute phone recording into a week of captioned short videos for your clinic — reviewed for clinical accuracy and health-advertising rules, approved by you. English, German, Spanish, French, Italian, Portuguese, Turkish.",
      ogDescription: "Your dentist's own voice, cut into captioned short videos. Checked before you see them. Approved by you.",
    },
    hero: {
      eyebrow: "For dental clinics",
      h1: "Your patients' questions, answered by you — every week.",
      lead: "DentVideo turns five minutes of you talking into a week of captioned short videos for Instagram, TikTok and YouTube — and writes and narrates educational videos when there is no time to film. Each one is checked for clinical accuracy and health-advertising rules before you see it. Nothing goes out until you approve it.",
      cta: "Start your free first week",
      note: "No card. Seven languages.",
    },
    mock: { hook: "Does whitening damage enamel?", caption: "When it is supervised, usually not.", label: "Ready for your review" },
    problem: [
      { title: "The problem", text: "Patients choose a dentist they feel they know. Posting every week takes hours you do not have, and agencies cost hundreds a month." },
      { title: "The risk", text: "One “painless, guaranteed” or a discount in a post can break health-advertising rules. Generic tools do not know the difference." },
      { title: "What DentVideo does", text: "Makes the videos, checks them like a careful colleague would, and leaves the final word to you." },
    ],
    how: {
      heading: "How it works",
      steps: [
        { title: "Tell us about your clinic", text: "Language, services, tone, colours and logo. Two minutes, once. Videos are only ever about the services you offer." },
        { title: "Get the week's videos", text: "Five short educational videos answering real patient questions — narrated, captioned, in your colours, each with a filming card if you would rather say it yourself." },
        { title: "Approve and post", text: "Watch, approve or decline. Download approved videos with a ready caption and hashtags. Anything that needs your eye is marked, with the reason." },
      ],
    },
    samples: { heading: "A sample week", text: "Three videos DentVideo made for a demo clinic, exactly as they came out — narrated, captioned and checked. Yours are made in your language, colours and tone.", note: "Demo clinic. The sample videos are in English." },
    checks: {
      heading: "Checked twice before you see it",
      items: [
        { title: "Advertising rules", text: "No guarantees, “painless”, “permanent”, “best”, prices, discounts, before-and-after promises or testimonials — caught in seven languages." },
        { title: "Clinical accuracy", text: "A reviewer acting as a general dentist checks every statement against mainstream guidance — and that advice belongs to the right procedure." },
        { title: "Sound and picture", text: "Every video is measured before delivery: narration present and audible, no silent gaps or black frames, the right size for each platform." },
      ],
    },
    pricing: {
      heading: "Start with a free week",
      text: "Your first week of videos is free, with no card. Founding clinics get introductory pricing when plans open.",
      cta: "Start your free first week",
    },
    guidesHeading: "Guides",
    faqHeading: "Questions",
    faq: [
      { q: "Do I have to film anything?", a: "No, but it helps. Each week you get educational videos made for you — written, narrated and captioned in your language. If you also record five minutes of yourself talking through one of our filming cards, we turn it into short clips of you, which patients trust most." },
      { q: "How do you keep the content accurate and within advertising rules?", a: "Every script and caption is checked twice: once against health-advertising rules (no guarantees, “painless”, “best”, prices, discounts, before-and-after promises or testimonials) and once by a clinical-accuracy reviewer acting as a general dentist. Anything that fails is rewritten or not made. You still approve every video before it is posted." },
      { q: "Will you change what I say in my own recordings?", a: "Never. If something you said could be read as a promise or is worth a second look, the clip is marked for your attention with the reason and a suggested wording — the decision stays with you." },
      { q: "Which languages are supported?", a: "English, German, Spanish, French, Italian, Portuguese and Turkish, with formal or informal address as your clinic prefers." },
      { q: "Do you post to Instagram or TikTok for me?", a: "Not yet. You download approved videos with their caption and hashtags and post them yourself — which also means nothing ever goes out without you." },
    ],
  },

  de: {
    meta: {
      title: "DentVideo — Patientenaufklärungs-Videos für Zahnarztpraxen",
      description:
        "Aus fünf Minuten Handyaufnahme wird eine Woche untertitelter Kurzvideos für Ihre Praxis — geprüft auf fachliche Richtigkeit und Werberecht im Gesundheitswesen, freigegeben von Ihnen. Auf Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch und Türkisch.",
      ogDescription: "Ihre eigene Stimme als untertitelte Kurzvideos. Geprüft, bevor Sie sie sehen. Freigegeben von Ihnen.",
    },
    hero: {
      eyebrow: "Für Zahnarztpraxen",
      h1: "Die Fragen Ihrer Patienten — jede Woche von Ihnen beantwortet.",
      lead: "DentVideo macht aus fünf Minuten, in denen Sie sprechen, eine Woche untertitelter Kurzvideos für Instagram, TikTok und YouTube — und schreibt und vertont Aufklärungsvideos, wenn keine Zeit zum Filmen bleibt. Jedes Video wird auf fachliche Richtigkeit und Werberecht geprüft, bevor Sie es sehen. Nichts wird veröffentlicht, bevor Sie es freigeben.",
      cta: "Erste Woche kostenlos starten",
      note: "Keine Kreditkarte. Sieben Sprachen.",
    },
    mock: { hook: "Schadet Bleaching dem Zahnschmelz?", caption: "Unter zahnärztlicher Aufsicht in der Regel nicht.", label: "Bereit zur Prüfung" },
    problem: [
      { title: "Das Problem", text: "Patienten wählen eine Praxis, die sie zu kennen glauben. Jede Woche zu posten kostet Stunden, die Sie nicht haben, und Agenturen kosten Hunderte im Monat." },
      { title: "Das Risiko", text: "Ein „schmerzfrei, garantiert“ oder ein Rabatt in einem Beitrag kann gegen das Heilmittelwerbegesetz verstoßen. Allgemeine Tools erkennen den Unterschied nicht." },
      { title: "Was DentVideo macht", text: "Erstellt die Videos, prüft sie wie eine sorgfältige Kollegin und überlässt Ihnen das letzte Wort." },
    ],
    how: {
      heading: "So funktioniert es",
      steps: [
        { title: "Praxis beschreiben", text: "Sprache, Leistungen, Tonalität, Farben und Logo. Zwei Minuten, einmalig. Die Videos behandeln nur Leistungen, die Sie anbieten." },
        { title: "Videos der Woche erhalten", text: "Fünf kurze Aufklärungsvideos zu echten Patientenfragen — vertont, untertitelt, in Ihren Farben, jeweils mit einer Drehkarte, falls Sie es lieber selbst sagen." },
        { title: "Freigeben und posten", text: "Ansehen, freigeben oder ablehnen. Freigegebene Videos mit fertigem Text und Hashtags herunterladen. Was Ihren Blick braucht, ist markiert — mit Begründung." },
      ],
    },
    samples: { heading: "Eine Beispielwoche", text: "Drei Videos, die DentVideo für eine Demo-Praxis erstellt hat – genau so, wie sie herauskamen: vertont, untertitelt und geprüft. Ihre Videos entstehen in Ihrer Sprache, Ihren Farben und Ihrem Ton.", note: "Demo-Praxis. Die Beispielvideos sind auf Englisch." },
    checks: {
      heading: "Zweimal geprüft, bevor Sie es sehen",
      items: [
        { title: "Werberecht", text: "Keine Garantien, kein „schmerzfrei“, „dauerhaft“, „die beste Praxis“, keine Preise, Rabatte, Vorher-Nachher-Versprechen oder Patientenstimmen — erkannt in sieben Sprachen." },
        { title: "Fachliche Richtigkeit", text: "Ein Prüfer in der Rolle eines Allgemeinzahnarztes gleicht jede Aussage mit anerkannten Empfehlungen ab — und prüft, ob ein Rat zur richtigen Behandlung gehört." },
        { title: "Ton und Bild", text: "Jedes Video wird vor der Auslieferung vermessen: Sprecher hörbar, keine stillen Lücken oder schwarzen Bilder, das richtige Format für jede Plattform." },
      ],
    },
    pricing: {
      heading: "Mit einer kostenlosen Woche beginnen",
      text: "Ihre erste Woche ist kostenlos, ohne Kreditkarte. Gründungspraxen erhalten Einführungspreise, sobald die Tarife starten.",
      cta: "Erste Woche kostenlos starten",
    },
    guidesHeading: "Ratgeber",
    faqHeading: "Häufige Fragen",
    faq: [
      { q: "Muss ich selbst filmen?", a: "Nein, aber es hilft. Jede Woche erhalten Sie Aufklärungsvideos, die für Sie geschrieben, vertont und in Ihrer Sprache untertitelt werden. Wenn Sie zusätzlich fünf Minuten zu einer unserer Drehkarten sprechen, schneiden wir daraus kurze Clips mit Ihnen — denen vertrauen Patienten am meisten." },
      { q: "Wie bleiben die Inhalte richtig und werberechtlich sauber?", a: "Jedes Skript und jeder Begleittext wird zweimal geprüft: einmal auf Werberegeln im Gesundheitswesen (keine Garantien, kein „schmerzfrei“, keine Superlative, Preise, Rabatte, Vorher-Nachher-Versprechen oder Patientenstimmen) und einmal von einem Prüfer in der Rolle eines Allgemeinzahnarztes. Was nicht besteht, wird umgeschrieben oder nicht erstellt. Freigeben müssen trotzdem Sie." },
      { q: "Verändern Sie, was ich in meinen Aufnahmen sage?", a: "Nie. Wenn etwas als Versprechen verstanden werden könnte oder einen zweiten Blick wert ist, wird der Clip für Sie markiert — mit Begründung und einem Formulierungsvorschlag. Die Entscheidung bleibt bei Ihnen." },
      { q: "Welche Sprachen gibt es?", a: "Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch und Türkisch — mit „Sie“ oder „du“, wie Ihre Praxis es möchte." },
      { q: "Posten Sie für mich auf Instagram oder TikTok?", a: "Noch nicht. Sie laden freigegebene Videos mit Text und Hashtags herunter und posten selbst — so geht auch nie etwas ohne Sie hinaus." },
    ],
  },

  es: {
    meta: {
      title: "DentVideo — vídeos educativos para clínicas dentales",
      description:
        "Convierte cinco minutos grabados con el móvil en una semana de vídeos cortos subtitulados para tu clínica, revisados en precisión clínica y normas de publicidad sanitaria, y aprobados por ti. En español, inglés, alemán, francés, italiano, portugués y turco.",
      ogDescription: "Tu propia voz, convertida en vídeos cortos subtitulados. Revisados antes de que los veas. Aprobados por ti.",
    },
    hero: {
      eyebrow: "Para clínicas dentales",
      h1: "Las preguntas de tus pacientes, respondidas por ti cada semana.",
      lead: "DentVideo convierte cinco minutos de ti hablando en una semana de vídeos cortos subtitulados para Instagram, TikTok y YouTube, y escribe y pone voz a vídeos educativos cuando no hay tiempo para grabar. Cada uno se revisa en precisión clínica y normas de publicidad sanitaria antes de que lo veas. Nada se publica hasta que tú lo apruebas.",
      cta: "Empieza tu primera semana gratis",
      note: "Sin tarjeta. Siete idiomas.",
    },
    mock: { hook: "¿El blanqueamiento daña el esmalte?", caption: "Bajo supervisión, normalmente no.", label: "Listo para revisar" },
    problem: [
      { title: "El problema", text: "Los pacientes eligen al dentista que sienten que conocen. Publicar cada semana lleva horas que no tienes, y una agencia cuesta cientos al mes." },
      { title: "El riesgo", text: "Un “sin dolor, garantizado” o un descuento en una publicación puede incumplir las normas de publicidad sanitaria. Las herramientas genéricas no notan la diferencia." },
      { title: "Lo que hace DentVideo", text: "Hace los vídeos, los revisa como lo haría un colega cuidadoso y te deja la última palabra." },
    ],
    how: {
      heading: "Cómo funciona",
      steps: [
        { title: "Cuéntanos sobre tu clínica", text: "Idioma, tratamientos, tono, colores y logo. Dos minutos, una sola vez. Los vídeos solo tratan los servicios que ofreces." },
        { title: "Recibe los vídeos de la semana", text: "Cinco vídeos educativos cortos que responden preguntas reales de pacientes, con voz, subtítulos y tus colores, cada uno con una tarjeta de grabación por si prefieres decirlo tú." },
        { title: "Aprueba y publica", text: "Míralos, apruébalos o recházalos. Descarga los aprobados con el texto y los hashtags listos. Lo que necesita tu atención aparece marcado, con el motivo." },
      ],
    },
    samples: { heading: "Una semana de ejemplo", text: "Tres vídeos que DentVideo hizo para una clínica de demostración, tal como salieron: narrados, subtitulados y revisados. Los tuyos se hacen en tu idioma, con tus colores y tu tono.", note: "Clínica de demostración. Los vídeos de ejemplo están en inglés." },
    checks: {
      heading: "Revisado dos veces antes de que lo veas",
      items: [
        { title: "Normas de publicidad", text: "Sin garantías, “sin dolor”, “permanente”, “la mejor clínica”, precios, descuentos, promesas de antes y después ni testimonios, detectados en siete idiomas." },
        { title: "Precisión clínica", text: "Un revisor con el criterio de un dentista general contrasta cada afirmación con las recomendaciones aceptadas y comprueba que cada consejo corresponde al tratamiento correcto." },
        { title: "Sonido e imagen", text: "Cada vídeo se mide antes de entregarse: voz presente y audible, sin silencios largos ni fotogramas negros, en el formato correcto para cada plataforma." },
      ],
    },
    pricing: {
      heading: "Empieza con una semana gratis",
      text: "Tu primera semana de vídeos es gratis y sin tarjeta. Las clínicas fundadoras tendrán un precio de lanzamiento cuando se abran los planes.",
      cta: "Empieza tu primera semana gratis",
    },
    guidesHeading: "Guías",
    faqHeading: "Preguntas frecuentes",
    faq: [
      { q: "¿Tengo que grabar algo?", a: "No, aunque ayuda. Cada semana recibes vídeos educativos hechos para ti: escritos, con voz y subtitulados en tu idioma. Si además grabas cinco minutos hablando sobre una de nuestras tarjetas, lo convertimos en clips cortos contigo, que es lo que más confianza genera en los pacientes." },
      { q: "¿Cómo se mantiene el contenido correcto y dentro de las normas de publicidad?", a: "Cada guion y cada texto se revisan dos veces: una frente a las normas de publicidad sanitaria (sin garantías, “sin dolor”, superlativos, precios, descuentos, promesas de antes y después ni testimonios) y otra por un revisor con el criterio de un dentista general. Lo que no pasa se reescribe o no se hace. Aun así, tú apruebas cada vídeo antes de publicarlo." },
      { q: "¿Cambiaréis lo que digo en mis grabaciones?", a: "Nunca. Si algo de lo que dices puede entenderse como una promesa o merece una segunda mirada, el clip se marca para ti con el motivo y una redacción sugerida. La decisión es tuya." },
      { q: "¿Qué idiomas hay?", a: "Español, inglés, alemán, francés, italiano, portugués y turco, con trato de tú o de usted, como prefiera tu clínica." },
      { q: "¿Publicáis en Instagram o TikTok por mí?", a: "Todavía no. Descargas los vídeos aprobados con su texto y hashtags y los publicas tú, así nunca sale nada sin ti." },
    ],
  },

  tr: {
    meta: {
      title: "DentVideo — diş klinikleri için hasta bilgilendirme videoları",
      description:
        "Telefonla çektiğiniz beş dakikalık kaydı kliniğiniz için bir haftalık altyazılı kısa videoya dönüştürün. Klinik doğruluk ve sağlık reklamı kurallarına göre denetlenir, siz onaylamadan yayınlanmaz. Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca, Portekizce.",
      ogDescription: "Kendi sesinizle, altyazılı kısa videolar. Siz görmeden önce denetlenir. Siz onaylarsınız.",
    },
    hero: {
      eyebrow: "Diş klinikleri için",
      h1: "Hastalarınızın soruları, her hafta sizin ağzınızdan.",
      lead: "DentVideo, beş dakikalık konuşmanızı Instagram, TikTok ve YouTube için bir haftalık altyazılı kısa videoya dönüştürür; çekim için vaktiniz olmadığında da bilgilendirme videolarını yazar ve seslendirir. Her video, siz görmeden önce klinik doğruluk ve sağlık reklamı kurallarına göre denetlenir. Siz onaylamadan hiçbir şey yayınlanmaz.",
      cta: "İlk haftanızı ücretsiz başlatın",
      note: "Kart gerekmez. Yedi dil.",
    },
    mock: { hook: "Diş beyazlatma mineye zarar verir mi?", caption: "Hekim kontrolünde genellikle hayır.", label: "İncelemenize hazır" },
    problem: [
      { title: "Sorun", text: "Hastalar tanıdıklarını hissettikleri hekimi seçer. Her hafta paylaşım yapmak, ayıramadığınız saatler demek; ajanslar ise aylık yüzlerce lira tutuyor." },
      { title: "Risk", text: "Bir paylaşımdaki “acısız, garantili” ifadesi ya da bir indirim, sağlık hizmetlerinde tanıtım kurallarına aykırı olabilir. Genel araçlar bu farkı bilmez." },
      { title: "DentVideo ne yapar", text: "Videoları hazırlar, dikkatli bir meslektaş gibi denetler ve son sözü size bırakır." },
    ],
    how: {
      heading: "Nasıl çalışır",
      steps: [
        { title: "Kliniğinizi tanıtın", text: "Dil, tedaviler, üslup, renkler ve logo. Bir kez, iki dakika. Videolar yalnızca sunduğunuz tedaviler hakkında olur." },
        { title: "Haftanın videolarını alın", text: "Gerçek hasta sorularını yanıtlayan beş kısa bilgilendirme videosu: seslendirilmiş, altyazılı, sizin renklerinizde. Kendiniz anlatmak isterseniz her biri için bir çekim kartı." },
        { title: "Onaylayın ve paylaşın", text: "İzleyin, onaylayın ya da reddedin. Onayladığınız videoları hazır açıklama ve etiketlerle indirin. Dikkatinizi gerektiren her şey gerekçesiyle işaretlenir." },
      ],
    },
    samples: { heading: "Örnek bir hafta", text: "DentVideo'nun bir demo klinik için hazırladığı üç video, çıktığı haliyle: seslendirilmiş, altyazılı ve kontrol edilmiş. Sizinkiler kendi dilinizde, renklerinizde ve üslubunuzda hazırlanır.", note: "Demo klinik. Örnek videolar İngilizcedir." },
    checks: {
      heading: "Siz görmeden önce iki kez denetlenir",
      items: [
        { title: "Reklam kuralları", text: "Garanti, “acısız”, “kalıcı”, “en iyi klinik”, fiyat, indirim, öncesi-sonrası vaadi ve hasta yorumu yok; yedi dilde yakalanır." },
        { title: "Klinik doğruluk", text: "Genel diş hekimi gözüyle çalışan bir denetçi her ifadeyi kabul görmüş önerilerle karşılaştırır ve her tavsiyenin doğru tedaviye ait olduğunu kontrol eder." },
        { title: "Ses ve görüntü", text: "Her video teslimden önce ölçülür: seslendirme var ve duyuluyor, uzun sessizlik ya da siyah kare yok, her platform için doğru boyutta." },
      ],
    },
    pricing: {
      heading: "Ücretsiz bir haftayla başlayın",
      text: "İlk haftanızın videoları ücretsizdir, kart gerekmez. Kurucu klinikler, paketler açıldığında tanıtım fiyatından yararlanır.",
      cta: "İlk haftanızı ücretsiz başlatın",
    },
    guidesHeading: "Rehberler",
    faqHeading: "Sık sorulan sorular",
    faq: [
      { q: "Çekim yapmam gerekiyor mu?", a: "Hayır, ama faydası olur. Her hafta sizin için yazılmış, seslendirilmiş ve kendi dilinizde altyazılanmış bilgilendirme videoları alırsınız. Ayrıca çekim kartlarımızdan biriyle beş dakika konuşursanız, bunu hastaların en çok güvendiği şeye, yani sizin olduğunuz kısa kliplere dönüştürürüz." },
      { q: "İçeriğin doğru ve reklam kurallarına uygun kalmasını nasıl sağlıyorsunuz?", a: "Her senaryo ve açıklama iki kez denetlenir: bir kez sağlık reklamı kurallarına göre (garanti, “acısız”, üstünlük iddiası, fiyat, indirim, öncesi-sonrası vaadi ya da hasta yorumu olmaması) ve bir kez genel diş hekimi gözüyle çalışan bir klinik doğruluk denetçisi tarafından. Geçemeyen içerik yeniden yazılır ya da hiç üretilmez. Yine de her videoyu yayından önce siz onaylarsınız." },
      { q: "Kendi kayıtlarımda söylediklerimi değiştiriyor musunuz?", a: "Asla. Söylediğiniz bir şey vaat gibi anlaşılabiliyorsa ya da ikinci kez bakmaya değerse, klip gerekçesi ve önerilen bir ifadeyle sizin için işaretlenir. Karar her zaman sizindir." },
      { q: "Hangi diller destekleniyor?", a: "Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca ve Portekizce; kliniğinizin tercihine göre “siz” ya da “sen” hitabıyla." },
      { q: "Instagram ya da TikTok'ta benim yerime paylaşıyor musunuz?", a: "Henüz değil. Onayladığınız videoları açıklama ve etiketleriyle indirip kendiniz paylaşırsınız; bu da hiçbir şeyin sizsiz yayınlanmaması demektir." },
    ],
  },

  fr: {
    meta: {
      title: "DentVideo — vidéos d'information patient pour cabinets dentaires",
      description:
        "Transformez cinq minutes filmées au téléphone en une semaine de vidéos courtes sous-titrées pour votre cabinet, vérifiées pour l'exactitude clinique et les règles de communication en santé, validées par vous. En français, anglais, allemand, espagnol, italien, portugais et turc.",
      ogDescription: "Votre propre voix, en vidéos courtes sous-titrées. Vérifiées avant que vous les voyiez. Validées par vous.",
    },
    hero: {
      eyebrow: "Pour les cabinets dentaires",
      h1: "Les questions de vos patients, avec vos réponses, chaque semaine.",
      lead: "DentVideo transforme cinq minutes de vous à l'écran en une semaine de vidéos courtes sous-titrées pour Instagram, TikTok et YouTube, et rédige et met en voix des vidéos d'information quand vous n'avez pas le temps de filmer. Chaque vidéo est vérifiée pour l'exactitude clinique et les règles de communication en santé avant que vous la voyiez. Rien n'est publié sans votre accord.",
      cta: "Commencer la première semaine gratuite",
      note: "Sans carte bancaire. Sept langues.",
    },
    mock: { hook: "Le blanchiment abîme-t-il l'émail ?", caption: "Encadré par un dentiste, en général non.", label: "Prête pour validation" },
    problem: [
      { title: "Le problème", text: "Les patients choisissent un dentiste qu'ils ont l'impression de connaître. Publier chaque semaine demande des heures que vous n'avez pas, et une agence coûte des centaines d'euros par mois." },
      { title: "Le risque", text: "Un « sans douleur, garanti » ou une réduction dans une publication peut enfreindre les règles de communication en santé. Les outils génériques ne font pas la différence." },
      { title: "Ce que fait DentVideo", text: "Il réalise les vidéos, les vérifie comme le ferait un confrère attentif et vous laisse le dernier mot." },
    ],
    how: {
      heading: "Comment ça marche",
      steps: [
        { title: "Présentez votre cabinet", text: "Langue, soins, ton, couleurs et logo. Deux minutes, une seule fois. Les vidéos ne parlent que des soins que vous proposez." },
        { title: "Recevez les vidéos de la semaine", text: "Cinq vidéos d'information courtes qui répondent à de vraies questions de patients, en voix off, sous-titrées, à vos couleurs, chacune avec une fiche de tournage si vous préférez le dire vous-même." },
        { title: "Validez et publiez", text: "Regardez, validez ou refusez. Téléchargez les vidéos validées avec leur texte et leurs hashtags. Ce qui demande votre attention est signalé, avec la raison." },
      ],
    },
    samples: { heading: "Une semaine d'exemple", text: "Trois vidéos réalisées par DentVideo pour un cabinet de démonstration, telles qu'elles sont sorties : commentées, sous-titrées et vérifiées. Les vôtres sont faites dans votre langue, vos couleurs et votre ton.", note: "Cabinet de démonstration. Les vidéos d'exemple sont en anglais." },
    checks: {
      heading: "Vérifié deux fois avant que vous le voyiez",
      items: [
        { title: "Règles de communication", text: "Pas de garantie, de « sans douleur », de « définitif », de « meilleur cabinet », de prix, de réduction, de promesse avant-après ni de témoignage — repérés dans sept langues." },
        { title: "Exactitude clinique", text: "Un relecteur dans le rôle d'un omnipraticien confronte chaque affirmation aux recommandations reconnues et vérifie que chaque conseil correspond au bon soin." },
        { title: "Son et image", text: "Chaque vidéo est mesurée avant livraison : voix présente et audible, pas de silences ni d'images noires, le bon format pour chaque plateforme." },
      ],
    },
    pricing: {
      heading: "Commencez par une semaine gratuite",
      text: "Votre première semaine de vidéos est gratuite, sans carte bancaire. Les cabinets fondateurs bénéficieront d'un tarif de lancement à l'ouverture des offres.",
      cta: "Commencer la première semaine gratuite",
    },
    guidesHeading: "Guides",
    faqHeading: "Questions fréquentes",
    faq: [
      { q: "Dois-je filmer quelque chose ?", a: "Non, mais cela aide. Chaque semaine, vous recevez des vidéos d'information réalisées pour vous : rédigées, mises en voix et sous-titrées dans votre langue. Si vous enregistrez aussi cinq minutes à partir d'une de nos fiches, nous en tirons de courts extraits où l'on vous voit, ce qui inspire le plus confiance aux patients." },
      { q: "Comment le contenu reste-t-il exact et conforme aux règles de communication ?", a: "Chaque script et chaque texte sont vérifiés deux fois : une fois au regard des règles de communication en santé (pas de garantie, de « sans douleur », de superlatif, de prix, de réduction, de promesse avant-après ni de témoignage) et une fois par un relecteur dans le rôle d'un omnipraticien. Ce qui échoue est réécrit ou n'est pas produit. Vous validez malgré tout chaque vidéo avant publication." },
      { q: "Modifiez-vous ce que je dis dans mes enregistrements ?", a: "Jamais. Si un propos peut être compris comme une promesse ou mérite d'être revu, l'extrait vous est signalé avec la raison et une formulation suggérée. La décision vous appartient." },
      { q: "Quelles langues sont disponibles ?", a: "Français, anglais, allemand, espagnol, italien, portugais et turc, avec vouvoiement ou tutoiement selon votre cabinet." },
      { q: "Publiez-vous sur Instagram ou TikTok à ma place ?", a: "Pas encore. Vous téléchargez les vidéos validées avec leur texte et leurs hashtags et vous les publiez vous-même : rien ne part donc jamais sans vous." },
    ],
  },
};

export type GuideSection = { heading: string; paragraphs: string[] };
export type Guide = {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
  faq: Faq[];
};

export const GUIDES: Guide[] = [
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

export function guidePath(g: Pick<Guide, "slug">): string {
  return `/dentvideo/guides/${g.slug}`;
}

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesFor(locale: Locale): Guide[] {
  return GUIDES.filter((g) => g.locale === locale);
}
