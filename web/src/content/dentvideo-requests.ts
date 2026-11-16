import type { Locale } from "./dentvideo";

/**
 * The clinic's own requests in the app, and what follows from them:
 *  - topic suggestions ("Suggest a topic for next week", library and settings);
 *  - "Ask for a change" on one video;
 *  - the subtitle file next to the video download;
 *  - the library's 90 days after a plan ends (the app notice and the two
 *    reminder emails, sent by the worker's retention job).
 * Same forms of address as the rest of the app (dentvideo-app.ts): German Sie,
 * Spanish tú, French vous, Turkish siz, Japanese です・ます, Arabic plural,
 * Polish Państwo. No promises: a suggestion is used "if it fits", a change is
 * "made again with the same checks", and nothing is kept longer or shorter
 * than the privacy policy says. {placeholders} are filled by `fill`.
 */

export const TOPIC_MAX = 140;
export const CHANGE_NOTE_MAX = 300;
/** Change requests a clinic can make per week (worker spend guard DENTVID_MAX_CHANGES_PER_CLINIC_WEEK). */
export const CHANGES_PER_WEEK = 3;
/** Suggestions a clinic can have waiting at once. */
export const PENDING_TOPICS_MAX = 5;

export type TopicRefusal = "not_offered" | "ad_rules" | "clinical" | "unclear" | "checks";
export type ChangeStatus = "queued" | "working" | "done" | "refused" | "failed";
export type ChangeReason = "checks" | "no_plan" | "busy" | "technical" | "not_possible";

export type RequestsText = {
  topics: {
    title: string;
    lead: string;
    label: string;
    placeholder: string;
    submit: string;
    sending: string;
    sent: string;
    listTitle: string;
    status: { pending: string; used: string; refused: string };
    /** {date}: the Monday of the week it was made for. */
    usedIn: string;
    withdraw: string;
    reasons: Record<TopicRefusal, string>;
    errors: { length: string; plain: string; adRules: string; tooManyPending: string; unavailable: string };
  };
  change: {
    button: string;
    title: string;
    lead: string;
    label: string;
    placeholder: string;
    submit: string;
    sending: string;
    cancel: string;
    /** {n}: requests left this week; {max}: the weekly number. */
    left: string;
    status: Record<ChangeStatus, string>;
    reasons: Record<ChangeReason, string>;
    errors: { length: string; plain: string; limit: string; busy: string; notThis: string; unavailable: string };
  };
  subtitles: { download: string; hint: string };
  retention: {
    /** {ended}: when the plan ended; {date}: the day the videos are deleted. */
    notice: string;
  };
  email: {
    subject14: string;
    subject1: string;
    preheader14: string;
    preheader1: string;
    title14: string;
    title1: string;
    /** {ended} {date} */
    body14: string;
    body1: string;
    keep: string;
    button: string;
    footer: string;
  };
};

const en: RequestsText = {
  topics: {
    title: "Suggest a topic for next week",
    lead: "A patient question or a subject, in one sentence. We use suggestions first when they fit your services and pass the same checks as every video.",
    label: "Your topic",
    placeholder: "For example: How long does sensitivity last after whitening?",
    submit: "Send suggestion",
    sending: "Sending…",
    sent: "Thank you. If it fits your services and passes the checks, it will be in an upcoming week.",
    listTitle: "Your suggestions",
    status: { pending: "Waiting for an upcoming week", used: "Made", refused: "Not made" },
    usedIn: "In the week of {date}",
    withdraw: "Remove",
    reasons: {
      not_offered: "It isn't about one of the services in your settings. Add the service, then suggest it again.",
      ad_rules: "It asks for something health-advertising rules restrict, such as prices, offers, comparisons or promised results.",
      clinical: "We couldn't turn it into general, mainstream guidance. It may need an individual diagnosis.",
      unclear: "We couldn't tell what the video should answer. Try writing it as a patient's question.",
      checks: "We wrote it, but the script didn't pass our clinical and advertising checks.",
    },
    errors: {
      length: "Please write between 3 and 140 characters.",
      plain: "Plain text only, without links.",
      adRules: "This touches on something health-advertising rules restrict (prices, offers, promised results). Try a patient's question instead.",
      tooManyPending: "You already have 5 suggestions waiting. We'll use those first.",
      unavailable: "Suggestions aren't available yet. Please write to us instead.",
    },
  },
  change: {
    button: "Ask for a change",
    title: "What should be different?",
    lead: "Describe the change in a sentence or two. Only this video is made again, with the same checks, and you approve it again before posting.",
    label: "Your note",
    placeholder: "For example: Shorter, and say that sensitivity usually fades.",
    submit: "Send",
    sending: "Sending…",
    cancel: "Cancel",
    left: "Changes left this week: {n} of {max}",
    status: {
      queued: "Change requested",
      working: "Making your change",
      done: "Changed. Please watch it again before you approve it.",
      refused: "Not changed",
      failed: "Not changed",
    },
    reasons: {
      checks: "The changed version didn't pass our checks, so your current video stays as it is.",
      no_plan: "Changes need an active plan.",
      busy: "We couldn't make the change right now. Your current video stays, and we have been told.",
      technical: "Something went wrong on our side. Your current video stays, and we have been told.",
      not_possible: "This video can't be changed this way. Write to us and we'll help.",
    },
    errors: {
      length: "Please write between 3 and 300 characters.",
      plain: "Plain text only, without links.",
      limit: "You've used this week's 3 change requests. You can ask again next week, or decline the video.",
      busy: "A change to this video is already being made.",
      notThis: "Only the videos we made for you can be changed this way, not clips from your recordings.",
      unavailable: "Change requests aren't available yet. Please write to us instead.",
    },
  },
  subtitles: { download: "Download subtitles (.srt)", hint: "The narration as a subtitle file, for YouTube or Facebook." },
  retention: { notice: "Your plan ended on {ended}. Your videos stay here to watch and download until {date}. After that they are deleted." },
  email: {
    subject14: "Your DentVideo videos will be deleted on {date}",
    subject1: "Last reminder: your DentVideo videos will be deleted tomorrow",
    preheader14: "Your plan has ended. Download the videos you want to keep before {date}.",
    preheader1: "Download the videos you want to keep today.",
    title14: "Your videos are kept until {date}",
    title1: "Your videos will be deleted tomorrow",
    body14: "Your DentVideo plan ended on {ended}. We keep your videos for 90 days after a plan ends, so you can still watch and download them. On {date} we will delete your videos, recordings and subtitle files.",
    body1: "This is the last reminder: tomorrow, {date}, we will delete your videos, recordings and subtitle files.",
    keep: "To keep them, open your library and download the videos you want, or download everything at once in Settings → Your data → “Download my data”. If you choose a plan again before then, everything stays. Your settings and logo are kept either way.",
    button: "Open my library",
    footer: "You get this email because your clinic's DentVideo plan ended. It is about your data, so it is sent even if you unsubscribed from reminders.",
  },
};

