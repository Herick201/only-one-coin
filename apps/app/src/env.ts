import { z } from 'zod'

/**
 * Client-safe env. Validated at boot/build — falta de var quebra o start,
 * nunca `localhost` fixo no código (CLAUDE.md §6).
 * NEXT_PUBLIC_* são inlined pelo Next; precisam ser referenciadas literalmente.
 *
 * O provedor de backend (Postgres gerenciado + auth + storage) ainda não foi
 * escolhido; nenhuma var de provedor entra aqui até a decisão.
 */
const schema = z.object({
  // Landing pública (Astro). Opcional; fallback para a raiz do próprio app.
  NEXT_PUBLIC_LANDING_URL: z.string().url().optional(),
})

export const env = schema.parse({
  NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
})
