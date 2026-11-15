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
 * (software-checked videos, nothing published without approval, about 15 minutes,
 * every Monday, monthly and cancel anytime). No guarantees, no promised
 * patients, no invented scarcity.
 *
 * Placeholders: {clinic} {email}.
 */

export type LifecycleBase = {
  hello: string;
  signoff: string;
  nudgeFooter: string;
  unsubscribeAsk: string;
  unsubscribe: string;
  welcome: {
    subject: string;
    preheader: string;
    title: string;
    intro: string;
    steps: { title: string; body: string }[];
    /** The "reply to this email" panel; replaces the shared help line in the welcome. */
    help: string;
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
    nudgeFooter: "You get this email because you started setting up DentVideo for your clinic. We send at most four short emails, and stop as soon as you choose a plan.",
    unsubscribeAsk: "Don't want reminders?",
    unsubscribe: "Unsubscribe",
    welcome: {
      subject: "Welcome to DentVideo: here's what happens next",
      preheader: "Your first videos are on their way (about 15 minutes). Here's how review, approval and posting work.",
      title: "Welcome, you're all set",
      intro: "Thank you for choosing DentVideo. Your plan is active. Here is what happens next:",
      steps: [
        { title: "Today: your first videos", body: "We're making this week's videos now. It usually takes about 15 minutes, and we'll email you the moment they're ready." },
        { title: "Review and approve", body: "Open each video in your library and watch it. Every video has had a software-assisted check for clinical accuracy and health-advertising rules, and you approve each one with a tap. Nothing is published until you do." },
        { title: "Post it yourself", body: "On an approved video, tap Share: the caption is copied, ready to paste into Instagram, Facebook or wherever you post. Each video comes with a suggested day and time. DentVideo never posts for you." },
        { title: "Then every Monday", body: "A new week of videos arrives in your library every Monday, and we email you when it's ready." },
      ],
      help: "Questions, a video to change, or feedback? Reply to this email. It reaches a real person at {email}.",
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
    nudgeFooter: "Sie erhalten diese E-Mail, weil Sie begonnen haben, DentVideo für Ihre Praxis einzurichten. Wir schicken höchstens vier kurze E-Mails und hören auf, sobald Sie einen Tarif wählen.",
    unsubscribeAsk: "Keine Erinnerungen mehr?",
    unsubscribe: "Abmelden",
    welcome: {
      subject: "Willkommen bei DentVideo: so geht es weiter",
      preheader: "Ihre ersten Videos entstehen gerade (etwa 15 Minuten). So funktionieren Prüfung, Freigabe und Posten.",
      title: "Willkommen, alles ist bereit",
      intro: "Vielen Dank für Ihr Vertrauen. Ihr Tarif ist aktiv. So geht es weiter:",
      steps: [
        { title: "Heute: Ihre ersten Videos", body: "Die Videos dieser Woche entstehen gerade. Das dauert meist etwa 15 Minuten; sobald sie fertig sind, bekommen Sie eine E-Mail." },
        { title: "Ansehen und freigeben", body: "Öffnen Sie jedes Video in Ihrer Bibliothek und sehen Sie es sich an. Jedes Video wird softwaregestützt auf fachliche Richtigkeit und Heilmittelwerberecht geprüft; freigeben können Sie es mit einem Tippen. Ohne Ihre Freigabe wird nichts veröffentlicht." },
        { title: "Selbst posten", body: "Tippen Sie bei einem freigegebenen Video auf „Teilen“: Die Bildunterschrift wird kopiert und ist bereit zum Einfügen in Instagram, Facebook oder wo immer Sie posten. Zu jedem Video schlagen wir einen Tag und eine Uhrzeit vor. DentVideo postet nie für Sie." },
        { title: "Danach jeden Montag", body: "Jeden Montag kommt eine neue Woche Videos in Ihre Bibliothek, und wir schicken Ihnen eine E-Mail, sobald sie bereitsteht." },
      ],
      help: "Fragen, ein Video, das geändert werden soll, oder Feedback? Antworten Sie auf diese E-Mail. Sie erreicht unter {email} einen Menschen.",
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
    nudgeFooter: "Recibes este correo porque empezaste a configurar DentVideo para tu clínica. Enviamos como máximo cuatro correos breves y paramos en cuanto eliges un plan.",
    unsubscribeAsk: "¿No quieres recordatorios?",
    unsubscribe: "Darse de baja",
    welcome: {
      subject: "Te damos la bienvenida a DentVideo",
      preheader: "Tus primeros vídeos ya se están creando (unos 15 minutos). Así funcionan la revisión, la aprobación y la publicación.",
      title: "Todo listo para empezar",
      intro: "Gracias por elegir DentVideo. Tu plan está activo. Esto es lo que pasa ahora:",
      steps: [
        { title: "Hoy: tus primeros vídeos", body: "Estamos creando los vídeos de esta semana. Suele tardar unos 15 minutos y te escribimos en cuanto estén listos." },
        { title: "Revisa y aprueba", body: "Abre cada vídeo en tu biblioteca y míralo. Cada vídeo pasa una revisión asistida por software de exactitud clínica y normas de publicidad sanitaria, y tú lo apruebas con un toque. No se publica nada sin tu aprobación." },
        { title: "Publícalo tú", body: "En un vídeo aprobado, toca Compartir: el texto se copia, listo para pegarlo en Instagram, Facebook o donde publiques. Cada vídeo trae un día y una hora sugeridos. DentVideo nunca publica por ti." },
        { title: "Después, cada lunes", body: "Cada lunes llega a tu biblioteca una nueva semana de vídeos, y te avisamos por correo cuando está lista." },
      ],
      help: "¿Dudas, un vídeo que cambiar o comentarios? Responde a este correo: lo lee una persona en {email}.",
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
    nudgeFooter: "Bu e-postayı, kliniğiniz için DentVideo kurulumuna başladığınız için alıyorsunuz. En fazla dört kısa e-posta göndeririz ve bir plan seçtiğiniz anda dururuz.",
    unsubscribeAsk: "Hatırlatma istemiyor musunuz?",
    unsubscribe: "Abonelikten çık",
    welcome: {
      subject: "DentVideo'ya hoş geldiniz: sırada ne var",
      preheader: "İlk videolarınız hazırlanıyor (yaklaşık 15 dakika). İnceleme, onay ve paylaşım böyle işler.",
      title: "Hoş geldiniz, her şey hazır",
      intro: "DentVideo'yu seçtiğiniz için teşekkürler. Planınız aktif. Bundan sonra olacaklar:",
      steps: [
        { title: "Bugün: ilk videolarınız", body: "Bu haftanın videolarını şu anda hazırlıyoruz. Genellikle yaklaşık 15 dakika sürer; hazır olur olmaz size e-posta göndeririz." },
        { title: "İnceleyin ve onaylayın", body: "Kütüphanenizdeki her videoyu açıp izleyin. Her video, klinik doğruluk ve sağlık reklamı kuralları açısından yazılım destekli bir kontrolden geçer; onayı tek dokunuşla siz verirsiniz. Siz onaylamadan hiçbir şey yayınlanmaz." },
        { title: "Paylaşımı siz yaparsınız", body: "Onaylı bir videoda Paylaş'a dokunun: açıklama metni kopyalanır ve Instagram, Facebook ya da paylaştığınız her yere yapıştırılmaya hazır olur. Her video için önerilen bir gün ve saat de gösteririz. DentVideo sizin adınıza paylaşım yapmaz." },
        { title: "Sonra her pazartesi", body: "Her pazartesi kütüphanenize yeni haftanın videoları gelir; hazır olduğunda size e-postayla haber veririz." },
      ],
      help: "Sorunuz, değişmesini istediğiniz bir video ya da geri bildiriminiz mi var? Bu e-postayı yanıtlayın; {email} adresine gelen mesajı bir ekip üyemiz okur.",
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
    nudgeFooter: "Vous recevez cet e-mail car vous avez commencé à configurer DentVideo pour votre cabinet. Nous envoyons au plus quatre courts e-mails, et nous arrêtons dès que vous choisissez une formule.",
    unsubscribeAsk: "Vous ne souhaitez plus de rappels ?",
    unsubscribe: "Se désabonner",
    welcome: {
      subject: "Bienvenue chez DentVideo : voici la suite",
      preheader: "Vos premières vidéos sont en cours (environ 15 minutes). Voici comment les regarder, les valider et les publier.",
      title: "Bienvenue, tout est prêt",
      intro: "Merci d'avoir choisi DentVideo. Votre formule est active. Voici la suite :",
      steps: [
        { title: "Aujourd'hui : vos premières vidéos", body: "Nous réalisons en ce moment les vidéos de cette semaine. Cela prend en général environ 15 minutes, et nous vous écrivons dès qu'elles sont prêtes." },
        { title: "Regardez et validez", body: "Ouvrez chaque vidéo dans votre bibliothèque et regardez-la. Chaque vidéo passe une vérification assistée par logiciel (exactitude clinique et règles de publicité en santé), puis vous la validez d'un geste. Rien n'est publié sans votre accord." },
        { title: "Publiez vous-même", body: "Sur une vidéo validée, touchez Partager : la légende est copiée, prête à coller sur Instagram, Facebook ou ailleurs. Chaque vidéo est accompagnée d'un jour et d'une heure suggérés. DentVideo ne publie jamais à votre place." },
        { title: "Puis chaque lundi", body: "Chaque lundi, une nouvelle semaine de vidéos arrive dans votre bibliothèque, et un e-mail vous prévient." },
      ],
      help: "Une question, une vidéo à modifier ou une remarque ? Répondez à cet e-mail : une vraie personne le lit à {email}.",
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
    nudgeFooter: "このメールは、医院のDentVideo設定を始められた方にお送りしています。お送りするのは最大4通までで、プランをお選びいただいた時点で停止します。",
    unsubscribeAsk: "リマインドが不要な場合は",
    unsubscribe: "配信停止",
    welcome: {
      subject: "DentVideoへようこそ：今後の流れのご案内",
      preheader: "最初の動画を制作中です（15分ほど）。確認・承認・投稿の流れをご案内します。",
      title: "ご準備が整いました",
      intro: "DentVideoをお選びいただき、ありがとうございます。プランが有効になりました。今後の流れは次のとおりです。",
      steps: [
        { title: "本日：最初の動画", body: "今週の動画をただいま制作しています。通常15分ほどで完成し、完成次第メールでお知らせします。" },
        { title: "確認して承認", body: "ライブラリで各動画を開いてご覧ください。すべての動画は、臨床的な正確さと医療広告のルールについてソフトウェアによるチェックを受けています。承認はワンタップで、先生が承認されるまで何も公開されません。" },
        { title: "投稿は先生ご自身で", body: "承認済みの動画で「共有」をタップすると、キャプションがコピーされ、InstagramやFacebookなどにそのまま貼り付けられます。各動画には投稿のおすすめ日時も表示されます。DentVideoが代わりに投稿することはありません。" },
        { title: "その後は毎週月曜日", body: "毎週月曜日に新しい1週間分の動画がライブラリに届き、準備ができるとメールでお知らせします。" },
      ],
      help: "ご質問、動画の修正のご希望、ご意見は、このメールにご返信ください。{email} に届いたメッセージはスタッフが拝読します。",
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
    nudgeFooter: "تصلكم هذه الرسالة لأنكم بدأتم إعداد DentVideo لعيادتكم. نرسل أربع رسائل قصيرة على الأكثر، ونتوقف فور اختياركم باقة.",
    unsubscribeAsk: "لا ترغبون في التذكيرات؟",
    unsubscribe: "إلغاء الاشتراك",
    welcome: {
      subject: "أهلاً بكم في DentVideo: الخطوات التالية",
      preheader: "يجري إعداد أول فيديوهاتكم (نحو 15 دقيقة). إليكم كيف تتم المراجعة والاعتماد والنشر.",
      title: "أهلاً بكم، كل شيء جاهز",
      intro: "شكراً لاختياركم DentVideo. باقتكم مفعّلة، وإليكم ما سيحدث بعد ذلك:",
      steps: [
        { title: "اليوم: أول فيديوهاتكم", body: "نُعدّ الآن فيديوهات هذا الأسبوع. يستغرق ذلك عادةً نحو 15 دقيقة، وسنراسلكم فور جاهزيتها." },
        { title: "شاهدوا واعتمدوا", body: "افتحوا كل فيديو في مكتبتكم وشاهدوه. يخضع كل فيديو لفحص بمساعدة البرمجيات للدقة السريرية وقواعد الإعلان الصحي، وتعتمدونه بلمسة واحدة. لا يُنشر شيء قبل اعتمادكم." },
        { title: "انشروا بأنفسكم", body: "اضغطوا «مشاركة» على فيديو معتمد فيُنسخ النص المرافق جاهزاً للصقه في Instagram أو Facebook أو أي منصة تنشرون عليها. ونقترح لكل فيديو يوماً وساعة للنشر. لا ينشر DentVideo شيئاً نيابةً عنكم." },
        { title: "ثم كل يوم اثنين", body: "يصل إلى مكتبتكم كل يوم اثنين أسبوع جديد من الفيديوهات، ونراسلكم عند جاهزيته." },
      ],
      help: "لديكم سؤال أو فيديو تريدون تعديله أو ملاحظة؟ ردّوا على هذه الرسالة، فيقرؤها أحد أفراد فريقنا على {email}.",
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
    nudgeFooter: "Otrzymują Państwo tę wiadomość, ponieważ rozpoczęli Państwo konfigurację DentVideo dla gabinetu. Wysyłamy najwyżej cztery krótkie wiadomości i przestajemy, gdy tylko wybiorą Państwo plan.",
    unsubscribeAsk: "Nie chcą Państwo przypomnień?",
    unsubscribe: "Wypisz się",
    welcome: {
      subject: "Witamy w DentVideo: co dalej",
      preheader: "Pierwsze filmy właśnie powstają (około 15 minut). Oto jak wygląda przegląd, akceptacja i publikacja.",
      title: "Witamy, wszystko gotowe",
      intro: "Dziękujemy za wybór DentVideo. Plan jest aktywny. Oto, co będzie dalej:",
      steps: [
        { title: "Dziś: pierwsze filmy", body: "Właśnie przygotowujemy filmy na ten tydzień. Zwykle trwa to około 15 minut, a gdy będą gotowe, od razu wyślemy e-mail." },
        { title: "Obejrzeć i zaakceptować", body: "Prosimy otworzyć i obejrzeć każdy film w bibliotece. Każdy film przechodzi wspomaganą przez oprogramowanie kontrolę poprawności klinicznej i zasad reklamy usług medycznych, a akceptacja to jedno dotknięcie. Bez Państwa akceptacji nic nie zostanie opublikowane." },
        { title: "Publikacja po Państwa stronie", body: "Przy zaakceptowanym filmie wystarczy dotknąć „Udostępnij”: opis zostaje skopiowany i jest gotowy do wklejenia na Instagramie, Facebooku lub w innym miejscu. Do każdego filmu proponujemy dzień i godzinę publikacji. DentVideo nigdy nie publikuje za Państwa." },
        { title: "Potem co poniedziałek", body: "W każdy poniedziałek w bibliotece pojawia się nowy tydzień filmów, a my dajemy znać e-mailem." },
      ],
      help: "Pytania, film do zmiany lub uwagi? Wystarczy odpowiedzieć na tę wiadomość: pod adresem {email} czyta ją człowiek.",
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
