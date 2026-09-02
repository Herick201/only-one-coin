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
  description: [
    "El curso de Chino Mandarín Básico está diseñado para estudiantes sin conocimientos previos del idioma que desean iniciarse en la lengua y la cultura china, desarrollando las competencias comunicativas esenciales para situaciones cotidianas.",
    "El programa introduce progresivamente la fonética (Pinyin), los tonos del mandarín, la estructura básica de la oración, los pronombres y el verbo «ser», los clasificadores, el vocabulario cotidiano y una introducción a los caracteres (Hanzi). Desde el inicio trabajas la pronunciación correcta, la comprensión auditiva y el diálogo básico, fortaleciendo tu seguridad al hablar.",
  ],
  sessions: "60 sesiones",
  duration: "60 horas académicas",
  level: "Básico inicial (HSK 1 aproximado)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidad 1 — Introducción al idioma chino",
      topics: [
        "¿Qué es el Hànyǔ (汉语)?",
        "Diferencia entre Hanyu y Zhongwen",
        "Introducción al sistema Pinyin",
        "Iniciales (声母 shēngmǔ)",
        "Finales (韵母 yùnmǔ)",
        "Los 4 tonos del mandarín (声调 shēngdiào)",
        "Estructura de la sílaba",
        "Ejercicios de fonética",
      ],
    },
    {
      title: "Unidad 2 — Pronombres y verbo «ser» (是 shì)",
      topics: [
        "Pronombres personales (yo, tú, él, ella, nosotros)",
        "Uso del verbo 是 shì (ser)",
        "Oraciones afirmativas y negativas (不 bù)",
        "Partícula interrogativa 吗 (ma)",
        "Presentaciones personales",
        "Nacionalidades y países",
        "Profesiones básicas",
        "Estructura básica de la oración: sujeto + adverbio + verbo + objeto",
      ],
    },
    {
      title: "Unidad 3 — Vocabulario cotidiano y estructura básica",
      topics: [
        "La partícula estructural 的 (de)",
        "Clasificador 个 (gè)",
        "Uso obligatorio de clasificadores: numeral + clasificador + sustantivo",
        "Verbos frecuentes: 去 (ir), 看 (ver), 吃 (comer), 学习 (estudiar)",
        "Adverbios de frecuencia",
        "Construcción de preguntas: 谁 (quién), 什么 (qué), 哪 (dónde/cuál)",
      ],
    },
    {
      title: "Unidad 4 — Números y expresiones prácticas",
      topics: [
        "Números básicos",
        "Teléfono y edad",
        "Uso de 多少 (cuánto)",
        "Expresiones de aceptación: 好 (hǎo), 行 (xíng), 不行 (bù xíng)",
        "Familia (家 jiā)",
        "Uso de 咱们 (nosotros inclusivo)",
      ],
    },
    {
      title: "Unidad 5 — Situaciones comunicativas",
      topics: [
        "¿Qué vas a comer? 你吃什么?",
        "Vocabulario de alimentos",
        "Uso del verbo 要 (querer)",
        "Clasificador 一些 (algo / algunos)",
        "Demostrativos: 这 (este) y 那 (ese)",
        "Diálogos prácticos en cafetería",
      ],
    },
  ],
  goals: [
    "Pronunciar correctamente los cuatro tonos",
    "Leer pinyin con seguridad",
    "Comprender la estructura básica de una oración",
    "Presentarte e intercambiar información personal",
    "Formular y responder preguntas simples",
    "Utilizar clasificadores correctamente",
    "Mantener diálogos básicos en contextos cotidianos",
  ],
  method: [
    "Clases virtuales interactivas",
    "Práctica constante de pronunciación",
    "Ejercicios fonéticos",
    "Diálogos guiados",
    "Actividades prácticas por unidad",
    "Evaluaciones parciales",
    "Evaluación final integradora",
  ],
  evaluation: [
    "Participación en clase",
    "Prácticas orales",
    "Ejercicios escritos",
    "Evaluación escrita",
    "Evaluación oral final",
  ],
  outcomes: [
    "Presentarte y hablar de ti mismo",
    "Comprender preguntas simples",
    "Utilizar frases cotidianas",
    "Pedir comida y expresar preferencias",
    "Identificar números, lugares y objetos",
    "Leer pinyin correctamente",
    "Reconocer e interpretar caracteres básicos",
  ],
  outcomeNote:
    "Al finalizar las 60 horas alcanzas un nivel básico inicial (aprox. HSK 1). El curso no promete fluidez avanzada, pero sí una base sólida y estructurada para continuar al nivel intermedio, con dominio inicial del sistema fonético y comprensión de la estructura del idioma.",
};

