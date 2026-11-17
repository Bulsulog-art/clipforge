import type { Locale } from "./dentvideo";

/**
 * Words for "from Monday's video to a posted Reel": the one-tap save + copy,
 * the Instagram and TikTok / Shorts texts, the suggested posting days, the
 * synced "posted" ticks, the email's per-video "approve & share" link and the
 * page it opens. Every locale written natively; `{slot}`, `{n}`, `{total}`
 * are filled in by fmt().
 */
export type PostingText = {
  saveAndCopy: string;
  approveSaveCopy: string;
  downloadAndCopy: string;
  sharedHint: string;
  downloadedHint: string;
  instagram: string;
  short: string;
  copy: string;
  copied: string;
  suggested: string;
  syncedNote: string;
  nextVideo: string;
  page: {
    metaTitle: string;
    title: string;
    pendingLead: string;
    approvedLead: string;
    approvedNote: string;
    openApp: string;
    invalidTitle: string;
    invalidBody: string;
    nothingTitle: string;
    nothingBody: string;
    approveFailed: string;
  };
  email: {
    approveShare: string;
    share: string;
    lookInApp: string;
    postOn: string;
    heading: string;
  };
};

const en: PostingText = {
  saveAndCopy: "Save video + copy caption",
  approveSaveCopy: "Approve, save video + copy caption",
  downloadAndCopy: "Download video + copy caption",
  sharedHint: "Caption copied. In Instagram tap +, choose Reel, pick the video and paste.",
  downloadedHint: "Video downloaded and caption copied — upload it and paste the caption.",
  instagram: "Instagram",
  short: "TikTok · Shorts",
  copy: "Copy",
  copied: "Copied",
  suggested: "Best time: {slot}",
  syncedNote: "Saved to your account — the same on every device.",
  nextVideo: "Next video",
  page: {
    metaTitle: "Ready to post",
    title: "Ready to post",
    pendingLead: "Watch it, then approve and share it in one tap.",
    approvedLead: "Approved. Save it to your phone and post it with the caption below.",
    approvedNote: "Nothing is published until you post it yourself.",
    openApp: "See all of this week's videos",
    invalidTitle: "This link has expired",
    invalidBody: "Links in the email work for {days} days. Open the app to see your videos.",
    nothingTitle: "This video can't be shared from here",
    nothingBody: "It needs a quick look first, or it was declined. Open the app to see it.",
    approveFailed: "That didn't save. Check your connection and try again.",
  },
  email: {
    approveShare: "Approve & share",
    share: "Save & share",
    lookInApp: "Check it in the app",
    postOn: "Post {slot}",
    heading: "This week's videos, with their captions",
  },
};

const de: PostingText = {
  saveAndCopy: "Video sichern + Text kopieren",
  approveSaveCopy: "Freigeben, Video sichern + Text kopieren",
  downloadAndCopy: "Video laden + Text kopieren",
  sharedHint: "Text kopiert. In Instagram auf + tippen, Reel wählen, Video auswählen und Text einfügen.",
  downloadedHint: "Video geladen und Text kopiert – hochladen und den Text einfügen.",
  instagram: "Instagram",
  short: "TikTok · Shorts",
  copy: "Kopieren",
  copied: "Kopiert",
  suggested: "Beste Zeit: {slot}",
  syncedNote: "In Ihrem Konto gespeichert – auf jedem Gerät gleich.",
  nextVideo: "Nächstes Video",
  page: {
    metaTitle: "Bereit zum Posten",
    title: "Bereit zum Posten",
    pendingLead: "Ansehen, dann mit einem Tippen freigeben und teilen.",
    approvedLead: "Freigegeben. Sichern Sie es auf dem Handy und posten Sie es mit dem Text unten.",
    approvedNote: "Veröffentlicht wird nichts, bis Sie es selbst posten.",
    openApp: "Alle Videos dieser Woche ansehen",
    invalidTitle: "Dieser Link ist abgelaufen",
    invalidBody: "Links aus der E-Mail gelten {days} Tage. Öffnen Sie die App, um Ihre Videos zu sehen.",
    nothingTitle: "Dieses Video lässt sich hier nicht teilen",
    nothingBody: "Es braucht erst einen kurzen Blick oder wurde abgelehnt. Öffnen Sie es in der App.",
    approveFailed: "Das wurde nicht gespeichert. Prüfen Sie die Verbindung und versuchen Sie es noch einmal.",
  },
  email: {
    approveShare: "Freigeben & teilen",
    share: "Sichern & teilen",
    lookInApp: "In der App prüfen",
    postOn: "Posten: {slot}",
    heading: "Die Videos dieser Woche, mit Text",
  },
};

