import type { Locale } from "./dentvideo-locales";
import type { CountText } from "./dentvideo-app";

/**
 * The words around a delivery that is not routine (lib/dentvid/email.ts):
 *
 *   first      the clinic's first delivered week: a welcome, three steps
 *              from "ready" to "posted" with the app's real button labels,
 *              one optional nudge towards Settings, the next delivery date;
 *   short      a week with fewer than five usable videos: one honest line
 *              about the ones left out (no remake or credit promised);
 *   late       the delivery watchdog found a paying clinic's week late;
 *   firstLate  the first-week watchdog found a first week late.
 *
 * Placeholders, filled by email.ts: {approve} the email's own approve-all
 * button, {post} the app's "Save video + copy caption" button on an
 * approved video, {settings} the app's Settings tab (all read from their
 * content files at send time, so a renamed button is renamed here too),
 * {date} the next Monday, {n} a count.
 *
 * Every locale is written natively, in the same voice and terms as the
 * ready email and the welcome. Italian and Portuguese clinics, whose app
 * and other notices are in English, get these in English
 * (deliveryNoticesText).
 */

export type NoticeStep = { title: string; body: string };

export type DeliveryNotices = {
  first: {
    subject: string;
    title: string;
    welcome: string;
    stepsIntro: string;
    /** Step 1 when the email carries the approve-all button. {approve} */
    approveHere: NoticeStep;
    /** Step 1 when it does not (no signed link): approve in the app. */
    approveInApp: NoticeStep;
    /** Step 1 when every video is marked for a look. */
    lookFirst: NoticeStep;
    /** Step 2. {post} */
    post: NoticeStep;
    /** Step 3. */
    paste: NoticeStep;
    /** Shown only when the clinic has not set them yet. {settings} */
    nudge: { handle: string; closingLine: string; both: string };
    /** {date} */
    next: string;
  };
  /** {n} of the week's five were left out. Picked with countText (one, two, then the language's plural category). */
  short: CountText;
  late: { subject: string; preheader: string; title: string; body: string; next: string };
  firstLate: { subject: string; preheader: string; title: string; body: string; next: string };
};

const en: DeliveryNotices = {
  first: {
    subject: "Your first DentVideo videos are ready",
    title: "Your first videos are ready",
    welcome: "Welcome to your first week with DentVideo. These patient-education videos were made for your clinic and checked by our software, and the final say is yours.",
    stepsIntro: "From here it takes three steps:",
    approveHere: { title: "Approve in one tap", body: "Happy with them? “{approve}” below does it in one tap. You can also approve them one by one in the app." },
    approveInApp: { title: "Approve them", body: "Open the app, watch each video and approve the ones you are happy with. Each one takes a single tap." },
    lookFirst: { title: "Take a quick look", body: "Each video marked for a look shows the reason. Open it in the app and approve it once you are happy with it." },
    post: { title: "Post from your phone", body: "Open DentVideo on your phone and tap an approved video. “{post}” saves it to your phone." },
    paste: { title: "Paste the caption", body: "The caption and hashtags are copied at the same time. In Instagram or TikTok, pick the video and paste." },
    nudge: {
      handle: "If you like, add your Instagram or TikTok handle in {settings}. It will appear at the end of your next videos.",
      closingLine: "If you like, add your own closing line in {settings}. It will go under the captions of your next videos.",
      both: "If you like, add your Instagram or TikTok handle and your own closing line in {settings}. The handle appears at the end of your next videos, the closing line under their captions.",
    },
    next: "Your next week of videos arrives on {date}.",
  },
  short: {
    one: "One of this week's five videos did not pass our checks, so we left it out rather than send you something wrong.",
    two: "Two of this week's five videos did not pass our checks, so we left them out rather than send you something wrong.",
    other: "{n} of this week's five videos did not pass our checks, so we left them out rather than send you something wrong.",
  },
  late: {
    subject: "This week's videos are running late",
    preheader: "They are on their way, and there is nothing you need to do.",
    title: "Your videos are running late",
    body: "This week's videos are taking longer than usual. They are queued and on their way, and nothing extra is charged.",
    next: "We will email you when they are ready for your review. Until then there is nothing you need to do.",
  },
  firstLate: {
    subject: "Your first videos are taking a little longer",
    preheader: "They are on their way, and there is nothing you need to do.",
    title: "Your first videos are on their way",
    body: "Your first week of videos is taking longer than usual to make. It is queued and on its way, and nothing extra is charged.",
    next: "We will email you as soon as your videos are ready for your review. Until then there is nothing you need to do.",
  },
};

