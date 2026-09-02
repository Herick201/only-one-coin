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
   * Só `level`, `sessions` e os títulos de `curriculum` chegam à página: ela
   * vende, e o que vende é quantas sessões, em que nível e o que se vê em cada
   * uma. O resto fica guardado — é o programa que a coordenação escreveu, e
   * serve quando existir uma página de programa completo.
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

const frenchAdvancedEN: CourseContent = {
  description: [
    "The natural continuation of Basic French: at this point it is no longer about learning more vocabulary or grammar, but about starting to think, express yourself and get by in French with fluency.",
    "It is designed for those who already master the basics, understand French but do not yet speak it with ease, and want to move towards complete, natural communication — including preparation for certification (DELF / TCF).",
  ],
  level: "Intermediate / Advanced (around B1–B2)",
  modality: "Online",
  curriculum: [
    {
      title: "Module 1 — Interaction and social life (Unité 7)",
      topics: [
        "Making proposals and invitations",
        "Expressing opinions and emotions",
        "Talking about work, friends and experiences",
        "Pronouns and conversational structures",
        "Outcome: you hold natural conversations and get along socially",
      ],
    },
    {
      title: "Module 2 — Experiences and storytelling (Unité 8)",
      topics: [
        "Imparfait vs passé composé",
        "Narrating personal experiences",
        "Describing memories, emotions and situations",
        "Talking about hobbies and life experiences",
        "Outcome: you tell stories and experiences clearly",
      ],
    },
    {
      title: "Module 3 — Surroundings and city life (Unité 9)",
      topics: [
        "Describing spaces and cities",
        "Looking for housing and understanding listings",
        "Giving directions and arranging to meet",
        "Expressing needs, preferences and advice",
        "Outcome: you handle real-life contexts (travel, moving, daily life)",
      ],
    },
    {
      title: "Module 4 — Social and cultural life (Unité 10)",
      topics: [
        "Conversations among friends",
        "Organizing gatherings and events",
        "Understanding recipes and food culture",
        "Spontaneous expression in social situations",
        "Outcome: you communicate with greater fluency and ease",
      ],
    },
  ],
  goals: [
    "Hold fluent conversations with native speakers",
    "Express opinions, emotions and arguments",
    "Write clear texts: messages, emails, opinions",
    "Understand real conversations and audiovisual content",
    "Use past tenses and complex structures correctly",
  ],
  method: [
    "100% practical, live classes",
    "Real-life situations: travel, work, social life",
    "Progressive, conversation-based method",
    "Material structured by units, a true continuation of the basic level",
    "Communicative approach: you speak from the very first class",
  ],
  evaluation: [
    "Class participation",
    "Practice per unit",
    "Spoken and written production assessed per module",
  ],
  outcomes: [
    "Reach an approximate B1 / B2 level",
    "Travel and communicate without relying on a translator",
    "Understand real conversations",
    "Prepare for international exams (DELF / TCF)",
    "Improve your work and academic opportunities",
  ],
};

