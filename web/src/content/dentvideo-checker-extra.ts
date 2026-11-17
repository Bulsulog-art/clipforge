import type { Locale } from "./dentvideo-locales";
import type { MarketRuleId } from "@/lib/dentvid/hard-rules";

/**
 * The ad checker's words for markets, sentence verdicts, examples, sharing
 * and the bridge to DentVideo, in the site's eight languages. Merged into
 * each page's CheckerUi (content/dentvideo-checker.ts); server-side like the
 * rest of the checker copy, so the browser only gets its own language.
 *
 * Rules for this copy: plain words, no promise, no pressure, no superlative.
 * The market-pack texts say only what the cited rule says (MARKET_HARD_RULES
 * in lib/dentvid/hard-rules.ts carries the article for each).
 */

export type CheckerExample = { label: string; text: string };
type RuleText = { name: string; why: string; tip: string };

export type CheckerUiExtra = {
  market: {
    label: string;
    /** "Another country": only the rules that apply nearly everywhere. */
    other: string;
    hint: string;
  };
  examples: { label: string; /** The label of the page's own risky sample (CheckerUi.sample), shown first. */ promo: string; items: CheckerExample[] };
  verdicts: { ok: string; risky: string; /** {market}: the country's name. */ banned: string };
  /** {ok} {risky} {banned}: sentence counts. */
  summary: string;
  bySentence: string;
  saferSentence: string;
  source: string;
  /** "Another country" chosen: no single official text to show. */
  noSource: string;
  /** Shown when the text came from a shared link. */
  shared: string;
  share: { copy: string; copied: string; image: string; making: string; failed: string; note: string };
  bridge: { text: string; link: string };
  /** Under every result. */
  disclaimer: string;
  /** The result image's title. */
  cardTitle: string;
  marketRules: Record<MarketRuleId, RuleText>;
  /** Page copy: a paragraph for "What the checker looks for", and FAQ entries (visible, so they may feed FAQPage). */
  page: { how: string; faq: { q: string; a: string }[] };
};

