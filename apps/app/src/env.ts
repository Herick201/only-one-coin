import { z } from 'zod'

/**
 * Client-safe env. Validated at boot/build — falta de var quebra o start,
 * nunca `localhost` fixo no código (CLAUDE.md §6).
 * NEXT_PUBLIC_* são inlined pelo Next; precisam ser referenciadas literalmente.
 *
 * apps/app nunca fala direto com Postgres/auth/storage (CLAUDE.md §5,
 * "client separado") — nenhuma var de provedor entra aqui, cliente ou
 * servidor; tudo isso mora só em apps/api.
 */
const schema = z.object({
  // Landing pública (Astro). Opcional; fallback para a raiz do próprio app.
  NEXT_PUBLIC_LANDING_URL: z.string().url().optional(),
})

export const env = schema.parse({
  NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
})