const mandarinChineseEN: CourseContent = {
  description: [
    "The Basic Mandarin Chinese course is designed for students with no prior knowledge of the language who want an introduction to Chinese language and culture, building the essential communication skills for everyday situations.",
    "The program progressively introduces phonetics (Pinyin), the Mandarin tones, basic sentence structure, pronouns and the verb “to be”, classifiers, everyday vocabulary and an introduction to characters (Hanzi). From day one you work on correct pronunciation, listening comprehension and basic dialogue, building your confidence when speaking.",
  ],
  sessions: "60 sessions",
  duration: "60 academic hours",
  level: "Beginner (around HSK 1)",
  modality: "Online",
  curriculum: [
    {
      title: "Unit 1 — Introduction to Chinese",
      topics: [
        "What is Hànyǔ (汉语)?",
        "The difference between Hanyu and Zhongwen",
        "Introduction to the Pinyin system",
        "Initials (声母 shēngmǔ)",
        "Finals (韵母 yùnmǔ)",
        "The 4 Mandarin tones (声调 shēngdiào)",
        "Syllable structure",
        "Phonetics exercises",
      ],
    },
    {
      title: "Unit 2 — Pronouns and the verb “to be” (是 shì)",
      topics: [
        "Personal pronouns (I, you, he, she, we)",
        "Using the verb 是 shì (to be)",
        "Affirmative and negative sentences (不 bù)",
        "The question particle 吗 (ma)",
        "Introducing yourself",
        "Nationalities and countries",
        "Basic professions",
        "Basic sentence structure: subject + adverb + verb + object",
      ],
    },
    {
      title: "Unit 3 — Everyday vocabulary and basic structure",
      topics: [
        "The structural particle 的 (de)",
        "The classifier 个 (gè)",
        "Mandatory use of classifiers: numeral + classifier + noun",
        "Frequent verbs: 去 (to go), 看 (to see), 吃 (to eat), 学习 (to study)",
        "Adverbs of frequency",
        "Building questions: 谁 (who), 什么 (what), 哪 (where/which)",
      ],
    },
    {
      title: "Unit 4 — Numbers and practical expressions",
      topics: [
        "Basic numbers",
        "Phone numbers and age",
        "Using 多少 (how much/how many)",
        "Expressions of acceptance: 好 (hǎo), 行 (xíng), 不行 (bù xíng)",
        "Family (家 jiā)",
        "Using 咱们 (inclusive “we”)",
      ],
    },
    {
      title: "Unit 5 — Communicative situations",
      topics: [
        "What are you going to eat? 你吃什么?",
        "Food vocabulary",
        "Using the verb 要 (to want)",
        "The classifier 一些 (some)",
        "Demonstratives: 这 (this) and 那 (that)",
        "Practical café dialogues",
      ],
    },
  ],
  goals: [
    "Pronounce the four tones correctly",
    "Read pinyin with confidence",
    "Understand basic sentence structure",
    "Introduce yourself and exchange personal information",
    "Ask and answer simple questions",
    "Use classifiers correctly",
    "Hold basic dialogues in everyday contexts",
  ],
  method: [
    "Interactive online classes",
    "Constant pronunciation practice",
    "Phonetics exercises",
    "Guided dialogues",
    "Practical activities per unit",
    "Partial assessments",
    "Comprehensive final assessment",
  ],
  evaluation: [
    "Class participation",
    "Oral practice",
    "Written exercises",
    "Written exam",
    "Final oral exam",
  ],
  outcomes: [
    "Introduce yourself and talk about yourself",
    "Understand simple questions",
    "Use everyday phrases",
    "Order food and express preferences",
    "Identify numbers, places and objects",
    "Read pinyin correctly",
    "Recognize and interpret basic characters",
  ],
  outcomeNote:
    "After the 60 hours you reach an early beginner level (approx. HSK 1). The course does not promise advanced fluency, but it does give you a solid, structured foundation to continue to the intermediate level, with an initial command of the phonetic system and an understanding of how the language is built.",
};

