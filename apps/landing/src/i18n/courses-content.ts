import type { CourseSlug, Lang } from "./ui";

/**
 * Conteúdo real de cada curso — o que a coordenação escreveu nos documentos do
 * programa (duração, malha, metodologia, avaliação, resultados).
 *
 * Fica separado de `ui.ts` porque é outra natureza de texto: `ui.ts` é a voz da
 * marca, isto aqui é o programa acadêmico, revisado por quem dá aula. Um curso
 * que ainda não tem documento simplesmente não aparece neste mapa, e a página
 * cai no texto genérico com o aviso de conteúdo de exemplo — nunca inventamos
 * malha curricular.
 */
export type CourseUnit = {
  /** Nome da unidade/livro como está no programa. */
  title: string;
  topics: string[];
};

export type CourseContent = {
  /**
   * O programa inteiro chega à página: sessões e descrição no topo, duração/
   * nível/modalidade em destaque, a malha com os temas de cada unidade,
   * competências, método, avaliação e resultados. Campo ausente é seção que
   * simplesmente não renderiza — nunca inventamos conteúdo para preencher.
   */
  description?: string[];
  /**
   * Quantas sessões tem o curso — o número que abre a página, em destaque.
   * Uma sessão é uma hora de aula ao vivo; o curso roda uma hora por dia, de
   * segunda a sexta. Ausente enquanto a coordenação não fechar o número.
   */
  sessions?: string;
  duration?: string;
  level: string;
  modality?: string;
  curriculum: CourseUnit[];
  goals?: string[];
  method?: string[];
  evaluation?: string[];
  outcomes?: string[];
  /** Ressalva honesta sobre o que o curso não promete. */
  outcomeNote?: string;
};

const englishES: CourseContent = {
  description: [
    "El curso de Inglés de Only One Coin desarrolla de manera progresiva tus competencias comunicativas, desde un nivel inicial hasta un nivel intermedio funcional, con práctica constante de speaking, listening, reading, writing, use of English y vocabulary.",
    "El paquete completo del nivel Básico son cuatro libros (Papayita), estructurados para que pienses en inglés, ganes seguridad al comunicarte y puedas desenvolverte en situaciones cotidianas. El contenido está alineado a estándares internacionales y continúa en el nivel Intermedio.",
  ],
  sessions: "80 sesiones",
  duration: "80 horas académicas (nivel Básico)",
  level: "Básico (A1–A2)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Libro 1 — Bright Start",
      topics: [
        "Expresiones básicas de aula",
        "Alfabeto y pronunciación",
        "Números",
        "Saludos y presentaciones",
        "Información personal",
        "Verbos to be y to have",
        "Vocabulario cotidiano",
        "Comprensión y producción de frases simples",
      ],
    },
    {
      title: "Libro 2 — Brave Steps",
      topics: [
        "Nacionalidades y países",
        "Profesiones y ocupaciones",
        "Familia y relaciones personales",
        "Simple Present (afirmativo, negativo e interrogativo)",
        "Adverbios de frecuencia",
        "Rutinas diarias",
        "Comprensión de textos breves",
        "Conversaciones básicas guiadas",
      ],
    },
    {
      title: "Libro 3 — Fluent Glow",
      topics: [
        "Lugares de la ciudad",
        "Preposiciones de lugar",
        "Comparativos y superlativos",
        "Transporte y direcciones",
        "Present Continuous",
        "Números ordinales",
        "Interacción en situaciones cotidianas",
        "Desarrollo de fluidez básica",
      ],
    },
    {
      title: "Libro 4 — Golden Speech",
      topics: [
        "Experiencias personales",
        "Simple Past (afirmativo, negativo e interrogativo)",
        "Apariencia física y descripciones",
        "Fechas y eventos pasados",
        "Comparación de experiencias",
        "Expresión oral más elaborada",
        "Producción de textos cortos narrativos",
      ],
    },
  ],
  goals: [
    "Comprensión auditiva progresiva",
    "Expresión oral con fluidez creciente",
    "Lectura comprensiva de textos",
    "Escritura clara y estructurada",
    "Uso correcto de estructuras gramaticales",
    "Ampliación constante de vocabulario",
  ],
  method: [
    "Clases virtuales interactivas",
    "Enfoque comunicativo",
    "Ejercicios prácticos por unidad",
    "Role play y simulaciones reales",
    "Evaluaciones por módulo",
    "Pruebas de progreso",
  ],
  evaluation: [
    "Participación activa",
    "Actividades prácticas",
    "Ejercicios escritos",
    "Evaluaciones por libro",
    "Evaluación final integradora",
  ],
  outcomes: [
    "Comunicarte con seguridad en situaciones cotidianas",
    "Comprender conversaciones y textos de nivel intermedio",
    "Expresar opiniones, experiencias y planes",
    "Mantener conversaciones fluidas",
    "Leer y redactar textos de complejidad media",
    "Desenvolverte en entornos laborales o académicos básicos",
    "Contar con una base sólida para rendir exámenes internacionales tipo TOEFL",
  ],
  outcomeNote:
    "Estos son los logros del programa completo de seis libros (160 horas), que alcanza un nivel intermedio funcional (A2–B1). El paquete de este nivel Básico son los libros 1 al 4 (80 horas); el nivel Intermedio (libros 5 y 6) es la continuación natural.",
};

