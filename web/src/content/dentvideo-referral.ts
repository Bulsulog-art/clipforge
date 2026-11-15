import type { Locale } from "./dentvideo-locales";
import { REFERRAL } from "@/lib/dentvid/referrals";

/**
 * The referral card in Settings ("give a month, get a month",
 * lib/dentvid/referrals). Only what is true: the discount and the free month
 * come from REFERRAL, the credit is held for the refund window and applied
 * to the referrer's subscription, and there is a yearly cap. No numbers of
 * clinics, no promises beyond that.
 *
 * Placeholders: {pct} discount percent, {days} hold, {cap} free months a year,
 * {applied} / {pending} the clinic's own counts.
 */
export type ReferralText = {
  heading: string;
  lead: string;
  terms: string;
  codeLabel: string;
  linkLabel: string;
  copy: string;
  copied: string;
  stats: string;
  none: string;
};

const TEXT: Record<Locale, ReferralText> = {
  en: {
    heading: "Give a month, get a month",
    lead: "Know another clinic that would like weekly videos? Share your link. They get {pct}% off their first month, and once they pay, you get one month free.",
    terms:
      "Your free month is added to your subscription after their first payment has passed the {days}-day refund window. Refunded or disputed payments don't count, a clinic can't refer itself, and you can earn up to {cap} free months a year.",
    codeLabel: "Your code",
    linkLabel: "Your link",
    copy: "Copy link",
    copied: "Copied",
    stats: "Free months: {applied} added · {pending} on the way",
    none: "No referred clinic has paid yet.",
  },
  tr: {
    heading: "Bir ay hediye et, bir ay kazan",
    lead: "Haftalık videolardan memnun kalacak başka bir klinik tanıyor musunuz? Bağlantınızı paylaşın. Onlar ilk aylarında %{pct} indirim alır; ödeme yaptıklarında siz bir ay ücretsiz kazanırsınız.",
    terms:
      "Ücretsiz ayınız, onların ilk ödemesi {days} günlük iade süresini geçtikten sonra aboneliğinize eklenir. İade edilen veya itiraz edilen ödemeler sayılmaz, bir klinik kendini davet edemez ve yılda en fazla {cap} ücretsiz ay kazanabilirsiniz.",
    codeLabel: "Kodunuz",
    linkLabel: "Bağlantınız",
    copy: "Bağlantıyı kopyala",
    copied: "Kopyalandı",
    stats: "Ücretsiz aylar: {applied} eklendi · {pending} yolda",
    none: "Davet ettiğiniz bir klinik henüz ödeme yapmadı.",
  },
  de: {
    heading: "Einen Monat schenken, einen Monat bekommen",
    lead: "Kennen Sie eine andere Praxis, der wöchentliche Videos gefallen würden? Teilen Sie Ihren Link. Die Praxis erhält {pct} % Rabatt auf ihren ersten Monat, und sobald sie bezahlt hat, bekommen Sie einen Monat gratis.",
    terms:
      "Ihr Gratismonat wird Ihrem Abo gutgeschrieben, wenn die erste Zahlung der Praxis die Rückerstattungsfrist von {days} Tagen überstanden hat. Erstattete oder angefochtene Zahlungen zählen nicht, eine Praxis kann sich nicht selbst empfehlen, und Sie können bis zu {cap} Gratismonate pro Jahr erhalten.",
    codeLabel: "Ihr Code",
    linkLabel: "Ihr Link",
    copy: "Link kopieren",
    copied: "Kopiert",
    stats: "Gratismonate: {applied} gutgeschrieben · {pending} unterwegs",
    none: "Noch hat keine empfohlene Praxis bezahlt.",
  },
  es: {
    heading: "Regala un mes, gana un mes",
    lead: "¿Conoces otra clínica a la que le gustarían vídeos semanales? Comparte tu enlace. Tendrá un {pct} % de descuento en su primer mes y, cuando pague, tú tendrás un mes gratis.",
    terms:
      "Tu mes gratis se añade a tu suscripción cuando su primer pago supera el plazo de reembolso de {days} días. Los pagos reembolsados o disputados no cuentan, una clínica no puede recomendarse a sí misma y puedes ganar hasta {cap} meses gratis al año.",
    codeLabel: "Tu código",
    linkLabel: "Tu enlace",
    copy: "Copiar enlace",
    copied: "Copiado",
    stats: "Meses gratis: {applied} añadidos · {pending} en camino",
    none: "Ninguna clínica recomendada ha pagado todavía.",
  },
  fr: {
    heading: "Offrez un mois, recevez un mois",
    lead: "Vous connaissez un autre cabinet qui aimerait des vidéos chaque semaine ? Partagez votre lien. Il obtient {pct} % de réduction sur son premier mois, et dès qu'il a payé, vous recevez un mois offert.",
    terms:
      "Votre mois offert est ajouté à votre abonnement une fois que son premier paiement a passé le délai de remboursement de {days} jours. Les paiements remboursés ou contestés ne comptent pas, un cabinet ne peut pas se parrainer lui-même, et vous pouvez obtenir jusqu'à {cap} mois offerts par an.",
    codeLabel: "Votre code",
    linkLabel: "Votre lien",
    copy: "Copier le lien",
    copied: "Copié",
    stats: "Mois offerts : {applied} ajoutés · {pending} en cours",
    none: "Aucun cabinet parrainé n'a encore payé.",
  },
  pl: {
    heading: "Podaruj miesiąc, zyskaj miesiąc",
    lead: "Znają Państwo inny gabinet, któremu przydałyby się cotygodniowe filmy? Prosimy udostępnić swój link. Gabinet otrzyma {pct}% zniżki na pierwszy miesiąc, a gdy zapłaci, Państwo otrzymają jeden miesiąc gratis.",
    terms:
      "Darmowy miesiąc zostanie dodany do Państwa subskrypcji, gdy pierwsza płatność tego gabinetu minie {days}-dniowy okres zwrotu. Zwrócone lub zakwestionowane płatności się nie liczą, gabinet nie może polecić samego siebie, a w ciągu roku można zyskać maksymalnie {cap} darmowych miesięcy.",
    codeLabel: "Państwa kod",
    linkLabel: "Państwa link",
    copy: "Kopiuj link",
    copied: "Skopiowano",
    stats: "Darmowe miesiące: dodane {applied} · w drodze {pending}",
    none: "Żaden polecony gabinet jeszcze nie zapłacił.",
  },
  ar: {
    heading: "أهدِ شهرًا واحصل على شهر",
    lead: "هل تعرفون عيادة أخرى ستعجبها الفيديوهات الأسبوعية؟ شاركوا رابطكم. تحصل العيادة على خصم {pct}% على شهرها الأول، وعندما تدفع تحصلون على شهر مجاني.",
    terms:
      "يُضاف شهركم المجاني إلى اشتراككم بعد أن تتجاوز دفعتها الأولى فترة الاسترداد البالغة {days} يومًا. لا تُحتسب الدفعات المستردة أو المعترض عليها، ولا يمكن لعيادة أن تدعو نفسها، ويمكنكم الحصول على {cap} أشهر مجانية كحد أقصى في السنة.",
    codeLabel: "رمزكم",
    linkLabel: "رابطكم",
    copy: "نسخ الرابط",
    copied: "تم النسخ",
    stats: "الأشهر المجانية: {applied} مضافة · {pending} قيد الانتظار",
    none: "لم تدفع أي عيادة مدعوة بعد.",
  },
  ja: {
    heading: "1か月をプレゼントして、1か月をもらう",
    lead: "毎週の動画を気に入りそうな医院をご存じですか？あなたのリンクを共有してください。紹介された医院は最初の1か月が{pct}%オフになり、お支払いが完了すると、あなたは1か月分が無料になります。",
    terms:
      "無料の1か月は、紹介先の初回のお支払いが{days}日間の返金期間を過ぎた後、あなたのサブスクリプションに追加されます。返金または異議申し立てのあったお支払いは対象外で、自分の医院を紹介することはできません。無料になるのは年間最大{cap}か月までです。",
    codeLabel: "あなたのコード",
    linkLabel: "あなたのリンク",
    copy: "リンクをコピー",
    copied: "コピーしました",
    stats: "無料の月：追加済み {applied} · 準備中 {pending}",
    none: "紹介した医院のお支払いはまだありません。",
  },
};

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** The card's words in this language, with the program's numbers (and the clinic's counts) filled in. */
export function referralText(locale: Locale, counts: { applied: number; pending: number } = { applied: 0, pending: 0 }): ReferralText {
  const t = TEXT[locale] ?? TEXT.en;
  const vars = { pct: REFERRAL.discountPercent, days: REFERRAL.holdDays, cap: REFERRAL.capPerYear, applied: counts.applied, pending: counts.pending };
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, fill(v, vars)])) as ReferralText;
}

export const REFERRAL_LOCALES = Object.keys(TEXT) as Locale[];