const frenchAdvancedPT: CourseContent = {
  description: [
    "A continuação natural do Francês Básico: aqui já não se trata de aprender mais vocabulário ou gramática, e sim de começar a pensar, se expressar e se virar em francês com fluência.",
    "Foi desenhado para quem já domina o básico, entende francês mas ainda não o fala com desenvoltura, e quer avançar para uma comunicação completa e natural — incluindo a preparação para se certificar (DELF / TCF).",
  ],
  level: "Intermediário / Avançado (B1–B2 aproximado)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Módulo 1 — Interação e vida social (Unité 7)",
      topics: [
        "Fazer propostas e convites",
        "Expressar opiniões e emoções",
        "Falar sobre trabalho, amigos e experiências",
        "Pronomes e estruturas conversacionais",
        "Resultado: você mantém conversas naturais e se vira socialmente",
      ],
    },
    {
      title: "Módulo 2 — Experiências e narração (Unité 8)",
      topics: [
        "Imparfait vs passé composé",
        "Narração de experiências pessoais",
        "Descrever lembranças, emoções e situações",
        "Falar de hobbies e vivências",
        "Resultado: você conta histórias e experiências com clareza",
      ],
    },
    {
      title: "Módulo 3 — Entorno e vida urbana (Unité 9)",
      topics: [
        "Descrever espaços e cidades",
        "Procurar moradia e entender anúncios",
        "Dar direções e organizar encontros",
        "Expressar necessidades, preferências e conselhos",
        "Resultado: você se vira em contextos reais (viagens, mudança, vida diária)",
      ],
    },
    {
      title: "Módulo 4 — Vida social e cultural (Unité 10)",
      topics: [
        "Conversas entre amigos",
        "Organização de reuniões e eventos",
        "Compreensão de receitas e cultura gastronômica",
        "Expressão espontânea em situações sociais",
        "Resultado: você se comunica com mais fluência e naturalidade",
      ],
    },
  ],
  goals: [
    "Manter conversas fluidas com nativos",
    "Expressar opiniões, emoções e argumentos",
    "Redigir textos claros: mensagens, e-mails, opiniões",
    "Entender conversas reais e conteúdo audiovisual",
    "Usar corretamente os tempos passados e estruturas complexas",
  ],
  method: [
    "Aulas 100% práticas e ao vivo",
    "Situações reais: viagens, trabalho, vida social",
    "Método progressivo baseado em conversação",
    "Material estruturado por unidades, continuação real do nível básico",
    "Enfoque comunicativo: você fala desde a primeira aula",
  ],
  evaluation: [
    "Participação em aula",
    "Práticas por unidade",
    "Produção oral e escrita avaliada por módulo",
  ],
  outcomes: [
    "Alcançar um nível aproximado B1 / B2",
    "Viajar e se comunicar sem depender de tradutor",
    "Entender conversas reais",
    "Preparar-se para exames internacionais (DELF / TCF)",
    "Melhorar suas oportunidades de trabalho e estudo",
  ],
};

const frenchES: CourseContent = {
  description: [
    "El curso de Francés Básico de Only One Coin está diseñado para personas sin conocimientos previos del idioma o con nociones elementales, que desean iniciarse en el francés de manera práctica, progresiva y comunicativa. El programa prioriza la comprensión oral, la expresión oral, la lectura y la escritura, para que puedas desenvolverte en situaciones cotidianas simples.",
    "El curso se apoya en material estructurado por unidades temáticas, con ejercicios guiados, audios, actividades prácticas y situaciones reales de comunicación, que hacen el aprendizaje accesible y gradual.",
  ],
  sessions: "80 sesiones",
  duration: "80 horas académicas",
  level: "Básico (A1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidad 0 — Introducción al francés",
      topics: [
        "Familiarización con el idioma francés",
        "Pronunciación básica y sonidos del francés",
        "Alfabeto y primeros saludos",
        "Introducción cultural al mundo francófono",
        "Vocabulario elemental",
      ],
    },
    {
      title: "Unidad 1 — Conocer y presentarse",
      topics: [
        "Presentarse y presentar a otras personas",
        "Completar fichas de información personal",
        "Verbos être y s'appeler",
        "Nacionalidades y profesiones",
        "Expresar gustos, intereses y actividades",
        "Uso del masculino y femenino",
        "Artículos definidos e indefinidos",
        "Formular y responder preguntas simples",
        "Negación básica",
        "Presentación escrita personal",
      ],
    },
    {
      title: "Unidad 2 — Ubicarse y comunicarse en la ciudad",
      topics: [
        "Comprender y describir un itinerario",
        "Dar y entender indicaciones",
        "Ubicar lugares y direcciones",
        "Expresiones de lugar (à gauche, à droite, près de, loin de)",
        "Caracterizar personas, objetos y lugares",
        "Iniciar una conversación",
        "Números del 11 al 60 y del 60 al 1000",
        "Números ordinales",
        "Vocabulario urbano y cotidiano",
      ],
    },
    {
      title: "Unidad 3 — Relaciones y situaciones sociales",
      topics: [
        "Hacer una presentación formal e informal",
        "Formular preguntas y responder adecuadamente",
        "Expresar aceptación o rechazo",
        "Hablar de fechas, días y meses",
        "Eventos y celebraciones",
        "Fijar citas y reuniones",
        "Uso práctico del francés en situaciones sociales simples",
        "Refuerzo de pronunciación y comprensión auditiva",
      ],
    },
  ],
  goals: [
    "Comprensión de mensajes orales sencillos",
    "Expresión oral básica en contextos cotidianos",
    "Lectura y comprensión de textos breves",
    "Escritura de frases y textos simples",
    "Uso correcto de estructuras gramaticales básicas",
  ],
  method: [
    "Clases virtuales guiadas",
    "Ejercicios prácticos",
    "Audios y actividades de escucha",
    "Role play y simulación de situaciones reales",
    "Evaluaciones formativas por unidad",
  ],
  evaluation: [
    "Participación en clase",
    "Actividades prácticas",
    "Ejercicios escritos",
    "Evaluación final integradora",
  ],
  outcomes: [
    "Presentarte y presentar a otras personas",
    "Comprender información básica sobre personas, lugares y actividades",
    "Mantener conversaciones simples y cotidianas",
    "Pedir y dar información básica",
    "Ubicarte en una ciudad y dar direcciones sencillas",
    "Hablar de fechas, horarios y eventos simples",
    "Leer y escribir textos breves en francés",
  ],
  outcomeNote:
    "De manera realista, el curso permite alcanzar un nivel básico completo (A1), adecuado para continuar estudios en francés, desenvolverte en contextos básicos o rendir evaluaciones introductorias internacionales del idioma francés.",
};

