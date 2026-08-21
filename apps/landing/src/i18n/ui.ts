// i18n content for the public landing.
// Default locale is Spanish (PE). All user-visible copy lives here — never
// hardcode display strings inside .astro/.ts. Adding a locale (e.g. Quechua)
// is just another entry with the same shape.

export const defaultLang = "es" as const;

export const languages = {
  es: "Español",
  en: "English",
  pt: "Português",
} as const;

// Path segment -> HTML lang attribute.
export const htmlLang = {
  es: "es-PE",
  en: "en",
  pt: "pt-BR",
} as const;

export type Lang = keyof typeof languages;

// Canonical course slugs. Stable across locales (used to build /courses/<slug>
// and by the language finder). The display name is localized per dictionary.
export const courseSlugs = [
  "english",
  "french",
  "italian",
  "german",
  "portuguese",
  "mandarin-chinese",
  "korean",
] as const;

export type CourseSlug = (typeof courseSlugs)[number];

// Anchor names for the two audience blocks on a course page, in the order they
// are listed in `courses.detail.audiences`. They end up in the address bar, so
// they read as words, never as an index (CLAUDE.md §4: no technical id ever
// reaches the user). The homepage "Programas" cards link straight to them.
export const audienceAnchors = ["kids", "teens-and-adults"] as const;

// Full-package ("paquete completo", pago único) price per course, in PEN.
// Source: the merchant e-commerce catalog. Display copy only — the actual
// payment system is the source of truth for charged amounts. Language-agnostic
// number; format per locale with `formatPEN` (utils). The "1 sol" hook comes
// from the monthly modality (≈S/20 / 20 sesiones = 1 sol por sesión), NOT from
// these package prices — never present a course as costing only S/1.
export const coursePrices: Record<CourseSlug, number> = {
  "english": 69.9,
  "french": 80,
  "italian": 80,
  "german": 30,
  "portuguese": 80,
  "mandarin-chinese": 95,
  "korean": 60,
};

// Legal identity and contact channels of the Asociación. Language-agnostic
// data — the same digits, address and handles in every locale — so it lives
// here once instead of being retyped inside each dictionary. The legal pages
// interpolate these through the {ruc} / {address} / {site} / {phones} /
// {email} tokens in `i18n/legal.ts`.
export const org = {
  ruc: "20610561463",
  address:
    "Av. Manuel Murillo, Condominio Gral Manuel Murillo 180, Chorrillos, Lima, Perú",
  site: "onlyonecoin.edu.pe",
  // Stored in display form, country code included: every surface that shows a
  // number shows the same one, and `tel:` links are derived by stripping the
  // separators rather than by re-assembling the number.
  phones: ["+51 968 464 483", "+51 945 713 465", "+51 962 985 106"],
  // The institutional address, given by the Asociación (21/08/2026) — it
  // replaces the "tencionalcliente1@" that appeared in the legal copy we were
  // sent. Institutional on purpose: this is the address printed in the terms
  // and in the privacy policy as the channel for data-rights requests, so it
  // has to outlive whoever is answering it. One constant, so the contact page
  // and both legal pages can never disagree.
  email: "Admin@onlyonecoin.edu.pe",
  /** WhatsApp number in wa.me form (country code + number, digits only). */
  whatsapp: "51951153323",
  // TODO: confirm with the Asociación. Derived, not told to us: the previous
  // WordPress site claimed "4 años" while it was published in 2024, which puts
  // the start at 2020. The /about copy counts from here instead of hardcoding
  // a number, so the page stops aging the moment this value is right.
  foundedYear: 2020,
  /** Profiles the Asociación actually runs. Rendered in the footer AND
      declared as `sameAs` in the Organization JSON-LD, so they live once. */
  social: {
    facebook: "https://www.facebook.com/onlyonecoin",
    instagram: "https://www.instagram.com/onlyonecoin.pe/",
    linkedin: "https://www.linkedin.com/company/organizacion-de-onlyonecoin/",
  },
} as const;

/** Full wa.me link for the floating button and the course CTAs. */
export const whatsappUrl = `https://wa.me/${org.whatsapp}`;

// Country (ISO 3166-1 alpha-2) -> suggested course slug for the geo finder.
// Fallback is always "english" (the flagship). Kept small and legible on
// purpose; unknown countries get the flagship.
export const geoSuggestion: Record<string, CourseSlug> = {
  PE: "english",
  BR: "portuguese",
  PT: "portuguese",
  FR: "french",
  BE: "french",
  IT: "italian",
  DE: "german",
  AT: "german",
  CH: "german",
  CN: "mandarin-chinese",
  TW: "mandarin-chinese",
  KR: "korean",
  US: "english",
  GB: "english",
};

