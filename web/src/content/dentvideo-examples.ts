import type { Locale } from "./dentvideo-locales";
import { SAMPLE_VIDEOS, sampleSrc, type SampleVideo } from "./dentvideo-samples";
import { EXAMPLES_PATH } from "./guides/ui";
export { EXAMPLES_PATH };

/**
 * The examples showcase: the sample videos (content/dentvideo-samples.ts) on
 * pages of their own — a hub per language (dentvideo.com/examples,
 * /de/examples …) and one page per video (/examples/<slug>,
 * /de/examples/<slug> …).
 *
 * The videos are shown, not given away: watch-only players, no download
 * link, no embed code. They were made for fictional demo clinics and are not
 * licensed for reuse; a clinic gets its own videos by subscribing.
 *
 * `summary` says what the video covers; `onScreen` restates the text shown
 * on screen (read from the rendered videos, lightly abridged — e.g. a
 * closing "for best results" is left out, as the site's copy rules ask).
 * Neither is a word-for-word transcript of the narration, and the pages do
 * not call them one.
 *
 * Same rules as the guides: no prices, no promised results, no superlatives,
 * no testimonials, hedged health statements. Server-only (a test keeps it out
 * of the browser bundle).
 */

/**
 * Videos on the same subject in different languages share a topic key and
 * become each other's hreflang alternates. They are not word-for-word
 * translations, but each answers the same patient question.
 */
export type ExampleTopic = "whitening-enamel" | "aligner-care" | "scaling" | "cold-sensitivity" | "bleeding-gums" | "child-dental-anxiety";

export type ExampleVideo = {
  locale: Locale;
  /** The sample's slug (its files are public/dentvideo/samples/<locale>/<slug>.{mp4,jpg}). */
  slug: string;
  topic?: ExampleTopic;
  /** <title> without the brand (≤ 60 with " · DentVideo" when it fits). */
  seoTitle: string;
  /** Meta description, at most 155 characters. */
  seoDescription: string;
  h1: string;
  /** What the video covers, in two or three sentences. */
  summary: string;
  /** The text shown on screen, in order (lightly abridged). */
  onScreen: string[];
};

export type ExamplesUi = {
  /** Short label for the footer, breadcrumbs and links. */
  nav: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  /** Under every player: whose videos these are. */
  demoNote: string;
  /** Shown as an example, not for reuse. */
  viewOnly: string;
  /** Medical disclaimer, on every video page. */
  disclaimer: string;
  summaryHeading: string;
  onScreenHeading: string;
  /** "{s}": the length in seconds. */
  seconds: string;
  /** Link from a card to its page. */
  watch: string;
  moreHeading: string;
  otherLanguages: string;
  /** The landing's link under the sample week. */
  seeAll: string;
  cta: { title: string; text: string; button: string; secondary: string };
  faq: { q: string; a: string }[];
};

/** The day the examples pages last changed in substance (sitemap lastmod). */
export const EXAMPLES_UPDATED = "2026-11-15";

