import type { Guide } from "../dentvideo";

// Vídeos educativos por tratamiento, escritos para clínicas en España (no una
// traducción): qué preguntan los pacientes, qué vídeos cortos lo responden y qué
// frases evitar según la publicidad sanitaria y el código deontológico. Tuteo,
// como el resto de guías en español; sin precios, estadísticas ni testimonios.

const RD1907 = { label: "Real Decreto 1907/1996, publicidad con pretendida finalidad sanitaria (BOE)", url: "https://www.boe.es/eli/es/rd/1996/08/02/1907/con" };
const CGD = { label: "Consejo General de Dentistas de España: Código Español de Ética y Deontología Dental", url: "https://consejodentistas.es/" };
const DIR_WHITENING = {
  label: "Directiva 2011/84/UE del Consejo sobre productos cosméticos (blanqueadores dentales con peróxido de hidrógeno), EUR-Lex",
  url: "https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32011L0084",
};

const DATES = { published: "2026-11-16", updated: "2026-11-16", reviewed: "2026-11-16" } as const;

export const TREATMENTS_ES: Guide[] = [
  {
    locale: "es",
    slug: "blanqueamiento-dental-videos-educativos-pacientes",
    topic: "treatment-whitening",
    category: "treatments",
    ...DATES,
    title: "Blanqueamiento dental en vídeos para pacientes: qué preguntan, qué grabar y qué frases evitar",
    seoTitle: "Blanqueamiento dental: vídeos educativos",
    seoDescription:
      "Vídeos cortos sobre blanqueamiento para tu clínica: esmalte, sensibilidad, coronas, kits de venta libre y las promesas de resultado que conviene evitar.",
    description:
      "Las preguntas de los pacientes sobre el blanqueamiento, seis vídeos cortos que las responden, un guion en cinco pasos y las frases que la publicidad sanitaria y la deontología vuelven delicadas.",
    h1: "Blanqueamiento dental en vídeos para pacientes: qué grabar y qué evitar",
    intro:
      "Un vídeo educativo sobre blanqueamiento responde a una sola pregunta en pocos segundos y con subtítulos: si daña el esmalte, por qué aparece sensibilidad, si cambiará el color de las coronas o si los kits que se venden por internet son lo mismo. El blanqueamiento es un tratamiento estético, así que es el tema en el que una publicación de clínica se convierte con más facilidad en publicidad. Los vídeos útiles explican los hechos y dejan la decisión para la consulta.",
    sections: [
      {
        heading: "¿Qué preguntan los pacientes sobre el blanqueamiento?",
        paragraphs: [
          "Casi todas las dudas sobre el blanqueamiento tienen que ver con la seguridad y con lo que se puede esperar. Se repiten en el gabinete semana tras semana, y cada una sirve para un vídeo corto. Empieza por las que más oye tu equipo; esta lista es un punto de partida.",
        ],
        list: [
          "¿El blanqueamiento debilita o desgasta el esmalte?",
          "¿Por qué noto sensibilidad después y cuánto dura?",
          "¿Se aclaran también las coronas, las carillas o los empastes?",
          "¿Qué diferencia hay entre el blanqueamiento en clínica, las férulas en casa y los kits de venta libre?",
          "¿Puedo tomar café, té o vino tinto justo después?",
          "¿Cuánto dura el resultado?",
          "¿Se puede hacer durante el embarazo o en adolescentes?",
          "¿Por qué el dentista quiere revisarme antes?",
        ],
        after: [
          "La pregunta «¿cuánto cuesta?» es legítima, pero un precio en una publicación se convierte enseguida en reclamo comercial, y los descuentos y ofertas son de lo más vigilado en la publicidad dental. Su sitio es el presupuesto y la consulta, no un vídeo en redes.",
        ],
      },
      {
        heading: "¿Qué vídeos de blanqueamiento conviene grabar?",
        paragraphs: ["Seis vídeos responden a casi todas estas dudas sin prometer un tono ni un resultado."],
        table: {
          caption: "Seis vídeos sobre blanqueamiento y dónde ayuda cada uno",
          columns: ["Vídeo", "Qué explica", "Dónde ayuda más"],
          rows: [
            ["Blanqueamiento y esmalte: mitos", "Qué hace y qué no hace al esmalte un blanqueamiento supervisado por el dentista", "Redes sociales"],
            ["La sensibilidad después del blanqueamiento", "Por qué aparece, que suele ser pasajera y qué la alivia", "Mensaje después del tratamiento, redes sociales"],
            ["Coronas y empastes no se blanquean", "Por qué hay que planificar las restauraciones que ya existen", "Antes de la consulta"],
            ["¿Clínica o kit de venta libre?", "Revisión previa, supervisión y lo que la normativa europea reserva al dentista", "Redes sociales, web de la clínica"],
            ["Los primeros días después", "Café, té, vino tinto, tabaco y cuándo llamar a la clínica", "Mensaje después del tratamiento"],
            ["¿Por qué revisamos primero?", "Caries, encías y restauraciones que hay que descartar antes de empezar", "Web de la clínica, sala de espera"],
          ],
        },
        after: [
          "Para el vídeo «¿clínica o kit de venta libre?» basta un dato objetivo: según el derecho europeo, los productos blanqueadores que contienen o liberan más del 0,1 y hasta el 6 por ciento de peróxido de hidrógeno solo pueden venderse a profesionales de la odontología, el primer uso de cada ciclo lo hace el dentista o se hace bajo su supervisión directa, y no se usan en menores de 18 años (Directiva 2011/84/UE, ver fuentes). Cuéntalo con calma, sin alarmar y sin criticar marcas concretas.",
        ],
      },
      {
        heading: "¿Qué frases evitar en un vídeo de blanqueamiento?",
        paragraphs: [
          "El Real Decreto 1907/1996 prohíbe, entre otras cosas, garantizar la ausencia de efectos adversos o usar testimonios para inducir al consumo, y el código deontológico dental pide una comunicación veraz y prudente que no cree falsas expectativas. Un tratamiento estético reúne todos los riesgos: promesas de resultado, antes y después, precios como gancho. La guía de [publicidad sanitaria para dentistas](guide:publicidad-sanitaria-dentistas) resume las normas, y la de [consentimiento para fotos de pacientes](guide:consentimiento-fotos-pacientes-clinica-dental) trata el uso de imágenes.",
        ],
        table: {
          caption: "Blanqueamiento: frases arriesgadas y alternativas",
          columns: ["Frase arriesgada", "Por qué da problemas", "Alternativa más prudente"],
          rows: [
            ["«Ocho tonos más blanco»", "Promete un resultado que depende del color de partida de cada persona", "«Cuánto se aclaran los dientes depende de su color de partida»"],
            ["«Resultados inmediatos en una sesión»", "Engañoso si lo habitual son varias sesiones o varios días", "«Te explicamos cuántas sesiones o días suele llevar tu tratamiento»"],
            ["«Sin sensibilidad»", "La sensibilidad pasajera es un efecto secundario frecuente; no se puede garantizar su ausencia", "«Algunas personas notan sensibilidad pasajera; te contamos cómo aliviarla»"],
            ["Fotos de antes y después de un paciente", "Destacan un resultado y exigen un consentimiento expreso por escrito", "Una explicación con guía de colores o una ilustración"],
            ["«Promoción de blanqueamiento para el verano»", "Los descuentos y ofertas como reclamo son de lo más vigilado en publicidad dental", "Ni ofertas ni precios en los vídeos"],
            ["«La sonrisa de los famosos»", "Promete una apariencia y apela a personas conocidas, algo especialmente vigilado en publicidad dental", "«Te explicamos qué puede cambiar el blanqueamiento y qué no»"],
          ],
          note: "Son orientaciones generales, no asesoramiento jurídico. Revisa además la normativa de tu comunidad autónoma.",
        },
        after: [
          "Antes de publicar, pega el texto en nuestro [comprobador gratuito «¿Mi publicación está permitida?»](checker:): un primer filtro que detecta promesas y superlativos en segundos, sin sustituir tu revisión.",
        ],
      },
      {
        heading: "¿Cómo se monta un vídeo de blanqueamiento de 30 segundos?",
        ordered: true,
        paragraphs: ["Los mismos cinco pasos sirven para cualquier tema de blanqueamiento:"],
        list: [
          "La pregunta o el mito en el primer segundo: «¿El blanqueamiento estropea el esmalte?»",
          "La respuesta en una o dos frases sencillas, sin número de tonos.",
          "El consejo práctico: qué evitar los primeros días o qué ayuda con la sensibilidad.",
          "El límite, dicho con claridad: coronas y empastes mantienen su color y el resultado varía de una persona a otra.",
          "Una invitación, no una venta: «Pregúntanos en tu próxima revisión si el blanqueamiento es para ti.»",
        ],
        after: [
          "Subtitula siempre: muchos pacientes ven los vídeos sin sonido. La guía de [vídeos educativos para pacientes](guide:videos-educativos-pacientes-dentales) explica duración, subtítulos y uso en la sala de espera.",
        ],
      },
      {
        heading: "¿Cuándo publicar los vídeos de blanqueamiento?",
        paragraphs: [
          "El interés por el blanqueamiento suele subir antes de las bodas, el verano y las fiestas, y es entonces cuando tienta llenar la cuenta de contenido estético. Mantén el equilibrio: un perfil dedicado solo al blanqueamiento parece un escaparate. Un vídeo de blanqueamiento al mes, rodeado de prevención y dudas del día a día, es un ritmo razonable; la guía sobre [cada cuánto publicar](guide:cada-cuanto-publicar-clinica-dental) ayuda a organizar la semana y el [calendario de contenidos](guide:calendario-contenidos-clinica-dental) a repartir los temas en el año.",
          "El vídeo de los primeros días también sirve fuera de las redes: enviado por WhatsApp o correo el mismo día del tratamiento, el paciente tiene las indicaciones en casa. Y una clínica que explica por qué revisa antes caries y encías, y que dice claramente que el resultado varía, genera más confianza que una promesa de tono perfecto.",
        ],
      },
      {
        heading: "¿Cómo prepara DentVideo los vídeos de blanqueamiento?",
        paragraphs: [
          "Si el blanqueamiento es uno de tus tratamientos, [DentVideo](landing:) incluye en tus cinco vídeos semanales temas sobre mitos y cuidados después del tratamiento, narrados y subtitulados con el logo y los colores de la clínica. Cada guion se revisa por software en busca de tonos prometidos, «resultados inmediatos», precios y exactitud clínica antes de llegarte, y nada se publica sin tu aprobación. [Mira una vista previa con tu logo](start:) antes de elegir plan, o consulta [todas las guías](guides:).",
        ],
      },
    ],
    faq: [
      {
        q: "¿Puede una clínica publicar fotos de antes y después de un blanqueamiento?",
        a: "Es delicado: la imagen destaca un resultado, exige el consentimiento expreso del paciente por escrito y algunas comunidades autónomas vigilan especialmente este tipo de publicidad. Un vídeo explicativo sin fotos de pacientes evita el problema.",
      },
      {
        q: "¿Se puede hablar de los kits de blanqueamiento de venta libre?",
        a: "Sí, de forma objetiva: la diferencia entre un blanqueamiento supervisado tras una revisión y un producto comprado sin consejo profesional, y lo que la normativa europea reserva al dentista. Evita nombrar o criticar marcas.",
      },
      {
        q: "¿Es buena idea publicar un vídeo de blanqueamiento cada semana?",
        a: "Conviene evitarlo. Un perfil dominado por un tratamiento estético parece publicidad. Alterna con prevención, odontopediatría y preguntas del día a día.",
      },
    ],
    sources: [DIR_WHITENING, RD1907, CGD],
  },
];