export const content = {
  es: {
    meta: {
      title: "Cursos de inglés e idiomas online en Perú — Only One Coin",
      description:
        "Clases 100% online para todo el Perú: inglés, francés, italiano, alemán, portugués, chino y coreano. Paquete completo de pago único, certificado y talleres gratis.",
      siteName: "Only One Coin",
      imageAlt: "Asociación Only One Coin Perú — cursos de idiomas online",
      courses: {
        title: "Cursos de idiomas online: precios y paquetes — Only One Coin",
        description:
          "Elige inglés, francés, italiano, alemán, portugués, chino mandarín o coreano. Clases online desde los 6 años, con paquete completo de pago único y sin mensualidades.",
      },
      course: {
        titlePre: "Curso de ",
        titleMid: " online en Perú · ",
        titlePost: " pago único",
        descPre: "Aprende ",
        descMid: " online con la Asociación Only One Coin Perú: paquete completo por ",
        descPost: " de pago único, desde los 6 años, con certificado digital y talleres gratis.",
      },
      faq: {
        title: "Preguntas frecuentes sobre los cursos online — Only One Coin",
        description:
          "Resolvemos las dudas más comunes sobre matrícula, precios, horarios, certificados y talleres gratuitos de la Asociación Only One Coin Perú.",
      },
      blog: {
        title: "Blog de idiomas y aprendizaje — Only One Coin",
        description:
          "Consejos para aprender idiomas online, novedades de la Asociación Only One Coin Perú y recursos gratuitos para nuestros alumnos.",
      },
      community: {
        title: "Comunidad de alumnos en todo el Perú — Only One Coin",
        description:
          "Miles de estudiantes de todo el Perú aprenden idiomas online con la Asociación Only One Coin. Conoce nuestra comunidad y súmate.",
      },
      terms: {
        title: "Términos y condiciones de uso — Only One Coin",
        description:
          "Términos y condiciones de uso del sitio web de la Asociación Only One Coin Perú: servicios, registro de usuarios, propiedad intelectual, responsabilidad y ley aplicable.",
      },
      privacy: {
        title: "Política de privacidad — Only One Coin",
        description:
          "Cómo la Asociación Only One Coin Perú recopila, usa, almacena y protege tus datos personales, y cómo ejercer tus derechos de acceso, rectificación, cancelación y oposición.",
      },
      about: {
        title: "Nosotros — Asociación Only One Coin Perú",
        description:
          "Conoce a la Asociación Only One Coin Perú: educación accesible para todos, clases de inglés desde S/1.00 por sesión, y nuestra misión, visión y valores.",
      },
      contact: {
        title: "Contacto — Asociación Only One Coin Perú",
        description:
          "Escríbenos por WhatsApp, llámanos o envíanos un correo. Atención de lunes a viernes para matrícula, horarios y cursos disponibles.",
      },
    },
    nav: {
      home: "Inicio",
      about: "Nosotros",
      courses: "Cursos",
      coursesAll: "Ver todos los cursos",
      resources: "Recursos",
      community: "Comunidad",
      blog: "Blog",
      faq: "Preguntas frecuentes",
      contact: "Contacto",
      portal: "Portal del Alumno",
      openMenu: "Abrir menú",
      closeMenu: "Cerrar menú",
    },
    hero: {
      w1: "¡Aprende",
      w2: "Inglés",
      w3: "desde",
      price: "S/1",
      priceUnit: "por sesión",
      subHtml:
        '¡Abierto para <strong>TODAS LAS EDADES</strong><br />desde los <span class="accent">6 años</span> en adelante!',
      packageNote:
        'Paquete completo de Inglés: <strong>pago único de S/69.90</strong>. Incluye matrícula, libro, certificado y talleres gratuitos.',
      ctaEnroll: "Matricúlate ahora",
      ctaCourses: "Ver cursos",
      imgAlt: "Estudiantes de Only One Coin",
      badgeHtml:
        "Matricúlate hoy y accede <strong>GRATIS</strong> a nuestros talleres de Excel, Emprendimiento, Liderazgo y Quechua.",
    },
    why: {
      eyebrow: "Only One Coin",
      titlePre: "¿Por qué ",
      titleAccent: "elegirnos",
      titlePost: "?",
      cards: [
        {
          title: "Precio accesible",
          text: "Clases desde 1 sol por sesión y el paquete completo en un pago único, sin mensualidades ni costos ocultos.",
        },
        {
          title: "Talleres Gratuitos",
          text: "Excel, Emprendimiento, Liderazgo y Quechua sin costo adicional para nuestros alumnos.",
        },
        {
          title: "Certificado Digital",
          text: "Al culminar tu curso recibes un certificado digital que valida tu aprendizaje.",
        },
        {
          title: "Plataforma del Alumno",
          text: "Un portal dedicado para ver tus clases, horarios y materiales en un solo lugar.",
        },
        {
          title: "Enseñanza Innovadora",
          text: "Metodología dinámica y docentes comprometidos con el aprendizaje real.",
        },
      ],
    },
    programs: {
      eyebrow: "Nuestra oferta",
      titlePre: "Programas de ",
      titleAccent: "Inglés",
      titlePost: "",
      viewCourse: "Ver curso",
      items: [
        {
          tag: "100% online",
          title: "Niños (6-12 años)",
          text: "Un primer contacto con el inglés a través del juego, la música y actividades diseñadas para su edad.",
          href: "/courses/english#kids",
        },
        {
          tag: "Todos los niveles",
          title: "Jóvenes y Adultos (13 años en adelante)",
          text: "Programa estructurado por niveles para lograr fluidez real, con enfoque conversacional.",
          href: "/courses/english#teens-and-adults",
        },
      ],
    },
    finder: {
      eyebrow: "Encuentra tu idioma",
      titlePre: "El idioma ideal ",
      titleAccent: "para ti",
      titlePost: "",
      text: "Según desde dónde nos visitas, te sugerimos por dónde empezar. También puedes elegir tú mismo.",
      detecting: "Detectando tu ubicación…",
      fromLabel: "Detectamos que nos visitas desde",
      unknownLocation: "tu zona",
      recommendPre: "Te recomendamos empezar por",
      viewCourse: "Ver este curso",
      orChoose: "O elige el idioma que quieres aprender:",
      allCourses: "Ver todos los cursos",
    },
    cta: {
      titlePre: "¿Tienes alguna ",
      titleAccent: "consulta",
      titlePost: "?",
      text: "Escríbenos y con gusto te ayudamos con tu matrícula, horarios y cursos disponibles.",
      button: "Contáctanos",
    },
    testimonials: {
      eyebrow: "Testimonios",
      titlePre: "Lo que dicen nuestros ",
      titleAccent: "alumnos",
      titlePost: "",
      note: "Contenido de ejemplo — se reemplazará con testimonios reales.",
      prev: "Anterior",
      next: "Siguiente",
      items: [
        { name: "María Fernández", role: "Alumna de Inglés", initials: "MF", quote: "Aprendí muchísimo y los profes son súper pacientes. ¡Por un sol no lo pensé dos veces!" },
        { name: "José Ramírez", role: "Alumno de Francés", initials: "JR", quote: "Las clases son dinámicas y prácticas. En pocos meses ya me animo a conversar." },
        { name: "Lucía Quispe", role: "Apoderada", initials: "LQ", quote: "Mi hija espera cada clase con ganas. Una gran oportunidad para las familias." },
        { name: "Carlos Mendoza", role: "Alumno de Italiano", initials: "CM", quote: "Nunca pensé que estudiar un idioma fuera tan accesible. Los talleres gratis son un plus enorme." },
        { name: "Ana Torres", role: "Alumna de Alemán", initials: "AT", quote: "La plataforma del alumno me ayuda a no perder ninguna clase ni material. Todo súper ordenado." },
        { name: "Diego Salas", role: "Alumno de Portugués", initials: "DS", quote: "Excelente relación calidad-precio. Los docentes se nota que aman lo que hacen." },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      titlePre: "Resolvemos tus ",
      titleAccent: "dudas",
      titlePost: "",
      lead: "Todo lo que necesitas saber sobre nuestros cursos, la matrícula y los talleres gratuitos.",
      ctaTitle: "¿No encuentras tu respuesta?",
      ctaText: "Escríbenos por WhatsApp y te ayudamos con la matrícula, los horarios y todo lo demás.",
      ctaButton: "Escríbenos por WhatsApp",
      items: [
        { q: "¿Cuánto cuesta y cómo funciona el pago?", a: "Cada curso tiene un paquete completo de pago único (por ejemplo, Inglés cuesta S/69.90), que incluye matrícula, material, certificado y talleres. También existe una modalidad mensual que equivale a 1 sol por sesión. Sin mensualidades ocultas ni cobros sorpresa." },
        { q: "¿Desde qué edad puedo matricularme?", a: "Recibimos alumnos desde los 6 años en adelante. Hay grupos pensados para niños y grupos para jóvenes y adultos." },
        { q: "¿Cómo me matriculo?", a: "Escríbenos por WhatsApp para reservar tu cupo. Luego completas el formulario de matrícula, subes tu comprobante y recibes tus credenciales de acceso." },
        { q: "¿Las clases son presenciales o virtuales?", a: "Todas nuestras clases son 100% online, en vivo con un docente. Puedes estudiar desde cualquier ciudad del Perú sin moverte de casa. Consúltanos por WhatsApp los horarios disponibles del periodo." },
        { q: "¿Qué incluye la matrícula?", a: "El acceso a tu curso de idioma, la plataforma del alumno y los talleres gratuitos de Excel, Emprendimiento, Liderazgo y Quechua." },
        { q: "¿Recibo algún certificado?", a: "Sí. Al culminar tu curso recibes un certificado digital que valida tu aprendizaje." },
      ],
    },
    stats: {
      title: "La confianza de miles de familias",
      items: [
        { value: "+200 000", label: "Alumnos formados" },
        { value: "+4", label: "Años en el mercado" },
        { value: "+7", label: "Idiomas disponibles" },
      ],
    },
    courses: {
      list: {
        "english": "Inglés",
        "french": "Francés",
        "italian": "Italiano",
        "german": "Alemán",
        "portuguese": "Portugués",
        "mandarin-chinese": "Chino Mandarín",
        "korean": "Coreano",
      },
      indexEyebrow: "Nuestros idiomas",
      indexTitlePre: "Elige el idioma que ",
      indexTitleAccent: "quieres aprender",
      indexTitlePost: "",
      indexText: "Cada curso tiene su paquete completo de pago único y está abierto desde los 6 años. Elige un idioma para ver el precio y el detalle.",
      payOnce: "pago único",
      viewCourse: "Ver curso",
    },
    courseDetail: {
      backToCourses: "Volver a cursos",
      eyebrowPre: "Curso de ",
      eyebrowPost: "",
      titlePre: "Aprende ",
      titlePost: "",
      priceLabel: "Paquete completo · pago único",
      leadPre: "Un programa completo de ",
      leadPost: " para todas las edades, con enfoque conversacional y docentes comprometidos con tu aprendizaje real.",
      exampleNote: "Contenido de ejemplo — la información detallada de cada curso se completará con los datos reales del periodo.",
      audiencesTitle: "¿Para quién es?",
      audiences: [
        { tag: "6 a 12 años", title: "Niños", text: "Primer contacto con el idioma a través del juego, la música y actividades diseñadas para su edad." },
        { tag: "13 años en adelante", title: "Jóvenes y Adultos", text: "Programa estructurado por niveles para lograr fluidez real, con foco en la conversación." },
      ],
      featuresTitle: "Qué incluye",
      features: [
        { title: "Pago único del paquete", text: "Un solo pago por todo el curso. Sin mensualidades ni costos ocultos." },
        { title: "Talleres gratuitos", text: "Excel, Emprendimiento, Liderazgo y Quechua sin costo adicional." },
        { title: "Certificado digital", text: "Al culminar el curso recibes un certificado que valida tu aprendizaje." },
        { title: "Plataforma del alumno", text: "Clases, horarios y materiales en un solo lugar." },
      ],
      ctaTitle: "¿List@ para empezar?",
      ctaText: "Reserva tu cupo por WhatsApp y matricúlate hoy.",
      ctaEnroll: "Matricúlate ahora",
      ctaWhatsApp: "Escríbenos por WhatsApp",
    },
    pages: {
      blog: {
        titlePre: "Nuestro ",
        titleAccent: "blog",
        titlePost: "",
        lead: "Consejos para aprender idiomas, novedades de la Asociación y recursos gratuitos para nuestros alumnos.",
        soonTitle: "Muy pronto",
        soonText: "Estamos preparando nuestros primeros artículos. Vuelve pronto para leer nuestras publicaciones.",
      },
      community: {
        titlePre: "Nuestra ",
        titleAccent: "comunidad",
        titlePost: "",
        lead: "Miles de estudiantes de todo el Perú aprenden con nosotros. Únete, comparte tu experiencia y sigue creciendo.",
        soonTitle: "Muy pronto",
        soonText: "Estamos construyendo el espacio de nuestra comunidad. Mientras tanto, síguenos en nuestras redes sociales.",
      },
      about: {
        eyebrow: "Asociación Only One Coin",
        titlePre: "Educación accesible ",
        titleAccent: "para todos",
        titlePost: "",
        // {years} is filled from `org.foundedYear` so the claim never goes stale.
        lead: "En la Asociación Only One Coin creemos firmemente que la educación es un derecho fundamental y no un privilegio. Con esta visión, llevamos {years} años ofreciendo clases de inglés a un precio simbólico de S/1.00 por sesión.",
        lead2: "Nuestro compromiso es brindar a niños, jóvenes y adultos de todas las edades y niveles sociales la oportunidad de aprender y crecer, sin barreras económicas.",
        teamAlt: "Equipo de la Asociación Only One Coin en su oficina de Lima",
        coinAlt: "Una moneda de un sol: el precio simbólico de cada sesión",
        whyTitle: "¿Por qué elegirnos?",
        whyText: "Nuestro equipo de profesores está altamente calificado y comprometido con la enseñanza. Utilizamos métodos innovadores y dinámicos para asegurar que cada estudiante aprenda de manera efectiva y disfrute del proceso.",
        whyText2: "Queremos que cada persona que pase por nuestras clases salga con más que solo conocimientos de inglés: salga con confianza y preparación para enfrentar los desafíos del futuro.",
        whyAlt: "Docente de Only One Coin dictando una clase online",
        whyAlt2: "Dos integrantes del equipo de Only One Coin resolviendo una consulta",
        missionTitle: "Misión",
        missionText: "Facilitar el acceso al aprendizaje del inglés y otras habilidades fundamentales a través de un modelo educativo innovador y asequible para todos.",
        visionTitle: "Visión",
        visionText: "Ser la academia de idiomas líder en Perú, reconocida por nuestro compromiso con la educación accesible y de calidad, y por nuestro impacto positivo en la vida de nuestros estudiantes.",
        valuesTitlePre: "Nuestros ",
        valuesTitleAccent: "valores",
        valuesTitlePost: "",
        valuesLead: "Nuestros valores son el pilar fundamental de todo lo que hacemos. Creemos en la educación accesible y de calidad, y nos esforzamos por inculcar estos principios en cada aspecto de nuestro servicio. A través de ellos buscamos no solo enseñar inglés, sino también inspirar a nuestros estudiantes a alcanzar su máximo potencial y contribuir positivamente a sus comunidades.",
        valuesAlt: "Dos alumnas de Only One Coin estudiando juntas",
        values: [
          {
            title: "Inclusión",
            text: "Abrimos la puerta a estudiantes de todas las edades y de todo el Perú, sin barreras económicas ni geográficas.",
          },
          {
            title: "Calidad",
            text: "Nos esforzamos por ofrecer lo mejor en enseñanza y recursos educativos.",
          },
          {
            title: "Compromiso",
            text: "Estamos dedicados a la mejora continua y al éxito de nuestros estudiantes.",
          },
          {
            title: "Innovación",
            text: "Apostamos por métodos de enseñanza modernos y creativos que hacen del aprendizaje una experiencia dinámica y efectiva, adaptándonos a las necesidades cambiantes de nuestros estudiantes.",
          },
        ],
      },
      contact: {
        eyebrow: "Contacto",
        titlePre: "¿Cómo podemos ",
        titleAccent: "ayudarte",
        titlePost: "?",
        lead: "Resolvemos tus dudas sobre matrícula, horarios y cursos disponibles. Elige el canal que te resulte más cómodo.",
        waTitle: "WhatsApp",
        waText: "La forma más rápida de llegar a nosotros. Te respondemos dentro del horario de atención.",
        waButton: "Escríbenos por WhatsApp",
        phonesTitle: "Teléfonos",
        emailTitle: "Correo electrónico",
        emailText: "Para consultas formales y para ejercer tus derechos sobre tus datos personales.",
        onlineNote: "Todas nuestras clases son 100% online y la atención también es remota: no realizamos atención presencial en nuestra oficina.",
      },
    },
    footer: {
      tagline: "Educación de idiomas de calidad al alcance de todos, en todo el Perú.",
      orgHtml: "Asociación Only One Coin Perú<br />RUC 20610561463",
      col1Title: "La Asociación",
      about: "Nosotros",
      courses: "Cursos",
      contact: "Contacto",
      langsTitle: "Idiomas",
      legalTitle: "Legal",
      privacy: "Políticas de privacidad",
      terms: "Términos y condiciones",
      col2Title: "Contáctanos",
      hoursLabel: "Horario de atención",
      hours: "Lunes a viernes · 9:00 AM – 10:00 PM",
      followTitle: "Síguenos",
      copyOrg: "Asociación Only One Coin",
      rights: "Todos los derechos reservados",
      madeIn: "Hecho con ❤ en el Perú",
    },
    common: {
      waAria: "Escríbenos por WhatsApp",
      langLabel: "Idioma",
    },
  },

  en: {
    meta: {
      title: "Online language courses in Peru — Only One Coin",
      description:
        "100% online classes across Peru: English, French, Italian, German, Portuguese, Chinese and Korean. Full package with a single payment, certificate and free workshops from age 6.",
      siteName: "Only One Coin",
      imageAlt: "Only One Coin Perú Association — online language courses",
      courses: {
        title: "Online language courses: prices and packages — Only One Coin",
        description:
          "Choose English, French, Italian, German, Portuguese, Mandarin Chinese or Korean. Online classes from age 6, each a full package with a single payment and no monthly fees.",
      },
      course: {
        titlePre: "Online ",
        titleMid: " course in Peru · ",
        titlePost: " single payment",
        descPre: "Learn ",
        descMid: " online with the Only One Coin Perú Association: full package for ",
        descPost: " as a single payment, from age 6, with a digital certificate and free workshops.",
      },
      faq: {
        title: "FAQ about our online courses — Only One Coin",
        description:
          "Answers to the most common questions about enrolment, prices, schedules, certificates and the free workshops of the Only One Coin Perú Association.",
      },
      blog: {
        title: "Language learning blog — Only One Coin",
        description:
          "Tips for learning languages online, news from the Only One Coin Perú Association and free resources for our students.",
      },
      community: {
        title: "Our student community across Peru — Only One Coin",
        description:
          "Thousands of students across Peru learn languages online with the Only One Coin Association. Meet our community and join in.",
      },
      terms: {
        title: "Terms and conditions of use — Only One Coin",
        description:
          "Terms and conditions for using the Only One Coin Perú Association website: services, user registration, intellectual property, liability and governing law.",
      },
      privacy: {
        title: "Privacy policy — Only One Coin",
        description:
          "How the Only One Coin Perú Association collects, uses, stores and protects your personal data, and how to exercise your access, rectification, erasure and objection rights.",
      },
      about: {
        title: "About us — Only One Coin Perú Association",
        description:
          "Meet the Only One Coin Perú Association: accessible education for everyone, English classes from S/1.00 a session, and our mission, vision and values.",
      },
      contact: {
        title: "Contact — Only One Coin Perú Association",
        description:
          "Message us on WhatsApp, call us or send an email. We answer Monday to Friday about enrolment, schedules and available courses.",
      },
    },
    nav: {
      home: "Home",
      about: "About",
      courses: "Courses",
      coursesAll: "See all courses",
      resources: "Resources",
      community: "Community",
      blog: "Blog",
      faq: "FAQ",
      contact: "Contact",
      portal: "Student Portal",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    hero: {
      w1: "Learn",
      w2: "English",
      w3: "from",
      price: "S/1",
      priceUnit: "per session",
      subHtml:
        'Open to <strong>ALL AGES</strong><br />from <span class="accent">6 years old</span> and up!',
      packageNote:
        'Full English package: <strong>one-time payment of S/69.90</strong>. Includes enrollment, book, certificate and free workshops.',
      ctaEnroll: "Enroll now",
      ctaCourses: "View courses",
      imgAlt: "Only One Coin students",
      badgeHtml:
        "Enroll today and get <strong>FREE</strong> access to our Excel, Entrepreneurship, Leadership and Quechua workshops.",
    },
    why: {
      eyebrow: "Only One Coin",
      titlePre: "Why ",
      titleAccent: "choose us",
      titlePost: "?",
      cards: [
        {
          title: "Affordable pricing",
          text: "Classes from S/1 per session and the full package in a single payment — no monthly fees or hidden costs.",
        },
        {
          title: "Free Workshops",
          text: "Excel, Entrepreneurship, Leadership and Quechua at no extra cost for our students.",
        },
        {
          title: "Digital Certificate",
          text: "When you complete your course you receive a digital certificate that validates your learning.",
        },
        {
          title: "Student Platform",
          text: "A dedicated portal to view your classes, schedules and materials in one place.",
        },
        {
          title: "Innovative Teaching",
          text: "A dynamic methodology and teachers committed to real learning.",
        },
      ],
    },
    programs: {
      eyebrow: "Our offering",
      titlePre: "English ",
      titleAccent: "Programs",
      titlePost: "",
      viewCourse: "View course",
      items: [
        {
          tag: "100% online",
          title: "Children (ages 6-12)",
          text: "A first contact with English through play, music and activities designed for their age.",
          href: "/courses/english#kids",
        },
        {
          tag: "All levels",
          title: "Teens & Adults (13 and up)",
          text: "A leveled program structured to reach real fluency, with a conversational focus.",
          href: "/courses/english#teens-and-adults",
        },
      ],
    },
    finder: {
      eyebrow: "Find your language",
      titlePre: "The ideal language ",
      titleAccent: "for you",
      titlePost: "",
      text: "Based on where you're visiting from, we suggest where to start. You can also choose yourself.",
      detecting: "Detecting your location…",
      fromLabel: "We detected you're visiting from",
      unknownLocation: "your area",
      recommendPre: "We recommend starting with",
      viewCourse: "View this course",
      orChoose: "Or choose the language you want to learn:",
      allCourses: "See all courses",
    },
    cta: {
      titlePre: "Have a ",
      titleAccent: "question",
      titlePost: "?",
      text: "Write to us and we'll gladly help you with enrollment, schedules and available courses.",
      button: "Contact us",
    },
    testimonials: {
      eyebrow: "Testimonials",
      titlePre: "What our ",
      titleAccent: "students",
      titlePost: " say",
      note: "Sample content — to be replaced with real testimonials.",
      prev: "Previous",
      next: "Next",
      items: [
        { name: "María Fernández", role: "English student", initials: "MF", quote: "I learned so much and the teachers are super patient. For one sol, I didn't think twice!" },
        { name: "José Ramírez", role: "French student", initials: "JR", quote: "The classes are dynamic and hands-on. In just a few months I already dare to speak." },
        { name: "Lucía Quispe", role: "Guardian", initials: "LQ", quote: "My daughter looks forward to every class. A great opportunity for families." },
        { name: "Carlos Mendoza", role: "Italian student", initials: "CM", quote: "I never thought learning a language could be this accessible. The free workshops are a huge plus." },
        { name: "Ana Torres", role: "German student", initials: "AT", quote: "The student platform helps me never miss a class or material. Everything is well organized." },
        { name: "Diego Salas", role: "Portuguese student", initials: "DS", quote: "Excellent value for money. You can tell the teachers love what they do." },
      ],
    },
    faq: {
      eyebrow: "Frequently asked questions",
      titlePre: "We answer your ",
      titleAccent: "questions",
      titlePost: "",
      lead: "Everything you need to know about our courses, enrollment and free workshops.",
      ctaTitle: "Still have a question?",
      ctaText: "Message us on WhatsApp and we'll help you with enrolment, schedules and anything else.",
      ctaButton: "Message us on WhatsApp",
      items: [
        { q: "How much does it cost and how does payment work?", a: "Each course has a full package with a single payment (for example, English is S/69.90), including enrollment, materials, certificate and workshops. There's also a monthly modality that works out to 1 sol per session. No hidden monthly fees or surprise charges." },
        { q: "From what age can I enroll?", a: "We welcome students from 6 years old and up. There are groups designed for children and groups for teens and adults." },
        { q: "How do I enroll?", a: "Message us on WhatsApp to reserve your spot. Then you fill out the enrollment form, upload your receipt and receive your access credentials." },
        { q: "Are classes in-person or online?", a: "All our classes are 100% online and live with a teacher. You can study from anywhere in Peru without leaving home. Ask us on WhatsApp about the available schedules for the term." },
        { q: "What does enrollment include?", a: "Access to your language course, the student platform and the free Excel, Entrepreneurship, Leadership and Quechua workshops." },
        { q: "Do I get a certificate?", a: "Yes. When you complete your course you receive a digital certificate that validates your learning." },
      ],
    },
    stats: {
      title: "Trusted by thousands of families",
      items: [
        { value: "+200,000", label: "Students taught" },
        { value: "+4", label: "Years in the market" },
        { value: "+7", label: "Languages offered" },
      ],
    },
    courses: {
      list: {
        "english": "English",
        "french": "French",
        "italian": "Italian",
        "german": "German",
        "portuguese": "Portuguese",
        "mandarin-chinese": "Mandarin Chinese",
        "korean": "Korean",
      },
      indexEyebrow: "Our languages",
      indexTitlePre: "Choose the language you ",
      indexTitleAccent: "want to learn",
      indexTitlePost: "",
      indexText: "Each course has its own single-payment full package and is open from age 6. Pick a language to see the price and details.",
      payOnce: "single payment",
      viewCourse: "View course",
    },
    courseDetail: {
      backToCourses: "Back to courses",
      eyebrowPre: "",
      eyebrowPost: " course",
      titlePre: "Learn ",
      titlePost: "",
      priceLabel: "Full package · single payment",
      leadPre: "A complete ",
      leadPost: " program for all ages, with a conversational focus and teachers committed to your real learning.",
      exampleNote: "Sample content — the detailed information for each course will be completed with the real data for the term.",
      audiencesTitle: "Who is it for?",
      audiences: [
        { tag: "Ages 6 to 12", title: "Children", text: "A first contact with the language through play, music and age-appropriate activities." },
        { tag: "13 and up", title: "Teens & Adults", text: "A leveled program to reach real fluency, focused on conversation." },
      ],
      featuresTitle: "What's included",
      features: [
        { title: "Single package payment", text: "One payment for the whole course. No monthly fees or hidden costs." },
        { title: "Free workshops", text: "Excel, Entrepreneurship, Leadership and Quechua at no extra cost." },
        { title: "Digital certificate", text: "When you finish the course you get a certificate that validates your learning." },
        { title: "Student platform", text: "Classes, schedules and materials in one place." },
      ],
      ctaTitle: "Ready to start?",
      ctaText: "Reserve your spot on WhatsApp and enroll today.",
      ctaEnroll: "Enroll now",
      ctaWhatsApp: "Message us on WhatsApp",
    },
    pages: {
      blog: {
        titlePre: "Our ",
        titleAccent: "blog",
        titlePost: "",
        lead: "Tips for learning languages, news from the Association and free resources for our students.",
        soonTitle: "Coming soon",
        soonText: "We're preparing our first articles. Check back soon to read our posts.",
      },
      community: {
        titlePre: "Our ",
        titleAccent: "community",
        titlePost: "",
        lead: "Thousands of students across Peru learn with us. Join in, share your experience and keep growing.",
        soonTitle: "Coming soon",
        soonText: "We're building our community space. In the meantime, follow us on our social media.",
      },
      about: {
        eyebrow: "Only One Coin Association",
        titlePre: "Accessible education ",
        titleAccent: "for everyone",
        titlePost: "",
        lead: "At the Only One Coin Association we firmly believe that education is a fundamental right, not a privilege. With that in mind, we have spent {years} years offering English classes at a symbolic price of S/1.00 a session.",
        lead2: "Our commitment is to give children, teenagers and adults of every age and background the chance to learn and grow, with no financial barriers.",
        teamAlt: "The Only One Coin Association team at their office in Lima",
        coinAlt: "A one-sol coin: the symbolic price of each session",
        whyTitle: "Why choose us?",
        whyText: "Our teachers are highly qualified and committed to teaching. We use innovative, dynamic methods so that every student learns effectively and enjoys the process.",
        whyText2: "We want everyone who goes through our classes to leave with more than English: to leave with the confidence and preparation to face what comes next.",
        whyAlt: "An Only One Coin teacher running an online class",
        whyAlt2: "Two Only One Coin team members working through a question together",
        missionTitle: "Mission",
        missionText: "To open up the learning of English and other fundamental skills through an educational model that is innovative and affordable for everyone.",
        visionTitle: "Vision",
        visionText: "To be the leading language academy in Peru, recognised for our commitment to accessible, quality education and for our positive impact on our students' lives.",
        valuesTitlePre: "Our ",
        valuesTitleAccent: "values",
        valuesTitlePost: "",
        valuesLead: "Our values are the foundation of everything we do. We believe in accessible, quality education, and we work to carry those principles into every part of our service. Through them we aim not only to teach English, but to inspire our students to reach their full potential and give back to their communities.",
        valuesAlt: "Two Only One Coin students studying together",
        values: [
          {
            title: "Inclusion",
            text: "We open the door to students of every age and from every corner of Peru, with no financial or geographic barriers.",
          },
          {
            title: "Quality",
            text: "We strive to offer the best in teaching and educational resources.",
          },
          {
            title: "Commitment",
            text: "We are dedicated to continuous improvement and to our students' success.",
          },
          {
            title: "Innovation",
            text: "We back modern, creative teaching methods that make learning dynamic and effective, adapting to our students' changing needs.",
          },
        ],
      },
      contact: {
        eyebrow: "Contact",
        titlePre: "How can we ",
        titleAccent: "help you",
        titlePost: "?",
        lead: "We answer questions about enrolment, schedules and available courses. Pick whichever channel suits you best.",
        waTitle: "WhatsApp",
        waText: "The fastest way to reach us. We reply within our business hours.",
        waButton: "Message us on WhatsApp",
        phonesTitle: "Phone",
        emailTitle: "Email",
        emailText: "For formal enquiries and to exercise your rights over your personal data.",
        onlineNote: "All our classes are 100% online and support is remote too: we do not receive students at our office.",
      },
    },
    footer: {
      tagline: "Quality language education within everyone's reach, across all of Peru.",
      orgHtml: "Only One Coin Perú Association<br />RUC 20610561463",
      col1Title: "The Association",
      about: "About",
      courses: "Courses",
      contact: "Contact",
      langsTitle: "Languages",
      legalTitle: "Legal",
      privacy: "Privacy policy",
      terms: "Terms & conditions",
      col2Title: "Contact",
      hoursLabel: "Business hours",
      hours: "Monday to Friday · 9:00 AM – 10:00 PM",
      followTitle: "Follow us",
      copyOrg: "Only One Coin Association",
      rights: "All rights reserved",
      madeIn: "Made with ❤ in Peru",
    },
    common: {
      waAria: "Message us on WhatsApp",
      langLabel: "Language",
    },
  },

  pt: {
    meta: {
      title: "Cursos de inglês e idiomas online no Peru — Only One Coin",
      description:
        "Aulas 100% online para todo o Peru: inglês, francês, italiano, alemão, português, chinês e coreano. Pacote completo em pagamento único, certificado e oficinas grátis.",
      siteName: "Only One Coin",
      imageAlt: "Associação Only One Coin Peru — cursos de idiomas online",
      courses: {
        title: "Cursos de idiomas online: preços e pacotes — Only One Coin",
        description:
          "Escolha inglês, francês, italiano, alemão, português, chinês mandarim ou coreano. Aulas online a partir dos 6 anos, com pacote completo em pagamento único e sem mensalidades.",
      },
      course: {
        titlePre: "Curso de ",
        titleMid: " online no Peru · ",
        titlePost: " pagamento único",
        descPre: "Aprenda ",
        descMid: " online com a Associação Only One Coin Peru: pacote completo por ",
        descPost: " em pagamento único, a partir dos 6 anos, com certificado digital e oficinas grátis.",
      },
      faq: {
        title: "Perguntas frequentes sobre os cursos online — Only One Coin",
        description:
          "Respondemos as dúvidas mais comuns sobre matrícula, preços, horários, certificados e oficinas gratuitas da Associação Only One Coin Peru.",
      },
      blog: {
        title: "Blog de idiomas e aprendizagem — Only One Coin",
        description:
          "Dicas para aprender idiomas online, novidades da Associação Only One Coin Peru e recursos gratuitos para os nossos alunos.",
      },
      community: {
        title: "Comunidade de alunos em todo o Peru — Only One Coin",
        description:
          "Milhares de estudantes de todo o Peru aprendem idiomas online com a Associação Only One Coin. Conheça a nossa comunidade e participe.",
      },
      terms: {
        title: "Termos e condições de uso — Only One Coin",
        description:
          "Termos e condições de uso do site da Associação Only One Coin Peru: serviços, cadastro de usuários, propriedade intelectual, responsabilidade e lei aplicável.",
      },
      privacy: {
        title: "Política de privacidade — Only One Coin",
        description:
          "Como a Associação Only One Coin Peru coleta, usa, armazena e protege seus dados pessoais, e como exercer seus direitos de acesso, retificação, cancelamento e oposição.",
      },
      about: {
        title: "Sobre nós — Associação Only One Coin Peru",
        description:
          "Conheça a Associação Only One Coin Peru: educação acessível para todos, aulas de inglês a partir de S/1,00 por sessão, e nossa missão, visão e valores.",
      },
      contact: {
        title: "Contato — Associação Only One Coin Peru",
        description:
          "Fale com a gente no WhatsApp, ligue ou mande um e-mail. Atendimento de segunda a sexta sobre matrícula, horários e cursos disponíveis.",
      },
    },
    nav: {
      home: "Início",
      about: "Sobre",
      courses: "Cursos",
      coursesAll: "Ver todos os cursos",
      resources: "Recursos",
      community: "Comunidade",
      blog: "Blog",
      faq: "Perguntas frequentes",
      contact: "Contato",
      portal: "Portal do Aluno",
      openMenu: "Abrir menu",
      closeMenu: "Fechar menu",
    },
    hero: {
      w1: "Aprenda",
      w2: "Inglês",
      w3: "a partir de",
      price: "S/1",
      priceUnit: "por sessão",
      subHtml:
        'Aberto para <strong>TODAS AS IDADES</strong><br />a partir dos <span class="accent">6 anos</span>!',
      packageNote:
        'Pacote completo de Inglês: <strong>pagamento único de S/69,90</strong>. Inclui matrícula, livro, certificado e oficinas gratuitas.',
      ctaEnroll: "Matricule-se agora",
      ctaCourses: "Ver cursos",
      imgAlt: "Estudantes da Only One Coin",
      badgeHtml:
        "Matricule-se hoje e tenha acesso <strong>GRÁTIS</strong> às nossas oficinas de Excel, Empreendedorismo, Liderança e Quíchua.",
    },
    why: {
      eyebrow: "Only One Coin",
      titlePre: "Por que ",
      titleAccent: "nos escolher",
      titlePost: "?",
      cards: [
        {
          title: "Preço acessível",
          text: "Aulas a partir de 1 sol por sessão e o pacote completo em pagamento único, sem mensalidades nem custos ocultos.",
        },
        {
          title: "Oficinas Gratuitas",
          text: "Excel, Empreendedorismo, Liderança e Quíchua sem custo adicional para nossos alunos.",
        },
        {
          title: "Certificado Digital",
          text: "Ao concluir seu curso você recebe um certificado digital que valida seu aprendizado.",
        },
        {
          title: "Plataforma do Aluno",
          text: "Um portal dedicado para ver suas aulas, horários e materiais em um só lugar.",
        },
        {
          title: "Ensino Inovador",
          text: "Metodologia dinâmica e professores comprometidos com o aprendizado real.",
        },
      ],
    },
    programs: {
      eyebrow: "Nossa oferta",
      titlePre: "Programas de ",
      titleAccent: "Inglês",
      titlePost: "",
      viewCourse: "Ver curso",
      items: [
        {
          tag: "100% online",
          title: "Crianças (6-12 anos)",
          text: "Um primeiro contato com o inglês por meio de brincadeiras, música e atividades pensadas para a idade.",
          href: "/courses/english#kids",
        },
        {
          tag: "Todos os níveis",
          title: "Jovens e Adultos (13 anos ou mais)",
          text: "Programa estruturado por níveis para alcançar fluência real, com foco conversacional.",
          href: "/courses/english#teens-and-adults",
        },
      ],
    },
    finder: {
      eyebrow: "Encontre seu idioma",
      titlePre: "O idioma ideal ",
      titleAccent: "para você",
      titlePost: "",
      text: "Com base em onde você está nos visitando, sugerimos por onde começar. Você também pode escolher.",
      detecting: "Detectando sua localização…",
      fromLabel: "Detectamos que você nos visita de",
      unknownLocation: "sua região",
      recommendPre: "Recomendamos começar por",
      viewCourse: "Ver este curso",
      orChoose: "Ou escolha o idioma que quer aprender:",
      allCourses: "Ver todos os cursos",
    },
    cta: {
      titlePre: "Tem alguma ",
      titleAccent: "dúvida",
      titlePost: "?",
      text: "Fale com a gente e ajudamos você com matrícula, horários e cursos disponíveis.",
      button: "Fale conosco",
    },
    testimonials: {
      eyebrow: "Depoimentos",
      titlePre: "O que dizem nossos ",
      titleAccent: "alunos",
      titlePost: "",
      note: "Conteúdo de exemplo — será substituído por depoimentos reais.",
      prev: "Anterior",
      next: "Próximo",
      items: [
        { name: "María Fernández", role: "Aluna de Inglês", initials: "MF", quote: "Aprendi muitíssimo e os professores são super pacientes. Por um sol, nem pensei duas vezes!" },
        { name: "José Ramírez", role: "Aluno de Francês", initials: "JR", quote: "As aulas são dinâmicas e práticas. Em poucos meses já me arrisco a conversar." },
        { name: "Lucía Quispe", role: "Responsável", initials: "LQ", quote: "Minha filha espera cada aula com vontade. Uma grande oportunidade para as famílias." },
        { name: "Carlos Mendoza", role: "Aluno de Italiano", initials: "CM", quote: "Nunca pensei que estudar um idioma fosse tão acessível. As oficinas grátis são um baita plus." },
        { name: "Ana Torres", role: "Aluna de Alemão", initials: "AT", quote: "A plataforma do aluno me ajuda a não perder nenhuma aula nem material. Tudo bem organizado." },
        { name: "Diego Salas", role: "Aluno de Português", initials: "DS", quote: "Excelente custo-benefício. Dá para ver que os professores amam o que fazem." },
      ],
    },
    faq: {
      eyebrow: "Perguntas frequentes",
      titlePre: "Tiramos suas ",
      titleAccent: "dúvidas",
      titlePost: "",
      lead: "Tudo o que você precisa saber sobre nossos cursos, a matrícula e as oficinas gratuitas.",
      ctaTitle: "Não achou sua resposta?",
      ctaText: "Fale com a gente no WhatsApp: ajudamos com matrícula, horários e o que mais precisar.",
      ctaButton: "Falar no WhatsApp",
      items: [
        { q: "Quanto custa e como funciona o pagamento?", a: "Cada curso tem um pacote completo em pagamento único (por exemplo, Inglês custa S/69,90), que inclui matrícula, material, certificado e oficinas. Também existe uma modalidade mensal que equivale a 1 sol por sessão. Sem mensalidades ocultas nem cobranças-surpresa." },
        { q: "A partir de que idade posso me matricular?", a: "Recebemos alunos a partir dos 6 anos. Há turmas pensadas para crianças e turmas para jovens e adultos." },
        { q: "Como me matriculo?", a: "Fale com a gente no WhatsApp para reservar sua vaga. Depois você preenche o formulário de matrícula, envia seu comprovante e recebe suas credenciais de acesso." },
        { q: "As aulas são presenciais ou online?", a: "Todas as nossas aulas são 100% online e ao vivo com um professor. Você pode estudar de qualquer cidade do Peru sem sair de casa. Consulte no WhatsApp os horários disponíveis do período." },
        { q: "O que a matrícula inclui?", a: "O acesso ao seu curso de idioma, a plataforma do aluno e as oficinas gratuitas de Excel, Empreendedorismo, Liderança e Quíchua." },
        { q: "Recebo algum certificado?", a: "Sim. Ao concluir seu curso você recebe um certificado digital que valida seu aprendizado." },
      ],
    },
    stats: {
      title: "A confiança de milhares de famílias",
      items: [
        { value: "+200.000", label: "Alunos formados" },
        { value: "+4", label: "Anos de mercado" },
        { value: "+7", label: "Idiomas disponíveis" },
      ],
    },
    courses: {
      list: {
        "english": "Inglês",
        "french": "Francês",
        "italian": "Italiano",
        "german": "Alemão",
        "portuguese": "Português",
        "mandarin-chinese": "Chinês Mandarim",
        "korean": "Coreano",
      },
      indexEyebrow: "Nossos idiomas",
      indexTitlePre: "Escolha o idioma que ",
      indexTitleAccent: "você quer aprender",
      indexTitlePost: "",
      indexText: "Cada curso tem seu pacote completo em pagamento único e é aberto a partir dos 6 anos. Escolha um idioma para ver o preço e o detalhe.",
      payOnce: "pagamento único",
      viewCourse: "Ver curso",
    },
    courseDetail: {
      backToCourses: "Voltar aos cursos",
      eyebrowPre: "Curso de ",
      eyebrowPost: "",
      titlePre: "Aprenda ",
      titlePost: "",
      priceLabel: "Pacote completo · pagamento único",
      leadPre: "Um programa completo de ",
      leadPost: " para todas as idades, com foco conversacional e professores comprometidos com o seu aprendizado real.",
      exampleNote: "Conteúdo de exemplo — a informação detalhada de cada curso será preenchida com os dados reais do período.",
      audiencesTitle: "Para quem é?",
      audiences: [
        { tag: "6 a 12 anos", title: "Crianças", text: "Primeiro contato com o idioma por meio de brincadeiras, música e atividades pensadas para a idade." },
        { tag: "13 anos ou mais", title: "Jovens e Adultos", text: "Programa estruturado por níveis para alcançar fluência real, com foco na conversação." },
      ],
      featuresTitle: "O que inclui",
      features: [
        { title: "Pagamento único do pacote", text: "Um único pagamento por todo o curso. Sem mensalidades nem custos ocultos." },
        { title: "Oficinas gratuitas", text: "Excel, Empreendedorismo, Liderança e Quíchua sem custo adicional." },
        { title: "Certificado digital", text: "Ao concluir o curso você recebe um certificado que valida seu aprendizado." },
        { title: "Plataforma do aluno", text: "Aulas, horários e materiais em um só lugar." },
      ],
      ctaTitle: "Pronto para começar?",
      ctaText: "Reserve sua vaga no WhatsApp e matricule-se hoje.",
      ctaEnroll: "Matricule-se agora",
      ctaWhatsApp: "Fale conosco no WhatsApp",
    },
    pages: {
      blog: {
        titlePre: "Nosso ",
        titleAccent: "blog",
        titlePost: "",
        lead: "Dicas para aprender idiomas, novidades da Associação e recursos gratuitos para nossos alunos.",
        soonTitle: "Em breve",
        soonText: "Estamos preparando nossos primeiros artigos. Volte em breve para ler nossas publicações.",
      },
      community: {
        titlePre: "Nossa ",
        titleAccent: "comunidade",
        titlePost: "",
        lead: "Milhares de estudantes de todo o Peru aprendem com a gente. Participe, compartilhe sua experiência e continue crescendo.",
        soonTitle: "Em breve",
        soonText: "Estamos construindo o espaço da nossa comunidade. Enquanto isso, siga a gente nas redes sociais.",
      },
      about: {
        eyebrow: "Associação Only One Coin",
        titlePre: "Educação acessível ",
        titleAccent: "para todos",
        titlePost: "",
        lead: "Na Associação Only One Coin acreditamos firmemente que a educação é um direito fundamental, e não um privilégio. Com essa visão, há {years} anos oferecemos aulas de inglês a um preço simbólico de S/1,00 por sessão.",
        lead2: "Nosso compromisso é dar a crianças, jovens e adultos de todas as idades e classes sociais a oportunidade de aprender e crescer, sem barreiras econômicas.",
        teamAlt: "Equipe da Associação Only One Coin no escritório em Lima",
        coinAlt: "Uma moeda de um sol: o preço simbólico de cada sessão",
        whyTitle: "Por que nos escolher?",
        whyText: "Nosso time de professores é altamente qualificado e comprometido com o ensino. Usamos métodos inovadores e dinâmicos para garantir que cada estudante aprenda de forma efetiva e aproveite o processo.",
        whyText2: "Queremos que cada pessoa que passa pelas nossas turmas saia com mais do que conhecimento de inglês: saia com confiança e preparo para encarar os desafios que vêm pela frente.",
        whyAlt: "Professora da Only One Coin dando uma aula online",
        whyAlt2: "Dois integrantes da equipe da Only One Coin resolvendo uma dúvida juntos",
        missionTitle: "Missão",
        missionText: "Facilitar o acesso ao aprendizado do inglês e de outras habilidades fundamentais por meio de um modelo educativo inovador e acessível para todos.",
        visionTitle: "Visão",
        visionText: "Ser a academia de idiomas líder no Peru, reconhecida pelo nosso compromisso com a educação acessível e de qualidade, e pelo impacto positivo na vida dos nossos estudantes.",
        valuesTitlePre: "Nossos ",
        valuesTitleAccent: "valores",
        valuesTitlePost: "",
        valuesLead: "Nossos valores são o pilar de tudo o que fazemos. Acreditamos em educação acessível e de qualidade, e nos esforçamos para levar esses princípios a cada aspecto do nosso serviço. Através deles buscamos não só ensinar inglês, mas inspirar nossos estudantes a alcançar seu máximo potencial e a contribuir positivamente com suas comunidades.",
        valuesAlt: "Duas alunas da Only One Coin estudando juntas",
        values: [
          {
            title: "Inclusão",
            text: "Abrimos a porta para estudantes de todas as idades e de todo o Peru, sem barreiras econômicas nem geográficas.",
          },
          {
            title: "Qualidade",
            text: "Nos esforçamos para oferecer o melhor em ensino e recursos educacionais.",
          },
          {
            title: "Compromisso",
            text: "Somos dedicados à melhoria contínua e ao sucesso dos nossos estudantes.",
          },
          {
            title: "Inovação",
            text: "Apostamos em métodos de ensino modernos e criativos, que tornam o aprendizado dinâmico e efetivo, adaptando-se às necessidades em mudança dos nossos estudantes.",
          },
        ],
      },
      contact: {
        eyebrow: "Contato",
        titlePre: "Como podemos ",
        titleAccent: "ajudar você",
        titlePost: "?",
        lead: "Tiramos suas dúvidas sobre matrícula, horários e cursos disponíveis. Escolha o canal que for mais confortável pra você.",
        waTitle: "WhatsApp",
        waText: "O jeito mais rápido de falar com a gente. Respondemos dentro do horário de atendimento.",
        waButton: "Falar no WhatsApp",
        phonesTitle: "Telefones",
        emailTitle: "E-mail",
        emailText: "Para consultas formais e para exercer seus direitos sobre seus dados pessoais.",
        onlineNote: "Todas as nossas aulas são 100% online e o atendimento também é remoto: não recebemos alunos no escritório.",
      },
    },
    footer: {
      tagline: "Educação de idiomas de qualidade ao alcance de todos, em todo o Peru.",
      orgHtml: "Associação Only One Coin Peru<br />RUC 20610561463",
      col1Title: "A Associação",
      about: "Sobre",
      courses: "Cursos",
      contact: "Contato",
      langsTitle: "Idiomas",
      legalTitle: "Legal",
      privacy: "Política de privacidade",
      terms: "Termos e condições",
      col2Title: "Contato",
      hoursLabel: "Horário de atendimento",
      hours: "Segunda a sexta · 9:00 – 22:00",
      followTitle: "Siga a gente",
      copyOrg: "Associação Only One Coin",
      rights: "Todos os direitos reservados",
      madeIn: "Feito com ❤ no Peru",
    },
    common: {
      waAria: "Fale conosco no WhatsApp",
      langLabel: "Idioma",
    },
  },
} as const;