const de: RequestsText = {
  topics: {
    title: "Thema für nächste Woche vorschlagen",
    lead: "Eine Patientenfrage oder ein Thema, in einem Satz. Vorschläge nutzen wir zuerst, wenn sie zu Ihren Leistungen passen und dieselben Prüfungen bestehen wie jedes Video.",
    label: "Ihr Thema",
    placeholder: "Zum Beispiel: Wie lange hält die Empfindlichkeit nach dem Bleaching an?",
    submit: "Vorschlag senden",
    sending: "Wird gesendet …",
    sent: "Danke. Passt er zu Ihren Leistungen und besteht er die Prüfungen, kommt er in einer der nächsten Wochen.",
    listTitle: "Ihre Vorschläge",
    status: { pending: "Wartet auf eine der nächsten Wochen", used: "Umgesetzt", refused: "Nicht umgesetzt" },
    usedIn: "In der Woche vom {date}",
    withdraw: "Entfernen",
    reasons: {
      not_offered: "Es betrifft keine der Leistungen in Ihren Einstellungen. Ergänzen Sie die Leistung und schlagen Sie es dann erneut vor.",
      ad_rules: "Es verlangt etwas, das die Regeln für Heilmittelwerbung einschränken, etwa Preise, Angebote, Vergleiche oder versprochene Ergebnisse.",
      clinical: "Wir konnten daraus keinen allgemeinen, fachlich anerkannten Rat machen. Vermutlich braucht es eine individuelle Diagnose.",
      unclear: "Wir konnten nicht erkennen, was das Video beantworten soll. Formulieren Sie es am besten als Frage eines Patienten.",
      checks: "Wir haben es geschrieben, aber das Skript hat unsere fachliche und werberechtliche Prüfung nicht bestanden.",
    },
    errors: {
      length: "Bitte schreiben Sie zwischen 3 und 140 Zeichen.",
      plain: "Nur einfacher Text, ohne Links.",
      adRules: "Das berührt etwas, das die Regeln für Heilmittelwerbung einschränken (Preise, Angebote, versprochene Ergebnisse). Versuchen Sie es mit einer Patientenfrage.",
      tooManyPending: "Sie haben schon 5 Vorschläge, die warten. Diese nutzen wir zuerst.",
      unavailable: "Vorschläge sind noch nicht verfügbar. Schreiben Sie uns gern stattdessen.",
    },
  },
  change: {
    button: "Änderung anfragen",
    title: "Was soll anders sein?",
    lead: "Beschreiben Sie die Änderung in ein, zwei Sätzen. Nur dieses Video wird neu erstellt, mit denselben Prüfungen, und Sie geben es vor dem Posten erneut frei.",
    label: "Ihre Notiz",
    placeholder: "Zum Beispiel: Kürzer, und sagen, dass die Empfindlichkeit meist nachlässt.",
    submit: "Senden",
    sending: "Wird gesendet …",
    cancel: "Abbrechen",
    left: "Änderungen in dieser Woche übrig: {n} von {max}",
    status: {
      queued: "Änderung angefragt",
      working: "Ihre Änderung wird erstellt",
      done: "Geändert. Bitte sehen Sie es sich vor der Freigabe noch einmal an.",
      refused: "Nicht geändert",
      failed: "Nicht geändert",
    },
    reasons: {
      checks: "Die geänderte Fassung hat unsere Prüfungen nicht bestanden, daher bleibt Ihr bisheriges Video unverändert.",
      no_plan: "Für Änderungen braucht es einen aktiven Tarif.",
      busy: "Wir konnten die Änderung gerade nicht erstellen. Ihr bisheriges Video bleibt, und wir sind informiert.",
      technical: "Bei uns ist etwas schiefgegangen. Ihr bisheriges Video bleibt, und wir sind informiert.",
      not_possible: "Dieses Video lässt sich so nicht ändern. Schreiben Sie uns, wir helfen gern.",
    },
    errors: {
      length: "Bitte schreiben Sie zwischen 3 und 300 Zeichen.",
      plain: "Nur einfacher Text, ohne Links.",
      limit: "Sie haben die 3 Änderungen dieser Woche genutzt. Nächste Woche können Sie wieder fragen, oder Sie lehnen das Video ab.",
      busy: "Eine Änderung an diesem Video wird bereits erstellt.",
      notThis: "So lassen sich nur die Videos ändern, die wir für Sie erstellt haben, keine Clips aus Ihren Aufnahmen.",
      unavailable: "Änderungsanfragen sind noch nicht verfügbar. Schreiben Sie uns gern stattdessen.",
    },
  },
  subtitles: { download: "Untertitel herunterladen (.srt)", hint: "Der Sprechertext als Untertiteldatei, für YouTube oder Facebook." },
  retention: { notice: "Ihr Tarif ist am {ended} ausgelaufen. Ihre Videos bleiben bis zum {date} hier zum Ansehen und Herunterladen. Danach werden sie gelöscht." },
  email: {
    subject14: "Ihre DentVideo-Videos werden am {date} gelöscht",
    subject1: "Letzte Erinnerung: Ihre DentVideo-Videos werden morgen gelöscht",
    preheader14: "Ihr Tarif ist ausgelaufen. Laden Sie bis zum {date} die Videos herunter, die Sie behalten möchten.",
    preheader1: "Laden Sie heute die Videos herunter, die Sie behalten möchten.",
    title14: "Ihre Videos bleiben bis zum {date}",
    title1: "Ihre Videos werden morgen gelöscht",
    body14: "Ihr DentVideo-Tarif ist am {ended} ausgelaufen. Nach dem Ende eines Tarifs bewahren wir Ihre Videos 90 Tage auf, damit Sie sie weiter ansehen und herunterladen können. Am {date} löschen wir Ihre Videos, Aufnahmen und Untertiteldateien.",
    body1: "Dies ist die letzte Erinnerung: Morgen, am {date}, löschen wir Ihre Videos, Aufnahmen und Untertiteldateien.",
    keep: "Um sie zu behalten, öffnen Sie Ihre Bibliothek und laden die gewünschten Videos herunter, oder laden Sie alles auf einmal unter Einstellungen → Ihre Daten → „Meine Daten herunterladen“. Wählen Sie vorher wieder einen Tarif, bleibt alles erhalten. Ihre Einstellungen und Ihr Logo bleiben in jedem Fall.",
    button: "Meine Bibliothek öffnen",
    footer: "Sie erhalten diese E-Mail, weil der DentVideo-Tarif Ihrer Praxis ausgelaufen ist. Sie betrifft Ihre Daten und kommt deshalb auch, wenn Sie Erinnerungen abbestellt haben.",
  },
};