const mandarinChinesePT: CourseContent = {
  description: [
    "O curso de Chinês Mandarim Básico foi desenhado para estudantes sem conhecimento prévio do idioma que querem se iniciar na língua e na cultura chinesa, desenvolvendo as competências comunicativas essenciais para situações do dia a dia.",
    "O programa introduz progressivamente a fonética (Pinyin), os tons do mandarim, a estrutura básica da oração, os pronomes e o verbo «ser», os classificadores, o vocabulário cotidiano e uma introdução aos caracteres (Hanzi). Desde o início você trabalha a pronúncia correta, a compreensão auditiva e o diálogo básico, fortalecendo sua segurança ao falar.",
  ],
  sessions: "60 sessões",
  duration: "60 horas acadêmicas",
  level: "Básico inicial (HSK 1 aproximado)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidade 1 — Introdução ao idioma chinês",
      topics: [
        "O que é o Hànyǔ (汉语)?",
        "Diferença entre Hanyu e Zhongwen",
        "Introdução ao sistema Pinyin",
        "Iniciais (声母 shēngmǔ)",
        "Finais (韵母 yùnmǔ)",
        "Os 4 tons do mandarim (声调 shēngdiào)",
        "Estrutura da sílaba",
        "Exercícios de fonética",
      ],
    },
    {
      title: "Unidade 2 — Pronomes e o verbo «ser» (是 shì)",
      topics: [
        "Pronomes pessoais (eu, você, ele, ela, nós)",
        "Uso do verbo 是 shì (ser)",
        "Orações afirmativas e negativas (不 bù)",
        "Partícula interrogativa 吗 (ma)",
        "Apresentações pessoais",
        "Nacionalidades e países",
        "Profissões básicas",
        "Estrutura básica da oração: sujeito + advérbio + verbo + objeto",
      ],
    },
    {
      title: "Unidade 3 — Vocabulário cotidiano e estrutura básica",
      topics: [
        "A partícula estrutural 的 (de)",
        "Classificador 个 (gè)",
        "Uso obrigatório de classificadores: numeral + classificador + substantivo",
        "Verbos frequentes: 去 (ir), 看 (ver), 吃 (comer), 学习 (estudar)",
        "Advérbios de frequência",
        "Construção de perguntas: 谁 (quem), 什么 (o quê), 哪 (onde/qual)",
      ],
    },
    {
      title: "Unidade 4 — Números e expressões práticas",
      topics: [
        "Números básicos",
        "Telefone e idade",
        "Uso de 多少 (quanto)",
        "Expressões de aceitação: 好 (hǎo), 行 (xíng), 不行 (bù xíng)",
        "Família (家 jiā)",
        "Uso de 咱们 (nós inclusivo)",
      ],
    },
    {
      title: "Unidade 5 — Situações comunicativas",
      topics: [
        "O que você vai comer? 你吃什么?",
        "Vocabulário de alimentos",
        "Uso do verbo 要 (querer)",
        "Classificador 一些 (algo / alguns)",
        "Demonstrativos: 这 (este) e 那 (esse)",
        "Diálogos práticos em cafeteria",
      ],
    },
  ],
  goals: [
    "Pronunciar corretamente os quatro tons",
    "Ler pinyin com segurança",
    "Compreender a estrutura básica de uma oração",
    "Apresentar-se e trocar informações pessoais",
    "Formular e responder perguntas simples",
    "Utilizar classificadores corretamente",
    "Manter diálogos básicos em contextos cotidianos",
  ],
  method: [
    "Aulas virtuais interativas",
    "Prática constante de pronúncia",
    "Exercícios fonéticos",
    "Diálogos guiados",
    "Atividades práticas por unidade",
    "Avaliações parciais",
    "Avaliação final integradora",
  ],
  evaluation: [
    "Participação em aula",
    "Práticas orais",
    "Exercícios escritos",
    "Avaliação escrita",
    "Avaliação oral final",
  ],
  outcomes: [
    "Apresentar-se e falar de si mesmo",
    "Compreender perguntas simples",
    "Utilizar frases cotidianas",
    "Pedir comida e expressar preferências",
    "Identificar números, lugares e objetos",
    "Ler pinyin corretamente",
    "Reconhecer e interpretar caracteres básicos",
  ],
  outcomeNote:
    "Ao concluir as 60 horas você alcança um nível básico inicial (aprox. HSK 1). O curso não promete fluência avançada, mas entrega uma base sólida e estruturada para continuar ao nível intermediário, com domínio inicial do sistema fonético e compreensão da estrutura do idioma.",
};

