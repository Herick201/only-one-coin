// Legal documents (terms of use + privacy policy), one per locale.
//
// Kept apart from `ui.ts` for two reasons: the copy is long enough to drown a
// dictionary meant to be scanned, and here the shape is explicitly typed —
// `Record<Lang, Record<LegalKind, LegalDoc>>` makes the compiler reject a
// locale that is missing a document, which `as const` alone would not.
//
// The copy is the text signed by the company, transcribed verbatim; the
// English and Portuguese versions are translations of that same text. Values
// that are the same in every language (razão social, RUC, address, phones,
// e-mail, domain) are NOT retyped per locale — they come from `org` in
// `ui.ts` through the {legalName} / {ruc} / {address} / {site} / {phones} /
// {email} tokens, resolved at render.
import type { Lang } from "./ui";

/** One rendered block inside a legal document. */
export type LegalBlock =
  | { readonly kind: "p"; readonly text: string }
  | { readonly kind: "list"; readonly items: readonly string[] };

export interface LegalSection {
  readonly heading: string;
  readonly blocks: readonly LegalBlock[];
}

export interface LegalDoc {
  readonly title: string;
  /** Blocks shown before the first numbered section. */
  readonly intro: readonly LegalBlock[];
  readonly sections: readonly LegalSection[];
}

export type LegalKind = "terms" | "privacy";

const p = (text: string): LegalBlock => ({ kind: "p", text });
const list = (...items: string[]): LegalBlock => ({ kind: "list", items });