const es: RequestsText = {
  topics: {
    title: "Propón un tema para la próxima semana",
    lead: "Una pregunta de un paciente o un tema, en una frase. Usamos primero las propuestas que encajan con tus servicios y pasan las mismas revisiones que cada vídeo.",
    label: "Tu tema",
    placeholder: "Por ejemplo: ¿Cuánto dura la sensibilidad después de un blanqueamiento?",
    submit: "Enviar propuesta",
    sending: "Enviando…",
    sent: "Gracias. Si encaja con tus servicios y pasa las revisiones, aparecerá en una de las próximas semanas.",
    listTitle: "Tus propuestas",
    status: { pending: "Esperando una próxima semana", used: "Creado", refused: "No creado" },
    usedIn: "En la semana del {date}",
    withdraw: "Quitar",
    reasons: {
      not_offered: "No trata de ninguno de los servicios de tus ajustes. Añade el servicio y vuelve a proponerlo.",
      ad_rules: "Pide algo que las normas de publicidad sanitaria restringen, como precios, ofertas, comparaciones o resultados prometidos.",
      clinical: "No pudimos convertirlo en una orientación general y aceptada. Puede que necesite un diagnóstico individual.",
      unclear: "No supimos qué debía responder el vídeo. Prueba a escribirlo como la pregunta de un paciente.",
      checks: "Lo escribimos, pero el guion no pasó nuestras revisiones clínicas y de publicidad.",
    },
    errors: {
      length: "Escribe entre 3 y 140 caracteres.",
      plain: "Solo texto, sin enlaces.",
      adRules: "Toca algo que las normas de publicidad sanitaria restringen (precios, ofertas, resultados prometidos). Prueba con la pregunta de un paciente.",
      tooManyPending: "Ya tienes 5 propuestas en espera. Usaremos esas primero.",
      unavailable: "Las propuestas aún no están disponibles. Escríbenos mientras tanto.",
    },
  },
  change: {
    button: "Pedir un cambio",
    title: "¿Qué debería cambiar?",
    lead: "Describe el cambio en una o dos frases. Solo se vuelve a crear este vídeo, con las mismas revisiones, y lo apruebas de nuevo antes de publicarlo.",
    label: "Tu nota",
    placeholder: "Por ejemplo: Más corto, y que diga que la sensibilidad suele pasar.",
    submit: "Enviar",
    sending: "Enviando…",
    cancel: "Cancelar",
    left: "Cambios disponibles esta semana: {n} de {max}",
    status: {
      queued: "Cambio pedido",
      working: "Haciendo tu cambio",
      done: "Cambiado. Vuelve a verlo antes de aprobarlo.",
      refused: "Sin cambios",
      failed: "Sin cambios",
    },
    reasons: {
      checks: "La versión cambiada no pasó nuestras revisiones, así que tu vídeo actual se queda como está.",
      no_plan: "Para pedir cambios necesitas un plan activo.",
      busy: "Ahora mismo no pudimos hacer el cambio. Tu vídeo actual se mantiene y ya estamos avisados.",
      technical: "Algo falló por nuestra parte. Tu vídeo actual se mantiene y ya estamos avisados.",
      not_possible: "Este vídeo no se puede cambiar así. Escríbenos y te ayudamos.",
    },
    errors: {
      length: "Escribe entre 3 y 300 caracteres.",
      plain: "Solo texto, sin enlaces.",
      limit: "Ya usaste los 3 cambios de esta semana. Puedes pedir otro la semana que viene o descartar el vídeo.",
      busy: "Ya se está haciendo un cambio en este vídeo.",
      notThis: "Así solo se pueden cambiar los vídeos que creamos para ti, no los clips de tus grabaciones.",
      unavailable: "Los cambios aún no están disponibles. Escríbenos mientras tanto.",
    },
  },
  subtitles: { download: "Descargar subtítulos (.srt)", hint: "La narración como archivo de subtítulos, para YouTube o Facebook." },
  retention: { notice: "Tu plan terminó el {ended}. Tus vídeos siguen aquí para verlos y descargarlos hasta el {date}. Después se borran." },
  email: {
    subject14: "Tus vídeos de DentVideo se borrarán el {date}",
    subject1: "Último aviso: tus vídeos de DentVideo se borran mañana",
    preheader14: "Tu plan ha terminado. Descarga antes del {date} los vídeos que quieras conservar.",
    preheader1: "Descarga hoy los vídeos que quieras conservar.",
    title14: "Tus vídeos se conservan hasta el {date}",
    title1: "Tus vídeos se borran mañana",
    body14: "Tu plan de DentVideo terminó el {ended}. Conservamos tus vídeos 90 días después de que termine un plan, para que puedas seguir viéndolos y descargándolos. El {date} borraremos tus vídeos, grabaciones y archivos de subtítulos.",
    body1: "Este es el último aviso: mañana, {date}, borraremos tus vídeos, grabaciones y archivos de subtítulos.",
    keep: "Para conservarlos, abre tu biblioteca y descarga los vídeos que quieras, o descárgalo todo de una vez en Ajustes → Tus datos → «Descargar mis datos». Si vuelves a elegir un plan antes, se conserva todo. Tus ajustes y tu logo se mantienen en cualquier caso.",
    button: "Abrir mi biblioteca",
    footer: "Recibes este correo porque el plan de DentVideo de tu clínica ha terminado. Trata sobre tus datos, así que se envía aunque te hayas dado de baja de los recordatorios.",
  },
};

