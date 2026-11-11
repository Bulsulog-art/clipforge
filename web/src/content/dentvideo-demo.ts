import type { Locale } from "./dentvideo";
import { OPERATOR } from "./guides/operator";

/**
 * Copy of the personalised demo page (/<lang>/d/<token>) and of the direct
 * message the owner sends with it, in every site language.
 *
 * Rules (the same as the landing's):
 * - only true facts: the list price ($49 Starter), the founding offer exactly
 *   as it is sold (Practice at $49/month for the first 12 months, first 100
 *   clinics — shown only while it is open), no contract, approval before
 *   anything is posted, scripts checked against the country's rules;
 * - no fake urgency, no countdowns, no "only today";
 * - the message asks for permission first and sends the link only after a
 *   yes; it says how to stop further messages.
 *
 * {name} is the clinic's name, {url} the demo link, {sender} the founder.
 */

export type DemoCopy = {
  metaTitle: string;
  eyebrow: string;
  headline: string;
  lead: string;
  points: [string, string, string];
  factsTitle: string;
  facts: { from: string; founding: string; cancel: string; approve: string; rules: string };
  cta: string;
  ctaNote: string;
  ask: string;
  mailSubject: string;
  sample: string;
  privacy: string;
  /** The first message: asks whether the link may be sent. */
  dmAsk: string;
  /** After a yes: the link and the facts. */
  dmLink: { thanks: string; facts: string; founding: string; close: string };
};

export const DEMO_SENDER = OPERATOR.director.split(" ")[0];

