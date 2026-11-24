/**
 * A DentVideo plan bought in the iPhone app (App Store, through RevenueCat): where it is changed or
 * cancelled, why the web will not sell a second one, what to do when Apple cannot renew it, and what
 * account deletion does not do (docs/DENTVIDEO_IAP_PLAN.md). One entry per site language, same keys.
 *
 * Kept out of dentvideo-billing.ts so the public pages' browser bundle does not carry it.
 */

import type { Locale } from "./dentvideo-locales";

export type AppStoreCopy = {
  /** A web checkout refused: the plan is paid through the App Store. */
  refuse: string;
  title: string;
  body: string;
  button: string;
  holdTitle: string;
  holdBody: string;
  deleteNotice: string;
};

export const APP_STORE_COPY: Record<Locale, AppStoreCopy> = {
  en: {
    refuse: "Your plan is paid through the App Store on your iPhone, so it can't be bought again here. To change or cancel it, open Settings > your name > Subscriptions on your iPhone.",
    title: "Managed in the App Store",
    body: "You subscribed in the DentVideo iPhone app, so Apple bills you. To change or cancel your plan, open Settings > your name > Subscriptions on your iPhone.",
    button: "Open App Store subscriptions",
    holdTitle: "Apple couldn't renew your plan",
    holdBody: "Apple couldn't charge your payment method, so new weekly videos are paused. Update it on your iPhone in Settings > your name > Payment & Shipping. Your plan continues as soon as Apple renews it, so please don't buy a new plan.",
    deleteNotice: "Deleting your account does not cancel your App Store subscription. Cancel it on your iPhone in Settings > your name > Subscriptions so you aren't charged again.",
  },
  de: {
    refuse: "Ihr Tarif wird über den App Store auf Ihrem iPhone bezahlt und kann hier nicht noch einmal gekauft werden. Zum Ändern oder Kündigen öffnen Sie auf dem iPhone Einstellungen > Ihr Name > Abonnements.",
    title: "Über den App Store verwaltet",
    body: "Sie haben in der DentVideo-App für iPhone abonniert, daher rechnet Apple ab. Zum Ändern oder Kündigen Ihres Tarifs öffnen Sie auf dem iPhone Einstellungen > Ihr Name > Abonnements.",
    button: "App-Store-Abonnements öffnen",
    holdTitle: "Apple konnte Ihren Tarif nicht verlängern",
    holdBody: "Apple konnte Ihre Zahlungsmethode nicht belasten, daher sind neue Wochenvideos pausiert. Aktualisieren Sie sie auf dem iPhone unter Einstellungen > Ihr Name > Zahlung & Versand. Ihr Tarif läuft weiter, sobald Apple ihn verlängert. Bitte kaufen Sie keinen neuen Tarif.",
    deleteNotice: "Das Löschen Ihres Kontos kündigt Ihr App-Store-Abonnement nicht. Kündigen Sie es auf dem iPhone unter Einstellungen > Ihr Name > Abonnements, damit Ihnen nichts mehr berechnet wird.",
  },
  es: {
    refuse: "Tu plan se paga a través de App Store en tu iPhone, así que no se puede contratar de nuevo aquí. Para cambiarlo o cancelarlo, ve a Ajustes > tu nombre > Suscripciones en el iPhone.",
    title: "Gestionado en App Store",
    body: "Te suscribiste en la app de DentVideo para iPhone, así que Apple te factura. Para cambiar o cancelar tu plan, ve a Ajustes > tu nombre > Suscripciones en el iPhone.",
    button: "Abrir suscripciones de App Store",
    holdTitle: "Apple no pudo renovar tu plan",
    holdBody: "Apple no pudo cobrar con tu método de pago, así que los vídeos semanales nuevos están en pausa. Actualízalo en el iPhone en Ajustes > tu nombre > Pago y envío. Tu plan sigue en cuanto Apple lo renueve: no contrates un plan nuevo.",
    deleteNotice: "Eliminar tu cuenta no cancela tu suscripción de App Store. Cancélala en el iPhone en Ajustes > tu nombre > Suscripciones para que no se te vuelva a cobrar.",
  },
  tr: {
    refuse: "Planınız iPhone'unuzdaki App Store üzerinden ödeniyor, bu yüzden burada yeniden satın alınamaz. Değiştirmek veya iptal etmek için iPhone'da Ayarlar > adınız > Abonelikler bölümünü açın.",
    title: "App Store üzerinden yönetiliyor",
    body: "DentVideo iPhone uygulamasında abone oldunuz, bu yüzden faturalandırmayı Apple yapıyor. Planınızı değiştirmek veya iptal etmek için iPhone'da Ayarlar > adınız > Abonelikler bölümünü açın.",
    button: "App Store aboneliklerini aç",
    holdTitle: "Apple planınızı yenileyemedi",
    holdBody: "Apple ödeme yönteminizden tahsilat yapamadı, bu yüzden yeni haftalık videolar duraklatıldı. iPhone'da Ayarlar > adınız > Ödeme ve Gönderim bölümünden güncelleyin. Apple yenilediği anda planınız devam eder. Lütfen yeni bir plan satın almayın.",
    deleteNotice: "Hesabınızı silmek App Store aboneliğinizi iptal etmez. Yeniden ücret alınmaması için iPhone'da Ayarlar > adınız > Abonelikler bölümünden iptal edin.",
  },
  fr: {
    refuse: "Votre formule est payée via l’App Store sur votre iPhone : elle ne peut donc pas être souscrite à nouveau ici. Pour la modifier ou la résilier, ouvrez Réglages > votre nom > Abonnements sur l’iPhone.",
    title: "Gérée dans l’App Store",
    body: "Vous vous êtes abonné dans l’app DentVideo pour iPhone : c’est donc Apple qui vous facture. Pour modifier ou résilier votre formule, ouvrez Réglages > votre nom > Abonnements sur l’iPhone.",
    button: "Ouvrir les abonnements App Store",
    holdTitle: "Apple n’a pas pu renouveler votre formule",
    holdBody: "Apple n’a pas pu débiter votre moyen de paiement : les nouvelles vidéos hebdomadaires sont donc en pause. Mettez-le à jour sur l’iPhone dans Réglages > votre nom > Paiement et livraison. Votre formule reprend dès qu’Apple la renouvelle. Ne souscrivez pas de nouvelle formule.",
    deleteNotice: "Supprimer votre compte ne résilie pas votre abonnement App Store. Résiliez-le sur l’iPhone dans Réglages > votre nom > Abonnements pour ne plus être débité.",
  },
  ja: {
    refuse: "ご利用のプランはiPhoneのApp Storeでお支払いいただいているため、ここで再度ご購入いただくことはできません。変更や解約は、iPhoneの「設定」>お名前>「サブスクリプション」から行えます。",
    title: "App Storeで管理されています",
    body: "DentVideoのiPhoneアプリでご登録いただいたため、請求はAppleが行います。プランの変更や解約は、iPhoneの「設定」>お名前>「サブスクリプション」から行えます。",
    button: "App Storeのサブスクリプションを開く",
    holdTitle: "Appleがプランを更新できませんでした",
    holdBody: "Appleがお支払い方法に請求できなかったため、新しい週次動画の制作を一時停止しています。iPhoneの「設定」>お名前>「お支払いと配送先」から更新してください。Appleが更新するとすぐにプランは再開します。新しいプランはお申し込みにならないでください。",
    deleteNotice: "アカウントを削除しても、App Storeのサブスクリプションは解約されません。今後請求されないよう、iPhoneの「設定」>お名前>「サブスクリプション」から解約してください。",
  },
  ar: {
    refuse: "تُدفع باقتكم عبر App Store على جهاز iPhone، لذا لا يمكن شراؤها مرة أخرى هنا. لتغييرها أو إلغائها، افتحوا الإعدادات > اسمكم > الاشتراكات على iPhone.",
    title: "تُدار عبر App Store",
    body: "اشتركتم عبر تطبيق DentVideo على iPhone، لذا تتولى Apple الفوترة. لتغيير باقتكم أو إلغائها، افتحوا الإعدادات > اسمكم > الاشتراكات على iPhone.",
    button: "فتح اشتراكات App Store",
    holdTitle: "لم تتمكن Apple من تجديد باقتكم",
    holdBody: "لم تتمكن Apple من تحصيل المبلغ من وسيلة الدفع، لذا توقفت الفيديوهات الأسبوعية الجديدة مؤقتًا. حدّثوها على iPhone من الإعدادات > اسمكم > الدفع والشحن. تستمر باقتكم فور تجديد Apple لها، لذا يُرجى عدم شراء باقة جديدة.",
    deleteNotice: "حذف حسابكم لا يُلغي اشتراك App Store. ألغوه على iPhone من الإعدادات > اسمكم > الاشتراكات حتى لا تُحاسَبوا مرة أخرى.",
  },
  pl: {
    refuse: "Plan jest opłacany przez App Store na iPhonie, więc nie można go tu kupić ponownie. Aby go zmienić lub anulować, prosimy otworzyć na iPhonie Ustawienia > imię i nazwisko > Subskrypcje.",
    title: "Zarządzany w App Store",
    body: "Subskrypcja została wykupiona w aplikacji DentVideo na iPhone'a, więc rozlicza ją Apple. Aby zmienić lub anulować plan, prosimy otworzyć na iPhonie Ustawienia > imię i nazwisko > Subskrypcje.",
    button: "Otwórz subskrypcje App Store",
    holdTitle: "Apple nie mogło odnowić planu",
    holdBody: "Apple nie mogło obciążyć metody płatności, więc nowe cotygodniowe filmy są wstrzymane. Prosimy ją zaktualizować na iPhonie w Ustawienia > imię i nazwisko > Płatności i wysyłka. Plan będzie kontynuowany, gdy tylko Apple go odnowi. Prosimy nie kupować nowego planu.",
    deleteNotice: "Usunięcie konta nie anuluje subskrypcji w App Store. Prosimy anulować ją na iPhonie w Ustawienia > imię i nazwisko > Subskrypcje, aby uniknąć kolejnych opłat.",
  },
};

export function appStoreText(locale: string | null | undefined): AppStoreCopy {
  return APP_STORE_COPY[(locale ?? "en") as Locale] ?? APP_STORE_COPY.en;
}
