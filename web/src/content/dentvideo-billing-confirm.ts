import type { Locale } from "./dentvideo-locales";

/**
 * The two written confirmations of a money event (lib/dentvid/billing-confirm-email.ts),
 * in every DentVideo language:
 *
 *   cancelled  the clinic cancelled: no renewal, its weekly videos run until the end
 *              of the period it paid for ({end}), and its library stays 90 days after
 *              that ({library}). The 90 days are the privacy policy's ("for 90 days
 *              after it ends") and worker/src/dentvid/retention.ts RETENTION_DAYS:
 *              nothing is deleted before then, and the clinic is emailed 14 days and
 *              1 day before.
 *   changed    the plan moved to {tier}. After the self-serve switch, Dodo Payments
 *              charges or credits the difference for the rest of the period (it is
 *              prorated_immediately, lib/dentvid/dodo-account.ts), the same promise
 *              the plan screen makes before the switch (dentvideo-account.ts). A change
 *              the owner made by hand in Dodo only says that Dodo Payments bills it.
 *
 * The greetings are the ones the other clinic emails use (dentvideo-lifecycle.ts):
 * Polish addresses the clinic's team, so the clinic's name never needs a vocative.
 *
 * Only what the product already does: no refund, no credit of our own, no
 * response time. {end}, {library} and {tier} are filled in. Plain sentences: no
 * dashes as punctuation, no exclamation marks.
 */

export type BillingConfirmCopy = {
  hello: string;
  /** The greeting when the clinic has no name yet. */
  helloNoName: string;
  cancelled: {
    subject: string;
    preheader: string;
    title: string;
    body: string;
    library: string;
    again: string;
    button: string;
    footer: string;
  };
  changed: {
    subject: string;
    preheader: string;
    title: string;
    body: string;
    /** What the new plan brings, for the self-serve tiers (Group has no line: it is set up by hand). */
    starter: string;
    practice: string;
    /** The self-serve switch: Dodo prorates the difference at once (the plan screen says the same). */
    money: string;
    /** A change made by hand in Dodo (no self-serve billing, or Group): who bills it, without claiming how. */
    moneyManual: string;
    notYou: string;
    button: string;
    footer: string;
  };
};