const de: DeliveryNotices = {
  first: {
    subject: "Ihre ersten DentVideo-Videos sind fertig",
    title: "Ihre ersten Videos sind fertig",
    welcome: "willkommen in Ihrer ersten Woche mit DentVideo. Diese Patientenvideos wurden für Ihre Praxis erstellt und softwaregestützt geprüft; das letzte Wort haben Sie.",
    stepsIntro: "Ab hier sind es drei Schritte:",
    approveHere: { title: "Mit einem Tippen freigeben", body: "Gefallen sie Ihnen? „{approve}“ unten erledigt das mit einem Tippen. Sie können sie auch einzeln in der App freigeben." },
    approveInApp: { title: "Freigeben", body: "Öffnen Sie die App, sehen Sie sich jedes Video an und geben Sie die passenden frei. Jedes braucht nur ein Tippen." },
    lookFirst: { title: "Kurz ansehen", body: "Bei jedem markierten Video steht der Grund dabei. Öffnen Sie es in der App und geben Sie es frei, wenn alles passt." },
    post: { title: "Vom Handy posten", body: "Öffnen Sie DentVideo auf dem Handy und tippen Sie auf ein freigegebenes Video. Mit „{post}“ wird es auf Ihrem Handy gespeichert." },
    paste: { title: "Text einfügen", body: "Text und Hashtags werden dabei gleich mitkopiert. Wählen Sie in Instagram oder TikTok das Video aus und fügen Sie den Text ein." },
    nudge: {
      handle: "Wenn Sie möchten, tragen Sie unter {settings} Ihren Instagram- oder TikTok-Namen ein. Er erscheint dann am Ende Ihrer nächsten Videos.",
      closingLine: "Wenn Sie möchten, hinterlegen Sie unter {settings} einen eigenen Schlusssatz. Er steht dann unter den Texten Ihrer nächsten Videos.",
      both: "Wenn Sie möchten, tragen Sie unter {settings} Ihren Instagram- oder TikTok-Namen und einen eigenen Schlusssatz ein. Der Name erscheint am Ende Ihrer nächsten Videos, der Schlusssatz unter ihren Texten.",
    },
    next: "Ihre nächsten Videos kommen am {date}.",
  },
  short: {
    one: "Eines der fünf Videos dieser Woche hat unsere Prüfung nicht bestanden. Wir haben es weggelassen, statt Ihnen etwas Falsches zu schicken.",
    two: "Zwei der fünf Videos dieser Woche haben unsere Prüfung nicht bestanden. Wir haben sie weggelassen, statt Ihnen etwas Falsches zu schicken.",
    other: "{n} der fünf Videos dieser Woche haben unsere Prüfung nicht bestanden. Wir haben sie weggelassen, statt Ihnen etwas Falsches zu schicken.",
  },
  late: {
    subject: "Die Videos dieser Woche verspäten sich",
    preheader: "Sie sind unterwegs, und Sie müssen nichts tun.",
    title: "Ihre Videos verspäten sich",
    body: "die Videos dieser Woche brauchen länger als sonst. Sie stehen in der Warteschlange und sind unterwegs, und es entstehen Ihnen keine zusätzlichen Kosten.",
    next: "Wir schreiben Ihnen, wenn sie zur Freigabe bereitstehen. Bis dahin müssen Sie nichts tun.",
  },
  firstLate: {
    subject: "Ihre ersten Videos brauchen etwas länger",
    preheader: "Sie sind unterwegs, und Sie müssen nichts tun.",
    title: "Ihre ersten Videos sind unterwegs",
    body: "Ihre erste Woche Videos braucht länger als sonst. Sie steht in der Warteschlange und ist unterwegs, und es entstehen Ihnen keine zusätzlichen Kosten.",
    next: "Wir schreiben Ihnen, sobald Ihre Videos zur Freigabe bereitstehen. Bis dahin müssen Sie nichts tun.",
  },
};