export const EXAMPLES_UI: Record<Locale, ExamplesUi> = {
  en: {
    nav: "Examples",
    seoTitle: "Dental patient education video examples",
    seoDescription: "Watch patient-education videos DentVideo made for demo dental clinics in eight languages: narrated, captioned and checked before anyone sees them.",
    h1: "Patient-education video examples for dental clinics",
    intro:
      "These are real videos DentVideo made for fictional demo clinics, three per language, unedited apart from compression for the web. Each one answers a question patients ask, with narration, captions and a short checklist. A clinic that subscribes gets five new videos like these every week, with its own name, logo, colours and language.",
    demoNote: "Made for a fictional demo clinic: the name, handle and colours on screen are the demo clinic's, not a real practice's.",
    viewOnly: "Shown here as an example of DentVideo's output. These videos are not offered for download or reuse.",
    disclaimer: "General information, not a substitute for a dental consultation.",
    summaryHeading: "What the video covers",
    onScreenHeading: "Text on screen",
    seconds: "{s} seconds",
    watch: "Watch",
    moreHeading: "More examples",
    otherLanguages: "The same topic in other languages",
    seeAll: "See all example videos",
    cta: {
      title: "Get videos like this every week with your clinic's name, logo and language",
      text: "DentVideo writes, narrates and captions five short patient-education videos a week about the treatments you offer, checks each one for advertising rules and clinical accuracy, and you approve every video before it is used.",
      button: "See your preview",
      secondary: "Plans and pricing",
    },
    faq: [
      {
        q: "Can my clinic use these example videos?",
        a: "No. They were made for fictional demo clinics and are shown here only as examples of what DentVideo makes. A subscribing clinic gets its own new videos every week, with its own name, logo, colours and language, about the treatments it offers.",
      },
      {
        q: "Were these videos edited by hand?",
        a: "No. They are shown as DentVideo produced them, apart from compression for the web. In normal use a dentist watches and approves every video before the clinic posts it.",
      },
      {
        q: "Do the videos show patients or AI avatars?",
        a: "No. The narration is a synthetic voice; the picture shows text, objects and the clinic's colours. There are no avatar faces, actors or patients.",
      },
      {
        q: "Which languages can the videos be in?",
        a: "English, German, Spanish, French, Italian, Portuguese, Turkish, Japanese, Arabic and Polish, with formal or informal address as the clinic prefers.",
      },
    ],
  },
  de: {
    nav: "Beispiele",
    seoTitle: "Patientenvideos für Zahnarztpraxen: Beispiele",
    seoDescription: "Sehen Sie Patientenvideos, die DentVideo für Demo-Praxen in acht Sprachen erstellt hat: vertont, untertitelt und geprüft, bevor jemand sie sieht.",
    h1: "Beispiele für Patientenvideos aus der Zahnarztpraxis",
    intro:
      "Das sind echte Videos, die DentVideo für fiktive Demo-Praxen erstellt hat, drei pro Sprache, unbearbeitet bis auf die Komprimierung fürs Web. Jedes beantwortet eine Frage, die Patienten stellen – mit Sprecherstimme, Untertiteln und einer kurzen Checkliste. Eine Praxis mit Abo erhält jede Woche fünf neue Videos dieser Art, mit eigenem Namen, Logo, eigenen Farben und in ihrer Sprache.",
    demoNote: "Für eine fiktive Demo-Praxis erstellt: Name, Kontoname und Farben im Video gehören zur Demo-Praxis, nicht zu einer echten Praxis.",
    viewOnly: "Hier als Beispiel für die Arbeit von DentVideo gezeigt. Diese Videos werden nicht zum Download oder zur Weiterverwendung angeboten.",
    disclaimer: "Allgemeine Information, kein Ersatz für eine zahnärztliche Beratung.",
    summaryHeading: "Worum es im Video geht",
    onScreenHeading: "Text im Video",
    seconds: "{s} Sekunden",
    watch: "Ansehen",
    moreHeading: "Weitere Beispiele",
    otherLanguages: "Dasselbe Thema in anderen Sprachen",
    seeAll: "Alle Beispielvideos ansehen",
    cta: {
      title: "Jede Woche solche Videos – mit Namen, Logo und Sprache Ihrer Praxis",
      text: "DentVideo schreibt, vertont und untertitelt jede Woche fünf kurze Patientenvideos zu den Behandlungen, die Sie anbieten, prüft jedes auf Werberecht und fachliche Richtigkeit, und Sie geben jedes Video frei, bevor es verwendet wird.",
      button: "Ihre Vorschau ansehen",
      secondary: "Tarife und Preise",
    },
    faq: [
      {
        q: "Darf meine Praxis diese Beispielvideos verwenden?",
        a: "Nein. Sie wurden für fiktive Demo-Praxen erstellt und werden hier nur als Beispiele gezeigt. Eine Praxis mit Abo erhält jede Woche eigene, neue Videos mit ihrem Namen, Logo, ihren Farben und in ihrer Sprache – zu den Behandlungen, die sie anbietet.",
      },
      {
        q: "Wurden die Videos von Hand bearbeitet?",
        a: "Nein. Sie werden so gezeigt, wie DentVideo sie erstellt hat, nur fürs Web komprimiert. Im Alltag sieht sich die Zahnärztin oder der Zahnarzt jedes Video an und gibt es frei, bevor die Praxis es veröffentlicht.",
      },
      {
        q: "Zeigen die Videos Patienten oder KI-Avatare?",
        a: "Nein. Die Stimme ist synthetisch; im Bild sind Text, Gegenstände und die Farben der Praxis zu sehen. Es gibt keine Avatar-Gesichter, Schauspieler oder Patienten.",
      },
      {
        q: "In welchen Sprachen gibt es die Videos?",
        a: "Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch, Türkisch, Japanisch, Arabisch und Polnisch – mit Sie oder Du, wie es Ihre Praxis wünscht.",
      },
    ],
  },
  es: {
    nav: "Ejemplos",
    seoTitle: "Vídeos educativos para pacientes dentales: ejemplos",
    seoDescription: "Mira vídeos para pacientes que DentVideo hizo para clínicas dentales de demostración en ocho idiomas: narrados, subtitulados y revisados.",
    h1: "Ejemplos de vídeos educativos para pacientes de clínicas dentales",
    intro:
      "Son vídeos reales que DentVideo hizo para clínicas de demostración ficticias, tres por idioma, sin editar salvo la compresión para la web. Cada uno responde a una pregunta que hacen los pacientes, con narración, subtítulos y una breve lista de consejos. Una clínica suscrita recibe cada semana cinco vídeos nuevos como estos, con su nombre, logo, colores e idioma.",
    demoNote: "Hecho para una clínica de demostración ficticia: el nombre, la cuenta y los colores que aparecen son de esa clínica de demostración, no de una consulta real.",
    viewOnly: "Se muestra aquí como ejemplo de lo que hace DentVideo. Estos vídeos no se ofrecen para descargar ni reutilizar.",
    disclaimer: "Información general; no sustituye una consulta con tu dentista.",
    summaryHeading: "De qué trata el vídeo",
    onScreenHeading: "Texto en pantalla",
    seconds: "{s} segundos",
    watch: "Ver",
    moreHeading: "Más ejemplos",
    otherLanguages: "El mismo tema en otros idiomas",
    seeAll: "Ver todos los vídeos de ejemplo",
    cta: {
      title: "Recibe vídeos como este cada semana con el nombre, el logo y el idioma de tu clínica",
      text: "DentVideo escribe, narra y subtitula cinco vídeos cortos para pacientes cada semana sobre los tratamientos que ofreces, revisa cada uno según las normas de publicidad sanitaria y la exactitud clínica, y tú apruebas cada vídeo antes de usarlo.",
      button: "Ver tu vista previa",
      secondary: "Planes y precios",
    },
    faq: [
      {
        q: "¿Puede mi clínica usar estos vídeos de ejemplo?",
        a: "No. Se hicieron para clínicas de demostración ficticias y se muestran aquí solo como ejemplo. Una clínica suscrita recibe cada semana sus propios vídeos nuevos, con su nombre, logo, colores e idioma, sobre los tratamientos que ofrece.",
      },
      {
        q: "¿Se editaron los vídeos a mano?",
        a: "No. Se muestran tal como los hizo DentVideo, solo comprimidos para la web. En el uso normal, el dentista ve y aprueba cada vídeo antes de que la clínica lo publique.",
      },
      {
        q: "¿Aparecen pacientes o avatares de IA?",
        a: "No. La voz es sintética; en la imagen hay texto, objetos y los colores de la clínica. No hay caras de avatar, actores ni pacientes.",
      },
      {
        q: "¿En qué idiomas pueden estar los vídeos?",
        a: "Español, inglés, alemán, francés, italiano, portugués, turco, japonés, árabe y polaco, con trato de tú o de usted según prefiera la clínica.",
      },
    ],
  },
  tr: {
    nav: "Örnekler",
    seoTitle: "Diş kliniği hasta bilgilendirme videosu örnekleri",
    seoDescription: "DentVideo'nun demo diş klinikleri için sekiz dilde hazırladığı hasta bilgilendirme videolarını izleyin: seslendirilmiş, altyazılı ve kontrol edilmiş.",
    h1: "Diş klinikleri için hasta bilgilendirme videosu örnekleri",
    intro:
      "Bunlar DentVideo'nun kurgusal demo klinikler için hazırladığı gerçek videolar; her dilde üç tane, web için sıkıştırma dışında düzenlenmeden. Her biri hastaların sorduğu bir soruyu seslendirme, altyazı ve kısa bir kontrol listesiyle yanıtlar. Abone olan bir klinik her hafta bunlar gibi beş yeni video alır; kendi adı, logosu, renkleri ve diliyle.",
    demoNote: "Kurgusal bir demo klinik için hazırlandı: ekrandaki ad, hesap adı ve renkler gerçek bir kliniğe değil, demo kliniğe aittir.",
    viewOnly: "Burada DentVideo'nun ne ürettiğine örnek olarak gösterilir. Bu videolar indirme veya yeniden kullanım için sunulmaz.",
    disclaimer: "Genel bilgilendirmedir; diş hekimi muayenesinin yerini tutmaz.",
    summaryHeading: "Video neyi anlatıyor",
    onScreenHeading: "Ekrandaki metin",
    seconds: "{s} saniye",
    watch: "İzle",
    moreHeading: "Diğer örnekler",
    otherLanguages: "Aynı konu başka dillerde",
    seeAll: "Tüm örnek videoları görün",
    cta: {
      title: "Bunun gibi videoları her hafta kliniğinizin adı, logosu ve diliyle alın",
      text: "DentVideo, sunduğunuz tedaviler hakkında her hafta beş kısa hasta bilgilendirme videosu yazar, seslendirir ve altyazılar; her birini tanıtım kuralları ve klinik doğruluk açısından kontrol eder. Her videoyu kullanılmadan önce siz onaylarsınız.",
      button: "Önizlemenizi görün",
      secondary: "Paketler ve fiyatlar",
    },
    faq: [
      {
        q: "Kliniğim bu örnek videoları kullanabilir mi?",
        a: "Hayır. Kurgusal demo klinikler için hazırlandılar ve burada yalnızca örnek olarak gösteriliyorlar. Abone olan bir klinik her hafta kendi adı, logosu, renkleri ve diliyle, sunduğu tedaviler hakkında kendine ait yeni videolar alır.",
      },
      {
        q: "Videolar elle düzenlendi mi?",
        a: "Hayır. DentVideo'nun ürettiği haliyle, yalnızca web için sıkıştırılarak gösteriliyorlar. Normal kullanımda diş hekimi her videoyu izler ve klinik paylaşmadan önce onaylar.",
      },
      {
        q: "Videolarda hasta ya da yapay zekâ avatarı var mı?",
        a: "Hayır. Seslendirme sentetik bir sestir; görüntüde metin, nesneler ve kliniğin renkleri yer alır. Avatar yüzü, oyuncu ya da hasta yoktur.",
      },
      {
        q: "Videolar hangi dillerde olabilir?",
        a: "Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, İtalyanca, Portekizce, Japonca, Arapça ve Lehçe; kliniğin tercihine göre siz ya da sen hitabıyla.",
      },
    ],
  },
  fr: {
    nav: "Exemples",
    seoTitle: "Vidéos d'information patient dentaire : exemples",
    seoDescription: "Regardez des vidéos patient que DentVideo a réalisées pour des cabinets dentaires de démonstration en huit langues : commentées, sous-titrées, vérifiées.",
    h1: "Exemples de vidéos d'information patient pour cabinets dentaires",
    intro:
      "Ce sont de vraies vidéos réalisées par DentVideo pour des cabinets de démonstration fictifs, trois par langue, sans retouche hormis la compression pour le web. Chacune répond à une question que posent les patients, avec un commentaire, des sous-titres et une courte liste de conseils. Un cabinet abonné reçoit chaque semaine cinq nouvelles vidéos de ce type, à son nom, avec son logo, ses couleurs et sa langue.",
    demoNote: "Réalisée pour un cabinet de démonstration fictif : le nom, le compte et les couleurs à l'écran sont ceux de ce cabinet de démonstration, pas d'un vrai cabinet.",
    viewOnly: "Présentée ici comme exemple de ce que réalise DentVideo. Ces vidéos ne sont proposées ni au téléchargement ni à la réutilisation.",
    disclaimer: "Information générale, qui ne remplace pas une consultation chez votre dentiste.",
    summaryHeading: "Ce que montre la vidéo",
    onScreenHeading: "Texte à l'écran",
    seconds: "{s} secondes",
    watch: "Regarder",
    moreHeading: "Autres exemples",
    otherLanguages: "Le même sujet dans d'autres langues",
    seeAll: "Voir toutes les vidéos d'exemple",
    cta: {
      title: "Recevez chaque semaine des vidéos comme celle-ci, au nom, au logo et dans la langue de votre cabinet",
      text: "DentVideo écrit, commente et sous-titre chaque semaine cinq courtes vidéos d'information patient sur les soins que vous proposez, vérifie chacune au regard des règles de communication et de l'exactitude clinique, et vous validez chaque vidéo avant son utilisation.",
      button: "Voir votre aperçu",
      secondary: "Formules et tarifs",
    },
    faq: [
      {
        q: "Mon cabinet peut-il utiliser ces vidéos d'exemple ?",
        a: "Non. Elles ont été réalisées pour des cabinets de démonstration fictifs et ne sont montrées ici qu'à titre d'exemple. Un cabinet abonné reçoit chaque semaine ses propres vidéos, à son nom, avec son logo, ses couleurs et sa langue, sur les soins qu'il propose.",
      },
      {
        q: "Les vidéos ont-elles été retouchées à la main ?",
        a: "Non. Elles sont présentées telles que DentVideo les a produites, seulement compressées pour le web. En usage normal, le dentiste regarde et valide chaque vidéo avant que le cabinet ne la publie.",
      },
      {
        q: "Les vidéos montrent-elles des patients ou des avatars ?",
        a: "Non. La voix est synthétique ; l'image montre du texte, des objets et les couleurs du cabinet. Il n'y a ni visage d'avatar, ni acteur, ni patient.",
      },
      {
        q: "Dans quelles langues les vidéos peuvent-elles être réalisées ?",
        a: "Français, anglais, allemand, espagnol, italien, portugais, turc, japonais, arabe et polonais, avec vouvoiement ou tutoiement selon le choix du cabinet.",
      },
    ],
  },
  ja: {
    nav: "動画サンプル",
    seoTitle: "歯科医院の患者さん向け説明動画サンプル",
    seoDescription: "DentVideoがデモ歯科医院のために8言語で制作した患者さん向け説明動画をご覧いただけます。ナレーション、字幕、内容チェック済みの状態です。",
    h1: "歯科医院向け・患者さん説明動画のサンプル",
    intro:
      "DentVideoが架空のデモ医院のために制作した実際の動画です。各言語3本ずつ、Web用の圧縮以外は手を加えていません。どの動画も患者さんがよく尋ねる疑問に、ナレーション・字幕・短い要点で答えます。ご契約の医院には、医院名・ロゴ・カラー・言語に合わせた新しい動画を毎週5本お届けします。",
    demoNote: "架空のデモ医院向けに制作した動画です。画面に出る医院名・アカウント名・カラーはデモ医院のもので、実在の医院ではありません。",
    viewOnly: "DentVideoの制作例としてここで公開しています。これらの動画のダウンロードや再利用はできません。",
    disclaimer: "一般的な情報であり、歯科医師の診察に代わるものではありません。",
    summaryHeading: "動画の内容",
    onScreenHeading: "画面のテキスト",
    seconds: "{s}秒",
    watch: "見る",
    moreHeading: "ほかのサンプル",
    otherLanguages: "同じテーマのほかの言語",
    seeAll: "動画サンプルをすべて見る",
    cta: {
      title: "このような動画を毎週、医院名・ロゴ・言語に合わせてお届けします",
      text: "DentVideoは、医院で行っている診療について患者さん向けの短い動画を毎週5本、原稿・ナレーション・字幕まで制作し、医療広告のルールと医学的な正確さを1本ずつ確認します。使う前に、すべての動画を先生ご自身で承認していただきます。",
      button: "プレビューを見る",
      secondary: "プランと料金",
    },
    faq: [
      {
        q: "このサンプル動画を自院で使えますか？",
        a: "いいえ。架空のデモ医院向けに制作したもので、制作例として公開しているだけです。ご契約の医院には、医院名・ロゴ・カラー・言語に合わせ、実際の診療内容についての新しい動画を毎週お届けします。",
      },
      {
        q: "動画は手作業で編集していますか？",
        a: "いいえ。Web用に圧縮した以外は、DentVideoが制作したままの状態です。通常は、医院が投稿する前に歯科医師が1本ずつ確認して承認します。",
      },
      {
        q: "患者さんやAIアバターは登場しますか？",
        a: "いいえ。ナレーションは合成音声で、画面には文字、物、医院のカラーが映ります。アバターの顔、俳優、患者さんは登場しません。",
      },
      {
        q: "動画は何語で作れますか？",
        a: "日本語、英語、ドイツ語、スペイン語、フランス語、イタリア語、ポルトガル語、トルコ語、アラビア語、ポーランド語です。",
      },
    ],
  },
  ar: {
    nav: "أمثلة",
    seoTitle: "أمثلة فيديوهات توعية المرضى لعيادات الأسنان",
    seoDescription: "شاهدوا فيديوهات توعوية أعدّها DentVideo لعيادات أسنان تجريبية بثماني لغات: بتعليق صوتي ونص على الشاشة، وبعد المراجعة.",
    h1: "أمثلة على فيديوهات توعية المرضى لعيادات الأسنان",
    intro:
      "هذه فيديوهات حقيقية أعدّها DentVideo لعيادات تجريبية غير حقيقية، ثلاثة لكل لغة، دون أي تعديل سوى ضغطها للويب. كل فيديو يجيب عن سؤال يطرحه المرضى، بتعليق صوتي ونص على الشاشة وقائمة قصيرة من النصائح. العيادة المشتركة تتلقى كل أسبوع خمسة فيديوهات جديدة مثلها، باسمها وشعارها وألوانها ولغتها.",
    demoNote: "أُعدّ لعيادة تجريبية غير حقيقية: الاسم والحساب والألوان على الشاشة تخص العيادة التجريبية، لا عيادة حقيقية.",
    viewOnly: "معروض هنا كمثال على ما يعدّه DentVideo. هذه الفيديوهات غير متاحة للتنزيل أو لإعادة الاستخدام.",
    disclaimer: "معلومات عامة، ولا تغني عن استشارة طبيب الأسنان.",
    summaryHeading: "عمّ يتحدث الفيديو",
    onScreenHeading: "النص على الشاشة",
    seconds: "{s} ثانية",
    watch: "مشاهدة",
    moreHeading: "أمثلة أخرى",
    otherLanguages: "الموضوع نفسه بلغات أخرى",
    seeAll: "شاهدوا كل الفيديوهات النموذجية",
    cta: {
      title: "احصلوا على فيديوهات مثل هذا كل أسبوع باسم عيادتكم وشعارها ولغتها",
      text: "يكتب DentVideo كل أسبوع خمسة فيديوهات توعوية قصيرة عن العلاجات التي تقدمونها، ويضيف لها التعليق الصوتي والنص على الشاشة، ويراجع كل فيديو وفق قواعد الإعلان الصحي والدقة الطبية، وأنتم توافقون على كل فيديو قبل استخدامه.",
      button: "شاهدوا المعاينة",
      secondary: "الباقات والأسعار",
    },
    faq: [
      {
        q: "هل يمكن لعيادتنا استخدام هذه الفيديوهات النموذجية؟",
        a: "لا. أُعدّت لعيادات تجريبية غير حقيقية وتُعرض هنا كأمثلة فقط. العيادة المشتركة تتلقى كل أسبوع فيديوهات جديدة خاصة بها، باسمها وشعارها وألوانها ولغتها، عن العلاجات التي تقدمها.",
      },
      {
        q: "هل عُدّلت الفيديوهات يدوياً؟",
        a: "لا. تُعرض كما أعدّها DentVideo، مع ضغطها للويب فقط. في الاستخدام المعتاد يشاهد طبيب الأسنان كل فيديو ويوافق عليه قبل أن تنشره العيادة.",
      },
      {
        q: "هل تظهر في الفيديوهات وجوه مرضى أو شخصيات رقمية؟",
        a: "لا. التعليق بصوت اصطناعي، والصورة تعرض نصاً وأشياء وألوان العيادة. لا توجد وجوه رقمية ولا ممثلون ولا مرضى.",
      },
      {
        q: "بأي لغات يمكن إعداد الفيديوهات؟",
        a: "العربية والإنجليزية والألمانية والإسبانية والفرنسية والإيطالية والبرتغالية والتركية واليابانية والبولندية.",
      },
    ],
  },
  pl: {
    nav: "Przykłady",
    seoTitle: "Filmy edukacyjne dla pacjentów stomatologii: przykłady",
    seoDescription: "Zobacz filmy dla pacjentów, które DentVideo przygotowało dla gabinetów demonstracyjnych w ośmiu językach: z lektorem, napisami i po kontroli.",
    h1: "Przykłady filmów edukacyjnych dla pacjentów gabinetów stomatologicznych",
    intro:
      "To prawdziwe filmy, które DentVideo przygotowało dla fikcyjnych gabinetów demonstracyjnych, po trzy w każdym języku, bez poprawek poza kompresją do internetu. Każdy odpowiada na pytanie, które zadają pacjenci, z lektorem, napisami i krótką listą wskazówek. Gabinet z subskrypcją co tydzień otrzymuje pięć nowych takich filmów, ze swoją nazwą, logo, kolorami i w swoim języku.",
    demoNote: "Przygotowane dla fikcyjnego gabinetu demonstracyjnego: nazwa, konto i kolory na ekranie należą do gabinetu demonstracyjnego, nie do prawdziwej praktyki.",
    viewOnly: "Pokazane tutaj jako przykład pracy DentVideo. Te filmy nie są udostępniane do pobrania ani ponownego wykorzystania.",
    disclaimer: "Informacja ogólna, która nie zastępuje konsultacji stomatologicznej.",
    summaryHeading: "O czym jest film",
    onScreenHeading: "Tekst na ekranie",
    seconds: "{s} s",
    watch: "Obejrzyj",
    moreHeading: "Więcej przykładów",
    otherLanguages: "Ten sam temat w innych językach",
    seeAll: "Zobacz wszystkie przykładowe filmy",
    cta: {
      title: "Takie filmy co tydzień, z nazwą, logo i w języku Państwa gabinetu",
      text: "DentVideo co tydzień pisze, nagrywa lektorem i opisuje napisami pięć krótkich filmów dla pacjentów o zabiegach, które Państwo wykonują, sprawdza każdy pod kątem zasad reklamy i poprawności klinicznej, a Państwo zatwierdzają każdy film przed użyciem.",
      button: "Zobacz podgląd",
      secondary: "Plany i ceny",
    },
    faq: [
      {
        q: "Czy nasz gabinet może korzystać z tych przykładowych filmów?",
        a: "Nie. Zostały przygotowane dla fikcyjnych gabinetów demonstracyjnych i są tu pokazane wyłącznie jako przykłady. Gabinet z subskrypcją co tydzień otrzymuje własne, nowe filmy ze swoją nazwą, logo, kolorami i w swoim języku, o wykonywanych zabiegach.",
      },
      {
        q: "Czy filmy były ręcznie montowane?",
        a: "Nie. Są pokazane tak, jak przygotowało je DentVideo, jedynie skompresowane do internetu. Na co dzień lekarz dentysta ogląda i zatwierdza każdy film, zanim gabinet go opublikuje.",
      },
      {
        q: "Czy w filmach pojawiają się pacjenci albo awatary AI?",
        a: "Nie. Lektor to głos syntetyczny; w obrazie są tekst, przedmioty i kolory gabinetu. Nie ma twarzy awatarów, aktorów ani pacjentów.",
      },
      {
        q: "W jakich językach mogą powstawać filmy?",
        a: "Po polsku, angielsku, niemiecku, hiszpańsku, francusku, włosku, portugalsku, turecku, japońsku i arabsku, z formą „Państwo” lub „ty”, jak woli gabinet.",
      },
    ],
  },
};