const tr: RequestsText = {
  topics: {
    title: "Gelecek hafta için konu önerin",
    lead: "Bir hasta sorusu ya da bir konu, tek cümleyle. Önerileri, hizmetlerinize uyduğunda ve her video gibi aynı kontrollerden geçtiğinde önce kullanırız.",
    label: "Konunuz",
    placeholder: "Örneğin: Beyazlatmadan sonra hassasiyet ne kadar sürer?",
    submit: "Öneriyi gönder",
    sending: "Gönderiliyor…",
    sent: "Teşekkürler. Hizmetlerinize uyar ve kontrollerden geçerse önümüzdeki haftalardan birinde hazırlanır.",
    listTitle: "Önerileriniz",
    status: { pending: "Önümüzdeki haftalardan birini bekliyor", used: "Hazırlandı", refused: "Hazırlanmadı" },
    usedIn: "{date} haftasında",
    withdraw: "Kaldır",
    reasons: {
      not_offered: "Ayarlarınızdaki hizmetlerden biriyle ilgili değil. Hizmeti ekleyip yeniden önerin.",
      ad_rules: "Sağlık reklamı kurallarının kısıtladığı bir şey istiyor; örneğin fiyat, kampanya, karşılaştırma ya da vaat edilen sonuç.",
      clinical: "Bunu genel ve yerleşik bir bilgilendirmeye dönüştüremedik. Kişiye özel muayene gerektirebilir.",
      unclear: "Videonun neyi yanıtlaması gerektiğini anlayamadık. Bir hasta sorusu olarak yazmayı deneyin.",
      checks: "Hazırladık, ancak metin klinik ve reklam kontrollerimizden geçmedi.",
    },
    errors: {
      length: "Lütfen 3 ile 140 karakter arasında yazın.",
      plain: "Yalnızca düz metin, bağlantı olmadan.",
      adRules: "Bu, sağlık reklamı kurallarının kısıtladığı bir konuya değiniyor (fiyat, kampanya, vaat edilen sonuç). Bunun yerine bir hasta sorusu deneyin.",
      tooManyPending: "Bekleyen 5 öneriniz var. Önce onları kullanacağız.",
      unavailable: "Öneriler henüz kullanılamıyor. Bunun yerine bize yazabilirsiniz.",
    },
  },
  change: {
    button: "Değişiklik iste",
    title: "Neyin farklı olmasını istersiniz?",
    lead: "Değişikliği bir iki cümleyle anlatın. Yalnızca bu video aynı kontrollerle yeniden hazırlanır ve paylaşmadan önce yeniden onaylarsınız.",
    label: "Notunuz",
    placeholder: "Örneğin: Daha kısa olsun ve hassasiyetin genellikle geçtiğini söylesin.",
    submit: "Gönder",
    sending: "Gönderiliyor…",
    cancel: "Vazgeç",
    left: "Bu hafta kalan değişiklik: {n}/{max}",
    status: {
      queued: "Değişiklik istendi",
      working: "Değişikliğiniz hazırlanıyor",
      done: "Değiştirildi. Onaylamadan önce lütfen yeniden izleyin.",
      refused: "Değiştirilmedi",
      failed: "Değiştirilmedi",
    },
    reasons: {
      checks: "Değiştirilmiş sürüm kontrollerimizden geçmedi; bu yüzden mevcut videonuz olduğu gibi kalıyor.",
      no_plan: "Değişiklik için aktif bir plan gerekir.",
      busy: "Değişikliği şu anda yapamadık. Mevcut videonuz duruyor ve bizim haberimiz var.",
      technical: "Bizim tarafımızda bir sorun oldu. Mevcut videonuz duruyor ve bizim haberimiz var.",
      not_possible: "Bu video bu şekilde değiştirilemiyor. Bize yazın, yardımcı olalım.",
    },
    errors: {
      length: "Lütfen 3 ile 300 karakter arasında yazın.",
      plain: "Yalnızca düz metin, bağlantı olmadan.",
      limit: "Bu haftaki 3 değişiklik hakkınızı kullandınız. Gelecek hafta yeniden isteyebilir ya da videoyu reddedebilirsiniz.",
      busy: "Bu videoda zaten bir değişiklik hazırlanıyor.",
      notThis: "Bu şekilde yalnızca sizin için hazırladığımız videolar değiştirilebilir, kendi kayıtlarınızdan çıkan klipler değil.",
      unavailable: "Değişiklik istekleri henüz kullanılamıyor. Bunun yerine bize yazabilirsiniz.",
    },
  },
  subtitles: { download: "Altyazıyı indir (.srt)", hint: "Seslendirme metni altyazı dosyası olarak; YouTube veya Facebook için." },
  retention: { notice: "Planınız {ended} tarihinde sona erdi. Videolarınız {date} tarihine kadar burada; izleyebilir ve indirebilirsiniz. Sonrasında silinir." },
  email: {
    subject14: "DentVideo videolarınız {date} tarihinde silinecek",
    subject1: "Son hatırlatma: DentVideo videolarınız yarın silinecek",
    preheader14: "Planınız sona erdi. Saklamak istediğiniz videoları {date} tarihinden önce indirin.",
    preheader1: "Saklamak istediğiniz videoları bugün indirin.",
    title14: "Videolarınız {date} tarihine kadar saklanıyor",
    title1: "Videolarınız yarın silinecek",
    body14: "DentVideo planınız {ended} tarihinde sona erdi. Bir plan sona erdikten sonra videolarınızı 90 gün saklarız; bu sürede izleyip indirebilirsiniz. {date} tarihinde videolarınızı, kayıtlarınızı ve altyazı dosyalarınızı sileceğiz.",
    body1: "Bu son hatırlatmadır: yarın, {date} tarihinde videolarınızı, kayıtlarınızı ve altyazı dosyalarınızı sileceğiz.",
    keep: "Saklamak için kütüphanenizi açıp istediğiniz videoları indirin ya da her şeyi tek seferde Ayarlar → Verileriniz → “Verilerimi indir” bölümünden indirin. Bu tarihten önce yeniden bir plan seçerseniz her şey yerinde kalır. Ayarlarınız ve logonuz her durumda korunur.",
    button: "Kütüphanemi aç",
    footer: "Bu e-postayı kliniğinizin DentVideo planı sona erdiği için alıyorsunuz. Verilerinizle ilgili olduğundan, hatırlatma e-postalarından çıkmış olsanız da gönderilir.",
  },
};

