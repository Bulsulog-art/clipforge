import type { Locale } from "./dentvideo";

/**
 * Copy for the landing's visual "show, don't tell" sections, in every
 * language: the profile story (a demo clinic's profile today and four Mondays
 * later), the country rules the advertising reviewer is briefed with, and the
 * sample week's "video n of 5" labels.
 *
 * Same rules as content/dentvideo.ts: describe only what the product does
 * today, no figures that are not facts (five videos a week, so twenty in four
 * weeks), no follower counts, no promised patients or results, no testimonials.
 */

export type ShowcaseCopy = {
  /** The profile story. No "before/after" wording: that is a phrase health-advertising rules restrict. */
  feed: {
    eyebrow: string;
    heading: string;
    text: string;
    /** The demo clinic's name on the drawn profile (the sample week's own demo clinic). */
    clinic: string;
    today: string;
    todayCaption: string;
    later: string;
    laterCaption: string;
    note: string;
  };
  /** The country rules the reviewer is briefed with (worker/src/dental/locale.ts marketRules). */
  rules: { heading: string; text: string; gulf: string; note: string };
  /** Under each sample video: "Video {n} of 5" — the three samples are three of a week's five. */
  videoOf: string;
};

export const SHOWCASE: Record<Locale, ShowcaseCopy> = {
  en: {
    feed: {
      eyebrow: "Your profile",
      heading: "Four Mondays on your profile",
      text: "Patients look you up before they book. Here is a demo clinic's profile as it often starts, and after four weeks of DentVideo: twenty checked videos ready to share. Which ones go out, and when, is your call.",
      clinic: "Demo Dental Studio",
      today: "Today",
      todayCaption: "A few posts, months apart",
      later: "Four Mondays later",
      laterCaption: "Twenty checked videos ready to share",
      note: "Illustration with a demo clinic. You choose what to share.",
    },
    rules: {
      heading: "Your country's rules, too",
      text: "Every script is checked against the general health-advertising rules. For these markets, the reviewer is also briefed with the country's own rules:",
      gulf: "Gulf states",
      note: "We are not a law firm, and nothing goes out without your approval. Check anything unusual with your professional body.",
    },
    videoOf: "Video {n} of 5",
  },
  de: {
    feed: {
      eyebrow: "Ihr Profil",
      heading: "Vier Montage auf Ihrem Profil",
      text: "Patienten informieren sich online, bevor sie einen Termin buchen. So sieht das Profil einer Demo-Praxis oft am Anfang aus — und nach vier Wochen DentVideo: zwanzig geprüfte Videos, bereit zum Teilen. Was Sie davon wann veröffentlichen, entscheiden Sie.",
      clinic: "Demo Zahnarztpraxis",
      today: "Heute",
      todayCaption: "Ein paar Beiträge, Monate auseinander",
      later: "Vier Montage später",
      laterCaption: "Zwanzig geprüfte Videos, bereit zum Teilen",
      note: "Illustration mit einer Demo-Praxis. Was Sie teilen, entscheiden Sie.",
    },
    rules: {
      heading: "Auch die Regeln Ihres Landes",
      text: "Jedes Skript wird gegen die allgemeinen Regeln der Gesundheitswerbung geprüft. Für diese Märkte kennt der Prüfer zusätzlich die Regeln des jeweiligen Landes:",
      gulf: "Golfstaaten",
      note: "Wir sind keine Kanzlei, und nichts geht ohne Ihre Freigabe hinaus. Klären Sie Ungewöhnliches mit Ihrer Kammer.",
    },
    videoOf: "Video {n} von 5",
  },
  es: {
    feed: {
      eyebrow: "Tu perfil",
      heading: "Cuatro lunes en tu perfil",
      text: "Los pacientes te buscan antes de pedir cita. Así suele empezar el perfil de una clínica demo, y así queda tras cuatro semanas de DentVideo: veinte vídeos revisados, listos para compartir. Cuáles publicas, y cuándo, lo decides tú.",
      clinic: "Clínica Dental Demo",
      today: "Hoy",
      todayCaption: "Pocas publicaciones, con meses de distancia",
      later: "Cuatro lunes después",
      laterCaption: "Veinte vídeos revisados, listos para compartir",
      note: "Ilustración con una clínica demo. Tú decides qué compartir.",
    },
    rules: {
      heading: "También las normas de tu país",
      text: "Cada guion se revisa con las normas generales de publicidad sanitaria. En estos mercados, el revisor aplica además las normas propias del país:",
      gulf: "Países del Golfo",
      note: "No somos un despacho de abogados y nada se publica sin tu aprobación. Consulta lo que sea inusual con tu colegio profesional.",
    },
    videoOf: "Vídeo {n} de 5",
  },
  tr: {
    feed: {
      eyebrow: "Profiliniz",
      heading: "Profilinizde dört pazartesi",
      text: "Hastalar randevu almadan önce sizi internette arar. Bir demo kliniğin profili çoğu zaman böyle başlar; DentVideo ile dört hafta sonra ise paylaşıma hazır, kontrol edilmiş yirmi video vardır. Hangisinin ne zaman yayınlanacağına siz karar verirsiniz.",
      clinic: "Demo Diş Kliniği",
      today: "Bugün",
      todayCaption: "Aylar arayla birkaç paylaşım",
      later: "Dört pazartesi sonra",
      laterCaption: "Paylaşıma hazır, kontrol edilmiş yirmi video",
      note: "Demo klinikle hazırlanmış bir görseldir. Neyi paylaşacağınıza siz karar verirsiniz.",
    },
    rules: {
      heading: "Ülkenizin kuralları da",
      text: "Her metin, sağlık tanıtımına ilişkin genel kurallara göre kontrol edilir. Bu pazarlarda kontrolcü ayrıca ülkenin kendi kurallarını da uygular:",
      gulf: "Körfez ülkeleri",
      note: "Bir hukuk bürosu değiliz ve onayınız olmadan hiçbir şey yayınlanmaz. Alışılmadık durumları meslek kuruluşunuza danışın.",
    },
    videoOf: "Video {n} / 5",
  },
  fr: {
    feed: {
      eyebrow: "Votre profil",
      heading: "Quatre lundis sur votre profil",
      text: "Les patients vous cherchent en ligne avant de prendre rendez-vous. Voici le profil d'un cabinet démo tel qu'il commence souvent, puis après quatre semaines de DentVideo : vingt vidéos vérifiées, prêtes à partager. Lesquelles publier, et quand, c'est vous qui décidez.",
      clinic: "Cabinet Dentaire Démo",
      today: "Aujourd'hui",
      todayCaption: "Quelques publications, à des mois d'écart",
      later: "Quatre lundis plus tard",
      laterCaption: "Vingt vidéos vérifiées, prêtes à partager",
      note: "Illustration avec un cabinet démo. Vous choisissez ce que vous partagez.",
    },
    rules: {
      heading: "Les règles de votre pays aussi",
      text: "Chaque script est vérifié selon les règles générales de la publicité en santé. Pour ces marchés, le relecteur applique en plus les règles propres au pays :",
      gulf: "Pays du Golfe",
      note: "Nous ne sommes pas un cabinet d'avocats, et rien n'est publié sans votre accord. Pour tout cas inhabituel, consultez votre ordre professionnel.",
    },
    videoOf: "Vidéo {n} sur 5",
  },
  ja: {
    feed: {
      eyebrow: "医院のプロフィール",
      heading: "月曜日4回分で、プロフィールはこう変わります",
      text: "患者さんは予約の前に医院を検索します。デモ医院のプロフィールの、よくある始まりと、DentVideoを4週間使った後の様子です。チェック済みの動画20本が、シェアできる状態でそろいます。どれをいつ投稿するかは医院で決められます。",
      clinic: "デモ歯科クリニック",
      today: "現在",
      todayCaption: "数か月おきに数件の投稿",
      later: "月曜日4回の後",
      laterCaption: "シェアできるチェック済み動画20本",
      note: "デモ医院によるイメージです。何をシェアするかは医院で決められます。",
    },
    rules: {
      heading: "国ごとのルールも",
      text: "すべての台本を、医療広告に関する一般的なルールでチェックします。以下の国・地域では、その国のルールもチェック担当に組み込んでいます。",
      gulf: "湾岸諸国",
      note: "当社は法律事務所ではありません。院長先生の承認なしに公開されることはありません。判断に迷う場合は所属の歯科医師会にご確認ください。",
    },
    videoOf: "5本中{n}本目",
  },
  ar: {
    feed: {
      eyebrow: "ملفكم الشخصي",
      heading: "أربعة أيام اثنين على ملفكم",
      text: "يبحث المرضى عن العيادة قبل أن يحجزوا. هذا ملف عيادة تجريبية كما يبدأ غالباً، ثم بعد أربعة أسابيع مع DentVideo: عشرون فيديو مُراجَعاً جاهزاً للمشاركة. أنتم تقررون ما يُنشر ومتى.",
      clinic: "عيادة ديمو لطب الأسنان",
      today: "اليوم",
      todayCaption: "منشورات قليلة تفصل بينها أشهر",
      later: "بعد أربعة أيام اثنين",
      laterCaption: "عشرون فيديو مُراجَعاً جاهزاً للمشاركة",
      note: "صورة توضيحية بعيادة تجريبية. أنتم تختارون ما تشاركونه.",
    },
    rules: {
      heading: "وقواعد بلدكم أيضاً",
      text: "يُراجَع كل نص وفق القواعد العامة للإعلان الصحي. وفي هذه الأسواق، يطبّق المراجِع أيضاً قواعد البلد نفسه:",
      gulf: "دول الخليج",
      note: "لسنا مكتب محاماة، ولا يُنشر شيء دون موافقتكم. راجعوا الجهة المهنية المختصة في أي حالة غير معتادة.",
    },
    videoOf: "الفيديو {n} من 5",
  },
  pl: {
    feed: {
      eyebrow: "Profil gabinetu",
      heading: "Cztery poniedziałki na Państwa profilu",
      text: "Pacjenci szukają gabinetu w sieci, zanim się umówią. Tak często wygląda profil gabinetu demo na początku — i po czterech tygodniach z DentVideo: dwadzieścia sprawdzonych filmów gotowych do udostępnienia. Które i kiedy opublikować, decydują Państwo.",
      clinic: "Gabinet Stomatologiczny Demo",
      today: "Dziś",
      todayCaption: "Kilka postów, w odstępach miesięcy",
      later: "Cztery poniedziałki później",
      laterCaption: "Dwadzieścia sprawdzonych filmów gotowych do udostępnienia",
      note: "Ilustracja z gabinetem demo. To Państwo wybierają, co udostępnić.",
    },
    rules: {
      heading: "Także przepisy Państwa kraju",
      text: "Każdy scenariusz jest sprawdzany według ogólnych zasad reklamy usług zdrowotnych. Na tych rynkach recenzent stosuje dodatkowo przepisy danego kraju:",
      gulf: "Państwa Zatoki",
      note: "Nie jesteśmy kancelarią prawną i nic nie zostanie opublikowane bez Państwa zgody. Nietypowe przypadki prosimy skonsultować z izbą lekarską.",
    },
    videoOf: "Film {n} z 5",
  },
};