const englishEN: CourseContent = {
  description: [
    "Only One Coin's English course builds your communication skills step by step, from beginner to functional intermediate, with constant practice of speaking, listening, reading, writing, use of English and vocabulary.",
    "The full Basic-level package is four books (Papayita), structured so you think in English, gain confidence and can hold your own in everyday situations. The content follows international standards and continues into the Intermediate level.",
  ],
  sessions: "80 sessions",
  duration: "80 academic hours (Basic level)",
  level: "Beginner (A1–A2)",
  modality: "Online",
  curriculum: [
    {
      title: "Book 1 — Bright Start",
      topics: [
        "Basic classroom language",
        "Alphabet and pronunciation",
        "Numbers",
        "Greetings and introductions",
        "Personal information",
        "The verbs to be and to have",
        "Everyday vocabulary",
        "Understanding and producing simple sentences",
      ],
    },
    {
      title: "Book 2 — Brave Steps",
      topics: [
        "Nationalities and countries",
        "Jobs and occupations",
        "Family and personal relationships",
        "Simple Present (affirmative, negative and questions)",
        "Adverbs of frequency",
        "Daily routines",
        "Reading short texts",
        "Guided basic conversations",
      ],
    },
    {
      title: "Book 3 — Fluent Glow",
      topics: [
        "Places around town",
        "Prepositions of place",
        "Comparatives and superlatives",
        "Transport and directions",
        "Present Continuous",
        "Ordinal numbers",
        "Interacting in everyday situations",
        "Building basic fluency",
      ],
    },
    {
      title: "Book 4 — Golden Speech",
      topics: [
        "Personal experiences",
        "Simple Past (affirmative, negative and questions)",
        "Physical appearance and descriptions",
        "Dates and past events",
        "Comparing experiences",
        "More elaborate speaking",
        "Writing short narrative texts",
      ],
    },
  ],
  goals: [
    "Progressive listening comprehension",
    "Speaking with growing fluency",
    "Reading comprehension",
    "Clear, structured writing",
    "Correct use of grammar structures",
    "Constantly expanding vocabulary",
  ],
  method: [
    "Interactive online classes",
    "Communicative approach",
    "Practical exercises per unit",
    "Role play and real-life simulations",
    "Assessments per module",
    "Progress tests",
  ],
  evaluation: [
    "Active participation",
    "Practical activities",
    "Written exercises",
    "Assessment per book",
    "Final integrative assessment",
  ],
  outcomes: [
    "Communicate confidently in everyday situations",
    "Understand intermediate-level conversations and texts",
    "Express opinions, experiences and plans",
    "Hold fluent conversations",
    "Read and write texts of medium complexity",
    "Function in basic work or academic settings",
    "Have a solid base for international exams such as TOEFL",
  ],
  outcomeNote:
    "These are the outcomes of the full six-book program (160 hours), which reaches a functional intermediate level (A2–B1). This Basic-level package covers books 1 to 4 (80 hours); the Intermediate level (books 5 and 6) is the natural continuation.",
};

const englishPT: CourseContent = {
  description: [
    "O curso de Inglês da Only One Coin desenvolve suas competências comunicativas de forma progressiva, do nível inicial até um intermediário funcional, com prática constante de speaking, listening, reading, writing, use of English e vocabulary.",
    "O pacote completo do nível Básico são quatro livros (Papayita), estruturados para você pensar em inglês, ganhar segurança ao se comunicar e se virar em situações do dia a dia. O conteúdo segue padrões internacionais e continua no nível Intermediário.",
  ],
  sessions: "80 sessões",
  duration: "80 horas acadêmicas (nível Básico)",
  level: "Básico (A1–A2)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Livro 1 — Bright Start",
      topics: [
        "Expressões básicas de sala de aula",
        "Alfabeto e pronúncia",
        "Números",
        "Cumprimentos e apresentações",
        "Informação pessoal",
        "Verbos to be e to have",
        "Vocabulário do dia a dia",
        "Compreensão e produção de frases simples",
      ],
    },
    {
      title: "Livro 2 — Brave Steps",
      topics: [
        "Nacionalidades e países",
        "Profissões e ocupações",
        "Família e relações pessoais",
        "Simple Present (afirmativo, negativo e interrogativo)",
        "Advérbios de frequência",
        "Rotinas diárias",
        "Compreensão de textos curtos",
        "Conversas básicas guiadas",
      ],
    },
    {
      title: "Livro 3 — Fluent Glow",
      topics: [
        "Lugares da cidade",
        "Preposições de lugar",
        "Comparativos e superlativos",
        "Transporte e direções",
        "Present Continuous",
        "Números ordinais",
        "Interação em situações cotidianas",
        "Desenvolvimento da fluência básica",
      ],
    },
    {
      title: "Livro 4 — Golden Speech",
      topics: [
        "Experiências pessoais",
        "Simple Past (afirmativo, negativo e interrogativo)",
        "Aparência física e descrições",
        "Datas e eventos passados",
        "Comparação de experiências",
        "Expressão oral mais elaborada",
        "Produção de textos narrativos curtos",
      ],
    },
  ],
  goals: [
    "Compreensão auditiva progressiva",
    "Expressão oral com fluência crescente",
    "Leitura compreensiva de textos",
    "Escrita clara e estruturada",
    "Uso correto das estruturas gramaticais",
    "Ampliação constante do vocabulário",
  ],
  method: [
    "Aulas virtuais interativas",
    "Enfoque comunicativo",
    "Exercícios práticos por unidade",
    "Role play e simulações reais",
    "Avaliações por módulo",
    "Provas de progresso",
  ],
  evaluation: [
    "Participação ativa",
    "Atividades práticas",
    "Exercícios escritos",
    "Avaliações por livro",
    "Avaliação final integradora",
  ],
  outcomes: [
    "Comunicar-se com segurança em situações cotidianas",
    "Compreender conversas e textos de nível intermediário",
    "Expressar opiniões, experiências e planos",
    "Manter conversas fluidas",
    "Ler e redigir textos de complexidade média",
    "Atuar em ambientes de trabalho ou acadêmicos básicos",
    "Ter base sólida para exames internacionais tipo TOEFL",
  ],
  outcomeNote:
    "Estes são os resultados do programa completo de seis livros (160 horas), que chega a um nível intermediário funcional (A2–B1). O pacote deste nível Básico são os livros 1 a 4 (80 horas); o nível Intermediário (livros 5 e 6) é a continuação natural.",
};


/**
 * Cambridge é a CERTIFICAÇÃO; este curso é a preparação para ela. O texto
 * abaixo nunca diz que a Only One Coin emite o certificado — quem emite é o
 * Cambridge, e o curso leva o aluno até a prova.
 */
