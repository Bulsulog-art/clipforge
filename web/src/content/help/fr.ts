import type { HelpContent } from "./types";

export const fr: HelpContent = {
  meta: {
    title: "Centre d'aide DentVideo : réponses pour les cabinets",
    description: "Réponses pas à pas pour les cabinets sous DentVideo : premières vidéos, validation, publication, réglages, enregistrements, paiement, factures, données.",
  },
  nav: "Aide",
  h1: "Comment pouvons-nous vous aider ?",
  lead: "Des réponses courtes pour les cabinets qui utilisent DentVideo, de la première semaine de vidéos aux factures et à vos données. Cherchez, ou choisissez un thème.",
  search: {
    label: "Rechercher dans le centre d'aide",
    placeholder: "Par exemple : résilier, facture, valider",
    none: "Aucune réponse ne correspond à cette recherche. Essayez un autre mot, ou écrivez-nous.",
    count: { one: "1 réponse", other: "{n} réponses" },
  },
  topics: "Thèmes",
  categories: {
    start: "Premiers pas",
    review: "Relecture et validation",
    posting: "Publier vos vidéos",
    settings: "Les vidéos de votre cabinet",
    recording: "Vous filmer vous-même",
    billing: "Formule, paiement et factures",
    account: "Données, confidentialité et compte",
  },
  readMore: "Pour en savoir plus :",
  shots: {
    setup: "Réglages : les informations du cabinet, le logo et la couleur.",
    week: "Vidéos : les vidéos de la semaine attendent votre validation.",
    card: "Une vidéo marquée « À revoir », avec ce qu'il faut vérifier avant de publier.",
  },
  stuck: {
    title: "Toujours bloqué ?",
    body: "Écrivez à {email}. Chaque message est lu par une personne. Si vous écrivez depuis l'application (Réglages → Aide et contact), l'identifiant de votre cabinet est déjà indiqué et nous retrouvons votre compte tout de suite.",
  },
  articles: {
    "first-videos": {
      q: "Quand mes premières vidéos arrivent-elles ?",
      a: "Les vidéos de votre première semaine sont créées juste après le paiement, en général en 15 minutes environ. La page Vidéos se met à jour toute seule, et nous vous envoyons un e-mail dès qu'elles sont prêtes pour votre relecture.\n\nEnsuite, cinq nouvelles vidéos arrivent chaque lundi, avec un e-mail à chaque fois.",
    },
    "no-videos-this-week": {
      q: "Les vidéos de la semaine ne sont pas encore là. Que faire ?",
      a: "Les nouvelles vidéos sont créées chaque lundi. Si celles de la semaine ne sont pas encore dans votre bibliothèque, touchez « Créer les vidéos de la semaine » sur la page Vidéos. Cela prend environ 15 minutes.\n\nSi la page indique que les vidéos sont en retard, nous réessayons déjà et vous écrirons dès qu'elles sont prêtes. Vous pouvez aussi toucher « Réessayer maintenant ».\n\nUne vidéo marquée « N'a pas pu être créée » ne demande rien de votre part. Si cela se reproduit, écrivez-nous.",
    },
    topics: {
      q: "Comment les sujets sont-ils choisis, et puis-je en proposer un ?",
      a: "Chaque semaine, nous choisissons cinq sujets à partir des soins indiqués dans vos réglages et des questions que les patients se posent à leur sujet. Les vidéos ne portent que sur des soins que vous proposez : une liste complète et juste est donc ce qui compte le plus.\n\nPour proposer un sujet, utilisez « Proposer un sujet pour la semaine prochaine » sur la page Vidéos ou dans les Réglages : une question de patient ou un sujet, 140 caractères au plus. Nous utilisons d'abord les propositions en attente, jusqu'à trois par semaine, lorsqu'elles correspondent à vos soins et passent les mêmes vérifications cliniques et publicitaires que chaque vidéo. Sous « Vos propositions », vous voyez ce qu'il est advenu de chacune ; une proposition non réalisée indique la raison. Sous « Sujets que nous n'avons pas créés », vous voyez les autres sujets écartés.",

    },
    "sign-in": {
      q: "Je n'arrive pas à me connecter, ou le code n'arrive pas.",
      a: "Cherchez dans vos courriers indésirables ou l'onglet Promotions un e-mail de {email} et marquez-le comme « non indésirable », pour que les suivants arrivent. Un code est valable 15 minutes ; vous pouvez en demander un nouveau sur l'écran de connexion.\n\nMot de passe oublié ? Touchez « Mot de passe oublié ? » sur l'écran de connexion. Si aucun e-mail n'arrive, écrivez-nous avec l'adresse utilisée lors de l'inscription.",
    },
    approve: {
      q: "Comment valider une vidéo ?",
      a: "Rien n'est publié sans votre validation, et valider marque seulement la vidéo comme prête à publier. Nous ne publions jamais à votre place.",
      steps: [
        "Ouvrez Vidéos et touchez « Regarder et approuver ».",
        "Regardez chaque vidéo, puis touchez « Valider », ou « Refuser » si elle ne convient pas.",
        "Quand plusieurs vidéos sont prêtes, le bouton « Valider les … vidéos » les valide en une fois. Les vidéos « À revoir » n'y sont jamais incluses.",
      ],
    },
    "needs-a-look": {
      q: "Que signifie « À revoir » ?",
      a: "Notre contrôle logiciel a marqué dans cette vidéo un point à relire une fois de plus, par exemple une formulation que les règles de publicité de santé de votre pays peuvent juger sévèrement. La raison figure sur la carte, sous « À vérifier avant de publier ».\n\nRegardez la vidéo en gardant cette raison en tête. Si elle convient à votre cabinet, validez-la ; sinon, refusez-la avec une courte note. Une vidéo marquée n'est jamais validée sans vous.",
    },
    "software-check": {
      q: "Que vérifie le contrôle logiciel, et que ne vérifie-t-il pas ?",
      a: "Avant que vous ne voyiez un script, le logiciel le vérifie deux fois : une fois sur les affirmations que les règles de publicité de santé restreignent souvent (promesses de résultat, « indolore », « définitif », superlatifs, prix, offres promotionnelles, promesses avant-après, témoignages), et une fois au regard des recommandations cliniques reconnues. Ce qui échoue est réécrit ou n'est pas créé, et tout ce qui mérite un second regard est marqué avec sa raison.\n\nC'est un contrôle automatique. Ce n'est pas un conseil juridique, ni la relecture d'un avocat ou de votre Ordre. Les règles varient selon les pays et évoluent : le dernier mot vous revient.",
    },
    responsibility: {
      q: "Qui est responsable de ce que nous publions ?",
      a: "Votre cabinet. Vous validez chaque vidéo et la publiez depuis vos propres comptes : vous restez donc responsable de ce que vous publiez, y compris au regard des règles de publicité de santé de votre pays.\n\nLe contrôle logiciel vous aide à repérer les problèmes courants, mais ne remplace ni votre jugement ni un conseil juridique. En cas de doute sur un sujet ou une formulation, refusez la vidéo ou interrogez votre Ordre avant de publier.",
    },
    "wrong-video": {
      q: "Une vidéo est erronée. Que puis-je faire ?",
      a: "Ne la validez pas : une vidéo non validée ne va nulle part. Touchez « Refuser », choisissez ce qui ne va pas et ajoutez une note si vous le souhaitez. Votre note parvient à notre équipe avec la vidéo.\n\nPour faire modifier une vidéo précise, touchez « Demander une modification » sur sa carte et écrivez ce qui doit changer. Seule cette vidéo est refaite, avec les mêmes vérifications, et vous la validez à nouveau avant de la publier. Vous pouvez demander jusqu'à 3 modifications par semaine. Si la version modifiée ne passe pas les vérifications, votre vidéo actuelle reste telle quelle et la carte vous l'indique. Pour changer toutes les vidéos à venir (logo, couleur, soins, langue, voix), passez par les Réglages.",

    },
    "background-photos": {
      q: "Puis-je changer les photos d'arrière-plan d'une vidéo ?",
      a: "Oui. Sur la carte de la vidéo, ouvrez « Texte et hashtags · Photos d'arrière-plan », touchez une à quatre photos puis « Appliquer ». La vidéo est recréée avec elles. La carte affiche « Photos en cours de mise à jour » jusqu'à ce que la nouvelle version soit prête.",
    },
    share: {
      q: "Comment publier une vidéo ?",
      a: "Si le partage ne fonctionne pas sur votre appareil, touchez « Télécharger » et publiez la vidéo comme d'habitude. DentVideo ne publie jamais à votre place et ne vous demande jamais les mots de passe de vos réseaux sociaux ; si une agence ou un collègue gère vos comptes, transmettez-lui les vidéos validées.",
      steps: [
        "Ouvrez une vidéo validée et touchez « Publier ».",
        "Sur un téléphone, touchez « Enregistrer la vidéo + copier le texte » : la vidéo est enregistrée et le texte avec ses hashtags est copié. Sur un ordinateur, la vidéo est téléchargée.",
        "Ouvrez Instagram, TikTok, Facebook ou WhatsApp, choisissez la vidéo dans votre galerie et collez le texte.",
        "De retour dans DentVideo, touchez « Marquer comme publiée » pour voir ce qu'il reste à publier.",
      ],
    },
    instagram: {
      q: "Comment publier un Reel sur Instagram ?",
      a: "Publiez depuis le compte de votre cabinet. Le texte contient déjà des hashtags ; vous pouvez le raccourcir ou le modifier avant de partager.",
      steps: ["Dans DentVideo, touchez « Publier » et enregistrez la vidéo avec son texte.", "Dans Instagram, touchez + et choisissez Reel.", "Choisissez la vidéo dans votre galerie, collez le texte et partagez."],
    },
    "tiktok-shorts": {
      q: "Comment publier sur TikTok ou YouTube Shorts ?",
      a: "Dans « Publier », utilisez le texte plus court « TikTok · Shorts ».\n\nTikTok : touchez +, choisissez la vidéo dans votre galerie, collez le texte et publiez.\n\nYouTube : dans l'application YouTube, touchez + et importez la vidéo depuis votre galerie. YouTube affiche les vidéos verticales courtes comme des Shorts. Collez le texte comme titre ou description.",
    },
    facebook: {
      q: "Comment publier sur Facebook ?",
      a: "Les vidéos sont des fichiers MP4 verticaux, le format des Reels Facebook.",
      steps: ["Passez sur la Page de votre cabinet, pas sur votre profil personnel.", "Créez un Reel et choisissez la vidéo.", "Collez le texte et partagez."],
    },
    "google-business": {
      q: "Puis-je ajouter les vidéos à notre fiche d'établissement Google ?",
      a: "DentVideo n'est pas relié directement à Google, mais vous pouvez importer vous-même une vidéo enregistrée : ouvrez votre fiche d'établissement dans la recherche Google ou dans Maps, ajoutez une photo ou une vidéo et choisissez le fichier.\n\nGoogle examine les vidéos avant de les afficher et n'accepte que des clips courts : vérifiez ses limites actuelles dans l'aide de Google. Si une vidéo est refusée, partagez-la plutôt sur vos autres canaux. Les hashtags n'y servent à rien, laissez-les de côté.",
    },
    "posting-times": {
      q: "Quand publier ?",
      a: "Chaque vidéo validée affiche un jour et une heure suggérés. Nous répartissons les vidéos de la semaine du lundi au vendredi, en alternant midi et soirée selon l'heure du pays de votre cabinet, quand beaucoup de gens regardent leur téléphone.\n\nCe sont des suggestions, pas des règles : publier régulièrement compte plus que la minute exacte. Vos statistiques Instagram ou TikTok indiquent quand vos propres abonnés sont en ligne.",
    },
    captions: {
      q: "Les vidéos sont-elles sous-titrées ? Sont-elles accessibles ?",
      a: "Chaque vidéo affiche ses points clés sous forme de texte à l'image : on peut la suivre sans le son. Ce texte est une version courte de ce que dit la voix off, pas une transcription mot à mot.\n\nPour la voix off complète, touchez « Télécharger les sous-titres (.srt) » dans « Publier », à côté du téléchargement de la vidéo. Le fichier reprend les mots exacts de la voix off. Ses horaires sont calculés à partir des pauses de la narration : ils sont proches, mais pas exacts au mot près. Regardez-le une fois avec la vidéo avant de l'envoyer. Les vidéos créées avant l'arrivée des fichiers de sous-titres et les extraits de vos propres enregistrements n'ont pas de fichier .srt (les extraits affichent déjà vos mots à l'image).\n\nYouTube et Facebook permettent d'envoyer un fichier .srt avec une vidéo, là où ils proposent des sous-titres. Instagram et TikTok n'acceptent pas de fichier de sous-titres : les points clés sont déjà dans la vidéo, et vous pouvez aussi activer les sous-titres automatiques de l'application en publiant, puis les corriger avec le texte du fichier .srt. Vérifiez qu'aucun texte n'apparaît deux fois.",

    },
    "other-uses": {
      q: "Pouvons-nous utiliser les vidéos sur notre site ou en salle d'attente ?",
      a: "Oui. Les vidéos créées pour votre cabinet peuvent servir à la communication de votre cabinet, par exemple sur votre site, dans une newsletter ou sur un écran en salle d'attente. Vous pouvez continuer à utiliser les vidéos téléchargées après une résiliation.\n\nCertaines vidéos contiennent des images d'archives sous licence, utilisables seulement au sein de la vidéo, pas seules.",
    },
    "logo-colors": {
      q: "Comment changer notre logo ou notre couleur de marque ?",
      a: "Vos prochaines vidéos utiliseront le nouveau logo et la nouvelle couleur. Les vidéos déjà créées gardent les anciens.",
      steps: [
        "Ouvrez les Réglages.",
        "Sous « Logo et couleur », importez un nouveau logo (idéalement un PNG à fond transparent, 5 Mo au plus) ou choisissez une couleur.",
        "Touchez « Enregistrer les modifications ».",
      ],
    },
    language: {
      q: "Pouvons-nous changer la langue des vidéos ou la façon de s'adresser aux patients ?",
      a: "Oui, dans les Réglages : « Langue de vos vidéos » et « Comment vous vous adressez aux patients » (vouvoiement ou tutoiement). Les vidéos sont créées en anglais, allemand, espagnol, français, italien, portugais, turc, japonais, arabe et polonais.\n\nLe changement vaut pour vos prochaines vidéos. L'application passe elle aussi dans cette langue, quand elle existe.",
    },
    services: {
      q: "Pourquoi les soins indiqués dans les Réglages comptent-ils ?",
      a: "Les vidéos ne portent que sur les soins listés sous « Soins que vous proposez » : un soin absent n'aura jamais de vidéo, et un soin que vous ne proposez pas n'apparaîtra jamais. Séparez les soins par des virgules, ou utilisez les boutons d'ajout rapide.\n\nLe « Ton » (chaleureux, expert, posé ou détendu) oriente l'écriture des scripts. Les changements valent pour vos prochaines vidéos.",
    },
    "narrator-voice": {
      q: "Pouvons-nous choisir la voix off ?",
      a: "Oui. Dans les Réglages, sous « Voix off », choisissez une voix féminine ou masculine. La voix off est une voix de synthèse dans la langue de vos vidéos, et nous le disons ouvertement.\n\nLe choix vaut pour les nouvelles vidéos ; celles déjà créées gardent leur voix. Pour votre propre voix, la formule Practice transforme vos enregistrements en extraits.",
    },
    "closing-line": {
      q: "Qu'est-ce que la phrase de fin, et pourquoi la mienne a-t-elle été refusée ?",
      a: "C'est une phrase facultative et posée, ajoutée sous le texte de chaque publication, par exemple « Une question sur vos gencives ? Parlez-en lors de votre prochain contrôle. » Si vous la laissez vide, vos publications utilisent nos propres phrases de fin.\n\nAvant l'enregistrement, la phrase est vérifiée selon les mêmes règles de publicité que les vidéos. Elle ne peut pas promettre de résultat, presser, contenir de point d'exclamation, être un « contactez-nous » générique, ni pousser à prendre rendez-vous là où les règles de votre pays le limitent. Le message sous le champ indique quoi modifier.",
    },
    record: {
      q: "Comment me filmer ? (formule Practice)",
      a: "Nous découpons votre enregistrement en courts extraits sous-titrés avec votre logo, vérifions chaque extrait et vous écrivons quand ils sont prêts, en général en moins de 10 minutes. Vos mots ne sont jamais modifiés ; ce qui mérite un second regard est marqué.\n\nFichiers : MP4, MOV ou WebM, 500 Mo au plus. Les enregistrements font partie de la formule Practice ; avec Starter, la page Enregistrer indique comment changer. Si un patient est visible ou audible, il vous faut d'abord son consentement documenté.",
      steps: [
        "Ouvrez Enregistrer et choisissez l'une des fiches de tournage de la semaine.",
        "Posez votre téléphone à hauteur des yeux près d'une fenêtre et suivez la fiche pendant une à dix minutes.",
        "Choisissez la vidéo, touchez « Envoyer et créer les extraits » et gardez la page ouverte jusqu'à la fin de l'envoi.",
      ],
    },
    plans: {
      q: "Quelle différence entre Starter et Practice, et comment changer ?",
      a: "Les deux comprennent cinq vidéos commentées et sous-titrées chaque lundi, le contrôle logiciel, votre logo et vos couleurs. Practice ajoute des extraits tirés de vos propres enregistrements, avec des fiches de tournage qui vous disent quoi filmer. Les prix actuels figurent sur l'écran des formules dans l'application.\n\nPour changer, ouvrez Réglages → Formule et facturation → « Changer de formule ». La différence pour le reste de la période est facturée ou créditée le jour même. Si vous n'y voyez qu'une carte « Nous écrire », écrivez-nous et nous ferons le changement.",
    },
    invoices: {
      q: "Où trouver les factures et les reçus ?",
      a: "Les paiements sont gérés par Dodo Payments, notre marchand officiel (merchant of record) : Dodo vous vend l'abonnement, débite votre carte, collecte les taxes applicables et émet la facture. C'est aussi le nom qui apparaît sur votre relevé.\n\nVous recevez un reçu par e-mail après chaque paiement, et vous pouvez télécharger les factures dans Réglages → Formule et facturation → « Gérer la facturation ». Comme Dodo émet la facture, DentVideo n'en envoie pas une seconde.",
    },
    "update-card": {
      q: "Comment changer la carte de paiement ?",
      a: "Ouvrez Réglages → Formule et facturation et touchez « Gérer la facturation ». Vous changez la carte dans le portail sécurisé de notre prestataire de paiement ; nous ne voyons jamais vos données de carte complètes.\n\nSi le bouton n'apparaît pas, écrivez-nous et nous vous enverrons un lien sécurisé. N'envoyez jamais vos données de carte par e-mail.",
    },
    "payment-failed": {
      q: "Notre paiement a échoué et les vidéos sont en pause. Et maintenant ?",
      a: "Vos vidéos restent dans votre bibliothèque, et vous pouvez toujours les partager. Seules les nouvelles vidéos hebdomadaires sont en pause jusqu'à ce qu'un paiement passe.\n\nTouchez « Mettre à jour le paiement » sur la page Vidéos ou dans les Réglages, ou « Demander un lien sécurisé par e-mail ». N'achetez pas de nouvelle formule : vous seriez débité deux fois. Dès que la carte fonctionne, vos vidéos hebdomadaires reprennent.",
    },
    cancel: {
      q: "Comment résilier ?",
      a: "Les formules sont mensuelles, sans durée minimale. Ouvrez Réglages → Formule et facturation → « Gérer la facturation » et résiliez dans le portail de paiement, ou écrivez-nous et nous le ferons pour vous.\n\nLa résiliation arrête le prochain paiement, et vous gardez l'accès jusqu'à la fin de la période payée. Une période commencée n'est pas remboursée au prorata, sauf si la loi l'exige ou si le service a fait défaut ; les détails sont dans notre politique de remboursement.",
    },
    "after-cancel": {
      q: "Que deviennent nos vidéos après la résiliation ?",
      a: "Plus aucune vidéo n'est créée une fois la période payée terminée. Votre bibliothèque reste ensuite disponible 90 jours : vous pouvez encore regarder, télécharger et partager vos vidéos, et la page Vidéos indique la date. Nous vous écrivons 14 jours puis 1 jour avant. Au bout de ces 90 jours, les vidéos, enregistrements et fichiers de sous-titres sont supprimés ; vos réglages et votre logo sont conservés.\n\nLes vidéos téléchargées vous appartiennent pour votre usage, y compris après la résiliation : téléchargez celles que vous voulez garder, ou tout en une fois dans Réglages → Vos données → « Télécharger mes données ». Si vous reprenez une formule depuis la page Vidéos avant cette date, tout est conservé. Si vous supprimez votre compte, tout est effacé immédiatement.",

    },
    group: {
      q: "Nous avons un second cabinet. Comment l'ajouter ?",
      a: "Les groupes et les cabinets à plusieurs adresses se configurent avec nous, pas dans l'application. Écrivez-nous en indiquant vos sites, et nous les mettrons en place avec vous. Le prix est par site.",
    },
    "patient-data": {
      q: "Pouvons-nous importer des données de patients ou des vidéos montrant des patients ?",
      a: "DentVideo fonctionne sans données de patients : n'importez pas de dossiers patients, et ne nous envoyez pas non plus d'informations sur des patients par e-mail.\n\nSi un enregistrement montre ou nomme un patient, il vous faut son consentement explicite et documenté avant de l'importer. DentVideo n'est pas conçu pour les informations de santé protégées au sens de la loi américaine HIPAA.",
    },
    "privacy-dpa": {
      q: "Comment nos données sont-elles protégées ? Existe-t-il un accord de sous-traitance ?",
      a: "Notre politique de confidentialité indique ce que nous traitons, quels prestataires le reçoivent et combien de temps c'est conservé. Pour les données personnelles de vos fichiers, votre cabinet est responsable du traitement et nous agissons comme sous-traitant, selon notre accord de traitement des données, qui fait partie de nos conditions.\n\nNous n'utilisons pas vos fichiers ni vos vidéos pour entraîner des modèles d'IA, et nous ne montrons pas les vidéos de votre cabinet à d'autres clients.",
    },
    "export-data": {
      q: "Comment télécharger toutes nos données ?",
      a: "Ouvrez Réglages → Vos données → « Télécharger mes données ». Vous obtenez un fichier avec les informations de votre cabinet, le script, le texte et la relecture de chaque vidéo, ainsi que des liens de téléchargement pour vos vidéos, enregistrements et votre logo. Les liens restent valables 24 heures : téléchargez rapidement ce dont vous avez besoin.",
    },
    "delete-account": {
      q: "Comment supprimer notre compte ?",
      a: "Ouvrez Réglages → Vos données → « Supprimer mon compte… » et saisissez le nom de votre cabinet pour confirmer. Informations du cabinet, vidéos, enregistrements, logo et identifiants sont supprimés immédiatement et ne peuvent pas être restaurés : téléchargez d'abord vos données si vous voulez une copie.\n\nSi votre formule est encore active, la fenêtre indique si elle est résiliée en même temps ou si vous devez d'abord la résilier. Notre prestataire de paiement conserve les factures aussi longtemps que la loi fiscale l'exige, et les copies de sauvegarde sont écrasées sous 30 jours.",
    },
    "reminder-emails": {
      q: "Pouvons-nous ne plus recevoir les e-mails de rappel ?",
      a: "Oui. Chaque rappel et chaque bilan mensuel contient en bas un lien « Se désabonner ». Les e-mails concernant votre compte, vos paiements et vos vidéos prêtes continuent d'arriver, car ils font partie du service.",
    },
  },
};