const germanES: CourseContent = {
  description: [
    "El Curso de Alemán Básico (16 horas) es una introducción intensiva al idioma alemán, dirigido a estudiantes sin conocimientos previos que desean un primer acercamiento estructurado: pronunciación correcta, vocabulario esencial, construcción de oraciones simples y comunicación básica en situaciones cotidianas.",
    "Por su duración corta, el curso tiene un enfoque práctico y funcional: al terminar podrás presentarte, comprender expresiones frecuentes y formar frases básicas en alemán.",
  ],
  sessions: "16 sesiones",
  duration: "16 horas académicas",
  level: "Introductorio (A1 inicial)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidad 1 — Introducción al idioma alemán",
      topics: [
        "El alfabeto alemán",
        "Pronunciación (ä, ö, ü, ß)",
        "Saludos formales e informales",
        "Presentaciones personales",
        "Pronombres personales",
        "Verbo sein (ser/estar)",
      ],
    },
    {
      title: "Unidad 2 — Información personal y entorno",
      topics: [
        "Nacionalidades y países",
        "Profesiones básicas",
        "Números (0–100)",
        "Edad",
        "Verbo haben (tener)",
        "Preguntas básicas (Wer? Was? Wo?)",
      ],
    },
    {
      title: "Unidad 3 — Estructura de la oración",
      topics: [
        "Orden básico: sujeto + verbo + complemento",
        "Artículos definidos e indefinidos (der, die, das)",
        "Formación de preguntas",
        "Negación con nicht y kein",
        "Verbos regulares en presente",
      ],
    },
    {
      title: "Unidad 4 — Comunicación práctica",
      topics: [
        "La familia",
        "Días de la semana",
        "Horarios y la hora",
        "Situaciones cotidianas simples",
        "Expresiones útiles para viajar",
        "Diálogos básicos guiados",
      ],
    },
  ],
  goals: [
    "Presentarte y dar información personal básica",
    "Comprender y usar saludos cotidianos",
    "Formular preguntas simples",
    "Utilizar estructuras gramaticales básicas",
    "Leer y pronunciar correctamente palabras comunes",
    "Mantener intercambios básicos en alemán",
  ],
  method: [
    "Clases virtuales dinámicas",
    "Ejercicios de pronunciación",
    "Prácticas orales guiadas",
    "Actividades escritas básicas",
    "Simulaciones de diálogo",
  ],
  evaluation: [
    "Participación en clase",
    "Ejercicios prácticos",
    "Evaluación oral final básica",
  ],
  outcomes: [
    "Una base introductoria real del idioma",
    "Comprensión de estructuras esenciales",
    "Capacidad de presentarte y mantener intercambios simples",
    "Familiarización con la pronunciación alemana",
    "Preparación para continuar a un nivel A1 completo",
  ],
  outcomeNote:
    "Este curso funciona como puerta de entrada al idioma alemán, ideal para quienes desean explorar el idioma antes de continuar con un programa más extenso: en 16 horas te prepara para un nivel A1 completo, no lo reemplaza.",
};