const cambridgeES: CourseContent = {
  description: [
    "Cambridge es una certificación internacional de inglés. Este curso te prepara para rendirla: trabaja el nivel B1 de forma progresiva, con el tipo de tareas, audios y textos que aparecen en el examen.",
    "Al terminar recibes asesoría gratuita para inscribirte y rendir el examen Cambridge PET.",
  ],
  duration: "",
  level: "Intermedio (B1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Módulo 1 — Vida diaria y decisiones",
      topics: [
        "Rutinas y vida diaria",
        "Estudios y trabajo",
        "Expresar gustos, preferencias y decisiones",
        "Present simple · Adverbs of frequency",
        "Present continuous · Verb patterns (want, would like, decide)",
        "Resultado: hablas de tu vida, tus hábitos y tus decisiones en inglés",
      ],
    },
    {
      title: "Módulo 2 — Experiencias y pasado",
      topics: [
        "Viajes, hobbies y tiempo libre",
        "Experiencias personales y relato de historias",
        "Past simple · Past continuous",
        "“Used to” · Expresiones de tiempo",
        "Resultado: cuentas experiencias pasadas con claridad y coherencia",
      ],
    },
    {
      title: "Módulo 3 — Planes y vida futura",
      topics: [
        "Planes futuros",
        "Tecnología y vida digital",
        "Normas, consejos y responsabilidades",
        "Future forms (going to / will) · Modals (can, have to, should)",
        "First conditional",
        "Resultado: hablas del futuro, das consejos y expresas obligaciones",
      ],
    },
    {
      title: "Módulo 4 — Salud y estilo de vida",
      topics: [
        "Salud y bienestar",
        "Cambios personales y estilo de vida",
        "Present perfect vs past simple",
        "Quantifiers · Modals for advice",
        "Resultado: hablas de experiencias y hábitos, y das recomendaciones",
      ],
    },
  ],
  goals: [
    "Speaking: mantener conversaciones fluidas y expresar opiniones y experiencias",
    "Listening: comprender conversaciones cotidianas y audios tipo examen Cambridge",
    "Reading: leer textos intermedios e identificar ideas principales y detalles",
    "Writing: redactar correos, historias y opiniones de forma clara y coherente",
  ],
  method: [
    "Clases virtuales en vivo",
    "Práctica con tareas del formato del examen",
    "Situaciones reales de comunicación",
    "Participación activa desde la primera clase",
  ],
  evaluation: [
    "Participación en clase",
    "Prácticas por módulo",
    "Simulacros con formato de examen",
  ],
  outcomes: [
    "Comunicarte en viajes y situaciones cotidianas",
    "Mantener conversaciones básicas-intermedias sin traducir mentalmente",
    "Entender contenido en inglés (videos, audios, textos)",
    "Expresar ideas, experiencias y planes con claridad",
    "Alcanzar un nivel equivalente a B1 (intermedio)",
    "Estar preparado para rendir el examen Cambridge PET",
    "Recibir asesoría gratuita al finalizar para rendir el examen",
  ],
  outcomeNote:
    "El examen y el certificado los emite Cambridge, no Only One Coin: este curso te lleva preparado hasta la prueba y te acompaña en la inscripción.",
};

const frenchAdvancedES: CourseContent = {
  description: [
    "La continuación natural del Francés Básico: aquí ya no se trata de aprender más vocabulario o gramática, sino de empezar a pensar, expresarte y desenvolverte en francés con fluidez.",
    "Está diseñado para quien ya domina lo básico, entiende francés pero todavía no lo habla con soltura, y quiere avanzar hacia una comunicación completa y natural — incluida la preparación para certificarse (DELF / TCF).",
  ],
  duration: "",
  level: "Intermedio / Avanzado (B1–B2 aproximado)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Módulo 1 — Interacción y vida social (Unité 7)",
      topics: [
        "Hacer propuestas e invitaciones",
        "Expresar opiniones y emociones",
        "Hablar sobre trabajo, amigos y experiencias",
        "Pronombres y estructuras conversacionales",
        "Resultado: mantienes conversaciones naturales y te desenvuelves socialmente",
      ],
    },
    {
      title: "Módulo 2 — Experiencias y narración (Unité 8)",
      topics: [
        "Imparfait vs passé composé",
        "Narración de experiencias personales",
        "Describir recuerdos, emociones y situaciones",
        "Hablar de hobbies y vivencias",
        "Resultado: cuentas historias y experiencias con claridad",
      ],
    },
    {
      title: "Módulo 3 — Entorno y vida urbana (Unité 9)",
      topics: [
        "Describir espacios y ciudades",
        "Buscar vivienda y entender anuncios",
        "Dar direcciones y organizar encuentros",
        "Expresar necesidades, preferencias y consejos",
        "Resultado: te desenvuelves en contextos reales (viajes, mudanza, vida diaria)",
      ],
    },
    {
      title: "Módulo 4 — Vida social y cultural (Unité 10)",
      topics: [
        "Conversaciones entre amigos",
        "Organización de reuniones y eventos",
        "Comprensión de recetas y cultura gastronómica",
        "Expresión espontánea en situaciones sociales",
        "Resultado: te comunicas con mayor fluidez y naturalidad",
      ],
    },
  ],
  goals: [
    "Mantener conversaciones fluidas con nativos",
    "Expresar opiniones, emociones y argumentos",
    "Redactar textos claros: mensajes, correos, opiniones",
    "Entender conversaciones reales y contenido audiovisual",
    "Usar correctamente los tiempos pasados y estructuras complejas",
  ],
  method: [
    "Clases 100% prácticas y en vivo",
    "Situaciones reales: viajes, trabajo, vida social",
    "Método progresivo basado en conversación",
    "Material estructurado por unidades, continuación real del nivel básico",
    "Enfoque comunicativo: hablas desde la primera clase",
  ],
  evaluation: [
    "Participación en clase",
    "Prácticas por unidad",
    "Producción oral y escrita evaluada por módulo",
  ],
  outcomes: [
    "Alcanzar un nivel aproximado B1 / B2",
    "Viajar y comunicarte sin depender del traductor",
    "Entender conversaciones reales",
    "Prepararte para exámenes internacionales (DELF / TCF)",
    "Mejorar tus oportunidades laborales y académicas",
  ],
};