export const CHECKER_EXTRA: Record<Locale, CheckerUiExtra> = {
  en: {
    market: { label: "Country", other: "Another country (general rules)", hint: "Rules differ by country. Pick yours to see what its official texts name as not allowed." },
    examples: {
      label: "Try an example",
      promo: "Promotional post",
      items: [
        { label: "Implant post", text: "New teeth in one day with our implant specialists. Implants can last a lifetime. An implant replaces the root of a missing tooth. Book now!" },
        { label: "Calm, informative post", text: "Bleeding gums when you brush? It is often an early sign of gum inflammation. Brushing gently along the gum line and cleaning between your teeth can help. If it keeps happening, mention it at your next check-up." },
      ],
    },
    verdicts: { ok: "OK", risky: "Risky", banned: "Not allowed · {market}" },
    summary: "OK: {ok} · Risky: {risky} · Not allowed: {banned}",
    bySentence: "Sentence by sentence",
    saferSentence: "Safer sentence",
    source: "Official source",
    noSource: "Pick your country above to see its official source.",
    shared: "Opened from a shared link. The text came inside the link and was checked here, in your browser.",
    share: {
      copy: "Copy link to this check",
      copied: "Link copied",
      image: "Save result as image",
      making: "Making the image…",
      failed: "That did not work in this browser. Select the address bar and copy it instead.",
      note: "The text travels inside the link, after the #, so it never reaches our server.",
    },
    bridge: { text: "DentVideo writes every patient video with these checks built in, and nothing is posted without your approval.", link: "See it with your logo" },
    disclaimer: "A careful filter, not legal advice.",
    cardTitle: "Ad check",
    page: {
      how: "Pick a country and every sentence gets a verdict: OK, risky, or not allowed. “Not allowed” is used only where that country's official text names that kind of claim, and each flagged phrase links to the text it comes from. Everything else that the rules commonly object to is marked risky.",
      faq: [
        { q: "Can I send a check to a colleague or my marketing person?", a: "Yes. “Copy link to this check” puts your text and country inside the link, after the #. Browsers never send that part to a server, so the text goes from your device to theirs and is checked again in their browser. “Save result as image” draws a summary card on your device." },
        { q: "Which countries does it know?", a: "The United States, the United Kingdom, Türkiye, Germany, Austria, Switzerland, Spain, Mexico, France, Poland, Japan, the United Arab Emirates and Saudi Arabia, each with its official texts. For another country, choose “Another country” to run the rules that apply almost everywhere." },
      ],
    },
    marketRules: {
      sponsored: { name: "Sponsored or paid promotion", why: "In Türkiye, clinics and dentists may not use paid, sponsored or boosted promotion.", tip: "Post from your own account, without paid boosting or a sponsor label." },
      engagement: { name: "Asking for likes or comments", why: "Turkish rules say a visual post must not invite likes, comments or reshares.", tip: "End with information, not a request to like, comment or share." },
      giveaway: { name: "Raffle or prize", why: "Raffles, prize draws and gifts may not be used to promote health services in Türkiye.", tip: "Leave the raffle out and share something useful instead." },
      booking: { name: "Steering to book", why: "In Türkiye a clinic's post may inform, but must not steer viewers to book or to contact the clinic.", tip: "Point people to their own dentist at their next visit." },
      specialist: { name: "Specialist claim", why: "Only a dentist with a recognised specialist title, or the expertise the rules require, may be called a specialist.", tip: "Name the title only if you hold it; otherwise describe the treatments you offer." },
      children: { name: "Speaking to children", why: "In Germany, advertising for treatments aimed mainly at children under 14 is not allowed.", tip: "Speak to the parents instead." },
      pom: { name: "Prescription-only medicine", why: "Prescription-only medicines such as botulinum toxin may not be advertised to the public in the UK.", tip: "Talk about the consultation, not the medicine." },
      permit: { name: "COFEPRIS permit number", why: "In Mexico, a COFEPRIS permit or notice number may only be shown by the clinic that holds it.", tip: "Show the number only if your clinic holds that permit." },
    },
  },

  tr: {
    market: { label: "Ülke", other: "Başka bir ülke (genel kurallar)", hint: "Kurallar ülkeden ülkeye değişir. Ülkenizi seçin; resmî metinlerin açıkça yasakladıklarını görün." },
    examples: {
      label: "Bir örnek deneyin",
      promo: "Kampanya paylaşımı",
      items: [
        { label: "İmplant paylaşımı", text: "Aynı gün sabit dişler. İmplantlar ömür boyu kullanılır. İmplant, eksik dişin kökünün yerine konan yapay bir köktür. Sorularınız için bize ulaşın veya randevu alın!" },
        { label: "Sakin, bilgilendirici paylaşım", text: "Dişlerinizi fırçalarken diş etiniz kanıyor mu? Bu çoğu zaman diş eti iltihabının erken bir belirtisidir. Diş eti çizgisini nazikçe fırçalamak ve diş aralarını temizlemek yardımcı olabilir. Kanama sürerse bir sonraki kontrolünüzde diş hekiminize söyleyin." },
      ],
    },
    verdicts: { ok: "Uygun", risky: "Riskli", banned: "Yasak · {market}" },
    summary: "Uygun: {ok} · Riskli: {risky} · Yasak: {banned}",
    bySentence: "Cümle cümle sonuç",
    saferSentence: "Daha güvenli cümle",
    source: "Resmî kaynak",
    noSource: "Resmî kaynağı görmek için yukarıdan ülkenizi seçin.",
    shared: "Paylaşılan bir bağlantıdan açıldı. Metin bağlantının içinde geldi ve burada, tarayıcınızda kontrol edildi.",
    share: {
      copy: "Bu kontrolün bağlantısını kopyala",
      copied: "Bağlantı kopyalandı",
      image: "Sonucu görsel olarak kaydet",
      making: "Görsel hazırlanıyor…",
      failed: "Bu tarayıcıda olmadı. Adres çubuğunu seçip oradan kopyalayın.",
      note: "Metin bağlantının içinde, # işaretinden sonra taşınır; sunucumuza hiç ulaşmaz.",
    },
    bridge: { text: "DentVideo her hasta videosunu bu kontroller içinde yazar; onayınız olmadan hiçbir şey paylaşılmaz.", link: "Logonuzla görün" },
    disclaimer: "Dikkatli bir filtre; hukuki görüş değildir.",
    cardTitle: "Reklam kontrolü",
    page: {
      how: "Bir ülke seçin; her cümle bir sonuç alır: uygun, riskli ya da yasak. “Yasak” yalnızca o ülkenin resmî metni bu tür bir ifadeyi açıkça andığında kullanılır ve işaretlenen her ifade dayandığı metne bağlanır. Kuralların sık itiraz ettiği diğer ifadeler riskli olarak işaretlenir.",
      faq: [
        { q: "Kontrolü bir meslektaşıma ya da ajansıma gönderebilir miyim?", a: "Evet. “Bu kontrolün bağlantısını kopyala” metninizi ve ülkenizi bağlantının içine, # işaretinden sonrasına koyar. Tarayıcılar bu kısmı hiçbir sunucuya göndermez; metin cihazınızdan karşı tarafın cihazına gider ve onun tarayıcısında yeniden kontrol edilir. “Sonucu görsel olarak kaydet” özet bir kartı cihazınızda çizer." },
        { q: "Hangi ülkeleri biliyor?", a: "Türkiye, Amerika Birleşik Devletleri, Birleşik Krallık, Almanya, Avusturya, İsviçre, İspanya, Meksika, Fransa, Polonya, Japonya, Birleşik Arap Emirlikleri ve Suudi Arabistan; her biri kendi resmî metinleriyle. Başka bir ülke için “Başka bir ülke”yi seçin; neredeyse her yerde geçerli kurallar uygulanır." },
      ],
    },
    marketRules: {
      sponsored: { name: "Sponsorlu ya da ücretli tanıtım", why: "Türkiye'de klinikler ve diş hekimleri ücretli, sponsorlu ya da öne çıkarılmış tanıtım yapamaz.", tip: "Kendi hesabınızdan, ücretli öne çıkarma ve sponsor etiketi olmadan paylaşın." },
      engagement: { name: "Beğeni ya da yorum isteme", why: "Yönetmeliğe göre görsel paylaşımlar beğeni, yorum ya da paylaşım istemez.", tip: "Paylaşımı bir bilgiyle bitirin; beğeni, yorum ya da paylaşım istemeyin." },
      giveaway: { name: "Çekiliş ya da ödül", why: "Sağlık hizmetini tanıtmak için çekiliş, yarışma ya da hediye kullanılamaz.", tip: "Bu kısmı çıkarın; yerine işe yarar bir bilgi paylaşın." },
      booking: { name: "Randevuya yönlendirme", why: "Türkiye'de kliniğin paylaşımı bilgilendirebilir, ama izleyeni randevu almaya ya da kliniğe ulaşmaya yönlendiremez.", tip: "İzleyeni bir sonraki kontrolünde kendi diş hekimine yönlendirin." },
      specialist: { name: "Uzmanlık iddiası", why: "Uzman unvanı yalnızca tanınmış bir uzmanlık belgesi ya da kuralların istediği yeterlilik varsa kullanılabilir.", tip: "Unvanı yalnızca sahipseniz yazın; değilse sunduğunuz tedavileri anlatın." },
      children: { name: "Çocuklara hitap", why: "Almanya'da esas olarak 14 yaş altı çocuklara yönelik tedavi reklamı yasaktır.", tip: "Bunun yerine ebeveynlere seslenin." },
      pom: { name: "Reçeteli ilaç", why: "Birleşik Krallık'ta botulinum toksini gibi reçeteli ilaçların halka reklamı yapılamaz.", tip: "İlaçtan değil, muayene ve görüşmeden söz edin." },
      permit: { name: "COFEPRIS izin numarası", why: "Meksika'da COFEPRIS izin ya da bildirim numarasını yalnızca o izne sahip klinik yazabilir.", tip: "Numarayı yalnızca kliniğiniz bu izne sahipse yazın." },
    },
  },

  de: {
    market: { label: "Land", other: "Anderes Land (allgemeine Regeln)", hint: "Die Regeln unterscheiden sich je nach Land. Wählen Sie Ihres, um zu sehen, was die amtlichen Texte ausdrücklich untersagen." },
    examples: {
      label: "Beispiel ausprobieren",
      promo: "Werbe-Post",
      items: [
        { label: "Implantat-Post", text: "Ihr Implantatspezialist in München. Feste Zähne, die lebenslang halten. Ein Implantat ersetzt die Wurzel eines fehlenden Zahns. Jetzt Termin vereinbaren!" },
        { label: "Sachlicher Post", text: "Zahnfleischbluten beim Putzen? Das ist oft ein frühes Zeichen einer Zahnfleischentzündung. Sanftes Putzen am Zahnfleischrand und die Reinigung der Zahnzwischenräume können helfen. Hält es an, sprechen Sie es bei Ihrer nächsten Kontrolle an." },
      ],
    },
    verdicts: { ok: "Unbedenklich", risky: "Riskant", banned: "Nicht erlaubt · {market}" },
    summary: "Unbedenklich: {ok} · Riskant: {risky} · Nicht erlaubt: {banned}",
    bySentence: "Satz für Satz",
    saferSentence: "Sicherer formuliert",
    source: "Amtliche Quelle",
    noSource: "Wählen Sie oben Ihr Land, um die amtliche Quelle zu sehen.",
    shared: "Über einen geteilten Link geöffnet. Der Text kam im Link mit und wurde hier in Ihrem Browser geprüft.",
    share: {
      copy: "Link zu dieser Prüfung kopieren",
      copied: "Link kopiert",
      image: "Ergebnis als Bild speichern",
      making: "Bild wird erstellt…",
      failed: "Das hat in diesem Browser nicht geklappt. Markieren Sie die Adresszeile und kopieren Sie sie dort.",
      note: "Der Text steckt im Link hinter dem #, er erreicht unseren Server nie.",
    },
    bridge: { text: "DentVideo schreibt jedes Patientenvideo mit genau diesen Prüfungen, und nichts erscheint ohne Ihre Freigabe.", link: "Mit Ihrem Logo ansehen" },
    disclaimer: "Ein sorgfältiger Filter, keine Rechtsberatung.",
    cardTitle: "Werbe-Check",
    page: {
      how: "Wählen Sie ein Land, und jeder Satz bekommt eine Einstufung: unbedenklich, riskant oder nicht erlaubt. „Nicht erlaubt“ steht nur dort, wo der amtliche Text dieses Landes eine solche Aussage ausdrücklich nennt, und jede markierte Formulierung verweist auf diesen Text. Was die Regeln sonst häufig beanstanden, wird als riskant markiert.",
      faq: [
        { q: "Kann ich eine Prüfung an Kollegen oder unsere Agentur schicken?", a: "Ja. „Link zu dieser Prüfung kopieren“ legt Ihren Text und Ihr Land in den Link, hinter das #. Browser senden diesen Teil nie an einen Server: Der Text geht von Ihrem Gerät auf das der anderen Person und wird dort im Browser erneut geprüft. „Ergebnis als Bild speichern“ zeichnet eine Übersicht auf Ihrem Gerät." },
        { q: "Welche Länder kennt der Check?", a: "Deutschland, Österreich, die Schweiz, die USA, das Vereinigte Königreich, die Türkei, Spanien, Mexiko, Frankreich, Polen, Japan, die Vereinigten Arabischen Emirate und Saudi-Arabien, jeweils mit ihren amtlichen Texten. Für ein anderes Land wählen Sie „Anderes Land“: Dann laufen die Regeln, die fast überall gelten." },
      ],
    },
    marketRules: {
      sponsored: { name: "Gesponserte oder bezahlte Werbung", why: "In der Türkei dürfen Praxen und Zahnärzte keine bezahlte, gesponserte oder hervorgehobene Werbung schalten.", tip: "Posten Sie vom eigenen Konto, ohne bezahlte Reichweite oder Sponsor-Hinweis." },
      engagement: { name: "Aufruf zu Likes oder Kommentaren", why: "Nach den türkischen Regeln darf ein Bildbeitrag nicht zu Likes, Kommentaren oder Teilen auffordern.", tip: "Schließen Sie mit einer Information, nicht mit einer Bitte um Likes oder Kommentare." },
      giveaway: { name: "Gewinnspiel oder Preis", why: "In der Türkei dürfen Gewinnspiele, Verlosungen und Geschenke nicht für Gesundheitsleistungen werben.", tip: "Streichen Sie diesen Teil und teilen Sie stattdessen etwas Nützliches." },
      booking: { name: "Lenkung zur Terminbuchung", why: "In der Türkei darf ein Praxisbeitrag informieren, aber nicht zur Buchung oder Kontaktaufnahme mit der Praxis lenken.", tip: "Verweisen Sie auf die eigene Zahnärztin oder den eigenen Zahnarzt beim nächsten Termin." },
      specialist: { name: "Spezialisten-Angabe", why: "„Spezialist“ setzt einen anerkannten Titel oder die nachgewiesene Qualifikation voraus, die die Berufsordnung verlangt (MBO-Z § 21, ZÄG § 35, MedBG Art. 40).", tip: "Nennen Sie den Titel nur, wenn Sie ihn führen; sonst beschreiben Sie Ihre Behandlungen." },
      children: { name: "Ansprache von Kindern", why: "Werbung für Behandlungen, die sich vorwiegend an Kinder unter 14 Jahren richtet, ist nicht erlaubt (§ 11 Abs. 1 S. 1 Nr. 12 HWG).", tip: "Sprechen Sie stattdessen die Eltern an." },
      pom: { name: "Verschreibungspflichtiges Arzneimittel", why: "Im Vereinigten Königreich dürfen verschreibungspflichtige Arzneimittel wie Botulinumtoxin nicht öffentlich beworben werden.", tip: "Sprechen Sie über die Beratung, nicht über das Arzneimittel." },
      permit: { name: "COFEPRIS-Genehmigungsnummer", why: "In Mexiko darf nur die Praxis, die eine COFEPRIS-Genehmigung hält, deren Nummer angeben.", tip: "Nennen Sie die Nummer nur, wenn Ihre Praxis die Genehmigung hat." },
    },
  },

  es: {
    market: { label: "País", other: "Otro país (normas generales)", hint: "Las normas cambian de un país a otro. Elige el tuyo para ver lo que sus textos oficiales prohíben expresamente." },
    examples: {
      label: "Prueba un ejemplo",
      promo: "Publicación promocional",
      items: [
        { label: "Publicación de implantes", text: "Dientes fijos en un solo día. Implantes para toda la vida. Un implante sustituye la raíz de un diente que falta. ¡Pide tu cita, plazas limitadas!" },
        { label: "Publicación informativa", text: "¿Te sangran las encías al cepillarte? Suele ser una señal temprana de inflamación de las encías. Cepillar con suavidad el borde de la encía y limpiar entre los dientes puede ayudar. Si sigue pasando, coméntalo en tu próxima revisión." },
      ],
    },
    verdicts: { ok: "Bien", risky: "Arriesgado", banned: "No permitido · {market}" },
    summary: "Bien: {ok} · Arriesgado: {risky} · No permitido: {banned}",
    bySentence: "Frase por frase",
    saferSentence: "Frase más segura",
    source: "Fuente oficial",
    noSource: "Elige tu país arriba para ver su fuente oficial.",
    shared: "Abierto desde un enlace compartido. El texto venía dentro del enlace y se ha comprobado aquí, en tu navegador.",
    share: {
      copy: "Copiar enlace a esta comprobación",
      copied: "Enlace copiado",
      image: "Guardar el resultado como imagen",
      making: "Creando la imagen…",
      failed: "No ha funcionado en este navegador. Selecciona la barra de direcciones y cópiala desde ahí.",
      note: "El texto viaja dentro del enlace, después del #, así que nunca llega a nuestro servidor.",
    },
    bridge: { text: "DentVideo escribe cada vídeo para pacientes con estas comprobaciones incluidas, y nada se publica sin tu aprobación.", link: "Míralo con tu logo" },
    disclaimer: "Un filtro cuidadoso, no asesoramiento jurídico.",
    cardTitle: "Comprobación de publicidad",
    page: {
      how: "Elige un país y cada frase recibe un resultado: bien, arriesgado o no permitido. «No permitido» solo aparece cuando el texto oficial de ese país menciona ese tipo de afirmación, y cada expresión marcada enlaza al texto del que sale. Lo demás que las normas suelen objetar se marca como arriesgado.",
      faq: [
        { q: "¿Puedo enviar una comprobación a un colega o a mi agencia?", a: "Sí. «Copiar enlace a esta comprobación» guarda tu texto y tu país dentro del enlace, después del #. Los navegadores nunca envían esa parte a un servidor, así que el texto va de tu dispositivo al suyo y se comprueba de nuevo en su navegador. «Guardar el resultado como imagen» dibuja una tarjeta resumen en tu dispositivo." },
        { q: "¿Qué países conoce?", a: "España, México, Estados Unidos, Reino Unido, Turquía, Alemania, Austria, Suiza, Francia, Polonia, Japón, Emiratos Árabes Unidos y Arabia Saudí, cada uno con sus textos oficiales. Para otro país, elige «Otro país» y se aplican las normas que valen casi en todas partes." },
      ],
    },
    marketRules: {
      sponsored: { name: "Promoción patrocinada o de pago", why: "En Turquía, las clínicas y los dentistas no pueden usar promoción de pago, patrocinada ni impulsada.", tip: "Publica desde tu propia cuenta, sin pagar por más alcance y sin etiqueta de patrocinio." },
      engagement: { name: "Pedir «me gusta» o comentarios", why: "Las normas turcas indican que una publicación visual no debe pedir «me gusta», comentarios ni que se comparta.", tip: "Termina con información, no pidiendo «me gusta», comentarios o que se comparta." },
      giveaway: { name: "Sorteo o premio", why: "En Turquía no se pueden usar sorteos, concursos ni regalos para promocionar servicios de salud.", tip: "Quita esa parte y comparte algo útil en su lugar." },
      booking: { name: "Empujar a pedir cita", why: "En Turquía una publicación de la clínica puede informar, pero no dirigir al público a pedir cita ni a contactar con la clínica.", tip: "Remite a cada persona a su propio dentista en su próxima visita." },
      specialist: { name: "Decir que se es especialista", why: "Solo puede llamarse especialista quien tiene un título de especialista reconocido o la cualificación que exigen las normas.", tip: "Indica el título solo si lo tienes; si no, describe los tratamientos que ofreces." },
      children: { name: "Dirigirse a niños", why: "En Alemania no se permite la publicidad de tratamientos dirigida principalmente a menores de 14 años.", tip: "Dirígete a los padres." },
      pom: { name: "Medicamento con receta", why: "En el Reino Unido no se pueden anunciar al público medicamentos con receta como la toxina botulínica.", tip: "Habla de la consulta, no del medicamento." },
      permit: { name: "Número de permiso COFEPRIS", why: "En México, solo la clínica que tiene un permiso o aviso de COFEPRIS puede mostrar su número.", tip: "Muestra el número solo si tu clínica tiene ese permiso." },
    },
  },

  fr: {
    market: { label: "Pays", other: "Autre pays (règles générales)", hint: "Les règles changent d'un pays à l'autre. Choisissez le vôtre pour voir ce que ses textes officiels excluent expressément." },
    examples: {
      label: "Essayer un exemple",
      promo: "Publication promotionnelle",
      items: [
        { label: "Publication implants", text: "Des dents fixes en une journée. Des implants solides à vie. Un implant remplace la racine d'une dent absente. Découvrez les témoignages de nos patients." },
        { label: "Publication informative", text: "Vos gencives saignent au brossage ? C'est souvent un premier signe d'inflammation des gencives. Un brossage doux le long de la gencive et le nettoyage entre les dents peuvent aider. Si cela continue, parlez-en lors de votre prochain contrôle." },
      ],
    },
    verdicts: { ok: "Correct", risky: "Risqué", banned: "Exclu · {market}" },
    summary: "Correct : {ok} · Risqué : {risky} · Exclu : {banned}",
    bySentence: "Phrase par phrase",
    saferSentence: "Formulation plus sûre",
    source: "Source officielle",
    noSource: "Choisissez votre pays ci-dessus pour voir sa source officielle.",
    shared: "Ouvert depuis un lien partagé. Le texte était dans le lien et a été vérifié ici, dans votre navigateur.",
    share: {
      copy: "Copier le lien de cette vérification",
      copied: "Lien copié",
      image: "Enregistrer le résultat en image",
      making: "Création de l'image…",
      failed: "Cela n'a pas fonctionné dans ce navigateur. Sélectionnez la barre d'adresse et copiez-la.",
      note: "Le texte voyage dans le lien, après le #, et n'atteint donc jamais notre serveur.",
    },
    bridge: { text: "DentVideo écrit chaque vidéo patient avec ces vérifications intégrées, et rien n'est publié sans votre accord.", link: "Voir avec votre logo" },
    disclaimer: "Un filtre attentif, pas un avis juridique.",
    cardTitle: "Vérification de communication",
    page: {
      how: "Choisissez un pays et chaque phrase reçoit un résultat : correct, risqué ou exclu. « Exclu » n'apparaît que lorsque le texte officiel de ce pays vise expressément ce type d'affirmation, et chaque expression signalée renvoie au texte d'où elle vient. Le reste de ce que les règles reprochent souvent est signalé comme risqué.",
      faq: [
        { q: "Puis-je envoyer une vérification à un confrère ou à mon agence ?", a: "Oui. « Copier le lien de cette vérification » place votre texte et votre pays dans le lien, après le #. Les navigateurs n'envoient jamais cette partie à un serveur : le texte passe de votre appareil au sien et y est vérifié à nouveau. « Enregistrer le résultat en image » dessine une carte de synthèse sur votre appareil." },
        { q: "Quels pays l'outil connaît-il ?", a: "La France, les États-Unis, le Royaume-Uni, la Turquie, l'Allemagne, l'Autriche, la Suisse, l'Espagne, le Mexique, la Pologne, le Japon, les Émirats arabes unis et l'Arabie saoudite, chacun avec ses textes officiels. Pour un autre pays, choisissez « Autre pays » : les règles valables presque partout s'appliquent." },
      ],
    },
    marketRules: {
      sponsored: { name: "Promotion sponsorisée ou payante", why: "En Turquie, les cabinets et les dentistes ne peuvent pas recourir à une promotion payante, sponsorisée ou boostée.", tip: "Publiez depuis votre propre compte, sans mise en avant payante ni mention de sponsor." },
      engagement: { name: "Demander des « j'aime » ou des commentaires", why: "Selon les règles turques, une publication visuelle ne doit pas inviter à aimer, commenter ou partager.", tip: "Terminez par une information, pas par une demande de « j'aime », de commentaires ou de partages." },
      giveaway: { name: "Tirage au sort ou cadeau", why: "En Turquie, tirages au sort, concours et cadeaux ne peuvent pas servir à promouvoir des soins.", tip: "Retirez le tirage au sort et partagez plutôt une information utile." },
      booking: { name: "Pousser à prendre rendez-vous", why: "En Turquie, une publication de cabinet peut informer, mais pas orienter vers une prise de rendez-vous ou un contact avec le cabinet.", tip: "Renvoyez chacun vers son propre dentiste lors de sa prochaine visite." },
      specialist: { name: "Se dire spécialiste", why: "Seul un praticien titulaire d'un titre de spécialiste reconnu, ou de la qualification exigée par les règles, peut se dire spécialiste.", tip: "Mentionnez le titre seulement si vous le détenez ; sinon, décrivez les soins proposés." },
      children: { name: "S'adresser aux enfants", why: "En Allemagne, la publicité pour des soins visant principalement les enfants de moins de 14 ans n'est pas autorisée.", tip: "Adressez-vous plutôt aux parents." },
      pom: { name: "Médicament sur ordonnance", why: "Au Royaume-Uni, les médicaments sur ordonnance comme la toxine botulique ne peuvent pas faire l'objet de publicité auprès du public.", tip: "Parlez de la consultation, pas du médicament." },
      permit: { name: "Numéro d'autorisation COFEPRIS", why: "Au Mexique, seul le cabinet titulaire d'une autorisation ou d'un avis COFEPRIS peut en afficher le numéro.", tip: "Affichez le numéro seulement si votre cabinet détient cette autorisation." },
    },
  },

  ja: {
    market: { label: "国・地域", other: "その他の国（一般的なルール）", hint: "ルールは国ごとに異なります。国を選ぶと、公的な文書が明示的に禁じている表現がわかります。" },
    examples: {
      label: "例文を試す",
      promo: "キャンペーン投稿",
      items: [
        { label: "インプラントの投稿", text: "当院のインプラントは一生もの。インプラントは、失った歯の根の代わりになる人工の歯根です。今すぐご予約ください。" },
        { label: "落ち着いた情報提供の投稿", text: "歯みがきのときに歯ぐきから血が出ることはありませんか。歯肉炎の初期のサインであることが多いです。歯と歯ぐきの境目をやさしくみがき、歯と歯の間も清掃すると改善に役立ちます。続く場合は、次の定期検診で歯科医師にご相談ください。" },
      ],
    },
    verdicts: { ok: "問題なし", risky: "要注意", banned: "不可（{market}）" },
    summary: "問題なし：{ok}・要注意：{risky}・不可：{banned}",
    bySentence: "文ごとの結果",
    saferSentence: "より安全な言い方",
    source: "公的な出典",
    noSource: "上で国を選ぶと、公的な出典が表示されます。",
    shared: "共有リンクから開きました。テキストはリンクの中に含まれており、このブラウザ内でチェックしました。",
    share: {
      copy: "このチェックのリンクをコピー",
      copied: "リンクをコピーしました",
      image: "結果を画像で保存",
      making: "画像を作成しています…",
      failed: "このブラウザではうまくいきませんでした。アドレスバーを選択してコピーしてください。",
      note: "テキストはリンクの「#」の後ろに含まれるため、当社のサーバーには届きません。",
    },
    bridge: { text: "DentVideoは、すべての患者向け動画をこのチェックを組み込んだうえで作成し、医院の承認なしに公開することはありません。", link: "医院のロゴで見てみる" },
    disclaimer: "慎重なフィルターであり、法的助言ではありません。",
    cardTitle: "広告表現チェック",
    page: {
      how: "国を選ぶと、文ごとに「問題なし」「要注意」「不可」の判定が付きます。「不可」は、その国の公的な文書がその種の表現を明示している場合にだけ表示し、指摘した表現ごとに根拠となる文書へのリンクを示します。それ以外で、ルール上よく問題になる表現は「要注意」として示します。",
      faq: [
        { q: "チェック結果を同僚や制作会社に送れますか？", a: "はい。「このチェックのリンクをコピー」を押すと、テキストと国がリンクの「#」の後ろに入ります。ブラウザはこの部分をサーバーに送らないため、テキストはあなたの端末から相手の端末へ渡り、相手のブラウザで改めてチェックされます。「結果を画像で保存」は、要約の画像をあなたの端末で作成します。" },
        { q: "どの国に対応していますか？", a: "日本、米国、英国、トルコ、ドイツ、オーストリア、スイス、スペイン、メキシコ、フランス、ポーランド、アラブ首長国連邦、サウジアラビアに、それぞれの公的な文書とともに対応しています。その他の国は「その他の国」を選ぶと、ほぼどこでも当てはまるルールでチェックします。" },
      ],
    },
    marketRules: {
      sponsored: { name: "スポンサー・有料の宣伝", why: "トルコでは、医院や歯科医師は有料・スポンサー付き・ブーストした宣伝を行えません。", tip: "自院のアカウントから、有料の拡散やスポンサー表示なしで投稿してください。" },
      engagement: { name: "いいね・コメントの呼びかけ", why: "トルコのルールでは、画像や動画の投稿で「いいね」やコメント、シェアを呼びかけてはいけません。", tip: "呼びかけではなく、情報で締めくくってください。" },
      giveaway: { name: "抽選・景品", why: "トルコでは、抽選や懸賞、プレゼントを医療サービスの宣伝に使えません。", tip: "抽選はやめ、役に立つ情報を伝えてください。" },
      booking: { name: "予約への誘導", why: "トルコでは、医院の投稿は情報提供はできても、予約や医院への問い合わせに誘導してはいけません。", tip: "次の受診時にかかりつけの歯科医師に相談するよう案内してください。" },
      specialist: { name: "専門医の表示", why: "専門医と名乗れるのは、認められた専門医の資格、またはルールが求める資格を持つ歯科医師だけです。", tip: "資格がある場合のみ記載し、ない場合は行っている診療内容を説明してください。" },
      children: { name: "子どもへの呼びかけ", why: "ドイツでは、主に14歳未満の子どもに向けた治療の広告は認められていません。", tip: "保護者に向けて伝えてください。" },
      pom: { name: "処方薬", why: "英国では、ボツリヌス毒素などの処方薬を一般向けに広告することはできません。", tip: "薬ではなく、相談・診察について伝えてください。" },
      permit: { name: "COFEPRISの許可番号", why: "メキシコでは、COFEPRISの許可・届出番号を記載できるのは、その許可を持つ医院だけです。", tip: "医院がその許可を持っている場合のみ記載してください。" },
    },
  },

  ar: {
    market: { label: "الدولة", other: "دولة أخرى (قواعد عامة)", hint: "تختلف القواعد من دولة لأخرى. اختاروا دولتكم لتروا ما تنص نصوصها الرسمية صراحةً على منعه." },
    examples: {
      label: "جرّبوا مثالاً",
      promo: "منشور ترويجي",
      items: [
        { label: "منشور عن الزراعة", text: "زراعة أسنان تدوم مدى الحياة. الزرعة جذر صناعي يحل محل جذر السن المفقود. أفضل عيادة أسنان في دبي. احجز الآن!" },
        { label: "منشور توعوي هادئ", text: "هل تنزف لثتك عند تنظيف أسنانك بالفرشاة؟ غالباً ما يكون ذلك علامة مبكرة على التهاب اللثة. قد يساعد التنظيف اللطيف عند حافة اللثة وتنظيف ما بين الأسنان. إذا استمر النزيف، فاذكره لطبيب الأسنان في زيارتك القادمة." },
      ],
    },
    verdicts: { ok: "مقبول", risky: "فيه مخاطرة", banned: "غير مسموح · {market}" },
    summary: "مقبول: {ok} · فيه مخاطرة: {risky} · غير مسموح: {banned}",
    bySentence: "جملةً جملة",
    saferSentence: "صياغة أكثر أماناً",
    source: "المصدر الرسمي",
    noSource: "اختاروا دولتكم في الأعلى لعرض مصدرها الرسمي.",
    shared: "فُتحت هذه الصفحة من رابط مشترك. جاء النص داخل الرابط وفُحص هنا في متصفحكم.",
    share: {
      copy: "نسخ رابط هذا الفحص",
      copied: "تم نسخ الرابط",
      image: "حفظ النتيجة كصورة",
      making: "جارٍ إعداد الصورة…",
      failed: "لم ينجح ذلك في هذا المتصفح. حدّدوا شريط العنوان وانسخوه منه.",
      note: "ينتقل النص داخل الرابط بعد علامة #، لذلك لا يصل إلى خادمنا أبداً.",
    },
    bridge: { text: "تكتب DentVideo كل فيديو للمرضى وهذه الفحوص مدمجة فيه، ولا يُنشر شيء دون موافقتكم.", link: "شاهدوه بشعار عيادتكم" },
    disclaimer: "مرشِّح دقيق، وليس استشارة قانونية.",
    cardTitle: "فحص الإعلان",
    page: {
      how: "اختاروا دولة فيحصل كل سطر على حكم: مقبول، أو فيه مخاطرة، أو غير مسموح. لا نستخدم «غير مسموح» إلا حين ينص النص الرسمي لتلك الدولة على هذا النوع من العبارات، وكل عبارة مميَّزة مرتبطة بالنص الذي تستند إليه. وما سوى ذلك مما تعترض عليه القواعد عادةً يُعلَّم بأنه فيه مخاطرة.",
      faq: [
        { q: "هل يمكنني إرسال الفحص إلى زميل أو إلى وكالة التسويق؟", a: "نعم. يضع زر «نسخ رابط هذا الفحص» نصكم ودولتكم داخل الرابط بعد علامة #. لا ترسل المتصفحات هذا الجزء إلى أي خادم، فينتقل النص من جهازكم إلى جهازهم ويُفحص من جديد في متصفحهم. أما «حفظ النتيجة كصورة» فيرسم بطاقة ملخصة على جهازكم." },
        { q: "ما الدول التي تعرفها الأداة؟", a: "الإمارات العربية المتحدة، والسعودية، والولايات المتحدة، والمملكة المتحدة، وتركيا، وألمانيا، والنمسا، وسويسرا، وإسبانيا، والمكسيك، وفرنسا، وبولندا، واليابان، ولكل منها نصوصها الرسمية. ولأي دولة أخرى اختاروا «دولة أخرى» لتطبيق القواعد المعمول بها في كل مكان تقريباً." },
      ],
    },
    marketRules: {
      sponsored: { name: "ترويج مموَّل أو مدفوع", why: "في تركيا لا يجوز للعيادات وأطباء الأسنان استخدام الترويج المدفوع أو المموَّل أو المعزَّز.", tip: "انشروا من حسابكم دون ترويج مدفوع أو وسم رعاية." },
      engagement: { name: "طلب الإعجاب أو التعليق", why: "تنص القواعد التركية على ألا يدعو المنشور المرئي إلى الإعجاب أو التعليق أو إعادة النشر.", tip: "اختموا بمعلومة، لا بطلب إعجاب أو تعليق أو مشاركة." },
      giveaway: { name: "سحب أو جائزة", why: "في تركيا لا يجوز استخدام السحوبات والمسابقات والهدايا للترويج للخدمات الصحية.", tip: "احذفوا السحب وشاركوا معلومة مفيدة بدلاً منه." },
      booking: { name: "التوجيه إلى الحجز", why: "في تركيا يجوز لمنشور العيادة أن يُعلِم، لكن لا يجوز أن يوجّه المشاهد إلى الحجز أو التواصل مع العيادة.", tip: "وجّهوا المشاهد إلى طبيب أسنانه في زيارته القادمة." },
      specialist: { name: "ادعاء التخصص", why: "لا يُوصف بالاختصاصي إلا من يحمل لقب اختصاص معترفاً به أو المؤهل الذي تشترطه القواعد.", tip: "اذكروا اللقب فقط إن كنتم تحملونه، وإلا فصفوا العلاجات التي تقدمونها." },
      children: { name: "مخاطبة الأطفال", why: "في ألمانيا لا يُسمح بالإعلان عن علاجات موجّهة أساساً إلى الأطفال دون 14 عاماً.", tip: "خاطبوا الوالدين بدلاً من ذلك." },
      pom: { name: "دواء بوصفة طبية", why: "في المملكة المتحدة لا يجوز الإعلان للجمهور عن أدوية تُصرف بوصفة طبية مثل توكسين البوتولينوم.", tip: "تحدّثوا عن الاستشارة لا عن الدواء." },
      permit: { name: "رقم ترخيص COFEPRIS", why: "في المكسيك لا يذكر رقم ترخيص أو إشعار COFEPRIS إلا العيادة الحاصلة عليه.", tip: "اذكروا الرقم فقط إن كانت عيادتكم حاصلة على هذا الترخيص." },
    },
  },

  pl: {
    market: { label: "Kraj", other: "Inny kraj (zasady ogólne)", hint: "Zasady różnią się w zależności od kraju. Wybierz swój, aby zobaczyć, czego jego oficjalne teksty wprost zabraniają." },
    examples: {
      label: "Wypróbuj przykład",
      promo: "Post promocyjny",
      items: [
        { label: "Post o implantach", text: "Najlepszy gabinet implantologiczny w mieście. Implanty na całe życie. Implant zastępuje korzeń brakującego zęba. Umów wizytę już dziś, liczba miejsc ograniczona!" },
        { label: "Spokojny post informacyjny", text: "Krwawią Ci dziąsła podczas szczotkowania? To często wczesny objaw zapalenia dziąseł. Delikatne szczotkowanie przy linii dziąseł i czyszczenie przestrzeni między zębami mogą pomóc. Jeśli to się powtarza, powiedz o tym dentyście podczas następnej wizyty kontrolnej." },
      ],
    },
    verdicts: { ok: "W porządku", risky: "Ryzykowne", banned: "Niedozwolone · {market}" },
    summary: "W porządku: {ok} · Ryzykowne: {risky} · Niedozwolone: {banned}",
    bySentence: "Zdanie po zdaniu",
    saferSentence: "Bezpieczniejsze zdanie",
    source: "Oficjalne źródło",
    noSource: "Wybierz kraj powyżej, aby zobaczyć jego oficjalne źródło.",
    shared: "Otwarto z udostępnionego linku. Tekst był zapisany w linku i został sprawdzony tutaj, w Twojej przeglądarce.",
    share: {
      copy: "Kopiuj link do tego sprawdzenia",
      copied: "Link skopiowany",
      image: "Zapisz wynik jako obraz",
      making: "Tworzenie obrazu…",
      failed: "W tej przeglądarce się nie udało. Zaznacz pasek adresu i skopiuj go stamtąd.",
      note: "Tekst jest zapisany w linku po znaku #, więc nigdy nie trafia na nasz serwer.",
    },
    bridge: { text: "DentVideo pisze każdy film dla pacjentów z tymi kontrolami wbudowanymi, a nic nie jest publikowane bez Twojej zgody.", link: "Zobacz z logo gabinetu" },
    disclaimer: "Staranny filtr, nie porada prawna.",
    cardTitle: "Sprawdzenie reklamy",
    page: {
      how: "Wybierz kraj, a każde zdanie dostanie ocenę: w porządku, ryzykowne albo niedozwolone. „Niedozwolone” pojawia się tylko tam, gdzie oficjalny tekst danego kraju wprost wymienia taki rodzaj twierdzenia, a każde zaznaczone sformułowanie prowadzi do tego tekstu. Pozostałe sformułowania, do których przepisy często mają zastrzeżenia, są oznaczone jako ryzykowne.",
      faq: [
        { q: "Czy mogę wysłać sprawdzenie koledze albo agencji?", a: "Tak. „Kopiuj link do tego sprawdzenia” zapisuje tekst i kraj w linku, po znaku #. Przeglądarki nigdy nie wysyłają tej części na serwer, więc tekst trafia z Twojego urządzenia na urządzenie odbiorcy i jest tam sprawdzany ponownie. „Zapisz wynik jako obraz” tworzy kartę z podsumowaniem na Twoim urządzeniu." },
        { q: "Jakie kraje zna sprawdzarka?", a: "Polskę, Stany Zjednoczone, Wielką Brytanię, Turcję, Niemcy, Austrię, Szwajcarię, Hiszpanię, Meksyk, Francję, Japonię, Zjednoczone Emiraty Arabskie i Arabię Saudyjską, każdy z jego oficjalnymi tekstami. Dla innego kraju wybierz „Inny kraj”: działają wtedy zasady obowiązujące niemal wszędzie." },
      ],
    },
    marketRules: {
      sponsored: { name: "Promocja sponsorowana lub płatna", why: "W Turcji gabinety i dentyści nie mogą korzystać z płatnej, sponsorowanej ani promowanej reklamy.", tip: "Publikuj z własnego konta, bez płatnego zwiększania zasięgu i oznaczenia sponsora." },
      engagement: { name: "Prośba o polubienia lub komentarze", why: "Według zasad tureckich post wizualny nie może zachęcać do polubień, komentarzy ani udostępnień.", tip: "Zakończ informacją, a nie prośbą o polubienie, komentarz czy udostępnienie." },
      giveaway: { name: "Losowanie lub nagroda", why: "W Turcji losowania, konkursy i prezenty nie mogą służyć promocji usług zdrowotnych.", tip: "Usuń losowanie i podziel się czymś przydatnym." },
      booking: { name: "Nakłanianie do rezerwacji", why: "W Turcji post gabinetu może informować, ale nie może kierować odbiorców do rezerwacji ani kontaktu z gabinetem.", tip: "Odeślij odbiorców do ich własnego dentysty przy następnej wizycie." },
      specialist: { name: "Określenie „specjalista”", why: "Specjalistą może się nazywać tylko lekarz dentysta z uznanym tytułem specjalisty lub kwalifikacjami, których wymagają przepisy.", tip: "Podaj tytuł tylko wtedy, gdy go posiadasz; w przeciwnym razie opisz wykonywane zabiegi." },
      children: { name: "Zwracanie się do dzieci", why: "W Niemczech reklama zabiegów skierowana głównie do dzieci poniżej 14 lat jest niedozwolona.", tip: "Zwróć się do rodziców." },
      pom: { name: "Lek na receptę", why: "W Wielkiej Brytanii nie wolno reklamować publicznie leków na receptę, takich jak toksyna botulinowa.", tip: "Mów o konsultacji, a nie o leku." },
      permit: { name: "Numer zezwolenia COFEPRIS", why: "W Meksyku numer zezwolenia lub zgłoszenia COFEPRIS może podać tylko gabinet, który je posiada.", tip: "Podaj numer tylko wtedy, gdy gabinet ma takie zezwolenie." },
    },
  },
};
