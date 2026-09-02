import type { CourseSlug } from "../i18n/ui";

/**
 * Ponte entre a landing e o checkout de `apps/app`.
 *
 * O checkout aceita `?course=<id>` como PRÉ-SELEÇÃO, nunca como afirmação: ele
 * valida o id contra o catálogo do próprio servidor e, se não reconhecer,
 * abre o passo 1 vazio para a pessoa escolher (`CLAUDE.md` §2 — sem link
 * tokenizado; `docs/MATRICULA-CHECKOUT.md` §4). Por isso um id que envelheça
 * aqui degrada em "escolha você mesmo", nunca em erro.
 *
 * A landing vende por IDIOMA; o catálogo separa por CURSO, e em inglês isso é
 * público diferente (crianças e adultos são cursos distintos). O mapa abaixo é
 * o ponto único onde essa diferença mora.
 */
export const courseIdBySlug: Record<CourseSlug, string> = {
  english: "crs_en_basic",
  "english-intermediate": "crs_en_intermediate",
  "cambridge-b1": "crs_en_b1",
  "cambridge-b2": "crs_en_b2",
  french: "crs_fr_full",
  "french-advanced": "crs_fr_advanced",
  portuguese: "crs_pt_full",
  italian: "crs_it_basic",
  german: "crs_de_basic",
  "mandarin-chinese": "crs_zh_basic",
  korean: "crs_ko_full",
};

/** Inglês para crianças é um curso próprio, não o mesmo com outra idade. */
export const englishKidsCourseId = "crs_en_kids";

/**
 * Link de matrícula com o curso já escolhido.
 *
 * `content` diz de qual peça da landing a pessoa saiu (herói, card de
 * programa, sugestão por geo). Vai como `utm_content`, que o checkout guarda
 * separado do canal: `source` responde "quem trouxe" (web ou whatsapp) e o
 * `utm_*` responde "de qual peça" (`CLAUDE.md` §5).
 */
export function enrollmentHref(
  basePath: string,
  options: { courseId?: string; content: string },
): string {
  const params = new URLSearchParams();
  if (options.courseId) params.set("course", options.courseId);
  params.set("utm_source", "landing");
  params.set("utm_content", options.content);
  return `${basePath}?${params.toString()}`;
}