/**
 * Os demais idiomas. Aqui só o que a página mostra — nível, sessões e as
 * unidades — porque é o que decide a matrícula. A sessão é uma hora de aula ao
 * vivo, e o curso roda uma hora por dia, de segunda a sexta: por isso o número
 * de sessões acompanha a carga horária do programa (Alemán 16 h = 16 sesiones).
 * Coreano fica sem o número enquanto a coordenação não fechar a carga horária.
 */
const frenchES: CourseContent = {
  sessions: "80 sesiones",
  level: "Básico (A1)",
  curriculum: [
    { title: "Unidad 0 — Introducción al francés", topics: [] },
    { title: "Unidad 1 — Conocer y presentarse", topics: [] },
    { title: "Unidad 2 — Ubicarse y comunicarse en la ciudad", topics: [] },
    { title: "Unidad 3 — Relaciones y situaciones sociales", topics: [] },
  ],
};

const frenchEN: CourseContent = {
  sessions: "80 sessions",
  level: "Beginner (A1)",
  curriculum: [
    { title: "Unit 0 — Introduction to French", topics: [] },
    { title: "Unit 1 — Meeting people and introducing yourself", topics: [] },
    { title: "Unit 2 — Getting around and communicating in the city", topics: [] },
    { title: "Unit 3 — Relationships and social situations", topics: [] },
  ],
};

const frenchPT: CourseContent = {
  sessions: "80 sessões",
  level: "Básico (A1)",
  curriculum: [
    { title: "Unidade 0 — Introdução ao francês", topics: [] },
    { title: "Unidade 1 — Conhecer e se apresentar", topics: [] },
    { title: "Unidade 2 — Se localizar e se comunicar na cidade", topics: [] },
    { title: "Unidade 3 — Relações e situações sociais", topics: [] },
  ],
};

/**
 * Programa oficial do Italiano Básico (documento da coordenação, 09/2026),
 * na segunda pessoa como o resto do site. Único ajuste editorial: "los pastos
 * del día" do documento é o italiano "i pasti" — na página vira "las comidas
 * del día", que é o que a unidade ensina.
 */
const italianES: CourseContent = {
  description: [
    "El curso de Italiano Básico de Only One Coin está diseñado para quienes no tienen conocimientos previos y desean iniciarse en la lengua y la cultura italiana, desarrollando las habilidades comunicativas esenciales de la vida cotidiana.",
    "El curso combina vocabulario práctico, estructuras gramaticales básicas y pronunciación con actividades comunicativas, para que comprendas y produzcas mensajes simples con una comunicación clara, correcta y progresiva. El enfoque es comunicativo y funcional: prioriza el uso real del idioma en presentaciones personales, compras, transporte, alimentación, orientación y conversaciones básicas.",
  ],
  sessions: "60 sesiones",
  duration: "60 horas académicas",
  level: "Básico inicial (A1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidad 1 — Introducción al idioma italiano",
      topics: [
        "Alfabeto y pronunciación",
        "Sonidos característicos del italiano (C y G suaves y fuertes)",
        "Saludos y despedidas",
        "Expresiones de cortesía",
        "Presentaciones personales",
        "Pronombres personales",
        "Verbos essere y stare (uso básico)",
      ],
    },
    {
      title: "Unidad 2 — Información personal y entorno",
      topics: [
        "Nacionalidades y países",
        "Ciudades y lugares",
        "Números (0–100)",
        "Edad y datos personales",
        "Verbo avere",
        "La familia",
        "Profesiones y ocupaciones",
        "Días de la semana, meses y estaciones",
      ],
    },
    {
      title: "Unidad 3 — Gramática básica y descripción",
      topics: [
        "Sustantivos (género y número)",
        "Artículos determinados e indeterminados",
        "Adjetivos calificativos",
        "Concordancia de género y número",
        "Verbos regulares en presente indicativo",
        "Verbos irregulares frecuentes",
        "Verbos reflexivos básicos",
      ],
    },
    {
      title: "Unidad 4 — Vida cotidiana y comunicación práctica",
      topics: [
        "La casa y los espacios",
        "Preposiciones simples y articuladas",
        "Verbo piacere",
        "Expresión avere bisogno",
        "Alimentos, frutas y verduras",
        "El supermercado",
        "Compras y pedidos básicos",
      ],
    },
    {
      title: "Unidad 5 — Interacción social básica",
      topics: [
        "Las comidas del día",
        "Pedir y ordenar en un bar",
        "Lugares frecuentes",
        "Dar y pedir indicaciones",
        "Medios de transporte",
        "Verbos andare y venire",
        "Adverbios de frecuencia",
      ],
    },
    {
      title: "Unidad 6 — Uso inicial del pasado y acciones en progreso",
      topics: [
        "Gerundio (forma y uso)",
        "Pasado próximo (introducción)",
        "Verbos con essere y avere",
        "Conversaciones simples sobre experiencias",
        "Vocabulario funcional adicional",
        "Integración de contenidos",
      ],
    },
  ],
  goals: [
    "Comprensión auditiva básica",
    "Expresión oral en contextos simples",
    "Lectura comprensiva de textos breves",
    "Escritura básica funcional",
    "Pronunciación y entonación inicial",
    "Uso correcto de estructuras gramaticales básicas",
  ],
  method: [
    "Clases virtuales interactivas",
    "Material digital propio",
    "Ejercicios prácticos y contextualizados",
    "Role play y diálogos guiados",
    "Evaluaciones formativas por unidad",
  ],
  evaluation: [
    "Participación activa en clase",
    "Prácticas orales y escritas",
    "Ejercicios por unidad",
    "Evaluación final integradora de nivel básico",
  ],
  outcomes: [
    "Presentarte y hablar de ti",
    "Comprender y usar expresiones cotidianas",
    "Mantener conversaciones simples",
    "Describir personas, lugares y rutinas",
    "Realizar compras y pedidos básicos",
    "Pedir y dar indicaciones sencillas",
    "Comprender textos cortos en italiano",
  ],
  outcomeNote:
    "De forma realista, alcanzas un nivel básico funcional (A1): suficiente para continuar a los niveles intermedios, viajar a países de habla italiana con mayor seguridad o iniciar estudios posteriores del idioma.",
};

