import type { SolutionPage } from "./types";

export const SOLUTIONS_FR: SolutionPage[] = [
  {
    locale: "fr",
    slug: "videos-traitements-cabinet-dentaire",
    kind: "product",
    nav: "Vidéos pour cabinet dentaire",
    anchor: "des vidéos qui présentent les traitements de votre cabinet dentaire, vérifiées avant que vous les voyiez",
    blurb: "Cinq vidéos d'information patient par semaine, commentées et sous-titrées à vos couleurs, vérifiées selon les règles de communication et l'exactitude clinique.",
    queries: ["vidéo présentation cabinet dentaire et ses traitements", "cabinet dentaire video", "video salle d'attente dentiste", "dentiste reseaux sociaux", "marketing dentaire"],
    seoTitle: "Vidéos de présentation des soins dentaires",
    seoDescription:
      "Cinq vidéos d'information patient par semaine, commentées et sous-titrées à vos couleurs, sur les soins de votre cabinet, vérifiées puis validées par vous.",
    h1: "Des vidéos qui présentent les traitements de votre cabinet dentaire, chaque semaine",
    intro:
      "DentVideo est une application web qui réalise chaque semaine cinq courtes vidéos d'information patient pour votre cabinet dentaire : écrites, commentées et sous-titrées, à votre logo et à vos couleurs, uniquement sur les soins que vous proposez. Chaque script est vérifié selon les règles de communication des chirurgiens-dentistes et l'exactitude clinique. Rien n'est publié sans la validation du praticien.",
    sections: [
      {
        heading: "Ce que votre cabinet reçoit chaque semaine",
        paragraphs: ["Vous décrivez le cabinet une fois : langue, soins, ton (vous ou tu), couleurs et logo. Ensuite, une nouvelle semaine est prête chaque lundi et vous recevez un e-mail."],
        list: [
          "Cinq courtes vidéos verticales, d'environ une demi-minute en général, qui répondent aux questions que les patients se posent vraiment.",
          "Une voix claire en français et des sous-titres incrustés, pour que la vidéo se comprenne sans le son.",
          "Votre logo et vos couleurs dans chaque vidéo, et des sujets choisis uniquement parmi vos soins.",
          "Un texte de publication prêt, avec ses hashtags.",
          "Une note motivée lorsqu'un point mérite un second regard.",
        ],
      },
      {
        heading: "Information, pas promotion",
        paragraphs: [
          "En France, le code de déontologie autorise depuis 2020 une communication d'information loyale, mais pas une publicité qui promet un résultat ou se compare aux confrères. Une « vidéo de présentation du cabinet et de ses traitements » doit donc expliquer, pas vendre. DentVideo écrit dans ce registre : à quoi sert un soin, comment il se déroule, ce que le patient peut faire chez lui.",
          "Les formulations souvent problématiques sont écartées : promesse de résultat, « sans douleur », « définitif », superlatifs, prix, remises, avant-après, témoignages. Le détail des règles est dans notre guide [communication du chirurgien-dentiste sur les réseaux sociaux](guide:communication-chirurgien-dentiste-reseaux-sociaux).",
        ],
      },
      {
        heading: "Comment chaque vidéo est vérifiée",
        paragraphs: ["Chaque script et chaque texte passent trois contrôles avant de vous parvenir. Ce qui échoue est réécrit ou n'est pas réalisé."],
        list: [
          "Règles de communication : les affirmations souvent restreintes sont repérées dans dix langues.",
          "Exactitude clinique : un relecteur dans le rôle d'un omnipraticien confronte chaque affirmation aux recommandations courantes.",
          "Son et image : voix présente et audible, pas de silence ni d'image noire, bon format.",
        ],
        after: ["Ce contrôle est un filtre attentif, pas un conseil juridique : le praticien reste responsable de ce qu'il publie."],
      },
      {
        heading: "Salle d'attente, site, réseaux sociaux",
        paragraphs: [
          "Les cabinets les publient surtout en Reels Instagram, sur Facebook, TikTok ou YouTube Shorts. Les mêmes vidéos trouvent leur place sur les pages de soins de votre site, dans un message avant un rendez-vous ou sur un écran vertical en salle d'attente. Le guide [vidéos d'information patient](guide:videos-information-patient-dentaire) détaille chaque usage, et les [idées de contenu Instagram](guide:idees-contenu-instagram-cabinet-dentaire) aident à remplir le mois.",
        ],
      },
      {
        heading: "Votre propre visage, quand vous avez cinq minutes",
        paragraphs: [
          "Les patients font volontiers confiance à la personne qui va les soigner. Avec les formules qui incluent vos propres enregistrements, une fiche de tournage vous suggère quoi dire ; vous filmez quelques minutes au téléphone et DentVideo en tire de courts extraits sous-titrés à votre logo. Vos mots ne sont jamais modifiés : un extrait à revoir est signalé avec le motif et une formulation proposée. Conseils de tournage : [vidéos pour cabinets dentaires](guide:videos-pour-cabinets-dentaires).",
        ],
      },
      {
        heading: "Ce que DentVideo ne fait pas",
        paragraphs: ["Pour éviter toute surprise :"],
        list: [
          "Il ne publie pas à votre place : vous validez, téléchargez ou partagez, et publiez vous-même.",
          "Il ne gère pas de publicité payante, ne répond pas aux commentaires et ne tourne pas au cabinet.",
          "Il ne promet pas de patients. Il vous rend visible avec des réponses claires ; les résultats dépendent de nombreux facteurs.",
          "Ce n'est pas une banque d'animations de soins : chaque vidéo est faite pour votre cabinet.",
        ],
      },
      {
        heading: "Pour commencer",
        ordered: true,
        paragraphs: [],
        list: [
          "[Créez un compte](start:) et décrivez votre cabinet : langue, soins, ton, couleurs, logo.",
          "Regardez un aperçu en direct de vos propres vidéos avant de payer.",
          "Choisissez une formule mensuelle, sans engagement. Voir les [formules](landing:).",
          "Votre première semaine est réalisée juste après le paiement, puis chaque lundi.",
        ],
      },
    ],
    faq: [
      { q: "DentVideo tourne-t-il un film de présentation dans mon cabinet ?", a: "Non. DentVideo ne filme pas sur place : il réalise de courtes vidéos d'information sur vos soins. Pour une visite filmée du cabinet, faites appel à un vidéaste ; DentVideo s'occupe des vidéos de chaque semaine." },
      { q: "Les vidéos utilisent-elles des avatars ou de faux patients ?", a: "Non. La voix est synthétique, mais il n'y a ni avatar, ni faux praticien, ni patient. Les images ne montrent que des objets et chaque vidéo porte votre logo et vos couleurs." },
      { q: "Puis-je diffuser les vidéos en salle d'attente ?", a: "Oui, sur un écran installé à la verticale : les vidéos sont au format téléphone. Pour la musique d'ambiance et les droits de diffusion en salle d'attente, des règles propres s'appliquent, à vérifier indépendamment de DentVideo." },
      { q: "Puis-je voir mes vidéos avant de payer ?", a: "Oui. Après avoir décrit votre cabinet, vous voyez un aperçu en direct avec votre logo, vos couleurs et votre nom. La première semaine complète est réalisée juste après le choix d'une formule." },
      { q: "Le contrôle vaut-il conseil juridique ?", a: "Non. Il repère les affirmations souvent restreintes et signale ce qui mérite un second regard, mais les règles évoluent. Vous validez chaque vidéo." },
    ],
    guides: ["videos-information-patient-dentaire", "videos-pour-cabinets-dentaires", "idees-contenu-instagram-cabinet-dentaire", "communication-chirurgien-dentiste-reseaux-sociaux", "calendrier-editorial-cabinet-dentaire"],
    published: "2026-11-09",
    reviewed: "2026-11-10",
  },
];
