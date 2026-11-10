import type { Guide } from "../dentvideo";

// Guides en français (France d'abord). Règles : ne décrire que ce qui est vrai
// aujourd'hui ; pas de chiffres inventés ni de prix ; règles déontologiques
// présentées avec prudence et sources officielles.

const LEGIFRANCE = { label: "Légifrance — Code de la santé publique, art. R. 4127-215 et suivants (décret n° 2020-1658 du 22 décembre 2020)", url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072665/LEGISCTA000006190548/2021-07-13/" };
const R4127_215_1 = { label: "Légifrance — Code de la santé publique, article R. 4127-215-1 (communication du chirurgien-dentiste)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042743767" };
const ONCD = { label: "Ordre national des chirurgiens-dentistes — Communication professionnelle des chirurgiens-dentistes (recommandations du 6 mai 2021, modifiées le 9 décembre 2021 et le 24 mars 2023)", url: "https://www.ordre-chirurgiens-dentistes.fr/pour-le-chirurgien-dentiste/communication-professionnelle-des-chirurgiens-dentistes/" };
const CNIL = { label: "CNIL — données de santé et droit à l'image", url: "https://www.cnil.fr/" };
const RGPD = { label: "Règlement général sur la protection des données (RGPD), art. 9 — EUR-Lex", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj" };
const DGCCRF = { label: "DGCCRF — influence commerciale (loi n° 2023-451 du 9 juin 2023)", url: "https://www.economie.gouv.fr/dgccrf" };

export const GUIDES_FR: Guide[] = [
  {
    locale: "fr",
    slug: "videos-pour-cabinets-dentaires",
    topic: "instagram-videos",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Vidéos pour cabinets dentaires : sujets, format, tournage et règles de communication",
    seoTitle: "Vidéos pour cabinet dentaire : sujets et format",
    seoDescription: "Quelles vidéos courtes les patients regardent, format Reels, sous-titres, rythme de publication et ce que le code de déontologie encadre pour le dentiste.",
    description: "Guide pratique pour cabinets dentaires : quelles vidéos courtes les patients regardent, format Reels, sous-titres, rythme et ce que le code de déontologie encadre.",
    h1: "Vidéos pour cabinets dentaires",
    intro:
      "Les vidéos utiles pour un cabinet dentaire répondent en 20 à 60 secondes à une seule question de patient, au format vertical, sous-titrées et formulées avec prudence. Une à trois vidéos par semaine suffisent. Les promesses de résultat, « sans douleur », les réductions, les superlatifs et les témoignages de patients n'y ont pas leur place : le code de déontologie des chirurgiens-dentistes les encadre.",
    sections: [
      {
        heading: "Pourquoi les patients regardent des vidéos",
        paragraphs: [
          "Beaucoup de patients regardent un cabinet en ligne avant de prendre rendez-vous. Une vidéo courte leur montre qui va les soigner, comment cette personne parle et explique. Dans un domaine où l'appréhension est forte, ce sentiment de déjà connaître le praticien fait souvent la différence.",
          "Le but est d'informer, pas de vendre. C'est utile au patient et cohérent avec la déontologie : depuis 2020, le chirurgien-dentiste peut communiquer des informations loyales et honnêtes sur son exercice, mais pas pratiquer la profession comme un commerce. Les détails sont dans le guide sur la [communication du chirurgien-dentiste sur les réseaux sociaux](guide:communication-chirurgien-dentiste-reseaux-sociaux).",
        ],
      },
      {
        heading: "Les sujets qui fonctionnent",
        paragraphs: [
          "Vous avez déjà la liste la plus utile : les questions posées au fauteuil chaque jour. Répondez à une seule par vidéo. Pour une année de sujets, voyez les [idées de contenu Instagram pour cabinet dentaire](guide:idees-contenu-instagram-cabinet-dentaire).",
        ],
        list: [
          "Le blanchiment abîme-t-il l'émail ?",
          "Combien de temps dure un traitement implantaire, et quelles en sont les étapes ?",
          "Que faire après un traitement de canal ?",
          "Quand faut-il s'inquiéter de gencives qui saignent ?",
          "À quel âge emmener son enfant chez le dentiste ?",
          "Comment nettoyer ses gouttières d'alignement ?",
          "Le détartrage abîme-t-il les dents ?",
        ],
        after: [
          "Ne parlez que des soins que votre cabinet pratique réellement. Une vidéo sur un acte que vous ne proposez pas envoie les patients intéressés au mauvais endroit.",
        ],
      },
      {
        heading: "Le format Reels : première seconde, une idée, des sous-titres",
        paragraphs: [
          "Sur Instagram, les vidéos courtes se publient en Reels, au format vertical (9:16). Posez la question dès la première seconde, à l'oral et en texte à l'écran. Répondez en deux ou trois phrases simples, puis concluez calmement : « Si vous avez un doute, on en parle à votre prochain contrôle ». Sans pression, sans offre.",
          "Ajoutez des sous-titres. Beaucoup regardent sans le son, et les sous-titres aident aussi les personnes malentendantes et les patients dont le français n'est pas la langue maternelle. Placez-les dans le tiers inférieur, au-dessus des icônes de l'application.",
        ],
      },
      {
        heading: "Reels, stories, profil : quelle vidéo où",
        paragraphs: [
          "Les Reels sont le moyen le plus probable de toucher des personnes qui ne vous suivent pas encore : idéal pour les questions-réponses. Les stories disparaissent après 24 heures et servent au quotidien avec vos abonnés : un instant du cabinet, un rappel, un sondage. Les vidéos épinglées sur le profil sont les premières qu'un nouveau visiteur voit ; trois bonnes candidates : votre présentation, « que se passe-t-il au premier rendez-vous ? » et la question la plus fréquente.",
          "Rangez les stories à la une par thème : « Premier rendez-vous », « Après les soins », « Enfants ». Le patient trouve ainsi ce qu'il cherche en deux gestes.",
        ],
      },
      {
        heading: "La régularité avant le volume",
        paragraphs: [
          "La régularité compte plus que la quantité. Une à trois vidéos courtes par semaine restent réalistes pour la plupart des cabinets. Des jours fixes facilitent le travail de l'équipe et créent une habitude chez vos abonnés.",
          "Le plus efficace : parler cinq minutes et en tirer plusieurs extraits courts ; une seule séance couvre la semaine. Les semaines sans tournage, des vidéos d'information narrées prennent le relais ; voyez le guide sur les [vidéos d'information patient](guide:videos-information-patient-dentaire).",
        ],
      },
      {
        heading: "Tourner en cinq minutes",
        paragraphs: [],
        list: [
          "Choisissez trois ou quatre questions et notez deux ou trois idées pour chacune ; n'apprenez pas de texte par cœur.",
          "Téléphone à la verticale, à hauteur des yeux, sur un trépied ou un support.",
          "Face à une fenêtre ; jamais à contre-jour.",
          "Un micro-cravate si possible : le son compte plus que l'image.",
          "Vérifiez le cadre : ni patients, ni écrans avec des données, ni radiographies identifiables.",
          "Répondez comme vous l'expliqueriez à un patient, et marquez deux secondes de silence entre les questions.",
        ],
        ordered: true,
      },
      {
        heading: "Ce qui n'a pas sa place dans la vidéo",
        paragraphs: [
          "En France, la communication des chirurgiens-dentistes relève du code de déontologie intégré au Code de la santé publique, précisé par les recommandations de l'Ordre. Sont particulièrement délicats :",
        ],
        list: [
          "Les promesses de résultat et les absolus : « sans douleur », « garanti », « définitif »",
          "Les superlatifs et comparaisons avec d'autres praticiens : « le meilleur cabinet de Lyon »",
          "Les réductions, offres, cadeaux et jeux-concours, qui relèvent du procédé commercial",
          "Les témoignages et avis de patients mis en avant",
          "Les avant/après susceptibles de créer de faux espoirs",
          "Les patients reconnaissables sans consentement écrit",
        ],
        after: [
          "Le plus sûr est d'informer avec prudence : « en général », « chez la plupart des patients », « votre dentiste vous dira ce qui convient dans votre cas ». En cas de doute, renseignez-vous auprès de votre conseil départemental de l'Ordre.",
        ],
      },
      {
        heading: "Comment DentVideo vous aide",
        paragraphs: [
          "[DentVideo](landing:) planifie chaque semaine cinq sujets à partir de vos soins et de vraies questions de patients, rédige et met en voix les vidéos, puis les sous-titre avec votre logo et vos couleurs. Chaque script est vérifié deux fois : allégations couramment encadrées et exactitude clinique. Vos propres enregistrements ne sont jamais réécrits ; ce qui mérite un second regard est signalé avec la raison. Rien n'est publié sans votre validation. [Voyez un aperçu à votre logo avant de payer](start:).",
        ],
      },
    ],
    faq: [
      { q: "À quelle fréquence un cabinet dentaire doit-il publier des vidéos ?", a: "La régularité compte plus que le volume. Une à trois vidéos d'information courtes par semaine restent réalistes pour la plupart des cabinets." },
      { q: "Quelle durée pour une vidéo Instagram ?", a: "Pour répondre à une question, 20 à 60 secondes suffisent le plus souvent. Les sujets longs se découpent en plusieurs vidéos d'une question chacune." },
      { q: "Puis-je montrer des cas de patients ?", a: "Uniquement avec un consentement écrit, et avec prudence : un avant/après ou un témoignage peut être perçu comme une promesse ou un procédé publicitaire. Renseignez-vous auprès de l'Ordre avant de publier." },
      { q: "Le praticien doit-il apparaître dans les vidéos ?", a: "Si possible, oui : les patients font confiance à la personne qui va les soigner. Les vidéos narrées complètent bien les semaines sans tournage." },
      { q: "La même vidéo convient-elle à TikTok et YouTube Shorts ?", a: "Oui. Une vidéo verticale sous-titrée fonctionne sur Reels, TikTok et YouTube Shorts ; adaptez seulement le texte de la publication." },
    ],
    sources: [LEGIFRANCE, ONCD],
  },
  {
    locale: "fr",
    slug: "communication-chirurgien-dentiste-reseaux-sociaux",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-10",
    reviewed: "2026-11-10",
    title: "Communication du chirurgien-dentiste sur les réseaux sociaux : ce que permet la déontologie",
    seoTitle: "Réseaux sociaux du dentiste : ce que dit le code",
    seoDescription: "Ce qu'un chirurgien-dentiste peut publier sur Instagram depuis le décret de 2020 : information loyale, interdits, témoignages, influence et checklist.",
    description: "Ce qu'un chirurgien-dentiste peut publier sur Instagram depuis le décret de 2020 : information loyale, interdits, témoignages, comparaisons, influence et checklist. Pas un conseil juridique.",
    h1: "Communication du chirurgien-dentiste sur les réseaux sociaux",
    intro:
      "Depuis le décret du 22 décembre 2020, un chirurgien-dentiste peut communiquer au public, y compris sur les réseaux sociaux, des informations loyales, honnêtes et utiles sur son exercice. Il ne peut toujours pas exercer la profession comme un commerce : pas de témoignages de tiers, pas de comparaison avec d'autres praticiens, pas de promesse ni d'incitation à des soins inutiles.",
    sections: [
      {
        heading: "Un dentiste peut-il faire de la publicité depuis 2020 ?",
        paragraphs: [
          "Jusqu'en 2020, le code de déontologie interdisait aux chirurgiens-dentistes tout procédé direct ou indirect de publicité. Le décret n° 2020-1658 du 22 décembre 2020 a supprimé cette interdiction générale et introduit un droit à la communication. L'article R. 4127-215 du Code de la santé publique maintient en revanche que la profession ne doit pas être pratiquée comme un commerce.",
          "En substance, le chirurgien-dentiste peut désormais diffuser, par tout moyen dont un site ou un compte Instagram, des informations sur ses compétences, son parcours, ses pratiques et les conditions de son exercice, à condition qu'elles soient loyales, honnêtes et vérifiables.",
        ],
      },
      {
        heading: "Que dit l'article R. 4127-215-1 ?",
        paragraphs: [
          "L'article R. 4127-215-1, créé par le décret de 2020 et en vigueur depuis le 25 décembre 2020, est le texte à garder sous les yeux. Il comporte trois paragraphes :",
        ],
        list: [
          "I. Le chirurgien-dentiste peut communiquer au public, par tout moyen, y compris sur un site internet, des informations de nature à contribuer au libre choix du praticien par le patient : ses compétences, ses pratiques professionnelles, son parcours et les conditions de son exercice. Cette communication est loyale et honnête, ne fait pas appel à des témoignages de tiers, ne repose pas sur des comparaisons avec d'autres praticiens et n'incite pas à un recours inutile à des actes.",
          "II. Il peut aussi diffuser des informations à visée éducative ou sanitaire, scientifiquement étayées, avec prudence et sans présenter comme acquises des hypothèses non confirmées.",
          "III. Ces communications tiennent compte des recommandations émises par le Conseil national de l'Ordre.",
        ],
        after: [
          "Les recommandations de l'Ordre ont été adoptées le 6 mai 2021, puis modifiées le 9 décembre 2021 et le 24 mars 2023. Elles précisent par exemple qu'un praticien non spécialiste qui limite son exercice à une discipline doit éviter toute ambiguïté avec les spécialistes qualifiés. Relisez la version en vigueur sur le site de l'Ordre avant une campagne.",
        ],
      },
      {
        heading: "Que peut-on publier sans difficulté ?",
        paragraphs: ["Ces contenus relèvent clairement de l'information loyale et utile :"],
        list: [
          "Des réponses prudentes aux questions fréquentes des patients",
          "L'explication des étapes d'un soin et des consignes après les soins",
          "Votre parcours, vos diplômes et vos domaines d'exercice, présentés de façon factuelle",
          "Les informations pratiques : horaires, accès, accessibilité, langues parlées",
          "La présentation de l'équipe et du fonctionnement du cabinet",
          "Des messages de prévention, par exemple autour de la journée mondiale de la santé bucco-dentaire",
        ],
      },
      {
        heading: "Quelles limites pose le code de déontologie ?",
        paragraphs: ["Les textes et les recommandations de l'Ordre convergent sur plusieurs limites ; vérifiez le libellé exact sur Légifrance :"],
        list: [
          "Pas de témoignages de tiers : avis, remerciements ou récits de patients mis en avant.",
          "Pas de comparaison avec d'autres praticiens ou cabinets.",
          "Pas d'incitation à un recours inutile à des actes de prévention ou de soins.",
          "Pas d'information trompeuse ni de promesse de résultat.",
          "Pas d'atteinte à la dignité de la profession ni de procédé commercial (réductions, cadeaux, jeux-concours).",
          "Respect du secret professionnel et du consentement des patients pour toute image.",
        ],
      },
      {
        heading: "Comment formuler sans promettre ?",
        paragraphs: ["Presque toute information peut se dire sans promesse :"],
        list: [
          "Au lieu de « implants sans douleur » : « L'intervention se fait sous anesthésie locale ; la plupart des patients ressentent ensuite une gêne légère quelques jours. »",
          "Au lieu de « blanchiment garanti » : « Le résultat varie d'une personne à l'autre ; nous vérifions d'abord s'il vous convient. »",
          "Au lieu de « définitif » : « Avec une bonne hygiène et des contrôles réguliers, il peut durer de nombreuses années. »",
          "Au lieu de « le meilleur cabinet de Bordeaux » : des faits vérifiables, comme les soins proposés, les diplômes et les horaires.",
          "Au lieu de « offre spéciale ce mois-ci » : aucune offre.",
        ],
      },
      {
        heading: "Influenceurs et partenariats",
        paragraphs: [
          "L'Ordre distingue le praticien qui publie à titre personnel de celui qui communique sur son exercice ; dans les deux cas, le code de la santé publique et la déontologie s'appliquent dès qu'il est question de soins. Faire la promotion de produits ou de marques dentaires contre rémunération pose des questions déontologiques sérieuses.",
          "Par ailleurs, la loi n° 2023-451 du 9 juin 2023 encadre l'influence commerciale et restreint fortement la promotion d'actes et de produits de santé ou à visée esthétique par des influenceurs. Un partenariat avec un influenceur qui vante les soins de votre cabinet est donc à proscrire sans avis juridique préalable.",
        ],
      },
      {
        heading: "Hors de France",
        paragraphs: [
          "En Belgique, au Luxembourg, en Suisse romande ou au Québec, les règles de communication des dentistes diffèrent, de même que les autorités compétentes. Les principes sont souvent proches — véracité, absence de promesse et de comparaison — mais les détails varient. Renseignez-vous auprès de l'Ordre, de la commission ou de l'autorité de votre pays.",
        ],
      },
      {
        heading: "Checklist avant de publier",
        paragraphs: ["Si une réponse est « oui », reformulez ou demandez conseil :"],
        list: [
          "Le texte ou l'image promet-il un résultat, l'absence de douleur ou une durée garantie ?",
          "Y a-t-il un superlatif ou une comparaison avec d'autres praticiens ?",
          "Propose-t-on une réduction, un cadeau, un jeu-concours ?",
          "Y a-t-il un avant/après, un avis ou un remerciement de patient ?",
          "Une personne est-elle reconnaissable, et avons-nous son consentement écrit ?",
          "L'information est-elle exacte et propre à l'acte dont on parle ?",
          "Le compte indique-t-il clairement l'identité du praticien et son exercice ?",
        ],
      },
      {
        heading: "Comment DentVideo fait cette vérification",
        paragraphs: [
          "[DentVideo](landing:) vérifie chaque script et chaque texte au regard des allégations couramment encadrées — garanties, « sans douleur », « définitif », superlatifs, prix, réductions, promesses avant/après, témoignages — et fait réécrire ce qui pose problème. Vos enregistrements ne sont pas modifiés : ce qui mérite un second regard est signalé avec la raison. Ce n'est pas un conseil juridique : vous validez chaque vidéo. Sur les images de patients, lisez le guide [photos avant/après et témoignages](guide:photos-avant-apres-temoignages-dentiste) ; pour des sujets sans risque, les [idées de contenu](guide:idees-contenu-instagram-cabinet-dentaire).",
        ],
      },
    ],
    faq: [
      { q: "Un chirurgien-dentiste peut-il faire de la publicité sur Instagram ?", a: "Depuis 2020, il peut communiquer des informations loyales, honnêtes et vérifiables sur son exercice, y compris sur Instagram. Il ne peut pas exercer comme un commerce : pas de témoignages, de comparaisons, de promesses ni de réductions." },
      { q: "Puis-je publier les avis Google de mes patients ?", a: "Les témoignages de tiers ne doivent pas être utilisés dans la communication du praticien. Mieux vaut ne pas les reprendre sur vos réseaux." },
      { q: "Puis-je annoncer une offre de blanchiment ?", a: "Les réductions et offres promotionnelles relèvent du procédé commercial, incompatible avec l'exercice de la profession. Informez sur le soin, sans offre." },
      { q: "Les règles s'appliquent-elles aussi à mon compte personnel ?", a: "Dès que vous parlez de votre exercice ou de soins, oui. Le code de déontologie s'applique au praticien, quel que soit le compte utilisé." },
      { q: "Ce guide est-il un conseil juridique ?", a: "Non. C'est une information générale ; les textes évoluent. Pour un cas précis, adressez-vous à votre conseil départemental de l'Ordre ou à un avocat." },
    ],
    sources: [R4127_215_1, LEGIFRANCE, ONCD, DGCCRF],
  },
  {
    locale: "fr",
    slug: "idees-contenu-instagram-cabinet-dentaire",
    topic: "post-ideas",
    category: "ideas",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Idées de contenu Instagram pour cabinet dentaire : une année de sujets sans risque",
    seoTitle: "Instagram du cabinet dentaire : idées de posts",
    seoDescription: "Idées de publications Instagram, Reels et TikTok pour cabinet dentaire : questions de patients, soins expliqués, équipe, saisons et ce qu'il faut éviter.",
    description: "Idées de publications Instagram, Reels et TikTok pour cabinet dentaire : questions de patients, soins expliqués, équipe, sujets de saison, un mois type et ce qu'il vaut mieux éviter.",
    h1: "Idées de contenu Instagram pour cabinet dentaire",
    intro:
      "Les publications les plus sûres et les plus regardées d'un cabinet dentaire sont de courtes vidéos qui répondent aux questions fréquentes des patients, expliquent les soins étape par étape, donnent des conseils après les soins et présentent l'équipe. Les offres, jeux-concours, témoignages et promesses de résultat n'ont pas leur place : la déontologie les encadre.",
    sections: [
      {
        heading: "Trois règles pour choisir un sujet",
        paragraphs: ["Trois questions suffisent pour juger une idée :"],
        list: [
          "Un patient le demande-t-il vraiment ? Les questions du fauteuil, du téléphone et de Google sont les sujets les plus utiles.",
          "Pratiquons-nous ce soin au cabinet ? N'expliquez que ce que vous faites.",
          "Est-ce que j'informe ou est-ce que je pousse ? Pas « prenez rendez-vous vite, l'offre se termine », mais « parlez-en à votre prochain contrôle ».",
        ],
      },
      {
        heading: "Les questions des patients, en bref",
        paragraphs: [
          "Cette série peut devenir la colonne vertébrale de votre compte : une question, 20 à 60 secondes, une réponse prudente. Les recherches du type « … dangereux », « … combien de temps », « après … » montrent ce qui inquiète vraiment :",
        ],
        list: [
          "Le blanchiment est-il dangereux pour les dents ?",
          "Combien de temps dure un traitement implantaire ?",
          "Que manger après une extraction ?",
          "Est-ce normal d'avoir mal après une dévitalisation ?",
          "Une gencive qui se rétracte peut-elle repousser ?",
          "Comment savoir si je serre les dents la nuit ?",
          "D'où vient la mauvaise haleine ?",
        ],
      },
      {
        heading: "Soins expliqués et conseils après les soins",
        paragraphs: [
          "L'appréhension vient souvent de l'inconnu. Expliquer les étapes d'un soin rassure avant le rendez-vous ; les vidéos de conseils accompagnent le patient chez lui. Nous détaillons cela dans le guide sur les [vidéos d'information patient](guide:videos-information-patient-dentaire).",
        ],
        list: [
          "La dévitalisation étape par étape : ce qui se passe, combien de temps",
          "Les 24 premières heures après un soin de carie",
          "Nettoyer et ranger ses gouttières",
          "Bien se brosser les dents, fil dentaire et brossettes",
          "Dents de lait et première visite chez le dentiste",
          "Hygiène avec des implants",
        ],
      },
      {
        heading: "Le cabinet et l'équipe",
        paragraphs: [
          "On fait confiance à des personnes, pas à des logos. Les vidéos de présentation rassurent le nouveau patient. Là aussi, restez factuel : « Notre assistante Claire vous explique comment se passe le premier rendez-vous » est une information ; « l'équipe la plus expérimentée de la région » est un superlatif.",
        ],
        list: [
          "Le praticien se présente : domaines d'exercice et façon de travailler",
          "Ce qui se passe au premier rendez-vous",
          "Comment nous stérilisons les instruments (sans patient à l'image)",
          "Accès, stationnement et accessibilité",
          "Ce que nous faisons pour les patients anxieux",
        ],
      },
      {
        heading: "Sujets de saison",
        paragraphs: ["Le calendrier offre des occasions régulières, par exemple :"],
        list: [
          "Journée mondiale de la santé bucco-dentaire, le 20 mars",
          "Rentrée scolaire : brossage et contrôles chez l'enfant",
          "Pâques, Halloween, Noël : sucreries et dents, sans moraliser",
          "Été : protège-dents pour le sport et soins en vacances",
          "Rappel du dispositif de prévention bucco-dentaire de l'Assurance Maladie pour les jeunes (information, pas offre)",
          "Fin d'année : penser à son contrôle annuel",
        ],
      },
      {
        heading: "D'où viennent les nouveaux sujets",
        paragraphs: [
          "Quand la liste s'épuise, trois sources aident. Votre équipe d'abord : l'accueil et les assistantes savent mieux que personne ce que demandent les patients ; demandez-leur de noter chaque question pendant une semaine. Google ensuite : tapez « implant » ou « blanchiment » et lisez les suggestions ; « … dangereux », « … combien de temps », « après … » révèlent de vraies inquiétudes. Votre compte enfin : commentaires et messages sous vos vidéos sont le prochain sujet.",
          "Les questions de prix reviennent souvent mais ne font pas un sujet de vidéo. Répondez-y en privé ; si elles se répètent, expliquez en vidéo les étapes du soin et ce qui fait varier le plan de traitement, sans chiffres.",
        ],
      },
      {
        heading: "Texte de publication et hashtags",
        paragraphs: [
          "Le texte sous la vidéo reprend en bref ce qu'elle dit, sans ajouter de promesse. Une structure qui marche : la question en première ligne, la réponse en deux ou trois phrases, puis « Votre dentiste vous dira ce qui convient dans votre cas ». Le nom du cabinet et la ville suffisent pour être trouvé.",
          "Hashtags : par thème et par ville (#santébuccodentaire, #implantdentaire, #dentistenantes), cinq à dix pertinents plutôt que trente au hasard. Évitez les superlatifs comme « #meilleurdentiste » et tout ce qui évoque une offre.",
        ],
      },
      {
        heading: "Ce qu'il vaut mieux éviter",
        paragraphs: [
          "Certains conseils valables dans d'autres secteurs sont risqués pour un cabinet dentaire : promotions, jeux-concours, « ce que disent nos patients », captures de remerciements, carrousels avant/après et partenariats avec des influenceurs. Le pourquoi est dans le guide sur la [communication du chirurgien-dentiste](guide:communication-chirurgien-dentiste-reseaux-sociaux).",
        ],
      },
      {
        heading: "Un mois type",
        paragraphs: ["Voici un mois à trois publications par semaine :"],
        list: [
          "Semaine 1 : « Le blanchiment est-il dangereux ? » · « 24 heures après un soin » · Présentation du praticien",
          "Semaine 2 : « Gencives qui saignent : quand s'inquiéter ? » · « Bien se brosser » · Le premier rendez-vous",
          "Semaine 3 : « Combien de temps pour un implant ? » · « Que manger après une extraction ? » · La stérilisation",
          "Semaine 4 : « Premier rendez-vous de l'enfant » · « Signes de bruxisme » · Accès et accessibilité",
        ],
        after: [
          "Trois par semaine, c'est trop ? Commencez par une. [DentVideo](landing:) fait cette planification pour vous : il choisit chaque semaine cinq sujets à partir de vos soins et de vraies questions de patients, rédige, met en voix et vérifie les vidéos, et vous n'avez plus qu'à valider.",
        ],
      },
    ],
    faq: [
      { q: "Existe-t-il un plan prêt pour toute l'année ?", a: "Oui : notre [calendrier éditorial pour cabinet dentaire](guide:calendrier-editorial-cabinet-dentaire) propose un thème d'information pour chacune des 52 semaines, calé sur des dates comme la journée mondiale de la santé bucco-dentaire, le 20 mars." },
      { q: "Que publier sur l'Instagram d'un cabinet dentaire ?", a: "Des réponses courtes aux questions des patients, des explications claires des soins, des conseils après les soins et des présentations de l'équipe, toujours informatives, prudentes et sans promesse." },
      { q: "Combien de publications par semaine ?", a: "Une à trois par semaine restent réalistes pour la plupart des cabinets. La régularité compte plus que la fréquence." },
      { q: "Faut-il un contenu différent pour TikTok ?", a: "En général non. La même vidéo verticale sous-titrée fonctionne sur Reels, TikTok et YouTube Shorts ; adaptez le texte." },
      { q: "Puis-je organiser un jeu-concours ?", a: "Les jeux-concours et cadeaux relèvent du procédé commercial, incompatible avec l'exercice de la profession. Mieux vaut s'en abstenir." },
      { q: "Faut-il répondre aux commentaires ?", a: "Oui, aimablement et de façon générale. Ne répondez pas publiquement à une question sur un cas personnel : proposez un rendez-vous ou le téléphone du cabinet." },
    ],
    sources: [LEGIFRANCE, ONCD, CNIL],
  },
  {
    locale: "fr",
    slug: "videos-information-patient-dentaire",
    topic: "patient-education",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Vidéos d'information patient au cabinet dentaire : sujets, usages et exactitude",
    seoTitle: "Vidéos d'information patient au cabinet dentaire",
    seoDescription: "Vidéos d'information patient pour cabinet dentaire : sujets prioritaires, modèle de script, salle d'attente, e-mail, réseaux, exactitude et consentement.",
    description: "Guide des vidéos d'information patient pour cabinets dentaires : sujets prioritaires, modèle de script, salle d'attente, e-mail et réseaux, exactitude et consentement éclairé.",
    h1: "Vidéos d'information patient au cabinet dentaire",
    intro:
      "Une vidéo d'information patient est un film de 30 à 90 secondes qui explique ce qu'est un soin dentaire, comment il se déroule et quelles précautions prendre ensuite. Elle sert à apaiser l'appréhension avant le rendez-vous, à rappeler les consignes à la maison et à donner à chaque patient la même explication exacte. Elle ne remplace pas l'information orale due par le praticien.",
    sections: [
      {
        heading: "Ce qu'une vidéo d'information résout",
        paragraphs: [
          "Une partie de ce qui est dit au fauteuil est oubliée une fois rentré, surtout quand le patient était anxieux ou encore sous anesthésie. Une vidéo courte se revoit quand il le faut. L'équipe n'a plus à répondre dix fois par jour à la même question, et chacun reçoit la même information, relue.",
          "En France, l'information du patient est d'abord orale, délivrée par le praticien au cours d'un entretien individuel ; les documents et vidéos la complètent sans la remplacer. Voyez la vidéo comme une préparation et un aide-mémoire.",
        ],
      },
      {
        heading: "Par quoi commencer",
        paragraphs: ["Commencez par ce que l'équipe explique tous les jours. Trois moments fonctionnent bien :"],
        list: [
          "Avant la première visite : ce qui se passe au premier rendez-vous, quoi apporter, pourquoi une radio.",
          "Avant un soin : dévitalisation, implant, extraction, détartrage, gouttières, expliqués étape par étape.",
          "Après un soin : consignes après extraction, manger après un soin de carie, hygiène avec implants, sensibilité après blanchiment.",
          "Pour les enfants et les familles : dents de lait, première visite, scellement des sillons et fluor.",
        ],
      },
      {
        heading: "Un modèle de script qui fonctionne",
        paragraphs: ["La même structure simple facilite l'écriture et le visionnage :"],
        list: [
          "Question (3 premières secondes) : « Quand puis-je manger après une extraction ? »",
          "Réponse courte (1 phrase) : « En général dès que l'anesthésie s'estompe, avec des aliments tièdes et mous. »",
          "Pourquoi (1–2 phrases) : l'importance du caillot pour la cicatrisation.",
          "Que faire (2–3 points) : consignes propres à l'acte, comme éviter les boissons chaudes, la paille et le tabac le premier jour.",
          "Quand appeler (1 phrase) : « Si le saignement ou la douleur augmentent, appelez-nous. »",
          "Conclusion : « Votre dentiste vous donnera les consignes adaptées à votre cas. »",
        ],
        ordered: true,
        after: [
          "La partie « quand appeler » est essentielle dans les vidéos de suivi : le patient doit savoir ce qui est normal et ce qui ne l'est pas.",
        ],
      },
      {
        heading: "Rester exact et fiable",
        paragraphs: [
          "Restez sur les recommandations reconnues et nuancez quand les résultats varient : « en général », « chez la plupart des patients », « votre dentiste vous dira ». Gardez des consignes propres à chaque acte : ce qui est juste après une extraction peut être faux après un soin de carie.",
          "Le texte qui accompagne la vidéo doit dire la même chose qu'elle, et un praticien doit voir chaque vidéo avant publication. Sur les réseaux, les règles de [communication du chirurgien-dentiste](guide:communication-chirurgien-dentiste-reseaux-sociaux) s'appliquent.",
        ],
      },
      {
        heading: "Où les utiliser",
        paragraphs: ["La même vidéo courte sert à plusieurs endroits :"],
        list: [
          "Instagram, TikTok et YouTube Shorts comme contenu d'information",
          "Écran de salle d'attente, en boucle sans son et sous-titrée",
          "Rappel de rendez-vous ou e-mail de suivi, si le patient a accepté ce canal",
          "Pages de soins du site du cabinet",
        ],
        after: [
          "Pour l'envoi par e-mail ou messagerie, il faut une base légale adaptée et un canal sécurisé ; les envois de prospection sans consentement ne sont pas permis.",
        ],
      },
      {
        heading: "Accessibilité et patients d'autres langues",
        paragraphs: [
          "Les sous-titres aident les personnes malentendantes et celles qui regardent sans le son. Des phrases courtes, un vocabulaire courant et la traduction de chaque terme technique (« parodontite, c'est-à-dire une maladie avancée des gencives ») rendent la vidéo compréhensible.",
          "Si vous soignez des patients plus à l'aise en arabe, en anglais, en portugais ou en turc, disposer des consignes les plus fréquentes dans ces langues limite les malentendus.",
        ],
      },
      {
        heading: "Les intégrer au quotidien de l'équipe",
        paragraphs: [
          "Les vidéos ne servent que si l'équipe les utilise. L'accueil peut envoyer « Votre premier rendez-vous » avec la confirmation ; l'assistante, recommander la vidéo de suivi en fin de soin ; le praticien, dire « il existe une courte vidéo à revoir chez vous ». Un simple tableau « quel soin, quelle vidéo » suffit. Relisez les vidéos une fois par an ou dès que votre protocole change.",
        ],
      },
      {
        heading: "Parler soi-même ou en voix off ?",
        paragraphs: [
          "Les patients font confiance à la personne qui va les soigner ; les vidéos où le praticien explique lui-même sont les plus efficaces. Tourner chaque semaine est rarement réaliste. Un bon équilibre : les sujets les plus fréquents expliqués par vous, le reste en vidéos narrées. Pour tourner en cinq minutes, voyez les [vidéos pour cabinets dentaires](guide:videos-pour-cabinets-dentaires).",
          "[DentVideo](landing:) planifie cinq sujets par semaine à partir de vos soins, rédige, met en voix et sous-titre les vidéos dans votre langue, et vérifie chacune pour l'exactitude clinique et les règles de communication. Vous téléchargez les vidéos validées avec leur texte, pour les réseaux, la salle d'attente ou le site.",
        ],
      },
    ],
    faq: [
      { q: "Quelle durée pour une vidéo d'information patient ?", a: "Pour un sujet, 30 à 90 secondes suffisent le plus souvent. Les traitements longs se découpent en plusieurs vidéos courtes, une par étape." },
      { q: "Une vidéo remplace-t-elle l'information orale du praticien ?", a: "Non. L'information est délivrée lors d'un entretien individuel ; la vidéo prépare et rappelle, elle ne remplace pas cet échange." },
      { q: "Puis-je publier ces vidéos sur Instagram ?", a: "Oui, si elles informent avec prudence et ne contiennent ni promesse de résultat, ni réduction, ni témoignage. Les règles de communication de la profession s'appliquent." },
      { q: "La vidéo de salle d'attente doit-elle avoir du son ?", a: "Non. Sous-titrée, elle se comprend sans le son et gêne moins en salle d'attente." },
      { q: "Qui doit relire les vidéos ?", a: "Un praticien doit regarder chaque vidéo avant publication, en particulier les consignes de suivi, qui doivent correspondre au protocole de votre cabinet." },
      { q: "Par quelles vidéos commencer ?", a: "Par les sujets les plus demandés et les plus anxiogènes : consignes après extraction, dévitalisation, étapes d'un implant et premier rendez-vous." },
    ],
    sources: [LEGIFRANCE, ONCD, RGPD],
  },
  {
    locale: "fr",
    slug: "photos-avant-apres-temoignages-dentiste",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Photos avant/après et témoignages : ce qu'un chirurgien-dentiste peut publier",
    seoTitle: "Photos avant/après dentiste : ce qui est permis",
    seoDescription: "Avant/après, avis et témoignages de patients sur les réseaux d'un cabinet dentaire : déontologie, RGPD, droit à l'image et consentement écrit.",
    description: "Avant/après, avis et témoignages de patients sur les réseaux d'un cabinet dentaire : déontologie, RGPD, droit à l'image, consentement écrit et alternatives sûres. Pas un conseil juridique.",
    h1: "Photos avant/après et témoignages : ce qu'un dentiste peut publier",
    intro:
      "Un chirurgien-dentiste ne doit pas utiliser de témoignages de patients dans sa communication, et un avant/après n'est envisageable qu'avec un consentement écrit, sans retouche et sans laisser croire à un résultat garanti. Les photos de patients sont des données de santé protégées par le RGPD et le secret professionnel : la prudence, voire l'abstention, est la règle.",
    sections: [
      {
        heading: "Pourquoi ces contenus posent problème",
        paragraphs: [
          "Avant/après, avis et remerciements sont des formats très répandus dans d'autres secteurs, et beaucoup d'agences les proposent spontanément. Pour un cabinet dentaire, ils cumulent trois sujets sensibles : la déontologie (témoignages, promesse de résultat), les données de santé (RGPD, secret professionnel) et le droit à l'image du patient.",
        ],
      },
      {
        heading: "Les témoignages de patients",
        paragraphs: [
          "Le code de déontologie modifié en 2020 exclut le recours aux témoignages de tiers dans la communication du chirurgien-dentiste. Concrètement, cela vise les avis Google repris en story, les captures de messages de remerciement, les vidéos de patients racontant leur expérience et les citations de patients sur le site. Les recommandations de l'Ordre vont dans le même sens.",
          "Les avis spontanés publiés par les patients sur des plateformes tierces ne sont pas de votre fait ; c'est leur reprise et leur mise en avant dans votre communication qui pose problème. Répondre à un avis reste possible, avec retenue et sans jamais confirmer qu'une personne est votre patiente.",
        ],
      },
      {
        heading: "Les photos avant/après",
        paragraphs: [
          "Le code ne mentionne pas l'avant/après en tant que tel, mais il interdit l'information trompeuse et l'incitation à des soins inutiles. Un avant/après choisi parmi les plus beaux cas, retouché, ou présenté sans contexte peut laisser croire à un résultat garanti. Les recommandations ordinales invitent à la plus grande prudence ; beaucoup de praticiens y renoncent sur les réseaux.",
          "Si vous en publiez malgré tout, réunissez au minimum ces conditions :",
        ],
        list: [
          "Un consentement écrit, spécifique et révocable du patient pour cet usage précis.",
          "Aucune retouche, même légère, et des conditions de prise de vue identiques avant et après.",
          "Un cas représentatif, accompagné d'une mention indiquant que les résultats varient d'un patient à l'autre.",
          "Aucun élément permettant d'identifier le patient s'il ne l'a pas expressément accepté.",
          "Aucune incitation (« vous aussi », « prenez rendez-vous ») ni offre associée.",
        ],
        after: [
          "En cas de doute, interrogez votre conseil départemental de l'Ordre avant de publier.",
        ],
      },
      {
        heading: "RGPD, secret professionnel et droit à l'image",
        paragraphs: [
          "Une photo intrabuccale, une radiographie ou une vidéo de patient sont des données de santé, catégorie particulière au sens de l'article 9 du RGPD. Leur diffusion suppose, en pratique, un consentement explicite, distinct du consentement aux soins, et ne lève pas le secret professionnel pour autant : ne publiez que ce que le patient a accepté, et rien de plus. Le droit à l'image, protégé par l'article 9 du Code civil, impose lui aussi son accord.",
          "Le consentement doit indiquer ce qui est publié (photo intrabuccale, visage, voix, prénom), où (Instagram, site, salle d'attente) et pour combien de temps, et préciser comment le retirer. Conservez-le avec le dossier.",
        ],
      },
      {
        heading: "Et l'équipe du cabinet ?",
        paragraphs: [
          "Les assistantes, secrétaires et collaborateurs ont eux aussi droit à leur image. Recueillez leur accord écrit avant de les filmer, précisez les usages et convenez de ce que deviennent les vidéos s'ils quittent le cabinet. Un refus doit rester possible sans conséquence sur la relation de travail.",
        ],
      },
      {
        heading: "Des alternatives sans risque",
        paragraphs: [
          "La plupart des contenus utiles se passent de patients réels : le praticien qui explique face caméra, des modèles et maquettes, des schémas, des animations et des vidéos narrées. Plus simples à produire, ils ne deviennent pas inutilisables quand un patient retire son accord et ne posent pas de question déontologique. Des idées dans les [idées de contenu Instagram](guide:idees-contenu-instagram-cabinet-dentaire).",
        ],
      },
      {
        heading: "Checklist",
        paragraphs: [],
        list: [
          "S'agit-il d'un témoignage, d'un avis ou d'un remerciement de patient ? Si oui, ne pas publier.",
          "La personne est-elle reconnaissable (visage, voix, prénom, tatouage, contexte) ?",
          "Avons-nous un consentement écrit, distinct des soins, précis sur l'usage et la durée ?",
          "L'image est-elle brute, représentative et accompagnée d'une mention de variabilité ?",
          "Le texte promet-il un résultat ou incite-t-il à consulter ?",
          "D'autres patients ou des données apparaissent-ils à l'arrière-plan ?",
        ],
      },
      {
        heading: "Ce que fait DentVideo",
        paragraphs: [
          "[DentVideo](landing:) produit des vidéos d'information qui n'ont pas besoin d'images de patients : narrées, sous-titrées, aux couleurs du cabinet, ou découpées dans un enregistrement où vous parlez face caméra. Chaque script est vérifié pour qu'il ne contienne ni promesse ni témoignage ; vous validez tout. Les règles générales sont résumées dans le guide sur la [communication du chirurgien-dentiste](guide:communication-chirurgien-dentiste-reseaux-sociaux). [Voyez vos vidéos avant de payer](start:).",
        ],
      },
    ],
    faq: [
      { q: "Un dentiste peut-il publier des photos avant/après ?", a: "Le code ne les vise pas nommément, mais interdit l'information trompeuse et l'incitation. Avec un consentement écrit, sans retouche et avec une mention de variabilité, le risque baisse ; beaucoup de praticiens préfèrent s'en abstenir. Demandez l'avis de l'Ordre en cas de doute." },
      { q: "Puis-je partager les avis Google de mes patients ?", a: "Non : le recours aux témoignages de tiers est exclu de la communication du chirurgien-dentiste. Vous pouvez répondre à un avis avec retenue, sans confirmer qu'il s'agit d'un patient." },
      { q: "Le consentement aux soins suffit-il pour publier une photo ?", a: "Non. La publication est une finalité distincte qui exige un consentement spécifique, écrit et révocable." },
      { q: "Que faire si un patient retire son consentement ?", a: "Cessez d'utiliser l'image et retirez les publications que vous maîtrisez dans un délai raisonnable. Expliquez cette procédure dès la demande de consentement." },
      { q: "Puis-je publier une radiographie anonymisée ?", a: "Si rien ne permet d'identifier le patient, le risque est bien moindre. Vérifiez tout de même le nom du fichier, les métadonnées et le contexte avant de la publier." },
      { q: "Ce guide est-il un conseil juridique ?", a: "Non. C'est une information générale ; pour un cas précis, adressez-vous à votre conseil de l'Ordre, à votre délégué à la protection des données ou à un avocat." },
    ],
    sources: [LEGIFRANCE, ONCD, RGPD, CNIL],
  },
  {
    locale: "fr",
    slug: "marketing-dentaire-agence-ou-outil",
    topic: "agency-or-tool",
    category: "tools",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Marketing dentaire : agence, community manager, équipe ou outil ?",
    seoTitle: "Marketing dentaire : agence, équipe ou outil ?",
    seoDescription: "Réseaux sociaux du cabinet dentaire : agence, freelance, équipe ou logiciel comparés, questions avant de signer, flux hebdomadaire et responsabilités.",
    description: "Organiser les réseaux sociaux d'un cabinet dentaire : agence, freelance, équipe ou logiciel comparés, questions avant de signer, un flux hebdomadaire et qui est responsable.",
    h1: "Marketing dentaire : agence, équipe ou outil ?",
    intro:
      "Un cabinet dentaire a quatre façons de gérer ses réseaux sociaux : une agence de communication dentaire, un community manager indépendant, un membre de l'équipe ou un outil qui crée le contenu. Dans tous les cas, la question décisive est la même : le contenu respecte-t-il la déontologie des chirurgiens-dentistes, et le praticien valide-t-il chaque publication avant sa mise en ligne ?",
    sections: [
      {
        heading: "D'abord, de quoi avez-vous besoin ?",
        paragraphs: [
          "« Gérer les réseaux » recouvre des tâches très différentes : planifier, écrire, tourner et monter, mettre en forme, publier, répondre aux messages et mesurer. Pour la plupart des cabinets, le plus difficile est de produire régulièrement un contenu exact et conforme. Savoir quelle partie vous voulez déléguer est la première étape d'un bon choix.",
        ],
      },
      {
        heading: "Quatre options, avantages et limites",
        paragraphs: [],
        list: [
          "Agence : prend en charge planification, création et publication, et fait gagner du temps. Souvent coûteuse, et toutes ne connaissent pas la déontologie : promotions, jeux-concours et avant/après sont courants ailleurs mais risqués pour un cabinet.",
          "Community manager indépendant : plus souple et souvent plus abordable, fort en tournage et montage. La continuité repose sur une personne, et la connaissance des règles varie.",
          "Équipe du cabinet : connaît le mieux le cabinet et les patients, le contenu sonne juste. Mais le temps manque et le fauteuil passe toujours en premier.",
          "Outil ou logiciel : produit un contenu régulier, vite et de façon prévisible. Les outils génériques ignorent les règles de la santé ; même avec un outil spécialisé, la vérification finale revient au praticien.",
        ],
      },
      {
        heading: "Les questions à poser avant de signer",
        paragraphs: ["Posez-les à toute agence ou tout indépendant :"],
        list: [
          "Comment vous assurez-vous que le contenu respecte le code de déontologie et les recommandations de l'Ordre ?",
          "Proposez-vous des promotions, jeux-concours, témoignages ou avant/après ? (Si oui, prudence.)",
          "Chaque publication est-elle soumise au praticien avant sa mise en ligne ?",
          "Qui rédige le contenu médical, et qui le relit ?",
          "Qui recueille les consentements des patients et de l'équipe, et où sont-ils conservés ?",
          "Signerons-nous un contrat de sous-traitance RGPD si vous accédez à des données de patients ?",
          "À qui appartiennent les comptes, les rushes et le contenu en fin de contrat ?",
        ],
      },
      {
        heading: "La responsabilité reste au cabinet",
        paragraphs: [
          "Quel que soit l'auteur, le contenu est publié au nom du cabinet. Si une promotion préparée par une agence entraîne une plainte ordinale, c'est le praticien qui en répond. Fixez donc par écrit que rien n'est publié sans validation. La checklist du guide sur la [communication du chirurgien-dentiste](guide:communication-chirurgien-dentiste-reseaux-sociaux) peut servir de base.",
        ],
      },
      {
        heading: "Comparer les propositions",
        paragraphs: ["Les offres couvrent des prestations différentes. Comparez-les avec les mêmes critères :"],
        list: [
          "Combien de publications par semaine arrivent prêtes à publier ?",
          "Combien de temps la validation prend-elle au praticien : un visionnage, ou une réécriture à chaque fois ?",
          "Qui vérifie l'exactitude clinique et la déontologie avant validation ?",
          "Le contenu ressemble-t-il à votre cabinet ou à un modèle envoyé à beaucoup d'autres ?",
          "Que deviennent comptes et contenus si vous changez de prestataire ?",
        ],
        after: [
          "Une période d'essai répond le plus vite à ces questions. Observez surtout si le temps de validation diminue : s'il faut tout réécrire, même une offre bon marché coûte cher.",
        ],
      },
      {
        heading: "Un flux hebdomadaire qui fonctionne",
        paragraphs: [],
        list: [
          "Lundi : choix des sujets de la semaine (questions de patients, saison, soins du cabinet).",
          "Mardi : préparation des vidéos et des textes ; si prévu, le praticien enregistre cinq minutes.",
          "Mercredi : le praticien regarde chaque contenu, valide ou demande une modification.",
          "Jeudi et vendredi : publication de ce qui est validé ; l'équipe répond aux messages.",
          "Fin de mois : ce qui a été vu, les questions reçues ; cela nourrit le mois suivant.",
        ],
        ordered: true,
      },
      {
        heading: "Si l'équipe s'en charge",
        paragraphs: [
          "Si les réseaux sont gérés en interne, faites-en une mission avec un temps fixe chaque semaine, pas une tâche « quand on a le temps ». L'idéal : quelqu'un qui communique bien avec les patients, écrit avec soin et reste discret sur les données. Donnez-lui un résumé des règles et la checklist de validation ; le contenu médical est toujours validé par le praticien.",
          "Préparez aussi des réponses types : demande de rendez-vous, question de prix (en privé et par écrit), douleur ou urgence (numéro du cabinet). Jamais de diagnostic par message privé.",
        ],
      },
      {
        heading: "Le modèle mixte, réaliste pour beaucoup de cabinets",
        paragraphs: [
          "Pour beaucoup de cabinets, ce qui tient dans la durée est un modèle mixte : les vidéos d'information régulières viennent d'un outil ou d'un prestataire, le praticien ajoute une ou deux fois par mois un court enregistrement, et l'équipe publie et répond. Le compte reste actif, il ressemble au cabinet et personne ne subit de pression hebdomadaire. Des sujets dans les [idées de contenu Instagram](guide:idees-contenu-instagram-cabinet-dentaire).",
          "[DentVideo](landing:) est un logiciel pour la partie contenu : il crée cinq vidéos d'information courtes par semaine, vérifie chaque script pour l'exactitude clinique et les règles de communication, et découpe vos enregistrements en extraits sous-titrés. La publication et les réponses restent chez vous ou votre agence : DentVideo ne publie rien lui-même. [Voyez un aperçu à votre logo avant de payer](start:).",
        ],
      },
    ],
    faq: [
      { q: "Une agence de communication dentaire vaut-elle le coup ?", a: "Elle fait gagner du temps, mais peut être risquée si elle ignore la déontologie. L'essentiel est que le praticien valide chaque publication avant sa mise en ligne." },
      { q: "Qui est responsable des erreurs de l'agence ?", a: "Devant l'Ordre, c'est le praticien qui répond de sa communication. Prévoyez par écrit la validation et le partage des responsabilités." },
      { q: "Un outil suffit-il pour les réseaux sociaux ?", a: "Il peut suffire pour produire du contenu régulièrement. Répondre aux messages et la vérification finale restent l'affaire du cabinet." },
      { q: "À qui doivent appartenir les comptes ?", a: "Toujours au cabinet. Donnez des accès par rôle plutôt que des mots de passe personnels, pour ne pas perdre le compte en changeant de prestataire." },
      { q: "Combien de temps le praticien doit-il prévoir chaque semaine ?", a: "Un quart d'heure fixe suffit souvent pour valider, si le contenu arrive déjà vérifié. Ajoutez environ cinq minutes si vous enregistrez vous-même." },
    ],
    sources: [LEGIFRANCE, ONCD, RGPD],
  },
];