const fr: RequestsText = {
  topics: {
    title: "Proposer un sujet pour la semaine prochaine",
    lead: "Une question de patient ou un sujet, en une phrase. Nous utilisons d'abord les propositions qui correspondent à vos soins et passent les mêmes vérifications que chaque vidéo.",
    label: "Votre sujet",
    placeholder: "Par exemple : Combien de temps dure la sensibilité après un blanchiment ?",
    submit: "Envoyer la proposition",
    sending: "Envoi…",
    sent: "Merci. S'il correspond à vos soins et passe les vérifications, il figurera dans une prochaine semaine.",
    listTitle: "Vos propositions",
    status: { pending: "En attente d'une prochaine semaine", used: "Réalisé", refused: "Non réalisé" },
    usedIn: "Semaine du {date}",
    withdraw: "Retirer",
    reasons: {
      not_offered: "Il ne concerne aucun des soins de vos réglages. Ajoutez le soin, puis proposez-le à nouveau.",
      ad_rules: "Il demande quelque chose que les règles de publicité en santé restreignent, comme des prix, des offres, des comparaisons ou des résultats promis.",
      clinical: "Nous n'avons pas pu en faire un conseil général et reconnu. Il nécessite peut-être un diagnostic individuel.",
      unclear: "Nous n'avons pas compris à quoi la vidéo devait répondre. Essayez de l'écrire comme la question d'un patient.",
      checks: "Nous l'avons rédigé, mais le script n'a pas passé nos vérifications cliniques et publicitaires.",
    },
    errors: {
      length: "Écrivez entre 3 et 140 caractères.",
      plain: "Texte simple uniquement, sans lien.",
      adRules: "Cela touche à ce que les règles de publicité en santé restreignent (prix, offres, résultats promis). Essayez plutôt une question de patient.",
      tooManyPending: "Vous avez déjà 5 propositions en attente. Nous les utiliserons d'abord.",
      unavailable: "Les propositions ne sont pas encore disponibles. Écrivez-nous en attendant.",
    },
  },
  change: {
    button: "Demander une modification",
    title: "Que faut-il changer ?",
    lead: "Décrivez la modification en une ou deux phrases. Seule cette vidéo est refaite, avec les mêmes vérifications, et vous la validez à nouveau avant de la publier.",
    label: "Votre note",
    placeholder: "Par exemple : Plus courte, et dire que la sensibilité passe en général.",
    submit: "Envoyer",
    sending: "Envoi…",
    cancel: "Annuler",
    left: "Modifications restantes cette semaine : {n} sur {max}",
    status: {
      queued: "Modification demandée",
      working: "Modification en cours",
      done: "Modifiée. Regardez-la à nouveau avant de la valider.",
      refused: "Non modifiée",
      failed: "Non modifiée",
    },
    reasons: {
      checks: "La version modifiée n'a pas passé nos vérifications : votre vidéo actuelle reste telle quelle.",
      no_plan: "Les modifications nécessitent une formule active.",
      busy: "Nous n'avons pas pu faire la modification pour l'instant. Votre vidéo actuelle reste, et nous sommes prévenus.",
      technical: "Un problème est survenu de notre côté. Votre vidéo actuelle reste, et nous sommes prévenus.",
      not_possible: "Cette vidéo ne peut pas être modifiée ainsi. Écrivez-nous, nous vous aiderons.",
    },
    errors: {
      length: "Écrivez entre 3 et 300 caractères.",
      plain: "Texte simple uniquement, sans lien.",
      limit: "Vous avez utilisé les 3 modifications de la semaine. Vous pourrez en demander d'autres la semaine prochaine, ou refuser la vidéo.",
      busy: "Une modification de cette vidéo est déjà en cours.",
      notThis: "Seules les vidéos que nous avons créées pour vous peuvent être modifiées ainsi, pas les extraits de vos enregistrements.",
      unavailable: "Les demandes de modification ne sont pas encore disponibles. Écrivez-nous en attendant.",
    },
  },
  subtitles: { download: "Télécharger les sous-titres (.srt)", hint: "La voix off en fichier de sous-titres, pour YouTube ou Facebook." },
  retention: { notice: "Votre formule a pris fin le {ended}. Vos vidéos restent ici, à regarder et à télécharger, jusqu'au {date}. Elles seront ensuite supprimées." },
  email: {
    subject14: "Vos vidéos DentVideo seront supprimées le {date}",
    subject1: "Dernier rappel : vos vidéos DentVideo seront supprimées demain",
    preheader14: "Votre formule a pris fin. Téléchargez avant le {date} les vidéos que vous voulez garder.",
    preheader1: "Téléchargez dès aujourd'hui les vidéos que vous voulez garder.",
    title14: "Vos vidéos sont conservées jusqu'au {date}",
    title1: "Vos vidéos seront supprimées demain",
    body14: "Votre formule DentVideo a pris fin le {ended}. Nous conservons vos vidéos 90 jours après la fin d'une formule, pour que vous puissiez encore les regarder et les télécharger. Le {date}, nous supprimerons vos vidéos, enregistrements et fichiers de sous-titres.",
    body1: "Ceci est le dernier rappel : demain, le {date}, nous supprimerons vos vidéos, enregistrements et fichiers de sous-titres.",
    keep: "Pour les garder, ouvrez votre bibliothèque et téléchargez les vidéos voulues, ou téléchargez tout en une fois dans Réglages → Vos données → « Télécharger mes données ». Si vous reprenez une formule avant cette date, tout est conservé. Vos réglages et votre logo sont gardés dans tous les cas.",
    button: "Ouvrir ma bibliothèque",
    footer: "Vous recevez cet e-mail parce que la formule DentVideo de votre cabinet a pris fin. Il concerne vos données : il est donc envoyé même si vous vous êtes désabonné des rappels.",
  },
};

