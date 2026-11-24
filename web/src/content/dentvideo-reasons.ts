/**
 * The short, calm reasons a clinic reads on a video that needs a look, or on
 * a topic that was not made (lib/dentvid/reasons.ts turns the stored codes
 * into these). Never the team's internal notes: those stay in the admin panel.
 *
 * Forms of address as in dentvideo-app.ts: German Sie, Spanish tú, French
 * vous, Turkish siz, Japanese です・ます, Arabic plural, Polish Państwo.
 *
 * "unchecked": the video was made, but the measurement of its picture and
 * sound could not run (worker rows.ts), so the dentist watches it first.
 */
import type { Locale } from "./dentvideo-locales";
import type { ClinicReason } from "@/lib/dentvid/reasons";

export const REASON_TEXT: Record<Locale, Record<ClinicReason, string>> = {
  en: {
    pause: "Short pause in the narration — have a look before posting.",
    audio: "The sound may be quiet in places — have a listen before posting.",
    technical: "Our picture and sound check noticed something small — have a look before posting.",
    wording: "Our software check marked some wording — please read it once before posting.",
    opening: "We took out the on-screen opening line to stay within advertising rules — have a look before posting.",
    skipped: "We skipped this topic because the script didn't meet our quality bar.",
    unchecked: "Our picture and sound check could not run on this one. Please watch it once before posting.",
    unavailable: "We couldn't make this one this time. There is nothing for you to do.",
    generic: "Worth a quick look before posting.",
  },
  de: {
    pause: "Kurze Pause in der Vertonung – bitte vor dem Posten kurz ansehen.",
    audio: "Der Ton ist stellenweise leise – bitte vor dem Posten kurz anhören.",
    technical: "Unsere Bild- und Tonprüfung hat eine Kleinigkeit bemerkt – bitte vor dem Posten kurz ansehen.",
    wording: "Unsere softwaregestützte Prüfung hat eine Formulierung markiert – bitte vor dem Posten einmal lesen.",
    opening: "Wir haben die Einstiegszeile im Bild entfernt, damit alles im Rahmen des Werberechts bleibt – bitte vor dem Posten kurz ansehen.",
    skipped: "Dieses Thema haben wir ausgelassen, weil das Skript unseren Qualitätsanspruch nicht erfüllt hat.",
    unchecked: "Unsere Bild- und Tonprüfung konnte bei diesem Video nicht durchgeführt werden. Bitte sehen Sie es sich vor dem Posten einmal an.",
    unavailable: "Dieses Video konnten wir diesmal nicht erstellen. Sie müssen nichts tun.",
    generic: "Bitte vor dem Posten kurz ansehen.",
  },
  es: {
    pause: "Hay una pausa breve en la narración: échale un vistazo antes de publicar.",
    audio: "El sonido puede ser bajo en algún momento: escúchalo antes de publicar.",
    technical: "Nuestra revisión de imagen y sonido ha notado un detalle: échale un vistazo antes de publicar.",
    wording: "Nuestra revisión por software ha marcado una frase: léela una vez antes de publicar.",
    opening: "Quitamos la frase inicial en pantalla para respetar las normas de publicidad: échale un vistazo antes de publicar.",
    skipped: "Omitimos este tema porque el guion no alcanzó nuestro nivel de calidad.",
    unchecked: "No pudimos hacer nuestra revisión de imagen y sonido en este vídeo. Míralo una vez antes de publicar.",
    unavailable: "Esta vez no pudimos hacer este vídeo. No tienes que hacer nada.",
    generic: "Conviene echarle un vistazo antes de publicar.",
  },
  fr: {
    pause: "Courte pause dans la narration — jetez-y un œil avant de publier.",
    audio: "Le son peut être faible par endroits — écoutez-le avant de publier.",
    technical: "Notre contrôle de l'image et du son a relevé un détail — jetez-y un œil avant de publier.",
    wording: "La vérification par logiciel a signalé une formulation — relisez-la avant de publier.",
    opening: "Nous avons retiré la phrase d'accroche à l'écran pour rester dans les règles de publicité — jetez-y un œil avant de publier.",
    skipped: "Nous avons laissé ce sujet de côté : le script n'atteignait pas notre niveau de qualité.",
    unchecked: "Notre contrôle de l'image et du son n'a pas pu être effectué sur cette vidéo. Regardez-la une fois avant de publier.",
    unavailable: "Nous n'avons pas pu réaliser cette vidéo cette fois-ci. Vous n'avez rien à faire.",
    generic: "À regarder rapidement avant de publier.",
  },
  tr: {
    pause: "Anlatımda kısa bir duraklama var — paylaşmadan önce göz atın.",
    audio: "Ses bazı yerlerde düşük olabilir — paylaşmadan önce dinleyin.",
    technical: "Görüntü ve ses kontrolümüz küçük bir ayrıntı fark etti — paylaşmadan önce göz atın.",
    wording: "Yazılımla yaptığımız kontrol bir ifadeyi işaretledi — paylaşmadan önce bir kez okuyun.",
    opening: "Reklam kurallarına uymak için ekrandaki açılış cümlesini çıkardık — paylaşmadan önce göz atın.",
    skipped: "Bu konuyu atladık; senaryo kalite çıtamızı karşılamadı.",
    unchecked: "Bu videoda görüntü ve ses kontrolümüzü yapamadık. Paylaşmadan önce lütfen bir kez izleyin.",
    unavailable: "Bu videoyu bu kez hazırlayamadık. Sizin bir şey yapmanız gerekmiyor.",
    generic: "Paylaşmadan önce kısaca göz atmanızı öneririz.",
  },
  ja: {
    pause: "ナレーションに短い間があります。投稿前にご確認ください。",
    audio: "音声が小さい箇所があるかもしれません。投稿前にお聞きください。",
    technical: "映像と音声のチェックで小さな点が見つかりました。投稿前にご確認ください。",
    wording: "ソフトウェアでのチェックで表現に印が付きました。投稿前に一度お読みください。",
    opening: "広告ルールに沿うよう、画面上の冒頭の一文を外しました。投稿前にご確認ください。",
    skipped: "台本が品質基準に届かなかったため、このテーマは見送りました。",
    unchecked: "この動画では映像と音声のチェックを実行できませんでした。投稿前に一度ご覧ください。",
    unavailable: "今回はこの動画を作成できませんでした。操作は必要ありません。",
    generic: "投稿前に一度ご確認ください。",
  },
  ar: {
    pause: "توقف قصير في التعليق الصوتي — يُرجى إلقاء نظرة قبل النشر.",
    audio: "قد يكون الصوت منخفضًا في بعض المواضع — يُرجى الاستماع قبل النشر.",
    technical: "لاحظ فحص الصورة والصوت لدينا تفصيلًا صغيرًا — يُرجى إلقاء نظرة قبل النشر.",
    wording: "أشارت المراجعة الآلية إلى صياغة ما — يُرجى قراءتها مرة قبل النشر.",
    opening: "أزلنا الجملة الافتتاحية على الشاشة للالتزام بقواعد الإعلان — يُرجى إلقاء نظرة قبل النشر.",
    skipped: "تخطّينا هذا الموضوع لأن النص لم يبلغ مستوى الجودة لدينا.",
    unchecked: "لم نتمكن من إجراء فحص الصورة والصوت لهذا الفيديو. يُرجى مشاهدته مرة واحدة قبل النشر.",
    unavailable: "لم نتمكن من إعداد هذا الفيديو هذه المرة، ولا يلزمكم فعل شيء.",
    generic: "يُستحسن إلقاء نظرة سريعة قبل النشر.",
  },
  pl: {
    pause: "Krótka pauza w narracji — prosimy obejrzeć przed publikacją.",
    audio: "Dźwięk może miejscami być cichy — prosimy odsłuchać przed publikacją.",
    technical: "Nasza kontrola obrazu i dźwięku zauważyła drobiazg — prosimy obejrzeć przed publikacją.",
    wording: "Sprawdzenie przez oprogramowanie oznaczyło sformułowanie — prosimy przeczytać je przed publikacją.",
    opening: "Usunęliśmy zdanie otwierające na ekranie, aby zachować zgodność z zasadami reklamy — prosimy obejrzeć przed publikacją.",
    skipped: "Pominęliśmy ten temat, ponieważ scenariusz nie spełnił naszych standardów jakości.",
    unchecked: "Nie udało się przeprowadzić kontroli obrazu i dźwięku tego filmu. Prosimy obejrzeć go raz przed publikacją.",
    unavailable: "Tym razem nie udało się przygotować tego filmu. Nie trzeba nic robić.",
    generic: "Warto rzucić okiem przed publikacją.",
  },
};

export function reasonText(locale: Locale, code: ClinicReason): string {
  return (REASON_TEXT[locale] ?? REASON_TEXT.en)[code];
}
