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

export const content = {
  es: {
    meta: {
      title: "Only One Coin — Aprende Inglés por solo S/1.00",
      description:
        "Asociación Only One Coin Perú: clases de inglés por S/1.00 y talleres gratuitos para todas las edades desde los 6 años.",
    },
    nav: {
      home: "Inicio",
      about: "Nosotros",
      courses: "Cursos",
      blog: "Blog",
      contact: "Contacto",
      login: "Iniciar Sesión",
    },
    hero: {
      w1: "¡Aprende",
      w2: "Inglés",
      w3: "por solo",
      price: "S/1.00",
      subHtml:
        '¡Abierto para <strong>TODAS LAS EDADES</strong><br />desde los <span class="accent">6 años</span> en adelante!',
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
          title: "Clases de Inglés por S/1.00",
          text: "Educación de calidad al alcance de todos. Un sol simbólico por acceso a nuestras clases.",
        },
        {
          title: "Talleres Gratuitos",
          text: "Excel, Emprendimiento, Liderazgo y Quechua sin costo adicional para nuestros alumnos.",
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
          tag: "Presencial y virtual",
          title: "Niños (6-12 años)",
          text: "Un primer contacto con el inglés a través del juego, la música y actividades diseñadas para su edad.",
          href: "/cursos/ninos-6-12-anos",
        },
        {
          tag: "Todos los niveles",
          title: "Jóvenes y Adultos (13 años en adelante)",
          text: "Programa estructurado por niveles para lograr fluidez real, con enfoque conversacional.",
          href: "/cursos/jovenes-y-adultos",
        },
      ],
    },
    cta: {
      titlePre: "¿Tienes alguna ",
      titleAccent: "consulta",
      titlePost: "?",
      text: "Escríbenos y con gusto te ayudamos con tu matrícula, horarios y cursos disponibles.",
      button: "Contáctanos",
    },
    footer: {
      orgHtml: "Asociación Only One Coin Perú<br />RUC 20610561463",
      col1Title: "La Asociación",
      about: "Nosotros",
      privacy: "Políticas de privacidad",
      terms: "Términos y condiciones",
      col2Title: "Contáctanos",
      contact: "Contacto",
      hoursLabel: "Horario de atención",
      hours: "Lunes a viernes · 9:00 AM – 10:00 PM",
      copyOrg: "Asociación Only One Coin",
      rights: "Todos los derechos reservados",
    },
    common: {
      waAria: "Escríbenos por WhatsApp",
      langLabel: "Idioma",
    },
  },

  en: {
    meta: {
      title: "Only One Coin — Learn English for just S/1.00",
      description:
        "Only One Coin Perú Association: English classes for S/1.00 and free workshops for all ages from 6 years old.",
    },
    nav: {
      home: "Home",
      about: "About",
      courses: "Courses",
      blog: "Blog",
      contact: "Contact",
      login: "Log in",
    },
    hero: {
      w1: "Learn",
      w2: "English",
      w3: "for just",
      price: "S/1.00",
      subHtml:
        'Open to <strong>ALL AGES</strong><br />from <span class="accent">6 years old</span> and up!',
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
          icon: "🪙",
          title: "English Classes for S/1.00",
          text: "Quality education within everyone's reach. A symbolic one-sol fee to access our classes.",
        },
        {
          title: "Free Workshops",
          text: "Excel, Entrepreneurship, Leadership and Quechua at no extra cost for our students.",
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
          tag: "In-person & online",
          title: "Children (ages 6-12)",
          text: "A first contact with English through play, music and activities designed for their age.",
          href: "/cursos/ninos-6-12-anos",
        },
        {
          tag: "All levels",
          title: "Teens & Adults (13 and up)",
          text: "A leveled program structured to reach real fluency, with a conversational focus.",
          href: "/cursos/jovenes-y-adultos",
        },
      ],
    },
    cta: {
      titlePre: "Have a ",
      titleAccent: "question",
      titlePost: "?",
      text: "Write to us and we'll gladly help you with enrollment, schedules and available courses.",
      button: "Contact us",
    },
    footer: {
      orgHtml: "Only One Coin Perú Association<br />RUC 20610561463",
      col1Title: "The Association",
      about: "About",
      privacy: "Privacy policy",
      terms: "Terms & conditions",
      col2Title: "Contact",
      contact: "Contact",
      hoursLabel: "Business hours",
      hours: "Monday to Friday · 9:00 AM – 10:00 PM",
      copyOrg: "Only One Coin Association",
      rights: "All rights reserved",
    },
    common: {
      waAria: "Message us on WhatsApp",
      langLabel: "Language",
    },
  },

  pt: {
    meta: {
      title: "Only One Coin — Aprenda Inglês por apenas S/1,00",
      description:
        "Associação Only One Coin Peru: aulas de inglês por S/1,00 e oficinas gratuitas para todas as idades a partir dos 6 anos.",
    },
    nav: {
      home: "Início",
      about: "Sobre",
      courses: "Cursos",
      blog: "Blog",
      contact: "Contato",
      login: "Entrar",
    },
    hero: {
      w1: "Aprenda",
      w2: "Inglês",
      w3: "por apenas",
      price: "S/1,00",
      subHtml:
        'Aberto para <strong>TODAS AS IDADES</strong><br />a partir dos <span class="accent">6 anos</span>!',
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
          icon: "🪙",
          title: "Aulas de Inglês por S/1,00",
          text: "Educação de qualidade ao alcance de todos. Um sol simbólico para acessar nossas aulas.",
        },
        {
          title: "Oficinas Gratuitas",
          text: "Excel, Empreendedorismo, Liderança e Quíchua sem custo adicional para nossos alunos.",
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
          tag: "Presencial e online",
          title: "Crianças (6-12 anos)",
          text: "Um primeiro contato com o inglês por meio de brincadeiras, música e atividades pensadas para a idade.",
          href: "/cursos/ninos-6-12-anos",
        },
        {
          tag: "Todos os níveis",
          title: "Jovens e Adultos (13 anos ou mais)",
          text: "Programa estruturado por níveis para alcançar fluência real, com foco conversacional.",
          href: "/cursos/jovenes-y-adultos",
        },
      ],
    },
    cta: {
      titlePre: "Tem alguma ",
      titleAccent: "dúvida",
      titlePost: "?",
      text: "Fale com a gente e ajudamos você com matrícula, horários e cursos disponíveis.",
      button: "Fale conosco",
    },
    footer: {
      orgHtml: "Associação Only One Coin Peru<br />RUC 20610561463",
      col1Title: "A Associação",
      about: "Sobre",
      privacy: "Política de privacidade",
      terms: "Termos e condições",
      col2Title: "Contato",
      contact: "Contato",
      hoursLabel: "Horário de atendimento",
      hours: "Segunda a sexta · 9:00 – 22:00",
      copyOrg: "Associação Only One Coin",
      rights: "Todos os direitos reservados",
    },
    common: {
      waAria: "Fale conosco no WhatsApp",
      langLabel: "Idioma",
    },
  },
} as const;
