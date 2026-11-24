import type { Locale } from "./dentvideo-locales";

/**
 * The words around a delivery that is not routine (lib/dentvid/email.ts):
 *
 *   first      the clinic's first delivered week: a welcome, three steps
 *              from "ready" to "posted" with the app's real button labels,
 *              one optional nudge towards Settings, the next delivery date;
 *   short      a week with fewer than five usable videos: one honest line
 *              about the ones left out (no remake or credit promised). It
 *              blames our checks only when every one left out was refused by
 *              them ("checks"); a technical failure, or a slot never made,
 *              gets the plainer "unfinished" line;
 *   late       the delivery watchdog found a paying clinic's week late;
 *   firstLate  the first-week watchdog found a first week late.
 *              Each says "queued and on its way" only when the worker saw
 *              the week queued or running ("queued"); otherwise that we were
 *              alerted and are on it ("held"), like the library's own note.
 *
 * Placeholders, filled by email.ts: {approve} the email's own approve-all
 * button, {post} the app's "Post it" button on an approved video,
 * {settings} the app's Settings tab (all read from their content files at
 * send time, so a renamed button is renamed here too), {date} the next
 * Monday. The short lines write their number out, one sentence per count.
 *
 * Every locale is written natively, in the same voice and terms as the
 * ready email and the welcome. Italian and Portuguese clinics, whose app
 * and other notices are in English, get these in English
 * (deliveryNoticesText).
 */

export type NoticeStep = { title: string; body: string };

/** One sentence per count of videos left out (1 to 4), the number written out. */
export type MissingLines = Record<1 | 2 | 3 | 4, string>;