const es: DeliveryNotices = {
  first: {
    subject: "Tus primeros vídeos de DentVideo están listos",
    title: "Tus primeros vídeos están listos",
    welcome: "Te damos la bienvenida a tu primera semana con DentVideo. Estos vídeos educativos se han hecho para tu clínica y los ha revisado nuestro software; la última palabra es tuya.",
    stepsIntro: "A partir de aquí son tres pasos:",
    approveHere: { title: "Aprueba con un toque", body: "¿Te convencen? «{approve}», aquí abajo, lo hace con un solo toque. También puedes aprobarlos uno a uno en la app." },
    approveInApp: { title: "Apruébalos", body: "Abre la app, mira cada vídeo y aprueba los que te convenzan. Cada uno es un solo toque." },
    lookFirst: { title: "Échales un vistazo", body: "Cada vídeo marcado para revisar indica el motivo. Ábrelo en la app y apruébalo cuando te parezca bien." },
    post: { title: "Publica desde el móvil", body: "Abre DentVideo en el móvil y toca un vídeo aprobado. «{post}» lo guarda en tu móvil." },
    paste: { title: "Pega el texto", body: "El texto y los hashtags se copian a la vez. En Instagram o TikTok, elige el vídeo y pega." },
    nudge: {
      handle: "Si quieres, añade tu usuario de Instagram o TikTok en {settings}. Aparecerá al final de tus próximos vídeos.",
      closingLine: "Si quieres, añade tu propia frase de cierre en {settings}. Irá debajo de los textos de tus próximos vídeos.",
      both: "Si quieres, añade en {settings} tu usuario de Instagram o TikTok y tu propia frase de cierre. El usuario aparece al final de tus próximos vídeos y la frase, debajo de sus textos.",
    },
    next: "Tus próximos vídeos llegan el {date}.",
  },
  short: {
    one: "Uno de los cinco vídeos de esta semana no pasó nuestras comprobaciones, así que lo hemos dejado fuera en lugar de enviarte algo incorrecto.",
    two: "Dos de los cinco vídeos de esta semana no pasaron nuestras comprobaciones, así que los hemos dejado fuera en lugar de enviarte algo incorrecto.",
    other: "{n} de los cinco vídeos de esta semana no pasaron nuestras comprobaciones, así que los hemos dejado fuera en lugar de enviarte algo incorrecto.",
  },
  late: {
    subject: "Los vídeos de esta semana llegan con retraso",
    preheader: "Están en camino y no tienes que hacer nada.",
    title: "Tus vídeos llegan con retraso",
    body: "Los vídeos de esta semana están tardando más de lo habitual. Están en la cola y en camino, y no se cobra nada extra.",
    next: "Te escribiremos cuando estén listos para que los revises. Hasta entonces, no tienes que hacer nada.",
  },
  firstLate: {
    subject: "Tus primeros vídeos tardan un poco más",
    preheader: "Están en camino y no tienes que hacer nada.",
    title: "Tus primeros vídeos están en camino",
    body: "Tu primera semana de vídeos está tardando más de lo habitual. Está en la cola y en camino, y no se cobra nada extra.",
    next: "Te escribiremos en cuanto tus vídeos estén listos para que los revises. Hasta entonces, no tienes que hacer nada.",
  },
};