const italianEN: CourseContent = {
  description: [
    "Only One Coin's Basic Italian course is designed for people with no prior knowledge who want a first step into the Italian language and culture, building the communication skills everyday life asks for.",
    "The course combines practical vocabulary, basic grammar structures and pronunciation with communicative activities, so you understand and produce simple messages with clear, correct, progressive communication. The approach is communicative and functional: real use of the language in introductions, shopping, transport, food, directions and basic conversations.",
  ],
  sessions: "60 sessions",
  duration: "60 academic hours",
  level: "Beginner (A1)",
  modality: "Online",
  curriculum: [
    {
      title: "Unit 1 — Introduction to Italian",
      topics: [
        "Alphabet and pronunciation",
        "Characteristic Italian sounds (soft and hard C and G)",
        "Greetings and farewells",
        "Polite expressions",
        "Introducing yourself",
        "Personal pronouns",
        "The verbs essere and stare (basic use)",
      ],
    },
    {
      title: "Unit 2 — Personal information and surroundings",
      topics: [
        "Nationalities and countries",
        "Cities and places",
        "Numbers (0–100)",
        "Age and personal details",
        "The verb avere",
        "Family",
        "Jobs and occupations",
        "Days of the week, months and seasons",
      ],
    },
    {
      title: "Unit 3 — Basic grammar and description",
      topics: [
        "Nouns (gender and number)",
        "Definite and indefinite articles",
        "Descriptive adjectives",
        "Gender and number agreement",
        "Regular verbs in the present indicative",
        "Common irregular verbs",
        "Basic reflexive verbs",
      ],
    },
    {
      title: "Unit 4 — Everyday life and practical communication",
      topics: [
        "The home and its spaces",
        "Simple and articulated prepositions",
        "The verb piacere",
        "The expression avere bisogno",
        "Food, fruit and vegetables",
        "The supermarket",
        "Basic shopping and ordering",
      ],
    },
    {
      title: "Unit 5 — Basic social interaction",
      topics: [
        "Meals of the day",
        "Ordering at a café or bar",
        "Common places",
        "Giving and asking for directions",
        "Means of transport",
        "The verbs andare and venire",
        "Adverbs of frequency",
      ],
    },
    {
      title: "Unit 6 — First use of the past and ongoing actions",
      topics: [
        "The gerund (form and use)",
        "Passato prossimo (introduction)",
        "Verbs with essere and avere",
        "Simple conversations about experiences",
        "Additional functional vocabulary",
        "Bringing the content together",
      ],
    },
  ],
  goals: [
    "Basic listening comprehension",
    "Speaking in simple contexts",
    "Reading short texts",
    "Basic functional writing",
    "Beginner pronunciation and intonation",
    "Correct use of basic grammar structures",
  ],
  method: [
    "Interactive online classes",
    "Our own digital material",
    "Practical, contextualised exercises",
    "Role play and guided dialogues",
    "Formative assessment per unit",
  ],
  evaluation: [
    "Active class participation",
    "Spoken and written practice",
    "Exercises per unit",
    "Final integrative basic-level assessment",
  ],
  outcomes: [
    "Introduce yourself and talk about your life",
    "Understand and use everyday expressions",
    "Hold simple conversations",
    "Describe people, places and routines",
    "Do basic shopping and place orders",
    "Ask for and give simple directions",
    "Understand short texts in Italian",
  ],
  outcomeNote:
    "Realistically, you reach a functional basic level (A1): enough to continue into intermediate levels, travel to Italian-speaking countries with more confidence, or keep studying the language.",
};

