import type { Guide } from "../dentvideo";

// Vidéos d'information patient par traitement, écrites pour les cabinets en
// France (pas une traduction) : ce que demandent les patients, les vidéos
// courtes qui y répondent et les formulations à éviter au regard de l'article
// R. 4127-215-1 du CSP et des recommandations de l'Ordre. Vouvoiement ; ni prix,
// ni statistiques, ni témoignages.

const R4127_215_1 = { label: "Légifrance : Code de la santé publique, article R. 4127-215-1 (communication du chirurgien-dentiste)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042743767" };
const ONCD = {
  label: "Ordre national des chirurgiens-dentistes : Communication professionnelle des chirurgiens-dentistes (recommandations)",
  url: "https://www.ordre-chirurgiens-dentistes.fr/pour-le-chirurgien-dentiste/communication-professionnelle-des-chirurgiens-dentistes/",
};
const DIR_WHITENING = {
  label: "Directive 2011/84/UE du Conseil relative aux produits cosmétiques (produits de blanchiment dentaire au peroxyde d'hydrogène), EUR-Lex",
  url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32011L0084",
};

const DATES = { published: "2026-11-16", updated: "2026-11-16", reviewed: "2026-11-16" } as const;

export const TREATMENTS_FR: Guide[] = [
  {
    locale: "fr",
    slug: "blanchiment-dentaire-videos-information-patient",
    topic: "treatment-whitening",
    category: "treatments",
    ...DATES,
    sample: "blanchiment-email",
    title: "Blanchiment dentaire : les vidéos d'information patient à faire, et les formulations à éviter",
    seoTitle: "Blanchiment dentaire : vidéos d'information patient",
    seoDescription:
      "Des vidéos courtes sur le blanchiment pour le cabinet : émail, sensibilité, couronnes, kits du commerce, et les promesses de résultat à laisser de côté.",
    description:
      "Les questions des patients sur le blanchiment, six vidéos courtes qui y répondent, un script en cinq temps et les formulations que la déontologie et le droit européen rendent délicates.",
    h1: "Blanchiment dentaire : quelles vidéos d'information patient, et quoi éviter",
    intro:
      "Une vidéo d'information patient sur le blanchiment répond à une seule question en quelques dizaines de secondes, sous-titrées : le blanchiment abîme-t-il l'émail, pourquoi les dents sont-elles sensibles ensuite, les couronnes vont-elles changer de teinte, les kits vendus en ligne sont-ils équivalents ? Le blanchiment est un acte esthétique, donc le sujet où une publication de cabinet glisse le plus facilement vers la publicité. Les vidéos utiles expliquent les faits et renvoient la décision à la consultation.",
    sections: [
      {
        heading: "Que demandent les patients sur le blanchiment ?",
        paragraphs: [
          "Les questions sur le blanchiment portent surtout sur la sécurité et sur ce qu'on peut en attendre. Elles reviennent au fauteuil semaine après semaine, et chacune peut faire l'objet d'une courte vidéo. Partez de celles que votre équipe entend le plus ; la liste ci-dessous est un point de départ.",
        ],
        list: [
          "Le blanchiment fragilise-t-il l'émail ?",
          "Pourquoi mes dents sont-elles sensibles après un blanchiment, et combien de temps cela dure-t-il ?",
          "Mes couronnes, facettes ou composites vont-ils blanchir aussi ?",
          "Quelle différence entre le blanchiment au cabinet, les gouttières à domicile et les kits du commerce ?",
          "Puis-je boire du café ou du thé juste après ?",
          "Combien de temps dure le résultat ?",
          "Le blanchiment est-il possible pendant la grossesse ou pour un adolescent ?",
          "Pourquoi le chirurgien-dentiste veut-il m'examiner d'abord ?",
        ],
        after: [
          "La question « combien ça coûte ? » est légitime, mais un tarif mis en avant dans une publication devient vite un argument commercial, ce que la déontologie proscrit. Sa place est dans l'information sur les honoraires et le devis, pas dans une vidéo sur les réseaux sociaux.",
        ],
      },
      {
        heading: "Quelles vidéos de blanchiment réaliser ?",
        paragraphs: ["Six vidéos couvrent la plupart de ces questions, sans promettre de teinte ni de résultat."],
        table: {
          caption: "Six vidéos sur le blanchiment et leurs usages",
          columns: ["Vidéo", "Ce qu'elle explique", "Où elle sert le plus"],
          rows: [
            ["Blanchiment et émail : le vrai du faux", "Ce qu'un blanchiment encadré par le praticien fait et ne fait pas à l'émail", "Réseaux sociaux"],
            ["La sensibilité après un blanchiment", "Pourquoi elle apparaît, qu'elle est le plus souvent passagère, ce qui la soulage", "Message après le soin, réseaux sociaux"],
            ["Couronnes et composites ne blanchissent pas", "Pourquoi les restaurations existantes se planifient", "Avant la consultation"],
            ["Cabinet ou kit du commerce ?", "Examen préalable, encadrement, et ce que le droit européen réserve au chirurgien-dentiste", "Réseaux sociaux, site du cabinet"],
            ["Les premiers jours après le blanchiment", "Café, thé, vin rouge, tabac, quand appeler le cabinet", "Message après le soin"],
            ["Pourquoi un examen d'abord ?", "Caries, gencives et restaurations à vérifier avant de commencer", "Site du cabinet, salle d'attente"],
          ],
        },
        after: [
          "Pour la vidéo « cabinet ou kit du commerce ? », un fait objectif suffit : en droit européen, les produits de blanchiment contenant ou dégageant plus de 0,1 et jusqu'à 6 pour cent de peroxyde d'hydrogène ne peuvent être vendus qu'aux praticiens de l'art dentaire, la première utilisation de chaque cycle est réalisée par le praticien ou sous sa supervision directe, et ces produits ne s'utilisent pas chez les moins de 18 ans (directive 2011/84/UE, voir les sources). Dites-le sobrement, sans dénigrer de marque ni d'enseigne.",
        ],
      },
      {
        heading: "Quelles formulations éviter dans une vidéo de blanchiment ?",
        paragraphs: [
          "Depuis le décret du 22 décembre 2020, l'article R. 4127-215-1 du Code de la santé publique permet au chirurgien-dentiste de communiquer au public des informations loyales, honnêtes et non comparatives, mais l'exercice de la profession comme un commerce reste interdit. Un acte esthétique concentre les risques : promesse de résultat, avant/après, prix d'appel. Le guide sur la [communication du chirurgien-dentiste sur les réseaux sociaux](guide:communication-chirurgien-dentiste-reseaux-sociaux) reprend les textes, et celui sur les [photos avant/après et les témoignages](guide:photos-avant-apres-temoignages-dentiste) détaille la question des images.",
        ],
        table: {
          caption: "Blanchiment : formulations risquées et alternatives",
          columns: ["Formulation risquée", "Pourquoi elle pose problème", "Formulation plus sûre"],
          rows: [
            ["« Huit teintes plus blanc »", "Promesse d'un résultat qui dépend de la teinte de départ de chacun", "« Le gain de teinte dépend de la couleur d'origine de vos dents »"],
            ["« Résultat immédiat en une séance »", "Trompeur quand plusieurs séances ou plusieurs jours sont habituels", "« Nous vous expliquons combien de séances ou de jours votre traitement demande en général »"],
            ["« Zéro sensibilité »", "La sensibilité passagère est un effet secondaire fréquent", "« Une sensibilité passagère est possible ; nous vous expliquons comment la soulager »"],
            ["Photos avant/après d'un patient", "Mise en avant d'un résultat, consentement écrit indispensable", "Une explication avec un teintier ou une illustration"],
            ["« Offre blanchiment avant l'été »", "Procédé commercial incompatible avec l'interdiction d'exercer comme un commerce", "Aucune offre ni aucun prix dans les vidéos"],
            ["« Le sourire des stars »", "Promesse d'apparence et appel à la célébrité", "« Nous vous expliquons ce que le blanchiment peut et ne peut pas changer »"],
          ],
          note: "Repères généraux, pas un conseil juridique. En cas de doute, votre conseil départemental de l'Ordre peut vous orienter.",
        },
        after: [
          "Avant de publier, collez la légende dans notre [vérificateur gratuit « Ma publication est-elle autorisée ? »](checker:) : un premier filtre qui repère promesses et superlatifs en quelques secondes, sans remplacer votre relecture.",
        ],
      },
      {
        heading: "Comment construire une vidéo de blanchiment en 30 secondes ?",
        ordered: true,
        paragraphs: ["Les cinq mêmes temps fonctionnent pour tous les sujets de blanchiment :"],
        list: [
          "La question ou l'idée reçue dès la première seconde : « Le blanchiment fragilise vraiment l'émail ? »",
          "La réponse en une ou deux phrases simples, sans nombre de teintes.",
          "Le conseil pratique : ce qu'il vaut mieux éviter les premiers jours, ou ce qui soulage la sensibilité.",
          "La limite, dite franchement : couronnes et composites gardent leur teinte, le résultat varie d'une personne à l'autre.",
          "Une invitation plutôt qu'un argument de vente : « Parlez-en lors de votre prochain rendez-vous. »",
        ],
        after: [
          "La vidéo en haut de cette page est un véritable exemple DentVideo construit sur ce modèle. Sous-titrez toujours : beaucoup de patients regardent sans le son. Le guide des [vidéos d'information patient](guide:videos-information-patient-dentaire) détaille durées, sous-titres et usage en salle d'attente.",
        ],
      },
      {
        heading: "Quand publier les vidéos sur le blanchiment ?",
        paragraphs: [
          "L'intérêt pour le blanchiment grimpe souvent avant les mariages, l'été et les fêtes, et c'est là que la tentation est forte de remplir le compte de contenus esthétiques. Gardez l'équilibre : un fil consacré au blanchiment ressemble à une vitrine. Une vidéo de blanchiment par mois, entourée de prévention et de questions du quotidien, est un rythme raisonnable ; le guide sur la [fréquence de publication](guide:frequence-publication-cabinet-dentaire) aide à organiser la semaine, et le [calendrier éditorial](guide:calendrier-editorial-cabinet-dentaire) à placer les sujets dans l'année.",
          "La vidéo des premiers jours sert aussi hors des réseaux : envoyée par SMS ou par e-mail le jour du soin, elle met les consignes à portée de main du patient. Et un cabinet qui explique pourquoi il vérifie d'abord caries et gencives, et qui dit clairement que le résultat varie, inspire davantage confiance qu'une promesse de teinte parfaite.",
        ],
      },
      {
        heading: "Comment DentVideo réalise vos vidéos sur le blanchiment ?",
        paragraphs: [
          "Si le blanchiment fait partie de vos actes, [DentVideo](landing:) intègre à vos cinq vidéos hebdomadaires des sujets sur les idées reçues et les consignes après le soin, commentés et sous-titrés aux couleurs du cabinet. Chaque script est vérifié par logiciel sur les teintes promises, les « résultats immédiats », les prix et l'exactitude clinique avant de vous parvenir, et rien n'est publié sans votre validation. [Voyez un aperçu avec votre logo](start:) avant de choisir une formule, ou retrouvez [tous les guides](guides:).",
        ],
      },
    ],
    faq: [
      {
        q: "Un cabinet peut-il publier des photos avant/après de blanchiment ?",
        a: "C'est délicat : l'image met en avant un résultat, elle exige le consentement écrit du patient, et la communication doit rester loyale et non commerciale. Une vidéo explicative sans photo de patient évite la question.",
      },
      {
        q: "Peut-on parler des kits de blanchiment vendus en ligne ?",
        a: "Oui, de façon factuelle : la différence entre un blanchiment encadré après examen et un produit acheté sans avis, et ce que le droit européen réserve au praticien. Évitez de citer ou de critiquer une marque.",
      },
      {
        q: "Publier une vidéo de blanchiment chaque semaine, est-ce une bonne idée ?",
        a: "Mieux vaut éviter. Un compte dominé par un acte esthétique ressemble à de la publicité. Alternez avec la prévention, les enfants et les questions du quotidien.",
      },
    ],
    sources: [R4127_215_1, ONCD, DIR_WHITENING],
  },
];