export const DEMO_COPY: Record<Locale, DemoCopy> = {
  en: {
    metaTitle: "A preview for {name}",
    eyebrow: "Made for {name}",
    headline: "{name}, this is what your Monday videos could look like",
    lead: "A sample week in your colours and with your logo, playing right here. No sign-up needed.",
    points: [
      "Five narrated, captioned patient-education videos every Monday.",
      "Record five minutes on your phone — or we write and narrate the topics for you.",
      "You watch, approve with one tap and share. Nothing is posted without you.",
    ],
    factsTitle: "The facts",
    facts: {
      from: "From $49/month.",
      founding: "Founding price: Practice for $49/month for your first 12 months — for the first 100 clinics.",
      cancel: "No contract — cancel anytime.",
      approve: "You approve every video before it is posted.",
      rules: "Every script is checked against the health-advertising rules of your country.",
    },
    cta: "Start with these settings",
    ctaNote: "Your clinic name, colour and logo are already filled in.",
    ask: "Ask a question",
    mailSubject: "Question about DentVideo ({name})",
    sample: "These are sample videos from our library, shown in your colours. Your real videos are about the treatments you offer.",
    privacy: "We made this page for {name} from public business information. It is deleted after 60 days. To have it removed sooner, write to hello@dentvideo.com.",
    dmAsk:
      "Hi {name} team, I'm {sender} from DentVideo. We make short patient-education videos for dental clinics. I put together a small preview in your clinic's colours — may I send you the link? If it's not for you, no problem at all: just say so and I won't message again.",
    dmLink: {
      thanks: "Thank you! Here is the preview (no sign-up): {url}",
      facts: "Five videos every Monday; nothing is shared without your approval. Plans start at $49/month, no contract.",
      founding: "For the first 100 clinics there is a founding price: Practice for $49/month for the first 12 months.",
      close: "Happy to answer any questions here.",
    },
  },
  tr: {
    metaTitle: "{name} için bir önizleme",
    eyebrow: "{name} için hazırlandı",
    headline: "{name}, pazartesi videolarınız böyle görünebilir",
    lead: "Renklerinizle ve logonuzla örnek bir hafta, burada oynuyor. Kayıt gerekmez.",
    points: [
      "Her pazartesi beş seslendirmeli, altyazılı hasta bilgilendirme videosu.",
      "Telefonla beş dakikalık bir kayıt yeterli — ya da konuları biz yazar ve seslendiririz.",
      "İzlersiniz, tek dokunuşla onaylar ve paylaşırsınız. Onayınız olmadan hiçbir şey yayınlanmaz.",
    ],
    factsTitle: "Kısaca",
    facts: {
      from: "Aylık $49'dan başlayan fiyatlar.",
      founding: "Kurucu fiyatı: ilk 100 klinik için Practice, ilk 12 ay aylık $49.",
      cancel: "Sözleşme yok — istediğiniz zaman iptal edebilirsiniz.",
      approve: "Her video, paylaşılmadan önce sizin onayınızdan geçer.",
      rules: "Her metin, ülkenizin sağlık reklamı kurallarına göre kontrol edilir.",
    },
    cta: "Bu ayarlarla başla",
    ctaNote: "Klinik adınız, renginiz ve logonuz hazır doldurulmuş olur.",
    ask: "Soru sor",
    mailSubject: "DentVideo hakkında soru ({name})",
    sample: "Bunlar kütüphanemizden örnek videolar, sizin renklerinizle. Gerçek videolarınız sunduğunuz tedaviler hakkında olur.",
    privacy: "Bu sayfayı {name} için herkese açık işletme bilgilerinden hazırladık. 60 gün sonra silinir. Daha önce silinmesini isterseniz hello@dentvideo.com adresine yazın.",
    dmAsk:
      "Merhaba {name} ekibi, ben DentVideo'dan {sender}. Diş klinikleri için kısa hasta bilgilendirme videoları hazırlıyoruz. Kliniğiniz için, kendi renklerinizle küçük bir önizleme hazırladım — linkini göndermemi ister misiniz? İlginizi çekmezse hiç sorun değil; haber vermeniz yeterli, bir daha yazmam.",
    dmLink: {
      thanks: "Teşekkürler! Önizleme burada (kayıt gerekmez): {url}",
      facts: "Her pazartesi beş video; onayınız olmadan hiçbir şey paylaşılmaz. Fiyatlar aylık $49'dan başlıyor, sözleşme yok.",
      founding: "İlk 100 klinik için kurucu fiyatı var: Practice, ilk 12 ay aylık $49.",
      close: "Sorunuz olursa buradan yazabilirsiniz.",
    },
  },
  de: {
    metaTitle: "Eine Vorschau für {name}",
    eyebrow: "Für {name} erstellt",
    headline: "{name}, so könnten Ihre Montagsvideos aussehen",
    lead: "Eine Beispielwoche in Ihren Farben und mit Ihrem Logo, direkt hier abgespielt. Ohne Anmeldung.",
    points: [
      "Jeden Montag fünf vertonte, untertitelte Videos zur Patientenaufklärung.",
      "Fünf Minuten mit dem Handy aufnehmen – oder wir schreiben und vertonen die Themen für Sie.",
      "Sie sehen sie an, geben sie mit einem Tipp frei und teilen sie. Ohne Sie wird nichts veröffentlicht.",
    ],
    factsTitle: "Die Fakten",
    facts: {
      from: "Ab 49 $/Monat.",
      founding: "Gründungspreis: Practice für 49 $/Monat in den ersten 12 Monaten – für die ersten 100 Praxen.",
      cancel: "Kein Vertrag – jederzeit kündbar.",
      approve: "Jedes Video wird erst nach Ihrer Freigabe geteilt.",
      rules: "Jedes Skript wird anhand der Werberegeln für Heilberufe in Ihrem Land geprüft.",
    },
    cta: "Mit diesen Einstellungen starten",
    ctaNote: "Praxisname, Farbe und Logo sind schon ausgefüllt.",
    ask: "Frage stellen",
    mailSubject: "Frage zu DentVideo ({name})",
    sample: "Das sind Beispielvideos aus unserer Bibliothek in Ihren Farben. Ihre echten Videos handeln von den Behandlungen, die Sie anbieten.",
    privacy: "Wir haben diese Seite für {name} aus öffentlichen Geschäftsangaben erstellt. Sie wird nach 60 Tagen gelöscht. Wenn Sie sie früher entfernen lassen möchten, schreiben Sie an hello@dentvideo.com.",
    dmAsk:
      "Guten Tag, liebes Team von {name}, ich bin {sender} von DentVideo. Wir erstellen kurze Aufklärungsvideos für Zahnarztpraxen. Ich habe eine kleine Vorschau in Ihren Praxisfarben vorbereitet – darf ich Ihnen den Link schicken? Falls kein Interesse besteht, ist das völlig in Ordnung: Ein kurzes Nein genügt, und ich melde mich nicht wieder.",
    dmLink: {
      thanks: "Danke! Hier ist die Vorschau (ohne Anmeldung): {url}",
      facts: "Jeden Montag fünf Videos; nichts wird ohne Ihre Freigabe geteilt. Ab 49 $/Monat, ohne Vertrag.",
      founding: "Für die ersten 100 Praxen gibt es einen Gründungspreis: Practice für 49 $/Monat in den ersten 12 Monaten.",
      close: "Bei Fragen schreiben Sie mir gern hier.",
    },
  },
  es: {
    metaTitle: "Una vista previa para {name}",
    eyebrow: "Preparado para {name}",
    headline: "{name}, así podrían ser sus vídeos de cada lunes",
    lead: "Una semana de ejemplo con sus colores y su logo, reproducida aquí mismo. Sin registro.",
    points: [
      "Cinco vídeos educativos para pacientes, narrados y subtitulados, cada lunes.",
      "Grabe cinco minutos con el móvil, o nosotros escribimos y narramos los temas.",
      "Usted los ve, los aprueba con un toque y los comparte. No se publica nada sin usted.",
    ],
    factsTitle: "Los datos",
    facts: {
      from: "Desde 49 $/mes.",
      founding: "Precio fundador: Practice por 49 $/mes durante los primeros 12 meses, para las primeras 100 clínicas.",
      cancel: "Sin contrato: cancele cuando quiera.",
      approve: "Usted aprueba cada vídeo antes de publicarlo.",
      rules: "Cada guion se revisa según las normas de publicidad sanitaria de su país.",
    },
    cta: "Empezar con estos ajustes",
    ctaNote: "El nombre de su clínica, su color y su logo ya estarán rellenados.",
    ask: "Hacer una pregunta",
    mailSubject: "Pregunta sobre DentVideo ({name})",
    sample: "Son vídeos de ejemplo de nuestra biblioteca, con sus colores. Sus vídeos reales tratarán de los tratamientos que usted ofrece.",
    privacy: "Hemos creado esta página para {name} a partir de información comercial pública. Se borra a los 60 días. Si quiere que la eliminemos antes, escriba a hello@dentvideo.com.",
    dmAsk:
      "Hola, equipo de {name}: soy {sender}, de DentVideo. Hacemos vídeos cortos de educación para pacientes para clínicas dentales. He preparado una pequeña vista previa con los colores de su clínica, ¿les puedo enviar el enlace? Si no les interesa, no pasa nada: díganmelo y no vuelvo a escribir.",
    dmLink: {
      thanks: "¡Gracias! Aquí está la vista previa (sin registro): {url}",
      facts: "Cinco vídeos cada lunes; nada se comparte sin su aprobación. Desde 49 $/mes, sin contrato.",
      founding: "Para las primeras 100 clínicas hay un precio fundador: Practice por 49 $/mes durante los primeros 12 meses.",
      close: "Si tienen alguna pregunta, escríbanme por aquí.",
    },
  },
  fr: {
    metaTitle: "Un aperçu pour {name}",
    eyebrow: "Préparé pour {name}",
    headline: "{name}, voici à quoi pourraient ressembler vos vidéos du lundi",
    lead: "Une semaine d'exemple à vos couleurs et avec votre logo, lue ici même. Sans inscription.",
    points: [
      "Cinq vidéos d'information patient, narrées et sous-titrées, chaque lundi.",
      "Enregistrez cinq minutes avec votre téléphone, ou nous écrivons et narrons les sujets pour vous.",
      "Vous les regardez, les validez d'un geste et les partagez. Rien n'est publié sans vous.",
    ],
    factsTitle: "L'essentiel",
    facts: {
      from: "À partir de 49 $/mois.",
      founding: "Prix fondateur : Practice à 49 $/mois pendant les 12 premiers mois, pour les 100 premiers cabinets.",
      cancel: "Sans engagement : résiliable à tout moment.",
      approve: "Vous validez chaque vidéo avant sa publication.",
      rules: "Chaque script est vérifié selon les règles de publicité en santé de votre pays.",
    },
    cta: "Commencer avec ces réglages",
    ctaNote: "Le nom du cabinet, la couleur et le logo seront déjà remplis.",
    ask: "Poser une question",
    mailSubject: "Question sur DentVideo ({name})",
    sample: "Ce sont des vidéos d'exemple de notre bibliothèque, à vos couleurs. Vos vraies vidéos porteront sur les soins que vous proposez.",
    privacy: "Nous avons créé cette page pour {name} à partir d'informations professionnelles publiques. Elle est supprimée au bout de 60 jours. Pour la faire supprimer plus tôt, écrivez à hello@dentvideo.com.",
    dmAsk:
      "Bonjour à l'équipe de {name}, je suis {sender}, de DentVideo. Nous réalisons de courtes vidéos d'information patient pour les cabinets dentaires. J'ai préparé un petit aperçu aux couleurs de votre cabinet : puis-je vous envoyer le lien ? Si cela ne vous intéresse pas, aucun souci — dites-le-moi simplement et je ne vous écrirai plus.",
    dmLink: {
      thanks: "Merci ! Voici l'aperçu (sans inscription) : {url}",
      facts: "Cinq vidéos chaque lundi ; rien n'est partagé sans votre validation. À partir de 49 $/mois, sans engagement.",
      founding: "Pour les 100 premiers cabinets, il existe un prix fondateur : Practice à 49 $/mois pendant les 12 premiers mois.",
      close: "Pour toute question, écrivez-moi ici.",
    },
  },
  ja: {
    metaTitle: "{name}様へのプレビュー",
    eyebrow: "{name}様のために作成",
    headline: "{name}様、毎週月曜日の動画はこんなふうになります",
    lead: "医院のカラーとロゴで作ったサンプルの1週間を、このページで再生しています。登録は不要です。",
    points: [
      "毎週月曜日に、ナレーションと字幕付きの患者さん向け解説動画を5本。",
      "スマートフォンで5分録画するだけ。または、テーマに沿って私たちが原稿とナレーションを用意します。",
      "確認して、ワンタップで承認し、共有するだけ。承認なしに公開されることはありません。",
    ],
    factsTitle: "ポイント",
    facts: {
      from: "月額49ドルから。",
      founding: "創業メンバー価格：先着100医院は、Practiceプランが最初の12か月間 月額49ドル。",
      cancel: "契約の縛りなし。いつでも解約できます。",
      approve: "すべての動画は、公開前に先生ご自身が承認します。",
      rules: "すべての原稿を、貴院がある国の医療広告ルールに沿ってチェックします。",
    },
    cta: "この設定で始める",
    ctaNote: "医院名・カラー・ロゴは入力済みの状態で始まります。",
    ask: "質問する",
    mailSubject: "DentVideoについての質問（{name}）",
    sample: "これは当社ライブラリのサンプル動画を、医院のカラーで表示したものです。実際の動画は、貴院で提供している治療についての内容になります。",
    privacy: "このページは、公開されている事業者情報をもとに{name}様向けに作成しました。60日後に削除されます。早めの削除をご希望の場合は hello@dentvideo.com までご連絡ください。",
    dmAsk:
      "{name}の皆さま、はじめまして。DentVideoの{sender}と申します。歯科医院向けに、患者さん向けの短い解説動画を制作しています。貴院のカラーで小さなプレビューを作ってみたのですが、リンクをお送りしてもよろしいでしょうか？ご興味がなければ、その旨お知らせいただければ、今後ご連絡はいたしません。",
    dmLink: {
      thanks: "ありがとうございます！プレビューはこちらです（登録不要）：{url}",
      facts: "毎週月曜日に5本。承認なしに共有されることはありません。料金は月額49ドルから、契約の縛りはありません。",
      founding: "先着100医院には創業メンバー価格があり、Practiceプランが最初の12か月間 月額49ドルです。",
      close: "ご質問があれば、こちらにお気軽にどうぞ。",
    },
  },
  ar: {
    metaTitle: "معاينة لـ {name}",
    eyebrow: "أُعدّت خصيصًا لـ {name}",
    headline: "{name}، هكذا يمكن أن تبدو فيديوهاتكم كل يوم اثنين",
    lead: "أسبوع تجريبي بألوانكم وشعاركم، يُعرض هنا مباشرة. دون تسجيل.",
    points: [
      "كل يوم اثنين، خمسة فيديوهات توعوية للمرضى بتعليق صوتي وترجمة نصية.",
      "سجّلوا خمس دقائق بالهاتف، أو نكتب نحن المواضيع ونسجّل التعليق الصوتي.",
      "تشاهدون، وتوافقون بلمسة واحدة، ثم تشاركون. لا يُنشر شيء دون موافقتكم.",
    ],
    factsTitle: "باختصار",
    facts: {
      from: "ابتداءً من 49 دولارًا شهريًا.",
      founding: "سعر المؤسسين: خطة Practice بـ 49 دولارًا شهريًا لأول 12 شهرًا، لأول 100 عيادة.",
      cancel: "دون عقد، ويمكن الإلغاء في أي وقت.",
      approve: "توافقون على كل فيديو قبل نشره.",
      rules: "يُراجَع كل نص وفق قواعد الإعلان الصحي في بلدكم.",
    },
    cta: "ابدأ بهذه الإعدادات",
    ctaNote: "سيكون اسم العيادة واللون والشعار معبّأة مسبقًا.",
    ask: "اطرح سؤالًا",
    mailSubject: "سؤال عن DentVideo ({name})",
    sample: "هذه فيديوهات نموذجية من مكتبتنا بألوانكم. فيديوهاتكم الفعلية ستتناول العلاجات التي تقدمونها.",
    privacy: "أعددنا هذه الصفحة لـ {name} من معلومات تجارية متاحة للعموم. تُحذف بعد 60 يومًا. لحذفها قبل ذلك، راسلونا على hello@dentvideo.com.",
    dmAsk:
      "مرحبًا فريق {name}، أنا {sender} من DentVideo. نُعدّ فيديوهات قصيرة لتوعية المرضى لعيادات الأسنان. جهّزت معاينة صغيرة بألوان عيادتكم — هل تسمحون لي بإرسال الرابط؟ إن لم يكن الأمر يهمكم فلا مشكلة إطلاقًا، يكفي أن تخبروني ولن أراسلكم مجددًا.",
    dmLink: {
      thanks: "شكرًا لكم! هذه هي المعاينة (دون تسجيل): {url}",
      facts: "خمسة فيديوهات كل يوم اثنين، ولا يُشارَك شيء دون موافقتكم. الأسعار تبدأ من 49 دولارًا شهريًا، دون عقد.",
      founding: "لأول 100 عيادة سعر المؤسسين: خطة Practice بـ 49 دولارًا شهريًا خلال أول 12 شهرًا.",
      close: "لأي سؤال، راسلوني هنا.",
    },
  },
  pl: {
    metaTitle: "Podgląd dla: {name}",
    eyebrow: "Przygotowane dla: {name}",
    headline: "{name}, tak mogłyby wyglądać Państwa poniedziałkowe filmy",
    lead: "Przykładowy tydzień w Państwa kolorach i z Państwa logo, odtwarzany tutaj. Bez rejestracji.",
    points: [
      "Co poniedziałek pięć edukacyjnych filmów dla pacjentów, z lektorem i napisami.",
      "Wystarczy pięć minut nagrania telefonem — albo to my piszemy tematy i nagrywamy lektora.",
      "Państwo oglądają, zatwierdzają jednym dotknięciem i udostępniają. Nic nie zostanie opublikowane bez Państwa.",
    ],
    factsTitle: "Najważniejsze",
    facts: {
      from: "Od 49 $ miesięcznie.",
      founding: "Cena założycielska: Practice za 49 $ miesięcznie przez pierwsze 12 miesięcy — dla pierwszych 100 gabinetów.",
      cancel: "Bez umowy — można zrezygnować w każdej chwili.",
      approve: "Każdy film zatwierdzają Państwo przed publikacją.",
      rules: "Każdy scenariusz jest sprawdzany pod kątem zasad reklamy usług medycznych w Państwa kraju.",
    },
    cta: "Zacznij z tymi ustawieniami",
    ctaNote: "Nazwa gabinetu, kolor i logo będą już wypełnione.",
    ask: "Zadaj pytanie",
    mailSubject: "Pytanie o DentVideo ({name})",
    sample: "To przykładowe filmy z naszej biblioteki w Państwa kolorach. Prawdziwe filmy będą o zabiegach, które Państwo oferują.",
    privacy: "Tę stronę przygotowaliśmy dla: {name} na podstawie publicznych informacji o firmie. Zostanie usunięta po 60 dniach. Aby usunąć ją wcześniej, prosimy napisać na hello@dentvideo.com.",
    dmAsk:
      "Dzień dobry, zespół {name}! Nazywam się {sender} i piszę z DentVideo. Tworzymy krótkie filmy edukacyjne dla pacjentów gabinetów stomatologicznych. Przygotowałem mały podgląd w kolorach Państwa gabinetu — czy mogę przesłać link? Jeśli to nie dla Państwa, nie ma problemu: wystarczy krótka odpowiedź, a nie napiszę ponownie.",
    dmLink: {
      thanks: "Dziękuję! Oto podgląd (bez rejestracji): {url}",
      facts: "Pięć filmów co poniedziałek; nic nie jest udostępniane bez Państwa zgody. Od 49 $ miesięcznie, bez umowy.",
      founding: "Dla pierwszych 100 gabinetów jest cena założycielska: Practice za 49 $ miesięcznie przez pierwsze 12 miesięcy.",
      close: "W razie pytań proszę pisać tutaj.",
    },
  },
};

export function fillDemo(s: string, vars: { name?: string; url?: string }): string {
  return s
    .split("{name}").join(vars.name ?? "")
    .split("{url}").join(vars.url ?? "")
    .split("{sender}").join(DEMO_SENDER);
}

/** The two messages the owner sends: first the permission question, then (after a yes) the link. */
export function demoMessages(locale: Locale, name: string, url: string, foundingOpen: boolean): { ask: string; link: string } {
  const t = DEMO_COPY[locale];
  const link = [t.dmLink.thanks, t.dmLink.facts, foundingOpen ? t.dmLink.founding : null, t.dmLink.close]
    .filter(Boolean)
    .map((s) => fillDemo(s!, { name, url }))
    .join("\n\n");
  return { ask: fillDemo(t.dmAsk, { name, url }), link };
}
