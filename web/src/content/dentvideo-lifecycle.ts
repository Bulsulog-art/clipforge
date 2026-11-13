import { SEQUENCE_COPY, type SequenceCopy } from "./dentvideo-lifecycle-sequence";

/**
 * Lifecycle email copy: the welcome after the first payment, the shared
 * pieces (greeting, sign-off, footers, unsubscribe) and the unsubscribe page.
 * The activation sequence and the paying-clinic emails are in
 * dentvideo-lifecycle-sequence.ts; both are merged into LIFECYCLE_COPY. One
 * entry per site language, all with the same shape and the same
 * {placeholders} (lifecycle-copy.test.ts checks this).
 *
 * Claims stay inside what the product does and the site already says
 * (checked videos, nothing published without approval, about 15 minutes,
 * every Monday, monthly and cancel anytime). No guarantees, no promised
 * patients, no invented scarcity.
 *
 * Placeholders: {clinic} {email}.
 */

export type LifecycleBase = {
  hello: string;
  signoff: string;
  contact: string;
  nudgeFooter: string;
  unsubscribeAsk: string;
  unsubscribe: string;
  welcome: {
    subject: string;
    preheader: string;
    intro: string;
    steps: { title: string; body: string }[];
    button: string;
    footer: string;
  };
  unsubPage: {
    confirmTitle: string;
    confirmBody: string;
    confirmButton: string;
    title: string;
    body: string;
    invalidTitle: string;
    invalidBody: string;
    errorTitle: string;
    errorBody: string;
    back: string;
  };
};

export type LifecycleCopy = LifecycleBase & SequenceCopy;