export type DelayNotice = {
  subject: string;
  /** The week is queued or running: it is on its way. */
  queued: { preheader: string; title: string; body: string };
  /** It is not (a failed run that waits for us): we were alerted and are on it. No "queued". */
  held: { preheader: string; title: string; body: string };
  next: string;
};

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
  short: {
    /** Every one left out was refused by our checks. */
    checks: MissingLines;
    /** Not (only) the checks: a technical failure, or a slot never made. Says nothing about checks. */
    unfinished: MissingLines;
  };
  late: DelayNotice;
  firstLate: DelayNotice;
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
    post: { title: "Post from your phone", body: "Open DentVideo on your phone and tap “{post}” on an approved video. One more tap saves the video to your phone and copies its caption." },
    paste: { title: "Paste the caption", body: "In Instagram or TikTok, pick the video and paste. The hashtags come with the caption." },
    nudge: {
      handle: "If you like, add your Instagram or TikTok handle in {settings}. It will appear at the end of your next videos.",
      closingLine: "If you like, add your own closing line in {settings}. It will go under the captions of your next videos.",
      both: "If you like, add your Instagram or TikTok handle and your own closing line in {settings}. The handle appears at the end of your next videos, the closing line under their captions.",
    },
    next: "Your next week of videos arrives on {date}.",
  },
  short: {
    checks: {
      1: "One of this week's five videos did not pass our checks, so we left it out rather than send you something wrong.",
      2: "Two of this week's five videos did not pass our checks, so we left them out rather than send you something wrong.",
      3: "Three of this week's five videos did not pass our checks, so we left them out rather than send you something wrong.",
      4: "Four of this week's five videos did not pass our checks, so we left them out rather than send you something wrong.",
    },
    unfinished: {
      1: "One of this week's five videos could not be finished to our standard, so we left it out.",
      2: "Two of this week's five videos could not be finished to our standard, so we left them out.",
      3: "Three of this week's five videos could not be finished to our standard, so we left them out.",
      4: "Four of this week's five videos could not be finished to our standard, so we left them out.",
    },
  },
  late: {
    subject: "This week's videos are running late",
    queued: {
      preheader: "They are on their way, and there is nothing you need to do.",
      title: "Your videos are running late",
      body: "This week's videos are taking longer than usual. They are queued and on their way, and nothing extra is charged.",
    },
    held: {
      preheader: "We are on it, and there is nothing you need to do.",
      title: "Your videos are running late",
      body: "This week's videos are taking longer than usual. We have been alerted and are on it, and nothing extra is charged.",
    },
    next: "We will email you when they are ready for your review. Until then there is nothing you need to do.",
  },
  firstLate: {
    subject: "Your first videos are taking a little longer",
    queued: {
      preheader: "They are on their way, and there is nothing you need to do.",
      title: "Your first videos are on their way",
      body: "Your first week of videos is taking longer than usual to make. It is queued and on its way, and nothing extra is charged.",
    },
    held: {
      preheader: "We are on it, and there is nothing you need to do.",
      title: "Your first videos are taking a little longer",
      body: "Your first week of videos is taking longer than usual to make. We have been alerted and are on it, and nothing extra is charged.",
    },
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
    post: { title: "Vom Handy posten", body: "Öffnen Sie DentVideo auf dem Handy und tippen Sie bei einem freigegebenen Video auf „{post}“. Ein weiteres Tippen sichert das Video auf Ihrem Handy und kopiert den Text." },
    paste: { title: "Text einfügen", body: "Wählen Sie in Instagram oder TikTok das Video aus und fügen Sie den Text ein. Die Hashtags sind schon dabei." },
    nudge: {
      handle: "Wenn Sie möchten, tragen Sie unter {settings} Ihren Instagram- oder TikTok-Namen ein. Er erscheint dann am Ende Ihrer nächsten Videos.",
      closingLine: "Wenn Sie möchten, hinterlegen Sie unter {settings} einen eigenen Schlusssatz. Er steht dann unter den Texten Ihrer nächsten Videos.",
      both: "Wenn Sie möchten, tragen Sie unter {settings} Ihren Instagram- oder TikTok-Namen und einen eigenen Schlusssatz ein. Der Name erscheint am Ende Ihrer nächsten Videos, der Schlusssatz unter ihren Texten.",
    },
    next: "Ihre nächsten Videos kommen am {date}.",
  },
  short: {
    checks: {
      1: "Eines der fünf Videos dieser Woche hat unsere Prüfung nicht bestanden. Wir haben es weggelassen, statt Ihnen etwas Falsches zu schicken.",
      2: "Zwei der fünf Videos dieser Woche haben unsere Prüfung nicht bestanden. Wir haben sie weggelassen, statt Ihnen etwas Falsches zu schicken.",
      3: "Drei der fünf Videos dieser Woche haben unsere Prüfung nicht bestanden. Wir haben sie weggelassen, statt Ihnen etwas Falsches zu schicken.",
      4: "Vier der fünf Videos dieser Woche haben unsere Prüfung nicht bestanden. Wir haben sie weggelassen, statt Ihnen etwas Falsches zu schicken.",
    },
    unfinished: {
      1: "Eines der fünf Videos dieser Woche konnten wir nicht in unserer gewohnten Qualität fertigstellen, deshalb haben wir es weggelassen.",
      2: "Zwei der fünf Videos dieser Woche konnten wir nicht in unserer gewohnten Qualität fertigstellen, deshalb haben wir sie weggelassen.",
      3: "Drei der fünf Videos dieser Woche konnten wir nicht in unserer gewohnten Qualität fertigstellen, deshalb haben wir sie weggelassen.",
      4: "Vier der fünf Videos dieser Woche konnten wir nicht in unserer gewohnten Qualität fertigstellen, deshalb haben wir sie weggelassen.",
    },
  },
  late: {
    subject: "Die Videos dieser Woche verspäten sich",
    queued: {
      preheader: "Sie sind unterwegs, und Sie müssen nichts tun.",
      title: "Ihre Videos verspäten sich",
      body: "die Videos dieser Woche brauchen länger als sonst. Sie stehen in der Warteschlange und sind unterwegs, und es entstehen Ihnen keine zusätzlichen Kosten.",
    },
    held: {
      preheader: "Wir kümmern uns darum, und Sie müssen nichts tun.",
      title: "Ihre Videos verspäten sich",
      body: "die Videos dieser Woche brauchen länger als sonst. Wir sind informiert und kümmern uns darum, und es entstehen Ihnen keine zusätzlichen Kosten.",
    },
    next: "Wir schreiben Ihnen, wenn sie zur Freigabe bereitstehen. Bis dahin müssen Sie nichts tun.",
  },
  firstLate: {
    subject: "Ihre ersten Videos brauchen etwas länger",
    queued: {
      preheader: "Sie sind unterwegs, und Sie müssen nichts tun.",
      title: "Ihre ersten Videos sind unterwegs",
      body: "Ihre erste Woche Videos braucht länger als sonst. Sie steht in der Warteschlange und ist unterwegs, und es entstehen Ihnen keine zusätzlichen Kosten.",
    },
    held: {
      preheader: "Wir kümmern uns darum, und Sie müssen nichts tun.",
      title: "Ihre ersten Videos brauchen etwas länger",
      body: "Ihre erste Woche Videos braucht länger als sonst. Wir sind informiert und kümmern uns darum, und es entstehen Ihnen keine zusätzlichen Kosten.",
    },
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
    post: { title: "Publica desde el móvil", body: "Abre DentVideo en el móvil y, en un vídeo aprobado, toca «{post}». Con otro toque el vídeo se guarda en tu móvil y su texto se copia." },
    paste: { title: "Pega el texto", body: "En Instagram o TikTok, elige el vídeo y pega. Los hashtags ya van con el texto." },
    nudge: {
      handle: "Si quieres, añade tu usuario de Instagram o TikTok en {settings}. Aparecerá al final de tus próximos vídeos.",
      closingLine: "Si quieres, añade tu propia frase de cierre en {settings}. Irá debajo de los textos de tus próximos vídeos.",
      both: "Si quieres, añade en {settings} tu usuario de Instagram o TikTok y tu propia frase de cierre. El usuario aparece al final de tus próximos vídeos y la frase, debajo de sus textos.",
    },
    next: "Tus próximos vídeos llegan el {date}.",
  },
  short: {
    checks: {
      1: "Uno de los cinco vídeos de esta semana no pasó nuestras comprobaciones, así que lo hemos dejado fuera en lugar de enviarte algo incorrecto.",
      2: "Dos de los cinco vídeos de esta semana no pasaron nuestras comprobaciones, así que los hemos dejado fuera en lugar de enviarte algo incorrecto.",
      3: "Tres de los cinco vídeos de esta semana no pasaron nuestras comprobaciones, así que los hemos dejado fuera en lugar de enviarte algo incorrecto.",
      4: "Cuatro de los cinco vídeos de esta semana no pasaron nuestras comprobaciones, así que los hemos dejado fuera en lugar de enviarte algo incorrecto.",
    },
    unfinished: {
      1: "Uno de los cinco vídeos de esta semana no se pudo terminar con la calidad que exigimos, así que lo hemos dejado fuera.",
      2: "Dos de los cinco vídeos de esta semana no se pudieron terminar con la calidad que exigimos, así que los hemos dejado fuera.",
      3: "Tres de los cinco vídeos de esta semana no se pudieron terminar con la calidad que exigimos, así que los hemos dejado fuera.",
      4: "Cuatro de los cinco vídeos de esta semana no se pudieron terminar con la calidad que exigimos, así que los hemos dejado fuera.",
    },
  },
  late: {
    subject: "Los vídeos de esta semana llegan con retraso",
    queued: {
      preheader: "Están en camino y no tienes que hacer nada.",
      title: "Tus vídeos llegan con retraso",
      body: "Los vídeos de esta semana están tardando más de lo habitual. Están en la cola y en camino, y no se cobra nada extra.",
    },
    held: {
      preheader: "Estamos en ello y no tienes que hacer nada.",
      title: "Tus vídeos llegan con retraso",
      body: "Los vídeos de esta semana están tardando más de lo habitual. Ya estamos avisados y trabajando en ello, y no se cobra nada extra.",
    },
    next: "Te escribiremos cuando estén listos para que los revises. Hasta entonces, no tienes que hacer nada.",
  },
  firstLate: {
    subject: "Tus primeros vídeos tardan un poco más",
    queued: {
      preheader: "Están en camino y no tienes que hacer nada.",
      title: "Tus primeros vídeos están en camino",
      body: "Tu primera semana de vídeos está tardando más de lo habitual. Está en la cola y en camino, y no se cobra nada extra.",
    },
    held: {
      preheader: "Estamos en ello y no tienes que hacer nada.",
      title: "Tus primeros vídeos tardan un poco más",
      body: "Tu primera semana de vídeos está tardando más de lo habitual. Ya estamos avisados y trabajando en ello, y no se cobra nada extra.",
    },
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
    post: { title: "Publiez depuis votre téléphone", body: "Ouvrez DentVideo sur votre téléphone et, sur une vidéo validée, touchez « {post} ». Une autre touche enregistre la vidéo sur votre téléphone et copie son texte." },
    paste: { title: "Collez le texte", body: "Dans Instagram ou TikTok, choisissez la vidéo et collez. Les hashtags sont déjà dans le texte." },
    nudge: {
      handle: "Si vous le souhaitez, ajoutez votre compte Instagram ou TikTok dans {settings}. Il apparaîtra à la fin de vos prochaines vidéos.",
      closingLine: "Si vous le souhaitez, ajoutez votre propre phrase de conclusion dans {settings}. Elle figurera sous les textes de vos prochaines vidéos.",
      both: "Si vous le souhaitez, ajoutez dans {settings} votre compte Instagram ou TikTok et votre propre phrase de conclusion. Le compte apparaît à la fin de vos prochaines vidéos, la phrase sous leurs textes.",
    },
    next: "Vos prochaines vidéos arrivent le {date}.",
  },
  short: {
    checks: {
      1: "Une des cinq vidéos de cette semaine n'a pas passé nos vérifications : nous l'avons écartée plutôt que de vous envoyer quelque chose d'inexact.",
      2: "Deux des cinq vidéos de cette semaine n'ont pas passé nos vérifications : nous les avons écartées plutôt que de vous envoyer quelque chose d'inexact.",
      3: "Trois des cinq vidéos de cette semaine n'ont pas passé nos vérifications : nous les avons écartées plutôt que de vous envoyer quelque chose d'inexact.",
      4: "Quatre des cinq vidéos de cette semaine n'ont pas passé nos vérifications : nous les avons écartées plutôt que de vous envoyer quelque chose d'inexact.",
    },
    unfinished: {
      1: "Une des cinq vidéos de cette semaine n'a pas pu être finalisée selon nos exigences : nous l'avons écartée.",
      2: "Deux des cinq vidéos de cette semaine n'ont pas pu être finalisées selon nos exigences : nous les avons écartées.",
      3: "Trois des cinq vidéos de cette semaine n'ont pas pu être finalisées selon nos exigences : nous les avons écartées.",
      4: "Quatre des cinq vidéos de cette semaine n'ont pas pu être finalisées selon nos exigences : nous les avons écartées.",
    },
  },
  late: {
    subject: "Les vidéos de la semaine ont du retard",
    queued: {
      preheader: "Elles sont en route, vous n'avez rien à faire.",
      title: "Vos vidéos ont du retard",
      body: "Les vidéos de cette semaine prennent plus de temps que d'habitude. Elles sont dans la file d'attente et en route, et rien de plus ne vous est facturé.",
    },
    held: {
      preheader: "Nous nous en occupons, vous n'avez rien à faire.",
      title: "Vos vidéos ont du retard",
      body: "Les vidéos de cette semaine prennent plus de temps que d'habitude. Nous sommes prévenus et nous nous en occupons, et rien de plus ne vous est facturé.",
    },
    next: "Nous vous écrirons quand elles seront prêtes à être validées. D'ici là, vous n'avez rien à faire.",
  },
  firstLate: {
    subject: "Vos premières vidéos arrivent un peu plus tard",
    queued: {
      preheader: "Elles sont en route, vous n'avez rien à faire.",
      title: "Vos premières vidéos sont en route",
      body: "Votre première semaine de vidéos prend plus de temps que d'habitude. Elle est dans la file d'attente et en route, et rien de plus ne vous est facturé.",
    },
    held: {
      preheader: "Nous nous en occupons, vous n'avez rien à faire.",
      title: "Vos premières vidéos arrivent un peu plus tard",
      body: "Votre première semaine de vidéos prend plus de temps que d'habitude. Nous sommes prévenus et nous nous en occupons, et rien de plus ne vous est facturé.",
    },
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
    post: { title: "Telefonunuzdan paylaşın", body: "DentVideo'yu telefonunuzda açın ve onaylı bir videoda “{post}” düğmesine dokunun. Bir dokunuş daha videoyu telefonunuza kaydeder ve açıklama metnini kopyalar." },
    paste: { title: "Açıklamayı yapıştırın", body: "Instagram'da ya da TikTok'ta videoyu seçip yapıştırmanız yeterli. Hashtag'ler açıklamayla birlikte gelir." },
    nudge: {
      handle: "İsterseniz {settings} bölümünden Instagram ya da TikTok kullanıcı adınızı ekleyin. Sonraki videolarınızın sonunda görünür.",
      closingLine: "İsterseniz {settings} bölümünden kendi kapanış cümlenizi ekleyin. Sonraki videolarınızın açıklama metinlerinin altına eklenir.",
      both: "İsterseniz {settings} bölümünden Instagram ya da TikTok kullanıcı adınızı ve kendi kapanış cümlenizi ekleyin. Kullanıcı adı sonraki videolarınızın sonunda, kapanış cümlesi açıklama metinlerinin altında görünür.",
    },
    next: "Sonraki haftanın videoları {date} günü geliyor.",
  },
  short: {
    checks: {
      1: "Bu haftanın beş videosundan biri kontrollerimizden geçemedi; size hatalı bir şey göndermek yerine onu çıkardık.",
      2: "Bu haftanın beş videosundan ikisi kontrollerimizden geçemedi; size hatalı bir şey göndermek yerine onları çıkardık.",
      3: "Bu haftanın beş videosundan üçü kontrollerimizden geçemedi; size hatalı bir şey göndermek yerine onları çıkardık.",
      4: "Bu haftanın beş videosundan dördü kontrollerimizden geçemedi; size hatalı bir şey göndermek yerine onları çıkardık.",
    },
    unfinished: {
      1: "Bu haftanın beş videosundan biri istediğimiz kalitede tamamlanamadı; bu yüzden onu çıkardık.",
      2: "Bu haftanın beş videosundan ikisi istediğimiz kalitede tamamlanamadı; bu yüzden onları çıkardık.",
      3: "Bu haftanın beş videosundan üçü istediğimiz kalitede tamamlanamadı; bu yüzden onları çıkardık.",
      4: "Bu haftanın beş videosundan dördü istediğimiz kalitede tamamlanamadı; bu yüzden onları çıkardık.",
    },
  },
  late: {
    subject: "Bu haftanın videoları gecikiyor",
    queued: {
      preheader: "Videolarınız yolda, sizin bir şey yapmanız gerekmiyor.",
      title: "Videolarınız gecikiyor",
      body: "Bu haftanın videoları her zamankinden uzun sürüyor. Sırada bekliyorlar ve yoldalar; sizden ek bir ücret alınmaz.",
    },
    held: {
      preheader: "İlgileniyoruz, sizin bir şey yapmanız gerekmiyor.",
      title: "Videolarınız gecikiyor",
      body: "Bu haftanın videoları her zamankinden uzun sürüyor. Ekibimiz haberdar ve ilgileniyor; sizden ek bir ücret alınmaz.",
    },
    next: "Onayınıza hazır olduklarında size e-posta göndereceğiz. O zamana kadar sizin bir şey yapmanız gerekmiyor.",
  },
  firstLate: {
    subject: "İlk videolarınız biraz daha uzun sürüyor",
    queued: {
      preheader: "Videolarınız yolda, sizin bir şey yapmanız gerekmiyor.",
      title: "İlk videolarınız yolda",
      body: "İlk haftanızın videolarının hazırlanması her zamankinden uzun sürüyor. Sırada bekliyorlar ve yoldalar; sizden ek bir ücret alınmaz.",
    },
    held: {
      preheader: "İlgileniyoruz, sizin bir şey yapmanız gerekmiyor.",
      title: "İlk videolarınız biraz daha uzun sürüyor",
      body: "İlk haftanızın videolarının hazırlanması her zamankinden uzun sürüyor. Ekibimiz haberdar ve ilgileniyor; sizden ek bir ücret alınmaz.",
    },
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
    post: { title: "スマートフォンから投稿", body: "スマートフォンでDentVideoを開き、承認済みの動画の「{post}」をタップしてください。もう一度タップすると、動画がスマートフォンに保存され、投稿用の文章もコピーされます。" },
    paste: { title: "文章を貼り付ける", body: "InstagramやTikTokで動画を選び、貼り付けるだけです。ハッシュタグも文章と一緒に入ります。" },
    nudge: {
      handle: "よろしければ、{settings}でInstagramまたはTikTokのアカウント名をご登録ください。次回以降の動画の最後に表示されます。",
      closingLine: "よろしければ、{settings}で医院独自の締めの一文をご登録ください。次回以降の動画の投稿文の下に入ります。",
      both: "よろしければ、{settings}でInstagramまたはTikTokのアカウント名と、医院独自の締めの一文をご登録ください。アカウント名は次回以降の動画の最後に、締めの一文は投稿文の下に入ります。",
    },
    next: "次の1週間分の動画は{date}にお届けします。",
  },
  short: {
    checks: {
      1: "今週の5本のうち1本は当社のチェックを通過しなかったため、誤りのある動画をお届けしないよう、今回は外しました。",
      2: "今週の5本のうち2本は当社のチェックを通過しなかったため、誤りのある動画をお届けしないよう、今回は外しました。",
      3: "今週の5本のうち3本は当社のチェックを通過しなかったため、誤りのある動画をお届けしないよう、今回は外しました。",
      4: "今週の5本のうち4本は当社のチェックを通過しなかったため、誤りのある動画をお届けしないよう、今回は外しました。",
    },
    unfinished: {
      1: "今週の5本のうち1本は、当社の基準を満たす形で仕上げることができなかったため、今回は外しました。",
      2: "今週の5本のうち2本は、当社の基準を満たす形で仕上げることができなかったため、今回は外しました。",
      3: "今週の5本のうち3本は、当社の基準を満たす形で仕上げることができなかったため、今回は外しました。",
      4: "今週の5本のうち4本は、当社の基準を満たす形で仕上げることができなかったため、今回は外しました。",
    },
  },
  late: {
    subject: "今週の動画のお届けが遅れています",
    queued: {
      preheader: "制作は進んでおり、先生に行っていただくことはありません。",
      title: "動画のお届けが遅れています",
      body: "今週の動画は、いつもより制作に時間がかかっています。すでに制作の順番に入っており、追加の料金はかかりません。",
    },
    held: {
      preheader: "担当者が対応しており、先生に行っていただくことはありません。",
      title: "動画のお届けが遅れています",
      body: "今週の動画は、いつもより制作に時間がかかっています。担当者が状況を把握し、対応しています。追加の料金はかかりません。",
    },
    next: "ご確認いただける状態になりましたら、メールでお知らせします。それまで先生に行っていただくことはありません。",
  },
  firstLate: {
    subject: "最初の動画の完成が少し遅れています",
    queued: {
      preheader: "制作は進んでおり、先生に行っていただくことはありません。",
      title: "最初の動画を制作しています",
      body: "最初の1週間分の動画は、いつもより制作に時間がかかっています。すでに制作の順番に入っており、追加の料金はかかりません。",
    },
    held: {
      preheader: "担当者が対応しており、先生に行っていただくことはありません。",
      title: "最初の動画の完成が少し遅れています",
      body: "最初の1週間分の動画は、いつもより制作に時間がかかっています。担当者が状況を把握し、対応しています。追加の料金はかかりません。",
    },
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
    post: { title: "انشروا من هاتفكم", body: "افتحوا DentVideo على هاتفكم واضغطوا «{post}» على فيديو معتمد. وضغطة أخرى تحفظ الفيديو على هاتفكم وتنسخ نصه المرافق." },
    paste: { title: "الصقوا النص", body: "في Instagram أو TikTok، اختاروا الفيديو والصقوا النص. الوسوم موجودة فيه أصلاً." },
    nudge: {
      handle: "إن شئتم، أضيفوا اسم حسابكم على Instagram أو TikTok في {settings}، فيظهر في نهاية فيديوهاتكم القادمة.",
      closingLine: "إن شئتم، أضيفوا جملة ختامية خاصة بكم في {settings}، فتظهر أسفل نصوص فيديوهاتكم القادمة.",
      both: "إن شئتم، أضيفوا في {settings} اسم حسابكم على Instagram أو TikTok وجملة ختامية خاصة بكم. يظهر اسم الحساب في نهاية فيديوهاتكم القادمة، والجملة الختامية أسفل نصوصها.",
    },
    next: "يصل أسبوعكم القادم من الفيديوهات يوم {date}.",
  },
  short: {
    checks: {
      1: "لم يجتز فيديو واحد من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناه بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
      2: "لم يجتز فيديوهان من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناهما بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
      3: "لم تجتز ثلاثة فيديوهات من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناها بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
      4: "لم تجتز أربعة فيديوهات من فيديوهات هذا الأسبوع الخمسة فحوصاتنا، فاستبعدناها بدلاً من أن نرسل إليكم شيئاً غير صحيح.",
    },
    unfinished: {
      1: "تعذّر إكمال فيديو واحد من فيديوهات هذا الأسبوع الخمسة بالجودة التي نشترطها، فاستبعدناه.",
      2: "تعذّر إكمال فيديوهين من فيديوهات هذا الأسبوع الخمسة بالجودة التي نشترطها، فاستبعدناهما.",
      3: "تعذّر إكمال ثلاثة فيديوهات من فيديوهات هذا الأسبوع الخمسة بالجودة التي نشترطها، فاستبعدناها.",
      4: "تعذّر إكمال أربعة فيديوهات من فيديوهات هذا الأسبوع الخمسة بالجودة التي نشترطها، فاستبعدناها.",
    },
  },
  late: {
    subject: "فيديوهات هذا الأسبوع تتأخر قليلاً",
    queued: {
      preheader: "إنها في الطريق، ولا شيء مطلوب منكم.",
      title: "فيديوهاتكم تتأخر قليلاً",
      body: "تستغرق فيديوهات هذا الأسبوع وقتاً أطول من المعتاد. إنها في قائمة الانتظار وفي طريقها إليكم، ولا تُضاف أي رسوم.",
    },
    held: {
      preheader: "نعمل على ذلك، ولا شيء مطلوب منكم.",
      title: "فيديوهاتكم تتأخر قليلاً",
      body: "تستغرق فيديوهات هذا الأسبوع وقتاً أطول من المعتاد. فريقنا على علم ويعمل على ذلك، ولا تُضاف أي رسوم.",
    },
    next: "سنراسلكم عندما تصبح جاهزة لمراجعتكم. ولا شيء مطلوب منكم حتى ذلك الحين.",
  },
  firstLate: {
    subject: "أول فيديوهاتكم تحتاج وقتاً أطول قليلاً",
    queued: {
      preheader: "إنها في الطريق، ولا شيء مطلوب منكم.",
      title: "أول فيديوهاتكم في الطريق",
      body: "يستغرق إعداد فيديوهات أسبوعكم الأول وقتاً أطول من المعتاد. إنها في قائمة الانتظار وفي طريقها إليكم، ولا تُضاف أي رسوم.",
    },
    held: {
      preheader: "نعمل على ذلك، ولا شيء مطلوب منكم.",
      title: "أول فيديوهاتكم تحتاج وقتاً أطول قليلاً",
      body: "يستغرق إعداد فيديوهات أسبوعكم الأول وقتاً أطول من المعتاد. فريقنا على علم ويعمل على ذلك، ولا تُضاف أي رسوم.",
    },
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
    post: { title: "Publikacja z telefonu", body: "Prosimy otworzyć DentVideo w telefonie i przy zaakceptowanym filmie dotknąć „{post}”. Kolejne dotknięcie zapisuje film w telefonie i kopiuje jego opis." },
    paste: { title: "Wklejenie opisu", body: "W Instagramie lub TikToku wystarczy wybrać film i wkleić opis. Hashtagi są już w nim." },
    nudge: {
      handle: "Jeśli chcą Państwo, w zakładce {settings} można dodać nazwę konta na Instagramie lub TikToku. Pojawi się na końcu kolejnych filmów.",
      closingLine: "Jeśli chcą Państwo, w zakładce {settings} można dodać własne zdanie na zakończenie. Pojawi się pod opisami kolejnych filmów.",
      both: "Jeśli chcą Państwo, w zakładce {settings} można dodać nazwę konta na Instagramie lub TikToku oraz własne zdanie na zakończenie. Nazwa konta pojawi się na końcu kolejnych filmów, a zdanie pod ich opisami.",
    },
    next: "Kolejny tydzień filmów przyjdzie w {date}.",
  },
  short: {
    checks: {
      1: "Jeden z pięciu filmów na ten tydzień nie przeszedł naszej kontroli, więc go pominęliśmy, zamiast wysyłać coś błędnego.",
      2: "Dwa z pięciu filmów na ten tydzień nie przeszły naszej kontroli, więc je pominęliśmy, zamiast wysyłać coś błędnego.",
      3: "Trzy z pięciu filmów na ten tydzień nie przeszły naszej kontroli, więc je pominęliśmy, zamiast wysyłać coś błędnego.",
      4: "Cztery z pięciu filmów na ten tydzień nie przeszły naszej kontroli, więc je pominęliśmy, zamiast wysyłać coś błędnego.",
    },
    unfinished: {
      1: "Jeden z pięciu filmów na ten tydzień nie został ukończony zgodnie z naszymi standardami, więc go pominęliśmy.",
      2: "Dwa z pięciu filmów na ten tydzień nie zostały ukończone zgodnie z naszymi standardami, więc je pominęliśmy.",
      3: "Trzy z pięciu filmów na ten tydzień nie zostały ukończone zgodnie z naszymi standardami, więc je pominęliśmy.",
      4: "Cztery z pięciu filmów na ten tydzień nie zostały ukończone zgodnie z naszymi standardami, więc je pominęliśmy.",
    },
  },
  late: {
    subject: "Filmy na ten tydzień się opóźniają",
    queued: {
      preheader: "Są w drodze i nie muszą Państwo nic robić.",
      title: "Filmy się opóźniają",
      body: "filmy na ten tydzień powstają dłużej niż zwykle. Są w kolejce i w drodze, a my nie naliczamy za to żadnych dodatkowych opłat.",
    },
    held: {
      preheader: "Pracujemy nad tym i nie muszą Państwo nic robić.",
      title: "Filmy się opóźniają",
      body: "filmy na ten tydzień powstają dłużej niż zwykle. Wiemy o tym i już nad tym pracujemy, a za opóźnienie nie naliczamy żadnych dodatkowych opłat.",
    },
    next: "Napiszemy, gdy będą gotowe do przejrzenia. Do tego czasu nie muszą Państwo nic robić.",
  },
  firstLate: {
    subject: "Pierwsze filmy potrwają trochę dłużej",
    queued: {
      preheader: "Są w drodze i nie muszą Państwo nic robić.",
      title: "Pierwsze filmy są w drodze",
      body: "przygotowanie filmów na pierwszy tydzień trwa dłużej niż zwykle. Są w kolejce i w drodze, a my nie naliczamy za to żadnych dodatkowych opłat.",
    },
    held: {
      preheader: "Pracujemy nad tym i nie muszą Państwo nic robić.",
      title: "Pierwsze filmy potrwają trochę dłużej",
      body: "przygotowanie filmów na pierwszy tydzień trwa dłużej niż zwykle. Wiemy o tym i już nad tym pracujemy, a za opóźnienie nie naliczamy żadnych dodatkowych opłat.",
    },
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