const italianPT: CourseContent = {
  description: [
    "O curso de Italiano Básico da Only One Coin foi desenhado para quem não tem conhecimento prévio e quer dar o primeiro passo na língua e na cultura italiana, desenvolvendo as habilidades comunicativas essenciais da vida cotidiana.",
    "O curso combina vocabulário prático, estruturas gramaticais básicas e pronúncia com atividades comunicativas, para você compreender e produzir mensagens simples com uma comunicação clara, correta e progressiva. O enfoque é comunicativo e funcional: uso real do idioma em apresentações pessoais, compras, transporte, alimentação, orientação e conversas básicas.",
  ],
  sessions: "60 sessões",
  duration: "60 horas acadêmicas",
  level: "Básico inicial (A1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidade 1 — Introdução ao idioma italiano",
      topics: [
        "Alfabeto e pronúncia",
        "Sons característicos do italiano (C e G suaves e fortes)",
        "Cumprimentos e despedidas",
        "Expressões de cortesia",
        "Apresentações pessoais",
        "Pronomes pessoais",
        "Verbos essere e stare (uso básico)",
      ],
    },
    {
      title: "Unidade 2 — Informação pessoal e entorno",
      topics: [
        "Nacionalidades e países",
        "Cidades e lugares",
        "Números (0–100)",
        "Idade e dados pessoais",
        "Verbo avere",
        "A família",
        "Profissões e ocupações",
        "Dias da semana, meses e estações",
      ],
    },
    {
      title: "Unidade 3 — Gramática básica e descrição",
      topics: [
        "Substantivos (gênero e número)",
        "Artigos definidos e indefinidos",
        "Adjetivos qualificativos",
        "Concordância de gênero e número",
        "Verbos regulares no presente do indicativo",
        "Verbos irregulares frequentes",
        "Verbos reflexivos básicos",
      ],
    },
    {
      title: "Unidade 4 — Vida cotidiana e comunicação prática",
      topics: [
        "A casa e os espaços",
        "Preposições simples e articuladas",
        "Verbo piacere",
        "Expressão avere bisogno",
        "Alimentos, frutas e verduras",
        "O supermercado",
        "Compras e pedidos básicos",
      ],
    },
    {
      title: "Unidade 5 — Interação social básica",
      topics: [
        "As refeições do dia",
        "Pedir em um bar ou café",
        "Lugares frequentes",
        "Dar e pedir indicações",
        "Meios de transporte",
        "Verbos andare e venire",
        "Advérbios de frequência",
      ],
    },
    {
      title: "Unidade 6 — Uso inicial do passado e ações em progresso",
      topics: [
        "Gerúndio (forma e uso)",
        "Passato prossimo (introdução)",
        "Verbos com essere e avere",
        "Conversas simples sobre experiências",
        "Vocabulário funcional adicional",
        "Integração de conteúdos",
      ],
    },
  ],
  goals: [
    "Compreensão auditiva básica",
    "Expressão oral em contextos simples",
    "Leitura de textos breves",
    "Escrita básica funcional",
    "Pronúncia e entonação inicial",
    "Uso correto das estruturas gramaticais básicas",
  ],
  method: [
    "Aulas virtuais interativas",
    "Material digital próprio",
    "Exercícios práticos e contextualizados",
    "Role play e diálogos guiados",
    "Avaliações formativas por unidade",
  ],
  evaluation: [
    "Participação ativa em aula",
    "Práticas orais e escritas",
    "Exercícios por unidade",
    "Avaliação final integradora do nível básico",
  ],
  outcomes: [
    "Apresentar-se e falar de si",
    "Compreender e usar expressões cotidianas",
    "Manter conversas simples",
    "Descrever pessoas, lugares e rotinas",
    "Fazer compras e pedidos básicos",
    "Pedir e dar indicações simples",
    "Compreender textos curtos em italiano",
  ],
  outcomeNote:
    "De forma realista, você alcança um nível básico funcional (A1): suficiente para continuar aos níveis intermediários, viajar a países de língua italiana com mais segurança ou seguir estudando o idioma.",
};

/**
 * Programa oficial do Portugués Básico (documento da coordenação, 09/2026).
 * O texto original fala do aluno em terceira pessoa; aqui vira segunda pessoa,
 * como o resto do site — o conteúdo acadêmico é o do documento, sem invenção.
 */
const portugueseES: CourseContent = {
  description: [
    "El curso de Portugués Básico de Only One Coin está diseñado para quienes desean iniciarse en el portugués de Brasil, desarrollando las competencias fundamentales de comprensión y comunicación oral y escrita. El enfoque es práctico y comunicativo: prioriza situaciones reales de la vida cotidiana, el trabajo y los viajes.",
    "A lo largo del curso adquieres el vocabulario esencial, las estructuras gramaticales básicas y las herramientas de pronunciación que te permiten comprender y expresarte en contextos simples, con confianza progresiva.",
  ],
  sessions: "80 sesiones",
  duration: "80 horas académicas",
  level: "Básico (A1–A2 inicial)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidad 1 — Introducción al idioma portugués",
      topics: [
        "Alfabeto y pronunciación",
        "Saludos formales e informales",
        "Presentaciones personales",
        "Expresiones básicas de cortesía",
        "Días de la semana y rutinas simples",
      ],
    },
    {
      title: "Unidad 2 — Vida cotidiana y entorno personal",
      topics: [
        "La familia y relaciones personales",
        "Descripción de personas",
        "Adjetivos básicos",
        "Colores y objetos comunes",
        "Verbos en presente simple",
      ],
    },
    {
      title: "Unidad 3 — Trabajo, estudios y actividades",
      topics: [
        "Profesiones y ocupaciones",
        "Lugares de trabajo",
        "Rutinas diarias",
        "Horarios y expresiones de tiempo",
        "Preguntas frecuentes (qué, quién, dónde, cuándo)",
      ],
    },
    {
      title: "Unidad 4 — Comunicación práctica y gramática básica",
      topics: [
        "Números, fechas y dinero",
        "Compras y pagos",
        "Verbos regulares e irregulares básicos",
        "Artículos definidos e indefinidos",
        "Frases afirmativas, negativas e interrogativas",
        "Introducción al pasado (uso básico)",
      ],
    },
  ],
  goals: [
    "Comprensión oral básica",
    "Producción oral en contextos simples",
    "Comprensión lectora de textos cortos",
    "Escritura básica funcional",
    "Pronunciación y entonación inicial",
  ],
  method: [
    "Clases dinámicas y participativas",
    "Material digital propio",
    "Ejercicios prácticos y contextualizados",
    "Actividades de conversación guiada",
    "Evaluaciones formativas por unidad",
  ],
  evaluation: [
    "Participación en clase",
    "Prácticas por unidad",
    "Evaluaciones cortas",
    "Evaluación final de nivel básico",
  ],
  outcomes: [
    "Presentarte y hablar de ti y de tu entorno",
    "Mantener conversaciones simples en portugués",
    "Comprender instrucciones y textos básicos",
    "Describir rutinas, personas y actividades",
    "Desenvolverte en compras, viajes o trabajo básico",
    "Continuar hacia los niveles intermedios con una base sólida",
  ],
  outcomeNote:
    "El curso no promete fluidez avanzada: promete un dominio básico funcional del idioma, acorde a un nivel inicial realista y alcanzable.",
};

