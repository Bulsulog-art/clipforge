import type { Guide } from "../dentvideo";

// Guías en español (España y Latinoamérica). Reglas: solo lo que es cierto hoy;
// sin estadísticas inventadas ni precios; normativa prudente y con fuentes oficiales.

const RD1907 = { label: "Real Decreto 1907/1996, publicidad con pretendida finalidad sanitaria — BOE", url: "https://www.boe.es/eli/es/rd/1996/08/02/1907/con" };
const LGP = { label: "Ley 34/1988, General de Publicidad — BOE", url: "https://www.boe.es/eli/es/l/1988/11/11/34/con" };
const LGS = { label: "Ley 14/1986, General de Sanidad — BOE", url: "https://www.boe.es/eli/es/l/1986/04/25/14/con" };
const LOPDGDD = { label: "Ley Orgánica 3/2018, de Protección de Datos (LOPDGDD) — BOE", url: "https://www.boe.es/eli/es/lo/2018/12/05/3/con" };
const LO1982 = { label: "Ley Orgánica 1/1982, derecho a la propia imagen — BOE", url: "https://www.boe.es/eli/es/lo/1982/05/05/1/con" };
const RGPD = { label: "Reglamento General de Protección de Datos (RGPD), art. 9 — EUR-Lex", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj" };
const AEPD = { label: "Agencia Española de Protección de Datos (AEPD)", url: "https://www.aepd.es/" };
const CGD = { label: "Consejo General de Dentistas de España — Código Español de Ética y Deontología Dental", url: "https://consejodentistas.es/" };
const TS_FAMOSOS = { label: "Poder Judicial — El Tribunal Supremo avala la prohibición de difundir publicidad de clínicas de odontología utilizando a personas famosas", url: "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Noticias-Judiciales/El-Tribunal-Supremo-avala-la-prohibicion-de-difundir-publicidad-de-clinicas-de-odontologia-utilizando-a-personas-famosas" };
const DEFENSOR = { label: "Defensor del Pueblo — Control específico de la publicidad de las clínicas dentales (recomendación)", url: "https://www.defensordelpueblo.es/resoluciones/control-especifico-de-la-publicidad-de-las-clinicas-dentales" };
const COFEPRIS = { label: "COFEPRIS (México) — publicidad de servicios de salud", url: "https://www.gob.mx/cofepris" };

export const GUIDES_ES: Guide[] = [
  {
    locale: "es",
    slug: "videos-para-clinicas-dentales",
    topic: "instagram-videos",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Vídeos para clínicas dentales en redes sociales: temas, formato y publicidad sanitaria",
    seoTitle: "Vídeos para clínicas dentales: temas y formato",
    seoDescription: "Qué vídeos cortos ven los pacientes, formato Reels, subtítulos, frecuencia y qué limita la publicidad sanitaria en España a las clínicas dentales.",
    description: "Guía práctica para clínicas dentales: qué vídeos cortos ven los pacientes, formato Reels, subtítulos, frecuencia y qué limita la publicidad sanitaria en España.",
    h1: "Vídeos para clínicas dentales en redes sociales",
    intro:
      "Los vídeos que funcionan en una clínica dental responden en 20 a 60 segundos una sola pregunta de pacientes, en vertical, con subtítulos y un lenguaje prudente. Con uno a tres vídeos a la semana basta. Las promesas de resultados, “sin dolor”, los descuentos, los superlativos y los testimonios de pacientes no deben aparecer, porque la publicidad sanitaria y el código deontológico los limitan.",
    sections: [
      {
        heading: "Por qué los pacientes ven vídeos",
        paragraphs: [
          "Muchos pacientes buscan la clínica en internet antes de pedir cita. Un vídeo corto les deja ver quién les va a tratar, cómo habla y cómo explica las cosas. En una especialidad donde el miedo pesa, esa sensación de conocer ya al dentista suele decidir la cita más que cualquier foto.",
          "El objetivo es informar, no vender. Eso ayuda de verdad al paciente y encaja con las normas: la información sanitaria veraz y prudente es posible; la publicidad engañosa o que induce al consumo, no. Los detalles están en la guía de [publicidad sanitaria para dentistas](guide:publicidad-sanitaria-dentistas).",
        ],
      },
      {
        heading: "Qué temas funcionan",
        paragraphs: [
          "La lista de temas más útil ya la tienes: las preguntas que oyes en el sillón cada día. Responde una sola por vídeo. Si necesitas más, en las [ideas de contenido para Instagram](guide:ideas-contenido-instagram-clinica-dental) hay temas para un año.",
        ],
        list: [
          "¿El blanqueamiento daña el esmalte?",
          "¿Cuánto tarda un tratamiento de implantes y qué fases tiene?",
          "¿Qué debo hacer después de una endodoncia?",
          "¿Cuándo es preocupante que sangren las encías?",
          "¿A qué edad debe ir mi hijo al dentista por primera vez?",
          "¿Cómo limpio mis alineadores transparentes?",
          "¿La limpieza dental desgasta los dientes?",
        ],
        after: [
          "Habla solo de tratamientos que tu clínica realiza de verdad. Un vídeo sobre algo que no ofreces envía a los interesados al sitio equivocado.",
        ],
      },
      {
        heading: "El formato Reels: primer segundo, una idea, subtítulos",
        paragraphs: [
          "En Instagram, los vídeos cortos se publican como Reels en vertical (9:16). Plantea la pregunta en el primer segundo, en voz y en texto en pantalla. Respóndela en dos o tres frases claras y cierra con calma: “Si tienes dudas, lo vemos en tu próxima revisión”. Sin presión y sin ofertas.",
          "Añade subtítulos. Mucha gente mira sin sonido, y los subtítulos ayudan también a personas con problemas de audición y a pacientes cuyo primer idioma no es el español. Colócalos en el tercio inferior, por encima de los iconos de la aplicación.",
        ],
      },
      {
        heading: "Reels, historias y perfil: qué vídeo va dónde",
        paragraphs: [
          "Los Reels son la forma más probable de llegar a quien todavía no te sigue: ideales para pregunta-respuesta. Las historias desaparecen a las 24 horas y sirven para el día a día con quien ya te sigue: un momento de la clínica, un recordatorio, una encuesta. Los vídeos fijados en el perfil son lo primero que ve un visitante nuevo; tres buenos candidatos son tu presentación, “qué pasa en la primera visita” y la pregunta más frecuente.",
          "Ordena las historias destacadas por temas: “Primera visita”, “Después del tratamiento”, “Niños”. Así el paciente encuentra lo que busca en dos toques.",
        ],
      },
      {
        heading: "Constancia antes que volumen",
        paragraphs: [
          "Importa más la constancia que la cantidad. Uno a tres vídeos educativos cortos por semana es asumible para la mayoría de clínicas. Publicar en días fijos facilita el trabajo del equipo y crea hábito en quien te sigue.",
          "Lo más eficiente es grabar cinco minutos hablando y cortar varios clips cortos: una sola sesión cubre la semana. Las semanas sin tiempo para grabar puedes completarlas con vídeos educativos narrados; lo explicamos en la guía de [vídeos educativos para pacientes](guide:videos-educativos-pacientes-dentales).",
        ],
      },
      {
        heading: "Grabar en cinco minutos",
        paragraphs: [],
        list: [
          "Elige tres o cuatro preguntas y anota dos o tres ideas por pregunta; no memorices un guion.",
          "Móvil en vertical, a la altura de los ojos, sobre un trípode o soporte.",
          "De cara a una ventana; nunca con la luz detrás.",
          "Usa un micrófono de solapa si puedes: el sonido importa más que la imagen.",
          "Revisa el encuadre: ni pacientes, ni pantallas con datos, ni radiografías identificables.",
          "Responde cada pregunta como se la explicarías a un paciente y deja dos segundos de silencio entre preguntas.",
        ],
        ordered: true,
      },
      {
        heading: "Lo que no debe salir en el vídeo",
        paragraphs: [
          "En España, la publicidad sanitaria se rige por la Ley General de Sanidad, la Ley General de Publicidad, el Real Decreto 1907/1996 y la normativa de cada comunidad autónoma, además del código deontológico del Consejo General de Dentistas. Son especialmente delicados:",
        ],
        list: [
          "Promesas de resultados y absolutos: “sin dolor”, “garantizado”, “para toda la vida”",
          "Superlativos y comparaciones: “la mejor clínica de Valencia”, “número uno en implantes”",
          "Descuentos, regalos, sorteos y ofertas por tiempo limitado",
          "Imágenes de antes y después que creen falsas expectativas",
          "Testimonios de pacientes usados para inducir a contratar",
          "Pacientes identificables sin consentimiento por escrito",
        ],
        after: [
          "Lo más seguro es informar con prudencia: “normalmente”, “en la mayoría de los casos”, “tu dentista te dirá qué es lo indicado para ti”. Ante la duda, consulta a tu colegio profesional.",
        ],
      },
      {
        heading: "Cómo ayuda DentVideo",
        paragraphs: [
          "[DentVideo](landing:) planifica cada semana cinco temas a partir de tus tratamientos y de preguntas reales de pacientes, escribe y pone voz a los vídeos y los subtitula con tu logo y tus colores. Cada guion se revisa dos veces: en afirmaciones publicitarias restringidas y en precisión clínica. Tus propias grabaciones nunca se reescriben; lo dudoso se marca con el motivo. Nada se publica sin tu aprobación. [Mira una vista previa con tu logo antes de pagar](start:).",
        ],
      },
    ],
    faq: [
      { q: "¿Cada cuánto debería publicar vídeos una clínica dental?", a: "Importa más la constancia que el volumen. Uno a tres vídeos educativos cortos por semana es asumible para la mayoría de clínicas y mantiene la cuenta activa." },
      { q: "¿Cuánto debe durar un vídeo para Instagram?", a: "Para responder una pregunta suelen bastar 20 a 60 segundos. Los temas largos se entienden más fácilmente divididos en varios vídeos de una pregunta cada uno." },
      { q: "¿Puedo mostrar casos de pacientes?", a: "Solo con consentimiento informado por escrito, y en publicidad las imágenes de antes y después pueden estar limitadas o crear falsas expectativas. Consulta antes la normativa de tu comunidad y a tu colegio." },
      { q: "¿Tiene que salir el dentista en los vídeos?", a: "Si es posible, sí: los pacientes confían en quien les va a tratar. Los vídeos educativos narrados son un buen complemento para las semanas sin grabación." },
      { q: "¿Sirve el mismo vídeo para TikTok y YouTube Shorts?", a: "Sí. Un vídeo vertical con subtítulos funciona en Reels, TikTok y YouTube Shorts; solo adapta el texto de la publicación a cada plataforma." },
    ],
    sources: [RD1907, LGP, CGD],
  },
  {
    locale: "es",
    slug: "publicidad-sanitaria-dentistas",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-10",
    reviewed: "2026-11-10",
    title: "Publicidad sanitaria para dentistas: qué se puede publicar en redes sociales en España",
    seoTitle: "Publicidad sanitaria para dentistas en redes",
    seoDescription: "Qué puede publicar un dentista en redes en España: Ley General de Sanidad, RD 1907/1996, normas autonómicas, código deontológico y checklist.",
    description: "Normativa de publicidad sanitaria para clínicas dentales en redes: Ley General de Sanidad, RD 1907/1996, comunidades autónomas, código deontológico, ejemplos y checklist. No es asesoramiento jurídico.",
    h1: "Publicidad sanitaria para dentistas: qué se puede publicar en redes",
    intro:
      "En España, una clínica dental puede publicar en redes información sanitaria veraz, objetiva y prudente, pero no publicidad engañosa ni que induzca al consumo. La regulan la Ley General de Sanidad, la Ley General de Publicidad, el Real Decreto 1907/1996, la normativa de cada comunidad autónoma y el código deontológico dental. Son especialmente delicados las promesas de resultados, los descuentos, los superlativos y los testimonios.",
    sections: [
      {
        heading: "¿Una publicación en Instagram es publicidad sanitaria?",
        paragraphs: [
          "Para la normativa, lo que publica una clínica para dar a conocer sus servicios suele considerarse publicidad, aunque tenga tono educativo. Da igual el canal: web, Google, Instagram, TikTok o YouTube. También cuentan las publicaciones profesionales que el dentista hace desde su cuenta personal y las de influencers con los que la clínica colabora.",
          "Eso no significa que no se pueda comunicar. Significa que lo que se comunica tiene que ser veraz, objetivo, prudente y no crear falsas expectativas.",
        ],
      },
      {
        heading: "¿Qué normas regulan la publicidad dental en España?",
        paragraphs: ["Resumido y sin pretender ser exhaustivo; revisa siempre el texto vigente:"],
        list: [
          "Ley 14/1986, General de Sanidad: atribuye a las administraciones sanitarias el control de la publicidad sanitaria.",
          "Ley 34/1988, General de Publicidad: prohíbe la publicidad engañosa y desleal en cualquier sector.",
          "Real Decreto 1907/1996: regula la publicidad de productos, actividades o servicios con pretendida finalidad sanitaria y prohíbe, entre otras cosas, garantizar la ausencia de efectos adversos o usar testimonios para inducir al consumo. Su alcance sobre centros sanitarios autorizados se discute, pero sus criterios se usan como referencia.",
          "Comunidades autónomas: varias exigen autorización, registro o comunicación previa de la publicidad sanitaria. Consulta a la consejería de sanidad de tu comunidad.",
          "Código Español de Ética y Deontología Dental: pide una comunicación objetiva, prudente y veraz, que no desprestigie a otros colegas ni cree falsas expectativas.",
        ],
        after: [
          "El Consejo General de Dentistas lleva años pidiendo una ley estatal específica de publicidad sanitaria; conviene seguir sus comunicados por si el marco cambia.",
        ],
      },
      {
        heading: "¿Puede una clínica dental anunciarse con famosos o influencers?",
        paragraphs: [
          "Con mucha cautela. En 2020 el Tribunal Supremo avaló la prohibición de difundir publicidad de clínicas de odontología utilizando a personas famosas, en un caso sobre una campaña de una cadena dental con un actor y una presentadora conocidos. El razonamiento exacto está en la nota del Poder Judicial enlazada en las fuentes; antes de cualquier colaboración con un perfil conocido, consulta a tu colegio o a un abogado sanitario.",
          "El Defensor del Pueblo también ha recomendado a las administraciones un control específico de la publicidad de las clínicas dentales, y los servicios de consumo de algunos ayuntamientos, como el de Madrid, han hecho campañas de inspección centradas en ellas. Es decir: la publicidad dental se mira con lupa, también en redes.",
        ],
      },
      {
        heading: "¿Qué suele estar restringido?",
        paragraphs: [],
        list: [
          "Garantías de resultado y absolutos: “sin dolor”, “resultado garantizado”, “definitivo”, “para toda la vida”",
          "Superlativos y comparaciones con otras clínicas: “los mejores”, “líderes”, “número uno”",
          "Descuentos, “gratis”, regalos, sorteos y ofertas con fecha límite como reclamo",
          "Antes y después que muestren resultados atípicos o retocados",
          "Testimonios, reseñas y agradecimientos de pacientes usados como inducción",
          "Afirmar que un tratamiento no tiene riesgos o efectos adversos",
          "Pacientes identificables sin consentimiento por escrito",
        ],
      },
      {
        heading: "¿Cómo decirlo de forma segura?",
        paragraphs: ["Casi toda la información puede darse sin prometer:"],
        list: [
          "En lugar de “implantes sin dolor”: “Se hace con anestesia local; después, la mayoría de pacientes nota una molestia leve unos días.”",
          "En lugar de “blanqueamiento garantizado”: “El resultado varía según cada persona; antes valoramos si es adecuado para ti.”",
          "En lugar de “para toda la vida”: “Con buena higiene y revisiones, puede durar muchos años.”",
          "En lugar de “la mejor clínica de Sevilla”: datos verificables como tratamientos, titulaciones y horarios.",
          "En lugar de “solo este mes, precio especial”: ninguna oferta.",
        ],
      },
      {
        heading: "Latinoamérica: cada país tiene su autoridad",
        paragraphs: [
          "Si tu clínica está en Latinoamérica o se dirige a pacientes de allí, las reglas son otras. En México, por ejemplo, la publicidad de servicios de salud está regulada por la Ley General de Salud y su reglamento en materia de publicidad, bajo la supervisión de la COFEPRIS. En otros países intervienen el ministerio de salud y el colegio odontológico. Los principios suelen coincidir —veracidad, no engañar, no prometer resultados—, pero los requisitos concretos, como permisos o leyendas obligatorias, cambian. Consulta siempre la normativa local.",
        ],
      },
      {
        heading: "Checklist antes de publicar",
        paragraphs: ["Si alguna respuesta es “sí”, reescribe o consulta:"],
        list: [
          "¿Promete un resultado, ausencia de dolor o duración garantizada?",
          "¿Hay superlativos o comparaciones con otras clínicas?",
          "¿Ofrece descuentos, gratuidad, regalos o sorteos?",
          "¿Hay antes y después o testimonios de pacientes?",
          "¿Aparece alguien identificable, y tenemos su consentimiento por escrito?",
          "¿La información es correcta y corresponde al tratamiento del que se habla?",
          "¿Necesita esta publicidad autorización previa en nuestra comunidad autónoma?",
        ],
      },
      {
        heading: "Cómo hace DentVideo esta revisión",
        paragraphs: [
          "[DentVideo](landing:) revisa cada guion y cada texto en busca de las afirmaciones que la publicidad sanitaria suele restringir —garantías, “sin dolor”, “permanente”, superlativos, precios, descuentos, promesas de antes y después, testimonios— y hace reescribir lo arriesgado. Tus grabaciones no se modifican: lo dudoso se marca con el motivo. No es asesoramiento jurídico; tú apruebas cada vídeo. Para imágenes de pacientes, lee la guía de [consentimiento y fotos de pacientes](guide:consentimiento-fotos-pacientes-clinica-dental); para temas seguros, las [ideas de contenido](guide:ideas-contenido-instagram-clinica-dental).",
        ],
      },
    ],
    faq: [
      { q: "¿Puede un dentista hacer publicidad en Instagram?", a: "Sí, siempre que sea veraz, objetiva y prudente, no engañe ni induzca al consumo, y cumpla la normativa autonómica y el código deontológico. Las promesas de resultados y los descuentos son lo más delicado." },
      { q: "¿Necesito autorización para la publicidad de mi clínica?", a: "Depende de la comunidad autónoma: varias exigen autorización, registro o comunicación previa de la publicidad sanitaria. Consulta a la consejería de sanidad de tu comunidad." },
      { q: "¿Puedo publicar precios u ofertas?", a: "Los precios no están prohibidos de forma general en todas partes, pero las ofertas, descuentos y “gratis” usados como reclamo son delicados en publicidad sanitaria y en el código deontológico. Revisa la norma de tu comunidad antes de hacerlo." },
      { q: "¿Puedo compartir reseñas de Google de mis pacientes?", a: "Los testimonios de pacientes como medio de inducción están restringidos. Además necesitarías su consentimiento. Muchas clínicas optan por no compartirlas en redes." },
      { q: "¿Puedo colaborar con influencers?", a: "La publicidad de influencers debe identificarse como tal y cumplir las mismas reglas que la de la clínica; un influencer elogiando su tratamiento funciona como testimonio. Consulta antes de cerrar una colaboración." },
      { q: "¿Esta guía es asesoramiento jurídico?", a: "No. Es información general; las normas cambian y varían por comunidad y país. Para casos concretos consulta a tu colegio, a la consejería de sanidad o a un abogado." },
    ],
    sources: [LGS, LGP, RD1907, CGD, COFEPRIS, TS_FAMOSOS, DEFENSOR],
  },
  {
    locale: "es",
    slug: "ideas-contenido-instagram-clinica-dental",
    topic: "post-ideas",
    category: "ideas",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Ideas de contenido para Instagram de una clínica dental: un año de temas seguros",
    seoTitle: "Instagram para clínica dental: ideas para un año",
    seoDescription: "Ideas de publicaciones para Instagram, Reels y TikTok de una clínica dental: preguntas de pacientes, tratamientos, equipo, temporada y qué evitar.",
    description: "Ideas de publicaciones para Instagram, Reels y TikTok de clínicas dentales: preguntas de pacientes, tratamientos explicados, equipo, temas de temporada, un mes de ejemplo y qué evitar.",
    h1: "Ideas de contenido para el Instagram de una clínica dental",
    intro:
      "Las publicaciones más seguras y más vistas de una clínica dental son vídeos cortos que responden preguntas frecuentes de pacientes, explican tratamientos paso a paso, dan consejos de cuidado después del tratamiento y presentan al equipo. Las ofertas, los sorteos, los testimonios y las promesas de resultado no deben estar en la lista, porque la publicidad sanitaria los restringe.",
    sections: [
      {
        heading: "Tres reglas para elegir tema",
        paragraphs: ["Tres preguntas bastan para saber si una idea es buena:"],
        list: [
          "¿Lo pregunta de verdad un paciente? Las preguntas del sillón, del teléfono y de Google son los temas más útiles.",
          "¿Lo hacemos en nuestra clínica? Explica solo los tratamientos que ofreces.",
          "¿Informa o empuja? No “pide cita ya, la oferta acaba el viernes”, sino “coméntalo en tu próxima revisión”.",
        ],
      },
      {
        heading: "Preguntas de pacientes, respondidas en corto",
        paragraphs: [
          "Esta serie puede ser la columna vertebral de tu perfil: una pregunta, 20 a 60 segundos, una respuesta prudente. Las búsquedas tipo “es malo…”, “cuánto dura…” o “después de…” muestran lo que preocupa de verdad:",
        ],
        list: [
          "¿Es malo el blanqueamiento dental?",
          "¿Cuánto dura un tratamiento de implantes?",
          "¿Qué puedo comer después de una extracción?",
          "¿Es normal que duela después de una endodoncia?",
          "¿Se puede recuperar la encía retraída?",
          "¿Cómo sé si aprieto los dientes por la noche?",
          "¿De dónde viene el mal aliento?",
        ],
      },
      {
        heading: "Tratamientos explicados y cuidados",
        paragraphs: [
          "El miedo suele venir de lo desconocido. Los vídeos que explican las fases de un tratamiento quitan mucha incertidumbre antes de la cita, y los de cuidados acompañan al paciente en casa. Lo desarrollamos en la guía de [vídeos educativos para pacientes](guide:videos-educativos-pacientes-dentales).",
        ],
        list: [
          "La endodoncia paso a paso: qué pasa y cuánto dura",
          "Las primeras 24 horas después de un empaste",
          "Cómo limpiar y guardar los alineadores",
          "Cepillado correcto, hilo dental y cepillos interproximales",
          "Dientes de leche y primera visita al dentista",
          "Higiene con implantes",
        ],
      },
      {
        heading: "La clínica y el equipo",
        paragraphs: [
          "La gente confía en personas, no en logotipos. Los vídeos de presentación quitan nervios al paciente nuevo. También aquí, objetividad: “Nuestra higienista Marta te cuenta cómo es la primera visita” es información; “el equipo más experto de la ciudad” es un superlativo.",
        ],
        list: [
          "La dentista se presenta: áreas de trabajo y forma de trabajar",
          "Qué pasa en la primera visita",
          "Cómo esterilizamos el instrumental (sin pacientes en imagen)",
          "Cómo llegar, aparcamiento y accesibilidad",
          "Qué hacemos con los pacientes con miedo",
        ],
      },
      {
        heading: "Temas de temporada",
        paragraphs: ["El calendario da excusas fiables, por ejemplo:"],
        list: [
          "Día Mundial de la Salud Bucodental, 20 de marzo",
          "Vuelta al cole: revisiones y cepillado en niños",
          "Navidad y Semana Santa: dulces y dientes, sin sermones",
          "Verano: protector bucal para deporte y cuidado en vacaciones",
          "Halloween: caramelos y caries",
          "Final de año: recordatorio de revisión (información, no oferta)",
        ],
      },
      {
        heading: "De dónde sacar más temas",
        paragraphs: [
          "Cuando se acaba la lista, hay tres fuentes. La primera, tu equipo: recepción y auxiliares oyen cada día qué preguntan los pacientes por teléfono y en el sillón; pídeles que apunten durante una semana cada pregunta. La segunda, Google: escribe “implantes” o “blanqueamiento” en el buscador y mira las sugerencias; patrones como “es malo…”, “cuánto dura…” o “después de…” muestran preocupaciones reales. La tercera, tu propio perfil: los comentarios y mensajes bajo tus vídeos son el siguiente tema.",
          "Las preguntas de precio llegan a menudo, pero no son tema de vídeo. Respóndelas en privado; si se repiten, explica en un vídeo las fases del tratamiento y qué influye en él, sin cifras.",
        ],
      },
      {
        heading: "Texto de la publicación y hashtags",
        paragraphs: [
          "El texto bajo el vídeo repite en breve lo que dice el vídeo y no añade promesas. Funciona bien: la pregunta en la primera línea, la respuesta en dos o tres frases y, al final, “Tu dentista te dirá qué es lo indicado en tu caso”. Nombre de la clínica y ciudad bastan para que te encuentren.",
          "Hashtags: por tema y ciudad (#saludbucodental, #implantesdentales, #dentistamadrid), entre cinco y diez con sentido, antes que treinta al azar. Evita superlativos como “#mejordentista” y cualquier cosa que suene a oferta.",
        ],
      },
      {
        heading: "Qué evitar",
        paragraphs: [
          "Algunos consejos de redes que valen para otros sectores son arriesgados para una clínica dental: promociones y descuentos, sorteos, “lo que dicen nuestros pacientes”, capturas de agradecimientos, carruseles de antes y después y colaboraciones con influencers sin revisión. El porqué está en la guía de [publicidad sanitaria para dentistas](guide:publicidad-sanitaria-dentistas). Para cualquier imagen con un paciente identificable necesitas además su consentimiento por escrito.",
        ],
      },
      {
        heading: "Un mes de ejemplo",
        paragraphs: ["Así puede verse un mes con tres publicaciones por semana:"],
        list: [
          "Semana 1: “¿Es malo el blanqueamiento?” · “Primeras 24 horas tras un empaste” · Presentación de la dentista",
          "Semana 2: “¿Cuándo preocupa que sangren las encías?” · “Cepillado correcto” · La primera visita",
          "Semana 3: “¿Cuánto dura un implante?” · “Qué comer tras una extracción” · Esterilización",
          "Semana 4: “¿Cuándo llevar a mi hijo al dentista?” · “Señales de bruxismo” · Cómo llegar y accesibilidad",
        ],
        after: [
          "¿Tres por semana es demasiado? Empieza con una. [DentVideo](landing:) hace esta planificación por ti: elige cada semana cinco temas a partir de tus tratamientos y de preguntas reales de pacientes, escribe, pone voz y revisa los vídeos, y tú solo apruebas.",
        ],
      },
    ],
    faq: [
      { q: "¿Cada cuánto conviene publicar estas ideas?", a: "Importa más un ritmo que tu equipo pueda mantener todo el año que un número alto. La guía [¿cada cuánto debe publicar una clínica dental?](guide:cada-cuanto-publicar-clinica-dental) propone ritmos según tu tiempo y explica dónde ver las horas activas de tus seguidores." },
      { q: "¿Hay un plan listo para todo el año?", a: "Sí: nuestro [calendario de contenidos para clínicas dentales](guide:calendario-contenidos-clinica-dental) propone un tema educativo para cada una de las 52 semanas, con fechas como el Día Mundial de la Salud Bucodental, el 20 de marzo." },
      { q: "¿Qué debe publicar una clínica dental en Instagram?", a: "Respuestas cortas a preguntas de pacientes, explicaciones claras de tratamientos, consejos de cuidado y presentaciones del equipo, siempre informativas, prudentes y sin promesas." },
      { q: "¿Cuántas publicaciones por semana?", a: "Una a tres por semana es asumible para la mayoría de clínicas. La constancia importa más que la frecuencia." },
      { q: "¿Necesito contenido distinto para TikTok?", a: "Normalmente no. El mismo vídeo vertical con subtítulos sirve para Reels, TikTok y YouTube Shorts; solo adapta el texto." },
      { q: "¿Puedo hacer sorteos en la cuenta de la clínica?", a: "Los sorteos y regalos como reclamo son delicados en publicidad sanitaria y en el código deontológico. Conviene evitarlos o consultarlos antes con tu colegio." },
      { q: "¿De dónde saco nuevos temas?", a: "Del equipo (qué preguntan en recepción y en el sillón), de las sugerencias de Google sobre tus tratamientos y de los comentarios y mensajes en tus propios vídeos." },
    ],
    sources: [RD1907, CGD, RGPD],
  },
  {
    locale: "es",
    slug: "videos-educativos-pacientes-dentales",
    topic: "patient-education",
    category: "video",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Vídeos educativos para pacientes dentales: temas, usos y cómo mantenerlos precisos",
    seoTitle: "Vídeos educativos dentales para pacientes",
    seoDescription: "Vídeos de educación al paciente para clínicas dentales: temas para empezar, plantilla de guion, sala de espera, WhatsApp, precisión y consentimiento.",
    description: "Guía de vídeos de educación al paciente para clínicas dentales: por qué temas empezar, plantilla de guion, sala de espera, WhatsApp y redes, precisión y consentimiento informado.",
    h1: "Vídeos educativos para pacientes dentales",
    intro:
      "Los vídeos educativos para pacientes dentales son piezas de 30 a 90 segundos que explican qué es un tratamiento, cómo se hace y qué cuidados requiere después. Sirven para reducir el miedo antes de la cita, recordar las instrucciones en casa y dar a todos los pacientes la misma explicación correcta. No sustituyen al consentimiento informado.",
    sections: [
      {
        heading: "Qué resuelve un vídeo educativo",
        paragraphs: [
          "Parte de lo que se explica en el gabinete se olvida al llegar a casa, sobre todo si el paciente estaba nervioso o aún anestesiado. Un vídeo corto puede volver a verse cuando haga falta. El equipo deja de responder la misma pregunta diez veces al día, y todos reciben la misma información revisada.",
          "El consentimiento informado se obtiene en la conversación con el dentista y por escrito cuando la ley lo exige. El vídeo prepara y recuerda; no lo sustituye.",
        ],
      },
      {
        heading: "Por dónde empezar",
        paragraphs: ["Empieza por lo que tu equipo explica cada día. Tres momentos funcionan bien:"],
        list: [
          "Antes de la primera visita: qué pasa en la primera revisión, qué traer, por qué hacemos una radiografía.",
          "Antes del tratamiento: endodoncia, implante, extracción, limpieza, alineadores, explicados paso a paso.",
          "Después del tratamiento: cuidados tras una extracción, comer después de un empaste, higiene con implantes, sensibilidad tras un blanqueamiento.",
          "Para niños y familias: dientes de leche, primera visita, selladores y flúor.",
        ],
      },
      {
        heading: "Una plantilla de guion que funciona",
        paragraphs: ["Usar siempre la misma estructura facilita escribir y ver:"],
        list: [
          "Pregunta (primeros 3 segundos): “¿Cuándo puedo comer después de una extracción?”",
          "Respuesta corta (1 frase): “Normalmente cuando pase la anestesia, con comida templada y blanda.”",
          "Por qué (1–2 frases): por qué es importante que el coágulo se mantenga.",
          "Qué hacer (2–3 puntos): consejos propios del procedimiento, como evitar bebidas calientes, pajitas y tabaco el primer día.",
          "Cuándo llamar (1 frase): “Si el sangrado o el dolor aumentan, llámanos.”",
          "Cierre: “Tu dentista te dará las indicaciones para tu caso.”",
        ],
        ordered: true,
        after: [
          "La parte de “cuándo llamar” es clave en los vídeos de cuidados: el paciente tiene que saber qué es normal y qué no.",
        ],
      },
      {
        heading: "Precisos y fiables",
        paragraphs: [
          "Quédate en la evidencia aceptada y matiza donde los resultados varían: “normalmente”, “en la mayoría de los casos”, “tu dentista te dirá”. Ajusta los cuidados a cada procedimiento: lo correcto tras una extracción puede ser incorrecto tras un empaste.",
          "El texto que acompaña al vídeo debe decir lo mismo que el vídeo, y un dentista debe ver cada pieza antes de publicarla. Si se publican en redes, aplican las normas de [publicidad sanitaria](guide:publicidad-sanitaria-dentistas).",
        ],
      },
      {
        heading: "Dónde usarlos",
        paragraphs: ["El mismo vídeo corto sirve en muchos sitios:"],
        list: [
          "Instagram, TikTok y YouTube Shorts como contenido educativo",
          "Pantalla de la sala de espera, en bucle sin sonido y con subtítulos",
          "Recordatorio de cita o mensaje de cuidados, si el paciente ha aceptado ese canal",
          "Páginas de tratamientos de la web de la clínica",
        ],
        after: [
          "Para enviarlos por WhatsApp o correo necesitas una base legal adecuada y un canal seguro; los envíos comerciales sin consentimiento no están permitidos.",
        ],
      },
      {
        heading: "Accesibilidad y pacientes de otros idiomas",
        paragraphs: [
          "Los subtítulos ayudan a quien no oye bien y a quien mira sin sonido. Frases cortas, lenguaje cotidiano y la traducción de cada término técnico (“periodontitis, es decir, enfermedad avanzada de las encías”) hacen el vídeo comprensible.",
          "Si atiendes a pacientes que se manejan con más soltura en inglés, francés, árabe o catalán, tener los cuidados más frecuentes también en esos idiomas reduce malentendidos en zonas turísticas y ciudades diversas.",
        ],
      },
      {
        heading: "Integrarlos en el día a día del equipo",
        paragraphs: [
          "Los vídeos solo funcionan si el equipo los usa. Recepción puede enviar “Tu primera visita” con la confirmación de la cita; la auxiliar, recomendar el vídeo de cuidados al terminar; el dentista, decir en consulta “tienes un vídeo corto para verlo en casa”. Una tabla simple de qué vídeo va con qué tratamiento es suficiente. Revisa los vídeos una vez al año o cuando cambie vuestro protocolo.",
        ],
      },
      {
        heading: "¿Grabarlos tú o narrados?",
        paragraphs: [
          "Los pacientes confían en quien les va a tratar; los vídeos donde explica el propio dentista son los más eficaces. Grabar cada semana, sin embargo, rara vez es realista. Un buen término medio: los temas más frecuentes los explicas tú y el resto se cubre con vídeos educativos narrados. Cómo grabar en cinco minutos está en [vídeos para clínicas dentales](guide:videos-para-clinicas-dentales).",
          "[DentVideo](landing:) planifica cinco temas por semana a partir de tus tratamientos, escribe, pone voz y subtitula los vídeos en tu idioma y revisa cada uno en precisión clínica y publicidad sanitaria. Descargas los aprobados con su texto, para redes, sala de espera o web.",
        ],
      },
    ],
    faq: [
      { q: "¿Cuánto debe durar un vídeo educativo para pacientes?", a: "Para un tema suelen bastar 30 a 90 segundos. Los tratamientos largos se explican más claramente en varios vídeos cortos, uno por fase." },
      { q: "¿Un vídeo sustituye al consentimiento informado?", a: "No. El consentimiento se obtiene en la conversación con el dentista y por escrito cuando corresponde. El vídeo prepara y recuerda." },
      { q: "¿Puedo publicar vídeos educativos en Instagram?", a: "Sí, mientras informen con prudencia y no incluyan promesas de resultado, descuentos o testimonios. En redes se aplican las normas de publicidad sanitaria." },
      { q: "¿El vídeo de la sala de espera necesita sonido?", a: "No. Con subtítulos se entiende sin sonido y molesta menos en la sala de espera." },
      { q: "¿Con qué vídeos empiezo?", a: "Con los temas que más se preguntan y más preocupan: cuidados tras una extracción, endodoncia, fases de un implante y la primera visita. Esos cuatro cubren buena parte de las explicaciones diarias del equipo." },
      { q: "¿Quién debe revisar los vídeos?", a: "Un dentista debe ver cada vídeo antes de publicarlo, sobre todo las instrucciones de cuidados, que deben coincidir con el protocolo de tu clínica." },
    ],
    sources: [RD1907, RGPD, CGD],
  },
  {
    locale: "es",
    slug: "consentimiento-fotos-pacientes-clinica-dental",
    category: "rules",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Fotos y vídeos de pacientes en redes: consentimiento y protección de datos en clínicas dentales",
    seoTitle: "Consentimiento para fotos de pacientes dentales",
    seoDescription: "Qué exigen el RGPD y la LOPDGDD para publicar fotos, vídeos o radiografías de pacientes en redes y cómo redactar el consentimiento en la clínica.",
    description: "Qué exige el RGPD y la LOPDGDD para publicar fotos, vídeos o radiografías de pacientes en redes, cómo redactar el consentimiento y qué evitar. No es asesoramiento jurídico.",
    h1: "Fotos y vídeos de pacientes en redes: consentimiento y datos",
    intro:
      "Una clínica dental solo puede publicar en redes la imagen, la voz, el nombre o las radiografías de un paciente identificable si cuenta con su consentimiento explícito, informado, específico y por escrito, que puede retirar en cualquier momento. Los datos de salud son una categoría especial según el artículo 9 del RGPD, y el secreto profesional sigue vigente en Instagram.",
    sections: [
      {
        heading: "Por qué es un tema aparte",
        paragraphs: [
          "Una sonrisa de antes y después, un vídeo del paciente contando su experiencia o una radiografía con el nombre visible parecen contenido inofensivo. Sin embargo, juntan tres cosas delicadas: datos de salud, derecho a la propia imagen y publicidad sanitaria. Un error en cualquiera de ellas puede acabar en una reclamación ante la Agencia Española de Protección de Datos, en un conflicto con el paciente o en un expediente colegial.",
        ],
      },
      {
        heading: "Qué dice la normativa",
        paragraphs: ["En España se combinan tres bloques; revisa siempre el texto vigente:"],
        list: [
          "RGPD (art. 9) y Ley Orgánica 3/2018 (LOPDGDD): los datos de salud son categoría especial y solo pueden tratarse con una base legal específica; para publicarlos con fines de difusión, la base habitual es el consentimiento explícito.",
          "Ley Orgánica 1/1982: protege el derecho a la propia imagen; usar la imagen de alguien con fines publicitarios sin su consentimiento es una intromisión ilegítima.",
          "Publicidad sanitaria y deontología: aunque haya consentimiento, el contenido no puede crear falsas expectativas ni usar el testimonio como inducción. Lo explicamos en [publicidad sanitaria para dentistas](guide:publicidad-sanitaria-dentistas).",
        ],
      },
      {
        heading: "Cómo debe ser el consentimiento",
        paragraphs: ["Un consentimiento útil para redes reúne estas características:"],
        list: [
          "Separado del consentimiento del tratamiento: aceptar el tratamiento no es aceptar salir en Instagram.",
          "Específico: qué se publica (foto intraoral, cara completa, voz, nombre), dónde (Instagram, web, sala de espera) y durante cuánto tiempo.",
          "Libre: el tratamiento no puede depender de que el paciente acepte, ni ofrecerse descuento a cambio.",
          "Por escrito y firmado, guardado con la historia clínica.",
          "Revocable: explica cómo retirarlo y qué harás (borrar las publicaciones en un plazo razonable).",
          "En menores, firmado por quien tenga la patria potestad, y valorando la opinión del menor.",
        ],
      },
      {
        heading: "Cómo pedirlo sin incomodar al paciente",
        paragraphs: [
          "El momento adecuado para pedir el consentimiento no es en el sillón ni con prisa, sino al terminar el tratamiento, con calma y por escrito. Explica en una frase para qué lo quieres (“nos ayuda a explicar el tratamiento a otros pacientes”), muestra exactamente qué imagen se usaría y deja claro que decir que no no cambia nada en su atención. Si duda, la respuesta es no.",
          "Ofrece opciones intermedias: solo foto intraoral sin cara, sin nombre, solo en la web y no en redes. Muchos pacientes aceptan una versión limitada aunque no quieran aparecer de cuerpo entero en Instagram.",
        ],
      },
      {
        heading: "Qué revisar antes de grabar en la clínica",
        paragraphs: [
          "La mayoría de los problemas no vienen del paciente protagonista, sino del fondo. Antes de grabar, revisa el encuadre: monitores con historias clínicas, la agenda, radiografías con nombre, otros pacientes en la sala de espera o en el gabinete de al lado. Desactiva la geolocalización si no la necesitas y no etiquetes al paciente sin que lo haya pedido.",
          "El equipo también tiene derecho a su imagen: pide consentimiento por escrito a quien vaya a salir en los vídeos y acordad qué pasa con ellos si deja la clínica.",
        ],
      },
      {
        heading: "Alternativas que no necesitan datos de pacientes",
        paragraphs: [
          "La mayor parte del contenido útil no necesita pacientes reales: explicaciones del dentista a cámara, modelos y maquetas, ilustraciones, animaciones y vídeos narrados. Son más fáciles de producir, no caducan cuando un paciente retira el consentimiento y no plantean dudas de publicidad. Ideas en [contenido para Instagram de una clínica dental](guide:ideas-contenido-instagram-clinica-dental).",
        ],
      },
      {
        heading: "Checklist de consentimiento",
        paragraphs: [],
        list: [
          "¿Es identificable la persona por cara, voz, nombre, tatuajes o contexto?",
          "¿Hay un consentimiento por escrito, separado del tratamiento y específico para redes?",
          "¿Dice qué se publica, dónde y durante cuánto tiempo?",
          "¿Sabemos cómo retirarlo y quién se encarga de borrar?",
          "¿El contenido crea falsas expectativas o funciona como testimonio publicitario?",
          "¿Hay datos de otros pacientes en el encuadre?",
        ],
      },
      {
        heading: "Cómo encaja DentVideo",
        paragraphs: [
          "[DentVideo](landing:) hace vídeos educativos que no necesitan imágenes de pacientes: narrados, subtitulados y con el logo y los colores de tu clínica, o cortados de una grabación tuya hablando a cámara. Cada guion se revisa para que no prometa resultados ni use testimonios. Si en tu propia grabación aparece algo que merece otra mirada, se marca con el motivo; tú decides y apruebas. [Ve tus vídeos antes de pagar](start:).",
        ],
      },
    ],
    faq: [
      { q: "¿Puedo publicar fotos de antes y después de un paciente?", a: "Solo con su consentimiento explícito y por escrito, específico para ese uso. Además, la imagen no debe crear falsas expectativas ni funcionar como testimonio publicitario. Consulta a tu colegio si tienes dudas." },
      { q: "¿Vale el consentimiento del tratamiento para publicar en redes?", a: "No. Publicar en redes es una finalidad distinta y necesita un consentimiento separado y específico." },
      { q: "¿Qué pasa si el paciente retira el consentimiento?", a: "Debes dejar de usar la imagen y retirar las publicaciones que controles en un plazo razonable. Por eso conviene explicar el procedimiento al pedir el consentimiento." },
      { q: "¿Puedo publicar una radiografía sin nombre?", a: "Si no permite identificar al paciente por ningún medio razonable, el riesgo es mucho menor. Aun así, revisa metadatos, nombres de archivo y el contexto antes de publicarla." },
      { q: "¿Necesito consentimiento del equipo para que salga en los vídeos?", a: "Sí. Pide un consentimiento por escrito a cada persona que aparezca y acordad qué ocurre con los vídeos si deja la clínica." },
      { q: "¿Esta guía es asesoramiento jurídico?", a: "No. Es información general; consulta a tu delegado de protección de datos, a la AEPD o a un abogado para casos concretos." },
    ],
    sources: [RGPD, LOPDGDD, LO1982, AEPD, CGD],
  },
  {
    locale: "es",
    slug: "marketing-dental-agencia-o-herramienta",
    topic: "agency-or-tool",
    category: "tools",
    published: "2026-11-08",
    updated: "2026-11-08",
    title: "Marketing dental en redes: ¿agencia, community manager, equipo propio o herramienta?",
    seoTitle: "Marketing dental: ¿agencia o herramienta?",
    seoDescription: "Redes de una clínica dental: agencia, freelance, equipo propio o software comparados, preguntas antes de contratar, flujo semanal y quién responde.",
    description: "Cómo organizar las redes de una clínica dental: agencia, freelance, equipo o software comparados, preguntas antes de contratar, un flujo semanal y quién responde de los errores.",
    h1: "Marketing dental en redes: ¿agencia, equipo o herramienta?",
    intro:
      "Una clínica dental tiene cuatro formas de llevar sus redes: una agencia de marketing dental, un community manager freelance, alguien del propio equipo o una herramienta que crea el contenido. En todos los casos la pregunta decisiva es la misma: ¿el contenido conoce las normas de publicidad sanitaria y el dentista aprueba cada publicación antes de que salga?",
    sections: [
      {
        heading: "Primero, qué necesitas",
        paragraphs: [
          "“Llevar las redes” agrupa tareas muy distintas: planificar temas, escribir, grabar y editar, diseñar, publicar, responder mensajes y medir. Para la mayoría de clínicas, lo difícil es producir con regularidad contenido correcto y que cumpla la normativa. Saber qué parte quieres delegar es el primer paso para elegir bien.",
        ],
      },
      {
        heading: "Cuatro opciones, pros y contras",
        paragraphs: [],
        list: [
          "Agencia de marketing dental: asume planificación, diseño y publicación y ahorra tiempo. Suele ser cara, y no todas conocen la publicidad sanitaria: promociones, sorteos y antes y después son habituales en otros sectores y arriesgados en una clínica.",
          "Community manager freelance: más flexible y a menudo más asequible, fuerte en grabación y edición. La continuidad depende de una persona y el conocimiento normativo varía.",
          "Equipo propio: conoce de primera mano la clínica y a los pacientes, el contenido suena auténtico. Pero el tiempo es escaso y el sillón siempre va primero.",
          "Herramienta o software: genera contenido regular rápido y de forma previsible. Las herramientas genéricas no conocen la publicidad sanitaria; incluso con una especializada, la última revisión es del dentista.",
        ],
      },
      {
        heading: "Preguntas antes de contratar",
        paragraphs: ["Hazle estas preguntas a cualquier agencia o freelance:"],
        list: [
          "¿Cómo os aseguráis de que el contenido cumple la normativa de publicidad sanitaria de nuestra comunidad y el código deontológico?",
          "¿Proponéis promociones, sorteos, testimonios o antes y después? (Si la respuesta es sí, cuidado.)",
          "¿Cada publicación pasa por la aprobación del dentista antes de salir?",
          "¿Quién escribe el contenido clínico y quién lo revisa?",
          "¿Quién recoge los consentimientos de pacientes y del equipo, y dónde se guardan?",
          "¿Firmaremos un contrato de encargado del tratamiento si vais a ver datos de pacientes?",
          "¿De quién son las cuentas, el material y el contenido si dejamos de trabajar juntos?",
        ],
      },
      {
        heading: "Si las redes las lleva el equipo",
        paragraphs: [
          "Si decides llevarlas desde dentro, trátalo como una tarea con tiempo fijo cada semana, no como algo “para los ratos libres”. Lo ideal es alguien que se comunique bien con los pacientes, escriba con cuidado y sea discreto con los datos. Dale un resumen de las normas de publicidad y la checklist de aprobación; el contenido clínico lo aprueba siempre el dentista.",
          "Prepara también respuestas tipo para los mensajes: petición de cita, pregunta de precio (en privado y por escrito), dolor o urgencia (teléfono de la clínica). Nada de diagnósticos por mensaje directo.",
        ],
      },
      {
        heading: "La responsabilidad sigue siendo de la clínica",
        paragraphs: [
          "Lo cree quien lo cree, el contenido sale en nombre de la clínica. Si una promoción preparada por la agencia acaba en un expediente, el destinatario es la clínica, y los aspectos deontológicos afectan al dentista. Por eso conviene dejar por escrito que nada se publica sin aprobación. La checklist de la guía de [publicidad sanitaria para dentistas](guide:publicidad-sanitaria-dentistas) sirve como base.",
        ],
      },
      {
        heading: "Cómo comparar propuestas",
        paragraphs: ["Los paquetes incluyen cosas distintas y cuesta compararlos. Evalúalos con los mismos criterios:"],
        list: [
          "¿Cuántas publicaciones por semana llegan listas para publicar?",
          "¿Cuánto tiempo le cuesta al dentista aprobarlas: solo verlas, o reescribirlas cada vez?",
          "¿Quién revisa precisión clínica y normativa antes de la aprobación?",
          "¿Suena a tu clínica, o a una plantilla que reciben muchas clínicas?",
          "¿Qué pasa con las cuentas y el material si cambias de proveedor?",
        ],
        after: [
          "Un periodo de prueba es la manera más rápida de verlo. Fíjate sobre todo en si el tiempo de aprobación baja; si hay que reescribir cada publicación, incluso una propuesta barata sale cara.",
        ],
      },
      {
        heading: "Un flujo semanal que funciona",
        paragraphs: [],
        list: [
          "Lunes: se eligen los temas de la semana (preguntas de pacientes, temporada, tratamientos de la clínica).",
          "Martes: se preparan vídeos y textos; si toca, el dentista graba cinco minutos.",
          "Miércoles: el dentista revisa cada pieza, aprueba o pide cambios.",
          "Jueves y viernes: se publica lo aprobado y el equipo responde mensajes.",
          "Final de mes: qué se vio, qué preguntas llegaron; eso alimenta el mes siguiente.",
        ],
        ordered: true,
      },
      {
        heading: "El modelo mixto: realista para muchas clínicas",
        paragraphs: [
          "Para muchas clínicas, lo que más dura es un modelo mixto: los vídeos educativos regulares salen de una herramienta o de fuera, el dentista añade una o dos veces al mes una grabación corta propia y el equipo publica y responde. La cuenta se mantiene activa, suena a tu clínica y nadie vive con la presión semanal. Los temas, en [ideas de contenido para Instagram](guide:ideas-contenido-instagram-clinica-dental).",
          "[DentVideo](landing:) es un software para la parte de contenido: crea cinco vídeos educativos cortos por semana, revisa cada guion en precisión clínica y publicidad sanitaria y corta tus grabaciones en clips subtitulados. Publicar y responder sigue siendo cosa tuya o de tu agencia: DentVideo no publica nada por sí mismo. [Mira una vista previa con tu logo antes de pagar](start:). Tienes una tabla con todas las opciones en [cómo se compara DentVideo con una agencia, Canva y ChatGPT](video:dentvideo-agencia-canva-chatgpt).",
        ],
      },
    ],
    faq: [
      { q: "¿Merece la pena una agencia de marketing dental?", a: "Ahorra tiempo, pero puede ser arriesgada si no conoce la publicidad sanitaria. Lo decisivo es que el dentista apruebe cada publicación antes de salir." },
      { q: "¿Quién responde de los errores de la agencia?", a: "Frente a la administración y al colegio, normalmente la clínica y el dentista. Deja por escrito el proceso de aprobación y las responsabilidades." },
      { q: "¿Basta con una herramienta para las redes?", a: "Puede bastar para crear contenido con regularidad. Responder mensajes y la revisión final siguen siendo tarea de la clínica." },
      { q: "¿De quién deben ser las cuentas de redes?", a: "Siempre de la clínica. Da acceso por roles y no con contraseñas personales, para no perder la cuenta si cambias de proveedor." },
      { q: "¿Puede alguien del equipo responder dudas clínicas por mensaje?", a: "No conviene diagnosticar por mensaje: lo prudente es invitar a pedir cita o llamar a la clínica, sobre todo si hay dolor o urgencia." },
    ],
    sources: [LGP, RD1907, CGD, RGPD],
  },
];
