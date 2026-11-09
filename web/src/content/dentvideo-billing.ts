/**
 * Billing-state copy: what a clinic reads when a payment did not go through,
 * when a checkout is refused because a subscription already exists (or is
 * still being confirmed), and the payment-problem email. One entry per site
 * language, all with the same shape and {placeholders}
 * (dentvideo-billing.test.ts checks this).
 *
 * The aim is one honest sentence about what happened and one clear way to fix
 * it — never "buy again" while a subscription is still alive, so nobody is
 * charged twice.
 *
 * Placeholders: {email} {date} {price} {left} {total} {clinic}.
 */

export type BillingCopy = {
  refuse: {
    pending: string;
    updatePayment: string;
    updateHowPortal: string;
    updateHowEmail: string;
    cancelledPending: string;
    foundingFull: string;
  };
  panel: {
    title: string;
    body: string;
    keepVideos: string;
    portalButton: string;
    emailButton: string;
    emailSubject: string;
    opening: string;
    failed: string;
    cancelledTitle: string;
    cancelledBody: string;
    pendingTitle: string;
    pendingBody: string;
  };
  seatsLeft: string;
  email: {
    failedSubject: string;
    holdSubject: string;
    preheader: string;
    hello: string;
    failedBody: string;
    holdBody: string;
    fixPortal: string;
    fixEmail: string;
    fixCheckout: string;
    button: string;
    signoff: string;
    footer: string;
  };
};

