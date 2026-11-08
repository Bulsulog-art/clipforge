/**
 * Lifecycle email copy: the welcome after the first payment, the two
 * reminders to a clinic that saw its preview but has not paid, and the
 * unsubscribe page. One entry per site language, all with the same shape and
 * the same {placeholders} (lifecycle-copy.test.ts checks this).
 *
 * The reminders follow the owner's order: their problem → the outcome → why
 * us → why now. Claims stay inside what the product does and the site
 * already says (checked videos, nothing published without approval, about
 * 15 minutes, every Monday, monthly and cancel anytime). No guarantees, no
 * promised patients, no invented scarcity: the founding offer is described
 * exactly as billing.ts defines it, and only while it is open.
 *
 * Placeholders: {clinic} {email} {price} {then} {months} {clinics} {code} {from}.
 */

export type LifecycleCopy = {
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
  preview: {
    subject: string;
    preheader: string;
    problem: string;
    outcome: string;
    whyUs: string;
    whyNow: string;
    button: string;
  };
  offer: {
    subjectOpen: string;
    subjectClosed: string;
    preheaderOpen: string;
    preheaderClosed: string;
    problem: string;
    outcome: string;
    whyUs: string;
    whyNowOpen: string;
    whyNowClosed: string;
    last: string;
    button: string;
  };
  unsubPage: {
    title: string;
    body: string;
    invalidTitle: string;
    invalidBody: string;
    errorTitle: string;
    errorBody: string;
    back: string;
  };
};

