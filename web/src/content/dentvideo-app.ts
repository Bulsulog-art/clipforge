/**
 * Every word of DentVideo's own interface — header, footer, sign-up, the
 * clinic form, the library, the recording page and the API's messages — in
 * one typed dictionary, so a dentist who arrived through /dentvideo/tr never
 * meets English after that.
 *
 * Forms of address follow the landing pages: German Sie, Spanish tú,
 * French vous, Turkish siz. `{name}` placeholders are filled by `fmt`.
 */
import type { Locale } from "./dentvideo";

export type AppText = {
  chrome: { howItWorks: string; pricing: string; openApp: string; footer: string };
  start: {
    metaTitle: string;
    titleSignup: string;
    titleSignin: string;
    leadSignup: string;
    leadSignin: string;
    email: string;
    password: string;
    passwordHint: string;
    submitSignup: string;
    submitSignin: string;
    busy: string;
    toSignin: string;
    toSignup: string;
    wrongPassword: string;
  };
  home: {
    metaTitle: string;
    setupTitle: string;
    setupLead: string;
    yourClinic: string;
    title: string;
    lead: string;
    settings: string;
  };
  library: {
    makeWeek: string;
    starting: string;
    weekMade: string;
    uploadOwn: string;
    refresh: string;
    started: string;
    empty: string;
    showRejected: string;
    hideRejected: string;
    status: { ready: string; flagged: string; rejected: string; queued: string; working: string; failed: string };
    approvedByYou: string;
    declinedByYou: string;
    fromRecording: string;
    madeForYou: string;
    weekOf: string;
    notMade: string;
    noVideo: string;
    whyNotMade: string;
    whatToCheck: string;
    captionAndHashtags: string;
    copyCaption: string;
    copied: string;
    approve: string;
    approveAll: string;
    download: string;
    share: string;
    shareHint: string;
    decline: string;
    undo: string;
  };
  form: {
    clinicName: string;
    city: string;
    country: string;
    language: string;
    address: string;
    formal: string;
    informal: string;
    services: string;
    servicesHelp: string;
    tone: string;
    tones: { warm: string; expert: string; calm: string; playful: string };
    handle: string;
    booking: string;
    brandColor: string;
    logo: string;
    logoSaved: string;
    logoSuggested: string;
    logoNoColour: string;
    logoSwatches: string;
    logoPreview: string;
    save: string;
    saving: string;
    logoFailed: string;
  };
  settings: { metaTitle: string; title: string; lead: string; save: string };
  record: {
    metaTitle: string;
    title: string;
    lead: string;
    cardsHeading: string;
    noCards: string;
    startWith: string;
    closeWith: string;
    avoid: string;
    filming: string;
    fileLabel: string;
    upload: string;
    uploading: string;
    queued: string;
    queuedNote: string;
    tooBig: string;
  };
  errors: {
    signIn: string;
    setupFirst: string;
    invalidUpload: string;
    couldNotStart: string;
    weekMade: string;
    invalidProfile: string;
    invalidLogo: string;
    invalidDecision: string;
    badSignup: string;
    accountExists: string;
    createFailed: string;
    saveFailed: string;
  };
};