/**
 * The markets whose own advertising rules the reviewer is given, in
 * worker/src/dental/locale.ts `marketRules` (dentvideo-showcase.test.ts keeps
 * this list in step with that file). `rule` is the rule's own name, never
 * translated; "GULF" is the six GCC states that share one rule set there.
 */
export type RuleMarket = { code: "TR" | "DE" | "AT" | "CH" | "ES" | "MX" | "JP" | "GULF" | "PL" | "SG"; rule: string };

export const RULE_MARKETS: readonly RuleMarket[] = [
  { code: "TR", rule: "Tanıtım ve Bilgilendirme Yönetmeliği (2025)" },
  { code: "DE", rule: "HWG · Berufsordnung" },
  { code: "AT", rule: "ZÄG § 35" },
  { code: "CH", rule: "MedBG Art. 40" },
  { code: "ES", rule: "RD 1907/1996" },
  { code: "MX", rule: "Ley General de Salud · COFEPRIS" },
  { code: "JP", rule: "医療法 · 医療広告ガイドライン" },
  { code: "GULF", rule: "DHA · DoH · MOHAP · MOH" },
  { code: "PL", rule: "Kodeks Etyki Lekarskiej, art. 71" },
  { code: "SG", rule: "HCS (Advertisement) Regulations 2021" },
];

/** The page's own markets first (a Turkish page leads with Türkiye), then the rest in the order above. */
const HOME_MARKETS: Record<Locale, RuleMarket["code"][]> = {
  en: [],
  de: ["DE", "AT", "CH"],
  es: ["ES", "MX"],
  tr: ["TR"],
  fr: ["CH"],
  ja: ["JP"],
  ar: ["GULF"],
  pl: ["PL"],
};

export function ruleMarketsFor(locale: Locale): RuleMarket[] {
  const home = HOME_MARKETS[locale];
  return [...RULE_MARKETS].sort((a, b) => {
    const ia = home.indexOf(a.code);
    const ib = home.indexOf(b.code);
    return (ia < 0 ? home.length : ia) - (ib < 0 ? home.length : ib);
  });
}

/** A market's name in the page's language (Intl's CLDR names; the Gulf from the copy). */
export function marketName(locale: Locale, code: RuleMarket["code"]): string {
  if (code === "GULF") return SHOWCASE[locale].rules.gulf;
  return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
}