const fr: DeliveryNotices = {
  first: {
    subject: "Vos premières vidéos DentVideo sont prêtes",
    title: "Vos premières vidéos sont prêtes",
    welcome: "Bienvenue dans votre première semaine avec DentVideo. Ces vidéos patients ont été réalisées pour votre cabinet et vérifiées par notre logiciel ; le dernier mot vous revient.",
    stepsIntro: "La suite tient en trois étapes :",
    approveHere: { title: "Valider d'un geste", body: "Elles vous conviennent ? « {approve} », plus bas, le fait d'un seul geste. Vous pouvez aussi les valider une à une dans l'application." },
    approveInApp: { title: "Validez-les", body: "Ouvrez l'application, regardez chaque vidéo et validez celles qui vous conviennent. Un seul geste suffit pour chacune." },
    lookFirst: { title: "Jetez un œil", body: "Chaque vidéo à revoir indique la raison. Ouvrez-la dans l'application et validez-la quand elle vous convient." },
    post: { title: "Publiez depuis votre téléphone", body: "Ouvrez DentVideo sur votre téléphone et touchez une vidéo validée. « {post} » l'enregistre sur votre téléphone." },
    paste: { title: "Collez le texte", body: "Le texte et les hashtags sont copiés en même temps. Dans Instagram ou TikTok, choisissez la vidéo et collez." },
    nudge: {
      handle: "Si vous le souhaitez, ajoutez votre compte Instagram ou TikTok dans {settings}. Il apparaîtra à la fin de vos prochaines vidéos.",
      closingLine: "Si vous le souhaitez, ajoutez votre propre phrase de conclusion dans {settings}. Elle figurera sous les textes de vos prochaines vidéos.",
      both: "Si vous le souhaitez, ajoutez dans {settings} votre compte Instagram ou TikTok et votre propre phrase de conclusion. Le compte apparaît à la fin de vos prochaines vidéos, la phrase sous leurs textes.",
    },
    next: "Vos prochaines vidéos arrivent le {date}.",
  },
  short: {
    one: "Une des cinq vidéos de cette semaine n'a pas passé nos vérifications : nous l'avons écartée plutôt que de vous envoyer quelque chose d'inexact.",
    two: "Deux des cinq vidéos de cette semaine n'ont pas passé nos vérifications : nous les avons écartées plutôt que de vous envoyer quelque chose d'inexact.",
    other: "{n} des cinq vidéos de cette semaine n'ont pas passé nos vérifications : nous les avons écartées plutôt que de vous envoyer quelque chose d'inexact.",
  },
  late: {
    subject: "Les vidéos de la semaine ont du retard",
    preheader: "Elles sont en route, vous n'avez rien à faire.",
    title: "Vos vidéos ont du retard",
    body: "Les vidéos de cette semaine prennent plus de temps que d'habitude. Elles sont dans la file d'attente et en route, et rien de plus ne vous est facturé.",
    next: "Nous vous écrirons quand elles seront prêtes à être validées. D'ici là, vous n'avez rien à faire.",
  },
  firstLate: {
    subject: "Vos premières vidéos arrivent un peu plus tard",
    preheader: "Elles sont en route, vous n'avez rien à faire.",
    title: "Vos premières vidéos sont en route",
    body: "Votre première semaine de vidéos prend plus de temps que d'habitude. Elle est dans la file d'attente et en route, et rien de plus ne vous est facturé.",
    next: "Nous vous écrirons dès que vos vidéos seront prêtes à être validées. D'ici là, vous n'avez rien à faire.",
  },
};

const tr: DeliveryNotices = {
  first: {
    subject: "İlk DentVideo videolarınız hazır",
    title: "İlk videolarınız hazır",
    welcome: "DentVideo ile ilk haftanıza hoş geldiniz. Bu hasta bilgilendirme videoları kliniğiniz için hazırlandı ve yazılımımızın kontrolünden geçti; son karar sizin.",
    stepsIntro: "Bundan sonrası üç adım:",
    approveHere: { title: "Tek dokunuşla onaylayın", body: "Beğendiyseniz aşağıdaki “{approve}” düğmesine dokunmanız yeterli: hazır videoların hepsi birden onaylanır. Dilerseniz uygulamada tek tek de onaylayabilirsiniz." },
    approveInApp: { title: "Onaylayın", body: "Uygulamayı açın, her videoyu izleyin ve beğendiklerinizi onaylayın. Her biri tek dokunuş." },
    lookFirst: { title: "Kısa bir göz atın", body: "Kontrol bekleyen her videoda nedeni yazar. Videoyu uygulamada açın, içinize sinince onaylayın." },
    post: { title: "Telefonunuzdan paylaşın", body: "DentVideo'yu telefonunuzda açıp onaylı bir videoya dokunun. “{post}” düğmesi videoyu telefonunuza kaydeder." },
    paste: { title: "Açıklamayı yapıştırın", body: "Açıklama metni ve hashtag'ler aynı anda kopyalanır. Instagram'da ya da TikTok'ta videoyu seçip yapıştırmanız yeterli." },
    nudge: {
      handle: "İsterseniz {settings} bölümünden Instagram ya da TikTok kullanıcı adınızı ekleyin. Sonraki videolarınızın sonunda görünür.",
      closingLine: "İsterseniz {settings} bölümünden kendi kapanış cümlenizi ekleyin. Sonraki videolarınızın açıklama metinlerinin altına eklenir.",
      both: "İsterseniz {settings} bölümünden Instagram ya da TikTok kullanıcı adınızı ve kendi kapanış cümlenizi ekleyin. Kullanıcı adı sonraki videolarınızın sonunda, kapanış cümlesi açıklama metinlerinin altında görünür.",
    },
    next: "Sonraki haftanın videoları {date} günü geliyor.",
  },
  short: {
    one: "Bu haftanın beş videosundan biri kontrollerimizden geçemedi; size hatalı bir şey göndermek yerine onu çıkardık.",
    two: "Bu haftanın beş videosundan ikisi kontrollerimizden geçemedi; size hatalı bir şey göndermek yerine onları çıkardık.",
    other: "Bu haftanın beş videosundan {n} tanesi kontrollerimizden geçemedi; size hatalı bir şey göndermek yerine onları çıkardık.",
  },
  late: {
    subject: "Bu haftanın videoları gecikiyor",
    preheader: "Videolarınız yolda, sizin bir şey yapmanız gerekmiyor.",
    title: "Videolarınız gecikiyor",
    body: "Bu haftanın videoları her zamankinden uzun sürüyor. Sırada bekliyorlar ve yoldalar; sizden ek bir ücret alınmaz.",
    next: "Onayınıza hazır olduklarında size e-posta göndereceğiz. O zamana kadar sizin bir şey yapmanız gerekmiyor.",
  },
  firstLate: {
    subject: "İlk videolarınız biraz daha uzun sürüyor",
    preheader: "Videolarınız yolda, sizin bir şey yapmanız gerekmiyor.",
    title: "İlk videolarınız yolda",
    body: "İlk haftanızın videolarının hazırlanması her zamankinden uzun sürüyor. Sırada bekliyorlar ve yoldalar; sizden ek bir ücret alınmaz.",
    next: "Videolarınız onayınıza hazır olur olmaz size e-posta göndereceğiz. O zamana kadar sizin bir şey yapmanız gerekmiyor.",
  },
};