const germanEN: CourseContent = {
  description: [
    "The Basic German Course (16 hours) is an intensive introduction to German for students with no previous knowledge who want a first structured approach to the language: correct pronunciation, essential vocabulary, building simple sentences and basic communication in everyday situations.",
    "Because of its short length, the course takes a practical, functional approach: by the end you will be able to introduce yourself, understand frequent expressions and form basic sentences in German.",
  ],
  sessions: "16 sessions",
  duration: "16 academic hours",
  level: "Introductory (early A1)",
  modality: "Online",
  curriculum: [
    {
      title: "Unit 1 — Introduction to German",
      topics: [
        "The German alphabet",
        "Pronunciation (ä, ö, ü, ß)",
        "Formal and informal greetings",
        "Introducing yourself",
        "Personal pronouns",
        "The verb sein (to be)",
      ],
    },
    {
      title: "Unit 2 — Personal information and surroundings",
      topics: [
        "Nationalities and countries",
        "Basic professions",
        "Numbers (0–100)",
        "Age",
        "The verb haben (to have)",
        "Basic questions (Wer? Was? Wo?)",
      ],
    },
    {
      title: "Unit 3 — Sentence structure",
      topics: [
        "Basic word order: subject + verb + complement",
        "Definite and indefinite articles (der, die, das)",
        "Forming questions",
        "Negation with nicht and kein",
        "Regular verbs in the present tense",
      ],
    },
    {
      title: "Unit 4 — Practical communication",
      topics: [
        "The family",
        "Days of the week",
        "Schedules and telling the time",
        "Simple everyday situations",
        "Useful expressions for travel",
        "Guided basic dialogues",
      ],
    },
  ],
  goals: [
    "Introduce yourself and give basic personal information",
    "Understand and use everyday greetings",
    "Ask simple questions",
    "Use basic grammatical structures",
    "Read and pronounce common words correctly",
    "Hold basic exchanges in German",
  ],
  method: [
    "Dynamic online classes",
    "Pronunciation exercises",
    "Guided speaking practice",
    "Basic written activities",
    "Dialogue simulations",
  ],
  evaluation: [
    "Class participation",
    "Practical exercises",
    "Basic final oral assessment",
  ],
  outcomes: [
    "A real introductory foundation in the language",
    "Understanding of essential structures",
    "The ability to introduce yourself and hold simple exchanges",
    "Familiarity with German pronunciation",
    "Preparation to continue towards a full A1 level",
  ],
  outcomeNote:
    "This course works as a gateway into German, ideal for those who want to explore the language before moving on to a longer program: in 16 hours it prepares you for a full A1 level — it does not replace one.",
};

const germanPT: CourseContent = {
  description: [
    "O Curso de Alemão Básico (16 horas) é uma introdução intensiva ao idioma alemão, voltado a estudantes sem conhecimentos prévios que desejam um primeiro contato estruturado com o idioma: pronúncia correta, vocabulário essencial, construção de frases simples e comunicação básica em situações cotidianas.",
    "Pela duração curta, o curso tem um enfoque prático e funcional: ao terminar você conseguirá se apresentar, compreender expressões frequentes e formar frases básicas em alemão.",
  ],
  sessions: "16 sessões",
  duration: "16 horas acadêmicas",
  level: "Introdutório (A1 inicial)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidade 1 — Introdução ao idioma alemão",
      topics: [
        "O alfabeto alemão",
        "Pronúncia (ä, ö, ü, ß)",
        "Saudações formais e informais",
        "Apresentações pessoais",
        "Pronomes pessoais",
        "Verbo sein (ser/estar)",
      ],
    },
    {
      title: "Unidade 2 — Informação pessoal e entorno",
      topics: [
        "Nacionalidades e países",
        "Profissões básicas",
        "Números (0–100)",
        "Idade",
        "Verbo haben (ter)",
        "Perguntas básicas (Wer? Was? Wo?)",
      ],
    },
    {
      title: "Unidade 3 — Estrutura da oração",
      topics: [
        "Ordem básica: sujeito + verbo + complemento",
        "Artigos definidos e indefinidos (der, die, das)",
        "Formação de perguntas",
        "Negação com nicht e kein",
        "Verbos regulares no presente",
      ],
    },
    {
      title: "Unidade 4 — Comunicação prática",
      topics: [
        "A família",
        "Dias da semana",
        "Horários e as horas",
        "Situações cotidianas simples",
        "Expressões úteis para viajar",
        "Diálogos básicos guiados",
      ],
    },
  ],
  goals: [
    "Apresentar-se e dar informações pessoais básicas",
    "Compreender e usar saudações cotidianas",
    "Formular perguntas simples",
    "Utilizar estruturas gramaticais básicas",
    "Ler e pronunciar corretamente palavras comuns",
    "Manter interações básicas em alemão",
  ],
  method: [
    "Aulas virtuais dinâmicas",
    "Exercícios de pronúncia",
    "Práticas orais guiadas",
    "Atividades escritas básicas",
    "Simulações de diálogo",
  ],
  evaluation: [
    "Participação em aula",
    "Exercícios práticos",
    "Avaliação oral final básica",
  ],
  outcomes: [
    "Uma base introdutória real do idioma",
    "Compreensão das estruturas essenciais",
    "Capacidade de se apresentar e manter interações simples",
    "Familiarização com a pronúncia alemã",
    "Preparação para continuar rumo a um nível A1 completo",
  ],
  outcomeNote:
    "Este curso funciona como porta de entrada ao idioma alemão, ideal para quem deseja explorar o idioma antes de continuar com um programa mais extenso: em 16 horas ele prepara você para um nível A1 completo, não o substitui.",
};