const BASE_COPY: Record<string, LifecycleBase> = {
  en: {
    hello: "Hello {clinic},",
    signoff: "The DentVideo team",
    contact: "Questions? Just reply to this email.",
    nudgeFooter: "You get this email because you started setting up DentVideo for your clinic. We send at most four short emails, and stop as soon as you choose a plan.",
    unsubscribeAsk: "Don't want reminders?",
    unsubscribe: "Unsubscribe",
    welcome: {
      subject: "Welcome to DentVideo, {clinic}",
      preheader: "Your first videos are being made now — about 15 minutes.",
      intro: "Thank you for choosing DentVideo. Here is what happens next.",
      steps: [
        { title: "Your first week: about 15 minutes", body: "We're making this week's videos now. We'll email you as soon as they're ready for your review." },
        { title: "Then every Monday", body: "New, checked videos arrive in your library each Monday, and an email lets you know." },
        { title: "Approve, then share", body: "Watch each video and approve it — nothing is published until you do. Tap Share and the caption is copied for you to paste." },
        { title: "We're here", body: "Questions, changes or feedback: reply to this email or write to {email}." },
      ],
      button: "Open my library",
      footer: "You get this email because your clinic subscribed to DentVideo.",
    },
    unsubPage: {
      confirmTitle: "Unsubscribe from reminders?",
      confirmBody: "You'll stop getting reminders, weekly nudges and monthly summaries from DentVideo. Emails about your account, payments and ready videos still arrive.",
      confirmButton: "Unsubscribe",
      title: "You're unsubscribed",
      body: "Done. We won't send you any more reminders or summaries. Emails about your account, payments and ready videos still arrive.",
      invalidTitle: "This link doesn't work",
      invalidBody: "Write to {email} and we'll unsubscribe you by hand.",
      errorTitle: "That didn't save",
      errorBody: "Please try the link again in a minute, or write to {email}.",
      back: "Go to DentVideo",
    },
  },
  de: {
    hello: "Guten Tag, {clinic},",
    signoff: "Ihr DentVideo-Team",
    contact: "Fragen? Antworten Sie einfach auf diese E-Mail.",
    nudgeFooter: "Sie erhalten diese E-Mail, weil Sie begonnen haben, DentVideo für Ihre Praxis einzurichten. Wir schicken höchstens vier kurze E-Mails und hören auf, sobald Sie einen Tarif wählen.",
    unsubscribeAsk: "Keine Erinnerungen mehr?",
    unsubscribe: "Abmelden",
    welcome: {
      subject: "Willkommen bei DentVideo, {clinic}",
      preheader: "Ihre ersten Videos entstehen gerade – in etwa 15 Minuten.",
      intro: "Ihr Tarif ist aktiv – vielen Dank für Ihr Vertrauen. So geht es weiter.",
      steps: [
        { title: "Ihre erste Woche: etwa 15 Minuten", body: "Die Videos dieser Woche entstehen gerade. Sobald sie zur Freigabe bereitstehen, schicken wir Ihnen eine E-Mail." },
        { title: "Danach jeden Montag", body: "Jeden Montag liegen neue, geprüfte Videos in Ihrer Bibliothek – eine E-Mail sagt Ihnen Bescheid." },
        { title: "Freigeben, dann teilen", body: "Sehen Sie sich jedes Video an und geben Sie es frei – ohne Ihre Freigabe wird nichts veröffentlicht. Tippen Sie auf „Teilen“, und die Bildunterschrift wird für Sie kopiert." },
        { title: "Wir sind für Sie da", body: "Fragen, Änderungswünsche oder Feedback: Antworten Sie auf diese E-Mail oder schreiben Sie an {email}." },
      ],
      button: "Meine Bibliothek öffnen",
      footer: "Sie erhalten diese E-Mail, weil Ihre Praxis DentVideo abonniert hat.",
    },
    unsubPage: {
      confirmTitle: "Von Erinnerungen abmelden?",
      confirmBody: "Sie erhalten dann keine Erinnerungen und Monatsübersichten mehr von DentVideo. E-Mails zu Ihrem Konto, zu Zahlungen und zu fertigen Videos kommen weiterhin.",
      confirmButton: "Abmelden",
      title: "Sie sind abgemeldet",
      body: "Erledigt. Wir schicken Ihnen keine Erinnerungen und Übersichten mehr. E-Mails zu Ihrem Konto, zu Zahlungen und zu fertigen Videos kommen weiterhin.",
      invalidTitle: "Dieser Link funktioniert nicht",
      invalidBody: "Schreiben Sie an {email}, dann melden wir Sie von Hand ab.",
      errorTitle: "Das hat nicht geklappt",
      errorBody: "Bitte öffnen Sie den Link in einer Minute erneut oder schreiben Sie an {email}.",
      back: "Zu DentVideo",
    },
  },
  es: {
    hello: "Hola, {clinic}:",
    signoff: "El equipo de DentVideo",
    contact: "¿Dudas? Responde a este correo.",
    nudgeFooter: "Recibes este correo porque empezaste a configurar DentVideo para tu clínica. Enviamos como máximo cuatro correos breves y paramos en cuanto eliges un plan.",
    unsubscribeAsk: "¿No quieres recordatorios?",
    unsubscribe: "Darse de baja",
    welcome: {
      subject: "Te damos la bienvenida a DentVideo, {clinic}",
      preheader: "Tus primeros vídeos se están creando: unos 15 minutos.",
      intro: "Gracias por elegir DentVideo. Esto es lo que pasa ahora.",
      steps: [
        { title: "Tu primera semana: unos 15 minutos", body: "Estamos creando los vídeos de esta semana. Te escribiremos en cuanto estén listos para revisar." },
        { title: "Después, cada lunes", body: "Cada lunes llegan a tu biblioteca vídeos nuevos y revisados, y te avisamos por correo." },
        { title: "Aprueba y comparte", body: "Mira cada vídeo y apruébalo: no se publica nada sin tu aprobación. Toca Compartir y el texto se copia para que lo pegues." },
        { title: "Estamos aquí", body: "Dudas, cambios o comentarios: responde a este correo o escribe a {email}." },
      ],
      button: "Abrir mi biblioteca",
      footer: "Recibes este correo porque tu clínica se ha suscrito a DentVideo.",
    },
    unsubPage: {
      confirmTitle: "¿Darte de baja de los recordatorios?",
      confirmBody: "Dejarás de recibir recordatorios y resúmenes mensuales de DentVideo. Los correos sobre tu cuenta, tus pagos y tus vídeos listos seguirán llegando.",
      confirmButton: "Darme de baja",
      title: "Te has dado de baja",
      body: "Hecho. No te enviaremos más recordatorios ni resúmenes. Los correos sobre tu cuenta, tus pagos y tus vídeos listos seguirán llegando.",
      invalidTitle: "Este enlace no funciona",
      invalidBody: "Escribe a {email} y te daremos de baja a mano.",
      errorTitle: "No se ha podido guardar",
      errorBody: "Vuelve a abrir el enlace en un minuto o escribe a {email}.",
      back: "Ir a DentVideo",
    },
  },
  tr: {
    hello: "Merhaba {clinic},",
    signoff: "DentVideo ekibi",
    contact: "Sorunuz mu var? Bu e-postayı yanıtlamanız yeterli.",
    nudgeFooter: "Bu e-postayı, kliniğiniz için DentVideo kurulumuna başladığınız için alıyorsunuz. En fazla dört kısa e-posta göndeririz ve bir plan seçtiğiniz anda dururuz.",
    unsubscribeAsk: "Hatırlatma istemiyor musunuz?",
    unsubscribe: "Abonelikten çık",
    welcome: {
      subject: "DentVideo'ya hoş geldiniz, {clinic}",
      preheader: "İlk videolarınız şu anda hazırlanıyor — yaklaşık 15 dakika.",
      intro: "DentVideo'yu seçtiğiniz için teşekkürler. Bundan sonra olacaklar:",
      steps: [
        { title: "İlk haftanız: yaklaşık 15 dakika", body: "Bu haftanın videolarını şu anda hazırlıyoruz. İncelemeye hazır olduklarında size e-posta göndereceğiz." },
        { title: "Sonra her pazartesi", body: "Her pazartesi kütüphanenize yeni, kontrol edilmiş videolar gelir; size de e-postayla haber veririz." },
        { title: "Önce onay, sonra paylaşım", body: "Her videoyu izleyip onaylayın — siz onaylamadan hiçbir şey yayınlanmaz. Paylaş'a dokunduğunuzda açıklama metni yapıştırmanız için kopyalanır." },
        { title: "Buradayız", body: "Sorular, değişiklikler ya da geri bildirim için bu e-postayı yanıtlayın veya {email} adresine yazın." },
      ],
      button: "Kütüphanemi aç",
      footer: "Bu e-postayı kliniğiniz DentVideo'ya abone olduğu için alıyorsunuz.",
    },
    unsubPage: {
      confirmTitle: "Hatırlatmalardan çıkmak istiyor musunuz?",
      confirmBody: "DentVideo'dan artık hatırlatma ve aylık özet almayacaksınız. Hesabınız, ödemeleriniz ve hazır videolarınızla ilgili e-postalar gelmeye devam eder.",
      confirmButton: "Abonelikten çık",
      title: "Abonelikten çıktınız",
      body: "Tamam. Artık hatırlatma ve özet göndermeyeceğiz. Hesabınız, ödemeleriniz ve hazır videolarınızla ilgili e-postalar gelmeye devam eder.",
      invalidTitle: "Bu bağlantı çalışmıyor",
      invalidBody: "{email} adresine yazın, aboneliğinizi elle sonlandıralım.",
      errorTitle: "Kaydedilemedi",
      errorBody: "Bir dakika sonra bağlantıyı tekrar açın ya da {email} adresine yazın.",
      back: "DentVideo'ya git",
    },
  },
  fr: {
    hello: "Bonjour {clinic},",
    signoff: "L'équipe DentVideo",
    contact: "Une question ? Répondez simplement à cet e-mail.",
    nudgeFooter: "Vous recevez cet e-mail car vous avez commencé à configurer DentVideo pour votre cabinet. Nous envoyons au plus quatre courts e-mails, et nous arrêtons dès que vous choisissez une formule.",
    unsubscribeAsk: "Vous ne souhaitez plus de rappels ?",
    unsubscribe: "Se désabonner",
    welcome: {
      subject: "Bienvenue chez DentVideo, {clinic}",
      preheader: "Vos premières vidéos sont en cours de réalisation : environ 15 minutes.",
      intro: "Merci d'avoir choisi DentVideo. Voici la suite.",
      steps: [
        { title: "Votre première semaine : environ 15 minutes", body: "Nous réalisons en ce moment les vidéos de cette semaine. Nous vous écrivons dès qu'elles sont prêtes à être validées." },
        { title: "Puis chaque lundi", body: "Chaque lundi, de nouvelles vidéos vérifiées arrivent dans votre bibliothèque, et un e-mail vous prévient." },
        { title: "Validez, puis partagez", body: "Regardez chaque vidéo et validez-la : rien n'est publié sans votre accord. Touchez Partager et la légende est copiée, prête à coller." },
        { title: "Nous sommes là", body: "Questions, modifications ou remarques : répondez à cet e-mail ou écrivez à {email}." },
      ],
      button: "Ouvrir ma bibliothèque",
      footer: "Vous recevez cet e-mail car votre cabinet est abonné à DentVideo.",
    },
    unsubPage: {
      confirmTitle: "Se désabonner des rappels ?",
      confirmBody: "Vous ne recevrez plus de rappels ni de récapitulatifs mensuels de DentVideo. Les e-mails concernant votre compte, vos paiements et vos vidéos prêtes continueront d'arriver.",
      confirmButton: "Me désabonner",
      title: "Désabonnement confirmé",
      body: "C'est fait. Nous ne vous enverrons plus de rappels ni de récapitulatifs. Les e-mails concernant votre compte, vos paiements et vos vidéos prêtes continueront d'arriver.",
      invalidTitle: "Ce lien ne fonctionne pas",
      invalidBody: "Écrivez à {email} et nous vous désabonnerons manuellement.",
      errorTitle: "L'enregistrement a échoué",
      errorBody: "Rouvrez le lien dans une minute ou écrivez à {email}.",
      back: "Aller sur DentVideo",
    },
  },
  ja: {
    hello: "{clinic} ご担当者様",
    signoff: "DentVideo チーム",
    contact: "ご不明な点は、このメールにそのままご返信ください。",
    nudgeFooter: "このメールは、医院のDentVideo設定を始められた方にお送りしています。お送りするのは最大4通までで、プランをお選びいただいた時点で停止します。",
    unsubscribeAsk: "リマインドが不要な場合は",
    unsubscribe: "配信停止",
    welcome: {
      subject: "{clinic} 様、DentVideoへようこそ",
      preheader: "最初の動画を制作中です（15分ほど）。",
      intro: "DentVideoをお選びいただき、ありがとうございます。今後の流れをご案内します。",
      steps: [
        { title: "初週の動画：15分ほど", body: "今週の動画をただいま制作しています。ご確認いただける状態になりましたら、メールでお知らせします。" },
        { title: "その後は毎週月曜日", body: "毎週月曜日に、チェック済みの新しい動画がライブラリに届き、メールでお知らせします。" },
        { title: "承認してから共有", body: "各動画をご覧になり、承認してください。承認されるまで何も公開されません。「共有」をタップすると、キャプションがコピーされます。" },
        { title: "いつでもご相談ください", body: "ご質問・変更のご希望・ご意見は、このメールへのご返信か {email} までお寄せください。" },
      ],
      button: "ライブラリを開く",
      footer: "このメールは、DentVideoをご契約の医院にお送りしています。",
    },
    unsubPage: {
      confirmTitle: "リマインドメールの配信を停止しますか？",
      confirmBody: "DentVideoからのリマインドと月間レポートが届かなくなります。アカウント、お支払い、動画の完成に関するメールは引き続きお送りします。",
      confirmButton: "配信を停止する",
      title: "配信を停止しました",
      body: "配信を停止しました。今後、リマインドとレポートはお送りしません。アカウント、お支払い、動画の完成に関するメールは引き続きお送りします。",
      invalidTitle: "このリンクは無効です",
      invalidBody: "{email} までご連絡いただければ、手動で配信を停止いたします。",
      errorTitle: "保存できませんでした",
      errorBody: "1分ほどしてからもう一度リンクを開くか、{email} までご連絡ください。",
      back: "DentVideoへ",
    },
  },
  ar: {
    hello: "مرحباً {clinic}،",
    signoff: "فريق DentVideo",
    contact: "لديكم سؤال؟ يكفي الرد على هذه الرسالة.",
    nudgeFooter: "تصلكم هذه الرسالة لأنكم بدأتم إعداد DentVideo لعيادتكم. نرسل أربع رسائل قصيرة على الأكثر، ونتوقف فور اختياركم باقة.",
    unsubscribeAsk: "لا ترغبون في التذكيرات؟",
    unsubscribe: "إلغاء الاشتراك",
    welcome: {
      subject: "أهلاً بكم في DentVideo، {clinic}",
      preheader: "يجري الآن إعداد أول فيديوهاتكم، خلال نحو 15 دقيقة.",
      intro: "شكراً لاختياركم DentVideo. إليكم ما سيحدث بعد ذلك.",
      steps: [
        { title: "أسبوعكم الأول: نحو 15 دقيقة", body: "نُعدّ الآن فيديوهات هذا الأسبوع، وسنراسلكم فور جاهزيتها للمراجعة." },
        { title: "ثم كل يوم اثنين", body: "تصل إلى مكتبتكم كل يوم اثنين فيديوهات جديدة بعد مراجعتها، مع رسالة تُعلمكم بذلك." },
        { title: "اعتمدوا ثم شاركوا", body: "شاهدوا كل فيديو واعتمدوه، فلا يُنشر شيء قبل اعتمادكم. اضغطوا «مشاركة» فيُنسخ النص المرافق لتلصقوه." },
        { title: "نحن هنا", body: "للأسئلة أو التعديلات أو الملاحظات: ردّوا على هذه الرسالة أو راسلونا على {email}." },
      ],
      button: "فتح مكتبتي",
      footer: "تصلكم هذه الرسالة لأن عيادتكم مشتركة في DentVideo.",
    },
    unsubPage: {
      confirmTitle: "إلغاء الاشتراك في التذكيرات؟",
      confirmBody: "لن تصلكم بعد الآن التذكيرات والملخصات الشهرية من DentVideo. أما الرسائل المتعلقة بحسابكم ومدفوعاتكم وجاهزية فيديوهاتكم فستستمر.",
      confirmButton: "إلغاء الاشتراك",
      title: "تم إلغاء اشتراككم",
      body: "تم. لن نرسل إليكم أي تذكيرات أو ملخصات بعد الآن. أما الرسائل المتعلقة بحسابكم ومدفوعاتكم وجاهزية فيديوهاتكم فستستمر.",
      invalidTitle: "هذا الرابط لا يعمل",
      invalidBody: "راسلونا على {email} وسنلغي اشتراككم يدوياً.",
      errorTitle: "تعذّر الحفظ",
      errorBody: "أعيدوا فتح الرابط بعد دقيقة، أو راسلونا على {email}.",
      back: "الانتقال إلى DentVideo",
    },
  },
  pl: {
    hello: "Dzień dobry, zespole {clinic}!",
    signoff: "Zespół DentVideo",
    contact: "Pytania? Wystarczy odpowiedzieć na tę wiadomość.",
    nudgeFooter: "Otrzymują Państwo tę wiadomość, ponieważ rozpoczęli Państwo konfigurację DentVideo dla gabinetu. Wysyłamy najwyżej cztery krótkie wiadomości i przestajemy, gdy tylko wybiorą Państwo plan.",
    unsubscribeAsk: "Nie chcą Państwo przypomnień?",
    unsubscribe: "Wypisz się",
    welcome: {
      subject: "Witamy w DentVideo, {clinic}",
      preheader: "Pierwsze filmy właśnie powstają — około 15 minut.",
      intro: "Dziękujemy za wybór DentVideo. Oto, co będzie dalej.",
      steps: [
        { title: "Pierwszy tydzień: około 15 minut", body: "Właśnie przygotowujemy filmy na ten tydzień. Gdy będą gotowe do przejrzenia, wyślemy Państwu e-mail." },
        { title: "Potem co poniedziałek", body: "W każdy poniedziałek w Państwa bibliotece pojawiają się nowe, sprawdzone filmy, a my dajemy znać e-mailem." },
        { title: "Najpierw akceptacja, potem publikacja", body: "Proszę obejrzeć i zaakceptować każdy film — bez Państwa akceptacji nic nie zostanie opublikowane. Po dotknięciu „Udostępnij” opis zostaje skopiowany do wklejenia." },
        { title: "Jesteśmy do dyspozycji", body: "Pytania, zmiany lub uwagi: wystarczy odpowiedzieć na tę wiadomość lub napisać na {email}." },
      ],
      button: "Otwórz bibliotekę",
      footer: "Otrzymują Państwo tę wiadomość, ponieważ gabinet subskrybuje DentVideo.",
    },
    unsubPage: {
      confirmTitle: "Wypisać się z przypomnień?",
      confirmBody: "Nie będą Państwo otrzymywać przypomnień ani miesięcznych podsumowań od DentVideo. Wiadomości o koncie, płatnościach i gotowych filmach nadal będą przychodzić.",
      confirmButton: "Wypisz mnie",
      title: "Wypisanie potwierdzone",
      body: "Gotowe. Nie wyślemy już przypomnień ani podsumowań. Wiadomości o koncie, płatnościach i gotowych filmach nadal będą przychodzić.",
      invalidTitle: "Ten link nie działa",
      invalidBody: "Prosimy napisać na {email} — wypiszemy Państwa ręcznie.",
      errorTitle: "Nie udało się zapisać",
      errorBody: "Prosimy otworzyć link ponownie za minutę lub napisać na {email}.",
      back: "Przejdź do DentVideo",
    },
  },
};

export const LIFECYCLE_COPY: Record<string, LifecycleCopy> = Object.fromEntries(
  Object.entries(BASE_COPY).map(([lang, base]) => [lang, { ...base, ...SEQUENCE_COPY[lang] }]),
);

export const LIFECYCLE_LANGUAGES = Object.keys(LIFECYCLE_COPY);

/** The copy for a language, English for any other (it, pt clinics get the English interface too). */
export function lifecycleText(language: string | null | undefined): { lang: string; copy: LifecycleCopy } {
  const lang = language && LIFECYCLE_COPY[language] ? language : "en";
  return { lang, copy: LIFECYCLE_COPY[lang] };
}

/** Fills {placeholders}; an unknown one is left as is (the parity test catches it). */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