const ja: DeliveryNotices = {
  first: {
    subject: "最初のDentVideo動画ができました",
    title: "最初の動画ができました",
    welcome: "DentVideoでの最初の1週間へようこそ。医院のために制作した患者さん向け説明動画で、ソフトウェアによるチェックも済んでいます。最終判断は先生が行います。",
    stepsIntro: "ここから先は3つのステップです。",
    approveHere: { title: "ワンタップで承認", body: "内容に問題がなければ、下の「{approve}」をタップするだけで完了です。アプリで1本ずつ承認することもできます。" },
    approveInApp: { title: "承認する", body: "アプリを開いて各動画をご覧になり、問題のないものを承認してください。1本につきワンタップです。" },
    lookFirst: { title: "まずはご確認を", body: "要確認の動画には理由が表示されています。アプリで開き、問題がなければ承認してください。" },
    post: { title: "スマートフォンから投稿", body: "スマートフォンでDentVideoを開き、承認済みの動画をタップしてください。「{post}」で動画がスマートフォンに保存されます。" },
    paste: { title: "文章を貼り付ける", body: "投稿用の文章とハッシュタグも同時にコピーされます。InstagramやTikTokで動画を選び、貼り付けるだけです。" },
    nudge: {
      handle: "よろしければ、{settings}でInstagramまたはTikTokのアカウント名をご登録ください。次回以降の動画の最後に表示されます。",
      closingLine: "よろしければ、{settings}で医院独自の締めの一文をご登録ください。次回以降の動画の投稿文の下に入ります。",
      both: "よろしければ、{settings}でInstagramまたはTikTokのアカウント名と、医院独自の締めの一文をご登録ください。アカウント名は次回以降の動画の最後に、締めの一文は投稿文の下に入ります。",
    },
    next: "次の1週間分の動画は{date}にお届けします。",
  },
  short: {
    one: "今週の5本のうち1本は当社のチェックを通過しなかったため、誤りのある動画をお届けしないよう、今回は外しました。",
    two: "今週の5本のうち2本は当社のチェックを通過しなかったため、誤りのある動画をお届けしないよう、今回は外しました。",
    other: "今週の5本のうち{n}本は当社のチェックを通過しなかったため、誤りのある動画をお届けしないよう、今回は外しました。",
  },
  late: {
    subject: "今週の動画のお届けが遅れています",
    preheader: "制作は進んでおり、先生に行っていただくことはありません。",
    title: "動画のお届けが遅れています",
    body: "今週の動画は、いつもより制作に時間がかかっています。すでに制作の順番に入っており、追加の料金はかかりません。",
    next: "ご確認いただける状態になりましたら、メールでお知らせします。それまで先生に行っていただくことはありません。",
  },
  firstLate: {
    subject: "最初の動画の完成が少し遅れています",
    preheader: "制作は進んでおり、先生に行っていただくことはありません。",
    title: "最初の動画を制作しています",
    body: "最初の1週間分の動画は、いつもより制作に時間がかかっています。すでに制作の順番に入っており、追加の料金はかかりません。",
    next: "ご確認いただける状態になり次第、メールでお知らせします。それまで先生に行っていただくことはありません。",
  },
};

