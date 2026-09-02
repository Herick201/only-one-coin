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
    "Estos son los logros del programa completo de seis libros (160 horas), que alcanza un nivel intermedio funcional (A2–B1). El paquete de este nivel Básico son los libros 1 al 4 (80 horas); el programa continúa en el nivel Intermedio (libros 5 y 6), que se matricula por separado.",
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
    "These are the outcomes of the full six-book program (160 hours), which reaches a functional intermediate level (A2–B1). This Basic-level package covers books 1 to 4 (80 hours); the program continues in the Intermediate level (books 5 and 6), which is enrolled separately.",
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
    "Estes são os resultados do programa completo de seis livros (160 horas), que chega a um nível intermediário funcional (A2–B1). O pacote deste nível Básico são os livros 1 a 4 (80 horas); o programa continua no nível Intermediário (livros 5 e 6), que se matricula à parte.",
};


/**
 * Nível Intermedio do inglês — livros 5 e 6 do mesmo programa (Papayita).
 * `goals`, `method`, `evaluation` e `outcomes` são o syllabus do programa
 * inteiro, como está no documento: é este nível que o completa.
 */
const englishIntermediateES: CourseContent = {
  description: [
    "La continuación del nivel Básico dentro del mismo programa de Inglés de Only One Coin: los libros 5 y 6 (Papayita) consolidan el nivel intermedio para que pienses en inglés, ganes seguridad al comunicarte y te desenvuelvas en contextos académicos, laborales y cotidianos.",
    "Trabajas opiniones y argumentos, situaciones sociales más complejas y textos extensos, con la misma práctica constante de speaking, listening, reading, writing, use of English y vocabulary. El contenido está alineado a estándares internacionales y sirve como base para preparación de exámenes tipo TOEFL.",
  ],
  sessions: "80 sesiones",
  duration: "80 horas académicas (nivel Intermedio)",
  level: "Intermedio (A2–B1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Libro 5 — Deep Flow",
      topics: [
        "Present Perfect vs Simple Past",
        "Pasado continuo",
        "Futuro: will, going to y present continuous",
        "Opiniones y argumentos",
        "Situaciones sociales más complejas",
        "Comprensión de textos extensos",
        "Desarrollo de coherencia al hablar y escribir",
      ],
    },
    {
      title: "Libro 6 — Only One Coin",
      topics: [
        "Estilo de vida y salud",
        "Imperativos",
        "Verbos modales",
        "Gerundios e infinitivos",
        "Comunicación en contextos reales",
        "Narración de experiencias",
        "Consolidación del nivel intermedio",
        "Preparación para evaluaciones de nivel",
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
    "De forma realista, al completar el programa alcanzas un nivel intermedio funcional (A2–B1), suficiente para continuar estudios avanzados, trabajar en entornos que requieran inglés básico–intermedio o seguir perfeccionándote en el idioma. El nivel Básico (libros 1 al 4) es el punto de partida natural antes de este paquete.",
};

const englishIntermediateEN: CourseContent = {
  description: [
    "The continuation of the Basic level within the same Only One Coin English program: books 5 and 6 (Papayita) consolidate the intermediate level so you think in English, gain confidence and can hold your own in academic, work and everyday contexts.",
    "You work on opinions and arguments, more complex social situations and longer texts, with the same constant practice of speaking, listening, reading, writing, use of English and vocabulary. The content follows international standards and serves as a base for TOEFL-type exam preparation.",
  ],
  sessions: "80 sessions",
  duration: "80 academic hours (Intermediate level)",
  level: "Intermediate (A2–B1)",
  modality: "Online",
  curriculum: [
    {
      title: "Book 5 — Deep Flow",
      topics: [
        "Present Perfect vs Simple Past",
        "Past continuous",
        "The future: will, going to and present continuous",
        "Opinions and arguments",
        "More complex social situations",
        "Understanding longer texts",
        "Building coherence in speaking and writing",
      ],
    },
    {
      title: "Book 6 — Only One Coin",
      topics: [
        "Lifestyle and health",
        "Imperatives",
        "Modal verbs",
        "Gerunds and infinitives",
        "Communication in real contexts",
        "Narrating experiences",
        "Consolidating the intermediate level",
        "Preparation for level assessments",
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
    "Realistically, completing the program takes you to a functional intermediate level (A2–B1) — enough to continue into advanced studies, work in settings that require basic-to-intermediate English or keep improving the language. The Basic level (books 1 to 4) is the natural starting point before this package.",
};

const englishIntermediatePT: CourseContent = {
  description: [
    "A continuação do nível Básico dentro do mesmo programa de Inglês da Only One Coin: os livros 5 e 6 (Papayita) consolidam o nível intermediário para você pensar em inglês, ganhar segurança ao se comunicar e se virar em contextos acadêmicos, de trabalho e do dia a dia.",
    "Você trabalha opiniões e argumentos, situações sociais mais complexas e textos extensos, com a mesma prática constante de speaking, listening, reading, writing, use of English e vocabulary. O conteúdo segue padrões internacionais e serve de base para preparação de exames tipo TOEFL.",
  ],
  sessions: "80 sessões",
  duration: "80 horas acadêmicas (nível Intermediário)",
  level: "Intermediário (A2–B1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Livro 5 — Deep Flow",
      topics: [
        "Present Perfect vs Simple Past",
        "Passado contínuo",
        "Futuro: will, going to e present continuous",
        "Opiniões e argumentos",
        "Situações sociais mais complexas",
        "Compreensão de textos extensos",
        "Desenvolvimento de coerência ao falar e escrever",
      ],
    },
    {
      title: "Livro 6 — Only One Coin",
      topics: [
        "Estilo de vida e saúde",
        "Imperativos",
        "Verbos modais",
        "Gerúndios e infinitivos",
        "Comunicação em contextos reais",
        "Narração de experiências",
        "Consolidação do nível intermediário",
        "Preparação para avaliações de nível",
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
    "De forma realista, ao completar o programa você alcança um nível intermediário funcional (A2–B1) — suficiente para seguir em estudos avançados, trabalhar em ambientes que exijam inglês básico–intermediário ou continuar se aperfeiçoando no idioma. O nível Básico (livros 1 a 4) é o ponto de partida natural antes deste pacote.",
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
  // Sem `duration`: o documento do curso não fecha carga horária, e ausência é
  // melhor que chute (mesma regra do preço em `ui.ts`).
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

const cambridgeEN: CourseContent = {
  description: [
    "Cambridge is an international English certification. This course prepares you to sit it: it works through level B1 progressively, with the kind of tasks, audio and texts that appear in the exam.",
    "When you finish, you receive free guidance to register for and sit the Cambridge PET exam.",
  ],
  level: "Intermediate (B1)",
  modality: "Online",
  curriculum: [
    {
      title: "Module 1 — Daily life and decisions",
      topics: [
        "Routines and daily life",
        "Studies and work",
        "Expressing likes, preferences and decisions",
        "Present simple · Adverbs of frequency",
        "Present continuous · Verb patterns (want, would like, decide)",
        "Result: you talk about your life, habits and decisions in English",
      ],
    },
    {
      title: "Module 2 — Experiences and the past",
      topics: [
        "Travel, hobbies and free time",
        "Personal experiences and storytelling",
        "Past simple · Past continuous",
        "“Used to” · Time expressions",
        "Result: you tell past experiences clearly and coherently",
      ],
    },
    {
      title: "Module 3 — Plans and future life",
      topics: [
        "Future plans",
        "Technology and digital life",
        "Rules, advice and responsibilities",
        "Future forms (going to / will) · Modals (can, have to, should)",
        "First conditional",
        "Result: you talk about the future, give advice and express obligations",
      ],
    },
    {
      title: "Module 4 — Health and lifestyle",
      topics: [
        "Health and well-being",
        "Personal changes and lifestyle",
        "Present perfect vs past simple",
        "Quantifiers · Modals for advice",
        "Result: you talk about experiences and habits, and give recommendations",
      ],
    },
  ],
  goals: [
    "Speaking: hold fluent conversations and express opinions and experiences",
    "Listening: understand everyday conversations and Cambridge-style exam audio",
    "Reading: read intermediate texts and identify main ideas and details",
    "Writing: write emails, stories and opinions clearly and coherently",
  ],
  method: [
    "Live online classes",
    "Practice with exam-format tasks",
    "Real communication situations",
    "Active participation from the very first class",
  ],
  evaluation: [
    "Class participation",
    "Practice work per module",
    "Mock tests in exam format",
  ],
  outcomes: [
    "Communicate when travelling and in everyday situations",
    "Hold basic-to-intermediate conversations without translating in your head",
    "Understand content in English (videos, audio, texts)",
    "Express ideas, experiences and plans clearly",
    "Reach a level equivalent to B1 (intermediate)",
    "Be ready to sit the Cambridge PET exam",
    "Receive free guidance at the end to sit the exam",
  ],
  outcomeNote:
    "The exam and the certificate are issued by Cambridge, not by Only One Coin: this course gets you prepared for the test and supports you through registration.",
};

const cambridgePT: CourseContent = {
  description: [
    "Cambridge é uma certificação internacional de inglês. Este curso prepara você para prestá-la: trabalha o nível B1 de forma progressiva, com o tipo de tarefas, áudios e textos que aparecem no exame.",
    "Ao terminar, você recebe assessoria gratuita para se inscrever e prestar o exame Cambridge PET.",
  ],
  level: "Intermediário (B1)",
  modality: "Virtual",
  curriculum: [
    {
      title: "Módulo 1 — Vida diária e decisões",
      topics: [
        "Rotinas e vida diária",
        "Estudos e trabalho",
        "Expressar gostos, preferências e decisões",
        "Present simple · Adverbs of frequency",
        "Present continuous · Verb patterns (want, would like, decide)",
        "Resultado: você fala da sua vida, dos seus hábitos e das suas decisões em inglês",
      ],
    },
    {
      title: "Módulo 2 — Experiências e passado",
      topics: [
        "Viagens, hobbies e tempo livre",
        "Experiências pessoais e narração de histórias",
        "Past simple · Past continuous",
        "“Used to” · Expressões de tempo",
        "Resultado: você conta experiências passadas com clareza e coerência",
      ],
    },
    {
      title: "Módulo 3 — Planos e vida futura",
      topics: [
        "Planos futuros",
        "Tecnologia e vida digital",
        "Normas, conselhos e responsabilidades",
        "Future forms (going to / will) · Modals (can, have to, should)",
        "First conditional",
        "Resultado: você fala do futuro, dá conselhos e expressa obrigações",
      ],
    },
    {
      title: "Módulo 4 — Saúde e estilo de vida",
      topics: [
        "Saúde e bem-estar",
        "Mudanças pessoais e estilo de vida",
        "Present perfect vs past simple",
        "Quantifiers · Modals for advice",
        "Resultado: você fala de experiências e hábitos, e dá recomendações",
      ],
    },
  ],
  goals: [
    "Speaking: manter conversas fluidas e expressar opiniões e experiências",
    "Listening: compreender conversas cotidianas e áudios no estilo do exame Cambridge",
    "Reading: ler textos intermediários e identificar ideias principais e detalhes",
    "Writing: redigir e-mails, histórias e opiniões de forma clara e coerente",
  ],
  method: [
    "Aulas virtuais ao vivo",
    "Prática com tarefas no formato do exame",
    "Situações reais de comunicação",
    "Participação ativa desde a primeira aula",
  ],
  evaluation: [
    "Participação em aula",
    "Práticas por módulo",
    "Simulados no formato do exame",
  ],
  outcomes: [
    "Comunicar-se em viagens e situações cotidianas",
    "Manter conversas básicas-intermediárias sem traduzir mentalmente",
    "Entender conteúdo em inglês (vídeos, áudios, textos)",
    "Expressar ideias, experiências e planos com clareza",
    "Alcançar um nível equivalente ao B1 (intermediário)",
    "Estar preparado para prestar o exame Cambridge PET",
    "Receber assessoria gratuita ao finalizar para prestar o exame",
  ],
  outcomeNote:
    "O exame e o certificado são emitidos pelo Cambridge, não pela Only One Coin: este curso leva você preparado até a prova e acompanha a inscrição.",
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
    "english-intermediate": englishIntermediateES,
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
    "english-intermediate": englishIntermediateEN,
    "cambridge-b1": cambridgeEN,
    "french": frenchEN,
    "italian": italianEN,
    "portuguese": portugueseEN,
    "mandarin-chinese": mandarinChineseEN,
    "german": germanEN,
    "korean": koreanEN,
  },
  pt: {
    english: englishPT,
    "english-intermediate": englishIntermediatePT,
    "cambridge-b1": cambridgePT,
    "french": frenchPT,
    "italian": italianPT,
    "portuguese": portuguesePT,
    "mandarin-chinese": mandarinChinesePT,
    "german": germanPT,
    "korean": koreanPT,
  },
};
