import type { Locale } from "@/content/dentvideo";
import type { PostTexts } from "./posting";

/**
 * Post kits as the worker writes them (worker/src/dentvid/post-kit.ts), for
 * the dev previews and the email samples: caption, the soft invitation to
 * ask, "📍 Clinic · City", 5–10 hashtags; and the one-line TikTok / Shorts
 * version. No I/O.
 */
type Sample = { clinic: string; city: string; title: string; caption: string; cta: string; tags: string[]; video: string };

const S: Record<Locale, Sample> = {
  en: {
    clinic: "Riverside Dental",
    city: "Bristol",
    title: "Whitening myths, busted",
    caption: "Whitening toothpaste polishes surface stains — it can't change the natural colour of your teeth.\n\nIf your teeth feel sensitive after whitening, that usually settles within a few days.",
    cta: "Questions about this? You're welcome to send us a message.",
    tags: ["riverside.dental", "bristol", "dentistbristol", "teethwhitening", "whiteningmyths", "dentist", "oralhealth"],
    video: "en/whitening-myths-debunked",
  },
  de: {
    clinic: "Zahnarztpraxis am Park",
    city: "München",
    title: "Bleaching: Mythen im Check",
    caption: "Weißmacher-Zahnpasta poliert Verfärbungen an der Oberfläche – die natürliche Zahnfarbe ändert sie nicht.\n\nEmpfindliche Zähne nach dem Bleaching beruhigen sich meist nach wenigen Tagen.",
    cta: "Fragen dazu? Schreiben Sie uns gern eine Nachricht.",
    tags: ["riversidedental", "münchen", "zahnarztmünchen", "bleaching", "zahnaufhellung", "zahnarzt", "zahngesundheit"],
    video: "de/bleaching-zahnschmelz",
  },
  es: {
    clinic: "Clínica Dental Sonrisa",
    city: "Valencia",
    title: "Mitos del blanqueamiento",
    caption: "La pasta blanqueadora pule las manchas de la superficie, pero no cambia el color natural del diente.\n\nSi notas sensibilidad tras un blanqueamiento, suele pasar en pocos días.",
    cta: "¿Tienes dudas sobre esto? Puedes escribirnos cuando quieras.",
    tags: ["riversidedental", "valencia", "dentistavalencia", "blanqueamientodental", "saludbucal", "dentista"],
    video: "es/limpieza-dental",
  },
  fr: {
    clinic: "Cabinet Dentaire du Parc",
    city: "Lyon",
    title: "Blanchiment : idées reçues",
    caption: "Un dentifrice blanchissant polit les taches de surface ; il ne change pas la teinte naturelle de la dent.\n\nAprès un blanchiment, une sensibilité passagère disparaît en général en quelques jours.",
    cta: "Une question à ce sujet ? Vous pouvez nous écrire.",
    tags: ["riversidedental", "lyon", "dentistelyon", "blanchimentdentaire", "dentiste", "santebuccodentaire"],
    video: "fr/blanchiment-email",
  },
  tr: {
    clinic: "Gülümse Diş Kliniği",
    city: "İzmir",
    title: "Beyazlatma ve hassasiyet",
    caption: "Beyazlatıcı diş macunları yüzeydeki lekeleri parlatır; dişin doğal rengini değiştirmez.\n\nBeyazlatma sonrası hassasiyet genellikle birkaç gün içinde azalır.",
    // Türkiye: the post may only inform (RG 33075), so the invitation sends viewers to their own dentist.
    cta: "Merak ettiğiniz bir şey varsa bir sonraki kontrolünüzde hekiminize sorabilirsiniz.",
    tags: ["riversidedental", "izmir", "izmirdishekimi", "disbeyazlatma", "dishassasiyeti", "dishekimi", "agizsagligi"],
    video: "tr/beyazlatma-hassasiyet",
  },
  ja: {
    clinic: "さくら歯科クリニック",
    city: "横浜市",
    title: "ホワイトニングの誤解",
    caption: "ホワイトニング歯みがき粉は表面の着色を落とすもので、歯そのものの色を変えるものではありません。\n\nホワイトニング後のしみる感じは、多くの場合数日でおさまります。",
    cta: "気になることがあれば、メッセージでお気軽にご相談ください。",
    tags: ["riversidedental", "横浜市", "横浜市歯医者", "ホワイトニング", "歯医者", "歯の健康"],
    video: "en/whitening-myths-debunked",
  },
  ar: {
    clinic: "عيادة الابتسامة لطب الأسنان",
    city: "دبي",
    title: "خرافات تبييض الأسنان",
    caption: "معجون التبييض يلمّع البقع السطحية، لكنه لا يغيّر اللون الطبيعي للأسنان.\n\nالحساسية بعد التبييض تخف عادةً خلال أيام قليلة.",
    cta: "لأي سؤال عن هذا الموضوع، يسعدنا أن تراسلونا.",
    tags: ["riversidedental", "دبي", "طبيب_أسنان_دبي", "تبييض_الأسنان", "صحة_الفم", "طبيب_أسنان"],
    video: "en/whitening-myths-debunked",
  },
  pl: {
    clinic: "Gabinet Stomatologiczny Uśmiech",
    city: "Kraków",
    title: "Mity o wybielaniu",
    caption: "Wybielająca pasta poleruje przebarwienia na powierzchni, ale nie zmienia naturalnego koloru zębów.\n\nNadwrażliwość po wybielaniu zwykle mija w ciągu kilku dni.",
    cta: "Mają Państwo pytania? Chętnie odpowiemy w wiadomości.",
    tags: ["riversidedental", "krakow", "stomatologkrakow", "wybielaniezebow", "dentysta", "zdrowiezebow"],
    video: "en/whitening-myths-debunked",
  },
};

export function samplePostTexts(locale: Locale): PostTexts {
  const s = S[locale];
  const tags = s.tags.map((t) => `#${t.replace(/\./g, "")}`);
  const first = s.caption.split("\n")[0];
  return {
    instagram: `${s.caption}\n\n${s.cta}\n\n📍 ${s.clinic} · ${s.city}\n\n${tags.join(" ")}`,
    short: `${first} ${s.cta}\n${tags.slice(1, 4).join(" ")}`,
  };
}

/** One demo video per language for the dev "approve & share" page. */
export function samplePost(locale: Locale): { title: string; videoUrl: string; thumbUrl: string; texts: PostTexts } {
  const s = S[locale];
  return { title: s.title, videoUrl: `/dentvideo/samples/${s.video}.mp4`, thumbUrl: `/dentvideo/samples/${s.video}.jpg`, texts: samplePostTexts(locale) };
}
