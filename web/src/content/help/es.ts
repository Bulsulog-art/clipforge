import type { HelpContent } from "./types";

export const es: HelpContent = {
  meta: {
    title: "Centro de ayuda de DentVideo: respuestas para clínicas",
    description: "Respuestas paso a paso para clínicas que usan DentVideo: primeros vídeos, aprobación, publicación, ajustes, grabaciones, pagos, facturas, privacidad y cuenta.",
  },
  nav: "Ayuda",
  h1: "¿En qué podemos ayudarte?",
  lead: "Respuestas breves para clínicas que usan DentVideo, desde la primera semana de vídeos hasta las facturas y tus datos. Busca o elige un tema.",
  search: {
    label: "Buscar en el centro de ayuda",
    placeholder: "Por ejemplo: cancelar, factura, aprobar",
    none: "Ninguna respuesta coincide con esa búsqueda. Prueba con otra palabra o escríbenos.",
    count: { one: "1 respuesta", other: "{n} respuestas" },
  },
  topics: "Temas",
  categories: {
    start: "Primeros pasos",
    review: "Revisión y aprobación",
    posting: "Publicar tus vídeos",
    settings: "Los vídeos de tu clínica",
    recording: "Grabarte a ti mismo",
    billing: "Plan, pagos y facturas",
    account: "Datos, privacidad y cuenta",
  },
  readMore: "Más información:",
  shots: {
    setup: "Ajustes: los datos de tu clínica, el logo y el color.",
    week: "Vídeos: los vídeos de esta semana esperan tu aprobación.",
    card: "Un vídeo marcado con «Revísalo», con lo que conviene revisar antes de publicar.",
  },
  stuck: {
    title: "¿Sigues con dudas?",
    body: "Escribe a {email}. Cada mensaje lo lee una persona. Si escribes desde la app (Ajustes → Ayuda y contacto), el ID de tu clínica ya va incluido y encontramos tu cuenta enseguida.",
  },
  articles: {
    "first-videos": {
      q: "¿Cuándo llegan mis primeros vídeos?",
      a: "Los vídeos de tu primera semana se crean justo después del pago y suelen estar listos en menos de una hora. La página Vídeos se actualiza sola y te enviamos un email en cuanto estén listos para que los revises.\n\nDespués llegan cinco vídeos nuevos cada lunes, y te avisamos por email cada vez.",
    },
    "no-videos-this-week": {
      q: "Los vídeos de esta semana aún no están. ¿Qué hago?",
      a: "Los vídeos nuevos se crean cada lunes. Si los de esta semana todavía no están en tu biblioteca, toca «Crear los vídeos de esta semana» en la página Vídeos. Suele tardar menos de una hora.\n\nSi la página dice que los vídeos se retrasan, ya lo estamos reintentando y te escribiremos cuando estén listos. También puedes tocar «Intentarlo de nuevo».\n\nUn vídeo marcado con «No se pudo crear» no requiere nada por tu parte. Si vuelve a pasar, escríbenos.",
    },
    topics: {
      q: "¿Cómo se eligen los temas? ¿Puedo proponer uno?",
      a: "Cada semana elegimos cinco temas a partir de los servicios de tus ajustes y de las preguntas que hacen los pacientes sobre ellos. Los vídeos tratan solo de servicios que ofreces, así que lo más importante es que esa lista esté completa y al día.\n\nPara proponer un tema, usa «Propón un tema para la próxima semana» en la página Vídeos o en Ajustes: una pregunta de un paciente o un tema, hasta 140 caracteres. Usamos primero las propuestas en espera, hasta tres por semana, cuando encajan con tus servicios y pasan las mismas revisiones clínicas y de publicidad que cada vídeo. En «Tus propuestas» ves qué pasó con cada una; si una no se pudo crear, aparece el motivo. En «Temas que no hemos creado» ves los demás temas que se quedaron fuera.",

    },
    "sign-in": {
      q: "No puedo entrar o no me llega el código por email.",
      a: "Busca en la carpeta de spam o de promociones el correo de {email} y márcalo como «no es spam» para que lleguen los siguientes. Un código vale 15 minutos y puedes pedir otro en la pantalla de acceso.\n\n¿Olvidaste tu contraseña? Toca «¿Olvidaste tu contraseña?» en la pantalla de acceso. Si no te llega ningún email, escríbenos con la dirección con la que te registraste.",
    },
    approve: {
      q: "¿Cómo apruebo un vídeo?",
      a: "No se publica nada hasta que lo apruebas, y aprobar solo marca el vídeo como listo para publicar. Nunca publicamos por ti.",
      steps: [
        "Abre Vídeos y toca «Ver y aprobar».",
        "Mira cada vídeo y toca «Aprobar», o «Descartar» si algo no está bien.",
        "Cuando hay varios vídeos listos, el botón «Aprobar los … vídeos» los aprueba de una vez. Los vídeos marcados con «Revísalo» nunca se incluyen.",
      ],
    },
    "needs-a-look": {
      q: "¿Qué significa «Revísalo»?",
      a: "Nuestra revisión por software marcó algo en ese vídeo para que lo leas una vez más, por ejemplo una expresión que las normas de publicidad sanitaria de tu país pueden interpretar de forma estricta. El motivo aparece en la tarjeta, en «Qué revisar antes de publicar».\n\nMira el vídeo teniendo en cuenta ese motivo. Si encaja con tu clínica, apruébalo. Si no, descártalo con una nota breve. Un vídeo marcado nunca se aprueba sin ti.",
    },
    "software-check": {
      q: "¿Qué revisa el software y qué no?",
      a: "Antes de que veas un guion, el software lo revisa dos veces: una por afirmaciones que las normas de publicidad sanitaria suelen restringir (promesas de resultados, «indoloro», «para siempre», superlativos, precios, ofertas, promesas de antes y después, testimonios) y otra frente a las pautas clínicas comúnmente aceptadas. Lo que no pasa se reescribe o no se crea, y lo que merece una segunda mirada se marca con el motivo.\n\nEs una revisión automática. No es asesoramiento jurídico ni la revisión de un abogado o de tu colegio profesional. Las normas cambian según el país y con el tiempo, así que la última palabra es tuya.",
    },
    responsibility: {
      q: "¿Quién es responsable de lo que publicamos?",
      a: "Tu clínica. Apruebas cada vídeo y lo publicas desde tus propias cuentas, así que sigues siendo responsable de lo que publicas, también según las normas de publicidad sanitaria de tu país.\n\nLa revisión por software te ayuda a detectar problemas habituales, pero no sustituye tu criterio ni el asesoramiento jurídico. Si dudas de un tema o de una frase, descarta el vídeo o consulta a tu colegio profesional antes de publicarlo.",
    },
    "wrong-video": {
      q: "Un vídeo está mal. ¿Qué puedo hacer?",
      a: "No lo apruebes: un vídeo sin aprobar no va a ninguna parte. Toca «Descartar», elige qué falla y añade una nota si quieres. Tu nota llega a nuestro equipo junto con el vídeo.\n\nPara cambiar un vídeo concreto, toca «Pedir un cambio» en su tarjeta y escribe qué debería ser distinto. Solo se vuelve a crear ese vídeo, con las mismas revisiones, y lo apruebas de nuevo antes de publicarlo. Puedes pedir hasta 3 cambios por semana. Si la versión cambiada no pasa las revisiones, tu vídeo actual se queda como está y la tarjeta te lo indica. Para cambiar todos los vídeos futuros (logo, color, servicios, idioma, voz), usa Ajustes.",

    },
    "background-photos": {
      q: "¿Puedo cambiar las fotos de fondo de un vídeo?",
      a: "Sí. En la tarjeta del vídeo, abre «Texto y hashtags · Fotos de fondo», toca entre una y cuatro fotos y luego «Aplicar». El vídeo se vuelve a crear con ellas. La tarjeta muestra «Actualizando fotos» hasta que la nueva versión está lista.",
    },
    share: {
      q: "¿Cómo publico un vídeo?",
      a: "Si compartir no funciona en tu dispositivo, toca «Descargar» y publica el vídeo como siempre. DentVideo nunca publica por ti ni te pide las contraseñas de tus redes sociales; si una agencia o un compañero lleva tus cuentas, pásales los vídeos aprobados.",
      steps: [
        "Abre un vídeo aprobado y toca «Publicar».",
        "En el móvil, toca «Guardar vídeo + copiar texto»: el vídeo se guarda y el texto con los hashtags se copia. En el ordenador, el vídeo se descarga.",
        "Abre Instagram, TikTok, Facebook o WhatsApp, elige el vídeo de tu galería y pega el texto.",
        "De vuelta en DentVideo, toca «Marcar como publicado» para ver qué te queda por publicar.",
      ],
    },
    instagram: {
      q: "¿Cómo publico un reel en Instagram?",
      a: "Publícalo desde la cuenta de tu clínica. El texto ya incluye hashtags; puedes acortarlo o cambiarlo antes de compartir.",
      steps: ["En DentVideo, toca «Publicar» y guarda el vídeo con su texto.", "En Instagram, toca + y elige Reel.", "Elige el vídeo de tu galería, pega el texto y comparte."],
    },
    "tiktok-shorts": {
      q: "¿Cómo publico en TikTok o en YouTube Shorts?",
      a: "En «Publicar», usa el texto más corto, «TikTok · Shorts».\n\nTikTok: toca +, elige el vídeo de tu galería, pega el texto y publica.\n\nYouTube: en la app de YouTube, toca + y sube el vídeo desde tu galería. YouTube muestra los vídeos verticales cortos como Shorts. Pega el texto como título o descripción.",
    },
    facebook: {
      q: "¿Cómo publico en Facebook?",
      a: "Los vídeos son archivos MP4 en vertical, el formato que usan los reels de Facebook.",
      steps: ["Cambia a la página de tu clínica, no a tu perfil personal.", "Crea un reel y elige el vídeo.", "Pega el texto y comparte."],
    },
    "google-business": {
      q: "¿Puedo añadir los vídeos a nuestro Perfil de Empresa de Google?",
      a: "DentVideo no está conectado directamente con Google, pero puedes subir tú un vídeo guardado: abre tu Perfil de Empresa en la Búsqueda de Google o en Maps, añade una foto o un vídeo y elige el archivo.\n\nGoogle revisa los vídeos antes de mostrarlos y solo acepta clips cortos; consulta sus límites actuales en la ayuda de Google. Si rechaza un vídeo, compártelo en tus otros canales. Allí los hashtags no sirven de nada, así que quítalos.",
    },
    "posting-times": {
      q: "¿Cuándo conviene publicar?",
      a: "Cada vídeo aprobado muestra un día y una hora sugeridos. Repartimos los vídeos de la semana de lunes a viernes y alternamos entre la hora de comer y la noche en el país de tu clínica, cuando mucha gente mira el móvil.\n\nSon sugerencias, no reglas: publicar con regularidad importa más que el minuto exacto. Las estadísticas de Instagram o TikTok te dicen cuándo están conectados tus seguidores.",
    },
    captions: {
      q: "¿Los vídeos llevan subtítulos? ¿Son accesibles?",
      a: "Cada vídeo muestra sus ideas clave como texto en la imagen, así que se puede seguir sin sonido. Ese texto es una versión breve de lo que dice la voz, no una transcripción literal.\n\nPara tener la narración completa, toca «Descargar subtítulos (.srt)» en «Publicar», junto a la descarga del vídeo. El archivo tiene las palabras exactas de la voz. Los tiempos se calculan a partir de las pausas de la narración, así que encajan bien pero no palabra por palabra: míralo una vez con el vídeo antes de subirlo. Los vídeos creados antes de que existieran los archivos de subtítulos y los clips de tus propias grabaciones no tienen archivo .srt (los clips ya muestran tus palabras en pantalla).\n\nYouTube y Facebook te dejan subir un archivo .srt con el vídeo, donde ofrecen subtítulos. Instagram y TikTok no aceptan archivos de subtítulos: las ideas clave ya están en el vídeo, y al publicar también puedes activar los subtítulos automáticos de la app y corregirlos con el texto del archivo .srt. Comprueba que ningún texto aparezca dos veces.",

    },
    "other-uses": {
      q: "¿Podemos usar los vídeos en nuestra web o en la sala de espera?",
      a: "Sí. Los vídeos creados para tu clínica puedes usarlos en la comunicación de tu clínica, por ejemplo en tu web, en un boletín o en una pantalla de la sala de espera. Los vídeos que hayas descargado puedes seguir usándolos después de cancelar.\n\nAlgunos vídeos incluyen imágenes de archivo con licencia, que solo pueden usarse como parte del vídeo, no por separado.",
    },
    "logo-colors": {
      q: "¿Cómo cambio el logo o el color de marca?",
      a: "Tus próximos vídeos usarán el logo y el color nuevos. Los vídeos ya creados conservan los anteriores.",
      steps: [
        "Abre Ajustes.",
        "En «Logo y color», sube un logo nuevo (lo ideal es un PNG con fondo transparente, hasta 5 MB) o elige un color.",
        "Toca «Guardar cambios».",
      ],
    },
    language: {
      q: "¿Podemos cambiar el idioma de los vídeos o cómo se dirigen a los pacientes?",
      a: "Sí, en Ajustes: «Idioma de tus vídeos» y «Cómo te diriges a tus pacientes» (de usted o de tú). Los vídeos se crean en inglés, alemán, español, francés, italiano, portugués, turco, japonés, árabe y polaco.\n\nEl cambio se aplica a tus próximos vídeos. La app también pasa a ese idioma, si está disponible.",
    },
    services: {
      q: "¿Por qué importan los servicios de Ajustes?",
      a: "Los vídeos se crean solo sobre los tratamientos de «Servicios que ofreces»: un tratamiento que falta nunca tendrá vídeo, y uno que no ofreces nunca aparecerá. Separa los servicios con comas o usa los botones de añadido rápido.\n\nEl «Tono» (cercano, experto, tranquilo o desenfadado) define cómo se escriben los guiones. Los cambios se aplican a tus próximos vídeos.",
    },
    "narrator-voice": {
      q: "¿Podemos elegir la voz de la narración?",
      a: "Sí. En Ajustes, en «Voz de la narración», elige una voz femenina o masculina. La narración es una voz sintética en el idioma de tus vídeos, y lo decimos abiertamente.\n\nLa elección se aplica a los vídeos nuevos; los ya creados conservan su voz. Si quieres tu propia voz, el plan Practice convierte tus grabaciones en clips.",
    },
    "closing-line": {
      q: "¿Qué es la frase de cierre y por qué no se aceptó la mía?",
      a: "Es una frase opcional y tranquila que se añade bajo el texto de cada publicación, por ejemplo: «¿Dudas sobre tus encías? Coméntalas en tu próxima revisión». Si la dejas vacía, tus publicaciones usan nuestras propias frases de cierre.\n\nAntes de guardarla, la frase se revisa con las mismas normas de publicidad que los vídeos. No puede prometer resultados, sonar urgente, llevar signos de exclamación, ser un «contáctanos» genérico ni empujar a pedir cita donde las normas de tu país lo limitan. El mensaje bajo el campo te dice qué cambiar.",
    },
    record: {
      q: "¿Cómo me grabo? (plan Practice)",
      a: "Cortamos tu grabación en clips breves con subtítulos y tu logo, revisamos cada clip y te avisamos por email cuando están listos, normalmente en menos de 10 minutos. Tus palabras nunca se cambian; lo que merece una segunda mirada se marca.\n\nArchivos: MP4, MOV o WebM, hasta 500 MB. Las grabaciones forman parte del plan Practice; con Starter, la página Grabar te explica cómo cambiar. Si se ve o se oye a un paciente, necesitas antes su consentimiento documentado.",
      steps: [
        "Abre Grabar y elige una de las fichas de grabación de esta semana.",
        "Apoya el móvil a la altura de los ojos, cerca de una ventana, y habla siguiendo la ficha entre uno y diez minutos.",
        "Elige el vídeo, toca «Subir y crear clips» y deja la página abierta hasta que termine la subida.",
      ],
    },
    plans: {
      q: "¿Qué diferencia hay entre Starter y Practice y cómo cambiamos?",
      a: "Los dos incluyen cinco vídeos narrados y subtitulados cada lunes, la revisión por software y tu logo y tus colores. Practice añade clips hechos con tus propias grabaciones, con fichas que te dicen qué grabar. Los precios actuales están en la pantalla de planes de la app.\n\nPara cambiar, abre Ajustes → Plan y facturación → «Cambiar de plan». La diferencia del resto del periodo se cobra o se abona el mismo día. Si ahí solo ves una tarjeta «Escríbenos», escríbenos y lo cambiamos por ti.",
    },
    invoices: {
      q: "¿Dónde encuentro las facturas y los recibos?",
      a: "Los pagos los gestiona Dodo Payments, nuestro merchant of record: Dodo te vende la suscripción, cobra tu tarjeta, recauda los impuestos que correspondan y emite la factura. Ese es también el nombre que aparece en el extracto de tu tarjeta.\n\nTras cada pago recibes un recibo por email, y puedes descargar las facturas en Ajustes → Plan y facturación → «Gestionar facturación». Como la factura la emite Dodo, DentVideo no envía otra.",
    },
    "update-card": {
      q: "¿Cómo cambiamos la tarjeta con la que pagamos?",
      a: "Abre Ajustes → Plan y facturación y toca «Gestionar facturación». La tarjeta se cambia en el portal seguro de nuestro proveedor de pagos; nunca vemos los datos completos de tu tarjeta.\n\nSi no ves el botón, escríbenos y te enviamos un enlace seguro. No envíes nunca datos de tarjeta por email.",
    },
    "payment-failed": {
      q: "El pago ha fallado y los vídeos están en pausa. ¿Y ahora?",
      a: "Tus vídeos siguen en tu biblioteca y puedes seguir compartiéndolos. Solo se pausan los vídeos semanales nuevos hasta que se complete un pago.\n\nToca «Actualizar datos de pago» en la página Vídeos o en Ajustes, o «Pídenos un enlace seguro por email». Por favor, no compres un plan nuevo: se te cobraría dos veces. En cuanto la tarjeta funcione, vuelven tus vídeos semanales.",
    },
    cancel: {
      q: "¿Cómo cancelamos?",
      a: "Los planes son mensuales, sin permanencia. Abre Ajustes → Plan y facturación → «Gestionar facturación» y cancela en el portal de pago, o escríbenos y lo hacemos por ti.\n\nAl cancelar se detiene el próximo cobro y mantienes el acceso hasta el final del periodo pagado. Un periodo ya empezado no se reembolsa en parte, salvo que la ley lo exija o el servicio haya fallado; los detalles están en nuestra Política de reembolsos.",
    },
    "after-cancel": {
      q: "¿Qué pasa con nuestros vídeos después de cancelar?",
      a: "Cuando termina el periodo pagado ya no se crean vídeos nuevos. Tu biblioteca se mantiene 90 días más: puedes seguir viendo, descargando y compartiendo tus vídeos, y la página Vídeos muestra la fecha. Te escribimos 14 días y 1 día antes. Pasados esos 90 días se borran los vídeos, las grabaciones y los archivos de subtítulos; tus ajustes y tu logo se conservan.\n\nLos vídeos descargados son tuyos para usarlos, también después de cancelar, así que descarga los que quieras conservar, o todo de una vez en Ajustes → Tus datos → «Descargar mis datos». Si vuelves a elegir un plan en la página Vídeos antes de esa fecha, se conserva todo. Si eliminas tu cuenta, se borra todo de inmediato.",

    },
    group: {
      q: "Tenemos una segunda clínica. ¿Cómo la añadimos?",
      a: "Los grupos y las clínicas con varias sedes se configuran con nosotros, no en la app. Escríbenos con tus sedes y las configuramos contigo. El precio es por sede.",
    },
    "patient-data": {
      q: "¿Podemos subir datos de pacientes o vídeos en los que salgan pacientes?",
      a: "DentVideo funciona sin datos de pacientes, así que no subas historias clínicas ni nos envíes información de pacientes por email.\n\nSi una grabación muestra o nombra a un paciente, necesitas su consentimiento explícito y documentado antes de subirla. DentVideo no está pensado para información sanitaria protegida según la ley estadounidense HIPAA.",
    },
    "privacy-dpa": {
      q: "¿Cómo se protegen nuestros datos? ¿Hay un contrato de encargo del tratamiento?",
      a: "Nuestra Política de privacidad explica qué tratamos, qué proveedores lo reciben y cuánto tiempo se conserva. Para los datos personales de lo que subes, tu clínica es la responsable y nosotros actuamos como encargados del tratamiento según nuestro Acuerdo de tratamiento de datos, que forma parte de nuestras condiciones.\n\nNo usamos lo que subes ni tus vídeos para entrenar modelos de IA, y no mostramos los vídeos de tu clínica a otros clientes.",
    },
    "export-data": {
      q: "¿Cómo descargamos todos nuestros datos?",
      a: "Abre Ajustes → Tus datos → «Descargar mis datos». Recibes un archivo con los datos de tu clínica, el guion, el texto y la revisión de cada vídeo, y enlaces de descarga de tus vídeos, grabaciones y logo. Los enlaces funcionan 24 horas, así que descarga pronto lo que necesites.",
    },
    "delete-account": {
      q: "¿Cómo eliminamos nuestra cuenta?",
      a: "Abre Ajustes → Tus datos → «Eliminar mi cuenta…» y escribe el nombre de tu clínica para confirmar. Los datos de la clínica, los vídeos, las grabaciones, el logo y el acceso se borran en el acto y no se pueden recuperar, así que descarga antes tus datos si quieres una copia.\n\nSi tu plan sigue activo, el diálogo te indica si se cancela a la vez o si primero tienes que cancelarlo. Nuestro proveedor de pagos conserva las facturas el tiempo que exige la ley fiscal, y las copias de seguridad se sobrescriben en un plazo de 30 días.",
    },
    "reminder-emails": {
      q: "¿Podemos dejar de recibir los emails de recordatorio?",
      a: "Sí. Cada recordatorio y cada resumen mensual tiene abajo un enlace «Darse de baja». Los emails sobre tu cuenta, los pagos y los vídeos listos siguen llegando, porque forman parte del servicio.",
    },
  },
};
