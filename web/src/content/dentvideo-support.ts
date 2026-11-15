import { OPERATOR } from "./guides/operator";
import type { Locale } from "./dentvideo-locales";

/**
 * The words every DentVideo email shares (the help line, the "button not
 * working?" fallback, the company line in the footer) and the in-app
 * "Help & contact" card (components/dentvid/help-contact.tsx). One entry per
 * site language, same keys and placeholders (support-copy.test.tsx).
 *
 * Replies to every DentVideo email land in the real hello@dentvideo.com
 * mailbox, so "reply to this email" is always true. No promised response
 * time: we only say a person reads it.
 *
 * Placeholders: {email} {clinic} {id}.
 */
export type SupportCopy = {
  email: {
    /** Under the sign-off, in every email. */
    help: string;
    /** Above the written-out link under the main button. */
    linkFallback: string;
    /** Country name for the footer's postal line. */
    country: string;
  };
  help: {
    title: string;
    lead: string;
    button: string;
    /** The prefilled subject: always carries the clinic id so we can find the account. */
    subject: string;
    /** The prefilled body: a short frame the clinic fills in. */
    body: string;
    /** Under the button, for clinics whose mail app does not open. */
    orWrite: string;
    /** Short label for the app footer link. */
    footerLink: string;
  };
};

export const SUPPORT_COPY: Record<Locale, SupportCopy> = {
  en: {
    email: {
      help: "Questions or something to change? Just reply to this email. A real person reads every message at {email}.",
      linkFallback: "Button not working? Open this link:",
      country: "Montenegro",
    },
    help: {
      title: "Help & contact",
      lead: "A question, a video to change, or a problem with billing: write to us and a real person will answer. Your clinic ID is filled in for you, so we can find your account straight away.",
      button: "Email us",
      subject: "DentVideo help · {clinic} · {id}",
      body: "Hello DentVideo team,\n\nWhat I need help with:\n\n\n(Clinic ID: {id}. Please keep this line so we can find your account.)",
      orWrite: "Or write to {email} from any mail app.",
      footerLink: "Help & contact",
    },
  },
  de: {
    email: {
      help: "Fragen oder Änderungswünsche? Antworten Sie einfach auf diese E-Mail. Unter {email} liest ein Mensch jede Nachricht.",
      linkFallback: "Die Schaltfläche funktioniert nicht? Öffnen Sie diesen Link:",
      country: "Montenegro",
    },
    help: {
      title: "Hilfe & Kontakt",
      lead: "Eine Frage, ein Video, das geändert werden soll, oder ein Problem mit der Abrechnung: Schreiben Sie uns, ein Mensch antwortet Ihnen. Ihre Praxis-ID ist schon eingetragen, damit wir Ihr Konto sofort finden.",
      button: "E-Mail schreiben",
      subject: "DentVideo Hilfe · {clinic} · {id}",
      body: "Hallo DentVideo-Team,\n\nwobei ich Hilfe brauche:\n\n\n(Praxis-ID: {id}. Bitte diese Zeile stehen lassen, damit wir Ihr Konto finden.)",
      orWrite: "Oder schreiben Sie aus einem beliebigen E-Mail-Programm an {email}.",
      footerLink: "Hilfe & Kontakt",
    },
  },
  es: {
    email: {
      help: "¿Dudas o algo que cambiar? Responde a este correo. Una persona lee cada mensaje en {email}.",
      linkFallback: "¿El botón no funciona? Abre este enlace:",
      country: "Montenegro",
    },
    help: {
      title: "Ayuda y contacto",
      lead: "Una duda, un vídeo que cambiar o un problema con el pago: escríbenos y te responderá una persona. El ID de tu clínica ya va incluido para que encontremos tu cuenta enseguida.",
      button: "Escribirnos",
      subject: "Ayuda DentVideo · {clinic} · {id}",
      body: "Hola, equipo de DentVideo:\n\nNecesito ayuda con:\n\n\n(ID de la clínica: {id}. Deja esta línea para que encontremos tu cuenta.)",
      orWrite: "O escribe a {email} desde cualquier aplicación de correo.",
      footerLink: "Ayuda y contacto",
    },
  },
  tr: {
    email: {
      help: "Sorunuz ya da değiştirmek istediğiniz bir şey mi var? Bu e-postayı yanıtlamanız yeterli. {email} adresine gelen her mesajı bir ekip üyemiz okur.",
      linkFallback: "Düğme çalışmıyor mu? Bu bağlantıyı açın:",
      country: "Karadağ",
    },
    help: {
      title: "Yardım ve iletişim",
      lead: "Bir sorunuz, değişmesini istediğiniz bir video ya da ödemeyle ilgili bir sorun mu var? Bize yazın, bir ekip üyemiz yanıtlasın. Klinik numaranız otomatik eklenir, hesabınızı hemen buluruz.",
      button: "Bize e-posta gönderin",
      subject: "DentVideo yardım · {clinic} · {id}",
      body: "Merhaba DentVideo ekibi,\n\nYardım istediğim konu:\n\n\n(Klinik numarası: {id}. Hesabınızı bulabilmemiz için lütfen bu satırı silmeyin.)",
      orWrite: "Ya da herhangi bir e-posta uygulamasından {email} adresine yazın.",
      footerLink: "Yardım ve iletişim",
    },
  },
  fr: {
    email: {
      help: "Une question ou une modification ? Répondez simplement à cet e-mail. Une vraie personne lit chaque message envoyé à {email}.",
      linkFallback: "Le bouton ne fonctionne pas ? Ouvrez ce lien :",
      country: "Monténégro",
    },
    help: {
      title: "Aide et contact",
      lead: "Une question, une vidéo à modifier ou un souci de paiement : écrivez-nous, une vraie personne vous répondra. L'identifiant de votre cabinet est déjà indiqué pour que nous retrouvions votre compte tout de suite.",
      button: "Nous écrire",
      subject: "Aide DentVideo · {clinic} · {id}",
      body: "Bonjour l'équipe DentVideo,\n\nJ'ai besoin d'aide pour :\n\n\n(Identifiant du cabinet : {id}. Merci de garder cette ligne pour que nous retrouvions votre compte.)",
      orWrite: "Ou écrivez à {email} depuis n'importe quelle messagerie.",
      footerLink: "Aide et contact",
    },
  },
  ja: {
    email: {
      help: "ご質問や変更のご希望は、このメールにそのままご返信ください。{email} に届いたメッセージは、すべてスタッフが拝読します。",
      linkFallback: "ボタンが動かない場合は、こちらのリンクを開いてください：",
      country: "モンテネグロ",
    },
    help: {
      title: "ヘルプ・お問い合わせ",
      lead: "ご質問、動画の修正のご依頼、お支払いに関するお困りごとは、メールでお気軽にご連絡ください。スタッフがお返事します。医院IDは自動で入力されるため、すぐにアカウントを確認できます。",
      button: "メールで問い合わせる",
      subject: "DentVideo お問い合わせ · {clinic} · {id}",
      body: "DentVideo ご担当者様\n\nお問い合わせ内容：\n\n\n（医院ID：{id}。アカウント確認のため、この行は消さずにお送りください。）",
      orWrite: "お使いのメールアプリから {email} 宛てにお送りいただくこともできます。",
      footerLink: "ヘルプ・お問い合わせ",
    },
  },
  ar: {
    email: {
      help: "لديكم سؤال أو تعديل؟ يكفي الرد على هذه الرسالة. يقرأ أحد أفراد فريقنا كل رسالة تصل إلى {email}.",
      linkFallback: "الزر لا يعمل؟ افتحوا هذا الرابط:",
      country: "الجبل الأسود",
    },
    help: {
      title: "المساعدة والتواصل",
      lead: "سؤال، أو فيديو تريدون تعديله، أو مشكلة في الدفع: راسلونا وسيرد عليكم أحد أفراد فريقنا. يُضاف رقم عيادتكم تلقائياً لنجد حسابكم فوراً.",
      button: "راسلونا",
      subject: "مساعدة DentVideo · {clinic} · {id}",
      body: "مرحباً فريق DentVideo،\n\nأحتاج إلى مساعدة في:\n\n\n(رقم العيادة: {id}. يُرجى إبقاء هذا السطر لنجد حسابكم.)",
      orWrite: "أو راسلونا على {email} من أي تطبيق بريد.",
      footerLink: "المساعدة والتواصل",
    },
  },
  pl: {
    email: {
      help: "Pytania lub zmiany? Wystarczy odpowiedzieć na tę wiadomość. Każdą wiadomość wysłaną na {email} czyta człowiek.",
      linkFallback: "Przycisk nie działa? Proszę otworzyć ten link:",
      country: "Czarnogóra",
    },
    help: {
      title: "Pomoc i kontakt",
      lead: "Pytanie, film do zmiany albo problem z płatnością: prosimy napisać, odpowie człowiek. Identyfikator gabinetu jest już wpisany, więc od razu znajdziemy konto.",
      button: "Napisz do nas",
      subject: "Pomoc DentVideo · {clinic} · {id}",
      body: "Dzień dobry, zespole DentVideo,\n\nW czym potrzebuję pomocy:\n\n\n(ID gabinetu: {id}. Prosimy zostawić tę linię, abyśmy znaleźli konto.)",
      orWrite: "Albo prosimy napisać na {email} z dowolnej poczty.",
      footerLink: "Pomoc i kontakt",
    },
  },
};