const ja: RequestsText = {
  topics: {
    title: "来週のテーマを提案する",
    lead: "患者さんの質問やテーマを一文でお書きください。登録された診療内容に合い、すべての動画と同じチェックを通ったものから優先して使います。",
    label: "テーマ",
    placeholder: "例：ホワイトニング後のしみる感じはどのくらい続きますか？",
    submit: "提案を送る",
    sending: "送信中…",
    sent: "ありがとうございます。診療内容に合い、チェックを通れば、今後の週のいずれかで制作します。",
    listTitle: "これまでのご提案",
    status: { pending: "今後の週を待っています", used: "制作済み", refused: "制作しませんでした" },
    usedIn: "{date}の週",
    withdraw: "取り消す",
    reasons: {
      not_offered: "設定にある診療内容のどれにも当てはまりません。診療内容を追加してから、もう一度ご提案ください。",
      ad_rules: "料金、キャンペーン、他院との比較、効果の約束など、医療広告のルールで制限される内容が含まれています。",
      clinical: "一般的で標準的な情報としてまとめられませんでした。個別の診断が必要な内容かもしれません。",
      unclear: "動画で何に答えればよいか分かりませんでした。患者さんの質問の形で書いてみてください。",
      checks: "原稿は作成しましたが、医学的な正確さと広告ルールのチェックを通りませんでした。",
    },
    errors: {
      length: "3〜140文字でお書きください。",
      plain: "リンクを含まない文字だけでお書きください。",
      adRules: "医療広告のルールで制限される内容（料金、キャンペーン、効果の約束）に触れています。患者さんの質問の形でお試しください。",
      tooManyPending: "すでに5件のご提案が待機中です。そちらを先に使います。",
      unavailable: "テーマのご提案はまだご利用いただけません。お手数ですがメールでお知らせください。",
    },
  },
  change: {
    button: "修正を依頼する",
    title: "どこを変えればよいですか？",
    lead: "変更してほしい点を1〜2文でお書きください。この動画だけを同じチェックを通して作り直し、投稿前にもう一度ご承認いただきます。",
    label: "メモ",
    placeholder: "例：もっと短く、しみる感じはたいてい治まると伝えてください。",
    submit: "送る",
    sending: "送信中…",
    cancel: "キャンセル",
    left: "今週の残りの修正依頼：{max}回中{n}回",
    status: {
      queued: "修正を依頼済み",
      working: "修正を作成中",
      done: "修正しました。承認の前にもう一度ご確認ください。",
      refused: "修正していません",
      failed: "修正していません",
    },
    reasons: {
      checks: "修正版がチェックを通らなかったため、現在の動画をそのまま残しています。",
      no_plan: "修正の依頼には有効なプランが必要です。",
      busy: "現在、修正を作成できませんでした。現在の動画はそのまま残り、担当者にも連絡が届いています。",
      technical: "こちら側で問題が発生しました。現在の動画はそのまま残り、担当者にも連絡が届いています。",
      not_possible: "この動画はこの方法では修正できません。メールでご連絡いただければお手伝いします。",
    },
    errors: {
      length: "3〜300文字でお書きください。",
      plain: "リンクを含まない文字だけでお書きください。",
      limit: "今週の修正依頼（3回）をすべて使いました。来週あらためてご依頼いただくか、動画を見送ってください。",
      busy: "この動画はすでに修正を作成中です。",
      notThis: "この方法で修正できるのは当社が制作した動画だけで、ご自身の撮影から作ったクリップは対象外です。",
      unavailable: "修正の依頼はまだご利用いただけません。お手数ですがメールでお知らせください。",
    },
  },
  subtitles: { download: "字幕をダウンロード（.srt）", hint: "ナレーションの字幕ファイルです。YouTubeやFacebookにお使いください。" },
  retention: { notice: "プランは{ended}に終了しました。動画は{date}までここで視聴・ダウンロードできます。その後、削除されます。" },
  email: {
    subject14: "DentVideoの動画は{date}に削除されます",
    subject1: "最終のお知らせ：DentVideoの動画は明日削除されます",
    preheader14: "プランが終了しました。残しておきたい動画は{date}までにダウンロードしてください。",
    preheader1: "残しておきたい動画は本日中にダウンロードしてください。",
    title14: "動画は{date}まで保管されます",
    title1: "動画は明日削除されます",
    body14: "DentVideoのプランは{ended}に終了しました。プラン終了後も90日間は動画を保管しており、その間は視聴とダウンロードができます。{date}に動画、撮影映像、字幕ファイルを削除します。",
    body1: "最終のお知らせです。明日（{date}）、動画、撮影映像、字幕ファイルを削除します。",
    keep: "残しておくには、ライブラリを開いて必要な動画をダウンロードするか、設定 → データの管理 →「データをダウンロード」からまとめてダウンロードしてください。それまでに再度プランを選択された場合は、すべてそのまま残ります。設定とロゴはどちらの場合も残ります。",
    button: "ライブラリを開く",
    footer: "医院のDentVideoプランが終了したため、このメールをお送りしています。お客様のデータに関するお知らせのため、リマインダーの配信を停止されている場合もお送りします。",
  },
};