const es: PostingText = {
  saveAndCopy: "Guardar vídeo + copiar texto",
  approveSaveCopy: "Aprobar, guardar vídeo + copiar texto",
  downloadAndCopy: "Descargar vídeo + copiar texto",
  sharedHint: "Texto copiado. En Instagram toca +, elige Reel, selecciona el vídeo y pega el texto.",
  downloadedHint: "Vídeo descargado y texto copiado: súbelo y pega el texto.",
  instagram: "Instagram",
  short: "TikTok · Shorts",
  copy: "Copiar",
  copied: "Copiado",
  suggested: "Mejor momento: {slot}",
  syncedNote: "Guardado en tu cuenta: igual en todos tus dispositivos.",
  nextVideo: "Siguiente vídeo",
  page: {
    metaTitle: "Listo para publicar",
    title: "Listo para publicar",
    pendingLead: "Míralo y apruébalo y compártelo con un solo toque.",
    approvedLead: "Aprobado. Guárdalo en el móvil y publícalo con el texto de abajo.",
    approvedNote: "No se publica nada hasta que lo publiques tú.",
    openApp: "Ver todos los vídeos de esta semana",
    invalidTitle: "Este enlace ha caducado",
    invalidBody: "Los enlaces del correo funcionan {days} días. Abre la app para ver tus vídeos.",
    nothingTitle: "Este vídeo no se puede compartir desde aquí",
    nothingBody: "Necesita un vistazo antes o fue rechazado. Ábrelo en la app.",
    approveFailed: "No se ha guardado. Revisa la conexión e inténtalo de nuevo.",
  },
  email: {
    approveShare: "Aprobar y compartir",
    share: "Guardar y compartir",
    lookInApp: "Revisarlo en la app",
    postOn: "Publicar: {slot}",
    heading: "Los vídeos de esta semana, con su texto",
  },
};

const fr: PostingText = {
  saveAndCopy: "Enregistrer la vidéo + copier le texte",
  approveSaveCopy: "Valider, enregistrer + copier le texte",
  downloadAndCopy: "Télécharger la vidéo + copier le texte",
  sharedHint: "Texte copié. Dans Instagram, touchez +, choisissez Reel, la vidéo, puis collez le texte.",
  downloadedHint: "Vidéo téléchargée et texte copié : publiez-la et collez le texte.",
  instagram: "Instagram",
  short: "TikTok · Shorts",
  copy: "Copier",
  copied: "Copié",
  suggested: "Meilleur moment : {slot}",
  syncedNote: "Enregistré dans votre compte, identique sur tous vos appareils.",
  nextVideo: "Vidéo suivante",
  page: {
    metaTitle: "Prête à publier",
    title: "Prête à publier",
    pendingLead: "Regardez-la, puis validez et partagez en une seule touche.",
    approvedLead: "Validée. Enregistrez-la sur votre téléphone et publiez-la avec le texte ci-dessous.",
    approvedNote: "Rien n'est publié tant que vous ne le publiez pas vous-même.",
    openApp: "Voir toutes les vidéos de la semaine",
    invalidTitle: "Ce lien a expiré",
    invalidBody: "Les liens de l'e-mail sont valables {days} jours. Ouvrez l'application pour voir vos vidéos.",
    nothingTitle: "Cette vidéo ne peut pas être partagée d'ici",
    nothingBody: "Elle demande d'abord un coup d'œil, ou elle a été refusée. Ouvrez-la dans l'application.",
    approveFailed: "Ce n'a pas été enregistré. Vérifiez la connexion et réessayez.",
  },
  email: {
    approveShare: "Valider et partager",
    share: "Enregistrer et partager",
    lookInApp: "À vérifier dans l'application",
    postOn: "À publier : {slot}",
    heading: "Les vidéos de la semaine, avec leur texte",
  },
};