export const legalContent: Record<Lang, Record<LegalKind, LegalDoc>> = {
  es: {
    terms: {
      title: "Términos y condiciones de uso",
      intro: [],
      sections: [
        {
          heading: "1. Introducción",
          blocks: [
            p(
              "Bienvenido a la página web de {legalName} (en adelante, «la Empresa»), con RUC N.º {ruc}, ubicada en {address}. Los presentes términos y condiciones regulan el uso del sitio web {site} (en adelante, «el Sitio»), así como todos los servicios ofrecidos por la Empresa a través de la plataforma. Al utilizar este Sitio, el usuario acepta los términos aquí establecidos.",
            ),
          ],
        },
        {
          heading: "2. Definiciones",
          blocks: [
            list(
              "Usuario: Cualquier persona que acceda o utilice el Sitio.",
              "Servicios: Clases de idiomas accesibles desde S/0.60 por sesión, talleres gratuitos, entre otros productos ofrecidos en el Sitio.",
              "Contenido: Toda la información, textos, gráficos, imágenes, videos y demás material disponible en el Sitio.",
            ),
          ],
        },
        {
          heading: "3. Aceptación de los términos",
          blocks: [
            p(
              "El acceso y uso del Sitio implican la aceptación plena y sin reservas de todos y cada uno de los términos y condiciones que aquí se establecen. Si no estás de acuerdo con estos términos, te pedimos que no utilices el Sitio.",
            ),
          ],
        },
        {
          heading: "4. Servicios ofrecidos",
          blocks: [
            p(
              "La Empresa ofrece clases de inglés accesibles, dirigidas a niños y adultos, así como talleres adicionales gratuitos. Las condiciones específicas de cada curso o taller serán detalladas al momento de la inscripción, siendo responsabilidad del usuario leer y aceptar las mismas antes de proceder.",
            ),
          ],
        },
        {
          heading: "5. Uso del sitio web",
          blocks: [
            p(
              "El usuario se compromete a utilizar el Sitio conforme a la ley, a estos términos y condiciones, y a la moral y buenas costumbres generalmente aceptadas. Queda prohibido el uso del Sitio con fines ilícitos o que puedan perjudicar los derechos de la Empresa o de terceros.",
            ),
          ],
        },
        {
          heading: "6. Registro de usuarios",
          blocks: [
            p(
              "Para acceder a ciertos servicios, es posible que se requiera la creación de una cuenta. El usuario es responsable de mantener la confidencialidad de su nombre de usuario y contraseña, así como de todas las actividades que se realicen bajo su cuenta.",
            ),
          ],
        },
        {
          heading: "7. Política de privacidad",
          blocks: [
            p(
              "Toda la información personal que proporcionas a través del Sitio será tratada de acuerdo con nuestra Política de Privacidad, que está disponible en el Sitio y que forma parte de estos términos y condiciones.",
            ),
          ],
        },
        {
          heading: "8. Propiedad intelectual",
          blocks: [
            p(
              "Todos los derechos de propiedad intelectual e industrial sobre el contenido del Sitio pertenecen a la Empresa o a sus licenciantes. Está prohibida la reproducción, distribución, transformación o cualquier forma de explotación del contenido sin la previa autorización por escrito de la Empresa.",
            ),
          ],
        },
        {
          heading: "9. Limitación de responsabilidad",
          blocks: [
            p(
              "La Empresa no será responsable de los daños o perjuicios que puedan derivarse del uso del Sitio o de la imposibilidad de acceder a los servicios. Asimismo, no se garantiza la disponibilidad, continuidad ni infalibilidad del funcionamiento del Sitio.",
            ),
          ],
        },
        {
          heading: "10. Modificaciones de los términos",
          blocks: [
            p(
              "La Empresa se reserva el derecho de modificar en cualquier momento los términos y condiciones aquí establecidos. Los cambios serán efectivos a partir de su publicación en el Sitio, por lo que recomendamos revisar periódicamente esta sección.",
            ),
          ],
        },
        {
          heading: "11. Contacto",
          blocks: [
            p(
              "Para cualquier duda o consulta sobre estos términos y condiciones, puedes contactarnos a través de los siguientes medios:",
            ),
            list("Teléfonos: {phones}", "Correo electrónico: {email}"),
          ],
        },
        {
          heading: "12. Ley aplicable y jurisdicción",
          blocks: [
            p(
              "Estos términos y condiciones se regirán e interpretarán conforme a las leyes peruanas. Cualquier controversia que se derive de su interpretación o cumplimiento se someterá a los tribunales competentes de Lima, Perú.",
            ),
          ],
        },
      ],
    },
    privacy: {
      title: "Política de privacidad",
      intro: [
        p(
          "En {legalName} (en adelante, «la Empresa»), con RUC N.º {ruc}, ubicada en {address}, respetamos tu privacidad y nos comprometemos a proteger tus datos personales conforme a la legislación peruana vigente. Esta Política de Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos tu información personal cuando visitas nuestro sitio web {site} (en adelante, «el Sitio»).",
        ),
        p(
          "Al utilizar nuestro Sitio y proporcionarnos tus datos personales, aceptas los términos de esta Política de Privacidad.",
        ),
      ],
      sections: [
        {
          heading: "1. Información que recopilamos",
          blocks: [
            p("Podemos recopilar los siguientes datos personales de los usuarios del Sitio:"),
            list(
              "Datos de contacto: nombre completo, número de teléfono, dirección de correo electrónico.",
              "Información demográfica: edad, género.",
              "Datos académicos: nivel de inglés o preferencias educativas.",
              "Información técnica: dirección IP, navegador, dispositivo utilizado y cookies.",
            ),
          ],
        },
        {
          heading: "2. Finalidad del tratamiento de datos",
          blocks: [
            p("Recopilamos y tratamos tus datos personales con las siguientes finalidades:"),
            list(
              "Proporcionarte acceso a nuestros servicios educativos, como clases y talleres.",
              "Gestionar inscripciones y participación en actividades ofrecidas por la Empresa.",
              "Comunicarnos contigo para informarte sobre novedades, promociones, sorteos o eventos.",
              "Mejorar la experiencia de navegación en el Sitio y personalizar el contenido.",
              "Cumplir con obligaciones legales.",
            ),
          ],
        },
        {
          heading: "3. Base legal para el tratamiento de datos",
          blocks: [
            p(
              "El tratamiento de tus datos se basa en el consentimiento que nos brindas al interactuar con el Sitio y proporcionarnos tu información. Puedes revocar tu consentimiento en cualquier momento contactándonos a través de los medios indicados al final de esta Política.",
            ),
          ],
        },
        {
          heading: "4. Almacenamiento de datos",
          blocks: [
            p(
              "Tus datos personales se almacenarán durante el tiempo necesario para cumplir con las finalidades descritas, o mientras sea requerido por la normativa aplicable. Una vez cumplidas dichas finalidades, tus datos serán eliminados o anonimizados.",
            ),
          ],
        },
        {
          heading: "5. Seguridad de la información",
          blocks: [
            p(
              "Nos comprometemos a proteger tus datos personales mediante medidas de seguridad físicas, electrónicas y administrativas adecuadas para evitar accesos no autorizados, divulgación, alteración o destrucción de la información.",
            ),
          ],
        },
        {
          heading: "6. Compartición de datos con terceros",
          blocks: [
            p(
              "La Empresa no vende, alquila ni comparte tus datos personales con terceros, salvo en los siguientes casos:",
            ),
            list(
              "Cuando sea necesario para cumplir con obligaciones legales.",
              "Cuando sea necesario para proporcionar los servicios solicitados, con tu consentimiento previo.",
              "Proveedores de servicios que nos asisten en la operación del Sitio o en la prestación de nuestros servicios (p. ej., plataformas de pago, servicios de hosting), bajo estrictas medidas de confidencialidad.",
            ),
          ],
        },
        {
          heading: "7. Derechos de los usuarios",
          blocks: [
            p("Como titular de tus datos personales, tienes los siguientes derechos:"),
            list(
              "Acceso: Solicitar información sobre los datos personales que poseemos.",
              "Rectificación: Pedir la corrección de datos inexactos o desactualizados.",
              "Cancelación: Solicitar la eliminación de tus datos cuando ya no sean necesarios.",
              "Oposición: Oponerte al tratamiento de tus datos para fines específicos.",
            ),
            p(
              "Puedes ejercer estos derechos en cualquier momento enviando una solicitud al correo electrónico {email}, indicando tu nombre completo, número de documento de identidad y el derecho que deseas ejercer.",
            ),
          ],
        },
        {
          heading: "8. Uso de cookies",
          blocks: [
            p(
              "El Sitio utiliza cookies para mejorar la experiencia del usuario. Las cookies son pequeños archivos que se almacenan en tu dispositivo al navegar en nuestro Sitio. Puedes configurar tu navegador para aceptar o rechazar cookies, pero ten en cuenta que algunas funciones del Sitio podrían no funcionar correctamente si las desactivas.",
            ),
          ],
        },
        {
          heading: "9. Modificaciones de la política de privacidad",
          blocks: [
            p(
              "La Empresa se reserva el derecho de modificar esta Política de Privacidad en cualquier momento. Los cambios serán efectivos a partir de su publicación en el Sitio. Te recomendamos revisar esta política periódicamente para estar informado sobre cómo protegemos tu información.",
            ),
          ],
        },
        {
          heading: "10. Contacto",
          blocks: [
            p(
              "Si tienes alguna consulta o inquietud sobre nuestra Política de Privacidad o el tratamiento de tus datos personales, puedes contactarnos a través de los siguientes medios:",
            ),
            list("Teléfonos: {phones}", "Correo electrónico: {email}"),
            p("Fecha de última actualización: 14/06/2024"),
          ],
        },
      ],
    },
  },

  en: {
    terms: {
      title: "Terms and conditions of use",
      intro: [],
      sections: [
        {
          heading: "1. Introduction",
          blocks: [
            p(
              "Welcome to the website of {legalName} (hereinafter, “the Company”), tax ID (RUC) No. {ruc}, located at {address}. These terms and conditions govern the use of the website {site} (hereinafter, “the Site”), as well as all services offered by the Company through the platform. By using this Site, the user accepts the terms set out herein.",
            ),
          ],
        },
        {
          heading: "2. Definitions",
          blocks: [
            list(
              "User: Any person who accesses or uses the Site.",
              "Services: Language classes available from S/0.60 per session, free workshops, and other products offered on the Site.",
              "Content: All information, text, graphics, images, videos and other material available on the Site.",
            ),
          ],
        },
        {
          heading: "3. Acceptance of the terms",
          blocks: [
            p(
              "Accessing and using the Site implies full and unreserved acceptance of each and every one of the terms and conditions set out herein. If you do not agree with these terms, we ask that you do not use the Site.",
            ),
          ],
        },
        {
          heading: "4. Services offered",
          blocks: [
            p(
              "The Company offers affordable English classes for children and adults, as well as additional free workshops. The specific conditions of each course or workshop are detailed at the time of enrolment, and it is the user's responsibility to read and accept them before proceeding.",
            ),
          ],
        },
        {
          heading: "5. Use of the website",
          blocks: [
            p(
              "The user undertakes to use the Site in accordance with the law, with these terms and conditions, and with generally accepted morals and good practice. Use of the Site for unlawful purposes, or in ways that may harm the rights of the Company or of third parties, is prohibited.",
            ),
          ],
        },
        {
          heading: "6. User registration",
          blocks: [
            p(
              "Access to certain services may require the creation of an account. The user is responsible for keeping their username and password confidential, as well as for all activity carried out under their account.",
            ),
          ],
        },
        {
          heading: "7. Privacy policy",
          blocks: [
            p(
              "All personal information you provide through the Site is processed in accordance with our Privacy Policy, which is available on the Site and forms part of these terms and conditions.",
            ),
          ],
        },
        {
          heading: "8. Intellectual property",
          blocks: [
            p(
              "All intellectual and industrial property rights over the content of the Site belong to the Company or to its licensors. Reproduction, distribution, transformation or any other form of exploitation of the content without the prior written authorisation of the Company is prohibited.",
            ),
          ],
        },
        {
          heading: "9. Limitation of liability",
          blocks: [
            p(
              "The Company is not liable for any damages or losses arising from the use of the Site or from the inability to access the services. Nor does it guarantee the availability, continuity or infallibility of the Site's operation.",
            ),
          ],
        },
        {
          heading: "10. Changes to the terms",
          blocks: [
            p(
              "The Company reserves the right to amend the terms and conditions set out herein at any time. Changes take effect once published on the Site, so we recommend reviewing this section periodically.",
            ),
          ],
        },
        {
          heading: "11. Contact",
          blocks: [
            p(
              "For any questions about these terms and conditions, you can contact us through the following channels:",
            ),
            list("Phone: {phones}", "Email: {email}"),
          ],
        },
        {
          heading: "12. Governing law and jurisdiction",
          blocks: [
            p(
              "These terms and conditions are governed by and construed in accordance with Peruvian law. Any dispute arising from their interpretation or performance shall be submitted to the competent courts of Lima, Peru.",
            ),
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy policy",
      intro: [
        p(
          "At {legalName} (hereinafter, “the Company”), tax ID (RUC) No. {ruc}, located at {address}, we respect your privacy and are committed to protecting your personal data in accordance with applicable Peruvian law. This Privacy Policy explains how we collect, use, store and protect your personal information when you visit our website {site} (hereinafter, “the Site”).",
        ),
        p(
          "By using our Site and providing us with your personal data, you accept the terms of this Privacy Policy.",
        ),
      ],
      sections: [
        {
          heading: "1. Information we collect",
          blocks: [
            p("We may collect the following personal data from users of the Site:"),
            list(
              "Contact details: full name, phone number, email address.",
              "Demographic information: age, gender.",
              "Academic data: English level or educational preferences.",
              "Technical information: IP address, browser, device used and cookies.",
            ),
          ],
        },
        {
          heading: "2. Purpose of data processing",
          blocks: [
            p("We collect and process your personal data for the following purposes:"),
            list(
              "To give you access to our educational services, such as classes and workshops.",
              "To manage enrolments and participation in activities offered by the Company.",
              "To contact you with news, promotions, prize draws or events.",
              "To improve the browsing experience on the Site and personalise content.",
              "To comply with legal obligations.",
            ),
          ],
        },
        {
          heading: "3. Legal basis for processing",
          blocks: [
            p(
              "The processing of your data is based on the consent you give us when you interact with the Site and provide us with your information. You may withdraw your consent at any time by contacting us through the channels listed at the end of this Policy.",
            ),
          ],
        },
        {
          heading: "4. Data storage",
          blocks: [
            p(
              "Your personal data is stored for as long as necessary to fulfil the purposes described, or for as long as applicable regulations require. Once those purposes have been fulfilled, your data is deleted or anonymised.",
            ),
          ],
        },
        {
          heading: "5. Information security",
          blocks: [
            p(
              "We are committed to protecting your personal data through appropriate physical, electronic and administrative security measures, to prevent unauthorised access, disclosure, alteration or destruction of the information.",
            ),
          ],
        },
        {
          heading: "6. Sharing data with third parties",
          blocks: [
            p(
              "The Company does not sell, rent or share your personal data with third parties, except in the following cases:",
            ),
            list(
              "When necessary to comply with legal obligations.",
              "When necessary to provide the services you requested, with your prior consent.",
              "Service providers that assist us in operating the Site or in delivering our services (e.g. payment platforms, hosting services), under strict confidentiality measures.",
            ),
          ],
        },
        {
          heading: "7. Your rights",
          blocks: [
            p("As the owner of your personal data, you have the following rights:"),
            list(
              "Access: Request information about the personal data we hold.",
              "Rectification: Ask us to correct inaccurate or outdated data.",
              "Erasure: Request deletion of your data when it is no longer necessary.",
              "Objection: Object to the processing of your data for specific purposes.",
            ),
            p(
              "You may exercise these rights at any time by sending a request to {email}, stating your full name, identity document number and the right you wish to exercise.",
            ),
          ],
        },
        {
          heading: "8. Use of cookies",
          blocks: [
            p(
              "The Site uses cookies to improve the user experience. Cookies are small files stored on your device as you browse our Site. You can configure your browser to accept or reject cookies, but note that some Site features may not work correctly if you disable them.",
            ),
          ],
        },
        {
          heading: "9. Changes to the privacy policy",
          blocks: [
            p(
              "The Company reserves the right to amend this Privacy Policy at any time. Changes take effect once published on the Site. We recommend reviewing this policy periodically to stay informed about how we protect your information.",
            ),
          ],
        },
        {
          heading: "10. Contact",
          blocks: [
            p(
              "If you have any questions or concerns about our Privacy Policy or about the processing of your personal data, you can contact us through the following channels:",
            ),
            list("Phone: {phones}", "Email: {email}"),
            p("Last updated: 14/06/2024"),
          ],
        },
      ],
    },
  },

  pt: {
    terms: {
      title: "Termos e condições de uso",
      intro: [],
      sections: [
        {
          heading: "1. Introdução",
          blocks: [
            p(
              "Bem-vindo ao site da {legalName} (doravante, «a Empresa»), com RUC n.º {ruc}, localizada em {address}. Os presentes termos e condições regulam o uso do site {site} (doravante, «o Site»), bem como todos os serviços oferecidos pela Empresa através da plataforma. Ao utilizar este Site, o usuário aceita os termos aqui estabelecidos.",
            ),
          ],
        },
        {
          heading: "2. Definições",
          blocks: [
            list(
              "Usuário: Qualquer pessoa que acesse ou utilize o Site.",
              "Serviços: Aulas de idiomas acessíveis a partir de S/0,60 por sessão, oficinas gratuitas, entre outros produtos oferecidos no Site.",
              "Conteúdo: Toda a informação, textos, gráficos, imagens, vídeos e demais material disponível no Site.",
            ),
          ],
        },
        {
          heading: "3. Aceitação dos termos",
          blocks: [
            p(
              "O acesso e o uso do Site implicam a aceitação plena e sem reservas de todos e cada um dos termos e condições aqui estabelecidos. Se você não concorda com estes termos, pedimos que não utilize o Site.",
            ),
          ],
        },
        {
          heading: "4. Serviços oferecidos",
          blocks: [
            p(
              "A Empresa oferece aulas de inglês acessíveis, dirigidas a crianças e adultos, além de oficinas adicionais gratuitas. As condições específicas de cada curso ou oficina serão detalhadas no momento da inscrição, sendo responsabilidade do usuário lê-las e aceitá-las antes de prosseguir.",
            ),
          ],
        },
        {
          heading: "5. Uso do site",
          blocks: [
            p(
              "O usuário compromete-se a utilizar o Site em conformidade com a lei, com estes termos e condições e com a moral e os bons costumes geralmente aceitos. É proibido o uso do Site para fins ilícitos ou que possam prejudicar os direitos da Empresa ou de terceiros.",
            ),
          ],
        },
        {
          heading: "6. Cadastro de usuários",
          blocks: [
            p(
              "Para acessar determinados serviços, pode ser necessária a criação de uma conta. O usuário é responsável por manter a confidencialidade de seu nome de usuário e senha, bem como por todas as atividades realizadas em sua conta.",
            ),
          ],
        },
        {
          heading: "7. Política de privacidade",
          blocks: [
            p(
              "Toda a informação pessoal que você fornece através do Site será tratada de acordo com nossa Política de Privacidade, disponível no Site e que faz parte destes termos e condições.",
            ),
          ],
        },
        {
          heading: "8. Propriedade intelectual",
          blocks: [
            p(
              "Todos os direitos de propriedade intelectual e industrial sobre o conteúdo do Site pertencem à Empresa ou a seus licenciantes. É proibida a reprodução, distribuição, transformação ou qualquer forma de exploração do conteúdo sem a prévia autorização por escrito da Empresa.",
            ),
          ],
        },
        {
          heading: "9. Limitação de responsabilidade",
          blocks: [
            p(
              "A Empresa não será responsável pelos danos ou prejuízos que possam decorrer do uso do Site ou da impossibilidade de acessar os serviços. Da mesma forma, não se garante a disponibilidade, a continuidade nem a infalibilidade do funcionamento do Site.",
            ),
          ],
        },
        {
          heading: "10. Alterações dos termos",
          blocks: [
            p(
              "A Empresa reserva-se o direito de modificar a qualquer momento os termos e condições aqui estabelecidos. As alterações entram em vigor a partir de sua publicação no Site, por isso recomendamos revisar periodicamente esta seção.",
            ),
          ],
        },
        {
          heading: "11. Contato",
          blocks: [
            p(
              "Para qualquer dúvida ou consulta sobre estes termos e condições, você pode entrar em contato conosco pelos seguintes meios:",
            ),
            list("Telefones: {phones}", "E-mail: {email}"),
          ],
        },
        {
          heading: "12. Lei aplicável e foro",
          blocks: [
            p(
              "Estes termos e condições regem-se e interpretam-se conforme as leis peruanas. Qualquer controvérsia decorrente de sua interpretação ou cumprimento será submetida aos tribunais competentes de Lima, Peru.",
            ),
          ],
        },
      ],
    },
    privacy: {
      title: "Política de privacidade",
      intro: [
        p(
          "Na {legalName} (doravante, «a Empresa»), com RUC n.º {ruc}, localizada em {address}, respeitamos sua privacidade e nos comprometemos a proteger seus dados pessoais conforme a legislação peruana vigente. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você visita nosso site {site} (doravante, «o Site»).",
        ),
        p(
          "Ao utilizar nosso Site e nos fornecer seus dados pessoais, você aceita os termos desta Política de Privacidade.",
        ),
      ],
      sections: [
        {
          heading: "1. Informações que coletamos",
          blocks: [
            p("Podemos coletar os seguintes dados pessoais dos usuários do Site:"),
            list(
              "Dados de contato: nome completo, número de telefone, endereço de e-mail.",
              "Informações demográficas: idade, gênero.",
              "Dados acadêmicos: nível de inglês ou preferências educacionais.",
              "Informações técnicas: endereço IP, navegador, dispositivo utilizado e cookies.",
            ),
          ],
        },
        {
          heading: "2. Finalidade do tratamento de dados",
          blocks: [
            p("Coletamos e tratamos seus dados pessoais com as seguintes finalidades:"),
            list(
              "Fornecer acesso aos nossos serviços educacionais, como aulas e oficinas.",
              "Gerenciar inscrições e a participação nas atividades oferecidas pela Empresa.",
              "Entrar em contato com você para informar sobre novidades, promoções, sorteios ou eventos.",
              "Melhorar a experiência de navegação no Site e personalizar o conteúdo.",
              "Cumprir obrigações legais.",
            ),
          ],
        },
        {
          heading: "3. Base legal para o tratamento de dados",
          blocks: [
            p(
              "O tratamento de seus dados baseia-se no consentimento que você nos dá ao interagir com o Site e nos fornecer suas informações. Você pode revogar seu consentimento a qualquer momento entrando em contato conosco pelos meios indicados ao final desta Política.",
            ),
          ],
        },
        {
          heading: "4. Armazenamento de dados",
          blocks: [
            p(
              "Seus dados pessoais serão armazenados durante o tempo necessário para cumprir as finalidades descritas, ou enquanto for exigido pela normativa aplicável. Uma vez cumpridas essas finalidades, seus dados serão eliminados ou anonimizados.",
            ),
          ],
        },
        {
          heading: "5. Segurança da informação",
          blocks: [
            p(
              "Comprometemo-nos a proteger seus dados pessoais mediante medidas de segurança físicas, eletrônicas e administrativas adequadas para evitar acessos não autorizados, divulgação, alteração ou destruição da informação.",
            ),
          ],
        },
        {
          heading: "6. Compartilhamento de dados com terceiros",
          blocks: [
            p(
              "A Empresa não vende, aluga nem compartilha seus dados pessoais com terceiros, salvo nos seguintes casos:",
            ),
            list(
              "Quando for necessário para cumprir obrigações legais.",
              "Quando for necessário para prestar os serviços solicitados, com seu consentimento prévio.",
              "Fornecedores de serviços que nos auxiliam na operação do Site ou na prestação de nossos serviços (por exemplo, plataformas de pagamento, serviços de hospedagem), sob estritas medidas de confidencialidade.",
            ),
          ],
        },
        {
          heading: "7. Direitos dos usuários",
          blocks: [
            p("Como titular de seus dados pessoais, você tem os seguintes direitos:"),
            list(
              "Acesso: Solicitar informações sobre os dados pessoais que possuímos.",
              "Retificação: Pedir a correção de dados inexatos ou desatualizados.",
              "Cancelamento: Solicitar a eliminação de seus dados quando já não forem necessários.",
              "Oposição: Opor-se ao tratamento de seus dados para fins específicos.",
            ),
            p(
              "Você pode exercer esses direitos a qualquer momento enviando uma solicitação para o e-mail {email}, indicando seu nome completo, número do documento de identidade e o direito que deseja exercer.",
            ),
          ],
        },
        {
          heading: "8. Uso de cookies",
          blocks: [
            p(
              "O Site utiliza cookies para melhorar a experiência do usuário. Os cookies são pequenos arquivos que se armazenam em seu dispositivo ao navegar em nosso Site. Você pode configurar seu navegador para aceitar ou recusar cookies, mas tenha em conta que algumas funções do Site podem não funcionar corretamente se você desativá-los.",
            ),
          ],
        },
        {
          heading: "9. Alterações da política de privacidade",
          blocks: [
            p(
              "A Empresa reserva-se o direito de modificar esta Política de Privacidade a qualquer momento. As alterações entram em vigor a partir de sua publicação no Site. Recomendamos revisar esta política periodicamente para estar informado sobre como protegemos suas informações.",
            ),
          ],
        },
        {
          heading: "10. Contato",
          blocks: [
            p(
              "Se você tiver alguma consulta ou dúvida sobre nossa Política de Privacidade ou o tratamento de seus dados pessoais, pode entrar em contato conosco pelos seguintes meios:",
            ),
            list("Telefones: {phones}", "E-mail: {email}"),
            p("Data da última atualização: 14/06/2024"),
          ],
        },
      ],
    },
  },
};
