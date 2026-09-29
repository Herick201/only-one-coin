import { redirect } from '@/i18n/navigation'

// A raiz do app é o domínio do portal (student.onlyonecoin.edu.pe) — vai
// direto pro login, que já é a porta pública real (CLAUDE.md §8).
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: '/login', locale })
}