const tr: PostingText = {
  saveAndCopy: "Videoyu kaydet + açıklamayı kopyala",
  approveSaveCopy: "Onayla, kaydet + açıklamayı kopyala",
  downloadAndCopy: "Videoyu indir + açıklamayı kopyala",
  sharedHint: "Açıklama kopyalandı. Instagram'da +'ya dokunun, Reels'i seçin, videoyu seçip açıklamayı yapıştırın.",
  downloadedHint: "Video indirildi ve açıklama kopyalandı — videoyu yükleyip açıklamayı yapıştırın.",
  instagram: "Instagram",
  short: "TikTok · Shorts",
  copy: "Kopyala",
  copied: "Kopyalandı",
  suggested: "En iyi zaman: {slot}",
  syncedNote: "Hesabınıza kaydedildi — her cihazda aynı.",
  nextVideo: "Sonraki video",
  page: {
    metaTitle: "Paylaşmaya hazır",
    title: "Paylaşmaya hazır",
    pendingLead: "İzleyin, sonra tek dokunuşla onaylayıp paylaşın.",
    approvedLead: "Onaylandı. Telefonunuza kaydedin ve aşağıdaki açıklamayla paylaşın.",
    approvedNote: "Siz paylaşmadan hiçbir şey yayınlanmaz.",
    openApp: "Bu haftanın tüm videolarını görün",
    invalidTitle: "Bu bağlantının süresi doldu",
    invalidBody: "E-postadaki bağlantılar {days} gün geçerlidir. Videolarınızı görmek için uygulamayı açın.",
    nothingTitle: "Bu video buradan paylaşılamıyor",
    nothingBody: "Önce kısa bir göz atılması gerekiyor ya da reddedildi. Uygulamada açın.",
    approveFailed: "Kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.",
  },
  email: {
    approveShare: "Onayla ve paylaş",
    share: "Kaydet ve paylaş",
    lookInApp: "Uygulamada kontrol edin",
    postOn: "Paylaşım: {slot}",
    heading: "Bu haftanın videoları ve açıklamaları",
  },
};

const ja: PostingText = {
  saveAndCopy: "動画を保存＋文章をコピー",
  approveSaveCopy: "承認して動画を保存＋文章をコピー",
  downloadAndCopy: "動画をダウンロード＋文章をコピー",
  sharedHint: "文章をコピーしました。Instagramで＋をタップし、リールを選んで動画を選び、文章を貼り付けてください。",
  downloadedHint: "動画をダウンロードし、文章をコピーしました。アップロードして文章を貼り付けてください。",
  instagram: "Instagram",
  short: "TikTok・ショート",
  copy: "コピー",
  copied: "コピーしました",
  suggested: "おすすめの時間：{slot}",
  syncedNote: "アカウントに保存されます。どの端末でも同じです。",
  nextVideo: "次の動画",
  page: {
    metaTitle: "投稿の準備ができました",
    title: "投稿の準備ができました",
    pendingLead: "内容をご確認のうえ、ワンタップで承認して共有できます。",
    approvedLead: "承認済みです。スマートフォンに保存し、下の文章と一緒に投稿してください。",
    approvedNote: "ご自身で投稿するまで、何も公開されません。",
    openApp: "今週の動画をすべて見る",
    invalidTitle: "このリンクは有効期限が切れています",
    invalidBody: "メールのリンクは{days}日間有効です。アプリを開いて動画をご覧ください。",
    nothingTitle: "この動画はここから共有できません",
    nothingBody: "先に確認が必要か、見送りになった動画です。アプリでご確認ください。",
    approveFailed: "保存できませんでした。接続を確認して、もう一度お試しください。",
  },
  email: {
    approveShare: "承認して共有",
    share: "保存して共有",
    lookInApp: "アプリで確認",
    postOn: "投稿：{slot}",
    heading: "今週の動画と投稿文",
  },
};