const koreanES: CourseContent = {
  description: [
    "El curso de Coreano está diseñado para que desarrolles habilidades comunicativas desde el nivel básico hasta un nivel intermedio funcional, y puedas comprender, hablar, leer y escribir en situaciones reales del día a día.",
    "Se trabaja con un enfoque práctico basado en comunicación real, comprensión progresiva y aplicación inmediata: vocabulario, gramática, práctica guiada y producción oral y escrita en cada unidad.",
  ],
  level: "Básico a A2 (intermedio inicial)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidad 1 — Introducción y bases del idioma",
      topics: [
        "Saludos y presentaciones",
        "Estructura básica de la oración",
        "Partículas básicas (은/는, 이/가)",
        "Vocabulario inicial",
        "Resultado: puedes presentarte y entender frases simples",
      ],
    },
    {
      title: "Unidad 2 — Objetos y entorno",
      topics: [
        "Objetos cotidianos (mesa, silla, mochila, etc.)",
        "Uso de 이/가 (sujeto)",
        "Descripción básica",
        "Resultado: describes objetos y tu entorno",
      ],
    },
    {
      title: "Unidad 3 — Ubicación y espacio",
      topics: [
        "Posiciones: arriba, abajo, delante, dentro, etc.",
        "Uso de 에 있다 / 없다",
        "Preguntas de ubicación",
        "Resultado: describes dónde están las cosas",
      ],
    },
    {
      title: "Unidad 4 — Compras y alimentos",
      topics: [
        "Vocabulario de comida (manzana, pan, leche, etc.)",
        "Uso de 을/를 (objeto directo)",
        "Pedir y comprar productos",
        "Números sino-coreanos",
        "Resultado: puedes comprar y pedir productos",
      ],
    },
    {
      title: "Unidad 5 — Números y conteo",
      topics: [
        "Números nativos coreanos",
        "Contadores (personas, objetos, etc.)",
        "Uso formal del lenguaje",
        "Resultado: cuentas y expresas cantidades correctamente",
      ],
    },
    {
      title: "Unidad 6 — Acciones en pasado",
      topics: [
        "Verbos (comer, leer, ver, etc.)",
        "Pasado: -았/었어요",
        "Uso de 에서 (lugar de la acción)",
        "Resultado: narras lo que hiciste",
      ],
    },
    {
      title: "Unidad 7 — Tiempo y fechas",
      topics: [
        "Días, meses y horas",
        "Uso de 에 (tiempo)",
        "Rutinas diarias",
        "Resultado: hablas de horarios y fechas",
      ],
    },
    {
      title: "Unidad 8 — Clima y descripciones",
      topics: [
        "Estaciones (primavera, verano, etc.)",
        "Conectores (그리고 = y)",
        "Resultado: describes el clima y situaciones",
      ],
    },
    {
      title: "Unidad 9 — Planes y acuerdos",
      topics: [
        "Hacer invitaciones",
        "-(으)ㄹ까요 (¿hacemos?)",
        "-아요/어요 (propuesta)",
        "Resultado: propones planes y respondes",
      ],
    },
    {
      title: "Unidad 10 — Vida cotidiana y experiencias",
      topics: [
        "Conversaciones completas",
        "Uso de conectores (-고, 그런데)",
        "Expresión de experiencias",
        "Resultado: mantienes conversaciones más fluidas",
      ],
    },
  ],
  goals: [
    "Comprender y usar vocabulario básico y cotidiano",
    "Construir oraciones correctamente en presente, pasado y futuro",
    "Describir situaciones, lugares, acciones y experiencias",
    "Expresar gustos, planes, opiniones y propuestas",
    "Mantener conversaciones simples y estructuradas",
    "Hablar con fluidez básica: preguntar, responder y contar experiencias",
    "Entender conversaciones simples e instrucciones cotidianas",
    "Leer textos cortos identificando la información clave",
    "Redactar oraciones y párrafos simples con ideas claras",
  ],
  method: [
    "Curso 100% práctico y aplicado",
    "Enfoque en hablar desde la primera clase",
    "Contenidos progresivos y estructurados",
    "Aprendizaje accesible y realista",
  ],
  outcomes: [
    "Comunicarte en situaciones reales (compras, citas, rutinas)",
    "Comprender estructuras clave del coreano",
    "Construir oraciones correctamente",
    "Expresar pasado, presente y planes",
    "Tener una base sólida para continuar al nivel intermedio alto",
  ],
};