export const LIFECYCLE_COPY: Record<string, LifecycleCopy> = {
  en: {
    hello: "Hello {clinic},",
    signoff: "The DentVideo team",
    contact: "Questions? Just reply to this email.",
    nudgeFooter: "You get this email because you started setting up DentVideo for your clinic. We send at most two reminders.",
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
    preview: {
      subject: "Your branded video preview is waiting",
      preheader: "Patient videos with your logo and colours — your preview is saved.",
      problem: "Patients ask the same questions every week, and there is rarely time to film the answers.",
      outcome: "Your preview shows what DentVideo makes for you: short, captioned patient-education videos with your logo and colours, ready to post.",
      whyUs: "Every video is checked for clinical accuracy and health-advertising rules, and nothing is published until you approve it.",
      whyNow: "Your preview is saved. Choose a plan and your first week of videos is made in about 15 minutes.",
      button: "See my preview",
    },
    offer: {
      subjectOpen: "Founding offer: Practice for {price}/month for {months} months",
      subjectClosed: "Your DentVideo preview is still saved",
      preheaderOpen: "For the first {clinics} clinics, applied at checkout.",
      preheaderClosed: "Plans from {from}/month. Monthly, cancel anytime.",
      problem: "Staying visible takes regular posts, and they are the first thing to slip in a busy week.",
      outcome: "With DentVideo, new patient-education videos arrive every Monday — about the services you offer, in your language.",
      whyUs: "We write, narrate, caption and check each one. You only watch and approve.",
      whyNowOpen: "The founding offer gives the first {clinics} clinics the Practice plan for {price}/month for {months} months, then {then}/month. It is applied automatically at checkout (code {code}). Monthly, cancel anytime.",
      whyNowClosed: "Plans start at {from}/month. Monthly, cancel anytime.",
      last: "This is the last reminder we'll send.",
      button: "Choose a plan",
    },
    unsubPage: {
      title: "You're unsubscribed",
      body: "We won't send you any more reminders. If you choose a plan later, we'll still email you when your videos are ready.",
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
    nudgeFooter: "Sie erhalten diese E-Mail, weil Sie begonnen haben, DentVideo für Ihre Praxis einzurichten. Wir erinnern höchstens zweimal.",
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
    preview: {
      subject: "Ihre Videovorschau im Praxis-Design wartet",
      preheader: "Patientenvideos mit Ihrem Logo und Ihren Farben – Ihre Vorschau ist gespeichert.",
      problem: "Patientinnen und Patienten stellen jede Woche dieselben Fragen – und für Videos mit den Antworten fehlt meist die Zeit.",
      outcome: "Ihre Vorschau zeigt, was DentVideo für Sie erstellt: kurze Aufklärungsvideos mit Untertiteln, Ihrem Logo und Ihren Farben, bereit zum Posten.",
      whyUs: "Jedes Video wird auf fachliche Richtigkeit und Heilmittelwerberecht geprüft, und nichts wird ohne Ihre Freigabe veröffentlicht.",
      whyNow: "Ihre Vorschau ist gespeichert. Wählen Sie einen Tarif, und Ihre erste Woche Videos entsteht in etwa 15 Minuten.",
      button: "Meine Vorschau ansehen",
    },
    offer: {
      subjectOpen: "Gründungsangebot: Practice für {price}/Monat, {months} Monate lang",
      subjectClosed: "Ihre DentVideo-Vorschau ist noch gespeichert",
      preheaderOpen: "Für die ersten {clinics} Praxen, automatisch im Checkout.",
      preheaderClosed: "Tarife ab {from}/Monat. Monatlich, jederzeit kündbar.",
      problem: "Sichtbarkeit braucht regelmäßige Beiträge – und genau die bleiben in vollen Wochen als Erstes liegen.",
      outcome: "Mit DentVideo liegen jeden Montag neue Aufklärungsvideos bereit – zu den Leistungen Ihrer Praxis, in Ihrer Sprache.",
      whyUs: "Wir schreiben, vertonen, untertiteln und prüfen jedes Video. Sie sehen es sich nur an und geben es frei.",
      whyNowOpen: "Mit dem Gründungsangebot erhalten die ersten {clinics} Praxen den Practice-Tarif für {price}/Monat, {months} Monate lang, danach {then}/Monat. Es wird im Checkout automatisch angewendet (Code {code}). Monatlich, jederzeit kündbar.",
      whyNowClosed: "Tarife ab {from}/Monat. Monatlich, jederzeit kündbar.",
      last: "Das ist unsere letzte Erinnerung.",
      button: "Tarif wählen",
    },
    unsubPage: {
      title: "Sie sind abgemeldet",
      body: "Wir schicken Ihnen keine Erinnerungen mehr. Wenn Sie später einen Tarif wählen, erhalten Sie weiterhin eine E-Mail, sobald Ihre Videos fertig sind.",
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
    nudgeFooter: "Recibes este correo porque empezaste a configurar DentVideo para tu clínica. Enviamos como máximo dos recordatorios.",
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
    preview: {
      subject: "Tu vista previa con tu marca te está esperando",
      preheader: "Vídeos para pacientes con tu logo y tus colores: tu vista previa está guardada.",
      problem: "Los pacientes hacen las mismas preguntas cada semana, y casi nunca hay tiempo para grabar las respuestas.",
      outcome: "Tu vista previa muestra lo que DentVideo crea para ti: vídeos educativos cortos, con subtítulos, tu logo y tus colores, listos para publicar.",
      whyUs: "Cada vídeo se revisa en precisión clínica y normas de publicidad sanitaria, y no se publica nada sin tu aprobación.",
      whyNow: "Tu vista previa está guardada. Elige un plan y tu primera semana de vídeos estará lista en unos 15 minutos.",
      button: "Ver mi vista previa",
    },
    offer: {
      subjectOpen: "Oferta fundadora: Practice por {price}/mes durante {months} meses",
      subjectClosed: "Tu vista previa de DentVideo sigue guardada",
      preheaderOpen: "Para las primeras {clinics} clínicas, se aplica al pagar.",
      preheaderClosed: "Planes desde {from}/mes. Mensual, cancela cuando quieras.",
      problem: "Mantenerse visible exige publicar con regularidad, y es lo primero que se queda atrás en una semana llena.",
      outcome: "Con DentVideo, cada lunes llegan vídeos educativos nuevos: sobre los servicios que ofreces y en tu idioma.",
      whyUs: "Nosotros escribimos, narramos, subtitulamos y revisamos cada uno. Tú solo los ves y los apruebas.",
      whyNowOpen: "La oferta fundadora da a las primeras {clinics} clínicas el plan Practice por {price}/mes durante {months} meses; después, {then}/mes. Se aplica automáticamente al pagar (código {code}). Mensual, cancela cuando quieras.",
      whyNowClosed: "Planes desde {from}/mes. Mensual, cancela cuando quieras.",
      last: "Este es el último recordatorio que te enviamos.",
      button: "Elegir un plan",
    },
    unsubPage: {
      title: "Te has dado de baja",
      body: "No te enviaremos más recordatorios. Si más adelante eliges un plan, te seguiremos avisando cuando tus vídeos estén listos.",
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
    nudgeFooter: "Bu e-postayı, kliniğiniz için DentVideo kurulumuna başladığınız için alıyorsunuz. En fazla iki hatırlatma göndeririz.",
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
    preview: {
      subject: "Kliniğinize özel video önizlemeniz sizi bekliyor",
      preheader: "Logonuz ve renklerinizle hasta videoları — önizlemeniz kayıtlı.",
      problem: "Hastalar her hafta aynı soruları soruyor; cevapları videoya çekmeye ise çoğu zaman vakit kalmıyor.",
      outcome: "Önizlemeniz, DentVideo'nun sizin için neler hazırladığını gösteriyor: logonuz ve renklerinizle, altyazılı, paylaşmaya hazır kısa hasta bilgilendirme videoları.",
      whyUs: "Her video klinik doğruluk ve sağlık reklamı kurallarına göre kontrol edilir; siz onaylamadan hiçbir şey yayınlanmaz.",
      whyNow: "Önizlemeniz kayıtlı. Bir plan seçtiğinizde ilk haftanızın videoları yaklaşık 15 dakikada hazırlanır.",
      button: "Önizlememi gör",
    },
    offer: {
      subjectOpen: "Kurucu teklifi: {months} ay boyunca aylık {price} ile Practice",
      subjectClosed: "DentVideo önizlemeniz hâlâ kayıtlı",
      preheaderOpen: "İlk {clinics} klinik için, ödeme sırasında otomatik uygulanır.",
      preheaderClosed: "Planlar aylık {from} ile başlar. Aylık, istediğiniz zaman iptal.",
      problem: "Görünür kalmak düzenli paylaşım ister; yoğun bir haftada ilk aksayan da bu olur.",
      outcome: "DentVideo ile her pazartesi yeni hasta bilgilendirme videoları hazır olur — sunduğunuz tedavilerle ilgili, kendi dilinizde.",
      whyUs: "Her videoyu biz yazar, seslendirir, altyazılar ve kontrol ederiz. Siz yalnızca izler ve onaylarsınız.",
      whyNowOpen: "Kurucu teklifiyle ilk {clinics} klinik, Practice planını {months} ay boyunca aylık {price} ile kullanır; sonrasında aylık {then}. Teklif ödeme sırasında otomatik uygulanır ({code} kodu). Aylık, istediğiniz zaman iptal.",
      whyNowClosed: "Planlar aylık {from} ile başlar. Aylık, istediğiniz zaman iptal.",
      last: "Bu, göndereceğimiz son hatırlatma.",
      button: "Plan seçin",
    },
    unsubPage: {
      title: "Abonelikten çıktınız",
      body: "Size artık hatırlatma göndermeyeceğiz. İleride bir plan seçerseniz, videolarınız hazır olduğunda yine e-posta alırsınız.",
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
    nudgeFooter: "Vous recevez cet e-mail car vous avez commencé à configurer DentVideo pour votre cabinet. Nous envoyons au plus deux rappels.",
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
    preview: {
      subject: "Votre aperçu vidéo à vos couleurs vous attend",
      preheader: "Des vidéos patients avec votre logo et vos couleurs : votre aperçu est enregistré.",
      problem: "Les patients posent les mêmes questions chaque semaine, et il reste rarement du temps pour filmer les réponses.",
      outcome: "Votre aperçu montre ce que DentVideo réalise pour vous : de courtes vidéos d'information patient, sous-titrées, avec votre logo et vos couleurs, prêtes à publier.",
      whyUs: "Chaque vidéo est vérifiée sur le plan clinique et au regard des règles de publicité en santé, et rien n'est publié sans votre accord.",
      whyNow: "Votre aperçu est enregistré. Choisissez une formule et votre première semaine de vidéos est prête en 15 minutes environ.",
      button: "Voir mon aperçu",
    },
    offer: {
      subjectOpen: "Offre fondateurs : Practice à {price}/mois pendant {months} mois",
      subjectClosed: "Votre aperçu DentVideo est toujours enregistré",
      preheaderOpen: "Pour les {clinics} premiers cabinets, appliquée au paiement.",
      preheaderClosed: "Formules dès {from}/mois. Mensuel, résiliable à tout moment.",
      problem: "Rester visible demande de publier régulièrement, et c'est la première chose qui passe à la trappe quand la semaine est chargée.",
      outcome: "Avec DentVideo, de nouvelles vidéos d'information patient arrivent chaque lundi, sur les soins que vous proposez, dans votre langue.",
      whyUs: "Nous écrivons, mettons en voix, sous-titrons et vérifions chaque vidéo. Vous n'avez qu'à regarder et valider.",
      whyNowOpen: "L'offre fondateurs donne aux {clinics} premiers cabinets la formule Practice à {price}/mois pendant {months} mois, puis {then}/mois. Elle s'applique automatiquement au paiement (code {code}). Mensuel, résiliable à tout moment.",
      whyNowClosed: "Formules dès {from}/mois. Mensuel, résiliable à tout moment.",
      last: "C'est le dernier rappel que nous vous envoyons.",
      button: "Choisir une formule",
    },
    unsubPage: {
      title: "Désabonnement confirmé",
      body: "Nous ne vous enverrons plus de rappels. Si vous choisissez une formule plus tard, nous vous écrirons toujours quand vos vidéos seront prêtes.",
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
    nudgeFooter: "このメールは、医院のDentVideo設定を始められた方にお送りしています。リマインドは最大2回までです。",
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
    preview: {
      subject: "医院オリジナルの動画プレビューをご用意しています",
      preheader: "ロゴと医院カラー入りの患者さん向け動画。プレビューは保存されています。",
      problem: "患者さんからは毎週同じ質問が寄せられますが、その答えを動画にする時間はなかなか取れません。",
      outcome: "プレビューでは、DentVideoが制作する動画をご覧いただけます。医院のロゴとカラーを使った字幕付きの短い説明動画で、そのまま投稿できます。",
      whyUs: "すべての動画は臨床的な正確性と医療広告の観点からチェックし、承認されるまで何も公開されません。",
      whyNow: "プレビューは保存されています。プランをお選びいただくと、初週の動画が15分ほどで完成します。",
      button: "プレビューを見る",
    },
    offer: {
      subjectOpen: "先行導入価格：Practiceプランが{months}か月間 月額{price}",
      subjectClosed: "DentVideoのプレビューは保存されています",
      preheaderOpen: "先着{clinics}院限定。お支払い時に自動で適用されます。",
      preheaderClosed: "プランは月額{from}から。月単位で、いつでも解約できます。",
      problem: "医院を知ってもらうには定期的な投稿が欠かせませんが、忙しい週にはまず後回しになりがちです。",
      outcome: "DentVideoなら、貴院の診療内容に合わせた患者さん向けの説明動画が、毎週月曜日に貴院の言語で届きます。",
      whyUs: "台本・ナレーション・字幕・チェックはすべて私たちが行います。先生はご覧になって承認するだけです。",
      whyNowOpen: "先行導入価格では、先着{clinics}院がPracticeプランを{months}か月間 月額{price}でご利用いただけます（その後は月額{then}）。お支払い時に自動で適用されます（コード：{code}）。月単位の契約で、いつでも解約できます。",
      whyNowClosed: "プランは月額{from}からご用意しています。月単位の契約で、いつでも解約できます。",
      last: "ご案内はこれが最後です。",
      button: "プランを選ぶ",
    },
    unsubPage: {
      title: "配信を停止しました",
      body: "今後、リマインドメールはお送りしません。後日プランをお選びいただいた場合も、動画の完成をお知らせするメールは引き続きお届けします。",
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
    nudgeFooter: "تصلكم هذه الرسالة لأنكم بدأتم إعداد DentVideo لعيادتكم. نرسل تذكيرين على الأكثر.",
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
    preview: {
      subject: "معاينة فيديوهات عيادتكم بهويتها بانتظاركم",
      preheader: "فيديوهات للمرضى بشعاركم وألوانكم، والمعاينة محفوظة.",
      problem: "يطرح المرضى الأسئلة نفسها كل أسبوع، ونادراً ما يتوفر الوقت لتصوير الإجابات.",
      outcome: "تُظهر معاينتكم ما يُعدّه DentVideo لكم: فيديوهات توعوية قصيرة مع النص على الشاشة، بشعاركم وألوانكم، جاهزة للنشر.",
      whyUs: "كل فيديو يُراجَع للدقة السريرية وضوابط الإعلان الصحي، ولا يُنشر شيء قبل اعتمادكم.",
      whyNow: "معاينتكم محفوظة. اختاروا باقة، وسيكون أسبوعكم الأول من الفيديوهات جاهزاً خلال نحو 15 دقيقة.",
      button: "عرض المعاينة",
    },
    offer: {
      subjectOpen: "سعر المؤسسين: باقة Practice بسعر {price} شهرياً لمدة {months} شهراً",
      subjectClosed: "معاينة DentVideo الخاصة بكم ما زالت محفوظة",
      preheaderOpen: "لأول {clinics} عيادة، ويُطبَّق تلقائياً عند الدفع.",
      preheaderClosed: "الباقات تبدأ من {from} شهرياً. اشتراك شهري يمكن إلغاؤه في أي وقت.",
      problem: "الحضور الدائم يحتاج إلى نشر منتظم، وهو أول ما يتأخر في الأسابيع المزدحمة.",
      outcome: "مع DentVideo تصلكم كل يوم اثنين فيديوهات توعوية جديدة عن الخدمات التي تقدّمونها، وبلغتكم.",
      whyUs: "نكتب كل فيديو ونسجّل صوته ونضيف النص ونراجعه، وما عليكم إلا المشاهدة والاعتماد.",
      whyNowOpen: "يمنح سعر المؤسسين أول {clinics} عيادة باقة Practice بسعر {price} شهرياً لمدة {months} شهراً، ثم {then} شهرياً. يُطبَّق تلقائياً عند الدفع (الرمز {code}). اشتراك شهري يمكن إلغاؤه في أي وقت.",
      whyNowClosed: "الباقات تبدأ من {from} شهرياً. اشتراك شهري يمكن إلغاؤه في أي وقت.",
      last: "هذا آخر تذكير نرسله إليكم.",
      button: "اختيار باقة",
    },
    unsubPage: {
      title: "تم إلغاء اشتراككم",
      body: "لن نرسل إليكم أي تذكيرات بعد الآن. وإذا اخترتم باقة لاحقاً، فسنراسلكم عند جاهزية فيديوهاتكم.",
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
    nudgeFooter: "Otrzymują Państwo tę wiadomość, ponieważ rozpoczęli Państwo konfigurację DentVideo dla gabinetu. Wysyłamy najwyżej dwa przypomnienia.",
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
    preview: {
      subject: "Czeka na Państwa podgląd filmów w barwach gabinetu",
      preheader: "Filmy dla pacjentów z Państwa logo i kolorami — podgląd jest zapisany.",
      problem: "Pacjenci co tydzień zadają te same pytania, a na nagranie odpowiedzi rzadko starcza czasu.",
      outcome: "Podgląd pokazuje, co DentVideo dla Państwa przygotuje: krótkie filmy edukacyjne z napisami, logo i kolorami gabinetu, gotowe do publikacji.",
      whyUs: "Każdy film jest sprawdzany pod kątem poprawności klinicznej i zasad reklamy medycznej, a nic nie zostanie opublikowane bez Państwa akceptacji.",
      whyNow: "Podgląd jest zapisany. Po wyborze planu pierwszy tydzień filmów będzie gotowy w około 15 minut.",
      button: "Zobacz podgląd",
    },
    offer: {
      subjectOpen: "Oferta założycielska: Practice za {price}/mies. przez {months} miesięcy",
      subjectClosed: "Państwa podgląd DentVideo wciąż jest zapisany",
      preheaderOpen: "Dla pierwszych {clinics} gabinetów, naliczana automatycznie przy płatności.",
      preheaderClosed: "Plany od {from}/mies. Rozliczenie miesięczne, rezygnacja w dowolnym momencie.",
      problem: "Widoczność wymaga regularnych publikacji, a w pracowitym tygodniu to one najszybciej schodzą na dalszy plan.",
      outcome: "Z DentVideo w każdy poniedziałek czekają nowe filmy edukacyjne — o usługach gabinetu, w Państwa języku.",
      whyUs: "Piszemy, nagrywamy lektora, dodajemy napisy i sprawdzamy każdy film. Państwo tylko oglądają i akceptują.",
      whyNowOpen: "Oferta założycielska daje pierwszym {clinics} gabinetom plan Practice za {price}/mies. przez {months} miesięcy, potem {then}/mies. Jest naliczana automatycznie przy płatności (kod {code}). Rozliczenie miesięczne, rezygnacja w dowolnym momencie.",
      whyNowClosed: "Plany od {from}/mies. Rozliczenie miesięczne, rezygnacja w dowolnym momencie.",
      last: "To nasze ostatnie przypomnienie.",
      button: "Wybierz plan",
    },
    unsubPage: {
      title: "Wypisanie potwierdzone",
      body: "Nie będziemy już wysyłać przypomnień. Jeśli później wybiorą Państwo plan, nadal napiszemy, gdy filmy będą gotowe.",
      invalidTitle: "Ten link nie działa",
      invalidBody: "Prosimy napisać na {email} — wypiszemy Państwa ręcznie.",
      errorTitle: "Nie udało się zapisać",
      errorBody: "Prosimy otworzyć link ponownie za minutę lub napisać na {email}.",
      back: "Przejdź do DentVideo",
    },
  },
};

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