const ar: DeliveryNotices = {
  first: {
    subject: "أول فيديوهاتكم من DentVideo جاهزة",
    title: "أول فيديوهاتكم جاهزة",
    welcome: "أهلاً بكم في أسبوعكم الأول مع DentVideo. أُعدّت هذه الفيديوهات التوعوية لعيادتكم وراجعتها برمجياتنا، والقرار الأخير لكم.",
    stepsIntro: "ما تبقّى ثلاث خطوات:",
    approveHere: { title: "اعتماد بلمسة واحدة", body: "راضون عنها؟ تكفي لمسة واحدة على «{approve}» في الأسفل. ويمكنكم أيضاً اعتمادها واحداً تلو الآخر في التطبيق." },
    approveInApp: { title: "اعتمدوها", body: "افتحوا التطبيق، وشاهدوا كل فيديو، واعتمدوا ما ترضون عنه. يكفي لكل فيديو لمسة واحدة." },
    lookFirst: { title: "نظرة سريعة أولاً", body: "كل فيديو يحتاج نظرة سريعة يذكر السبب. افتحوه في التطبيق واعتمدوه حين ترضون عنه." },
    post: { title: "انشروا من هاتفكم", body: "افتحوا DentVideo على هاتفكم واضغطوا على فيديو معتمد. يحفظ زر «{post}» الفيديو على هاتفكم." },
    paste: { title: "الصقوا النص", body: "يُنسخ النص المرافق والوسوم في الوقت نفسه. في Instagram أو TikTok، اختاروا الفيديو والصقوا النص." },
    nudge: {
      handle: "إن شئتم، أضيفوا اسم حسابكم على Instagram أو TikTok في {settings}، فيظهر في نهاية فيديوهاتكم القادمة.",
      closingLine: "إن شئتم، أضيفوا جملة ختامية خاصة بكم في {settings}، فتظهر أسفل نصوص فيديوهاتكم القادمة.",
      both: "إن شئتم، أضيفوا في {settings} اسم حسابكم على Instagram أو TikTok وجملة ختامية خاصة بكم. يظهر اسم الحساب في نهاية فيديوهاتكم القادمة، والجملة الختامية أسفل نصوصها.",
    },
    next: "يصل أسبوعكم القادم من الفيديوهات يوم {date}.",
  },
  short: {
    one: "لم يجتز فيديو واحد من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناه بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
    two: "لم يجتز فيديوهان من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناهما بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
    few: "لم تجتز {n} فيديوهات من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناها بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
    other: "لم تجتز {n} فيديوهات من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناها بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
  },
  late: {
    subject: "فيديوهات هذا الأسبوع تتأخر قليلاً",
    preheader: "إنها في الطريق، ولا شيء مطلوب منكم.",
    title: "فيديوهاتكم تتأخر قليلاً",
    body: "تستغرق فيديوهات هذا الأسبوع وقتاً أطول من المعتاد. إنها في قائمة الانتظار وفي طريقها إليكم، ولا تُضاف أي رسوم.",
    next: "سنراسلكم عندما تصبح جاهزة لمراجعتكم. ولا شيء مطلوب منكم حتى ذلك الحين.",
  },
  firstLate: {
    subject: "أول فيديوهاتكم تحتاج وقتاً أطول قليلاً",
    preheader: "إنها في الطريق، ولا شيء مطلوب منكم.",
    title: "أول فيديوهاتكم في الطريق",
    body: "يستغرق إعداد فيديوهات أسبوعكم الأول وقتاً أطول من المعتاد. إنها في قائمة الانتظار وفي طريقها إليكم، ولا تُضاف أي رسوم.",
    next: "سنراسلكم فور جاهزية فيديوهاتكم لمراجعتكم. ولا شيء مطلوب منكم حتى ذلك الحين.",
  },
};