const portugueseEN: CourseContent = {
  description: [
    "Only One Coin's Basic Portuguese course is designed for anyone starting out in Brazilian Portuguese, building the core skills of understanding and communicating, spoken and written. The approach is practical and communicative: it focuses on real situations from everyday life, work and travel.",
    "Throughout the course you pick up essential vocabulary, basic grammar structures and pronunciation tools that let you understand and express yourself in simple contexts, with growing confidence.",
  ],
  sessions: "80 sessions",
  duration: "80 academic hours",
  level: "Beginner (A1–A2)",
  modality: "Online",
  curriculum: [
    {
      title: "Unit 1 — Introduction to Portuguese",
      topics: [
        "Alphabet and pronunciation",
        "Formal and informal greetings",
        "Introducing yourself",
        "Basic polite expressions",
        "Days of the week and simple routines",
      ],
    },
    {
      title: "Unit 2 — Everyday life and personal surroundings",
      topics: [
        "Family and personal relationships",
        "Describing people",
        "Basic adjectives",
        "Colours and common objects",
        "Verbs in the simple present",
      ],
    },
    {
      title: "Unit 3 — Work, studies and activities",
      topics: [
        "Jobs and occupations",
        "Workplaces",
        "Daily routines",
        "Times and time expressions",
        "Common questions (what, who, where, when)",
      ],
    },
    {
      title: "Unit 4 — Practical communication and basic grammar",
      topics: [
        "Numbers, dates and money",
        "Shopping and payments",
        "Basic regular and irregular verbs",
        "Definite and indefinite articles",
        "Affirmative, negative and interrogative sentences",
        "Introduction to the past tense (basic use)",
      ],
    },
  ],
  goals: [
    "Basic listening comprehension",
    "Speaking in simple contexts",
    "Reading short texts",
    "Basic functional writing",
    "Beginner pronunciation and intonation",
  ],
  method: [
    "Dynamic, participative classes",
    "Our own digital material",
    "Practical, contextualised exercises",
    "Guided conversation activities",
    "Formative assessment per unit",
  ],
  evaluation: [
    "Class participation",
    "Practice work per unit",
    "Short quizzes",
    "Final basic-level assessment",
  ],
  outcomes: [
    "Introduce yourself and talk about your life and surroundings",
    "Hold simple conversations in Portuguese",
    "Understand basic instructions and texts",
    "Describe routines, people and activities",
    "Get by when shopping, travelling or in basic work situations",
    "Move on to intermediate levels with a solid base",
  ],
  outcomeNote:
    "The course doesn't promise advanced fluency: it promises a functional basic command of the language — a realistic, achievable starting level.",
};

const portuguesePT: CourseContent = {
  description: [
    "O curso de Português Básico da Only One Coin foi desenhado para quem quer começar no português do Brasil, desenvolvendo as competências fundamentais de compreensão e comunicação oral e escrita. O enfoque é prático e comunicativo: prioriza situações reais da vida cotidiana, do trabalho e das viagens.",
    "Ao longo do curso você adquire o vocabulário essencial, as estruturas gramaticais básicas e as ferramentas de pronúncia que permitem compreender e se expressar em contextos simples, com confiança progressiva.",
  ],
  sessions: "80 sessões",
  duration: "80 horas acadêmicas",
  level: "Básico (A1–A2 inicial)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidade 1 — Introdução ao idioma português",
      topics: [
        "Alfabeto e pronúncia",
        "Cumprimentos formais e informais",
        "Apresentações pessoais",
        "Expressões básicas de cortesia",
        "Dias da semana e rotinas simples",
      ],
    },
    {
      title: "Unidade 2 — Vida cotidiana e entorno pessoal",
      topics: [
        "Família e relações pessoais",
        "Descrição de pessoas",
        "Adjetivos básicos",
        "Cores e objetos comuns",
        "Verbos no presente simples",
      ],
    },
    {
      title: "Unidade 3 — Trabalho, estudos e atividades",
      topics: [
        "Profissões e ocupações",
        "Lugares de trabalho",
        "Rotinas diárias",
        "Horários e expressões de tempo",
        "Perguntas frequentes (o quê, quem, onde, quando)",
      ],
    },
    {
      title: "Unidade 4 — Comunicação prática e gramática básica",
      topics: [
        "Números, datas e dinheiro",
        "Compras e pagamentos",
        "Verbos regulares e irregulares básicos",
        "Artigos definidos e indefinidos",
        "Frases afirmativas, negativas e interrogativas",
        "Introdução ao passado (uso básico)",
      ],
    },
  ],
  goals: [
    "Compreensão oral básica",
    "Produção oral em contextos simples",
    "Leitura de textos curtos",
    "Escrita básica funcional",
    "Pronúncia e entonação inicial",
  ],
  method: [
    "Aulas dinâmicas e participativas",
    "Material digital próprio",
    "Exercícios práticos e contextualizados",
    "Atividades de conversação guiada",
    "Avaliações formativas por unidade",
  ],
  evaluation: [
    "Participação em aula",
    "Práticas por unidade",
    "Avaliações curtas",
    "Avaliação final do nível básico",
  ],
  outcomes: [
    "Apresentar-se e falar de si e do seu entorno",
    "Manter conversas simples em português",
    "Compreender instruções e textos básicos",
    "Descrever rotinas, pessoas e atividades",
    "Se virar em compras, viagens ou trabalho básico",
    "Seguir para os níveis intermediários com uma base sólida",
  ],
  outcomeNote:
    "O curso não promete fluência avançada: promete um domínio básico funcional do idioma, num nível inicial realista e alcançável.",
};

const mandarinChineseES: CourseContent = {
  sessions: "60 sesiones",
  level: "Básico inicial (HSK 1 aproximado)",
  curriculum: [
    { title: "Unidad 1 — Introducción al idioma chino", topics: [] },
    { title: "Unidad 2 — Pronombres y verbo «ser» (是 shì)", topics: [] },
    { title: "Unidad 3 — Vocabulario cotidiano y estructura básica", topics: [] },
    { title: "Unidad 4 — Números y expresiones prácticas", topics: [] },
    { title: "Unidad 5 — Situaciones comunicativas", topics: [] },
  ],
};