const ar: RequestsText = {
  topics: {
    title: "اقترحوا موضوعاً للأسبوع القادم",
    lead: "سؤال من مريض أو موضوع، في جملة واحدة. نستخدم الاقتراحات أولاً متى ناسبت خدماتكم واجتازت المراجعات نفسها التي يمرّ بها كل فيديو.",
    label: "موضوعكم",
    placeholder: "مثلاً: كم تستمر الحساسية بعد تبييض الأسنان؟",
    submit: "إرسال الاقتراح",
    sending: "جارٍ الإرسال…",
    sent: "شكراً لكم. إذا ناسب خدماتكم واجتاز المراجعات، فسيكون في أحد الأسابيع القادمة.",
    listTitle: "اقتراحاتكم",
    status: { pending: "بانتظار أحد الأسابيع القادمة", used: "أُعِدّ", refused: "لم يُعَدّ" },
    usedIn: "في أسبوع {date}",
    withdraw: "إزالة",
    reasons: {
      not_offered: "لا يتعلق بأيٍّ من الخدمات المسجّلة في إعداداتكم. أضيفوا الخدمة ثم اقترحوه من جديد.",
      ad_rules: "يطلب شيئاً تقيّده قواعد الإعلان الصحي، مثل الأسعار أو العروض أو المقارنات أو النتائج الموعودة.",
      clinical: "لم نتمكن من تحويله إلى إرشاد عام ومعتمد. قد يحتاج إلى تشخيص فردي.",
      unclear: "لم نتبيّن ما الذي ينبغي أن يجيب عنه الفيديو. جرّبوا كتابته على هيئة سؤال من مريض.",
      checks: "كتبناه، لكن النص لم يجتز مراجعاتنا السريرية والإعلانية.",
    },
    errors: {
      length: "يُرجى كتابة ما بين 3 و140 حرفاً.",
      plain: "نص عادي فقط، من دون روابط.",
      adRules: "يتناول هذا ما تقيّده قواعد الإعلان الصحي (الأسعار، العروض، النتائج الموعودة). جرّبوا سؤالاً من مريض بدلاً من ذلك.",
      tooManyPending: "لديكم 5 اقتراحات بالانتظار. سنستخدمها أولاً.",
      unavailable: "الاقتراحات غير متاحة بعد. يمكنكم مراسلتنا بدلاً من ذلك.",
    },
  },
  change: {
    button: "طلب تعديل",
    title: "ما الذي ينبغي تغييره؟",
    lead: "صفوا التعديل في جملة أو جملتين. يُعاد إعداد هذا الفيديو وحده، مع المراجعات نفسها، وتعتمدونه من جديد قبل النشر.",
    label: "ملاحظتكم",
    placeholder: "مثلاً: أقصر، وأن يذكر أن الحساسية تزول عادةً.",
    submit: "إرسال",
    sending: "جارٍ الإرسال…",
    cancel: "إلغاء",
    left: "التعديلات المتبقية هذا الأسبوع: {n} من {max}",
    status: {
      queued: "طُلب التعديل",
      working: "جارٍ إعداد التعديل",
      done: "عُدِّل. يُرجى مشاهدته من جديد قبل اعتماده.",
      refused: "لم يُعدَّل",
      failed: "لم يُعدَّل",
    },
    reasons: {
      checks: "لم تجتز النسخة المعدّلة مراجعاتنا، لذا يبقى الفيديو الحالي كما هو.",
      no_plan: "تحتاج التعديلات إلى باقة فعّالة.",
      busy: "لم نتمكن من إجراء التعديل الآن. يبقى الفيديو الحالي، وقد أُبلغنا بالأمر.",
      technical: "حدث خطأ من جهتنا. يبقى الفيديو الحالي، وقد أُبلغنا بالأمر.",
      not_possible: "لا يمكن تعديل هذا الفيديو بهذه الطريقة. راسلونا وسنساعدكم.",
    },
    errors: {
      length: "يُرجى كتابة ما بين 3 و300 حرف.",
      plain: "نص عادي فقط، من دون روابط.",
      limit: "استخدمتم الحد الأسبوعي للتعديلات (3 تعديلات). يمكنكم الطلب من جديد الأسبوع القادم، أو رفض الفيديو.",
      busy: "يجري الآن إعداد تعديل على هذا الفيديو.",
      notThis: "لا يمكن بهذه الطريقة تعديل إلا الفيديوهات التي أعددناها لكم، وليس المقاطع المأخوذة من تسجيلاتكم.",
      unavailable: "طلبات التعديل غير متاحة بعد. يمكنكم مراسلتنا بدلاً من ذلك.",
    },
  },
  subtitles: { download: "تنزيل الترجمة النصية (.srt)", hint: "نص التعليق الصوتي كملف ترجمة نصية، ليوتيوب أو فيسبوك." },
  retention: { notice: "انتهت باقتكم في {ended}. تبقى فيديوهاتكم هنا للمشاهدة والتنزيل حتى {date}، ثم تُحذف." },
  email: {
    subject14: "ستُحذف فيديوهاتكم في DentVideo بتاريخ {date}",
    subject1: "تذكير أخير: ستُحذف فيديوهاتكم في DentVideo غداً",
    preheader14: "انتهت باقتكم. نزّلوا الفيديوهات التي تريدون الاحتفاظ بها قبل {date}.",
    preheader1: "نزّلوا اليوم الفيديوهات التي تريدون الاحتفاظ بها.",
    title14: "فيديوهاتكم محفوظة حتى {date}",
    title1: "ستُحذف فيديوهاتكم غداً",
    body14: "انتهت باقة DentVideo الخاصة بكم في {ended}. نحتفظ بفيديوهاتكم 90 يوماً بعد انتهاء الباقة لتتمكنوا من مشاهدتها وتنزيلها. وفي {date} سنحذف فيديوهاتكم وتسجيلاتكم وملفات الترجمة النصية.",
    body1: "هذا هو التذكير الأخير: غداً، {date}، سنحذف فيديوهاتكم وتسجيلاتكم وملفات الترجمة النصية.",
    keep: "للاحتفاظ بها، افتحوا مكتبتكم ونزّلوا الفيديوهات التي تريدونها، أو نزّلوا كل شيء دفعة واحدة من الإعدادات ← بياناتكم ← «تنزيل بياناتي». وإذا اخترتم باقة من جديد قبل ذلك، يبقى كل شيء كما هو. وتبقى إعداداتكم وشعاركم محفوظة في جميع الأحوال.",
    button: "فتح مكتبتي",
    footer: "تصلكم هذه الرسالة لأن باقة DentVideo الخاصة بعيادتكم انتهت. وهي تتعلق ببياناتكم، لذا تُرسل حتى لو ألغيتم الاشتراك في رسائل التذكير.",
  },
};