const frenchEN: CourseContent = {
  description: [
    "Only One Coin's Basic French course is designed for people with no prior knowledge of the language, or only elementary notions, who want to start learning French in a practical, progressive and communicative way. The program prioritizes listening, speaking, reading and writing, so you can handle simple everyday situations.",
    "The course is built on material structured by thematic units, with guided exercises, audio, hands-on activities and real communication situations that make learning accessible and gradual.",
  ],
  sessions: "80 sessions",
  duration: "80 academic hours",
  level: "Beginner (A1)",
  modality: "Online",
  curriculum: [
    {
      title: "Unit 0 — Introduction to French",
      topics: [
        "Getting familiar with the French language",
        "Basic pronunciation and the sounds of French",
        "Alphabet and first greetings",
        "Cultural introduction to the French-speaking world",
        "Elementary vocabulary",
      ],
    },
    {
      title: "Unit 1 — Meeting people and introducing yourself",
      topics: [
        "Introducing yourself and other people",
        "Filling in personal information forms",
        "The verbs être and s'appeler",
        "Nationalities and professions",
        "Expressing likes, interests and activities",
        "Masculine and feminine forms",
        "Definite and indefinite articles",
        "Asking and answering simple questions",
        "Basic negation",
        "Written personal introduction",
      ],
    },
    {
      title: "Unit 2 — Getting around and communicating in the city",
      topics: [
        "Understanding and describing an itinerary",
        "Giving and understanding directions",
        "Locating places and addresses",
        "Expressions of place (à gauche, à droite, près de, loin de)",
        "Describing people, objects and places",
        "Starting a conversation",
        "Numbers from 11 to 60 and from 60 to 1000",
        "Ordinal numbers",
        "Urban and everyday vocabulary",
      ],
    },
    {
      title: "Unit 3 — Relationships and social situations",
      topics: [
        "Making formal and informal introductions",
        "Asking questions and answering appropriately",
        "Expressing acceptance or refusal",
        "Talking about dates, days and months",
        "Events and celebrations",
        "Arranging appointments and meetings",
        "Practical use of French in simple social situations",
        "Reinforcing pronunciation and listening comprehension",
      ],
    },
  ],
  goals: [
    "Understanding simple spoken messages",
    "Basic speaking in everyday contexts",
    "Reading and understanding short texts",
    "Writing simple sentences and texts",
    "Correct use of basic grammar structures",
  ],
  method: [
    "Guided online classes",
    "Practical exercises",
    "Audio and listening activities",
    "Role play and real-life simulations",
    "Formative assessments per unit",
  ],
  evaluation: [
    "Class participation",
    "Practical activities",
    "Written exercises",
    "Final integrative assessment",
  ],
  outcomes: [
    "Introduce yourself and other people",
    "Understand basic information about people, places and activities",
    "Hold simple everyday conversations",
    "Ask for and give basic information",
    "Find your way around a city and give simple directions",
    "Talk about dates, times and simple events",
    "Read and write short texts in French",
  ],
  outcomeNote:
    "Realistically, the course lets you reach a complete basic level (A1), suitable for continuing your French studies, handling basic contexts or taking introductory international French assessments.",
};