const ar: PostingText = {
  saveAndCopy: "حفظ الفيديو + نسخ النص",
  approveSaveCopy: "اعتماد، حفظ الفيديو + نسخ النص",
  downloadAndCopy: "تنزيل الفيديو + نسخ النص",
  sharedHint: "تم نسخ النص. في إنستغرام اضغطوا +، واختاروا ريلز ثم الفيديو، والصقوا النص.",
  downloadedHint: "تم تنزيل الفيديو ونسخ النص — ارفعوه والصقوا النص.",
  instagram: "إنستغرام",
  short: "تيك توك · شورتس",
  copy: "نسخ",
  copied: "تم النسخ",
  suggested: "أفضل وقت: {slot}",
  syncedNote: "محفوظ في حسابكم — هو نفسه على كل الأجهزة.",
  nextVideo: "الفيديو التالي",
  page: {
    metaTitle: "جاهز للنشر",
    title: "جاهز للنشر",
    pendingLead: "شاهدوه، ثم اعتمدوه وشاركوه بلمسة واحدة.",
    approvedLead: "تم الاعتماد. احفظوه على الهاتف وانشروه مع النص أدناه.",
    approvedNote: "لا يُنشر شيء حتى تنشروه بأنفسكم.",
    openApp: "عرض كل فيديوهات هذا الأسبوع",
    invalidTitle: "انتهت صلاحية هذا الرابط",
    invalidBody: "روابط البريد صالحة لمدة {days} أيام. افتحوا التطبيق لمشاهدة فيديوهاتكم.",
    nothingTitle: "لا يمكن مشاركة هذا الفيديو من هنا",
    nothingBody: "يحتاج إلى نظرة سريعة أولاً، أو تم رفضه. افتحوه في التطبيق.",
    approveFailed: "لم يتم الحفظ. تحققوا من الاتصال وحاولوا مرة أخرى.",
  },
  email: {
    approveShare: "اعتماد ومشاركة",
    share: "حفظ ومشاركة",
    lookInApp: "راجعوه في التطبيق",
    postOn: "النشر: {slot}",
    heading: "فيديوهات هذا الأسبوع مع نصوصها",
  },
};

const pl: PostingText = {
  saveAndCopy: "Zapisz wideo + skopiuj opis",
  approveSaveCopy: "Zatwierdź, zapisz wideo + skopiuj opis",
  downloadAndCopy: "Pobierz wideo + skopiuj opis",
  sharedHint: "Opis skopiowany. W Instagramie stuknij +, wybierz Rolkę, potem wideo i wklej opis.",
  downloadedHint: "Wideo pobrane, opis skopiowany — prześlij je i wklej opis.",
  instagram: "Instagram",
  short: "TikTok · Shorts",
  copy: "Kopiuj",
  copied: "Skopiowano",
  suggested: "Najlepszy czas: {slot}",
  syncedNote: "Zapisane na koncie — tak samo na każdym urządzeniu.",
  nextVideo: "Następne wideo",
  page: {
    metaTitle: "Gotowe do publikacji",
    title: "Gotowe do publikacji",
    pendingLead: "Obejrzyj, a potem zatwierdź i udostępnij jednym stuknięciem.",
    approvedLead: "Zatwierdzone. Zapisz je w telefonie i opublikuj z opisem poniżej.",
    approvedNote: "Nic nie zostanie opublikowane, dopóki nie zrobisz tego sam.",
    openApp: "Zobacz wszystkie filmy z tego tygodnia",
    invalidTitle: "Ten link wygasł",
    invalidBody: "Linki z e-maila działają przez {days} dni. Otwórz aplikację, aby zobaczyć filmy.",
    nothingTitle: "Tego filmu nie można udostępnić stąd",
    nothingBody: "Wymaga najpierw krótkiego sprawdzenia albo został odrzucony. Otwórz go w aplikacji.",
    approveFailed: "Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie.",
  },
  email: {
    approveShare: "Zatwierdź i udostępnij",
    share: "Zapisz i udostępnij",
    lookInApp: "Sprawdź w aplikacji",
    postOn: "Publikacja: {slot}",
    heading: "Filmy z tego tygodnia z opisami",
  },
};

export const POSTING_TEXT: Record<Locale, PostingText> = { en, de, es, fr, tr, ja, ar, pl };

export function postingText(locale: string | null | undefined): PostingText {
  return POSTING_TEXT[(locale ?? "en") as Locale] ?? en;
}