const pl: DeliveryNotices = {
  first: {
    subject: "Pierwsze filmy DentVideo są gotowe",
    title: "Pierwsze filmy są gotowe",
    welcome: "witamy w pierwszym tygodniu z DentVideo. Te filmy edukacyjne powstały dla Państwa gabinetu i zostały sprawdzone przez nasze oprogramowanie; ostatnie słowo należy do Państwa.",
    stepsIntro: "Dalej wystarczą trzy kroki:",
    approveHere: { title: "Akceptacja jednym dotknięciem", body: "Wszystko się zgadza? Wystarczy jedno dotknięcie „{approve}” poniżej. Można je też zatwierdzać pojedynczo w aplikacji." },
    approveInApp: { title: "Akceptacja w aplikacji", body: "Wystarczy otworzyć aplikację, obejrzeć każdy film i zatwierdzić te, które się podobają. Każdy to jedno dotknięcie." },
    lookFirst: { title: "Krótki przegląd", body: "Przy każdym filmie do przejrzenia podajemy powód. Wystarczy otworzyć go w aplikacji i zatwierdzić, gdy wszystko się zgadza." },
    post: { title: "Publikacja z telefonu", body: "Prosimy otworzyć DentVideo w telefonie i dotknąć zaakceptowanego filmu. „{post}” zapisuje go w telefonie." },
    paste: { title: "Wklejenie opisu", body: "Opis i hashtagi kopiują się w tym samym momencie. W Instagramie lub TikToku wystarczy wybrać film i wkleić opis." },
    nudge: {
      handle: "Jeśli chcą Państwo, w zakładce {settings} można dodać nazwę konta na Instagramie lub TikToku. Pojawi się na końcu kolejnych filmów.",
      closingLine: "Jeśli chcą Państwo, w zakładce {settings} można dodać własne zdanie na zakończenie. Pojawi się pod opisami kolejnych filmów.",
      both: "Jeśli chcą Państwo, w zakładce {settings} można dodać nazwę konta na Instagramie lub TikToku oraz własne zdanie na zakończenie. Nazwa konta pojawi się na końcu kolejnych filmów, a zdanie pod ich opisami.",
    },
    next: "Kolejny tydzień filmów przyjdzie w {date}.",
  },
  short: {
    one: "Jeden z pięciu filmów na ten tydzień nie przeszedł naszej kontroli, więc go pominęliśmy, zamiast wysyłać coś błędnego.",
    two: "Dwa z pięciu filmów na ten tydzień nie przeszły naszej kontroli, więc je pominęliśmy, zamiast wysyłać coś błędnego.",
    few: "{n} z pięciu filmów na ten tydzień nie przeszły naszej kontroli, więc je pominęliśmy, zamiast wysyłać coś błędnego.",
    other: "{n} z pięciu filmów na ten tydzień nie przeszło naszej kontroli, więc je pominęliśmy, zamiast wysyłać coś błędnego.",
  },
  late: {
    subject: "Filmy na ten tydzień się opóźniają",
    preheader: "Są w drodze i nie muszą Państwo nic robić.",
    title: "Filmy się opóźniają",
    body: "filmy na ten tydzień powstają dłużej niż zwykle. Są w kolejce i w drodze, a my nie naliczamy za to żadnych dodatkowych opłat.",
    next: "Napiszemy, gdy będą gotowe do przejrzenia. Do tego czasu nie muszą Państwo nic robić.",
  },
  firstLate: {
    subject: "Pierwsze filmy potrwają trochę dłużej",
    preheader: "Są w drodze i nie muszą Państwo nic robić.",
    title: "Pierwsze filmy są w drodze",
    body: "przygotowanie filmów na pierwszy tydzień trwa dłużej niż zwykle. Są w kolejce i w drodze, a my nie naliczamy za to żadnych dodatkowych opłat.",
    next: "Napiszemy, gdy tylko filmy będą gotowe do przejrzenia. Do tego czasu nie muszą Państwo nic robić.",
  },
};

export const DELIVERY_NOTICES: Record<Locale, DeliveryNotices> = { en, de, es, tr, fr, ja, ar, pl };
export const DELIVERY_NOTICE_LANGUAGES = Object.keys(DELIVERY_NOTICES) as Locale[];

export function hasDeliveryNotices(language: string | null | undefined): language is Locale {
  return !!language && Object.hasOwn(DELIVERY_NOTICES, language);
}

/** The notices in a clinic's language; Italian, Portuguese and anything unknown get English. */
export function deliveryNoticesText(language: string | null | undefined): { lang: Locale; copy: DeliveryNotices } {
  const lang: Locale = hasDeliveryNotices(language) ? language : "en";
  return { lang, copy: DELIVERY_NOTICES[lang] };
}