export const BILLING_COPY: Record<string, BillingCopy> = {
  en: {
    refuse: {
      pending: "We're still confirming your last payment. Please give it a few minutes and refresh — there is no need to pay again.",
      updatePayment: "Your subscription is on hold because a payment didn't go through. Please update your card instead of buying a new plan, so you aren't charged twice: {how}",
      updateHowPortal: "open Plan and billing in Settings.",
      updateHowEmail: "write to {email} and we'll send you a secure link.",
      cancelledPending: "Your plan was cancelled and is paid until {date}. To start again before then, write to {email} so you aren't charged twice.",
      foundingFull: "The founding offer has just been taken by the first clinics. Practice is {price}/month — please choose again to continue.",
    },
    panel: {
      title: "Please update your payment",
      body: "Your last payment didn't go through, so new weekly videos are paused. Update your card and they start again — no need to choose a new plan.",
      keepVideos: "Your videos stay in your library, and you can still share them.",
      portalButton: "Update payment details",
      emailButton: "Email us for a secure link",
      emailSubject: "Update my DentVideo payment",
      opening: "Opening…",
      failed: "That didn't work. Please try again, or write to {email}.",
      cancelledTitle: "Your plan has been cancelled",
      cancelledBody: "It is paid until {date}. To start again before then, write to {email} — we'll restart it without charging you twice.",
      pendingTitle: "We're confirming your payment",
      pendingBody: "This usually takes a minute or two. Please refresh shortly — there is no need to pay again.",
    },
    seatsLeft: "{left} of {total} founding spots left",
    email: {
      failedSubject: "Your DentVideo payment didn't go through",
      holdSubject: "Your DentVideo videos are paused — please update your payment",
      preheader: "One quick step and your weekly videos carry on.",
      hello: "Hello {clinic},",
      failedBody: "We tried to charge your card for DentVideo and the payment didn't go through. Your plan is still running for now, and the payment will be tried again.",
      holdBody: "Your payment for DentVideo didn't go through, so your subscription is on hold and new weekly videos are paused. Your videos stay in your library.",
      fixPortal: "To fix it, open DentVideo, go to Settings → Plan and billing and update your card. It takes a minute and nothing else changes.",
      fixEmail: "To fix it, just reply to this email (or write to {email}) and we'll send you a secure link to update your card. Please don't buy a new plan — that would charge you twice.",
      fixCheckout: "Your previous subscription has ended. Whenever you're ready, you can choose a plan again in DentVideo.",
      button: "Open DentVideo",
      signoff: "The DentVideo team",
      footer: "You get this email because there is a problem with a payment for your DentVideo plan.",
    },
  },
  de: {
    refuse: {
      pending: "Wir bestätigen gerade noch Ihre letzte Zahlung. Bitte warten Sie ein paar Minuten und laden Sie die Seite neu — Sie müssen nicht erneut bezahlen.",
      updatePayment: "Ihr Abonnement ist pausiert, weil eine Zahlung nicht durchging. Bitte aktualisieren Sie Ihre Karte, statt einen neuen Plan zu kaufen, damit Sie nicht doppelt bezahlen: {how}",
      updateHowPortal: "Öffnen Sie in den Einstellungen „Plan und Abrechnung“.",
      updateHowEmail: "Schreiben Sie an {email}, wir senden Ihnen einen sicheren Link.",
      cancelledPending: "Ihr Plan wurde gekündigt und ist bis {date} bezahlt. Wenn Sie vorher wieder starten möchten, schreiben Sie an {email}, damit Sie nicht doppelt bezahlen.",
      foundingFull: "Das Gründungsangebot ist gerade an die ersten Praxen vergeben. Practice kostet {price}/Monat — bitte wählen Sie erneut, um fortzufahren.",
    },
    panel: {
      title: "Bitte aktualisieren Sie Ihre Zahlung",
      body: "Ihre letzte Zahlung ging nicht durch, daher sind neue Wochenvideos pausiert. Aktualisieren Sie Ihre Karte, dann geht es weiter — ein neuer Plan ist nicht nötig.",
      keepVideos: "Ihre Videos bleiben in Ihrer Bibliothek, und Sie können sie weiterhin teilen.",
      portalButton: "Zahlungsdaten aktualisieren",
      emailButton: "Sicheren Link per E-Mail anfordern",
      emailSubject: "Meine DentVideo-Zahlung aktualisieren",
      opening: "Wird geöffnet…",
      failed: "Das hat nicht geklappt. Bitte versuchen Sie es erneut oder schreiben Sie an {email}.",
      cancelledTitle: "Ihr Plan wurde gekündigt",
      cancelledBody: "Er ist bis {date} bezahlt. Wenn Sie vorher wieder starten möchten, schreiben Sie an {email} — wir starten ihn neu, ohne doppelt abzurechnen.",
      pendingTitle: "Wir bestätigen Ihre Zahlung",
      pendingBody: "Das dauert meist ein bis zwei Minuten. Bitte laden Sie die Seite gleich neu — Sie müssen nicht erneut bezahlen.",
    },
    seatsLeft: "Noch {left} von {total} Gründungsplätzen frei",
    email: {
      failedSubject: "Ihre DentVideo-Zahlung ging nicht durch",
      holdSubject: "Ihre DentVideo-Videos sind pausiert — bitte Zahlung aktualisieren",
      preheader: "Ein kurzer Schritt, und Ihre Wochenvideos gehen weiter.",
      hello: "Guten Tag {clinic},",
      failedBody: "Wir wollten Ihre Karte für DentVideo belasten, aber die Zahlung ging nicht durch. Ihr Plan läuft vorerst weiter, und die Zahlung wird erneut versucht.",
      holdBody: "Ihre Zahlung für DentVideo ging nicht durch, daher ist Ihr Abonnement pausiert und neue Wochenvideos werden nicht erstellt. Ihre Videos bleiben in Ihrer Bibliothek.",
      fixPortal: "So beheben Sie es: Öffnen Sie DentVideo, gehen Sie zu Einstellungen → Plan und Abrechnung und aktualisieren Sie Ihre Karte. Das dauert eine Minute, sonst ändert sich nichts.",
      fixEmail: "So beheben Sie es: Antworten Sie einfach auf diese E-Mail (oder schreiben Sie an {email}), und wir senden Ihnen einen sicheren Link, um Ihre Karte zu aktualisieren. Bitte kaufen Sie keinen neuen Plan — sonst zahlen Sie doppelt.",
      fixCheckout: "Ihr bisheriges Abonnement ist beendet. Wann immer Sie möchten, können Sie in DentVideo wieder einen Plan wählen.",
      button: "DentVideo öffnen",
      signoff: "Ihr DentVideo-Team",
      footer: "Sie erhalten diese E-Mail, weil es ein Problem mit einer Zahlung für Ihren DentVideo-Plan gibt.",
    },
  },
  es: {
    refuse: {
      pending: "Todavía estamos confirmando tu último pago. Espera unos minutos y actualiza la página; no hace falta pagar de nuevo.",
      updatePayment: "Tu suscripción está en pausa porque un pago no se completó. Actualiza tu tarjeta en lugar de comprar un plan nuevo, para no pagar dos veces: {how}",
      updateHowPortal: "abre Plan y facturación en Ajustes.",
      updateHowEmail: "escribe a {email} y te enviaremos un enlace seguro.",
      cancelledPending: "Tu plan se canceló y está pagado hasta el {date}. Si quieres volver a empezar antes, escribe a {email} para no pagar dos veces.",
      foundingFull: "La oferta fundadora acaba de agotarse con las primeras clínicas. Practice cuesta {price}/mes; vuelve a elegir para continuar.",
    },
    panel: {
      title: "Actualiza tu pago",
      body: "Tu último pago no se completó, así que los nuevos vídeos semanales están en pausa. Actualiza tu tarjeta y se reanudan; no hace falta elegir un plan nuevo.",
      keepVideos: "Tus vídeos siguen en tu biblioteca y puedes seguir compartiéndolos.",
      portalButton: "Actualizar datos de pago",
      emailButton: "Pídenos un enlace seguro por email",
      emailSubject: "Actualizar mi pago de DentVideo",
      opening: "Abriendo…",
      failed: "No ha funcionado. Inténtalo de nuevo o escribe a {email}.",
      cancelledTitle: "Tu plan se ha cancelado",
      cancelledBody: "Está pagado hasta el {date}. Si quieres volver a empezar antes, escribe a {email} y lo reactivaremos sin cobrarte dos veces.",
      pendingTitle: "Estamos confirmando tu pago",
      pendingBody: "Suele tardar uno o dos minutos. Actualiza la página en un momento; no hace falta pagar de nuevo.",
    },
    seatsLeft: "Quedan {left} de {total} plazas fundadoras",
    email: {
      failedSubject: "Tu pago de DentVideo no se completó",
      holdSubject: "Tus vídeos de DentVideo están en pausa: actualiza tu pago",
      preheader: "Un paso rápido y tus vídeos semanales siguen llegando.",
      hello: "Hola, {clinic}:",
      failedBody: "Intentamos cobrar DentVideo en tu tarjeta y el pago no se completó. Por ahora tu plan sigue activo y el cobro se intentará de nuevo.",
      holdBody: "Tu pago de DentVideo no se completó, así que tu suscripción está en pausa y los nuevos vídeos semanales también. Tus vídeos siguen en tu biblioteca.",
      fixPortal: "Para solucionarlo, abre DentVideo, ve a Ajustes → Plan y facturación y actualiza tu tarjeta. Es un minuto y no cambia nada más.",
      fixEmail: "Para solucionarlo, responde a este email (o escribe a {email}) y te enviaremos un enlace seguro para actualizar tu tarjeta. Por favor, no compres un plan nuevo: te cobraríamos dos veces.",
      fixCheckout: "Tu suscripción anterior ha terminado. Cuando quieras, puedes volver a elegir un plan en DentVideo.",
      button: "Abrir DentVideo",
      signoff: "El equipo de DentVideo",
      footer: "Recibes este email porque hay un problema con un pago de tu plan de DentVideo.",
    },
  },
  tr: {
    refuse: {
      pending: "Son ödemenizi hâlâ doğruluyoruz. Lütfen birkaç dakika bekleyip sayfayı yenileyin — tekrar ödeme yapmanıza gerek yok.",
      updatePayment: "Bir ödeme gerçekleşmediği için aboneliğiniz beklemede. İki kez ödeme yapmamak için yeni bir plan almak yerine lütfen kartınızı güncelleyin: {how}",
      updateHowPortal: "Ayarlar'da Plan ve faturalandırma bölümünü açın.",
      updateHowEmail: "{email} adresine yazın, size güvenli bir bağlantı gönderelim.",
      cancelledPending: "Planınız iptal edildi ve {date} tarihine kadar ödenmiş durumda. Daha önce yeniden başlamak isterseniz, iki kez ödeme yapmamak için {email} adresine yazın.",
      foundingFull: "Kurucu teklifi ilk klinikler tarafından az önce doldu. Practice aylık {price} — devam etmek için lütfen yeniden seçin.",
    },
    panel: {
      title: "Lütfen ödemenizi güncelleyin",
      body: "Son ödemeniz gerçekleşmediği için yeni haftalık videolar durduruldu. Kartınızı güncelleyin, videolar yeniden başlasın — yeni bir plan seçmenize gerek yok.",
      keepVideos: "Videolarınız kütüphanenizde kalır ve onları paylaşmaya devam edebilirsiniz.",
      portalButton: "Ödeme bilgilerini güncelle",
      emailButton: "Güvenli bağlantı için bize yazın",
      emailSubject: "DentVideo ödememi güncellemek istiyorum",
      opening: "Açılıyor…",
      failed: "Olmadı. Lütfen tekrar deneyin ya da {email} adresine yazın.",
      cancelledTitle: "Planınız iptal edildi",
      cancelledBody: "{date} tarihine kadar ödenmiş durumda. Daha önce yeniden başlamak isterseniz {email} adresine yazın — iki kez ücret almadan yeniden başlatalım.",
      pendingTitle: "Ödemenizi doğruluyoruz",
      pendingBody: "Bu genellikle bir iki dakika sürer. Lütfen birazdan sayfayı yenileyin — tekrar ödeme yapmanıza gerek yok.",
    },
    seatsLeft: "{total} kurucu yerden {left} tanesi kaldı",
    email: {
      failedSubject: "DentVideo ödemeniz gerçekleşmedi",
      holdSubject: "DentVideo videolarınız durduruldu — lütfen ödemenizi güncelleyin",
      preheader: "Kısa bir adım, haftalık videolarınız devam etsin.",
      hello: "Merhaba {clinic},",
      failedBody: "DentVideo için kartınızdan ödeme almaya çalıştık ama ödeme gerçekleşmedi. Planınız şimdilik devam ediyor ve ödeme yeniden denenecek.",
      holdBody: "DentVideo ödemeniz gerçekleşmediği için aboneliğiniz beklemede ve yeni haftalık videolar durduruldu. Videolarınız kütüphanenizde kalır.",
      fixPortal: "Düzeltmek için DentVideo'yu açın, Ayarlar → Plan ve faturalandırma bölümünden kartınızı güncelleyin. Bir dakika sürer, başka hiçbir şey değişmez.",
      fixEmail: "Düzeltmek için bu e-postayı yanıtlamanız (ya da {email} adresine yazmanız) yeterli; kartınızı güncellemeniz için size güvenli bir bağlantı gönderelim. Lütfen yeni bir plan satın almayın — iki kez ödeme yapmış olursunuz.",
      fixCheckout: "Önceki aboneliğiniz sona erdi. Hazır olduğunuzda DentVideo'da yeniden bir plan seçebilirsiniz.",
      button: "DentVideo'yu aç",
      signoff: "DentVideo ekibi",
      footer: "Bu e-postayı, DentVideo planınızın bir ödemesinde sorun olduğu için alıyorsunuz.",
    },
  },
  fr: {
    refuse: {
      pending: "Nous confirmons encore votre dernier paiement. Merci de patienter quelques minutes puis d’actualiser la page — inutile de payer à nouveau.",
      updatePayment: "Votre abonnement est suspendu car un paiement n’a pas abouti. Merci de mettre à jour votre carte plutôt que d’acheter une nouvelle formule, pour ne pas payer deux fois : {how}",
      updateHowPortal: "ouvrez Formule et facturation dans les Réglages.",
      updateHowEmail: "écrivez à {email} et nous vous enverrons un lien sécurisé.",
      cancelledPending: "Votre formule a été résiliée et elle est payée jusqu’au {date}. Pour recommencer avant, écrivez à {email} afin de ne pas payer deux fois.",
      foundingFull: "L’offre fondatrice vient d’être prise par les premiers cabinets. Practice coûte {price}/mois — merci de choisir à nouveau pour continuer.",
    },
    panel: {
      title: "Merci de mettre à jour votre paiement",
      body: "Votre dernier paiement n’a pas abouti, les nouvelles vidéos hebdomadaires sont donc en pause. Mettez à jour votre carte et elles reprennent — inutile de choisir une nouvelle formule.",
      keepVideos: "Vos vidéos restent dans votre bibliothèque et vous pouvez toujours les partager.",
      portalButton: "Mettre à jour le paiement",
      emailButton: "Demander un lien sécurisé par e-mail",
      emailSubject: "Mettre à jour mon paiement DentVideo",
      opening: "Ouverture…",
      failed: "Cela n’a pas fonctionné. Réessayez ou écrivez à {email}.",
      cancelledTitle: "Votre formule a été résiliée",
      cancelledBody: "Elle est payée jusqu’au {date}. Pour recommencer avant, écrivez à {email} — nous la relancerons sans vous facturer deux fois.",
      pendingTitle: "Nous confirmons votre paiement",
      pendingBody: "Cela prend en général une à deux minutes. Actualisez la page dans un instant — inutile de payer à nouveau.",
    },
    seatsLeft: "Plus que {left} places fondatrices sur {total}",
    email: {
      failedSubject: "Votre paiement DentVideo n’a pas abouti",
      holdSubject: "Vos vidéos DentVideo sont en pause — merci de mettre à jour votre paiement",
      preheader: "Une étape rapide et vos vidéos hebdomadaires continuent.",
      hello: "Bonjour {clinic},",
      failedBody: "Nous avons tenté de débiter votre carte pour DentVideo et le paiement n’a pas abouti. Votre formule continue pour l’instant et le paiement sera retenté.",
      holdBody: "Votre paiement DentVideo n’a pas abouti : votre abonnement est suspendu et les nouvelles vidéos hebdomadaires sont en pause. Vos vidéos restent dans votre bibliothèque.",
      fixPortal: "Pour régler cela, ouvrez DentVideo, allez dans Réglages → Formule et facturation et mettez à jour votre carte. Cela prend une minute et rien d’autre ne change.",
      fixEmail: "Pour régler cela, répondez simplement à cet e-mail (ou écrivez à {email}) et nous vous enverrons un lien sécurisé pour mettre à jour votre carte. Merci de ne pas acheter de nouvelle formule — vous paieriez deux fois.",
      fixCheckout: "Votre abonnement précédent est terminé. Quand vous le souhaitez, vous pouvez choisir à nouveau une formule dans DentVideo.",
      button: "Ouvrir DentVideo",
      signoff: "L’équipe DentVideo",
      footer: "Vous recevez cet e-mail car un paiement de votre formule DentVideo pose problème.",
    },
  },
  ja: {
    refuse: {
      pending: "前回のお支払いを確認しています。数分お待ちいただいてからページを更新してください。再度お支払いいただく必要はありません。",
      updatePayment: "お支払いが完了しなかったため、サブスクリプションが保留中です。二重請求を避けるため、新しいプランを購入せずにカード情報を更新してください：{how}",
      updateHowPortal: "設定の「プランとお支払い」を開いてください。",
      updateHowEmail: "{email} までご連絡いただければ、安全なリンクをお送りします。",
      cancelledPending: "プランは解約済みで、{date}までお支払い済みです。それより前に再開したい場合は、二重請求を避けるため {email} までご連絡ください。",
      foundingFull: "創業メンバー特典は最初のクリニックで締め切りとなりました。Practiceは月額{price}です。続けるにはもう一度お選びください。",
    },
    panel: {
      title: "お支払い情報を更新してください",
      body: "前回のお支払いが完了しなかったため、新しい週次動画を一時停止しています。カード情報を更新すれば再開します。新しいプランを選ぶ必要はありません。",
      keepVideos: "動画はライブラリに残り、引き続き共有できます。",
      portalButton: "お支払い情報を更新",
      emailButton: "安全なリンクをメールで依頼",
      emailSubject: "DentVideoのお支払い情報を更新したい",
      opening: "開いています…",
      failed: "うまくいきませんでした。もう一度お試しいただくか、{email} までご連絡ください。",
      cancelledTitle: "プランは解約されました",
      cancelledBody: "{date}までお支払い済みです。それより前に再開したい場合は {email} までご連絡ください。二重請求なしで再開します。",
      pendingTitle: "お支払いを確認しています",
      pendingBody: "通常1〜2分で完了します。少ししてからページを更新してください。再度お支払いいただく必要はありません。",
    },
    seatsLeft: "創業メンバー枠 残り{left}/{total}",
    email: {
      failedSubject: "DentVideoのお支払いが完了しませんでした",
      holdSubject: "DentVideoの動画を一時停止しています。お支払い情報を更新してください",
      preheader: "簡単な手続きで、週次動画がまた届きます。",
      hello: "{clinic}様、",
      failedBody: "DentVideoのご利用料金をカードに請求しましたが、お支払いが完了しませんでした。プランは現在も継続中で、お支払いは再度試行されます。",
      holdBody: "DentVideoのお支払いが完了しなかったため、サブスクリプションが保留となり、新しい週次動画を一時停止しています。これまでの動画はライブラリに残ります。",
      fixPortal: "DentVideoを開き、設定→「プランとお支払い」からカード情報を更新してください。1分ほどで完了し、ほかには何も変わりません。",
      fixEmail: "このメールにご返信いただくか、{email} までご連絡ください。カード情報を更新するための安全なリンクをお送りします。二重請求になるため、新しいプランは購入しないでください。",
      fixCheckout: "以前のサブスクリプションは終了しています。準備ができましたら、DentVideoでいつでもプランを選び直せます。",
      button: "DentVideoを開く",
      signoff: "DentVideoチーム",
      footer: "DentVideoプランのお支払いに問題があるため、このメールをお送りしています。",
    },
  },
  ar: {
    refuse: {
      pending: "ما زلنا نؤكد دفعتك الأخيرة. يرجى الانتظار بضع دقائق ثم تحديث الصفحة — لا داعي للدفع مرة أخرى.",
      updatePayment: "اشتراكك معلّق لأن إحدى الدفعات لم تتم. يرجى تحديث بطاقتك بدلًا من شراء خطة جديدة حتى لا تدفع مرتين: {how}",
      updateHowPortal: "افتح «الخطة والفوترة» في الإعدادات.",
      updateHowEmail: "راسلنا على {email} وسنرسل لك رابطًا آمنًا.",
      cancelledPending: "تم إلغاء خطتك وهي مدفوعة حتى {date}. إذا أردت البدء من جديد قبل ذلك، راسلنا على {email} حتى لا تدفع مرتين.",
      foundingFull: "انتهى عرض المؤسسين للتو مع أولى العيادات. خطة Practice بسعر {price} شهريًا — يرجى الاختيار مرة أخرى للمتابعة.",
    },
    panel: {
      title: "يرجى تحديث بيانات الدفع",
      body: "لم تتم دفعتك الأخيرة، لذلك أوقفنا الفيديوهات الأسبوعية الجديدة مؤقتًا. حدّث بطاقتك وستُستأنف — لا حاجة لاختيار خطة جديدة.",
      keepVideos: "تبقى فيديوهاتك في مكتبتك، ويمكنك مشاركتها كما تشاء.",
      portalButton: "تحديث بيانات الدفع",
      emailButton: "اطلب رابطًا آمنًا بالبريد",
      emailSubject: "تحديث الدفع في DentVideo",
      opening: "جارٍ الفتح…",
      failed: "لم ينجح ذلك. حاول مرة أخرى أو راسلنا على {email}.",
      cancelledTitle: "تم إلغاء خطتك",
      cancelledBody: "الخطة مدفوعة حتى {date}. إذا أردت البدء من جديد قبل ذلك، راسلنا على {email} — سنعيد تشغيلها دون أن تدفع مرتين.",
      pendingTitle: "نؤكد دفعتك الآن",
      pendingBody: "يستغرق ذلك عادة دقيقة أو دقيقتين. يرجى تحديث الصفحة بعد قليل — لا داعي للدفع مرة أخرى.",
    },
    seatsLeft: "تبقّى {left} من {total} من مقاعد المؤسسين",
    email: {
      failedSubject: "لم تتم دفعتك في DentVideo",
      holdSubject: "فيديوهات DentVideo متوقفة مؤقتًا — يرجى تحديث الدفع",
      preheader: "خطوة سريعة وتستمر فيديوهاتك الأسبوعية.",
      hello: "مرحبًا {clinic}،",
      failedBody: "حاولنا تحصيل رسوم DentVideo من بطاقتك ولم تتم الدفعة. خطتك ما زالت سارية حاليًا، وستُعاد محاولة الدفع.",
      holdBody: "لم تتم دفعتك في DentVideo، لذلك أصبح اشتراكك معلّقًا وتوقفت الفيديوهات الأسبوعية الجديدة مؤقتًا. تبقى فيديوهاتك في مكتبتك.",
      fixPortal: "لإصلاح ذلك، افتح DentVideo وانتقل إلى الإعدادات ← الخطة والفوترة وحدّث بطاقتك. يستغرق الأمر دقيقة ولن يتغير شيء آخر.",
      fixEmail: "لإصلاح ذلك، ما عليك سوى الرد على هذه الرسالة (أو مراسلتنا على {email}) وسنرسل لك رابطًا آمنًا لتحديث بطاقتك. يرجى عدم شراء خطة جديدة — فستدفع مرتين.",
      fixCheckout: "انتهى اشتراكك السابق. متى ما كنت مستعدًا، يمكنك اختيار خطة من جديد في DentVideo.",
      button: "افتح DentVideo",
      signoff: "فريق DentVideo",
      footer: "تصلك هذه الرسالة لأن هناك مشكلة في دفعة لخطة DentVideo الخاصة بك.",
    },
  },
  pl: {
    refuse: {
      pending: "Wciąż potwierdzamy Twoją ostatnią płatność. Odczekaj kilka minut i odśwież stronę — nie trzeba płacić ponownie.",
      updatePayment: "Twoja subskrypcja jest wstrzymana, bo płatność nie przeszła. Zaktualizuj kartę zamiast kupować nowy plan, aby nie zapłacić dwa razy: {how}",
      updateHowPortal: "otwórz Plan i płatności w Ustawieniach.",
      updateHowEmail: "napisz na {email}, a wyślemy Ci bezpieczny link.",
      cancelledPending: "Twój plan został anulowany i jest opłacony do {date}. Jeśli chcesz wznowić go wcześniej, napisz na {email}, aby nie zapłacić dwa razy.",
      foundingFull: "Oferta założycielska właśnie się wyczerpała. Practice kosztuje {price}/miesiąc — wybierz ponownie, aby kontynuować.",
    },
    panel: {
      title: "Zaktualizuj płatność",
      body: "Twoja ostatnia płatność nie przeszła, więc nowe cotygodniowe filmy są wstrzymane. Zaktualizuj kartę, a ruszą ponownie — nie trzeba wybierać nowego planu.",
      keepVideos: "Twoje filmy zostają w bibliotece i nadal możesz je udostępniać.",
      portalButton: "Zaktualizuj dane płatności",
      emailButton: "Poproś o bezpieczny link mailem",
      emailSubject: "Aktualizacja płatności DentVideo",
      opening: "Otwieranie…",
      failed: "Nie udało się. Spróbuj ponownie lub napisz na {email}.",
      cancelledTitle: "Twój plan został anulowany",
      cancelledBody: "Jest opłacony do {date}. Jeśli chcesz wznowić go wcześniej, napisz na {email} — uruchomimy go ponownie bez podwójnej opłaty.",
      pendingTitle: "Potwierdzamy Twoją płatność",
      pendingBody: "Zwykle trwa to minutę lub dwie. Odśwież stronę za chwilę — nie trzeba płacić ponownie.",
    },
    seatsLeft: "Zostało {left} z {total} miejsc założycielskich",
    email: {
      failedSubject: "Płatność za DentVideo nie przeszła",
      holdSubject: "Filmy DentVideo są wstrzymane — zaktualizuj płatność",
      preheader: "Jeden szybki krok i cotygodniowe filmy wracają.",
      hello: "Dzień dobry, {clinic},",
      failedBody: "Próbowaliśmy obciążyć Twoją kartę za DentVideo, ale płatność nie przeszła. Twój plan na razie działa dalej, a płatność zostanie ponowiona.",
      holdBody: "Płatność za DentVideo nie przeszła, więc subskrypcja jest wstrzymana, a nowe cotygodniowe filmy nie powstają. Twoje filmy zostają w bibliotece.",
      fixPortal: "Aby to naprawić, otwórz DentVideo, przejdź do Ustawienia → Plan i płatności i zaktualizuj kartę. To zajmie minutę i nic więcej się nie zmieni.",
      fixEmail: "Aby to naprawić, po prostu odpowiedz na tę wiadomość (lub napisz na {email}), a wyślemy Ci bezpieczny link do aktualizacji karty. Prosimy nie kupować nowego planu — zapłacisz wtedy dwa razy.",
      fixCheckout: "Twoja poprzednia subskrypcja się zakończyła. Gdy tylko zechcesz, możesz ponownie wybrać plan w DentVideo.",
      button: "Otwórz DentVideo",
      signoff: "Zespół DentVideo",
      footer: "Otrzymujesz tę wiadomość, ponieważ wystąpił problem z płatnością za Twój plan DentVideo.",
    },
  },
};

export const BILLING_LANGUAGES = Object.keys(BILLING_COPY);

/** The copy for a language, English for any other (it, pt clinics get the English interface too). */
export function billingText(language: string | null | undefined): { lang: string; copy: BillingCopy } {
  const lang = language && BILLING_COPY[language] ? language : "en";
  return { lang, copy: BILLING_COPY[lang] };
}