/** Every example page, in the order of SAMPLE_VIDEOS within each language. */
export const EXAMPLES: ExampleVideo[] = [
  // ---------- English ----------
  {
    locale: "en",
    slug: "whitening-myths-debunked",
    topic: "whitening-enamel",
    seoTitle: "Whitening and enamel: patient video example",
    seoDescription: "Example patient video on whether whitening harms enamel: myth vs fact, temporary sensitivity and two aftercare tips. Narrated and captioned by DentVideo.",
    h1: "Does whitening thin your enamel? A short patient video",
    summary:
      "A myth-and-fact video for patients considering whitening. It explains that professional whitening products can be safe for enamel when used properly, that most people notice only temporary sensitivity afterwards, and closes with two aftercare tips and an invitation to ask the clinic.",
    onScreen: [
      "Whitening thins your enamel? Not quite.",
      "Teeth whitening products can actually be safe for your enamel.",
      "Myth: whitening ruins your enamel. Fact: whitening can be safe with proper use.",
      "Most people experience only temporary sensitivity after whitening.",
      "Aftercare tips: avoid strongly coloured foods and drinks for a day or two; follow your dentist's instructions.",
      "Got questions? Ask us or book a check-up!",
    ],
  },
  {
    locale: "en",
    slug: "caring-for-clear-aligners",
    topic: "aligner-care",
    seoTitle: "Clear aligner care: patient video example",
    seoDescription: "Example patient video on cleaning clear aligners: rinse after eating, a soft brush and mild soap, no toothpaste, an occasional soak. Made by DentVideo.",
    h1: "How to keep clear aligners fresh: a short patient video",
    summary:
      "A how-to for aligner wearers who notice an odd smell. It lists four cleaning steps — rinse after eating, a soft toothbrush with mild soap, an occasional soak in a gentle cleaner — and explains why toothpaste is left out: it can scratch the aligner.",
    onScreen: [
      "That funky smell from your aligners? Avoid it this way.",
      "Cleaning your aligners is super important.",
      "Rinse aligners with water after eating.",
      "Use a soft toothbrush and mild soap.",
      "Avoid using toothpaste, it can scratch.",
      "Soak them in a gentle cleaner occasionally.",
      "These steps can help keep your aligners fresh.",
    ],
  },
  {
    locale: "en",
    slug: "proper-brushing-technique",
    seoTitle: "Toothbrushing technique: patient video example",
    seoDescription: "Example patient video on brushing technique: a soft-bristled brush at 45 degrees to the gums, gentle circles, two minutes, and the tongue. By DentVideo.",
    h1: "Brushing technique in twenty seconds: a short patient video",
    summary:
      "A quick technique refresher for patients who miss spots when they brush: a soft-bristled toothbrush held at a 45-degree angle to the gums, gentle circular motions, at least two minutes, and the tongue too.",
    onScreen: [
      "Missing spots when you brush? Here's a clue.",
      "Start with a soft-bristled toothbrush.",
      "Hold it at a 45-degree angle to your gums.",
      "Here's how to brush: use gentle circular motions; brush for at least two minutes; don't forget to brush your tongue.",
      "Got questions? Ask us or book a check-up!",
    ],
  },
  // ---------- German ----------
  {
    locale: "de",
    slug: "bleaching-zahnschmelz",
    topic: "whitening-enamel",
    seoTitle: "Bleaching und Zahnschmelz: Beispielvideo",
    seoDescription: "Beispiel-Patientenvideo: Schadet Bleaching dem Zahnschmelz? Mythos und Wahrheit, vorübergehende Empfindlichkeit und zwei Hinweise danach. Von DentVideo.",
    h1: "Schadet Bleaching dem Zahnschmelz? Ein kurzes Patientenvideo",
    summary:
      "Ein Mythos-und-Wahrheit-Video für Patienten, die über ein Bleaching nachdenken. Es erklärt, dass Bleaching bei richtiger Durchführung die Zahngesundheit in der Regel nicht beeinträchtigt, dass die meisten Menschen danach nur eine vorübergehende Empfindlichkeit erleben, und gibt zwei Hinweise für die Tage danach.",
    onScreen: [
      "Ihr Zahnschmelz beim Bleaching in Gefahr?",
      "Bleaching kann sicher sein, wenn es richtig gemacht wird.",
      "Bleaching kann, wenn korrekt durchgeführt, die Zahngesundheit in der Regel nicht beeinträchtigen.",
      "Mythos: Bleaching schädigt immer den Zahnschmelz. Wahrheit: Bei richtiger Anwendung ist dies nicht der Fall.",
      "Die meisten Menschen erleben nach dem Bleaching eine vorübergehende Empfindlichkeit.",
      "Nach dem Bleaching: stark gefärbte Lebensmittel und Getränke für ein paar Tage meiden; den Anweisungen Ihres Zahnarztes folgen.",
      "Haben Sie Fragen? Kontaktieren Sie uns oder vereinbaren Sie einen Termin!",
    ],
  },
  {
    locale: "de",
    slug: "aligner-verfaerbung",
    topic: "aligner-care",
    seoTitle: "Aligner-Pflege: Beispiel-Patientenvideo",
    seoDescription: "Beispiel-Patientenvideo zu verfärbten Alignern: täglich mit milder Seife und Wasser reinigen, heiße Getränke meiden, in der Box aufbewahren. Von DentVideo.",
    h1: "Verfärbte Aligner? Ein kurzes Patientenvideo zur Pflege",
    summary:
      "Ein Pflegevideo für Patienten, deren Aligner sich verfärben. Es empfiehlt die tägliche Reinigung mit milder Seife und Wasser, rät von heißen Flüssigkeiten ab, weil sie das Material beschädigen können, und fasst drei Pflegetipps zusammen.",
    onScreen: [
      "Ihre Aligner verfärben sich?",
      "Reinigen Sie Ihre Aligner täglich mit milder Seife und Wasser.",
      "Vermeiden Sie heiße Flüssigkeiten, da sie das Material beschädigen können.",
      "Tipps zur Pflege Ihrer Aligner: Spülen Sie sie nach dem Essen aus. Verwenden Sie keine starken Reinigungsmittel. Bewahren Sie sie in der Box auf, wenn Sie sie nicht tragen.",
      "Fragen Sie uns gerne oder vereinbaren Sie einen Termin!",
    ],
  },
  {
    locale: "de",
    slug: "kinder-zahnarztangst",
    topic: "child-dental-anxiety",
    seoTitle: "Kinder beim Zahnarzt: Beispiel-Patientenvideo",
    seoDescription: "Beispiel-Patientenvideo für Eltern: wie ein Praxisteam Kindern die Angst vor dem Zahnarztbesuch nehmen kann – mit Zeit, spielerischen Erklärungen und Ruhe.",
    h1: "Kinder und Zahnarztangst: ein kurzes Video für Eltern",
    summary:
      "Ein Video für Eltern, deren Kinder vor dem Zahnarztbesuch nervös sind. Es zeigt, wie das Praxisteam damit umgeht: Zeit für Gespräche, spielerische Erklärungen, ein kinderfreundliches Umfeld und eine kleine Belohnung nach der Behandlung.",
    onScreen: [
      "Kinder und Zahnarzt? Kein Grund zur Panik!",
      "Wir verstehen die Ängste von Kindern.",
      "Wir nehmen uns Zeit, um mit den Kindern zu sprechen.",
      "Unser Team verwendet spielerische Erklärungen, um den Besuch zu erleichtern.",
      "So gehen wir mit Angst um: ein kinderfreundliches Umfeld, beruhigende Gespräche, interaktive Spiele, Belohnungen nach der Behandlung.",
      "Haben Sie Fragen? Besuchen Sie uns oder buchen Sie einen Termin!",
    ],
  },
  // ---------- Spanish ----------
  {
    locale: "es",
    slug: "limpieza-dental",
    topic: "scaling",
    seoTitle: "Limpieza dental: vídeo de ejemplo para pacientes",
    seoDescription: "Vídeo de ejemplo para pacientes sobre la limpieza dental: ayuda a eliminar placa y sarro y reduce el riesgo de caries y de enfermedad de las encías.",
    h1: "Por qué el cepillo no basta: la limpieza dental en un vídeo corto",
    summary:
      "Un vídeo para pacientes que creen que el cepillado lo hace todo. Explica que la limpieza dental profesional ayuda a eliminar la placa y el sarro y reduce el riesgo de caries y de enfermedades de las encías, y contrasta la limpieza regular con su falta.",
    onScreen: [
      "Tu cepillo no lo hace todo — esto sí.",
      "La limpieza dental es esencial para tu salud bucal.",
      "La limpieza dental ayuda a eliminar la placa y el sarro.",
      "También reduce el riesgo de caries y enfermedades de las encías.",
      "Limpieza regular: puede ayudar a mantener tus dientes sanos. Falta de limpieza: puede contribuir a problemas dentales.",
      "Pregunta a Clínica Dental Demo o agenda tu revisión.",
    ],
  },
  {
    locale: "es",
    slug: "primer-diente",
    seoTitle: "Primer diente del bebé: vídeo de ejemplo",
    seoDescription: "Vídeo de ejemplo para padres: cómo cuidar los dientes del bebé desde el primer diente, con cepillo suave, poca pasta y revisiones. Hecho por DentVideo.",
    h1: "Primer diente, ¿y ahora qué? Un vídeo corto para padres",
    summary:
      "Un vídeo para padres cuyo bebé acaba de tener su primer diente. Recomienda empezar la limpieza diaria desde ese primer diente, con un cepillo suave y una pequeña cantidad de pasta, cepillar al menos dos veces al día, hacerlo divertido y visitar al dentista para chequeos.",
    onScreen: [
      "Primer diente, ¿y ahora qué?",
      "Limpieza diaria es clave.",
      "Empieza limpiando sus dientes desde el primer diente.",
      "Consejos para cuidar sus dientes: usa un cepillo suave; aplica una pequeña cantidad de pasta dental; cepilla por lo menos dos veces al día; hazlo divertido para ellos.",
      "Visita al dentista cada seis meses para chequeos.",
      "¿Tienes preguntas? ¡Consulta con nosotros o agenda tu cita!",
    ],
  },
  {
    locale: "es",
    slug: "cuidado-encias",
    seoTitle: "Cuidado de encías tras el tratamiento: ejemplo",
    seoDescription: "Vídeo de ejemplo para pacientes tras un tratamiento de encías: limpieza suave, cepillo de cerdas suaves y enjuagues con agua tibia. Hecho por DentVideo.",
    h1: "Tras el tratamiento de encías: cuidados en un vídeo corto",
    summary:
      "Un vídeo de cuidados para pacientes que acaban de recibir un tratamiento de encías. Pide limpiar las encías con suavidad y con un cepillo de cerdas suaves para evitar irritación, evitar alimentos duros y calientes, hacer enjuagues suaves con agua tibia y seguir las indicaciones del dentista.",
    onScreen: [
      "Tras el tratamiento, tus encías necesitan esto.",
      "Limpia suavemente tus encías.",
      "Es importante que limpies tus encías con cuidado.",
      "Usa un cepillo de cerdas suaves para evitar irritación.",
      "Consejos para el cuidado: evita alimentos duros y calientes; haz enjuagues suaves con agua tibia; sigue siempre las indicaciones de tu dentista.",
      "Pregunta a nuestra clínica o agenda tu revisión.",
    ],
  },
  // ---------- Turkish ----------
  {
    locale: "tr",
    slug: "implant-asamalari",
    seoTitle: "İmplant aşamaları: örnek hasta videosu",
    seoDescription: "İmplant tedavisinin aşamalarını anlatan örnek hasta videosu: muayene ve planlama, cerrahi yerleştirme, iyileşme süreci ve dişin yapılması.",
    h1: "İmplant tedavisi tek randevuda bitmez: kısa bir hasta videosu",
    summary:
      "İmplant düşünen hastalar için kısa bir bilgilendirme videosu. Tedavinin genellikle birkaç aşamadan oluştuğunu anlatır: ilk muayene ve planlama, cerrahi yerleştirme, iyileşme süreci ve dişin yapılması. Her aşamanın diş hekiminin önerilerine göre ilerlediğini hatırlatır.",
    onScreen: [
      "İlk randevuda implant bitmiyor!",
      "İmplant tedavisinin aşamaları.",
      "İmplant tedavisi genellikle birkaç aşamadan oluşur.",
      "Aşamalar: ilk muayene ve planlama; cerrahi yerleştirme; iyileşme süreci; dişin yapılması.",
      "Her aşama, diş hekiminizin önerilerine göre ilerler.",
      "Daha fazla bilgi için bize ulaşın veya randevu alın.",
    ],
  },
  {
    locale: "tr",
    slug: "dis-tasi-temizligi",
    topic: "scaling",
    seoTitle: "Diş taşı temizliği: örnek hasta videosu",
    seoDescription: "Diş taşı temizliğini anlatan örnek hasta videosu: diş taşı diş etlerini nasıl etkiler, temizlenmezse ne olabilir ve temizliğin faydaları.",
    h1: "Diş taşı diş etlerini nasıl etkiler? Kısa bir hasta videosu",
    summary:
      "Diş taşı temizliğinin neden önemli olduğunu anlatan bir video. Diş taşının bir bakteri birikimi olduğunu, zamanla diş etlerinde iltihaplanmaya ve temizlenmediğinde diş eti hastalığına yol açabileceğini açıklar; temizliğin diş eti sağlığını korumaya ve ağız kokusunu azaltmaya yardımcı olabileceğini sıralar.",
    onScreen: [
      "Diş taşı diş etlerinizi sessizce nasıl tehdit eder?",
      "Diş taşı temizliği diş sağlığınız için önemlidir.",
      "Diş taşı, diş etlerinizi tehdit eder ve zamanla iltihaplanabilir.",
      "Diş taşı: bakteri birikimi. Sağlıklı dişler: daha az risk.",
      "Temizlenmediğinde, diş eti hastalığına yol açabilir.",
      "Diş taşı temizliğinin faydaları: diş eti sağlığını korur; ağız kokusunu azaltır; diş çürüğünü önlemeye yardımcı olabilir.",
      "Diş taşı temizliği hakkında daha fazla bilgi için bize ulaşın!",
    ],
  },
  {
    locale: "tr",
    slug: "beyazlatma-hassasiyet",
    topic: "whitening-enamel",
    seoTitle: "Beyazlatma ve hassasiyet: örnek hasta videosu",
    seoDescription: "Diş beyazlatmayı anlatan örnek hasta videosu: mineyi inceltir mi, işlem sonrası geçici hassasiyet görülebilir mi ve genellikle ne kadar sürer.",
    h1: "Beyazlatma sonrası dişler hassaslaşır mı? Kısa bir hasta videosu",
    summary:
      "Beyazlatma düşünen hastalar için bir video. Diş beyazlatmanın diş minesini inceltmediğini, ancak işlemden sonra geçici hassasiyet görülebileceğini ve bunun genellikle birkaç gün sürebileceğini anlatır; beklenebilecekleri üç maddede özetler.",
    onScreen: [
      "Beyazlatma sonrası dişler daha hassas mı olur?",
      "Diş beyazlatma diş minenizi inceltmez.",
      "Diş beyazlatma işlemi, diş minenizi inceltmez. Ancak, geçici hassasiyet görülebilir.",
      "Sonuçlar: dişlerinizin tonu açılır; geçici hassasiyet yaşanabilir; diş minesine zarar vermesi beklenmez.",
      "Hassasiyet genellikle beyazlatma sonrası birkaç gün sürebilir.",
      "Daha fazla bilgi için iletişime geçin veya randevu alın.",
    ],
  },
  // ---------- French ----------
  {
    locale: "fr",
    slug: "gencives-qui-saignent",
    topic: "bleeding-gums",
    seoTitle: "Gencives qui saignent : vidéo patient d'exemple",
    seoDescription: "Vidéo patient d'exemple : ce qu'un saignement des gencives peut signaler, la différence entre gingivite et parodontite, et pourquoi consulter son dentiste.",
    h1: "Gencives qui saignent : une courte vidéo d'information patient",
    summary:
      "Une vidéo pour les patients dont les gencives saignent. Elle explique qu'un saignement peut être le signe d'une inflammation, distingue la gingivite (inflammation des gencives) de la parodontite (infection plus grave) et invite à consulter son dentiste pour un diagnostic.",
    onScreen: [
      "Gencives qui saignent : le signe d'alerte.",
      "Un saignement peut indiquer un problème.",
      "Un saignement des gencives peut être le signe d'une inflammation.",
      "Gingivite : inflammation des gencives. Parodontite : infection plus grave.",
      "Il est essentiel de consulter votre dentiste pour un diagnostic.",
      "Posez vos questions ou prenez rendez-vous.",
    ],
  },
  {
    locale: "fr",
    slug: "blanchiment-email",
    topic: "whitening-enamel",
    seoTitle: "Blanchiment et émail : vidéo patient d'exemple",
    seoDescription: "Vidéo patient d'exemple : le blanchiment abîme-t-il l'émail ? Vrai ou faux, sensibilité temporaire et conseils après le blanchiment. Par DentVideo.",
    h1: "Le blanchiment abîme-t-il l'émail ? Une courte vidéo patient",
    summary:
      "Une vidéo vrai-ou-faux pour les patients qui envisagent un blanchiment. Elle explique qu'un blanchiment dentaire bien réalisé ne devrait pas endommager l'émail, qu'un blanchiment professionnel est généralement sûr, qu'une sensibilité temporaire peut apparaître, et donne trois conseils pour la suite.",
    onScreen: [
      "Blanchiment et l'émail : la vérité.",
      "Le blanchiment dentaire, s'il est bien réalisé, ne devrait pas abîmer l'émail.",
      "Vrai : un blanchiment professionnel est généralement sûr. Faux : le blanchiment cause toujours des dommages.",
      "Après le blanchiment : évitez les aliments très colorés ; vous pouvez ressentir une sensibilité temporaire ; suivez les conseils de votre dentiste.",
      "Posez vos questions ou prenez rendez-vous !",
    ],
  },
  {
    locale: "fr",
    slug: "detartrage",
    topic: "scaling",
    seoTitle: "Détartrage : vidéo patient d'exemple",
    seoDescription: "Vidéo patient d'exemple sur le détartrage : le tartre et les gencives, le risque de caries, et ce qu'un détartrage régulier peut apporter. Par DentVideo.",
    h1: "Pourquoi un détartrage régulier ? Une courte vidéo patient",
    summary:
      "Une vidéo sur ce que la brosse à dents ne retire pas. Elle explique qu'un détartrage régulier élimine le tartre, qui peut causer des problèmes de gencives, que sans détartrage le risque de caries et d'infections buccales peut augmenter, et résume ce qu'il peut apporter.",
    onScreen: [
      "L'ennemi invisible de votre brosse à dents…",
      "Le détartrage aide à garder vos dents saines.",
      "Un détartrage régulier élimine le tartre, qui peut causer des problèmes de gencives.",
      "Sans détartrage, vous pouvez être plus à risque de caries et d'infections buccales.",
      "Les bienfaits du détartrage : préserve la santé des gencives ; peut réduire le risque de caries ; peut améliorer l'haleine.",
      "Posez vos questions ou prenez rendez-vous !",
    ],
  },
  // ---------- Japanese ----------
  {
    locale: "ja",
    slug: "tsumetai-mono-de-shimiru",
    topic: "cold-sensitivity",
    seoTitle: "冷たい物がしみる：患者さん向け動画の例",
    seoDescription: "冷たい物でしみる原因として多い知覚過敏、むし歯や歯ぐき下がりの可能性、確認すること、受診の目安を伝える患者さん向け動画の例です。",
    h1: "冷たい水だけしみる時に：患者さん向けの短い動画",
    summary:
      "冷たい水がしみる方に向けた動画です。冷たい物で一瞬しみる場合は知覚過敏のことが多い一方、むし歯や歯ぐき下がりが原因のこともあると説明します。しみる歯・むし歯の有無・歯ぐきを確認すること、長く続く時は受診すると安心であることを伝えます。",
    onScreen: [
      "冷たい水だけしみます",
      "冷たい物でしみることがあります",
      "知覚過敏のことが多いです。",
      "しみやすい時：冷たい物で一瞬しみる。別の原因も：むし歯や歯ぐき下がり。",
      "気になる時は：しみる歯を確認、むし歯の有無を確認、歯ぐきも確認。",
      "原因で対応は変わります。冷たい刺激だけなら様子を見ることもありますが、長く続く時は受診が安心です。",
      "気軽にご相談ください",
    ],
  },
  {
    locale: "ja",
    slug: "mouthpiece-shokuji",
    seoTitle: "マウスピース矯正と食事：患者さん向け動画の例",
    seoDescription: "マウスピース矯正中の食事を説明する患者さん向け動画の例：食べる前に外す、水は装着中も飲める、食後の歯みがき、装着時間を守ること。",
    h1: "マウスピース矯正中のおやつは？患者さん向けの短い動画",
    summary:
      "マウスピース矯正中の方に向けた動画です。基本は食べる前に外し、水は装着したまま飲めること、食後の歯みがき、装置をやさしく洗うこと、装着時間を守ることを伝えます。自由診療であることと、痛みや違和感、知覚過敏が出ることがある点にも触れています。",
    onScreen: [
      "おやつのたびに外します？",
      "食事の前には外します。",
      "基本は、食べる前に外します。",
      "食事中：外して食べます。装着中：水は飲めます。",
      "大事な点：食後は歯みがき、装置もやさしく洗う、装着時間を守る、指示は歯科医の案内で。",
      "自由診療です。痛みや違和感、知覚過敏が出ることがあります。",
      "ご相談は診察でどうぞ",
    ],
  },
  {
    locale: "ja",
    slug: "ha-ga-nuketa-mama",
    seoTitle: "歯が1本ないままの時：患者さん向け動画の例",
    seoDescription: "歯が1本ないまま噛んでいる方向けの動画の例：噛む力の片寄り、残った歯の動き、かみ合わせの変化と、早めに相談すると方法を選びやすいこと。",
    h1: "歯が1本ないまま噛んでいる時に：患者さん向けの短い動画",
    summary:
      "歯が1本抜けたままの方に向けた動画です。そのままにすると噛む力が片寄りやすく、残った歯が動くことがあると説明し、かみ合わせの変化、すき間に食べ物が入りやすくなること、清掃しづらくなることを挙げます。早めに確認すると、今の状態に合う方法を選びやすいと伝えます。",
    onScreen: [
      "1本ないまま噛んでいます",
      "放置で変化することがあります",
      "そのまま：噛む力が片寄りやすいです。相談後：状態を見て対応を考えます。",
      "残った歯が動くことがあります。",
      "起こりやすい変化：かみ合わせが変わる、すき間に食べ物が入りやすい、清掃しづらくなる。",
      "早めに確認すると、今の状態に合う方法を選びやすいです。",
      "気軽にご相談ください",
    ],
  },
  // ---------- Arabic ----------
  {
    locale: "ar",
    slug: "qahwa-baad-altabyid",
    seoTitle: "القهوة بعد تبييض الأسنان: مثال فيديو للمرضى",
    seoDescription: "مثال على فيديو توعوي للمرضى: لماذا تلتقط الأسنان الألوان أكثر بعد التبييض مؤقتاً، وما الذي يُفضَّل شربه في الأيام الأولى، وثلاث نصائح بسيطة.",
    h1: "القهوة بعد التبييض من أول يوم؟ فيديو توعوي قصير",
    summary:
      "فيديو لمن أجرى تبييض الأسنان مؤخراً. يشرح أن القهوة قد تترك لوناً على الأسنان بعد التبييض لأن سطحها يكون في هذه المرحلة أكثر حساسية للتصبغات، لذلك يُنصح بتأجيل المشروبات القوية اللون لفترة قصيرة واختيار الماء والمشروبات الفاتحة، مع اتباع تعليمات طبيب الأسنان.",
    onScreen: [
      "بعد التبييض، القهوة من أول يوم؟",
      "القهوة قد تترك لوناً على الأسنان بعد التبييض.",
      "بعد التبييض، قد تكون أسنانكم أكثر قابلية لالتقاط الألوان مؤقتاً.",
      "يُفضَّل مؤقتاً: ماء ومشروبات فاتحة. أقل ملاءمة الآن: قهوة، شاي، ومشروبات ملونة.",
      "السبب بسيط: السطح يكون في هذه المرحلة أكثر حساسية للتصبغات، لذلك ننصح بتأجيل الألوان القوية لفترة قصيرة.",
      "ما يفيدكم الآن: اختاروا الماء أولاً؛ خففوا المشروبات الملونة؛ اتبعوا تعليمات طبيب الأسنان.",
      "لأي سؤال بعد التبييض، راسلونا أو احجزوا فحصاً.",
    ],
  },
  {
    locale: "ar",
    slug: "nazif-allitha",
    topic: "bleeding-gums",
    seoTitle: "نزيف اللثة أثناء التنظيف: مثال فيديو للمرضى",
    seoDescription: "مثال على فيديو توعوي للمرضى: إذا نزلت قطرات دم أثناء تنظيف الأسنان، هل تكملون أم تتوقفون؟ وما الذي يستدعي مراجعة عيادة الأسنان.",
    h1: "إذا نزل دم أثناء التنظيف، تكملون أم توقفون؟ فيديو توعوي قصير",
    summary:
      "فيديو لمن يلاحظ نزيفاً خفيفاً من اللثة أثناء التنظيف اليومي. يوضح أن النزيف الخفيف لا يعني عادة التوقف، وأنه غالباً يدل على التهاب يحتاج تنظيفاً ألطف واستمراراً منتظماً، ويذكر أن النزيف الغزير أو المستمر أو المصحوب بألم أو تورم يستدعي مراجعة عيادة الأسنان للفحص.",
    onScreen: [
      "إذا نزل دم، تكملون أم توقفون؟",
      "إذا كان الدم خفيفاً، غالباً تكمِلون بلطف.",
      "في التنظيف اليومي، نزف اللثة الخفيف لا يعني عادةً أنكم توقفون. غالباً يدل على التهاب يحتاج تنظيفاً ألطف واستمراراً منتظماً.",
      "ما الذي تفعلونه؟ خففوا الضغط على الفرشاة؛ نظفوا المنطقة بلطف؛ استمروا في التنظيف حولها؛ راجعوا طبيب الأسنان إذا تكرر النزف.",
      "لا تفعلوا: توقفوا عن التنظيف في المكان. افعلوا: نظفوا بلطف واتبعوا تعليمات طبيبكم.",
      "إذا كان النزف غزيراً، أو استمر، أو صاحبه ألم أو تورم، فراجعوا عيادة الأسنان للفحص، واتبعوا تعليمات طبيبكم الخاصة بحالتكم.",
      "لأي سؤال، راسلوا العيادة أو احجزوا فحصاً للأسنان.",
    ],
  },
  {
    locale: "ar",
    slug: "tafrish-qawi",
    seoTitle: "الضغط بالفرشاة وحساسية الأسنان: مثال فيديو",
    seoDescription: "مثال على فيديو توعوي للمرضى: كيف قد يزيد الضغط الزائد بالفرشاة حساسية الأسنان مع الوقت، وما الذي يساعد، ومتى يُستحسن فحص السبب.",
    h1: "تضغطون بالفرشاة؟ الحساسية قد تبدأ هكذا: فيديو توعوي قصير",
    summary:
      "فيديو عن عادة الضغط القوي بالفرشاة. يشرح أن الضغط الزائد قد يسبب تهيجاً وتآكلاً بسيطاً مع الوقت ويزيد حساسية الأسنان عند بعض الأشخاص، خصوصاً مع انحسار اللثة، ويقترح فرشاة ناعمة وحركات خفيفة ودائرية، ومراجعة الطبيب إذا كانت الحساسية جديدة أو تزداد.",
    onScreen: [
      "تضغطون بالفرشاة؟ الحساسية قد تبدأ هكذا.",
      "الضغط الزائد قد يسبب تهيجاً مع الوقت.",
      "تفريش لطيف: ينظف الأسنان ويخفف تهيج اللثة. ضغط قوي: قد يسبب تآكلاً بسيطاً ويزيد الحساسية.",
      "نعم، مع الوقت قد يزيد الضغط الزائد أثناء التفريش حساسية الأسنان عند بعض الأشخاص، خصوصاً إذا كانت اللثة تنحسر أو كان المينا أضعف.",
      "ما الذي يساعد؟ فرشاة ناعمة؛ حركات خفيفة ودائرية؛ تخفيف القوة بدل زيادة الضغط؛ مراجعة طبيب الأسنان إذا استمرت الحساسية.",
      "إذا كانت الحساسية جديدة أو تزداد، فمن المستحسن فحص السبب؛ أحياناً يكون من التفريش، وأحياناً من التسوس أو تراجع اللثة أو تشققات صغيرة.",
      "اسألوا العيادة أو احجزوا فحصاً لأسنانكم.",
    ],
  },
  // ---------- Polish ----------
  {
    locale: "pl",
    slug: "wybielanie-przed-slubem",
    seoTitle: "Wybielanie przed ślubem: przykładowy film",
    seoDescription: "Przykładowy film dla pacjentów: dlaczego wybielanie przed ważnym dniem warto zaplanować kilka tygodni wcześniej i o czym pamiętać po zabiegu.",
    h1: "Ślub za tydzień, a wybielanie teraz? Krótki film dla pacjentów",
    summary:
      "Film dla osób, które chcą wybielić zęby przed ważnym wydarzeniem. Wyjaśnia, że wybielanie warto zaplanować z wyprzedzeniem, zwykle kilka tygodni wcześniej, bo przed zabiegiem bywa potrzebna kontrola i higienizacja, po nim może pojawić się przejściowa nadwrażliwość, a przez 1–2 dni zwykle zaleca się unikać mocno barwiących napojów i potraw.",
    onScreen: [
      "Ślub za tydzień, a wybielanie teraz?",
      "Najlepiej zaplanować to z wyprzedzeniem.",
      "Na ważny dzień wybielanie warto planować wcześniej, zwykle kilka tygodni przed terminem.",
      "Za późno: mało czasu na ocenę zębów i ewentualną korektę. Z wyprzedzeniem: łatwiej dobrać metodę i spokojnie dojść do efektu.",
      "Warto pamiętać: przed wybielaniem potrzebna bywa kontrola i higienizacja; po zabiegu może pojawić się przejściowa nadwrażliwość; przez 1–2 dni zwykle zaleca się unikać mocno barwiących napojów i potraw.",
      "Jeśli ważne wydarzenie jest blisko, prosimy skonsultować termin z dentystą. Państwa zęby potrzebują trochę czasu, żeby wyglądały naturalnie i stabilnie.",
      "Prosimy napisać do nas lub umówić kontrolę przed terminem.",
    ],
  },
  {
    locale: "pl",
    slug: "bol-po-lodach",
    topic: "cold-sensitivity",
    seoTitle: "Ząb boli przy zimnym: przykładowy film",
    seoDescription: "Przykładowy film dla pacjentów: co może oznaczać krótki, ostry ból zęba po zimnym, kiedy zwykle mija i kiedy warto zgłosić się szybciej.",
    h1: "Ten ząb kłuje przy lodach? Krótki film dla pacjentów",
    summary:
      "Film dla pacjentów, których ząb reaguje na zimno. Wyjaśnia, że krótki, ostry ból po zimnym najczęściej oznacza nadwrażliwość, która może pojawić się przy odsłoniętej szyjce, starciu szkliwa albo drobnym ubytku, wymienia inne możliwe przyczyny i opisuje objawy, przy których warto zgłosić się szybciej.",
    onScreen: [
      "Ten ząb kłuje przy lodach?",
      "Krótki, ostry ból po zimnie najczęściej oznacza nadwrażliwość zęba. Może pojawić się przy odsłoniętej szyjce, starciu szkliwa albo drobnym ubytku.",
      "Zimno może wywołać krótki ból.",
      "Zwykle: ból mija szybko po zimnym bodźcu. Wymaga kontroli: ból wraca, nasila się lub trwa dłużej.",
      "Co to może oznaczać? Nadwrażliwość zębiny; ubytki lub nieszczelne wypełnienie; pęknięcie szkliwa; stan zapalny miazgi.",
      "Jeśli ból jest krótki i pojawia się tylko po lodach, zwykle da się ustalić przyczynę podczas badania. Jeśli dołącza samoistny ból, reakcja na ciepło albo ból przy nagryzaniu, Państwo powinni zgłosić się szybciej.",
      "Macie Państwo taki objaw? Zapraszamy na konsultację.",
    ],
  },
  {
    locale: "pl",
    slug: "pierwsza-wizyta-dziecka",
    topic: "child-dental-anxiety",
    seoTitle: "Pierwsza wizyta dziecka u dentysty: przykład",
    seoDescription: "Przykładowy film dla rodziców: jak spokojnie przygotować dziecko do pierwszej wizyty u dentysty i co zwykle pomaga zamiast mówić „nie bój się”.",
    h1: "Pierwsza wizyta dziecka u dentysty: krótki film dla rodziców",
    summary:
      "Film dla rodziców przed pierwszą wizytą dziecka. Proponuje zamiast „nie bój się” powiedzieć prosto, że dentysta policzy zęby, obejrzy buzię i odpowie na pytania, unikać opowieści o wierceniu i bólu, zabrać ulubioną zabawkę, umówić wizytę, gdy dziecko jest wypoczęte, i pozwolić mu zadawać pytania.",
    onScreen: [
      "Przed wizytą mówią Państwo „nie bój się”? Lepiej powiedzieć coś innego.",
      "Najlepiej oswoić temat spokojnie i wcześniej.",
      "Proszę mówić prosto: że dentysta policzy zęby, obejrzy buzię i odpowie na pytania.",
      "Lepiej: krótko, rzeczowo, bez straszenia i bez obietnic. Unikać: opowieści o wierceniu, bólu i własnych lękach.",
      "Co zwykle pomaga przed pierwszą wizytą: zabrać ulubioną zabawkę; umówić termin, gdy dziecko jest wypoczęte; nie robić z wizyty wielkiego wydarzenia; pozwolić dziecku zadawać pytania.",
      "W gabinecie dobrze działa pokazanie narzędzi i danie dziecku chwili na oswojenie się.",
      "Jeśli dziecko pyta o szczegóły, proszę odpowiadać uczciwie, ale krótko. Mają Państwo pytania? Proszę napisać lub umówić kontrolę.",
    ],
  },
];