const koreanEN: CourseContent = {
  description: [
    "The Korean course is designed to build your communication skills from beginner level up to a functional intermediate level, so you can understand, speak, read and write in real everyday situations.",
    "It follows a practical approach based on real communication, progressive comprehension and immediate application: vocabulary, grammar, guided practice and spoken and written production in every unit.",
  ],
  level: "Beginner to A2 (early intermediate)",
  modality: "Online",
  curriculum: [
    {
      title: "Unit 1 — Introduction and foundations",
      topics: [
        "Greetings and introductions",
        "Basic sentence structure",
        "Basic particles (은/는, 이/가)",
        "Starter vocabulary",
        "Outcome: you can introduce yourself and understand simple sentences",
      ],
    },
    {
      title: "Unit 2 — Objects and surroundings",
      topics: [
        "Everyday objects (table, chair, backpack, etc.)",
        "Using 이/가 (subject)",
        "Basic description",
        "Outcome: you describe objects and your surroundings",
      ],
    },
    {
      title: "Unit 3 — Location and space",
      topics: [
        "Positions: above, below, in front, inside, etc.",
        "Using 에 있다 / 없다",
        "Asking where things are",
        "Outcome: you describe where things are",
      ],
    },
    {
      title: "Unit 4 — Shopping and food",
      topics: [
        "Food vocabulary (apple, bread, milk, etc.)",
        "Using 을/를 (direct object)",
        "Ordering and buying products",
        "Sino-Korean numbers",
        "Outcome: you can buy and order products",
      ],
    },
    {
      title: "Unit 5 — Numbers and counting",
      topics: [
        "Native Korean numbers",
        "Counters (people, objects, etc.)",
        "Formal language use",
        "Outcome: you count and express quantities correctly",
      ],
    },
    {
      title: "Unit 6 — Actions in the past",
      topics: [
        "Verbs (eat, read, watch, etc.)",
        "Past tense: -았/었어요",
        "Using 에서 (place of action)",
        "Outcome: you tell what you did",
      ],
    },
    {
      title: "Unit 7 — Time and dates",
      topics: [
        "Days, months and hours",
        "Using 에 (time)",
        "Daily routines",
        "Outcome: you talk about schedules and dates",
      ],
    },
    {
      title: "Unit 8 — Weather and descriptions",
      topics: [
        "Seasons (spring, summer, etc.)",
        "Connectors (그리고 = and)",
        "Outcome: you describe the weather and situations",
      ],
    },
    {
      title: "Unit 9 — Plans and arrangements",
      topics: [
        "Making invitations",
        "-(으)ㄹ까요 (shall we?)",
        "-아요/어요 (suggestion)",
        "Outcome: you suggest plans and respond",
      ],
    },
    {
      title: "Unit 10 — Everyday life and experiences",
      topics: [
        "Full conversations",
        "Using connectors (-고, 그런데)",
        "Talking about experiences",
        "Outcome: you hold more fluent conversations",
      ],
    },
  ],
  goals: [
    "Understand and use basic, everyday vocabulary",
    "Build sentences correctly in the present, past and future",
    "Describe situations, places, actions and experiences",
    "Express likes, plans, opinions and suggestions",
    "Hold simple, structured conversations",
    "Speak with basic fluency: ask, answer and share experiences",
    "Understand simple conversations and everyday instructions",
    "Read short texts and identify the key information",
    "Write simple sentences and paragraphs with clear ideas",
  ],
  method: [
    "100% practical, applied course",
    "Focus on speaking from the very first class",
    "Progressive, structured content",
    "Accessible, realistic learning",
  ],
  outcomes: [
    "Communicate in real situations (shopping, appointments, routines)",
    "Understand key structures of Korean",
    "Build sentences correctly",
    "Express past, present and plans",
    "Have a solid base to continue to upper intermediate level",
  ],
};