export const SUPPORT_EMAIL = OPERATOR.productEmail;

/** The copy for a language; English for any other (it, pt clinics get English mail chrome too). */
export function supportText(language: string | null | undefined): { lang: Locale; copy: SupportCopy } {
  const lang = (language && Object.hasOwn(SUPPORT_COPY, language) ? language : "en") as Locale;
  return { lang, copy: SUPPORT_COPY[lang] };
}

/** "DentVideo · BLS AI Automation DOO · Neznanih Junaka 60, 81000 Podgorica, Montenegro" — every email's footer. */
export function companyLine(language: string | null | undefined): string {
  const { copy } = supportText(language);
  return `DentVideo · ${OPERATOR.shortName} · ${OPERATOR.street}, ${OPERATOR.postalCode} ${OPERATOR.city}, ${copy.email.country}`;
}

const fillVars = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));

/**
 * The "Help & contact" mailto: subject "DentVideo help · <clinic> · <clinic id>"
 * and a short body frame, both in the clinic's language. The id is what we
 * search the admin panel by; the name is for the human reading the inbox.
 */
export function helpMailto(language: string | null | undefined, clinic: { id?: string | null; name?: string | null }): string {
  const { copy } = supportText(language);
  const id = (clinic.id ?? "").trim();
  const name = (clinic.name ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  // A part we don't know is left out, not shown empty ("DentVideo help · <id>", or just "DentVideo help").
  const subject = fillVars(copy.help.subject, { clinic: name || "\u0000", id: id || "\u0000" })
    .split(" · ")
    .filter((p) => !p.includes("\u0000"))
    .join(" · ");
  // Without an id the closing "(Clinic ID: …)" paragraph goes too.
  const body = id ? fillVars(copy.help.body, { id }) : copy.help.body.split("\n\n").filter((p) => !p.includes("{id}")).join("\n\n");
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const fillSupport = fillVars;
