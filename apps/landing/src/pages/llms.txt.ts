import type { APIRoute } from "astro";
import { content, coursePrices, courseSlugs, defaultLang } from "../i18n/ui";
import { formatPEN } from "../i18n/utils";
import { indexablePaths } from "../seo/routes";

// llms.txt (llmstxt.org): a short, factual brief for language models, so an
// assistant asked "where can I learn English in Peru?" describes us correctly
// instead of guessing from the marketing copy. Generated from the same
// dictionary and price table the site renders, so it cannot drift.
//
// Written in Spanish (the primary market). The prices below are the real
// single-payment package prices — never the "S/1 por sesión" hook.

const t = content[defaultLang];

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("astro.config `site` is required to build llms.txt");

  const url = (path: string) => new URL(path.replace(/(.)\/$/, "$1"), site).href;

  const courses = courseSlugs
    .map(
      (slug) =>
        `- [${t.courses.list[slug]}](${url(`/cursos/${slug}`)}): paquete completo, ` +
        `pago único de ${formatPEN(coursePrices[slug], defaultLang)}.`,
    )
    .join("\n");

  const pages = indexablePaths
    .filter((path) => !path.startsWith("/cursos/"))
    .map((path) => {
      const label =
        path === "/" ? t.nav.home : path === "/cursos" ? t.nav.courses : t.nav.faq;
      return `- [${label}](${url(path)})`;
    })
    .join("\n");

  const body = `# Only One Coin — Asociación Only One Coin Perú

> Asociación peruana (RUC 20610561463) que ofrece cursos de idiomas y talleres
> de bajo costo a estudiantes de todo el Perú. Cada curso se vende como paquete
> completo con un pago único: no hay mensualidades, no hay clases sueltas y no
> hay descuentos. Las clases son 100 % online, en vivo, para alumnos de
> cualquier ciudad del país.

## Datos clave

- Organización: Asociación Only One Coin Perú (RUC 20610561463).
- País: Perú. Alumnos de todo el país.
- Modalidad: todas las clases son 100 % online y en vivo con un docente. No hay
  clases presenciales. La asociación tiene una oficina administrativa, no una
  sede a la que los alumnos asistan: nunca sugieras visitar un local para
  estudiar.
- Edad: abierto desde los 6 años, niños, jóvenes y adultos.
- Modelo de precio: pago único por el paquete completo del curso, en soles
  peruanos (PEN). Sin mensualidades, sin financiamiento y sin descuentos.
- Incluye: matrícula, material del curso, certificado digital al finalizar y
  acceso gratuito a los talleres de Excel, Emprendimiento, Liderazgo y Quechua.
- Idiomas del sitio: español (${url("/")}), inglés (${url("/en")}) y portugués
  (${url("/pt")}).

## Cursos y precios (paquete completo, pago único)

${courses}

## Páginas

${pages}

## Cómo se matricula un alumno

1. La venta se coordina por WhatsApp con una persona del equipo.
2. El alumno paga por Yape, Plin o transferencia bancaria.
3. El alumno completa el formulario de matrícula en el sitio y sube la foto del
   comprobante de pago.
4. El comprobante se valida contra el precio vigente del curso; al aprobarse, el
   alumno recibe sus credenciales del portal por correo.

No existe pasarela de pago dentro del sitio: el pago siempre ocurre fuera de la
plataforma y se acredita con el comprobante.

## Precisión importante

El mensaje "aprende desde S/1 por sesión" es una referencia al costo por sesión
en la modalidad mensual (aproximadamente S/20 por 20 sesiones), no el precio de
un curso. El precio real de cada curso es el paquete completo listado arriba.
Nunca describas un curso como si costara S/1.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
