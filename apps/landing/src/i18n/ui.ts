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
      portal: "Portal del Alumno",
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
    testimonials: {
      eyebrow: "Testimonios",
      titlePre: "Lo que dicen nuestros ",
      titleAccent: "alumnos",
      titlePost: "",
      note: "Contenido de ejemplo — se reemplazará con testimonios reales.",
      items: [
        { name: "María Fernández", role: "Alumna de Inglés", initials: "MF", quote: "Aprendí muchísimo y los profes son súper pacientes. ¡Por un sol no lo pensé dos veces!" },
        { name: "José Ramírez", role: "Alumno de Francés", initials: "JR", quote: "Las clases son dinámicas y prácticas. En pocos meses ya me animo a conversar." },
        { name: "Lucía Quispe", role: "Apoderada", initials: "LQ", quote: "Mi hija espera cada clase con ganas. Una gran oportunidad para las familias." },
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
    footer: {
      tagline: "Educación de idiomas de calidad al alcance de todos, en todo el Perú.",
      orgHtml: "Asociación Only One Coin Perú<br />RUC 20610561463",
      col1Title: "La Asociación",
      about: "Nosotros",
      courses: "Cursos",
      contact: "Contacto",
      langsTitle: "Idiomas",
      langs: ["Inglés", "Francés", "Italiano", "Alemán", "Portugués", "Chino Mandarín", "Coreano"],
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
      portal: "Student Portal",
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
    testimonials: {
      eyebrow: "Testimonials",
      titlePre: "What our ",
      titleAccent: "students",
      titlePost: " say",
      note: "Sample content — to be replaced with real testimonials.",
      items: [
        { name: "María Fernández", role: "English student", initials: "MF", quote: "I learned so much and the teachers are super patient. For one sol, I didn't think twice!" },
        { name: "José Ramírez", role: "French student", initials: "JR", quote: "The classes are dynamic and hands-on. In just a few months I already dare to speak." },
        { name: "Lucía Quispe", role: "Guardian", initials: "LQ", quote: "My daughter looks forward to every class. A great opportunity for families." },
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
    footer: {
      tagline: "Quality language education within everyone's reach, across all of Peru.",
      orgHtml: "Only One Coin Perú Association<br />RUC 20610561463",
      col1Title: "The Association",
      about: "About",
      courses: "Courses",
      contact: "Contact",
      langsTitle: "Languages",
      langs: ["English", "French", "Italian", "German", "Portuguese", "Mandarin Chinese", "Korean"],
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
      portal: "Portal do Aluno",
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
    testimonials: {
      eyebrow: "Depoimentos",
      titlePre: "O que dizem nossos ",
      titleAccent: "alunos",
      titlePost: "",
      note: "Conteúdo de exemplo — será substituído por depoimentos reais.",
      items: [
        { name: "María Fernández", role: "Aluna de Inglês", initials: "MF", quote: "Aprendi muitíssimo e os professores são super pacientes. Por um sol, nem pensei duas vezes!" },
        { name: "José Ramírez", role: "Aluno de Francês", initials: "JR", quote: "As aulas são dinâmicas e práticas. Em poucos meses já me arrisco a conversar." },
        { name: "Lucía Quispe", role: "Responsável", initials: "LQ", quote: "Minha filha espera cada aula com vontade. Uma grande oportunidade para as famílias." },
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
    footer: {
      tagline: "Educação de idiomas de qualidade ao alcance de todos, em todo o Peru.",
      orgHtml: "Associação Only One Coin Peru<br />RUC 20610561463",
      col1Title: "A Associação",
      about: "Sobre",
      courses: "Cursos",
      contact: "Contato",
      langsTitle: "Idiomas",
      langs: ["Inglês", "Francês", "Italiano", "Alemão", "Português", "Chinês Mandarim", "Coreano"],
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
