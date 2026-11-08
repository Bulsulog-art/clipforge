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
    /** "Background photos": the picker under each generated video. */
    photos: {
      title: string;
      hint: string;
      selected: string;
      apply: string;
      applying: string;
      updating: string;
      failed: string;
      photoAlt: string;
    };
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
  /** The paid funnel: account → clinic → live preview → plan, then the first week after payment. */
  onboarding: {
    metaTitle: string;
    steps: { account: string; clinic: string; preview: string; plan: string };
    stepOf: string;
    back: string;
    clinicTitle: string;
    clinicLead: string;
    clinicNext: string;
    brandHeading: string;
    brandHint: string;
    previewTitle: string;
    previewLead: string;
    previewControls: string;
    previewNote: string;
    previewNext: string;
    editDetails: string;
    planTitle: string;
    planLead: string;
    planRecap: string;
    firstWeekTitle: string;
    firstWeekLead: string;
    firstWeekActivating: string;
    firstWeekSteps: { paid: string; writing: string; rendering: string; email: string };
    firstWeekStill: string;
    cancelled: string;
  };
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
  billing: {
    heading: string;
    state: { trial: string; active: string; paused: string; cancelled: string };
    activeTier: string;
    renews: string;
    trialNote: string;
    toPreview: string;
    chooseTitle: string;
    leadTrial: string;
    leadPaused: string;
    leadCancelled: string;
    monthly: string;
    yearly: string;
    yearlySave: string;
    perMonth: string;
    perYear: string;
    monthlyOnly: string;
    recommended: string;
    foundingBadge: string;
    foundingLine: string;
    foundingCodeLine: string;
    foundingThen: string;
    choose: string;
    opening: string;
    haveCode: string;
    codeLabel: string;
    fineprint: string;
    success: string;
    cancelled: string;
    needPlan: string;
    settingsHeading: string;
    tiers: Record<"starter" | "practice" | "group", { name: string; blurb: string; features: [string, string, string] }>;
  };
  errors: {
    signIn: string;
    invalidPhotos: string;
    photosBusy: string;
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
    planRequired: string;
    recordingsNeedPractice: string;
    alreadySubscribed: string;
    invalidPlan: string;
    invalidCode: string;
    checkoutUnavailable: string;
    checkoutFailed: string;
  };
  /** The live preview of a clinic's own videos, before it subscribes (components/dentvid/live-preview.tsx). */
  preview: {
    caption: string;
    loading: string;
    unmute: string;
    mute: string;
    play: string;
    pause: string;
    previous: string;
    next: string;
    videoOf: string;
    failed: string;
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
      titleSignup: "See your videos before you pay",
      titleSignin: "Welcome back",
      leadSignup: "Create an account, describe your clinic and watch a live preview with your logo and colours. You only pay when you choose a plan.",
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
      photos: {
        title: "Background photos",
        hint: "Tap 1–4 photos to rotate behind the text. Your video is re-made with them.",
        selected: "{n} of 4 selected",
        apply: "Apply",
        applying: "Saving…",
        updating: "Updating your video with the new photos…",
        failed: "Updating the photos didn't work. Try again.",
        photoAlt: "Background photo {n}",
      },
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
    onboarding: {
      metaTitle: "Set up your clinic",
      steps: {
        account: "Account",
        clinic: "Clinic",
        preview: "Preview",
        plan: "Plan",
      },
      stepOf: "Step {n} of {total}",
      back: "Back",
      clinicTitle: "Tell us about your clinic",
      clinicLead: "Two minutes, once. Next you'll see a live preview of how your own videos will look — before you pay anything.",
      clinicNext: "Save and see my preview",
      brandHeading: "Logo and colour",
      brandHint: "Optional here — you can change both on the next screen and watch the preview update.",
      previewTitle: "Your videos, in your colours",
      previewLead: "A live preview of how your weekly videos will look. Change the logo, colour, name or language and it updates instantly.",
      previewControls: "Make it yours",
      previewNote: "This preview is drawn in your browser. Your real videos are written, narrated and checked twice once you choose a plan.",
      previewNext: "Looks good — choose a plan",
      editDetails: "Edit services and other details",
      planTitle: "Choose your plan",
      planLead: "Your first week of videos is made right after payment — about 15 minutes. Then five new, checked videos every Monday. Monthly, cancel anytime.",
      planRecap: "Your preview",
      firstWeekTitle: "Your first week is being made",
      firstWeekLead: "It takes about 15 minutes. We'll email you when your videos are ready for review — you can close this page.",
      firstWeekActivating: "Payment received — activating your plan. This can take a minute.",
      firstWeekSteps: {
        paid: "Payment confirmed",
        writing: "Writing five scripts and checking each one twice",
        rendering: "Narrating and captioning them in your colours",
        email: "An email to you when they are ready",
      },
      firstWeekStill: "Still working — this page refreshes by itself.",
      cancelled: "Checkout was cancelled. Nothing was charged — your preview is still here.",
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
    billing: {
      heading: "Your plan",
      state: { trial: "No plan yet", active: "Active", paused: "Paused", cancelled: "Cancelled" },
      activeTier: "{tier} plan",
      renews: "Renews on {date}",
      trialNote: "You haven't chosen a plan yet, so no videos are being made.",
      toPreview: "Back to your preview",
      chooseTitle: "Choose your plan",
      leadTrial: "Your first week of videos is made right after payment — about 15 minutes. Then five new, checked videos arrive every Monday.",
      leadPaused: "Your last payment did not go through, so new videos are paused. Choose a plan to carry on.",
      leadCancelled: "Your plan has ended. Choose a plan to start your weekly videos again.",
      monthly: "Monthly",
      yearly: "Yearly",
      yearlySave: "12 for the price of 10",
      perMonth: "/month",
      perYear: "/year",
      monthlyOnly: "Billed monthly",
      recommended: "Recommended",
      foundingBadge: "Founding offer",
      foundingLine: "Practice for {price}/month for 12 months — first 100 clinics",
      foundingCodeLine: "Code at checkout: {code}",
      foundingThen: "Then {price}/month.",
      choose: "Choose {tier}",
      opening: "Opening checkout…",
      haveCode: "Have a discount code?",
      codeLabel: "Discount code",
      fineprint: "Prices in USD. Taxes may apply. Monthly, cancel anytime. Secure payment by Dodo Payments.",
      success: "Thank you! Your plan is being activated — this can take a minute.",
      cancelled: "Checkout was cancelled. Nothing was charged.",
      needPlan: "Choose a plan to make more videos",
      settingsHeading: "Plan and billing",
      tiers: {
        starter: {
          name: "Starter",
          blurb: "For a single clinic getting started.",
          features: [
            "Five narrated, captioned videos every Monday",
            "Checked for advertising rules and clinical accuracy",
            "Your logo and brand colours in every video",
          ],
        },
        practice: {
          name: "Practice",
          blurb: "For clinics that want their own faces on screen.",
          features: ["Everything in Starter", "Your own recordings turned into captioned clips", "Filming cards for your own clips"],
        },
        group: {
          name: "Group",
          blurb: "For small groups with several sites.",
          features: [
            "Up to three locations",
            "Five videos per location every Monday",
            "One consistent, checked voice across sites",
          ],
        },
      },
    },
    errors: {
      signIn: "Please sign in again.",
      invalidPhotos: "Choose between 1 and 4 photos from the list.",
      photosBusy: "This video is already being updated.",
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
      planRequired: "Choose a plan to have your videos made — your first week starts right after payment.",
      recordingsNeedPractice: "Your own recordings are part of the Practice plan. Upgrade to turn your recording into clips.",
      alreadySubscribed: "Your plan is already active.",
      invalidPlan: "That plan is not available.",
      invalidCode: "That discount code could not be applied.",
      checkoutUnavailable: "Checkout is not available yet. Please try again shortly.",
      checkoutFailed: "Could not open checkout. Please try again.",
    },
    preview: {
      caption: "Your Monday videos — preview",
      loading: "Preparing your videos…",
      unmute: "Turn sound on",
      mute: "Turn sound off",
      play: "Play",
      pause: "Pause",
      previous: "Previous video",
      next: "Next video",
      videoOf: "Video {n} of {total}",
      failed: "The preview could not load. Please refresh the page.",
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
      titleSignup: "Ihre Videos sehen, bevor Sie zahlen",
      titleSignin: "Willkommen zurück",
      leadSignup: "Legen Sie ein Konto an, beschreiben Sie Ihre Praxis und sehen Sie eine Live-Vorschau mit Ihrem Logo und Ihren Farben. Sie zahlen erst, wenn Sie einen Tarif wählen.",
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
      photos: {
        title: "Hintergrundfotos",
        hint: "Tippen Sie 1–4 Fotos an, die hinter dem Text wechseln. Das Video wird damit neu erstellt.",
        selected: "{n} von 4 ausgewählt",
        apply: "Übernehmen",
        applying: "Wird gespeichert…",
        updating: "Ihr Video wird mit den neuen Fotos aktualisiert…",
        failed: "Die Fotos konnten nicht übernommen werden. Bitte erneut versuchen.",
        photoAlt: "Hintergrundfoto {n}",
      },
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
    onboarding: {
      metaTitle: "Praxis einrichten",
      steps: {
        account: "Konto",
        clinic: "Praxis",
        preview: "Vorschau",
        plan: "Tarif",
      },
      stepOf: "Schritt {n} von {total}",
      back: "Zurück",
      clinicTitle: "Erzählen Sie uns von Ihrer Praxis",
      clinicLead: "Zwei Minuten, nur einmal. Danach sehen Sie eine Live-Vorschau Ihrer eigenen Videos — bevor Sie etwas bezahlen.",
      clinicNext: "Speichern und Vorschau ansehen",
      brandHeading: "Logo und Farbe",
      brandHint: "Hier optional — beides können Sie im nächsten Schritt ändern und die Vorschau live verfolgen.",
      previewTitle: "Ihre Videos, in Ihren Farben",
      previewLead: "Eine Live-Vorschau, wie Ihre wöchentlichen Videos aussehen werden. Ändern Sie Logo, Farbe, Name oder Sprache — die Vorschau passt sich sofort an.",
      previewControls: "Passen Sie es an",
      previewNote: "Diese Vorschau entsteht in Ihrem Browser. Ihre echten Videos werden nach der Tarifwahl geschrieben, vertont und zweimal geprüft.",
      previewNext: "Gefällt mir — Tarif wählen",
      editDetails: "Leistungen und weitere Angaben bearbeiten",
      planTitle: "Wählen Sie Ihren Tarif",
      planLead: "Ihre erste Woche Videos entsteht direkt nach der Zahlung — in etwa 15 Minuten. Danach jeden Montag fünf neue, geprüfte Videos. Monatlich, jederzeit kündbar.",
      planRecap: "Ihre Vorschau",
      firstWeekTitle: "Ihre erste Woche wird erstellt",
      firstWeekLead: "Das dauert etwa 15 Minuten. Wir schicken Ihnen eine E-Mail, sobald Ihre Videos zur Freigabe bereitstehen — Sie können diese Seite schließen.",
      firstWeekActivating: "Zahlung erhalten — Ihr Tarif wird aktiviert. Das kann eine Minute dauern.",
      firstWeekSteps: {
        paid: "Zahlung bestätigt",
        writing: "Fünf Skripte schreiben und jedes zweimal prüfen",
        rendering: "Vertonen und in Ihren Farben untertiteln",
        email: "E-Mail an Sie, sobald sie fertig sind",
      },
      firstWeekStill: "Wird noch erstellt — diese Seite aktualisiert sich selbst.",
      cancelled: "Der Bezahlvorgang wurde abgebrochen. Es wurde nichts berechnet — Ihre Vorschau ist noch da.",
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
    billing: {
      heading: "Ihr Tarif",
      state: { trial: "Noch kein Tarif", active: "Aktiv", paused: "Pausiert", cancelled: "Gekündigt" },
      activeTier: "Tarif {tier}",
      renews: "Verlängert sich am {date}",
      trialNote: "Sie haben noch keinen Tarif gewählt, daher werden noch keine Videos erstellt.",
      toPreview: "Zurück zu Ihrer Vorschau",
      chooseTitle: "Wählen Sie Ihren Tarif",
      leadTrial: "Ihre erste Woche Videos entsteht direkt nach der Zahlung — in etwa 15 Minuten. Danach kommen jeden Montag fünf neue, geprüfte Videos.",
      leadPaused: "Ihre letzte Zahlung ist nicht durchgegangen, deshalb sind neue Videos pausiert. Wählen Sie einen Tarif, um weiterzumachen.",
      leadCancelled: "Ihr Tarif ist beendet. Wählen Sie einen Tarif, um die wöchentlichen Videos wieder zu starten.",
      monthly: "Monatlich",
      yearly: "Jährlich",
      yearlySave: "12 zum Preis von 10",
      perMonth: "/Monat",
      perYear: "/Jahr",
      monthlyOnly: "Monatliche Abrechnung",
      recommended: "Empfohlen",
      foundingBadge: "Gründungsangebot",
      foundingLine: "Practice für {price}/Monat, 12 Monate lang — für die ersten 100 Praxen",
      foundingCodeLine: "Code im Checkout: {code}",
      foundingThen: "Danach {price}/Monat.",
      choose: "{tier} wählen",
      opening: "Checkout wird geöffnet…",
      haveCode: "Haben Sie einen Rabattcode?",
      codeLabel: "Rabattcode",
      fineprint: "Preise in USD, ggf. zzgl. Steuern. Monatlich, jederzeit kündbar. Sichere Zahlung über Dodo Payments.",
      success: "Vielen Dank! Ihr Tarif wird aktiviert — das kann eine Minute dauern.",
      cancelled: "Der Checkout wurde abgebrochen. Es wurde nichts berechnet.",
      needPlan: "Tarif wählen, um weitere Videos zu erstellen",
      settingsHeading: "Tarif und Abrechnung",
      tiers: {
        starter: {
          name: "Starter",
          blurb: "Für eine Praxis, die einfach anfangen will.",
          features: [
            "Jeden Montag fünf vertonte, untertitelte Videos",
            "Geprüft auf Werberecht und fachliche Richtigkeit",
            "Ihr Logo und Ihre Markenfarben in jedem Video",
          ],
        },
        practice: {
          name: "Practice",
          blurb: "Für Praxen, die selbst vor der Kamera stehen wollen.",
          features: ["Alles aus Starter", "Ihre eigenen Aufnahmen als untertitelte Clips", "Drehkarten für Ihre eigenen Clips"],
        },
        group: {
          name: "Group",
          blurb: "Für kleine Praxisgruppen mit mehreren Standorten.",
          features: [
            "Bis zu drei Standorte",
            "Fünf Videos pro Standort, jeden Montag",
            "Ein einheitlicher, geprüfter Auftritt an allen Standorten",
          ],
        },
      },
    },
    errors: {
      signIn: "Bitte melden Sie sich erneut an.",
      invalidPhotos: "Wählen Sie 1 bis 4 Fotos aus der Liste.",
      photosBusy: "Dieses Video wird bereits aktualisiert.",
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
      planRequired: "Wählen Sie einen Tarif, damit Ihre Videos erstellt werden — Ihre erste Woche beginnt direkt nach der Zahlung.",
      recordingsNeedPractice: "Eigene Aufnahmen sind im Tarif Practice enthalten. Wechseln Sie den Tarif, um Ihre Aufnahme in Clips zu verwandeln.",
      alreadySubscribed: "Ihr Tarif ist bereits aktiv.",
      invalidPlan: "Dieser Tarif ist nicht verfügbar.",
      invalidCode: "Dieser Rabattcode konnte nicht angewendet werden.",
      checkoutUnavailable: "Der Checkout ist noch nicht verfügbar. Bitte versuchen Sie es in Kürze erneut.",
      checkoutFailed: "Der Checkout konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.",
    },
    preview: {
      caption: "Ihre Videos für Montag — Vorschau",
      loading: "Ihre Videos werden vorbereitet…",
      unmute: "Ton einschalten",
      mute: "Ton ausschalten",
      play: "Abspielen",
      pause: "Pause",
      previous: "Vorheriges Video",
      next: "Nächstes Video",
      videoOf: "Video {n} von {total}",
      failed: "Die Vorschau konnte nicht geladen werden. Bitte laden Sie die Seite neu.",
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
      titleSignup: "Ve tus vídeos antes de pagar",
      titleSignin: "Hola de nuevo",
      leadSignup: "Crea una cuenta, describe tu clínica y mira una vista previa en directo con tu logo y tus colores. Solo pagas cuando eliges un plan.",
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
      photos: {
        title: "Fotos de fondo",
        hint: "Toque de 1 a 4 fotos para que roten detrás del texto. El vídeo se vuelve a crear con ellas.",
        selected: "{n} de 4 seleccionadas",
        apply: "Aplicar",
        applying: "Guardando…",
        updating: "Actualizando su vídeo con las nuevas fotos…",
        failed: "No se pudieron aplicar las fotos. Inténtelo de nuevo.",
        photoAlt: "Foto de fondo {n}",
      },
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
    onboarding: {
      metaTitle: "Configura tu clínica",
      steps: {
        account: "Cuenta",
        clinic: "Clínica",
        preview: "Vista previa",
        plan: "Plan",
      },
      stepOf: "Paso {n} de {total}",
      back: "Atrás",
      clinicTitle: "Cuéntanos sobre tu clínica",
      clinicLead: "Dos minutos, una sola vez. Después verás una vista previa en directo de cómo serán tus propios vídeos, antes de pagar nada.",
      clinicNext: "Guardar y ver mi vista previa",
      brandHeading: "Logo y color",
      brandHint: "Opcional aquí: puedes cambiar ambos en la siguiente pantalla y ver cómo se actualiza la vista previa.",
      previewTitle: "Tus vídeos, con tus colores",
      previewLead: "Una vista previa en directo de cómo serán tus vídeos semanales. Cambia el logo, el color, el nombre o el idioma y se actualiza al instante.",
      previewControls: "Hazlo tuyo",
      previewNote: "Esta vista previa se dibuja en tu navegador. Tus vídeos reales se escriben, se narran y se revisan dos veces en cuanto eliges un plan.",
      previewNext: "Me gusta: elegir un plan",
      editDetails: "Editar tratamientos y otros datos",
      planTitle: "Elige tu plan",
      planLead: "Tu primera semana de vídeos se crea justo después del pago, en unos 15 minutos. Después, cinco vídeos nuevos y revisados cada lunes. Mensual, cancela cuando quieras.",
      planRecap: "Tu vista previa",
      firstWeekTitle: "Estamos creando tu primera semana",
      firstWeekLead: "Tarda unos 15 minutos. Te escribiremos cuando tus vídeos estén listos para revisar; puedes cerrar esta página.",
      firstWeekActivating: "Pago recibido: estamos activando tu plan. Puede tardar un minuto.",
      firstWeekSteps: {
        paid: "Pago confirmado",
        writing: "Escribimos cinco guiones y revisamos cada uno dos veces",
        rendering: "Les ponemos voz y subtítulos con tus colores",
        email: "Te enviamos un correo cuando estén listos",
      },
      firstWeekStill: "Seguimos trabajando: esta página se actualiza sola.",
      cancelled: "Has cancelado el pago. No se ha cobrado nada y tu vista previa sigue aquí.",
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
    billing: {
      heading: "Tu plan",
      state: { trial: "Sin plan todavía", active: "Activo", paused: "En pausa", cancelled: "Cancelado" },
      activeTier: "Plan {tier}",
      renews: "Se renueva el {date}",
      trialNote: "Aún no has elegido un plan, así que todavía no se crean vídeos.",
      toPreview: "Volver a tu vista previa",
      chooseTitle: "Elige tu plan",
      leadTrial: "Tu primera semana de vídeos se crea justo después del pago, en unos 15 minutos. Después llegan cinco vídeos nuevos y revisados cada lunes.",
      leadPaused: "Tu último pago no se completó, así que los vídeos nuevos están en pausa. Elige un plan para continuar.",
      leadCancelled: "Tu plan ha terminado. Elige un plan para volver a recibir tus vídeos semanales.",
      monthly: "Mensual",
      yearly: "Anual",
      yearlySave: "12 al precio de 10",
      perMonth: "/mes",
      perYear: "/año",
      monthlyOnly: "Facturación mensual",
      recommended: "Recomendado",
      foundingBadge: "Oferta fundadora",
      foundingLine: "Practice por {price}/mes durante 12 meses — primeras 100 clínicas",
      foundingCodeLine: "Código en el pago: {code}",
      foundingThen: "Después, {price}/mes.",
      choose: "Elegir {tier}",
      opening: "Abriendo el pago…",
      haveCode: "¿Tienes un código de descuento?",
      codeLabel: "Código de descuento",
      fineprint: "Precios en USD. Pueden aplicarse impuestos. Mensual, cancela cuando quieras. Pago seguro con Dodo Payments.",
      success: "¡Gracias! Estamos activando tu plan; puede tardar un minuto.",
      cancelled: "Has cancelado el pago. No se ha cobrado nada.",
      needPlan: "Elige un plan para crear más vídeos",
      settingsHeading: "Plan y facturación",
      tiers: {
        starter: {
          name: "Starter",
          blurb: "Para una clínica que quiere empezar.",
          features: [
            "Cinco vídeos narrados y subtitulados cada lunes",
            "Revisados según las normas de publicidad y la exactitud clínica",
            "Tu logo y tus colores en cada vídeo",
          ],
        },
        practice: {
          name: "Practice",
          blurb: "Para clínicas que quieren salir ellas mismas en cámara.",
          features: ["Todo lo de Starter", "Tus propias grabaciones convertidas en clips subtitulados", "Fichas de grabación para tus propios clips"],
        },
        group: {
          name: "Group",
          blurb: "Para pequeños grupos con varias sedes.",
          features: ["Hasta tres sedes", "Cinco vídeos por sede cada lunes", "Una voz coherente y revisada en todas las sedes"],
        },
      },
    },
    errors: {
      signIn: "Vuelve a iniciar sesión.",
      invalidPhotos: "Elija entre 1 y 4 fotos de la lista.",
      photosBusy: "Este vídeo ya se está actualizando.",
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
      planRequired: "Elige un plan para que creemos tus vídeos: tu primera semana empieza justo después del pago.",
      recordingsNeedPractice: "Tus propias grabaciones están en el plan Practice. Cambia de plan para convertir tu grabación en clips.",
      alreadySubscribed: "Tu plan ya está activo.",
      invalidPlan: "Ese plan no está disponible.",
      invalidCode: "No se pudo aplicar ese código de descuento.",
      checkoutUnavailable: "El pago aún no está disponible. Inténtalo de nuevo en un momento.",
      checkoutFailed: "No se pudo abrir el pago. Inténtalo de nuevo.",
    },
    preview: {
      caption: "Tus vídeos del lunes — vista previa",
      loading: "Preparando tus vídeos…",
      unmute: "Activar sonido",
      mute: "Silenciar",
      play: "Reproducir",
      pause: "Pausa",
      previous: "Vídeo anterior",
      next: "Vídeo siguiente",
      videoOf: "Vídeo {n} de {total}",
      failed: "No se pudo cargar la vista previa. Recarga la página.",
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
      titleSignup: "Ödemeden önce videolarınızı görün",
      titleSignin: "Tekrar hoş geldiniz",
      leadSignup: "Hesap açın, kliniğinizi tanıtın ve logonuz ile renklerinizle canlı önizlemeyi görün. Yalnızca plan seçtiğinizde ödersiniz.",
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
      photos: {
        title: "Arka plan fotoğrafları",
        hint: "Metnin arkasında dönecek 1–4 fotoğrafa dokunun. Videonuz bunlarla yeniden hazırlanır.",
        selected: "4 fotoğraftan {n} seçildi",
        apply: "Uygula",
        applying: "Kaydediliyor…",
        updating: "Videonuz yeni fotoğraflarla güncelleniyor…",
        failed: "Fotoğraflar uygulanamadı. Lütfen tekrar deneyin.",
        photoAlt: "Arka plan fotoğrafı {n}",
      },
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
    onboarding: {
      metaTitle: "Kliniğinizi kurun",
      steps: {
        account: "Hesap",
        clinic: "Klinik",
        preview: "Önizleme",
        plan: "Plan",
      },
      stepOf: "Adım {n} / {total}",
      back: "Geri",
      clinicTitle: "Kliniğinizi tanıtın",
      clinicLead: "İki dakika, yalnızca bir kez. Ardından, hiçbir ödeme yapmadan önce kendi videolarınızın nasıl görüneceğini canlı önizlemede görürsünüz.",
      clinicNext: "Kaydet ve önizlememi göster",
      brandHeading: "Logo ve renk",
      brandHint: "Burada isteğe bağlı — ikisini de bir sonraki ekranda değiştirip önizlemenin güncellendiğini görebilirsiniz.",
      previewTitle: "Videolarınız, sizin renklerinizle",
      previewLead: "Haftalık videolarınızın nasıl görüneceğinin canlı önizlemesi. Logoyu, rengi, adı veya dili değiştirin; önizleme anında güncellenir.",
      previewControls: "Size özel yapın",
      previewNote: "Bu önizleme tarayıcınızda çiziliyor. Gerçek videolarınız, plan seçtiğiniz anda yazılır, seslendirilir ve iki kez kontrol edilir.",
      previewNext: "Güzel görünüyor — plan seçin",
      editDetails: "Tedavileri ve diğer bilgileri düzenleyin",
      planTitle: "Planınızı seçin",
      planLead: "İlk haftanızın videoları ödemenin hemen ardından, yaklaşık 15 dakikada hazırlanır. Sonra her pazartesi beş yeni, kontrol edilmiş video. Aylık, istediğiniz zaman iptal.",
      planRecap: "Önizlemeniz",
      firstWeekTitle: "İlk haftanız hazırlanıyor",
      firstWeekLead: "Yaklaşık 15 dakika sürer. Videolarınız incelemeye hazır olduğunda size e-posta göndereceğiz — bu sayfayı kapatabilirsiniz.",
      firstWeekActivating: "Ödeme alındı — planınız etkinleştiriliyor. Bu bir dakika sürebilir.",
      firstWeekSteps: {
        paid: "Ödeme onaylandı",
        writing: "Beş senaryo yazılıyor ve her biri iki kez kontrol ediliyor",
        rendering: "Seslendiriliyor ve renklerinizle altyazılanıyor",
        email: "Hazır olduğunda size e-posta",
      },
      firstWeekStill: "Hâlâ hazırlanıyor — bu sayfa kendiliğinden yenilenir.",
      cancelled: "Ödeme iptal edildi. Hiçbir ücret alınmadı — önizlemeniz burada duruyor.",
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
    billing: {
      heading: "Planınız",
      state: { trial: "Henüz plan yok", active: "Aktif", paused: "Duraklatıldı", cancelled: "İptal edildi" },
      activeTier: "{tier} planı",
      renews: "{date} tarihinde yenilenir",
      trialNote: "Henüz bir plan seçmediniz; bu yüzden henüz video hazırlanmıyor.",
      toPreview: "Önizlemenize dönün",
      chooseTitle: "Planınızı seçin",
      leadTrial: "İlk haftanızın videoları ödemenin hemen ardından, yaklaşık 15 dakikada hazırlanır. Ardından her pazartesi beş yeni, kontrol edilmiş video gelir.",
      leadPaused: "Son ödemeniz gerçekleşmedi, bu yüzden yeni videolar duraklatıldı. Devam etmek için bir plan seçin.",
      leadCancelled: "Planınız sona erdi. Haftalık videolarınızı yeniden başlatmak için bir plan seçin.",
      monthly: "Aylık",
      yearly: "Yıllık",
      yearlySave: "10 ay fiyatına 12",
      perMonth: "/ay",
      perYear: "/yıl",
      monthlyOnly: "Aylık faturalandırılır",
      recommended: "Önerilen",
      foundingBadge: "Kurucu teklifi",
      foundingLine: "12 ay boyunca aylık {price} ile Practice — ilk 100 klinik için",
      foundingCodeLine: "Ödemede kod: {code}",
      foundingThen: "Sonrasında aylık {price}.",
      choose: "{tier} planını seç",
      opening: "Ödeme sayfası açılıyor…",
      haveCode: "İndirim kodunuz var mı?",
      codeLabel: "İndirim kodu",
      fineprint: "Fiyatlar USD cinsindendir. Vergiler eklenebilir. Aylık, istediğiniz zaman iptal. Güvenli ödeme Dodo Payments ile.",
      success: "Teşekkürler! Planınız etkinleştiriliyor — bu bir dakika sürebilir.",
      cancelled: "Ödeme iptal edildi. Herhangi bir ücret alınmadı.",
      needPlan: "Daha fazla video için bir plan seçin",
      settingsHeading: "Plan ve faturalandırma",
      tiers: {
        starter: {
          name: "Starter",
          blurb: "Yeni başlayan tek bir klinik için.",
          features: [
            "Her pazartesi beş seslendirilmiş, altyazılı video",
            "Reklam kuralları ve klinik doğruluk açısından kontrol edilir",
            "Her videoda logonuz ve marka renkleriniz",
          ],
        },
        practice: {
          name: "Practice",
          blurb: "Kameranın karşısına kendisi geçmek isteyen klinikler için.",
          features: ["Starter'daki her şey", "Kendi kayıtlarınızdan altyazılı klipler", "Kendi videolarınız için çekim kartları"],
        },
        group: {
          name: "Group",
          blurb: "Birden fazla şubesi olan küçük gruplar için.",
          features: ["En fazla üç şube", "Her pazartesi şube başına beş video", "Tüm şubelerde tutarlı, kontrol edilmiş bir dil"],
        },
      },
    },
    errors: {
      signIn: "Lütfen yeniden giriş yapın.",
      invalidPhotos: "Listeden 1 ile 4 arasında fotoğraf seçin.",
      photosBusy: "Bu video zaten güncelleniyor.",
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
      planRequired: "Videolarınızın hazırlanması için bir plan seçin — ilk haftanız ödemenin hemen ardından başlar.",
      recordingsNeedPractice: "Kendi kayıtlarınız Practice planına dahildir. Kaydınızı kliplere dönüştürmek için planınızı yükseltin.",
      alreadySubscribed: "Planınız zaten aktif.",
      invalidPlan: "Bu plan mevcut değil.",
      invalidCode: "Bu indirim kodu uygulanamadı.",
      checkoutUnavailable: "Ödeme henüz kullanılamıyor. Lütfen biraz sonra tekrar deneyin.",
      checkoutFailed: "Ödeme sayfası açılamadı. Lütfen tekrar deneyin.",
    },
    preview: {
      caption: "Pazartesi videolarınız — önizleme",
      loading: "Videolarınız hazırlanıyor…",
      unmute: "Sesi aç",
      mute: "Sesi kapat",
      play: "Oynat",
      pause: "Duraklat",
      previous: "Önceki video",
      next: "Sonraki video",
      videoOf: "Video {n} / {total}",
      failed: "Önizleme yüklenemedi. Lütfen sayfayı yenileyin.",
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
      titleSignup: "Voyez vos vidéos avant de payer",
      titleSignin: "Bon retour parmi nous",
      leadSignup: "Créez un compte, décrivez votre cabinet et découvrez un aperçu en direct avec votre logo et vos couleurs. Vous ne payez qu'en choisissant une formule.",
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
      photos: {
        title: "Photos d'arrière-plan",
        hint: "Touchez 1 à 4 photos qui défileront derrière le texte. La vidéo est refaite avec elles.",
        selected: "{n} sur 4 sélectionnées",
        apply: "Appliquer",
        applying: "Enregistrement…",
        updating: "Mise à jour de votre vidéo avec les nouvelles photos…",
        failed: "Les photos n'ont pas pu être appliquées. Réessayez.",
        photoAlt: "Photo d'arrière-plan {n}",
      },
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
    onboarding: {
      metaTitle: "Configurer votre cabinet",
      steps: {
        account: "Compte",
        clinic: "Cabinet",
        preview: "Aperçu",
        plan: "Formule",
      },
      stepOf: "Étape {n} sur {total}",
      back: "Retour",
      clinicTitle: "Parlez-nous de votre cabinet",
      clinicLead: "Deux minutes, une seule fois. Vous verrez ensuite un aperçu en direct de vos propres vidéos — avant de payer quoi que ce soit.",
      clinicNext: "Enregistrer et voir mon aperçu",
      brandHeading: "Logo et couleur",
      brandHint: "Facultatif ici — vous pourrez modifier les deux à l'écran suivant et voir l'aperçu se mettre à jour.",
      previewTitle: "Vos vidéos, à vos couleurs",
      previewLead: "Un aperçu en direct de vos vidéos hebdomadaires. Changez le logo, la couleur, le nom ou la langue : il se met à jour aussitôt.",
      previewControls: "Personnalisez",
      previewNote: "Cet aperçu est dessiné dans votre navigateur. Vos vraies vidéos sont rédigées, mises en voix et vérifiées deux fois dès que vous choisissez une formule.",
      previewNext: "C'est parfait — choisir une formule",
      editDetails: "Modifier les soins et les autres informations",
      planTitle: "Choisissez votre formule",
      planLead: "Votre première semaine de vidéos est réalisée dès le paiement, en 15 minutes environ. Ensuite, cinq nouvelles vidéos vérifiées chaque lundi. Mensuel, résiliable à tout moment.",
      planRecap: "Votre aperçu",
      firstWeekTitle: "Votre première semaine est en préparation",
      firstWeekLead: "Comptez environ 15 minutes. Nous vous écrivons dès que vos vidéos sont prêtes à valider — vous pouvez fermer cette page.",
      firstWeekActivating: "Paiement reçu — activation de votre formule. Cela peut prendre une minute.",
      firstWeekSteps: {
        paid: "Paiement confirmé",
        writing: "Rédaction de cinq scripts, chacun vérifié deux fois",
        rendering: "Mise en voix et sous-titres à vos couleurs",
        email: "Un e-mail dès qu'elles sont prêtes",
      },
      firstWeekStill: "Toujours en cours — cette page se met à jour toute seule.",
      cancelled: "Le paiement a été annulé. Rien n'a été débité — votre aperçu est toujours là.",
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
    billing: {
      heading: "Votre formule",
      state: { trial: "Pas encore de formule", active: "Active", paused: "En pause", cancelled: "Résiliée" },
      activeTier: "Formule {tier}",
      renews: "Renouvellement le {date}",
      trialNote: "Vous n'avez pas encore choisi de formule : aucune vidéo n'est donc réalisée pour l'instant.",
      toPreview: "Revenir à votre aperçu",
      chooseTitle: "Choisissez votre formule",
      leadTrial: "Votre première semaine de vidéos est réalisée dès le paiement, en 15 minutes environ. Ensuite, cinq nouvelles vidéos vérifiées arrivent chaque lundi.",
      leadPaused: "Votre dernier paiement n'a pas abouti : les nouvelles vidéos sont en pause. Choisissez une formule pour continuer.",
      leadCancelled: "Votre formule a pris fin. Choisissez une formule pour relancer vos vidéos hebdomadaires.",
      monthly: "Mensuel",
      yearly: "Annuel",
      yearlySave: "12 pour le prix de 10",
      perMonth: "/mois",
      perYear: "/an",
      monthlyOnly: "Facturation mensuelle",
      recommended: "Recommandée",
      foundingBadge: "Offre fondateurs",
      foundingLine: "Practice à {price}/mois pendant 12 mois — pour les 100 premiers cabinets",
      foundingCodeLine: "Code au paiement : {code}",
      foundingThen: "Ensuite {price}/mois.",
      choose: "Choisir {tier}",
      opening: "Ouverture du paiement…",
      haveCode: "Vous avez un code de réduction ?",
      codeLabel: "Code de réduction",
      fineprint: "Prix en USD, taxes éventuelles en sus. Mensuel, résiliable à tout moment. Paiement sécurisé par Dodo Payments.",
      success: "Merci ! Votre formule est en cours d'activation — cela peut prendre une minute.",
      cancelled: "Le paiement a été annulé. Rien n'a été débité.",
      needPlan: "Choisissez une formule pour créer d'autres vidéos",
      settingsHeading: "Formule et facturation",
      tiers: {
        starter: {
          name: "Starter",
          blurb: "Pour un cabinet qui veut se lancer simplement.",
          features: [
            "Cinq vidéos commentées et sous-titrées chaque lundi",
            "Vérifiées selon les règles de communication et l'exactitude clinique",
            "Votre logo et vos couleurs dans chaque vidéo",
          ],
        },
        practice: {
          name: "Practice",
          blurb: "Pour les cabinets qui veulent apparaître eux-mêmes à l'écran.",
          features: [
            "Tout ce qu'inclut Starter",
            "Vos propres enregistrements transformés en clips sous-titrés",
            "Fiches de tournage pour vos propres clips",
          ],
        },
        group: {
          name: "Group",
          blurb: "Pour les petits groupes de plusieurs cabinets.",
          features: [
            "Jusqu'à trois sites",
            "Cinq vidéos par site chaque lundi",
            "Une communication cohérente et vérifiée sur tous les sites",
          ],
        },
      },
    },
    errors: {
      signIn: "Merci de vous reconnecter.",
      invalidPhotos: "Choisissez entre 1 et 4 photos dans la liste.",
      photosBusy: "Cette vidéo est déjà en cours de mise à jour.",
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
      planRequired: "Choisissez une formule pour que vos vidéos soient réalisées : votre première semaine démarre dès le paiement.",
      recordingsNeedPractice: "Vos propres enregistrements font partie de la formule Practice. Changez de formule pour transformer votre enregistrement en clips.",
      alreadySubscribed: "Votre formule est déjà active.",
      invalidPlan: "Cette formule n'est pas disponible.",
      invalidCode: "Ce code de réduction n'a pas pu être appliqué.",
      checkoutUnavailable: "Le paiement n'est pas encore disponible. Merci de réessayer dans un instant.",
      checkoutFailed: "Impossible d'ouvrir le paiement. Merci de réessayer.",
    },
    preview: {
      caption: "Vos vidéos du lundi — aperçu",
      loading: "Préparation de vos vidéos…",
      unmute: "Activer le son",
      mute: "Couper le son",
      play: "Lire",
      pause: "Pause",
      previous: "Vidéo précédente",
      next: "Vidéo suivante",
      videoOf: "Vidéo {n} sur {total}",
      failed: "L'aperçu n'a pas pu se charger. Merci d'actualiser la page.",
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