export const BILLING_CONFIRM_COPY: Record<Locale, BillingConfirmCopy> = {
  en: {
    hello: "Hello {clinic},",
    helloNoName: "Hello,",
    cancelled: {
      subject: "Your DentVideo plan is canceled",
      preheader: "You keep getting your weekly videos until {end}.",
      title: "Your plan ends on {end}",
      body: "We have received your cancellation, so your plan will not renew. You keep getting your weekly videos until {end}.",
      library:
        "After that, your videos stay in your library for 90 days, until {library}, so you can still watch and download them. We email you before anything is deleted, and your settings and logo are kept.",
      again:
        "If you change your mind before {end}, reply to this email so that you are not charged twice. After that, you can choose a plan again in DentVideo whenever you like, and if you do so before {library}, your library stays as it is.",
      button: "Open DentVideo",
      footer: "You get this email because your clinic's DentVideo plan was canceled. It confirms a change to your plan, so it is sent even if you unsubscribed from reminders.",
    },
    changed: {
      subject: "Your DentVideo plan is now {tier}",
      preheader: "Your videos and settings stay as they are.",
      title: "You are now on {tier}",
      body: "Your clinic's plan has changed to {tier}. Your videos and settings stay as they are.",
      starter: "Starter brings you five narrated, captioned videos every Monday, with your logo and colors.",
      practice: "Practice includes everything in Starter, and you can also upload your own recordings, which we turn into captioned clips in your colors.",
      money: "For the rest of this billing period, the difference is charged or credited by Dodo Payments, our payment provider.",
      moneyManual: "Dodo Payments, our payment provider, handles the billing for your new plan.",
      notYou: "If you did not make this change, please reply to this email right away.",
      button: "See my plan",
      footer: "You get this email because your clinic's DentVideo plan changed. It confirms a change to your plan, so it is sent even if you unsubscribed from reminders.",
    },
  },
  de: {
    hello: "Guten Tag, {clinic},",
    helloNoName: "Guten Tag,",
    cancelled: {
      subject: "Ihr DentVideo-Tarif ist gekündigt",
      preheader: "Bis zum {end} erhalten Sie weiter Ihre wöchentlichen Videos.",
      title: "Ihr Tarif endet am {end}",
      body: "Wir haben Ihre Kündigung erhalten, Ihr Tarif verlängert sich also nicht. Bis zum {end} erhalten Sie weiter Ihre wöchentlichen Videos.",
      library:
        "Danach bleiben Ihre Videos noch 90 Tage in Ihrer Bibliothek, bis zum {library}, damit Sie sie weiter ansehen und herunterladen können. Bevor etwas gelöscht wird, schreiben wir Ihnen. Ihre Einstellungen und Ihr Logo bleiben erhalten.",
      again:
        "Wenn Sie es sich vor dem {end} anders überlegen, antworten Sie auf diese E-Mail, damit Sie nicht doppelt bezahlen. Danach können Sie in DentVideo jederzeit wieder einen Tarif wählen. Tun Sie das vor dem {library}, bleibt Ihre Bibliothek, wie sie ist.",
      button: "DentVideo öffnen",
      footer: "Sie erhalten diese E-Mail, weil der DentVideo-Tarif Ihrer Praxis gekündigt wurde. Sie bestätigt eine Änderung an Ihrem Tarif und kommt deshalb auch, wenn Sie Erinnerungen abbestellt haben.",
    },
    changed: {
      subject: "Ihr DentVideo-Tarif ist jetzt {tier}",
      preheader: "Ihre Videos und Einstellungen bleiben unverändert.",
      title: "Sie nutzen jetzt {tier}",
      body: "Der Tarif Ihrer Praxis wurde auf {tier} umgestellt. Ihre Videos und Einstellungen bleiben unverändert.",
      starter: "Mit Starter erhalten Sie jeden Montag fünf vertonte, untertitelte Videos mit Ihrem Logo und Ihren Farben.",
      practice: "Practice enthält alles aus Starter. Zusätzlich können Sie eigene Aufnahmen hochladen, und wir schneiden daraus Clips mit Untertiteln in Ihren Farben.",
      money: "Für den Rest des Abrechnungszeitraums wird die Differenz von Dodo Payments, unserem Zahlungsanbieter, anteilig berechnet oder gutgeschrieben.",
      moneyManual: "Die Abrechnung Ihres neuen Tarifs übernimmt Dodo Payments, unser Zahlungsanbieter.",
      notYou: "Wenn Sie diese Änderung nicht selbst vorgenommen haben, antworten Sie bitte umgehend auf diese E-Mail.",
      button: "Meinen Tarif ansehen",
      footer: "Sie erhalten diese E-Mail, weil sich der DentVideo-Tarif Ihrer Praxis geändert hat. Sie bestätigt eine Änderung an Ihrem Tarif und kommt deshalb auch, wenn Sie Erinnerungen abbestellt haben.",
    },
  },
  es: {
    hello: "Hola, {clinic}:",
    helloNoName: "Hola:",
    cancelled: {
      subject: "Tu plan de DentVideo está cancelado",
      preheader: "Seguirás recibiendo tus vídeos semanales hasta el {end}.",
      title: "Tu plan termina el {end}",
      body: "Hemos recibido tu cancelación, así que tu plan no se renovará. Seguirás recibiendo tus vídeos semanales hasta el {end}.",
      library:
        "Después, tus vídeos se quedan 90 días más en tu biblioteca, hasta el {library}, para que puedas seguir viéndolos y descargándolos. Te escribiremos antes de borrar nada, y tus ajustes y tu logo se conservan.",
      again:
        "Si cambias de opinión antes del {end}, responde a este correo para no pagar dos veces. Después podrás volver a elegir un plan en DentVideo cuando quieras, y si lo haces antes del {library}, tu biblioteca se queda como está.",
      button: "Abrir DentVideo",
      footer: "Recibes este correo porque se canceló el plan de DentVideo de tu clínica. Confirma un cambio en tu plan, así que se envía aunque te hayas dado de baja de los recordatorios.",
    },
    changed: {
      subject: "Tu plan de DentVideo ahora es {tier}",
      preheader: "Tus vídeos y ajustes no cambian.",
      title: "Ahora tienes el plan {tier}",
      body: "El plan de tu clínica ha cambiado a {tier}. Tus vídeos y ajustes no cambian.",
      starter: "Con Starter recibes cada lunes cinco vídeos con locución y subtítulos, con tu logo y tus colores.",
      practice: "Practice incluye todo lo de Starter y, además, puedes subir tus propias grabaciones, que convertimos en clips subtitulados con tus colores.",
      money: "Por el resto de este periodo de facturación, Dodo Payments, nuestro proveedor de pagos, cobra o abona la diferencia de forma proporcional.",
      moneyManual: "Dodo Payments, nuestro proveedor de pagos, se encarga de la facturación de tu nuevo plan.",
      notYou: "Si no hiciste este cambio, responde a este correo cuanto antes.",
      button: "Ver mi plan",
      footer: "Recibes este correo porque cambió el plan de DentVideo de tu clínica. Confirma un cambio en tu plan, así que se envía aunque te hayas dado de baja de los recordatorios.",
    },
  },
  tr: {
    hello: "Merhaba {clinic},",
    helloNoName: "Merhaba,",
    cancelled: {
      subject: "DentVideo planınız iptal edildi",
      preheader: "Haftalık videolarınız {end} tarihine kadar gelmeye devam ediyor.",
      title: "Planınız {end} tarihinde sona eriyor",
      body: "İptal işleminiz tamamlandı, planınız yenilenmeyecek. Haftalık videolarınız {end} tarihine kadar gelmeye devam ediyor.",
      library:
        "Bu tarihten sonra videolarınız 90 gün daha, {library} tarihine kadar kütüphanenizde kalır. Bu sürede onları izleyip indirebilirsiniz. Herhangi bir şey silinmeden önce size e-posta göndeririz. Ayarlarınız ve logonuz korunur.",
      again:
        "{end} tarihinden önce fikrinizi değiştirirseniz, iki kez ödeme yapmamak için bu e-postayı yanıtlayın. Bu tarihten sonra DentVideo'da istediğiniz zaman yeniden bir plan seçebilirsiniz. {library} tarihinden önce seçerseniz kütüphaneniz olduğu gibi kalır.",
      button: "DentVideo'yu aç",
      footer: "Bu e-postayı kliniğinizin DentVideo planı iptal edildiği için alıyorsunuz. Planınızdaki bir değişikliği onayladığı için, hatırlatma e-postalarından çıkmış olsanız da gönderilir.",
    },
    changed: {
      subject: "DentVideo planınız artık {tier}",
      preheader: "Videolarınız ve ayarlarınız olduğu gibi kalır.",
      title: "Artık {tier} planındasınız",
      body: "Kliniğinizin planı {tier} olarak değişti. Videolarınız ve ayarlarınız olduğu gibi kalır.",
      starter: "Starter ile her pazartesi logonuz ve renklerinizle hazırlanmış beş seslendirilmiş, altyazılı video alırsınız.",
      practice: "Practice, Starter'daki her şeyi içerir. Ayrıca kendi kayıtlarınızı yükleyebilirsiniz, biz de onları renklerinizle altyazılı kliplere dönüştürürüz.",
      money: "Bu ödeme döneminin kalanı için fark, ödeme sağlayıcımız Dodo Payments tarafından orantılı olarak tahsil edilir veya iade edilir.",
      moneyManual: "Yeni planınızın faturalandırmasını ödeme sağlayıcımız Dodo Payments yönetir.",
      notYou: "Bu değişikliği siz yapmadıysanız, lütfen hemen bu e-postayı yanıtlayın.",
      button: "Planımı gör",
      footer: "Bu e-postayı kliniğinizin DentVideo planı değiştiği için alıyorsunuz. Planınızdaki bir değişikliği onayladığı için, hatırlatma e-postalarından çıkmış olsanız da gönderilir.",
    },
  },
  fr: {
    hello: "Bonjour {clinic},",
    helloNoName: "Bonjour,",
    cancelled: {
      subject: "Votre formule DentVideo est résiliée",
      preheader: "Vous continuez à recevoir vos vidéos de la semaine jusqu'au {end}.",
      title: "Votre formule se termine le {end}",
      body: "Nous avons bien reçu votre résiliation : votre formule ne sera pas renouvelée. Vous continuez à recevoir vos vidéos de la semaine jusqu'au {end}.",
      library:
        "Ensuite, vos vidéos restent 90 jours dans votre bibliothèque, jusqu'au {library}, pour que vous puissiez encore les regarder et les télécharger. Nous vous écrivons avant toute suppression, et vos réglages et votre logo sont conservés.",
      again:
        "Si vous changez d'avis avant le {end}, répondez à cet e-mail afin de ne pas payer deux fois. Ensuite, vous pourrez reprendre une formule dans DentVideo quand vous le souhaitez, et si vous le faites avant le {library}, votre bibliothèque reste telle quelle.",
      button: "Ouvrir DentVideo",
      footer: "Vous recevez cet e-mail parce que la formule DentVideo de votre cabinet a été résiliée. Il confirme un changement de votre formule : il est donc envoyé même si vous vous êtes désabonné des rappels.",
    },
    changed: {
      subject: "Votre formule DentVideo est maintenant {tier}",
      preheader: "Vos vidéos et réglages restent tels quels.",
      title: "Vous êtes maintenant sur la formule {tier}",
      body: "La formule de votre cabinet est passée à {tier}. Vos vidéos et réglages restent tels quels.",
      starter: "Avec Starter, vous recevez chaque lundi cinq vidéos commentées et sous-titrées, avec votre logo et vos couleurs.",
      practice: "Practice comprend tout ce qu'inclut Starter, et vous pouvez aussi envoyer vos propres enregistrements, que nous transformons en clips sous-titrés à vos couleurs.",
      money: "Pour le reste de la période de facturation en cours, la différence est facturée ou créditée au prorata par Dodo Payments, notre prestataire de paiement.",
      moneyManual: "La facturation de votre nouvelle formule est gérée par Dodo Payments, notre prestataire de paiement.",
      notYou: "Si vous n'êtes pas à l'origine de ce changement, répondez dès que possible à cet e-mail.",
      button: "Voir ma formule",
      footer: "Vous recevez cet e-mail parce que la formule DentVideo de votre cabinet a changé. Il confirme un changement de votre formule : il est donc envoyé même si vous vous êtes désabonné des rappels.",
    },
  },
  ja: {
    hello: "{clinic} ご担当者様",
    helloNoName: "ご担当者様",
    cancelled: {
      subject: "DentVideoのプランの解約を承りました",
      preheader: "{end}までは毎週の動画が引き続き届きます。",
      title: "プランは{end}に終了します",
      body: "プランの解約を承りました。今後プランが更新されることはありません。{end}までは毎週の動画が引き続き届きます。",
      library: "終了後も90日間、{library}までは動画がライブラリに残り、視聴とダウンロードができます。削除する前にはメールでお知らせします。設定とロゴはそのまま残ります。",
      again:
        "{end}より前に再開をご希望の場合は、二重請求を避けるため、このメールにご返信ください。終了後は、いつでもDentVideoで再度プランを選択できます。{library}より前にお選びいただければ、ライブラリはそのまま残ります。",
      button: "DentVideoを開く",
      footer: "医院のDentVideoプランが解約されたため、このメールをお送りしています。プランの変更を確認するお知らせのため、リマインダーの配信を停止されている場合もお送りします。",
    },
    changed: {
      subject: "DentVideoのプランが{tier}になりました",
      preheader: "動画と設定はそのまま残ります。",
      title: "現在のプランは{tier}です",
      body: "医院のプランが{tier}に変更されました。動画と設定はそのまま残ります。",
      starter: "Starterでは、毎週月曜日に医院のロゴとカラーを使った、ナレーションと字幕付きの動画を5本お届けします。",
      practice: "PracticeにはStarterのすべての内容が含まれます。さらに、ご自身で撮影した動画をアップロードいただくと、医院のカラーで字幕入りのクリップに仕上げます。",
      money: "現在の請求期間の残りについては、お支払いを取り扱うDodo Paymentsが差額を日割りで請求または返金します。",
      moneyManual: "新しいプランのご請求は、お支払いを取り扱うDodo Paymentsが行います。",
      notYou: "この変更にお心当たりがない場合は、すぐにこのメールにご返信ください。",
      button: "プランを確認する",
      footer: "医院のDentVideoプランが変更されたため、このメールをお送りしています。プランの変更を確認するお知らせのため、リマインダーの配信を停止されている場合もお送りします。",
    },
  },
  ar: {
    hello: "مرحباً {clinic}،",
    helloNoName: "مرحباً،",
    cancelled: {
      subject: "أُلغيت باقتكم في DentVideo",
      preheader: "تواصلون تلقّي فيديوهاتكم الأسبوعية حتى {end}.",
      title: "تنتهي باقتكم في {end}",
      body: "استلمنا إلغاء اشتراككم، لذا لن تتجدد باقتكم. وتواصلون تلقّي فيديوهاتكم الأسبوعية حتى {end}.",
      library: "بعد ذلك تبقى فيديوهاتكم في مكتبتكم 90 يوماً، حتى {library}، لتتمكنوا من مشاهدتها وتنزيلها. وسنراسلكم قبل حذف أي شيء، وتبقى إعداداتكم وشعاركم محفوظة.",
      again:
        "إن غيّرتم رأيكم قبل {end}، فردّوا على هذه الرسالة حتى لا تدفعوا مرتين. وبعد ذلك يمكنكم اختيار باقة من جديد في DentVideo متى شئتم، وإن فعلتم ذلك قبل {library} تبقى مكتبتكم كما هي.",
      button: "افتحوا DentVideo",
      footer: "تصلكم هذه الرسالة لأن باقة DentVideo الخاصة بعيادتكم أُلغيت. وهي تؤكد تغييراً في باقتكم، لذا تُرسل حتى لو ألغيتم الاشتراك في رسائل التذكير.",
    },
    changed: {
      subject: "باقتكم في DentVideo الآن هي {tier}",
      preheader: "تبقى فيديوهاتكم وإعداداتكم كما هي.",
      title: "أنتم الآن على باقة {tier}",
      body: "تغيّرت باقة عيادتكم إلى {tier}. وتبقى فيديوهاتكم وإعداداتكم كما هي.",
      starter: "مع Starter تصلكم كل يوم اثنين خمسة فيديوهات بتعليق صوتي ونص على الشاشة، بشعاركم وألوانكم.",
      practice: "تشمل Practice كل ما في Starter، ويمكنكم أيضاً رفع تسجيلاتكم الخاصة لنحوّلها إلى مقاطع مع النص على الشاشة بألوانكم.",
      money: "أما بقية فترة الفوترة الحالية، فتحتسب Dodo Payments، مزوّد الدفع لدينا، فرقها خصماً أو رصيداً بالتناسب.",
      moneyManual: "تتولى Dodo Payments، مزوّد الدفع لدينا، فوترة باقتكم الجديدة.",
      notYou: "إن لم تُجروا هذا التغيير بأنفسكم، فيُرجى الرد على هذه الرسالة فوراً.",
      button: "اعرضوا باقتكم",
      footer: "تصلكم هذه الرسالة لأن باقة DentVideo الخاصة بعيادتكم تغيّرت. وهي تؤكد تغييراً في باقتكم، لذا تُرسل حتى لو ألغيتم الاشتراك في رسائل التذكير.",
    },
  },
  pl: {
    hello: "Dzień dobry, zespole {clinic},",
    helloNoName: "Dzień dobry,",
    cancelled: {
      subject: "Plan DentVideo został anulowany",
      preheader: "Do {end} nadal otrzymują Państwo cotygodniowe filmy.",
      title: "Plan kończy się {end}",
      body: "Otrzymaliśmy Państwa rezygnację, więc plan nie zostanie odnowiony. Do {end} nadal otrzymują Państwo cotygodniowe filmy.",
      library:
        "Potem filmy zostają w bibliotece jeszcze przez 90 dni, do {library}, aby można je było nadal oglądać i pobierać. Zanim cokolwiek usuniemy, wyślemy Państwu wiadomość. Ustawienia i logo zostają.",
      again:
        "Jeśli zmienią Państwo zdanie przed {end}, prosimy odpowiedzieć na tę wiadomość, aby nie zapłacić dwa razy. Później można w dowolnej chwili ponownie wybrać plan w DentVideo, a jeśli nastąpi to przed {library}, biblioteka zostanie bez zmian.",
      button: "Otwórz DentVideo",
      footer: "Otrzymują Państwo tę wiadomość, ponieważ plan DentVideo gabinetu został anulowany. Potwierdza ona zmianę planu, dlatego wysyłamy ją także po rezygnacji z przypomnień.",
    },
    changed: {
      subject: "Plan DentVideo to teraz {tier}",
      preheader: "Filmy i ustawienia pozostają bez zmian.",
      title: "Aktualny plan: {tier}",
      body: "Plan gabinetu został zmieniony na {tier}. Filmy i ustawienia pozostają bez zmian.",
      starter: "W planie Starter co poniedziałek otrzymują Państwo pięć filmów z lektorem i napisami, z logo i kolorami gabinetu.",
      practice: "Plan Practice obejmuje wszystko z planu Starter, a do tego można przesyłać własne nagrania, z których przygotujemy klipy z napisami w barwach gabinetu.",
      money: "Za resztę bieżącego okresu rozliczeniowego różnicę proporcjonalnie dolicza lub zwraca Dodo Payments, nasz operator płatności.",
      moneyManual: "Rozliczenia za nowy plan prowadzi Dodo Payments, nasz operator płatności.",
      notYou: "Jeśli to nie Państwo wprowadzili tę zmianę, prosimy jak najszybciej odpowiedzieć na tę wiadomość.",
      button: "Zobacz mój plan",
      footer: "Otrzymują Państwo tę wiadomość, ponieważ plan DentVideo gabinetu się zmienił. Potwierdza ona zmianę planu, dlatego wysyłamy ją także po rezygnacji z przypomnień.",
    },
  },
};

/** The copy for a language; English for any other (it, pt clinics get the English interface too). */
export function billingConfirmText(language: string | null | undefined): { lang: Locale; copy: BillingConfirmCopy } {
  const lang = (language && Object.prototype.hasOwnProperty.call(BILLING_CONFIRM_COPY, language) ? language : "en") as Locale;
  return { lang, copy: BILLING_CONFIRM_COPY[lang] };
}

/** "{end}" → the value; unknown placeholders are left as they are (a test catches any that stay). */
export function fillConfirm(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}
