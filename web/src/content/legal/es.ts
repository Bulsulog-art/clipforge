import type { LegalText } from "./types";

/** Español. Traducción; prevalece la versión en inglés. */
export const ES: LegalText = {
  ui: {
    updated: "Última actualización",
    prevails: "Esta es una traducción. El texto vinculante es la {english}; si hay diferencias, prevalece.",
    englishVersion: "versión en inglés",
    country: "Montenegro",
    operator: {
      company: "Empresa",
      legalForm: "Forma jurídica",
      legalFormValue: "Sociedad de responsabilidad limitada conforme al derecho de Montenegro",
      office: "Domicilio social",
      register: "Registro",
      registerValue: "Registro Central de Entidades Empresariales (CRPS), Montenegro",
      registrationNumber: "Número de registro",
      taxId: "Identificación fiscal (PIB)",
      director: "Administrador",
      contact: "Correo electrónico",
      brand: "Marca",
      brandValue: "{brand} — producto: DentVideo",
    },
    table: { provider: "Proveedor", purpose: "Finalidad", data: "Datos", location: "Ubicación" },
  },

  subprocessors: {
    hostinger: {
      purpose: "Servidor privado virtual en el que funcionan dentvideo.com, el procesamiento de vídeos, nuestra base de datos, los accesos y el almacenamiento de archivos (nuestra propia instalación del software de código abierto Supabase).",
      data: "Todos los datos del servicio: cuenta, perfil de la clínica, archivos subidos, vídeos, referencias de facturación, registros.",
      location: "Ubicación del centro de datos pendiente de confirmar; esta lista se actualizará.",
    },
    openai: {
      purpose: "Escribe y revisa guiones, crea la narración con voz sintética y transcribe las grabaciones subidas cuando nuestro propio servicio de transcripción no está disponible.",
      data: "Datos del perfil de la clínica usados en los guiones, texto de los guiones, audio de las grabaciones (para transcribir).",
      location: "Estados Unidos",
    },
    resend: {
      purpose: "Envía los correos del servicio (códigos de verificación, «tus vídeos están listos», avisos de pago).",
      data: "Correo electrónico, nombre de la clínica, contenido del correo.",
      location: "Estados Unidos",
    },
    dodo: {
      purpose: "Pago, suscripciones, facturas, impuestos y reembolsos como comerciante registrado (merchant of record). Para los datos de pago, Dodo Payments es responsable independiente.",
      data: "Correo electrónico, nombre y datos de facturación, datos de pago, estado de la suscripción.",
      location: "Ver la política de privacidad de Dodo Payments",
    },
  },

  docs: {
    terms: {
      title: "Términos del servicio",
      description: "Las condiciones de uso de DentVideo, el servicio de vídeos educativos para pacientes de clínicas dentales, operado por BLS AI Automation DOO (Bulsu Labs), Podgorica, Montenegro.",
      intro: [
        "Estos términos son el acuerdo entre {legalName} («nosotros»), que gestiona DentVideo con la marca {brand}, y la clínica o el profesional que crea una cuenta de DentVideo («tú»). Al crear una cuenta o pagar un plan los aceptas. Si los aceptas en nombre de una clínica, confirmas que puedes obligarla.",
        "Los hemos escrito en lenguaje sencillo. Si algo no está claro, escribe a {email} antes de suscribirte.",
      ],
      sections: [
        { heading: "1. Quiénes somos", blocks: [{ operator: true }] },
        {
          heading: "2. Solo para empresas",
          blocks: [
            "DentVideo es una herramienta para clínicas y profesionales de la odontología. Solo se ofrece a empresas y profesionales que actúan para su consulta, no a consumidores ni a pacientes. Al usarlo confirmas que actúas en el ejercicio de tu actividad empresarial o profesional.",
          ],
        },
        {
          heading: "3. El servicio",
          blocks: [
            "DentVideo crea vídeos educativos cortos, narrados y subtitulados para clínicas dentales. Cada semana planifica temas a partir de los servicios que ofreces, escribe guiones, los narra con una voz sintética, genera los vídeos con el nombre, los colores y el logo de tu clínica y aplica controles automáticos de redacción publicitaria sanitaria y de plausibilidad clínica. En los planes que lo incluyen, también convierte las grabaciones que subes en clips cortos subtitulados.",
            "DentVideo no es un producto sanitario y no ofrece asesoramiento médico, jurídico ni regulatorio.",
          ],
        },
        {
          heading: "4. Tú apruebas todo antes de publicarlo",
          blocks: [
            "Nada de lo que crea DentVideo se publica automáticamente, y DentVideo no publica en redes sociales. Tú decides si apruebas, descargas y compartes cada vídeo, y eres el editor de lo que compartes.",
            "Nuestros controles son una ayuda, no una garantía. Los guiones los escriben y revisan modelos de IA y pueden contener errores. Antes de publicar, eres responsable de que cada vídeo sea correcto para tu consulta y cumpla las normas que te aplican: el código de tu colegio profesional, la normativa de publicidad sanitaria y las reglas de las plataformas.",
          ],
        },
        {
          heading: "5. Tu cuenta",
          blocks: [
            "Da datos correctos de tu clínica y mantén tu acceso en privado. Eres responsable de lo que ocurra con tu cuenta. Avísanos en {email} si crees que otra persona la ha usado.",
          ],
        },
        {
          heading: "6. Planes, precios y pago",
          blocks: [
            "DentVideo se paga por adelantado; no hay prueba gratuita. Antes de pagar ves una vista previa en directo de vídeos con el nombre, los colores y el logo de tu clínica. Planes actuales, en dólares estadounidenses:",
            {
              list: [
                "Starter: {starter} al mes.",
                "Practice: {practice} al mes o {practiceYear} al año.",
                "Group (grupos y clínicas con varias sedes): condiciones a medida por acuerdo — contacto {email}. Group no se puede comprar en la web.",
                "Oferta fundadora: Practice mensual a {foundingPrice} al mes durante tus primeros {foundingMonths} meses, solo para las primeras {foundingClinics} clínicas. Tras esos {foundingMonths} meses la suscripción continúa al precio normal de Practice, {practice} al mes, salvo que la canceles. La oferta termina cuando {foundingClinics} clínicas la hayan contratado.",
              ],
            },
            "Los pagos los gestiona Dodo Payments, que actúa como comerciante registrado (merchant of record) y revendedor autorizado: te vende la suscripción, cobra tu medio de pago, aparece en el extracto de tu tarjeta, calcula y cobra los impuestos aplicables y emite tu factura. A la compra se aplican además las condiciones para compradores de Dodo Payments. Nunca vemos los datos completos de tu tarjeta.",
            "Las suscripciones se renuevan automáticamente al final de cada periodo (mensual o anual) hasta que se cancelan. Si un pago falla, podemos pausar los vídeos nuevos hasta que se resuelva.",
            "Podemos cambiar los precios de lista. Te avisaremos por correo con al menos 30 días de antelación, y el nuevo precio solo se aplica desde tu siguiente renovación tras ese aviso.",
          ],
        },
        {
          heading: "7. Cancelación y reembolsos",
          blocks: [
            "Puedes cancelar en cualquier momento; la cancelación surte efecto al final del periodo pagado y mantienes el acceso hasta entonces. Los pagos de un periodo ya iniciado no se reembolsan en parte, salvo que la ley lo exija o el servicio haya fallado. Los detalles están en nuestra [Política de reembolsos](refunds), que forma parte de estos términos.",
          ],
        },
        {
          heading: "8. Tu contenido y los datos de pacientes",
          blocks: [
            "Conservas todos los derechos sobre lo que subes: tu logo, los datos de tu clínica y tus grabaciones. Nos autorizas a almacenarlos y tratarlos solo para prestarte DentVideo, incluido su envío a los proveedores indicados en nuestra [Política de privacidad](privacy).",
            "Confirmas que tienes derecho a usar lo que subes y que todas las personas que aparecen o hablan en una grabación han dado su consentimiento.",
            "DentVideo está diseñado para funcionar sin datos de pacientes. No subas historias clínicas. Si una grabación muestra o nombra a un paciente, necesitas su consentimiento explícito y documentado. Para los datos personales de lo que subes, tú eres el responsable del tratamiento y nosotros tu encargado conforme a nuestro [Acuerdo de encargo de tratamiento](dpa), que forma parte de estos términos.",
            "DentVideo no está diseñado para actuar como «business associate» según la HIPAA y no debe usarse para almacenar o tratar información sanitaria protegida conforme a la legislación de EE. UU.",
          ],
        },
        {
          heading: "9. Lo que recibes",
          blocks: [
            "Los vídeos, guiones y subtítulos creados para tu clínica puedes usarlos en la comunicación de tu clínica, también después de cancelar, para todo lo que hayas descargado.",
            "Algunos vídeos contienen imágenes de archivo de Pexels, usadas con la licencia de Pexels, y una voz sintética. Puedes usarlas como parte de los vídeos, pero no por separado (por ejemplo, extrayendo y revendiendo las imágenes).",
            "No usamos lo que subes ni tus vídeos para entrenar modelos de IA, y no mostramos los vídeos de tu clínica a otros clientes.",
            "DentVideo en sí (el software, el diseño, las plantillas y la marca) sigue siendo nuestro.",
          ],
        },
        {
          heading: "10. Uso aceptable",
          blocks: [
            "No uses DentVideo para crear contenido engañoso, ilícito o que prometa resultados de tratamientos, y no intentes romper, sobrecargar, copiar o revender el servicio, ni acceder a datos de otras clínicas.",
            "Podemos suspender o cerrar una cuenta que incumpla estos términos. Cuando sea posible, te avisaremos antes y te daremos ocasión de corregirlo.",
          ],
        },
        {
          heading: "11. Disponibilidad y cambios",
          blocks: [
            "Trabajamos para entregar tus vídeos cada semana, pero no podemos garantizar que el servicio esté siempre disponible o libre de errores. La entrega semanal puede retrasarse, por ejemplo por una caída de alguno de nuestros proveedores.",
            "Mejoramos DentVideo continuamente y podemos cambiar su funcionamiento. Si retiramos algo esencial de tu plan, te avisaremos antes y podrás cancelar.",
          ],
        },
        {
          heading: "12. Responsabilidad",
          blocks: [
            "Nada en estos términos limita la responsabilidad que la ley no permite limitar, como la derivada de dolo o culpa grave.",
            "En los demás casos no respondemos de daños indirectos o consecuenciales (por ejemplo, lucro cesante, pérdida de pacientes o daños a la reputación), y nuestra responsabilidad total por todas las reclamaciones se limita a lo que nos hayas pagado en los 12 meses anteriores a la reclamación.",
            "Como apruebas y publicas cada vídeo, eres responsable de las reclamaciones derivadas del contenido que publicas, incluidas las quejas por normas de publicidad sanitaria.",
          ],
        },
        {
          heading: "13. Fin del acuerdo",
          blocks: [
            "Puedes terminar el acuerdo cancelando tu plan y eliminando tu cuenta en Ajustes. Nosotros podemos terminarlo con 30 días de preaviso, o de inmediato conforme al apartado 10. Al eliminar una cuenta borramos sus datos como se describe en la [Política de privacidad](privacy).",
          ],
        },
        {
          heading: "14. Cambios en estos términos",
          blocks: [
            "Podemos actualizar estos términos. Te avisaremos por correo de los cambios relevantes al menos 30 días antes de que entren en vigor. Si sigues usando DentVideo después, se aplican los nuevos términos; si no los aceptas, puedes cancelar antes de que entren en vigor.",
          ],
        },
        {
          heading: "15. Ley aplicable y tribunales",
          blocks: [
            "Estos términos se rigen por las leyes de Montenegro, y son competentes los tribunales de Podgorica. Esto no te priva de la protección que te otorgue la ley imperativa del país donde estás establecido y que no pueda excluirse por acuerdo.",
            "El texto en inglés de estos términos es el vinculante. Las traducciones se ofrecen por comodidad; si difieren, prevalece la versión en inglés.",
          ],
        },
        { heading: "16. Contacto", blocks: ["Preguntas sobre DentVideo: {email}. Asuntos de la empresa: {companyEmail}."] },
      ],
    },

    privacy: {
      title: "Política de privacidad",
      description: "Qué datos personales trata DentVideo, por qué, qué proveedores los reciben, cuánto tiempo se conservan y tus derechos.",
      intro: [
        "Esta política explica qué datos personales trata {legalName} («nosotros») cuando una clínica usa DentVideo o alguien visita dentvideo.com, por qué, quién más los recibe y cuánto tiempo los conservamos.",
        "DentVideo está pensado para funcionar sin datos de pacientes. Los pacientes no usan DentVideo, y pedimos a las clínicas que no suban nada que identifique a un paciente sin su consentimiento.",
      ],
      sections: [
        {
          heading: "1. Responsable",
          blocks: [
            "El responsable de los datos de cuenta, facturación y web es:",
            { operator: true },
            "Para las grabaciones y demás material que sube una clínica, la clínica decide qué se sube y para qué: la clínica es la responsable y nosotros tratamos esos datos por su cuenta conforme a nuestro [Acuerdo de encargo de tratamiento](dpa).",
            "Consultas y solicitudes de privacidad: {email}.",
          ],
        },
        {
          heading: "2. Qué datos recogemos",
          blocks: [
            {
              list: [
                "Cuenta: tu correo electrónico y tu acceso (guardamos un hash de la contraseña, nunca la contraseña) y si tu correo está confirmado.",
                "Perfil de la clínica: nombre, ciudad y país, idioma, tratamientos que ofreces, tono, usuario de redes sociales, enlace de reservas, colores de marca y logo.",
                "Grabaciones que subes (en los planes que las incluyen): vídeo y audio, con la voz y la imagen de quien aparece, y una transcripción.",
                "Lo que creamos para ti: temas, guiones, subtítulos, narración, vídeos generados, resultados de los controles y tus aprobaciones.",
                "Facturación: tu plan, estado de la suscripción, fecha de renovación y las referencias de suscripción, cliente y pago de Dodo Payments. Los datos de la tarjeta los gestiona Dodo Payments y nunca nos llegan.",
                "Correos: qué correos del servicio hemos enviado a tu clínica y si te has dado de baja de los recordatorios.",
                "Eventos de uso: un pequeño registro propio de pasos como «página vista» o «plan elegido», con el idioma de la página, las etiquetas de campaña (utm) y el dominio de la web de procedencia. No guardan ningún ID de cookie, dirección IP, datos del navegador, nombre ni correo.",
                "Datos técnicos: tu dirección IP y los datos de la solicitud se tratan para servir las páginas, proteger el servicio y limitar abusos (contadores de límite de peticiones de corta duración).",
              ],
            },
          ],
        },
        {
          heading: "3. Cookies y almacenamiento del navegador",
          blocks: [
            "Usamos solo lo que el servicio necesita: cookies de sesión para el acceso, una cookie que recuerda tu idioma, una cookie que recuerda hasta dónde llegaste en el registro y almacenamiento temporal del navegador durante el registro. No usamos cookies publicitarias ni de analítica de terceros.",
          ],
        },
        {
          heading: "4. Finalidades y bases jurídicas",
          blocks: [
            {
              list: [
                "Prestar DentVideo según nuestro contrato contigo: crear tus vídeos, procesar tus grabaciones, mostrarlos en tu biblioteca y avisarte por correo (contrato).",
                "Cobrar y gestionar tu suscripción (contrato).",
                "Mantener la seguridad del servicio, evitar abusos y corregir errores (interés legítimo).",
                "Saber qué páginas y canales atraen clínicas, con los eventos de uso anónimos indicados (interés legítimo).",
                "Enviar recordatorios sobre un registro sin terminar, que puedes detener con el enlace de baja (interés legítimo).",
                "Cumplir obligaciones legales, como los registros contables y fiscales (obligación legal).",
              ],
            },
            "No vendemos datos personales, no los usamos para publicidad y no usamos lo que subes ni tus vídeos para entrenar modelos de IA.",
          ],
        },
        {
          heading: "5. Quién los recibe",
          blocks: [
            "Trabajamos con pocos proveedores. Cada uno recibe solo lo que necesita para su tarea:",
            { subprocessors: true },
            "También consultamos términos de búsqueda generales (como el nombre de un tratamiento y un idioma) en las sugerencias de búsqueda públicas de Google y en la biblioteca de vídeos de archivo de Pexels. Estas consultas no contienen datos personales. La base de datos, los accesos y el almacenamiento de archivos funcionan en nuestra propia instalación del software de código abierto Supabase en nuestro servidor; Supabase Inc. no recibe los datos.",
          ],
        },
        {
          heading: "6. Transferencias internacionales",
          blocks: [
            "Estamos establecidos en Montenegro, fuera de la UE/EEE. Algunos proveedores tratan datos en otros países, incluido Estados Unidos. Cuando la ley aplicable a los datos exige una garantía para esa transferencia, nos basamos en una decisión de adecuación si existe o en cláusulas contractuales tipo (para el Reino Unido, con el anexo del Reino Unido) en nuestros contratos con esos proveedores.",
          ],
        },
        {
          heading: "7. Cuánto tiempo los conservamos",
          blocks: [
            {
              list: [
                "Cuenta, perfil de la clínica, archivos subidos y vídeos: mientras exista tu cuenta. Cuando eliminas tu cuenta en Ajustes, borramos de inmediato de nuestros sistemas activos tus archivos, vídeos, el perfil de la clínica y las referencias de facturación, y tu acceso salvo que también lo uses para otra app de {brand}. Las copias en las copias de seguridad del servidor se sobrescriben al rotar; a más tardar 30 días después de la eliminación no conservamos datos de DentVideo sobre tu cuenta, salvo lo indicado abajo. No restauramos cuentas eliminadas desde copias de seguridad.",
                "Eventos de uso: se conservan como estadística anónima; al eliminar tu cuenta se elimina su vínculo con tu clínica.",
                "Facturas y registros de pago: los conserva Dodo Payments como comerciante registrado según sus propias obligaciones legales, y nosotros en la medida en que lo exija la normativa contable y fiscal.",
                "Contadores de límite de peticiones: de minutos a horas.",
              ],
            },
          ],
        },
        {
          heading: "8. Tus derechos",
          blocks: [
            "Según la ley que te sea aplicable, puedes pedirnos acceso a tus datos, rectificación, supresión, limitación del tratamiento y una copia en formato portable, y oponerte al tratamiento basado en intereses legítimos. Puedes eliminar tu cuenta tú mismo en Ajustes. Escribe a {email}; respondemos en el plazo de un mes.",
            "También puedes reclamar ante una autoridad de protección de datos: en Montenegro, la Agencia de Protección de Datos Personales y Libre Acceso a la Información; en la UE/EEE, la autoridad de tu país (en España, la AEPD); en el Reino Unido, la Information Commissioner's Office; en Turquía, la Autoridad de Protección de Datos Personales (KVKK).",
            "Aplicamos la ley de protección de datos personales de Montenegro y, cuando se aplican a nuestro tratamiento, el Reglamento General de Protección de Datos de la UE (RGPD), el UK GDPR y la Ley n.º 6698 de Turquía sobre protección de datos personales (KVKK).",
          ],
        },
        {
          heading: "9. Seguridad",
          blocks: [
            "Las conexiones están cifradas (HTTPS). Los datos de cada clínica están aislados en la base de datos mediante reglas de acceso, los archivos solo se sirven mediante enlaces firmados de corta duración y el acceso a los servidores está limitado a las personas que gestionan DentVideo. Ningún sistema es perfectamente seguro; si una brecha afecta a tus datos, te avisaremos sin dilación indebida.",
          ],
        },
        { heading: "10. Menores", blocks: ["DentVideo es un servicio para empresas y no está dirigido a menores de 18 años."] },
        {
          heading: "11. Cambios",
          blocks: [
            "Actualizamos esta política cuando cambia lo que hacemos y modificamos la fecha de arriba. Avisamos por correo a los titulares de cuentas de los cambios relevantes.",
          ],
        },
      ],
    },

    refunds: {
      title: "Política de reembolsos",
      description: "Cómo funcionan la cancelación y los reembolsos de las suscripciones de DentVideo, incluida la oferta fundadora.",
      intro: ["Esta política forma parte de nuestros [Términos del servicio](terms). En resumen: cancela cuando quieras, conservas el acceso hasta el final del periodo pagado y, si el servicio falló, lo solucionamos."],
      sections: [
        {
          heading: "1. Cancelar",
          blocks: [
            "Puedes cancelar en cualquier momento en Ajustes (Gestionar facturación) o escribiendo a {email}. La cancelación detiene la siguiente renovación; surte efecto al final del periodo mensual o anual ya pagado y mantienes el acceso completo hasta entonces. Los vídeos descargados siguen siendo tuyos. Eliminar tu cuenta también cancela la suscripción, de inmediato.",
          ],
        },
        {
          heading: "2. Sin reembolsos parciales",
          blocks: [
            "No reembolsamos la parte no usada de un periodo ya iniciado, mensual o anual, salvo que la ley exija un reembolso o el servicio haya fallado como se describe abajo. Si cambias de plan, la diferencia por el resto del periodo en curso se cobra o se abona al momento.",
          ],
        },
        {
          heading: "3. Si el servicio falló",
          blocks: [
            "Si, por un fallo nuestro, los vídeos de una semana no se entregaron o no se podían usar, avísanos en {email} en un plazo de 14 días. Volveremos a hacer los vídeos de esa semana o reembolsaremos la parte de tu pago correspondiente a ese periodo, a nuestra elección. Los retrasos de pocos días por una caída de alguno de nuestros proveedores, o los vídeos que rechazas por gusto, no cuentan como fallo.",
          ],
        },
        {
          heading: "4. Oferta fundadora",
          blocks: [
            "La oferta fundadora da a las primeras {foundingClinics} clínicas el plan Practice a {foundingPrice} al mes durante {foundingMonths} meses, con pago mensual. Tras esos {foundingMonths} meses, la misma suscripción continúa al precio normal de Practice, {practice} al mes, salvo que la canceles. El precio fundador está ligado a esa suscripción: si la cancelas, termina y puede que no vuelva a estar disponible.",
          ],
        },
        {
          heading: "5. Cómo se pagan los reembolsos",
          blocks: [
            "Dodo Payments es el comerciante registrado en cada compra de DentVideo, por lo que los reembolsos los paga Dodo Payments al medio de pago original, incluidos los impuestos cobrados sobre el importe reembolsado. Escríbenos primero a {email}; también puedes dirigirte a Dodo Payments según sus condiciones para compradores. Tu banco puede tardar unos días en mostrar el reembolso.",
          ],
        },
        {
          heading: "6. Tus derechos legales",
          blocks: [
            "DentVideo se vende a empresas y profesionales. Si aun así la ley imperativa te concede un derecho de desistimiento o de reembolso, ese derecho se aplica además de esta política.",
          ],
        },
      ],
    },

    dpa: {
      title: "Acuerdo de encargo de tratamiento",
      description: "El acuerdo de encargo de tratamiento de DentVideo conforme al artículo 28 del RGPD: qué tratamos para las clínicas, cómo y la lista de subencargados.",
      intro: [
        "Este Acuerdo de encargo de tratamiento («DPA») forma parte de los [Términos del servicio](terms) entre la clínica («responsable») y {legalName} («encargado»). Se aplica siempre que el material que la clínica introduce en DentVideo contenga datos personales de los que la clínica sea responsable. Se celebra al aceptar los Términos; no hace falta firma. Si lo solicitas, también lo facilitamos firmado.",
      ],
      sections: [
        { heading: "1. Encargado del tratamiento", blocks: [{ operator: true }] },
        {
          heading: "2. Objeto, naturaleza y finalidad",
          blocks: [
            "Tratamos los datos personales de la clínica solo para prestar DentVideo: almacenar lo que sube, transcribir grabaciones, escribir, narrar y generar vídeos, aplicar controles, mostrar los resultados en la biblioteca de la clínica y enviar correos del servicio. El tratamiento dura mientras la clínica use DentVideo, más el plazo de supresión del apartado 9.",
            {
              list: [
                "Interesados: dentistas y personal de la clínica; personas que aparecen o hablan en las grabaciones que sube la clínica; pacientes solo si la clínica sube material que los identifica.",
                "Categorías de datos: nombres, correos electrónicos, imagen y voz, transcripciones, datos del perfil de la clínica. DentVideo no necesita datos de salud; solo se tratan si la clínica los sube, y en ese caso la clínica es responsable de contar con una base jurídica y el consentimiento explícito del paciente.",
              ],
            },
          ],
        },
        {
          heading: "3. Instrucciones",
          blocks: [
            "Tratamos los datos solo siguiendo instrucciones documentadas de la clínica —los Términos, este DPA y el uso que haga de los ajustes del servicio—, salvo que la ley exija otra cosa; en ese caso se lo comunicamos antes, salvo que la ley lo prohíba. Si creemos que una instrucción infringe la normativa de protección de datos, se lo diremos a la clínica.",
          ],
        },
        { heading: "4. Confidencialidad", blocks: ["Todas las personas de {shortName} que pueden acceder a los datos están obligadas a la confidencialidad."] },
        {
          heading: "5. Medidas de seguridad",
          blocks: [
            {
              list: [
                "Cifrado en tránsito (HTTPS) en todas las conexiones con la web, la app y nuestra base de datos.",
                "Aislamiento de los datos de cada clínica mediante reglas de acceso en la base de datos; una clínica solo puede leer sus propias filas y archivos.",
                "Archivos servidos solo mediante enlaces firmados de corta duración; subidas limitadas por tipo y tamaño.",
                "Cuentas de servidores y proveedores limitadas a las personas que gestionan DentVideo.",
                "Límites de peticiones y de gasto en cada paso de procesamiento de pago.",
                "Eliminación de la cuenta por la propia clínica, que suprime sus datos como se describe en el apartado 9.",
              ],
            },
          ],
        },
        {
          heading: "6. Subencargados",
          blocks: [
            "La clínica autoriza de forma general a los subencargados siguientes. Imponemos a cada uno obligaciones de protección de datos no menos protectoras que este DPA, en la medida en que sus condiciones estándar lo permitan, y seguimos siendo responsables de ellos.",
            { subprocessors: true },
            "Avisaremos a la clínica por correo al menos 30 días antes de añadir o sustituir un subencargado. Si la clínica se opone por motivos razonables de protección de datos y no lo resolvemos, puede cancelar y le reembolsamos lo pagado por adelantado para el periodo posterior al cambio.",
            "No son subencargados: Supabase es software de código abierto que gestionamos nosotros mismos en el servidor indicado (Supabase Inc. no recibe datos). Las sugerencias de búsqueda de Google y la biblioteca de vídeos de Pexels solo reciben términos de búsqueda generales, nunca datos personales. Dodo Payments actúa respecto de los datos de pago como responsable independiente según sus propias condiciones.",
          ],
        },
        {
          heading: "7. Transferencias internacionales",
          blocks: [
            "Estamos establecidos en Montenegro, fuera de la UE/EEE, y algunos subencargados tratan datos en Estados Unidos. Cuando el RGPD, el UK GDPR u otra ley aplicable exijan un mecanismo de transferencia para los datos enviados a nosotros o a un subencargado, las partes se basan en una decisión de adecuación si existe o, en su defecto, en las cláusulas contractuales tipo de la Comisión Europea (módulo responsable–encargado o encargado–encargado, con el anexo del Reino Unido cuando proceda), que firmamos si se solicita.",
          ],
        },
        {
          heading: "8. Asistencia, brechas y auditorías",
          blocks: [
            {
              list: [
                "Ayudamos a la clínica a atender las solicitudes de los interesados, por ejemplo localizando o suprimiendo material, en la medida en que el servicio lo permita.",
                "Ayudamos a la clínica en materia de seguridad, evaluaciones de impacto y consultas a autoridades cuando afecten a nuestro tratamiento.",
                "Notificamos a la clínica una violación de seguridad que afecte a sus datos sin dilación indebida tras conocerla, con la información de que dispongamos.",
                "Ponemos a disposición la información necesaria para demostrar el cumplimiento de este DPA y permitimos auditorías con aviso razonable, como máximo una vez al año salvo que una autoridad exija más, a cargo de la clínica.",
              ],
            },
          ],
        },
        {
          heading: "9. Supresión al final",
          blocks: [
            "La clínica puede descargar sus vídeos en cualquier momento. Cuando elimina su cuenta, borramos sus datos de nuestros sistemas activos de inmediato; las copias en copias de seguridad se sobrescriben al rotar y, a más tardar en 30 días, no conservamos datos de la clínica, salvo que la ley exija conservarlos.",
          ],
        },
        {
          heading: "10. Ley y prelación",
          blocks: [
            "Este DPA se rige por la ley y los tribunales de los Términos, sin limitar los derechos de los interesados ni de las autoridades conforme al RGPD u otra normativa de protección de datos aplicable. Si este DPA contradice los Términos en materia de protección de datos, prevalece este DPA. El texto en inglés es el vinculante.",
          ],
        },
      ],
    },

    imprint: {
      title: "Aviso legal",
      description: "Aviso legal de dentvideo.com: BLS AI Automation DOO, Podgorica, Montenegro — registro, identificación fiscal, administrador y contacto.",
      intro: ["Información sobre el titular de dentvideo.com (conforme al § 5 de la ley alemana de servicios digitales, DDG, y al artículo 5 de la Directiva europea sobre comercio electrónico)."],
      sections: [
        { heading: "Titular", blocks: [{ operator: true }] },
        { heading: "Responsable del contenido", blocks: ["{director}, {address}."] },
        {
          heading: "Resolución de litigios",
          blocks: [
            "DentVideo se ofrece a empresas y profesionales. No estamos obligados ni dispuestos a participar en procedimientos de resolución de litigios ante una entidad de arbitraje de consumo.",
          ],
        },
      ],
    },
  },
};