const frenchPT: CourseContent = {
  description: [
    "O curso de Francês Básico da Only One Coin foi desenhado para pessoas sem conhecimento prévio do idioma, ou com noções elementares, que querem começar no francês de forma prática, progressiva e comunicativa. O programa prioriza a compreensão oral, a expressão oral, a leitura e a escrita, para você se virar em situações cotidianas simples.",
    "O curso se apoia em material estruturado por unidades temáticas, com exercícios guiados, áudios, atividades práticas e situações reais de comunicação, que tornam o aprendizado acessível e gradual.",
  ],
  sessions: "80 sessões",
  duration: "80 horas acadêmicas",
  level: "Básico (A1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidade 0 — Introdução ao francês",
      topics: [
        "Familiarização com o idioma francês",
        "Pronúncia básica e sons do francês",
        "Alfabeto e primeiros cumprimentos",
        "Introdução cultural ao mundo francófono",
        "Vocabulário elementar",
      ],
    },
    {
      title: "Unidade 1 — Conhecer e se apresentar",
      topics: [
        "Apresentar-se e apresentar outras pessoas",
        "Preencher fichas de informação pessoal",
        "Verbos être e s'appeler",
        "Nacionalidades e profissões",
        "Expressar gostos, interesses e atividades",
        "Uso do masculino e do feminino",
        "Artigos definidos e indefinidos",
        "Formular e responder perguntas simples",
        "Negação básica",
        "Apresentação pessoal por escrito",
      ],
    },
    {
      title: "Unidade 2 — Se localizar e se comunicar na cidade",
      topics: [
        "Compreender e descrever um itinerário",
        "Dar e entender indicações",
        "Localizar lugares e endereços",
        "Expressões de lugar (à gauche, à droite, près de, loin de)",
        "Caracterizar pessoas, objetos e lugares",
        "Iniciar uma conversa",
        "Números do 11 ao 60 e do 60 ao 1000",
        "Números ordinais",
        "Vocabulário urbano e cotidiano",
      ],
    },
    {
      title: "Unidade 3 — Relações e situações sociais",
      topics: [
        "Fazer uma apresentação formal e informal",
        "Formular perguntas e responder adequadamente",
        "Expressar aceitação ou recusa",
        "Falar de datas, dias e meses",
        "Eventos e celebrações",
        "Marcar compromissos e reuniões",
        "Uso prático do francês em situações sociais simples",
        "Reforço de pronúncia e compreensão auditiva",
      ],
    },
  ],
  goals: [
    "Compreensão de mensagens orais simples",
    "Expressão oral básica em contextos cotidianos",
    "Leitura e compreensão de textos curtos",
    "Escrita de frases e textos simples",
    "Uso correto das estruturas gramaticais básicas",
  ],
  method: [
    "Aulas virtuais guiadas",
    "Exercícios práticos",
    "Áudios e atividades de escuta",
    "Role play e simulação de situações reais",
    "Avaliações formativas por unidade",
  ],
  evaluation: [
    "Participação em aula",
    "Atividades práticas",
    "Exercícios escritos",
    "Avaliação final integradora",
  ],
  outcomes: [
    "Apresentar-se e apresentar outras pessoas",
    "Compreender informações básicas sobre pessoas, lugares e atividades",
    "Manter conversas simples e cotidianas",
    "Pedir e dar informações básicas",
    "Localizar-se em uma cidade e dar direções simples",
    "Falar de datas, horários e eventos simples",
    "Ler e escrever textos curtos em francês",
  ],
  outcomeNote:
    "De maneira realista, o curso permite alcançar um nível básico completo (A1), adequado para continuar os estudos de francês, se virar em contextos básicos ou prestar avaliações internacionais introdutórias do idioma francês.",
};