/** The sample's catalogue entry (name = the on-screen hook, seconds). */
export function sampleOf(e: Pick<ExampleVideo, "locale" | "slug">): SampleVideo {
  const s = SAMPLE_VIDEOS[e.locale]?.find((v) => v.slug === e.slug);
  if (!s) throw new Error(`no sample ${e.locale}/${e.slug}`);
  return s;
}

/** In-app path of one example page (dentvideo.com/examples/<slug>, /de/examples/<slug> …). */
export function examplePath(e: Pick<ExampleVideo, "locale" | "slug">): string {
  return `${EXAMPLES_PATH[e.locale]}/${e.slug}`;
}

export function examplesFor(locale: Locale): ExampleVideo[] {
  return EXAMPLES.filter((e) => e.locale === locale);
}

export function findExample(locale: Locale, slug: string): ExampleVideo | undefined {
  return EXAMPLES.find((e) => e.locale === locale && e.slug === slug);
}

/** The examples on the same topic in other languages, plus itself (hreflang group); just itself without a topic. */
export function exampleTranslations(e: ExampleVideo): ExampleVideo[] {
  return e.topic ? EXAMPLES.filter((o) => o.topic === e.topic) : [e];
}

export const exampleVideoSrc = (e: Pick<ExampleVideo, "locale" | "slug">) => sampleSrc(e.locale, e.slug, "mp4");
export const examplePosterSrc = (e: Pick<ExampleVideo, "locale" | "slug">) => sampleSrc(e.locale, e.slug, "jpg");