const koreanPT: CourseContent = {
  description: [
    "O curso de Coreano foi desenhado para você desenvolver habilidades comunicativas do nível básico até um intermediário funcional, e conseguir compreender, falar, ler e escrever em situações reais do dia a dia.",
    "O trabalho segue um enfoque prático baseado em comunicação real, compreensão progressiva e aplicação imediata: vocabulário, gramática, prática guiada e produção oral e escrita em cada unidade.",
  ],
  level: "Básico a A2 (intermediário inicial)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Unidade 1 — Introdução e bases do idioma",
      topics: [
        "Cumprimentos e apresentações",
        "Estrutura básica da oração",
        "Partículas básicas (은/는, 이/가)",
        "Vocabulário inicial",
        "Resultado: você se apresenta e entende frases simples",
      ],
    },
    {
      title: "Unidade 2 — Objetos e entorno",
      topics: [
        "Objetos do dia a dia (mesa, cadeira, mochila, etc.)",
        "Uso de 이/가 (sujeito)",
        "Descrição básica",
        "Resultado: você descreve objetos e o seu entorno",
      ],
    },
    {
      title: "Unidade 3 — Localização e espaço",
      topics: [
        "Posições: em cima, embaixo, na frente, dentro, etc.",
        "Uso de 에 있다 / 없다",
        "Perguntas de localização",
        "Resultado: você descreve onde as coisas estão",
      ],
    },
    {
      title: "Unidade 4 — Compras e alimentos",
      topics: [
        "Vocabulário de comida (maçã, pão, leite, etc.)",
        "Uso de 을/를 (objeto direto)",
        "Pedir e comprar produtos",
        "Números sino-coreanos",
        "Resultado: você compra e pede produtos",
      ],
    },
    {
      title: "Unidade 5 — Números e contagem",
      topics: [
        "Números nativos coreanos",
        "Contadores (pessoas, objetos, etc.)",
        "Uso formal da língua",
        "Resultado: você conta e expressa quantidades corretamente",
      ],
    },
    {
      title: "Unidade 6 — Ações no passado",
      topics: [
        "Verbos (comer, ler, ver, etc.)",
        "Passado: -았/었어요",
        "Uso de 에서 (lugar da ação)",
        "Resultado: você narra o que fez",
      ],
    },
    {
      title: "Unidade 7 — Tempo e datas",
      topics: [
        "Dias, meses e horas",
        "Uso de 에 (tempo)",
        "Rotinas diárias",
        "Resultado: você fala de horários e datas",
      ],
    },
    {
      title: "Unidade 8 — Clima e descrições",
      topics: [
        "Estações (primavera, verão, etc.)",
        "Conectores (그리고 = e)",
        "Resultado: você descreve o clima e situações",
      ],
    },
    {
      title: "Unidade 9 — Planos e combinados",
      topics: [
        "Fazer convites",
        "-(으)ㄹ까요 (vamos?)",
        "-아요/어요 (proposta)",
        "Resultado: você propõe planos e responde",
      ],
    },
    {
      title: "Unidade 10 — Vida cotidiana e experiências",
      topics: [
        "Conversas completas",
        "Uso de conectores (-고, 그런데)",
        "Expressão de experiências",
        "Resultado: você mantém conversas mais fluidas",
      ],
    },
  ],
  goals: [
    "Compreender e usar vocabulário básico e cotidiano",
    "Construir orações corretamente no presente, passado e futuro",
    "Descrever situações, lugares, ações e experiências",
    "Expressar gostos, planos, opiniões e propostas",
    "Manter conversas simples e estruturadas",
    "Falar com fluência básica: perguntar, responder e contar experiências",
    "Entender conversas simples e instruções do dia a dia",
    "Ler textos curtos identificando a informação-chave",
    "Redigir orações e parágrafos simples com ideias claras",
  ],
  method: [
    "Curso 100% prático e aplicado",
    "Foco em falar desde a primeira aula",
    "Conteúdos progressivos e estruturados",
    "Aprendizado acessível e realista",
  ],
  outcomes: [
    "Comunicar-se em situações reais (compras, encontros, rotinas)",
    "Compreender estruturas-chave do coreano",
    "Construir orações corretamente",
    "Expressar passado, presente e planos",
    "Ter uma base sólida para continuar ao nível intermediário alto",
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