/**
 * Os demais idiomas. Aqui só o que a página mostra — nível, sessões e as
 * unidades — porque é o que decide a matrícula. A sessão é uma hora de aula ao
 * vivo, e o curso roda uma hora por dia, de segunda a sexta: por isso o número
 * de sessões acompanha a carga horária do programa (Alemán 16 h = 16 sesiones).
 * Coreano fica sem o número enquanto a coordenação não fechar a carga horária.
 */
const italianES: CourseContent = {
  sessions: "60 sesiones",
  level: "Básico inicial (A1)",
  curriculum: [
    { title: "Unidad 1 — Introducción al idioma italiano", topics: [] },
    { title: "Unidad 2 — Información personal y entorno", topics: [] },
    { title: "Unidad 3 — Gramática básica y descripción", topics: [] },
    { title: "Unidad 4 — Vida cotidiana y comunicación práctica", topics: [] },
    { title: "Unidad 5 — Interacción social básica", topics: [] },
    { title: "Unidad 6 — Uso inicial del pasado y acciones en progreso", topics: [] },
  ],
};

const italianEN: CourseContent = {
  sessions: "60 sessions",
  level: "Beginner (A1)",
  curriculum: [
    { title: "Unit 1 — Introduction to Italian", topics: [] },
    { title: "Unit 2 — Personal information and surroundings", topics: [] },
    { title: "Unit 3 — Basic grammar and description", topics: [] },
    { title: "Unit 4 — Everyday life and practical communication", topics: [] },
    { title: "Unit 5 — Basic social interaction", topics: [] },
    { title: "Unit 6 — First use of the past and ongoing actions", topics: [] },
  ],
};

const italianPT: CourseContent = {
  sessions: "60 sessões",
  level: "Básico inicial (A1)",
  curriculum: [
    { title: "Unidade 1 — Introdução ao idioma italiano", topics: [] },
    { title: "Unidade 2 — Informação pessoal e entorno", topics: [] },
    { title: "Unidade 3 — Gramática básica e descrição", topics: [] },
    { title: "Unidade 4 — Vida cotidiana e comunicação prática", topics: [] },
    { title: "Unidade 5 — Interação social básica", topics: [] },
    { title: "Unidade 6 — Uso inicial do passado e ações em progresso", topics: [] },
  ],
};

const portugueseES: CourseContent = {
  sessions: "80 sesiones",
  level: "Básico (A1–A2 inicial)",
  curriculum: [
    { title: "Unidad 1 — Introducción al idioma portugués", topics: [] },
    { title: "Unidad 2 — Vida cotidiana y entorno personal", topics: [] },
    { title: "Unidad 3 — Trabajo, estudios y actividades", topics: [] },
    { title: "Unidad 4 — Comunicación práctica y gramática básica", topics: [] },
  ],
};

const portugueseEN: CourseContent = {
  sessions: "80 sessions",
  level: "Beginner (A1–A2)",
  curriculum: [
    { title: "Unit 1 — Introduction to Portuguese", topics: [] },
    { title: "Unit 2 — Everyday life and personal surroundings", topics: [] },
    { title: "Unit 3 — Work, studies and activities", topics: [] },
    { title: "Unit 4 — Practical communication and basic grammar", topics: [] },
  ],
};

const portuguesePT: CourseContent = {
  sessions: "80 sessões",
  level: "Básico (A1–A2 inicial)",
  curriculum: [
    { title: "Unidade 1 — Introdução ao idioma português", topics: [] },
    { title: "Unidade 2 — Vida cotidiana e entorno pessoal", topics: [] },
    { title: "Unidade 3 — Trabalho, estudos e atividades", topics: [] },
    { title: "Unidade 4 — Comunicação prática e gramática básica", topics: [] },
  ],
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
    "french-advanced": frenchAdvancedEN,
    "french": frenchEN,
    "italian": italianEN,
    "portuguese": portugueseEN,
    "mandarin-chinese": mandarinChineseEN,
    "german": germanEN,
    "korean": koreanEN,
  },
  pt: {
    english: englishPT,
    "french-advanced": frenchAdvancedPT,
    "french": frenchPT,
    "italian": italianPT,
    "portuguese": portuguesePT,
    "mandarin-chinese": mandarinChinesePT,
    "german": germanPT,
    "korean": koreanPT,
  },
};
