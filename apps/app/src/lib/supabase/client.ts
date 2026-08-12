import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/env'

// Client de navegador — usa apenas a anon key (pública).
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