export const APP_TEXT: Record<Locale, AppText> = {
  en: {
    chrome: {
      howItWorks: "How it works",
      pricing: "Pricing",
      openApp: "Open app",
      footer: "Content is reviewed by software and approved by your dentist before publishing.",
    },
    start: {
      metaTitle: "Start",
      titleSignup: "Start your free first week",
      titleSignin: "Welcome back",
      leadSignup: "Five videos for your clinic, reviewed for accuracy and advertising rules. No card needed.",
      leadSignin: "Sign in to review this week's videos.",
      email: "Work email",
      password: "Password",
      passwordHint: "At least 8 characters.",
      submitSignup: "Create account",
      submitSignin: "Sign in",
      busy: "One moment…",
      toSignin: "Already have an account? Sign in",
      toSignup: "New here? Create an account",
      wrongPassword: "Wrong email or password.",
    },
    home: {
      metaTitle: "Your videos",
      setupTitle: "Tell us about your clinic",
      setupLead: "Two minutes, once. Your videos are written in your language, about the services you offer, in your colours.",
      yourClinic: "Your clinic",
      title: "Your videos",
      lead: "Every video is checked for clinical accuracy and health-advertising rules, and measured for sound and picture. Nothing is published until you approve it.",
      settings: "Clinic settings",
    },
    library: {
      makeWeek: "Make this week's videos",
      starting: "Starting…",
      weekMade: "This week's videos are made",
      uploadOwn: "Upload your own recording",
      refresh: "Refresh",
      started: "This week's videos are being made. It takes about 15 minutes — they will appear here.",
      empty: "No videos yet. Press “Make this week's videos”, or upload a short recording of yourself.",
      showRejected: "Show the topics we did not make, and why ({n})",
      hideRejected: "Hide the topics we did not make",
      status: {
        ready: "Ready for your review",
        flagged: "Needs your attention",
        rejected: "Not made — see why",
        queued: "Queued",
        working: "In progress",
        failed: "Failed",
      },
      approvedByYou: "Approved by you",
      declinedByYou: "Declined by you",
      fromRecording: "From your recording",
      madeForYou: "Made for you",
      weekOf: "week of {date}",
      notMade: "This topic was not made.",
      noVideo: "No video file.",
      whyNotMade: "Why we did not make it",
      whatToCheck: "What to check before posting",
      captionAndHashtags: "Caption and hashtags",
      copyCaption: "Copy caption",
      copied: "Copied",
      approve: "Approve",
      approveAll: "Approve all {n} ready videos",
      download: "Download",
      share: "Share to Instagram or TikTok",
      shareHint: "Caption copied — choose Instagram or TikTok, then paste it.",
      decline: "Decline",
      undo: "Undo",
    },
    form: {
      clinicName: "Clinic name",
      city: "City",
      country: "Country",
      language: "Language of your videos",
      address: "How you address patients",
      formal: "Formal (Sie, usted, vous, siz)",
      informal: "Informal (du, tú, tu, sen)",
      services: "Services you offer",
      servicesHelp: "Comma-separated. Videos are only ever made about these.",
      tone: "Tone",
      tones: { warm: "Warm", expert: "Expert", calm: "Calm", playful: "Playful" },
      handle: "Instagram / TikTok handle",
      booking: "Booking link (optional)",
      brandColor: "Brand colour",
      logo: "Logo (PNG with a transparent background works best)",
      logoSaved: "A logo is already saved.",
      logoSuggested: "We picked your brand colour from your logo. Tap another colour below, or choose any colour you like.",
      logoNoColour: "Your logo has no strong colour, so pick the brand colour you'd like your videos in.",
      logoSwatches: "Colours in your logo",
      logoPreview: "How your logo will appear in your videos",
      save: "Save and continue",
      saving: "Saving…",
      logoFailed: "The logo could not be uploaded: {message}",
    },
    settings: { metaTitle: "Clinic settings", title: "Clinic settings", lead: "Changes apply to the next videos we make.", save: "Save changes" },
    record: {
      metaTitle: "Record a video",
      title: "Record yourself — five minutes is enough",
      lead: "Patients trust the dentist they can see. Prop your phone at eye level, stand near a window, and talk through one of these cards. We cut it into short clips with captions and your logo — your words are never changed, and anything worth a second look is flagged for you before posting.",
      cardsHeading: "This week's filming cards",
      noCards: "Make this week's videos first — each one comes with a filming card you can use here.",
      startWith: "Start with:",
      closeWith: "Close with:",
      avoid: "Avoid:",
      filming: "Filming:",
      fileLabel: "Your recording (vertical or landscape, 1–10 minutes)",
      upload: "Upload and make clips",
      uploading: "Uploading…",
      queued: "Received — making your clips",
      queuedNote: "Your clips will appear in your library in about 10 minutes.",
      tooBig: "Please keep recordings under {mb} MB (about 10 minutes of phone video).",
    },
    errors: {
      signIn: "Please sign in again.",
      setupFirst: "Set up your clinic first.",
      invalidUpload: "That upload could not be used. Please try again.",
      couldNotStart: "Could not start — please try again.",
      weekMade: "This week's videos are already made — they are in your library below. Next week's can be made from Monday.",
      invalidProfile: "Please check the clinic details and try again.",
      invalidLogo: "That logo could not be used. Please upload it again.",
      invalidDecision: "That action is not available.",
      badSignup: "Enter a valid email and a password of at least 8 characters.",
      accountExists: "An account with this email already exists. Sign in instead.",
      createFailed: "Could not create the account. Please try again.",
      saveFailed: "Could not save. Please try again.",
    },
  },

  de: {
    chrome: {
      howItWorks: "So funktioniert's",
      pricing: "Preise",
      openApp: "Zur App",
      footer: "Inhalte werden softwaregestützt geprüft und vor der Veröffentlichung von Ihrer Zahnärztin oder Ihrem Zahnarzt freigegeben.",
    },
    start: {
      metaTitle: "Start",
      titleSignup: "Ihre erste Woche ist kostenlos",
      titleSignin: "Willkommen zurück",
      leadSignup: "Fünf Videos für Ihre Praxis, geprüft auf fachliche Richtigkeit und Werberecht. Ohne Kreditkarte.",
      leadSignin: "Melden Sie sich an, um die Videos dieser Woche anzusehen.",
      email: "E-Mail-Adresse der Praxis",
      password: "Passwort",
      passwordHint: "Mindestens 8 Zeichen.",
      submitSignup: "Konto erstellen",
      submitSignin: "Anmelden",
      busy: "Einen Moment …",
      toSignin: "Sie haben schon ein Konto? Anmelden",
      toSignup: "Neu hier? Konto erstellen",
      wrongPassword: "E-Mail-Adresse oder Passwort ist falsch.",
    },
    home: {
      metaTitle: "Ihre Videos",
      setupTitle: "Erzählen Sie uns von Ihrer Praxis",
      setupLead: "Zwei Minuten, nur einmal. Ihre Videos entstehen in Ihrer Sprache, zu Ihren Leistungen und in Ihren Farben.",
      yourClinic: "Ihre Praxis",
      title: "Ihre Videos",
      lead: "Jedes Video wird auf fachliche Richtigkeit und Heilmittelwerberecht geprüft und auf Ton und Bild kontrolliert. Veröffentlicht wird nichts ohne Ihre Freigabe.",
      settings: "Praxiseinstellungen",
    },
    library: {
      makeWeek: "Videos dieser Woche erstellen",
      starting: "Wird gestartet …",
      weekMade: "Die Videos dieser Woche sind fertig",
      uploadOwn: "Eigene Aufnahme hochladen",
      refresh: "Aktualisieren",
      started: "Die Videos dieser Woche werden erstellt. Das dauert etwa 15 Minuten – sie erscheinen dann hier.",
      empty: "Noch keine Videos. Klicken Sie auf „Videos dieser Woche erstellen“ oder laden Sie eine kurze Aufnahme von sich hoch.",
      showRejected: "Themen anzeigen, die wir nicht umgesetzt haben, und warum ({n})",
      hideRejected: "Nicht umgesetzte Themen ausblenden",
      status: {
        ready: "Bereit zur Prüfung",
        flagged: "Bitte ansehen",
        rejected: "Nicht erstellt – Begründung ansehen",
        queued: "In der Warteschlange",
        working: "In Arbeit",
        failed: "Fehlgeschlagen",
      },
      approvedByYou: "Von Ihnen freigegeben",
      declinedByYou: "Von Ihnen abgelehnt",
      fromRecording: "Aus Ihrer Aufnahme",
      madeForYou: "Für Sie erstellt",
      weekOf: "Woche vom {date}",
      notMade: "Dieses Thema wurde nicht umgesetzt.",
      noVideo: "Keine Videodatei.",
      whyNotMade: "Warum wir es nicht umgesetzt haben",
      whatToCheck: "Vor dem Posten bitte prüfen",
      captionAndHashtags: "Beitragstext und Hashtags",
      copyCaption: "Text kopieren",
      copied: "Kopiert",
      approve: "Freigeben",
      approveAll: "Alle {n} fertigen Videos freigeben",
      download: "Herunterladen",
      share: "Auf Instagram oder TikTok teilen",
      shareHint: "Text kopiert – Instagram oder TikTok wählen und einfügen.",
      decline: "Ablehnen",
      undo: "Rückgängig",
    },
    form: {
      clinicName: "Name der Praxis",
      city: "Stadt",
      country: "Land",
      language: "Sprache Ihrer Videos",
      address: "Wie Sie Patienten ansprechen",
      formal: "Förmlich (Sie, usted, vous, siz)",
      informal: "Persönlich (du, tú, tu, sen)",
      services: "Ihre Leistungen",
      servicesHelp: "Durch Kommas getrennt. Videos entstehen nur zu diesen Leistungen.",
      tone: "Tonalität",
      tones: { warm: "Herzlich", expert: "Fachlich", calm: "Ruhig", playful: "Locker" },
      handle: "Instagram- / TikTok-Name",
      booking: "Link zur Terminbuchung (optional)",
      brandColor: "Markenfarbe",
      logo: "Logo (am besten PNG mit transparentem Hintergrund)",
      logoSaved: "Ein Logo ist bereits gespeichert.",
      logoSuggested: "Wir haben Ihre Markenfarbe aus Ihrem Logo übernommen. Tippen Sie unten auf eine andere Farbe oder wählen Sie eine beliebige.",
      logoNoColour: "Ihr Logo hat keine ausgeprägte Farbe – wählen Sie die Markenfarbe, in der Ihre Videos erscheinen sollen.",
      logoSwatches: "Farben in Ihrem Logo",
      logoPreview: "So erscheint Ihr Logo in Ihren Videos",
      save: "Speichern und weiter",
      saving: "Wird gespeichert …",
      logoFailed: "Das Logo konnte nicht hochgeladen werden: {message}",
    },
    settings: {
      metaTitle: "Praxiseinstellungen",
      title: "Praxiseinstellungen",
      lead: "Änderungen gelten für die nächsten Videos.",
      save: "Änderungen speichern",
    },
    record: {
      metaTitle: "Video aufnehmen",
      title: "Nehmen Sie sich selbst auf – fünf Minuten genügen",
      lead: "Patienten vertrauen der Zahnärztin oder dem Zahnarzt, den sie sehen. Stellen Sie Ihr Handy auf Augenhöhe, stellen Sie sich in die Nähe eines Fensters und sprechen Sie eine dieser Karten durch. Wir schneiden daraus kurze Clips mit Untertiteln und Ihrem Logo – Ihre Worte bleiben unverändert, und was einen zweiten Blick verdient, markieren wir vor dem Posten für Sie.",
      cardsHeading: "Drehkarten dieser Woche",
      noCards: "Erstellen Sie zuerst die Videos dieser Woche – zu jedem gibt es eine Drehkarte, die Sie hier nutzen können.",
      startWith: "Einstieg:",
      closeWith: "Abschluss:",
      avoid: "Vermeiden:",
      filming: "Aufnahme:",
      fileLabel: "Ihre Aufnahme (hoch- oder querformatig, 1–10 Minuten)",
      upload: "Hochladen und Clips erstellen",
      uploading: "Wird hochgeladen …",
      queued: "Erhalten – Ihre Clips entstehen",
      queuedNote: "Ihre Clips erscheinen in etwa 10 Minuten in Ihrer Bibliothek.",
      tooBig: "Bitte laden Sie Aufnahmen unter {mb} MB hoch (etwa 10 Minuten Handyvideo).",
    },
    errors: {
      signIn: "Bitte melden Sie sich erneut an.",
      setupFirst: "Bitte richten Sie zuerst Ihre Praxis ein.",
      invalidUpload: "Diese Datei konnte nicht verwendet werden. Bitte versuchen Sie es erneut.",
      couldNotStart: "Der Start hat nicht geklappt – bitte versuchen Sie es erneut.",
      weekMade: "Die Videos dieser Woche sind bereits fertig – Sie finden sie unten in Ihrer Bibliothek. Die nächsten können ab Montag erstellt werden.",
      invalidProfile: "Bitte prüfen Sie die Angaben zur Praxis und versuchen Sie es erneut.",
      invalidLogo: "Dieses Logo konnte nicht verwendet werden. Bitte laden Sie es erneut hoch.",
      invalidDecision: "Diese Aktion ist nicht möglich.",
      badSignup: "Bitte geben Sie eine gültige E-Mail-Adresse und ein Passwort mit mindestens 8 Zeichen ein.",
      accountExists: "Zu dieser E-Mail-Adresse gibt es schon ein Konto. Bitte melden Sie sich an.",
      createFailed: "Das Konto konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
      saveFailed: "Speichern hat nicht geklappt. Bitte versuchen Sie es erneut.",
    },
  },

  es: {
    chrome: {
      howItWorks: "Cómo funciona",
      pricing: "Precios",
      openApp: "Abrir la app",
      footer: "El contenido lo revisa un software y lo aprueba tu dentista antes de publicarse.",
    },
    start: {
      metaTitle: "Empezar",
      titleSignup: "Empieza con tu primera semana gratis",
      titleSignin: "Hola de nuevo",
      leadSignup: "Cinco vídeos para tu clínica, revisados en precisión clínica y normas de publicidad sanitaria. Sin tarjeta.",
      leadSignin: "Inicia sesión para revisar los vídeos de esta semana.",
      email: "Correo de la clínica",
      password: "Contraseña",
      passwordHint: "Mínimo 8 caracteres.",
      submitSignup: "Crear cuenta",
      submitSignin: "Iniciar sesión",
      busy: "Un momento…",
      toSignin: "¿Ya tienes cuenta? Inicia sesión",
      toSignup: "¿Eres nuevo? Crea una cuenta",
      wrongPassword: "El correo o la contraseña no son correctos.",
    },
    home: {
      metaTitle: "Tus vídeos",
      setupTitle: "Cuéntanos sobre tu clínica",
      setupLead: "Dos minutos, una sola vez. Tus vídeos se escriben en tu idioma, sobre los servicios que ofreces y con tus colores.",
      yourClinic: "Tu clínica",
      title: "Tus vídeos",
      lead: "Cada vídeo se revisa en precisión clínica y normas de publicidad sanitaria, y se comprueba su sonido e imagen. No se publica nada sin tu aprobación.",
      settings: "Ajustes de la clínica",
    },
    library: {
      makeWeek: "Crear los vídeos de esta semana",
      starting: "Empezando…",
      weekMade: "Los vídeos de esta semana ya están hechos",
      uploadOwn: "Subir tu propia grabación",
      refresh: "Actualizar",
      started: "Estamos creando los vídeos de esta semana. Tarda unos 15 minutos y aparecerán aquí.",
      empty: "Aún no hay vídeos. Pulsa «Crear los vídeos de esta semana» o sube una grabación corta tuya.",
      showRejected: "Ver los temas que no hicimos y por qué ({n})",
      hideRejected: "Ocultar los temas que no hicimos",
      status: {
        ready: "Listo para tu revisión",
        flagged: "Necesita tu atención",
        rejected: "No se hizo — ver por qué",
        queued: "En cola",
        working: "En curso",
        failed: "Error",
      },
      approvedByYou: "Aprobado por ti",
      declinedByYou: "Descartado por ti",
      fromRecording: "De tu grabación",
      madeForYou: "Hecho para ti",
      weekOf: "semana del {date}",
      notMade: "Este tema no se hizo.",
      noVideo: "No hay archivo de vídeo.",
      whyNotMade: "Por qué no lo hicimos",
      whatToCheck: "Qué revisar antes de publicar",
      captionAndHashtags: "Texto y hashtags",
      copyCaption: "Copiar texto",
      copied: "Copiado",
      approve: "Aprobar",
      approveAll: "Aprobar los {n} vídeos listos",
      download: "Descargar",
      share: "Compartir en Instagram o TikTok",
      shareHint: "Texto copiado: elige Instagram o TikTok y pégalo.",
      decline: "Descartar",
      undo: "Deshacer",
    },
    form: {
      clinicName: "Nombre de la clínica",
      city: "Ciudad",
      country: "País",
      language: "Idioma de tus vídeos",
      address: "Cómo te diriges a tus pacientes",
      formal: "De usted (Sie, usted, vous, siz)",
      informal: "De tú (du, tú, tu, sen)",
      services: "Servicios que ofreces",
      servicesHelp: "Separados por comas. Los vídeos solo tratan estos servicios.",
      tone: "Tono",
      tones: { warm: "Cercano", expert: "Experto", calm: "Tranquilo", playful: "Desenfadado" },
      handle: "Usuario de Instagram / TikTok",
      booking: "Enlace para pedir cita (opcional)",
      brandColor: "Color de marca",
      logo: "Logo (mejor en PNG con fondo transparente)",
      logoSaved: "Ya hay un logo guardado.",
      logoSuggested: "Tomamos el color de marca de su logo. Toque otro color abajo o elija el que prefiera.",
      logoNoColour: "Su logo no tiene un color marcado: elija el color de marca que quiere para sus videos.",
      logoSwatches: "Colores de su logo",
      logoPreview: "Así aparecerá su logo en sus videos",
      save: "Guardar y continuar",
      saving: "Guardando…",
      logoFailed: "No se pudo subir el logo: {message}",
    },
    settings: {
      metaTitle: "Ajustes de la clínica",
      title: "Ajustes de la clínica",
      lead: "Los cambios se aplican a los próximos vídeos.",
      save: "Guardar cambios",
    },
    record: {
      metaTitle: "Grabar un vídeo",
      title: "Grábate — con cinco minutos basta",
      lead: "Los pacientes confían en el dentista al que pueden ver. Apoya el móvil a la altura de los ojos, ponte cerca de una ventana y habla siguiendo una de estas fichas. Lo cortamos en clips breves con subtítulos y tu logo; tus palabras nunca se cambian y, si algo merece una segunda mirada, te lo marcamos antes de publicar.",
      cardsHeading: "Fichas de grabación de esta semana",
      noCards: "Crea primero los vídeos de esta semana: cada uno incluye una ficha de grabación que puedes usar aquí.",
      startWith: "Empieza con:",
      closeWith: "Termina con:",
      avoid: "Evita:",
      filming: "Grabación:",
      fileLabel: "Tu grabación (vertical u horizontal, de 1 a 10 minutos)",
      upload: "Subir y crear clips",
      uploading: "Subiendo…",
      queued: "Recibido — creando tus clips",
      queuedNote: "Tus clips aparecerán en tu biblioteca en unos 10 minutos.",
      tooBig: "Sube grabaciones de menos de {mb} MB (unos 10 minutos de vídeo del móvil).",
    },
    errors: {
      signIn: "Vuelve a iniciar sesión.",
      setupFirst: "Primero configura tu clínica.",
      invalidUpload: "No pudimos usar ese archivo. Inténtalo de nuevo.",
      couldNotStart: "No se pudo empezar. Inténtalo de nuevo.",
      weekMade: "Los vídeos de esta semana ya están hechos: los tienes abajo, en tu biblioteca. Los de la próxima semana se pueden crear a partir del lunes.",
      invalidProfile: "Revisa los datos de la clínica e inténtalo de nuevo.",
      invalidLogo: "No pudimos usar ese logo. Súbelo de nuevo.",
      invalidDecision: "Esa acción no está disponible.",
      badSignup: "Escribe un correo válido y una contraseña de al menos 8 caracteres.",
      accountExists: "Ya existe una cuenta con este correo. Inicia sesión.",
      createFailed: "No se pudo crear la cuenta. Inténtalo de nuevo.",
      saveFailed: "No se pudo guardar. Inténtalo de nuevo.",
    },
  },

  tr: {
    chrome: {
      howItWorks: "Nasıl çalışır",
      pricing: "Fiyatlandırma",
      openApp: "Uygulamayı aç",
      footer: "İçerikler yazılımla kontrol edilir ve yayınlanmadan önce diş hekiminizin onayından geçer.",
    },
    start: {
      metaTitle: "Başlayın",
      titleSignup: "İlk haftanız ücretsiz",
      titleSignin: "Tekrar hoş geldiniz",
      leadSignup: "Kliniğiniz için beş video; klinik doğruluk ve sağlık reklamı kurallarına göre kontrol edilmiş. Kart gerekmez.",
      leadSignin: "Bu haftanın videolarını incelemek için giriş yapın.",
      email: "Klinik e-posta adresi",
      password: "Şifre",
      passwordHint: "En az 8 karakter.",
      submitSignup: "Hesap oluştur",
      submitSignin: "Giriş yap",
      busy: "Bir saniye…",
      toSignin: "Zaten hesabınız var mı? Giriş yapın",
      toSignup: "İlk kez mi geliyorsunuz? Hesap oluşturun",
      wrongPassword: "E-posta adresi veya şifre hatalı.",
    },
    home: {
      metaTitle: "Videolarınız",
      setupTitle: "Kliniğinizi tanıyalım",
      setupLead: "Yalnızca bir kez, iki dakika. Videolarınız sizin dilinizde, sunduğunuz hizmetler hakkında ve sizin renklerinizle hazırlanır.",
      yourClinic: "Kliniğiniz",
      title: "Videolarınız",
      lead: "Her video klinik doğruluk ve sağlık reklamı kurallarına göre kontrol edilir; ses ve görüntüsü ölçülür. Siz onaylamadan hiçbir şey yayınlanmaz.",
      settings: "Klinik ayarları",
    },
    library: {
      makeWeek: "Bu haftanın videolarını hazırla",
      starting: "Başlatılıyor…",
      weekMade: "Bu haftanın videoları hazır",
      uploadOwn: "Kendi kaydınızı yükleyin",
      refresh: "Yenile",
      started: "Bu haftanın videoları hazırlanıyor. Yaklaşık 15 dakika sürer; hazır olunca burada görünecek.",
      empty: "Henüz video yok. “Bu haftanın videolarını hazırla”ya basın ya da kendinizin kısa bir kaydını yükleyin.",
      showRejected: "Hazırlamadığımız konuları ve nedenlerini göster ({n})",
      hideRejected: "Hazırlamadığımız konuları gizle",
      status: {
        ready: "İncelemenize hazır",
        flagged: "Göz atmanız gerekiyor",
        rejected: "Hazırlanmadı — nedenini görün",
        queued: "Sırada",
        working: "Hazırlanıyor",
        failed: "Başarısız",
      },
      approvedByYou: "Onayladınız",
      declinedByYou: "Reddettiniz",
      fromRecording: "Kendi kaydınızdan",
      madeForYou: "Sizin için hazırlandı",
      weekOf: "{date} haftası",
      notMade: "Bu konu hazırlanmadı.",
      noVideo: "Video dosyası yok.",
      whyNotMade: "Neden hazırlamadık",
      whatToCheck: "Paylaşmadan önce kontrol edin",
      captionAndHashtags: "Açıklama ve etiketler",
      copyCaption: "Açıklamayı kopyala",
      copied: "Kopyalandı",
      approve: "Onayla",
      approveAll: "Hazır {n} videonun hepsini onayla",
      download: "İndir",
      share: "Instagram'da veya TikTok'ta paylaş",
      shareHint: "Açıklama kopyalandı — Instagram'ı veya TikTok'u seçip yapıştırın.",
      decline: "Reddet",
      undo: "Geri al",
    },
    form: {
      clinicName: "Klinik adı",
      city: "Şehir",
      country: "Ülke",
      language: "Videolarınızın dili",
      address: "Hastalarınıza nasıl hitap ediyorsunuz",
      formal: "Resmî (Sie, usted, vous, siz)",
      informal: "Samimi (du, tú, tu, sen)",
      services: "Sunduğunuz hizmetler",
      servicesHelp: "Virgülle ayırın. Videolar yalnızca bu hizmetler hakkında hazırlanır.",
      tone: "Üslup",
      tones: { warm: "Sıcak", expert: "Uzman", calm: "Sakin", playful: "Eğlenceli" },
      handle: "Instagram / TikTok kullanıcı adı",
      booking: "Randevu bağlantısı (isteğe bağlı)",
      brandColor: "Marka rengi",
      logo: "Logo (en iyisi şeffaf arka planlı PNG)",
      logoSaved: "Kayıtlı bir logonuz var.",
      logoSuggested: "Marka renginizi logonuzdan aldık. Aşağıdan başka bir renge dokunabilir ya da istediğiniz rengi seçebilirsiniz.",
      logoNoColour: "Logonuzda belirgin bir renk yok; videolarınızın marka rengini seçin.",
      logoSwatches: "Logonuzdaki renkler",
      logoPreview: "Logonuz videolarınızda böyle görünecek",
      save: "Kaydet ve devam et",
      saving: "Kaydediliyor…",
      logoFailed: "Logo yüklenemedi: {message}",
    },
    settings: {
      metaTitle: "Klinik ayarları",
      title: "Klinik ayarları",
      lead: "Değişiklikler bir sonraki videolardan itibaren geçerli olur.",
      save: "Değişiklikleri kaydet",
    },
    record: {
      metaTitle: "Video kaydedin",
      title: "Kendinizi kaydedin — beş dakika yeterli",
      lead: "Hastalar görebildikleri hekime güvenir. Telefonunuzu göz hizasına yerleştirin, bir pencereye yakın durun ve bu kartlardan birini anlatın. Kaydınızı altyazılı ve logolu kısa kliplere ayırırız; sözleriniz asla değiştirilmez, ikinci kez bakılması gereken bir şey varsa paylaşmadan önce size işaretleriz.",
      cardsHeading: "Bu haftanın çekim kartları",
      noCards: "Önce bu haftanın videolarını hazırlayın; her biriyle birlikte burada kullanabileceğiniz bir çekim kartı gelir.",
      startWith: "Şöyle başlayın:",
      closeWith: "Şöyle bitirin:",
      avoid: "Kaçının:",
      filming: "Çekim:",
      fileLabel: "Kaydınız (dikey ya da yatay, 1–10 dakika)",
      upload: "Yükle ve klipleri hazırla",
      uploading: "Yükleniyor…",
      queued: "Alındı — klipleriniz hazırlanıyor",
      queuedNote: "Klipleriniz yaklaşık 10 dakika içinde kitaplığınızda görünecek.",
      tooBig: "Lütfen {mb} MB'tan küçük kayıtlar yükleyin (telefonla yaklaşık 10 dakikalık video).",
    },
    errors: {
      signIn: "Lütfen yeniden giriş yapın.",
      setupFirst: "Önce kliniğinizi tanımlayın.",
      invalidUpload: "Bu dosya kullanılamadı. Lütfen tekrar deneyin.",
      couldNotStart: "Başlatılamadı, lütfen tekrar deneyin.",
      weekMade: "Bu haftanın videoları zaten hazır; aşağıda kitaplığınızda. Gelecek haftanınkiler pazartesiden itibaren hazırlanabilir.",
      invalidProfile: "Lütfen klinik bilgilerini kontrol edip tekrar deneyin.",
      invalidLogo: "Bu logo kullanılamadı. Lütfen yeniden yükleyin.",
      invalidDecision: "Bu işlem yapılamıyor.",
      badSignup: "Geçerli bir e-posta adresi ve en az 8 karakterlik bir şifre girin.",
      accountExists: "Bu e-posta adresiyle zaten bir hesap var. Lütfen giriş yapın.",
      createFailed: "Hesap oluşturulamadı. Lütfen tekrar deneyin.",
      saveFailed: "Kaydedilemedi. Lütfen tekrar deneyin.",
    },
  },

  fr: {
    chrome: {
      howItWorks: "Comment ça marche",
      pricing: "Tarifs",
      openApp: "Ouvrir l'app",
      footer: "Les contenus sont vérifiés par un logiciel puis validés par votre dentiste avant publication.",
    },
    start: {
      metaTitle: "Commencer",
      titleSignup: "Votre première semaine est offerte",
      titleSignin: "Bon retour parmi nous",
      leadSignup: "Cinq vidéos pour votre cabinet, vérifiées sur le plan clinique et au regard des règles de publicité en santé. Sans carte bancaire.",
      leadSignin: "Connectez-vous pour relire les vidéos de la semaine.",
      email: "E-mail du cabinet",
      password: "Mot de passe",
      passwordHint: "8 caractères minimum.",
      submitSignup: "Créer un compte",
      submitSignin: "Se connecter",
      busy: "Un instant…",
      toSignin: "Vous avez déjà un compte ? Connectez-vous",
      toSignup: "Première visite ? Créez un compte",
      wrongPassword: "E-mail ou mot de passe incorrect.",
    },
    home: {
      metaTitle: "Vos vidéos",
      setupTitle: "Parlez-nous de votre cabinet",
      setupLead: "Deux minutes, une seule fois. Vos vidéos sont écrites dans votre langue, sur les soins que vous proposez, à vos couleurs.",
      yourClinic: "Votre cabinet",
      title: "Vos vidéos",
      lead: "Chaque vidéo est vérifiée sur le plan clinique et au regard des règles de publicité en santé, et contrôlée pour le son et l'image. Rien n'est publié sans votre accord.",
      settings: "Réglages du cabinet",
    },
    library: {
      makeWeek: "Créer les vidéos de la semaine",
      starting: "Lancement…",
      weekMade: "Les vidéos de la semaine sont prêtes",
      uploadOwn: "Envoyer votre propre enregistrement",
      refresh: "Actualiser",
      started: "Les vidéos de la semaine sont en préparation. Comptez environ 15 minutes : elles apparaîtront ici.",
      empty: "Pas encore de vidéos. Cliquez sur « Créer les vidéos de la semaine » ou envoyez un court enregistrement de vous.",
      showRejected: "Voir les sujets que nous n'avons pas réalisés, et pourquoi ({n})",
      hideRejected: "Masquer les sujets non réalisés",
      status: {
        ready: "Prête pour votre relecture",
        flagged: "À regarder",
        rejected: "Non réalisée — voir pourquoi",
        queued: "En attente",
        working: "En cours",
        failed: "Échec",
      },
      approvedByYou: "Validée par vous",
      declinedByYou: "Refusée par vous",
      fromRecording: "Tirée de votre enregistrement",
      madeForYou: "Réalisée pour vous",
      weekOf: "semaine du {date}",
      notMade: "Ce sujet n'a pas été réalisé.",
      noVideo: "Aucun fichier vidéo.",
      whyNotMade: "Pourquoi nous ne l'avons pas réalisée",
      whatToCheck: "À vérifier avant de publier",
      captionAndHashtags: "Texte et hashtags",
      copyCaption: "Copier le texte",
      copied: "Copié",
      approve: "Valider",
      approveAll: "Valider les {n} vidéos prêtes",
      download: "Télécharger",
      share: "Partager sur Instagram ou TikTok",
      shareHint: "Texte copié : choisissez Instagram ou TikTok, puis collez-le.",
      decline: "Refuser",
      undo: "Annuler",
    },
    form: {
      clinicName: "Nom du cabinet",
      city: "Ville",
      country: "Pays",
      language: "Langue de vos vidéos",
      address: "Comment vous vous adressez aux patients",
      formal: "Vouvoiement (Sie, usted, vous, siz)",
      informal: "Tutoiement (du, tú, tu, sen)",
      services: "Soins que vous proposez",
      servicesHelp: "Séparés par des virgules. Les vidéos ne portent que sur ces soins.",
      tone: "Ton",
      tones: { warm: "Chaleureux", expert: "Expert", calm: "Posé", playful: "Détendu" },
      handle: "Compte Instagram / TikTok",
      booking: "Lien de prise de rendez-vous (facultatif)",
      brandColor: "Couleur de marque",
      logo: "Logo (idéalement un PNG à fond transparent)",
      logoSaved: "Un logo est déjà enregistré.",
      logoSuggested: "Nous avons repris la couleur de marque de votre logo. Touchez une autre couleur ci-dessous ou choisissez celle que vous voulez.",
      logoNoColour: "Votre logo n'a pas de couleur marquée : choisissez la couleur de marque de vos vidéos.",
      logoSwatches: "Couleurs de votre logo",
      logoPreview: "Voici comment votre logo apparaîtra dans vos vidéos",
      save: "Enregistrer et continuer",
      saving: "Enregistrement…",
      logoFailed: "Le logo n'a pas pu être envoyé : {message}",
    },
    settings: {
      metaTitle: "Réglages du cabinet",
      title: "Réglages du cabinet",
      lead: "Les modifications s'appliquent aux prochaines vidéos.",
      save: "Enregistrer les modifications",
    },
    record: {
      metaTitle: "Enregistrer une vidéo",
      title: "Filmez-vous — cinq minutes suffisent",
      lead: "Les patients font confiance au dentiste qu'ils voient. Posez votre téléphone à hauteur des yeux, placez-vous près d'une fenêtre et parlez en suivant l'une de ces fiches. Nous en tirons de courts extraits sous-titrés avec votre logo : vos propos ne sont jamais modifiés, et ce qui mérite d'être revu vous est signalé avant publication.",
      cardsHeading: "Fiches de tournage de la semaine",
      noCards: "Créez d'abord les vidéos de la semaine : chacune est accompagnée d'une fiche de tournage à utiliser ici.",
      startWith: "Commencez par :",
      closeWith: "Terminez par :",
      avoid: "À éviter :",
      filming: "Tournage :",
      fileLabel: "Votre enregistrement (vertical ou horizontal, 1 à 10 minutes)",
      upload: "Envoyer et créer les extraits",
      uploading: "Envoi…",
      queued: "Reçu — vos extraits sont en préparation",
      queuedNote: "Vos extraits apparaîtront dans votre bibliothèque d'ici une dizaine de minutes.",
      tooBig: "Merci d'envoyer des enregistrements de moins de {mb} Mo (environ 10 minutes de vidéo au téléphone).",
    },
    errors: {
      signIn: "Merci de vous reconnecter.",
      setupFirst: "Commencez par configurer votre cabinet.",
      invalidUpload: "Ce fichier n'a pas pu être utilisé. Merci de réessayer.",
      couldNotStart: "Le lancement a échoué, merci de réessayer.",
      weekMade: "Les vidéos de la semaine sont déjà prêtes : elles sont dans votre bibliothèque ci-dessous. Celles de la semaine prochaine pourront être créées à partir de lundi.",
      invalidProfile: "Merci de vérifier les informations du cabinet et de réessayer.",
      invalidLogo: "Ce logo n'a pas pu être utilisé. Merci de l'envoyer à nouveau.",
      invalidDecision: "Cette action n'est pas disponible.",
      badSignup: "Saisissez un e-mail valide et un mot de passe d'au moins 8 caractères.",
      accountExists: "Un compte existe déjà avec cet e-mail. Connectez-vous.",
      createFailed: "Le compte n'a pas pu être créé. Merci de réessayer.",
      saveFailed: "L'enregistrement a échoué. Merci de réessayer.",
    },
  },
};

/** Fills `{name}` placeholders. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function appText(locale: Locale): AppText {
  return APP_TEXT[locale] ?? APP_TEXT.en;
}