const pl: RequestsText = {
  topics: {
    title: "Zaproponuj temat na przyszły tydzień",
    lead: "Pytanie pacjenta albo temat, w jednym zdaniu. Propozycje wykorzystujemy w pierwszej kolejności, jeśli pasują do zabiegów gabinetu i przechodzą te same kontrole co każdy film.",
    label: "Temat",
    placeholder: "Na przykład: Jak długo utrzymuje się nadwrażliwość po wybielaniu?",
    submit: "Wyślij propozycję",
    sending: "Wysyłanie…",
    sent: "Dziękujemy. Jeśli pasuje do Państwa zabiegów i przejdzie kontrole, pojawi się w jednym z najbliższych tygodni.",
    listTitle: "Państwa propozycje",
    status: { pending: "Czeka na jeden z najbliższych tygodni", used: "Przygotowany", refused: "Nieprzygotowany" },
    usedIn: "W tygodniu od {date}",
    withdraw: "Usuń",
    reasons: {
      not_offered: "Nie dotyczy żadnego z zabiegów w ustawieniach. Prosimy dodać zabieg i zaproponować temat ponownie.",
      ad_rules: "Dotyczy czegoś, co ograniczają zasady reklamy usług medycznych, np. cen, promocji, porównań lub obiecanych efektów.",
      clinical: "Nie udało się z tego zrobić ogólnej, uznanej informacji. Może to wymagać indywidualnej diagnozy.",
      unclear: "Nie wiemy, na co film miałby odpowiadać. Warto zapisać to jako pytanie pacjenta.",
      checks: "Przygotowaliśmy go, ale scenariusz nie przeszedł naszych kontroli klinicznych i reklamowych.",
    },
    errors: {
      length: "Prosimy wpisać od 3 do 140 znaków.",
      plain: "Tylko zwykły tekst, bez linków.",
      adRules: "To dotyczy czegoś, co ograniczają zasady reklamy usług medycznych (ceny, promocje, obiecane efekty). Warto spróbować pytania pacjenta.",
      tooManyPending: "Czeka już 5 Państwa propozycji. Najpierw wykorzystamy te.",
      unavailable: "Propozycje nie są jeszcze dostępne. Prosimy napisać do nas.",
    },
  },
  change: {
    button: "Poproś o zmianę",
    title: "Co powinno wyglądać inaczej?",
    lead: "Prosimy opisać zmianę w jednym lub dwóch zdaniach. Ponownie powstaje tylko ten film, z tymi samymi kontrolami, i przed publikacją trzeba go znów zatwierdzić.",
    label: "Notatka",
    placeholder: "Na przykład: Krótszy, z informacją, że nadwrażliwość zwykle mija.",
    submit: "Wyślij",
    sending: "Wysyłanie…",
    cancel: "Anuluj",
    left: "Pozostałe zmiany w tym tygodniu: {n} z {max}",
    status: {
      queued: "Zmiana zgłoszona",
      working: "Zmiana w przygotowaniu",
      done: "Zmieniony. Prosimy obejrzeć go ponownie przed zatwierdzeniem.",
      refused: "Bez zmian",
      failed: "Bez zmian",
    },
    reasons: {
      checks: "Zmieniona wersja nie przeszła naszych kontroli, dlatego obecny film zostaje bez zmian.",
      no_plan: "Zmiany wymagają aktywnego planu.",
      busy: "Nie udało się teraz wprowadzić zmiany. Obecny film zostaje, a my już o tym wiemy.",
      technical: "Po naszej stronie coś poszło nie tak. Obecny film zostaje, a my już o tym wiemy.",
      not_possible: "Tego filmu nie można zmienić w ten sposób. Prosimy napisać do nas, pomożemy.",
    },
    errors: {
      length: "Prosimy wpisać od 3 do 300 znaków.",
      plain: "Tylko zwykły tekst, bez linków.",
      limit: "Wykorzystali Państwo 3 zmiany w tym tygodniu. Można poprosić ponownie w przyszłym tygodniu albo odrzucić film.",
      busy: "Zmiana tego filmu jest już w przygotowaniu.",
      notThis: "W ten sposób można zmieniać tylko filmy przygotowane przez nas, nie klipy z Państwa nagrań.",
      unavailable: "Prośby o zmianę nie są jeszcze dostępne. Prosimy napisać do nas.",
    },
  },
  subtitles: { download: "Pobierz napisy (.srt)", hint: "Tekst lektora jako plik z napisami, do YouTube lub Facebooka." },
  retention: { notice: "Plan zakończył się {ended}. Filmy są tu do obejrzenia i pobrania do {date}. Potem zostaną usunięte." },
  email: {
    subject14: "Państwa filmy DentVideo zostaną usunięte {date}",
    subject1: "Ostatnie przypomnienie: Państwa filmy DentVideo zostaną jutro usunięte",
    preheader14: "Plan się zakończył. Prosimy pobrać filmy, które chcą Państwo zachować, przed {date}.",
    preheader1: "Prosimy jeszcze dziś pobrać filmy, które chcą Państwo zachować.",
    title14: "Filmy są przechowywane do {date}",
    title1: "Filmy zostaną jutro usunięte",
    body14: "Plan DentVideo zakończył się {ended}. Po zakończeniu planu przechowujemy filmy przez 90 dni, aby można je było nadal oglądać i pobierać. {date} usuniemy filmy, nagrania i pliki z napisami.",
    body1: "To ostatnie przypomnienie: jutro, {date}, usuniemy filmy, nagrania i pliki z napisami.",
    keep: "Aby je zachować, prosimy otworzyć bibliotekę i pobrać wybrane filmy albo pobrać wszystko naraz w Ustawienia → Państwa dane → „Pobierz moje dane”. Jeśli wcześniej ponownie wybiorą Państwo plan, wszystko zostaje. Ustawienia i logo zostają w każdym przypadku.",
    button: "Otwórz bibliotekę",
    footer: "Otrzymują Państwo tę wiadomość, ponieważ plan DentVideo gabinetu się zakończył. Dotyczy ona Państwa danych, dlatego wysyłamy ją także po rezygnacji z przypomnień.",
  },
};

export const REQUESTS_TEXT: Record<Locale, RequestsText> = { en, de, es, tr, fr, ja, ar, pl };

export function requestsText(locale: string | null | undefined): RequestsText {
  return REQUESTS_TEXT[(locale ?? "en") as Locale] ?? en;
}

/** {name} placeholders. */
export function fillRequests(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