const mandarinChineseEN: CourseContent = {
  sessions: "60 sessions",
  level: "Beginner (around HSK 1)",
  curriculum: [
    { title: "Unit 1 — Introduction to Chinese", topics: [] },
    { title: "Unit 2 — Pronouns and the verb “to be” (是 shì)", topics: [] },
    { title: "Unit 3 — Everyday vocabulary and basic structure", topics: [] },
    { title: "Unit 4 — Numbers and practical expressions", topics: [] },
    { title: "Unit 5 — Communicative situations", topics: [] },
  ],
};

const mandarinChinesePT: CourseContent = {
  sessions: "60 sessões",
  level: "Básico inicial (HSK 1 aproximado)",
  curriculum: [
    { title: "Unidade 1 — Introdução ao idioma chinês", topics: [] },
    { title: "Unidade 2 — Pronomes e o verbo «ser» (是 shì)", topics: [] },
    { title: "Unidade 3 — Vocabulário cotidiano e estrutura básica", topics: [] },
    { title: "Unidade 4 — Números e expressões práticas", topics: [] },
    { title: "Unidade 5 — Situações comunicativas", topics: [] },
  ],
};

const germanES: CourseContent = {
  sessions: "16 sesiones",
  level: "Introductorio (A1 inicial)",
  curriculum: [
    { title: "Unidad 1 — Introducción al idioma alemán", topics: [] },
    { title: "Unidad 2 — Información personal y entorno", topics: [] },
    { title: "Unidad 3 — Estructura de la oración", topics: [] },
    { title: "Unidad 4 — Comunicación práctica", topics: [] },
  ],
};

const germanEN: CourseContent = {
  sessions: "16 sessions",
  level: "Introductory (early A1)",
  curriculum: [
    { title: "Unit 1 — Introduction to German", topics: [] },
    { title: "Unit 2 — Personal information and surroundings", topics: [] },
    { title: "Unit 3 — Sentence structure", topics: [] },
    { title: "Unit 4 — Practical communication", topics: [] },
  ],
};

const germanPT: CourseContent = {
  sessions: "16 sessões",
  level: "Introdutório (A1 inicial)",
  curriculum: [
    { title: "Unidade 1 — Introdução ao idioma alemão", topics: [] },
    { title: "Unidade 2 — Informação pessoal e entorno", topics: [] },
    { title: "Unidade 3 — Estrutura da oração", topics: [] },
    { title: "Unidade 4 — Comunicação prática", topics: [] },
  ],
};

const koreanES: CourseContent = {
  level: "Básico a A2 (intermedio inicial)",
  curriculum: [
    { title: "Unidad 1 — Introducción y bases del idioma", topics: [] },
    { title: "Unidad 2 — Objetos y entorno", topics: [] },
    { title: "Unidad 3 — Ubicación y espacio", topics: [] },
    { title: "Unidad 4 — Compras y alimentos", topics: [] },
    { title: "Unidad 5 — Números y conteo", topics: [] },
    { title: "Unidad 6 — Acciones en pasado", topics: [] },
    { title: "Unidad 7 — Tiempo y fechas", topics: [] },
    { title: "Unidad 8 — Clima y descripciones", topics: [] },
    { title: "Unidad 9 — Planes y acuerdos", topics: [] },
    { title: "Unidad 10 — Vida cotidiana y experiencias", topics: [] },
  ],
};

const koreanEN: CourseContent = {
  level: "Beginner to A2 (early intermediate)",
  curriculum: [
    { title: "Unit 1 — Introduction and foundations", topics: [] },
    { title: "Unit 2 — Objects and surroundings", topics: [] },
    { title: "Unit 3 — Location and space", topics: [] },
    { title: "Unit 4 — Shopping and food", topics: [] },
    { title: "Unit 5 — Numbers and counting", topics: [] },
    { title: "Unit 6 — Actions in the past", topics: [] },
    { title: "Unit 7 — Time and dates", topics: [] },
    { title: "Unit 8 — Weather and descriptions", topics: [] },
    { title: "Unit 9 — Plans and arrangements", topics: [] },
    { title: "Unit 10 — Everyday life and experiences", topics: [] },
  ],
};

const koreanPT: CourseContent = {
  level: "Básico a A2 (intermediário inicial)",
  curriculum: [
    { title: "Unidade 1 — Introdução e bases do idioma", topics: [] },
    { title: "Unidade 2 — Objetos e entorno", topics: [] },
    { title: "Unidade 3 — Localização e espaço", topics: [] },
    { title: "Unidade 4 — Compras e alimentos", topics: [] },
    { title: "Unidade 5 — Números e contagem", topics: [] },
    { title: "Unidade 6 — Ações no passado", topics: [] },
    { title: "Unidade 7 — Tempo e datas", topics: [] },
    { title: "Unidade 8 — Clima e descrições", topics: [] },
    { title: "Unidade 9 — Planos e combinados", topics: [] },
    { title: "Unidade 10 — Vida cotidiana e experiências", topics: [] },
  ],
};

/**
 * Conteúdo por idioma da interface e por curso. Ausência é intencional: o curso
 * sem documento aprovado não ganha malha inventada.
 */
export const courseContent: Record<Lang, Partial<Record<CourseSlug, CourseContent>>> = {
  es: {
    english: englishES,
    "cambridge-b1": cambridgeES,
    "french-advanced": frenchAdvancedES,
    "french": frenchES,
    "italian": italianES,
    "portuguese": portugueseES,
    "mandarin-chinese": mandarinChineseES,
    "german": germanES,
    "korean": koreanES,
  },
  en: {
    english: englishEN,
    "french": frenchEN,
    "italian": italianEN,
    "portuguese": portugueseEN,
    "mandarin-chinese": mandarinChineseEN,
    "german": germanEN,
    "korean": koreanEN,
  },
  pt: {
    english: englishPT,
    "french": frenchPT,
    "italian": italianPT,
    "portuguese": portuguesePT,
    "mandarin-chinese": mandarinChinesePT,
    "german": germanPT,
    "korean": koreanPT,
  },
};
