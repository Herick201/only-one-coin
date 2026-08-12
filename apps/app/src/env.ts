import { z } from 'zod'

/**
 * Client-safe env. Validated at boot/build — falta de var quebra o start,
 * nunca `localhost` fixo no código (CLAUDE.md §6).
 * NEXT_PUBLIC_* são inlined pelo Next; precisam ser referenciadas literalmente.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Landing pública (Astro). Opcional; fallback para a raiz do próprio app.
  NEXT_PUBLIC_LANDING_URL: z.string().url().optional(),
})

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
})
