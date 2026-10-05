import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { AuthShell } from '../login/auth-shell'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  )
}
