import type { LegalText } from "./types";

/** Français. Traduction ; la version anglaise prévaut. */
export const FR: LegalText = {
  ui: {
    updated: "Dernière mise à jour",
    prevails: "Ceci est une traduction. Le texte qui fait foi est la {english} ; en cas de divergence, elle prévaut.",
    englishVersion: "version anglaise",
    country: "Monténégro",
    operator: {
      company: "Société",
      legalForm: "Forme juridique",
      legalFormValue: "Société à responsabilité limitée de droit monténégrin",
      office: "Siège social",
      register: "Registre",
      registerValue: "Registre central des entités commerciales (CRPS), Monténégro",
      registrationNumber: "Numéro d'immatriculation",
      taxId: "Identifiant fiscal (PIB)",
      director: "Gérant",
      contact: "E-mail",
      brand: "Marque",
      brandValue: "{brand} — produit : DentVideo",
    },
    table: { provider: "Prestataire", purpose: "Finalité", data: "Données", location: "Localisation" },
  },

  subprocessors: {
    hostinger: {
      purpose: "Serveur privé virtuel qui fait tourner dentvideo.com, le traitement des vidéos, notre base de données, les connexions et le stockage des fichiers (notre propre installation du logiciel libre Supabase).",
      data: "Toutes les données du service : compte, profil du cabinet, fichiers envoyés, vidéos, références de facturation, journaux.",
      location: "Allemagne (UE)",
    },
    openai: {
      purpose: "Rédige et relit les scripts, crée la narration en voix de synthèse et transcrit les enregistrements envoyés lorsque notre propre service de transcription est indisponible.",
      data: "Informations du profil du cabinet utilisées dans les scripts, texte des scripts, audio des enregistrements (pour la transcription).",
      location: "États-Unis",
    },
    resend: {
      purpose: "Envoie les e-mails du service (codes de vérification, « vos vidéos sont prêtes », avis de paiement).",
      data: "Adresse e-mail, nom du cabinet, contenu de l'e-mail.",
      location: "États-Unis",
    },
    dodo: {
      purpose: "Paiement, abonnements, factures, taxes et remboursements en tant que marchand officiel (merchant of record). Pour les données de paiement, Dodo Payments est responsable de traitement indépendant.",
      data: "Adresse e-mail, nom et coordonnées de facturation, données de paiement, statut de l'abonnement.",
      location: "Voir la politique de confidentialité de Dodo Payments",
    },
  },

  docs: {
    terms: {
      title: "Conditions d'utilisation",
      description: "Les conditions d'utilisation de DentVideo, le service de vidéos d'information patients pour cabinets dentaires, exploité par BLS AI Automation DOO (Bulsu Labs), Podgorica, Monténégro.",
      intro: [
        "Ces conditions constituent le contrat entre {legalName} (« nous »), qui exploite DentVideo sous la marque {brand}, et le cabinet ou le professionnel qui crée un compte DentVideo (« vous »). En créant un compte ou en payant une formule, vous les acceptez. Si vous les acceptez pour un cabinet, vous confirmez être habilité à l'engager.",
        "Nous les avons rédigées simplement. Si quelque chose n'est pas clair, écrivez à {email} avant de vous abonner.",
      ],
      sections: [
        { heading: "1. Qui sommes-nous", blocks: [{ operator: true }] },
        {
          heading: "2. Réservé aux professionnels",
          blocks: [
            "DentVideo est un outil pour les cabinets dentaires et les professionnels du dentaire. Il est proposé uniquement aux entreprises et professionnels agissant pour leur cabinet, et non aux consommateurs ni aux patients. En l'utilisant, vous confirmez agir dans le cadre de votre activité professionnelle.",
          ],
        },
        {
          heading: "3. Le service",
          blocks: [
            "DentVideo réalise de courtes vidéos d'information patients, narrées et sous-titrées, pour les cabinets dentaires. Chaque semaine, il planifie des sujets à partir des soins que vous proposez, rédige les scripts, les narre avec une voix de synthèse, génère les vidéos avec le nom, les couleurs et le logo de votre cabinet et applique des contrôles automatiques de formulation publicitaire en santé et de plausibilité clinique. Dans les formules qui l'incluent, il transforme aussi vos enregistrements en courts clips sous-titrés.",
            "DentVideo n'est pas un dispositif médical et ne fournit aucun conseil médical, juridique ou réglementaire.",
          ],
        },
        {
          heading: "4. Vous validez tout avant publication",
          blocks: [
            "Rien de ce que DentVideo produit n'est publié automatiquement, et DentVideo ne publie pas sur les réseaux sociaux. Vous décidez de valider, télécharger et partager chaque vidéo, et vous êtes l'éditeur de ce que vous partagez.",
            "Nos contrôles sont une aide, pas une garantie. Les scripts sont rédigés et relus par des modèles d'IA et peuvent contenir des erreurs. Avant de publier, il vous appartient de vérifier que chaque vidéo est exacte pour votre cabinet et respecte les règles qui vous sont applicables : déontologie de votre ordre, règles de publicité en santé et règles des plateformes.",
          ],
        },
        {
          heading: "5. Votre compte",
          blocks: [
            "Donnez des informations exactes sur votre cabinet et gardez vos identifiants confidentiels. Vous êtes responsable de ce qui se passe sur votre compte. Prévenez-nous à {email} si vous pensez qu'un tiers l'a utilisé.",
          ],
        },
        {
          heading: "6. Formules, prix et paiement",
          blocks: [
            "DentVideo se paie d'avance ; il n'y a pas d'essai gratuit. Avant de payer, vous voyez un aperçu en direct de vidéos aux nom, couleurs et logo de votre cabinet. Formules actuelles, en dollars américains :",
            {
              list: [
                "Starter : {starter} par mois.",
                "Practice : {practice} par mois ou {practiceYear} par an.",
                "Group (groupes et cabinets multisites) : conditions sur mesure par accord — contact {email}. Group ne peut pas être acheté sur le site.",
                "Offre fondateur : Practice mensuel à {foundingPrice} par mois pendant vos {foundingMonths} premiers mois, réservé aux {foundingClinics} premiers cabinets. Après ces {foundingMonths} mois, l'abonnement continue au prix normal de Practice, {practice} par mois, sauf résiliation. L'offre prend fin lorsque {foundingClinics} cabinets en ont bénéficié.",
              ],
            },
            "Les paiements sont gérés par Dodo Payments, qui agit en tant que marchand officiel (merchant of record) et revendeur autorisé : il vous vend l'abonnement, débite votre moyen de paiement, apparaît sur votre relevé de carte, calcule et perçoit les taxes applicables et émet votre facture. Les conditions acheteur de Dodo Payments s'appliquent aussi à l'achat. Nous ne voyons jamais vos données de carte complètes.",
            "Les abonnements se renouvellent automatiquement à la fin de chaque période (mensuelle ou annuelle) jusqu'à leur résiliation. Si un paiement échoue, nous pouvons suspendre les nouvelles vidéos jusqu'à régularisation.",
            "Nous pouvons modifier les prix catalogue. Nous vous prévenons par e-mail au moins 30 jours à l'avance, et un nouveau prix ne s'applique qu'à partir de votre prochain renouvellement après ce préavis.",
          ],
        },
        {
          heading: "7. Résiliation et remboursements",
          blocks: [
            "Vous pouvez résilier à tout moment ; la résiliation prend effet à la fin de la période payée et vous gardez l'accès jusque-là. Les paiements d'une période commencée ne sont pas remboursés au prorata, sauf si la loi l'exige ou si le service a fait défaut. Les détails figurent dans notre [Politique de remboursement](refunds), qui fait partie de ces conditions.",
          ],
        },
        {
          heading: "8. Vos contenus et les données des patients",
          blocks: [
            "Vous conservez tous les droits sur ce que vous envoyez : logo, informations du cabinet et enregistrements. Vous nous autorisez à les stocker et les traiter uniquement pour faire fonctionner DentVideo pour vous, y compris en les transmettant aux prestataires listés dans notre [Politique de confidentialité](privacy).",
            "Vous confirmez avoir le droit d'utiliser ce que vous envoyez et que toute personne qui apparaît ou parle dans un enregistrement y a consenti.",
            "DentVideo est conçu pour fonctionner sans données de patients. N'envoyez pas de dossiers patients. Si un enregistrement montre ou nomme un patient, il vous faut son consentement explicite et documenté. Pour les données personnelles contenues dans vos envois, vous êtes responsable de traitement et nous agissons comme votre sous-traitant selon notre [Accord de sous-traitance](dpa), qui fait partie de ces conditions.",
            "DentVideo n'est pas conçu pour agir en tant que « business associate » au sens de la loi HIPAA et ne doit pas servir à stocker ou traiter des informations de santé protégées au sens du droit américain.",
          ],
        },
        {
          heading: "9. Ce que vous obtenez",
          blocks: [
            "Les vidéos, scripts et sous-titres réalisés pour votre cabinet peuvent être utilisés pour la communication de votre cabinet, y compris après résiliation pour tout ce que vous avez téléchargé.",
            "Certaines vidéos contiennent des images d'archive de Pexels, utilisées sous la licence Pexels, et une voix de synthèse. Vous pouvez les utiliser dans les vidéos, mais pas séparément (par exemple en extrayant et revendant les images).",
            "Nous n'utilisons ni vos envois ni vos vidéos pour entraîner des modèles d'IA, et nous ne montrons pas les vidéos de votre cabinet à d'autres clients.",
            "DentVideo lui-même (logiciel, design, modèles et marque) reste notre propriété.",
          ],
        },
        {
          heading: "10. Usage acceptable",
          blocks: [
            "N'utilisez pas DentVideo pour créer des contenus trompeurs, illicites ou promettant des résultats de traitement, et n'essayez pas de casser, surcharger, copier ou revendre le service, ni d'accéder aux données d'autres cabinets.",
            "Nous pouvons suspendre ou fermer un compte qui enfreint ces conditions. Lorsque c'est possible, nous vous prévenons d'abord et vous laissons l'occasion de corriger.",
          ],
        },
        {
          heading: "11. Disponibilité et évolutions",
          blocks: [
            "Nous faisons en sorte de livrer vos vidéos chaque semaine, mais nous ne pouvons garantir que le service soit toujours disponible ou exempt d'erreurs. La livraison hebdomadaire peut être retardée, par exemple par une panne chez l'un de nos prestataires.",
            "Nous améliorons DentVideo en continu et pouvons en modifier le fonctionnement. Si nous retirons un élément essentiel de votre formule, nous vous prévenons à l'avance et vous pouvez résilier.",
          ],
        },
        {
          heading: "12. Responsabilité",
          blocks: [
            "Rien dans ces conditions ne limite une responsabilité qui ne peut l'être légalement, comme celle pour faute intentionnelle ou faute lourde.",
            "Pour le reste, nous ne sommes pas responsables des dommages indirects (par exemple perte de bénéfices, perte de patients ou atteinte à la réputation), et notre responsabilité totale pour l'ensemble des réclamations est limitée aux sommes que vous nous avez versées au cours des 12 mois précédant la réclamation.",
            "Comme vous validez et publiez chaque vidéo, vous êtes responsable des réclamations liées aux contenus que vous publiez, y compris les plaintes au titre des règles de publicité en santé.",
          ],
        },
        {
          heading: "13. Fin du contrat",
          blocks: [
            "Vous pouvez mettre fin au contrat en résiliant votre formule et en supprimant votre compte dans les Réglages. Nous pouvons y mettre fin avec un préavis de 30 jours, ou immédiatement en application de l'article 10. Lorsqu'un compte est supprimé, nous supprimons ses données comme décrit dans la [Politique de confidentialité](privacy).",
          ],
        },
        {
          heading: "14. Modification des conditions",
          blocks: [
            "Nous pouvons mettre à jour ces conditions. Nous vous informons par e-mail des modifications importantes au moins 30 jours avant leur entrée en vigueur. Si vous continuez à utiliser DentVideo ensuite, les nouvelles conditions s'appliquent ; si vous ne les acceptez pas, vous pouvez résilier avant leur entrée en vigueur.",
          ],
        },
        {
          heading: "15. Droit applicable et juridiction",
          blocks: [
            "Ces conditions sont régies par le droit du Monténégro, et les tribunaux de Podgorica sont compétents. Cela ne vous prive d'aucune protection que vous accorde la loi impérative du pays où vous êtes établi et à laquelle il ne peut être dérogé par contrat.",
            "Le texte anglais de ces conditions fait foi. Les traductions sont fournies pour plus de commodité ; en cas de divergence, la version anglaise prévaut.",
          ],
        },
        { heading: "16. Contact", blocks: ["Questions sur DentVideo : {email}. Questions relatives à la société : {companyEmail}."] },
      ],
    },

    privacy: {
      title: "Politique de confidentialité",
      description: "Les données personnelles traitées par DentVideo, pourquoi, quels prestataires les reçoivent, combien de temps elles sont conservées et vos droits.",
      intro: [
        "Cette politique explique quelles données personnelles {legalName} (« nous ») traite lorsqu'un cabinet utilise DentVideo ou qu'une personne visite dentvideo.com, pourquoi, qui d'autre les reçoit et combien de temps nous les conservons.",
        "DentVideo est conçu pour fonctionner sans données de patients. Les patients n'utilisent pas DentVideo, et nous demandons aux cabinets de n'envoyer rien qui permette d'identifier un patient sans son consentement.",
      ],
      sections: [
        {
          heading: "1. Responsable du traitement",
          blocks: [
            "Le responsable du traitement des données de compte, de facturation et du site est :",
            { operator: true },
            "Pour les enregistrements et autres contenus qu'un cabinet envoie, c'est le cabinet qui décide quoi envoyer et pourquoi : il est responsable de traitement et nous traitons ces données pour son compte selon notre [Accord de sous-traitance](dpa).",
            "Questions et demandes relatives à la vie privée : {email}.",
          ],
        },
        {
          heading: "2. Données collectées",
          blocks: [
            {
              list: [
                "Compte : votre adresse e-mail et vos identifiants (nous stockons une empreinte du mot de passe, jamais le mot de passe), ainsi que la confirmation de votre adresse.",
                "Profil du cabinet : nom, ville et pays, langue, soins proposés, ton, identifiant de réseau social, lien de prise de rendez-vous, couleurs de marque et logo.",
                "Enregistrements envoyés (dans les formules qui les incluent) : vidéo et audio, contenant la voix et l'image des personnes filmées, et une transcription.",
                "Ce que nous réalisons pour vous : sujets, scripts, sous-titres, narration, vidéos générées, résultats des contrôles et vos validations.",
                "Facturation : votre formule, le statut de l'abonnement, la date de renouvellement et les références d'abonnement, de client et de paiement de Dodo Payments. Les données de carte sont traitées par Dodo Payments et ne nous parviennent jamais.",
                "E-mails : les e-mails de service envoyés à votre cabinet et votre éventuelle désinscription des rappels.",
                "Événements d'usage : un petit journal interne d'étapes comme « page d'accueil vue » ou « formule choisie », avec la langue de la page, les balises de campagne (utm) et le domaine du site d'origine. Ils ne contiennent ni identifiant de cookie, ni adresse IP, ni données de navigateur, ni nom ou e-mail.",
                "Données techniques : votre adresse IP et les données de requête sont traitées pour afficher les pages, sécuriser le service et limiter les abus (compteurs de limitation de courte durée).",
              ],
            },
          ],
        },
        {
          heading: "3. Cookies et stockage du navigateur",
          blocks: [
            "Nous n'utilisons que ce dont le service a besoin : des cookies de session pour la connexion, un cookie qui mémorise votre langue, un cookie qui mémorise votre progression dans l'inscription et un stockage temporaire du navigateur pendant l'inscription. Nous n'utilisons aucun cookie publicitaire ni de mesure d'audience tiers.",
          ],
        },
        {
          heading: "4. Finalités et bases légales",
          blocks: [
            {
              list: [
                "Fournir DentVideo dans le cadre de notre contrat : réaliser vos vidéos, traiter vos enregistrements, les afficher dans votre bibliothèque et vous écrire à leur sujet (exécution du contrat).",
                "Encaisser les paiements et gérer votre abonnement (exécution du contrat).",
                "Sécuriser le service, prévenir les abus et corriger les erreurs (intérêt légitime).",
                "Comprendre quelles pages et quels canaux amènent des cabinets, grâce aux événements d'usage anonymes ci-dessus (intérêt légitime).",
                "Envoyer des rappels concernant une inscription inachevée, que vous pouvez arrêter via le lien de désinscription (intérêt légitime).",
                "Respecter nos obligations légales, comme la tenue des registres comptables et fiscaux (obligation légale).",
              ],
            },
            "Nous ne vendons pas de données personnelles, ne les utilisons pas à des fins publicitaires et n'utilisons ni vos envois ni vos vidéos pour entraîner des modèles d'IA.",
          ],
        },
        {
          heading: "5. Destinataires",
          blocks: [
            "Nous travaillons avec peu de prestataires. Chacun ne reçoit que ce dont il a besoin pour sa tâche :",
            { subprocessors: true },
            "Nous interrogeons aussi des termes de recherche généraux (comme le nom d'un soin et une langue) dans les suggestions de recherche publiques de Google et dans la banque de vidéos Pexels. Ces requêtes ne contiennent aucune donnée personnelle. La base de données, les connexions et le stockage des fichiers fonctionnent sur notre propre installation du logiciel libre Supabase sur notre serveur ; Supabase Inc. ne reçoit pas les données.",
          ],
        },
        {
          heading: "6. Transferts internationaux",
          blocks: [
            "Nous sommes établis au Monténégro, hors de l'UE/EEE. Certains prestataires traitent des données dans d'autres pays, notamment aux États-Unis. Lorsque la loi applicable aux données exige une garantie pour un tel transfert, nous nous appuyons sur une décision d'adéquation lorsqu'elle existe ou sur des clauses contractuelles types (avec l'avenant britannique pour le Royaume-Uni) dans nos contrats avec ces prestataires.",
          ],
        },
        {
          heading: "7. Durées de conservation",
          blocks: [
            {
              list: [
                "Compte, profil du cabinet, envois et vidéos : tant que votre compte existe. Lorsque vous supprimez votre compte dans les Réglages, nous supprimons immédiatement de nos systèmes en production vos fichiers, vidéos, profil du cabinet et références de facturation, ainsi que vos identifiants, sauf si vous les utilisez aussi pour une autre application de {brand}. Les copies dans les sauvegardes du serveur sont écrasées au fil de leur rotation ; au plus tard 30 jours après la suppression, nous ne conservons plus aucune donnée DentVideo sur votre compte, sauf ce qui est indiqué ci-dessous. Nous ne restaurons pas de comptes supprimés à partir des sauvegardes.",
                "Événements d'usage : conservés comme statistiques anonymes ; la suppression de votre compte supprime leur lien avec votre cabinet.",
                "Factures et justificatifs de paiement : conservés par Dodo Payments en tant que marchand officiel selon ses propres obligations légales, et par nous dans la mesure exigée par le droit comptable et fiscal.",
                "Compteurs de limitation : de quelques minutes à quelques heures.",
              ],
            },
          ],
        },
        {
          heading: "8. Vos droits",
          blocks: [
            "Selon la loi qui vous est applicable, vous pouvez demander l'accès à vos données, leur rectification, leur effacement, la limitation du traitement et une copie dans un format portable, et vous opposer à un traitement fondé sur l'intérêt légitime. Vous pouvez supprimer vous-même votre compte dans les Réglages. Écrivez à {email} ; nous répondons dans un délai d'un mois.",
            "Vous pouvez aussi saisir une autorité de protection des données : au Monténégro, l'Agence pour la protection des données personnelles et le libre accès à l'information ; dans l'UE/EEE, l'autorité de votre pays (en France, la CNIL) ; au Royaume-Uni, l'Information Commissioner's Office ; en Turquie, l'Autorité de protection des données personnelles (KVKK).",
            "Nous appliquons la loi monténégrine sur la protection des données personnelles et, lorsqu'ils s'appliquent à nos traitements, le règlement général sur la protection des données de l'UE (RGPD), le UK GDPR et la loi turque n° 6698 sur la protection des données personnelles (KVKK).",
          ],
        },
        {
          heading: "9. Sécurité",
          blocks: [
            "Les connexions sont chiffrées (HTTPS). Les données de chaque cabinet sont isolées dans la base de données par des règles d'accès, les fichiers ne sont servis que par des liens signés de courte durée, et l'accès aux serveurs est limité aux personnes qui exploitent DentVideo. Aucun système n'est parfaitement sûr ; si une violation touche vos données, nous vous en informons dans les meilleurs délais.",
          ],
        },
        { heading: "10. Mineurs", blocks: ["DentVideo est un service professionnel qui ne s'adresse pas aux personnes de moins de 18 ans."] },
        {
          heading: "11. Modifications",
          blocks: [
            "Nous mettons cette politique à jour lorsque nos pratiques changent et modifions la date en haut de page. Nous informons par e-mail les titulaires de compte des modifications importantes.",
          ],
        },
      ],
    },

    refunds: {
      title: "Politique de remboursement",
      description: "Comment fonctionnent la résiliation et les remboursements des abonnements DentVideo, y compris l'offre fondateur.",
      intro: ["Cette politique fait partie de nos [Conditions d'utilisation](terms). En bref : résiliez quand vous voulez, gardez l'accès jusqu'à la fin de la période payée, et si le service a fait défaut, nous rectifions."],
      sections: [
        {
          heading: "1. Résilier",
          blocks: [
            "Vous pouvez résilier à tout moment dans les Réglages (Gérer la facturation) ou en écrivant à {email}. La résiliation arrête le prochain renouvellement ; elle prend effet à la fin de la période mensuelle ou annuelle déjà payée, et vous gardez un accès complet jusque-là. Les vidéos téléchargées restent les vôtres. La suppression de votre compte résilie aussi l'abonnement, immédiatement.",
          ],
        },
        {
          heading: "2. Pas de remboursement au prorata",
          blocks: [
            "Nous ne remboursons pas la partie non utilisée d'une période commencée, mensuelle ou annuelle, sauf si la loi exige un remboursement ou si le service a fait défaut comme décrit ci-dessous. Si vous changez de formule, la différence pour le reste de la période en cours est facturée ou créditée immédiatement.",
          ],
        },
        {
          heading: "3. Lorsque le service a fait défaut",
          blocks: [
            "Si, à cause d'un problème de notre côté, les vidéos d'une semaine n'ont pas été livrées ou étaient inutilisables, signalez-le à {email} dans les 14 jours. Nous referons les vidéos de cette semaine ou rembourserons la part de votre paiement correspondant à cette période, à notre choix. Les retards de quelques jours dus à une panne chez l'un de nos prestataires, ou les vidéos que vous refusez par goût, ne constituent pas un défaut.",
          ],
        },
        {
          heading: "4. Offre fondateur",
          blocks: [
            "L'offre fondateur donne aux {foundingClinics} premiers cabinets la formule Practice à {foundingPrice} par mois pendant {foundingMonths} mois, payée mensuellement. Après ces {foundingMonths} mois, le même abonnement continue au prix normal de Practice, {practice} par mois, sauf résiliation. Le prix fondateur est lié à cet abonnement : si vous résiliez, il prend fin et pourrait ne plus être proposé.",
          ],
        },
        {
          heading: "5. Comment les remboursements sont versés",
          blocks: [
            "Dodo Payments est le marchand officiel de chaque achat DentVideo ; les remboursements sont donc versés par Dodo Payments sur le moyen de paiement d'origine, y compris les taxes perçues sur le montant remboursé. Écrivez-nous d'abord à {email} ; vous pouvez aussi vous adresser à Dodo Payments selon ses conditions acheteur. Votre banque peut mettre quelques jours à afficher le remboursement.",
          ],
        },
        {
          heading: "6. Vos droits légaux",
          blocks: [
            "DentVideo est vendu aux entreprises et aux professionnels. Si une loi impérative vous accorde néanmoins un droit de rétractation ou de remboursement, ce droit s'applique en plus de cette politique.",
          ],
        },
      ],
    },

    dpa: {
      title: "Accord de sous-traitance des données",
      description: "L'accord de sous-traitance de DentVideo au titre de l'article 28 du RGPD : ce que nous traitons pour les cabinets, comment, et la liste des sous-traitants ultérieurs.",
      intro: [
        "Cet accord de sous-traitance (« DPA ») fait partie des [Conditions d'utilisation](terms) entre le cabinet (« responsable de traitement ») et {legalName} (« sous-traitant »). Il s'applique dès que des contenus que le cabinet place dans DentVideo contiennent des données personnelles dont le cabinet est responsable. Il est conclu par l'acceptation des Conditions ; aucune signature n'est nécessaire. Sur demande, nous le fournissons aussi signé.",
      ],
      sections: [
        { heading: "1. Sous-traitant", blocks: [{ operator: true }] },
        {
          heading: "2. Objet, nature et finalité",
          blocks: [
            "Nous traitons les données personnelles du cabinet uniquement pour fournir DentVideo : stocker les envois, transcrire les enregistrements, rédiger, narrer et générer les vidéos, effectuer les contrôles, afficher les résultats dans la bibliothèque du cabinet et envoyer les e-mails de service. Le traitement dure tant que le cabinet utilise DentVideo, plus le délai d'effacement de l'article 9.",
            {
              list: [
                "Personnes concernées : dentistes et personnel du cabinet ; personnes qui apparaissent ou parlent dans les enregistrements envoyés par le cabinet ; patients uniquement si le cabinet envoie des contenus qui les identifient.",
                "Catégories de données : noms, adresses e-mail, image et voix, transcriptions, informations du profil du cabinet. DentVideo n'a pas besoin de données de santé ; elles ne sont traitées que si le cabinet les envoie, auquel cas il lui incombe de disposer d'une base légale et du consentement explicite du patient.",
              ],
            },
          ],
        },
        {
          heading: "3. Instructions",
          blocks: [
            "Nous traitons les données uniquement sur instruction documentée du cabinet — les Conditions, ce DPA et l'utilisation des réglages du service —, sauf obligation légale contraire ; dans ce cas, nous l'en informons au préalable, sauf si la loi l'interdit. Si nous estimons qu'une instruction enfreint le droit de la protection des données, nous le signalons au cabinet.",
          ],
        },
        { heading: "4. Confidentialité", blocks: ["Toute personne chez {shortName} ayant accès aux données est tenue à la confidentialité."] },
        {
          heading: "5. Mesures de sécurité",
          blocks: [
            {
              list: [
                "Chiffrement en transit (HTTPS) pour toutes les connexions au site, à l'application et à notre base de données.",
                "Isolation des données de chaque cabinet par des règles d'accès en base de données ; un cabinet ne peut lire que ses propres lignes et fichiers.",
                "Fichiers servis uniquement par des liens signés de courte durée ; envois limités en type et en taille.",
                "Accès aux serveurs et aux comptes prestataires limité aux personnes qui exploitent DentVideo.",
                "Limites de requêtes et de dépenses pour chaque étape de traitement payante.",
                "Suppression de compte en libre-service, qui efface les données du cabinet comme décrit à l'article 9.",
              ],
            },
          ],
        },
        {
          heading: "6. Sous-traitants ultérieurs",
          blocks: [
            "Le cabinet donne une autorisation générale pour les sous-traitants ultérieurs ci-dessous. Nous imposons à chacun des obligations de protection des données au moins aussi protectrices que ce DPA, dans la mesure permise par leurs conditions standard, et restons responsables d'eux.",
            { subprocessors: true },
            "Nous prévenons le cabinet par e-mail au moins 30 jours avant d'ajouter ou de remplacer un sous-traitant ultérieur. Si le cabinet s'y oppose pour des motifs raisonnables liés à la protection des données et que nous ne trouvons pas de solution, il peut résilier et nous remboursons les sommes payées d'avance pour la période postérieure au changement.",
            "Ne sont pas des sous-traitants ultérieurs : Supabase est un logiciel libre que nous exploitons nous-mêmes sur le serveur ci-dessus (Supabase Inc. ne reçoit aucune donnée). Les suggestions de recherche de Google et la banque de vidéos Pexels ne reçoivent que des termes de recherche généraux, jamais de données personnelles. Dodo Payments agit, pour les données de paiement, en tant que responsable de traitement indépendant selon ses propres conditions.",
          ],
        },
        {
          heading: "7. Transferts internationaux",
          blocks: [
            "Nous sommes établis au Monténégro, hors de l'UE/EEE, et certains sous-traitants ultérieurs traitent des données aux États-Unis. Lorsque le RGPD, le UK GDPR ou une autre loi applicable exige un mécanisme de transfert pour les données qui nous sont envoyées ou envoyées à un sous-traitant ultérieur, les parties s'appuient sur une décision d'adéquation lorsqu'elle existe, à défaut sur les clauses contractuelles types de la Commission européenne (module responsable–sous-traitant ou sous-traitant–sous-traitant, avec l'avenant britannique le cas échéant), que nous signons sur demande.",
          ],
        },
        {
          heading: "8. Assistance, violations et audits",
          blocks: [
            {
              list: [
                "Nous aidons le cabinet à répondre aux demandes des personnes concernées, par exemple en retrouvant ou en supprimant des contenus, dans la mesure où le service le permet.",
                "Nous aidons le cabinet en matière de sécurité, d'analyses d'impact et de consultation des autorités lorsqu'elles concernent notre traitement.",
                "Nous notifions au cabinet toute violation de données personnelles touchant ses données dans les meilleurs délais après en avoir pris connaissance, avec les informations dont nous disposons.",
                "Nous mettons à disposition les informations nécessaires pour démontrer le respect de ce DPA et permettons des audits moyennant un préavis raisonnable, au plus une fois par an sauf exigence d'une autorité, aux frais du cabinet.",
              ],
            },
          ],
        },
        {
          heading: "9. Effacement à la fin",
          blocks: [
            "Le cabinet peut télécharger ses vidéos à tout moment. Lorsqu'il supprime son compte, nous effaçons immédiatement ses données de nos systèmes en production ; les copies dans les sauvegardes sont écrasées au fil de leur rotation et, au plus tard sous 30 jours, plus aucune donnée du cabinet ne reste chez nous, sauf obligation légale de conservation.",
          ],
        },
        {
          heading: "10. Droit applicable et primauté",
          blocks: [
            "Ce DPA suit le droit applicable et la juridiction des Conditions, sans limiter les droits des personnes concernées ou des autorités au titre du RGPD ou d'une autre loi applicable sur la protection des données. En cas de contradiction avec les Conditions sur la protection des données, ce DPA prévaut. Le texte anglais fait foi.",
          ],
        },
      ],
    },

    imprint: {
      title: "Mentions légales",
      description: "Mentions légales de dentvideo.com : BLS AI Automation DOO, Podgorica, Monténégro — registre, identifiant fiscal, gérant et contact.",
      intro: ["Informations sur l'éditeur de dentvideo.com (au titre du § 5 de la loi allemande sur les services numériques, DDG, et de l'article 5 de la directive européenne sur le commerce électronique)."],
      sections: [
        { heading: "Éditeur", blocks: [{ operator: true }] },
        { heading: "Directeur de la publication", blocks: ["{director}, {address}."] },
        {
          heading: "Règlement des litiges",
          blocks: [
            "DentVideo s'adresse aux entreprises et aux professionnels. Nous ne sommes ni tenus ni disposés à participer à une procédure de règlement des litiges devant un médiateur de la consommation.",
          ],
        },
      ],
    },
  },
};
